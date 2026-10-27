import { fact, fill, multiFact, tf } from './math-utils.js';

// ===== Chính tả =====
const CHINH_TA_SINGLE = [
  fact(
    'Từ nào viết đúng chính tả, chỉ khoảng thời gian đầu buổi sáng?',
    'sớm',
    '“Sớm” viết với s, chỉ lúc đầu ngày.',
    ['xớm', 'sớng', 'xớng'],
  ),
  fact(
    'Cách viết đúng của từ chỉ vẻ ngoài dễ thương, đáng yêu là gì?',
    'xinh xắn',
    '“Xinh xắn” viết với x ở cả hai tiếng.',
    ['sinh sắn', 'xinh sắn', 'sinh xắn'],
  ),
  fact(
    'Từ nào viết đúng để gọi loại quả chua dùng pha nước giải khát?',
    'quả chanh',
    '“Chanh” viết với ch, là loại quả có vị chua.',
    ['quả tranh', 'quả chành', 'quả trành'],
  ),
  fact(
    'Từ nào viết đúng để gọi con vật kéo cày ở ruộng?',
    'con trâu',
    '“Trâu” viết với tr, là con vật quen thuộc ở làng quê.',
    ['con châu', 'con trau', 'con châo'],
  ),
  fact(
    'Từ nào viết đúng để chỉ một lượng nước rất nhỏ?',
    'giọt nước',
    '“Giọt” viết với gi, “nước” viết với ư.',
    ['dọt nước', 'giọt nướt', 'dọt nướt'],
  ),
  fact(
    'Từ nào viết đúng để chỉ dải nước chảy dài ra biển?',
    'dòng sông',
    '“Dòng” viết với d, “sông” viết với s.',
    ['giòng sông', 'dòng xông', 'giòng xông'],
  ),
  fact(
    'Từ nào viết đúng để chỉ đồ đội lên đầu che nắng?',
    'cái nón',
    '“Nón” viết với n, là đồ dùng che nắng.',
    ['cái lón', 'cái nống', 'cái lống'],
  ),
  fact(
    'Từ nào viết đúng để chỉ người luôn hết lòng với tập thể?',
    'trung thành',
    '“Trung thành” viết với tr, nghĩa là một lòng, không thay đổi.',
    ['chung thành', 'trung thàn', 'chung thàn'],
  ),
  fact(
    'Từ nào viết đúng để tả màu sắc tươi sáng, đẹp đẽ?',
    'rực rỡ',
    '“Rực rỡ” viết với r, tả vẻ tươi sáng nổi bật.',
    ['dực dỡ', 'rực dỡ', 'dực rỡ'],
  ),
  fact(
    'Từ nào viết đúng để chỉ việc thư giãn sau khi làm việc?',
    'nghỉ ngơi',
    '“Nghỉ” viết dấu hỏi, “ngơi” viết với ơ.',
    ['nghĩ ngơi', 'nghỉ ngôi', 'nghĩ ngôi'],
  ),
  fact(
    'Từ nào viết đúng để chỉ việc làm lại cho tốt hơn?',
    'sửa chữa',
    '“Sửa chữa” viết với s ở tiếng đầu và ch ở tiếng sau.',
    ['xửa chữa', 'sửa chửa', 'xửa chửa'],
  ),
  fact(
    'Từ nào viết đúng để chỉ loài hoa có gai, thường màu đỏ?',
    'hoa hồng',
    '“Hoa hồng” viết với h, tiếng “hồng” có dấu huyền.',
    ['hoa hòng', 'hoa hồn', 'hoa hóng'],
  ),
];

const CHINH_TA_MULTI = [
  multiFact(
    'Chọn các từ viết đúng chính tả (đức tính chăm làm).',
    ['chăm chỉ', 'siêng năng'],
    ['chăm chĩ', 'siêng lăng'],
    '“Chăm chỉ” và “siêng năng” đều viết đúng; “chĩ” và “lăng” là cách viết sai.',
  ),
  multiFact(
    'Chọn các từ viết đúng chính tả (đồ vật trong lớp học).',
    ['bảng con', 'phấn trắng'],
    ['bản con', 'phấng trắng'],
    '“Bảng con” viết với bảng, “phấn trắng” viết với phấn.',
  ),
  multiFact(
    'Chọn các từ viết đúng chính tả (hoạt động vui chơi).',
    ['nhảy dây', 'đá cầu'],
    ['nhảy dầy', 'đá càu'],
    '“Nhảy dây” và “đá cầu” là cách viết đúng.',
  ),
  multiFact(
    'Chọn các từ viết đúng chính tả (cây cối, thiên nhiên).',
    ['rặng tre', 'dòng suối'],
    ['rặng che', 'giòng suối'],
    '“Rặng tre” viết với tr, “dòng suối” viết với d.',
  ),
];

const CHINH_TA_TF = [
  tf('Từ “quyển sách” được viết đúng chính tả.', true, '“Quyển sách” viết đúng, không phải “quyễn sách”.'),
  tf('Từ “nghỉ ngơi” phải viết là “nghĩ ngơi”.', false, 'Đúng là “nghỉ ngơi”, viết dấu hỏi ở tiếng “nghỉ”.'),
  tf('Tên riêng của người phải viết hoa chữ cái đầu mỗi tiếng.', true, 'Ví dụ: Nguyễn Thị Lan.'),
  tf('Từ “trung thành” được viết với chữ “ch”.', false, '“Trung thành” viết với tr.'),
];

const CHINH_TA_FILL = [
  fill('Điền từ còn thiếu: “Chúng em giữ lớp học ___ sẽ.”', ['sạch'], '“Sạch sẽ” chỉ sự gọn gàng, không bẩn.'),
  fill('Điền ch hoặc tr vào chỗ trống: “Con ___âu đang kéo cày.”', ['tr', 'trâu'], '“Trâu” viết với tr.'),
  fill('Điền d, gi hoặc r vào chỗ trống: “___òng sông quê em rất đẹp.”', ['d', 'dòng'], '“Dòng sông” viết với d.'),
  fill('Điền từ còn thiếu: “Các bạn đang ___ ngơi dưới gốc cây.”', ['nghỉ'], '“Nghỉ ngơi” viết dấu hỏi ở tiếng “nghỉ”.'),
  fill(
    'Viết hoa tên riêng trong câu: “bạn lan là lớp trưởng”.',
    ['Bạn Lan là lớp trưởng', 'bạn Lan là lớp trưởng', 'Bạn Lan là lớp trưởng.'],
    'Tên riêng “Lan” phải viết hoa chữ L.',
  ),
];

const chinhTa = {
  single(k) { return CHINH_TA_SINGLE[k]; },
  multi(k) { return CHINH_TA_MULTI[k]; },
  tf(k) { return CHINH_TA_TF[k]; },
  fill(k) { return CHINH_TA_FILL[k]; },
};

// ===== Từ chỉ hoạt động =====
const HOAT_DONG_SINGLE = [
  fact('Trong câu “Bé quét nhà giúp mẹ”, từ nào chỉ hoạt động?', 'quét', '“Quét” là việc làm của bé.', ['Bé', 'nhà', 'mẹ']),
  fact('Trong câu “Chú gà trống gáy vang”, từ nào chỉ hoạt động?', 'gáy', '“Gáy” là hoạt động của gà trống.', ['Chú', 'gà trống', 'vang']),
  fact('Trong câu “Cá bơi dưới ao”, từ nào chỉ hoạt động?', 'bơi', '“Bơi” là hoạt động của cá.', ['Cá', 'dưới', 'ao']),
  fact('Trong câu “Lan đọc sách mỗi tối”, từ nào chỉ hoạt động?', 'đọc', '“Đọc” là hoạt động của Lan.', ['Lan', 'sách', 'tối']),
  fact('Trong câu “Mẹ nấu cơm ở bếp”, từ nào chỉ hoạt động?', 'nấu', '“Nấu” là hoạt động của mẹ.', ['Mẹ', 'cơm', 'bếp']),
  fact('Trong câu “Đàn chim bay lượn trên trời”, từ nào chỉ hoạt động?', 'bay lượn', '“Bay lượn” là hoạt động của đàn chim.', ['Đàn chim', 'trên', 'trời']),
  fact('Từ nào dưới đây chỉ hoạt động học tập?', 'viết bài', '“Viết bài” là hoạt động học tập.', ['bàn học', 'quyển vở', 'bút chì']),
  fact('Từ nào dưới đây chỉ hoạt động vui chơi?', 'nhảy dây', '“Nhảy dây” là hoạt động vui chơi.', ['sân trường', 'đồ chơi', 'bạn bè']),
  fact('Từ nào dưới đây chỉ hoạt động lao động?', 'tưới cây', '“Tưới cây” là việc làm chăm sóc cây.', ['vườn rau', 'bình nước', 'cái cuốc']),
  fact('Từ nào dưới đây chỉ hoạt động di chuyển?', 'đi bộ', '“Đi bộ” là hoạt động di chuyển bằng chân.', ['con đường', 'đôi chân', 'bến xe']),
  fact('Trong câu “Ông tưới cây trong vườn”, từ nào chỉ hoạt động?', 'tưới', '“Tưới” là việc làm của ông.', ['Ông', 'cây', 'vườn']),
  fact('Trong câu “Bé hát một bài thật hay”, từ nào chỉ hoạt động?', 'hát', '“Hát” là hoạt động của bé.', ['Bé', 'bài', 'hay']),
];

const HOAT_DONG_MULTI = [
  multiFact(
    'Chọn tất cả các từ chỉ hoạt động trong câu: “Bé chạy ra sân và nhặt quả bóng.”',
    ['chạy', 'nhặt'],
    ['sân', 'bóng'],
    '“Chạy” và “nhặt” là hoạt động; “sân”, “bóng” là sự vật.',
  ),
  multiFact(
    'Chọn tất cả các từ chỉ hoạt động của học sinh trong lớp.',
    ['nghe giảng', 'ghi bài'],
    ['bảng đen', 'ghế ngồi'],
    '“Nghe giảng”, “ghi bài” là hoạt động; bảng và ghế là đồ vật.',
  ),
  multiFact(
    'Chọn tất cả các từ chỉ hoạt động của con vật.',
    ['bơi', 'gáy'],
    ['ao', 'cánh'],
    '“Bơi”, “gáy” là hoạt động; “ao”, “cánh” là sự vật.',
  ),
  multiFact(
    'Chọn tất cả các từ chỉ hoạt động trong câu: “Mẹ vo gạo rồi nấu cơm.”',
    ['vo', 'nấu'],
    ['gạo', 'cơm'],
    '“Vo” và “nấu” là việc mẹ làm; gạo và cơm là sự vật.',
  ),
];

const HOAT_DONG_TF = [
  tf('Trong câu “Chim hót líu lo”, từ “hót” là từ chỉ hoạt động.', true, '“Hót” là hoạt động của chim.'),
  tf('Trong câu “Chiếc lá rơi”, từ “lá” là từ chỉ hoạt động.', false, '“Lá” chỉ sự vật; “rơi” mới là hoạt động.'),
  tf('“Chạy”, “nhảy”, “bơi” đều là từ chỉ hoạt động.', true, 'Cả ba từ đều chỉ việc làm, cử động.'),
  tf('“Bàn ghế”, “sách vở” là các từ chỉ hoạt động.', false, 'Đây là các từ chỉ đồ vật.'),
];

const HOAT_DONG_FILL = [
  fill('Điền từ chỉ hoạt động: “Bé ___ răng trước khi đi ngủ.”', ['đánh'], '“Đánh răng” là hoạt động vệ sinh.'),
  fill('Điền từ chỉ hoạt động: “Chú mèo ___ chuột.”', ['bắt', 'vồ'], '“Bắt chuột” hoặc “vồ chuột” đều đúng.'),
  fill('Điền từ chỉ hoạt động: “Cô giáo ___ bài trên bảng.”', ['viết', 'giảng'], 'Cô giáo viết bài hoặc giảng bài.'),
  fill('Điền từ chỉ hoạt động: “Các bạn ___ cầu ở sân trường.”', ['đá'], '“Đá cầu” là trò chơi quen thuộc.'),
  fill('Điền từ chỉ hoạt động: “Em ___ áo giúp mẹ.”', ['gấp', 'phơi'], '“Gấp áo”, “phơi áo” đều là việc làm giúp mẹ.'),
];

const tuChiHoatDong = {
  single(k) { return HOAT_DONG_SINGLE[k]; },
  multi(k) { return HOAT_DONG_MULTI[k]; },
  tf(k) { return HOAT_DONG_TF[k]; },
  fill(k) { return HOAT_DONG_FILL[k]; },
};

// ===== Câu kiểu Ai là gì? =====
const AI_LA_GI_SINGLE = [
  fact('Câu nào thuộc kiểu câu “Ai là gì?”', 'Lan là lớp trưởng.', 'Câu giới thiệu Lan là lớp trưởng.', ['Lan quét nhà.', 'Lan rất chăm chỉ.', 'Lan đi học.']),
  fact('Bộ phận trả lời câu hỏi “Ai?” trong câu “Bố em là bác sĩ” là gì?', 'Bố em', '“Bố em” là người được giới thiệu.', ['bác sĩ', 'là', 'em là']),
  fact('Bộ phận trả lời câu hỏi “Là gì?” trong câu “Chim sẻ là loài chim nhỏ” là gì?', 'loài chim nhỏ', 'Phần sau “là” nêu nghề nghiệp, đặc điểm.', ['Chim sẻ', 'là', 'loài']),
  fact('Câu nào giới thiệu nghề nghiệp của mẹ?', 'Mẹ em là giáo viên.', 'Câu có dạng “Ai là gì?” để giới thiệu nghề.', ['Mẹ em nấu cơm.', 'Mẹ em rất hiền.', 'Mẹ em đi chợ.']),
  fact('Câu nào giới thiệu một loài vật?', 'Cá heo là loài vật thông minh.', 'Câu giới thiệu cá heo là loài vật gì.', ['Cá heo bơi nhanh.', 'Cá heo rất đáng yêu.', 'Cá heo sống ở biển.']),
  fact('Từ nào cần điền vào chỗ trống: “Bạn Nam ___ học sinh giỏi.”', 'là', 'Câu giới thiệu cần từ “là”.', ['và', 'rất', 'đang']),
  fact('Câu “Cây phượng là loài cây thân gỗ.” trả lời cho câu hỏi nào?', 'Ai (cái gì) là gì?', 'Câu nêu cây phượng là loài cây gì.', ['Ai làm gì?', 'Ai thế nào?', 'Khi nào?']),
  fact('Câu nào có bộ phận “là bác nông dân”?', 'Chú Tư là bác nông dân.', 'Câu giới thiệu nghề của chú Tư.', ['Chú Tư đang cày ruộng.', 'Chú Tư rất khỏe.', 'Chú Tư đi ra đồng.']),
  fact('Bộ phận “học sinh lớp 2A” trong câu “Lan là học sinh lớp 2A.” trả lời cho câu hỏi nào?', 'Là gì?', 'Phần sau “là” trả lời câu hỏi “Là gì?”.', ['Làm gì?', 'Thế nào?', 'Vì sao?']),
  fact('Câu nào là câu giới thiệu về đồ vật?', 'Cặp sách là đồ dùng học tập.', 'Câu giới thiệu cặp sách là đồ dùng gì.', ['Cặp sách rất đẹp.', 'Em mua cặp sách mới.', 'Cặp sách nặng quá.']),
  fact('Chọn từ thích hợp: “Hoa hồng ___ loài hoa có gai.”', 'là', 'Câu giới thiệu cần từ “là”.', ['như', 'với', 'đã']),
  fact('Câu nào không thuộc kiểu câu “Ai là gì?”', 'Bé tưới hoa.', 'Đây là câu kể hoạt động, kiểu “Ai làm gì?”.', ['Bé là học sinh.', 'Mèo là vật nuôi.', 'Hà Nội là thủ đô.']),
];

const AI_LA_GI_MULTI = [
  multiFact(
    'Chọn tất cả các câu thuộc kiểu “Ai là gì?”',
    ['Bố em là công nhân.', 'Hà Nội là thủ đô nước ta.'],
    ['Bố em đi làm.', 'Hà Nội rất đông người.'],
    'Hai câu đúng đều có dạng “Ai là gì?”.',
  ),
  multiFact(
    'Chọn tất cả các câu giới thiệu người.',
    ['Lan là tổ trưởng tổ 1.', 'Ông em là thầy giáo về hưu.'],
    ['Lan hát rất hay.', 'Ông em trồng cây.'],
    'Câu giới thiệu người thường có từ “là” nêu nghề nghiệp, chức vụ.',
  ),
  multiFact(
    'Chọn tất cả các câu giới thiệu đồ vật.',
    ['Thước kẻ là đồ dùng học tập.', 'Tủ lạnh là đồ dùng trong nhà.'],
    ['Thước kẻ nằm trong hộp bút.', 'Tủ lạnh kêu to.'],
    'Hai câu đúng nêu đồ vật là gì, thuộc kiểu “Ai là gì?”.',
  ),
  multiFact(
    'Chọn tất cả các câu có bộ phận “Ai” chỉ người.',
    ['Mẹ em là y tá.', 'Bạn Hoa là lớp phó.'],
    ['Cái bàn là đồ gỗ.', 'Con mèo là vật nuôi.'],
    '“Mẹ em” và “Bạn Hoa” chỉ người; bàn và mèo không phải người.',
  ),
];

const AI_LA_GI_TF = [
  tf('Câu “Mẹ em là bác sĩ.” thuộc kiểu câu “Ai là gì?”.', true, 'Câu giới thiệu nghề nghiệp của mẹ.'),
  tf('Trong câu “Lan là học sinh giỏi.”, bộ phận “Lan” trả lời câu hỏi “Là gì?”.', false, '“Lan” trả lời câu hỏi “Ai?”.'),
  tf('Câu “Bé quét nhà.” thuộc kiểu câu “Ai là gì?”.', false, 'Đây là câu kiểu “Ai làm gì?”.'),
  tf('Câu “Cây bàng là loài cây bóng mát.” dùng để giới thiệu về cây bàng.', true, 'Câu nêu cây bàng là loài cây gì.'),
];

const AI_LA_GI_FILL = [
  fill('Điền từ còn thiếu: “Chị em ___ sinh viên.”', ['là'], 'Câu giới thiệu cần từ “là”.'),
  fill('Điền bộ phận còn thiếu: “Hà Nội là ___ của nước ta.”', ['thủ đô'], 'Hà Nội là thủ đô của Việt Nam.'),
  fill('Điền bộ phận còn thiếu: “Cá heo là ___.” (đặc điểm nổi bật)', ['loài vật thông minh', 'động vật thông minh'], 'Cá heo nổi tiếng thông minh.'),
  fill('Đặt câu hỏi cho bộ phận “bác sĩ” trong câu “Bố em là bác sĩ”.', ['Bố em làm nghề gì?', 'Bố em là gì?', 'Bố em là ai?'], 'Hỏi về nghề nghiệp của bố.'),
  fill('Sắp xếp thành câu: “em / là / Hoa / bạn thân / của”.', ['Hoa là bạn thân của em', 'Hoa là bạn thân của em.'], 'Câu đúng: Hoa là bạn thân của em.'),
];

const cauAiLaGi = {
  single(k) { return AI_LA_GI_SINGLE[k]; },
  multi(k) { return AI_LA_GI_MULTI[k]; },
  tf(k) { return AI_LA_GI_TF[k]; },
  fill(k) { return AI_LA_GI_FILL[k]; },
};

// ===== Dấu câu =====
const DAU_CAU_SINGLE = [
  fact('Cuối câu hỏi “Bạn tên là gì” cần dấu gì?', 'Dấu chấm hỏi', 'Câu hỏi kết thúc bằng dấu chấm hỏi.', ['Dấu chấm', 'Dấu phẩy', 'Dấu chấm than']),
  fact('Cuối câu “Ôi, đẹp quá” cần dấu gì?', 'Dấu chấm than', 'Câu bộc lộ cảm xúc dùng dấu chấm than.', ['Dấu chấm', 'Dấu phẩy', 'Dấu chấm hỏi']),
  fact('Cuối câu kể “Hôm nay trời nắng” cần dấu gì?', 'Dấu chấm', 'Câu kể kết thúc bằng dấu chấm.', ['Dấu chấm hỏi', 'Dấu chấm than', 'Dấu hai chấm']),
  fact('Dấu phẩy trong câu “Em thích đọc sách, vẽ tranh và hát.” có tác dụng gì?', 'Ngăn cách các từ cùng loại', 'Dấu phẩy tách các hoạt động được liệt kê.', ['Kết thúc câu', 'Báo hiệu lời nói', 'Thể hiện cảm xúc']),
  fact('Câu nào dùng dấu câu đúng?', 'Mẹ ơi, con đi học đây ạ!', 'Câu có dấu phẩy sau tiếng gọi và dấu chấm than cuối câu.', ['Mẹ ơi? con đi học đây ạ!', 'Mẹ ơi, con đi học đây ạ?', 'Mẹ ơi con, đi học đây ạ!']),
  fact('Dấu hai chấm thường được dùng để làm gì?', 'Báo hiệu lời nói của nhân vật', 'Dấu hai chấm đứng trước lời nói trực tiếp.', ['Kết thúc câu hỏi', 'Ngăn cách trạng ngữ', 'Thay cho dấu chấm']),
  fact('Câu “Bạn có khỏe không” cần điền dấu gì ở cuối?', '?', 'Đây là câu hỏi nên dùng dấu chấm hỏi.', ['.', '!', ',']),
  fact('Câu nào là câu hỏi?', 'Con đã làm bài chưa?', 'Câu hỏi dùng để hỏi và kết thúc bằng dấu chấm hỏi.', ['Con làm bài rồi.', 'Con làm bài đi!', 'Con làm bài rất nhanh.']),
  fact('Câu nào là câu cảm?', 'Chao ôi, bông hoa đẹp quá!', 'Câu cảm bộc lộ cảm xúc, kết thúc bằng dấu chấm than.', ['Bông hoa này màu đỏ.', 'Bông hoa nở khi nào?', 'Em hái bông hoa.']),
  fact('Trong câu “Lan, Hoa và Mai đều học giỏi.”, dấu phẩy dùng để làm gì?', 'Ngăn cách các tên riêng', 'Dấu phẩy tách các tên riêng được liệt kê.', ['Kết thúc câu', 'Báo hiệu câu hỏi', 'Bộc lộ cảm xúc']),
  fact('Cuối câu “Hôm nay là thứ mấy” cần dấu gì?', 'Dấu chấm hỏi', 'Đây là câu hỏi.', ['Dấu chấm', 'Dấu chấm than', 'Dấu phẩy']),
  fact('Dấu chấm than thường dùng ở cuối câu nào?', 'Câu bộc lộ cảm xúc', 'Dấu chấm than dùng cho câu cảm, câu khiến.', ['Câu hỏi', 'Câu kể', 'Câu giới thiệu']),
];

const DAU_CAU_MULTI = [
  multiFact(
    'Chọn tất cả các câu cần dùng dấu chấm hỏi ở cuối.',
    ['Bạn đang làm gì?', 'Mấy giờ rồi?'],
    ['Trời hôm nay đẹp.', 'Em đi học.'],
    'Hai câu đầu là câu hỏi; hai câu sau là câu kể.',
  ),
  multiFact(
    'Chọn tất cả các câu cần dùng dấu chấm than ở cuối.',
    ['Ôi, nóng quá!', 'Tuyệt vời!'],
    ['Em ăn cơm.', 'Bạn tên là gì?'],
    'Hai câu đầu bộc lộ cảm xúc mạnh.',
  ),
  multiFact(
    'Chọn tất cả các câu dùng dấu phẩy đúng.',
    ['Em thích táo, cam và nho.', 'Mẹ mua rau, cá, thịt.'],
    ['Em thích táo cam, và nho.', 'Mẹ, mua rau cá thịt.'],
    'Dấu phẩy đặt giữa các từ cùng loại được liệt kê.',
  ),
  multiFact(
    'Chọn tất cả các dấu câu dùng để kết thúc câu.',
    ['Dấu chấm', 'Dấu chấm hỏi'],
    ['Dấu phẩy', 'Dấu hai chấm'],
    'Dấu chấm và dấu chấm hỏi đứng cuối câu; dấu phẩy, dấu hai chấm dùng trong câu.',
  ),
];

const DAU_CAU_TF = [
  tf('Cuối câu hỏi ta dùng dấu chấm hỏi.', true, 'Dấu chấm hỏi là dấu kết thúc câu hỏi.'),
  tf('Cuối câu kể ta dùng dấu chấm than.', false, 'Câu kể kết thúc bằng dấu chấm.'),
  tf('Dấu phẩy dùng để ngăn cách các bộ phận trong câu.', true, 'Dấu phẩy giúp câu rõ ràng hơn.'),
  tf('Dấu hai chấm dùng để kết thúc câu hỏi.', false, 'Câu hỏi kết thúc bằng dấu chấm hỏi.'),
];

const DAU_CAU_FILL = [
  fill('Điền dấu câu thích hợp vào cuối câu: “Bạn có thích đọc sách không ___”', ['?', 'dấu chấm hỏi', 'Dấu chấm hỏi'], 'Đây là câu hỏi.'),
  fill('Điền dấu câu thích hợp vào cuối câu: “Ôi, cầu vồng đẹp quá ___”', ['!', 'dấu chấm than', 'Dấu chấm than'], 'Câu cảm dùng dấu chấm than.'),
  fill('Điền dấu câu thích hợp vào cuối câu: “Hôm nay em được điểm mười ___”', ['.', 'dấu chấm', 'Dấu chấm'], 'Đây là câu kể.'),
  fill('Điền dấu câu vào chỗ trống: “Em thích ăn táo ___ cam và nho.”', [',', 'dấu phẩy', 'Dấu phẩy'], 'Dấu phẩy ngăn cách các từ cùng loại.'),
  fill('Điền dấu câu vào chỗ trống: “Cô giáo nói ___ “Các em hãy giữ vệ sinh.””', [':', 'dấu hai chấm', 'Dấu hai chấm'], 'Dấu hai chấm báo hiệu lời nói trực tiếp.'),
];

const dauCau = {
  single(k) { return DAU_CAU_SINGLE[k]; },
  multi(k) { return DAU_CAU_MULTI[k]; },
  tf(k) { return DAU_CAU_TF[k]; },
  fill(k) { return DAU_CAU_FILL[k]; },
};

// ===== Đọc hiểu =====
const DOC_A = 'Sáng chủ nhật, Lan cùng bố trồng cây trong vườn. Lan tưới nước cho cây non. Bố nhắc Lan tưới vừa đủ để cây không bị úng. Chiều đến, hai bố con thấy luống rau xanh mướt.';
const DOC_B = 'Mèo Mun có bộ lông đen bóng. Mỗi sáng, nó nằm sưởi nắng trước hiên nhà. Khi nghe tiếng chuột, Mun liền vểnh tai và rình thật lặng lẽ.';
const DOC_C = 'Cây bàng trước sân trường tỏa bóng mát cả mùa hè. Mùa thu, lá bàng chuyển sang màu vàng rồi đỏ. Đông đến, cây trơ lại những cành khô. Xuân về, chồi non lại nhú ra xanh biếc.';
const DOC_D = 'Hôm qua, trời mưa to. Nam quên mang áo mưa nên ướt hết. Thấy vậy, Hùng liền đưa áo mưa của mình cho bạn. Nam cảm ơn Hùng rồi hai bạn cùng che chung về nhà.';
const DOC_E = 'Trong vườn, đàn kiến chăm chỉ tha mồi về tổ. Chúng đi thành hàng dài, không hề lạc nhau. Nhờ vậy, tổ kiến lúc nào cũng đầy thức ăn.';

function doc(passage, question) {
  return `Đọc đoạn văn: “${passage}” ${question}`;
}

const DOC_SINGLE = [
  fact(doc(DOC_A, 'Đoạn văn kể về việc gì?'), 'Hai bố con Lan trồng cây', 'Cả đoạn nói về buổi trồng cây của hai bố con.', ['Lan đi học', 'Lan tắm cho mèo', 'Bố đi làm']),
  fact(doc(DOC_A, 'Lan tưới nước cho cây nào?'), 'Cây non', 'Đoạn văn ghi: Lan tưới nước cho cây non.', ['Cây bàng', 'Cây hoa hồng', 'Cây chuối']),
  fact(doc(DOC_A, 'Bố nhắc Lan tưới nước như thế nào?'), 'Vừa đủ', 'Bố nhắc tưới vừa đủ để cây không bị úng.', ['Thật nhiều', 'Thật nhanh', 'Mỗi tuần một lần']),
  fact(doc(DOC_B, 'Mèo Mun có bộ lông màu gì?'), 'Màu đen', 'Đoạn văn tả mèo Mun có bộ lông đen bóng.', ['Màu trắng', 'Màu vàng', 'Màu xám']),
  fact(doc(DOC_B, 'Mỗi sáng, mèo Mun làm gì?'), 'Nằm sưởi nắng', 'Mun nằm sưởi nắng trước hiên nhà.', ['Bắt cá', 'Trèo cây', 'Ngủ trong nhà']),
  fact(doc(DOC_C, 'Cây bàng tỏa bóng mát vào mùa nào?'), 'Mùa hè', 'Câu đầu cho biết cây bàng tỏa bóng mát cả mùa hè.', ['Mùa thu', 'Mùa đông', 'Mùa xuân']),
  fact(doc(DOC_C, 'Mùa thu, lá bàng có màu gì?'), 'Vàng rồi đỏ', 'Lá bàng chuyển sang màu vàng rồi đỏ.', ['Xanh biếc', 'Tím', 'Trắng']),
  fact(doc(DOC_D, 'Vì sao Nam bị ướt?'), 'Vì quên mang áo mưa', 'Nam quên mang áo mưa nên bị ướt.', ['Vì đi bơi', 'Vì bị ngã', 'Vì quên mũ']),
  fact(doc(DOC_D, 'Hùng đã làm gì giúp Nam?'), 'Đưa áo mưa cho bạn', 'Hùng đưa áo mưa của mình cho Nam.', ['Cho bạn mượn sách', 'Che ô cho bạn', 'Đưa bạn về bằng xe']),
  fact(doc(DOC_E, 'Đàn kiến làm gì trong vườn?'), 'Tha mồi về tổ', 'Đoạn văn nói kiến tha mồi về tổ.', ['Xây tổ trên cây', 'Uống nước', 'Bắt bướm']),
  fact(doc(DOC_E, 'Vì sao tổ kiến luôn đầy thức ăn?'), 'Nhờ kiến chăm chỉ tha mồi', 'Kiến chăm chỉ tha mồi nên tổ đầy thức ăn.', ['Nhờ trời mưa', 'Nhờ kiến ngủ nhiều', 'Nhờ kiến bay đi']),
  fact(doc(DOC_E, 'Đàn kiến đi như thế nào?'), 'Thành hàng dài', 'Chúng đi thành hàng dài, không lạc nhau.', ['Bay thành đàn', 'Bơi thành hàng', 'Chạy tán loạn']),
];

const DOC_MULTI = [
  multiFact(doc(DOC_B, 'Chọn các chi tiết đúng về mèo Mun.'), ['Lông đen bóng', 'Nằm sưởi nắng trước hiên'], ['Lông trắng muốt', 'Thích bơi dưới ao'], 'Mun có lông đen bóng và nằm sưởi nắng mỗi sáng.'),
  multiFact(doc(DOC_C, 'Chọn các màu lá bàng được nhắc trong đoạn.'), ['Vàng', 'Đỏ'], ['Tím', 'Trắng'], 'Đoạn văn nhắc lá bàng màu vàng rồi đỏ.'),
  multiFact(doc(DOC_D, 'Chọn các chi tiết đúng trong đoạn.'), ['Trời mưa to', 'Hai bạn che chung áo mưa'], ['Nam mang áo mưa', 'Hùng bị ốm'], 'Trời mưa to, Nam quên áo mưa và hai bạn che chung.'),
  multiFact(doc(DOC_E, 'Chọn các chi tiết đúng về đàn kiến.'), ['Đi thành hàng dài', 'Tha mồi về tổ'], ['Sống dưới nước', 'Bay trên trời'], 'Kiến đi thành hàng dài và tha mồi về tổ.'),
];

const DOC_TF = [
  tf(doc(DOC_A, 'Bố nhắc Lan tưới thật nhiều nước.'), false, 'Bố nhắc tưới vừa đủ để cây không bị úng.'),
  tf(doc(DOC_B, 'Mèo Mun có bộ lông trắng muốt.'), false, 'Mun có bộ lông đen bóng.'),
  tf(doc(DOC_C, 'Mùa đông, cây bàng trơ lại những cành khô.'), true, 'Đoạn văn nói đông đến cây trơ cành khô.'),
  tf(doc(DOC_D, 'Nam và Hùng về nhà mỗi người một áo mưa.'), false, 'Hai bạn cùng che chung một áo mưa của Hùng.'),
];

const DOC_FILL = [
  fill(doc(DOC_A, 'Điền từ còn thiếu: “Buổi chiều, hai bố con thấy luống rau ___.”'), ['xanh mướt', 'xanh'], 'Đoạn văn ghi luống rau xanh mướt.'),
  fill(doc(DOC_B, 'Điền từ còn thiếu: “Khi nghe tiếng chuột, Mun ___ tai và rình thật lặng lẽ.”'), ['vểnh', 'vểnh tai'], 'Mun vểnh tai để nghe ngóng.'),
  fill(doc(DOC_C, 'Điền từ còn thiếu: “Xuân về, chồi non nhú ra ___.”'), ['xanh biếc', 'xanh'], 'Chồi non nhú ra xanh biếc.'),
  fill(doc(DOC_D, 'Điền từ còn thiếu: “Thấy Nam ướt, Hùng liền ___ áo mưa của mình cho bạn.”'), ['đưa', 'cho', 'đưa cho'], 'Hùng đưa áo mưa cho Nam.'),
  fill(doc(DOC_E, 'Điền từ còn thiếu: “Đàn kiến chăm chỉ ___ mồi về tổ.”'), ['tha'], 'Kiến tha mồi về tổ.'),
];

const docHieu = {
  single(k) { return DOC_SINGLE[k]; },
  multi(k) { return DOC_MULTI[k]; },
  tf(k) { return DOC_TF[k]; },
  fill(k) { return DOC_FILL[k]; },
};

// ===== Từ trái nghĩa =====
const TRAI_NGHIA_SINGLE = [
  fact('Từ trái nghĩa với “cao” là gì?', 'thấp', 'Cao và thấp là hai từ trái nghĩa.', ['to', 'dài', 'rộng']),
  fact('Từ trái nghĩa với “nóng” là gì?', 'lạnh', 'Nóng và lạnh trái ngược nhau.', ['nắng', 'khô', 'cháy']),
  fact('Từ trái nghĩa với “nhanh” là gì?', 'chậm', 'Nhanh và chậm trái ngược nhau.', ['vội', 'mau', 'gấp']),
  fact('Từ trái nghĩa với “đen” là gì?', 'trắng', 'Đen và trắng là hai màu trái nghĩa.', ['xanh', 'đỏ', 'vàng']),
  fact('Từ trái nghĩa với “vui” là gì?', 'buồn', 'Vui và buồn trái ngược nhau.', ['cười', 'hát', 'sung sướng']),
  fact('Từ trái nghĩa với “khỏe” là gì?', 'yếu', 'Khỏe và yếu trái ngược nhau.', ['mạnh', 'béo', 'gầy']),
  fact('Từ trái nghĩa với “dài” là gì?', 'ngắn', 'Dài và ngắn trái ngược nhau.', ['cao', 'rộng', 'to']),
  fact('Từ trái nghĩa với “sáng” là gì?', 'tối', 'Sáng và tối trái ngược nhau.', ['trưa', 'chiều', 'nắng']),
  fact('Từ trái nghĩa với “đầy” là gì?', 'vơi', 'Đầy và vơi trái ngược nhau.', ['đông', 'nhiều', 'chật']),
  fact('Từ trái nghĩa với “giỏi” là gì?', 'kém', 'Giỏi và kém trái ngược nhau.', ['tốt', 'hay', 'chăm']),
  fact('Từ trái nghĩa với “trước” là gì?', 'sau', 'Trước và sau chỉ hai phía thời gian trái ngược.', ['trên', 'dưới', 'giữa']),
  fact('Từ trái nghĩa với “ra” là gì?', 'vào', 'Ra và vào là hai hướng trái ngược.', ['lên', 'xuống', 'đi']),
];

const TRAI_NGHIA_MULTI = [
  multiFact('Chọn các cặp từ trái nghĩa.', ['cao – thấp', 'nóng – lạnh'], ['cao – to', 'nóng – ấm'], 'Cao – thấp, nóng – lạnh là các cặp trái nghĩa.'),
  multiFact('Chọn các cặp từ trái nghĩa (tả tính tình).', ['hiền – dữ', 'chăm – lười'], ['hiền – tốt', 'chăm – siêng'], 'Hiền – dữ, chăm – lười trái ngược nhau.'),
  multiFact('Chọn các cặp từ trái nghĩa (tả kích thước).', ['to – nhỏ', 'dài – ngắn'], ['to – lớn', 'dài – xa'], 'To – nhỏ, dài – ngắn là các cặp trái nghĩa.'),
  multiFact('Chọn các cặp từ trái nghĩa (chỉ thời gian).', ['sớm – muộn', 'trước – sau'], ['sớm – mau', 'trước – trên'], 'Sớm – muộn, trước – sau trái ngược nhau.'),
];

const TRAI_NGHIA_TF = [
  tf('“Cao” và “thấp” là hai từ trái nghĩa.', true, 'Hai từ chỉ hai mức độ trái ngược.'),
  tf('“Vui” và “buồn” là hai từ cùng nghĩa.', false, 'Chúng là hai từ trái nghĩa.'),
  tf('Từ trái nghĩa với “đen” là “trắng”.', true, 'Đen và trắng trái ngược nhau.'),
  tf('“Nhanh” và “chậm” là hai từ đồng nghĩa.', false, 'Chúng là hai từ trái nghĩa.'),
];

const TRAI_NGHIA_FILL = [
  fill('Điền từ trái nghĩa với “nóng”: “Nước trong tủ lạnh rất ___.”', ['lạnh'], 'Nóng và lạnh trái nghĩa.'),
  fill('Điền từ trái nghĩa với “cao”: “Cái ghế này rất ___.”', ['thấp'], 'Cao và thấp trái nghĩa.'),
  fill('Điền từ trái nghĩa với “vui”: “Nghe tin buồn, mẹ rất ___.”', ['buồn'], 'Vui và buồn trái nghĩa.'),
  fill('Điền từ trái nghĩa với “sáng”: “Trời đã ___ nên em bật đèn.”', ['tối'], 'Sáng và tối trái nghĩa.'),
  fill('Điền từ trái nghĩa với “giỏi”: “Bạn ấy học còn ___ nên cần cố gắng.”', ['kém', 'yếu'], 'Giỏi và kém trái nghĩa.'),
];

const tuTraiNghia = {
  single(k) { return TRAI_NGHIA_SINGLE[k]; },
  multi(k) { return TRAI_NGHIA_MULTI[k]; },
  tf(k) { return TRAI_NGHIA_TF[k]; },
  fill(k) { return TRAI_NGHIA_FILL[k]; },
};

export const VIETNAMESE_GRADE_2 = {
  'tieng-viet-2-chinh-ta': chinhTa,
  'tieng-viet-2-tu-chi-hoat-dong': tuChiHoatDong,
  'tieng-viet-2-cau-ai-la-gi': cauAiLaGi,
  'tieng-viet-2-dau-cau': dauCau,
  'tieng-viet-2-doc-hieu': docHieu,
  'tieng-viet-2-tu-trai-nghia': tuTraiNghia,
};
