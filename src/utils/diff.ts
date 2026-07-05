// Liniowy diff (LCS) do porównania oryginalnego i zrefaktoryzowanego kodu.
// Bez zależności zewnętrznych — O(n*m), wystarczające dla fragmentów kodu.
export type DiffType = 'same' | 'add' | 'del';

export interface DiffLine {
  type: DiffType;
  text: string;
}

export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const n = aLines.length;
  const m = bLines.length;

  // dp[i][j] = długość LCS sufiksów aLines[i:] i bLines[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      out.push({ type: 'same', text: aLines[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: aLines[i] });
      i++;
    } else {
      out.push({ type: 'add', text: bLines[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: 'del', text: aLines[i++] });
  while (j < m) out.push({ type: 'add', text: bLines[j++] });
  return out;
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  return lines.reduce(
    (acc, l) => {
      if (l.type === 'add') acc.added++;
      else if (l.type === 'del') acc.removed++;
      return acc;
    },
    { added: 0, removed: 0 }
  );
}
