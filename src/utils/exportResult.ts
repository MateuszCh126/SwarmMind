// Eksport wyniku roju do pojedynczego pliku Markdown (kod + testy + wynik + review).
// Czysto klienckie pobranie przez Blob — bez backendu.
export interface SwarmResult {
  goal: string;
  inputCode: string;
  blueprint: string;
  code: string;
  tests: string;
  testResults: string;
  reviewerFeedback: string;
}

function triggerDownload(filename: string, content: string, mime = 'text/markdown') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildReport(r: SwarmResult): string {
  return `# SwarmMind — wynik refaktoryzacji

## Cel
${r.goal || '(brak)'}

## Kod oryginalny
\`\`\`javascript
${r.inputCode || '(brak)'}
\`\`\`

## Plan (Architect)
${r.blueprint || '(brak)'}

## Kod zrefaktoryzowany (Coder)
\`\`\`javascript
${r.code || '(brak)'}
\`\`\`

## Testy jednostkowe (Tester)
\`\`\`javascript
${r.tests || '(brak)'}
\`\`\`

## Wynik wykonania testów
\`\`\`
${r.testResults || '(brak)'}
\`\`\`

## Werdykt (Reviewer)
${r.reviewerFeedback || '(brak)'}
`;
}

export function exportSwarmResult(r: SwarmResult): void {
  triggerDownload('swarmmind-wynik.md', buildReport(r));
}
