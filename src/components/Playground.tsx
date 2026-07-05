import React, { useState } from 'react';
import { runExpressionSandboxed } from '../services/testRunner';
import type { EvalResult } from '../services/testRunner';
import './Playground.css';

interface PlaygroundProps {
  code: string;
}

export const Playground: React.FC<PlaygroundProps> = ({ code }) => {
  const [expr, setExpr] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    const r = await runExpressionSandboxed(code, expr);
    setResult(r);
    setRunning(false);
  };

  return (
    <div className="playground">
      <label className="playground-label">Uruchom wyrażenie na zrefaktoryzowanym kodzie</label>
      <div className="playground-input-row">
        <input
          className="playground-input"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !running && expr.trim()) run(); }}
          placeholder="np. fib(10)"
          spellCheck={false}
        />
        <button className="playground-run" onClick={run} disabled={running || !expr.trim()}>
          {running ? '…' : 'Uruchom'}
        </button>
      </div>

      {result && (
        <div className="playground-output">
          {result.error ? (
            <div className="playground-error">✗ {result.error}</div>
          ) : (
            <div className="playground-value">⟶ {result.value}</div>
          )}
          {result.logs && <pre className="playground-logs">{result.logs}</pre>}
        </div>
      )}

      <span className="playground-hint">Wykonanie w izolowanym Web Workerze (limit 5 s). Tylko JavaScript.</span>
    </div>
  );
};
export default Playground;
