import { fact, fill, multiFact, numericDistractors, simplifyFraction, tf } from './math-utils.js';

const soLon = {
  single(k) {
    const items = [
      ['Số 456 789 có chữ số hàng trăm nghìn là chữ số nào?', 4],
      ['Số 305 672 có chữ số hàng chục nghìn là chữ số nào?', 0],
      ['Số nào lớn hơn: 708 450 hay 708 405?', 708450],
      ['Số nào bé hơn: 99 999 hay 100 000?', 99999],
      ['Làm tròn số 47 638 đến hàng nghìn được số nào?', 48000],
      ['Làm tròn số 82 451 đến hàng trăm được số nào?', 82500],
      ['Số gồm 5 trăm nghìn, 3 chục nghìn, 2 trăm, 7 đơn vị là số nào?', 530207],
      ['Số 120 000 gồm bao nhiêu chục nghìn?', 12],
      ['Số 7 000 000 được đọc là gì?', 'bảy triệu', ['bảy trăm nghìn', 'bảy mươi nghìn', 'bảy tỉ']],
      ['Số liền sau của 999 999 là số nào?', 1000000],
      ['Số liền trước của 1 000 000 là số nào?', 999999],
      ['Trong số 8 642 135, chữ số 8 thuộc hàng nào?', 'hàng triệu', ['hàng trăm nghìn', 'hàng chục nghìn', 'hàng nghìn']],
    ];
    const [prompt, answer, distractors] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, distractors ?? numericDistractors(answer, { min: 0, max: 2000000 }));
  },
  fill(k) {
    const items = [
      ['Số liền sau của 999 999 là ___.', 1000000],
      ['Làm tròn 34 567 đến hàng nghìn được ___.', 35000],
      ['Số gồm 2 trăm nghìn, 4 chục nghìn, 5 trăm và 9 đơn vị là ___.', 240509],
      ['Số 580 000 gồm ___ chục nghìn.', 58],
      ['Số liền trước của 700 000 là ___.', 699999],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['Số 999 999 lớn hơn số 1 000 000.', false],
      ['Số 405 320 có chữ số hàng nghìn là 5.', true],
      ['Làm tròn 67 500 đến hàng nghìn được 68 000.', true],
      ['Số 100 000 gồm 10 chục nghìn.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '999 999 bé hơn 1 000 000.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các số có chữ số hàng chục nghìn là 4.', ['145 230', '342 718'], ['415 230', '234 567'], '145 230 và 342 718 có chữ số hàng chục nghìn là 4.'],
      ['Chọn tất cả các số lớn hơn 500 000.', ['600 120', '789 000'], ['499 999', '500 000'], '600 120 và 789 000 đều lớn hơn 500 000.'],
      ['Chọn tất cả các số làm tròn đến hàng nghìn bằng 46 000.', ['45 600', '46 200'], ['44 500', '47 600'], '45 600 và 46 200 đều làm tròn đến hàng nghìn bằng 46 000.'],
      ['Chọn tất cả các số có 6 chữ số.', ['123 456', '999 999'], ['12 345', '1 000 000'], '123 456 và 999 999 đều có 6 chữ số.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const congTru4 = {
  single(k) {
    const items = [
      ['Tính: 23 456 + 12 345 = ?', 35801], ['Tính: 78 905 - 34 672 = ?', 44233],
      ['Tính: 45 678 + 32 109 = ?', 77787], ['Tính: 100 000 - 45 678 = ?', 54322],
      ['Tính: 123 456 + 87 654 = ?', 211110], ['Tính: 500 000 - 123 456 = ?', 376544],
      ['Một kho có 45 670 kg gạo, nhập thêm 23 450 kg. Có tất cả bao nhiêu ki-lô-gam?', 69120],
      ['Một quỹ có 120 000 đồng, chi 45 500 đồng. Còn lại bao nhiêu đồng?', 74500],
      ['Tính: 34 567 + 23 456 + 12 345 = ?', 70368],
      ['Tính: 90 000 - 12 345 - 23 456 = ?', 54199],
      ['Số nào cộng với 34 567 bằng 80 000?', 45433],
      ['Số nào trừ 23 456 bằng 45 678?', 69134],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 600000 }));
  },
  fill(k) {
    const items = [
      ['34 567 + 12 345 = ___.', 46912], ['90 000 - 45 678 = ___.', 44322], ['56 789 + ___ = 80 000.', 23211], ['___ - 23 456 = 34 567.', 58023], ['123 456 + 234 567 = ___.', 358023],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['23 456 + 12 345 = 35 801.', true], ['90 000 - 45 678 = 44 322.', true], ['56 789 + 23 456 = 80 345.', false], ['123 456 + 234 567 = 358 023.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '56 789 + 23 456 = 80 245, không phải 80 345.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính có kết quả bằng 100 000.', ['45 678 + 54 322', '150 000 - 50 000'], ['60 000 + 30 000', '120 000 - 30 000'], '45 678 + 54 322 = 100 000 và 150 000 - 50 000 = 100 000.'],
      ['Chọn tất cả các phép tính có kết quả lớn hơn 200 000.', ['123 456 + 100 000', '500 000 - 250 000'], ['90 000 + 100 000', '300 000 - 120 000'], '123 456 + 100 000 = 223 456 và 500 000 - 250 000 = 250 000.'],
      ['Chọn tất cả các phép tính có kết quả bé hơn 50 000.', ['20 000 + 25 000', '90 000 - 45 000'], ['30 000 + 25 000', '100 000 - 45 000'], '20 000 + 25 000 = 45 000 và 90 000 - 45 000 = 45 000.'],
      ['Chọn tất cả các phép tính đúng.', ['234 567 + 123 456 = 358 023', '500 000 - 234 567 = 265 433'], ['345 678 + 123 456 = 468 134', '600 000 - 234 567 = 365 433'], '234 567 + 123 456 = 358 023 và 500 000 - 234 567 = 265 433 là đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const nhanChia4 = {
  single(k) {
    const items = [
      ['Tính: 123 × 12 = ?', 1476], ['Tính: 214 × 23 = ?', 4922], ['Tính: 456 × 7 = ?', 3192],
      ['Tính: 1234 × 5 = ?', 6170], ['Tính: 864 : 12 = ?', 72], ['Tính: 945 : 15 = ?', 63],
      ['Tính: 1080 : 24 = ?', 45], ['Tính: 2418 : 6 = ?', 403],
      ['Mỗi ngày nhà máy sản xuất 125 sản phẩm. 24 ngày sản xuất bao nhiêu sản phẩm?', 3000],
      ['Có 1 250 kg gạo chia đều vào 25 bao. Mỗi bao có bao nhiêu ki-lô-gam?', 50],
      ['Tính: 345 × 20 = ?', 6900], ['Tính: 4 500 : 50 = ?', 90],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 10000, decimals: 0 }));
  },
  fill(k) {
    const items = [
      ['123 × 11 = ___.', 1353], ['234 × 12 = ___.', 2808], ['1 440 : 12 = ___.', 120], ['2 016 : 24 = ___.', 84], ['125 × 8 = ___.', 1000],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['123 × 12 = 1 476.', true], ['214 × 23 = 4 922.', true], ['864 : 12 = 71.', false], ['1080 : 24 = 45.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '864 : 12 = 72, không phải 71.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phép tính có kết quả bằng 120.', ['12 × 10', '240 : 2'], ['15 × 10', '360 : 2'], '12 × 10 = 120 và 240 : 2 = 120.'],
      ['Chọn tất cả các phép tính có kết quả bằng 50.', ['25 × 2', '200 : 4'], ['20 × 3', '300 : 5'], '25 × 2 = 50 và 200 : 4 = 50.'],
      ['Chọn tất cả các phép nhân có kết quả lớn hơn 1 000.', ['125 × 9', '200 × 6'], ['100 × 9', '150 × 6'], '125 × 9 = 1 125 và 200 × 6 = 1 200 đều lớn hơn 1 000.'],
      ['Chọn tất cả các phép tính đúng.', ['123 × 12 = 1 476', '864 : 12 = 72'], ['214 × 23 = 4 922', '945 : 15 = 64'], '123 × 12 = 1 476 và 864 : 12 = 72 là đúng.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const phanSo = {
  single(k) {
    const items = [
      ['Phân số 3/4 có tử số là số nào?', 3], ['Phân số 5/7 có mẫu số là số nào?', 7],
      ['Phân số nào lớn hơn: 3/4 hay 2/4?', '3/4', ['2/4', '1/4', 'bằng nhau']],
      ['Phân số 2/4 bằng phân số nào?', '1/2', ['1/4', '3/4', '2/3']],
      ['1/3 của 12 là bao nhiêu?', 4], ['2/5 của 20 là bao nhiêu?', 8],
      ['Tính: 2/7 + 3/7 = ?', '5/7', ['5/14', '6/7', '1/7']],
      ['Tính: 5/9 - 2/9 = ?', '3/9', ['3/18', '7/9', '3/0']],
      ['Rút gọn phân số 6/8 được phân số nào?', '3/4', ['2/4', '6/4', '3/8']],
      ['Phân số nào bé hơn 1?', '4/5', ['5/5', '6/5', '7/5']],
      ['Số nào là phân số?', '3/4', ['34', '3 + 4', '4 - 3']],
      ['Một cái bánh chia 8 phần bằng nhau, ăn 3 phần. Đã ăn bao nhiêu phần cái bánh?', '3/8', ['8/3', '3/5', '5/8']],
    ];
    const [prompt, answer, distractors] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, distractors ?? numericDistractors(answer, { min: 0, max: 30 }));
  },
  fill(k) {
    const items = [
      ['Rút gọn 4/8 được ___.', '1/2'], ['1/4 của 20 là ___.', 5], ['2/6 + 3/6 = ___.', '5/6'], ['5/8 - 2/8 = ___.', '3/8'], ['Phân số 7/9 có tử số là ___.', 7],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['Phân số 3/5 có tử số là 3.', true], ['Phân số 2/4 bằng phân số 1/2.', true], ['1/2 của 10 là 20.', false], ['Phân số 7/7 bằng 1.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '1/2 của 10 là 5, không phải 20.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các phân số bằng 1/2.', ['2/4', '4/8'], ['3/4', '2/3'], '2/4 và 4/8 đều bằng 1/2.'],
      ['Chọn tất cả các phân số lớn hơn 1.', ['5/4', '7/3'], ['3/5', '4/4'], '5/4 và 7/3 đều lớn hơn 1.'],
      ['Chọn tất cả các phân số bé hơn 1.', ['2/3', '5/9'], ['7/5', '9/8'], '2/3 và 5/9 đều bé hơn 1.'],
      ['Chọn tất cả các phân số có mẫu số là 7.', ['3/7', '5/7'], ['7/3', '7/5'], '3/7 và 5/7 có mẫu số là 7.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const hinhHoc4 = {
  single(k) {
    const items = [
      ['Góc có số đo 90° là góc gì?', 'góc vuông', ['góc nhọn', 'góc tù', 'góc bẹt']],
      ['Góc có số đo bé hơn 90° là góc gì?', 'góc nhọn', ['góc vuông', 'góc tù', 'góc bẹt']],
      ['Góc có số đo lớn hơn 90° và bé hơn 180° là góc gì?', 'góc tù', ['góc nhọn', 'góc vuông', 'góc bẹt']],
      ['Góc có số đo 180° là góc gì?', 'góc bẹt', ['góc nhọn', 'góc vuông', 'góc tù']],
      ['Hai đường thẳng cắt nhau tạo thành 4 góc vuông là hai đường thẳng gì?', 'vuông góc', ['song song', 'trùng nhau', 'cong']],
      ['Hai đường thẳng không bao giờ cắt nhau là hai đường thẳng gì?', 'song song', ['vuông góc', 'cắt nhau', 'trùng nhau']],
      ['Hình bình hành có đáy 8 cm, chiều cao 5 cm. Diện tích là bao nhiêu?', 40],
      ['Hình bình hành có đáy 12 cm, chiều cao 6 cm. Diện tích là bao nhiêu?', 72],
      ['Hình thoi có hai đường chéo 6 cm và 8 cm. Diện tích là bao nhiêu?', 24],
      ['Hình thoi có hai đường chéo 10 cm và 12 cm. Diện tích là bao nhiêu?', 60],
      ['Hình bình hành có diện tích 36 cm², đáy 9 cm. Chiều cao là bao nhiêu?', 4],
      ['Hình chữ nhật dài 9 cm, rộng 4 cm. Chu vi là bao nhiêu?', 26],
    ];
    const [prompt, answer, distractors] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, distractors ?? numericDistractors(answer, { min: 0, max: 100 }));
  },
  fill(k) {
    const items = [
      ['Hình bình hành đáy 10 cm, chiều cao 4 cm có diện tích ___ cm².', 40],
      ['Hình thoi có hai đường chéo 4 cm và 6 cm có diện tích ___ cm².', 12],
      ['Góc vuông có số đo ___ độ.', 90],
      ['Hai đường thẳng song song không bao giờ ___.', 'cắt nhau'],
      ['Hình chữ nhật dài 7 cm, rộng 3 cm có chu vi ___ cm.', 20],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['Góc vuông có số đo 90°.', true], ['Góc nhọn lớn hơn góc vuông.', false],
      ['Hình bình hành có hai cặp cạnh đối diện song song.', true], ['Hình thoi có bốn cạnh bằng nhau.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : 'Góc nhọn bé hơn góc vuông.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các góc có số đo bé hơn 90°.', ['30°', '60°'], ['90°', '120°'], '30° và 60° đều bé hơn 90°.'],
      ['Chọn tất cả các góc có số đo lớn hơn 90°.', ['120°', '150°'], ['45°', '90°'], '120° và 150° đều lớn hơn 90°.'],
      ['Chọn tất cả các hình có hai cặp cạnh đối diện song song.', ['hình bình hành', 'hình chữ nhật'], ['hình tam giác', 'hình thang'], 'Hình bình hành và hình chữ nhật có hai cặp cạnh đối diện song song.'],
      ['Chọn tất cả các hình có bốn cạnh bằng nhau.', ['hình vuông', 'hình thoi'], ['hình chữ nhật', 'hình bình hành'], 'Hình vuông và hình thoi có bốn cạnh bằng nhau.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

const trungBinhCong = {
  single(k) {
    const items = [
      ['Trung bình cộng của 4, 6 và 8 là bao nhiêu?', 6],
      ['Trung bình cộng của 10 và 20 là bao nhiêu?', 15],
      ['Trung bình cộng của 5, 7, 9 và 11 là bao nhiêu?', 8],
      ['Trung bình cộng của 12, 15 và 18 là bao nhiêu?', 15],
      ['Ba bạn có số viên bi là 8, 10 và 12. Trung bình mỗi bạn có bao nhiêu viên?', 10],
      ['Tổng của 4 số là 80. Trung bình cộng của 4 số là bao nhiêu?', 20],
      ['Trung bình cộng của 6 và 10 là 8. Tổng của hai số là bao nhiêu?', 16],
      ['Trung bình cộng của 3 số là 12. Tổng của 3 số là bao nhiêu?', 36],
      ['Trung bình cộng của 20, 30 và 40 là bao nhiêu?', 30],
      ['Trung bình cộng của 2, 4, 6, 8 là bao nhiêu?', 5],
      ['Bốn lớp có số học sinh 30, 32, 34, 36. Trung bình mỗi lớp có bao nhiêu học sinh?', 33],
      ['Trung bình cộng của 15, 25 và 35 là bao nhiêu?', 25],
    ];
    const [prompt, answer] = items[k];
    return fact(prompt, answer, `Đáp án là ${answer}.`, numericDistractors(answer, { min: 0, max: 100 }));
  },
  fill(k) {
    const items = [
      ['Trung bình cộng của 4 và 8 là ___.', 6], ['Trung bình cộng của 10, 20, 30 là ___.', 20], ['Tổng 3 số là 45, trung bình cộng là ___.', 15], ['Trung bình cộng của 9 và 15 là ___.', 12], ['Trung bình cộng của 2, 4, 6 là ___.', 4],
    ];
    const [prompt, answer] = items[k];
    return fill(prompt, [answer], `Đáp án là ${answer}.`);
  },
  tf(k) {
    const items = [
      ['Trung bình cộng của 6 và 10 là 8.', true], ['Trung bình cộng của 3, 5 và 7 là 6.', false],
      ['Tổng 4 số là 40 thì trung bình cộng là 10.', true], ['Trung bình cộng của 10 và 20 là 15.', true],
    ];
    const [statement, value] = items[k];
    return tf(statement, value, value ? `${statement} là đúng.` : '(3 + 5 + 7) : 3 = 5, không phải 6.');
  },
  multi(k) {
    const items = [
      ['Chọn tất cả các nhóm số có trung bình cộng bằng 10.', ['8 và 12', '6, 10, 14'], ['5 và 10', '9, 10, 12'], '8 và 12 có trung bình cộng 10; 6, 10, 14 cũng có trung bình cộng 10.'],
      ['Chọn tất cả các nhóm số có trung bình cộng bằng 8.', ['6 và 10', '4, 8, 12'], ['5 và 12', '7, 8, 10'], '6 và 10 có trung bình cộng 8; 4, 8, 12 cũng có trung bình cộng 8.'],
      ['Chọn tất cả các nhóm số có trung bình cộng bằng 15.', ['10 và 20', '12, 15, 18'], ['8 và 20', '14, 15, 17'], '10 và 20 có trung bình cộng 15; 12, 15, 18 cũng có trung bình cộng 15.'],
      ['Chọn tất cả các nhóm số có trung bình cộng bằng 20.', ['15 và 25', '10, 20, 30'], ['12 và 30', '18, 20, 25'], '15 và 25 có trung bình cộng 20; 10, 20, 30 cũng có trung bình cộng 20.'],
    ];
    const [prompt, correct, wrong, explanation] = items[k];
    return multiFact(prompt, correct, wrong, explanation);
  },
};

export const MATH_GRADE_4 = {
  'toan-4-so-lon': soLon,
  'toan-4-cong-tru': congTru4,
  'toan-4-nhan-chia': nhanChia4,
  'toan-4-phan-so': phanSo,
  'toan-4-hinh-hoc': hinhHoc4,
  'toan-4-trung-binh-cong': trungBinhCong,
};
