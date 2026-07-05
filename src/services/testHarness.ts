// Prawdziwy harness testowy — wykonuje kod użytkownika + wygenerowane testy w tym
// samym zakresie i zbiera REALNE wyniki. Żadnej symulacji: pass/fail pochodzi z
// faktycznego wykonania asercji. Czysta funkcja (bez Worker/DOM), dzięki czemu jest
// w pełni testowalna jednostkowo w Node/vitest. Izolację i ochronę przed pętlą
// nieskończoną zapewnia warstwa Web Worker w testRunner.ts.

export interface TestCaseResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface HarnessResult {
  success: boolean;
  passed: number;
  failed: number;
  cases: TestCaseResult[];
  log: string;
  error?: string;
}

function format(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(b, key) &&
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

// Minimalny odpowiednik expect() w stylu Vitest/Jest — tyle matcherów, ile realnie
// generują LLM-y dla prostych funkcji. Rzuca Error przy niespełnionej asercji.
function makeExpect() {
  return function expect(actual: any) {
    const assert = (condition: boolean, message: string, negate: boolean) => {
      if (negate ? condition : !condition) {
        throw new Error(negate ? `NOT ${message}` : message);
      }
    };

    const build = (negate: boolean) => ({
      toBe(expected: unknown) {
        assert(Object.is(actual, expected), `expected ${format(actual)} to be ${format(expected)}`, negate);
      },
      toEqual(expected: unknown) {
        assert(deepEqual(actual, expected), `expected ${format(actual)} to equal ${format(expected)}`, negate);
      },
      toStrictEqual(expected: unknown) {
        assert(deepEqual(actual, expected), `expected ${format(actual)} to strictly equal ${format(expected)}`, negate);
      },
      toBeCloseTo(expected: number, precision = 2) {
        const pass = Math.abs(actual - expected) < Math.pow(10, -precision) / 2;
        assert(pass, `expected ${format(actual)} to be close to ${format(expected)}`, negate);
      },
      toBeTruthy() {
        assert(Boolean(actual), `expected ${format(actual)} to be truthy`, negate);
      },
      toBeFalsy() {
        assert(!actual, `expected ${format(actual)} to be falsy`, negate);
      },
      toBeNull() {
        assert(actual === null, `expected ${format(actual)} to be null`, negate);
      },
      toBeUndefined() {
        assert(actual === undefined, `expected ${format(actual)} to be undefined`, negate);
      },
      toBeDefined() {
        assert(actual !== undefined, `expected ${format(actual)} to be defined`, negate);
      },
      toBeNaN() {
        assert(Number.isNaN(actual), `expected ${format(actual)} to be NaN`, negate);
      },
      toContain(expected: unknown) {
        const pass = actual != null && typeof actual.includes === 'function' && actual.includes(expected as never);
        assert(Boolean(pass), `expected ${format(actual)} to contain ${format(expected)}`, negate);
      },
      toHaveLength(expected: number) {
        assert(actual != null && actual.length === expected, `expected length ${format(actual?.length)} to be ${expected}`, negate);
      },
      toBeGreaterThan(expected: number) {
        assert(actual > expected, `expected ${format(actual)} to be greater than ${format(expected)}`, negate);
      },
      toBeGreaterThanOrEqual(expected: number) {
        assert(actual >= expected, `expected ${format(actual)} to be >= ${format(expected)}`, negate);
      },
      toBeLessThan(expected: number) {
        assert(actual < expected, `expected ${format(actual)} to be less than ${format(expected)}`, negate);
      },
      toBeLessThanOrEqual(expected: number) {
        assert(actual <= expected, `expected ${format(actual)} to be <= ${format(expected)}`, negate);
      },
      toThrow(expected?: string | RegExp) {
        if (typeof actual !== 'function') {
          throw new Error('toThrow oczekuje funkcji jako argumentu expect()');
        }
        let thrown: unknown;
        let didThrow = false;
        try {
          actual();
        } catch (err) {
          didThrow = true;
          thrown = err;
        }
        let pass = didThrow;
        if (didThrow && expected !== undefined) {
          const msg = thrown instanceof Error ? thrown.message : String(thrown);
          pass = expected instanceof RegExp ? expected.test(msg) : msg.includes(expected);
        }
        assert(pass, `expected function to throw${expected !== undefined ? ` matching ${format(expected)}` : ''}`, negate);
      },
    });

    const matchers = build(false) as ReturnType<typeof build> & { not: ReturnType<typeof build> };
    matchers.not = build(true);
    return matchers;
  };
}

// Usuwa konstrukcje modułowe, których nie da się wykonać przez new Function
// (import/export). Nie transpiluje TypeScriptu — kod ma być wykonywalnym JS.
function sanitize(source: string): string {
  return source
    .replace(/^\s*import\s.*(from\s.*)?;?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(?=(const|let|var|function|class|async))/gm, '');
}

export function runHarness(code: string, testCode: string): HarnessResult {
  const cases: TestCaseResult[] = [];

  const it = (name: string, fn: () => void) => {
    try {
      fn();
      cases.push({ name, passed: true });
    } catch (err) {
      cases.push({ name, passed: false, error: err instanceof Error ? err.message : String(err) });
    }
  };
  const describe = (_name: string, fn: () => void) => {
    fn();
  };
  const expect = makeExpect();

  const body = `"use strict";\n${sanitize(code)}\n;\n${sanitize(testCode)}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const runner = new Function('describe', 'it', 'test', 'expect', body);
    runner(describe, it, it, expect);
  } catch (err) {
    return {
      success: false,
      passed: 0,
      failed: 0,
      cases,
      log: cases.map(formatCase).join('\n'),
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const passed = cases.filter((c) => c.passed).length;
  const failed = cases.length - passed;
  const log = cases.map(formatCase).join('\n');

  return {
    success: cases.length > 0 && failed === 0,
    passed,
    failed,
    cases,
    log,
    error: cases.length === 0 ? 'Nie wykryto żadnych testów (brak wywołań it()/test()).' : undefined,
  };
}

function formatCase(c: TestCaseResult): string {
  return c.passed ? `PASS  ${c.name}` : `FAIL  ${c.name}\n      → ${c.error}`;
}
