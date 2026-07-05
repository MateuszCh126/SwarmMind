// Zamienia surowe komunikaty API (np. "Błąd API Gemini (429): {json}") na spokojny,
// zrozumiały tekst z podpowiedzią, co zrobić. UX: użytkownik ma wiedzieć CO poszło nie
// tak i JAK to naprawić, zamiast czytać zrzut JSON-a.
export interface FriendlyError {
  message: string;
  hint: string;
}

export function friendlyError(raw: string): FriendlyError {
  const r = raw || '';

  if (/\b429\b|exceeded your current quota|RESOURCE_EXHAUSTED|rate.?limit|too many requests/i.test(r)) {
    return {
      message: 'Przekroczono limit darmowego API.',
      hint: 'Odczekaj ~minutę (limit minutowy) albo zmień klucz/model w Ustawieniach.',
    };
  }
  if (/\b401\b|\b403\b|unauthorized|permission|invalid.*api.*key|api key not valid|forbidden/i.test(r)) {
    return {
      message: 'Klucz API został odrzucony.',
      hint: 'Sprawdź poprawność klucza wybranego providera w Ustawieniach.',
    };
  }
  if (/\b404\b|model.*not found|no such model|is not a valid model/i.test(r)) {
    return {
      message: 'Wybrany model jest niedostępny.',
      hint: 'Zmień model lub providera w Ustawieniach.',
    };
  }
  if (/CORS|Failed to fetch|NetworkError|ERR_NETWORK|net::/i.test(r)) {
    return {
      message: 'Nie udało się połączyć z API.',
      hint: 'Sprawdź połączenie. OpenAI/Anthropic bywają blokowane w przeglądarce — użyj Gemini lub OpenRouter.',
    };
  }
  if (/pusta odpowiedź|nieprawidłowa po ponowieniach|obciętą|przeciążony|nie jest prawidłowym formatem json/i.test(r)) {
    return {
      message: 'Model zwrócił niepełną odpowiedź mimo ponowień.',
      hint: 'Darmowe modele bywają przeciążone — spróbuj ponownie lub wybierz szybszy (OpenRouter: deepseek-chat-v3:free).',
    };
  }
  if (/maksymalną liczbę iteracji/i.test(r)) {
    return {
      message: 'Rój nie wypracował zgody w 3 iteracjach.',
      hint: 'Uruchom ponownie albo doprecyzuj cel refaktoryzacji.',
    };
  }
  if (/brak klucza api/i.test(r)) {
    return {
      message: r,
      hint: 'Otwórz Ustawienia (prawy górny róg) i wklej klucz.',
    };
  }

  // Nierozpoznane — pokaż skróconą treść bez zalewania JSON-em.
  const trimmed = r.replace(/\s+/g, ' ').trim();
  return {
    message: trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed || 'Wystąpił nieznany błąd.',
    hint: '',
  };
}
