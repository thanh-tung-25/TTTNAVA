import { fact, fill, formatNumber, multiFact, numericDistractors, tf } from './math-utils.js';

const vn = (value, decimals = 0) => formatNumber(value, decimals).replace('.', ',');
const numOpts = (answer, options) => numericDistractors(answer, options).map((item) => item.replace('.', ','));
const accept = (value, decimals = 0) => {
  const a = vn(value, decimals);
  const b = formatNumber(value, decimals);
  return a === b ? [a] : [a, b];
};
const round2 = (value) => Math.round(value * 100) / 100;

const tiSoPhanTram = {
  single(k) {
    if (k < 10) {
      const value = round2(0.05 + k * 0.07);
      const percent = Math.round(value * 100);
      return fact(
        `Số ${vn(value, 2)} bằng bao nhiêu phần trăm?`,
        percent,
        `${vn(value, 2)} × 100 = ${percent}, nên ${vn(value, 2)} = ${percent}%.`,
        numOpts(percent, { min: 0, max: 100 }),
      );
    }
    if (k < 18) {
      const p = 5 + (k - 10) * 12;
      const value = round2(p / 100);
      return fact(`Viết ${p}% dưới dạng số thập phân.`, vn(value, 2), `${p}% = ${p}/100 = ${vn(value, 2)}.`, numOpts(value, { min: 0, max: 1, decimals: 2 }));
    }
    if (k < 26) {
      const items = [['1/2', 50], ['1/4', 25], ['3/4', 75], ['1/5', 20], ['2/5', 40], ['3/5', 60], ['1/10', 10], ['7/10', 70]];
      const [fraction, percent] = items[k - 18];
      return fact(`Phân số ${fraction} bằng bao nhiêu phần trăm?`, percent, `${fraction} = ${percent}/100 = ${percent}%.`, numOpts(percent, { min: 0, max: 100 }));
    }
    if (k < 38) {
      const i = k - 26;
      const p = 5 + i * 5;
      const n = 40 + i * 20;
      const answer = (p * n) / 100;
      return fact(`${p}% của ${n} là bao nhiêu?`, answer, `${p}% của ${n} là ${n} × ${p} : 100 = ${answer}.`, numOpts(answer, { min: 0, max: 200 }));
    }
    if (k < 46) {
      const i = k - 38;
      const p = 10 + i * 10;
      const y = 50 + i * 10;
      const x = (p * y) / 100;
      return fact(`${x} là bao nhiêu phần trăm của ${y}?`, p, `${x} : ${y} = ${vn(x / y, 2)} = ${p}%.`, numOpts(p, { min: 0, max: 100 }));
    }
    const items = [
      ['Một lớp học có 40 học sinh, trong đó 60% là học sinh nữ. Hỏi lớp đó có bao nhiêu học sinh nữ?', 24, '60% của 40 là 40 × 60 : 100 = 24 (học sinh).'],
      ['Một cửa hàng có 50 kg đường, đã bán 20% số đường đó. Hỏi đã bán bao nhiêu ki-lô-gam đường?', 10, '20% của 50 là 50 × 20 : 100 = 10 (kg).'],
      ['Một vườn cây có 200 cây, trong đó 45% là cây cam. Hỏi có bao nhiêu cây cam?', 90, '45% của 200 là 200 × 45 : 100 = 90 (cây).'],
      ['Một giá sách có 80 quyển, người ta tặng 25% số sách đó. Hỏi đã tặng bao nhiêu quyển?', 20, '25% của 80 là 80 × 25 : 100 = 20 (quyển).'],
      ['Một chiếc áo giá 500 000 đồng, cửa hàng giảm giá 10%. Hỏi số tiền được giảm là bao nhiêu đồng?', 50000, '10% của 500 000 là 500 000 × 10 : 100 = 50 000 (đồng).'],
      ['Một trường có 600 học sinh, trong đó 55% là học sinh nữ. Hỏi trường đó có bao nhiêu học sinh nữ?', 330, '55% của 600 là 600 × 55 : 100 = 330 (học sinh).'],
    ];
    const [prompt, answer, explanation] = items[k - 46];
    return fact(prompt, answer, explanation, numOpts(answer, { min: 0, max: 600000 }));
  },
  fill(k) {
    if (k < 6) {
      const p = 10 + k * 5;
      const n = 60 + k * 20;
      const answer = (p * n) / 100;
      return fill(`${p}% của ${n} là ___.`, accept(answer), `${n} × ${p} : 100 = ${answer}.`);
    }
    if (k < 12) {
      const i = k - 6;
      const value = round2(0.15 + i * 0.11);
      const percent = Math.round(value * 100);
      return fill(`Số ${vn(value, 2)} bằng ___%.`, accept(percent), `${vn(value, 2)} × 100 = ${percent}.`);
    }
    if (k < 17) {
      const items = [[15, 30], [20, 40], [25, 50], [40, 80], [45, 90]];
      const [percent, value] = items[k - 12];
      return fill(`___% của 200 là ${value}.`, accept(percent), `${value} : 200 = ${vn(value / 200, 2)} = ${percent}%.`);
    }
    const items = [
      ['Một cửa hàng có 80 kg gạo, đã bán 25% số gạo đó. Đã bán ___ kg gạo.', 20, '25% của 80 là 80 × 25 : 100 = 20 (kg).'],
      ['Lớp 5A có 32 học sinh, trong đó 50% là học sinh nữ. Lớp đó có ___ học sinh nữ.', 16, '50% của 32 là 32 × 50 : 100 = 16 (học sinh).'],
      ['Một người gửi 1 000 000 đồng với lãi suất 6% một năm. Sau một năm người đó nhận ___ đồng tiền lãi.', 60000, '6% của 1 000 000 là 60 000 (đồng).'],
      ['Một thùng có 120 lít nước, đã dùng 15% lượng nước đó. Đã dùng ___ lít nước.', 18, '15% của 120 là 120 × 15 : 100 = 18 (lít).'],
      ['Một mảnh vườn rộng 500 m², người ta trồng rau trên 40% diện tích. Diện tích trồng rau là ___ m².', 200, '40% của 500 là 500 × 40 : 100 = 200 (m²).'],
    ];
    const [prompt, answer, explanation] = items[k - 17];
    return fill(prompt, accept(answer), explanation);
  },
  tf(k) {
    if (k < 9) {
      const p = 10 + k * 10;
      const real = round2(p / 100);
      const shown = k % 2 === 1 ? round2(real + 0.05) : real;
      return tf(
        `${vn(shown, 2)} = ${p}%.`,
        shown === real,
        shown === real ? `${p}% = ${p}/100 = ${vn(real, 2)}, nên đúng.` : `${p}% = ${vn(real, 2)}, không phải ${vn(shown, 2)}, nên sai.`,
      );
    }
    if (k < 14) {
      const i = k - 9;
      const p = 10 + i * 10;
      const n = 40 + i * 20;
      const real = (p * n) / 100;
      const shown = i % 2 === 0 ? real + 5 : real;
      return tf(
        `${p}% của ${n} là ${shown}.`,
        shown === real,
        shown === real ? `${n} × ${p} : 100 = ${real}, nên đúng.` : `${n} × ${p} : 100 = ${real}, không phải ${shown}, nên sai.`,
      );
    }
    const items = [
      ['Tỉ số phần trăm 50% bằng phân số 1/2.', true, '50% = 50/100 = 1/2.'],
      ['25% của một số luôn lớn hơn số đó.', false, '25% của một số bằng 1/4 số đó nên bé hơn số đó.'],
      ['Số 0,8 viết thành 80%.', true, '0,8 × 100 = 80, nên 0,8 = 80%.'],
    ];
    const [statement, value, explanation] = items[k - 14];
    return tf(statement, value, explanation);
  },
  multi(k) {
    if (k < 8) {
      const p = 10 + k * 10;
      return multiFact(
        `Chọn tất cả các số bằng ${p}%.`,
        [vn(p / 100, 2), `${p}/100`],
        [vn(p / 1000, 2), `${p}/10`],
        `${p}% = ${p}/100 = ${vn(p / 100, 2)}.`,
      );
    }
    if (k < 13) {
      const target = 12 + (k - 8) * 8;
      return multiFact(
        `Chọn tất cả các phép tính có kết quả bằng ${target}.`,
        [`${target * 2}% của 50`, `${target}% của 100`],
        [`${target}% của 50`, `${target * 2}% của 100`],
        `${target * 2}% của 50 bằng ${target}; ${target}% của 100 bằng ${target}.`,
      );
    }
    const items = [
      ['Chọn tất cả các tỉ số phần trăm bằng 1/2.', ['50%', '50/100'], ['5%', '20%'], '50% = 50/100 = 1/2.'],
      ['Chọn tất cả các tỉ số phần trăm bằng 1/5.', ['20%', '20/100'], ['5%', '50%'], '20% = 20/100 = 1/5.'],
      ['Chọn tất cả các số lớn hơn 50%.', ['0,75', '80%'], ['0,45', '25%'], '0,75 = 75% và 80% đều lớn hơn 50%.'],
      ['Chọn tất cả các số bé hơn 25%.', ['0,1', '15%'], ['0,3', '40%'], '0,1 = 10% và 15% đều bé hơn 25%.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k - 13];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const PI = 3.14;

const hinhHoc = {
  single(k) {
    if (k < 12) {
      const i = k;
      const base = 6 + i * 2;
      const height = 4 + (i % 5) * 2;
      const answer = (base * height) / 2;
      return fact(
        `Hình tam giác có độ dài đáy ${base} cm và chiều cao ${height} cm. Diện tích là bao nhiêu xăng-ti-mét vuông?`,
        answer,
        `Diện tích tam giác là ${base} × ${height} : 2 = ${answer} (cm²).`,
        numOpts(answer, { min: 0, max: 300 }),
      );
    }
    if (k < 24) {
      const i = k - 12;
      const small = 4 + i * 2;
      const large = small + 4;
      const height = 4 + (i % 3) * 2;
      const answer = ((small + large) * height) / 2;
      return fact(
        `Hình thang có đáy bé ${small} cm, đáy lớn ${large} cm và chiều cao ${height} cm. Diện tích là bao nhiêu xăng-ti-mét vuông?`,
        answer,
        `Diện tích hình thang là (${small} + ${large}) × ${height} : 2 = ${answer} (cm²).`,
        numOpts(answer, { min: 0, max: 400 }),
      );
    }
    if (k < 32) {
      const i = k - 24;
      const r = 2 + i;
      if (i % 2 === 0) {
        const answer = round2(r * r * PI);
        return fact(
          `Hình tròn có bán kính ${r} cm. Diện tích là bao nhiêu xăng-ti-mét vuông (lấy π = 3,14)?`,
          vn(answer, 2),
          `Diện tích hình tròn là ${r} × ${r} × 3,14 = ${vn(answer, 2)} (cm²).`,
          numOpts(answer, { min: 0, max: 400, decimals: 2 }),
        );
      }
      const answer = round2(2 * r * PI);
      return fact(
        `Hình tròn có bán kính ${r} cm. Chu vi là bao nhiêu xăng-ti-mét (lấy π = 3,14)?`,
        vn(answer, 2),
        `Chu vi hình tròn là ${r} × 2 × 3,14 = ${vn(answer, 2)} (cm).`,
        numOpts(answer, { min: 0, max: 100, decimals: 2 }),
      );
    }
    if (k < 44) {
      const i = k - 32;
      const a = 2 + (i % 5);
      const b = 3 + (i % 4);
      const c = 4 + (i % 3);
      const answer = a * b * c;
      return fact(
        `Hình hộp chữ nhật có chiều dài ${a} cm, chiều rộng ${b} cm và chiều cao ${c} cm. Thể tích là bao nhiêu xăng-ti-mét khối?`,
        answer,
        `Thể tích hình hộp chữ nhật là ${a} × ${b} × ${c} = ${answer} (cm³).`,
        numOpts(answer, { min: 0, max: 400 }),
      );
    }
    if (k < 50) {
      const i = k - 44;
      const edge = 2 + i;
      if (i % 2 === 0) {
        const answer = edge ** 3;
        return fact(
          `Hình lập phương có cạnh ${edge} cm. Thể tích là bao nhiêu xăng-ti-mét khối?`,
          answer,
          `Thể tích hình lập phương là ${edge} × ${edge} × ${edge} = ${answer} (cm³).`,
          numOpts(answer, { min: 0, max: 500 }),
        );
      }
      const answer = 6 * edge ** 2;
      return fact(
        `Hình lập phương có cạnh ${edge} cm. Diện tích toàn phần là bao nhiêu xăng-ti-mét vuông?`,
        answer,
        `Diện tích toàn phần là 6 × ${edge} × ${edge} = ${answer} (cm²).`,
        numOpts(answer, { min: 0, max: 500 }),
      );
    }
    if (k === 50) {
      return fact(
        'Hình tam giác có diện tích 36 cm² và độ dài đáy 8 cm. Chiều cao của hình tam giác là bao nhiêu xăng-ti-mét?',
        9,
        'Chiều cao là 36 × 2 : 8 = 9 (cm).',
        numOpts(9, { min: 0, max: 30 }),
      );
    }
    return fact(
      'Hình hộp chữ nhật có thể tích 120 cm³ và diện tích đáy 24 cm². Chiều cao của hình hộp là bao nhiêu xăng-ti-mét?',
      5,
      'Chiều cao là 120 : 24 = 5 (cm).',
      numOpts(5, { min: 0, max: 20 }),
    );
  },
  fill(k) {
    if (k < 6) {
      const base = 7 + k * 2;
      const height = 4 + (k % 3) * 2;
      const answer = (base * height) / 2;
      return fill(
        `Hình tam giác có đáy ${base} cm và chiều cao ${height} cm. Diện tích là ___ cm².`,
        accept(answer),
        `${base} × ${height} : 2 = ${answer} (cm²).`,
      );
    }
    if (k < 11) {
      const i = k - 6;
      const small = 3 + i * 2;
      const large = small + 5;
      const height = 4 + (i % 2) * 2;
      const answer = ((small + large) * height) / 2;
      return fill(
        `Hình thang có đáy bé ${small} cm, đáy lớn ${large} cm và chiều cao ${height} cm. Diện tích là ___ cm².`,
        accept(answer),
        `(${small} + ${large}) × ${height} : 2 = ${answer} (cm²).`,
      );
    }
    if (k < 16) {
      const i = k - 11;
      const r = 3 + i;
      if (i % 2 === 0) {
        const answer = round2(r * r * PI);
        return fill(
          `Hình tròn có bán kính ${r} cm. Diện tích là ___ cm² (lấy π = 3,14).`,
          accept(answer, 2),
          `${r} × ${r} × 3,14 = ${vn(answer, 2)} (cm²).`,
        );
      }
      const answer = round2(2 * r * PI);
      return fill(
        `Hình tròn có bán kính ${r} cm. Chu vi là ___ cm (lấy π = 3,14).`,
        accept(answer, 2),
        `${r} × 2 × 3,14 = ${vn(answer, 2)} (cm).`,
      );
    }
    if (k < 20) {
      const items = [[3, 4, 5], [5, 5, 4], [6, 3, 7], [4, 8, 5]];
      const [a, b, c] = items[k - 16];
      return fill(
        `Hình hộp chữ nhật có chiều dài ${a} cm, chiều rộng ${b} cm và chiều cao ${c} cm. Thể tích là ___ cm³.`,
        accept(a * b * c),
        `${a} × ${b} × ${c} = ${a * b * c} (cm³).`,
      );
    }
    if (k === 20) {
      return fill(
        'Hình tam giác có diện tích 45 cm² và đáy 10 cm. Chiều cao là ___ cm.',
        accept(9),
        '45 × 2 : 10 = 9 (cm).',
      );
    }
    return fill(
      'Hình hộp chữ nhật có thể tích 180 cm³ và diện tích đáy 30 cm². Chiều cao là ___ cm.',
      accept(6),
      '180 : 30 = 6 (cm).',
    );
  },
  tf(k) {
    if (k < 5) {
      const base = 6 + k * 2;
      const height = 5;
      const real = (base * height) / 2;
      const shown = k % 2 === 1 ? real + 4 : real;
      return tf(
        `Hình tam giác có đáy ${base} cm và chiều cao ${height} cm có diện tích ${shown} cm².`,
        shown === real,
        shown === real ? `${base} × ${height} : 2 = ${real} (cm²), nên đúng.` : `${base} × ${height} : 2 = ${real} (cm²), không phải ${shown}, nên sai.`,
      );
    }
    const items = [
      ['Hình thang có đáy lớn 10 cm, đáy bé 6 cm, chiều cao 4 cm có diện tích 32 cm².', true, '(10 + 6) × 4 : 2 = 32 (cm²).'],
      ['Hình tròn có bán kính 5 cm có chu vi 31,4 cm (π = 3,14).', true, '5 × 2 × 3,14 = 31,4 (cm).'],
      ['Hình tròn có bán kính 4 cm có diện tích 50,24 cm² (π = 3,14).', true, '4 × 4 × 3,14 = 50,24 (cm²).'],
      ['Hình tam giác có diện tích 30 cm² và đáy 10 cm thì chiều cao là 6 cm.', true, '30 × 2 : 10 = 6 (cm).'],
      ['Hình thang có đáy lớn 8 cm, đáy bé 4 cm, chiều cao 5 cm có diện tích 60 cm².', false, '(8 + 4) × 5 : 2 = 30 (cm²), không phải 60 cm².'],
      ['Hình lập phương cạnh 3 cm có thể tích 27 cm³.', true, '3 × 3 × 3 = 27 (cm³).'],
      ['Hình hộp chữ nhật có chiều dài 5 cm, rộng 4 cm, cao 3 cm có thể tích 60 cm³.', true, '5 × 4 × 3 = 60 (cm³).'],
      ['Hình lập phương cạnh 5 cm có diện tích toàn phần 100 cm².', false, '6 × 5 × 5 = 150 (cm²), không phải 100 cm².'],
      ['Thể tích hình hộp chữ nhật bằng diện tích đáy nhân với chiều cao.', true, 'Đây là quy tắc tính thể tích hình hộp chữ nhật.'],
      ['Hình lập phương cạnh 4 cm có thể tích 64 cm³.', true, '4 × 4 × 4 = 64 (cm³).'],
      ['Diện tích hình tam giác bằng độ dài đáy nhân với chiều cao.', false, 'Phải chia 2: diện tích tam giác bằng đáy nhân chiều cao rồi chia 2.'],
      ['Hình tròn có đường kính 10 cm thì bán kính là 5 cm.', true, 'Bán kính bằng một nửa đường kính: 10 : 2 = 5 (cm).'],
    ];
    const [statement, value, explanation] = items[k - 5];
    return tf(statement, value, explanation);
  },
  multi(k) {
    if (k < 6) {
      const area = 12 + k * 6;
      return multiFact(
        `Chọn tất cả các hình tam giác có diện tích bằng ${area} cm².`,
        [`đáy 4 cm, cao ${area / 2} cm`, `đáy 6 cm, cao ${area / 3} cm`],
        [`đáy 4 cm, cao ${area / 2 + 1} cm`, `đáy 6 cm, cao ${area / 3 + 2} cm`],
        `4 × ${area / 2} : 2 = ${area} (cm²) và 6 × ${area / 3} : 2 = ${area} (cm²).`,
      );
    }
    if (k < 11) {
      const items = [
        ['Chọn tất cả các công thức tính diện tích đúng.', ['tam giác: S = a × h : 2', 'hình thang: S = (a + b) × h : 2'], ['hình tròn: C = r × 3,14', 'hình lập phương: V = a × 6'], 'Diện tích tam giác và diện tích hình thang đều lấy đáy nhân chiều cao rồi chia 2 (hình thang lấy tổng hai đáy).'],
        ['Chọn tất cả các công thức về hình tròn đúng.', ['C = r × 2 × 3,14', 'S = r × r × 3,14'], ['S = r × 2 × 3,14', 'C = r × r × 3,14'], 'Chu vi C = r × 2 × 3,14; diện tích S = r × r × 3,14.'],
        ['Chọn tất cả các công thức tính thể tích đúng.', ['hình hộp chữ nhật: V = a × b × c', 'hình lập phương: V = a × a × a'], ['hình hộp chữ nhật: V = a + b + c', 'hình lập phương: V = a × 6'], 'Thể tích hình hộp chữ nhật là a × b × c; thể tích hình lập phương là a × a × a.'],
        ['Chọn tất cả các cách tính diện tích hình thang đúng.', ['(a + b) × h : 2', '(a + b) : 2 × h'], ['(a + b) × h', 'a × b × h : 2'], 'Diện tích hình thang bằng tổng hai đáy nhân chiều cao rồi chia 2.'],
        ['Chọn tất cả các cách tính diện tích tam giác đúng.', ['a × h : 2', 'a : 2 × h'], ['a × h', 'a + h × 2'], 'Diện tích tam giác bằng đáy nhân chiều cao rồi chia 2.'],
      ];
      const [prompt, correct, wrong, explanation] = items[k - 6];
      return multiFact(prompt, correct, wrong, explanation);
    }
    const volume = 24 + (k - 11) * 12;
    const height = volume / 12;
    return multiFact(
      `Chọn tất cả các hình hộp chữ nhật có thể tích bằng ${volume} cm³.`,
      [`dài 4 cm, rộng 3 cm, cao ${height} cm`, `dài 6 cm, rộng 2 cm, cao ${height} cm`],
      [`dài 4 cm, rộng 3 cm, cao ${height + 1} cm`, `dài 6 cm, rộng 2 cm, cao ${height + 2} cm`],
      `4 × 3 × ${height} = ${volume} (cm³) và 6 × 2 × ${height} = ${volume} (cm³).`,
    );
  },
};

const doLuongThoiGian = {
  single(k) {
    if (k < 6) {
      const centuries = 1 + k;
      return fact(`Đổi: ${centuries} thế kỷ = ? năm.`, centuries * 100, `${centuries} × 100 = ${centuries * 100} (năm).`, numOpts(centuries * 100, { min: 0, max: 1000 }));
    }
    if (k < 10) {
      const i = k - 6;
      const centuries = 1 + i;
      const years = 11 + i;
      const answer = centuries * 100 + years;
      return fact(`Đổi: ${centuries} thế kỷ ${years} năm = ? năm.`, answer, `${centuries} thế kỷ = ${centuries * 100} năm; thêm ${years} năm được ${answer} năm.`, numOpts(answer, { min: 0, max: 600 }));
    }
    if (k < 14) {
      const i = k - 10;
      const years = 1 + i;
      const months = 3 + i * 2;
      const answer = years * 12 + months;
      return fact(`Đổi: ${years} năm ${months} tháng = ? tháng.`, answer, `${years} năm = ${years * 12} tháng; thêm ${months} tháng được ${answer} tháng.`, numOpts(answer, { min: 0, max: 100 }));
    }
    if (k < 17) {
      const days = [2, 3, 5][k - 14];
      return fact(`Đổi: ${days} ngày = ? giờ.`, days * 24, `1 ngày = 24 giờ, nên ${days} ngày = ${days * 24} giờ.`, numOpts(days * 24, { min: 0, max: 200 }));
    }
    if (k < 20) {
      const weeks = [2, 3, 4][k - 17];
      return fact(`Đổi: ${weeks} tuần = ? ngày.`, weeks * 7, `1 tuần = 7 ngày, nên ${weeks} tuần = ${weeks * 7} ngày.`, numOpts(weeks * 7, { min: 0, max: 50 }));
    }
    if (k < 24) {
      const hours = 2 + (k - 20);
      return fact(`Đổi: ${hours} giờ = ? phút.`, hours * 60, `1 giờ = 60 phút, nên ${hours} giờ = ${hours * 60} phút.`, numOpts(hours * 60, { min: 0, max: 400 }));
    }
    if (k < 27) {
      const minutes = [3, 4, 6][k - 24];
      return fact(`Đổi: ${minutes} phút = ? giây.`, minutes * 60, `1 phút = 60 giây, nên ${minutes} phút = ${minutes * 60} giây.`, numOpts(minutes * 60, { min: 0, max: 400 }));
    }
    if (k < 30) {
      const items = [[2, 15], [3, 20], [1, 45]];
      const [hours, minutes] = items[k - 27];
      const answer = hours * 60 + minutes;
      return fact(`Đổi: ${hours} giờ ${minutes} phút = ? phút.`, answer, `${hours} giờ = ${hours * 60} phút; thêm ${minutes} phút được ${answer} phút.`, numOpts(answer, { min: 0, max: 300 }));
    }
    if (k < 34) {
      const i = k - 30;
      const h1 = 2 + i;
      const m1 = 20 + i * 5;
      const total = (h1 + 1) * 60 + m1 + 45;
      const answer = `${Math.floor(total / 60)} giờ ${total % 60} phút`;
      return fact(
        `Tính: ${h1} giờ ${m1} phút + 1 giờ 45 phút = ?`,
        answer,
        `${h1} giờ ${m1} phút + 1 giờ 45 phút = ${answer}.`,
        [`${Math.floor(total / 60)} giờ ${(total % 60) + 10} phút`, `${Math.floor(total / 60) + 1} giờ ${total % 60} phút`, `${Math.floor(total / 60) + 2} giờ ${total % 60} phút`],
      );
    }
    if (k < 38) {
      const i = k - 34;
      const h1 = 5 + i;
      const total = h1 * 60 + 10 - (2 * 60 + 35);
      const answer = `${Math.floor(total / 60)} giờ ${total % 60} phút`;
      return fact(
        `Tính: ${h1} giờ 10 phút - 2 giờ 35 phút = ?`,
        answer,
        `${h1} giờ 10 phút = ${h1 - 1} giờ 70 phút; trừ 2 giờ 35 phút được ${answer}.`,
        [`${Math.floor(total / 60)} giờ ${(total % 60) + 10} phút`, `${Math.floor(total / 60) + 1} giờ ${total % 60} phút`, `${Math.floor(total / 60) - 1} giờ ${total % 60} phút`],
      );
    }
    if (k < 40) {
      const items = [
        ['Một buổi học bắt đầu lúc 7 giờ 20 phút và kết thúc lúc 9 giờ 5 phút. Buổi học kéo dài bao lâu?', '1 giờ 45 phút', ['1 giờ 15 phút', '2 giờ 45 phút', '1 giờ 25 phút'], 'Từ 7 giờ 20 phút đến 9 giờ 5 phút là 1 giờ 45 phút.'],
        ['Một chuyến tàu khởi hành lúc 21 giờ 15 phút và đến nơi lúc 22 giờ 5 phút. Chuyến tàu đi hết bao lâu?', '50 phút', ['1 giờ 10 phút', '45 phút', '1 giờ 50 phút'], 'Từ 21 giờ 15 phút đến 22 giờ 5 phút là 50 phút.'],
      ];
      const [prompt, answer, wrong, explanation] = items[k - 38];
      return fact(prompt, answer, explanation, wrong);
    }
    if (k < 44) {
      const month = [4, 6, 9, 11][k - 40];
      return fact(`Tháng ${month} có bao nhiêu ngày?`, 30, `Tháng ${month} có 30 ngày.`, numOpts(30, { min: 28, max: 31 }));
    }
    if (k < 47) {
      const items = [
        ['Năm 2020 là năm nhuận. Năm đó có bao nhiêu ngày?', 366, 'Năm nhuận có 366 ngày.'],
        ['Năm 2019 không phải năm nhuận. Năm đó có bao nhiêu ngày?', 365, 'Năm không nhuận có 365 ngày.'],
        ['Một năm nhuận có bao nhiêu ngày?', 366, 'Năm nhuận có 366 ngày (tháng 2 có 29 ngày).'],
      ];
      const [prompt, answer, explanation] = items[k - 44];
      return fact(prompt, answer, explanation, numOpts(answer, { min: 360, max: 370 }));
    }
    if (k < 50) {
      const items = [['1/2 thế kỷ = ? năm.', 50], ['1/4 thế kỷ = ? năm.', 25], ['3/4 thế kỷ = ? năm.', 75]];
      const [prompt, answer] = items[k - 47];
      return fact(prompt, answer, `1 thế kỷ = 100 năm, nên đáp án là ${answer} năm.`, numOpts(answer, { min: 0, max: 100 }));
    }
    const items = [
      ['Một ngày có bao nhiêu giờ?', 24, 'Một ngày có 24 giờ.'],
      ['Một ngày có bao nhiêu phút?', 1440, '24 × 60 = 1440 (phút).'],
    ];
    const [prompt, answer, explanation] = items[k - 50];
    return fact(prompt, answer, explanation, numOpts(answer, { min: 0, max: 2000 }));
  },
  fill(k) {
    if (k < 6) {
      const centuries = 7 + k;
      return fill(`Đổi: ${centuries} thế kỷ = ___ năm.`, accept(centuries * 100), `${centuries} × 100 = ${centuries * 100} (năm).`);
    }
    if (k < 11) {
      const hours = 6 + (k - 6);
      return fill(`Đổi: ${hours} giờ = ___ phút.`, accept(hours * 60), `${hours} × 60 = ${hours * 60} (phút).`);
    }
    if (k < 16) {
      const minutes = [7, 8, 9, 10, 12][k - 11];
      return fill(`Đổi: ${minutes} phút = ___ giây.`, accept(minutes * 60), `${minutes} × 60 = ${minutes * 60} (giây).`);
    }
    if (k < 19) {
      const days = [4, 6, 7][k - 16];
      return fill(`Đổi: ${days} ngày = ___ giờ.`, accept(days * 24), `${days} × 24 = ${days * 24} (giờ).`);
    }
    const items = [
      ['Tính: 3 giờ 25 phút + 1 giờ 40 phút = ___.', '5 giờ 5 phút', '3 giờ 25 phút + 1 giờ 40 phút = 5 giờ 5 phút.'],
      ['Tính: 6 giờ 10 phút - 2 giờ 45 phút = ___.', '3 giờ 25 phút', '6 giờ 10 phút = 5 giờ 70 phút; trừ 2 giờ 45 phút được 3 giờ 25 phút.'],
      ['Tính: 4 giờ 50 phút + 2 giờ 35 phút = ___.', '7 giờ 25 phút', '4 giờ 50 phút + 2 giờ 35 phút = 7 giờ 25 phút.'],
    ];
    const [prompt, answer, explanation] = items[k - 19];
    return fill(prompt, [answer], explanation);
  },
  tf(k) {
    if (k < 9) {
      const centuries = 2 + k;
      const real = centuries * 100;
      const shown = k % 2 === 1 ? real + 100 : real;
      return tf(
        `${centuries} thế kỷ = ${shown} năm.`,
        shown === real,
        shown === real ? `${centuries} × 100 = ${real} (năm), nên đúng.` : `${centuries} × 100 = ${real} (năm), không phải ${shown}, nên sai.`,
      );
    }
    const items = [
      ['2 giờ 30 phút + 45 phút = 3 giờ 15 phút.', true, '2 giờ 30 phút + 45 phút = 3 giờ 15 phút.'],
      ['5 giờ 20 phút - 1 giờ 45 phút = 3 giờ 35 phút.', true, '5 giờ 20 phút = 4 giờ 80 phút; trừ 1 giờ 45 phút được 3 giờ 35 phút.'],
      ['1 giờ 15 phút = 75 phút.', true, '1 giờ = 60 phút, thêm 15 phút được 75 phút.'],
      ['2 giờ 30 phút + 45 phút = 3 giờ 5 phút.', false, '2 giờ 30 phút + 45 phút = 3 giờ 15 phút, không phải 3 giờ 5 phút.'],
      ['1 thế kỷ = 100 năm.', true, 'Đây là quy đổi đúng.'],
      ['Tháng 2 luôn có 28 ngày.', false, 'Năm nhuận tháng 2 có 29 ngày.'],
      ['1 ngày = 24 giờ.', true, 'Đây là quy đổi đúng.'],
      ['3 ngày = 72 giờ.', true, '3 × 24 = 72 (giờ).'],
    ];
    const [statement, value, explanation] = items[k - 9];
    return tf(statement, value, explanation);
  },
  multi(k) {
    if (k < 6) {
      const minutes = 90 + k * 30;
      return multiFact(
        `Chọn tất cả các số đo bằng ${minutes} phút.`,
        [`${vn(minutes / 60, 2)} giờ`, `${minutes * 60} giây`],
        [`${vn(minutes / 60 + 0.5, 2)} giờ`, `${minutes + 30} phút`],
        `${minutes} phút = ${vn(minutes / 60, 2)} giờ = ${minutes * 60} giây.`,
      );
    }
    if (k < 12) {
      const days = 1 + (k - 6);
      return multiFact(
        `Chọn tất cả các số đo bằng ${days} ngày.`,
        [`${days * 24} giờ`, `${days * 24 * 60} phút`],
        [`${days * 12} giờ`, `${days * 24} phút`],
        `${days} ngày = ${days * 24} giờ = ${days * 24 * 60} phút.`,
      );
    }
    const items = [
      ['Chọn tất cả các số đo bằng 1 thế kỷ.', ['100 năm', '10 thập kỷ'], ['10 năm', '1000 năm'], '1 thế kỷ = 100 năm = 10 thập kỷ.'],
      ['Chọn tất cả các số đo bằng 1 năm thường.', ['12 tháng', '365 ngày'], ['10 tháng', '100 ngày'], '1 năm thường có 12 tháng và 365 ngày.'],
      ['Chọn tất cả các số đo bé hơn 1 giờ.', ['30 phút', '45 phút'], ['90 phút', '2 giờ'], '30 phút và 45 phút đều bé hơn 60 phút.'],
      ['Chọn tất cả các số đo lớn hơn 1 ngày.', ['25 giờ', '30 giờ'], ['20 giờ', '12 giờ'], '1 ngày = 24 giờ nên 25 giờ và 30 giờ đều lớn hơn 1 ngày.'],
      ['Chọn tất cả các tháng có 30 ngày.', ['tháng 4', 'tháng 6'], ['tháng 5', 'tháng 7'], 'Tháng 4 và tháng 6 có 30 ngày; tháng 5 và tháng 7 có 31 ngày.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k - 12];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const chuyenDong = {
  single(k) {
    if (k < 12) {
      const speed = 12 + k * 4;
      const time = 2 + (k % 4);
      const answer = speed * time;
      return fact(
        `Một người đi xe đạp với vận tốc ${speed} km/giờ trong ${time} giờ. Người đó đi được bao nhiêu ki-lô-mét?`,
        answer,
        `Quãng đường là ${speed} × ${time} = ${answer} (km).`,
        numOpts(answer, { min: 0, max: 400 }),
      );
    }
    if (k < 24) {
      const i = k - 12;
      const speed = 15 + i * 3;
      const time = 2 + (i % 4);
      const distance = speed * time;
      return fact(
        `Một ô tô đi được ${distance} km trong ${time} giờ. Vận tốc của ô tô là bao nhiêu ki-lô-mét trên giờ?`,
        speed,
        `Vận tốc là ${distance} : ${time} = ${speed} (km/giờ).`,
        numOpts(speed, { min: 0, max: 150 }),
      );
    }
    if (k < 36) {
      const i = k - 24;
      const speed = 20 + i * 5;
      const time = 2 + (i % 4);
      const distance = speed * time;
      return fact(
        `Quãng đường dài ${distance} km, một ô tô đi với vận tốc ${speed} km/giờ. Thời gian ô tô đi hết quãng đường là bao nhiêu giờ?`,
        time,
        `Thời gian là ${distance} : ${speed} = ${time} (giờ).`,
        numOpts(time, { min: 0, max: 20 }),
      );
    }
    if (k < 44) {
      const i = k - 36;
      const v1 = 40 + i * 5;
      const v2 = 30 + i * 5;
      const time = 2 + (i % 3);
      const distance = (v1 + v2) * time;
      return fact(
        `Hai xe khởi hành cùng lúc từ hai địa điểm cách nhau ${distance} km, đi ngược chiều nhau với vận tốc ${v1} km/giờ và ${v2} km/giờ. Sau bao lâu hai xe gặp nhau?`,
        time,
        `Mỗi giờ hai xe đi được ${v1} + ${v2} = ${v1 + v2} (km); thời gian gặp nhau là ${distance} : ${v1 + v2} = ${time} (giờ).`,
        numOpts(time, { min: 0, max: 20 }),
      );
    }
    if (k < 48) {
      const i = k - 44;
      const gap = 20 + i * 10;
      const time = gap / 10;
      return fact(
        `Xe thứ nhất đi với vận tốc 40 km/giờ. Xe thứ hai xuất phát sau, đi cùng đường với vận tốc 50 km/giờ. Lúc xuất phát, xe thứ hai cách xe thứ nhất ${gap} km. Sau bao lâu xe thứ hai đuổi kịp xe thứ nhất?`,
        time,
        `Mỗi giờ xe thứ hai rút ngắn khoảng cách 50 - 40 = 10 (km); thời gian đuổi kịp là ${gap} : 10 = ${time} (giờ).`,
        numOpts(time, { min: 0, max: 15 }),
      );
    }
    const items = [
      ['Một người đi bộ 12 km trong 3 giờ. Vận tốc của người đó là bao nhiêu ki-lô-mét trên giờ?', 4, '12 : 3 = 4 (km/giờ).'],
      ['Một xe máy đi 90 km với vận tốc 45 km/giờ. Thời gian đi là bao nhiêu giờ?', 2, '90 : 45 = 2 (giờ).'],
      ['Hai bạn xuất phát cùng lúc từ hai đầu quãng đường dài 18 km, đi ngược chiều nhau với vận tốc 4 km/giờ và 5 km/giờ. Sau bao lâu hai bạn gặp nhau?', 2, 'Mỗi giờ hai bạn đi được 4 + 5 = 9 (km); 18 : 9 = 2 (giờ).'],
      ['Một đoàn tàu dài 200 m đi qua một cột mốc với vận tốc 20 m/giây. Thời gian đoàn tàu đi qua cột mốc là bao nhiêu giây?', 10, '200 : 20 = 10 (giây).'],
    ];
    const [prompt, answer, explanation] = items[k - 48];
    return fact(prompt, answer, explanation, numOpts(answer, { min: 0, max: 30 }));
  },
  fill(k) {
    if (k < 6) {
      const speed = 15 + k * 5;
      const time = 2 + (k % 3);
      const answer = speed * time;
      return fill(
        `Một người đi với vận tốc ${speed} km/giờ trong ${time} giờ. Người đó đi được ___ km.`,
        accept(answer),
        `${speed} × ${time} = ${answer} (km).`,
      );
    }
    if (k < 11) {
      const i = k - 6;
      const time = 2 + (i % 4);
      const speed = 10 + i * 4;
      const distance = speed * time;
      return fill(
        `Một người đi ${distance} km trong ${time} giờ. Vận tốc của người đó là ___ km/giờ.`,
        accept(speed),
        `${distance} : ${time} = ${speed} (km/giờ).`,
      );
    }
    if (k < 16) {
      const i = k - 11;
      const speed = 12 + i * 3;
      const time = 2 + (i % 3);
      const distance = speed * time;
      return fill(
        `Quãng đường dài ${distance} km, vận tốc ${speed} km/giờ. Thời gian đi là ___ giờ.`,
        accept(time),
        `${distance} : ${speed} = ${time} (giờ).`,
      );
    }
    if (k < 19) {
      const items = [
        ['Hai xe đi ngược chiều với vận tốc 40 km/giờ và 35 km/giờ. Mỗi giờ hai xe lại gần nhau ___ km.', 75, '40 + 35 = 75 (km).'],
        ['Hai xe đi cùng chiều với vận tốc 50 km/giờ và 40 km/giờ. Mỗi giờ xe nhanh hơn rút ngắn khoảng cách ___ km.', 10, '50 - 40 = 10 (km).'],
        ['Hai xe đi ngược chiều với vận tốc 45 km/giờ và 30 km/giờ. Sau 2 giờ hai xe gặp nhau. Lúc đầu hai xe cách nhau ___ km.', 150, '(45 + 30) × 2 = 150 (km).'],
      ];
      const [prompt, answer, explanation] = items[k - 16];
      return fill(prompt, accept(answer), explanation);
    }
    const items = [
      ['Một người đi xe đạp 36 km trong 3 giờ. Trung bình mỗi giờ người đó đi được ___ km.', 12, '36 : 3 = 12 (km).'],
      ['Một ô tô đi 150 km trong 2,5 giờ. Vận tốc của ô tô là ___ km/giờ.', 60, '150 : 2,5 = 60 (km/giờ).'],
      ['Một người chạy 400 m trong 80 giây. Vận tốc của người đó là ___ m/giây.', 5, '400 : 80 = 5 (m/giây).'],
    ];
    const [prompt, answer, explanation] = items[k - 19];
    return fill(prompt, accept(answer), explanation);
  },
  tf(k) {
    if (k < 9) {
      const speed = 12 + k * 3;
      const time = 2 + (k % 4);
      const real = speed * time;
      const shown = k % 2 === 1 ? real + 10 : real;
      return tf(
        `Một người đi với vận tốc ${speed} km/giờ trong ${time} giờ thì đi được ${shown} km.`,
        shown === real,
        shown === real ? `${speed} × ${time} = ${real} (km), nên đúng.` : `${speed} × ${time} = ${real} (km), không phải ${shown} km, nên sai.`,
      );
    }
    const items = [
      ['Một ô tô đi 120 km trong 2 giờ thì vận tốc là 60 km/giờ.', true, '120 : 2 = 60 (km/giờ).'],
      ['Một người đi 15 km trong 3 giờ thì vận tốc là 6 km/giờ.', false, '15 : 3 = 5 (km/giờ), không phải 6 km/giờ.'],
      ['Vận tốc 50 km/giờ nghĩa là mỗi giờ đi được 50 km.', true, 'Đây là ý nghĩa của vận tốc 50 km/giờ.'],
      ['Hai xe đi ngược chiều với vận tốc 40 km/giờ và 30 km/giờ thì mỗi giờ gần nhau thêm 70 km.', true, '40 + 30 = 70 (km).'],
      ['Hai xe đi cùng chiều với vận tốc 45 km/giờ và 35 km/giờ thì mỗi giờ gần nhau thêm 80 km.', false, '45 - 35 = 10 (km), không phải 80 km.'],
      ['Muốn tính quãng đường ta lấy vận tốc nhân với thời gian.', true, 'Quãng đường = vận tốc × thời gian.'],
      ['Muốn tính thời gian ta lấy quãng đường nhân với vận tốc.', false, 'Thời gian = quãng đường : vận tốc.'],
      ['Đơn vị của vận tốc có thể là km/giờ.', true, 'km/giờ là một đơn vị đo vận tốc.'],
    ];
    const [statement, value, explanation] = items[k - 9];
    return tf(statement, value, explanation);
  },
  multi(k) {
    if (k < 6) {
      const distance = 120 + k * 30;
      return multiFact(
        `Chọn tất cả các phép tính cho quãng đường ${distance} km.`,
        [`${distance / 3} km/giờ × 3 giờ`, `${distance / 2} km/giờ × 2 giờ`],
        [`${distance / 3 + 10} km/giờ × 3 giờ`, `${distance / 2 + 10} km/giờ × 2 giờ`],
        `${distance / 3} × 3 = ${distance} (km) và ${distance / 2} × 2 = ${distance} (km).`,
      );
    }
    if (k < 12) {
      const speed = 30 + (k - 6) * 5;
      return multiFact(
        `Chọn tất cả các trường hợp có vận tốc ${speed} km/giờ.`,
        [`${speed * 2} km trong 2 giờ`, `${speed * 3} km trong 3 giờ`],
        [`${speed * 2 + 10} km trong 2 giờ`, `${speed * 3 + 15} km trong 3 giờ`],
        `${speed * 2} : 2 = ${speed} và ${speed * 3} : 3 = ${speed} (km/giờ).`,
      );
    }
    const items = [
      ['Chọn tất cả các cách tính đúng.', ['quãng đường = vận tốc × thời gian', 'vận tốc = quãng đường : thời gian'], ['thời gian = quãng đường × vận tốc', 'quãng đường = vận tốc : thời gian'], 'Quãng đường = vận tốc × thời gian; vận tốc = quãng đường : thời gian.'],
      ['Chọn tất cả các đơn vị có thể dùng để đo vận tốc.', ['km/giờ', 'm/giây'], ['km', 'giờ'], 'Vận tốc được đo bằng đơn vị độ dài chia cho đơn vị thời gian.'],
      ['Chọn tất cả các kết quả đúng khi đi 60 km trong 2 giờ.', ['vận tốc 30 km/giờ', 'mỗi giờ đi được 30 km'], ['vận tốc 120 km/giờ', 'mỗi giờ đi được 60 km'], '60 : 2 = 30, nên vận tốc là 30 km/giờ, tức mỗi giờ đi được 30 km.'],
      ['Chọn tất cả các trường hợp hai xe gặp nhau sau 2 giờ.', ['cách nhau 100 km, tổng vận tốc 50 km/giờ', 'cách nhau 120 km, tổng vận tốc 60 km/giờ'], ['cách nhau 100 km, tổng vận tốc 40 km/giờ', 'cách nhau 120 km, tổng vận tốc 80 km/giờ'], '100 : 50 = 2 (giờ) và 120 : 60 = 2 (giờ).'],
      ['Chọn tất cả các trường hợp xe sau đuổi kịp xe trước sau 3 giờ.', ['cách nhau 30 km, hiệu vận tốc 10 km/giờ', 'cách nhau 45 km, hiệu vận tốc 15 km/giờ'], ['cách nhau 30 km, hiệu vận tốc 15 km/giờ', 'cách nhau 45 km, hiệu vận tốc 10 km/giờ'], '30 : 10 = 3 (giờ) và 45 : 15 = 3 (giờ).'],
    ];
    const [prompt, correct, wrong, explanation] = items[k - 12];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

export const MATH_GRADE_5B = {
  'toan-5-ti-so-phan-tram': tiSoPhanTram,
  'toan-5-hinh-hoc': hinhHoc,
  'toan-5-do-luong-thoi-gian': doLuongThoiGian,
  'toan-5-chuyen-dong': chuyenDong,
};
