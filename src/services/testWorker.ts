// Web Worker: wykonuje harness/eval w osobnym wątku, żeby pętla nieskończona w kodzie
// użytkownika nie zamroziła UI (główny wątek robi terminate() po timeout).
import { runHarness, runExpression } from './testHarness';

interface TestRequest {
  mode?: 'test';
  code: string;
  testCode: string;
}

interface EvalRequest {
  mode: 'eval';
  code: string;
  expr: string;
}

type WorkerRequest = TestRequest | EvalRequest;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  const result = msg.mode === 'eval'
    ? runExpression(msg.code, msg.expr)
    : runHarness(msg.code, (msg as TestRequest).testCode);
  (self as unknown as Worker).postMessage(result);
};
