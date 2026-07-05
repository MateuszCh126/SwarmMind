// Trwałe, własne system prompty agentów (localStorage). Pozwala realnie konfigurować
// zachowanie roju; edycje przeżywają reset i start nowej sesji.
import type { AgentId } from '../types';

const KEY = 'swarm_prompts';
export type PromptMap = Partial<Record<AgentId, string>>;

export function loadPrompts(): PromptMap {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function savePrompt(id: AgentId, prompt: string): void {
  try {
    const map = loadPrompts();
    map[id] = prompt;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // localStorage niedostępny — konfiguracja jest opcjonalna.
  }
}

export function clearPrompt(id: AgentId): void {
  try {
    const map = loadPrompts();
    delete map[id];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
