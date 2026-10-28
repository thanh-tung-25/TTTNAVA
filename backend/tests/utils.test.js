import { describe, expect, test } from 'vitest';
import {
  isAnswerCorrect,
  praiseForPercent,
  validateClientAnswer,
} from '../src/utils/answers.js';
import {
  buildDisplayOptions,
  seededShuffle,
  sha256Hex,
  shuffleQuestionForClient,
} from '../src/utils/hash.js';

describe('Tiện ích câu hỏi', () => {
  test('test_utils_sha256_is_deterministic', () => {
    expect(sha256Hex('challenge|bot|0')).toBe(sha256Hex('challenge|bot|0'));
    expect(sha256Hex('challenge|bot|0')).not.toBe(sha256Hex('challenge|bot|1'));
    expect(sha256Hex('abc')).toHaveLength(64);
  });

  test('test_utils_seeded_shuffle_is_reproducible', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    expect(seededShuffle(input, 'seed-1')).toEqual(seededShuffle(input, 'seed-1'));
    expect(input).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('test_utils_display_options_pin_all_of_the_above_last', () => {
    const question = {
      id: 'q-1',
      type: 'single_choice',
      options: [
        { key: 'a', text: 'Một' },
        { key: 'b', text: 'Hai' },
        { key: 'c', text: 'Cả hai đáp án trên' },
      ],
    };
    const options = buildDisplayOptions(question, 'seed');
    expect(options.at(-1).text).toBe('Cả hai đáp án trên');
    const client = shuffleQuestionForClient(question, 'seed');
    expect(client.options.map((option) => option.label)).toEqual(['A', 'B', 'C']);
    expect(client.options.at(-1).key).toBe('c');
  });

  test('test_utils_validate_single_choice_rejects_unknown_key', () => {
    const question = {
      type: 'single_choice',
      options: [{ key: 'a' }, { key: 'b' }],
    };
    expect(validateClientAnswer(question, { key: 'a' })).toEqual({ key: 'a' });
    expect(() => validateClientAnswer(question, { key: 'z' })).toThrow();
    expect(() => validateClientAnswer(question, {})).toThrow();
  });

  test('test_utils_multiple_choice_is_order_insensitive', () => {
    const question = {
      type: 'multiple_choice',
      options: [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
      answer: JSON.stringify({ keys: ['a', 'c'] }),
    };
    const answer = validateClientAnswer(question, { keys: ['c', 'a', 'a'] });
    expect(answer).toEqual({ keys: ['a', 'c'] });
    expect(isAnswerCorrect(question, answer)).toBe(true);
    expect(isAnswerCorrect(question, { keys: ['a'] })).toBe(false);
  });

  test('test_utils_fill_in_answer_is_normalized', () => {
    const question = {
      type: 'fill_in',
      answer: JSON.stringify({ accepted: ['Hà Nội', 'ha noi'] }),
    };
    const answer = validateClientAnswer(question, { value: '  HA   NOI ' });
    expect(answer.value).toBe('ha noi');
    expect(isAnswerCorrect(question, answer)).toBe(true);
    expect(isAnswerCorrect(question, { value: 'Sài Gòn' })).toBe(false);
  });

  test('test_utils_true_false_requires_boolean', () => {
    const question = { type: 'true_false', answer: JSON.stringify({ value: true }) };
    expect(validateClientAnswer(question, { value: true })).toEqual({ value: true });
    expect(() => validateClientAnswer(question, { value: 'true' })).toThrow();
    expect(isAnswerCorrect(question, { value: true })).toBe(true);
    expect(isAnswerCorrect(question, { value: false })).toBe(false);
  });

  test('test_utils_praise_thresholds_match_rules', () => {
    expect(praiseForPercent(100).level).toBe('perfect');
    expect(praiseForPercent(70).level).toBe('great');
    expect(praiseForPercent(40).level).toBe('good');
    expect(praiseForPercent(39).level).toBe('try-again');
  });
});
