import { fact, fill, multiFact, numericDistractors, tf } from './math-utils.js';

const congTru1000 = {
  single(k) {
    const items = [
      ['Tính: 234 + 125 = ?', 359], ['Tính: 568 - 243 = ?', 325], ['Tính: 407 + 386 = ?', 793],
      ['Tính: 900 - 457 = ?', 443], ['Tính: 276 + 319 = ?', 595], ['Tính: 654 - 287 = ?', 367],
      ['Có 245 quả bóng, thêm 178 quả. Có tất cả bao nhiêu quả?', 423],
      ['Có 830 kg gạo, bán 465 kg. Còn lại bao nhiêu ki-lô-gam?', 365],
      ['Tính: 123 + 456 + 78 = ?', 657], ['Tính: 1000 - 276 = ?', 724],
      ['Số nào cộng với 268 bằng 745?', 477], ['Số nào trừ 189 bằng 356?', 545],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 1200 }));
  },
  fill(k) {
    const items = [
      ['325 + 147 = ___.', 472], ['806 - 259 = ___.', 547], ['458 + ___ = 700.', 242], ['___ - 176 = 328.', 504], ['1000 - 385 = ___.', 615],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['456 + 237 = 693.', true], ['800 - 354 = 436.', false], ['629 + 148 = 777.', true], ['1000 - 450 = 550.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '800 - 354 = 446, không phải 436.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính có kết quả bằng 500.', ['250 + 250', '800 - 300'], ['320 + 170', '900 - 450'], '250 + 250 và 800 - 300 đều bằng 500.'],
      ['Chọn tất cả các phép tính có kết quả lớn hơn 600.', ['350 + 280', '900 - 250'], ['250 + 310', '1000 - 430'], '350 + 280 = 630 và 900 - 250 = 650 đều lớn hơn 600.'],
      ['Chọn tất cả các phép tính có kết quả bé hơn 300.', ['120 + 150', '600 - 320'], ['180 + 140', '700 - 350'], '120 + 150 = 270 và 600 - 320 = 280 đều bé hơn 300.'],
      ['Chọn tất cả các phép tính đúng.', ['467 + 235 = 702', '900 - 378 = 522'], ['584 + 129 = 703', '800 - 246 = 564'], '467 + 235 = 702 và 900 - 378 = 522 là đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const bangNhanChia69 = {
  single(k) {
    const items = [
      ['Tính: 6 × 7 = ?', 42], ['Tính: 7 × 8 = ?', 56], ['Tính: 8 × 9 = ?', 72], ['Tính: 9 × 9 = ?', 81],
      ['Tính: 42 : 6 = ?', 7], ['Tính: 56 : 8 = ?', 7], ['Tính: 63 : 9 = ?', 7], ['Tính: 72 : 8 = ?', 9],
      ['Mỗi hộp có 6 cái bánh. 8 hộp có bao nhiêu cái bánh?', 48],
      ['Có 54 quả cam chia đều vào 9 rổ. Mỗi rổ có bao nhiêu quả?', 6],
      ['Số nào nhân với 7 bằng 49?', 7], ['63 : ___ = 7. Số cần điền là số nào?', 9],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 100 }));
  },
  fill(k) {
    const items = [
      ['6 × 9 = ___.', 54], ['7 × ___ = 56.', 8], ['___ × 8 = 64.', 8], ['81 : 9 = ___.', 9], ['48 : ___ = 6.', 8],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['7 × 8 = 56.', true], ['9 × 6 = 55.', false], ['72 : 8 = 9.', true], ['63 : 7 = 8.', false],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : 'Phép tính đã cho là sai; hãy tính lại theo bảng nhân, chia 6–9.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính có kết quả bằng 48.', ['6 × 8', '8 × 6'], ['7 × 7', '9 × 5'], '6 × 8 và 8 × 6 đều bằng 48.'],
      ['Chọn tất cả các phép chia có kết quả bằng 8.', ['48 : 6', '64 : 8'], ['54 : 6', '72 : 9'], '48 : 6 = 8 và 64 : 8 = 8.'],
      ['Chọn tất cả các phép tính có kết quả lớn hơn 60.', ['7 × 9', '8 × 8'], ['6 × 9', '7 × 8'], '7 × 9 = 63 và 8 × 8 = 64 đều lớn hơn 60.'],
      ['Chọn tất cả các phép tính đúng.', ['9 × 7 = 63', '54 : 6 = 9'], ['8 × 9 = 71', '63 : 9 = 8'], '9 × 7 = 63 và 54 : 6 = 9 là đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const nhanChiaBaChuSo = {
  single(k) {
    const items = [
      ['Tính: 123 × 3 = ?', 369], ['Tính: 214 × 4 = ?', 856], ['Tính: 305 × 6 = ?', 1830],
      ['Tính: 480 : 4 = ?', 120], ['Tính: 726 : 6 = ?', 121], ['Tính: 819 : 9 = ?', 91],
      ['Tính: 432 × 2 = ?', 864], ['Tính: 605 : 5 = ?', 121],
      ['Mỗi thùng có 125 lít nước. 4 thùng có bao nhiêu lít nước?', 500],
      ['Có 648 quyển vở chia đều cho 8 lớp. Mỗi lớp được bao nhiêu quyển?', 81],
      ['Tính: 250 × 4 = ?', 1000], ['Tính: 936 : 3 = ?', 312],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 2000 }));
  },
  fill(k) {
    const items = [
      ['203 × 3 = ___.', 609], ['512 × 5 = ___.', 2560], ['840 : 6 = ___.', 140], ['945 : 9 = ___.', 105], ['125 × 8 = ___.', 1000],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['124 × 4 = 496.', true], ['315 × 3 = 945.', true], ['720 : 6 = 130.', false], ['804 : 4 = 201.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '720 : 6 = 120, không phải 130.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính có kết quả bằng 600.', ['200 × 3', '900 - 300'], ['150 × 3', '700 - 150'], '200 × 3 = 600 và 900 - 300 = 600.'],
      ['Chọn tất cả các phép chia có kết quả bằng 120.', ['480 : 4', '600 : 5'], ['540 : 5', '720 : 8'], '480 : 4 = 120 và 600 : 5 = 120.'],
      ['Chọn tất cả các phép nhân có kết quả lớn hơn 1000.', ['250 × 5', '400 × 3'], ['200 × 4', '300 × 3'], '250 × 5 = 1250 và 400 × 3 = 1200 đều lớn hơn 1000.'],
      ['Chọn tất cả các phép tính đúng.', ['123 × 3 = 369', '840 : 7 = 120'], ['214 × 4 = 846', '636 : 6 = 108'], '123 × 3 = 369 và 840 : 7 = 120 là đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const gapVaGiam = {
  single(k) {
    const items = [
      ['Gấp 7 lên 5 lần được bao nhiêu?', 35], ['Gấp 8 lên 4 lần được bao nhiêu?', 32],
      ['Giảm 45 đi 5 lần được bao nhiêu?', 9], ['Giảm 72 đi 8 lần được bao nhiêu?', 9],
      ['Gấp 9 lên 6 lần được bao nhiêu?', 54], ['Giảm 56 đi 7 lần được bao nhiêu?', 8],
      ['Số 6 gấp lên 7 lần rồi giảm đi 3 lần được bao nhiêu?', 14],
      ['Số 8 gấp lên 5 lần được bao nhiêu?', 40], ['Số 63 giảm đi 9 lần được bao nhiêu?', 7],
      ['Gấp 12 lên 3 lần được bao nhiêu?', 36], ['Giảm 80 đi 4 lần được bao nhiêu?', 20],
      ['Số nào gấp lên 6 lần bằng 42?', 7],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 100 }));
  },
  fill(k) {
    const items = [
      ['Gấp 6 lên 7 lần được ___.', 42], ['Giảm 48 đi 6 lần được ___.', 8], ['Gấp 9 lên 4 lần được ___.', 36], ['Giảm 90 đi 9 lần được ___.', 10], ['Số 5 gấp lên 8 lần được ___.', 40],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['Gấp 6 lên 5 lần được 30.', true], ['Giảm 36 đi 6 lần được 7.', false], ['Gấp 8 lên 3 lần được 24.', true], ['Giảm 45 đi 5 lần được 9.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '36 giảm đi 6 lần bằng 36 : 6 = 6, không phải 7.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính có kết quả bằng 24.', ['6 × 4', '48 : 2'], ['5 × 5', '36 : 3'], '6 × 4 = 24 và 48 : 2 = 24.'],
      ['Chọn tất cả các phép tính có kết quả bằng 8.', ['4 × 2', '32 : 4'], ['3 × 3', '45 : 5'], '4 × 2 = 8 và 32 : 4 = 8.'],
      ['Chọn tất cả các phép tính có kết quả lớn hơn 30.', ['7 × 5', '80 : 2'], ['6 × 4', '45 : 3'], '7 × 5 = 35 và 80 : 2 = 40 đều lớn hơn 30.'],
      ['Chọn tất cả các phép tính đúng.', ['7 × 6 = 42', '54 : 6 = 9'], ['8 × 9 = 70', '63 : 7 = 8'], '7 × 6 = 42 và 54 : 6 = 9 là đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const hinhHocChuVi = {
  single(k) {
    const items = [
      ['Hình chữ nhật dài 8 cm, rộng 5 cm. Chu vi là bao nhiêu?', 26],
      ['Hình vuông cạnh 7 cm. Chu vi là bao nhiêu?', 28],
      ['Hình tam giác có ba cạnh 6 cm, 8 cm, 10 cm. Chu vi là bao nhiêu?', 24],
      ['Hình chữ nhật dài 12 cm, rộng 6 cm. Chu vi là bao nhiêu?', 36],
      ['Hình vuông có chu vi 20 cm. Cạnh của hình vuông dài bao nhiêu?', 5],
      ['Hình chữ nhật có chu vi 30 cm, chiều dài 10 cm. Chiều rộng là bao nhiêu?', 5],
      ['Hình vuông cạnh 9 cm. Chu vi là bao nhiêu?', 36],
      ['Hình tam giác đều cạnh 8 cm. Chu vi là bao nhiêu?', 24],
      ['Hình chữ nhật dài 15 cm, rộng 10 cm. Chu vi là bao nhiêu?', 50],
      ['Hình vuông có chu vi 36 cm. Cạnh của hình vuông dài bao nhiêu?', 9],
      ['Hình chữ nhật có chu vi 40 cm, chiều rộng 8 cm. Chiều dài là bao nhiêu?', 12],
      ['Hình tam giác có ba cạnh 5 cm, 7 cm, 9 cm. Chu vi là bao nhiêu?', 21],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer} cm.`, numericDistractors(answer, { min: 0, max: 80 }));
  },
  fill(k) {
    const items = [
      ['Hình chữ nhật dài 9 cm, rộng 4 cm có chu vi ___ cm.', 26],
      ['Hình vuông cạnh 6 cm có chu vi ___ cm.', 24],
      ['Hình tam giác có ba cạnh 3 cm, 4 cm, 5 cm có chu vi ___ cm.', 12],
      ['Hình vuông có chu vi 32 cm thì cạnh dài ___ cm.', 8],
      ['Hình chữ nhật dài 10 cm, rộng 5 cm có chu vi ___ cm.', 30],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['Hình vuông cạnh 5 cm có chu vi 20 cm.', true],
      ['Hình chữ nhật dài 6 cm, rộng 3 cm có chu vi 18 cm.', true],
      ['Hình tam giác có ba cạnh 2 cm, 3 cm, 4 cm có chu vi 10 cm.', false],
      ['Hình vuông có chu vi 24 cm thì cạnh dài 6 cm.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '2 + 3 + 4 = 9 cm, không phải 10 cm.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các hình có chu vi 20 cm.', ['hình vuông cạnh 5 cm', 'hình chữ nhật dài 6 cm, rộng 4 cm'], ['hình vuông cạnh 6 cm', 'hình chữ nhật dài 8 cm, rộng 3 cm'], 'Hình vuông cạnh 5 cm và hình chữ nhật 6 cm × 4 cm đều có chu vi 20 cm.'],
      ['Chọn tất cả các hình có chu vi 24 cm.', ['hình vuông cạnh 6 cm', 'hình tam giác đều cạnh 8 cm'], ['hình vuông cạnh 5 cm', 'hình chữ nhật dài 7 cm, rộng 4 cm'], 'Hình vuông cạnh 6 cm và tam giác đều cạnh 8 cm đều có chu vi 24 cm.'],
      ['Chọn tất cả các hình có chu vi 30 cm.', ['hình chữ nhật dài 10 cm, rộng 5 cm', 'hình tam giác đều cạnh 10 cm'], ['hình vuông cạnh 8 cm', 'hình chữ nhật dài 12 cm, rộng 4 cm'], 'Hình chữ nhật 10 cm × 5 cm và tam giác đều cạnh 10 cm đều có chu vi 30 cm.'],
      ['Chọn tất cả các hình có chu vi 36 cm.', ['hình vuông cạnh 9 cm', 'hình chữ nhật dài 12 cm, rộng 6 cm'], ['hình vuông cạnh 8 cm', 'hình chữ nhật dài 10 cm, rộng 7 cm'], 'Hình vuông cạnh 9 cm và hình chữ nhật 12 cm × 6 cm đều có chu vi 36 cm.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const doLuong3 = {
  single(k) {
    const items = [
      ['1 km bằng bao nhiêu mét?', '1000 m', ['100 m', '10 m', '10000 m']],
      ['1 kg bằng bao nhiêu gam?', '1000 g', ['100 g', '10 g', '10000 g']],
      ['1 lít bằng bao nhiêu mi-li-lít?', '1000 ml', ['100 ml', '10 ml', '10000 ml']],
      ['5 m 6 dm bằng bao nhiêu đề-xi-mét?', '56 dm', ['56 m', '11 dm', '506 dm']],
      ['3 kg 250 g bằng bao nhiêu gam?', '3250 g', ['325 g', '3025 g', '32500 g']],
      ['2 lít 500 ml bằng bao nhiêu mi-li-lít?', '2500 ml', ['250 ml', '2050 ml', '25000 ml']],
      ['7 m 8 cm bằng bao nhiêu xăng-ti-mét?', '708 cm', ['78 cm', '780 cm', '7008 cm']],
      ['2 tấn bằng bao nhiêu ki-lô-gam?', '2000 kg', ['200 kg', '20 kg', '20000 kg']],
      ['1 m 5 cm bằng bao nhiêu xăng-ti-mét?', '105 cm', ['15 cm', '150 cm', '1005 cm']],
      ['4 kg 50 g bằng bao nhiêu gam?', '4050 g', ['450 g', '4005 g', '4500 g']],
      ['8 lít bằng bao nhiêu mi-li-lít?', '8000 ml', ['800 ml', '80 ml', '80000 ml']],
      ['Đơn vị nào lớn nhất trong các đơn vị: mm, cm, dm, m?', 'm', ['dm', 'cm', 'mm']],
    ];
    const [prompt, answer, distractors] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, distractors);
  },
  fill(k) {
    const items = [
      ['1 km = ___ m.', 1000], ['3 kg = ___ g.', 3000], ['2 l = ___ ml.', 2000], ['5 m = ___ cm.', 500], ['1 tấn = ___ kg.', 1000],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['1 km = 1000 m.', true], ['1 kg = 100 g.', false], ['1 l = 1000 ml.', true], ['1 tấn = 1000 kg.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '1 kg = 1000 g, không phải 100 g.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các cặp đơn vị bằng nhau về độ dài và khối lượng.', ['1 km và 1000 m', '1 kg và 1000 g'], ['1 m và 10 cm', '1 l và 100 ml'], '1 km = 1000 m và 1 kg = 1000 g.'],
      ['Chọn tất cả các cặp đơn vị bằng nhau về thể tích và khối lượng.', ['1 l và 1000 ml', '1 tấn và 1000 kg'], ['1 dm và 100 cm', '1 kg và 100 g'], '1 l = 1000 ml và 1 tấn = 1000 kg.'],
      ['Chọn tất cả các cặp đơn vị bằng nhau có số 3 và số 2.', ['3 m và 300 cm', '2 kg và 2000 g'], ['4 km và 400 m', '5 l và 500 ml'], '3 m = 300 cm và 2 kg = 2000 g.'],
      ['Chọn tất cả các cặp đơn vị bằng nhau có số 5 và số 8.', ['5 dm và 50 cm', '8 l và 8000 ml'], ['6 m và 60 cm', '9 kg và 900 g'], '5 dm = 50 cm và 8 l = 8000 ml.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

export const MATH_GRADE_3 = {
  'toan-3-cong-tru-1000': congTru1000,
  'toan-3-bang-nhan-chia-6-9': bangNhanChia69,
  'toan-3-nhan-chia-ba-chu-so': nhanChiaBaChuSo,
  'toan-3-gap-va-giam': gapVaGiam,
  'toan-3-hinh-hoc-chu-vi': hinhHocChuVi,
  'toan-3-do-luong': doLuong3,
};
