import { fact, fill, multiFact, tf } from './math-utils.js';

function others(pool, exclude, count, seed = 0) {
  const seen = new Set(exclude.map((item) => String(item).toLocaleLowerCase('vi')));
  const out = [];
  const start = Math.abs(seed) % Math.max(1, pool.length);
  for (let i = 0; i < pool.length && out.length < count; i += 1) {
    const word = pool[(start + i * 3) % pool.length];
    const key = String(word).toLocaleLowerCase('vi');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(word);
    }
  }
  for (const word of pool) {
    if (out.length >= count) break;
    const key = String(word).toLocaleLowerCase('vi');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(word);
    }
  }
  return out;
}

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

function numberDistractors(correct, seed) {
  return others(NUMBERS, [String(correct)], 3, seed);
}

// ===== Chủ đề 1: Alphabet và chào hỏi =====
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const GREETINGS = [
  ['Good morning', 'chào buổi sáng'],
  ['Good afternoon', 'chào buổi chiều'],
  ['Good evening', 'chào buổi tối'],
  ['Goodbye', 'tạm biệt'],
  ['Thank you', 'cảm ơn'],
  ['Sorry', 'xin lỗi'],
  ['Hello', 'xin chào'],
  ['Good night', 'chúc ngủ ngon'],
];
const ALPHABET_WORDS = ['apple', 'ball', 'cat', 'dog', 'egg', 'fish', 'goat', 'hat'];

const VOWEL_GROUPS = [
  [['A', 'E'], ['B', 'M']],
  [['I', 'O'], ['C', 'N']],
  [['A', 'U'], ['D', 'P']],
  [['E', 'I'], ['F', 'R']],
  [['O', 'U'], ['G', 'S']],
  [['A', 'I'], ['H', 'T']],
  [['E', 'O'], ['J', 'V']],
  [['U', 'A'], ['K', 'W']],
  [['I', 'U'], ['L', 'Y']],
];

const GREETING_GROUPS = [
  [['Hello', 'Good morning'], ['Thank you', 'Sorry']],
  [['Hi', 'Good afternoon'], ['Please', 'Yes']],
  [['Good evening', 'Hello'], ['No', 'Thank you']],
  [['Hi', 'Good morning'], ['Sorry', 'Please']],
  [['Good afternoon', 'Hi'], ['Yes', 'Thank you']],
  [['Hello', 'Good evening'], ['Please', 'Sorry']],
  [['Good morning', 'Good afternoon'], ['No', 'Thank you']],
  [['Hi', 'Good evening'], ['Sorry', 'Yes']],
];

const GREETING_FILLS = [
  ['Điền từ còn thiếu để chào buổi sáng: Good ___!', ['morning'], "Chào buổi sáng là 'Good morning'."],
  ['Điền từ còn thiếu để chào buổi chiều: Good ___!', ['afternoon'], "Chào buổi chiều là 'Good afternoon'."],
  ['Điền từ còn thiếu để chào buổi tối: Good ___!', ['evening'], "Chào buổi tối là 'Good evening'."],
  ['Điền từ còn thiếu khi tạm biệt: Good___!', ['bye'], "Tạm biệt là 'Goodbye'."],
  ['Điền từ còn thiếu để cảm ơn: Thank ___!', ['you'], "Cảm ơn là 'Thank you'."],
  ['Điền từ còn thiếu để xin lỗi: I am ___.', ['sorry'], "Xin lỗi là 'I am sorry'."],
  ['Điền từ còn thiếu để giới thiệu tên: My ___ is Nam.', ['name'], "Giới thiệu tên: 'My name is Nam'."],
  ['Điền từ còn thiếu để hỏi tên bạn: What is your ___?', ['name'], "Hỏi tên: 'What is your name?'."],
  ['Điền từ còn thiếu để chào bạn: ___! I am Mai.', ['Hello', 'Hi'], "Chào bạn là 'Hello' hoặc 'Hi'."],
  ['Điền từ còn thiếu để hỏi thăm: How ___ you?', ['are'], "Hỏi thăm là 'How are you?'."],
];

const alphabet = {
  single(k) {
    if (k < 24) {
      const current = ALPHABET[k];
      const next = ALPHABET[k + 1];
      return fact(
        `Chữ cái nào đứng ngay sau chữ '${current}' trong bảng chữ cái tiếng Anh?`,
        next,
        `Trong bảng chữ cái tiếng Anh, sau '${current}' là '${next}'.`,
        others(ALPHABET, [current, next], 3, k + 3),
      );
    }
    if (k < 36) {
      const index = k - 24 + 1;
      const current = ALPHABET[index];
      const previous = ALPHABET[index - 1];
      return fact(
        `Chữ cái nào đứng ngay trước chữ '${current}' trong bảng chữ cái tiếng Anh?`,
        previous,
        `Trong bảng chữ cái tiếng Anh, trước '${current}' là '${previous}'.`,
        others(ALPHABET, [current, previous], 3, k + 5),
      );
    }
    if (k < 44) {
      const word = ALPHABET_WORDS[k - 36];
      const letter = word[0].toUpperCase();
      return fact(
        `Từ tiếng Anh '${word}' bắt đầu bằng chữ cái nào?`,
        letter,
        `Từ '${word}' bắt đầu bằng chữ cái '${letter}'.`,
        others(ALPHABET, [letter], 3, k + 7),
      );
    }
    const [en, vi] = GREETINGS[k - 44];
    return fact(
      `Câu '${en}' có nghĩa là gì?`,
      vi,
      `'${en}' có nghĩa là '${vi}'.`,
      others(GREETINGS.map(([, meaning]) => meaning), [vi], 3, k + 11),
    );
  },
  multi(k) {
    if (k < 9) {
      const [correct, wrong] = VOWEL_GROUPS[k];
      const all = [correct[0], wrong[0], correct[1], wrong[1]];
      return multiFact(
        `Chọn tất cả các chữ cái là nguyên âm trong nhóm: ${all.join(', ')}.`,
        correct,
        wrong,
        `Các chữ ${correct.join(', ')} là nguyên âm; ${wrong.join(', ')} là phụ âm.`,
      );
    }
    const [correct, wrong] = GREETING_GROUPS[k - 9];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các câu dùng để chào hỏi trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `Các câu ${correct.join(', ')} dùng để chào hỏi; ${wrong.join(', ')} không phải câu chào hỏi.`,
    );
  },
  tf(k) {
    if (k < 9) {
      const first = ALPHABET[k];
      const second = ALPHABET[k + 1];
      if (k % 2 === 0) {
        return tf(
          `Chữ '${second}' đứng ngay sau chữ '${first}' trong bảng chữ cái tiếng Anh.`,
          true,
          `Đúng: '${second}' đứng ngay sau '${first}'.`,
        );
      }
      return tf(
        `Chữ '${second}' đứng ngay trước chữ '${first}' trong bảng chữ cái tiếng Anh.`,
        false,
        `Sai: '${second}' đứng ngay sau '${first}', không phải trước.`,
      );
    }
    const index = k - 9;
    const [en, vi] = GREETINGS[index];
    if (index % 2 === 0) {
      return tf(`Câu '${en}' có nghĩa là '${vi}'.`, true, `Đúng: '${en}' có nghĩa là '${vi}'.`);
    }
    const wrongMeaning = GREETINGS[(index + 3) % GREETINGS.length][1];
    return tf(
      `Câu '${en}' có nghĩa là '${wrongMeaning}'.`,
      false,
      `Sai: '${en}' có nghĩa là '${vi}', không phải '${wrongMeaning}'.`,
    );
  },
  fill(k) {
    if (k < 12) {
      const start = k * 2;
      const sequence = [ALPHABET[start], ALPHABET[start + 1], '___', ALPHABET[start + 3]];
      const missing = ALPHABET[start + 2];
      return fill(
        `Điền chữ cái còn thiếu trong bảng chữ cái tiếng Anh: ${sequence.join(', ')}.`,
        [missing, missing.toLowerCase()],
        `Chữ cái còn thiếu là '${missing}'.`,
      );
    }
    const [prompt, accepted, why] = GREETING_FILLS[k - 12];
    return fill(prompt, accepted, why);
  },
};

// ===== Chủ đề 2: Số 1-10 =====
const NUMBER_WORDS = [
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
];

const NUMBER_BIG_GROUPS = [
  [['six', 'seven'], ['two', 'four']],
  [['eight', 'nine'], ['one', 'three']],
  [['ten', 'six'], ['five', 'two']],
  [['seven', 'ten'], ['three', 'four']],
  [['nine', 'eight'], ['one', 'two']],
  [['six', 'eight'], ['five', 'four']],
  [['ten', 'seven'], ['two', 'three']],
  [['nine', 'six'], ['four', 'one']],
  [['eight', 'ten'], ['three', 'five']],
];

const NUMBER_MEANING_GROUPS = [
  [['four', 'six'], ['two', 'one']],
  [['three', 'five'], ['seven', 'nine']],
  [['two', 'eight'], ['six', 'one']],
  [['one', 'ten'], ['four', 'three']],
  [['five', 'seven'], ['two', 'eight']],
  [['nine', 'three'], ['one', 'six']],
  [['eight', 'four'], ['ten', 'two']],
  [['ten', 'six'], ['three', 'seven']],
];

const COUNT_STORIES = [
  ['Con có 3 cái kẹo, mẹ cho thêm 2 cái. Con có tất cả mấy cái kẹo?', 5],
  ['Trên bàn có 4 quả táo, mẹ mua thêm 3 quả. Có tất cả mấy quả táo?', 7],
  ['Trong vườn có 2 con gà, thêm 6 con gà nữa chạy vào. Có tất cả mấy con gà?', 8],
  ['Con có 1 quả bóng, bạn cho thêm 5 quả. Con có mấy quả bóng?', 6],
  ['Trong hộp có 5 cái bút, con lấy thêm 4 cái. Có tất cả mấy cái bút?', 9],
  ['Trên cây có 4 con chim, bay đến thêm 4 con. Có tất cả mấy con chim?', 8],
];

const COMPARE_PAIRS = [
  [2, 5],
  [7, 3],
  [8, 1],
  [4, 9],
  [6, 10],
  [1, 5],
  [3, 9],
  [2, 8],
];

const COUNT_SEQUENCES = [
  [['one', 'two', 'three'], 'four'],
  [['two', 'three', 'four'], 'five'],
  [['five', 'six', 'seven'], 'eight'],
  [['seven', 'eight', 'nine'], 'ten'],
];

const numbers = {
  single(k) {
    if (k < 10) {
      const [word, value] = NUMBER_WORDS[k];
      return fact(
        `Từ tiếng Anh '${word}' là số mấy?`,
        value,
        `'${word}' là số ${value}.`,
        numberDistractors(value, k + 2),
      );
    }
    if (k < 20) {
      const [word, value] = NUMBER_WORDS[k - 10];
      return fact(
        `Số ${value} trong tiếng Anh là từ nào?`,
        word,
        `Số ${value} trong tiếng Anh là '${word}'.`,
        others(NUMBER_WORDS.map(([item]) => item), [word], 3, k + 4),
      );
    }
    if (k < 29) {
      const value = k - 20 + 1;
      return fact(
        `Số nào đứng ngay sau số ${value}?`,
        value + 1,
        `Sau số ${value} là số ${value + 1}.`,
        numberDistractors(value + 1, k + 6),
      );
    }
    if (k < 38) {
      const value = k - 29 + 2;
      return fact(
        `Số nào đứng ngay trước số ${value}?`,
        value - 1,
        `Trước số ${value} là số ${value - 1}.`,
        numberDistractors(value - 1, k + 8),
      );
    }
    if (k < 44) {
      const [story, answer] = COUNT_STORIES[k - 38];
      return fact(story, answer, `Con đếm được tất cả ${answer}.`, numberDistractors(answer, k + 10));
    }
    const [first, second] = COMPARE_PAIRS[k - 44];
    const bigger = Math.max(first, second);
    const smaller = Math.min(first, second);
    return fact(
      `Số nào lớn hơn: ${first} hay ${second}?`,
      bigger,
      `Số ${bigger} lớn hơn số ${smaller}.`,
      others(NUMBERS, [String(bigger), String(smaller)], 3, k + 12),
    );
  },
  multi(k) {
    if (k < 9) {
      const [correct, wrong] = NUMBER_BIG_GROUPS[k];
      const all = [correct[0], wrong[0], correct[1], wrong[1]];
      return multiFact(
        `Chọn tất cả các từ chỉ số lớn hơn 5 trong nhóm: ${all.join(', ')}.`,
        correct,
        wrong,
        `Các từ ${correct.join(', ')} chỉ số lớn hơn 5.`,
      );
    }
    const [correct, wrong] = NUMBER_MEANING_GROUPS[k - 9];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    const meaning = (word) => NUMBER_WORDS.find(([item]) => item === word)[1];
    return multiFact(
      `Chọn tất cả các từ có nghĩa là số ${meaning(correct[0])} và số ${meaning(correct[1])} trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `'${correct[0]}' là số ${meaning(correct[0])}, '${correct[1]}' là số ${meaning(correct[1])}.`,
    );
  },
  tf(k) {
    if (k < 9) {
      const [word, value] = NUMBER_WORDS[k];
      if (k % 2 === 0) {
        return tf(`Từ '${word}' có nghĩa là số ${value}.`, true, `Đúng: '${word}' là số ${value}.`);
      }
      const wrongValue = value === 10 ? 9 : value + 1;
      return tf(`Từ '${word}' có nghĩa là số ${wrongValue}.`, false, `Sai: '${word}' là số ${value}.`);
    }
    const [first, second] = COMPARE_PAIRS[k - 9];
    const smaller = Math.min(first, second);
    const bigger = Math.max(first, second);
    if ((k - 9) % 2 === 0) {
      return tf(`Số ${smaller} bé hơn số ${bigger}.`, true, `Đúng: số ${smaller} bé hơn số ${bigger}.`);
    }
    return tf(`Số ${bigger} bé hơn số ${smaller}.`, false, `Sai: số ${bigger} lớn hơn số ${smaller}.`);
  },
  fill(k) {
    if (k < 10) {
      const [word, value] = NUMBER_WORDS[k];
      return fill(`Viết số ${value} bằng tiếng Anh: ___.`, [word, word.toUpperCase()], `Số ${value} viết là '${word}'.`);
    }
    if (k < 18) {
      const [word, value] = NUMBER_WORDS[k - 10];
      return fill(`Điền chữ số: từ '${word}' nghĩa là số ___.`, [String(value)], `'${word}' là số ${value}.`);
    }
    const [sequence, next] = COUNT_SEQUENCES[k - 18];
    return fill(
      `Đếm tiếp bằng tiếng Anh: ${sequence.join(', ')}, ___.`,
      [next, next.toUpperCase()],
      `Đếm tiếp sau '${sequence[2]}' là '${next}'.`,
    );
  },
};

// ===== Chủ đề 3: Màu sắc =====
const COLORS = [
  ['red', 'đỏ'],
  ['blue', 'xanh dương'],
  ['yellow', 'vàng'],
  ['green', 'xanh lá cây'],
  ['orange', 'cam'],
  ['purple', 'tím'],
  ['pink', 'hồng'],
  ['brown', 'nâu'],
  ['black', 'đen'],
  ['white', 'trắng'],
  ['gray', 'xám'],
];

const OBJECT_COLORS = [
  ['Quả chuối thường có màu gì?', 'vàng'],
  ['Lá cây thường có màu gì?', 'xanh lá cây'],
  ['Bầu trời trong ngày nắng có màu gì?', 'xanh dương'],
  ['Quả táo chín thường có màu gì?', 'đỏ'],
  ['Tuyết thường có màu gì?', 'trắng'],
  ['Mèo mun có bộ lông màu gì?', 'đen'],
  ['Quả cam thường có màu gì?', 'cam'],
  ['Quả nho tím có màu gì?', 'tím'],
  ['Bông hoa hồng thường có màu gì?', 'hồng'],
  ['Thỏ nâu có bộ lông màu gì?', 'nâu'],
  ['Con voi thường có màu gì?', 'xám'],
];

const COLOR_NOUN_GROUPS = [
  ['red', ['book', 'cat', 'table']],
  ['blue', ['pen', 'dog', 'chair']],
  ['yellow', ['bag', 'ball', 'tree']],
  ['green', ['house', 'car', 'doll']],
  ['orange', ['milk', 'rice', 'door']],
  ['purple', ['window', 'kite', 'bike']],
  ['pink', ['shoe', 'hat', 'cup']],
  ['brown', ['spoon', 'plate', 'box']],
  ['black', ['pencil', 'ruler', 'clock']],
  ['white', ['bed', 'lamp', 'fan']],
];

const COLOR_GROUPS = [
  [['red', 'blue'], ['dog', 'table']],
  [['green', 'pink'], ['book', 'cat']],
  [['black', 'white'], ['chair', 'pen']],
  [['yellow', 'purple'], ['bag', 'ball']],
  [['orange', 'brown'], ['tree', 'house']],
  [['gray', 'red'], ['car', 'doll']],
  [['blue', 'yellow'], ['milk', 'rice']],
  [['pink', 'green'], ['bike', 'kite']],
  [['white', 'black'], ['door', 'window']],
];

const COLOR_MEANING_GROUPS = [
  [['red', 'blue'], ['green', 'pink']],
  [['yellow', 'black'], ['white', 'brown']],
  [['purple', 'orange'], ['gray', 'red']],
  [['green', 'white'], ['blue', 'black']],
  [['pink', 'gray'], ['yellow', 'purple']],
  [['brown', 'red'], ['orange', 'green']],
  [['black', 'blue'], ['pink', 'white']],
  [['orange', 'yellow'], ['brown', 'gray']],
];

const COLOR_TRUTHS = [
  ['Quả chuối thường có màu vàng.', 'vàng'],
  ['Bầu trời trong ngày nắng có màu xanh dương.', 'xanh dương'],
  ['Tuyết thường có màu trắng.', 'trắng'],
  ['Quả nho tím có màu tím.', 'tím'],
];

const COLOR_FALSE_STATEMENTS = [
  ['Lá cây thường có màu đỏ.', 'xanh lá cây'],
  ['Quả cam thường có màu tím.', 'cam'],
  ['Than thường có màu trắng.', 'đen'],
  ['Con voi thường có màu hồng.', 'xám'],
];

const COLOR_SENTENCES = [
  ['The apple is ___.', 'red'],
  ['The sky is ___.', 'blue'],
  ['The banana is ___.', 'yellow'],
  ['The leaf is ___.', 'green'],
  ['The orange is ___.', 'orange'],
  ['The grape is ___.', 'purple'],
  ['The pig is ___.', 'pink'],
  ['The bear is ___.', 'brown'],
  ['The cat is ___.', 'black'],
  ['The cloud is ___.', 'white'],
  ['The elephant is ___.', 'gray'],
];

const colorOf = (word) => COLORS.find(([en]) => en === word)[1];

const colors = {
  single(k) {
    if (k < 11) {
      const [en, vi] = COLORS[k];
      return fact(
        `Màu '${en}' trong tiếng Việt là màu gì?`,
        vi,
        `'${en}' nghĩa là màu ${vi}.`,
        others(COLORS.map(([, meaning]) => meaning), [vi], 3, k + 2),
      );
    }
    if (k < 22) {
      const [en, vi] = COLORS[k - 11];
      return fact(
        `Màu ${vi} trong tiếng Anh là từ nào?`,
        en,
        `Màu ${vi} trong tiếng Anh là '${en}'.`,
        others(COLORS.map(([word]) => word), [en], 3, k + 4),
      );
    }
    if (k < 33) {
      const [prompt, answer] = OBJECT_COLORS[k - 22];
      return fact(
        prompt,
        answer,
        `Câu trả lời đúng là màu ${answer}.`,
        others(COLORS.map(([, meaning]) => meaning), [answer], 3, k + 6),
      );
    }
    if (k < 43) {
      const [correct, nouns] = COLOR_NOUN_GROUPS[k - 33];
      const all = [correct, ...nouns];
      return fact(
        `Trong nhóm từ sau, từ nào chỉ màu sắc: ${all.join(', ')}?`,
        correct,
        `'${correct}' là màu sắc; các từ còn lại chỉ đồ vật hoặc con vật.`,
        nouns,
      );
    }
    const [en] = COLORS[k - 43];
    const length = en.length;
    return fact(
      `Từ tiếng Anh '${en}' có mấy chữ cái?`,
      length,
      `Từ '${en}' có ${length} chữ cái.`,
      others(NUMBERS, [String(length)], 3, k + 8),
    );
  },
  multi(k) {
    if (k < 9) {
      const [correct, wrong] = COLOR_GROUPS[k];
      const all = [correct[0], wrong[0], correct[1], wrong[1]];
      return multiFact(
        `Chọn tất cả các từ chỉ màu sắc trong nhóm: ${all.join(', ')}.`,
        correct,
        wrong,
        `Các từ ${correct.join(', ')} chỉ màu sắc; ${wrong.join(', ')} không phải màu sắc.`,
      );
    }
    const [correct, wrong] = COLOR_MEANING_GROUPS[k - 9];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các từ có nghĩa là '${colorOf(correct[0])}' và '${colorOf(correct[1])}' trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `'${correct[0]}' là màu ${colorOf(correct[0])}, '${correct[1]}' là màu ${colorOf(correct[1])}.`,
    );
  },
  tf(k) {
    if (k < 9) {
      const [en, vi] = COLORS[k];
      if (k % 2 === 0) {
        return tf(`Từ '${en}' có nghĩa là màu ${vi}.`, true, `Đúng: '${en}' là màu ${vi}.`);
      }
      const wrongColor = COLORS[(k + 4) % COLORS.length][1];
      return tf(`Từ '${en}' có nghĩa là màu ${wrongColor}.`, false, `Sai: '${en}' là màu ${vi}.`);
    }
    const index = k - 9;
    if (index % 2 === 0) {
      const [statement, color] = COLOR_TRUTHS[index / 2];
      return tf(statement, true, `Đúng: sự vật đó có màu ${color}.`);
    }
    const [statement, color] = COLOR_FALSE_STATEMENTS[Math.floor(index / 2)];
    return tf(statement, false, `Sai: sự vật đó có màu ${color}, không phải màu đã nêu.`);
  },
  fill(k) {
    if (k < 11) {
      const [en, vi] = COLORS[k];
      return fill(`Điền từ tiếng Anh chỉ màu ${vi}: ___.`, [en, en.toUpperCase()], `Màu ${vi} là '${en}'.`);
    }
    const [sentence, en] = COLOR_SENTENCES[k - 11];
    return fill(
      `Điền từ chỉ màu còn thiếu trong câu tiếng Anh: ${sentence}`,
      [en, en.toUpperCase()],
      `Câu đúng là '${sentence.replace('___', en)}' (màu ${colorOf(en)}).`,
    );
  },
};

// ===== Chủ đề 4: Động vật =====
const ANIMALS = [
  ['cat', 'con mèo'],
  ['dog', 'con chó'],
  ['bird', 'con chim'],
  ['fish', 'con cá'],
  ['cow', 'con bò'],
  ['pig', 'con lợn'],
  ['duck', 'con vịt'],
  ['chicken', 'con gà'],
  ['elephant', 'con voi'],
  ['tiger', 'con hổ'],
  ['lion', 'con sư tử'],
  ['monkey', 'con khỉ'],
  ['rabbit', 'con thỏ'],
  ['horse', 'con ngựa'],
  ['sheep', 'con cừu'],
  ['frog', 'con ếch'],
  ['snake', 'con rắn'],
  ['mouse', 'con chuột'],
  ['bear', 'con gấu'],
  ['turtle', 'con rùa'],
];

const ANIMAL_CLUES = [
  ['Con vật nào kêu \'meo meo\'?', 'con mèo'],
  ['Con vật nào kêu \'gâu gâu\'?', 'con chó'],
  ['Con vật nào kêu \'ủn ỉn\'?', 'con lợn'],
  ['Con vật nào kêu \'cạc cạc\'?', 'con vịt'],
  ['Con vật nào kêu \'be be\'?', 'con cừu'],
  ['Con vật nào kêu \'hí hí\'?', 'con ngựa'],
  ['Con vật nào kêu \'gừ gừ\'?', 'con hổ'],
  ['Con vật nào kêu \'ộp ộp\'?', 'con ếch'],
];

const ANIMAL_FEATURES = [
  ['Con vật nào sống dưới nước?', 'con cá'],
  ['Con vật nào có cánh và biết bay?', 'con chim'],
  ['Con vật nào có vòi dài và đôi tai to?', 'con voi'],
  ['Con vật nào mang mai cứng trên lưng?', 'con rùa'],
];

const ANIMAL_GROUPS = [
  [['cat', 'dog'], ['table', 'book']],
  [['bird', 'fish'], ['chair', 'pen']],
  [['cow', 'pig'], ['bag', 'ball']],
  [['duck', 'chicken'], ['tree', 'house']],
  [['tiger', 'lion'], ['car', 'doll']],
  [['rabbit', 'horse'], ['milk', 'rice']],
  [['sheep', 'frog'], ['door', 'window']],
  [['snake', 'mouse'], ['shoe', 'hat']],
  [['bear', 'turtle'], ['spoon', 'plate']],
];

const LEG_GROUPS = [
  [['dog', 'cat'], ['bird', 'fish']],
  [['cow', 'pig'], ['duck', 'snake']],
  [['horse', 'sheep'], ['chicken', 'fish']],
  [['tiger', 'lion'], ['bird', 'snake']],
  [['rabbit', 'mouse'], ['duck', 'fish']],
  [['bear', 'elephant'], ['chicken', 'bird']],
  [['monkey', 'frog'], ['fish', 'duck']],
  [['turtle', 'cat'], ['bird', 'chicken']],
];

const ANIMAL_TF_TRUE = [
  'Con chim biết bay.',
  'Con mèo kêu \'meo meo\'.',
  'Con voi có vòi dài.',
  'Con thỏ có đôi tai dài.',
];

const ANIMAL_TF_FALSE = [
  ['Con cá sống trên cạn.', 'Con cá sống dưới nước.'],
  ['Con cá có cánh.', 'Con cá không có cánh; con chim mới có cánh.'],
  ['Con chim sống dưới nước.', 'Con chim sống trên cạn và biết bay.'],
  ['Con rùa chạy nhanh hơn con ngựa.', 'Con rùa bò rất chậm, không nhanh hơn con ngựa.'],
];

const SOUND_FILLS = [
  ['meo meo', 'mèo'],
  ['gâu gâu', 'chó'],
  ['ủn ỉn', 'lợn'],
  ['cạc cạc', 'vịt'],
  ['be be', 'cừu'],
  ['hí hí', 'ngựa'],
  ['gừ gừ', 'hổ'],
  ['ộp ộp', 'ếch'],
  ['chiếp chiếp', 'gà'],
  ['ụm bò', 'bò'],
];

const animalMeaning = (en) => ANIMALS.find(([word]) => word === en)[1];

const animals = {
  single(k) {
    if (k < 20) {
      const [en, vi] = ANIMALS[k];
      return fact(
        `Từ tiếng Anh '${en}' là con gì?`,
        vi,
        `'${en}' nghĩa là ${vi}.`,
        others(ANIMALS.map(([, meaning]) => meaning), [vi], 3, k + 2),
      );
    }
    if (k < 40) {
      const [en, vi] = ANIMALS[k - 20];
      return fact(
        `${vi.charAt(0).toLocaleUpperCase('vi')}${vi.slice(1)} trong tiếng Anh là từ nào?`,
        en,
        `${vi} trong tiếng Anh là '${en}'.`,
        others(ANIMALS.map(([word]) => word), [en], 3, k + 4),
      );
    }
    if (k < 48) {
      const [prompt, answer] = ANIMAL_CLUES[k - 40];
      return fact(
        prompt,
        answer,
        `Đó là ${answer}.`,
        others(ANIMALS.map(([, meaning]) => meaning), [answer], 3, k + 6),
      );
    }
    const [prompt, answer] = ANIMAL_FEATURES[k - 48];
    return fact(
      prompt,
      answer,
      `Đó là ${answer}.`,
      others(ANIMALS.map(([, meaning]) => meaning), [answer], 3, k + 8),
    );
  },
  multi(k) {
    if (k < 9) {
      const [correct, wrong] = ANIMAL_GROUPS[k];
      const all = [correct[0], wrong[0], correct[1], wrong[1]];
      return multiFact(
        `Chọn tất cả các từ chỉ con vật trong nhóm: ${all.join(', ')}.`,
        correct,
        wrong,
        `Các từ ${correct.join(', ')} chỉ con vật; ${wrong.join(', ')} không phải con vật.`,
      );
    }
    const [correct, wrong] = LEG_GROUPS[k - 9];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các từ chỉ con vật có bốn chân trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `Các từ ${correct.join(', ')} chỉ con vật có bốn chân.`,
    );
  },
  tf(k) {
    if (k < 9) {
      const [en, vi] = ANIMALS[k];
      if (k % 2 === 0) {
        return tf(`Từ '${en}' có nghĩa là ${vi}.`, true, `Đúng: '${en}' là ${vi}.`);
      }
      const wrongAnimal = ANIMALS[(k + 5) % ANIMALS.length][1];
      return tf(`Từ '${en}' có nghĩa là ${wrongAnimal}.`, false, `Sai: '${en}' là ${vi}.`);
    }
    const index = k - 9;
    if (index % 2 === 0) {
      return tf(ANIMAL_TF_TRUE[index / 2], true, 'Đúng với đặc điểm của con vật này.');
    }
    const [statement, fix] = ANIMAL_TF_FALSE[Math.floor(index / 2)];
    return tf(statement, false, `Sai: ${fix}`);
  },
  fill(k) {
    if (k < 10) {
      const [en, vi] = ANIMALS[k];
      return fill(`Điền từ tiếng Anh chỉ ${vi}: ___.`, [en, en.toUpperCase()], `Đáp án là '${en}', nghĩa là ${vi}.`);
    }
    if (k < 20) {
      const [sound, name] = SOUND_FILLS[k - 10];
      return fill(`Điền tên con vật còn thiếu: Con ___ kêu '${sound}'.`, [name], `Con ${name} kêu '${sound}'.`);
    }
    if (k === 20) {
      return fill(
        'Điền từ tiếng Anh chỉ con vật có vòi dài: ___.',
        ['elephant', 'ELEPHANT'],
        "Con voi là 'elephant'.",
      );
    }
    return fill(
      'Điền từ tiếng Anh chỉ con vật có mai cứng trên lưng: ___.',
      ['turtle', 'TURTLE'],
      "Con rùa là 'turtle'.",
    );
  },
};

// ===== Chủ đề 5: Gia đình =====
const FAMILY = [
  ['father', 'bố'],
  ['mother', 'mẹ'],
  ['brother', 'anh trai'],
  ['sister', 'chị gái'],
  ['grandfather', 'ông'],
  ['grandmother', 'bà'],
  ['baby', 'em bé'],
  ['family', 'gia đình'],
  ['parents', 'bố mẹ'],
  ['uncle', 'chú'],
  ['aunt', 'cô'],
  ['cousin', 'anh em họ'],
  ['son', 'con trai'],
  ['daughter', 'con gái'],
];

const FAMILY_RELATIONS = [
  ['Mẹ của bố con gọi là gì?', 'bà nội'],
  ['Mẹ của mẹ con gọi là gì?', 'bà ngoại'],
  ['Bố của bố con gọi là gì?', 'ông nội'],
  ['Bố của mẹ con gọi là gì?', 'ông ngoại'],
];
const GRANDPARENTS = ['ông nội', 'bà nội', 'ông ngoại', 'bà ngoại'];

const FAMILY_COUNTING = [
  ['Gia đình con có bố, mẹ và con. Có tất cả mấy người?', 3],
  ['Gia đình con có bố, mẹ, anh trai và con. Có tất cả mấy người?', 4],
  ['Gia đình con có bố, mẹ, chị gái và con. Có tất cả mấy người?', 4],
  ['Gia đình con có bố, mẹ, ông nội và con. Có tất cả mấy người?', 4],
  ['Gia đình con có bố, mẹ, bà ngoại, em bé và con. Có tất cả mấy người?', 5],
  ['Gia đình con có bố, mẹ, anh trai, chị gái và con. Có tất cả mấy người?', 5],
  ['Gia đình con có bố, mẹ, ông nội, bà nội và con. Có tất cả mấy người?', 5],
  ['Gia đình con có bố, mẹ, ông nội, bà nội, em bé và con. Có tất cả mấy người?', 6],
];

const FAMILY_GROUPS = [
  [['mother', 'father'], ['book', 'table']],
  [['sister', 'brother'], ['chair', 'pen']],
  [['grandmother', 'grandfather'], ['bag', 'ball']],
  [['aunt', 'uncle'], ['tree', 'house']],
  [['baby', 'cousin'], ['car', 'doll']],
  [['son', 'daughter'], ['milk', 'rice']],
  [['parents', 'family'], ['door', 'window']],
  [['mother', 'sister'], ['shoe', 'hat']],
  [['father', 'brother'], ['spoon', 'plate']],
];

const FAMILY_MEANING_GROUPS = [
  [['father', 'mother'], ['sister', 'brother']],
  [['grandfather', 'grandmother'], ['aunt', 'uncle']],
  [['brother', 'sister'], ['father', 'mother']],
  [['uncle', 'aunt'], ['baby', 'cousin']],
  [['parents', 'family'], ['son', 'daughter']],
  [['baby', 'son'], ['mother', 'father']],
  [['cousin', 'daughter'], ['brother', 'sister']],
  [['grandmother', 'aunt'], ['grandfather', 'uncle']],
];

const FAMILY_TF_TRUE = [
  'Bố của bố con gọi là ông nội.',
  'Mẹ của mẹ con gọi là bà ngoại.',
  'Bố của mẹ con gọi là ông ngoại.',
  'Mẹ của bố con gọi là bà nội.',
];

const FAMILY_TF_FALSE = [
  ['Bố của mẹ con gọi là ông nội.', 'Bố của mẹ con gọi là ông ngoại.'],
  ['Mẹ của bố con gọi là bà ngoại.', 'Mẹ của bố con gọi là bà nội.'],
  ['Bố của bố con gọi là ông ngoại.', 'Bố của bố con gọi là ông nội.'],
  ['Mẹ của mẹ con gọi là bà nội.', 'Mẹ của mẹ con gọi là bà ngoại.'],
];

const familyMeaning = (en) => FAMILY.find(([word]) => word === en)[1];

const family = {
  single(k) {
    if (k < 14) {
      const [en, vi] = FAMILY[k];
      return fact(
        `Từ tiếng Anh '${en}' có nghĩa là gì?`,
        vi,
        `'${en}' nghĩa là ${vi}.`,
        others(FAMILY.map(([, meaning]) => meaning), [vi], 3, k + 2),
      );
    }
    if (k < 28) {
      const [en, vi] = FAMILY[k - 14];
      return fact(
        `'${vi}' trong tiếng Anh là từ nào?`,
        en,
        `'${vi}' trong tiếng Anh là '${en}'.`,
        others(FAMILY.map(([word]) => word), [en], 3, k + 4),
      );
    }
    if (k < 32) {
      const [prompt, answer] = FAMILY_RELATIONS[k - 28];
      return fact(
        prompt,
        answer,
        `Người đó gọi là ${answer}.`,
        others(GRANDPARENTS, [answer], 3, k + 6),
      );
    }
    if (k < 40) {
      const [prompt, answer] = FAMILY_COUNTING[k - 32];
      return fact(prompt, answer, `Con đếm được tất cả ${answer} người.`, numberDistractors(answer, k + 8));
    }
    const [en] = FAMILY[k - 40];
    const length = en.length;
    return fact(
      `Từ tiếng Anh '${en}' có mấy chữ cái?`,
      length,
      `Từ '${en}' có ${length} chữ cái.`,
      others([...NUMBERS, '11'], [String(length)], 3, k + 10),
    );
  },
  multi(k) {
    if (k < 9) {
      const [correct, wrong] = FAMILY_GROUPS[k];
      const all = [correct[0], wrong[0], correct[1], wrong[1]];
      return multiFact(
        `Chọn tất cả các từ chỉ người trong gia đình trong nhóm: ${all.join(', ')}.`,
        correct,
        wrong,
        `Các từ ${correct.join(', ')} chỉ người trong gia đình; ${wrong.join(', ')} không phải.`,
      );
    }
    const [correct, wrong] = FAMILY_MEANING_GROUPS[k - 9];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các từ có nghĩa là '${familyMeaning(correct[0])}' và '${familyMeaning(correct[1])}' trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `'${correct[0]}' là ${familyMeaning(correct[0])}, '${correct[1]}' là ${familyMeaning(correct[1])}.`,
    );
  },
  tf(k) {
    if (k < 9) {
      const [en, vi] = FAMILY[k];
      if (k % 2 === 0) {
        return tf(`Từ '${en}' có nghĩa là '${vi}'.`, true, `Đúng: '${en}' nghĩa là '${vi}'.`);
      }
      const wrongMeaning = FAMILY[(k + 6) % FAMILY.length][1];
      return tf(`Từ '${en}' có nghĩa là '${wrongMeaning}'.`, false, `Sai: '${en}' nghĩa là '${vi}'.`);
    }
    const index = k - 9;
    if (index % 2 === 0) {
      return tf(FAMILY_TF_TRUE[index / 2], true, 'Đúng theo cách gọi trong gia đình.');
    }
    const [statement, fix] = FAMILY_TF_FALSE[Math.floor(index / 2)];
    return tf(statement, false, `Sai: ${fix}`);
  },
  fill(k) {
    if (k < 10) {
      const [en, vi] = FAMILY[k];
      return fill(`Điền từ tiếng Anh chỉ '${vi}': ___.`, [en, en.toUpperCase()], `'${vi}' là '${en}'.`);
    }
    if (k < 20) {
      const [en, vi] = FAMILY[k - 10];
      return fill(`Điền từ tiếng Anh: ${vi} của con là ___.`, [en, en.toUpperCase()], `${vi} là '${en}'.`);
    }
    if (k === 20) {
      return fill('Điền từ còn thiếu: I love my ___. (gia đình của con)', ['family'], "Gia đình là 'family'.");
    }
    return fill('Điền từ còn thiếu: My little ___ is sleeping. (em bé)', ['baby'], "Em bé là 'baby'.");
  },
};

export const ENGLISH_GRADE_1 = {
  'tieng-anh-1-alphabet': alphabet,
  'tieng-anh-1-numbers': numbers,
  'tieng-anh-1-colors': colors,
  'tieng-anh-1-animals': animals,
  'tieng-anh-1-family': family,
};
