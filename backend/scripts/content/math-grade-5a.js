import { fact, fill, formatNumber, multiFact, numericDistractors, tf } from './math-utils.js';

const vn = (value, decimals = 0) => formatNumber(value, decimals).replace('.', ',');
const numOpts = (answer, options) => numericDistractors(answer, options).map((item) => item.replace('.', ','));
const accept = (value, decimals = 0) => {
  const a = vn(value, decimals);
  const b = formatNumber(value, decimals);
  return a === b ? [a] : [a, b];
};
const round2 = (value) => Math.round(value * 100) / 100;
const round3 = (value) => Math.round(value * 1000) / 1000;

const PLACE_ITEMS = [
  ['4,275', '2', 'hàng phần mười', ['hàng phần trăm', 'hàng đơn vị', 'hàng chục']],
  ['7,308', '3', 'hàng phần mười', ['hàng phần trăm', 'hàng chục', 'hàng đơn vị']],
  ['12,546', '5', 'hàng phần mười', ['hàng phần trăm', 'hàng phần nghìn', 'hàng chục']],
  ['9,184', '8', 'hàng phần trăm', ['hàng phần mười', 'hàng phần nghìn', 'hàng đơn vị']],
  ['6,472', '7', 'hàng phần trăm', ['hàng phần mười', 'hàng phần nghìn', 'hàng chục']],
  ['3,659', '9', 'hàng phần nghìn', ['hàng phần mười', 'hàng phần trăm', 'hàng đơn vị']],
  ['20,813', '8', 'hàng phần mười', ['hàng phần trăm', 'hàng phần nghìn', 'hàng chục']],
  ['15,204', '4', 'hàng phần nghìn', ['hàng phần mười', 'hàng phần trăm', 'hàng đơn vị']],
];

const FRACTION_ITEMS = [
  ['7/10', '0,7', ['0,07', '7,0', '0,007'], '7/10 = 0,7.'],
  ['25/100', '0,25', ['2,5', '0,025', '25,0'], '25/100 = 0,25.'],
  ['9/100', '0,09', ['0,9', '0,009', '9,0'], '9/100 = 0,09.'],
  ['135/1000', '0,135', ['1,35', '0,0135', '13,5'], '135/1000 = 0,135.'],
  ['0,8', '8/10', ['8/100', '80/100', '10/8'], '0,8 = 8/10.'],
  ['0,45', '45/100', ['45/10', '4/100', '100/45'], '0,45 = 45/100.'],
  ['0,309', '309/1000', ['309/100', '30/1000', '1000/309'], '0,309 = 309/1000.'],
  ['1,7', '17/10', ['1/7', '17/100', '7/10'], '1,7 = 17/10.'],
];

const EQUAL_ITEMS = [
  ['Số nào bằng số 2,3?', '2,30', ['2,03', '2,003', '23,0'], 'Thêm chữ số 0 vào tận cùng bên phải phần thập phân: 2,3 = 2,30.'],
  ['Số nào bằng số 0,50?', '0,5', ['0,05', '5,0', '0,005'], 'Bỏ chữ số 0 tận cùng bên phải phần thập phân: 0,50 = 0,5.'],
  ['Bỏ chữ số 0 ở tận cùng bên phải phần thập phân của số 4,700 ta được số nào?', '4,7', ['4,07', '47', '4,007'], '4,700 = 4,7.'],
  ['Viết thêm một chữ số 0 vào tận cùng bên phải phần thập phân của số 3,5 ta được số nào?', '3,50', ['3,05', '35', '3,005'], '3,5 = 3,50.'],
  ['Số nào bé nhất trong các số 0,5; 0,45; 0,405?', '0,405', ['0,5', '0,45', '0,504'], 'So sánh phần thập phân: 0,405 < 0,45 < 0,5.'],
  ['Số nào lớn nhất trong các số 1,2; 1,19; 1,209?', '1,209', ['1,2', '1,19', '1,192'], '1,209 > 1,2 > 1,19.'],
  ['Số 6,070 bằng số nào?', '6,07', ['6,7', '6,007', '67,0'], '6,070 = 6,07.'],
  ['Số 12,30 bằng số nào?', '12,3', ['12,03', '123,0', '12,003'], '12,30 = 12,3.'],
];

const roundInfo = (value, decimals) => {
  const factor = 10 ** decimals;
  const scaled = round2(value * factor);
  const digit = Math.floor(round2(scaled * 10)) % 10;
  return { digit, answer: Math.round(scaled) / factor };
};

const ROUND_UNIT = { 0: 'hàng phần mười', 1: 'hàng phần trăm', 2: 'hàng phần nghìn' };

const roundText = (value, decimals) => {
  const { digit, answer } = roundInfo(value, decimals);
  return {
    answer,
    explanation: `${vn(value, 3)} có chữ số ${ROUND_UNIT[decimals]} là ${digit}; vì ${digit} ${digit >= 5 ? 'lớn hơn hoặc bằng' : 'bé hơn'} 5 nên làm tròn ${digit >= 5 ? 'lên' : 'xuống'} được ${vn(answer, decimals)}.`,
  };
};

const soThapPhan = {
  single(k) {
    if (k < 8) {
      const [number, digit, place, wrong] = PLACE_ITEMS[k];
      return fact(`Trong số ${number}, chữ số ${digit} thuộc hàng nào?`, place, `Trong số ${number}, chữ số ${digit} thuộc ${place}.`, wrong);
    }
    if (k < 16) {
      const i = k - 8;
      const units = 3 + i;
      const tenths = (i * 3 + 2) % 10;
      const hundredths = (i * 7 + 1) % 10;
      const value = round2(units + tenths / 10 + hundredths / 100);
      return fact(
        `Số gồm ${units} đơn vị, ${tenths} phần mười và ${hundredths} phần trăm viết là số nào?`,
        vn(value, 2),
        `${units} đơn vị, ${tenths} phần mười, ${hundredths} phần trăm viết là ${vn(value, 2)}.`,
        numOpts(value, { min: 0, max: 20, decimals: 2 }),
      );
    }
    if (k < 24) {
      const i = k - 16;
      const a = round2(2.45 + i * 1.3);
      const b = round2(a + 0.7);
      const askGreater = i % 2 === 0;
      if (askGreater) {
        return fact(
          `Số nào lớn hơn: ${vn(a, 2)} hay ${vn(b, 2)}?`,
          vn(b, 2),
          `${vn(b, 2)} lớn hơn ${vn(a, 2)}.`,
          [vn(a, 2), ...numOpts(b, { min: round2(a + 0.01), max: round2(b - 0.01), decimals: 2 })].slice(0, 3),
        );
      }
      return fact(
        `Số nào bé hơn: ${vn(a, 2)} hay ${vn(b, 2)}?`,
        vn(a, 2),
        `${vn(a, 2)} bé hơn ${vn(b, 2)}.`,
        [vn(b, 2), ...numOpts(a, { min: round2(a + 0.01), max: round2(b - 0.01), decimals: 2 })].slice(0, 3),
      );
    }
    if (k < 36) {
      const i = k - 24;
      if (i < 4) {
        const value = round2(5.36 + i * 2.17);
        const info = roundText(value, 0);
        return fact(`Làm tròn số ${vn(value, 2)} đến hàng đơn vị được số nào?`, info.answer, info.explanation, numOpts(info.answer, { min: 0, max: 20 }));
      }
      if (i < 8) {
        const value = round2(3.47 + (i - 4) * 1.29);
        const info = roundText(value, 1);
        return fact(`Làm tròn số ${vn(value, 2)} đến hàng phần mười được số nào?`, vn(info.answer, 1), info.explanation, numOpts(info.answer, { min: 0, max: 20, decimals: 1 }));
      }
      const value = round3(2.347 + (i - 8) * 1.112);
      const info = roundText(value, 2);
      return fact(`Làm tròn số ${vn(value, 3)} đến hàng phần trăm được số nào?`, vn(info.answer, 2), info.explanation, numOpts(info.answer, { min: 0, max: 20, decimals: 2 }));
    }
    if (k < 44) {
      const [fraction, answer, wrong, explanation] = FRACTION_ITEMS[k - 36];
      const prompt = k < 40
        ? `Phân số thập phân ${fraction} viết dưới dạng số thập phân là số nào?`
        : `Số thập phân ${fraction} viết thành phân số thập phân nào?`;
      return fact(prompt, answer, explanation, wrong);
    }
    const [prompt, answer, wrong, explanation] = EQUAL_ITEMS[k - 44];
    return fact(prompt, answer, explanation, wrong);
  },
  fill(k) {
    if (k < 8) {
      const i = k;
      const units = 2 + i;
      const tenths = (i * 3 + 1) % 10;
      const hundredths = (i * 7 + 2) % 10;
      const value = round2(units + tenths / 10 + hundredths / 100);
      return fill(
        `Số gồm ${units} đơn vị, ${tenths} phần mười và ${hundredths} phần trăm viết là ___.`,
        accept(value, 2),
        `${units} đơn vị, ${tenths} phần mười, ${hundredths} phần trăm viết là ${vn(value, 2)}.`,
      );
    }
    if (k < 14) {
      const value = round2(6.42 + (k - 8) * 1.37);
      const info = roundText(value, 0);
      return fill(`Làm tròn số ${vn(value, 2)} đến hàng đơn vị được ___.`, accept(info.answer), info.explanation);
    }
    if (k < 20) {
      const i = k - 14;
      const a = round2(3.15 + i * 1.42);
      const b = round2(a + 0.55 + i * 0.16);
      return fill(`Trong hai số ${vn(a, 2)} và ${vn(b, 2)}, số lớn hơn là ___.`, accept(b, 2), `${vn(b, 2)} lớn hơn ${vn(a, 2)}.`);
    }
    const items = [
      ['Số 0,6 viết thành phân số thập phân là ___.', '6/10'],
      ['Số 0,75 viết thành phân số thập phân là ___.', '75/100'],
    ];
    const [prompt, answer] = items[k - 20];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    if (k < 8) {
      const a = round2(4.5 + k * 0.77);
      const b = round2(a + (k % 2 === 0 ? 0.3 : -0.3));
      const value = a > b;
      return tf(
        `Số ${vn(a, 2)} lớn hơn số ${vn(b, 2)}.`,
        value,
        value ? `${vn(a, 2)} lớn hơn ${vn(b, 2)}.` : `${vn(a, 2)} bé hơn ${vn(b, 2)}.`,
      );
    }
    const items = [
      ['Trong số 5,34 chữ số 3 thuộc hàng phần mười.', true, 'Chữ số 3 đứng ngay sau dấu phẩy nên thuộc hàng phần mười.'],
      ['Trong số 8,207 chữ số 2 thuộc hàng phần trăm.', false, 'Trong số 8,207 chữ số 2 thuộc hàng phần mười.'],
      ['Số 0,45 đọc là không phẩy bốn mươi lăm.', true, '0,45 đọc là không phẩy bốn mươi lăm.'],
      ['Số 7,09 lớn hơn số 7,9.', false, 'So sánh phần mười: 0 < 9 nên 7,09 bé hơn 7,9.'],
      ['Số 3,5 bằng số 3,50.', true, 'Thêm chữ số 0 vào tận cùng bên phải phần thập phân thì giá trị không đổi.'],
      ['Làm tròn 4,56 đến hàng đơn vị được 5.', true, 'Chữ số hàng phần mười là 5 nên làm tròn lên được 5.'],
      ['Làm tròn 6,24 đến hàng phần mười được 6,3.', false, 'Chữ số hàng phần trăm là 4, bé hơn 5 nên làm tròn xuống được 6,2.'],
      ['Làm tròn 9,99 đến hàng phần mười được 10,0.', true, 'Chữ số hàng phần trăm là 9 nên làm tròn lên: 9,99 thành 10,0.'],
      ['Làm tròn 2,345 đến hàng phần trăm được 2,35.', true, 'Chữ số hàng phần nghìn là 5 nên làm tròn lên được 2,35.'],
    ];
    const [statement, value, explanation] = items[k - 8];
    return tf(statement, value, explanation);
  },
  multi(k) {
    if (k < 5) {
      const digit = (k * 2 + 1) % 10;
      const wrongDigit = (digit + 1) % 10;
      const wrongDigit2 = (digit + 2) % 10;
      return multiFact(
        `Chọn tất cả các số có chữ số hàng phần mười là ${digit}.`,
        [`${3 + k},${digit}4`, `${6 + k},${digit}8`],
        [`${3 + k},${wrongDigit}4`, `${6 + k},${wrongDigit2}8`],
        `${3 + k},${digit}4 và ${6 + k},${digit}8 có chữ số hàng phần mười là ${digit}.`,
      );
    }
    if (k < 10) {
      const target = round2(3.5 + (k - 5) * 0.7);
      return multiFact(
        `Chọn tất cả các số lớn hơn ${vn(target, 1)}.`,
        [vn(round2(target + 0.3), 1), vn(round2(target + 1.2), 1)],
        [vn(round2(target - 0.3), 1), vn(round2(target - 1.2), 1)],
        `${vn(round2(target + 0.3), 1)} và ${vn(round2(target + 1.2), 1)} đều lớn hơn ${vn(target, 1)}.`,
      );
    }
    if (k < 14) {
      const tenthsList = [12, 21, 35, 48];
      const tenths = tenthsList[k - 10];
      const whole = Math.floor(tenths / 10);
      const part = tenths % 10;
      return multiFact(
        `Chọn tất cả các số bằng ${whole},${part}.`,
        [`${whole},${part}`, `${whole},${part}0`],
        [`${whole},0${part}`, `${whole}${part}`],
        `${whole},${part} = ${whole},${part}0, cùng bằng ${whole},${part}.`,
      );
    }
    const items = [
      ['Chọn tất cả các số bé hơn 1.', ['0,75', '0,9'], ['1,0', '1,25'], '0,75 và 0,9 đều bé hơn 1.'],
      ['Chọn tất cả các số có phần nguyên là 4.', ['4,25', '4,8'], ['0,4', '14,2'], '4,25 và 4,8 có phần nguyên là 4.'],
      ['Chọn tất cả các phân số thập phân.', ['7/10', '25/100'], ['3/4', '2/3'], '7/10 và 25/100 là phân số thập phân vì có mẫu số 10 và 100.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k - 14];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const congTruThapPhan = {
  single(k) {
    if (k < 10) {
      const a = round2(1.2 + k * 0.7);
      const b = round2(2.5 + k * 0.5);
      const answer = round2(a + b);
      return fact(`Tính: ${vn(a, 2)} + ${vn(b, 2)} = ?`, vn(answer, 2), `${vn(a, 2)} + ${vn(b, 2)} = ${vn(answer, 2)}.`, numOpts(answer, { min: 0, max: 30, decimals: 1 }));
    }
    if (k < 20) {
      const i = k - 10;
      const a = round2(10.5 + i * 1.4);
      const b = round2(2.25 + i * 0.35);
      const answer = round2(a - b);
      return fact(
        `Một cuộn dây dài ${vn(a, 2)} m, người ta cắt đi ${vn(b, 2)} m. Hỏi còn lại bao nhiêu mét dây?`,
        vn(answer, 2),
        `${vn(a, 2)} - ${vn(b, 2)} = ${vn(answer, 2)} (m).`,
        numOpts(answer, { min: 0, max: 20, decimals: 2 }),
      );
    }
    if (k < 30) {
      const i = k - 20;
      const a = round2(12.75 + i * 1.35);
      const b = round2(3.4 + i * 0.55);
      const answer = round2(a - b);
      return fact(`Tính: ${vn(a, 2)} - ${vn(b, 2)} = ?`, vn(answer, 2), `${vn(a, 2)} - ${vn(b, 2)} = ${vn(answer, 2)}.`, numOpts(answer, { min: 0, max: 20, decimals: 2 }));
    }
    if (k < 38) {
      const i = k - 30;
      const a = round2(2.35 + i * 0.8);
      const x = round2(1.6 + i * 0.45);
      const c = round2(a + x);
      return fact(
        `Số nào cộng với ${vn(a, 2)} bằng ${vn(c, 2)}?`,
        vn(x, 2),
        `${vn(c, 2)} - ${vn(a, 2)} = ${vn(x, 2)}.`,
        numOpts(x, { min: 0, max: 15, decimals: 2 }),
      );
    }
    if (k < 46) {
      const i = k - 38;
      const a = round2(45.5 + i * 3.25);
      const d = round2(6.75 + i * 0.5);
      const answer = round2(a + d);
      return fact(
        `Buổi sáng cửa hàng bán được ${vn(a, 2)} kg gạo, buổi chiều bán nhiều hơn buổi sáng ${vn(d, 2)} kg. Hỏi buổi chiều cửa hàng bán được bao nhiêu ki-lô-gam gạo?`,
        vn(answer, 2),
        `${vn(a, 2)} + ${vn(d, 2)} = ${vn(answer, 2)} (kg).`,
        numOpts(answer, { min: 0, max: 100, decimals: 2 }),
      );
    }
    const i = k - 46;
    const a = round2(5.4 + i * 1.15);
    const b = round2(2.6 + i * 0.4);
    const c = round2(1.35 + i * 0.25);
    const answer = round2(a + b - c);
    const sum = round2(a + b);
    return fact(
      `Tính: ${vn(a, 2)} + ${vn(b, 2)} - ${vn(c, 2)} = ?`,
      vn(answer, 2),
      `${vn(a, 2)} + ${vn(b, 2)} = ${vn(sum, 2)}; ${vn(sum, 2)} - ${vn(c, 2)} = ${vn(answer, 2)}.`,
      numOpts(answer, { min: 0, max: 20, decimals: 2 }),
    );
  },
  fill(k) {
    if (k < 8) {
      const a = round2(3.25 + k * 0.65);
      const b = round2(1.4 + k * 0.45);
      const answer = round2(a + b);
      return fill(`Tính: ${vn(a, 2)} + ${vn(b, 2)} = ___.`, accept(answer, 2), `${vn(a, 2)} + ${vn(b, 2)} = ${vn(answer, 2)}.`);
    }
    if (k < 14) {
      const i = k - 8;
      const a = round2(15.6 + i * 1.15);
      const b = round2(4.25 + i * 0.45);
      const answer = round2(a - b);
      return fill(`Tính: ${vn(a, 2)} - ${vn(b, 2)} = ___.`, accept(answer, 2), `${vn(a, 2)} - ${vn(b, 2)} = ${vn(answer, 2)}.`);
    }
    if (k < 19) {
      const i = k - 14;
      const a = round2(3.8 + i * 1.05);
      const x = round2(2.15 + i * 0.6);
      const c = round2(a + x);
      return fill(`___ + ${vn(a, 2)} = ${vn(c, 2)}.`, accept(x, 2), `${vn(c, 2)} - ${vn(a, 2)} = ${vn(x, 2)}.`);
    }
    const i = k - 19;
    const a = round2(8.5 + i * 1.25);
    const b = round2(3.75 + i * 0.5);
    const c = round2(2.1 + i * 0.35);
    const answer = round2(a + b - c);
    return fill(`Tính: ${vn(a, 2)} + ${vn(b, 2)} - ${vn(c, 2)} = ___.`, accept(answer, 2), `${vn(a, 2)} + ${vn(b, 2)} = ${vn(round2(a + b), 2)}; ${vn(round2(a + b), 2)} - ${vn(c, 2)} = ${vn(answer, 2)}.`);
  },
  tf(k) {
    if (k < 12) {
      const a = round2(3.6 + k * 0.85);
      const b = round2(1.25 + k * 0.35);
      const real = round2(a + b);
      const shown = k % 2 === 1 ? round2(real + 0.2) : real;
      return tf(
        `${vn(a, 2)} + ${vn(b, 2)} = ${vn(shown, 2)}.`,
        shown === real,
        shown === real
          ? `${vn(a, 2)} + ${vn(b, 2)} = ${vn(real, 2)}, nên phép tính đúng.`
          : `${vn(a, 2)} + ${vn(b, 2)} = ${vn(real, 2)}, không phải ${vn(shown, 2)}, nên phép tính sai.`,
      );
    }
    const i = k - 12;
    const a = round2(9.5 + i * 1.3);
    const b = round2(2.8 + i * 0.6);
    const real = round2(a - b);
    const shown = i % 2 === 0 ? round2(real + 0.5) : real;
    return tf(
      `${vn(a, 2)} - ${vn(b, 2)} = ${vn(shown, 2)}.`,
      shown === real,
      shown === real
        ? `${vn(a, 2)} - ${vn(b, 2)} = ${vn(real, 2)}, nên phép tính đúng.`
        : `${vn(a, 2)} - ${vn(b, 2)} = ${vn(real, 2)}, không phải ${vn(shown, 2)}, nên phép tính sai.`,
    );
  },
  multi(k) {
    const target = round2(1.5 + k * 0.5);
    const x1 = 0.4;
    const y1 = round2(target - x1);
    const x2 = 1.4;
    const y2 = round2(target - x2);
    return multiFact(
      `Chọn tất cả các phép tính có kết quả bằng ${vn(target, 2)}.`,
      [`${vn(x1, 2)} + ${vn(y1, 2)}`, `${vn(x2, 2)} + ${vn(y2, 2)}`],
      [`${vn(x1, 2)} + ${vn(round2(y1 + 0.15), 2)}`, `${vn(x2, 2)} + ${vn(round2(y2 + 0.3), 2)}`],
      `${vn(x1, 2)} + ${vn(y1, 2)} = ${vn(target, 2)} và ${vn(x2, 2)} + ${vn(y2, 2)} = ${vn(target, 2)}.`,
    );
  },
};

const nhanChiaThapPhan = {
  single(k) {
    if (k < 12) {
      const a = round2(1.25 + k * 0.75);
      const p = [10, 100, 1000][k % 3];
      const answer = round2(a * p);
      return fact(
        `Tính: ${vn(a, 2)} × ${p} = ?`,
        vn(answer, 2),
        `Nhân với ${p} ta dịch dấu phẩy sang phải ${String(p).length - 1} chữ số: ${vn(a, 2)} × ${p} = ${vn(answer, 2)}.`,
        numOpts(answer, { min: 0, max: 20000, decimals: 1 }),
      );
    }
    if (k < 24) {
      const i = k - 12;
      const a = round2(1.15 + i * 0.85);
      const b = 3 + (i % 5);
      const answer = round2(a * b);
      return fact(`Tính: ${vn(a, 2)} × ${b} = ?`, vn(answer, 2), `${vn(a, 2)} × ${b} = ${vn(answer, 2)}.`, numOpts(answer, { min: 0, max: 100, decimals: 2 }));
    }
    if (k < 30) {
      const a = round2(12.5 + (k - 24) * 7.5);
      const answer = round2(a / 10);
      return fact(
        `Tính: ${vn(a, 1)} : 10 = ?`,
        vn(answer, 2),
        `Chia cho 10 ta dịch dấu phẩy sang trái một chữ số: ${vn(a, 1)} : 10 = ${vn(answer, 2)}.`,
        numOpts(answer, { min: 0, max: 10, decimals: 2 }),
      );
    }
    if (k < 34) {
      const a = 45 + (k - 30) * 25;
      const answer = round2(a / 100);
      return fact(
        `Tính: ${a} : 100 = ?`,
        vn(answer, 2),
        `Chia cho 100 ta dịch dấu phẩy sang trái hai chữ số: ${a} : 100 = ${vn(answer, 2)}.`,
        numOpts(answer, { min: 0, max: 2, decimals: 2 }),
      );
    }
    if (k < 44) {
      const i = k - 34;
      const b = 4 + (i % 4);
      const q = round2(1.25 + i * 0.5);
      const a = round2(q * b);
      return fact(`Tính: ${vn(a, 2)} : ${b} = ?`, vn(q, 2), `${vn(a, 2)} : ${b} = ${vn(q, 2)}.`, numOpts(q, { min: 0, max: 10, decimals: 2 }));
    }
    if (k < 48) {
      const i = k - 44;
      const v = round2(42.5 + i * 3.5);
      const t = 2 + (i % 4);
      const answer = round2(v * t);
      return fact(
        `Mỗi giờ ô tô đi được ${vn(v, 2)} km. Trong ${t} giờ ô tô đi được bao nhiêu ki-lô-mét?`,
        vn(answer, 2),
        `${vn(v, 2)} × ${t} = ${vn(answer, 2)} (km).`,
        numOpts(answer, { min: 0, max: 400, decimals: 1 }),
      );
    }
    const i = k - 48;
    const n = 3 + i;
    const each = round2(2.5 + i * 0.75);
    const total = round2(n * each);
    return fact(
      `Chia đều ${vn(total, 2)} kg đường vào ${n} túi. Hỏi mỗi túi có bao nhiêu ki-lô-gam đường?`,
      vn(each, 2),
      `${vn(total, 2)} : ${n} = ${vn(each, 2)} (kg).`,
      numOpts(each, { min: 0, max: 10, decimals: 2 }),
    );
  },
  fill(k) {
    if (k < 8) {
      const a = round2(2.4 + k * 0.85);
      const b = 3 + (k % 5);
      const answer = round2(a * b);
      return fill(`Tính: ${vn(a, 2)} × ${b} = ___.`, accept(answer, 2), `${vn(a, 2)} × ${b} = ${vn(answer, 2)}.`);
    }
    if (k < 14) {
      const i = k - 8;
      const b = 4 + (i % 3);
      const q = round2(1.5 + i * 0.65);
      const a = round2(q * b);
      return fill(`Tính: ${vn(a, 2)} : ${b} = ___.`, accept(q, 2), `${vn(a, 2)} : ${b} = ${vn(q, 2)}.`);
    }
    if (k < 19) {
      const items = [
        ['Tính: 3,45 × 10 = ___.', 34.5],
        ['Tính: 3,45 × 100 = ___.', 345],
        ['Tính: 3,45 × 1000 = ___.', 3450],
        ['Tính: 34,5 : 10 = ___.', 3.45],
        ['Tính: 345 : 100 = ___.', 3.45],
      ];
      const [prompt, answer] = items[k - 14];
      return fill(prompt, accept(answer, 2), `Đáp án là ${vn(answer, 2)}.`);
    }
    const i = k - 19;
    const b = 4 + i;
    const q = round2(1.25 + i * 0.75);
    const product = round2(b * q);
    return fill(`___ × ${b} = ${vn(product, 2)}.`, accept(q, 2), `${vn(product, 2)} : ${b} = ${vn(q, 2)}.`);
  },
  tf(k) {
    if (k < 11) {
      const a = round2(1.5 + k * 0.75);
      const b = 2 + (k % 4);
      const real = round2(a * b);
      const shown = k % 2 === 1 ? round2(real + 0.1) : real;
      return tf(
        `${vn(a, 2)} × ${b} = ${vn(shown, 2)}.`,
        shown === real,
        shown === real
          ? `${vn(a, 2)} × ${b} = ${vn(real, 2)}, nên phép tính đúng.`
          : `${vn(a, 2)} × ${b} = ${vn(real, 2)}, không phải ${vn(shown, 2)}, nên phép tính sai.`,
      );
    }
    const i = k - 11;
    const b = 3 + i;
    const q = round2(1.5 + i * 0.6);
    const a = round2(q * b);
    const real = q;
    const shown = i % 2 === 0 ? round2(real + 0.5) : real;
    return tf(
      `${vn(a, 2)} : ${b} = ${vn(shown, 2)}.`,
      shown === real,
      shown === real
        ? `${vn(a, 2)} : ${b} = ${vn(real, 2)}, nên phép tính đúng.`
        : `${vn(a, 2)} : ${b} = ${vn(real, 2)}, không phải ${vn(shown, 2)}, nên phép tính sai.`,
    );
  },
  multi(k) {
    if (k < 6) {
      const target = 12 + k * 6;
      return multiFact(
        `Chọn tất cả các phép nhân có kết quả bằng ${target}.`,
        [`${vn(target / 4, 2)} × 4`, `${vn(target / 2, 2)} × 2`],
        [`${vn(target / 4, 2)} × 2`, `${vn(target / 2, 2)} × 4`],
        `${vn(target / 4, 2)} × 4 = ${target} và ${vn(target / 2, 2)} × 2 = ${target}.`,
      );
    }
    if (k < 12) {
      const q = round2(2.5 + (k - 6) * 0.5);
      return multiFact(
        `Chọn tất cả các phép chia có kết quả bằng ${vn(q, 2)}.`,
        [`${vn(round2(q * 4), 2)} : 4`, `${vn(round2(q * 10), 2)} : 10`],
        [`${vn(round2(q * 4), 2)} : 2`, `${vn(round2(q * 10), 2)} : 5`],
        `${vn(round2(q * 4), 2)} : 4 = ${vn(q, 2)} và ${vn(round2(q * 10), 2)} : 10 = ${vn(q, 2)}.`,
      );
    }
    const items = [
      ['Chọn tất cả các phép tính đúng.', ['2,5 × 4 = 10', '12,6 : 3 = 4,2'], ['3,5 × 2 = 8', '9,6 : 4 = 2,5'], '2,5 × 4 = 10 và 12,6 : 3 = 4,2 là đúng.'],
      ['Chọn tất cả các phép tính có kết quả lớn hơn 20.', ['4,5 × 5', '36 : 1,5'], ['2,5 × 4', '18 : 2'], '4,5 × 5 = 22,5 và 36 : 1,5 = 24 đều lớn hơn 20.'],
      ['Chọn tất cả các phép nhân có kết quả bé hơn 10.', ['2,5 × 2', '1,5 × 4'], ['2,5 × 8', '4,5 × 4'], '2,5 × 2 = 5 và 1,5 × 4 = 6 đều bé hơn 10.'],
      ['Chọn tất cả các phép chia có kết quả bằng 1,5.', ['6 : 4', '15 : 10'], ['6 : 2', '15 : 5'], '6 : 4 = 1,5 và 15 : 10 = 1,5.'],
      ['Chọn tất cả các số bằng 4,5 × 2.', ['9', '4,5 + 4,5'], ['8,5', '4,5 × 3'], '4,5 × 2 = 9 và 4,5 + 4,5 = 9.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k - 12];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

export const MATH_GRADE_5A = {
  'toan-5-so-thap-phan': soThapPhan,
  'toan-5-cong-tru-thap-phan': congTruThapPhan,
  'toan-5-nhan-chia-thap-phan': nhanChiaThapPhan,
};
