import {
  addPairsSumTo,
  allPairs,
  fact,
  fill,
  multiFact,
  numericDistractors,
  subPairs,
  tf,
} from './math-utils.js';

const EMOJIS = ['🍎', '⭐', '🐟', '🌸', '🚗', '🐱', '🎈', '🍌', '🐝', '🌞', '🐸', '🍓', '🦋', '🐶', '⚽', '🌳', '🐧', '🍇', '🚀', '🐢', '🥕', '🧸', '🐰', '🍊', '🦆', '🎵'];

const COUNTING_PAIRS = allPairs(9).filter(([a, b]) => a !== b);

const demVaSoSanh = {
  single(k) {
    if (k % 2 === 0) {
      const step = k / 2;
      const count = (step * 7) % 10 + 1;
      const emoji = EMOJIS[step % EMOJIS.length];
      return fact(
        `Đếm số hình: ${emoji.repeat(count)}. Có tất cả bao nhiêu hình?`,
        count,
        `Đếm lần lượt được ${count} hình.`,
        numericDistractors(count, { min: 0, max: 12 }),
      );
    }
    const index = Math.floor((k / 2) * 4) % COUNTING_PAIRS.length;
    const [a, b] = COUNTING_PAIRS[index];
    const larger = Math.max(a, b);
    return fact(
      `Số nào lớn hơn: ${a} hay ${b}?`,
      larger,
      `${larger} lớn hơn ${Math.min(a, b)}.`,
      numericDistractors(larger, { min: 0, max: 10, extra: [Math.min(a, b)] }),
    );
  },
  fill(k) {
    if (k < 10) {
      const value = k + 1;
      return fill(`Số liền sau của ${value} là ___.`, [value + 1], `Số liền sau của ${value} là ${value + 1}.`);
    }
    if (k < 20) {
      const value = k - 8;
      return fill(`Số liền trước của ${value} là ___.`, [value - 1], `Số liền trước của ${value} là ${value - 1}.`);
    }
    if (k === 20) return fill('Điền số còn thiếu: 1, 2, 3, ___, 5.', [4], 'Dãy số tăng dần, số còn thiếu là 4.');
    return fill('Điền số còn thiếu: 10, 9, 8, ___, 6.', [7], 'Dãy số giảm dần, số còn thiếu là 7.');
  },
  tf(k) {
    if (k < 11) {
      const a = k;
      const b = (k * 3 + 1) % 11;
      const greater = a > b;
      return tf(
        `Số ${a} lớn hơn số ${b}.`,
        greater,
        greater ? `${a} lớn hơn ${b}.` : `${a} không lớn hơn ${b}.`,
      );
    }
    const a = k - 10;
    const b = k % 2 === 0 ? a + 1 : Math.max(0, a - 1);
    const smaller = a < b;
    return tf(
      `Số ${a} bé hơn số ${b}.`,
      smaller,
      smaller ? `${a} bé hơn ${b}.` : `${a} không bé hơn ${b}.`,
    );
  },
  multi(k) {
    if (k === 16) {
      return multiFact(
        'Chọn tất cả các số có một chữ số.',
        ['2', '5'],
        ['10', '11'],
        'Các số 2 và 5 có một chữ số; 10 và 11 có hai chữ số.',
      );
    }
    if (k === 14) {
      return multiFact('Chọn tất cả các số chẵn.', ['2', '4'], ['1', '3'], 'Số chẵn là 2 và 4; 1 và 3 là số lẻ.');
    }
    if (k === 15) {
      return multiFact('Chọn tất cả các số lẻ.', ['1', '3'], ['2', '4'], 'Số lẻ là 1 và 3; 2 và 4 là số chẵn.');
    }
    const threshold = 2 + (k % 7);
    const greater = k < 7;
    const numbers = [threshold - 2, threshold - 1, threshold + 1, threshold + 2]
      .filter((value) => value >= 0 && value <= 10)
      .map(String);
    const correct = greater
      ? numbers.filter((value) => Number(value) > threshold)
      : numbers.filter((value) => Number(value) < threshold);
    const wrong = numbers.filter((value) => !correct.includes(value));
    return multiFact(
      greater ? `Chọn tất cả các số lớn hơn ${threshold}.` : `Chọn tất cả các số bé hơn ${threshold}.`,
      correct,
      wrong,
      greater ? `Các số lớn hơn ${threshold} là ${correct.join(', ')}.` : `Các số bé hơn ${threshold} là ${correct.join(', ')}.`,
    );
  },
};

const CONG_PAIRS = addPairsSumTo(10);

const congTrongMuoi = {
  single(k) {
    const [a, b] = CONG_PAIRS[k];
    const templates = [
      () => `Tính: ${a} + ${b} = ?`,
      () => `Có ${a} quả bóng, thêm ${b} quả bóng. Có tất cả bao nhiêu quả bóng?`,
      () => `Điền kết quả: ${a} + ${b} = ?`,
    ];
    return fact(
      templates[k % 3](),
      a + b,
      `${a} + ${b} = ${a + b}.`,
      numericDistractors(a + b, { min: 0, max: 10 }),
    );
  },
  fill(k) {
    if (k < 11) {
      const [a, b] = CONG_PAIRS[k + 4];
      return fill(`${a} + ${b} = ___.`, [a + b], `${a} cộng ${b} bằng ${a + b}.`);
    }
    const index = k - 11;
    const total = 5 + (index % 6);
    const a = (index * 7 + Math.floor(index / 6)) % total;
    return fill(`${a} + ___ = ${total}.`, [total - a], `${total} trừ ${a} bằng ${total - a}.`);
  },
  tf(k) {
    const [a, b] = CONG_PAIRS[(k * 3) % CONG_PAIRS.length];
    const real = a + b;
    const shown = k % 2 === 0 ? real : Math.min(10, real + 1);
    return tf(
      `Phép tính ${a} + ${b} = ${shown} là đúng.`,
      shown === real,
      `${a} + ${b} = ${real}, nên phép tính ${shown === real ? 'đúng' : 'sai'}.`,
    );
  },
  multi(k) {
    const greater = k >= 9;
    const target = greater ? 2 + (k - 9) : 2 + k;
    const correctPairs = greater
      ? CONG_PAIRS.filter(([a, b]) => a + b > target).slice(k % 5, (k % 5) + 2)
      : CONG_PAIRS.filter(([a, b]) => a + b === target).slice(0, 2);
    const wrongPairs = greater
      ? CONG_PAIRS.filter(([a, b]) => a + b <= target).slice(k % 4, (k % 4) + 2)
      : CONG_PAIRS.filter(([a, b]) => a + b !== target).slice(k % 6, (k % 6) + 2);
    return multiFact(
      greater ? `Chọn tất cả các phép tính có kết quả lớn hơn ${target}.` : `Chọn tất cả các phép tính có kết quả bằng ${target}.`,
      correctPairs.map(([a, b]) => `${a} + ${b}`),
      wrongPairs.map(([a, b]) => `${a} + ${b}`),
      greater ? `Các phép tính có kết quả lớn hơn ${target} được chọn.` : `Các phép tính có kết quả bằng ${target} được chọn.`,
    );
  },
};

const TRU_PAIRS = subPairs(10);

const truTrongMuoi = {
  single(k) {
    const [a, b] = TRU_PAIRS[k];
    const templates = [
      () => `Tính: ${a} - ${b} = ?`,
      () => `Có ${a} cái kẹo, ăn hết ${b} cái. Còn lại bao nhiêu cái kẹo?`,
      () => `Điền kết quả: ${a} - ${b} = ?`,
    ];
    return fact(
      templates[k % 3](),
      a - b,
      `${a} - ${b} = ${a - b}.`,
      numericDistractors(a - b, { min: 0, max: 10 }),
    );
  },
  fill(k) {
    if (k < 11) {
      const [a, b] = TRU_PAIRS[k + 15];
      return fill(`${a} - ${b} = ___.`, [a - b], `${a} trừ ${b} bằng ${a - b}.`);
    }
    const [a, b] = TRU_PAIRS[k];
    return fill(`${a} - ___ = ${a - b}.`, [b], `${a} trừ ${a - b} bằng ${b}.`);
  },
  tf(k) {
    const [a, b] = TRU_PAIRS[(k * 3) % TRU_PAIRS.length];
    const real = a - b;
    const shown = k % 2 === 0 ? real : Math.max(0, real + 1);
    return tf(
      `Phép tính ${a} - ${b} = ${shown} là đúng.`,
      shown === real,
      `${a} - ${b} = ${real}, nên phép tính ${shown === real ? 'đúng' : 'sai'}.`,
    );
  },
  multi(k) {
    const equalMode = k < 9;
    const target = equalMode ? k : k - 9;
    const correctPairs = equalMode
      ? TRU_PAIRS.filter(([a, b]) => a - b === target).slice(0, 2)
      : TRU_PAIRS.filter(([a, b]) => a - b > target).slice(k % 5, (k % 5) + 2);
    const wrongPairs = equalMode
      ? TRU_PAIRS.filter(([a, b]) => a - b !== target).slice(k % 5, (k % 5) + 2)
      : TRU_PAIRS.filter(([a, b]) => a - b <= target).slice(k % 4, (k % 4) + 2);
    return multiFact(
      equalMode ? `Chọn tất cả các phép tính có kết quả bằng ${target}.` : `Chọn tất cả các phép tính có kết quả lớn hơn ${target}.`,
      correctPairs.map(([a, b]) => `${a} - ${b}`),
      wrongPairs.map(([a, b]) => `${a} - ${b}`),
      equalMode ? `Các phép tính có kết quả bằng ${target} được chọn.` : `Các phép tính có kết quả lớn hơn ${target} được chọn.`,
    );
  },
};

export const MATH_GRADE_1A = {
  'toan-1-dem-va-so-sanh': demVaSoSanh,
  'toan-1-cong-trong-10': congTrongMuoi,
  'toan-1-tru-trong-10': truTrongMuoi,
};
