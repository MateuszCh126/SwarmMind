import { describe, it, expect } from 'vitest';
import { buildReport } from '../utils/exportResult';

describe('buildReport — raport z wyniku roju', () => {
  const full = {
    goal: 'Zoptymalizuj fib',
    inputCode: 'function fib(n){return n;}',
    blueprint: 'memoizacja',
    code: 'function fib(n){/*opt*/}',
    tests: "it('ok',()=>{})",
    testResults: 'PASS ok',
    reviewerFeedback: 'LGTM',
  };

  it('zawiera wszystkie sekcje i wstawione treści', () => {
    const md = buildReport(full);
    expect(md).toContain('# SwarmMind');
    expect(md).toContain('Zoptymalizuj fib');
    expect(md).toContain('function fib(n){/*opt*/}');
    expect(md).toContain("it('ok',()=>{})");
    expect(md).toContain('PASS ok');
    expect(md).toContain('LGTM');
    // kod w blokach ```
    expect(md).toContain('```javascript');
  });

  it('wstawia (brak) dla pustych pól zamiast pustki', () => {
    const md = buildReport({
      goal: '', inputCode: '', blueprint: '', code: '', tests: '', testResults: '', reviewerFeedback: '',
    });
    expect((md.match(/\(brak\)/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});
