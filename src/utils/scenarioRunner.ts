import { useSwarmStore } from '../store/useSwarmStore';
import { callLLM } from '../services/llmService';
import type { AgentId } from '../types';

// Helper to wait for a given duration (adjustable by speed factor)
const delay = (ms: number) => {
  const speed = useSwarmStore.getState().settings.speed;
  return new Promise((resolve) => setTimeout(resolve, ms / speed));
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
  const maxIterations = 3;
  
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
    
    await delay(1500); // Visual breathing room
    await checkPause();
    
    store.updateAgent('architect', { status: 'working' });
    
    const architectResult = await callLLM({
      agentId: 'architect',
      agentRole: store.agents.architect.role,
      systemPrompt: store.agents.architect.systemPrompt,
      userPrompt: `Oryginalny kod:\n\`\`\`\n${inputCode}\n\`\`\`\n\nCel refaktoryzacji:\n${goal}\n\nAnalizuj kod i stwórz plan refaktoryzacji. Twoja odpowiedź MUSI być czystym JSON z polami 'explanation' i 'blueprint'.`,
      settings
    });
    
    await checkPause();
    
    if (typeof architectResult?.blueprint !== 'string' || !architectResult.blueprint) {
      throw new Error('Architect zwrócił niekompletną odpowiedź (brak pola blueprint).');
    }
    if (typeof architectResult?.explanation !== 'string' || !architectResult.explanation) {
      throw new Error('Architect zwrócił niekompletną odpowiedź (brak pola explanation).');
    }
    
    blueprint = architectResult.blueprint;
    store.updateAgent('architect', { 
      status: 'success', 
      currentTask: 'Zakończono planowanie.',
      codeContent: blueprint 
    });
    store.addLog({
      agentId: 'architect',
      agentName: 'AetherArchitect',
      message: `Stworzyłem plan refaktoryzacji:\n${architectResult.explanation}`,
      type: 'action',
      details: blueprint
    });
    store.updateTask('task_analysis', { status: 'completed' });
    
    // Transmit data to Coder
    store.updateConnection('architect', 'coder', { isActive: true, status: 'transmitting' });
    store.addLog({
      agentName: 'System',
      message: 'Przesyłanie blueprintu architektonicznego do ValkyrieCoder...',
      type: 'system'
    });
    
    await delay(2000);
    await checkPause();
    store.updateConnection('architect', 'coder', { isActive: false, status: 'idle' });
    
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
      
      await delay(1500);
      await checkPause();
      
      store.updateAgent('coder', { status: 'working' });
      
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
      
      if (typeof coderResult?.code !== 'string' || !coderResult.code) {
        throw new Error('Coder zwrócił niekompletną odpowiedź (brak pola code).');
      }
      if (typeof coderResult?.explanation !== 'string' || !coderResult.explanation) {
        throw new Error('Coder zwrócił niekompletną odpowiedź (brak pola explanation).');
      }
      
      refactoredCode = coderResult.code;
      
      store.updateAgent('coder', { 
        status: 'success', 
        currentTask: 'Kod zaimplementowany.',
        codeContent: refactoredCode 
      });
      
      store.addLog({
        agentId: 'coder',
        agentName: 'ValkyrieCoder',
        message: `Kod zaimplementowany:\n${coderResult.explanation}`,
        type: 'code',
        details: refactoredCode
      });
      store.updateTask('task_coding', { status: 'completed' });
      
      // Transmit data to Tester
      store.updateConnection('coder', 'tester', { isActive: true, status: 'transmitting' });
      store.addLog({
        agentName: 'System',
        message: 'Przesyłanie kodu do TracerTester...',
        type: 'system'
      });
      
      await delay(2000);
      await checkPause();
      store.updateConnection('coder', 'tester', { isActive: false, status: 'idle' });
      
      // -------------------------------------------------------------
      // TASK 3: TESTER (Unit Testing)
      // -------------------------------------------------------------
      store.setActiveTaskIndex(2);
      store.setCurrentStepDescription('Krok 3/4: TracerTester pisze i uruchamia testy jednostkowe...');
      store.updateAgent('tester', { status: 'thinking', currentTask: 'Pisanie testów jednostkowych i symulowanie wykonania...' });
      store.addLog({
        agentId: 'tester',
        agentName: 'TracerTester',
        message: 'Rozpoczynam generowanie zestawu testów jednostkowych dla zrefaktoryzowanego kodu.',
        type: 'thought'
      });
      
      await delay(1500);
      await checkPause();
      store.updateAgent('tester', { status: 'working' });
      
      const testerResult = await callLLM({
        agentId: 'tester',
        agentRole: store.agents.tester.role,
        systemPrompt: store.agents.tester.systemPrompt,
        userPrompt: `Zrefaktoryzowany kod:\n\`\`\`\n${refactoredCode}\n\`\`\`\n\nOryginalny kod:\n\`\`\`\n${inputCode}\n\`\`\`\n\nCel refaktoryzacji:\n${goal}\n\nWygeneruj testy jednostkowe. Twoja odpowiedź MUSI być czystym JSON z polami 'explanation', 'testCode', 'testResults' i 'success' (boolean).`,
        settings
      });
      
      await checkPause();
      
      if (typeof testerResult?.testCode !== 'string' || !testerResult.testCode) {
        throw new Error('Tester zwrócił niekompletną odpowiedź (brak pola testCode).');
      }
      if (typeof testerResult?.testResults !== 'string' || !testerResult.testResults) {
        throw new Error('Tester zwrócił niekompletną odpowiedź (brak pola testResults).');
      }
      if (testerResult?.success === undefined) {
        throw new Error('Tester zwrócił niekompletną odpowiedź (brak pola success).');
      }
      
      unitTests = testerResult.testCode;
      testResults = testerResult.testResults;
      const testsPassed = testerResult.success;
      
      store.updateAgent('tester', { 
        status: testsPassed ? 'success' : 'error',
        currentTask: testsPassed ? 'Testy zaliczone.' : 'Wykryto błędy w testach.',
        codeContent: unitTests,
        testContent: testResults
      });
      
      store.addLog({
        agentId: 'tester',
        agentName: 'TracerTester',
        message: `Zestaw testów utworzony. Wynik uruchomienia: ${testsPassed ? 'SUKCES' : 'BŁĄD'}`,
        type: testsPassed ? 'success' : 'error',
        details: `KOD TESTÓW:\n${unitTests}\n\nWYNIK URUCHOMIENIA:\n${testResults}`
      });
      store.updateTask('task_testing', { status: testsPassed ? 'completed' : 'failed' });
      
      // Transmit data to Reviewer
      store.updateConnection('tester', 'reviewer', { isActive: true, status: 'transmitting' });
      store.addLog({
        agentName: 'System',
        message: 'Przesyłanie kodu i raportu z testów do SpecterReviewer...',
        type: 'system'
      });
      
      await delay(2000);
      await checkPause();
      store.updateConnection('tester', 'reviewer', { isActive: false, status: 'idle' });
      
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
      
      await delay(1500);
      await checkPause();
      store.updateAgent('reviewer', { status: 'working' });
      
      const reviewerResult = await callLLM({
        agentId: 'reviewer',
        agentRole: store.agents.reviewer.role,
        systemPrompt: store.agents.reviewer.systemPrompt,
        userPrompt: `Zrefaktoryzowany kod:\n\`\`\`\n${refactoredCode}\n\`\`\`\n\nTesty jednostkowe:\n\`\`\`\n${unitTests}\n\`\`\`\n\nWyniki testów:\n${testResults}\n\nOceń kod pod kątem bezpieczeństwa, wydajności i kompletności. Twoja odpowiedź MUSI być czystym JSON z polami 'explanation', 'approved' (boolean) i 'feedback'.`,
        settings
      });
      
      await checkPause();
      
      if (reviewerResult?.approved === undefined) {
        throw new Error('Reviewer zwrócił niekompletną odpowiedź (brak pola approved).');
      }
      if (typeof reviewerResult?.feedback !== 'string' || !reviewerResult.feedback) {
        throw new Error('Reviewer zwrócił niekompletną odpowiedź (brak pola feedback).');
      }
      if (typeof reviewerResult?.explanation !== 'string' || !reviewerResult.explanation) {
        throw new Error('Reviewer zwrócił niekompletną odpowiedź (brak pola explanation).');
      }
      
      const approved = reviewerResult.approved;
      reviewerFeedback = reviewerResult.feedback;
      
      store.updateAgent('reviewer', {
        status: approved ? 'success' : 'error',
        currentTask: approved ? 'Kod zatwierdzony!' : 'Odrzucono - wymaga poprawek.',
        feedback: reviewerFeedback
      });
      
      store.addLog({
        agentId: 'reviewer',
        agentName: 'SpecterReviewer',
        message: `Werdykt Code Review: ${approved ? 'ZATWIERDZONY' : 'ODRZUCONY'}\nPodsumowanie: ${reviewerResult.explanation}`,
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
        store.setRunningState(false);
        return;
      } else {
        // REJECTED - Need loopback
        if (currentIteration === maxIterations) {
          throw new Error('Przekroczono maksymalną liczbę iteracji przeglądu kodu. Rój nie zdołał wypracować akceptowalnego rozwiązania.');
        }
        
        // Setup loopback transmit connection (Reviewer -> Coder)
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
        
        await delay(2000);
        await checkPause();
        store.updateConnection('reviewer', 'coder', { isActive: false, status: 'idle' });
        
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
    
    store.addLog({
      agentName: 'System',
      message: `Błąd działania roju: ${err.message || err}`,
      type: 'error'
    });
    store.setCurrentStepDescription(`Błąd: ${err.message || err}`);
    store.setRunningState(false);
  }
}
