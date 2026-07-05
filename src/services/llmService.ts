import type { AgentId, SwarmSettings } from '../types';

// Centralne ID modeli per provider — jedno źródło prawdy dla wywołań API i etykiet w UI.
export const PROVIDER_MODELS = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-5',
  // Darmowy model OpenRouter (sufiks :free). Jeśli 404/niedostępny, podmień na inny
  // aktualnie darmowy z https://openrouter.ai/models?max_price=0
  openrouter: 'poolside/laguna-xs-2.1:free',
} as const;

export const PROVIDER_LABELS = {
  gemini: 'Google Gemini (gemini-2.5-flash)',
  openai: 'OpenAI (gpt-4o-mini)',
  anthropic: 'Anthropic (claude-sonnet-5)',
  openrouter: 'OpenRouter (laguna-xs-2.1 :free)',
} as const;

interface LLMRequestParams {
  agentId: AgentId;
  agentRole: string;
  systemPrompt: string;
  userPrompt: string;
  settings: SwarmSettings;
}

// Helper to clean Markdown code block formatting if returned by LLM
export function cleanJSONString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  // Fallback: If it's still not valid JSON (e.g. text before or after), extract from first { to last }
  if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }
  return cleaned;
}

// Błędy przejściowe (przeciążenie/limit) nie powinny zabijać całego roju — ponawiamy
// z rosnącym odstępem, zanim zgłosimy błąd użytkownikowi.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 529]);

interface HttpResult {
  ok: boolean;
  status: number;
  body: string;
}

// Wykonuje POST i zwraca surowe CIAŁO jako tekst. Czytanie przez .text() (zamiast
// .json()) chroni przed kryptycznym "Unexpected end of JSON input", gdy darmowy model
// zwróci HTTP 200 z pustym/obciętym ciałem. Ponawiamy na błędach przejściowych ORAZ
// na pustej odpowiedzi 200 (typowe przy przeciążonych darmowych modelach).
async function postForText(url: string, options: RequestInit, retries = 2): Promise<HttpResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      const body = await response.text();
      const emptyOk = response.ok && !body.trim();
      if ((RETRYABLE_STATUS.has(response.status) || emptyOk) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }
      return { ok: response.ok, status: response.status, body };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Parsuje kopertę JSON zwróconą przez API (nie treść LLM) z czytelnym błędem.
function parseEnvelope(body: string, providerLabel: string): any {
  if (!body || !body.trim()) {
    throw new Error(`Pusta odpowiedź z API ${providerLabel} (model przeciążony — spróbuj ponownie).`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`API ${providerLabel} zwróciło nieprawidłową/obciętą odpowiedź.`);
  }
}

// Pełne wywołanie agenta: żądanie + wyciągnięcie treści + parse JSON, z PONAWIANIEM
// gdy model zwróci treść, która nie jest prawidłowym JSON-em (częste na darmowych
// modelach). Dzięki temu jeden flaky response nie zabija całego roju — ponawiamy
// zamiast rzucać. Błędy nie-2xx (np. 401/429 po wewnętrznych retry) rzucamy od razu.
async function fetchAgentJson(
  url: string,
  options: RequestInit,
  label: string,
  extract: (data: any) => string | undefined,
  parseRetries = 2
): Promise<any> {
  let lastReason = '';
  for (let attempt = 0; attempt <= parseRetries; attempt++) {
    const { ok, status, body } = await postForText(url, options);

    if (!ok) {
      if (label === 'Anthropic' && (status === 0 || body.includes('CORS'))) {
        throw new Error('Błąd połączenia z Anthropic. Bezpośrednie zapytania z przeglądarki mogą być blokowane przez politykę CORS. Rekomendujemy użycie Gemini lub OpenRouter.');
      }
      throw new Error(`Błąd API ${label} (${status}): ${body}`);
    }

    const data = parseEnvelope(body, label);
    const text = extract(data);

    if (text && text.trim()) {
      try {
        return JSON.parse(cleanJSONString(text));
      } catch {
        lastReason = 'treść nie jest prawidłowym JSON';
      }
    } else {
      lastReason = 'pusta treść odpowiedzi';
    }

    if (attempt < parseRetries) {
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw new Error(`Odpowiedź AI (${label}) nieprawidłowa po ponowieniach: ${lastReason}.`);
}

export async function callLLM({
  systemPrompt,
  userPrompt,
  settings
}: LLMRequestParams): Promise<any> {
  const provider = settings.preferProvider;
  
  if (provider === 'gemini') {
    const key = settings.geminiKey;
    if (!key) {
      throw new Error(`Brak klucza API dla Google Gemini. Wprowadź klucz w ustawieniach.`);
    }
    return callGemini(key, systemPrompt, userPrompt);
  } else if (provider === 'openai') {
    const key = settings.openaiKey;
    if (!key) {
      throw new Error(`Brak klucza API dla OpenAI. Wprowadź klucz w ustawieniach.`);
    }
    return callOpenAI(key, systemPrompt, userPrompt);
  } else if (provider === 'anthropic') {
    const key = settings.anthropicKey;
    if (!key) {
      throw new Error(`Brak klucza API dla Anthropic Claude. Wprowadź klucz w ustawieniach.`);
    }
    return callAnthropic(key, systemPrompt, userPrompt);
  } else if (provider === 'openrouter') {
    const key = settings.openrouterKey;
    if (!key) {
      throw new Error(`Brak klucza API dla OpenRouter. Wprowadź klucz w ustawieniach (openrouter.ai).`);
    }
    return callOpenRouter(key, systemPrompt, userPrompt);
  } else {
    throw new Error(`Nieznany dostawca AI: ${provider}`);
  }
}

function callOpenRouter(key: string, system: string, user: string): Promise<any> {
  return fetchAgentJson(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: PROVIDER_MODELS.openrouter,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.1
        // Darmowe modele często nie wspierają response_format json_object — nie
        // wymuszamy go; czysty JSON zapewniają prompty + cleanJSONString + ponawianie.
      })
    },
    'OpenRouter',
    (data) => data.choices?.[0]?.message?.content
  );
}

function callGemini(key: string, system: string, user: string): Promise<any> {
  return fetchAgentJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDER_MODELS.gemini}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    },
    'Gemini',
    (data) => data.candidates?.[0]?.content?.parts?.[0]?.text
  );
}

function callOpenAI(key: string, system: string, user: string): Promise<any> {
  return fetchAgentJson(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: PROVIDER_MODELS.openai,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    },
    'OpenAI',
    (data) => data.choices?.[0]?.message?.content
  );
}

function callAnthropic(key: string, system: string, user: string): Promise<any> {
  return fetchAgentJson(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: PROVIDER_MODELS.anthropic,
        max_tokens: 4000,
        system: system,
        messages: [
          { role: 'user', content: user }
        ]
      })
    },
    'Anthropic',
    (data) => data.content?.[0]?.text
  );
}
