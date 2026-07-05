// Web Worker: wykonuje harness w osobnym wątku, żeby pętla nieskończona w kodzie
// użytkownika nie zamroziła UI (główny wątek robi terminate() po timeout).
import { runHarness } from './testHarness';
import type { HarnessResult } from './testHarness';

interface RunRequest {
  code: string;
  testCode: string;
}

self.onmessage = (event: MessageEvent<RunRequest>) => {
  const { code, testCode } = event.data;
  const result: HarnessResult = runHarness(code, testCode);
  (self as unknown as Worker).postMessage(result);
};
