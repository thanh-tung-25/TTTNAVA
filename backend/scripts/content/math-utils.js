export function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = String(value).trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

export function formatNumber(value, decimals = 0) {
  if (decimals <= 0) return String(Math.round(value));
  return Number(value).toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

export function numericDistractors(answer, options = {}) {
  const { min = 0, max = 1000000, decimals = 0, extra = [] } = options;
  const step = decimals > 0 ? 10 ** -decimals : 1;
  const candidates = [
    answer + step,
    answer - step,
    answer + 2 * step,
    answer - 2 * step,
    answer + 10 * step,
    answer - 10 * step,
    answer + 5 * step,
    answer - 5 * step,
    answer * 2,
    ...extra,
  ];
  return uniqueStrings(
    candidates
      .filter((value) => Number.isFinite(value) && value >= min && value <= max && value !== answer)
      .map((value) => formatNumber(value, decimals)),
  ).slice(0, 3);
}

export function fact(prompt, correct, explanation, distractors) {
  return { prompt, correct: String(correct), distractors, explanation };
}

export function fill(prompt, accepted, explanation) {
  return { prompt, accepted: accepted.map(String), explanation };
}

export function tf(statement, value, explanation) {
  return { statement, value, explanation };
}

export function multiFact(prompt, correct, wrong, explanation) {
  return { prompt, correct, wrong, explanation };
}

export function allPairs(max) {
  const pairs = [];
  for (let a = 0; a <= max; a += 1) {
    for (let b = 0; b <= max; b += 1) {
      pairs.push([a, b]);
    }
  }
  return pairs;
}

export function addPairsSumTo(max) {
  return allPairs(max).filter(([a, b]) => a + b <= max && a + b > 0);
}

export function subPairs(max) {
  const pairs = [];
  for (let a = 1; a <= max; a += 1) {
    for (let b = 0; b <= a; b += 1) {
      pairs.push([a, b]);
    }
  }
  return pairs;
}

export function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

export function simplifyFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  return d === 1 ? String(n) : `${n}/${d}`;
}

export function fractionText(numerator, denominator) {
  return `${numerator}/${denominator}`;
}

export function decimalText(value, decimals = 1) {
  return Number(value).toFixed(decimals);
}

export const SHAPE_NAMES = ['hình vuông', 'hình tròn', 'hình tam giác', 'hình chữ nhật'];

export function pick(array, index) {
  return array[((index % array.length) + array.length) % array.length];
}

export function wordsToSentence(words) {
  const sentence = words.join(' ');
  return sentence.charAt(0).toLocaleUpperCase('vi') + sentence.slice(1) + '.';
}
