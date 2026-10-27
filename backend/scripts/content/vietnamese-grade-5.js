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

// ===== Từ đồng nghĩa, trái nghĩa =====
const SYNONYM_GROUPS = [
  ['đẹp', ['xinh', 'xinh đẹp', 'xinh xắn']],
  ['to', ['lớn', 'to lớn', 'khổng lồ']],
  ['nhỏ', ['bé', 'nhỏ bé', 'tí hon']],
  ['nhanh', ['mau', 'nhanh nhẹn', 'mau lẹ']],
  ['chậm', ['chậm chạp', 'chầm chậm', 'rề rà']],
  ['vui', ['mừng', 'vui vẻ', 'phấn khởi']],
  ['buồn', ['sầu', 'buồn bã', 'ủ rũ']],
  ['khỏe', ['mạnh', 'khỏe mạnh', 'cường tráng']],
  ['thông minh', ['sáng dạ', 'giỏi giang', 'nhanh trí']],
  ['chăm chỉ', ['siêng năng', 'cần mẫn', 'chịu khó']],
  ['lười biếng', ['lười nhác', 'biếng nhác', 'nhác']],
  ['dũng cảm', ['gan dạ', 'can đảm', 'can trường']],
  ['sợ hãi', ['khiếp sợ', 'run sợ', 'hoảng sợ']],
  ['yêu', ['thương', 'quý', 'mến']],
  ['ghét', ['căm', 'thù', 'căm ghét']],
  ['yên tĩnh', ['im lặng', 'vắng lặng', 'tĩnh lặng']],
  ['ồn ào', ['náo nhiệt', 'huyên náo', 'rộn ràng']],
  ['sạch sẽ', ['sạch', 'sạch bong', 'tinh tươm']],
];
const ANTONYM_PAIRS = [
  ['đẹp', 'xấu'], ['to', 'nhỏ'], ['nhanh', 'chậm'], ['vui', 'buồn'], ['khỏe', 'yếu'],
  ['thông minh', 'dốt nát'], ['chăm chỉ', 'lười biếng'], ['dũng cảm', 'nhút nhát'], ['yêu', 'ghét'],
  ['yên tĩnh', 'ồn ào'], ['sạch', 'bẩn'], ['giàu', 'nghèo'], ['cao', 'thấp'], ['dài', 'ngắn'],
  ['nóng', 'lạnh'], ['sáng', 'tối'], ['xa', 'gần'], ['nặng', 'nhẹ'],
];
const ALL_SYNONYMS = SYNONYM_GROUPS.flatMap(([, words]) => words);
const ALL_ANTONYMS = ANTONYM_PAIRS.map(([, word]) => word);

const dongNghiaTraiNghia = {
  single(k) {
    if (k < 18) {
      const [word, synonyms] = SYNONYM_GROUPS[k];
      const correct = synonyms[0];
      return fact(
        `Từ nào dưới đây đồng nghĩa với từ '${word}'?`,
        correct,
        `'${correct}' đồng nghĩa với '${word}'.`,
        others(ALL_SYNONYMS, [word, ...synonyms], 3, k),
      );
    }
    if (k < 36) {
      const [word, correct] = ANTONYM_PAIRS[k - 18];
      return fact(
        `Từ nào dưới đây trái nghĩa với từ '${word}'?`,
        correct,
        `'${correct}' trái nghĩa với '${word}'.`,
        others(ALL_ANTONYMS, [word, correct], 3, k),
      );
    }
    const [word, correct] = ANTONYM_PAIRS[k - 36];
    return fact(
      `Từ nào có nghĩa trái ngược với từ '${word}'?`,
      correct,
      `'${correct}' có nghĩa trái ngược với '${word}'.`,
      others(ALL_ANTONYMS, [word, correct], 3, k),
    );
  },
  fill(k) {
    if (k < 11) {
      const [word, synonyms] = SYNONYM_GROUPS[k];
      return fill(`Từ đồng nghĩa với '${word}' là ___.`, synonyms, `Các từ đồng nghĩa với '${word}': ${synonyms.join(', ')}.`);
    }
    const [word, answer] = ANTONYM_PAIRS[k - 11];
    return fill(`Từ trái nghĩa với '${word}' là ___.`, [answer], `'${answer}' trái nghĩa với '${word}'.`);
  },
  tf(k) {
    const synonymMode = k % 2 === 0;
    if (synonymMode) {
      const [word, synonyms] = SYNONYM_GROUPS[k % 18];
      const truePair = k % 4 === 0;
      if (truePair) {
        return tf(
          `Từ '${word}' và '${synonyms[0]}' là hai từ đồng nghĩa.`,
          true,
          `Đúng: '${word}' và '${synonyms[0]}' đồng nghĩa với nhau.`,
        );
      }
      const [otherWord, otherAntonym] = ANTONYM_PAIRS[k % 18];
      return tf(
        `Từ '${otherWord}' và '${otherAntonym}' là hai từ đồng nghĩa.`,
        false,
        `Sai: '${otherWord}' và '${otherAntonym}' là hai từ trái nghĩa.`,
      );
    }
    const [word, antonym] = ANTONYM_PAIRS[k % 18];
    const truePair = k % 4 === 1;
    if (truePair) {
      return tf(
        `Từ '${word}' và '${antonym}' là hai từ trái nghĩa.`,
        true,
        `Đúng: '${word}' và '${antonym}' trái nghĩa với nhau.`,
      );
    }
    const [otherWord, synonyms] = SYNONYM_GROUPS[k % 18];
    return tf(
      `Từ '${otherWord}' và '${synonyms[0]}' là hai từ trái nghĩa.`,
      false,
      `Sai: '${otherWord}' và '${synonyms[0]}' là hai từ đồng nghĩa.`,
    );
  },
  multi(k) {
    const [word, synonyms] = SYNONYM_GROUPS[k];
    const correct = synonyms.slice(0, 2);
    const otherGroup = SYNONYM_GROUPS[(k + 5) % SYNONYM_GROUPS.length];
    const wrong = otherGroup[1].slice(0, 2);
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các từ đồng nghĩa với '${word}' trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `Các từ ${correct.join(', ')} đồng nghĩa với '${word}'.`,
    );
  },
};

// ===== Đại từ và quan hệ từ =====
const PRONOUN_SENTENCES = [
  ['Tôi thích đọc sách.', 'Tôi'],
  ['Nó đang chơi ngoài sân.', 'Nó'],
  ['Chúng tôi cùng nhau dọn lớp.', 'Chúng tôi'],
  ['Họ là học sinh lớp 5A.', 'Họ'],
  ['Cô ấy hát rất hay.', 'Cô ấy'],
  ['Anh ấy là bác sĩ.', 'Anh ấy'],
  ['Ông ấy đang đọc báo.', 'Ông ấy'],
  ['Bà ấy nấu ăn rất ngon.', 'Bà ấy'],
  ['Chúng em yêu quý cô giáo.', 'Chúng em'],
  ['Các bạn ấy chơi rất vui.', 'Các bạn ấy'],
  ['Mình thích màu xanh.', 'Mình'],
  ['Chúng ta cùng cố gắng nhé.', 'Chúng ta'],
  ['Bạn ấy học rất giỏi.', 'Bạn ấy'],
  ['Chị ấy làm y tá.', 'Chị ấy'],
  ['Chú ấy là bộ đội.', 'Chú ấy'],
  ['Họ đã đến thăm trường em.', 'Họ'],
  ['Nó có bộ lông màu vàng.', 'Nó'],
  ['Chúng tôi đang tập thể dục.', 'Chúng tôi'],
];
const QHT_SENTENCES = [
  ['Vì trời mưa, em mang áo mưa.', 'Vì'],
  ['Lan học giỏi nhờ chăm chỉ.', 'nhờ'],
  ['Tôi đi học bằng xe đạp.', 'bằng'],
  ['Cái bàn này làm bằng gỗ.', 'bằng'],
  ['Bố mua cho em một quyển sách.', 'cho'],
  ['Mẹ nấu cơm với cá.', 'với'],
  ['Em thích màu xanh và màu đỏ.', 'và'],
  ['Bạn Lan và bạn Mai đều giỏi.', 'và'],
  ['Em không đi chơi mà ở nhà học bài.', 'mà'],
  ['Em vẫn đi học dù trời mưa.', 'dù'],
  ['Trời mưa nên em ở nhà.', 'nên'],
  ['Em ở nhà để làm bài tập.', 'để'],
  ['Cuốn sách này của Lan.', 'của'],
  ['Cây bút này của tôi.', 'của'],
  ['Em nói chuyện với bạn.', 'với'],
  ['Bạn ấy giỏi về toán.', 'về'],
  ['Em thích đọc truyện như bạn Nam.', 'như'],
];
const PLAIN_WORDS = ['sách', 'học', 'sân', 'đẹp', 'chạy', 'bàn', 'mưa', 'hoa', 'nắng', 'gió', 'cây', 'nhà', 'xe', 'bút', 'vở', 'cơm', 'trà', 'chim'];
const PRONOUN_REPLACE = [
  ['Lan học giỏi.', 'Bạn ấy được cô khen.', 'Bạn ấy', 'Lan', ['Mai', 'Nam', 'Hoa']],
  ['Con mèo đang ngủ.', 'Nó rất lười.', 'Nó', 'Con mèo', ['Con chó', 'Con gà', 'Con cá']],
  ['Bố em là bác sĩ.', 'Ông ấy làm việc ở bệnh viện.', 'Ông ấy', 'Bố em', ['Ông nội', 'Anh trai', 'Chú em']],
  ['Mẹ em là giáo viên.', 'Bà ấy dạy lớp 5A.', 'Bà ấy', 'Mẹ em', ['Cô giáo', 'Bà nội', 'Chị gái']],
  ['Nam và Minh là bạn thân.', 'Họ cùng học lớp 5B.', 'Họ', 'Nam và Minh', ['Lan và Mai', 'Bố và mẹ', 'Cô và trò']],
  ['Cây bàng rất cao.', 'Nó tỏa bóng mát cả sân.', 'Nó', 'Cây bàng', ['Cây xoài', 'Cây tre', 'Cây mít']],
  ['Chị em làm y tá.', 'Chị ấy rất dịu dàng.', 'Chị ấy', 'Chị em', ['Mẹ em', 'Cô em', 'Bà em']],
  ['Bạn Mai hát rất hay.', 'Bạn ấy được cả lớp khen.', 'Bạn ấy', 'Bạn Mai', ['Bạn Lan', 'Bạn Hoa', 'Bạn Nhi']],
  ['Đàn cá bơi dưới ao.', 'Chúng bơi rất nhanh.', 'Chúng', 'Đàn cá', ['Đàn chim', 'Đàn vịt', 'Đàn bò']],
];
const RELATIONS = [
  ['Vì trời mưa nên em đi học muộn.', 'Vì ... nên', 'nguyên nhân – kết quả'],
  ['Tuy nhà nghèo nhưng bạn ấy học rất giỏi.', 'Tuy ... nhưng', 'tương phản'],
  ['Nếu em chăm chỉ thì em sẽ tiến bộ.', 'Nếu ... thì', 'điều kiện – kết quả'],
  ['Không những Lan học giỏi mà bạn ấy còn hát hay.', 'Không những ... mà', 'tăng tiến'],
  ['Em học chăm để đạt kết quả tốt.', 'để', 'mục đích'],
  ['Vì trời lạnh nên em mặc áo ấm.', 'Vì ... nên', 'nguyên nhân – kết quả'],
  ['Dù trời mưa nhưng em vẫn đến lớp.', 'Dù ... nhưng', 'tương phản'],
  ['Hễ trời nắng thì chúng em đi cắm trại.', 'Hễ ... thì', 'điều kiện – kết quả'],
];
const RELATION_LABELS = ['nguyên nhân – kết quả', 'tương phản', 'điều kiện – kết quả', 'tăng tiến', 'mục đích'];

const daiTuQuanHeTu = {
  single(k) {
    if (k < 18) {
      const [sentence, correct] = PRONOUN_SENTENCES[k];
      return fact(`Từ nào trong câu sau là đại từ? "${sentence}"`, correct, `'${correct}' là đại từ trong câu.`, others(PLAIN_WORDS, [correct], 3, k));
    }
    if (k < 35) {
      const [sentence, correct] = QHT_SENTENCES[k - 18];
      return fact(`Từ nào trong câu sau là quan hệ từ? "${sentence}"`, correct, `'${correct}' là quan hệ từ trong câu.`, others(PLAIN_WORDS, [correct], 3, k));
    }
    if (k < 44) {
      const [first, second, pronoun, correct, wrong] = PRONOUN_REPLACE[k - 35];
      return fact(
        `Đại từ '${pronoun}' trong hai câu "${first} ${second}" thay thế cho từ ngữ nào?`,
        correct,
        `'${pronoun}' thay thế cho '${correct}'.`,
        wrong,
      );
    }
    const [sentence, pair, correct] = RELATIONS[k - 44];
    return fact(
      `Cặp quan hệ từ '${pair}' trong câu "${sentence}" biểu thị quan hệ gì?`,
      correct,
      `Cặp '${pair}' biểu thị quan hệ ${correct}.`,
      RELATION_LABELS.filter((label) => label !== correct).slice(0, 3),
    );
  },
  fill(k) {
    if (k < 8) {
      const words = ['tôi', 'chúng tôi', 'nó', 'họ', 'mình', 'chúng ta', 'bạn ấy', 'cô ấy'];
      const word = words[k];
      return fill(`Từ '${word}' là ___ từ.`, ['đại'], `'${word}' là đại từ.`);
    }
    if (k < 15) {
      const [sentence, answer] = QHT_SENTENCES[k - 8];
      return fill(`Trong câu "${sentence}", quan hệ từ là ___.`, [answer], `Quan hệ từ trong câu là '${answer}'.`);
    }
    const [sentence, pair, answer] = RELATIONS[k - 15];
    return fill(
      `Cặp quan hệ từ '${pair}' trong câu "${sentence}" biểu thị quan hệ ___.`,
      [answer],
      `Cặp '${pair}' biểu thị quan hệ ${answer}.`,
    );
  },
  tf(k) {
    const items = [
      ["Từ 'tôi' là đại từ.", true, "Đúng, 'tôi' là đại từ xưng hô."],
      ["Từ 'bàn' là đại từ.", false, "Sai, 'bàn' là danh từ."],
      ["Từ 'chúng tôi' là đại từ xưng hô.", true, "Đúng, 'chúng tôi' là đại từ xưng hô."],
      ["Từ 'và' là quan hệ từ.", true, "Đúng, 'và' là quan hệ từ."],
      ["Từ 'chạy' là quan hệ từ.", false, "Sai, 'chạy' là động từ."],
      ['Quan hệ từ dùng để nối các từ ngữ hoặc các câu.', true, 'Đúng, đó là chức năng của quan hệ từ.'],
      ["Từ 'của' là quan hệ từ.", true, "Đúng, 'của' là quan hệ từ."],
      ["Từ 'đẹp' là đại từ.", false, "Sai, 'đẹp' là tính từ."],
      ["Từ 'nó' có thể thay thế cho danh từ đã nêu trước đó.", true, "Đúng, 'nó' là đại từ thay thế."],
      ["Từ 'nhưng' biểu thị quan hệ tương phản.", true, "Đúng, 'nhưng' biểu thị tương phản."],
      ["Từ 'vì' biểu thị quan hệ tương phản.", false, "Sai, 'vì' biểu thị nguyên nhân."],
      ["Từ 'nếu' thường dùng trong câu ghép chỉ điều kiện.", true, "Đúng, 'nếu' chỉ điều kiện."],
      ["Từ 'họ' là quan hệ từ.", false, "Sai, 'họ' là đại từ."],
      ["Từ 'để' có thể biểu thị mục đích.", true, "Đúng, 'để' biểu thị mục đích."],
      ['Đại từ chỉ dùng để gọi tên sự vật.', false, 'Sai, đại từ còn dùng để xưng hô hoặc thay thế.'],
      ["Từ 'với' là quan hệ từ.", true, "Đúng, 'với' là quan hệ từ."],
      ["Từ 'sách' là đại từ.", false, "Sai, 'sách' là danh từ."],
    ];
    const [statement, value, why] = items[k];
    return tf(statement, value, why);
  },
  multi(k) {
    const items = [
      ['đại từ', ['tôi', 'chúng tôi'], ['bàn', 'chạy']],
      ['đại từ', ['nó', 'họ'], ['sách', 'đẹp']],
      ['đại từ', ['mình', 'ta'], ['mưa', 'gió']],
      ['đại từ', ['bạn ấy', 'cô ấy'], ['nhà', 'xe']],
      ['đại từ', ['chúng em', 'các bạn ấy'], ['hoa', 'cây']],
      ['đại từ', ['anh ấy', 'ông ấy'], ['cơm', 'trà']],
      ['đại từ', ['bà ấy', 'chị ấy'], ['bút', 'vở']],
      ['đại từ', ['chúng ta', 'họ'], ['chim', 'cá']],
      ['đại từ', ['tôi', 'bạn'], ['chạy', 'học']],
      ['quan hệ từ', ['và', 'với'], ['bàn', 'hoa']],
      ['quan hệ từ', ['vì', 'nên'], ['sách', 'bút']],
      ['quan hệ từ', ['nhưng', 'tuy'], ['mưa', 'nắng']],
      ['quan hệ từ', ['của', 'cho'], ['xe', 'cây']],
      ['quan hệ từ', ['để', 'bằng'], ['cơm', 'trà']],
      ['quan hệ từ', ['nếu', 'thì'], ['nhà', 'cửa']],
      ['quan hệ từ', ['về', 'như'], ['chim', 'cá']],
      ['quan hệ từ', ['dù', 'mà'], ['hoa', 'lá']],
    ];
    const [label, correct, wrong] = items[k];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các ${label} trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `Các ${label} là ${correct.join(', ')}.`,
    );
  },
};

// ===== Câu ghép =====
const COMPOUND_SETS = [
  ['Trời mưa to nên em ở nhà.', 'Trời mưa to.', 'Em ở nhà.', 'Em thích mưa.'],
  ['Lan học bài còn Mai quét nhà.', 'Lan học bài.', 'Mai quét nhà.', 'Lan rất chăm.'],
  ['Vì trời lạnh nên em mặc áo ấm.', 'Trời lạnh.', 'Em mặc áo ấm.', 'Áo em rất đẹp.'],
  ['Tuy nhà xa nhưng Nam vẫn đến lớp đúng giờ.', 'Nhà Nam rất xa.', 'Nam đến lớp đúng giờ.', 'Nam đi xe đạp.'],
  ['Nếu em chăm chỉ thì em sẽ tiến bộ.', 'Em rất chăm chỉ.', 'Em sẽ tiến bộ.', 'Em thích học toán.'],
  ['Mẹ nấu cơm và bố rửa bát.', 'Mẹ nấu cơm.', 'Bố rửa bát.', 'Mẹ nấu rất ngon.'],
  ['Bạn ấy không chỉ học giỏi mà còn hát hay.', 'Bạn ấy học giỏi.', 'Bạn ấy hát hay.', 'Bạn ấy rất vui.'],
  ['Em mở cửa sổ để gió mát thổi vào.', 'Em mở cửa sổ.', 'Gió thổi rất mát.', 'Cửa sổ màu xanh.'],
  ['Ông đọc báo, bà tưới cây.', 'Ông đọc báo.', 'Bà tưới cây.', 'Ông rất vui.'],
  ['Chúng em vừa đến trường thì trống đánh.', 'Chúng em đến trường.', 'Trống vừa đánh.', 'Trường em rất đẹp.'],
  ['Cô giáo giảng bài, học sinh chăm chú nghe.', 'Cô giáo giảng bài.', 'Học sinh chăm chú nghe.', 'Cô giáo rất hiền.'],
  ['Vì bạn ấy ốm nên bạn ấy nghỉ học.', 'Bạn ấy bị ốm.', 'Bạn ấy nghỉ học.', 'Bạn ấy học lớp 5.'],
  ['Dù trời mưa nhưng chúng em vẫn đi cắm trại.', 'Trời mưa.', 'Chúng em đi cắm trại.', 'Chúng em rất vui.'],
  ['Nếu trời nắng thì chúng em đi bơi.', 'Trời nắng.', 'Chúng em đi bơi.', 'Nước hồ rất mát.'],
  ['Anh trai tôi học lớp 9 còn tôi học lớp 5.', 'Anh trai tôi học lớp 9.', 'Tôi học lớp 5.', 'Tôi thích học văn.'],
  ['Bố đi làm, mẹ đi chợ.', 'Bố đi làm.', 'Mẹ đi chợ.', 'Mẹ mua rất nhiều rau.'],
  ['Tôi thích đọc sách và em gái tôi thích vẽ tranh.', 'Tôi thích đọc sách.', 'Em gái tôi thích vẽ tranh.', 'Em gái tôi rất khéo tay.'],
  ['Vì em chăm chỉ nên em được khen.', 'Em rất chăm chỉ.', 'Em được khen.', 'Em rất vui.'],
];
const VE_COUNT = [
  ['Trời mưa to nên em ở nhà.', '2 vế'],
  ['Lan học bài còn Mai quét nhà.', '2 vế'],
  ['Vì trời lạnh nên em mặc áo ấm.', '2 vế'],
  ['Tuy nhà xa nhưng Nam vẫn đến lớp đúng giờ.', '2 vế'],
  ['Nếu em chăm chỉ thì em sẽ tiến bộ.', '2 vế'],
  ['Mẹ nấu cơm và bố rửa bát.', '2 vế'],
  ['Ông đọc báo, bà tưới cây.', '2 vế'],
  ['Cô giáo giảng bài, học sinh chăm chú nghe.', '2 vế'],
  ['Bố đi làm, mẹ đi chợ.', '2 vế'],
  ['Tôi thích đọc sách và em gái tôi thích vẽ tranh.', '2 vế'],
  ['Lan học bài, Mai quét nhà còn Nam tưới cây.', '3 vế'],
  ['Trời mưa, gió thổi mạnh nên em ở nhà.', '3 vế'],
  ['Mẹ nấu cơm, bố rửa bát và em lau bàn.', '3 vế'],
  ['Vì trời mưa to nên em ở nhà, còn bố đi làm.', '3 vế'],
  ['Lan đọc sách, Mai vẽ tranh và Nam chơi đàn.', '3 vế'],
  ['Em quét nhà, chị nấu cơm còn anh rửa bát.', '3 vế'],
];
const CONNECTORS = [
  ['Trời mưa to nên em ở nhà.', 'nên'],
  ['Vì trời lạnh, em mặc áo ấm.', 'Vì'],
  ['Tuy nhà xa nhưng Nam vẫn đến đúng giờ.', 'nhưng'],
  ['Em sẽ tiến bộ nếu em chăm chỉ.', 'nếu'],
  ['Lan học bài còn Mai quét nhà.', 'còn'],
  ['Mẹ nấu cơm và bố rửa bát.', 'và'],
  ['Em mở cửa sổ để gió mát thổi vào.', 'để'],
  ['Bạn ấy học giỏi mà còn hát hay.', 'mà'],
  ['Dù trời mưa, chúng em vẫn đi học.', 'Dù'],
  ['Bố đi làm còn mẹ đi chợ.', 'còn'],
];
const CONNECTOR_POOL = ['vì', 'nên', 'nhưng', 'nếu', 'còn', 'và', 'để', 'mà', 'dù', 'với'];
const CAU_GHÉP_RELATIONS = [
  ['Vì trời mưa nên em ở nhà.', 'nguyên nhân – kết quả'],
  ['Tuy nhà xa nhưng Nam đến đúng giờ.', 'tương phản'],
  ['Nếu em chăm chỉ thì em tiến bộ.', 'điều kiện – kết quả'],
  ['Bạn ấy không chỉ học giỏi mà còn hát hay.', 'tăng tiến'],
  ['Em mở cửa để gió thổi vào.', 'mục đích'],
  ['Mẹ nấu cơm và bố rửa bát.', 'liệt kê'],
  ['Lan học bài còn Mai quét nhà.', 'tương phản'],
  ['Dù trời mưa, em vẫn đi học.', 'tương phản'],
];
const CAU_GHÉP_LABELS = ['nguyên nhân – kết quả', 'tương phản', 'điều kiện – kết quả', 'tăng tiến', 'mục đích', 'liệt kê'];

const cauGhep = {
  single(k) {
    if (k < 18) {
      const [correct, ...wrong] = COMPOUND_SETS[k];
      return fact(
        `Trong các câu sau, câu nào là câu ghép: ${[correct, ...wrong].join(' ')}`,
        correct,
        `"${correct}" có từ hai vế câu trở lên nên là câu ghép.`,
        wrong,
      );
    }
    if (k < 34) {
      const [sentence, correct] = VE_COUNT[k - 18];
      return fact(
        `Câu ghép "${sentence}" có mấy vế câu?`,
        correct,
        `"${sentence}" có ${correct}.`,
        ['1 vế', '2 vế', '3 vế', '4 vế'].filter((item) => item !== correct),
      );
    }
    if (k < 44) {
      const [sentence, correct] = CONNECTORS[k - 34];
      return fact(
        `Các vế của câu ghép "${sentence}" được nối với nhau bằng từ nào?`,
        correct,
        `Từ nối các vế trong câu là "${correct}".`,
        others(CONNECTOR_POOL, [correct.toLowerCase(), correct], 3, k),
      );
    }
    const [sentence, correct] = CAU_GHÉP_RELATIONS[k - 44];
    return fact(
      `Câu ghép "${sentence}" biểu thị quan hệ gì?`,
      correct,
      `Câu ghép này biểu thị quan hệ ${correct}.`,
      others(CAU_GHÉP_LABELS, [correct], 3, k),
    );
  },
  fill(k) {
    if (k < 10) {
      const [sentence] = VE_COUNT[k];
      return fill(`Câu "${sentence}" là câu ___.`, ['ghép'], `"${sentence}" có hai vế câu nên là câu ghép.`);
    }
    if (k < 18) {
      const [sentence, answer] = VE_COUNT[k - 2];
      return fill(`Câu ghép "${sentence}" có ___ vế câu.`, [answer.replace(' vế', '')], `"${sentence}" có ${answer}.`);
    }
    const [sentence, answer] = CONNECTORS[k - 18];
    return fill(`Từ nối hai vế trong câu "${sentence}" là ___.`, [answer], `Từ nối hai vế trong câu là "${answer}".`);
  },
  tf(k) {
    const items = [
      ['Câu ghép có từ hai vế câu trở lên.', true, 'Đúng, câu ghép có từ hai vế câu trở lên.'],
      ['Câu đơn chỉ có một vế câu.', true, 'Đúng, câu đơn chỉ có một vế câu.'],
      ["Câu 'Trời mưa to nên em ở nhà.' là câu ghép.", true, 'Đúng, câu có hai vế.'],
      ["Câu 'Em thích đọc sách.' là câu ghép.", false, 'Sai, đây là câu đơn.'],
      ['Các vế của câu ghép có thể nối với nhau bằng quan hệ từ.', true, 'Đúng, quan hệ từ có thể nối các vế.'],
      ['Câu ghép chỉ có một vế câu.', false, 'Sai, câu ghép có từ hai vế câu trở lên.'],
      ["Câu 'Lan học bài còn Mai quét nhà.' là câu ghép.", true, 'Đúng, câu có hai vế.'],
      ["Câu 'Mẹ nấu cơm.' có hai vế câu.", false, 'Sai, câu này chỉ có một vế.'],
      ["Từ 'vì' có thể nối các vế của câu ghép chỉ nguyên nhân.", true, "Đúng, 'vì' chỉ nguyên nhân."],
      ["Từ 'nhưng' biểu thị quan hệ tương phản.", true, "Đúng, 'nhưng' biểu thị tương phản."],
      ["Câu 'Nếu em chăm chỉ thì em tiến bộ.' là câu ghép.", true, 'Đúng, câu có hai vế.'],
      ['Câu ghép không bao giờ dùng quan hệ từ.', false, 'Sai, câu ghép có thể dùng quan hệ từ.'],
      ["Câu 'Bố đi làm, mẹ đi chợ.' là câu ghép.", true, 'Đúng, câu có hai vế.'],
      ["Câu 'Chim hót líu lo.' là câu ghép.", false, 'Sai, đây là câu đơn.'],
      ['Hai vế của câu ghép phải cùng một chủ ngữ.', false, 'Sai, mỗi vế có thể có chủ ngữ riêng.'],
      ["Câu 'Tuy nhà xa nhưng Nam đến đúng giờ.' biểu thị quan hệ tương phản.", true, 'Đúng, cặp tuy ... nhưng chỉ tương phản.'],
      ["Câu 'Em mở cửa để gió thổi vào.' có hai vế câu.", true, 'Đúng, câu có hai vế.'],
    ];
    const [statement, value, why] = items[k];
    return tf(statement, value, why);
  },
  multi(k) {
    const sets = [
      [['Trời mưa to nên em ở nhà.', 'Lan học bài còn Mai quét nhà.'], ['Trời mưa to.', 'Em ở nhà.']],
      [['Vì trời lạnh nên em mặc áo ấm.', 'Tuy nhà xa nhưng Nam đến đúng giờ.'], ['Trời lạnh.', 'Nam đi xe đạp.']],
      [['Nếu em chăm chỉ thì em tiến bộ.', 'Mẹ nấu cơm và bố rửa bát.'], ['Em rất chăm.', 'Mẹ nấu rất ngon.']],
      [['Ông đọc báo, bà tưới cây.', 'Bố đi làm, mẹ đi chợ.'], ['Ông rất vui.', 'Mẹ mua rau.']],
      [['Cô giáo giảng bài, học sinh chăm chú nghe.', 'Vì bạn ấy ốm nên bạn ấy nghỉ học.'], ['Cô giáo rất hiền.', 'Bạn ấy học lớp 5.']],
      [['Dù trời mưa nhưng chúng em vẫn đi cắm trại.', 'Anh trai tôi học lớp 9 còn tôi học lớp 5.'], ['Trời mưa.', 'Tôi thích học văn.']],
      [['Tôi thích đọc sách và em gái tôi thích vẽ tranh.', 'Vì em chăm chỉ nên em được khen.'], ['Tôi thích đọc sách.', 'Em gái tôi khéo tay.']],
      [['Lan đọc sách, Mai vẽ tranh và Nam chơi đàn.', 'Em quét nhà, chị nấu cơm còn anh rửa bát.'], ['Lan đọc sách.', 'Chị nấu cơm.']],
      [['Trời mưa, gió thổi mạnh nên em ở nhà.', 'Mẹ nấu cơm, bố rửa bát và em lau bàn.'], ['Gió thổi mạnh.', 'Em lau bàn.']],
      [['Bạn ấy không chỉ học giỏi mà còn hát hay.', 'Em mở cửa sổ để gió mát thổi vào.'], ['Bạn ấy học giỏi.', 'Gió rất mát.']],
      [['Chúng em vừa đến trường thì trống đánh.', 'Vì trời mưa to nên em ở nhà, còn bố đi làm.'], ['Chúng em đến trường.', 'Bố đi làm.']],
      [['Lan học bài, Mai quét nhà còn Nam tưới cây.', 'Nếu trời nắng thì chúng em đi bơi.'], ['Mai quét nhà.', 'Nước hồ rất mát.']],
      [['Bố mua cho em một quyển sách và mẹ mua cho em một cái bút.', 'Tuy trời nóng nhưng em vẫn mặc áo dài.'], ['Bố mua sách.', 'Trời rất nóng.']],
      [['Em thích màu xanh và chị em thích màu đỏ.', 'Vì em chăm học nên em được khen thưởng.'], ['Em thích màu xanh.', 'Chị em rất vui.']],
      [['Nam đá bóng, Minh chạy bộ và Lan nhảy dây.', 'Dù trời lạnh nhưng các bạn vẫn tập thể dục.'], ['Nam đá bóng.', 'Trời rất lạnh.']],
      [['Mẹ đi chợ còn bố ở nhà nấu cơm.', 'Vì trời tối nên em bật đèn.'], ['Mẹ đi chợ.', 'Em bật đèn.']],
      [['Cô giáo đọc bài và học sinh ghi chép.', 'Nếu em làm xong bài thì em sẽ đi chơi.'], ['Cô giáo đọc bài.', 'Em đi chơi.']],
    ];
    const [correct, wrong] = sets[k];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các câu ghép trong nhóm: ${all.join(' ')}`,
      correct,
      wrong,
      `Các câu ghép là: ${correct.join(' ')}`,
    );
  },
};

// ===== Đọc hiểu đoạn văn lớp 5 =====
const READ_5 = [
  {
    text: 'Tan học, trời bỗng đổ mưa rất to. Nam thấy một cụ già đang đứng trú bên gốc cây, tay ôm túi đồ nặng. Nam liền chạy đến, che ô cho cụ và đưa cụ về tận nhà. Cụ cảm động nắm tay Nam, khen em là một cậu bé ngoan. Nam thấy lòng ấm áp dù trời vẫn mưa.',
    qa: [
      ['Chuyện xảy ra vào lúc nào?', 'Tan học', ['Giờ ra chơi', 'Buổi sáng chủ nhật', 'Đêm khuya']],
      ['Lúc đó thời tiết thế nào?', 'Mưa rất to', ['Nắng đẹp', 'Gió nhẹ', 'Trời lạnh']],
      ['Nam thấy ai đang trú mưa bên gốc cây?', 'Một cụ già', ['Một em bé', 'Một bác nông dân', 'Một cô giáo']],
      ['Cụ già đang làm gì?', 'Ôm túi đồ và đứng trú mưa', ['Ngồi nghỉ chân', 'Bán hàng', 'Tưới cây']],
      ['Nam đã làm gì để giúp cụ?', 'Che ô và đưa cụ về nhà', ['Cho cụ tiền', 'Gọi người đến giúp', 'Mời cụ vào lớp']],
      ['Cụ già khen Nam thế nào?', 'Là cậu bé ngoan', ['Là học sinh giỏi', 'Là người khỏe mạnh', 'Là bạn tốt']],
      ['Vì sao cụ già cảm động?', 'Vì Nam giúp cụ khi trời mưa', ['Vì Nam học giỏi', 'Vì Nam tặng cụ quà', 'Vì Nam là hàng xóm']],
      ['Sau khi giúp cụ, Nam cảm thấy thế nào?', 'Lòng ấm áp', ['Buồn bã', 'Mệt mỏi', 'Lo lắng']],
      ['Ý chính của đoạn văn là gì?', 'Nam giúp cụ già khi trời mưa', ['Nam đi học muộn', 'Cụ già bị ốm', 'Trời mưa rất to']],
      ['Qua đoạn văn, em thấy Nam là người thế nào?', 'Tốt bụng, biết giúp đỡ người khác', ['Nhút nhát', 'Ích kỉ', 'Lười biếng']],
      ['Chi tiết nào cho thấy Nam quan tâm đến cụ già?', 'Chạy đến che ô cho cụ', ['Nam đi học về', 'Trời mưa rất to', 'Cụ ôm túi đồ']],
    ],
  },
  {
    text: 'Sân trường em có một cây bàng già. Mùa xuân, cành bàng vươn dài, nảy những lộc non xanh mướt. Mùa hè, tán bàng xòe rộng như chiếc ô khổng lồ, che mát cả khoảng sân. Giờ ra chơi, chúng em thường ngồi dưới gốc bàng đọc truyện, chơi ô ăn quan. Mùa đông, bàng trút lá, chỉ còn những cành khẳng khiu. Em rất yêu cây bàng ấy vì nó gắn với bao kỉ niệm tuổi thơ.',
    qa: [
      ['Cây bàng trong đoạn văn được tả ở đâu?', 'Sân trường', ['Công viên', 'Bên bờ sông', 'Trước cửa nhà']],
      ['Mùa xuân, cành bàng thế nào?', 'Nảy những lộc non xanh mướt', ['Trút hết lá', 'Khô héo', 'Nở hoa đỏ']],
      ['Mùa hè, tán bàng được so sánh với gì?', 'Chiếc ô khổng lồ', ['Tấm thảm xanh', 'Cái quạt', 'Mái nhà']],
      ['Tán bàng che mát ở đâu?', 'Cả khoảng sân', ['Cả ngôi trường', 'Bên bờ ao', 'Trước cổng']],
      ['Giờ ra chơi, các bạn thường làm gì dưới gốc bàng?', 'Đọc truyện, chơi ô ăn quan', ['Đá bóng', 'Nhảy dây', 'Học bài']],
      ['Mùa đông, cây bàng thế nào?', 'Trút lá, còn cành khẳng khiu', ['Xanh tốt', 'Nở hoa', 'Ra quả']],
      ['Vì sao bạn nhỏ yêu cây bàng?', 'Vì cây gắn với kỉ niệm tuổi thơ', ['Vì cây cho quả ngọt', 'Vì cây rất thấp', 'Vì cây có hoa đẹp']],
      ['Ý chính của đoạn văn là gì?', 'Tả cây bàng và tình cảm của bạn nhỏ với cây', ['Kể chuyện trồng cây', 'Tả sân trường giờ ra chơi', 'Kể về mùa đông']],
      ["Từ 'khổng lồ' cho thấy tán bàng thế nào?", 'Rất lớn', ['Rất nhỏ', 'Rất cao', 'Rất thấp']],
      ['Đoạn văn tả cây bàng vào những mùa nào?', 'Xuân, hè, đông', ['Xuân, hạ, thu', 'Hè, thu, đông', 'Chỉ mùa hè']],
      ['Tình cảm của bạn nhỏ với cây bàng là gì?', 'Yêu quý', ['Ghét bỏ', 'Thờ ơ', 'Sợ hãi']],
    ],
  },
  {
    text: 'Thỏ và Rùa cùng chạy thi. Thỏ nghĩ mình chạy nhanh nên ung dung nằm ngủ dưới gốc cây. Rùa không nản chí, cứ chậm rãi bước từng bước. Khi Thỏ tỉnh dậy thì Rùa đã gần đến đích. Cuối cùng, Rùa về trước và thắng cuộc. Thỏ xấu hổ vì đã chủ quan, kiêu ngạo.',
    qa: [
      ['Thỏ và Rùa thi gì?', 'Chạy thi', ['Bơi thi', 'Nhảy thi', 'Kéo co']],
      ['Thỏ nghĩ gì về khả năng của mình?', 'Mình chạy nhanh', ['Mình chạy chậm', 'Mình yếu', 'Mình thông minh']],
      ['Thỏ làm gì trong cuộc thi?', 'Nằm ngủ dưới gốc cây', ['Chạy không ngừng', 'Nghỉ uống nước', 'Cổ vũ cho Rùa']],
      ['Rùa chạy với thái độ thế nào?', 'Chậm rãi nhưng không nản chí', ['Nhanh nhẹn', 'Lo lắng', 'Kiêu ngạo']],
      ['Ai thắng cuộc?', 'Rùa', ['Thỏ', 'Cả hai', 'Không ai']],
      ['Vì sao Thỏ thua?', 'Vì chủ quan, kiêu ngạo', ['Vì chạy chậm', 'Vì bị ốm', 'Vì không biết đường']],
      ['Khi thua, Thỏ cảm thấy thế nào?', 'Xấu hổ', ['Vui vẻ', 'Tự hào', 'Bình thản']],
      ['Ý chính của câu chuyện là gì?', 'Kiên trì sẽ thắng, không nên kiêu ngạo', ['Thỏ chạy nhanh hơn Rùa', 'Rùa rất chậm', 'Thỏ ngủ rất ngon']],
      ["Chi tiết 'ung dung nằm ngủ' cho thấy Thỏ thế nào?", 'Chủ quan', ['Cẩn thận', 'Khiêm tốn', 'Chăm chỉ']],
      ['Từ nào tả bước đi của Rùa?', 'Chậm rãi', ['Nhanh nhẹn', 'Vội vàng', 'Hấp tấp']],
    ],
  },
  {
    text: 'Buổi sáng, biển xanh biếc như tấm thảm khổng lồ. Những con sóng nhỏ lăn tăn vỗ vào bờ cát trắng. Ngư dân kéo lưới, tiếng cười nói rộn ràng. Xa xa, những cánh buồm trắng nối nhau ra khơi. Em đứng trên bờ, hít căng lồng ngực làn gió mặn mòi và thấy yêu biển vô cùng.',
    qa: [
      ['Buổi sáng, biển được so sánh với gì?', 'Tấm thảm khổng lồ', ['Chiếc gương', 'Mái nhà', 'Cánh đồng']],
      ['Buổi sáng, biển có màu gì?', 'Xanh biếc', ['Đỏ thắm', 'Vàng óng', 'Trắng xóa']],
      ['Những con sóng vỗ vào đâu?', 'Bờ cát trắng', ['Mũi thuyền', 'Ghềnh đá', 'Bãi cỏ']],
      ['Ngư dân đang làm gì?', 'Kéo lưới', ['Chèo thuyền', 'Xây nhà', 'Trồng cây']],
      ['Xa xa có gì?', 'Những cánh buồm trắng', ['Những ngọn núi', 'Đàn cá', 'Cánh diều']],
      ['Em cảm nhận được gì khi đứng trên bờ?', 'Làn gió mặn mòi', ['Mùi hoa thơm', 'Hơi nóng', 'Mùi cỏ']],
      ['Tình cảm của em với biển thế nào?', 'Yêu biển vô cùng', ['Sợ biển', 'Không thích biển', 'Thờ ơ']],
      ['Ý chính của đoạn văn là gì?', 'Tả cảnh biển buổi sáng và tình cảm của em', ['Kể chuyện đi đánh cá', 'Tả cánh đồng', 'Kể về người ngư dân']],
      ['Chi tiết nào cho thấy biển rất rộng?', 'Biển như tấm thảm khổng lồ', ['Sóng lăn tăn', 'Cát trắng', 'Gió mặn']],
      ['Không khí ở bờ biển thế nào?', 'Rộn ràng', ['Im lặng', 'Buồn bã', 'Lạnh lẽo']],
    ],
  },
  {
    text: 'Thư viện trường em nằm ở cuối dãy nhà. Mỗi giờ ra chơi, nhiều bạn lại đến đây đọc sách. Cô thủ thư luôn nhẹ nhàng hướng dẫn các bạn tìm sách. Nhờ đọc nhiều, Lan viết văn ngày càng hay và được cô giáo khen. Em cũng thích đến thư viện vì ở đó có nhiều điều bổ ích.',
    qa: [
      ['Thư viện trường nằm ở đâu?', 'Cuối dãy nhà', ['Đầu dãy nhà', 'Trong sân', 'Bên bờ ao']],
      ['Mỗi giờ ra chơi, các bạn đến thư viện làm gì?', 'Đọc sách', ['Chơi bóng', 'Học vẽ', 'Tập hát']],
      ['Ai hướng dẫn các bạn tìm sách?', 'Cô thủ thư', ['Cô giáo chủ nhiệm', 'Bác bảo vệ', 'Bạn lớp trưởng']],
      ['Nhờ đọc nhiều, Lan tiến bộ thế nào?', 'Viết văn ngày càng hay', ['Học toán giỏi hơn', 'Hát hay hơn', 'Chạy nhanh hơn']],
      ['Lan được ai khen?', 'Cô giáo', ['Cô thủ thư', 'Bố mẹ', 'Bạn bè']],
      ['Vì sao em thích đến thư viện?', 'Vì ở đó có nhiều điều bổ ích', ['Vì ở đó có nhiều đồ ăn', 'Vì ở đó rất ồn ào', 'Vì ở đó có sân chơi']],
      ['Ý chính của đoạn văn là gì?', 'Thư viện và lợi ích của việc đọc sách', ['Tả sân trường', 'Kể về giờ ra chơi', 'Tả lớp học']],
      ['Cô thủ thư là người thế nào?', 'Nhẹ nhàng', ['Nóng tính', 'Lạnh lùng', 'Khó khăn']],
      ['Việc đọc sách đem lại điều gì cho Lan?', 'Viết văn hay hơn', ['Chạy nhanh hơn', 'Nấu ăn giỏi hơn', 'Vẽ đẹp hơn']],
      ['Đoạn văn nói về nơi nào?', 'Thư viện trường', ['Sân trường', 'Lớp học', 'Công viên']],
    ],
  },
];
const READ_5_TEXTS = READ_5.map((item) => item.text);
const READ_5_SINGLES = READ_5.flatMap((passage) => passage.qa.map((qa) => [passage.text, ...qa]));

const docHieu5 = {
  single(k) {
    const [text, question, answer, wrong] = READ_5_SINGLES[k];
    return fact(`${text} ${question}`, answer, `Theo đoạn văn, đáp án là "${answer}".`, wrong);
  },
  fill(k) {
    const items = [
      [0, 'Nam thấy một cụ già đang đứng trú bên gốc ___.', 'cây', 'Cụ già đứng trú bên gốc cây.'],
      [0, 'Nam liền chạy đến ___ ô cho cụ.', 'che', 'Nam chạy đến che ô cho cụ.'],
      [0, 'Cụ khen Nam là một cậu bé ___.', 'ngoan', 'Cụ khen Nam là cậu bé ngoan.'],
      [0, 'Nam thấy lòng ___ áp.', 'ấm', 'Nam thấy lòng ấm áp.'],
      [0, 'Tan học, trời bỗng đổ ___ rất to.', 'mưa', 'Trời đổ mưa rất to.'],
      [1, 'Sân trường em có một cây ___ già.', 'bàng', 'Sân trường có cây bàng già.'],
      [1, 'Mùa hè, tán bàng xòe rộng như chiếc ___ khổng lồ.', 'ô', 'Tán bàng như chiếc ô khổng lồ.'],
      [1, 'Mùa đông, bàng trút ___.', 'lá', 'Mùa đông bàng trút lá.'],
      [1, 'Em rất ___ cây bàng.', 'yêu', 'Em rất yêu cây bàng.'],
      [2, 'Thỏ và Rùa cùng ___ thi.', 'chạy', 'Thỏ và Rùa cùng chạy thi.'],
      [2, 'Thỏ ung dung nằm ___ dưới gốc cây.', 'ngủ', 'Thỏ nằm ngủ dưới gốc cây.'],
      [2, 'Rùa không ___ chí.', 'nản', 'Rùa không nản chí.'],
      [2, 'Cuối cùng, ___ về trước và thắng cuộc.', 'Rùa', 'Rùa về trước và thắng cuộc.'],
      [3, 'Buổi sáng, biển xanh biếc như tấm ___ khổng lồ.', 'thảm', 'Biển như tấm thảm khổng lồ.'],
      [3, 'Ngư dân kéo ___.', 'lưới', 'Ngư dân kéo lưới.'],
      [3, 'Xa xa, những cánh ___ trắng nối nhau ra khơi.', 'buồm', 'Những cánh buồm trắng ra khơi.'],
      [3, 'Em thấy yêu biển vô ___.', 'cùng', 'Em yêu biển vô cùng.'],
      [3, 'Những con sóng nhỏ lăn tăn vỗ vào bờ ___ trắng.', 'cát', 'Sóng vỗ vào bờ cát trắng.'],
      [4, 'Thư viện trường em nằm ở cuối ___ nhà.', 'dãy', 'Thư viện nằm ở cuối dãy nhà.'],
      [4, 'Cô thủ thư luôn ___ nhàng hướng dẫn các bạn.', 'nhẹ', 'Cô thủ thư nhẹ nhàng hướng dẫn.'],
      [4, 'Nhờ đọc nhiều, Lan viết ___ ngày càng hay.', 'văn', 'Lan viết văn ngày càng hay.'],
      [4, 'Em thích đến thư viện vì ở đó có nhiều điều ___ ích.', 'bổ', 'Ở thư viện có nhiều điều bổ ích.'],
    ];
    const [passageIndex, prompt, answer, why] = items[k];
    return fill(`${READ_5_TEXTS[passageIndex]} ${prompt}`, [answer], why);
  },
  tf(k) {
    const items = [
      ['Tan học, trời đổ mưa rất to.', true, 'Đúng với đoạn văn thứ nhất.'],
      ['Nam thấy một em bé đứng trú mưa.', false, 'Sai: Nam thấy một cụ già.'],
      ['Nam che ô và đưa cụ già về nhà.', true, 'Đúng với đoạn văn thứ nhất.'],
      ['Cụ già khen Nam là học sinh giỏi.', false, 'Sai: cụ khen Nam là cậu bé ngoan.'],
      ['Sân trường có một cây bàng già.', true, 'Đúng với đoạn văn thứ hai.'],
      ['Mùa hè, tán bàng trút hết lá.', false, 'Sai: mùa đông bàng mới trút lá.'],
      ['Mùa đông, cây bàng chỉ còn cành khẳng khiu.', true, 'Đúng với đoạn văn thứ hai.'],
      ['Bạn nhỏ không yêu cây bàng.', false, 'Sai: bạn nhỏ rất yêu cây bàng.'],
      ['Thỏ và Rùa cùng chạy thi.', true, 'Đúng với đoạn văn thứ ba.'],
      ['Rùa nản chí nên dừng lại.', false, 'Sai: Rùa không nản chí.'],
      ['Rùa thắng cuộc vì kiên trì.', true, 'Đúng với đoạn văn thứ ba.'],
      ['Buổi sáng, biển xanh biếc.', true, 'Đúng với đoạn văn thứ tư.'],
      ['Ngư dân đang trồng cây.', false, 'Sai: ngư dân đang kéo lưới.'],
      ['Em rất yêu biển.', true, 'Đúng với đoạn văn thứ tư.'],
      ['Thư viện trường nằm ở cuối dãy nhà.', true, 'Đúng với đoạn văn thứ năm.'],
      ['Cô thủ thư rất nóng tính.', false, 'Sai: cô thủ thư nhẹ nhàng.'],
      ['Nhờ đọc nhiều, Lan viết văn ngày càng hay.', true, 'Đúng với đoạn văn thứ năm.'],
    ];
    const [statement, value, why] = items[k];
    return tf(statement, value, why);
  },
  multi(k) {
    const items = [
      [0, 'nhân vật Nam', ['Nam che ô cho cụ.', 'Nam đưa cụ về nhà.'], ['Nam bỏ đi.', 'Nam trêu cụ.']],
      [0, 'cụ già', ['Cụ đứng trú bên gốc cây.', 'Cụ ôm túi đồ nặng.'], ['Cụ đi xe đạp.', 'Cụ ngồi trong nhà.']],
      [0, 'việc làm của Nam', ['Che ô cho cụ.', 'Đưa cụ về nhà.'], ['Cho cụ tiền.', 'Mời cụ vào lớp.']],
      [0, 'cảm xúc sau câu chuyện', ['Cụ cảm động.', 'Nam thấy lòng ấm áp.'], ['Cụ tức giận.', 'Nam thấy buồn.']],
      [1, 'cây bàng', ['Cây bàng già ở sân trường.', 'Mùa hè tán bàng xòe rộng.'], ['Cây bàng ở bờ sông.', 'Mùa hè bàng trút lá.']],
      [1, 'cảnh mùa xuân', ['Cành bàng vươn dài.', 'Lộc non xanh mướt.'], ['Lá bàng chuyển đỏ.', 'Cành bàng khô héo.']],
      [1, 'hoạt động giờ ra chơi', ['Các bạn đọc truyện dưới gốc bàng.', 'Các bạn chơi ô ăn quan.'], ['Các bạn đá bóng.', 'Các bạn chơi nhảy dây.']],
      [1, 'tình cảm của bạn nhỏ', ['Yêu cây bàng.', 'Nhớ kỉ niệm tuổi thơ.'], ['Ghét cây bàng.', 'Muốn chặt cây bàng.']],
      [2, 'cuộc thi', ['Thỏ và Rùa chạy thi.', 'Rùa chậm rãi bước từng bước.'], ['Thỏ và Rùa bơi thi.', 'Rùa chạy rất nhanh.']],
      [2, 'Thỏ', ['Thỏ chủ quan nằm ngủ.', 'Thỏ thua cuộc.'], ['Thỏ kiên trì.', 'Thỏ thắng cuộc.']],
      [2, 'bài học', ['Không nên kiêu ngạo.', 'Cần kiên trì.'], ['Nên ngủ trong cuộc thi.', 'Nên coi thường bạn.']],
      [3, 'cảnh biển', ['Biển xanh biếc.', 'Sóng vỗ vào bờ cát trắng.'], ['Biển đỏ rực.', 'Sóng vỗ vào mái nhà.']],
      [3, 'ngư dân', ['Ngư dân kéo lưới.', 'Tiếng cười nói rộn ràng.'], ['Ngư dân trồng lúa.', 'Bờ biển im lặng.']],
      [3, 'tình cảm của em', ['Yêu biển vô cùng.', 'Thích gió mặn mòi.'], ['Sợ biển.', 'Không thích biển.']],
      [4, 'thư viện', ['Nằm ở cuối dãy nhà.', 'Có nhiều sách.'], ['Nằm giữa sân.', 'Không có sách.']],
      [4, 'cô thủ thư', ['Nhẹ nhàng.', 'Hướng dẫn các bạn tìm sách.'], ['Nóng tính.', 'Không giúp đỡ ai.']],
      [4, 'lợi ích của việc đọc sách', ['Giúp Lan viết văn hay.', 'Đem lại nhiều điều bổ ích.'], ['Giúp Lan chạy nhanh.', 'Làm Lan buồn ngủ.']],
    ];
    const [passageIndex, focus, correct, wrong] = items[k];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Đọc đoạn văn: "${READ_5_TEXTS[passageIndex]}" Chọn tất cả các ý đúng về ${focus}: ${all.join(' ')}`,
      correct,
      wrong,
      `Các ý đúng về ${focus} là: ${correct.join(' ')}`,
    );
  },
};

// ===== Chính tả =====
const SPELLING_SX = [
  ['sạch sẽ', 'xạch sẽ', 'sạch xẽ', 'xạch xẽ'],
  ['xung quanh', 'sung quanh', 'xung quan', 'sung quan'],
  ['sáng suốt', 'xáng suốt', 'sáng xuốt', 'xáng xuốt'],
  ['xôn xao', 'sôn sao', 'xôn sao', 'sôn xao'],
  ['xuất sắc', 'suất sắc', 'xuất xắc', 'suất xắc'],
  ['sản xuất', 'sản suất', 'xản xuất', 'xản suất'],
  ['xinh xắn', 'sinh xắn', 'xinh sắn', 'sinh sắn'],
  ['sâu sắc', 'xâu sắc', 'sâu xắc', 'xâu xắc'],
  ['sửa sang', 'xửa xang', 'sửa xang', 'xửa sang'],
  ['xa xôi', 'sa sôi', 'xa sôi', 'sa xôi'],
  ['sương sớm', 'xương xớm', 'sương xớm', 'xương sớm'],
  ['sung sướng', 'xung xướng', 'sung xướng', 'xung sướng'],
  ['sôi nổi', 'xôi nổi', 'sôi nỗi', 'xôi nỗi'],
];
const SPELLING_CHTR = [
  ['trung thực', 'chung thực', 'trung thật', 'chung thật'],
  ['chăm chỉ', 'trăm chỉ', 'chăm trỉ', 'trăm trỉ'],
  ['trường học', 'chường học', 'trường hục', 'chường hục'],
  ['chú ý', 'trú ý', 'chú í', 'trú í'],
  ['trí tuệ', 'chí tuệ', 'trí tụê', 'chí tụê'],
  ['che chở', 'tre trở', 'che trở', 'tre chở'],
  ['trong trẻo', 'chong chẻo', 'trong chẻo', 'chong trẻo'],
  ['chân thành', 'trân thành', 'chân thàn', 'trân thàn'],
  ['truyền thống', 'chuyền thống', 'truyền thóng', 'chuyền thóng'],
  ['chở che', 'trở tre', 'chở tre', 'trở che'],
  ['trầm lặng', 'chầm lặng', 'trầm lặn', 'chầm lặn'],
  ['chỉ dẫn', 'trỉ dẫn', 'chỉ dẩn', 'trỉ dẩn'],
  ['trao đổi', 'chao đổi', 'trao đỗi', 'chao đỗi'],
];
const SPELLING_DGIR = [
  ['rực rỡ', 'dực dỡ', 'rực dỡ', 'dực rỡ'],
  ['giữ gìn', 'dữ dìn', 'giữ dìn', 'dữ gìn'],
  ['dũng cảm', 'giũng cảm', 'dũng cãm', 'giũng cãm'],
  ['rộn ràng', 'dộn dàng', 'rộn dàng', 'dộn ràng'],
  ['giảng giải', 'dảng dải', 'giảng dải', 'dảng giải'],
  ['dao động', 'giao động', 'dao đọng', 'giao đọng'],
  ['rạng rỡ', 'dạng dỡ', 'rạng dỡ', 'dạng rỡ'],
  ['giàu có', 'dàu có', 'giàu cố', 'dàu cố'],
  ['rèn luyện', 'dèn luyện', 'rèn luỵên', 'dèn luỵên'],
  ['dân chủ', 'giân chủ', 'dân chũ', 'giân chũ'],
  ['rễ cây', 'dễ cây', 'rể cây', 'dể cây'],
  ['giấc ngủ', 'dấc ngủ', 'giấc ngũ', 'dấc ngũ'],
  ['rong ruổi', 'dong duổi', 'rong duổi', 'dong ruổi'],
];
const SPELLING_HOI_NGA = [
  ['suy nghĩ', 'suy nghỉ', 'sui nghĩ', 'sui nghỉ'],
  ['nghỉ ngơi', 'nghĩ ngơi', 'nghị ngơi', 'nghỉ ngôi'],
  ['vững vàng', 'vửng vàng', 'vững vàn', 'vửng vàn'],
  ['bãi biển', 'bải biển', 'bãi biễn', 'bải biễn'],
  ['cẩn thận', 'cẫn thận', 'cẩn thặn', 'cẫn thặn'],
  ['hăng hái', 'hăng hải', 'hăn hái', 'hăn hải'],
  ['mạnh mẽ', 'mạnh mẻ', 'mạn mẽ', 'mạn mẻ'],
  ['sẵn sàng', 'sẳn sàng', 'sẵn sàn', 'sẳn sàn'],
  ['tỉ mỉ', 'tĩ mĩ', 'tỉ mĩ', 'tĩ mỉ'],
  ['nghĩ ngợi', 'nghỉ ngợi', 'nghĩ ngơi', 'nghỉ ngơi'],
  ['dễ dãi', 'dể dãi', 'dễ dải', 'dể dải'],
  ['lỗ lã', 'lổ lã', 'lỗ lả', 'lổ lả'],
  ['mãi mãi', 'mải mãi', 'mãi mải', 'mải mải'],
];
const SPELLING_ITEMS = [...SPELLING_SX, ...SPELLING_CHTR, ...SPELLING_DGIR, ...SPELLING_HOI_NGA];

const chinhTa = {
  single(k) {
    const [correct, ...wrong] = SPELLING_ITEMS[k];
    return fact(
      `Trong các từ sau, từ nào viết đúng chính tả: ${[correct, ...wrong].join(', ')}?`,
      correct,
      `"${correct}" là từ viết đúng chính tả.`,
      wrong,
    );
  },
  fill(k) {
    const items = [
      ['Điền s hoặc x vào chỗ trống: ___ạch sẽ.', 's', 'Viết đúng là "sạch sẽ".'],
      ['Điền s hoặc x vào chỗ trống: ___ung quanh.', 'x', 'Viết đúng là "xung quanh".'],
      ['Điền s hoặc x vào chỗ trống: ___áng suốt.', 's', 'Viết đúng là "sáng suốt".'],
      ['Điền s hoặc x vào chỗ trống: ___uất sắc.', 'x', 'Viết đúng là "xuất sắc".'],
      ['Điền s hoặc x vào chỗ trống: ___ản xuất.', 's', 'Viết đúng là "sản xuất".'],
      ['Điền s hoặc x vào chỗ trống: ___inh xắn.', 'x', 'Viết đúng là "xinh xắn".'],
      ['Điền ch hoặc tr vào chỗ trống: ___ung thực.', 'tr', 'Viết đúng là "trung thực".'],
      ['Điền ch hoặc tr vào chỗ trống: ___ăm chỉ.', 'ch', 'Viết đúng là "chăm chỉ".'],
      ['Điền ch hoặc tr vào chỗ trống: ___ường học.', 'tr', 'Viết đúng là "trường học".'],
      ['Điền ch hoặc tr vào chỗ trống: ___ú ý.', 'ch', 'Viết đúng là "chú ý".'],
      ['Điền ch hoặc tr vào chỗ trống: ___í tuệ.', 'tr', 'Viết đúng là "trí tuệ".'],
      ['Điền ch hoặc tr vào chỗ trống: ___e chở.', 'ch', 'Viết đúng là "che chở".'],
      ['Điền d, gi hoặc r vào chỗ trống: ___ữ gìn.', 'gi', 'Viết đúng là "giữ gìn".'],
      ['Điền d, gi hoặc r vào chỗ trống: ___ũng cảm.', 'd', 'Viết đúng là "dũng cảm".'],
      ['Điền d, gi hoặc r vào chỗ trống: ___ộn ràng.', 'r', 'Viết đúng là "rộn ràng".'],
      ['Điền d, gi hoặc r vào chỗ trống: ___ảng giải.', 'gi', 'Viết đúng là "giảng giải".'],
      ['Điền d, gi hoặc r vào chỗ trống: ___ực rỡ.', 'r', 'Viết đúng là "rực rỡ".'],
      ['Chọn từ đúng: "suy ___" (nghĩ / nghỉ).', 'nghĩ', 'Viết đúng là "suy nghĩ".'],
      ['Chọn từ đúng: "vững ___" (vàng / vàn).', 'vàng', 'Viết đúng là "vững vàng".'],
      ['Chọn từ đúng: "bãi ___" (biển / biễn).', 'biển', 'Viết đúng là "bãi biển".'],
      ['Chọn từ đúng: "mạnh ___" (mẽ / mẻ).', 'mẽ', 'Viết đúng là "mạnh mẽ".'],
      ['Chọn từ đúng: "sẵn ___" (sàng / sàn).', 'sàng', 'Viết đúng là "sẵn sàng".'],
    ];
    const [prompt, answer, why] = items[k];
    return fill(prompt, [answer], why);
  },
  tf(k) {
    const items = [
      ["Từ 'sạch sẽ' viết đúng chính tả.", true, 'Đúng, "sạch sẽ" viết bằng s.'],
      ["Từ 'xạch xẽ' viết đúng chính tả.", false, 'Sai, phải viết là "sạch sẽ".'],
      ["Từ 'xung quanh' viết đúng chính tả.", true, 'Đúng, "xung quanh" viết bằng x.'],
      ["Từ 'sung quanh' viết đúng chính tả.", false, 'Sai, phải viết là "xung quanh".'],
      ["Từ 'trung thực' viết đúng chính tả.", true, 'Đúng, "trung thực" viết bằng tr.'],
      ["Từ 'chung thực' viết đúng chính tả.", false, 'Sai, phải viết là "trung thực".'],
      ["Từ 'chăm chỉ' viết đúng chính tả.", true, 'Đúng, "chăm chỉ" viết bằng ch.'],
      ["Từ 'trăm trỉ' viết đúng chính tả.", false, 'Sai, phải viết là "chăm chỉ".'],
      ["Từ 'giữ gìn' viết đúng chính tả.", true, 'Đúng, "giữ gìn" viết bằng gi.'],
      ["Từ 'dữ dìn' viết đúng chính tả.", false, 'Sai, phải viết là "giữ gìn".'],
      ["Từ 'rực rỡ' viết đúng chính tả.", true, 'Đúng, "rực rỡ" viết bằng r.'],
      ["Từ 'dực dỡ' viết đúng chính tả.", false, 'Sai, phải viết là "rực rỡ".'],
      ["Từ 'suy nghĩ' viết đúng chính tả.", true, 'Đúng, "nghĩ" viết dấu ngã.'],
      ["Từ 'suy nghỉ' viết đúng chính tả.", false, 'Sai, phải viết là "suy nghĩ".'],
      ["Từ 'vững vàng' viết đúng chính tả.", true, 'Đúng, "vững" viết dấu ngã.'],
      ["Từ 'vửng vàng' viết đúng chính tả.", false, 'Sai, phải viết là "vững vàng".'],
      ["Từ 'mạnh mẽ' viết đúng chính tả.", true, 'Đúng, "mẽ" viết dấu ngã.'],
    ];
    const [statement, value, why] = items[k];
    return tf(statement, value, why);
  },
  multi(k) {
    const items = [
      [['sạch sẽ', 'xung quanh'], ['xạch xẽ', 'sung quanh']],
      [['sáng suốt', 'xuất sắc'], ['xáng suốt', 'suất sắc']],
      [['xôn xao', 'xinh xắn'], ['sôn sao', 'sinh sắn']],
      [['sản xuất', 'sâu sắc'], ['sản suất', 'xâu xắc']],
      [['sửa sang', 'xa xôi'], ['xửa xang', 'sa sôi']],
      [['sương sớm', 'sung sướng'], ['xương xớm', 'xung xướng']],
      [['trung thực', 'chăm chỉ'], ['chung thực', 'trăm trỉ']],
      [['trường học', 'chú ý'], ['chường học', 'trú ý']],
      [['trí tuệ', 'che chở'], ['chí tuệ', 'tre trở']],
      [['trong trẻo', 'chân thành'], ['chong chẻo', 'trân thàn']],
      [['rực rỡ', 'giữ gìn'], ['dực dỡ', 'dữ dìn']],
      [['dũng cảm', 'rộn ràng'], ['giũng cảm', 'dộn dàng']],
      [['giảng giải', 'dao động'], ['dảng dải', 'giao đọng']],
      [['rạng rỡ', 'giàu có'], ['dạng dỡ', 'dàu cố']],
      [['suy nghĩ', 'vững vàng'], ['suy nghỉ', 'vửng vàng']],
      [['bãi biển', 'cẩn thận'], ['bải biển', 'cẫn thận']],
      [['mạnh mẽ', 'sẵn sàng'], ['mạnh mẻ', 'sẳn sàng']],
    ];
    const [correct, wrong] = items[k];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các từ viết đúng chính tả trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `Các từ viết đúng là ${correct.join(', ')}.`,
    );
  },
};

// ===== Từ loại =====
const NOUN_LISTS = [
  ['bàn', 'chạy', 'đẹp', 'rất'], ['sách', 'học', 'xanh', 'và'], ['mèo', 'bơi', 'cao', 'của'],
  ['mẹ', 'hát', 'nhanh', 'tôi'], ['cây', 'viết', 'tốt', 'nhưng'], ['trường', 'đi', 'vui', 'để'],
  ['hoa', 'nở', 'thơm', 'rất'], ['nước', 'uống', 'mát', 'với'], ['chim', 'bay', 'nhỏ', 'nó'],
  ['bút', 'vẽ', 'đỏ', 'mà'], ['nhà', 'xây', 'rộng', 'cho'], ['cơm', 'nấu', 'ngon', 'vì'],
  ['bạn', 'đọc', 'chăm', 'họ'], ['bố', 'làm', 'khỏe', 'nếu'], ['ghế', 'ngồi', 'mới', 'và'],
  ['em bé', 'cười', 'ngoan', 'của'],
];
const VERB_LISTS = [
  ['chạy', 'bàn', 'đẹp', 'rất'], ['học', 'sách', 'xanh', 'và'], ['bơi', 'cá', 'cao', 'của'],
  ['hát', 'mẹ', 'nhanh', 'tôi'], ['viết', 'cây', 'tốt', 'nhưng'], ['đi', 'trường', 'vui', 'để'],
  ['nở', 'hoa', 'thơm', 'với'], ['uống', 'nước', 'mát', 'nó'], ['bay', 'chim', 'nhỏ', 'mà'],
  ['vẽ', 'bút', 'đỏ', 'cho'], ['xây', 'nhà', 'rộng', 'vì'], ['nấu', 'cơm', 'ngon', 'họ'],
  ['đọc', 'bạn', 'chăm', 'nếu'], ['làm', 'bố', 'khỏe', 'và'], ['ngồi', 'ghế', 'mới', 'của'],
  ['cười', 'em bé', 'ngoan', 'rất'],
];
const ADJ_LISTS = [
  ['đẹp', 'bàn', 'chạy', 'và'], ['xanh', 'sách', 'học', 'của'], ['cao', 'mèo', 'bơi', 'tôi'],
  ['nhanh', 'mẹ', 'hát', 'nhưng'], ['tốt', 'cây', 'viết', 'để'], ['vui', 'trường', 'đi', 'với'],
  ['thơm', 'hoa', 'nở', 'nó'], ['mát', 'nước', 'uống', 'mà'], ['nhỏ', 'chim', 'bay', 'cho'],
  ['đỏ', 'bút', 'vẽ', 'vì'], ['rộng', 'nhà', 'xây', 'họ'], ['ngon', 'cơm', 'nấu', 'nếu'],
];
const PRONOUN_QHT_LISTS = [
  ['tôi', 'bàn', 'chạy', 'đẹp'], ['họ', 'sách', 'học', 'xanh'], ['chúng tôi', 'mèo', 'bơi', 'cao'],
  ['nó', 'mẹ', 'hát', 'nhanh'], ['và', 'cây', 'viết', 'tốt'], ['nhưng', 'trường', 'đi', 'vui'],
  ['của', 'hoa', 'nở', 'thơm'], ['để', 'nước', 'uống', 'mát'],
];

const tuLoai = {
  single(k) {
    if (k < 16) {
      const [correct, ...wrong] = NOUN_LISTS[k];
      return fact(`Trong các từ sau, từ nào là danh từ: ${[correct, ...wrong].join(', ')}?`, correct, `'${correct}' là danh từ.`, wrong);
    }
    if (k < 32) {
      const [correct, ...wrong] = VERB_LISTS[k - 16];
      return fact(`Trong các từ sau, từ nào là động từ: ${[correct, ...wrong].join(', ')}?`, correct, `'${correct}' là động từ.`, wrong);
    }
    if (k < 44) {
      const [correct, ...wrong] = ADJ_LISTS[k - 32];
      return fact(`Trong các từ sau, từ nào là tính từ: ${[correct, ...wrong].join(', ')}?`, correct, `'${correct}' là tính từ.`, wrong);
    }
    const [correct, ...wrong] = PRONOUN_QHT_LISTS[k - 44];
    const label = k < 48 ? 'đại từ' : 'quan hệ từ';
    return fact(`Trong các từ sau, từ nào là ${label}: ${[correct, ...wrong].join(', ')}?`, correct, `'${correct}' là ${label}.`, wrong);
  },
  fill(k) {
    const items = [
      ['bàn', 'danh'], ['sách', 'danh'], ['mèo', 'danh'], ['mẹ', 'danh'], ['cây', 'danh'],
      ['chạy', 'động'], ['học', 'động'], ['bơi', 'động'], ['hát', 'động'], ['viết', 'động'],
      ['đẹp', 'tính'], ['xanh', 'tính'], ['cao', 'tính'], ['nhanh', 'tính'], ['tốt', 'tính'],
      ['tôi', 'đại'], ['họ', 'đại'], ['chúng tôi', 'đại'], ['nó', 'đại'],
      ['và', 'quan hệ'], ['nhưng', 'quan hệ'], ['của', 'quan hệ'],
    ];
    const [word, label] = items[k];
    return fill(`Từ '${word}' là ___ từ.`, [label], `'${word}' là ${label} từ.`);
  },
  tf(k) {
    const items = [
      ["Từ 'bàn' là danh từ.", true, "Đúng, 'bàn' là danh từ."],
      ["Từ 'chạy' là danh từ.", false, "Sai, 'chạy' là động từ."],
      ["Từ 'sách' là danh từ.", true, "Đúng, 'sách' là danh từ."],
      ["Từ 'đẹp' là động từ.", false, "Sai, 'đẹp' là tính từ."],
      ["Từ 'học' là động từ.", true, "Đúng, 'học' là động từ."],
      ["Từ 'mèo' là động từ.", false, "Sai, 'mèo' là danh từ."],
      ["Từ 'xanh' là tính từ.", true, "Đúng, 'xanh' là tính từ."],
      ["Từ 'nhanh' là danh từ.", false, "Sai, 'nhanh' là tính từ."],
      ["Từ 'tôi' là đại từ.", true, "Đúng, 'tôi' là đại từ."],
      ["Từ 'và' là tính từ.", false, "Sai, 'và' là quan hệ từ."],
      ["Từ 'nhưng' là quan hệ từ.", true, "Đúng, 'nhưng' là quan hệ từ."],
      ["Từ 'của' là đại từ.", false, "Sai, 'của' là quan hệ từ."],
      ["Từ 'họ' là đại từ.", true, "Đúng, 'họ' là đại từ."],
      ["Từ 'cây' là tính từ.", false, "Sai, 'cây' là danh từ."],
      ["Từ 'vui' là tính từ.", true, "Đúng, 'vui' là tính từ."],
      ["Từ 'uống' là danh từ.", false, "Sai, 'uống' là động từ."],
      ["Từ 'để' là quan hệ từ.", true, "Đúng, 'để' là quan hệ từ."],
    ];
    const [statement, value, why] = items[k];
    return tf(statement, value, why);
  },
  multi(k) {
    const items = [
      ['danh từ', ['bàn', 'sách'], ['chạy', 'đẹp']],
      ['danh từ', ['mèo', 'mẹ'], ['bơi', 'cao']],
      ['danh từ', ['cây', 'trường'], ['viết', 'tốt']],
      ['danh từ', ['hoa', 'nước'], ['nở', 'mát']],
      ['danh từ', ['chim', 'bút'], ['bay', 'đỏ']],
      ['động từ', ['chạy', 'học'], ['bàn', 'xanh']],
      ['động từ', ['bơi', 'hát'], ['cá', 'nhanh']],
      ['động từ', ['viết', 'đi'], ['cây', 'vui']],
      ['động từ', ['nở', 'uống'], ['hoa', 'mát']],
      ['động từ', ['bay', 'vẽ'], ['chim', 'đỏ']],
      ['tính từ', ['đẹp', 'xanh'], ['bàn', 'học']],
      ['tính từ', ['cao', 'nhanh'], ['mèo', 'bơi']],
      ['tính từ', ['tốt', 'vui'], ['cây', 'viết']],
      ['tính từ', ['thơm', 'mát'], ['hoa', 'uống']],
      ['tính từ', ['nhỏ', 'đỏ'], ['chim', 'vẽ']],
      ['đại từ', ['tôi', 'họ'], ['bàn', 'chạy']],
      ['quan hệ từ', ['và', 'nhưng'], ['sách', 'đẹp']],
    ];
    const [label, correct, wrong] = items[k];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các ${label} trong nhóm: ${all.join(', ')}.`,
      correct,
      wrong,
      `Các ${label} là ${correct.join(', ')}.`,
    );
  },
};

// ===== Thành ngữ, tục ngữ =====
const IDIOMS = [
  ['Có công mài sắt, có ngày nên kim.', 'kiên trì sẽ thành công'],
  ['Uống nước nhớ nguồn.', 'biết ơn người đã giúp mình'],
  ['Lá lành đùm lá rách.', 'giúp đỡ người gặp khó khăn'],
  ['Một nắng hai sương.', 'chăm chỉ, vất vả'],
  ['Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.', 'đoàn kết tạo nên sức mạnh'],
  ['Học thầy không tày học bạn.', 'học hỏi từ bạn bè'],
  ['Không thầy đố mày làm nên.', 'vai trò quan trọng của người thầy'],
  ['Ăn quả nhớ kẻ trồng cây.', 'nhớ ơn người làm ra thành quả'],
  ['Gần mực thì đen, gần đèn thì sáng.', 'ảnh hưởng của môi trường sống'],
  ['Nhanh như cắt.', 'rất nhanh'],
  ['Chậm như rùa.', 'rất chậm'],
  ['Khỏe như voi.', 'rất khỏe'],
  ['Đẹp như tiên.', 'rất đẹp'],
  ['Im như thóc.', 'im lặng, không nói gì'],
  ['Vui như hội.', 'rất vui'],
  ['Chia ngọt sẻ bùi.', 'chia sẻ vui buồn, khó khăn'],
  ['Đồng cam cộng khổ.', 'cùng nhau chịu đựng khó khăn'],
  ['Đi một ngày đàng, học một sàng khôn.', 'đi nhiều sẽ học được nhiều điều'],
  ['Có mới nới cũ.', 'chê cái cũ, thích cái mới'],
  ['Thương người như thể thương thân.', 'yêu thương người khác như chính mình'],
];
const IDIOM_TEXTS = IDIOMS.map(([text]) => text);
const IDIOM_MEANINGS = IDIOMS.map(([, meaning]) => meaning);

const thanhNguTucNgu = {
  single(k) {
    if (k < 18) {
      const [correct, meaning] = IDIOMS[k];
      return fact(
        `Thành ngữ, tục ngữ nào nói về ${meaning}?`,
        correct,
        `"${correct}" nói về ${meaning}.`,
        others(IDIOM_TEXTS, [correct], 3, k),
      );
    }
    if (k < 36) {
      const [text, correct] = IDIOMS[k - 18];
      return fact(
        `Câu "${text}" khuyên ta điều gì?`,
        correct,
        `"${text}" có nghĩa là ${correct}.`,
        others(IDIOM_MEANINGS, [correct], 3, k),
      );
    }
    const [text, correct] = IDIOMS[k - 36];
    return fact(
      `Thành ngữ "${text}" có nghĩa là gì?`,
      correct,
      `"${text}" có nghĩa là ${correct}.`,
      others(IDIOM_MEANINGS, [correct], 3, k),
    );
  },
  fill(k) {
    const items = [
      ['Uống nước nhớ ___.', 'nguồn'],
      ['Có công mài ___, có ngày nên kim.', 'sắt'],
      ['Lá lành đùm lá ___.', 'rách'],
      ['Một nắng hai ___.', 'sương'],
      ['Ăn quả nhớ kẻ ___ cây.', 'trồng'],
      ['Gần mực thì ___, gần đèn thì sáng.', 'đen'],
      ['Nhanh như ___.', 'cắt'],
      ['Chậm như ___.', 'rùa'],
      ['Khỏe như ___.', 'voi'],
      ['Đẹp như ___.', 'tiên'],
      ['Im như ___.', 'thóc'],
      ['Vui như ___.', 'hội'],
      ['Chia ngọt sẻ ___.', 'bùi'],
      ['Đồng cam cộng ___.', 'khổ'],
      ['Đi một ngày ___, học một sàng khôn.', 'đàng'],
      ['Học thầy không tày học ___.', 'bạn'],
      ['Không ___ đố mày làm nên.', 'thầy'],
      ['Một cây làm chẳng nên ___, ba cây chụm lại nên hòn núi cao.', 'non'],
      ['Thương người như thể thương ___.', 'thân'],
      ['Có mới nới ___.', 'cũ'],
      ['Tấc đất tấc ___.', 'vàng'],
      ['Một con ngựa đau, cả tàu bỏ ___.', 'cỏ'],
    ];
    const [prompt, answer] = items[k];
    return fill(`Điền từ còn thiếu vào câu: "${prompt}"`, [answer], `Từ còn thiếu là "${answer}".`);
  },
  tf(k) {
    const items = [
      ["Câu 'Uống nước nhớ nguồn' khuyên ta biết ơn người đã giúp mình.", true, 'Đúng, câu này nói về lòng biết ơn.'],
      ["Câu 'Có công mài sắt, có ngày nên kim' khuyên ta kiên trì.", true, 'Đúng, câu này nói về sự kiên trì.'],
      ["Câu 'Lá lành đùm lá rách' khuyên ta giúp đỡ người khó khăn.", true, 'Đúng, câu này nói về sự giúp đỡ.'],
      ["Câu 'Một nắng hai sương' nói về cuộc sống nhàn rỗi.", false, 'Sai, câu này nói về sự chăm chỉ, vất vả.'],
      ["Thành ngữ 'Nhanh như cắt' có nghĩa là rất chậm.", false, 'Sai, nghĩa là rất nhanh.'],
      ["Thành ngữ 'Chậm như rùa' có nghĩa là rất chậm.", true, 'Đúng, nghĩa là rất chậm.'],
      ["Thành ngữ 'Khỏe như voi' có nghĩa là rất khỏe.", true, 'Đúng, nghĩa là rất khỏe.'],
      ["Thành ngữ 'Đẹp như tiên' có nghĩa là rất xấu.", false, 'Sai, nghĩa là rất đẹp.'],
      ["Thành ngữ 'Im như thóc' có nghĩa là nói rất nhiều.", false, 'Sai, nghĩa là im lặng, không nói gì.'],
      ["Thành ngữ 'Vui như hội' có nghĩa là rất vui.", true, 'Đúng, nghĩa là rất vui.'],
      ["Câu 'Ăn quả nhớ kẻ trồng cây' nói về lòng biết ơn.", true, 'Đúng, câu này nói về lòng biết ơn.'],
      ["Câu 'Gần mực thì đen, gần đèn thì sáng' nói về ảnh hưởng của môi trường sống.", true, 'Đúng, câu này nói về môi trường sống.'],
      ["Câu 'Học thầy không tày học bạn' khuyên ta không cần học.", false, 'Sai, câu này khuyên ta học hỏi bạn bè.'],
      ["Câu 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao' nói về đoàn kết.", true, 'Đúng, câu này nói về sức mạnh đoàn kết.'],
      ["Câu 'Chia ngọt sẻ bùi' nói về sự chia sẻ.", true, 'Đúng, câu này nói về sự chia sẻ.'],
      ["Câu 'Đi một ngày đàng, học một sàng khôn' nói về việc đi nhiều sẽ học được nhiều điều.", true, 'Đúng, câu này nói về việc học từ thực tế.'],
      ["Câu 'Thương người như thể thương thân' nói về tình yêu thương người khác.", true, 'Đúng, câu này nói về tình yêu thương.'],
    ];
    const [statement, value, why] = items[k];
    return tf(statement, value, why);
  },
  multi(k) {
    const items = [
      [['Uống nước nhớ nguồn.', 'Ăn quả nhớ kẻ trồng cây.'], ['Em đi học về.', 'Mẹ nấu cơm.']],
      [['Có công mài sắt, có ngày nên kim.', 'Đi một ngày đàng, học một sàng khôn.'], ['Bé Mai vẽ tranh.', 'Trời hôm nay đẹp.']],
      [['Lá lành đùm lá rách.', 'Chia ngọt sẻ bùi.'], ['Bố tưới cây.', 'Chim hót líu lo.']],
      [['Một nắng hai sương.', 'Đồng cam cộng khổ.'], ['Lan đọc sách.', 'Mẹ may áo.']],
      [['Nhanh như cắt.', 'Chậm như rùa.'], ['Em chạy nhanh.', 'Bạn ấy đi chậm.']],
      [['Khỏe như voi.', 'Đẹp như tiên.'], ['Ông em rất khỏe.', 'Hoa rất đẹp.']],
      [['Im như thóc.', 'Vui như hội.'], ['Cả lớp im lặng.', 'Chúng em rất vui.']],
      [['Học thầy không tày học bạn.', 'Không thầy đố mày làm nên.'], ['Em học bài.', 'Cô giáo giảng bài.']],
      [['Gần mực thì đen, gần đèn thì sáng.', 'Thương người như thể thương thân.'], ['Em thích đọc sách.', 'Bạn Nam chơi bóng.']],
      [['Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.', 'Đồng cam cộng khổ.'], ['Cây bàng rất cao.', 'Em quét nhà.']],
      [['Có mới nới cũ.', 'Một nắng hai sương.'], ['Nhà em có con mèo.', 'Bé Mai hát.']],
      [['Tấc đất tấc vàng.', 'Một con ngựa đau, cả tàu bỏ cỏ.'], ['Đất vườn rất rộng.', 'Con ngựa đang chạy.']],
      [['Uống nước nhớ nguồn.', 'Lá lành đùm lá rách.'], ['Em uống nước.', 'Bạn Lan đến thăm em.']],
      [['Có công mài sắt, có ngày nên kim.', 'Một nắng hai sương.'], ['Em mài dao.', 'Bố đi làm.']],
      [['Nhanh như cắt.', 'Khỏe như voi.'], ['Máy bay bay nhanh.', 'Voi rất to.']],
      [['Chậm như rùa.', 'Im như thóc.'], ['Rùa bò chậm.', 'Lớp học im lặng.']],
      [['Ăn quả nhớ kẻ trồng cây.', 'Chia ngọt sẻ bùi.'], ['Em ăn quả.', 'Mẹ chia kẹo.']],
    ];
    const [correct, wrong] = items[k];
    const all = [correct[0], wrong[0], correct[1], wrong[1]];
    return multiFact(
      `Chọn tất cả các thành ngữ, tục ngữ trong nhóm: ${all.join(' ')}`,
      correct,
      wrong,
      `Các thành ngữ, tục ngữ là: ${correct.join(' ')}`,
    );
  },
};

export const VIETNAMESE_GRADE_5 = {
  'tieng-viet-5-tu-dong-nghia-trai-nghia': dongNghiaTraiNghia,
  'tieng-viet-5-dai-tu-quan-he-tu': daiTuQuanHeTu,
  'tieng-viet-5-cau-ghep': cauGhep,
  'tieng-viet-5-doc-hieu': docHieu5,
  'tieng-viet-5-chinh-ta': chinhTa,
  'tieng-viet-5-tu-loai': tuLoai,
  'tieng-viet-5-thanh-ngu-tuc-ngu': thanhNguTucNgu,
};
