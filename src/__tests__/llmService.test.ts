import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanJSONString, callLLM, pingProvider } from '../services/llmService';
import type { SwarmSettings } from '../types';

describe('llmService JSON Parser Helper', () => {
  it('should pass through normal JSON strings', () => {
    const raw = '{"key": "value"}';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should clean JSON strings wrapped in ```json code blocks', () => {
    const raw = '```json\n{"key": "value"}\n```';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should clean JSON strings wrapped in generic ``` code blocks', () => {
    const raw = '```\n{"key": "value"}\n```';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should trim surrounding whitespace', () => {
    const raw = '   \n  {"key": "value"} \n  ';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
  });

  it('should clean code blocks even with extra spacing', () => {
    const raw = '  ```json\n  {"key": "value"}\n  ```  ';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should extract JSON even with conversational text before the code block', () => {
    const raw = 'Oto żądana odpowiedź:\n```json\n{"key": "value"}\n```';
    const cleaned = cleanJSONString(raw);
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should extract JSON even with conversational text after the code block', () => {
    const raw = '```json\n{"key": "value"}\n```\nMam nadzieję, że to pomoże!';
    const cleaned = cleanJSONString(raw);
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should extract JSON from mixed text without code fences', () => {
    const raw = 'Tekst przed {"key": "value"} tekst po';
    const cleaned = cleanJSONString(raw);
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });
});

describe('callLLM — odporność na przejściowe błędy sieci', () => {
  const baseSettings: SwarmSettings = {
    geminiKey: '', openaiKey: '', anthropicKey: '', openrouterKey: 'k',
    preferProvider: 'openrouter'
  };

  afterEach(() => vi.unstubAllGlobals());

  it('ponawia po pustej odpowiedzi HTTP 200 i parsuje kolejną poprawną (regresja: laguna zwraca puste ciało)', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return { ok: true, status: 200, text: async () => '' } as unknown as Response; // puste ciało 200
      }
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: '{"explanation":"x","blueprint":"y"}' } }] }),
      } as unknown as Response;
    }));

    const res = await callLLM({ agentId: 'architect', agentRole: '', systemPrompt: 's', userPrompt: 'u', settings: baseSettings });
    expect(res.blueprint).toBe('y');
    expect(call).toBe(2); // pierwsza próba pusta -> ponowienie
  });

  it('zgłasza czytelny błąd zamiast "Unexpected end of JSON input", gdy ciało jest puste mimo powodzenia', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => '' } as unknown as Response)));
    await expect(
      callLLM({ agentId: 'architect', agentRole: '', systemPrompt: 's', userPrompt: 'u', settings: baseSettings })
    ).rejects.toThrow(/Pusta odpowiedź z API OpenRouter/);
  });

  const orEnvelope = (content: string) => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
  } as unknown as Response);

  it('ponawia, gdy model zwróci treść nie-JSON, i domyka na kolejnej poprawnej (regresja: crash "nieprawidłowy JSON")', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1;
      // 1. próba: model gada prozą zamiast JSON -> nie zabijaj roju, ponów.
      if (call === 1) return orEnvelope('Jasne! Oto plan refaktoryzacji, bez JSON-a niestety.');
      return orEnvelope('{"explanation":"ok","blueprint":"memo"}');
    }));

    const res = await callLLM({ agentId: 'architect', agentRole: '', systemPrompt: 's', userPrompt: 'u', settings: baseSettings });
    expect(res.blueprint).toBe('memo');
    expect(call).toBe(2); // pierwsza proza -> ponowienie -> sukces
  });

  it('po wyczerpaniu ponowień na nie-JSON zgłasza czytelny błąd (nie kryptyczny)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: 'ciągle nie JSON' } }] }),
    } as unknown as Response)));

    await expect(
      callLLM({ agentId: 'architect', agentRole: '', systemPrompt: 's', userPrompt: 'u', settings: baseSettings })
    ).rejects.toThrow(/nieprawidłowa po ponowieniach/);
  });

  it('callLLM raportuje zużycie tokenów przez onUsage', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      text: async () => JSON.stringify({
        usage: { total_tokens: 123 },
        choices: [{ message: { content: '{"explanation":"x","blueprint":"y"}' } }],
      }),
    } as unknown as Response)));

    let reported = 0;
    await callLLM({
      agentId: 'architect', agentRole: '', systemPrompt: 's', userPrompt: 'u',
      settings: baseSettings, onUsage: (t) => { reported += t; },
    });
    expect(reported).toBe(123);
  });

  it('pingProvider: brak klucza -> ok:false', async () => {
    const res = await pingProvider({ ...baseSettings, openrouterKey: '' });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/Brak klucza/i);
  });

  it('pingProvider: HTTP 200 -> klucz działa', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => '{}' } as unknown as Response)));
    const res = await pingProvider(baseSettings);
    expect(res.ok).toBe(true);
    expect(res.message).toMatch(/działa/i);
  });

  it('pingProvider: HTTP 429 -> klucz OK ale limit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, text: async () => 'quota' } as unknown as Response)));
    const res = await pingProvider(baseSettings);
    expect(res.ok).toBe(true);
    expect(res.message).toMatch(/limit/i);
  });

  it('pingProvider: HTTP 401 -> klucz odrzucony', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' } as unknown as Response)));
    const res = await pingProvider(baseSettings);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/klucz/i);
  });
});
export {};
