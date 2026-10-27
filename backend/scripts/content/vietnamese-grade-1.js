import { fact, fill, multiFact, tf } from './math-utils.js';

function at(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function others(pool, exclude, count, seed = 0) {
  const out = [];
  const start = Math.abs(seed) % Math.max(1, pool.length);
  for (let i = 0; i < pool.length * 2 && out.length < count; i += 1) {
    const word = pool[(start + i * 3) % pool.length];
    if (!exclude.includes(word) && !out.includes(word)) out.push(word);
  }
  for (const word of pool) {
    if (out.length >= count) break;
    if (!exclude.includes(word) && !out.includes(word)) out.push(word);
  }
  return out;
}

function blocks(k, size) {
  return { block: Math.floor(k / size), index: k % size };
}

// ===== Chữ cái và âm đầu =====
const LETTERS = ['a', 'ă', 'â', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g', 'h', 'i', 'k', 'l', 'm', 'n', 'o', 'ô', 'ơ', 'p', 'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y'];
const VOWELS = ['a', 'ă', 'â', 'e', 'ê', 'i', 'o', 'ô', 'ơ', 'u', 'ư', 'y'];
const SOUNDS = ['b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'ph', 'r', 's', 't', 'v', 'x'];
const INITIAL_WORDS = {
  b: ['bà', 'bò', 'bánh', 'bút'],
  c: ['cá', 'cò', 'cốc', 'cây'],
  d: ['dê', 'dừa', 'dép', 'dao'],
  đ: ['đèn', 'đất', 'đũa', 'đào'],
  g: ['gà', 'gấu', 'gạo', 'ghế'],
  h: ['hoa', 'hồ', 'hát', 'hẹ'],
  k: ['kẹo', 'kem', 'kiến', 'kèn'],
  l: ['lá', 'lê', 'lửa', 'lược'],
  m: ['mèo', 'mưa', 'mía', 'mũ'],
  n: ['nón', 'nho', 'nồi', 'nắng'],
  ph: ['phở', 'phố', 'pháo', 'phim'],
  r: ['rùa', 'rổ', 'rá', 'rèm'],
  s: ['sông', 'sen', 'sáo', 'sữa'],
  t: ['táo', 'tôm', 'tàu', 'tổ'],
  v: ['vịt', 'võng', 'vở', 'vườn'],
  x: ['xe', 'xem', 'xô', 'xương'],
};
const ALL_INITIAL_WORDS = SOUNDS.flatMap((sound) => INITIAL_WORDS[sound]);

const chuCai = {
  single(k) {
    if (k < 10) {
      const index = 1 + ((k * 2) % (LETTERS.length - 1));
      const current = LETTERS[index - 1];
      const next = LETTERS[index];
      return fact(
        `Chữ nào đứng ngay sau chữ '${current}' trong bảng chữ cái?`,
        next,
        `Trong bảng chữ cái, sau '${current}' là '${next}'.`,
        others(LETTERS, [next], 3, k + 4),
      );
    }
    if (k < 20) {
      const index = 1 + ((k * 3) % (LETTERS.length - 1));
      const previous = LETTERS[index - 1];
      const current = LETTERS[index];
      return fact(
        `Chữ nào đứng ngay trước chữ '${current}' trong bảng chữ cái?`,
        previous,
        `Trong bảng chữ cái, trước '${current}' là '${previous}'.`,
        others(LETTERS, [previous], 3, k + 9),
      );
    }
    if (k < 30) {
      const sound = SOUNDS[k - 20];
      const correct = at(INITIAL_WORDS[sound], k);
      const wrongPool = ALL_INITIAL_WORDS.filter((word) => !INITIAL_WORDS[sound].includes(word));
      return fact(
        `Từ nào dưới đây bắt đầu bằng âm '${sound}'?`,
        correct,
        `'${correct}' bắt đầu bằng âm '${sound}'.`,
        others(wrongPool, [correct], 3, k),
      );
    }
    if (k < 40) {
      const sound = SOUNDS[k - 30];
      const word = at(INITIAL_WORDS[sound], k);
      return fact(
        `Tiếng '${word}' có âm đầu là gì?`,
        sound,
        `Tiếng '${word}' có âm đầu là '${sound}'.`,
        others(SOUNDS, [sound], 3, k),
      );
    }
    const vowel = VOWELS[k - 40];
    const consonants = others(SOUNDS, [], 3, k);
    return fact(
      `Trong nhóm chữ ${[vowel, ...consonants].join(', ')}, chữ nào là nguyên âm?`,
      vowel,
      `'${vowel}' là nguyên âm; các chữ còn lại là phụ âm.`,
      consonants,
    );
  },
  fill(k) {
    if (k < 6) {
      const items = [
        ['Điền chữ cái còn thiếu: a, ă, ___, b.', 'â', "Sau 'ă' là 'â'."],
        ['Điền chữ cái còn thiếu: d, đ, ___, ê.', 'e', "Sau 'đ' là 'e'."],
        ['Điền chữ cái còn thiếu: l, m, ___, o.', 'n', "Sau 'm' là 'n'."],
        ['Điền chữ cái còn thiếu: q, r, ___, t.', 's', "Sau 'r' là 's'."],
        ['Điền chữ cái còn thiếu: u, ư, ___, y.', 'v', "Sau 'ư' là 'v'."],
        ['Điền chữ cái còn thiếu: e, ê, ___, h.', 'g', "Sau 'ê' là 'g'."],
      ];
      const [prompt, answer, why] = items[k];
      return fill(prompt, [answer], why);
    }
    if (k < 14) {
      const words = ['bà', 'cá', 'dê', 'đèn', 'gà', 'hoa', 'kẹo', 'lá'];
      const word = words[k - 6];
      return fill(`Từ '${word}' bắt đầu bằng âm ___.`, [word[0]], `Từ '${word}' bắt đầu bằng âm '${word[0]}'.`);
    }
    if (k < 20) {
      const words = ['mèo', 'nón', 'vở', 'rùa', 'sông', 'táo'];
      const word = words[k - 14];
      return fill(`Tiếng '${word}' có âm đầu là ___.`, [word[0]], `Tiếng '${word}' có âm đầu là '${word[0]}'.`);
    }
    if (k === 20) return fill("Chữ ___ đứng ngay sau chữ 'm' trong bảng chữ cái.", ['n'], "Sau 'm' là 'n'.");
    return fill("Chữ ___ đứng ngay trước chữ 'e' trong bảng chữ cái.", ['đ'], "Trước 'e' là 'đ'.");
  },
  tf(k) {
    if (k < 8) {
      const first = LETTERS[k];
      const second = LETTERS[k + 1];
      if (k % 2 === 0) {
        return tf(`Chữ '${second}' đứng sau chữ '${first}' trong bảng chữ cái.`, true, `Đúng: '${second}' đứng sau '${first}'.`);
      }
      return tf(`Chữ '${second}' đứng trước chữ '${first}' trong bảng chữ cái.`, false, `Sai: '${second}' đứng sau '${first}'.`);
    }
    if (k < 13) {
      const word = ['bà', 'cá', 'dê', 'đèn', 'gà'][k - 8];
      const sound = word[0];
      if (k % 2 === 0) return tf(`Tiếng '${word}' bắt đầu bằng âm '${sound}'.`, true, `Đúng: '${word}' bắt đầu bằng '${sound}'.`);
      const wrong = at(SOUNDS.filter((item) => item !== sound), k);
      return tf(`Tiếng '${word}' bắt đầu bằng âm '${wrong}'.`, false, `Sai: '${word}' bắt đầu bằng '${sound}'.`);
    }
    const letter = ['a', 'b', 'e', 'm'][k - 13];
    const isVowel = VOWELS.includes(letter);
    return tf(
      `Chữ '${letter}' là nguyên âm.`,
      isVowel,
      isVowel ? `Đúng: '${letter}' là nguyên âm.` : `Sai: '${letter}' là phụ âm.`,
    );
  },
  multi(k) {
    if (k < 16) {
      const sound = SOUNDS[k];
      const correct = INITIAL_WORDS[sound].slice(0, 2);
      const otherSound = SOUNDS[(k + 5) % SOUNDS.length];
      const wrong = INITIAL_WORDS[otherSound].slice(0, 2);
      const all = [correct[0], wrong[0], correct[1], wrong[1]];
      return multiFact(
        `Chọn tất cả các tiếng bắt đầu bằng âm '${sound}' trong nhóm: ${all.join(', ')}.`,
        correct,
        wrong,
        `Các tiếng ${correct.join(', ')} bắt đầu bằng âm '${sound}'.`,
      );
    }
    return multiFact(
      'Chọn tất cả các tiếng không có âm đầu trong nhóm: ăn, uống, nhà, cá.',
      ['ăn', 'uống'],
      ['nhà', 'cá'],
      "'ăn' và 'uống' không có âm đầu; 'nhà' và 'cá' có âm đầu.",
    );
  },
};

// ===== Vần và tiếng =====
const RHYME_WORDS = [
  ['bà', 'a'], ['mẹ', 'e'], ['cô', 'ô'], ['cây', 'ây'], ['hoa', 'oa'], ['sách', 'ach'],
  ['bàn', 'an'], ['chim', 'im'], ['trường', 'ương'], ['biển', 'iên'], ['đèn', 'en'], ['mưa', 'ưa'],
  ['cá', 'a'], ['nhà', 'a'], ['lá', 'a'], ['xe', 'e'], ['ghế', 'ê'], ['tủ', 'u'],
  ['thư', 'ư'], ['mây', 'ây'], ['sông', 'ông'], ['bánh', 'anh'],
];
const RHYMES = [...new Set(RHYME_WORDS.map(([, rhyme]) => rhyme))];
const RHYME_POOL = [
  ['a', 'cá'], ['e', 'mẹ'], ['ê', 'ghế'], ['i', 'bi'], ['o', 'cò'], ['ô', 'cô'], ['ơ', 'mơ'], ['u', 'tủ'],
  ['ư', 'thư'], ['ay', 'tay'], ['ây', 'cây'], ['ao', 'áo'], ['an', 'bàn'], ['ach', 'sách'], ['ương', 'trường'], ['ông', 'sông'],
];
const RHYME_PAIRS = [
  ['b', 'a', 'ba'], ['c', 'a', 'ca'], ['d', 'ê', 'dê'], ['đ', 'en', 'đen'], ['g', 'a', 'ga'],
  ['h', 'oa', 'hoa'], ['l', 'a', 'la'], ['m', 'eo', 'meo'], ['n', 'on', 'non'], ['t', 'ay', 'tay'],
];
const NO_INITIAL = [
  ['ăn', 'nhà', 'cá', 'mèo'],
  ['uống', 'bàn', 'hoa', 'chim'],
  ['em', 'bố', 'mẹ', 'cô'],
  ['ai', 'Lan', 'Mai', 'Nam'],
  ['ong', 'gà', 'vịt', 'cá'],
  ['ôm', 'tôm', 'cua', 'bò'],
  ['ước', 'mưa', 'nắng', 'gió'],
  ['yêu', 'thương', 'nhớ', 'quý'],
];
const RHYME_MULTI = [
  ['a', ['bà', 'cá'], ['mẹ', 'cô']],
  ['e', ['mẹ', 'xe'], ['bà', 'cô']],
  ['ê', ['ghế', 'kê'], ['cá', 'tủ']],
  ['i', ['bi', 'đi'], ['hoa', 'mưa']],
  ['o', ['cò', 'to'], ['cây', 'thư']],
  ['ô', ['cô', 'hô'], ['bà', 'xe']],
  ['ơ', ['mơ', 'chờ'], ['cá', 'tủ']],
  ['u', ['tủ', 'thu'], ['mẹ', 'hoa']],
  ['ư', ['thư', 'hư'], ['cô', 'bàn']],
  ['ay', ['tay', 'bay'], ['mưa', 'sông']],
  ['ây', ['cây', 'mây'], ['cá', 'nhà']],
  ['ao', ['áo', 'sao'], ['bàn', 'ghế']],
  ['an', ['bàn', 'lan'], ['cô', 'mưa']],
  ['ach', ['sách', 'sạch'], ['hoa', 'chim']],
  ['ương', ['trường', 'hương'], ['cá', 'tủ']],
  ['ông', ['sông', 'hồng'], ['mẹ', 'lá']],
  ['iên', ['biển', 'tiên'], ['bà', 'cây']],
];

const vanVaTieng = {
  single(k) {
    if (k < 18) {
      const [word, rhyme] = RHYME_WORDS[k];
      return fact(
        `Tiếng '${word}' có vần là gì?`,
        rhyme,
        `Tiếng '${word}' có vần '${rhyme}'.`,
        others(RHYMES, [rhyme], 3, k),
      );
    }
    if (k < 34) {
      const [rhyme, correct] = RHYME_POOL[k - 18];
      const wrongPool = RHYME_WORDS.filter(([, itemRhyme]) => itemRhyme !== rhyme).map(([word]) => word);
      return fact(
        `Tiếng nào dưới đây có vần '${rhyme}'?`,
        correct,
        `'${correct}' có vần '${rhyme}'.`,
        others(wrongPool, [correct], 3, k),
      );
    }
    if (k < 44) {
      const [initial, rhyme, correct] = RHYME_PAIRS[k - 34];
      return fact(
        `Ghép âm đầu '${initial}' với vần '${rhyme}' được tiếng nào?`,
        correct,
        `Ghép '${initial}' với '${rhyme}' được '${correct}'.`,
        others(RHYME_PAIRS.map(([, , word]) => word), [correct], 3, k),
      );
    }
    const group = NO_INITIAL[k - 44];
    return fact(
      `Trong các tiếng sau, tiếng nào không có âm đầu: ${group.join(', ')}?`,
      group[0],
      `'${group[0]}' chỉ gồm vần, không có âm đầu.`,
      group.slice(1),
    );
  },
  fill(k) {
    const [word, rhyme] = RHYME_WORDS[k];
    return fill(`Tiếng '${word}' có vần là ___.`, [rhyme], `Tiếng '${word}' có vần '${rhyme}'.`);
  },
  tf(k) {
    const [word, rhyme] = RHYME_WORDS[k];
    if (k % 2 === 0) {
      return tf(`Tiếng '${word}' có vần '${rhyme}'.`, true, `Đúng: '${word}' có vần '${rhyme}'.`);
    }
    const wrong = at(RHYMES.filter((item) => item !== rhyme), k);
    return tf(`Tiếng '${word}' có vần '${wrong}'.`, false, `Sai: '${word}' có vần '${rhyme}'.`);
  },
  multi(k) {
    const [rhyme, correct, wrong] = RHYME_MULTI[k];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các tiếng có vần '${rhyme}' trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `Các tiếng ${correct.join(', ')} có vần '${rhyme}'.`,
    );
  },
};

// ===== Từ chỉ sự vật =====
const PEOPLE = ['mẹ', 'bố', 'cô giáo', 'bác sĩ', 'em bé', 'anh trai', 'chị gái', 'ông', 'bà', 'bạn Lan', 'chú bộ đội', 'cô y tá', 'học sinh'];
const ANIMALS = ['mèo', 'chó', 'gà', 'cá', 'chim', 'bò', 'trâu', 'thỏ', 'vịt', 'ong', 'tôm', 'cua', 'hổ'];
const OBJECTS = ['bàn', 'ghế', 'sách', 'bút', 'cặp', 'nồi', 'chén', 'quạt', 'đèn', 'xe đạp', 'tivi', 'tủ lạnh', 'gối'];
const PLANTS = ['cây bàng', 'hoa hồng', 'cây tre', 'rau cải', 'cây xoài', 'hoa sen', 'cỏ', 'cây chuối', 'hoa cúc', 'cây mít', 'dây leo', 'mầm non', 'lá'];
const NOUN_GROUPS = [
  { label: 'người', words: PEOPLE },
  { label: 'con vật', words: ANIMALS },
  { label: 'đồ vật', words: OBJECTS },
  { label: 'cây cối', words: PLANTS },
];

const tuChiSuVat = {
  single(k) {
    const group = NOUN_GROUPS[Math.floor(k / 13)];
    const index = k % 13;
    const correct = group.words[index];
    const otherWords = NOUN_GROUPS.filter((item) => item !== group).flatMap((item) => item.words);
    const distractors = others(otherWords, [correct], 3, k);
    return fact(
      `Trong các từ sau, từ nào chỉ ${group.label}: ${[correct, ...distractors].join(', ')}?`,
      correct,
      `'${correct}' chỉ ${group.label}.`,
      distractors,
    );
  },
  fill(k) {
    const pool = [
      ...PEOPLE.slice(0, 6).map((word) => [word, 'người']),
      ...ANIMALS.slice(0, 6).map((word) => [word, 'con vật']),
      ...OBJECTS.slice(0, 5).map((word) => [word, 'đồ vật']),
      ...PLANTS.slice(0, 5).map((word) => [word, 'cây cối']),
    ];
    const [word, label] = pool[k];
    return fill(
      `Từ '${word}' chỉ loại sự vật nào? (người / con vật / đồ vật / cây cối)`,
      [label],
      `'${word}' là từ chỉ ${label}.`,
    );
  },
  tf(k) {
    const items = [
      ['mẹ', 'người'], ['mèo', 'con vật'], ['bàn', 'đồ vật'], ['cây bàng', 'cây cối'],
      ['bố', 'người'], ['chó', 'con vật'], ['ghế', 'đồ vật'], ['hoa hồng', 'cây cối'],
      ['cô giáo', 'người'], ['gà', 'con vật'], ['sách', 'đồ vật'], ['cây tre', 'cây cối'],
      ['ông', 'người'], ['cá', 'con vật'], ['bút', 'đồ vật'], ['rau cải', 'cây cối'],
      ['em bé', 'người'],
    ];
    const [word, label] = items[k];
    const trueValue = k % 2 === 0;
    const shown = trueValue ? label : NOUN_GROUPS[(NOUN_GROUPS.findIndex((item) => item.label === label) + 1) % 4].label;
    return tf(
      `Từ '${word}' chỉ ${shown}.`,
      trueValue,
      trueValue ? `Đúng: '${word}' chỉ ${label}.` : `Sai: '${word}' chỉ ${label}, không phải ${shown}.`,
    );
  },
  multi(k) {
    const group = NOUN_GROUPS[k % 4];
    const index = Math.floor(k / 4);
    const correct = [group.words[index], group.words[index + 5]];
    const otherGroup = NOUN_GROUPS[(k + 1) % 4];
    const wrong = [otherGroup.words[index], otherGroup.words[index + 5]];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các từ chỉ ${group.label} trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `Các từ ${correct.join(', ')} chỉ ${group.label}.`,
    );
  },
};

// ===== Câu đơn giản =====
const WORD_FILL = [
  ['Mẹ ___ cơm trong bếp.', 'nấu', ['quét', 'tưới', 'đọc']],
  ['Bé ___ răng trước khi đi ngủ.', 'đánh', ['rửa', 'lau', 'quét']],
  ['Chú mèo ___ chuột.', 'bắt', ['thả', 'nuôi', 'cưỡi']],
  ['Em ___ bài tập về nhà.', 'làm', ['xem', 'nghe', 'hái']],
  ['Bố ___ cây trong vườn.', 'tưới', ['nấu', 'đọc', 'may']],
  ['Cô giáo ___ bài trên bảng.', 'giảng', ['quét', 'tưới', 'cưỡi']],
  ['Bạn Lan ___ sách.', 'đọc', ['nấu', 'bơi', 'trồng']],
  ['Ông ___ trà.', 'uống', ['viết', 'quét', 'bơi']],
  ['Con chim ___ trên cành.', 'hót', ['bơi', 'chạy', 'nấu']],
  ['Đàn cá ___ dưới ao.', 'bơi', ['bay', 'hót', 'trồng']],
  ['Bà ___ áo.', 'may', ['bơi', 'hót', 'cưỡi']],
  ['Bé ___ tranh.', 'vẽ', ['nấu', 'quét', 'bơi']],
  ['Anh ___ xe đạp.', 'đi', ['hót', 'trồng', 'nấu']],
];
const INTRO_NAMES = ['Lan', 'Nam', 'Mai', 'Minh', 'Hoa', 'Hùng', 'Thảo', 'Phúc', 'Linh', 'An', 'Bình', 'Nhi', 'Vy'];
const PUNCTUATION = [
  ['Hôm nay trời đẹp', '.', 'Câu kể kết thúc bằng dấu chấm.'],
  ['Bạn có khỏe không', '?', 'Câu hỏi kết thúc bằng dấu chấm hỏi.'],
  ['Mẹ em là giáo viên', '.', 'Câu kể kết thúc bằng dấu chấm.'],
  ['Bạn tên là gì', '?', 'Câu hỏi kết thúc bằng dấu chấm hỏi.'],
  ['Lan đang đọc sách', '.', 'Câu kể kết thúc bằng dấu chấm.'],
  ['Cậu có đi học không', '?', 'Câu hỏi kết thúc bằng dấu chấm hỏi.'],
  ['Bé Mai rất ngoan', '.', 'Câu kể kết thúc bằng dấu chấm.'],
  ['Trời ơi, đẹp quá', '!', 'Câu cảm thán kết thúc bằng dấu chấm than.'],
  ['Ông đang tưới cây', '.', 'Câu kể kết thúc bằng dấu chấm.'],
  ['Ai là lớp trưởng', '?', 'Câu hỏi kết thúc bằng dấu chấm hỏi.'],
  ['Chúng em chăm chỉ học tập', '.', 'Câu kể kết thúc bằng dấu chấm.'],
  ['Ôi, cầu vồng đẹp quá', '!', 'Câu cảm thán kết thúc bằng dấu chấm than.'],
  ['Bạn thích màu gì', '?', 'Câu hỏi kết thúc bằng dấu chấm hỏi.'],
];
const WORD_ORDER = [
  [['Mẹ', 'nấu', 'cơm'], 'Mẹ nấu cơm.'],
  [['Lan', 'đọc', 'sách'], 'Lan đọc sách.'],
  [['Bố', 'tưới', 'cây'], 'Bố tưới cây.'],
  [['Bé', 'vẽ', 'tranh'], 'Bé vẽ tranh.'],
  [['Cô', 'giảng', 'bài'], 'Cô giảng bài.'],
  [['Chú mèo', 'bắt', 'chuột'], 'Chú mèo bắt chuột.'],
  [['Đàn cá', 'bơi', 'dưới ao'], 'Đàn cá bơi dưới ao.'],
  [['Chim', 'hót', 'líu lo'], 'Chim hót líu lo.'],
  [['Ông', 'uống', 'trà'], 'Ông uống trà.'],
  [['Bà', 'may', 'áo'], 'Bà may áo.'],
  [['Anh', 'đi', 'xe đạp'], 'Anh đi xe đạp.'],
  [['Bạn Mai', 'hát', 'rất hay'], 'Bạn Mai hát rất hay.'],
  [['Em bé', 'cười', 'tươi'], 'Em bé cười tươi.'],
];

function orderSentences(words, correct) {
  return [
    correct,
    `${words[1]} ${words[0]} ${words[2]}.`,
    `${words[2]} ${words[0]} ${words[1]}.`,
    `${words[0]} ${words[2]} ${words[1]}.`,
  ];
}

const cauDonGian = {
  single(k) {
    if (k < 13) {
      const [sentence, correct, wrong] = WORD_FILL[k];
      return fact(`Chọn từ thích hợp điền vào chỗ trống: "${sentence}"`, correct, `"${sentence.replace('___', correct)}"`, wrong);
    }
    if (k < 26) {
      const name = INTRO_NAMES[k - 13];
      const other = INTRO_NAMES[(k - 12) % INTRO_NAMES.length];
      const correct = `${name} là học sinh lớp 1.`;
      const wrong = [`${name} đang chơi bóng.`, `Bạn ${other} là học sinh lớp 1.`, `${name} rất vui.`];
      return fact(`Câu nào dưới đây giới thiệu ${name} là học sinh lớp 1?`, correct, `"${correct}" giới thiệu ${name}.`, wrong);
    }
    if (k < 39) {
      const [sentence, mark] = PUNCTUATION[k - 26];
      return fact(
        `Câu "${sentence}" cần dùng dấu gì ở cuối?`,
        mark,
        `${PUNCTUATION[k - 26][2]}`,
        ['.', '?', ',', '!'].filter((item) => item !== mark),
      );
    }
    const [words, correct] = WORD_ORDER[k - 39];
    return fact(
      `Sắp xếp các từ sau thành câu đúng: ${words.join(', ')}.`,
      correct,
      `Câu đúng là "${correct}"`,
      orderSentences(words, correct).slice(1),
    );
  },
  fill(k) {
    if (k < 8) {
      const items = [
        ['Bạn có khỏe không ___', '?', 'Câu hỏi dùng dấu chấm hỏi.'],
        ['Mẹ em là giáo viên ___', '.', 'Câu kể dùng dấu chấm.'],
        ['Bạn tên là gì ___', '?', 'Câu hỏi dùng dấu chấm hỏi.'],
        ['Lan đang đọc sách ___', '.', 'Câu kể dùng dấu chấm.'],
        ['Ôi, đẹp quá ___', '!', 'Câu cảm thán dùng dấu chấm than.'],
        ['Cậu có đi học không ___', '?', 'Câu hỏi dùng dấu chấm hỏi.'],
        ['Bé Mai rất ngoan ___', '.', 'Câu kể dùng dấu chấm.'],
        ['Trời ơi, nóng quá ___', '!', 'Câu cảm thán dùng dấu chấm than.'],
      ];
      const [prompt, answer, why] = items[k];
      return fill(`Điền dấu câu thích hợp vào cuối câu: "${prompt}"`, [answer], why);
    }
    if (k < 16) {
      const items = [
        ['Mẹ ___ cơm.', 'nấu'], ['Bé ___ răng.', 'đánh'], ['Chú mèo ___ chuột.', 'bắt'],
        ['Em ___ bài tập.', 'làm'], ['Bố ___ cây.', 'tưới'], ['Cô giáo ___ bài.', 'giảng'],
        ['Bạn Lan ___ sách.', 'đọc'], ['Ông ___ trà.', 'uống'],
      ];
      const [prompt, answer] = items[k - 8];
      return fill(`Điền từ còn thiếu: "${prompt}"`, [answer], `Từ còn thiếu là "${answer}".`);
    }
    const subjects = ['Bạn Lan', 'Bạn Nam', 'Cô giáo', 'Bố em', 'Mẹ em', 'Anh em'];
    const subject = subjects[k - 16];
    return fill(`Điền từ còn thiếu: "${subject} ___ học sinh."`, ['là'], `"${subject} là học sinh."`);
  },
  tf(k) {
    const items = [
      ["Câu 'Mẹ nấu cơm.' là câu kể.", true, 'Đúng, đây là câu kể.'],
      ["Câu 'Bạn có khỏe không?' là câu hỏi.", true, 'Đúng, đây là câu hỏi.'],
      ['Cuối câu kể dùng dấu chấm hỏi.', false, 'Sai, cuối câu kể dùng dấu chấm.'],
      ['Cuối câu hỏi dùng dấu chấm hỏi.', true, 'Đúng, câu hỏi dùng dấu chấm hỏi.'],
      ["Câu 'Lan là học sinh lớp 1.' là câu giới thiệu.", true, 'Đúng, câu giới thiệu có dạng Ai là gì.'],
      ["Câu 'Bé Mai vẽ tranh.' là câu giới thiệu.", false, 'Sai, đây là câu kể hoạt động.'],
      ["Câu 'Ôi, đẹp quá!' dùng dấu chấm than.", true, 'Đúng, câu cảm thán dùng dấu chấm than.'],
      ["Câu 'Bố tưới cây.' là câu hỏi.", false, 'Sai, đây là câu kể.'],
      ['Câu kể thường kết thúc bằng dấu chấm.', true, 'Đúng, câu kể kết thúc bằng dấu chấm.'],
      ["Câu 'Bạn tên là gì?' là câu kể.", false, 'Sai, đây là câu hỏi.'],
      ["Câu 'Chim hót líu lo.' là câu kể.", true, 'Đúng, đây là câu kể.'],
      ["Câu 'Mẹ may áo.' là câu hỏi.", false, 'Sai, đây là câu kể.'],
      ["Câu 'Em bé cười tươi.' kể về em bé.", true, 'Đúng, câu kể về em bé.'],
      ["Câu 'Đàn cá bơi dưới ao.' kể về đàn cá.", true, 'Đúng, câu kể về đàn cá.'],
      ["Câu 'Bà uống trà.' kể về việc bà uống trà.", true, 'Đúng, câu kể về việc bà uống trà.'],
      ["Câu 'Bạn thích màu gì?' là câu kể.", false, 'Sai, đây là câu hỏi.'],
      ['Dấu phẩy dùng để kết thúc câu.', false, 'Sai, dấu phẩy dùng để ngăn cách các bộ phận trong câu.'],
    ];
    const [statement, value, why] = items[k];
    return tf(statement, value, why);
  },
  multi(k) {
    const items = [
      ['câu giới thiệu', ['Lan là học sinh lớp 1.', 'Bố em là bác sĩ.'], ['Lan đang đọc sách.', 'Bố em tưới cây.']],
      ['câu giới thiệu', ['Mẹ em là giáo viên.', 'Nam là lớp trưởng.'], ['Mẹ em nấu cơm.', 'Nam chơi bóng.']],
      ['câu kể', ['Bé Mai vẽ tranh.', 'Chú mèo bắt chuột.'], ['Bạn tên là gì?', 'Ôi, đẹp quá!']],
      ['câu kể', ['Bố tưới cây.', 'Chim hót líu lo.'], ['Bạn có khỏe không?', 'Ôi, đẹp quá!']],
      ['câu hỏi', ['Bạn tên là gì?', 'Cậu có đi học không?'], ['Mẹ nấu cơm.', 'Bé Mai rất ngoan.']],
      ['câu hỏi', ['Ai là lớp trưởng?', 'Bạn thích màu gì?'], ['Lan đọc sách.', 'Trời hôm nay đẹp.']],
      ['câu dùng dấu chấm đúng', ['Hôm nay trời đẹp.', 'Mẹ em là giáo viên.'], ['Bạn có khỏe không?', 'Ôi, đẹp quá!']],
      ['câu dùng dấu chấm than đúng', ['Ôi, đẹp quá!', 'Trời ơi, nóng quá!'], ['Em đi học.', 'Bạn tên là gì?']],
      ['câu dùng dấu chấm hỏi đúng', ['Bạn tên là gì?', 'Cậu có đi học không?'], ['Em đi học.', 'Ôi, đẹp quá!']],
      ['câu giới thiệu', ['Cô giáo là người dạy học.', 'Bác sĩ là người chữa bệnh.'], ['Cô giáo giảng bài.', 'Bác sĩ khám bệnh.']],
      ['câu kể hoạt động', ['Mẹ quét nhà.', 'Bà may áo.'], ['Bà có khỏe không?', 'Ôi, vui quá!']],
      ['câu giới thiệu', ['Hùng là anh trai em.', 'Mai là chị gái em.'], ['Hùng đang học bài.', 'Mai đang nấu cơm.']],
      ['câu kể', ['Đàn cá bơi dưới ao.', 'Ông uống trà.'], ['Đàn cá có bơi không?', 'Ông ơi, trà ngon quá!']],
      ['câu hỏi', ['Trời hôm nay có mưa không?', 'Mẹ đã về chưa?'], ['Trời hôm nay mưa to.', 'Mẹ đang nấu cơm.']],
      ['câu dùng dấu chấm đúng', ['Chúng em chăm chỉ học tập.', 'Lan viết văn rất hay.'], ['Chúng em có chăm không?', 'Lan ơi, hay quá!']],
      ['câu giới thiệu', ['Em là học sinh lớp 1.', 'Chị em là y tá.'], ['Em đang học bài.', 'Chị em đang nấu ăn.']],
      ['câu kể', ['Bé Hà hát rất hay.', 'Cây bàng tỏa bóng mát.'], ['Bé Hà có hát không?', 'Cây bàng ơi, mát quá!']],
    ];
    const [label, correct, wrong] = items[k];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Trong các câu sau, chọn tất cả các ${label}: ${all.join(' ')}`,
      correct,
      wrong,
      `Các ${label} là: ${correct.join(' ')}`,
    );
  },
};

// ===== Đọc hiểu đoạn ngắn =====
const READ_1 = [
  {
    text: 'Sáng chủ nhật, Lan ra vườn tưới hoa. Lan mặc áo đỏ, tay cầm bình nước màu xanh. Những bông hoa hồng nở thắm.',
    qa: [
      ['Ai ra vườn tưới hoa?', 'Lan', ['Mẹ Lan', 'Bạn Mai', 'Ông Lan']],
      ['Lan tưới hoa vào lúc nào?', 'Sáng chủ nhật', ['Chiều thứ bảy', 'Sáng thứ hai', 'Tối chủ nhật']],
      ['Lan tưới hoa ở đâu?', 'Trong vườn', ['Trên sân trường', 'Bên bờ sông', 'Trong nhà']],
      ['Lan làm gì trong vườn?', 'Tưới hoa', ['Nhổ cỏ', 'Hái quả', 'Tưới rau']],
      ['Áo của Lan có màu gì?', 'Màu đỏ', ['Màu xanh', 'Màu vàng', 'Màu hồng']],
      ['Bình nước của Lan màu gì?', 'Màu xanh', ['Màu đỏ', 'Màu tím', 'Màu trắng']],
      ['Những bông hoa trong vườn màu gì?', 'Màu hồng', ['Màu đỏ', 'Màu vàng', 'Màu trắng']],
      ['Lan cầm gì trên tay?', 'Bình nước', ['Cuốc', 'Giỏ hoa', 'Chiếc ô']],
      ['Loài hoa nào nở thắm trong vườn?', 'Hoa hồng', ['Hoa cúc', 'Hoa sen', 'Hoa mai']],
      ['Buổi sáng chủ nhật, Lan ra đâu?', 'Ra vườn', ['Ra sông', 'Ra trường', 'Ra chợ']],
      ['Lan tưới hoa vào ngày nào?', 'Chủ nhật', ['Thứ hai', 'Thứ bảy', 'Thứ ba']],
    ],
  },
  {
    text: 'Trong giờ ra chơi, các bạn chơi nhảy dây dưới gốc cây bàng. Nam và Minh đá cầu. Lan ngồi đọc truyện trên ghế đá. Tiếng cười vang khắp sân trường.',
    qa: [
      ['Giờ ra chơi, các bạn chơi trò gì dưới gốc cây bàng?', 'Nhảy dây', ['Đá cầu', 'Đọc truyện', 'Đá bóng']],
      ['Các bạn chơi nhảy dây ở đâu?', 'Dưới gốc cây bàng', ['Trên ghế đá', 'Trong lớp học', 'Bên bờ ao']],
      ['Ai đá cầu?', 'Nam và Minh', ['Lan và Mai', 'Nam và Lan', 'Minh và Lan']],
      ['Lan làm gì trong giờ ra chơi?', 'Đọc truyện', ['Nhảy dây', 'Đá cầu', 'Hát']],
      ['Lan ngồi ở đâu?', 'Trên ghế đá', ['Dưới gốc bàng', 'Trong lớp', 'Trên sân khấu']],
      ['Tiếng gì vang khắp sân trường?', 'Tiếng cười', ['Tiếng hát', 'Tiếng trống', 'Tiếng giảng bài']],
      ['Nam và Minh chơi trò gì?', 'Đá cầu', ['Nhảy dây', 'Đọc truyện', 'Đá bóng']],
      ['Ai ngồi đọc truyện?', 'Lan', ['Nam', 'Minh', 'Mai']],
      ['Các bạn chơi nhảy dây vào lúc nào?', 'Giờ ra chơi', ['Giờ học', 'Buổi tối', 'Sáng chủ nhật']],
      ['Lan ngồi trên đồ vật gì?', 'Ghế đá', ['Ghế gỗ', 'Chiếu', 'Bàn học']],
      ['Sân trường hôm đó thế nào?', 'Rộn ràng tiếng cười', ['Im lặng', 'Vắng vẻ', 'Mưa to']],
    ],
  },
  {
    text: 'Bé Mai có một chú thỏ trắng. Mỗi sáng, bé cho thỏ ăn cà rốt. Chú thỏ có đôi tai dài và đôi mắt đỏ.',
    qa: [
      ['Bé Mai có con gì?', 'Chú thỏ trắng', ['Chú mèo', 'Chú chó', 'Chú gà']],
      ['Chú thỏ của bé Mai có màu gì?', 'Màu trắng', ['Màu nâu', 'Màu đen', 'Màu vàng']],
      ['Mỗi sáng, bé Mai làm gì?', 'Cho thỏ ăn', ['Tắm cho thỏ', 'Dắt thỏ đi chơi', 'Vuốt ve thỏ']],
      ['Thỏ ăn gì?', 'Cà rốt', ['Rau muống', 'Cỏ khô', 'Khoai lang']],
      ['Đôi tai của thỏ thế nào?', 'Dài', ['Ngắn', 'To', 'Nhỏ']],
      ['Mắt thỏ có màu gì?', 'Màu đỏ', ['Màu đen', 'Màu xanh', 'Màu nâu']],
      ['Ai cho thỏ ăn?', 'Bé Mai', ['Mẹ bé Mai', 'Ông bé Mai', 'Bạn Lan']],
      ['Bé Mai cho thỏ ăn vào lúc nào?', 'Mỗi sáng', ['Mỗi trưa', 'Mỗi chiều', 'Mỗi tối']],
      ['Ngoài đôi tai dài, thỏ còn có gì màu đỏ?', 'Đôi mắt', ['Bộ lông', 'Cái đuôi', 'Đôi chân']],
      ['Bé Mai chăm sóc thỏ vào lúc nào trong ngày?', 'Buổi sáng', ['Buổi trưa', 'Buổi chiều', 'Buổi tối']],
    ],
  },
  {
    text: 'Chiều nay, bố chở Hùng đi thả diều trên cánh đồng. Cánh diều màu vàng bay cao giữa bầu trời xanh. Hùng vui vẻ reo lên.',
    qa: [
      ['Chiều nay, bố chở Hùng đi đâu?', 'Đi thả diều', ['Đi câu cá', 'Đi học', 'Đi chợ']],
      ['Hai bố con thả diều ở đâu?', 'Trên cánh đồng', ['Bên bờ sông', 'Trong công viên', 'Trên sân trường']],
      ['Cánh diều có màu gì?', 'Màu vàng', ['Màu đỏ', 'Màu xanh', 'Màu trắng']],
      ['Bầu trời hôm đó màu gì?', 'Màu xanh', ['Màu xám', 'Màu vàng', 'Màu đỏ']],
      ['Ai chở Hùng đi thả diều?', 'Bố', ['Mẹ', 'Anh trai', 'Ông']],
      ['Ai reo lên vui vẻ?', 'Hùng', ['Bố', 'Mẹ', 'Bạn Nam']],
      ['Cánh diều bay ở đâu?', 'Giữa bầu trời', ['Trên mái nhà', 'Dưới mặt đất', 'Trên cành cây']],
      ['Hùng cảm thấy thế nào?', 'Vui vẻ', ['Buồn bã', 'Lo lắng', 'Tức giận']],
      ['Cánh diều bay cao hay thấp?', 'Bay cao', ['Bay thấp', 'Bay sát mặt đất', 'Không bay']],
      ['Bố chở Hùng đi thả diều vào lúc nào?', 'Chiều nay', ['Sáng nay', 'Tối nay', 'Trưa nay']],
    ],
  },
  {
    text: 'Trong lớp, cô giáo đang giảng bài. Các bạn học sinh chăm chú nghe giảng. Bạn Hoa giơ tay phát biểu. Cô giáo khen Hoa ngoan.',
    qa: [
      ['Cô giáo đang làm gì?', 'Giảng bài', ['Đọc truyện', 'Chấm bài', 'Viết bảng']],
      ['Các bạn học sinh làm gì?', 'Nghe giảng', ['Chơi đùa', 'Hát', 'Vẽ tranh']],
      ['Ai giơ tay phát biểu?', 'Bạn Hoa', ['Cô giáo', 'Bạn Lan', 'Bạn Nam']],
      ['Cô giáo khen ai?', 'Bạn Hoa', ['Bạn Lan', 'Bạn Nam', 'Cả lớp']],
      ['Cô giáo khen Hoa thế nào?', 'Ngoan', ['Giỏi toán', 'Hát hay', 'Chăm làm']],
      ['Việc các bạn nghe giảng diễn ra ở đâu?', 'Trong lớp', ['Sân trường', 'Thư viện', 'Ngoài vườn']],
      ['Ai đang giảng bài?', 'Cô giáo', ['Bạn Hoa', 'Bạn Nam', 'Cô thủ thư']],
      ['Bạn Hoa đã làm gì?', 'Giơ tay phát biểu', ['Đứng lên hát', 'Ra ngoài chơi', 'Ngủ gật']],
      ['Các bạn nghe giảng với thái độ thế nào?', 'Chăm chú', ['Lơ đãng', 'Buồn ngủ', 'Nghịch ngợm']],
      ['Vì sao cô giáo khen Hoa ngoan?', 'Vì Hoa giơ tay phát biểu', ['Vì Hoa hát hay', 'Vì Hoa đi học muộn', 'Vì Hoa nói chuyện']],
    ],
  },
];
const READ_TEXTS = READ_1.map((item) => item.text);
const READ_SINGLES = READ_1.flatMap((passage) => passage.qa.map((qa) => [passage.text, ...qa]));

const docHieu1 = {
  single(k) {
    const [text, question, answer, wrong] = READ_SINGLES[k];
    return fact(`${text} ${question}`, answer, `Theo đoạn văn, đáp án là "${answer}".`, wrong);
  },
  fill(k) {
    const items = [
      ['Sáng chủ nhật, Lan ra vườn tưới ___.', 'hoa', 'Lan tưới hoa.'],
      ['Lan mặc áo màu ___.', 'đỏ', 'Lan mặc áo đỏ.'],
      ['Bình nước của Lan màu ___.', 'xanh', 'Bình nước màu xanh.'],
      ['Những bông hoa hồng nở ___.', 'thắm', 'Hoa hồng nở thắm.'],
      ['Lan ra vườn vào buổi ___.', 'sáng', 'Lan ra vườn vào buổi sáng.'],
      ['Các bạn chơi nhảy dây dưới gốc cây ___.', 'bàng', 'Các bạn chơi dưới gốc cây bàng.'],
      ['Nam và Minh ___ cầu.', 'đá', 'Nam và Minh đá cầu.'],
      ['Lan ngồi đọc truyện trên ___ đá.', 'ghế', 'Lan ngồi trên ghế đá.'],
      ['Tiếng ___ vang khắp sân trường.', 'cười', 'Tiếng cười vang khắp sân trường.'],
      ['Giờ ra chơi, các bạn chơi ___ dây.', 'nhảy', 'Các bạn chơi nhảy dây.'],
      ['Bé Mai có một chú thỏ ___.', 'trắng', 'Bé Mai có chú thỏ trắng.'],
      ['Mỗi sáng, bé cho thỏ ăn ___.', 'cà rốt', 'Thỏ ăn cà rốt.'],
      ['Thỏ có đôi tai ___.', 'dài', 'Thỏ có đôi tai dài.'],
      ['Mắt thỏ màu ___.', 'đỏ', 'Mắt thỏ màu đỏ.'],
      ['Bố chở Hùng đi thả ___ trên cánh đồng.', 'diều', 'Bố chở Hùng đi thả diều.'],
      ['Cánh diều màu ___ bay cao.', 'vàng', 'Cánh diều màu vàng.'],
      ['Bầu trời màu ___.', 'xanh', 'Bầu trời màu xanh.'],
      ['Hùng vui vẻ ___ lên.', 'reo', 'Hùng reo lên.'],
      ['Trong lớp, cô giáo đang ___ bài.', 'giảng', 'Cô giáo giảng bài.'],
      ['Các bạn học sinh chăm chú ___ giảng.', 'nghe', 'Các bạn nghe giảng.'],
      ['Bạn Hoa giơ tay ___ biểu.', 'phát', 'Bạn Hoa giơ tay phát biểu.'],
      ['Cô giáo khen Hoa ___.', 'ngoan', 'Cô giáo khen Hoa ngoan.'],
    ];
    const texts = [
      ...Array(5).fill(READ_TEXTS[0]),
      ...Array(5).fill(READ_TEXTS[1]),
      ...Array(4).fill(READ_TEXTS[2]),
      ...Array(4).fill(READ_TEXTS[3]),
      ...Array(4).fill(READ_TEXTS[4]),
    ];
    const [prompt, answer, why] = items[k];
    return fill(`${texts[k]} ${prompt}`, [answer], why);
  },
  tf(k) {
    const items = [
      ['Lan ra vườn tưới hoa vào sáng chủ nhật.', true, 'Đúng với đoạn văn thứ nhất.'],
      ['Lan mặc áo màu xanh.', false, 'Sai: Lan mặc áo màu đỏ.'],
      ['Bình nước của Lan màu xanh.', true, 'Đúng với đoạn văn thứ nhất.'],
      ['Hoa trong vườn là hoa cúc.', false, 'Sai: hoa trong vườn là hoa hồng.'],
      ['Nam và Minh đá cầu trong giờ ra chơi.', true, 'Đúng với đoạn văn thứ hai.'],
      ['Lan chơi nhảy dây cùng các bạn.', false, 'Sai: Lan ngồi đọc truyện.'],
      ['Lan ngồi đọc truyện trên ghế đá.', true, 'Đúng với đoạn văn thứ hai.'],
      ['Sân trường im lặng, không có tiếng cười.', false, 'Sai: tiếng cười vang khắp sân trường.'],
      ['Bé Mai có một chú thỏ trắng.', true, 'Đúng với đoạn văn thứ ba.'],
      ['Thỏ ăn cà rốt vào mỗi sáng.', true, 'Đúng với đoạn văn thứ ba.'],
      ['Thỏ có đôi tai ngắn.', false, 'Sai: thỏ có đôi tai dài.'],
      ['Bố chở Hùng đi thả diều trên cánh đồng.', true, 'Đúng với đoạn văn thứ tư.'],
      ['Cánh diều màu đỏ.', false, 'Sai: cánh diều màu vàng.'],
      ['Hùng buồn bã khi thả diều.', false, 'Sai: Hùng vui vẻ reo lên.'],
      ['Cô giáo đang giảng bài trong lớp.', true, 'Đúng với đoạn văn thứ năm.'],
      ['Bạn Hoa giơ tay phát biểu.', true, 'Đúng với đoạn văn thứ năm.'],
      ['Cô giáo khen Hoa vì Hoa hát hay.', false, 'Sai: cô khen Hoa ngoan vì Hoa phát biểu.'],
    ];
    const [statement, value, why] = items[k];
    return tf(statement, value, why);
  },
  multi(k) {
    const items = [
      ['nhân vật Lan', ['Lan ra vườn tưới hoa.', 'Lan mặc áo đỏ.'], ['Lan mặc áo xanh.', 'Lan ra vườn hái quả.']],
      ['cảnh buổi sáng', ['Trời sáng chủ nhật.', 'Hoa hồng nở thắm.'], ['Trời mưa to.', 'Hoa đã tàn.']],
      ['màu sắc trong đoạn văn', ['Áo Lan màu đỏ.', 'Bình nước màu xanh.'], ['Áo Lan màu vàng.', 'Bình nước màu tím.']],
      ['đồ vật Lan cầm', ['Lan cầm bình nước.', 'Bình nước màu xanh.'], ['Lan cầm chiếc ô.', 'Lan cầm giỏ hoa.']],
      ['giờ ra chơi', ['Các bạn chơi nhảy dây.', 'Sân trường rộn tiếng cười.'], ['Các bạn ngồi học bài.', 'Sân trường vắng lặng.']],
      ['các trò chơi', ['Nam và Minh đá cầu.', 'Các bạn chơi nhảy dây.'], ['Lan đá cầu.', 'Các bạn đá bóng.']],
      ['bạn Lan', ['Lan ngồi trên ghế đá.', 'Lan đọc truyện.'], ['Lan chơi nhảy dây.', 'Lan đá cầu.']],
      ['sân trường', ['Sân trường có cây bàng.', 'Sân trường vang tiếng cười.'], ['Sân trường không có cây nào.', 'Sân trường im lặng.']],
      ['chú thỏ', ['Thỏ có bộ lông trắng.', 'Thỏ có đôi tai dài.'], ['Thỏ có bộ lông đen.', 'Thỏ có đôi tai ngắn.']],
      ['bữa ăn của thỏ', ['Thỏ ăn cà rốt.', 'Bé Mai cho thỏ ăn mỗi sáng.'], ['Thỏ ăn cá.', 'Bé Mai cho thỏ ăn mỗi tối.']],
      ['đặc điểm của thỏ', ['Thỏ có mắt đỏ.', 'Thỏ có tai dài.'], ['Thỏ có mắt xanh.', 'Thỏ có đuôi dài.']],
      ['chuyến đi thả diều', ['Bố chở Hùng đi thả diều.', 'Hai bố con thả diều trên cánh đồng.'], ['Mẹ chở Hùng đi thả diều.', 'Hai bố con thả diều trong công viên.']],
      ['cánh diều', ['Cánh diều màu vàng.', 'Cánh diều bay cao.'], ['Cánh diều màu đỏ.', 'Cánh diều bay thấp.']],
      ['cảm xúc của Hùng', ['Hùng vui vẻ.', 'Hùng reo lên.'], ['Hùng buồn bã.', 'Hùng khóc.']],
      ['giờ học trong lớp', ['Cô giáo giảng bài.', 'Học sinh chăm chú nghe.'], ['Cô giáo hát.', 'Học sinh ngủ gật.']],
      ['bạn Hoa', ['Hoa giơ tay phát biểu.', 'Hoa được cô khen ngoan.'], ['Hoa nói chuyện riêng.', 'Hoa bị cô nhắc nhở.']],
      ['cô giáo', ['Cô giáo đang giảng bài.', 'Cô giáo khen Hoa ngoan.'], ['Cô giáo đang chấm bài.', 'Cô giáo phê bình Hoa.']],
    ];
    const [focus, correct, wrong] = items[k];
    const passage = READ_1[Math.min(4, Math.floor(k / 4))];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Đọc đoạn văn: "${passage.text}" Chọn tất cả các ý đúng về ${focus}: ${all.join(' ')}`,
      correct,
      wrong,
      `Các ý đúng về ${focus} là: ${correct.join(' ')}`,
    );
  },
};

export const VIETNAMESE_GRADE_1 = {
  'tieng-viet-1-chu-cai': chuCai,
  'tieng-viet-1-van-va-tieng': vanVaTieng,
  'tieng-viet-1-tu-chi-su-vat': tuChiSuVat,
  'tieng-viet-1-cau-don-gian': cauDonGian,
  'tieng-viet-1-doc-hieu': docHieu1,
};
