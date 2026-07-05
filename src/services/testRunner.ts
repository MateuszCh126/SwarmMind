// Publiczne API uruchamiania testów. W przeglądarce wykonuje harness w izolowanym
// Web Workerze z twardym limitem czasu (ochrona przed pętlą nieskończoną). Gdy Worker
// jest niedostępny (np. środowisko testów jednostkowych), wykonuje harness synchronicznie.
import { runHarness, runExpression } from './testHarness';
import type { HarnessResult, EvalResult } from './testHarness';

export type { HarnessResult, EvalResult } from './testHarness';

const TIMEOUT_MS = 5000;

export function runTests(code: string, testCode: string): Promise<HarnessResult> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(runHarness(code, testCode));
  }

  return new Promise<HarnessResult>((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./testWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      // Brak wsparcia dla module workerów — wykonaj bez izolacji zamiast symulować.
      resolve(runHarness(code, testCode));
      return;
    }

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        success: false,
        passed: 0,
        failed: 0,
        cases: [],
        log: '',
        error: `Przekroczono limit ${TIMEOUT_MS} ms — prawdopodobna pętla nieskończona w kodzie.`,
      });
    }, TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<HarnessResult>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({
        success: false,
        passed: 0,
        failed: 0,
        cases: [],
        log: '',
        error: `Błąd wykonania w workerze: ${err.message || 'nieznany'}`,
      });
    };

    worker.postMessage({ code, testCode });
  });
}

// Playground: uruchamia pojedyncze wyrażenie na kodzie użytkownika w izolowanym workerze
// (ten sam mechanizm i limit czasu co testy). Fallback synchroniczny, gdy brak Workera.
export function runExpressionSandboxed(code: string, expr: string): Promise<EvalResult> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(runExpression(code, expr));
  }

  return new Promise<EvalResult>((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./testWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(runExpression(code, expr));
      return;
    }

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ ok: false, value: '', logs: '', error: `Przekroczono limit ${TIMEOUT_MS} ms — prawdopodobna pętla nieskończona.` });
    }, TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<EvalResult>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, value: '', logs: '', error: `Błąd wykonania w workerze: ${err.message || 'nieznany'}` });
    };

    worker.postMessage({ mode: 'eval', code, expr });
  });
}
