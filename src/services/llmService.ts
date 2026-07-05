import type { AgentId, SwarmSettings } from '../types';

// Centralne ID modeli per provider — jedno źródło prawdy dla wywołań API i etykiet w UI.
export const PROVIDER_MODELS = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-5',
} as const;

export const PROVIDER_LABELS = {
  gemini: 'Google Gemini (gemini-2.5-flash)',
  openai: 'OpenAI (gpt-4o-mini)',
  anthropic: 'Anthropic (claude-sonnet-5)',
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
  } else {
    throw new Error(`Nieznany dostawca AI: ${provider}`);
  }
}

async function callGemini(key: string, system: string, user: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDER_MODELS.gemini}:generateContent`;
  
  const response = await fetch(url, {
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Błąd API Gemini (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Pusta odpowiedź z API Gemini.');
  }

  try {
    return JSON.parse(cleanJSONString(text));
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', text);
    throw new Error('Odpowiedź AI nie jest prawidłowym formatem JSON.');
  }
}

async function callOpenAI(key: string, system: string, user: string): Promise<any> {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(url, {
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Błąd API OpenAI (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Pusta odpowiedź z API OpenAI.');
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse OpenAI response as JSON:', text);
    throw new Error('Odpowiedź AI nie jest prawidłowym formatem JSON.');
  }
}

async function callAnthropic(key: string, system: string, user: string): Promise<any> {
  const url = 'https://api.anthropic.com/v1/messages';
  
  const response = await fetch(url, {
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 0 || errorText.includes('CORS')) {
      throw new Error(`Błąd połączenia z Anthropic. Bezpośrednie zapytania z przeglądarki mogą być blokowane przez politykę CORS. Rekomendujemy użycie Gemini lub OpenAI.`);
    }
    throw new Error(`Błąd API Anthropic (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error('Pusta odpowiedź z API Anthropic.');
  }

  try {
    return JSON.parse(cleanJSONString(text));
  } catch (e) {
    console.error('Failed to parse Anthropic response as JSON:', text);
    throw new Error('Odpowiedź AI nie jest prawidłowym formatem JSON.');
  }
}
