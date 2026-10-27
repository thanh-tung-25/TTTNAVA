import { fact, fill, multiFact, tf } from './math-utils.js';

function at(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function noise(pool, correct, seed, count = 3) {
  const result = [];
  const used = new Set([String(correct).trim().toLowerCase()]);
  for (let i = 0; i < pool.length * 3 && result.length < count; i += 1) {
    const item = pool[(seed + i) % pool.length];
    const key = String(item).trim().toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    result.push(item);
  }
  if (result.length < count) throw new Error(`Thiếu phương án nhiễu cho "${correct}"`);
  return result;
}

// ===== Thì hiện tại đơn =====
const PS_VERBS = [
  ['read', 'reads', 'books every evening'],
  ['go', 'goes', 'to school by bus'],
  ['watch', 'watches', 'TV after dinner'],
  ['do', 'does', 'the homework after school'],
  ['have', 'has', 'breakfast at six'],
  ['play', 'plays', 'badminton on Sundays'],
  ['study', 'studies', 'English every day'],
  ['wash', 'washes', 'the dishes after meals'],
  ['sweep', 'sweeps', 'the floor every morning'],
  ['teach', 'teaches', 'math at my school'],
  ['fix', 'fixes', 'bikes in the afternoon'],
  ['carry', 'carries', 'a heavy bag to school'],
  ['fly', 'flies', 'kites in the park'],
  ['enjoy', 'enjoys', 'reading comics'],
  ['buy', 'buys', 'fruit at the market'],
  ['say', 'says', 'hello to everyone'],
  ['swim', 'swims', 'in the pool every Sunday'],
  ['run', 'runs', 'in the playground'],
  ['eat', 'eats', 'rice for lunch'],
  ['drink', 'drinks', 'milk every morning'],
  ['like', 'likes', 'orange juice'],
  ['work', 'works', 'in a hospital'],
  ['live', 'lives', 'in Hanoi'],
  ['help', 'helps', 'old people in the neighbourhood'],
];
const PS_SUBJECTS = ['She', 'He', 'Lan', 'Nam', 'My sister', 'My brother', 'Mai', 'Tom', 'My father', 'My mother'];
const PS_PLURALS = ['They', 'We', 'My friends', 'The students'];
const PS_QUESTIONS = [
  ['she', 'play', 'the piano', 'Does'],
  ['you', 'like', 'orange juice', 'Do'],
  ['he', 'go', 'to school by bus', 'Does'],
  ['they', 'watch', 'TV in the evening', 'Do'],
  ['Lan', 'study', 'English every day', 'Does'],
  ['your friends', 'play', 'badminton', 'Do'],
  ['Nam', 'have', 'breakfast at six', 'Does'],
  ['we', 'need', 'our books', 'Do'],
  ['your sister', 'cook', 'dinner', 'Does'],
  ['the students', 'do', 'their homework', 'Do'],
];
const PS_NEG_FILL = [
  ['She', 'like', 'fish', ["doesn't like", 'does not like']],
  ['They', 'play', 'tennis', ["don't play", 'do not play']],
  ['He', 'watch', 'TV at night', ["doesn't watch", 'does not watch']],
  ['We', 'have', 'lunch at school', ["don't have", 'do not have']],
  ['Lan', 'go', 'to school on Sunday', ["doesn't go", 'does not go']],
  ['My friends', 'study', 'French', ["don't study", 'do not study']],
];
const PS_ADVERBS = ['always', 'usually', 'often', 'sometimes', 'rarely', 'never'];
const PS_RULES_TRUE = [
  {
    statement: 'Trong thì hiện tại đơn, chủ ngữ số ít (he, she, it) đi với động từ thêm -s hoặc -es.',
    explanation: 'Đúng: chủ ngữ ngôi thứ ba số ít cần thêm -s/-es vào động từ.',
  },
  {
    statement: 'Động từ "watch" khi đi với chủ ngữ số ít có dạng "watches".',
    explanation: 'Đúng: "watch" tận cùng bằng -ch nên thêm -es thành "watches".',
  },
  {
    statement: 'Câu hỏi ở thì hiện tại đơn với chủ ngữ "you" bắt đầu bằng "Do".',
    explanation: 'Đúng: "you" đi với trợ động từ "Do", ví dụ "Do you like milk?".',
  },
  {
    statement: 'Trạng từ tần suất như "always", "usually" thường đứng trước động từ thường.',
    explanation: 'Đúng: "She always goes to school on time".',
  },
];
const PS_RULES_FALSE = [
  {
    statement: 'Trong thì hiện tại đơn, chủ ngữ "they" đi với động từ thêm -s.',
    explanation: 'Sai: "they" là số nhiều nên dùng động từ nguyên mẫu, không thêm -s.',
  },
  {
    statement: "Trợ động từ phủ định dùng với chủ ngữ \"he\" là \"don't\".",
    explanation: 'Sai: "he" dùng "doesn\'t", ví dụ "He doesn\'t like fish".',
  },
  {
    statement: 'Động từ "go" khi đi với chủ ngữ số ít có dạng "gos".',
    explanation: 'Sai: "go" thêm -es thành "goes".',
  },
];

// ===== Thì quá khứ đơn =====
const PAST_VERBS = [
  ['play', 'played', 'football in the yard'],
  ['watch', 'watched', 'a cartoon'],
  ['visit', 'visited', 'my grandparents'],
  ['clean', 'cleaned', 'my room'],
  ['cook', 'cooked', 'dinner for the family'],
  ['help', 'helped', 'my mother with the housework'],
  ['study', 'studied', 'English for two hours'],
  ['carry', 'carried', 'a big box upstairs'],
  ['paint', 'painted', 'a picture of the sea'],
  ['listen', 'listened', 'to music after dinner'],
  ['go', 'went', 'to the zoo last Sunday'],
  ['have', 'had', 'a big breakfast this morning'],
  ['do', 'did', 'my homework last night'],
  ['see', 'saw', 'a rainbow after the rain'],
  ['eat', 'ate', 'noodles for lunch'],
  ['take', 'took', 'a lot of photos'],
  ['buy', 'bought', 'a present for my sister'],
  ['write', 'wrote', 'a letter to my friend'],
  ['meet', 'met', 'my old teacher at the market'],
  ['come', 'came', 'to my house yesterday'],
  ['sing', 'sang', 'an English song'],
  ['draw', 'drew', 'a picture of my family'],
  ['ride', 'rode', 'a bike to the park'],
  ['drink', 'drank', 'a lot of water'],
];
const PAST_MULTI = [
  ['play', 'played', 'football after school'],
  ['watch', 'watched', 'a funny cartoon'],
  ['visit', 'visited', 'the museum last weekend'],
  ['clean', 'cleaned', 'the classroom'],
  ['cook', 'cooked', 'dinner for the family'],
  ['help', 'helped', 'the old man'],
  ['study', 'studied', 'English for two hours'],
  ['carry', 'carried', 'a big box'],
  ['paint', 'painted', 'a picture of the sea'],
  ['listen', 'listened', 'to music after dinner'],
  ['go', 'went', 'to the zoo last Sunday'],
  ['have', 'had', 'a big breakfast'],
  ['do', 'did', 'the homework'],
  ['see', 'saw', 'a rainbow'],
  ['eat', 'ate', 'noodles for lunch'],
  ['take', 'took', 'a lot of photos'],
  ['buy', 'bought', 'a present for Mom'],
];
const PAST_TIME_GROUPS = [
  [['yesterday', 'last night'], ['tomorrow', 'now']],
  [['last week', 'two days ago'], ['next week', 'every day']],
  [['in 2019', 'last Sunday'], ['today', 'tonight']],
  [['when I was small', 'yesterday morning'], ['at the moment', 'this evening']],
  [['last summer', 'an hour ago'], ['next summer', 'right now']],
  [['yesterday afternoon', 'last month'], ['tomorrow morning', 'next month']],
  [['two years ago', 'last Friday'], ['next Friday', 'every morning']],
];
const PAST_QUESTIONS = [
  ['you', 'go', 'to the zoo yesterday'],
  ['she', 'watch', 'TV last night'],
  ['they', 'play', 'football yesterday'],
  ['he', 'visit', 'his grandparents last weekend'],
  ['Lan', 'study', 'English last night'],
  ['you', 'have', 'breakfast this morning'],
  ['Nam', 'do', 'his homework last night'],
  ['your friends', 'come', 'to the party last Sunday'],
];
const PAST_NEG_FILL = [
  ['I', 'go', 'to school yesterday', ["didn't go", 'did not go']],
  ['She', 'watch', 'TV last night', ["didn't watch", 'did not watch']],
  ['They', 'play', 'football yesterday', ["didn't play", 'did not play']],
  ['He', 'have', 'breakfast this morning', ["didn't have", 'did not have']],
  ['We', 'visit', 'the museum last week', ["didn't visit", 'did not visit']],
  ['Lan', 'do', 'her homework last night', ["didn't do", 'did not do']],
];
const PAST_RULES_TRUE = [
  {
    statement: 'Thì quá khứ đơn của động từ "go" là "went".',
    explanation: 'Đúng: "go" là động từ bất quy tắc, quá khứ là "went".',
  },
  {
    statement: 'Câu phủ định ở thì quá khứ đơn dùng "didn\'t" + động từ nguyên mẫu.',
    explanation: 'Đúng: ví dụ "She didn\'t go to school yesterday".',
  },
  {
    statement: 'Câu hỏi ở thì quá khứ đơn bắt đầu bằng "Did".',
    explanation: 'Đúng: ví dụ "Did you watch TV last night?".',
  },
  {
    statement: 'Trạng từ "yesterday" thường đi với thì quá khứ đơn.',
    explanation: 'Đúng: "yesterday" chỉ thời gian đã qua nên dùng thì quá khứ đơn.',
  },
];
const PAST_RULES_FALSE = [
  {
    statement: 'Thì quá khứ đơn của động từ "study" là "studyed".',
    explanation: 'Sai: "study" đổi y thành i rồi thêm -ed thành "studied".',
  },
  {
    statement: 'Câu phủ định ở thì quá khứ đơn dùng "didn\'t" + động từ thêm -ed.',
    explanation: 'Sai: sau "didn\'t" phải dùng động từ nguyên mẫu: "didn\'t go".',
  },
  {
    statement: 'Chủ ngữ "she" ở thì quá khứ đơn dùng động từ thêm -s.',
    explanation: 'Sai: thì quá khứ đơn không thêm -s, ví dụ "She played badminton".',
  },
];

const pastSimple = {
  single(k) {
    if (k < 24) {
      const [base, past, tail] = PAST_VERBS[k];
      return fact(
        `Chọn dạng quá khứ đơn đúng: I ___ (${base}) ${tail}.`,
        past,
        `Thì quá khứ đơn của "${base}" là "${past}".`,
        [base, `${base}ing`, `${base}s`],
      );
    }
    if (k < 34) {
      const [base, past, tail] = PAST_VERBS[k - 14];
      return fact(
        `Chọn câu phủ định đúng ở thì quá khứ đơn: "I ___ (not ${base}) ${tail}."`,
        `didn't ${base}`,
        `Sau "didn't" dùng động từ nguyên mẫu: "I didn't ${base} ${tail}".`,
        [`don't ${base}`, `didn't ${past}`, `not ${base}`],
      );
    }
    if (k < 42) {
      const [subject, base, tail] = PAST_QUESTIONS[k - 34];
      return fact(
        `Chọn từ đúng để mở đầu câu hỏi: "___ ${subject} ${base} ${tail}?"`,
        'Did',
        'Câu hỏi ở thì quá khứ đơn bắt đầu bằng "Did" + động từ nguyên mẫu.',
        ['Do', 'Was', 'Were'],
      );
    }
    const [base, past] = PAST_VERBS[(k - 42) * 2 % PAST_VERBS.length];
    const pool = PAST_VERBS.map((entry) => entry[1]);
    return fact(
      `Dạng quá khứ của động từ "${base}" là gì?`,
      past,
      `"${base}" có dạng quá khứ là "${past}".`,
      noise(pool, past, k),
    );
  },
  multi(k) {
    if (k < 10) {
      const [base, past, tail] = PAST_MULTI[k];
      return multiFact(
        `Chọn 2 câu đúng ở thì quá khứ đơn với động từ "${base}":`,
        [`I ${past} ${tail}.`, `We ${past} ${tail}.`],
        [`I ${base} ${tail}.`, `We ${base} ${tail}.`],
        `Thì quá khứ đơn dùng "${past}" cho mọi chủ ngữ, không dùng "${base}".`,
      );
    }
    const [good, bad] = PAST_TIME_GROUPS[k - 10];
    const all = [good[0], bad[0], good[1], bad[1]];
    return multiFact(
      `Chọn 2 cụm từ chỉ thời gian thường dùng với thì quá khứ đơn trong nhóm: ${all.join(', ')}.`,
      good,
      bad,
      `"${good[0]}" và "${good[1]}" chỉ thời gian đã qua nên dùng thì quá khứ đơn.`,
    );
  },
  tf(k) {
    if (k < 10) {
      const [base, past] = PAST_VERBS[k];
      const isTrue = k % 2 === 0;
      const shown = isTrue ? past : at(PAST_VERBS, k + 7)[1];
      return tf(
        `Dạng quá khứ của động từ "${base}" là "${shown}".`,
        isTrue,
        isTrue
          ? `Đúng: "${base}" có dạng quá khứ là "${past}".`
          : `Sai: "${base}" có dạng quá khứ là "${past}", không phải "${shown}".`,
      );
    }
    const index = k - 10;
    const [base, past, tail] = PAST_VERBS[index];
    const isTrue = k % 2 === 0;
    const sentence = isTrue ? `I ${past} ${tail}.` : `I ${base} ${tail}.`;
    return tf(
      `Câu "${sentence}" dùng đúng thì quá khứ đơn.`,
      isTrue,
      isTrue
        ? `Đúng: "${base}" ở quá khứ là "${past}".`
        : `Sai: phải dùng "${past}" thay cho "${base}".`,
    );
  },
  fill(k) {
    if (k < 10) {
      const [base, past, tail] = PAST_VERBS[k];
      return fill(
        `Điền dạng quá khứ của động từ "${base}": I ___ ${tail}.`,
        [past],
        `Thì quá khứ đơn của "${base}" là "${past}".`,
      );
    }
    if (k < 16) {
      const [subject, base, tail] = PAST_QUESTIONS[k - 10];
      return fill(
        `Điền trợ động từ thích hợp: "___ ${subject} ${base} ${tail}?"`,
        ['Did'],
        'Câu hỏi ở thì quá khứ đơn dùng "Did" + động từ nguyên mẫu.',
      );
    }
    const [subject, base, tail, accepted] = PAST_NEG_FILL[k - 16];
    return fill(
      `Điền dạng phủ định của động từ "${base}": "${subject} ___ (not) ${tail}."`,
      accepted,
      `Câu phủ định ở thì quá khứ đơn: "${subject} ${accepted[0]} ${tail}".`,
    );
  },
};

// ===== So sánh hơn và so sánh nhất =====
const ADJ = [
  ['tall', 'taller', 'tallest', 'short'],
  ['big', 'bigger', 'biggest', 'short'],
  ['small', 'smaller', 'smallest', 'short'],
  ['fast', 'faster', 'fastest', 'short'],
  ['slow', 'slower', 'slowest', 'short'],
  ['long', 'longer', 'longest', 'short'],
  ['short', 'shorter', 'shortest', 'short'],
  ['old', 'older', 'oldest', 'short'],
  ['young', 'younger', 'youngest', 'short'],
  ['strong', 'stronger', 'strongest', 'short'],
  ['cold', 'colder', 'coldest', 'short'],
  ['hot', 'hotter', 'hottest', 'short'],
  ['thin', 'thinner', 'thinnest', 'short'],
  ['fat', 'fatter', 'fattest', 'short'],
  ['new', 'newer', 'newest', 'short'],
  ['cheap', 'cheaper', 'cheapest', 'short'],
  ['high', 'higher', 'highest', 'short'],
  ['low', 'lower', 'lowest', 'short'],
  ['happy', 'happier', 'happiest', 'y'],
  ['easy', 'easier', 'easiest', 'y'],
  ['pretty', 'prettier', 'prettiest', 'y'],
  ['busy', 'busier', 'busiest', 'y'],
  ['heavy', 'heavier', 'heaviest', 'y'],
  ['early', 'earlier', 'earliest', 'y'],
  ['beautiful', 'more beautiful', 'most beautiful', 'long'],
  ['expensive', 'more expensive', 'most expensive', 'long'],
  ['interesting', 'more interesting', 'most interesting', 'long'],
  ['difficult', 'more difficult', 'most difficult', 'long'],
  ['delicious', 'more delicious', 'most delicious', 'long'],
  ['modern', 'more modern', 'most modern', 'long'],
  ['good', 'better', 'best', 'special'],
  ['bad', 'worse', 'worst', 'special'],
  ['many', 'more', 'most', 'special'],
  ['far', 'farther', 'farthest', 'special'],
];
const ADJ_MAP = new Map(ADJ.map((entry) => [entry[0], entry]));

function wrongComparative(entry) {
  const [base, , , kind] = entry;
  return kind === 'long' ? `${base}er` : `more ${base}`;
}
function wrongSuperlative(entry) {
  const [base, , , kind] = entry;
  return kind === 'long' ? `${base}est` : `most ${base}`;
}
function comparativeHelp(entry) {
  const [base, comp, , kind] = entry;
  if (kind === 'long') return `Tính từ dài "${base}" dùng "more" + tính từ → "${comp}".`;
  if (kind === 'y') return `Tính từ tận cùng bằng -y: đổi y thành i rồi thêm -er → "${comp}".`;
  if (kind === 'special') return `"${base}" là tính từ bất quy tắc, so sánh hơn là "${comp}".`;
  return `Tính từ ngắn "${base}" thêm -er → "${comp}".`;
}
function superlativeHelp(entry) {
  const [base, , sup, kind] = entry;
  if (kind === 'long') return `Tính từ dài "${base}" dùng "the most" + tính từ → "the ${sup}".`;
  if (kind === 'y') return `Tính từ tận cùng bằng -y: đổi y thành i rồi thêm -est → "${sup}".`;
  if (kind === 'special') return `"${base}" là tính từ bất quy tắc, so sánh nhất là "the ${sup}".`;
  return `Tính từ ngắn "${base}" thêm -est → "${sup}".`;
}
const CMP_SENTENCES = [
  ['fast', 'A car is ___ than a bike.'],
  ['tall', 'Nam is ___ than his brother.'],
  ['big', 'An elephant is ___ than a cat.'],
  ['hot', 'Summer is ___ than spring in Viet Nam.'],
  ['happy', 'Lan is ___ today than yesterday.'],
  ['easy', 'This test is ___ than the last one.'],
  ['expensive', 'A phone is ___ than a book.'],
  ['beautiful', 'This garden is ___ than that one.'],
  ['cold', 'Winter is ___ than autumn.'],
  ['long', 'The Nile is ___ than the Red River.'],
  ['heavy', 'A bag of rice is ___ than a bag of chips.'],
  ['interesting', 'This book is ___ than that one.'],
];
const CMP_PAIRS = [
  ['Nam', 'Ba', 'tall'],
  ['This tree', 'that tree', 'big'],
  ['My bag', 'your bag', 'heavy'],
  ['Today', 'yesterday', 'hot'],
  ['Lan', 'Mai', 'happy'],
  ['A bike', 'a car', 'slow'],
  ['The red pen', 'the blue pen', 'long'],
  ['This exercise', 'that exercise', 'easy'],
  ['Winter', 'autumn', 'cold'],
  ['This road', 'that road', 'short'],
];
const CMP_FILL_SENTENCES = [
  ['big', 'My house is ___ than yours.'],
  ['new', 'This phone is ___ than my old phone.'],
  ['good', 'Her English is ___ than mine.'],
  ['bad', 'The weather today is ___ than yesterday.'],
];

const comparatives = {
  single(k) {
    if (k < 20) {
      const entry = ADJ[k];
      const [base, comp, sup] = entry;
      return fact(
        `Dạng so sánh hơn của tính từ "${base}" là gì?`,
        comp,
        comparativeHelp(entry),
        [sup, base, wrongComparative(entry)],
      );
    }
    if (k < 32) {
      const [base, sentence] = CMP_SENTENCES[k - 20];
      const entry = ADJ_MAP.get(base);
      const [word, comp, sup] = entry;
      return fact(
        `Chọn dạng đúng của tính từ "${word}" để hoàn thành câu: "${sentence}"`,
        comp,
        comparativeHelp(entry),
        [word, sup, wrongComparative(entry)],
      );
    }
    if (k < 42) {
      const entry = ADJ[k - 12];
      const [base, comp, sup] = entry;
      return fact(
        `Dạng so sánh nhất của tính từ "${base}" là gì?`,
        sup,
        superlativeHelp(entry),
        [comp, base, wrongSuperlative(entry)],
      );
    }
    const [a, b, base] = CMP_PAIRS[k - 42];
    const entry = ADJ_MAP.get(base);
    const [word, comp, sup] = entry;
    return fact(
      `Chọn câu so sánh đúng giữa ${a} và ${b} với tính từ "${word}":`,
      `${a} is ${comp} than ${b}.`,
      `So sánh hơn: "${a} is ${comp} than ${b}".`,
      [`${a} is ${sup} than ${b}.`, `${a} is ${word} than ${b}.`, `${a} is ${wrongComparative(entry)} than ${b}.`],
    );
  },
  multi(k) {
    if (k < 9) {
      const entry = ADJ[k];
      const [base, comp, sup] = entry;
      return multiFact(
        `Chọn 2 dạng đúng của tính từ "${base}" (so sánh hơn và so sánh nhất).`,
        [comp, sup],
        [base, wrongComparative(entry)],
        `So sánh hơn: "${comp}", so sánh nhất: "the ${sup}".`,
      );
    }
    const entry = ADJ[k + 1];
    const [base, comp, sup] = entry;
    return multiFact(
      `Chọn 2 nhận xét đúng về cách tạo so sánh với tính từ "${base}".`,
      [`So sánh hơn: ${comp}`, `So sánh nhất: the ${sup}`],
      [`So sánh hơn: ${wrongComparative(entry)}`, `So sánh nhất: the ${base}`],
      `So sánh hơn: "${comp}", so sánh nhất: "the ${sup}".`,
    );
  },
  tf(k) {
    if (k < 10) {
      const entry = ADJ[k];
      const [base, comp, sup] = entry;
      const isTrue = k % 2 === 0;
      const shown = isTrue ? comp : wrongComparative(entry);
      return tf(
        `Dạng so sánh hơn của tính từ "${base}" là "${shown}".`,
        isTrue,
        isTrue ? comparativeHelp(entry) : `Sai: so sánh hơn của "${base}" là "${comp}".`,
      );
    }
    const index = k - 10;
    const [a, b, base] = CMP_PAIRS[index + 3];
    const entry = ADJ_MAP.get(base);
    const [word, comp, sup] = entry;
    const isTrue = k % 2 === 0;
    const sentence = isTrue ? `${a} is ${comp} than ${b}.` : `${a} is ${sup} than ${b}.`;
    return tf(
      `Câu "${sentence}" dùng đúng dạng so sánh hơn của "${word}".`,
      isTrue,
      isTrue
        ? `Đúng: so sánh hơn của "${word}" là "${comp}".`
        : `Sai: "${sup}" là so sánh nhất, phải dùng "${comp}" trước "than".`,
    );
  },
  fill(k) {
    if (k < 10) {
      const entry = ADJ[k];
      return fill(
        `Dạng so sánh hơn của tính từ "${entry[0]}" là ___.`,
        [entry[1]],
        comparativeHelp(entry),
      );
    }
    if (k < 18) {
      const entry = ADJ[k];
      return fill(
        `Dạng so sánh nhất của tính từ "${entry[0]}" là ___.`,
        [entry[2], `the ${entry[2]}`],
        superlativeHelp(entry),
      );
    }
    const [base, sentence] = CMP_FILL_SENTENCES[k - 18];
    const entry = ADJ_MAP.get(base);
    return fill(
      `Điền dạng so sánh hơn của "${base}": "${sentence}"`,
      [entry[1]],
      comparativeHelp(entry),
    );
  },
};

// ===== Thời tiết và mùa =====
const WEATHER = [
  ['sunny', 'nắng'],
  ['rainy', 'mưa'],
  ['cloudy', 'nhiều mây'],
  ['windy', 'có gió'],
  ['snowy', 'có tuyết'],
  ['stormy', 'có bão'],
  ['foggy', 'có sương mù'],
  ['hot', 'nóng'],
  ['cold', 'lạnh'],
  ['warm', 'ấm'],
  ['cool', 'mát'],
  ['freezing', 'rét buốt'],
  ['humid', 'ẩm ướt'],
  ['dry', 'khô'],
  ['wet', 'ướt'],
  ['chilly', 'se lạnh'],
];
const WEATHER_EN = WEATHER.map((entry) => entry[0]);
const SEASONS = [
  ['spring', 'xuân'],
  ['summer', 'hè'],
  ['autumn', 'thu'],
  ['winter', 'đông'],
];
const SEASON_SINGLE = [
  ['Mùa "spring" trong tiếng Việt là gì?', 'mùa xuân', ['mùa hè', 'mùa thu', 'mùa đông']],
  ['Mùa "summer" trong tiếng Việt là gì?', 'mùa hè', ['mùa xuân', 'mùa thu', 'mùa đông']],
  ['Mùa "autumn" trong tiếng Việt là gì?', 'mùa thu', ['mùa xuân', 'mùa hè', 'mùa đông']],
  ['Mùa "winter" trong tiếng Việt là gì?', 'mùa đông', ['mùa xuân', 'mùa hè', 'mùa thu']],
  ['Mùa xuân trong tiếng Anh là gì?', 'spring', ['summer', 'autumn', 'winter']],
  ['Mùa hè trong tiếng Anh là gì?', 'summer', ['spring', 'autumn', 'winter']],
  ['Mùa thu trong tiếng Anh là gì?', 'autumn', ['spring', 'summer', 'winter']],
  ['Mùa đông trong tiếng Anh là gì?', 'winter', ['spring', 'summer', 'autumn']],
  ['Mùa nào thường có tuyết rơi?', 'winter', ['summer', 'spring', 'autumn']],
  ['Mùa nào thường nóng nhất trong năm?', 'summer', ['winter', 'autumn', 'spring']],
];
const WEATHER_SENTENCES = [
  ['It is ___ today. We need an umbrella.', 'rainy', ['sunny', 'dry', 'hot']],
  ['Look at the sky! It is very ___ . I can see many white clouds.', 'cloudy', ['sunny', 'dry', 'hot']],
  ["It is ___ today. Let's fly a kite.", 'windy', ['foggy', 'dry', 'cold']],
  ['It is ___ in Sa Pa in winter. The water freezes.', 'freezing', ['warm', 'hot', 'cool']],
  ['The children are making a snowman. It is ___ .', 'snowy', ['sunny', 'hot', 'dry']],
  ['It is ___ today. I need a fan.', 'hot', ['cold', 'freezing', 'cool']],
  ['Wear a warm coat. It is ___ outside.', 'cold', ['hot', 'sunny', 'warm']],
  ["It is ___ today. We can't see the road clearly.", 'foggy', ['sunny', 'dry', 'windy']],
  ['There is a lot of wind and rain. It is ___ .', 'stormy', ['sunny', 'dry', 'cool']],
  ['It is ___ today. The sun is shining brightly.', 'sunny', ['rainy', 'snowy', 'foggy']],
];
const WEATHER_GROUPS = [
  ['lạnh', ['cold', 'freezing'], ['hot', 'sunny']],
  ['nóng', ['hot', 'warm'], ['cold', 'cool']],
  ['mưa', ['rainy', 'stormy'], ['sunny', 'dry']],
  ['khô', ['dry', 'sunny'], ['wet', 'rainy']],
  ['có gió', ['windy', 'stormy'], ['foggy', 'cloudy']],
  ['có tuyết', ['snowy', 'freezing'], ['hot', 'sunny']],
  ['mát', ['cool', 'chilly'], ['hot', 'warm']],
  ['ẩm ướt', ['humid', 'wet'], ['dry', 'sunny']],
  ['có sương mù', ['foggy', 'cloudy'], ['sunny', 'dry']],
];
const WEATHER_FILL_SENTENCES = [
  ['The weather is ___ . Take an umbrella with you.', 'rainy'],
  ['The wind is strong. It is ___ today.', 'windy'],
  ['There are many dark clouds. It is ___ .', 'cloudy'],
  ['The road is white because it is ___ .', 'snowy'],
  ['I cannot see the mountain because it is ___ .', 'foggy'],
  ['It is very ___ in Sa Pa in winter. Water turns into ice.', 'freezing'],
  ['The weather is ___ . I want a cold drink.', 'hot'],
  ['The temperature is about 35 degrees. It is ___ today.', 'hot'],
  ['My shoes are ___ because I walked in the rain.', 'wet'],
  ['The air is very ___ today, so my clothes feel wet.', 'humid'],
];

const weatherSeasons = {
  single(k) {
    if (k < 16) {
      const [en, vi] = WEATHER[k];
      return fact(
        `Từ tiếng Anh chỉ "trời ${vi}" là gì?`,
        en,
        `"Trời ${vi}" trong tiếng Anh là "${en}".`,
        noise(WEATHER_EN, en, k),
      );
    }
    if (k < 32) {
      const [en, vi] = WEATHER[k - 16];
      const pool = WEATHER.map((entry) => `trời ${entry[1]}`);
      return fact(
        `Từ "${en}" có nghĩa là gì?`,
        `trời ${vi}`,
        `"${en}" nghĩa là "trời ${vi}".`,
        noise(pool, `trời ${vi}`, k),
      );
    }
    if (k < 42) {
      const [prompt, correct, wrong] = SEASON_SINGLE[k - 32];
      return fact(prompt, correct, `Đáp án đúng là "${correct}".`, wrong);
    }
    const [sentence, correct, wrong] = WEATHER_SENTENCES[k - 42];
    return fact(
      `Chọn từ chỉ thời tiết đúng: "${sentence}"`,
      correct,
      `"${correct}" phù hợp với câu: "${sentence.replace('___', correct)}"`,
      wrong,
    );
  },
  multi(k) {
    if (k < 9) {
      const [label, good, bad] = WEATHER_GROUPS[k];
      const all = [good[0], bad[0], good[1], bad[1]];
      return multiFact(
        `Chọn 2 từ chỉ thời tiết ${label} trong nhóm: ${all.join(', ')}.`,
        good,
        bad,
        `"${good[0]}" và "${good[1]}" là các từ chỉ thời tiết ${label}.`,
      );
    }
    const [en, vi] = WEATHER[k - 9];
    return multiFact(
      `Chọn 2 câu đúng để nói về thời tiết khi trời ${vi}.`,
      [`It is ${en} today.`, `The weather is ${en} today.`],
      [`It ${en} today.`, `It are ${en} today.`],
      `Đúng: "It is ${en} today" - câu phải có động từ "is" và không thêm -s cho tính từ.`,
    );
  },
  tf(k) {
    if (k < 10) {
      const [en, vi] = WEATHER[k];
      const isTrue = k % 2 === 0;
      const shown = isTrue ? `trời ${vi}` : `trời ${at(WEATHER, k + 5)[1]}`;
      return tf(
        `Từ "${en}" có nghĩa là "${shown}".`,
        isTrue,
        isTrue ? `Đúng: "${en}" là "trời ${vi}".` : `Sai: "${en}" là "trời ${vi}", không phải "${shown}".`,
      );
    }
    const [en] = at(WEATHER, k);
    const isTrue = k % 2 === 0;
    const sentence = isTrue ? `It is ${en} today.` : `It are ${en} today.`;
    return tf(
      `Câu "${sentence}" là câu đúng.`,
      isTrue,
      isTrue ? `Đúng: "It is ${en} today" dùng đúng động từ "is".` : `Sai: phải dùng "It is ${en} today".`,
    );
  },
  fill(k) {
    if (k < 8) {
      const [en, vi] = WEATHER[k];
      return fill(
        `Trời ${vi} trong tiếng Anh là ___.`,
        [en],
        `"Trời ${vi}" là "${en}".`,
      );
    }
    if (k < 12) {
      const [en, vi] = SEASONS[k - 8];
      return fill(
        `Mùa ${vi} trong tiếng Anh là ___.`,
        [en],
        `"Mùa ${vi}" là "${en}".`,
      );
    }
    const [sentence, correct] = WEATHER_FILL_SENTENCES[k - 12];
    return fill(
      `Điền từ chỉ thời tiết: "${sentence}"`,
      [correct],
      `"${correct}" phù hợp với câu: "${sentence.replace('___', correct)}"`,
    );
  },
};

// ===== Sở thích =====
const HOBBIES = [
  ['reading books', 'đọc sách', 'read books'],
  ['playing football', 'chơi bóng đá', 'play football'],
  ['swimming', 'bơi lội', 'swim'],
  ['drawing pictures', 'vẽ tranh', 'draw pictures'],
  ['singing', 'ca hát', 'sing'],
  ['dancing', 'nhảy múa', 'dance'],
  ['cooking', 'nấu ăn', 'cook'],
  ['gardening', 'làm vườn', 'do gardening'],
  ['collecting stamps', 'sưu tầm tem', 'collect stamps'],
  ['playing chess', 'chơi cờ vua', 'play chess'],
  ['listening to music', 'nghe nhạc', 'listen to music'],
  ['watching TV', 'xem ti vi', 'watch TV'],
  ['riding a bike', 'đi xe đạp', 'ride a bike'],
  ['flying kites', 'thả diều', 'fly kites'],
  ['taking photos', 'chụp ảnh', 'take photos'],
  ['playing the piano', 'chơi đàn piano', 'play the piano'],
  ['doing puzzles', 'chơi xếp hình', 'do puzzles'],
  ['fishing', 'câu cá', 'go fishing'],
];
const HOBBY_EN = HOBBIES.map((entry) => entry[0]);
const HOBBY_VI = HOBBIES.map((entry) => entry[1]);
const HOBBY_ING_SENTENCES = [
  ['read', 'reading', 'I enjoy ___ books in my free time.'],
  ['play', 'playing', 'My brother likes ___ football after school.'],
  ['swim', 'swimming', 'Lan loves ___ in the sea.'],
  ['draw', 'drawing', 'I like ___ pictures of animals.'],
  ['sing', 'singing', 'My sister enjoys ___ English songs.'],
  ['dance', 'dancing', 'They love ___ at the party.'],
  ['cook', 'cooking', 'My mother likes ___ dinner for us.'],
  ['listen', 'listening', 'I enjoy ___ to music before bed.'],
  ['ride', 'riding', 'Nam likes ___ his bike in the park.'],
  ['fly', 'flying', 'The children love ___ kites in the afternoon.'],
];
const HOBBY_GROUPS = [
  ['trong nhà', ['reading books', 'watching TV'], ['playing football', 'swimming']],
  ['ngoài trời', ['playing football', 'flying kites'], ['reading books', 'cooking']],
  ['vận động', ['swimming', 'riding a bike'], ['watching TV', 'listening to music']],
  ['nghệ thuật', ['drawing pictures', 'singing'], ['playing chess', 'fishing']],
  ['âm nhạc', ['singing', 'listening to music'], ['gardening', 'fishing']],
  ['yên tĩnh', ['reading books', 'doing puzzles'], ['playing football', 'dancing']],
  ['sáng tạo', ['drawing pictures', 'cooking'], ['watching TV', 'playing chess']],
  ['làm một mình', ['doing puzzles', 'fishing'], ['playing football', 'dancing']],
  ['dưới nước', ['swimming', 'fishing'], ['drawing pictures', 'singing']],
];
const HOBBY_RULES_TRUE = [
  {
    statement: 'Sau động từ "like" ta có thể dùng động từ thêm -ing.',
    explanation: 'Đúng: "I like reading books".',
  },
  {
    statement: 'Câu "She enjoys swimming" dùng đúng dạng -ing sau "enjoys".',
    explanation: 'Đúng: sau "enjoy" dùng động từ thêm -ing.',
  },
  {
    statement: 'Câu hỏi "What is your hobby?" dùng để hỏi về sở thích.',
    explanation: 'Đúng: câu này hỏi "Sở thích của bạn là gì?".',
  },
  {
    statement: 'Động từ "dance" thêm -ing thành "dancing".',
    explanation: 'Đúng: bỏ -e rồi thêm -ing: "dance" → "dancing".',
  },
];
const HOBBY_RULES_FALSE = [
  {
    statement: 'Sau động từ "like" ta phải dùng động từ nguyên mẫu, không dùng -ing.',
    explanation: 'Sai: "I like playing football" mới đúng, sau "like" dùng -ing.',
  },
  {
    statement: 'Câu "She enjoy swimming" là câu đúng.',
    explanation: 'Sai: chủ ngữ "she" phải dùng "enjoys".',
  },
  {
    statement: 'Động từ "swim" thêm -ing thành "swiming".',
    explanation: 'Sai: phải gấp đôi phụ âm cuối: "swimming".',
  },
];

const hobbies = {
  single(k) {
    if (k < 18) {
      const [en, vi] = HOBBIES[k];
      return fact(
        `"${vi}" trong tiếng Anh là gì?`,
        en,
        `"${vi}" trong tiếng Anh là "${en}".`,
        noise(HOBBY_EN, en, k),
      );
    }
    if (k < 36) {
      const [en, vi] = HOBBIES[k - 18];
      return fact(
        `Cụm từ "${en}" có nghĩa là gì?`,
        vi,
        `"${en}" nghĩa là "${vi}".`,
        noise(HOBBY_VI, vi, k),
      );
    }
    if (k < 46) {
      const [base, ing, sentence] = HOBBY_ING_SENTENCES[k - 36];
      return fact(
        `Chọn dạng đúng để hoàn thành câu: "${sentence}"`,
        ing,
        `Sau "like/enjoy/love" dùng động từ thêm -ing: "${base}" → "${ing}".`,
        [base, `${base}s`, `to ${base}`],
      );
    }
    const [en, vi, bare] = HOBBIES[k - 46];
    return fact(
      `Chọn câu đúng để nói rằng bạn thích ${vi}:`,
      `I like ${en}.`,
      `Nói về sở thích: "I like ${en}".`,
      [`I like ${bare}.`, `I likes ${en}.`, `I am like ${en}.`],
    );
  },
  multi(k) {
    if (k < 9) {
      const [label, good, bad] = HOBBY_GROUPS[k];
      const all = [good[0], bad[0], good[1], bad[1]];
      return multiFact(
        `Chọn 2 sở thích ${label}: ${all.join(', ')}.`,
        good,
        bad,
        `"${good[0]}" và "${good[1]}" là sở thích ${label}.`,
      );
    }
    const [en, , bare] = HOBBIES[k - 9];
    return multiFact(
      `Chọn 2 câu đúng khi nói về sở thích với động từ "like" và "${en}".`,
      [`I like ${en}.`, `She likes ${en}.`],
      [`I like ${bare}.`, `She like ${en}.`],
      `Sau "like/likes" dùng -ing: "I like ${en}", "She likes ${en}".`,
    );
  },
  tf(k) {
    if (k < 10) {
      const [en, vi] = HOBBIES[k];
      const isTrue = k % 2 === 0;
      const shown = isTrue ? vi : at(HOBBY_VI, k + 4);
      return tf(
        `"${en}" có nghĩa là "${shown}".`,
        isTrue,
        isTrue ? `Đúng: "${en}" nghĩa là "${vi}".` : `Sai: "${en}" nghĩa là "${vi}", không phải "${shown}".`,
      );
    }
    const index = Math.floor((k - 10) / 2);
    const rule = k % 2 === 0 ? at(HOBBY_RULES_TRUE, index) : at(HOBBY_RULES_FALSE, index);
    return tf(rule.statement, k % 2 === 0, rule.explanation);
  },
  fill(k) {
    if (k < 10) {
      const [en, vi] = HOBBIES[k];
      return fill(
        `Sở thích "${vi}" trong tiếng Anh là ___.`,
        [en],
        `"${vi}" trong tiếng Anh là "${en}".`,
      );
    }
    if (k < 16) {
      const [base, ing] = HOBBY_ING_SENTENCES[k - 10];
      return fill(
        `Điền dạng -ing của động từ "${base}": ___ .`,
        [ing],
        `"${base}" thêm -ing thành "${ing}".`,
      );
    }
    const [base, ing, sentence] = HOBBY_ING_SENTENCES[k - 16];
    return fill(
      `Điền dạng đúng của "${base}" vào chỗ trống: "${sentence}"`,
      [ing],
      `Sau "like/enjoy/love" dùng "${ing}".`,
    );
  },
};

// ===== Thói quen hằng ngày =====
const ROUTINES = [
  ['get up', 'thức dậy', 'gets up'],
  ['brush my teeth', 'đánh răng', 'brushes my teeth'],
  ['wash my face', 'rửa mặt', 'washes my face'],
  ['have breakfast', 'ăn sáng', 'has breakfast'],
  ['go to school', 'đi học', 'goes to school'],
  ['do my homework', 'làm bài tập về nhà', 'does my homework'],
  ['have lunch', 'ăn trưa', 'has lunch'],
  ['take a shower', 'tắm vòi sen', 'takes a shower'],
  ['go to bed', 'đi ngủ', 'goes to bed'],
  ['watch TV', 'xem ti vi', 'watches TV'],
  ['play sports', 'chơi thể thao', 'plays sports'],
  ['help my mom', 'giúp mẹ', 'helps my mom'],
  ['clean my room', 'dọn phòng', 'cleans my room'],
  ['feed the cat', 'cho mèo ăn', 'feeds the cat'],
  ['walk to school', 'đi bộ đến trường', 'walks to school'],
  ['study English', 'học tiếng Anh', 'studies English'],
  ['listen to music', 'nghe nhạc', 'listens to music'],
  ['have dinner', 'ăn tối', 'has dinner'],
];
const ROUTINE_EN = ROUTINES.map((entry) => entry[0]);
const ROUTINE_VI = ROUTINES.map((entry) => entry[1]);
const ROUTINE_TIMES = [
  ['6:00 a.m.', 0],
  ['6:15 a.m.', 1],
  ['6:20 a.m.', 2],
  ['6:30 a.m.', 3],
  ['7:00 a.m.', 4],
  ['11:30 a.m.', 6],
  ['2:00 p.m.', 15],
  ['3:00 p.m.', 10],
  ['4:00 p.m.', 13],
  ['4:30 p.m.', 5],
  ['5:00 p.m.', 12],
  ['6:00 p.m.', 17],
  ['7:00 p.m.', 9],
  ['7:30 p.m.', 11],
  ['8:30 p.m.', 7],
  ['9:00 p.m.', 8],
];
const ROUTINE_SEQUENCES = [
  ['I get up', 'I brush my teeth'],
  ['I brush my teeth', 'I have breakfast'],
  ['I have breakfast', 'I go to school'],
  ['I have lunch', 'I take a shower'],
  ['I do my homework', 'I watch TV'],
  ['I have dinner', 'I listen to music'],
  ['I take a shower', 'I go to bed'],
  ['I clean my room', 'I play sports'],
  ['I feed the cat', 'I study English'],
  ['I wash my face', 'I have breakfast'],
  ['I study English', 'I help my mom'],
  ['I play sports', 'I have dinner'],
];
const ROUTINE_GROUPS = [
  ['buổi sáng', ['get up', 'have breakfast'], ['go to bed', 'watch TV']],
  ['buổi tối', ['go to bed', 'have dinner'], ['get up', 'go to school']],
  ['ở trường', ['go to school', 'study English'], ['take a shower', 'go to bed']],
  ['ở nhà', ['clean my room', 'help my mom'], ['go to school', 'study English']],
  ['giúp đỡ gia đình', ['help my mom', 'clean my room'], ['play sports', 'listen to music']],
  ['chăm sóc bản thân', ['brush my teeth', 'wash my face'], ['watch TV', 'study English']],
  ['học tập', ['do my homework', 'study English'], ['play sports', 'feed the cat']],
  ['thư giãn', ['watch TV', 'listen to music'], ['wash my face', 'go to school']],
  ['trước khi đi ngủ', ['brush my teeth', 'take a shower'], ['go to school', 'have breakfast']],
];
const ROUTINE_TF_RULES_TRUE = [
  {
    statement: 'Câu "She gets up at six o\'clock" chia đúng thì hiện tại đơn.',
    explanation: 'Đúng: chủ ngữ "she" dùng "gets up".',
  },
  {
    statement: 'Trạng từ "usually" đứng trước động từ thường trong câu.',
    explanation: 'Đúng: "I usually go to school at seven".',
  },
  {
    statement: 'Cụm từ "have breakfast" nghĩa là "ăn sáng".',
    explanation: 'Đúng: "have breakfast" là ăn sáng.',
  },
  {
    statement: 'Câu hỏi "What time do you get up?" dùng để hỏi giờ thức dậy.',
    explanation: 'Đúng: câu này hỏi "Bạn thức dậy lúc mấy giờ?".',
  },
];
const ROUTINE_TF_RULES_FALSE = [
  {
    statement: 'Câu "She get up at six o\'clock" chia đúng thì hiện tại đơn.',
    explanation: 'Sai: phải dùng "gets up" vì chủ ngữ "she" là số ít.',
  },
  {
    statement: 'Cụm từ "go to bed" nghĩa là "đi học".',
    explanation: 'Sai: "go to bed" nghĩa là "đi ngủ", "đi học" là "go to school".',
  },
  {
    statement: 'Câu "I has breakfast at six" là câu đúng.',
    explanation: 'Sai: chủ ngữ "I" dùng "have breakfast".',
  },
];

const dailyRoutines = {
  single(k) {
    if (k < 12) {
      const [en, vi] = ROUTINES[k];
      return fact(
        `"${vi}" trong tiếng Anh là gì?`,
        en,
        `"${vi}" trong tiếng Anh là "${en}".`,
        noise(ROUTINE_EN, en, k),
      );
    }
    if (k < 24) {
      const [en, vi] = ROUTINES[k - 6];
      return fact(
        `Cụm từ "${en}" có nghĩa là gì?`,
        vi,
        `"${en}" nghĩa là "${vi}".`,
        noise(ROUTINE_VI, vi, k),
      );
    }
    if (k < 40) {
      const [time, index] = ROUTINE_TIMES[k - 24];
      const [en] = ROUTINES[index];
      return fact(
        `Chọn cụm từ đúng để hoàn thành câu: "I ___ at ${time} every day."`,
        en,
        `Hoạt động phù hợp với mốc ${time} là "${en}".`,
        noise(ROUTINE_EN, en, k),
      );
    }
    const [first, second] = ROUTINE_SEQUENCES[k - 40];
    return fact(
      `Chọn từ nối thích hợp: "${first}, ___ ${second}."`,
      'then',
      '"Then" dùng để nối hai hoạt động diễn ra liên tiếp.',
      ['because', 'but', 'or'],
    );
  },
  multi(k) {
    if (k < 9) {
      const [label, good, bad] = ROUTINE_GROUPS[k];
      const all = [good[0], bad[0], good[1], bad[1]];
      return multiFact(
        `Chọn 2 hoạt động ${label}: ${all.join(', ')}.`,
        good,
        bad,
        `"${good[0]}" và "${good[1]}" là hoạt động ${label}.`,
      );
    }
    const [en, , third] = ROUTINES[k - 9];
    const thirdPhrase = third.replace(/\bmy\b/g, 'her');
    return multiFact(
      `Chọn 2 câu đúng về thói quen hằng ngày với "${en}".`,
      [`I ${en} every day.`, `She ${thirdPhrase} every day.`],
      [`I ${third} every day.`, `She ${en} every day.`],
      `Chủ ngữ "I" dùng "${en}", chủ ngữ "she" dùng "${thirdPhrase}".`,
    );
  },
  tf(k) {
    if (k < 10) {
      const [en, vi] = ROUTINES[k];
      const isTrue = k % 2 === 0;
      const shown = isTrue ? vi : at(ROUTINE_VI, k + 6);
      return tf(
        `"${en}" có nghĩa là "${shown}".`,
        isTrue,
        isTrue ? `Đúng: "${en}" nghĩa là "${vi}".` : `Sai: "${en}" nghĩa là "${vi}", không phải "${shown}".`,
      );
    }
    const index = Math.floor((k - 10) / 2);
    const rule = k % 2 === 0 ? at(ROUTINE_TF_RULES_TRUE, index) : at(ROUTINE_TF_RULES_FALSE, index);
    return tf(rule.statement, k % 2 === 0, rule.explanation);
  },
  fill(k) {
    if (k < 8) {
      const [en, vi] = ROUTINES[k];
      return fill(
        `"${vi}" trong tiếng Anh là ___.`,
        [en],
        `"${vi}" trong tiếng Anh là "${en}".`,
      );
    }
    if (k < 14) {
      const [en, , third] = ROUTINES[k];
      const thirdPhrase = third.replace(/\bmy\b/g, 'her');
      const note = en.includes('my') ? ' (đổi my thành her)' : '';
      return fill(
        `Chia cụm từ "${en}" cho chủ ngữ "She"${note}: She ___ every day.`,
        [thirdPhrase],
        `Chủ ngữ "she" dùng "${thirdPhrase}".`,
      );
    }
    const [time, index] = ROUTINE_TIMES[k - 14];
    const [en] = ROUTINES[index];
    return fill(
      `Điền hoạt động phù hợp: "I ___ at ${time} every day."`,
      [en],
      `Mốc ${time} phù hợp với hoạt động "${en}".`,
    );
  },
};

// ===== Giới từ =====
const PREP_PLACE = [
  ['The book is ___ the table.', 'on', ['in', 'at', 'of'], 'quyển sách nằm trên mặt bàn'],
  ['The cat is ___ the chair.', 'under', ['on', 'at', 'to'], 'con mèo nằm dưới gầm ghế'],
  ['The ball is ___ the box.', 'in', ['on', 'at', 'to'], 'quả bóng ở trong chiếc hộp'],
  ['Lan is standing ___ the door.', 'behind', ['in', 'at', 'of'], 'Lan đứng phía sau cánh cửa'],
  ['The garden is ___ the house.', 'behind', ['on', 'at', 'of'], 'khu vườn ở phía sau ngôi nhà'],
  ['The bank is ___ the post office and the school.', 'between', ['in', 'at', 'on'], 'ngân hàng ở giữa bưu điện và trường học'],
  ['The picture is ___ the wall.', 'on', ['in', 'at', 'to'], 'bức tranh treo trên tường'],
  ['The dog is sleeping ___ the table.', 'under', ['on', 'at', 'in'], 'con chó ngủ dưới gầm bàn'],
  ['My house is ___ the school.', 'near', ['at', 'on', 'of'], 'nhà tôi ở gần trường học'],
  ['The clock is ___ the door.', 'above', ['in', 'at', 'on'], 'chiếc đồng hồ treo phía trên cửa'],
  ['The chair is ___ the desk.', 'next to', ['on', 'at', 'of'], 'chiếc ghế ở bên cạnh bàn'],
  ['The supermarket is ___ the cinema.', 'opposite', ['on', 'at', 'in'], 'siêu thị ở đối diện rạp chiếu phim'],
  ['The fish are ___ the water.', 'in', ['on', 'at', 'to'], 'đàn cá bơi trong nước'],
  ['The kite is flying ___ the trees.', 'above', ['in', 'at', 'to'], 'cánh diều bay phía trên những ngọn cây'],
];
const PREP_TIME = [
  ['We have English ___ Monday.', 'on', ['in', 'at', 'of']],
  ["The class starts ___ seven o'clock.", 'at', ['on', 'in', 'for']],
  ['I get up early ___ the morning.', 'in', ['on', 'at', 'to']],
  ['My birthday is ___ May.', 'in', ['on', 'at', 'from']],
  ['We play football ___ Sunday afternoon.', 'on', ['in', 'at', 'by']],
  ['She was born ___ 2014.', 'in', ['on', 'at', 'since']],
  ['I do my homework ___ dinner.', 'after', ['on', 'at', 'in']],
  ['We stayed at home ___ the rain.', 'during', ['on', 'at', 'to']],
  ['I have breakfast ___ 6:30.', 'at', ['on', 'in', 'of']],
  ['Tet is ___ January or February.', 'in', ['on', 'at', 'to']],
  ['We often go swimming ___ summer.', 'in', ['on', 'at', 'from']],
  ['The film begins ___ 7:30 p.m.', 'at', ['in', 'on', 'for']],
  ['He has a piano lesson ___ Friday.', 'on', ['in', 'at', 'by']],
  ['She has lived here ___ 2019.', 'since', ['for', 'in', 'at']],
];
const PREP_MOVE = [
  ['She walks ___ the bridge.', 'across', ['on', 'in', 'at'], 'cô ấy đi bộ băng qua cây cầu'],
  ['I go ___ school by bike.', 'to', ['at', 'in', 'from'], 'tôi đi đến trường bằng xe đạp'],
  ['He runs ___ the hill.', 'up', ['in', 'on', 'at'], 'cậu ấy chạy lên đồi'],
  ['The children walk ___ the river.', 'along', ['in', 'on', 'at'], 'bọn trẻ đi bộ dọc bờ sông'],
  ['She comes ___ Da Nang.', 'from', ['to', 'at', 'on'], 'cô ấy đến từ Đà Nẵng'],
  ['The bus goes ___ the tunnel.', 'through', ['on', 'at', 'in'], 'xe buýt đi xuyên qua đường hầm'],
  ['He jumps ___ the pool.', 'into', ['on', 'at', 'of'], 'cậu ấy nhảy xuống bể bơi'],
  ['The bird flies ___ the trees.', 'over', ['in', 'at', 'on'], 'con chim bay qua những ngọn cây'],
  ['We walk ___ the park every morning.', 'around', ['in', 'at', 'of'], 'chúng tôi đi bộ quanh công viên'],
  ['She goes ___ the room.', 'out of', ['in', 'at', 'on'], 'cô ấy đi ra khỏi phòng'],
  ['The plane flies ___ the clouds.', 'above', ['in', 'at', 'on'], 'máy bay bay phía trên những đám mây'],
  ['He walks ___ the street.', 'down', ['in', 'at', 'of'], 'cậu ấy đi bộ xuống phố'],
];
const PREP_POSITION = [
  ['cat', 'table', 'under', ['of', 'to', 'for']],
  ['book', 'desk', 'on', ['of', 'to', 'for']],
  ['ball', 'box', 'in', ['of', 'to', 'for']],
  ['bike', 'tree', 'behind', ['of', 'to', 'for']],
  ['car', 'house', 'in front of', ['of', 'to', 'for']],
  ['lamp', 'bed', 'next to', ['of', 'to', 'for']],
  ['picture', 'wall', 'on', ['of', 'to', 'for']],
  ['dog', 'sofa', 'under', ['of', 'to', 'for']],
  ['school', 'park', 'near', ['of', 'to', 'for']],
  ['bank', 'supermarket', 'opposite', ['of', 'to', 'for']],
  ['clock', 'window', 'above', ['of', 'to', 'for']],
  ['garden', 'house', 'behind', ['of', 'to', 'for']],
];
const PREP_GROUPS = [
  [['on Monday', 'in the morning'], ['at Monday', 'on the morning'], 'giới từ chỉ thời gian'],
  [["at 7 o'clock", 'in 2020'], ["on 7 o'clock", 'at 2020'], 'giới từ chỉ thời gian'],
  [['under the table', 'next to the door'], ['in the table', 'on front of the door'], 'giới từ chỉ vị trí'],
  [['behind the house', 'in front of the school'], ['behind of the house', 'front of the school'], 'giới từ chỉ vị trí'],
  [['go to school', 'come from Da Nang'], ['go at school', 'come of Da Nang'], 'giới từ chỉ chuyển động'],
  [['between the bank and the shop', 'opposite the cinema'], ['between the bank or the shop', 'opposite to the cinema'], 'giới từ chỉ vị trí'],
  [['in summer', 'on Sunday'], ['on summer', 'in Sunday'], 'giới từ chỉ thời gian'],
  [['during the lesson', 'after dinner'], ['during of the lesson', 'after of dinner'], 'giới từ chỉ thời gian'],
  [['on the wall', 'in the box'], ['at the wall', 'of the box'], 'giới từ chỉ vị trí'],
  [['across the street', 'along the river'], ['across of the street', 'along to the river'], 'giới từ chỉ chuyển động'],
  [['above the clouds', 'below the window'], ['above of the clouds', 'below to the window'], 'giới từ chỉ vị trí'],
  [['before lunch', "until 5 o'clock"], ['before of lunch', "until to 5 o'clock"], 'giới từ chỉ thời gian'],
  [['near the park', 'in the garden'], ['near of the park', 'in to the garden'], 'giới từ chỉ vị trí'],
  [['into the room', 'out of the house'], ['into of the room', 'out from the house'], 'giới từ chỉ chuyển động'],
  [['by bus', 'by bike'], ['by a bus', 'with bike'], 'giới từ chỉ phương tiện'],
  [['on my birthday', 'at noon'], ['in my birthday', 'on noon'], 'giới từ chỉ thời gian'],
  [['among the trees', 'under the bridge'], ['among of the trees', 'under to the bridge'], 'giới từ chỉ vị trí'],
];
const PREP_MEANING = [
  ['in', 'trong'],
  ['on', 'trên'],
  ['under', 'dưới'],
  ['behind', 'phía sau'],
  ['in front of', 'phía trước'],
  ['next to', 'bên cạnh'],
  ['between', 'ở giữa'],
  ['near', 'gần'],
  ['above', 'phía trên'],
  ['below', 'phía dưới'],
  ['between', 'ở giữa hai vật'],
  ['opposite', 'đối diện'],
  ['to', 'đến'],
  ['from', 'từ'],
  ['across', 'băng qua'],
  ['during', 'trong suốt'],
];
const PREP_FILL_PLACE = [
  ['The keys are ___ the bag.', 'in', 'chìa khóa ở trong túi'],
  ['The cup is ___ the table.', 'on', 'chiếc cốc ở trên bàn'],
  ['The shoes are ___ the bed.', 'under', 'đôi giày ở dưới gầm giường'],
  ['The tree is ___ the house.', 'behind', 'cái cây ở sau nhà'],
  ['The board is ___ the classroom.', 'in front of', 'tấm bảng ở phía trước lớp học'],
  ['The shop is ___ the school.', 'next to', 'cửa hàng ở bên cạnh trường học'],
  ['The park is ___ the hospital and the bank.', 'between', 'công viên ở giữa bệnh viện và ngân hàng'],
];
const PREP_FILL_TIME = [
  ['We have maths ___ Tuesday.', 'on'],
  ['The film starts ___ 8 p.m.', 'at'],
  ['She goes to school ___ the morning.', 'in'],
  ['My birthday is ___ March.', 'in'],
  ['We visit our grandparents ___ the weekend.', 'at'],
  ['I brush my teeth ___ breakfast.', 'after'],
];
const PREP_FILL_MOVE = [
  ['They walk ___ the bridge.', 'across', 'họ đi bộ băng qua cây cầu'],
  ['I go ___ school at seven.', 'to', 'tôi đi đến trường lúc bảy giờ'],
  ['She comes ___ Hue.', 'from', 'cô ấy đến từ Huế'],
  ['The cat jumps ___ the box.', 'into', 'con mèo nhảy vào trong hộp'],
  ['We run ___ the hill.', 'up', 'chúng tôi chạy lên đồi'],
  ['The train goes ___ the tunnel.', 'through', 'đoàn tàu đi xuyên qua đường hầm'],
  ['He walks ___ the river.', 'along', 'cậu ấy đi bộ dọc bờ sông'],
  ['The children run ___ the garden.', 'around', 'bọn trẻ chạy quanh khu vườn'],
  ['She goes ___ the house.', 'out of', 'cô ấy đi ra khỏi nhà'],
];
const PREP_RULES_TRUE = [
  {
    statement: 'Ta dùng "on" trước thứ trong tuần, ví dụ "on Monday".',
    explanation: 'Đúng: "on Monday", "on Sunday".',
  },
  {
    statement: 'Ta dùng "at" trước giờ cụ thể, ví dụ "at 7 o\'clock".',
    explanation: 'Đúng: "at" đi với giờ: "at 6:30", "at noon".',
  },
  {
    statement: 'Ta dùng "in" trước buổi trong ngày, ví dụ "in the morning".',
    explanation: 'Đúng: "in the morning", "in the afternoon".',
  },
  {
    statement: '"In front of" nghĩa là "phía trước".',
    explanation: 'Đúng: "in front of the school" là "phía trước trường".',
  },
];
const PREP_RULES_FALSE = [
  {
    statement: 'Ta dùng "at" trước thứ trong tuần, ví dụ "at Monday".',
    explanation: 'Sai: phải dùng "on Monday".',
  },
  {
    statement: 'Ta dùng "on" trước giờ cụ thể, ví dụ "on 8 o\'clock".',
    explanation: 'Sai: phải dùng "at 8 o\'clock".',
  },
  {
    statement: 'Ta dùng "in" trước giờ cụ thể, ví dụ "in 2020 o\'clock".',
    explanation: 'Sai: "in" đi với năm, tháng; giờ dùng "at".',
  },
];

const prepositions = {
  single(k) {
    if (k < 14) {
      const [sentence, correct, wrong, gloss] = PREP_PLACE[k];
      return fact(
        `Chọn giới từ chỉ vị trí đúng: "${sentence}" (${gloss}).`,
        correct,
        `"${correct}" phù hợp: "${sentence.replace('___', correct)}"`,
        wrong,
      );
    }
    if (k < 28) {
      const [sentence, correct, wrong] = PREP_TIME[k - 14];
      return fact(
        `Chọn giới từ chỉ thời gian đúng: "${sentence}"`,
        correct,
        `"${correct}" phù hợp: "${sentence.replace('___', correct)}"`,
        wrong,
      );
    }
    if (k < 40) {
      const [sentence, correct, wrong, gloss] = PREP_MOVE[k - 28];
      return fact(
        `Chọn giới từ chỉ chuyển động đúng: "${sentence}" (${gloss}).`,
        correct,
        `"${correct}" phù hợp: "${sentence.replace('___', correct)}"`,
        wrong,
      );
    }
    const [object, place, correct, wrong] = PREP_POSITION[k - 40];
    return fact(
      `Chọn câu đúng về vị trí của ${object} và ${place}:`,
      `The ${object} is ${correct} the ${place}.`,
      `"${correct}" mô tả đúng vị trí của ${object} so với ${place}.`,
      wrong.map((prep) => `The ${object} is ${prep} the ${place}.`),
    );
  },
  multi(k) {
    const [good, bad, label] = PREP_GROUPS[k];
    const all = [good[0], bad[0], good[1], bad[1]];
    return multiFact(
      `Chọn 2 cụm từ đúng trong nhóm: ${all.join(', ')}.`,
      good,
      bad,
      `"${good[0]}" và "${good[1]}" là ${label} dùng đúng.`,
    );
  },
  tf(k) {
    if (k < 10) {
      const [good, bad] = PREP_GROUPS[k];
      const isTrue = k % 2 === 0;
      const phrase = isTrue ? good[0] : bad[0];
      return tf(
        `Cụm từ "${phrase}" dùng đúng giới từ.`,
        isTrue,
        isTrue
          ? `Đúng: "${phrase}" là cụm từ đúng.`
          : `Sai: "${phrase}" dùng sai giới từ, cụm đúng là "${good[0]}".`,
      );
    }
    const [prep, meaning] = PREP_MEANING[k - 10];
    const isTrue = k % 2 === 0;
    const shown = isTrue ? meaning : at(PREP_MEANING, k + 3)[1];
    return tf(
      `Giới từ "${prep}" có nghĩa là "${shown}".`,
      isTrue,
      isTrue ? `Đúng: "${prep}" nghĩa là "${meaning}".` : `Sai: "${prep}" nghĩa là "${meaning}", không phải "${shown}".`,
    );
  },
  fill(k) {
    if (k < 7) {
      const [sentence, correct, gloss] = PREP_FILL_PLACE[k];
      return fill(
        `Điền giới từ chỉ vị trí: "${sentence}" (${gloss}).`,
        [correct],
        `"${correct}" phù hợp: "${sentence.replace('___', correct)}"`,
      );
    }
    if (k < 13) {
      const [sentence, correct] = PREP_FILL_TIME[k - 7];
      return fill(
        `Điền giới từ chỉ thời gian: "${sentence}"`,
        [correct],
        `"${correct}" phù hợp: "${sentence.replace('___', correct)}"`,
      );
    }
    const [sentence, correct, gloss] = PREP_FILL_MOVE[k - 13];
    return fill(
      `Điền giới từ chỉ chuyển động: "${sentence}" (${gloss}).`,
      [correct],
      `"${correct}" phù hợp: "${sentence.replace('___', correct)}"`,
    );
  },
};

const presentSimple = {
  single(k) {
    if (k < 24) {
      const [base, third, tail] = PS_VERBS[k];
      const subject = at(PS_SUBJECTS, k);
      return fact(
        `Chọn dạng đúng của động từ trong ngoặc để nói về thói quen: ${subject} ___ (${base}) ${tail}.`,
        third,
        `Chủ ngữ "${subject}" là số ít nên dùng "${third}" ở thì hiện tại đơn.`,
        [base, `is ${base}ing`, `are ${base}ing`],
      );
    }
    if (k < 36) {
      const index = k - 24;
      const [base, third, tail] = PS_VERBS[index + 2];
      const singular = index < 8;
      const subject = singular ? at(PS_SUBJECTS, index) : at(PS_PLURALS, index - 8);
      const correct = singular ? `doesn't ${base}` : `don't ${base}`;
      const wrong = singular
        ? [`don't ${base}`, `doesn't ${third}`, `not ${base}`]
        : [`doesn't ${base}`, `${base} not`, `not ${base}`];
      return fact(
        `Chọn câu phủ định đúng ở thì hiện tại đơn: "${subject} ___ (not ${base}) ${tail}."`,
        correct,
        singular
          ? `Chủ ngữ số ít dùng "doesn't" + động từ nguyên mẫu: "${correct} ${tail}".`
          : `Chủ ngữ số nhiều dùng "don't" + động từ nguyên mẫu: "${correct} ${tail}".`,
        wrong,
      );
    }
    if (k < 46) {
      const [subject, base, tail, answer] = PS_QUESTIONS[k - 36];
      const distractors = answer === 'Does' ? ['Do', 'Is', 'Are'] : ['Does', 'Is', 'Are'];
      return fact(
        `Chọn trợ động từ đúng: "___ ${subject} ${base} ${tail}?"`,
        answer,
        answer === 'Does'
          ? `Chủ ngữ "${subject}" là số ít nên dùng "Does" ở đầu câu hỏi.`
          : `Chủ ngữ "${subject}" là số nhiều nên dùng "Do" ở đầu câu hỏi.`,
        distractors,
      );
    }
    const adverb = at(PS_ADVERBS, k - 46);
    return fact(
      `Chọn câu đúng khi dùng trạng từ tần suất "${adverb}" với chủ ngữ "Lan":`,
      `Lan ${adverb} goes to school by bike.`,
      `Trạng từ tần suất đứng trước động từ thường: "Lan ${adverb} goes ...".`,
      [
        `Lan goes ${adverb} to school by bike.`,
        `Lan ${adverb} go to school by bike.`,
        `Lan go ${adverb} to school by bike.`,
      ],
    );
  },
  multi(k) {
    const [base, third, tail] = PS_VERBS[k];
    return multiFact(
      `Chọn 2 câu đúng ở thì hiện tại đơn với động từ "${base}":`,
      [`She ${third} ${tail}.`, `They ${base} ${tail}.`],
      [`She ${base} ${tail}.`, `They ${third} ${tail}.`],
      `Chủ ngữ số ít dùng "${third}", chủ ngữ số nhiều dùng "${base}".`,
    );
  },
  tf(k) {
    if (k < 10) {
      const [base, third, tail] = PS_VERBS[k];
      const subject = at(PS_SUBJECTS, k + 2);
      const isTrue = k % 2 === 0;
      const sentence = isTrue ? `${subject} ${third} ${tail}.` : `${subject} ${base} ${tail}.`;
      return tf(
        `Câu "${sentence}" chia đúng thì hiện tại đơn.`,
        isTrue,
        isTrue
          ? `Đúng: chủ ngữ số ít nên động từ có dạng "${third}".`
          : `Sai: chủ ngữ số ít phải dùng "${third}", không dùng "${base}".`,
      );
    }
    const index = Math.floor((k - 10) / 2);
    const rule = k % 2 === 0 ? at(PS_RULES_TRUE, index) : at(PS_RULES_FALSE, index);
    return tf(rule.statement, k % 2 === 0, rule.explanation);
  },
  fill(k) {
    if (k < 10) {
      const [base, third, tail] = PS_VERBS[k];
      const subject = at(PS_SUBJECTS, k + 3);
      return fill(
        `Chia động từ "${base}" cho chủ ngữ "${subject}": ${subject} ___ ${tail}.`,
        [third],
        `Chủ ngữ "${subject}" là số ít nên dùng "${third}".`,
      );
    }
    if (k < 16) {
      const [subject, base, tail, answer] = PS_QUESTIONS[k - 10];
      return fill(
        `Điền trợ động từ thích hợp vào chỗ trống: "___ ${subject} ${base} ${tail}?"`,
        [answer],
        answer === 'Does'
          ? 'Chủ ngữ số ít dùng "Does" để mở đầu câu hỏi.'
          : 'Chủ ngữ số nhiều dùng "Do" để mở đầu câu hỏi.',
      );
    }
    const [subject, base, tail, accepted] = PS_NEG_FILL[k - 16];
    return fill(
      `Điền dạng phủ định của động từ "${base}": "${subject} ___ (not) ${tail}."`,
      accepted,
      `Câu phủ định ở thì hiện tại đơn: "${subject} ${accepted[0]} ${tail}".`,
    );
  },
};

export const ENGLISH_GRADE_5 = {
  'tieng-anh-5-present-simple': presentSimple,
  'tieng-anh-5-past-simple': pastSimple,
  'tieng-anh-5-comparatives': comparatives,
  'tieng-anh-5-weather-seasons': weatherSeasons,
  'tieng-anh-5-hobbies': hobbies,
  'tieng-anh-5-daily-routines': dailyRoutines,
  'tieng-anh-5-prepositions': prepositions,
};
