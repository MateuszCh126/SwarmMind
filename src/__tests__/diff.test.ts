import { describe, it, expect } from 'vitest';
import { diffLines, diffStats } from '../utils/diff';

describe('diffLines — liniowy diff LCS', () => {
  it('identyczny tekst = same linie, zero zmian', () => {
    const d = diffLines('a\nb\nc', 'a\nb\nc');
    expect(d.every((l) => l.type === 'same')).toBe(true);
    expect(diffStats(d)).toEqual({ added: 0, removed: 0 });
  });

  it('dodana linia', () => {
    const d = diffLines('a\nc', 'a\nb\nc');
    expect(diffStats(d)).toEqual({ added: 1, removed: 0 });
    expect(d.find((l) => l.type === 'add')?.text).toBe('b');
  });

  it('usunięta linia', () => {
    const d = diffLines('a\nb\nc', 'a\nc');
    expect(diffStats(d)).toEqual({ added: 0, removed: 1 });
    expect(d.find((l) => l.type === 'del')?.text).toBe('b');
  });

  it('zmieniona linia = del + add', () => {
    const d = diffLines('a\nX\nc', 'a\nY\nc');
    const stats = diffStats(d);
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
  });

  it('zachowuje kolejność linii same', () => {
    const d = diffLines('function f(){\n  return 1;\n}', 'function f(){\n  return 2;\n}');
    expect(d[0]).toEqual({ type: 'same', text: 'function f(){' });
    expect(d.find((l) => l.type === 'add')?.text).toBe('  return 2;');
    expect(d.find((l) => l.type === 'del')?.text).toBe('  return 1;');
  });
});
