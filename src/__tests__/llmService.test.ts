import { describe, it, expect } from 'vitest';
import { cleanJSONString } from '../services/llmService';

describe('llmService JSON Parser Helper', () => {
  it('should pass through normal JSON strings', () => {
    const raw = '{"key": "value"}';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should clean JSON strings wrapped in ```json code blocks', () => {
    const raw = '```json\n{"key": "value"}\n```';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should clean JSON strings wrapped in generic ``` code blocks', () => {
    const raw = '```\n{"key": "value"}\n```';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should trim surrounding whitespace', () => {
    const raw = '   \n  {"key": "value"} \n  ';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
  });

  it('should clean code blocks even with extra spacing', () => {
    const raw = '  ```json\n  {"key": "value"}\n  ```  ';
    const cleaned = cleanJSONString(raw);
    expect(cleaned).toBe('{"key": "value"}');
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should extract JSON even with conversational text before the code block', () => {
    const raw = 'Oto żądana odpowiedź:\n```json\n{"key": "value"}\n```';
    const cleaned = cleanJSONString(raw);
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should extract JSON even with conversational text after the code block', () => {
    const raw = '```json\n{"key": "value"}\n```\nMam nadzieję, że to pomoże!';
    const cleaned = cleanJSONString(raw);
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });

  it('should extract JSON from mixed text without code fences', () => {
    const raw = 'Tekst przed {"key": "value"} tekst po';
    const cleaned = cleanJSONString(raw);
    expect(JSON.parse(cleaned)).toEqual({ key: 'value' });
  });
});
export {};
