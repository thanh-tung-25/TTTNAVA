// Danh muc 91 chu de: lop 1 & 5 day 108 cau/chu de, cac lop khac 25 cau/chu de.
const RAW_TOPICS = [
  // ===== LOP 1 =====
  ['toan', 1, 'dem-va-so-sanh', 'Đếm và so sánh trong phạm vi 10'],
  ['toan', 1, 'cong-trong-10', 'Phép cộng trong phạm vi 10'],
  ['toan', 1, 'tru-trong-10', 'Phép trừ trong phạm vi 10'],
  ['toan', 1, 'so-den-100', 'Số đến 100'],
  ['toan', 1, 'hinh-va-vi-tri', 'Hình học và vị trí'],
  ['tieng-viet', 1, 'chu-cai', 'Chữ cái và âm đầu'],
  ['tieng-viet', 1, 'van-va-tieng', 'Vần và tiếng'],
  ['tieng-viet', 1, 'tu-chi-su-vat', 'Từ chỉ sự vật'],
  ['tieng-viet', 1, 'cau-don-gian', 'Câu đơn giản'],
  ['tieng-viet', 1, 'doc-hieu', 'Đọc hiểu đoạn ngắn'],
  ['tieng-anh', 1, 'alphabet', 'Alphabet và chào hỏi'],
  ['tieng-anh', 1, 'numbers', 'Số 1–10'],
  ['tieng-anh', 1, 'colors', 'Màu sắc'],
  ['tieng-anh', 1, 'animals', 'Động vật'],
  ['tieng-anh', 1, 'family', 'Gia đình'],

  // ===== LOP 2 =====
  ['toan', 2, 'cong-tru-100', 'Cộng trừ trong phạm vi 100'],
  ['toan', 2, 'bang-nhan-2-5', 'Bảng nhân 2–5'],
  ['toan', 2, 'bang-chia-2-5', 'Bảng chia 2–5'],
  ['toan', 2, 'do-dai', 'Đo độ dài'],
  ['toan', 2, 'hinh-hoc', 'Hình học cơ bản'],
  ['toan', 2, 'toan-co-loi-van', 'Toán có lời văn'],
  ['tieng-viet', 2, 'chinh-ta', 'Chính tả'],
  ['tieng-viet', 2, 'tu-chi-hoat-dong', 'Từ chỉ hoạt động'],
  ['tieng-viet', 2, 'cau-ai-la-gi', 'Câu kiểu Ai là gì?'],
  ['tieng-viet', 2, 'dau-cau', 'Dấu câu'],
  ['tieng-viet', 2, 'doc-hieu', 'Đọc hiểu'],
  ['tieng-viet', 2, 'tu-trai-nghia', 'Từ trái nghĩa'],
  ['tieng-anh', 2, 'numbers-20', 'Số 11–20'],
  ['tieng-anh', 2, 'school', 'Trường học'],
  ['tieng-anh', 2, 'body', 'Cơ thể'],
  ['tieng-anh', 2, 'food', 'Đồ ăn'],
  ['tieng-anh', 2, 'verbs', 'Động từ thường gặp'],
  ['tieng-anh', 2, 'greetings', 'Chào hỏi và giới thiệu'],

  // ===== LOP 3 =====
  ['toan', 3, 'cong-tru-1000', 'Cộng trừ trong phạm vi 1000'],
  ['toan', 3, 'bang-nhan-chia-6-9', 'Bảng nhân chia 6–9'],
  ['toan', 3, 'nhan-chia-ba-chu-so', 'Nhân chia số có ba chữ số'],
  ['toan', 3, 'gap-va-giam', 'Gấp và giảm số lần'],
  ['toan', 3, 'hinh-hoc-chu-vi', 'Hình học và chu vi'],
  ['toan', 3, 'do-luong', 'Đo lường'],
  ['tieng-viet', 3, 'tu-chi-dac-diem', 'Từ chỉ đặc điểm'],
  ['tieng-viet', 3, 'so-sanh', 'Biện pháp so sánh'],
  ['tieng-viet', 3, 'nhan-hoa', 'Biện pháp nhân hóa'],
  ['tieng-viet', 3, 'cau-ai-lam-gi', 'Câu kiểu Ai làm gì?'],
  ['tieng-viet', 3, 'chinh-ta', 'Chính tả'],
  ['tieng-viet', 3, 'doc-hieu', 'Đọc hiểu'],
  ['tieng-viet', 3, 'dau-cau', 'Dấu câu'],
  ['tieng-anh', 3, 'colors-shapes', 'Màu sắc và hình khối'],
  ['tieng-anh', 3, 'family-home', 'Gia đình và ngôi nhà'],
  ['tieng-anh', 3, 'animals', 'Động vật'],
  ['tieng-anh', 3, 'food-drinks', 'Đồ ăn và thức uống'],
  ['tieng-anh', 3, 'this-that', 'This, that, these, those'],
  ['tieng-anh', 3, 'present-simple', 'Thì hiện tại đơn'],

  // ===== LOP 4 =====
  ['toan', 4, 'so-lon', 'Số lớn, hàng và lớp'],
  ['toan', 4, 'cong-tru', 'Cộng trừ số tự nhiên'],
  ['toan', 4, 'nhan-chia', 'Nhân chia số tự nhiên'],
  ['toan', 4, 'phan-so', 'Phân số'],
  ['toan', 4, 'hinh-hoc', 'Hình học'],
  ['toan', 4, 'trung-binh-cong', 'Trung bình cộng và biểu đồ'],
  ['tieng-viet', 4, 'tu-don-tu-ghep', 'Từ đơn và từ ghép'],
  ['tieng-viet', 4, 'danh-tu-dong-tu-tinh-tu', 'Danh từ, động từ, tính từ'],
  ['tieng-viet', 4, 'cau-ai-the-nao', 'Câu kiểu Ai thế nào?'],
  ['tieng-viet', 4, 'chinh-ta', 'Chính tả'],
  ['tieng-viet', 4, 'doc-hieu', 'Đọc hiểu'],
  ['tieng-viet', 4, 'thanh-ngu', 'Thành ngữ, tục ngữ'],
  ['tieng-anh', 4, 'school-subjects', 'Môn học ở trường'],
  ['tieng-anh', 4, 'days-months', 'Ngày và tháng'],
  ['tieng-anh', 4, 'weather', 'Thời tiết'],
  ['tieng-anh', 4, 'jobs', 'Nghề nghiệp'],
  ['tieng-anh', 4, 'present-continuous', 'Thì hiện tại tiếp diễn'],
  ['tieng-anh', 4, 'prepositions', 'Giới từ chỉ vị trí'],

  // ===== LOP 5 =====
  ['toan', 5, 'so-thap-phan', 'Số thập phân'],
  ['toan', 5, 'cong-tru-thap-phan', 'Cộng trừ số thập phân'],
  ['toan', 5, 'nhan-chia-thap-phan', 'Nhân chia số thập phân'],
  ['toan', 5, 'ti-so-phan-tram', 'Tỉ số phần trăm'],
  ['toan', 5, 'hinh-hoc', 'Diện tích và thể tích'],
  ['toan', 5, 'do-luong-thoi-gian', 'Đo lường và thời gian'],
  ['toan', 5, 'chuyen-dong', 'Toán chuyển động'],
  ['tieng-viet', 5, 'tu-dong-nghia-trai-nghia', 'Từ đồng nghĩa, trái nghĩa'],
  ['tieng-viet', 5, 'dai-tu-quan-he-tu', 'Đại từ và quan hệ từ'],
  ['tieng-viet', 5, 'cau-ghep', 'Câu ghép'],
  ['tieng-viet', 5, 'doc-hieu', 'Đọc hiểu'],
  ['tieng-viet', 5, 'chinh-ta', 'Chính tả'],
  ['tieng-viet', 5, 'tu-loai', 'Từ loại'],
  ['tieng-viet', 5, 'thanh-ngu-tuc-ngu', 'Thành ngữ, tục ngữ'],
  ['tieng-anh', 5, 'present-simple', 'Thì hiện tại đơn'],
  ['tieng-anh', 5, 'past-simple', 'Thì quá khứ đơn'],
  ['tieng-anh', 5, 'comparatives', 'So sánh hơn và so sánh nhất'],
  ['tieng-anh', 5, 'weather-seasons', 'Thời tiết và mùa'],
  ['tieng-anh', 5, 'hobbies', 'Sở thích'],
  ['tieng-anh', 5, 'daily-routines', 'Thói quen hằng ngày'],
  ['tieng-anh', 5, 'prepositions', 'Giới từ'],
];

const counters = new Map();

export const TOPICS = RAW_TOPICS.map(([subjectId, grade, slug, name]) => {
  const key = `${subjectId}-${grade}`;
  const sortOrder = (counters.get(key) ?? 0) + 1;
  counters.set(key, sortOrder);
  return {
    id: `${subjectId}-${grade}-${slug}`,
    subjectId,
    grade,
    slug,
    name,
    sortOrder,
  };
});

export function topicsOf(subjectId, grade) {
  return TOPICS.filter((topic) => topic.subjectId === subjectId && topic.grade === grade);
}

export function questionCountForTopic(topic) {
  return topic.grade === 1 || topic.grade === 5 ? 108 : 25;
}

export function typeQuota(total) {
  if (total === 108) {
    return { single_choice: 52, multiple_choice: 17, true_false: 17, fill_in: 22 };
  }
  return { single_choice: 12, multiple_choice: 4, true_false: 4, fill_in: 5 };
}
