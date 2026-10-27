import { fact, fill, multiFact, numericDistractors, tf } from './math-utils.js';

const congTru100 = {
  single(k) {
    const items = [
      ['Tính: 34 + 25 = ?', 59, '34 + 25 = 59.'],
      ['Tính: 68 - 24 = ?', 44, '68 - 24 = 44.'],
      ['Tính: 47 + 38 = ?', 85, '47 + 38 = 85.'],
      ['Tính: 90 - 56 = ?', 34, '90 - 56 = 34.'],
      ['Có 35 viên bi, thêm 27 viên bi. Có tất cả bao nhiêu viên bi?', 62, '35 + 27 = 62 viên bi.'],
      ['Có 72 quả cam, bán đi 38 quả. Còn lại bao nhiêu quả cam?', 34, '72 - 38 = 34 quả cam.'],
      ['Tính: 56 + 7 = ?', 63, '56 + 7 = 63.'],
      ['Tính: 80 - 9 = ?', 71, '80 - 9 = 71.'],
      ['Tính: 23 + 45 + 12 = ?', 80, '23 + 45 = 68; 68 + 12 = 80.'],
      ['Tính: 100 - 37 = ?', 63, '100 - 37 = 63.'],
      ['Số nào cộng với 28 bằng 65?', 37, '65 - 28 = 37.'],
      ['Số nào trừ 19 bằng 46?', 65, '46 + 19 = 65.'],
    ];
    const [prompt, answer, explanation] = items[k];
    return fact(prompt, answer, explanation, numericDistractors(answer, { min: 0, max: 110 }));
  },
  fill(k) {
    const items = [
      ['45 + 27 = ___.', 72, '45 + 27 = 72.'],
      ['83 - 48 = ___.', 35, '83 - 48 = 35.'],
      ['36 + ___ = 64.', 28, '64 - 36 = 28.'],
      ['___ - 25 = 47.', 72, '47 + 25 = 72.'],
      ['60 - ___ = 18.', 42, '60 - 18 = 42.'],
    ];
    const [prompt, answer, explanation] = items[k];
    return fill(prompt, [answer], explanation);
  },
  tf(k) {
    const items = [
      ['48 + 35 = 83.', true, '48 + 35 = 83.'],
      ['72 - 26 = 48.', false, '72 - 26 = 46, không phải 48.'],
      ['54 + 29 = 83.', true, '54 + 29 = 83.'],
      ['90 - 45 = 45.', true, '90 - 45 = 45.'],
    ];
    const [statement, value, explanation] = items[k];
    return tf(statement, value, explanation);
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính có kết quả bằng 50.', ['25 + 25', '80 - 30'], ['40 + 15', '70 - 25'], 'Các phép tính có kết quả bằng 50 là 25 + 25 và 80 - 30.'],
      ['Chọn tất cả các phép tính có kết quả lớn hơn 60.', ['35 + 29', '80 - 15'], ['40 + 18', '90 - 35'], 'Các phép tính có kết quả lớn hơn 60 là 35 + 29 và 80 - 15.'],
      ['Chọn tất cả các phép tính có kết quả bé hơn 30.', ['15 + 12', '50 - 25'], ['20 + 15', '60 - 25'], 'Các phép tính có kết quả bé hơn 30 là 15 + 12 và 50 - 25.'],
      ['Chọn tất cả các phép tính đúng.', ['47 + 28 = 75', '63 - 19 = 44'], ['52 + 19 = 70', '84 - 37 = 48'], '47 + 28 = 75 và 63 - 19 = 44 là hai phép tính đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const bangNhan25 = {
  single(k) {
    const items = [
      ['Tính: 2 × 3 = ?', 6], ['Tính: 3 × 4 = ?', 12], ['Tính: 4 × 5 = ?', 20],
      ['Tính: 5 × 6 = ?', 30], ['Tính: 2 × 9 = ?', 18], ['Tính: 3 × 7 = ?', 21],
      ['Tính: 4 × 8 = ?', 32], ['Tính: 5 × 9 = ?', 45],
      ['Mỗi hộp có 4 cái bút. 5 hộp có bao nhiêu cái bút?', 20],
      ['Mỗi hàng có 3 bạn. 6 hàng có bao nhiêu bạn?', 18],
      ['Số nào nhân với 4 bằng 28?', 7],
      ['5 × ___ = 40. Số cần điền là số nào?', 8],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 60 }));
  },
  fill(k) {
    const items = [
      ['3 × 4 = ___.', 12], ['5 × ___ = 35.', 7], ['___ × 2 = 18.', 9], ['4 × 6 = ___.', 24], ['2 × 9 = ___.', 18],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['3 × 4 = 12.', true], ['5 × 6 = 35.', false], ['2 × 9 = 18.', true], ['4 × 7 = 28.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '5 × 6 = 30, không phải 35.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính có kết quả bằng 12.', ['3 × 4', '2 × 6'], ['4 × 4', '5 × 3'], '3 × 4 và 2 × 6 đều bằng 12.'],
      ['Chọn tất cả các phép tính có kết quả lớn hơn 15.', ['4 × 5', '5 × 5'], ['2 × 7', '3 × 6'], '4 × 5 = 20 và 5 × 5 = 25 đều lớn hơn 15.'],
      ['Chọn tất cả các phép tính có kết quả chẵn và bé hơn 10.', ['2 × 4', '3 × 2'], ['3 × 3', '5 × 2'], '2 × 4 = 8 và 3 × 2 = 6 là các kết quả chẵn nhỏ hơn 10.'],
      ['Chọn tất cả các phép nhân đúng.', ['3 × 7 = 21', '4 × 6 = 24'], ['5 × 5 = 30', '2 × 8 = 18'], '3 × 7 = 21 và 4 × 6 = 24 là hai phép tính đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const bangChia25 = {
  single(k) {
    const items = [
      ['Tính: 12 : 2 = ?', 6], ['Tính: 15 : 3 = ?', 5], ['Tính: 20 : 4 = ?', 5],
      ['Tính: 45 : 5 = ?', 9], ['Tính: 18 : 2 = ?', 9], ['Tính: 21 : 3 = ?', 7],
      ['Tính: 32 : 4 = ?', 8], ['Tính: 40 : 5 = ?', 8],
      ['Có 20 cái kẹo chia đều cho 4 bạn. Mỗi bạn được bao nhiêu cái kẹo?', 5],
      ['Có 18 quả táo xếp đều vào 3 đĩa. Mỗi đĩa có bao nhiêu quả táo?', 6],
      ['Số nào nhân với 4 bằng 24?', 6],
      ['35 : ___ = 7. Số cần điền là số nào?', 5],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 12 }));
  },
  fill(k) {
    const items = [
      ['12 : 3 = ___.', 4], ['___ : 5 = 6.', 30], ['24 : ___ = 4.', 6], ['16 : 2 = ___.', 8], ['45 : 5 = ___.', 9],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['12 : 2 = 6.', true], ['30 : 5 = 5.', false], ['18 : 3 = 6.', true], ['24 : 4 = 6.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '30 : 5 = 6, không phải 5.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép chia có kết quả bằng 6.', ['12 : 2', '18 : 3'], ['15 : 5', '20 : 4'], '12 : 2 và 18 : 3 đều bằng 6.'],
      ['Chọn tất cả các phép chia có kết quả bằng 5.', ['20 : 4', '30 : 5'], ['18 : 2', '24 : 3'], '20 : 4 và 30 : 5 đều bằng 5.'],
      ['Chọn tất cả các phép chia có kết quả bằng 4.', ['16 : 4', '10 : 2'], ['24 : 3', '20 : 5'], '16 : 4 và 10 : 2 đều bằng 4.'],
      ['Chọn tất cả các phép chia đúng.', ['24 : 3 = 8', '35 : 5 = 7'], ['28 : 4 = 8', '18 : 2 = 8'], '24 : 3 = 8 và 35 : 5 = 7 là hai phép tính đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const doDai = {
  single(k) {
    const items = [
      ['1 m bằng bao nhiêu xăng-ti-mét?', '100 cm', ['10 cm', '1000 cm', '50 cm']],
      ['3 dm bằng bao nhiêu xăng-ti-mét?', '30 cm', ['3 cm', '300 cm', '13 cm']],
      ['50 cm bằng bao nhiêu đề-xi-mét?', '5 dm', ['50 dm', '500 dm', '15 dm']],
      ['2 m 5 cm bằng bao nhiêu xăng-ti-mét?', '205 cm', ['25 cm', '250 cm', '2005 cm']],
      ['Đoạn thẳng AB dài 35 cm, đoạn thẳng CD dài 45 cm. Cả hai đoạn dài bao nhiêu?', '80 cm', ['70 cm', '80 dm', '10 cm']],
      ['Sợi dây dài 1 m, cắt đi 40 cm. Còn lại bao nhiêu xăng-ti-mét?', '60 cm', ['60 dm', '40 cm', '140 cm']],
      ['1 km bằng bao nhiêu mét?', '1000 m', ['100 m', '10 m', '10000 m']],
      ['8 dm + 12 cm = ?', '92 cm', ['20 cm', '92 dm', '20 dm']],
      ['Đoạn thẳng dài 1 m 20 cm là bao nhiêu xăng-ti-mét?', '120 cm', ['20 cm', '102 cm', '1200 cm']],
      ['Trong các đơn vị sau, đơn vị nào lớn nhất?', 'km', ['m', 'dm', 'cm']],
      ['5 m 6 dm bằng bao nhiêu đề-xi-mét?', '56 dm', ['56 m', '11 dm', '506 dm']],
      ['90 cm bằng bao nhiêu đề-xi-mét?', '9 dm', ['90 dm', '900 dm', '19 dm']],
    ];
    const [prompt, answer, distractors] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, distractors);
  },
  fill(k) {
    const items = [
      ['1 m = ___ cm.', 100], ['40 dm = ___ m.', 4], ['3 dm = ___ cm.', 30], ['2 m = ___ cm.', 200], ['75 cm = ___ dm 5 cm.', 7],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['1 m = 100 cm.', true], ['1 dm = 100 cm.', false], ['1 km = 1000 m.', true], ['50 cm = 5 dm.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '1 dm = 10 cm, không phải 100 cm.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các cặp độ dài bằng 1 m.', ['1 m', '100 cm'], ['1 km', '10 m'], '1 m và 100 cm là hai cách viết cùng một độ dài.'],
      ['Chọn tất cả các cặp độ dài bằng 2 dm.', ['2 dm', '20 cm'], ['2 m', '20 cm'], '2 dm và 20 cm bằng nhau.'],
      ['Chọn tất cả các cặp độ dài bằng 3 m.', ['3 m', '300 cm'], ['3 km', '300 m'], '3 m và 300 cm bằng nhau.'],
      ['Chọn tất cả các cặp độ dài bằng 5 dm.', ['50 cm', '5 dm'], ['50 dm', '5 m'], '50 cm và 5 dm bằng nhau.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const hinhHoc2 = {
  single(k) {
    const items = [
      ['Hình tam giác có mấy cạnh?', 3], ['Hình vuông có mấy cạnh?', 4], ['Hình chữ nhật có mấy góc?', 4],
      ['Hình tứ giác có mấy cạnh?', 4], ['Hình vuông có mấy góc?', 4], ['Hình tam giác có mấy góc?', 3],
      ['Hình vuông có cạnh 3 cm. Chu vi hình vuông là bao nhiêu?', 12],
      ['Hình chữ nhật dài 5 cm, rộng 3 cm. Chu vi là bao nhiêu?', 16],
      ['Hình tam giác có ba cạnh 3 cm, 4 cm, 5 cm. Chu vi là bao nhiêu?', 12],
      ['Hình vuông có cạnh 5 cm. Chu vi là bao nhiêu?', 20],
      ['Hình chữ nhật dài 6 cm, rộng 4 cm. Chu vi là bao nhiêu?', 20],
      ['Hình nào có 3 cạnh?', 'hình tam giác', ['hình vuông', 'hình chữ nhật', 'hình tròn']],
    ];
    const [prompt, answer, distractors] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, distractors ?? numericDistractors(answer, { min: 0, max: 30 }));
  },
  fill(k) {
    const items = [
      ['Hình vuông có cạnh 4 cm. Chu vi là ___ cm.', 16],
      ['Hình chữ nhật dài 6 cm, rộng 4 cm. Chu vi là ___ cm.', 20],
      ['Hình tam giác có ba cạnh 3 cm, 4 cm, 5 cm. Chu vi là ___ cm.', 12],
      ['Hình vuông có ___ cạnh.', 4],
      ['Hình tam giác có ___ góc.', 3],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['Hình vuông có 4 cạnh bằng nhau.', true], ['Hình tam giác có 4 cạnh.', false],
      ['Hình chữ nhật có 4 góc vuông.', true], ['Hình vuông cạnh 2 cm có chu vi 8 cm.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : 'Hình tam giác có 3 cạnh, không phải 4 cạnh.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các hình có 4 cạnh.', ['hình vuông', 'hình chữ nhật'], ['hình tam giác', 'hình tròn'], 'Hình vuông và hình chữ nhật đều có 4 cạnh.'],
      ['Chọn tất cả các hình có 4 cạnh bằng nhau.', ['hình vuông', 'hình thoi'], ['hình tam giác', 'hình tròn'], 'Hình vuông và hình thoi đều có 4 cạnh bằng nhau.'],
      ['Chọn tất cả các hình có chu vi 12 cm.', ['hình vuông cạnh 3 cm', 'hình tam giác đều cạnh 4 cm'], ['hình chữ nhật 2 cm × 3 cm', 'hình tròn'], 'Hình vuông cạnh 3 cm có chu vi 12 cm; tam giác đều cạnh 4 cm có chu vi 12 cm.'],
      ['Chọn tất cả các hình có các cạnh.', ['hình tam giác', 'hình tứ giác'], ['hình tròn', 'đoạn thẳng'], 'Hình tam giác và hình tứ giác là các hình có cạnh.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const toanCoLoiVan = {
  single(k) {
    const items = [
      ['Lớp 2A có 28 bạn, lớp 2B có 27 bạn. Cả hai lớp có bao nhiêu bạn?', 55],
      ['Mẹ mua 45 quả trứng, dùng 18 quả. Còn lại bao nhiêu quả?', 27],
      ['Một cửa hàng có 63 cái áo, bán 29 cái. Còn lại bao nhiêu cái áo?', 34],
      ['Hà có 36 nhãn vở, Mai có ít hơn Hà 8 nhãn vở. Mai có bao nhiêu nhãn vở?', 28],
      ['Nam có 24 viên bi, Bình có nhiều hơn Nam 9 viên. Bình có bao nhiêu viên bi?', 33],
      ['Mỗi hộp có 5 chiếc bánh. 6 hộp có bao nhiêu chiếc bánh?', 30],
      ['Có 20 học sinh xếp đều thành 4 hàng. Mỗi hàng có bao nhiêu học sinh?', 5],
      ['Một sợi dây dài 80 cm, cắt đi 35 cm. Còn lại bao nhiêu xăng-ti-mét?', 45],
      ['Có 3 giỏ, mỗi giỏ đựng 9 quả táo. Có tất cả bao nhiêu quả táo?', 27],
      ['Có 32 quyển vở chia đều cho 4 bạn. Mỗi bạn được bao nhiêu quyển?', 8],
      ['Buổi sáng bán 26 kg gạo, buổi chiều bán 37 kg. Cả ngày bán bao nhiêu ki-lô-gam gạo?', 63],
      ['Một lớp có 35 học sinh, trong đó 16 bạn nữ. Có bao nhiêu bạn nam?', 19],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 120 }));
  },
  fill(k) {
    const items = [
      ['Có 24 quả bóng, thêm 18 quả. Có tất cả ___ quả bóng.', 42],
      ['Có 50 cái kẹo, chia đều cho 5 bạn. Mỗi bạn được ___ cái kẹo.', 10],
      ['Mỗi hộp có 4 bút chì. 7 hộp có ___ bút chì.', 28],
      ['Có 60 quả cam, bán 25 quả. Còn ___ quả cam.', 35],
      ['Lớp có 31 học sinh, thêm 8 học sinh. Có ___ học sinh.', 39],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['Có 20 cái kẹo chia đều cho 4 bạn thì mỗi bạn được 5 cái.', true],
      ['Mỗi hộp 3 bút, 5 hộp có 15 bút.', true],
      ['Có 45 quả, bán 20 quả thì còn 35 quả.', false],
      ['32 học sinh xếp 4 hàng thì mỗi hàng có 8 học sinh.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '45 - 20 = 25, không phải 35.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính cộng, trừ đúng.', ['28 + 27 = 55', '45 - 18 = 27'], ['36 + 29 = 64', '63 - 29 = 35'], '28 + 27 = 55 và 45 - 18 = 27 là đúng.'],
      ['Chọn tất cả các phép tính nhân, chia đúng.', ['5 × 6 = 30', '20 : 4 = 5'], ['4 × 7 = 30', '18 : 3 = 5'], '5 × 6 = 30 và 20 : 4 = 5 là đúng.'],
      ['Chọn tất cả các phép tính có kết quả đúng.', ['36 - 8 = 28', '24 + 9 = 33'], ['30 - 12 = 17', '15 + 8 = 24'], '36 - 8 = 28 và 24 + 9 = 33 là đúng.'],
      ['Chọn tất cả các phép tính đúng trong các đáp án sau.', ['80 - 35 = 45', '3 × 9 = 27'], ['50 - 15 = 30', '4 × 8 = 36'], '80 - 35 = 45 và 3 × 9 = 27 là đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

export const MATH_GRADE_2 = {
  'toan-2-cong-tru-100': congTru100,
  'toan-2-bang-nhan-2-5': bangNhan25,
  'toan-2-bang-chia-2-5': bangChia25,
  'toan-2-do-dai': doDai,
  'toan-2-hinh-hoc': hinhHoc2,
  'toan-2-toan-co-loi-van': toanCoLoiVan,
};
