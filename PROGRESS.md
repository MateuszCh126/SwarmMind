# SwarmMind — postęp prac (cel overnight)

**Cel:** znacznie bardziej rozbudowana, w pełni działająca, w 100% REALNA aplikacja
(ZERO mocków/symulacji). Agenci ładnie ze sobą rozmawiają i pętlą aż osiągną cel.
Kod pisze subagent Haiku (model `haiku`); ja projektuję, weryfikuję grep-em + testami.

**Reguły twarde:**
- Żadnych mocków/symulacji w runtime. Test integracyjny może mockować tylko `fetch`.
- Każdy przyrost: `npm run test` (zielone) + `npm run build` (czysto) → commit → push na origin/main.
- Po każdym przyroście zaktualizuj sekcję „Zrobione" i „Następne" tutaj.

## Zrobione (ta sesja)
- Realny runner testów w Web Workerze (koniec symulacji wyników przez LLM).
- Odporność wywołań LLM: retry na pustą/nieprawidłową odpowiedź, koercja pól.
- Provider OpenRouter (darmowy, działa z przeglądarki).
- Naprawiony layout (panele nie zwężają się).
- Usunięte sztuczne opóźnienia + suwak prędkości (były symulacją aktywności).
- Przyjazne, akcjonowalne błędy + licznik czasu przebiegu.
- Agenci „gadają ładnie" + pętla do celu: Tester testuje faktyczny kontrakt (toThrow
  gdy kod rzuca), Reviewer ma jasny próg akceptacji (nie nitpickuje), maxIterations=10.

- Eksport wyniku: przycisk „Pobierz wynik (.md)" — raport z kodem, testami, wynikiem, review.

- Historia przebiegów w localStorage: modal „Historia" (do 20 wpisów), badge sukces/błąd,
  pobieranie raportu każdego przebiegu, czyszczenie. Zapis przy sukcesie i błędzie roju.

- „Testuj klucz" w Ustawieniach: realny, lekki ping do API wybranego providera
  (200 = OK, 429 = klucz OK ale limit, 401/403 = odrzucony). Waliduje zanim odpalisz rój.

- Diff: zakładka „Diff" w Inspectorze Codera — liniowy diff LCS oryginału vs kodu
  zrefaktoryzowanego, z licznikiem +/- i podświetleniem dodanych/usuniętych linii.

- Edytowalne, TRWAŁE system prompty agentów: w Inspectorze (zakładka System Prompt)
  edycja + „Zapisz"/„Przywróć domyślny"; zapis w localStorage, przeżywa reset/start.

- Metryki czasu per agent: realny czas pracy każdego agenta (Date.now wokół
  callLLM/runTests) pokazany w Inspectorze (Konfiguracja → „Czas pracy").
- Dostępność: widoczny focus klawiaturą (focus-visible), prefers-reduced-motion,
  responsywne szerokości paneli na węższych ekranach.
- Realne zużycie tokenów per agent: z odpowiedzi API (Gemini/OpenAI/OpenRouter/Anthropic),
  suma w nagłówku („Tokeny") + per agent w Inspectorze.
- **Playground (od siebie):** zakładka „Uruchom" w Inspectorze Codera — wpisz wyrażenie
  (np. `fib(10)`), a apka NAPRAWDĘ wykona je na zrefaktoryzowanym kodzie w tym samym
  izolowanym Web Workerze (limit 5 s), pokazując realny wynik + przechwycony console.log.

## Następne (kolejność)
9. [ ] **Ponów pojedynczy krok** agenta ręcznie po błędzie (wymaga refaktoru scenarioRunner).
10. [ ] Live E2E z prawdziwym kluczem po stronie użytkownika (rano).

## Uwaga o limitach
Cron co 30 min (7,37 * * * *) wznawia pracę, jeśli wywali limit API. Praca sesyjna
napędzana Stop-hookiem celu.
