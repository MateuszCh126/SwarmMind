// Historia przebiegów roju w localStorage — realne dane z zakończonych sesji,
// żeby użytkownik mógł wrócić do wcześniejszych wyników. Bez backendu.
export interface RunRecord {
  id: string;
  timestamp: string;
  goal: string;
  provider: string;
  outcome: 'success' | 'error';
  iterations: number;
  inputCode: string;
  blueprint: string;
  code: string;
  tests: string;
  testResults: string;
  reviewerFeedback: string;
  summary: string;
}

const KEY = 'swarm_history';
const MAX = 20;

export function loadHistory(): RunRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRun(rec: RunRecord): void {
  try {
    const list = [rec, ...loadHistory()].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // brak miejsca / prywatny tryb — historia jest opcjonalna, nie przerywamy.
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
