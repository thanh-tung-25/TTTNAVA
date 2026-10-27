import { fact, fill, multiFact, tf } from './math-utils.js';

// ===== Từ chỉ đặc điểm =====
const DAC_DIEM_SINGLE = [
  fact('Trong câu “Bông hoa hồng có màu đỏ thắm”, từ nào chỉ đặc điểm?', 'đỏ thắm', '“Đỏ thắm” tả màu sắc của hoa.', ['bông hoa', 'màu', 'nở']),
  fact('Từ nào chỉ đặc điểm của làn da em bé?', 'mịn màng', '“Mịn màng” tả làn da.', ['bú', 'ngủ', 'khóc']),
  fact('Trong câu “Chú mèo có bộ lông xù”, từ nào chỉ đặc điểm?', 'xù', '“Xù” tả đặc điểm bộ lông.', ['Chú mèo', 'bộ lông', 'có']),
  fact('Từ nào chỉ đặc điểm của nước biển?', 'mặn', '“Mặn” là đặc điểm vị của nước biển.', ['bơi', 'sóng', 'bờ']),
  fact('Trong câu “Cây bàng cao lớn đứng giữa sân trường”, từ nào chỉ đặc điểm?', 'cao lớn', '“Cao lớn” tả hình dáng cây bàng.', ['Cây bàng', 'đứng', 'sân trường']),
  fact('Từ nào chỉ đặc điểm của giọng hát?', 'trong trẻo', '“Trong trẻo” tả âm thanh giọng hát.', ['hát', 'bài', 'âm thanh']),
  fact('Trong câu “Bầu trời hôm nay xanh trong”, từ nào chỉ đặc điểm?', 'xanh trong', '“Xanh trong” tả màu sắc bầu trời.', ['Bầu trời', 'hôm nay', 'trời']),
  fact('Từ nào chỉ đặc điểm của con đường làng?', 'gập ghềnh', '“Gập ghềnh” tả bề mặt con đường.', ['đi', 'xe', 'làng']),
  fact('Từ nào chỉ đặc điểm của một người bạn tốt?', 'tốt bụng', '“Tốt bụng” tả tính tình.', ['chạy', 'học', 'bạn']),
  fact('Trong câu “Nước hồ trong veo”, từ nào chỉ đặc điểm?', 'trong veo', '“Trong veo” tả đặc điểm của nước.', ['Nước', 'hồ', 'chảy']),
  fact('Từ nào chỉ đặc điểm của mùa đông?', 'lạnh giá', '“Lạnh giá” tả thời tiết mùa đông.', ['mùa', 'áo', 'tháng']),
  fact('Từ nào chỉ đặc điểm của quả chanh?', 'chua', '“Chua” là đặc điểm vị của quả chanh.', ['ăn', 'vỏ', 'quả']),
];

const DAC_DIEM_MULTI = [
  multiFact('Chọn tất cả các từ chỉ đặc điểm màu sắc.', ['đỏ tươi', 'xanh biếc'], ['chạy', 'nhảy'], '“Đỏ tươi”, “xanh biếc” chỉ màu sắc.'),
  multiFact('Chọn tất cả các từ chỉ đặc điểm hình dáng.', ['cao lớn', 'thon dài'], ['ngọt', 'thơm'], '“Cao lớn”, “thon dài” tả hình dáng.'),
  multiFact('Chọn tất cả các từ chỉ đặc điểm tính tình.', ['hiền lành', 'chăm chỉ'], ['đỏ', 'cao'], '“Hiền lành”, “chăm chỉ” tả tính tình.'),
  multiFact('Chọn tất cả các từ chỉ đặc điểm của mùi vị.', ['thơm phức', 'ngọt lịm'], ['xanh', 'nhanh'], '“Thơm phức”, “ngọt lịm” tả mùi vị.'),
];

const DAC_DIEM_TF = [
  tf('Từ “xanh biếc” là từ chỉ đặc điểm.', true, '“Xanh biếc” chỉ màu sắc.'),
  tf('Từ “chạy” là từ chỉ đặc điểm.', false, '“Chạy” là từ chỉ hoạt động.'),
  tf('Trong câu “Cô giáo em rất dịu dàng”, từ “dịu dàng” chỉ đặc điểm.', true, '“Dịu dàng” tả tính tình của cô giáo.'),
  tf('Các từ “cao”, “thấp”, “rộng” đều chỉ hoạt động.', false, 'Chúng chỉ đặc điểm hình dáng, kích thước.'),
];

const DAC_DIEM_FILL = [
  fill('Điền từ chỉ đặc điểm: “Quả chanh rất ___.”', ['chua'], 'Chanh có vị chua.'),
  fill('Điền từ chỉ đặc điểm: “Chú voi có cái vòi rất ___.”', ['dài', 'to', 'khỏe'], 'Vòi voi dài và khỏe.'),
  fill('Điền từ chỉ đặc điểm: “Bông hoa hồng có màu ___.”', ['đỏ', 'hồng'], 'Hoa hồng thường có màu đỏ hoặc hồng.'),
  fill('Điền từ chỉ đặc điểm: “Mùa đông trời rất ___.”', ['lạnh', 'lạnh giá', 'rét'], 'Mùa đông trời lạnh.'),
  fill('Điền từ chỉ đặc điểm: “Bạn Lan học rất ___.”', ['giỏi', 'chăm', 'chăm chỉ'], 'Lan học giỏi và chăm chỉ.'),
];

const tuChiDacDiem = {
  single(k) { return DAC_DIEM_SINGLE[k]; },
  multi(k) { return DAC_DIEM_MULTI[k]; },
  tf(k) { return DAC_DIEM_TF[k]; },
  fill(k) { return DAC_DIEM_FILL[k]; },
};

// ===== Biện pháp so sánh =====
const SO_SANH_SINGLE = [
  fact('Trong câu “Trăng tròn như cái đĩa”, sự vật nào được so sánh với cái đĩa?', 'Trăng', 'Trăng được so sánh với cái đĩa tròn.', ['Cái đĩa', 'Trời', 'Ngôi sao']),
  fact('Từ so sánh trong câu “Mắt bé đen như hạt nhãn” là từ nào?', 'như', '“Như” là từ nối hai sự vật được so sánh.', ['đen', 'mắt', 'hạt']),
  fact('Câu nào có hình ảnh so sánh?', 'Mặt trời đỏ như quả cầu lửa.', 'Câu dùng “như” để so sánh mặt trời với quả cầu lửa.', ['Mặt trời mọc ở đằng đông.', 'Mặt trời chiếu sáng.', 'Mặt trời đã lặn.']),
  fact('Trong câu “Cây cau cao như cột nhà”, từ nào là từ so sánh?', 'như', '“Như” nối cây cau với cột nhà.', ['cao', 'cột nhà', 'cây cau']),
  fact('Câu “Dòng sông uốn lượn như một dải lụa” so sánh dòng sông với gì?', 'Dải lụa', 'Dòng sông được ví với dải lụa mềm mại.', ['Con rắn', 'Con đường', 'Tấm gương']),
  fact('Câu nào dùng từ so sánh “là”?', 'Bạn Mai là một bông hoa của lớp.', '“Là” nối bạn Mai với hình ảnh bông hoa.', ['Bạn Mai rất xinh.', 'Bạn Mai học giỏi.', 'Bạn Mai đi học sớm.']),
  fact('Trong câu “Tiếng suối trong như tiếng hát xa”, âm thanh nào được so sánh?', 'Tiếng suối', 'Tiếng suối được so sánh với tiếng hát xa.', ['Tiếng hát', 'Tiếng gió', 'Tiếng chim']),
  fact('Câu nào không có hình ảnh so sánh?', 'Em đi học bằng xe đạp.', 'Câu chỉ nêu hoạt động, không có hình ảnh so sánh.', ['Mây trắng như bông.', 'Nắng vàng như mật ong.', 'Trời xanh như ngọc.']),
  fact('Từ so sánh nào thường đứng giữa hai sự vật?', 'như', '“Như” thường dùng để nối hai sự vật so sánh.', ['vì', 'nên', 'để']),
  fact('Trong câu “Lá cờ đỏ thắm như ngọn lửa”, lá cờ được so sánh với gì?', 'Ngọn lửa', 'Lá cờ được ví với ngọn lửa đỏ.', ['Mặt trời', 'Bông hoa', 'Đám mây']),
  fact('Câu nào so sánh chú gà trống với một người?', 'Chú gà trống oai vệ như một chàng vệ sĩ.', 'Gà trống được so sánh với chàng vệ sĩ.', ['Chú gà trống gáy vang.', 'Chú gà trống mổ thóc.', 'Chú gà trống có bộ lông đẹp.']),
  fact('Trong câu “Tóc bà trắng như mây”, tóc bà được so sánh với sự vật nào?', 'Mây', 'Tóc bà trắng được ví với mây.', ['Tuyết', 'Bông', 'Sương']),
];

const SO_SANH_MULTI = [
  multiFact('Chọn tất cả các từ so sánh thường gặp.', ['như', 'tựa'], ['và', 'của'], '“Như”, “tựa” thường dùng để so sánh.'),
  multiFact('Chọn tất cả các câu có hình ảnh so sánh.', ['Mặt hồ phẳng lặng như tấm gương.', 'Đôi mắt bé sáng như sao.'], ['Mặt hồ rộng lớn.', 'Đôi mắt bé rất sáng.'], 'Hai câu đầu dùng từ “như” để so sánh.'),
  multiFact('Chọn các sự vật được so sánh với nhau trong câu “Trăng tròn như quả bóng vàng”.', ['Trăng', 'Quả bóng vàng'], ['Bầu trời', 'Ngôi sao'], 'Trăng được so sánh với quả bóng vàng.'),
  multiFact('Chọn tất cả các câu so sánh âm thanh với âm thanh.', ['Tiếng gió như tiếng đàn.', 'Tiếng suối như tiếng hát.'], ['Tiếng gió thổi mạnh.', 'Tiếng suối chảy xiết.'], 'Hai câu đầu so sánh âm thanh này với âm thanh khác.'),
];

const SO_SANH_TF = [
  tf('Trong câu “Mây trắng như bông”, từ “như” là từ so sánh.', true, '“Như” nối mây với bông.'),
  tf('Câu “Em thích đọc sách.” có hình ảnh so sánh.', false, 'Câu không có từ so sánh hay hình ảnh so sánh.'),
  tf('So sánh giúp câu văn gợi tả và sinh động hơn.', true, 'So sánh làm hình ảnh hiện lên rõ hơn.'),
  tf('Trong câu “Mặt trời đỏ như quả cầu lửa”, mặt trời được so sánh với quả bóng.', false, 'Mặt trời được so sánh với quả cầu lửa.'),
];

const SO_SANH_FILL = [
  fill('Điền từ so sánh vào chỗ trống: “Trăng tròn ___ cái đĩa.”', ['như', 'tựa', 'tựa như'], 'Dùng “như” để so sánh.'),
  fill('Điền từ còn thiếu để hoàn thành hình ảnh so sánh: “Mây trắng ___ bông.”', ['như', 'tựa'], 'Mây trắng được so sánh với bông.'),
  fill('Điền sự vật còn thiếu: “Mặt hồ phẳng lặng như ___.”', ['tấm gương', 'gương', 'tấm kính'], 'Mặt hồ phẳng như tấm gương.'),
  fill('Điền sự vật còn thiếu: “Đôi mắt bé sáng như ___.”', ['sao', 'ngôi sao', 'vì sao'], 'Đôi mắt sáng được ví với sao.'),
  fill('Điền từ so sánh: “Cây cau cao ___ cột nhà.”', ['như', 'tựa'], 'Dùng “như” để so sánh.'),
];

const soSanh = {
  single(k) { return SO_SANH_SINGLE[k]; },
  multi(k) { return SO_SANH_MULTI[k]; },
  tf(k) { return SO_SANH_TF[k]; },
  fill(k) { return SO_SANH_FILL[k]; },
};

// ===== Biện pháp nhân hóa =====
const NHAN_HOA_SINGLE = [
  fact('Trong câu “Chị gió chăm chỉ quét lá”, sự vật nào được nhân hóa?', 'Gió', 'Gió được gọi là “chị” và biết quét lá.', ['Lá', 'Chị', 'Sân']),
  fact('Câu nào có hình ảnh nhân hóa?', 'Anh nắng tinh nghịch nhảy trên mái nhà.', 'Nắng được gọi là “anh” và “nhảy” như người.', ['Nắng chiếu xuống mái nhà.', 'Mái nhà rất cao.', 'Trời hôm nay nắng.']),
  fact('Trong câu “Bác bàng dang tay che mát sân trường”, sự vật nào được gọi bằng từ chỉ người?', 'Bác bàng', 'Cây bàng được gọi là “bác”.', ['sân trường', 'bóng mát', 'cái lá']),
  fact('Trong câu “Mèo con nũng nịu bên mẹ”, con mèo được nhân hóa qua từ nào?', 'nũng nịu', '“Nũng nịu” là từ tả người, dùng để tả mèo.', ['mèo con', 'bên', 'mẹ']),
  fact('Câu nào không có hình ảnh nhân hóa?', 'Con sông dài và rộng.', 'Câu chỉ tả đặc điểm, không gọi sự vật như người.', ['Dòng sông hiền hòa chảy.', 'Chị mây áo trắng đi chơi.', 'Ông mặt trời thức dậy.']),
  fact('Cách nhân hóa trong câu “Những chị lúa phất phơ mái tóc vàng” là gì?', 'Gọi lúa là “chị”', 'Lúa được gọi bằng từ chỉ người.', ['Tả lúa như đồ vật', 'So sánh lúa với người', 'Dùng từ chỉ màu sắc']),
  fact('Trong câu “Chú gà trống kiêu hãnh gáy vang”, từ nào thể hiện nhân hóa?', 'kiêu hãnh', '“Kiêu hãnh” là từ chỉ tính cách của người.', ['gáy vang', 'gà trống', 'sân']),
  fact('Câu nào gọi sự vật bằng từ chỉ người?', 'Chị Hoa hồng khoe sắc.', 'Hoa hồng được gọi là “chị”.', ['Hoa hồng nở đẹp.', 'Hoa hồng có gai.', 'Em tưới hoa hồng.']),
  fact('Nhân hóa là gì?', 'Gọi hoặc tả sự vật bằng từ ngữ dùng cho người', 'Nhân hóa làm sự vật trở nên gần gũi.', ['So sánh hai sự vật', 'Kể lại một câu chuyện', 'Dùng từ trái nghĩa']),
  fact('Trong câu “Mặt trời thức dậy rất sớm”, từ nào cho thấy nhân hóa?', 'thức dậy', '“Thức dậy” là hoạt động của người.', ['mặt trời', 'rất', 'sớm']),
  fact('Câu nào có hình ảnh nhân hóa về con vật?', 'Chị chuồn chuồn ớt áo đỏ đi chơi.', 'Chuồn chuồn được gọi là “chị”, mặc áo và đi chơi.', ['Chuồn chuồn bay thấp.', 'Chuồn chuồn có cánh mỏng.', 'Em bắt chuồn chuồn.']),
  fact('Trong câu “Cây phượng khoác áo đỏ rực”, từ nào dùng để tả người?', 'khoác áo', '“Khoác áo” là hoạt động của người.', ['cây phượng', 'đỏ rực', 'áo']),
];

const NHAN_HOA_MULTI = [
  multiFact('Chọn tất cả các sự vật được nhân hóa trong câu “Chị gió và anh nắng cùng đi chơi”.', ['Gió', 'Nắng'], ['Cây', 'Nhà'], 'Gió được gọi là “chị”, nắng được gọi là “anh”.'),
  multiFact('Chọn tất cả các từ thường dùng để nhân hóa sự vật.', ['chị', 'anh'], ['cái', 'những'], '“Chị”, “anh” là từ chỉ người dùng để gọi sự vật.'),
  multiFact('Chọn tất cả các câu có hình ảnh nhân hóa.', ['Bác mặt trời tỏa nắng ấm.', 'Chị mây khoác áo trắng.'], ['Mặt trời tỏa nắng ấm.', 'Mây trắng bay trên trời.'], 'Hai câu đầu gọi sự vật bằng từ chỉ người.'),
  multiFact('Chọn các từ chỉ hoạt động của người được dùng để tả sự vật trong câu “Dòng sông hát ru bờ cát”.', ['hát', 'ru'], ['dòng sông', 'bờ cát'], '“Hát”, “ru” là hoạt động của người.'),
];

const NHAN_HOA_TF = [
  tf('Nhân hóa là gọi sự vật bằng từ ngữ dùng cho người.', true, 'Đó là cách làm sự vật trở nên sinh động.'),
  tf('Câu “Con mèo nằm ngủ.” có hình ảnh nhân hóa.', false, 'Câu chỉ tả hoạt động bình thường của mèo.'),
  tf('Câu “Chị nắng nhảy múa trên sân” có hình ảnh nhân hóa.', true, 'Nắng được gọi là “chị” và “nhảy múa”.'),
  tf('Nhân hóa làm câu văn khô khan hơn.', false, 'Nhân hóa làm câu văn sinh động, gần gũi hơn.'),
];

const NHAN_HOA_FILL = [
  fill('Điền từ chỉ người để nhân hóa mặt trời: “___ mặt trời thức dậy.”', ['Ông', 'Chị', 'Anh', 'Bác'], 'Có thể gọi mặt trời là ông, chị, anh, bác.'),
  fill('Điền hoạt động của người để nhân hóa dòng sông: “Dòng sông ___ ru bờ cát.”', ['hát', 'thì thầm'], 'Dòng sông được tả như người hát ru.'),
  fill('Điền từ chỉ người để nhân hóa gió: “___ gió chăm chỉ quét lá.”', ['Chị', 'Anh', 'Bác'], 'Gió được gọi bằng từ chỉ người.'),
  fill('Điền hoạt động của người: “Cây phượng ___ áo đỏ rực.”', ['khoác', 'mặc'], 'Cây phượng được tả như người mặc áo.'),
  fill('Điền từ chỉ người: “___ gà trống kiêu hãnh gáy vang.”', ['Chú', 'Anh'], 'Gà trống được gọi là “chú” hoặc “anh”.'),
];

const nhanHoa = {
  single(k) { return NHAN_HOA_SINGLE[k]; },
  multi(k) { return NHAN_HOA_MULTI[k]; },
  tf(k) { return NHAN_HOA_TF[k]; },
  fill(k) { return NHAN_HOA_FILL[k]; },
};

// ===== Câu kiểu Ai làm gì? =====
const AI_LAM_GI_SINGLE = [
  fact('Trong câu “Mẹ em nấu cơm”, bộ phận trả lời câu hỏi “Ai?” là gì?', 'Mẹ em', '“Mẹ em” là người thực hiện hoạt động.', ['nấu cơm', 'cơm', 'nấu']),
  fact('Trong câu “Đàn cá bơi dưới ao”, bộ phận trả lời câu hỏi “Làm gì?” là gì?', 'bơi dưới ao', '“Bơi dưới ao” nêu hoạt động của đàn cá.', ['Đàn cá', 'dưới ao', 'ao']),
  fact('Câu nào thuộc kiểu “Ai làm gì?”', 'Bác nông dân cày ruộng.', 'Câu nêu người và hoạt động.', ['Bác nông dân rất khỏe.', 'Bác nông dân là nông dân.', 'Bác nông dân ở quê.']),
  fact('Chọn từ điền vào chỗ trống: “Bé ___ bài tập.”', 'làm', '“Làm bài tập” là hoạt động.', ['là', 'rất', 'và']),
  fact('Bộ phận “đang gặt lúa” trong câu “Các bác nông dân đang gặt lúa” trả lời câu hỏi nào?', 'Làm gì?', 'Đây là hoạt động của các bác nông dân.', ['Ai?', 'Là gì?', 'Thế nào?']),
  fact('Câu “Chim chích bông bắt sâu cho lá” có bộ phận “Ai” là gì?', 'Chim chích bông', 'Chim chích bông là chủ thể của hoạt động.', ['bắt sâu', 'cho lá', 'lá']),
  fact('Câu nào có bộ phận “Làm gì?” là “tưới rau”?', 'Bà tưới rau ngoài vườn.', '“Tưới rau” nêu hoạt động của bà.', ['Bà rất chăm chỉ.', 'Bà là nông dân.', 'Vườn rau của bà rất xanh.']),
  fact('Trong câu “Lan và Hoa hát một bài”, bộ phận “Ai” là gì?', 'Lan và Hoa', 'Lan và Hoa là người thực hiện hoạt động hát.', ['hát', 'một bài', 'hát một bài']),
  fact('Câu nào không thuộc kiểu “Ai làm gì?”', 'Quyển sách này rất hay.', 'Câu này thuộc kiểu “Ai thế nào?”.', ['Em đọc sách.', 'Chị viết thư.', 'Bố sửa xe.']),
  fact('Đặt câu hỏi cho bộ phận “đang quét sân” trong câu “Bé đang quét sân”.', 'Bé đang làm gì?', 'Hỏi về hoạt động của bé.', ['Bé là gì?', 'Bé thế nào?', 'Ai đang quét sân?']),
  fact('Trong câu “Những chú chim hót líu lo”, từ nào chỉ hoạt động?', 'hót', '“Hót” là hoạt động của chim.', ['những', 'chú chim', 'líu lo']),
  fact('Câu nào kể lại một việc làm của em?', 'Em giúp mẹ rửa bát.', 'Câu nêu việc em làm.', ['Em là học sinh lớp 3.', 'Em rất vui.', 'Em cao hơn năm ngoái.']),
];

const AI_LAM_GI_MULTI = [
  multiFact('Chọn tất cả các câu thuộc kiểu “Ai làm gì?”', ['Chú bộ đội hành quân.', 'Cô giáo giảng bài.'], ['Chú bộ đội rất dũng cảm.', 'Cô giáo em rất dịu dàng.'], 'Hai câu đầu nêu người và hoạt động.'),
  multiFact('Chọn tất cả các từ chỉ hoạt động có thể điền vào “Bé ___ bức tranh.”', ['vẽ', 'tô'], ['đẹp', 'xinh'], 'Bé có thể vẽ hoặc tô bức tranh.'),
  multiFact('Chọn các bộ phận trả lời câu hỏi “Ai?” trong câu “Bố và anh trai sửa xe đạp”.', ['Bố', 'anh trai'], ['sửa', 'xe đạp'], '“Bố” và “anh trai” là người thực hiện việc sửa xe.'),
  multiFact('Chọn tất cả các câu có bộ phận “Làm gì?” là hoạt động học tập.', ['Nam làm bài tập.', 'Hoa đọc sách.'], ['Nam chơi bóng.', 'Hoa nấu cơm.'], 'Làm bài tập và đọc sách là hoạt động học tập.'),
];

const AI_LAM_GI_TF = [
  tf('Câu “Mẹ em nấu cơm.” thuộc kiểu câu “Ai làm gì?”.', true, 'Câu nêu mẹ và hoạt động nấu cơm.'),
  tf('Trong câu “Bé quét nhà.”, bộ phận “Bé” trả lời câu hỏi “Làm gì?”.', false, '“Bé” trả lời câu hỏi “Ai?”.'),
  tf('Câu “Bông hoa rất đẹp.” thuộc kiểu “Ai làm gì?”.', false, 'Câu này thuộc kiểu “Ai thế nào?”.'),
  tf('Câu “Đàn trâu gặm cỏ ven đê.” có bộ phận “Ai” là “Đàn trâu”.', true, '“Đàn trâu” là chủ thể gặm cỏ.'),
];

const AI_LAM_GI_FILL = [
  fill('Điền từ chỉ hoạt động: “Chị em ___ áo cho em bé.”', ['mặc', 'thay'], 'Chị mặc hoặc thay áo cho em bé.'),
  fill('Điền từ còn thiếu: “Bà em đang ___ rau ngoài vườn.”', ['tưới', 'nhổ'], 'Bà tưới hoặc nhổ rau ngoài vườn.'),
  fill('Điền từ chỉ hoạt động: “Các bạn ___ bài rất chăm chú.”', ['làm', 'viết', 'đọc'], 'Các bạn làm, viết hoặc đọc bài.'),
  fill('Đặt câu hỏi cho bộ phận “đang tưới cây”: “Bố em đang tưới cây.”', ['Bố em đang làm gì?', 'Bố em làm gì?'], 'Hỏi về hoạt động của bố.'),
  fill('Điền từ chỉ hoạt động: “Đàn chim ___ về tổ khi chiều xuống.”', ['bay'], 'Chim bay về tổ.'),
];

const cauAiLamGi = {
  single(k) { return AI_LAM_GI_SINGLE[k]; },
  multi(k) { return AI_LAM_GI_MULTI[k]; },
  tf(k) { return AI_LAM_GI_TF[k]; },
  fill(k) { return AI_LAM_GI_FILL[k]; },
};

// ===== Chính tả =====
const CHINH_TA_3_SINGLE = [
  fact('Từ nào viết đúng chính tả, chỉ người làm nghề dạy học?', 'giáo viên', '“Giáo viên” viết với gi ở tiếng đầu.', ['dáo viên', 'ráo viên', 'giáo viêng']),
  fact('Từ nào viết đúng, chỉ nơi em đến học hằng ngày?', 'trường học', '“Trường” viết với tr, “học” viết với h.', ['chường học', 'trường họt', 'chường họt']),
  fact('Từ nào viết đúng, chỉ đồ dùng để viết?', 'bút chì', '“Chì” viết với ch.', ['bút trì', 'búc chì', 'bút chìa']),
  fact('Từ nào viết đúng, chỉ loài chim nhỏ hay đậu trên mái nhà?', 'chim sẻ', '“Sẻ” viết với s và dấu hỏi.', ['chim xẻ', 'chim sẽ', 'chim xẽ']),
  fact('Từ nào viết đúng, chỉ buổi sáng sớm?', 'sớm mai', '“Sớm” viết với s.', ['xớm mai', 'sớm may', 'xớm may']),
  fact('Từ nào viết đúng, chỉ việc làm sạch quần áo?', 'giặt giũ', '“Giặt giũ” viết với gi ở cả hai tiếng.', ['dặt dũ', 'giặt dũ', 'dặt giũ']),
  fact('Từ nào viết đúng, chỉ trạng thái không bẩn?', 'sạch sẽ', '“Sạch sẽ” viết với s, tiếng “sẽ” có dấu ngã.', ['xạch xẽ', 'sạch xẽ', 'xạch sẽ']),
  fact('Từ nào viết đúng, chỉ con vật kêu “gâu gâu”?', 'con chó', '“Chó” viết với ch.', ['con tró', 'con chóe', 'con tróe']),
  fact('Từ nào viết đúng, chỉ công việc của bác sĩ?', 'khám bệnh', '“Bệnh” viết với b và dấu nặng.', ['khám bện', 'khám bệng', 'khám bênh']),
  fact('Từ nào viết đúng, chỉ người bạn cùng lớp?', 'bạn thân', '“Thân” viết với th và â.', ['bạng thân', 'bạn thâng', 'bạng thâng']),
  fact('Từ nào viết đúng, chỉ món ăn được nấu từ gạo?', 'cơm trắng', '“Trắng” viết với tr.', ['cơm chắng', 'cơm trắn', 'cơm chắn']),
  fact('Từ nào viết đúng, chỉ hiện tượng nước rơi từ trên trời?', 'mưa rào', '“Rào” viết với r.', ['mưa dào', 'mưa giàu', 'mưa dàu']),
];

const CHINH_TA_3_MULTI = [
  multiFact('Chọn tất cả các từ viết đúng chính tả (đồ dùng học tập).', ['thước kẻ', 'cái tẩy'], ['thước cẻ', 'tẫy'], '“Thước kẻ” và “cái tẩy” viết đúng.'),
  multiFact('Chọn tất cả các từ viết đúng chính tả (cây cối).', ['rặng tre', 'cây xấu hổ'], ['rặng che', 'cây sấu hổ'], '“Rặng tre” viết với tr, “xấu hổ” viết với x.'),
  multiFact('Chọn tất cả các từ viết đúng chính tả (hoạt động).', ['chạy nhảy', 'sửa chữa'], ['chạy nhãy', 'sửa chửa'], '“Chạy nhảy” và “sửa chữa” viết đúng.'),
  multiFact('Chọn tất cả các từ viết đúng chính tả (tính từ).', ['rực rỡ', 'trong trẻo'], ['dực dỡ', 'chong chẻo'], '“Rực rỡ” và “trong trẻo” viết đúng.'),
];

const CHINH_TA_3_TF = [
  tf('Tên riêng nước ngoài khi viết cần viết hoa chữ cái đầu.', true, 'Ví dụ: Pa-ri, Mát-xcơ-va.'),
  tf('Từ “giặt giũ” được viết với “d”.', false, '“Giặt giũ” viết với gi.'),
  tf('“Sạch sẽ” là cách viết đúng chính tả.', true, 'Viết s ở tiếng đầu và dấu ngã ở tiếng sau.'),
  tf('“Trường học” được viết với “ch”.', false, '“Trường học” viết với tr.'),
];

const CHINH_TA_3_FILL = [
  fill('Viết lại từ còn thiếu: “___ường học của em rất đẹp.”', ['Trường', 'trường'], 'Từ đúng là “trường”.'),
  fill('Điền s hoặc x: “Bé rửa tay bằng ___à phòng.”', ['x', 'xà'], '“Xà phòng” viết với x.'),
  fill('Điền d, gi hoặc r vào chỗ trống: “Bé ___ữ gìn sách vở cẩn thận.”', ['gi', 'giữ'], '“Giữ gìn” viết với gi.'),
  fill('Điền từ còn thiếu: “Sau giờ học, em ___ ngơi một lát.”', ['nghỉ'], '“Nghỉ ngơi” viết dấu hỏi.'),
  fill('Viết đúng tên riêng: “thành phố hà nội”.', ['Thành phố Hà Nội', 'Hà Nội'], 'Tên riêng phải viết hoa: Hà Nội.'),
];

const chinhTa3 = {
  single(k) { return CHINH_TA_3_SINGLE[k]; },
  multi(k) { return CHINH_TA_3_MULTI[k]; },
  tf(k) { return CHINH_TA_3_TF[k]; },
  fill(k) { return CHINH_TA_3_FILL[k]; },
};

// ===== Đọc hiểu =====
const DOC_3_A = 'Sáng sớm, bác nông dân ra đồng. Bác dắt trâu ra cày ruộng. Sau mỗi đường cày, đất tơi xốp như được vỗ về. Trưa đến, bác nghỉ dưới gốc đa, ăn cơm nắm và uống nước mát.';
const DOC_3_B = 'Cây bàng già đứng giữa sân trường. Mùa hè, tán lá xòe rộng như chiếc ô khổng lồ. Giờ ra chơi, chúng em thường ngồi dưới gốc bàng đọc truyện. Tiếng cười của bạn bè làm khu vườn thêm rộn ràng.';
const DOC_3_C = 'Ngày chủ nhật, Hà theo mẹ ra chợ. Chợ đông vui, tiếng rao hàng vang khắp nơi. Mẹ mua rau, cá và một ít trái cây. Hà giúp mẹ xách giỏ, thấy vui vì được san sẻ việc nhà.';
const DOC_3_D = 'Đêm rằm, trăng sáng vằng vặc. Bọn trẻ trong xóm rủ nhau ra sân đình chơi. Chúng vừa múa lân vừa hát, tiếng trống vang xa. Ông trăng như cũng mỉm cười nhìn xuống.';
const DOC_3_E = 'Mùa xuân, vườn nhà bà bừng tỉnh. Những chồi non mơn mởn vươn mình. Đàn ong bay đi tìm mật, đàn bướm rập rờn bên hoa cúc. Bà bảo: “Mùa xuân là món quà đẹp nhất của đất trời.”';

function doc3(passage, question) {
  return `Đọc đoạn văn: “${passage}” ${question}`;
}

const DOC_3_SINGLE = [
  fact(doc3(DOC_3_A, 'Bác nông dân ra đồng vào lúc nào?'), 'Sáng sớm', 'Câu đầu ghi bác ra đồng từ sáng sớm.', ['Buổi trưa', 'Buổi chiều', 'Buổi tối']),
  fact(doc3(DOC_3_A, 'Bác dắt con vật nào ra cày ruộng?'), 'Con trâu', 'Bác dắt trâu ra cày ruộng.', ['Con bò', 'Con ngựa', 'Con dê']),
  fact(doc3(DOC_3_B, 'Tán lá bàng mùa hè được so sánh với gì?'), 'Chiếc ô khổng lồ', 'Tán lá xòe rộng như chiếc ô khổng lồ.', ['Mái nhà', 'Cái quạt', 'Tấm gương']),
  fact(doc3(DOC_3_B, 'Giờ ra chơi, các bạn làm gì dưới gốc bàng?'), 'Đọc truyện', 'Chúng em ngồi dưới gốc bàng đọc truyện.', ['Đá bóng', 'Nhảy dây', 'Tưới cây']),
  fact(doc3(DOC_3_C, 'Hà theo mẹ đi đâu?'), 'Ra chợ', 'Hà theo mẹ ra chợ ngày chủ nhật.', ['Ra công viên', 'Về quê', 'Đến trường']),
  fact(doc3(DOC_3_C, 'Mẹ mua những gì ở chợ?'), 'Rau, cá và trái cây', 'Mẹ mua rau, cá và một ít trái cây.', ['Rau, thịt và bánh', 'Cá, gạo và sữa', 'Trái cây và quần áo']),
  fact(doc3(DOC_3_D, 'Đêm rằm, trăng như thế nào?'), 'Sáng vằng vặc', 'Đoạn văn mở đầu bằng “trăng sáng vằng vặc”.', ['Mờ ảo', 'Bị mây che', 'Đỏ như lửa']),
  fact(doc3(DOC_3_D, 'Bọn trẻ chơi trò gì?'), 'Múa lân', 'Bọn trẻ vừa múa lân vừa hát.', ['Kéo co', 'Đá cầu', 'Bịt mắt bắt dê']),
  fact(doc3(DOC_3_E, 'Mùa xuân, vườn nhà bà như thế nào?'), 'Bừng tỉnh, tươi mới', 'Vườn nhà bà bừng tỉnh khi xuân về.', ['Khô héo', 'Ngập nước', 'Vắng lặng']),
  fact(doc3(DOC_3_E, 'Đàn ong bay đi làm gì?'), 'Tìm mật', 'Đàn ong bay đi tìm mật.', ['Xây tổ', 'Hút nước', 'Bắt bướm']),
  fact(doc3(DOC_3_E, 'Bà nói mùa xuân là gì?'), 'Món quà đẹp nhất của đất trời', 'Bà bảo mùa xuân là món quà đẹp nhất của đất trời.', ['Mùa lạnh nhất', 'Mùa thu hoạch', 'Mùa mưa nhiều']),
  fact(doc3(DOC_3_E, 'Đàn bướm làm gì bên hoa cúc?'), 'Rập rờn bay lượn', 'Đàn bướm rập rờn bên hoa cúc.', ['Đậu im không động', 'Bay đi tránh nắng', 'Hút nước trên lá']),
];

const DOC_3_MULTI = [
  multiFact(doc3(DOC_3_A, 'Chọn các chi tiết đúng về bác nông dân.'), ['Ra đồng từ sáng sớm', 'Nghỉ trưa dưới gốc đa'], ['Đi cày lúc buổi trưa', 'Ngủ trong nhà cả ngày'], 'Bác ra đồng sáng sớm và nghỉ trưa dưới gốc đa.'),
  multiFact(doc3(DOC_3_B, 'Chọn các chi tiết đúng về cây bàng.'), ['Đứng giữa sân trường', 'Tán lá xòe rộng mùa hè'], ['Mọc bên bờ biển', 'Không có lá'], 'Cây bàng đứng giữa sân trường, mùa hè xòe tán rộng.'),
  multiFact(doc3(DOC_3_C, 'Chọn các chi tiết đúng trong đoạn.'), ['Chợ rất đông vui', 'Hà vui vì được san sẻ việc nhà'], ['Hà đi chợ một mình', 'Mẹ chỉ mua quần áo'], 'Chợ đông vui, Hà giúp mẹ và thấy vui.'),
  multiFact(doc3(DOC_3_D, 'Chọn các chi tiết đúng về đêm rằm.'), ['Trăng sáng vằng vặc', 'Bọn trẻ múa lân, hát'], ['Trời mưa to', 'Bọn trẻ ngủ sớm'], 'Trăng sáng và bọn trẻ múa lân, hát.'),
];

const DOC_3_TF = [
  tf(doc3(DOC_3_A, 'Bác nông dân nghỉ trưa dưới gốc đa.'), true, 'Bác nghỉ dưới gốc đa và ăn cơm nắm.'),
  tf(doc3(DOC_3_B, 'Cây bàng đứng giữa sân trường.'), true, 'Câu đầu đoạn văn cho biết điều đó.'),
  tf(doc3(DOC_3_C, 'Chợ hôm đó vắng vẻ, yên tĩnh.'), false, 'Chợ đông vui, tiếng rao hàng vang khắp nơi.'),
  tf(doc3(DOC_3_D, 'Tiếng trống vang xa trong đêm rằm.'), true, 'Bọn trẻ múa lân, tiếng trống vang xa.'),
];

const DOC_3_FILL = [
  fill(doc3(DOC_3_A, 'Điền từ còn thiếu: “Sau mỗi đường cày, đất ___ như được vỗ về.”'), ['tơi xốp'], 'Đất được cày trở nên tơi xốp.'),
  fill(doc3(DOC_3_B, 'Điền từ còn thiếu: “Tiếng cười của bạn bè làm khu vườn thêm ___.”'), ['rộn ràng'], 'Tiếng cười làm khu vườn rộn ràng.'),
  fill(doc3(DOC_3_C, 'Điền từ còn thiếu: “Hà giúp mẹ ___ giỏ.”'), ['xách'], 'Hà xách giỏ giúp mẹ.'),
  fill(doc3(DOC_3_D, 'Điền từ còn thiếu: “Ông trăng như cũng ___ nhìn xuống.”'), ['mỉm cười'], 'Trăng được nhân hóa như đang mỉm cười.'),
  fill(doc3(DOC_3_E, 'Điền từ còn thiếu: “Những chồi non mơn mởn ___ mình.”'), ['vươn'], 'Chồi non vươn mình đón xuân.'),
];

const docHieu3 = {
  single(k) { return DOC_3_SINGLE[k]; },
  multi(k) { return DOC_3_MULTI[k]; },
  tf(k) { return DOC_3_TF[k]; },
  fill(k) { return DOC_3_FILL[k]; },
};

// ===== Dấu câu =====
const DAU_CAU_3_SINGLE = [
  fact('Dấu phẩy trong câu “Sáng sớm, bà ra vườn tưới rau.” ngăn cách bộ phận nào?', 'Trạng ngữ với phần còn lại', '“Sáng sớm” là trạng ngữ, được ngăn cách bằng dấu phẩy.', ['Chủ ngữ với vị ngữ', 'Hai vế câu', 'Lời nói của nhân vật']),
  fact('Câu nào cần dấu hai chấm trước lời nói của nhân vật?', 'Mẹ bảo: “Con nhớ mang áo mưa.”', 'Dấu hai chấm báo hiệu lời nói trực tiếp.', ['Mẹ bảo con mang áo mưa.', 'Mẹ bảo con nhớ mang áo mưa?', 'Mẹ bảo, con nhớ mang áo mưa.']),
  fact('Dấu ngoặc kép thường dùng để làm gì?', 'Đánh dấu lời nói trực tiếp', 'Ngoặc kép bao quanh lời nói nguyên văn.', ['Kết thúc câu', 'Ngăn cách các từ', 'Bộc lộ cảm xúc']),
  fact('Trong câu “Hà Nội, Huế, Đà Nẵng là ba thành phố lớn.”, dấu phẩy có tác dụng gì?', 'Ngăn cách các tên riêng cùng loại', 'Dấu phẩy tách các thành phố được liệt kê.', ['Kết thúc câu', 'Báo hiệu lời nói', 'Thể hiện câu hỏi']),
  fact('Câu nào dùng dấu phẩy đúng?', 'Trong vườn, hoa hồng, hoa cúc đua nhau nở.', 'Dấu phẩy sau trạng ngữ và giữa các sự vật cùng loại.', ['Trong vườn hoa hồng, hoa cúc đua nhau nở.', 'Trong vườn hoa hồng hoa cúc, đua nhau nở.', 'Trong, vườn hoa hồng hoa cúc đua nhau nở.']),
  fact('Dấu gạch ngang trong đoạn hội thoại dùng để làm gì?', 'Đánh dấu lời nói của nhân vật', 'Gạch ngang đứng đầu lời nói trong hội thoại.', ['Kết thúc đoạn văn', 'Nối các từ', 'Thay dấu chấm']),
  fact('Cuối câu “Bạn đã làm bài tập chưa” cần dấu gì?', 'Dấu chấm hỏi', 'Đây là câu hỏi.', ['Dấu chấm', 'Dấu chấm than', 'Dấu hai chấm']),
  fact('Câu nào là câu khiến?', 'Con hãy đóng cửa lại!', 'Câu khiến yêu cầu, đề nghị người khác làm việc.', ['Con đóng cửa rồi.', 'Con có đóng cửa không?', 'Cửa đã đóng.']),
  fact('Dấu chấm than dùng ở cuối câu nào?', 'Câu cảm và câu khiến', 'Dấu chấm than thể hiện cảm xúc hoặc yêu cầu.', ['Câu hỏi', 'Câu kể', 'Câu giới thiệu']),
  fact('Trong câu “Ôi, bông hoa đẹp quá!”, dấu phẩy ngăn cách bộ phận nào?', 'Từ cảm thán với phần còn lại', '“Ôi” là từ cảm thán, được ngăn cách bằng dấu phẩy.', ['Chủ ngữ với vị ngữ', 'Hai câu', 'Lời nói của nhân vật']),
  fact('Câu nào đặt dấu hai chấm đúng?', 'Thầy giáo nói: “Các em hãy im lặng.”', 'Dấu hai chấm đứng trước lời nói trực tiếp.', ['Thầy giáo: nói các em hãy im lặng.', 'Thầy giáo nói các em: hãy im lặng.', 'Thầy giáo nói “Các em hãy im lặng”:']),
  fact('Dấu ngoặc kép trong câu “Bạn Lan được gọi là “cây văn nghệ” của lớp” dùng để làm gì?', 'Đánh dấu từ ngữ được dùng với ý đặc biệt', 'Cụm từ trong ngoặc kép mang nghĩa đặc biệt.', ['Kết thúc câu', 'Ngăn cách trạng ngữ', 'Báo hiệu câu hỏi']),
];

const DAU_CAU_3_MULTI = [
  multiFact('Chọn tất cả các câu dùng dấu phẩy đúng.', ['Chiều nay, chúng em đi thăm bà.', 'Em thích đọc sách, vẽ tranh và hát.'], ['Chiều nay chúng em, đi thăm bà.', 'Em thích, đọc sách vẽ tranh và hát.'], 'Dấu phẩy đặt sau trạng ngữ và giữa các từ cùng loại.'),
  multiFact('Chọn tất cả các dấu câu dùng để kết thúc câu.', ['Dấu chấm', 'Dấu chấm hỏi'], ['Dấu phẩy', 'Dấu hai chấm'], 'Dấu chấm và dấu chấm hỏi đứng cuối câu.'),
  multiFact('Chọn tất cả các câu cần dùng dấu hai chấm.', ['Cô giáo nhắc: “Các em nhớ mang vở.”', 'Bà bảo: “Cháu ăn cơm đi.”'], ['Cô giáo nhắc các em mang vở.', 'Bà bảo cháu ăn cơm.'], 'Hai câu đầu có lời nói trực tiếp sau dấu hai chấm.'),
  multiFact('Chọn tất cả các câu dùng dấu ngoặc kép đúng.', ['Bố gọi em là “cún con”.', 'Bài thơ “Quạt cho bà ngủ” rất hay.'], ['Bố gọi em là “cún con.', 'Bài thơ “Quạt cho bà ngủ rất hay.”'], 'Ngoặc kép phải có đủ dấu mở và dấu đóng.'),
];

const DAU_CAU_3_TF = [
  tf('Dấu phẩy dùng để ngăn cách các bộ phận cùng chức vụ trong câu.', true, 'Dấu phẩy giúp câu rõ nghĩa.'),
  tf('Dấu hai chấm dùng để kết thúc câu hỏi.', false, 'Câu hỏi kết thúc bằng dấu chấm hỏi.'),
  tf('Dấu ngoặc kép dùng để đánh dấu lời nói trực tiếp của nhân vật.', true, 'Ngoặc kép giữ nguyên lời nói.'),
  tf('Cuối câu khiến ta dùng dấu chấm hỏi.', false, 'Câu khiến thường dùng dấu chấm than hoặc dấu chấm.'),
];

const DAU_CAU_3_FILL = [
  fill('Điền dấu câu thích hợp: “Sáng sớm ___ ông em ra vườn tập thể dục.”', [',', 'dấu phẩy', 'Dấu phẩy'], 'Dấu phẩy ngăn cách trạng ngữ.'),
  fill('Điền dấu câu thích hợp: “Mẹ dặn ___ “Con nhớ mang áo mưa.””', [':', 'dấu hai chấm', 'Dấu hai chấm'], 'Dấu hai chấm báo hiệu lời nói trực tiếp.'),
  fill('Điền dấu câu thích hợp cuối câu: “Các em hãy giữ trật tự ___”', ['!', 'dấu chấm than', 'Dấu chấm than'], 'Đây là câu khiến.'),
  fill('Điền dấu câu thích hợp cuối câu: “Bạn có biết bài thơ này không ___”', ['?', 'dấu chấm hỏi', 'Dấu chấm hỏi'], 'Đây là câu hỏi.'),
  fill('Điền dấu câu thích hợp: “Trong vườn ___ hoa hồng nở rộ.”', [',', 'dấu phẩy', 'Dấu phẩy'], 'Dấu phẩy ngăn cách trạng ngữ.'),
];

const dauCau3 = {
  single(k) { return DAU_CAU_3_SINGLE[k]; },
  multi(k) { return DAU_CAU_3_MULTI[k]; },
  tf(k) { return DAU_CAU_3_TF[k]; },
  fill(k) { return DAU_CAU_3_FILL[k]; },
};

export const VIETNAMESE_GRADE_3 = {
  'tieng-viet-3-tu-chi-dac-diem': tuChiDacDiem,
  'tieng-viet-3-so-sanh': soSanh,
  'tieng-viet-3-nhan-hoa': nhanHoa,
  'tieng-viet-3-cau-ai-lam-gi': cauAiLamGi,
  'tieng-viet-3-chinh-ta': chinhTa3,
  'tieng-viet-3-doc-hieu': docHieu3,
  'tieng-viet-3-dau-cau': dauCau3,
};
