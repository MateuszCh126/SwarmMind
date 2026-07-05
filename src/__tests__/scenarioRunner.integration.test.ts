import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSwarmStore } from '../store/useSwarmStore';
import { runSwarmOrchestration } from '../utils/scenarioRunner';

// Test integracyjny CAŁEGO cyklu roju. Mockujemy WYŁĄCZNIE fetch (granica sieci) —
// orkiestracja, parsowanie JSON i REALNE wykonanie testów w harnessie działają
// naprawdę. W jsdom brak Worker, więc runTests wykonuje harness synchronicznie.

interface GeminiPayload {
  [key: string]: unknown;
}

function geminiResponse(payload: GeminiPayload) {
  // Kod czyta ciało przez .text() (parseEnvelope), więc mock musi zwrócić pełną
  // KOPERTĘ Gemini jako tekst, nie samą treść.
  const envelope = {
    candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
  };
  return {
    ok: true,
    status: 200,
    json: async () => envelope,
    text: async () => JSON.stringify(envelope),
  } as unknown as Response;
}

// Zwraca odpowiedź zależnie od tego, który agent pyta (rozpoznajemy po treści promptu).
function makeFetch(handlers: {
  architect: GeminiPayload;
  coder: GeminiPayload | (() => GeminiPayload);
  tester: GeminiPayload | (() => GeminiPayload);
  reviewer: GeminiPayload | (() => GeminiPayload);
}) {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const prompt: string = body?.contents?.[0]?.parts?.[0]?.text ?? '';
    const pick = (h: GeminiPayload | (() => GeminiPayload)) =>
      typeof h === 'function' ? (h as () => GeminiPayload)() : h;

    if (prompt.includes('Analizuj kod i stwórz plan')) return geminiResponse(handlers.architect);
    if (prompt.includes('Zaimplementuj refaktoryzację')) return geminiResponse(pick(handlers.coder));
    if (prompt.includes('Wygeneruj testy jednostkowe')) return geminiResponse(pick(handlers.tester));
    if (prompt.includes('Oceń kod pod kątem')) return geminiResponse(pick(handlers.reviewer));
    throw new Error(`Nierozpoznany prompt w teście: ${prompt.slice(0, 40)}`);
  });
}

const GOOD_FIB = `function fib(n){var memo={};function go(k){if(k<2)return k;if(memo[k]!==undefined)return memo[k];memo[k]=go(k-1)+go(k-2);return memo[k];}return go(n);}`;
const FIB_TESTS = `it('fib(10) = 55', function(){ expect(fib(10)).toBe(55); }); it('fib(0) = 0', function(){ expect(fib(0)).toBe(0); }); it('fib(1) = 1', function(){ expect(fib(1)).toBe(1); });`;

function primeStore() {
  const store = useSwarmStore.getState();
  store.resetSwarm();
  store.setSettings({ preferProvider: 'gemini', geminiKey: 'test-key' });
  store.setSpeed(100); // skraca sztuczne opóźnienia do ~kilku ms
  store.startSwarm('Zoptymalizuj fib', 'function fib(n){return n<2?n:fib(n-1)+fib(n-2);}');
}

describe('runSwarmOrchestration — pełny cykl end-to-end (fetch zmockowany)', () => {
  beforeEach(() => primeStore());
  afterEach(() => vi.unstubAllGlobals());

  it('domyka happy path: Architect→Coder→Tester→Reviewer z realnym wykonaniem testów', async () => {
    vi.stubGlobal('fetch', makeFetch({
      architect: { explanation: 'Zastosuj spamiętywanie.', blueprint: 'memoizacja go(k)' },
      coder: { explanation: 'Dodano memoizację.', code: GOOD_FIB },
      tester: { explanation: 'Testy fib.', testCode: FIB_TESTS },
      reviewer: { explanation: 'Kod poprawny, testy zielone.', approved: true, feedback: 'LGTM' },
    }));

    await runSwarmOrchestration();
    const state = useSwarmStore.getState();

    expect(state.isRunning).toBe(false);
    expect(state.agents.reviewer.status).toBe('success');
    // Dowód REALNEGO wykonania: harness naprawdę policzył fib(10)=55.
    expect(state.agents.tester.status).toBe('success');
    expect(state.agents.tester.testContent).toContain('PASS');
    expect(state.agents.tester.testContent).toContain('3 zaliczonych');
    expect(state.tasks.find((t) => t.id === 'task_review')?.status).toBe('completed');
    expect(state.logs.some((l) => l.type === 'success')).toBe(true);
  });

  it('wykonuje pętlę zwrotną: Reviewer odrzuca raz, potem zatwierdza', async () => {
    let reviewerCall = 0;
    vi.stubGlobal('fetch', makeFetch({
      architect: { explanation: 'Plan.', blueprint: 'memoizacja' },
      coder: { explanation: 'Kod.', code: GOOD_FIB },
      tester: { explanation: 'Testy.', testCode: FIB_TESTS },
      reviewer: () => {
        reviewerCall += 1;
        return reviewerCall === 1
          ? { explanation: 'Brakuje przypadków brzegowych.', approved: false, feedback: 'Dodaj test dla n<0.' }
          : { explanation: 'Teraz OK.', approved: true, feedback: 'Zatwierdzone.' };
      },
    }));

    await runSwarmOrchestration();
    const state = useSwarmStore.getState();

    expect(reviewerCall).toBe(2); // pętla zadziałała
    expect(state.isRunning).toBe(false);
    expect(state.agents.reviewer.status).toBe('success');
    expect(state.tasks.find((t) => t.id === 'task_review')?.status).toBe('completed');
  });

  it('nie wywala się, gdy blueprint jest obiektem (regresja: realny kształt odpowiedzi Gemini)', async () => {
    // Gemini w trybie JSON zwraca blueprint jako zagnieżdżony obiekt, nie string.
    vi.stubGlobal('fetch', makeFetch({
      architect: {
        explanation: 'Plan z krokami.',
        blueprint: { goal: 'memoizacja', method: 'top-down', steps: [{ n: 1, desc: 'cache' }] },
      },
      coder: { explanation: 'Kod.', code: GOOD_FIB },
      tester: { explanation: 'Testy.', testCode: FIB_TESTS },
      reviewer: { explanation: 'OK.', approved: true, feedback: 'LGTM' },
    }));

    await runSwarmOrchestration();
    const state = useSwarmStore.getState();

    expect(state.isRunning).toBe(false);
    expect(state.agents.architect.status).toBe('success');
    expect(state.agents.architect.codeContent).toContain('memoizacja'); // obiekt zserializowany do tekstu
    expect(state.agents.reviewer.status).toBe('success');
  });

  it('normalizuje approved podane jako string "true"/"false"', async () => {
    let reviewerCall = 0;
    vi.stubGlobal('fetch', makeFetch({
      architect: { explanation: 'Plan.', blueprint: 'memoizacja' },
      coder: { explanation: 'Kod.', code: GOOD_FIB },
      tester: { explanation: 'Testy.', testCode: FIB_TESTS },
      reviewer: () => {
        reviewerCall += 1;
        // Pierwsza iteracja: string "false" musi być traktowany jako ODRZUCENIE.
        return reviewerCall === 1
          ? { explanation: 'Nie.', approved: 'false', feedback: 'Popraw.' }
          : { explanation: 'Tak.', approved: 'true', feedback: 'OK.' };
      },
    }));

    await runSwarmOrchestration();
    const state = useSwarmStore.getState();

    expect(reviewerCall).toBe(2); // "false" wymusiło pętlę, "true" zatwierdziło
    expect(state.agents.reviewer.status).toBe('success');
  });

  it('kończy błędem po 3 nieudanych iteracjach, gdy kod realnie oblewa testy', async () => {
    vi.stubGlobal('fetch', makeFetch({
      architect: { explanation: 'Plan.', blueprint: 'memoizacja' },
      coder: { explanation: 'Błędny kod.', code: 'function fib(n){ return n; }' }, // fib(10)=10 ≠ 55
      tester: { explanation: 'Testy.', testCode: FIB_TESTS },
      reviewer: { explanation: 'Testy oblane.', approved: false, feedback: 'Popraw logikę.' },
    }));

    await runSwarmOrchestration();
    const state = useSwarmStore.getState();

    expect(state.isRunning).toBe(false);
    // Tester naprawdę wykrył niezaliczone testy (nie symulacja).
    expect(state.agents.tester.status).toBe('error');
    const lastLog = state.logs[state.logs.length - 1];
    expect(lastLog.type).toBe('error');
    expect(state.currentStepDescription.toLowerCase()).toContain('błąd');
  });
});
