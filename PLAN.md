# PLAN: SwarmMind — usunięcie pozostałych atrap i doprowadzenie do pełnej sprawności

Stan na 2026-07-05. Audyt kodu: `npm run test` → 14/14 ✅, `npm run build` → ✅.
Rdzeń aplikacji (Architect → Coder → Tester → Reviewer) już woła prawdziwe API
(Gemini / OpenAI / Anthropic) — README mówi prawdę w 80%. Poniżej to, co nadal
jest atrapą lub nie działa, i plan naprawy.

## Zidentyfikowane atrapy / usterki

| # | Problem | Gdzie | Waga |
|---|---------|-------|------|
| 1 | **Tester nie uruchamia testów** — LLM ma w prompcie "zasymuluj uruchomienie tych testów" i zmyśla logi `PASS ...` oraz flagę `success`. Wynik testów to halucynacja, na której Reviewer opiera werdykt. | `src/store/useSwarmStore.ts:42` (system prompt), `src/utils/scenarioRunner.ts:188-238` | **Krytyczna** — to główny mock |
| 2 | **Provider Anthropic martwy** — model `claude-3-5-sonnet-latest` wycofany 2025-10-28 → API zwraca 404. Dodatkowo nowe modele (Sonnet 5+) odrzucają parametr `temperature` (400). | `src/services/llmService.ts:154,159` | Wysoka |
| 3 | **Etykieta modelu w UI to atrapa** — każdy agent ma na sztywno `model: 'Gemini 2.5 Flash / GPT-4o-mini'` niezależnie od wybranego providera. | `src/store/useSwarmStore.ts:19,30,41,52`, wyświetlane w `AgentInspector.tsx:132` | Średnia |
| 4 | **Opis roli Reviewera kłamie** — "uruchamia testy", a niczego nie uruchamia. | `src/store/useSwarmStore.ts:49` | Niska |
| 5 | **Teatralne opóźnienia** — `delay(1500)` / `delay(2000)` "visual breathing room" wydłużają przebieg o ~10 s niezależnie od API. | `src/utils/scenarioRunner.ts:55,100,130,179,196,248,265,336` | Niska (UX, nie mock) |
| 6 | **Martwe assety szablonu Vite** — `hero.png`, `react.svg`, `vite.svg` nigdzie nieużywane (grep: 0 trafień). | `src/assets/` | Kosmetyka |

## Plan naprawy

### Etap 1 — prawdziwe uruchamianie testów (usuwa mock #1)

Cel: wynik testów ma pochodzić z faktycznego wykonania kodu, nie z wyobraźni LLM.

1. Nowy moduł `src/services/testRunner.ts`:
   - uruchamia **zrefaktoryzowany kod + wygenerowane testy w sandboksowanym Web Workerze**
     (osobny wątek, `terminate()` po timeout 5 s — chroni UI przed pętlą nieskończoną),
   - wstrzykuje mini-harness: `describe`, `it/test`, `expect` (toBe, toEqual, toThrow,
     toBeCloseTo — wystarczy dla testów generowanych przez LLM w stylu Vitest),
   - zbiera prawdziwe wyniki: lista testów, pass/fail, komunikaty błędów, czas,
   - zwraca `{ success: boolean, results: string, passed: number, failed: number }`.
2. Zmiana promptu Testera (`useSwarmStore.ts`): generuje **tylko** `explanation` + `testCode`
   (czysty JS, bez importów, styl describe/it/expect). Pola `testResults` i `success`
   znikają z odpowiedzi LLM — dostarcza je runner.
3. `scenarioRunner.ts`: po odpowiedzi Testera wywołaj `runTests(refactoredCode, testCode)`;
   prawdziwy wynik idzie do logów, do panelu "KONSOLA TESTOWA" (AgentInspector) i do
   promptu Reviewera. Gdy testy się wywalą składniowo → status `error` + feedback do Codera
   (to naturalnie wzmacnia pętlę iteracji).
4. Ograniczenie do zakomunikowania w UI (placeholder pola kodu + README): rój refaktoryzuje
   **JavaScript** — tylko JS da się wykonać w przeglądarce. Kod w innym języku = testy
   generowane, ale nie wykonywane (jasny komunikat zamiast cichej symulacji).
5. Testy jednostkowe dla harnessa (`__tests__/testRunner.test.ts`): kod poprawny,
   kod z błędem, test failujący, timeout/pętla nieskończona.

### Etap 2 — naprawa providerów AI (usuwa #2 i #3)

1. `llmService.ts`: `claude-3-5-sonnet-latest` → **`claude-sonnet-5`**; przy tej zmianie
   **usunąć `temperature`** z requestu Anthropic (Sonnet 5 odrzuca niedomyślne wartości
   samplingu — 400). Alternatywa budżetowa: `claude-haiku-4-5`.
2. Zweryfikować (test na żywo z kluczem) aktualność `gemini-2.5-flash` i `gpt-4o-mini`;
   w razie wycofania podmienić.
3. Wynieść identyfikatory modeli do stałej `PROVIDER_MODELS` w jednym miejscu
   (`llmService.ts` eksportuje, store/UI importują) — koniec z rozjazdem kod ↔ etykieta.
4. Pole `model` agenta ustawiać dynamicznie z aktualnie wybranego providera
   (AgentInspector i StatusHeader pokazują prawdę).

### Etap 3 — porządki (usuwa #4, #5, #6)

1. Rola Reviewera: "Ocenia kod i raport z testów, wydaje werdykt" (bez "uruchamia testy").
2. Opóźnienia: skrócić do 300–500 ms (płynność animacji SVG) — prawdziwe wywołania API
   dają wystarczającą "dramaturgię"; suwak prędkości 1×/2×/4× zostaje.
3. Usunąć `src/assets/hero.png`, `react.svg`, `vite.svg`.
4. README: zaktualizować sekcję "Real AI Multi-Agent Loop" — opisać prawdziwy test runner
   (Web Worker) i nowy model Anthropic; usunąć wzmiankę o symulowaniu testów z opisu Testera.

### Etap 4 — weryfikacja (dowód przed "gotowe")

1. `npm run test` — wszystkie stare + nowe testy zielone.
2. `npm run build` — czysty build TS.
3. Przebieg E2E w przeglądarce z prawdziwym kluczem API (Gemini — darmowy tier):
   pełny cykl Architect→Coder→Tester→Reviewer na domyślnym Fibonaccim,
   w tym co najmniej jeden przebieg, gdzie testy realnie wykonują się w workerze.
   **Wymaga klucza od Mateusza** — bez niego weryfikacja kończy się na testach jednostkowych.
4. Szybki test ścieżki błędu: zły klucz API → czytelny komunikat, brak zwisu UI.

## Kolejność i szacunek

Etap 2 (½ h) → Etap 1 (2–3 h, największy) → Etap 3 (½ h) → Etap 4 (½ h + klucz API).
Etap 2 najpierw, bo bez działającego providera nie da się zweryfikować Etapu 1 na żywo.
