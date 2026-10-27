import { fact, fill, multiFact, numericDistractors, tf } from './math-utils.js';

const SHAPES = ['hình vuông', 'hình tròn', 'hình tam giác', 'hình chữ nhật'];
const SHAPE_SIDES = { 'hình vuông': 4, 'hình tròn': 0, 'hình tam giác': 3, 'hình chữ nhật': 4 };
const SHAPE_CORNERS = { 'hình vuông': 4, 'hình tròn': 0, 'hình tam giác': 3, 'hình chữ nhật': 4 };
const NAMES = ['Lan', 'Minh', 'Hoa', 'Nam', 'Mai', 'Bình', 'An', 'Linh', 'Phúc', 'Thảo', 'Vy', 'Khang', 'Nhi', 'Dũng', 'Hà', 'Sơn'];
const OBJECTS = [
  ['mặt đồng hồ', 'hình tròn'],
  ['quyển sách', 'hình chữ nhật'],
  ['cái bánh xe', 'hình tròn'],
  ['cái bảng lớp', 'hình chữ nhật'],
  ['cái đĩa', 'hình tròn'],
  ['viên gạch lát nền', 'hình vuông'],
  ['cái ê ke', 'hình tam giác'],
  ['quả bóng', 'hình tròn'],
  ['cửa sổ', 'hình chữ nhật'],
  ['khung ảnh vuông', 'hình vuông'],
  ['miếng bánh pizza cắt góc', 'hình tam giác'],
  ['cái đồng hồ treo tường', 'hình tròn'],
];

const soDen100 = {
  single(k) {
    if (k < 20) {
      const n = 10 + (k * 4) % 90;
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      return fact(
        `Số ${n} gồm mấy chục và mấy đơn vị?`,
        `${tens} chục và ${ones} đơn vị`,
        `${n} = ${tens} chục + ${ones} đơn vị.`,
        [
          `${tens + 1} chục và ${ones} đơn vị`,
          `${tens} chục và ${(ones + 1) % 10} đơn vị`,
          `${tens + 2} chục và ${ones} đơn vị`,
          `${ones} chục và ${tens} đơn vị`,
        ],
      );
    }
    if (k < 40) {
      const a = 10 + ((k - 20) * 7) % 90;
      const b = 10 + ((k - 20) * 13 + 3) % 90;
      if (a === b) return this.single(k + 1);
      const larger = Math.max(a, b);
      return fact(`Số nào lớn hơn: ${a} hay ${b}?`, larger, `${larger} lớn hơn ${Math.min(a, b)}.`, numericDistractors(larger, { min: 0, max: 99, extra: [Math.min(a, b)] }));
    }
    const n = 10 + (k * 3) % 88;
    return fact(
      `Số liền sau của ${n} là số nào?`,
      n + 1,
      `Số liền sau của ${n} là ${n + 1}.`,
      numericDistractors(n + 1, { min: 0, max: 100 }),
    );
  },
  fill(k) {
    if (k < 10) {
      const n = 10 + (k * 7) % 88;
      return fill(`Số liền sau của ${n} là ___.`, [n + 1], `Số liền sau của ${n} là ${n + 1}.`);
    }
    if (k < 20) {
      const n = 20 + (k * 3) % 78;
      return fill(`Số liền trước của ${n} là ___.`, [n - 1], `Số liền trước của ${n} là ${n - 1}.`);
    }
    if (k === 20) return fill('5 chục và 3 đơn vị là số ___.', [53], '5 chục và 3 đơn vị là 53.');
    return fill('Số 68 gồm ___ chục và 8 đơn vị.', [6], 'Số 68 gồm 6 chục và 8 đơn vị.');
  },
  tf(k) {
    if (k < 10) {
      const a = 20 + (k * 9) % 78;
      const b = 20 + (k * 17 + 5) % 78;
      const greater = a > b;
      return tf(`Số ${a} lớn hơn số ${b}.`, greater, greater ? `${a} lớn hơn ${b}.` : `${a} không lớn hơn ${b}.`);
    }
    const n = 10 + ((k - 10) * 13) % 88;
    const actualTens = Math.floor(n / 10);
    const shownTens = k % 2 === 0 ? actualTens : (actualTens % 9) + 1;
    return tf(`Số ${n} có chữ số hàng chục là ${shownTens}.`, shownTens === actualTens, `Số ${n} có chữ số hàng chục là ${actualTens}.`);
  },
  multi(k) {
    if (k === 16) {
      return multiFact('Chọn tất cả các số tròn chục.', ['20', '50'], ['25', '43'], 'Số tròn chục là 20 và 50.');
    }
    const threshold = 20 + (k % 8) * 5;
    const greater = k < 8;
    const numbers = [threshold - 10, threshold - 5, threshold + 5, threshold + 10].map(String);
    const correct = numbers.filter((value) => (greater ? Number(value) > threshold : Number(value) < threshold));
    const wrong = numbers.filter((value) => !correct.includes(value));
    return multiFact(
      greater ? `Chọn tất cả các số lớn hơn ${threshold}.` : `Chọn tất cả các số bé hơn ${threshold}.`,
      correct,
      wrong,
      `Các số ${correct.join(', ')} thỏa mãn yêu cầu.`,
    );
  },
};

const hinhVaViTri = {
  single(k) {
    if (k < 8) {
      const shape = SHAPES[k % 4];
      const wording = k < 4 ? 'mấy cạnh' : 'bao nhiêu cạnh';
      return fact(`Hình ${shape} có ${wording}?`, SHAPE_SIDES[shape], `Hình ${shape} có ${SHAPE_SIDES[shape]} cạnh.`, numericDistractors(SHAPE_SIDES[shape], { min: 0, max: 6 }));
    }
    if (k < 16) {
      const shape = SHAPES[k % 4];
      const wording = k < 12 ? 'mấy góc' : 'bao nhiêu góc';
      return fact(`Hình ${shape} có ${wording}?`, SHAPE_CORNERS[shape], `Hình ${shape} có ${SHAPE_CORNERS[shape]} góc.`, numericDistractors(SHAPE_CORNERS[shape], { min: 0, max: 6 }));
    }
    if (k < 24) {
      const items = [
        ['3 cạnh', 'hình tam giác'],
        ['4 cạnh bằng nhau', 'hình vuông'],
        ['không có góc', 'hình tròn'],
        ['3 góc', 'hình tam giác'],
        ['0 cạnh', 'hình tròn'],
        ['chiều dài khác chiều rộng', 'hình chữ nhật'],
        ['3 đỉnh', 'hình tam giác'],
        ['lăn được trên mặt phẳng', 'hình tròn'],
      ];
      const [property, answer] = items[k - 16];
      return fact(`Hình nào có ${property}?`, answer, `${answer} có ${property}.`, SHAPES.filter((shape) => shape !== answer));
    }
    if (k < 40) {
      const a = NAMES[(k * 3) % NAMES.length];
      let b = NAMES[(k * 5 + 2) % NAMES.length];
      if (b === a) b = NAMES[(NAMES.indexOf(a) + 1) % NAMES.length];
      return fact(`${a} đứng trước ${b}. Ai đứng sau?`, b, `${b} đứng sau ${a}.`, NAMES.filter((name) => name !== b).slice(0, 3));
    }
    const [object, shape] = OBJECTS[k - 40];
    return fact(`Vật "${object}" có dạng hình gì?`, shape, `${object} có dạng ${shape}.`, SHAPES.filter((item) => item !== shape));
  },
  fill(k) {
    if (k < 8) {
      const shape = SHAPES[k % 4];
      const isCorner = k >= 4;
      const value = isCorner ? SHAPE_CORNERS[shape] : SHAPE_SIDES[shape];
      return fill(`Hình ${shape} có ___ ${isCorner ? 'góc' : 'cạnh'}.`, [value], `Hình ${shape} có ${value} ${isCorner ? 'góc' : 'cạnh'}.`);
    }
    const a = NAMES[k % NAMES.length];
    const b = NAMES[(k * 5 + 1) % NAMES.length] === a ? NAMES[(NAMES.indexOf(a) + 2) % NAMES.length] : NAMES[(k * 5 + 1) % NAMES.length];
    if (k % 2 === 0) {
      return fill(`${a} đứng trước ${b}. Vậy ${b} đứng ___ ${a}.`, ['sau'], `${b} đứng sau ${a}.`);
    }
    return fill(`${a} đứng sau ${b}. Vậy ${a} đứng ___ ${b}.`, ['sau'], `${a} đứng sau ${b}.`);
  },
  tf(k) {
    if (k < 8) {
      const shape = SHAPES[k % 4];
      const actual = SHAPE_SIDES[shape];
      const shown = (k < 4 ? actual : actual + 1);
      return tf(`Hình ${shape} có ${shown} cạnh.`, shown === actual, `Hình ${shape} có ${actual} cạnh.`);
    }
    const a = NAMES[(k * 3) % NAMES.length];
    let b = NAMES[(k * 5 + 2) % NAMES.length];
    if (b === a) b = NAMES[(NAMES.indexOf(a) + 1) % NAMES.length];
    const forward = k % 2 === 0;
    const statement = forward ? `${a} đứng trước ${b}.` : `${a} đứng sau ${b}.`;
    return tf(statement, forward, forward ? `${a} đứng trước ${b}.` : `${a} đứng sau ${b}.`);
  },
  multi(k) {
    const sets = [
      [['bánh xe', 'quả bóng'], ['cái bàn', 'quyển sách'], 'hình tròn'],
      [['viên gạch vuông', 'khung ảnh vuông'], ['quả bóng', 'cái đĩa'], 'hình vuông'],
      [['quyển sách', 'cửa sổ'], ['bánh xe', 'quả bóng'], 'hình chữ nhật'],
      [['cái ê ke', 'miếng pizza cắt góc'], ['cái đĩa', 'viên gạch'], 'hình tam giác'],
      [['mặt đồng hồ', 'cái đĩa'], ['cái bảng', 'quyển vở'], 'hình tròn'],
      [['viên gạch lát nền', 'khung ảnh vuông'], ['cái ê ke', 'quả bóng'], 'hình vuông'],
      [['cửa sổ', 'cái bảng lớp'], ['cái đĩa', 'bánh xe'], 'hình chữ nhật'],
      [['cái ê ke', 'miếng bánh cắt góc'], ['mặt đồng hồ', 'khung ảnh'], 'hình tam giác'],
      [['bánh xe', 'mặt đồng hồ'], ['cái bàn', 'cái ê ke'], 'hình tròn'],
      [['khung ảnh vuông', 'viên gạch'], ['quả bóng', 'quyển sách'], 'hình vuông'],
      [['quyển sách', 'cái bảng'], ['cái đĩa', 'viên gạch'], 'hình chữ nhật'],
      [['miếng pizza', 'cái ê ke'], ['cửa sổ', 'bánh xe'], 'hình tam giác'],
      [['quả bóng', 'cái đĩa'], ['khung ảnh vuông', 'cái ê ke'], 'hình tròn'],
      [['viên gạch', 'khung ảnh vuông'], ['mặt đồng hồ', 'quyển sách'], 'hình vuông'],
      [['cửa sổ', 'quyển sách'], ['quả bóng', 'miếng pizza'], 'hình chữ nhật'],
      [['cái ê ke', 'miếng bánh'], ['cái đĩa', 'viên gạch'], 'hình tam giác'],
      [['mặt đồng hồ', 'bánh xe'], ['cửa sổ', 'cái ê ke'], 'hình tròn'],
    ];
    const [correct, wrong, shape] = sets[k];
    return multiFact(
      `Chọn tất cả các đồ vật có dạng ${shape} trong nhóm: ${[...correct, ...wrong].join(', ')}.`,
      correct,
      wrong,
      `Các đồ vật có dạng ${shape} là ${correct.join(', ')}.`,
    );
  },
};

export const MATH_GRADE_1B = {
  'toan-1-so-den-100': soDen100,
  'toan-1-hinh-va-vi-tri': hinhVaViTri,
};
