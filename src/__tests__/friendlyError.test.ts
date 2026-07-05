import { describe, it, expect } from 'vitest';
import { friendlyError } from '../utils/friendlyError';

describe('friendlyError — surowy błąd API -> zrozumiała podpowiedź', () => {
  it('rozpoznaje limit 429 / quota', () => {
    const fe = friendlyError('Błąd API Gemini (429): { "error": { "message": "You exceeded your current quota" } }');
    expect(fe.message).toMatch(/limit/i);
    expect(fe.hint).toMatch(/minut|Ustawieni/i);
  });

  it('rozpoznaje odrzucony klucz (401/403)', () => {
    const fe = friendlyError('Błąd API OpenRouter (401): invalid api key');
    expect(fe.message).toMatch(/klucz/i);
    expect(fe.hint).toMatch(/Ustawieni/i);
  });

  it('rozpoznaje niedostępny model (404)', () => {
    const fe = friendlyError('Błąd API OpenRouter (404): model not found');
    expect(fe.message).toMatch(/model/i);
  });

  it('rozpoznaje problem CORS/sieci', () => {
    const fe = friendlyError('Failed to fetch');
    expect(fe.message).toMatch(/połączy/i);
  });

  it('rozpoznaje niepełną odpowiedź po ponowieniach', () => {
    const fe = friendlyError('Odpowiedź AI (OpenRouter) nieprawidłowa po ponowieniach: treść nie jest prawidłowym JSON.');
    expect(fe.message).toMatch(/niepełn|niepeln/i);
    expect(fe.hint).toMatch(/przeciążone|deepseek/i);
  });

  it('skraca nierozpoznany długi błąd zamiast zalewać JSON-em', () => {
    const long = 'x'.repeat(400);
    const fe = friendlyError(long);
    expect(fe.message.length).toBeLessThanOrEqual(161);
    expect(fe.hint).toBe('');
  });
});
