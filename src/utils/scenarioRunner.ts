import { useSwarmStore } from '../store/useSwarmStore';
import { callLLM } from '../services/llmService';
import { runTests } from '../services/testRunner';
import { friendlyError } from './friendlyError';
import { saveRun } from './runHistory';
import type { AgentId } from '../types';

// LLM-y (zwłaszcza w trybie responseMimeType: application/json) potrafią zwrócić
// pole jako zagnieżdżony obiekt/tablicę zamiast stringa. Zamiast wywalać cały rój,
// sprowadzamy wartość do czytelnego tekstu.
const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// Helper to check if the swarm is paused, blocking until unpaused
const checkPause = async () => {
  while (true) {
    const state = useSwarmStore.getState();
    if (!state.isRunning) {
      throw new Error('SWARM_STOPPED');
    }
    if (!state.isPaused) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

export async function runSwarmOrchestration() {
  const store = useSwarmStore.getState();
  const goal = store.goal;
  const inputCode = store.inputCode;
  const settings = store.settings;
  
  let currentIteration = 1;
  // Rój pętli aż osiągnie cel; sufit chroni przed nieskończonym zużyciem API,
  // gdy zadanie jest sprzeczne lub model nie potrafi go domknąć.
  const maxIterations = 10;
  
  let blueprint = '';
  let refactoredCode = '';
  let unitTests = '';
  let testResults = '';
  let reviewerFeedback = '';
  
  try {
    // -------------------------------------------------------------
    // TASK 1: ARCHITECT (Analysis and Planning)
    // -------------------------------------------------------------
    await checkPause();
    store.setActiveTaskIndex(0);
    store.setCurrentStepDescription('Krok 1/4: AetherArchitect analizuje kod źródłowy i planuje architekturę...');
    store.updateAgent('architect', { status: 'thinking', currentTask: 'Analizowanie kodu i tworzenie planu refaktoryzacji...' });
    store.addLog({
      agentId: 'architect',
      agentName: 'AetherArchitect',
      message: 'Rozpoczynam analizę oryginalnego kodu i założeń refaktoryzacji.',
      type: 'thought'
    });
    
    await checkPause();
    store.updateAgent('architect', { status: 'working' });
    const architectStart = Date.now();

    const architectResult = await callLLM({
      agentId: 'architect',
      agentRole: store.agents.architect.role,
      systemPrompt: store.agents.architect.systemPrompt,
      userPrompt: `Oryginalny kod:\n\`\`\`\n${inputCode}\n\`\`\`\n\nCel refaktoryzacji:\n${goal}\n\nAnalizuj kod i stwórz plan refaktoryzacji. Twoja odpowiedź MUSI być czystym JSON z polami 'explanation' i 'blueprint'.`,
      settings
    });
    
    await checkPause();
    
    const architectExplanation = asText(architectResult?.explanation);
    blueprint = asText(architectResult?.blueprint);
    if (!blueprint) {
      throw new Error('Architect zwrócił niekompletną odpowiedź (brak pola blueprint).');
    }
    if (!architectExplanation) {
      throw new Error('Architect zwrócił niekompletną odpowiedź (brak pola explanation).');
    }
    store.updateAgent('architect', {
      status: 'success',
      currentTask: 'Zakończono planowanie.',
      codeContent: blueprint,
      durationMs: Date.now() - architectStart
    });
    store.addLog({
      agentId: 'architect',
      agentName: 'AetherArchitect',
      message: `Stworzyłem plan refaktoryzacji:\n${architectExplanation}`,
      type: 'action',
      details: blueprint
    });
    store.updateTask('task_analysis', { status: 'completed' });
    
    // Transmit data to Coder — krawędź świeci, dopóki Coder realnie pracuje.
    store.updateConnection('architect', 'coder', { isActive: true, status: 'transmitting' });
    store.addLog({
      agentName: 'System',
      message: 'Przesyłanie blueprintu architektonicznego do ValkyrieCoder...',
      type: 'system'
    });

    // -------------------------------------------------------------
    // ITERATIVE LOOP: CODER -> TESTER -> REVIEWER -> CODER
    // -------------------------------------------------------------
    while (currentIteration <= maxIterations) {
      await checkPause();
      store.setActiveTaskIndex(1);
      
      const stepText = currentIteration > 1 
        ? `Krok 2/4 (Iteracja ${currentIteration}): ValkyrieCoder poprawia kod na podstawie uwag Reviewera...`
        : 'Krok 2/4: ValkyrieCoder implementuje zrefaktoryzowany kod...';
        
      store.setCurrentStepDescription(stepText);
      store.updateAgent('coder', { 
        status: 'thinking', 
        currentTask: currentIteration > 1 ? `Poprawianie kodu (Iteracja ${currentIteration})...` : 'Zapisywanie kodu na podstawie planu...' 
      });
      
      store.addLog({
        agentId: 'coder',
        agentName: 'ValkyrieCoder',
        message: currentIteration > 1 
          ? `Rozpoczynam poprawianie kodu. Uwzględniam feedback: "${reviewerFeedback}"`
          : 'Przystępuję do pisania kodu według założeń architekta.',
        type: 'thought'
      });
      
      await checkPause();
      store.updateAgent('coder', { status: 'working' });
      const coderStart = Date.now();

      const coderResult = await callLLM({
        agentId: 'coder',
        agentRole: store.agents.coder.role,
        systemPrompt: store.agents.coder.systemPrompt,
        userPrompt: `Oryginalny kod:\n\`\`\`\n${inputCode}\n\`\`\`\n\nPlan refaktoryzacji:\n${blueprint}\n\n${
          currentIteration > 1 ? `Poprzednie uwagi od Reviewera (Musisz je poprawić!):\n${reviewerFeedback}\n\n` : ''
        }Zaimplementuj refaktoryzację kodu. Twoja odpowiedź MUSI być czystym JSON z polami 'explanation' i 'code'.`,
        settings
      });
      
      await checkPause();
      // Coder skończył — gaśnie krawędź, którą przyszły dane (architekt lub reviewer).
      store.updateConnection('architect', 'coder', { isActive: false, status: 'idle' });
      store.updateConnection('reviewer', 'coder', { isActive: false, status: 'idle' });

      const coderExplanation = asText(coderResult?.explanation);
      refactoredCode = asText(coderResult?.code);
      if (!refactoredCode) {
        throw new Error('Coder zwrócił niekompletną odpowiedź (brak pola code).');
      }
      if (!coderExplanation) {
        throw new Error('Coder zwrócił niekompletną odpowiedź (brak pola explanation).');
      }
      
      store.updateAgent('coder', {
        status: 'success',
        currentTask: 'Kod zaimplementowany.',
        codeContent: refactoredCode,
        durationMs: Date.now() - coderStart
      });
      
      store.addLog({
        agentId: 'coder',
        agentName: 'ValkyrieCoder',
        message: `Kod zaimplementowany:\n${coderExplanation}`,
        type: 'code',
        details: refactoredCode
      });
      store.updateTask('task_coding', { status: 'completed' });
      
      // Transmit data to Tester — krawędź świeci przez czas realnej pracy Testera.
      store.updateConnection('coder', 'tester', { isActive: true, status: 'transmitting' });
      store.addLog({
        agentName: 'System',
        message: 'Przesyłanie kodu do TracerTester...',
        type: 'system'
      });

      // -------------------------------------------------------------
      // TASK 3: TESTER (Unit Testing)
      // -------------------------------------------------------------
      store.setActiveTaskIndex(2);
      store.setCurrentStepDescription('Krok 3/4: TracerTester pisze i uruchamia testy jednostkowe...');
      store.updateAgent('tester', { status: 'thinking', currentTask: 'Pisanie testów jednostkowych...' });
      store.addLog({
        agentId: 'tester',
        agentName: 'TracerTester',
        message: 'Rozpoczynam generowanie zestawu testów jednostkowych dla zrefaktoryzowanego kodu.',
        type: 'thought'
      });

      await checkPause();
      store.updateAgent('tester', { status: 'working' });
      const testerStart = Date.now();

      const testerResult = await callLLM({
        agentId: 'tester',
        agentRole: store.agents.tester.role,
        systemPrompt: store.agents.tester.systemPrompt,
        userPrompt: `Zrefaktoryzowany kod:\n\`\`\`\n${refactoredCode}\n\`\`\`\n\nOryginalny kod:\n\`\`\`\n${inputCode}\n\`\`\`\n\nCel refaktoryzacji:\n${goal}\n\nWygeneruj testy jednostkowe w czystym JavaScript (styl describe/it/expect, bez importów). Twoja odpowiedź MUSI być czystym JSON z polami 'explanation' oraz 'testCode'. NIE zgaduj wyników — testy zostaną naprawdę uruchomione.`,
        settings
      });

      await checkPause();

      const testerExplanation = asText(testerResult?.explanation);
      unitTests = asText(testerResult?.testCode);
      if (!unitTests) {
        throw new Error('Tester zwrócił niekompletną odpowiedź (brak pola testCode).');
      }
      if (!testerExplanation) {
        throw new Error('Tester zwrócił niekompletną odpowiedź (brak pola explanation).');
      }

      // REALNE wykonanie testów w izolowanym Web Workerze — bez symulacji.
      store.updateAgent('tester', { status: 'working', currentTask: 'Uruchamiam testy w izolowanym workerze...' });
      const testRun = await runTests(refactoredCode, unitTests);
      await checkPause();
      store.updateConnection('coder', 'tester', { isActive: false, status: 'idle' });

      const testsPassed = testRun.success;
      testResults = testRun.error
        ? (testRun.log ? `${testRun.log}\n\n${testRun.error}` : testRun.error)
        : `${testRun.log}\n\nRAZEM: ${testRun.passed} zaliczonych, ${testRun.failed} niezaliczonych.`;

      store.updateAgent('tester', {
        status: testsPassed ? 'success' : 'error',
        currentTask: testsPassed
          ? `Testy zaliczone (${testRun.passed}/${testRun.passed + testRun.failed}).`
          : 'Wykryto niezaliczone testy lub błąd wykonania.',
        codeContent: unitTests,
        testContent: testResults,
        durationMs: Date.now() - testerStart
      });

      store.addLog({
        agentId: 'tester',
        agentName: 'TracerTester',
        message: `Testy wykonane w workerze. Wynik: ${testsPassed ? 'SUKCES' : 'BŁĄD'} (${testRun.passed} zaliczonych, ${testRun.failed} niezaliczonych)`,
        type: testsPassed ? 'success' : 'error',
        details: `KOD TESTÓW:\n${unitTests}\n\nWYNIK URUCHOMIENIA:\n${testResults}`
      });
      store.updateTask('task_testing', { status: testsPassed ? 'completed' : 'failed' });
      
      // Transmit data to Reviewer — krawędź świeci przez czas realnej pracy Reviewera.
      store.updateConnection('tester', 'reviewer', { isActive: true, status: 'transmitting' });
      store.addLog({
        agentName: 'System',
        message: 'Przesyłanie kodu i raportu z testów do SpecterReviewer...',
        type: 'system'
      });

      // -------------------------------------------------------------
      // TASK 4: REVIEWER (Code Review and Approval)
      // -------------------------------------------------------------
      store.setActiveTaskIndex(3);
      store.setCurrentStepDescription('Krok 4/4: SpecterReviewer dokonuje inspekcji kodu i zatwierdza pull request...');
      store.updateAgent('reviewer', { status: 'thinking', currentTask: 'Analizowanie kodu, testów i wyników...' });
      store.addLog({
        agentId: 'reviewer',
        agentName: 'SpecterReviewer',
        message: 'Rozpoczynam pełen Code Review zrefaktoryzowanego kodu i testów.',
        type: 'thought'
      });
      
      await checkPause();
      store.updateAgent('reviewer', { status: 'working' });
      const reviewerStart = Date.now();

      const reviewerResult = await callLLM({
        agentId: 'reviewer',
        agentRole: store.agents.reviewer.role,
        systemPrompt: store.agents.reviewer.systemPrompt,
        userPrompt: `Zrefaktoryzowany kod:\n\`\`\`\n${refactoredCode}\n\`\`\`\n\nTesty jednostkowe:\n\`\`\`\n${unitTests}\n\`\`\`\n\nWyniki testów:\n${testResults}\n\nOceń kod pod kątem bezpieczeństwa, wydajności i kompletności. Twoja odpowiedź MUSI być czystym JSON z polami 'explanation', 'approved' (boolean) i 'feedback'.`,
        settings
      });
      
      await checkPause();
      store.updateConnection('tester', 'reviewer', { isActive: false, status: 'idle' });

      if (reviewerResult?.approved === undefined) {
        throw new Error('Reviewer zwrócił niekompletną odpowiedź (brak pola approved).');
      }
      const reviewerExplanation = asText(reviewerResult?.explanation);
      reviewerFeedback = asText(reviewerResult?.feedback);
      if (!reviewerFeedback) {
        throw new Error('Reviewer zwrócił niekompletną odpowiedź (brak pola feedback).');
      }
      if (!reviewerExplanation) {
        throw new Error('Reviewer zwrócił niekompletną odpowiedź (brak pola explanation).');
      }

      // approved bywa boolem albo stringiem "true"/"false" — normalizujemy.
      const approved = typeof reviewerResult.approved === 'boolean'
        ? reviewerResult.approved
        : String(reviewerResult.approved).toLowerCase() === 'true';
      
      store.updateAgent('reviewer', {
        status: approved ? 'success' : 'error',
        currentTask: approved ? 'Kod zatwierdzony!' : 'Odrzucono - wymaga poprawek.',
        feedback: reviewerFeedback,
        durationMs: Date.now() - reviewerStart
      });
      
      store.addLog({
        agentId: 'reviewer',
        agentName: 'SpecterReviewer',
        message: `Werdykt Code Review: ${approved ? 'ZATWIERDZONY' : 'ODRZUCONY'}\nPodsumowanie: ${reviewerExplanation}`,
        type: approved ? 'success' : 'error',
        details: reviewerFeedback
      });
      store.updateTask('task_review', { status: approved ? 'completed' : 'failed' });
      
      if (approved) {
        // SWARM SUCCESS
        store.setCurrentStepDescription('Sukces! Rój pomyślnie zrefaktoryzował i przetestował kod.');
        store.addLog({
          agentName: 'System',
          message: 'Proces zakończony sukcesem. Kod został w pełni zrefaktoryzowany i zatwierdzony przez Reviewera.',
          type: 'success'
        });
        saveRun({
          id: `run_${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          goal, provider: settings.preferProvider, outcome: 'success', iterations: currentIteration,
          inputCode, blueprint, code: refactoredCode, tests: unitTests, testResults, reviewerFeedback,
          summary: 'Zatwierdzono przez Reviewera.'
        });
        store.setRunningState(false);
        return;
      } else {
        // REJECTED - Need loopback
        if (currentIteration === maxIterations) {
          throw new Error('Przekroczono maksymalną liczbę iteracji przeglądu kodu. Rój nie zdołał wypracować akceptowalnego rozwiązania.');
        }
        
        // Setup loopback transmit connection (Reviewer -> Coder) — gaśnie, gdy Coder skończy poprawki.
        store.updateConnection('reviewer', 'coder', { isActive: true, status: 'transmitting' });
        store.addLog({
          agentName: 'System',
          message: `Odrzucono! Przesyłanie uwag krytycznych z powrotem do ValkyrieCoder (Iteracja ${currentIteration}/${maxIterations})...`,
          type: 'system'
        });

        // Reset tasks state for loopback
        store.updateTask('task_coding', { status: 'pending' });
        store.updateTask('task_testing', { status: 'pending' });
        store.updateTask('task_review', { status: 'pending' });

        currentIteration++;
      }
    }
  } catch (err: any) {
    if (err.message === 'SWARM_STOPPED') {
      return;
    }
    
    console.error('Swarm error:', err);
    
    // Set active task failed
    const activeIndex = useSwarmStore.getState().activeTaskIndex;
    const task = useSwarmStore.getState().tasks[activeIndex];
    if (task) {
      store.updateTask(task.id, { status: 'failed' });
    }
    
    // Set all thinking/working agents to error
    const agents = useSwarmStore.getState().agents;
    Object.keys(agents).forEach((key) => {
      const aId = key as AgentId;
      if (agents[aId].status === 'thinking' || agents[aId].status === 'working') {
        store.updateAgent(aId, { status: 'error', currentTask: 'Wystąpił błąd w zadaniu.' });
      }
    });
    
    const raw = String(err?.message || err);
    const fe = friendlyError(raw);
    saveRun({
      id: `run_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      goal, provider: settings.preferProvider, outcome: 'error', iterations: currentIteration,
      inputCode, blueprint, code: refactoredCode, tests: unitTests, testResults, reviewerFeedback,
      summary: fe.message
    });
    store.addLog({
      agentName: 'System',
      message: fe.hint ? `${fe.message} — ${fe.hint}` : fe.message,
      type: 'error',
      details: raw // pełna, surowa treść pod „Pokaż kod" dla diagnostyki
    });
    store.setCurrentStepDescription(fe.hint ? `${fe.message} — ${fe.hint}` : fe.message);
    store.setRunningState(false);
  }
}
