import { fact, fill, multiFact, tf } from './math-utils.js';

// ===== Từ đơn và từ ghép =====
const TU_SINGLE = [
  fact('Từ “học sinh” thuộc loại từ nào?', 'Từ ghép', '“Học sinh” gồm hai tiếng có quan hệ về nghĩa.', ['Từ đơn', 'Từ láy', 'Thành ngữ']),
  fact('Từ “sách” thuộc loại từ nào?', 'Từ đơn', '“Sách” chỉ có một tiếng.', ['Từ ghép', 'Từ láy', 'Từ phức']),
  fact('Từ nào là từ ghép?', 'bàn ghế', '“Bàn ghế” gồm hai tiếng có nghĩa ghép lại.', ['bàn', 'ghế', 'cái']),
  fact('Từ nào là từ đơn?', 'nhà', '“Nhà” chỉ có một tiếng.', ['nhà cửa', 'nhà lá', 'nhà tranh']),
  fact('Từ “xe đạp” được cấu tạo từ mấy tiếng?', '2 tiếng', '“Xe” và “đạp” là hai tiếng.', ['1 tiếng', '3 tiếng', '4 tiếng']),
  fact('Từ nào dưới đây là từ ghép phân loại?', 'hoa hồng', '“Hồng” phân loại hoa hồng trong các loại hoa.', ['hoa lá', 'quần áo', 'sách vở']),
  fact('Từ nào là từ ghép tổng hợp?', 'quần áo', '“Quần áo” chỉ chung đồ mặc.', ['quần bò', 'áo len', 'áo dài']),
  fact('Từ “bàn” là từ đơn hay từ ghép?', 'Từ đơn', '“Bàn” chỉ có một tiếng.', ['Từ ghép', 'Từ láy', 'Từ phức']),
  fact('Từ nào không phải từ ghép?', 'xinh xắn', '“Xinh xắn” là từ láy.', ['bánh kẹo', 'nhà cửa', 'cây cối']),
  fact('Từ ghép nào chỉ người?', 'công nhân', '“Công nhân” chỉ người lao động.', ['công viên', 'công cụ', 'công thức']),
  fact('Từ “mưa” kết hợp với tiếng nào để tạo thành từ ghép?', 'rào', '“Mưa rào” là từ ghép chỉ trận mưa lớn.', ['to', 'rất', 'đang']),
  fact('Từ nào là từ ghép có nghĩa tổng hợp?', 'ăn uống', '“Ăn uống” chỉ chung việc ăn và uống.', ['ăn cơm', 'uống nước', 'ăn quà']),
];

const TU_MULTI = [
  multiFact('Chọn tất cả các từ ghép.', ['nhà cửa', 'bánh kẹo'], ['xinh xinh', 'lung linh'], '“Nhà cửa”, “bánh kẹo” là từ ghép; hai từ còn lại là từ láy.'),
  multiFact('Chọn tất cả các từ đơn.', ['mưa', 'nắng'], ['mưa gió', 'nắng nóng'], '“Mưa”, “nắng” chỉ có một tiếng.'),
  multiFact('Chọn tất cả các từ ghép tổng hợp.', ['sách vở', 'quần áo'], ['sách toán', 'quần bò'], '“Sách vở”, “quần áo” chỉ chung; hai từ còn lại chỉ loại cụ thể.'),
  multiFact('Chọn tất cả các từ ghép phân loại.', ['xe máy', 'cá chép'], ['xe cộ', 'cá tôm'], '“Xe máy”, “cá chép” chỉ loại cụ thể.'),
];

const TU_TF = [
  tf('Từ đơn là từ chỉ có một tiếng.', true, 'Ví dụ: nhà, cây, sách.'),
  tf('Từ ghép được tạo bằng cách ghép các tiếng có quan hệ về nghĩa.', true, 'Các tiếng trong từ ghép cùng góp nghĩa.'),
  tf('Từ “xinh xắn” là từ ghép.', false, '“Xinh xắn” là từ láy.'),
  tf('Tất cả các từ có hai tiếng đều là từ ghép.', false, 'Từ hai tiếng có thể là từ ghép hoặc từ láy.'),
];

const TU_FILL = [
  fill('Từ “bàn ghế” gồm mấy tiếng?', ['2', 'hai', '2 tiếng', 'hai tiếng'], '“Bàn” và “ghế” là hai tiếng.'),
  fill('Điền tiếng còn thiếu để tạo từ ghép: “bánh ___” (loại bánh ngọt).', ['kẹo', 'ngọt', 'quy'], 'Có thể tạo “bánh kẹo”, “bánh ngọt”, “bánh quy”.'),
  fill('Từ “nhà cửa” là từ đơn hay từ ghép?', ['từ ghép', 'ghép'], '“Nhà cửa” gồm hai tiếng có quan hệ nghĩa.'),
  fill('Điền tiếng để tạo từ ghép phân loại: “cá ___” (loài cá nước ngọt).', ['chép', 'trê', 'rô', 'mè'], 'Có thể điền “chép”, “trê”, “rô”, “mè”.'),
  fill('Từ “sách” là từ đơn hay từ ghép?', ['từ đơn', 'đơn'], '“Sách” chỉ có một tiếng.'),
];

const tuDonTuGhep = {
  single(k) { return TU_SINGLE[k]; },
  multi(k) { return TU_MULTI[k]; },
  tf(k) { return TU_TF[k]; },
  fill(k) { return TU_FILL[k]; },
};

// ===== Danh từ, động từ, tính từ =====
const TU_LOAI_SINGLE = [
  fact('Từ “học sinh” là danh từ, động từ hay tính từ?', 'Danh từ', '“Học sinh” chỉ người.', ['Động từ', 'Tính từ', 'Đại từ']),
  fact('Từ “chạy” là loại từ nào?', 'Động từ', '“Chạy” chỉ hoạt động.', ['Danh từ', 'Tính từ', 'Số từ']),
  fact('Từ “xinh đẹp” là loại từ nào?', 'Tính từ', '“Xinh đẹp” chỉ đặc điểm.', ['Danh từ', 'Động từ', 'Quan hệ từ']),
  fact('Trong câu “Bé Lan rất chăm chỉ”, từ nào là tính từ?', 'chăm chỉ', '“Chăm chỉ” chỉ đặc điểm của Bé Lan.', ['Bé Lan', 'rất', 'Bé']),
  fact('Trong câu “Đàn chim hót líu lo trên cành”, từ nào là động từ?', 'hót', '“Hót” chỉ hoạt động của chim.', ['Đàn chim', 'cành', 'líu lo']),
  fact('Từ nào là danh từ chỉ người?', 'bác sĩ', '“Bác sĩ” chỉ người làm nghề chữa bệnh.', ['bệnh viện', 'khám bệnh', 'khỏe mạnh']),
  fact('Từ nào là tính từ chỉ màu sắc?', 'xanh biếc', '“Xanh biếc” chỉ màu xanh đậm.', ['bầu trời', 'nhuộm', 'cao']),
  fact('Từ nào là động từ chỉ hoạt động của mắt?', 'nhìn', '“Nhìn” là hoạt động của mắt.', ['mắt', 'sáng', 'long lanh']),
  fact('Trong câu “Cánh đồng lúa chín vàng”, danh từ là từ nào?', 'Cánh đồng', '“Cánh đồng” chỉ sự vật.', ['chín', 'vàng', 'đã']),
  fact('Từ “dũng cảm” là loại từ nào?', 'Tính từ', '“Dũng cảm” chỉ phẩm chất.', ['Danh từ', 'Động từ', 'Đại từ']),
  fact('Từ nào là danh từ chỉ đồ vật?', 'quạt điện', '“Quạt điện” chỉ đồ vật.', ['quay', 'mát', 'chạy']),
  fact('Trong câu “Mẹ nhẹ nhàng vỗ về em”, từ nào là động từ?', 'vỗ về', '“Vỗ về” chỉ hành động của mẹ.', ['Mẹ', 'nhẹ nhàng', 'em']),
];

const TU_LOAI_MULTI = [
  multiFact('Chọn tất cả các danh từ.', ['học sinh', 'bầu trời'], ['chạy', 'xinh'], '“Học sinh”, “bầu trời” chỉ sự vật.'),
  multiFact('Chọn tất cả các động từ.', ['chạy', 'hát'], ['bài hát', 'nhanh'], '“Chạy”, “hát” chỉ hoạt động.'),
  multiFact('Chọn tất cả các tính từ.', ['xanh', 'dịu dàng'], ['bông hoa', 'đi'], '“Xanh”, “dịu dàng” chỉ đặc điểm.'),
  multiFact('Chọn tất cả các danh từ chỉ người.', ['giáo viên', 'bộ đội'], ['trường học', 'súng'], '“Giáo viên”, “bộ đội” chỉ người.'),
];

const TU_LOAI_TF = [
  tf('Danh từ là từ chỉ sự vật, hiện tượng.', true, 'Ví dụ: cây, nhà, mưa.'),
  tf('“Chạy” là tính từ.', false, '“Chạy” là động từ.'),
  tf('“Xinh xắn” là tính từ.', true, '“Xinh xắn” chỉ đặc điểm.'),
  tf('“Học sinh” là động từ.', false, '“Học sinh” là danh từ.'),
];

const TU_LOAI_FILL = [
  fill('Tìm tính từ trong câu: “Bông hoa rất thơm.”', ['thơm'], '“Thơm” chỉ đặc điểm mùi.'),
  fill('Tìm động từ trong câu: “Bé quét nhà giúp mẹ.”', ['quét'], '“Quét” chỉ hoạt động.'),
  fill('Tìm danh từ chỉ con vật trong câu: “Con mèo nằm trên mái nhà.”', ['mèo', 'con mèo'], '“Mèo” chỉ con vật.'),
  fill('Điền tính từ tả màu của bầu trời: “Bầu trời ___.”', ['xanh', 'trong xanh', 'xanh biếc'], 'Bầu trời thường được tả màu xanh.'),
  fill('Điền động từ: “Chú chim ___ trên cành.”', ['hót', 'đậu', 'nhảy'], 'Chim hót, đậu hoặc nhảy trên cành.'),
];

const danhTuDongTuTinhTu = {
  single(k) { return TU_LOAI_SINGLE[k]; },
  multi(k) { return TU_LOAI_MULTI[k]; },
  tf(k) { return TU_LOAI_TF[k]; },
  fill(k) { return TU_LOAI_FILL[k]; },
};

// ===== Câu kiểu Ai thế nào? =====
const AI_THE_NAO_SINGLE = [
  fact('Câu nào thuộc kiểu “Ai thế nào?”', 'Bầu trời hôm nay rất trong xanh.', 'Câu nêu đặc điểm của bầu trời.', ['Em ngắm bầu trời.', 'Bầu trời là tấm gương lớn.', 'Mây trôi trên bầu trời.']),
  fact('Trong câu “Cây bàng rất cao lớn”, bộ phận trả lời câu hỏi “Ai (cái gì)?” là gì?', 'Cây bàng', '“Cây bàng” là sự vật được nói tới.', ['rất cao lớn', 'cao lớn', 'rất']),
  fact('Trong câu “Cô giáo em rất dịu dàng”, bộ phận trả lời câu hỏi “Thế nào?” là gì?', 'rất dịu dàng', 'Phần này nêu đặc điểm của cô giáo.', ['Cô giáo em', 'Cô giáo', 'em']),
  fact('Câu nào có bộ phận “Thế nào?” là “rất chăm chỉ”?', 'Bạn Nam rất chăm chỉ.', '“Rất chăm chỉ” nêu đặc điểm của Nam.', ['Bạn Nam học bài.', 'Bạn Nam là lớp trưởng.', 'Bạn Nam đi học.']),
  fact('Câu “Nước hồ trong veo như tấm gương” thuộc kiểu câu nào?', 'Ai thế nào?', 'Câu nêu đặc điểm của nước hồ.', ['Ai làm gì?', 'Ai là gì?', 'Câu khiến']),
  fact('Câu nào tả đặc điểm của một người?', 'Ông em rất hiền từ.', '“Rất hiền từ” tả đặc điểm của ông.', ['Ông em trồng cây.', 'Ông em là bác sĩ.', 'Ông em đi bộ.']),
  fact('Trong câu “Những bông hoa hồng tỏa hương thơm ngát”, từ ngữ nào nêu đặc điểm?', 'thơm ngát', '“Thơm ngát” tả mùi hương.', ['Những bông hoa hồng', 'tỏa hương', 'hương']),
  fact('Câu nào không thuộc kiểu “Ai thế nào?”', 'Mẹ em nấu cơm.', 'Đây là câu kiểu “Ai làm gì?”.', ['Mẹ em rất khéo tay.', 'Mẹ em hiền.', 'Mẹ em rất chu đáo.']),
  fact('Đặt câu hỏi cho bộ phận “rất nhanh nhẹn” trong câu “Bạn Hà rất nhanh nhẹn”.', 'Bạn Hà thế nào?', 'Hỏi về đặc điểm của bạn Hà.', ['Bạn Hà là gì?', 'Bạn Hà làm gì?', 'Ai rất nhanh nhẹn?']),
  fact('Câu nào có cấu trúc “Ai thế nào?” và tả đồ vật?', 'Chiếc cặp của em rất chắc chắn.', 'Câu nêu đặc điểm của chiếc cặp.', ['Em đeo chiếc cặp mới.', 'Chiếc cặp là đồ dùng học tập.', 'Em mua chiếc cặp.']),
  fact('Từ nào thường đứng trước tính từ trong câu “Ai thế nào?” để chỉ mức độ?', 'rất', '“Rất” chỉ mức độ cao.', ['và', 'của', 'để']),
  fact('Câu “Đôi mắt bé đen láy” trả lời cho câu hỏi nào?', 'Ai (cái gì) thế nào?', 'Câu nêu đặc điểm của đôi mắt.', ['Ai làm gì?', 'Ai là gì?', 'Khi nào?']),
];

const AI_THE_NAO_MULTI = [
  multiFact('Chọn tất cả các câu thuộc kiểu “Ai thế nào?”', ['Bông hoa rất thơm.', 'Chú chó rất trung thành.'], ['Bông hoa nở.', 'Chú chó sủa.'], 'Hai câu đầu nêu đặc điểm của sự vật.'),
  multiFact('Chọn tất cả các từ chỉ đặc điểm có thể điền vào “Bầu trời ___.”', ['xanh', 'cao'], ['chạy', 'hót'], '“Xanh”, “cao” tả đặc điểm bầu trời.'),
  multiFact('Chọn tất cả các câu tả đặc điểm của đồ vật.', ['Cái bàn này rất chắc.', 'Chiếc quạt này rất êm.'], ['Cái bàn được kê sát tường.', 'Chiếc quạt quay đều.'], 'Hai câu đầu nêu đặc điểm; hai câu sau nêu hoạt động, vị trí.'),
  multiFact('Chọn các bộ phận trả lời câu hỏi “Thế nào?” trong câu “Nước hồ trong veo và rất mát”.', ['trong veo', 'rất mát'], ['Nước hồ', 'nước'], '“Trong veo”, “rất mát” nêu đặc điểm của nước hồ.'),
];

const AI_THE_NAO_TF = [
  tf('Câu “Lan rất chăm chỉ.” thuộc kiểu “Ai thế nào?”.', true, 'Câu nêu đặc điểm của Lan.'),
  tf('Trong câu “Cây bàng cao lớn.”, “Cây bàng” trả lời câu hỏi “Thế nào?”.', false, '“Cây bàng” trả lời câu hỏi “Ai (cái gì)?”.'),
  tf('Câu “Mẹ em là giáo viên.” thuộc kiểu “Ai thế nào?”.', false, 'Câu này thuộc kiểu “Ai là gì?”.'),
  tf('Câu “Trời mùa thu rất mát mẻ.” có bộ phận “Thế nào?” là “rất mát mẻ”.', true, '“Rất mát mẻ” nêu đặc điểm của trời.'),
];

const AI_THE_NAO_FILL = [
  fill('Điền từ ngữ chỉ đặc điểm: “Em bé có làn da ___.”', ['trắng hồng', 'mịn màng', 'trắng trẻo'], 'Làn da em bé thường mịn màng, trắng hồng.'),
  fill('Đặt câu hỏi cho bộ phận “rất hiền lành”: “Bà em rất hiền lành.”', ['Bà em thế nào?', 'Bà thế nào?'], 'Hỏi về đặc điểm của bà.'),
  fill('Điền từ còn thiếu: “Đôi mắt của bé ___ như hạt nhãn.”', ['đen', 'đen láy', 'tròn xoe'], 'Đôi mắt đen láy được ví với hạt nhãn.'),
  fill('Điền từ chỉ mức độ: “Cánh đồng lúa ___ vàng.”', ['rất', 'vô cùng', 'thật'], '“Rất”, “vô cùng”, “thật” chỉ mức độ.'),
  fill('Điền tính từ tả bề mặt: “Con đường làng rất ___.”', ['gập ghềnh', 'gồ ghề', 'nhẵn'], 'Con đường có thể gập ghềnh, gồ ghề hoặc nhẵn.'),
];

const cauAiTheNao = {
  single(k) { return AI_THE_NAO_SINGLE[k]; },
  multi(k) { return AI_THE_NAO_MULTI[k]; },
  tf(k) { return AI_THE_NAO_TF[k]; },
  fill(k) { return AI_THE_NAO_FILL[k]; },
};

// ===== Chính tả =====
const CHINH_TA_4_SINGLE = [
  fact('Từ nào viết đúng, chỉ người làm nghề chữa bệnh?', 'bác sĩ', '“Bác sĩ” viết với s và dấu ngã ở tiếng “sĩ”.', ['bác xĩ', 'bát sĩ', 'bác sỉ']),
  fact('Từ nào viết đúng, chỉ nơi tàu thuyền neo đậu?', 'bến cảng', '“Cảng” viết với c và dấu hỏi.', ['bến cãng', 'bếng cảng', 'bến cản']),
  fact('Từ nào viết đúng, chỉ đức tính không tham lam?', 'trung thực', '“Trung thực” viết với tr.', ['chung thực', 'trung thật', 'chung thật']),
  fact('Từ nào viết đúng, chỉ hoạt động làm sạch?', 'lau chùi', '“Chùi” viết với ch.', ['lau trùi', 'lau chui', 'lau trùy']),
  fact('Từ nào viết đúng, chỉ đồ dùng để đo độ dài?', 'thước kẻ', '“Thước kẻ” viết với th và k.', ['thước cẻ', 'thướt kẻ', 'thướt cẻ']),
  fact('Từ nào viết đúng, chỉ hiện tượng thời tiết có sấm chớp?', 'sấm chớp', '“Sấm” viết với s, “chớp” viết với ch.', ['xấm chớp', 'sấm trớp', 'xấm trớp']),
  fact('Từ nào viết đúng, chỉ loài hoa mọc dưới ao, thường màu hồng?', 'hoa sen', '“Sen” viết với s.', ['hoa xen', 'hoa sem', 'hoa xem']),
  fact('Từ nào viết đúng, chỉ người học ở trường đại học?', 'sinh viên', '“Sinh viên” viết với s ở tiếng đầu.', ['xinh viên', 'sinh viêng', 'xinh viêng']),
  fact('Từ nào viết đúng, chỉ việc trao đổi thư từ qua mạng?', 'thư điện tử', '“Điện tử” viết với đ và tử.', ['thư điện tữ', 'thư điệng tử', 'thư điệng tữ']),
  fact('Từ nào viết đúng, chỉ con vật có vòi dài?', 'voi', '“Voi” viết không có dấu.', ['vòi', 'vôi', 'vội']),
  fact('Từ nào viết đúng, chỉ buổi chiều muộn?', 'chiều tà', '“Chiều tà” viết với ch và tà.', ['chiều tả', 'triều tà', 'triều tả']),
  fact('Từ nào viết đúng, chỉ dòng nước nhỏ chảy trong vườn?', 'dòng suối', '“Suối” viết với s và dấu sắc.', ['giòng suối', 'dòng suôi', 'giòng suôi']),
];

const CHINH_TA_4_MULTI = [
  multiFact('Chọn tất cả các từ viết đúng chính tả (tr/ch).', ['trung thành', 'chăm chỉ'], ['chung thành', 'trăm chỉ'], '“Trung thành” viết với tr, “chăm chỉ” viết với ch.'),
  multiFact('Chọn tất cả các từ viết đúng chính tả (s/x).', ['sản xuất', 'xinh xắn'], ['xản xuất', 'sinh sắn'], '“Sản xuất” viết với s, “xinh xắn” viết với x.'),
  multiFact('Chọn tất cả các từ viết đúng chính tả (d/gi/r).', ['rực rỡ', 'giữ gìn'], ['dực dỡ', 'dữ gìn'], '“Rực rỡ” viết với r, “giữ gìn” viết với gi.'),
  multiFact('Chọn tất cả các từ viết đúng chính tả (hỏi/ngã).', ['nghỉ ngơi', 'sửa chữa'], ['nghĩ ngơi', 'sữa chữa'], '“Nghỉ ngơi” viết dấu hỏi, “sửa chữa” viết s.'),
];

const CHINH_TA_4_TF = [
  tf('Từ “trung thực” được viết với “tr”.', true, '“Trung thực” viết tr ở tiếng đầu.'),
  tf('“Sản xuất” là cách viết đúng chính tả.', true, 'Viết s ở tiếng “sản”, x ở tiếng “xuất”.'),
  tf('Từ “giữ gìn” được viết với “d”.', false, '“Giữ gìn” viết với gi.'),
  tf('“Nghĩ ngơi” là cách viết đúng của từ chỉ việc thư giãn.', false, 'Đúng là “nghỉ ngơi”.'),
];

const CHINH_TA_4_FILL = [
  fill('Viết đúng từ còn thiếu: “Bác nông dân ___ lúa.”', ['trồng', 'Trồng'], '“Trồng lúa” viết với tr.'),
  fill('Viết đúng từ còn thiếu: “Chúng em ___ hàng vào lớp.”', ['xếp', 'Xếp'], '“Xếp hàng” viết với x.'),
  fill('Điền d, gi hoặc r vào chỗ trống: “___ặng tre bên bờ ao xanh mát.”', ['r', 'rặng'], '“Rặng tre” viết với r.'),
  fill('Điền từ còn thiếu: “Biết ___ lỗi là điều tốt.”', ['nhận'], '“Nhận lỗi” viết dấu ngã.'),
  fill('Viết hoa đúng tên riêng: “thành phố hồ chí minh”.', ['Thành phố Hồ Chí Minh', 'Hồ Chí Minh'], 'Tên riêng phải viết hoa đúng quy định.'),
];

const chinhTa4 = {
  single(k) { return CHINH_TA_4_SINGLE[k]; },
  multi(k) { return CHINH_TA_4_MULTI[k]; },
  tf(k) { return CHINH_TA_4_TF[k]; },
  fill(k) { return CHINH_TA_4_FILL[k]; },
};

// ===== Đọc hiểu =====
const DOC_4_A = 'Rừng Cúc Phương được coi là một bảo tàng thiên nhiên giữa lòng đất nước. Nơi đây có hàng nghìn loài cây, nhiều loài chim quý và những hang động đá vôi kỳ ảo. Du khách đến đây không chỉ để ngắm cảnh mà còn học được nhiều điều về thiên nhiên. Vì vậy, mỗi người cần giữ gìn vệ sinh và không hái hoa, bẻ cành.';
const DOC_4_B = 'Chiếc áo của Hà đã sờn vai. Mẹ định mua áo mới nhưng Hà lắc đầu: “Mẹ vá lại giúp con, áo vẫn còn mặc tốt.” Mẹ nhìn con gái nhỏ, thấy lòng ấm áp. Tối đó, dưới ngọn đèn, mẹ cẩn thận từng đường kim mũi chỉ.';
const DOC_4_C = 'Sông Hồng mang phù sa đỏ au về bồi đắp cho đồng bằng Bắc Bộ. Nhờ dòng phù sa ấy, ruộng đồng thêm màu mỡ, cây lúa thêm nặng hạt. Người dân ven sông đã gắn bó với con sông từ bao đời. Con sông như người mẹ hiền nuôi lớn những làng quê.';
const DOC_4_D = 'Trong giờ kiểm tra, Nam loay hoay mãi vì quên bút. Thấy vậy, Hùng lặng lẽ đẩy hộp bút sang. Nam mỉm cười, cầm lấy chiếc bút chì. Kết quả, cả hai đều làm bài tốt. Cô giáo khen cả lớp biết giúp nhau trong học tập.';
const DOC_4_E = 'Cây gạo già đứng bên bờ sông. Mùa xuân, hoa gạo đỏ rực như những đốm lửa. Chim chóc kéo về ríu rít. Đến mùa hạ, quả gạo chín, từng chùm bông trắng bay theo gió. Người làng bảo cây gạo là chiếc đồng hồ của đất trời.';

function doc4(passage, question) {
  return `Đọc đoạn văn: “${passage}” ${question}`;
}

const DOC_4_SINGLE = [
  fact(doc4(DOC_4_A, 'Rừng Cúc Phương được ví như gì?'), 'Bảo tàng thiên nhiên', 'Đoạn văn gọi Cúc Phương là bảo tàng thiên nhiên.', ['Công viên giải trí', 'Khu chợ lớn', 'Trường học']),
  fact(doc4(DOC_4_A, 'Vì sao du khách đến Cúc Phương?'), 'Để ngắm cảnh và học về thiên nhiên', 'Du khách đến để ngắm cảnh và học nhiều điều về thiên nhiên.', ['Để câu cá', 'Để mua quà', 'Để leo núi nhân tạo']),
  fact(doc4(DOC_4_B, 'Hà đã làm gì khi mẹ định mua áo mới?'), 'Xin mẹ vá lại áo', 'Hà nói mẹ vá lại vì áo vẫn còn mặc tốt.', ['Đòi mua áo đẹp hơn', 'Vứt áo đi', 'Cho bạn chiếc áo']),
  fact(doc4(DOC_4_B, 'Vì sao mẹ thấy lòng ấm áp?'), 'Vì Hà biết tiết kiệm, thương mẹ', 'Hà không đòi áo mới mà xin mẹ vá lại.', ['Vì Hà được áo mới', 'Vì trời hôm đó ấm', 'Vì áo Hà rất đẹp']),
  fact(doc4(DOC_4_C, 'Sông Hồng mang gì về bồi đắp đồng bằng?'), 'Phù sa', 'Sông Hồng mang phù sa đỏ au bồi đắp đồng bằng.', ['Cát trắng', 'Đá cuội', 'Rong biển']),
  fact(doc4(DOC_4_C, 'Con sông được so sánh với ai?'), 'Người mẹ hiền', 'Con sông như người mẹ hiền nuôi lớn làng quê.', ['Người cha', 'Người bạn', 'Cô giáo']),
  fact(doc4(DOC_4_D, 'Nam loay hoay vì lí do gì?'), 'Quên bút', 'Nam loay hoay vì quên bút trong giờ kiểm tra.', ['Quên vở', 'Không thuộc bài', 'Bị ốm']),
  fact(doc4(DOC_4_D, 'Hùng đã giúp Nam như thế nào?'), 'Đẩy hộp bút sang cho bạn', 'Hùng lặng lẽ đẩy hộp bút sang.', ['Nhắc bài cho bạn', 'Làm bài giúp bạn', 'Cho bạn mượn vở']),
  fact(doc4(DOC_4_E, 'Hoa gạo nở vào mùa nào?'), 'Mùa xuân', 'Đoạn văn nói mùa xuân hoa gạo đỏ rực.', ['Mùa hạ', 'Mùa thu', 'Mùa đông']),
  fact(doc4(DOC_4_E, 'Hoa gạo được so sánh với gì?'), 'Những đốm lửa', 'Hoa gạo đỏ rực như những đốm lửa.', ['Những ngôi sao', 'Những bông tuyết', 'Những chiếc lá']),
  fact(doc4(DOC_4_E, 'Vì sao người làng gọi cây gạo là “chiếc đồng hồ của đất trời”?'), 'Vì cây báo hiệu các mùa', 'Cây gạo thay đổi theo mùa nên như chiếc đồng hồ.', ['Vì cây có quả ăn được', 'Vì cây cao nhất làng', 'Vì cây cho bóng mát']),
  fact(doc4(DOC_4_E, 'Mùa hạ, quả gạo chín tạo ra gì?'), 'Từng chùm bông trắng bay theo gió', 'Quả gạo chín cho từng chùm bông trắng bay theo gió.', ['Những quả đỏ', 'Những cánh hoa vàng', 'Những hạt nhỏ màu đen']),
];

const DOC_4_MULTI = [
  multiFact(doc4(DOC_4_A, 'Chọn các chi tiết đúng về rừng Cúc Phương.'), ['Có nhiều loài cây, chim quý', 'Có hang động đá vôi'], ['Chỉ có một loài cây', 'Không có du khách'], 'Cúc Phương có nhiều loài cây, chim quý và hang động đá vôi.'),
  multiFact(doc4(DOC_4_B, 'Chọn các chi tiết đúng trong đoạn.'), ['Áo của Hà đã sờn vai', 'Mẹ vá áo dưới ngọn đèn'], ['Hà có áo mới', 'Mẹ rất tức giận'], 'Áo Hà sờn vai, mẹ vá áo dưới đèn.'),
  multiFact(doc4(DOC_4_C, 'Chọn các ý đúng về sông Hồng trong đoạn.'), ['Mang phù sa đỏ au', 'Gắn bó với người dân ven sông'], ['Chảy qua sa mạc', 'Không có phù sa'], 'Sông Hồng mang phù sa và gắn bó với người dân.'),
  multiFact(doc4(DOC_4_D, 'Chọn các chi tiết đúng trong đoạn.'), ['Nam quên bút', 'Cả hai làm bài tốt'], ['Nam quên vở', 'Hùng không cho Nam mượn bút'], 'Nam quên bút, Hùng giúp và cả hai làm bài tốt.'),
];

const DOC_4_TF = [
  tf(doc4(DOC_4_A, 'Du khách được phép hái hoa, bẻ cành ở Cúc Phương.'), false, 'Đoạn văn khuyên không hái hoa, bẻ cành.'),
  tf(doc4(DOC_4_B, 'Hà muốn mẹ mua cho mình một chiếc áo mới.'), false, 'Hà xin mẹ vá lại áo cũ.'),
  tf(doc4(DOC_4_C, 'Phù sa làm ruộng đồng thêm màu mỡ.'), true, 'Nhờ phù sa, ruộng đồng màu mỡ, lúa nặng hạt.'),
  tf(doc4(DOC_4_D, 'Cô giáo khen cả lớp biết giúp nhau trong học tập.'), true, 'Cuối đoạn văn cho biết điều đó.'),
];

const DOC_4_FILL = [
  fill(doc4(DOC_4_A, 'Điền từ còn thiếu: “Mỗi người cần giữ gìn ___ và không hái hoa, bẻ cành.”'), ['vệ sinh'], 'Đoạn văn nhắc giữ gìn vệ sinh.'),
  fill(doc4(DOC_4_B, 'Điền từ còn thiếu: “Tối đó, mẹ cẩn thận ___ từng đường kim mũi chỉ.”'), ['vá', 'may'], 'Mẹ vá áo cho Hà.'),
  fill(doc4(DOC_4_C, 'Điền từ còn thiếu: “Con sông như người mẹ hiền ___ lớn những làng quê.”'), ['nuôi'], 'Con sông nuôi lớn những làng quê.'),
  fill(doc4(DOC_4_D, 'Điền từ còn thiếu: “Hùng lặng lẽ ___ hộp bút sang cho Nam.”'), ['đẩy'], 'Hùng đẩy hộp bút sang.'),
  fill(doc4(DOC_4_E, 'Điền từ còn thiếu: “Đến mùa hạ, từng chùm bông trắng ___ theo gió.”'), ['bay'], 'Bông gạo trắng bay theo gió.'),
];

const docHieu4 = {
  single(k) { return DOC_4_SINGLE[k]; },
  multi(k) { return DOC_4_MULTI[k]; },
  tf(k) { return DOC_4_TF[k]; },
  fill(k) { return DOC_4_FILL[k]; },
};

// ===== Thành ngữ, tục ngữ =====
const THANH_NGU_SINGLE = [
  fact('Câu “Có công mài sắt, có ngày nên kim” khuyên ta điều gì?', 'Kiên trì thì sẽ thành công', 'Câu tục ngữ khuyên phải bền bỉ, không nản.', ['Phải làm việc thật nhanh', 'Không cần cố gắng', 'Chỉ nên làm việc dễ']),
  fact('Thành ngữ “đồng cam cộng khổ” nói về điều gì?', 'Cùng chia sẻ vui buồn, khó khăn', '“Đồng cam cộng khổ” là cùng chịu đựng, chia sẻ.', ['Cùng ăn cam', 'Mỗi người một việc', 'Sống xa cách nhau']),
  fact('Câu “Uống nước nhớ nguồn” khuyên ta điều gì?', 'Biết ơn người đi trước', 'Câu tục ngữ nói về lòng biết ơn.', ['Uống nhiều nước', 'Nhớ đường về nhà', 'Giữ nguồn nước sạch']),
  fact('“Lá lành đùm lá rách” nói về truyền thống nào?', 'Tương thân tương ái', 'Câu tục ngữ khuyên người khá giúp người khó.', ['Tôn sư trọng đạo', 'Hiếu học', 'Yêu lao động']),
  fact('Câu “Một nắng hai sương” tả điều gì?', 'Sự vất vả, chịu thương chịu khó', 'Thành ngữ tả nỗi vất vả của người lao động.', ['Thời tiết thay đổi', 'Một ngày có nắng', 'Công việc nhàn hạ']),
  fact('“Nhanh như cắt” thường dùng để tả gì?', 'Rất nhanh', '“Cắt” là loài chim bay rất nhanh.', ['Rất chậm', 'Rất khéo', 'Rất khỏe']),
  fact('Câu “Đi một ngày đàng, học một sàng khôn” khuyên ta điều gì?', 'Đi đây đi đó để mở mang hiểu biết', 'Đi nhiều nơi giúp ta học được nhiều điều.', ['Ở nhà học bài', 'Đi thật nhanh', 'Học nhiều sách vở']),
  fact('Thành ngữ “chậm như rùa” dùng để tả ai?', 'Người làm việc rất chậm', 'Rùa vốn chậm chạp nên được dùng để so sánh.', ['Người chạy rất nhanh', 'Người rất khỏe', 'Người rất khéo']),
  fact('“Ăn quả nhớ kẻ trồng cây” gần nghĩa với câu nào?', 'Uống nước nhớ nguồn', 'Cả hai câu đều nói về lòng biết ơn.', ['Có công mài sắt, có ngày nên kim', 'Lá lành đùm lá rách', 'Đi một ngày đàng, học một sàng khôn']),
  fact('Câu “Tấc đất tấc vàng” nói về điều gì?', 'Đất đai rất quý giá', 'Câu tục ngữ đề cao giá trị của đất.', ['Vàng rất đắt', 'Đất rất rộng', 'Vàng ở trong đất']),
  fact('Thành ngữ “như cá gặp nước” tả tâm trạng nào?', 'Vui vẻ, thoải mái', 'Cá gặp nước thì tung tăng, thích hợp.', ['Buồn bã, lo lắng', 'Sợ hãi', 'Mệt mỏi']),
  fact('Câu “Thương người như thể thương thân” khuyên ta điều gì?', 'Yêu thương người khác như chính mình', 'Câu tục ngữ dạy lòng nhân ái.', ['Chỉ lo cho bản thân', 'Thương mình trước tiên', 'Không cần giúp ai']),
];

const THANH_NGU_MULTI = [
  multiFact('Chọn tất cả các câu tục ngữ nói về lòng biết ơn.', ['Uống nước nhớ nguồn', 'Ăn quả nhớ kẻ trồng cây'], ['Có công mài sắt, có ngày nên kim', 'Đi một ngày đàng, học một sàng khôn'], 'Hai câu đầu nói về lòng biết ơn.'),
  multiFact('Chọn tất cả các thành ngữ chỉ sự chăm chỉ, chịu khó.', ['Một nắng hai sương', 'Thức khuya dậy sớm'], ['Nhàn hạ như tiên', 'Ngủ ngày cày đêm'], '“Một nắng hai sương”, “thức khuya dậy sớm” chỉ sự vất vả, chăm chỉ.'),
  multiFact('Chọn tất cả các câu nói về tình yêu thương con người.', ['Lá lành đùm lá rách', 'Thương người như thể thương thân'], ['Tấc đất tấc vàng', 'Nhanh như cắt'], 'Hai câu đầu nói về tình thương người.'),
  multiFact('Chọn tất cả các thành ngữ so sánh.', ['Nhanh như cắt', 'Chậm như rùa'], ['Một nắng hai sương', 'Uống nước nhớ nguồn'], 'Hai thành ngữ đầu có từ “như” để so sánh.'),
];

const THANH_NGU_TF = [
  tf('“Có công mài sắt, có ngày nên kim” khuyên ta kiên trì.', true, 'Câu tục ngữ đề cao sự bền bỉ.'),
  tf('“Uống nước nhớ nguồn” nói về lòng biết ơn.', true, 'Câu tục ngữ nhắc nhớ người đi trước.'),
  tf('“Nhanh như cắt” dùng để tả người đi rất chậm.', false, '“Nhanh như cắt” tả sự rất nhanh.'),
  tf('“Lá lành đùm lá rách” nói về sự ích kỉ.', false, 'Câu tục ngữ nói về sự tương thân tương ái.'),
];

const THANH_NGU_FILL = [
  fill('Điền từ còn thiếu: “Uống nước nhớ ___.”', ['nguồn'], 'Câu đầy đủ là “Uống nước nhớ nguồn”.'),
  fill('Điền từ còn thiếu: “Có công mài ___, có ngày nên kim.”', ['sắt'], 'Câu đầy đủ là “Có công mài sắt, có ngày nên kim”.'),
  fill('Điền từ còn thiếu: “Lá lành ___ lá rách.”', ['đùm'], 'Câu đầy đủ là “Lá lành đùm lá rách”.'),
  fill('Điền từ còn thiếu: “Đi một ngày ___, học một sàng khôn.”', ['đàng'], 'Câu đầy đủ là “Đi một ngày đàng, học một sàng khôn”.'),
  fill('Điền từ còn thiếu: “Nhanh như ___.”', ['cắt'], 'Thành ngữ là “Nhanh như cắt”.'),
];

const thanhNgu = {
  single(k) { return THANH_NGU_SINGLE[k]; },
  multi(k) { return THANH_NGU_MULTI[k]; },
  tf(k) { return THANH_NGU_TF[k]; },
  fill(k) { return THANH_NGU_FILL[k]; },
};

export const VIETNAMESE_GRADE_4 = {
  'tieng-viet-4-tu-don-tu-ghep': tuDonTuGhep,
  'tieng-viet-4-danh-tu-dong-tu-tinh-tu': danhTuDongTuTinhTu,
  'tieng-viet-4-cau-ai-the-nao': cauAiTheNao,
  'tieng-viet-4-chinh-ta': chinhTa4,
  'tieng-viet-4-doc-hieu': docHieu4,
  'tieng-viet-4-thanh-ngu': thanhNgu,
};
