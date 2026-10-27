import { fact, fill, multiFact, tf } from './math-utils.js';

// ===== Môn học ở trường =====
const SCHOOL_SUBJECTS_SINGLE = [
  fact('“Môn Toán” trong tiếng Anh là gì?', 'Maths', '“Maths” là môn Toán.', ['English', 'Science', 'Music']),
  fact('“Môn Tiếng Anh” trong tiếng Anh là gì?', 'English', '“English” là môn Tiếng Anh.', ['Maths', 'Art', 'Music']),
  fact('“Môn Âm nhạc” trong tiếng Anh là gì?', 'Music', '“Music” là môn Âm nhạc.', ['Art', 'Maths', 'Science']),
  fact('“Môn Mĩ thuật” trong tiếng Anh là gì?', 'Art', '“Art” là môn Mĩ thuật.', ['Music', 'English', 'PE']),
  fact('“Môn Khoa học” trong tiếng Anh là gì?', 'Science', '“Science” là môn Khoa học.', ['Maths', 'History', 'Music']),
  fact('“Môn Thể dục” trong tiếng Anh là gì?', 'PE', '“PE” là viết tắt của Physical Education – môn Thể dục.', ['Art', 'Music', 'Maths']),
  fact('“Môn Tin học” trong tiếng Anh là gì?', 'IT', '“IT” là viết tắt của Information Technology – môn Tin học.', ['PE', 'Art', 'English']),
  fact('“Môn Lịch sử” trong tiếng Anh là gì?', 'History', '“History” là môn Lịch sử.', ['Geography', 'Science', 'Music']),
  fact('“Môn Địa lí” trong tiếng Anh là gì?', 'Geography', '“Geography” là môn Địa lí.', ['History', 'Science', 'Maths']),
  fact('Môn học nào dùng để hát và học về nốt nhạc?', 'Music', 'Học hát và nốt nhạc là môn “Music”.', ['Art', 'PE', 'Maths']),
  fact('Môn học nào dùng để vẽ tranh, tô màu?', 'Art', 'Vẽ tranh, tô màu là môn “Art”.', ['Music', 'Science', 'IT']),
  fact('Môn học nào giúp em chạy, nhảy và chơi thể thao?', 'PE', 'Chạy, nhảy, chơi thể thao là môn “PE”.', ['Music', 'Art', 'History']),
];

const SCHOOL_SUBJECTS_MULTI = [
  multiFact('Chọn các từ chỉ môn học.', ['Maths', 'Science'], ['Monday', 'Teacher'], '“Maths” và “Science” là môn học; “Monday” là thứ, “teacher” là giáo viên.'),
  multiFact('Chọn các môn học thuộc lĩnh vực nghệ thuật.', ['Music', 'Art'], ['Maths', 'Science'], '“Music” và “Art” thuộc lĩnh vực nghệ thuật.'),
  multiFact('Chọn các môn học thường có bài đọc và bài viết.', ['English', 'Vietnamese'], ['PE', 'Music'], '“English” và “Vietnamese” có nhiều bài đọc, viết.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['History – Lịch sử', 'Geography – Địa lí'], ['Music – Mĩ thuật', 'Art – Âm nhạc'], '“History” là Lịch sử, “Geography” là Địa lí; “Music” là Âm nhạc, “Art” là Mĩ thuật.'),
];

const SCHOOL_SUBJECTS_TF = [
  tf('“Maths” nghĩa là “môn Toán”.', true, 'Đúng, “Maths” là môn Toán.'),
  tf('“Art” nghĩa là “môn Âm nhạc”.', false, 'Sai, “Art” là Mĩ thuật; Âm nhạc là “Music”.'),
  tf('“Science” là “môn Khoa học”.', true, 'Đúng, “Science” là môn Khoa học.'),
  tf('“PE” là “môn Tin học”.', false, 'Sai, “PE” là Thể dục; Tin học là “IT”.'),
];

const SCHOOL_SUBJECTS_FILL = [
  fill('Điền tên môn học bằng tiếng Anh: “I learn to sing in ___ class.”', ['Music'], 'Học hát là môn “Music”.'),
  fill('Điền tên môn học bằng tiếng Anh: “We study numbers in ___ class.”', ['Maths', 'Math'], 'Học số là môn “Maths”.'),
  fill('Điền tên môn học bằng tiếng Anh: “I draw pictures in ___ class.”', ['Art'], 'Vẽ tranh là môn “Art”.'),
  fill('Điền tên môn học bằng tiếng Anh: “We do experiments in ___ class.”', ['Science'], 'Làm thí nghiệm là môn “Science”.'),
  fill('Điền tên môn học bằng tiếng Anh: “I learn about past events in ___ class.”', ['History'], 'Học về sự kiện trong quá khứ là môn “History”.'),
];

const schoolSubjects = {
  single(k) { return SCHOOL_SUBJECTS_SINGLE[k]; },
  multi(k) { return SCHOOL_SUBJECTS_MULTI[k]; },
  tf(k) { return SCHOOL_SUBJECTS_TF[k]; },
  fill(k) { return SCHOOL_SUBJECTS_FILL[k]; },
};

// ===== Ngày và tháng =====
const DAYS_MONTHS_SINGLE = [
  fact('“Thứ Hai” trong tiếng Anh là gì?', 'Monday', '“Monday” là thứ Hai.', ['Sunday', 'Tuesday', 'Saturday']),
  fact('“Thứ Ba” trong tiếng Anh là gì?', 'Tuesday', '“Tuesday” là thứ Ba.', ['Thursday', 'Monday', 'Wednesday']),
  fact('“Thứ Tư” trong tiếng Anh là gì?', 'Wednesday', '“Wednesday” là thứ Tư.', ['Tuesday', 'Thursday', 'Friday']),
  fact('“Thứ Năm” trong tiếng Anh là gì?', 'Thursday', '“Thursday” là thứ Năm.', ['Tuesday', 'Friday', 'Saturday']),
  fact('“Thứ Sáu” trong tiếng Anh là gì?', 'Friday', '“Friday” là thứ Sáu.', ['Thursday', 'Sunday', 'Monday']),
  fact('“Thứ Bảy” trong tiếng Anh là gì?', 'Saturday', '“Saturday” là thứ Bảy.', ['Sunday', 'Friday', 'Wednesday']),
  fact('“Chủ nhật” trong tiếng Anh là gì?', 'Sunday', '“Sunday” là Chủ nhật.', ['Saturday', 'Monday', 'Tuesday']),
  fact('“Tháng Một” trong tiếng Anh là gì?', 'January', '“January” là tháng Một.', ['June', 'July', 'March']),
  fact('“Tháng Năm” trong tiếng Anh là gì?', 'May', '“May” là tháng Năm.', ['March', 'April', 'June']),
  fact('“Tháng Chín” trong tiếng Anh là gì?', 'September', '“September” là tháng Chín.', ['October', 'November', 'December']),
  fact('“Tháng Mười Hai” trong tiếng Anh là gì?', 'December', '“December” là tháng Mười Hai.', ['November', 'September', 'October']),
  fact('Ngày nào đứng ngay sau “Wednesday” trong tuần?', 'Thursday', 'Sau thứ Tư là thứ Năm – “Thursday”.', ['Tuesday', 'Friday', 'Sunday']),
];

const DAYS_MONTHS_MULTI = [
  multiFact('Chọn các ngày trong tuần.', ['Monday', 'Friday'], ['January', 'July'], '“Monday” và “Friday” là ngày trong tuần.'),
  multiFact('Chọn các tháng trong năm.', ['March', 'August'], ['Sunday', 'Tuesday'], '“March” và “August” là các tháng.'),
  multiFact('Chọn các tháng thuộc mùa hè ở Việt Nam.', ['June', 'July'], ['December', 'January'], 'Tháng Sáu, tháng Bảy là mùa hè ở Việt Nam.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['Sunday – Chủ nhật', 'May – Tháng Năm'], ['Monday – Thứ Ba', 'April – Tháng Sáu'], '“Sunday” là Chủ nhật, “May” là tháng Năm; “Monday” là thứ Hai, “April” là tháng Tư.'),
];

const DAYS_MONTHS_TF = [
  tf('“Monday” là thứ Hai.', true, 'Đúng, “Monday” là thứ Hai.'),
  tf('“December” là tháng Mười.', false, 'Sai, “December” là tháng Mười Hai; tháng Mười là “October”.'),
  tf('“Sunday” là Chủ nhật.', true, 'Đúng, “Sunday” là Chủ nhật.'),
  tf('“April” là tháng Tám.', false, 'Sai, “April” là tháng Tư; tháng Tám là “August”.'),
];

const DAYS_MONTHS_FILL = [
  fill('Điền ngày còn thiếu trong tuần: “Monday, Tuesday, ___, Thursday”.', ['Wednesday'], 'Sau thứ Ba là thứ Tư – “Wednesday”.'),
  fill('Điền tháng còn thiếu: “March, April, ___”.', ['May'], 'Sau tháng Tư là tháng Năm – “May”.'),
  fill('Điền từ tiếng Anh: “The first month of the year is ___.”', ['January'], 'Tháng đầu năm là tháng Một – “January”.'),
  fill('Điền từ tiếng Anh: “The last month of the year is ___.”', ['December'], 'Tháng cuối năm là tháng Mười Hai – “December”.'),
  fill('Điền từ tiếng Anh: “We do not go to school on ___.” (Chủ nhật)', ['Sunday'], 'Chủ nhật là “Sunday”.'),
];

const daysMonths = {
  single(k) { return DAYS_MONTHS_SINGLE[k]; },
  multi(k) { return DAYS_MONTHS_MULTI[k]; },
  tf(k) { return DAYS_MONTHS_TF[k]; },
  fill(k) { return DAYS_MONTHS_FILL[k]; },
};

// ===== Thời tiết =====
const WEATHER_SINGLE = [
  fact('“Trời nắng” trong tiếng Anh là gì?', 'sunny', '“Sunny” nghĩa là trời nắng.', ['rainy', 'cloudy', 'snowy']),
  fact('“Trời mưa” trong tiếng Anh là gì?', 'rainy', '“Rainy” nghĩa là trời mưa.', ['sunny', 'windy', 'hot']),
  fact('“Nhiều mây” trong tiếng Anh là gì?', 'cloudy', '“Cloudy” nghĩa là nhiều mây.', ['sunny', 'snowy', 'windy']),
  fact('“Có gió” trong tiếng Anh là gì?', 'windy', '“Windy” nghĩa là có gió.', ['cloudy', 'rainy', 'hot']),
  fact('“Có tuyết” trong tiếng Anh là gì?', 'snowy', '“Snowy” nghĩa là có tuyết.', ['sunny', 'rainy', 'warm']),
  fact('“Nóng” trong tiếng Anh là gì?', 'hot', '“Hot” nghĩa là nóng.', ['cold', 'cool', 'warm']),
  fact('“Lạnh” trong tiếng Anh là gì?', 'cold', '“Cold” nghĩa là lạnh.', ['hot', 'warm', 'sunny']),
  fact('“Ấm” trong tiếng Anh là gì?', 'warm', '“Warm” nghĩa là ấm.', ['cold', 'cool', 'snowy']),
  fact('“Mát” trong tiếng Anh là gì?', 'cool', '“Cool” nghĩa là mát.', ['hot', 'warm', 'cold']),
  fact('“Thời tiết” trong tiếng Anh là gì?', 'weather', '“Weather” nghĩa là thời tiết.', ['wind', 'water', 'winter']),
  fact('Đồ dùng nào em mang khi trời mưa?', 'umbrella', '“Umbrella” là cái ô để che mưa.', ['sunglasses', 'fan', 'book']),
  fact('Hôm nay trời mưa. Em nên mặc gì?', 'raincoat', '“Raincoat” là áo mưa.', ['T-shirt', 'shorts', 'sandals']),
];

const WEATHER_MULTI = [
  multiFact('Chọn các từ chỉ thời tiết.', ['sunny', 'cloudy'], ['Monday', 'kitchen'], '“Sunny” và “cloudy” chỉ thời tiết.'),
  multiFact('Chọn các từ chỉ trời lạnh.', ['cold', 'snowy'], ['hot', 'sunny'], '“Cold” và “snowy” chỉ trời lạnh.'),
  multiFact('Chọn các từ chỉ thời tiết đẹp để đi chơi.', ['sunny', 'warm'], ['rainy', 'stormy'], 'Trời nắng, ấm là thời tiết đẹp để đi chơi.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['windy – có gió', 'cold – lạnh'], ['hot – mát', 'rainy – có tuyết'], '“Windy” là có gió, “cold” là lạnh; “hot” là nóng, “rainy” là trời mưa.'),
];

const WEATHER_TF = [
  tf('“Sunny” nghĩa là “trời nắng”.', true, 'Đúng, “sunny” là trời nắng.'),
  tf('“Cold” nghĩa là “nóng”.', false, 'Sai, “cold” là lạnh; nóng là “hot”.'),
  tf('“Cloudy” là “nhiều mây”.', true, 'Đúng, “cloudy” là nhiều mây.'),
  tf('“Windy” là “có tuyết”.', false, 'Sai, “windy” là có gió; có tuyết là “snowy”.'),
];

const WEATHER_FILL = [
  fill('Điền từ tiếng Anh: “It is ___ today. I need an umbrella.” (trời mưa)', ['rainy'], 'Trời mưa là “rainy”, nên cần ô.'),
  fill('Điền từ tiếng Anh: “It is very ___ in summer.” (nóng)', ['hot'], 'Mùa hè trời nóng – “hot”.'),
  fill('Điền từ tiếng Anh: “It is ___ in winter.” (lạnh)', ['cold'], 'Mùa đông trời lạnh – “cold”.'),
  fill('Điền từ tiếng Anh: “The sky has many clouds. It is ___.” (nhiều mây)', ['cloudy'], 'Nhiều mây là “cloudy”.'),
  fill('Điền từ tiếng Anh: “What is the ___ like today?”', ['weather'], 'Câu hỏi về thời tiết dùng “weather”.'),
];

const weather = {
  single(k) { return WEATHER_SINGLE[k]; },
  multi(k) { return WEATHER_MULTI[k]; },
  tf(k) { return WEATHER_TF[k]; },
  fill(k) { return WEATHER_FILL[k]; },
};

// ===== Nghề nghiệp =====
const JOBS_SINGLE = [
  fact('“Bác sĩ” trong tiếng Anh là gì?', 'doctor', '“Doctor” nghĩa là bác sĩ.', ['nurse', 'teacher', 'farmer']),
  fact('“Giáo viên” trong tiếng Anh là gì?', 'teacher', '“Teacher” nghĩa là giáo viên.', ['doctor', 'pilot', 'driver']),
  fact('“Nông dân” trong tiếng Anh là gì?', 'farmer', '“Farmer” nghĩa là nông dân.', ['worker', 'cook', 'nurse']),
  fact('“Kĩ sư” trong tiếng Anh là gì?', 'engineer', '“Engineer” nghĩa là kĩ sư.', ['doctor', 'driver', 'singer']),
  fact('“Y tá” trong tiếng Anh là gì?', 'nurse', '“Nurse” nghĩa là y tá.', ['doctor', 'dentist', 'teacher']),
  fact('“Tài xế” trong tiếng Anh là gì?', 'driver', '“Driver” nghĩa là tài xế.', ['pilot', 'farmer', 'engineer']),
  fact('“Công an” trong tiếng Anh là gì?', 'policeman', '“Policeman” nghĩa là công an.', ['pilot', 'driver', 'worker']),
  fact('“Đầu bếp” trong tiếng Anh là gì?', 'cook', '“Cook” nghĩa là đầu bếp.', ['farmer', 'driver', 'singer']),
  fact('“Ca sĩ” trong tiếng Anh là gì?', 'singer', '“Singer” nghĩa là ca sĩ.', ['cook', 'teacher', 'nurse']),
  fact('“Phi công” trong tiếng Anh là gì?', 'pilot', '“Pilot” nghĩa là phi công.', ['driver', 'engineer', 'policeman']),
  fact('“Công nhân” trong tiếng Anh là gì?', 'worker', '“Worker” nghĩa là công nhân.', ['farmer', 'doctor', 'singer']),
  fact('“Nha sĩ” trong tiếng Anh là gì?', 'dentist', '“Dentist” nghĩa là nha sĩ.', ['doctor', 'nurse', 'teacher']),
];

const JOBS_MULTI = [
  multiFact('Chọn các nghề làm việc trong bệnh viện.', ['doctor', 'nurse'], ['farmer', 'pilot'], '“Doctor” và “nurse” làm việc trong bệnh viện.'),
  multiFact('Chọn các nghề liên quan đến xe cộ, máy bay.', ['driver', 'pilot'], ['doctor', 'singer'], '“Driver” lái xe, “pilot” lái máy bay.'),
  multiFact('Chọn các nghề làm ra lương thực, thực phẩm.', ['farmer', 'cook'], ['pilot', 'singer'], '“Farmer” trồng trọt, “cook” nấu ăn.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['doctor – bác sĩ', 'farmer – nông dân'], ['driver – phi công', 'nurse – giáo viên'], '“Doctor” là bác sĩ, “farmer” là nông dân; “driver” là tài xế, “nurse” là y tá.'),
];

const JOBS_TF = [
  tf('“Teacher” nghĩa là “giáo viên”.', true, 'Đúng, “teacher” là giáo viên.'),
  tf('“Doctor” nghĩa là “nông dân”.', false, 'Sai, “doctor” là bác sĩ; nông dân là “farmer”.'),
  tf('“Pilot” là “phi công”.', true, 'Đúng, “pilot” là phi công.'),
  tf('“Singer” là “đầu bếp”.', false, 'Sai, “singer” là ca sĩ; đầu bếp là “cook/chef”.'),
];

const JOBS_FILL = [
  fill('Điền nghề bằng tiếng Anh: “My father works in a hospital. He is a ___.”', ['doctor'], 'Người làm việc ở bệnh viện là “doctor”.'),
  fill('Điền nghề bằng tiếng Anh: “She grows rice. She is a ___.”', ['farmer'], 'Người trồng lúa là “farmer”.'),
  fill('Điền nghề bằng tiếng Anh: “He flies a plane. He is a ___.”', ['pilot'], 'Người lái máy bay là “pilot”.'),
  fill('Điền nghề bằng tiếng Anh: “She teaches English. She is a ___.”', ['teacher'], 'Người dạy học là “teacher”.'),
  fill('Điền nghề bằng tiếng Anh: “He drives a bus. He is a ___.”', ['driver'], 'Người lái xe là “driver”.'),
];

const jobs = {
  single(k) { return JOBS_SINGLE[k]; },
  multi(k) { return JOBS_MULTI[k]; },
  tf(k) { return JOBS_TF[k]; },
  fill(k) { return JOBS_FILL[k]; },
};

// ===== Thì hiện tại tiếp diễn =====
const PRESENT_CONTINUOUS_SINGLE = [
  fact('Chọn dạng đúng: “I ___ reading a book now.” (be)', 'am', '“I” đi với “am”.', ['is', 'are', 'be']),
  fact('Chọn dạng đúng: “She ___ cooking dinner.” (be)', 'is', '“She” đi với “is”.', ['am', 'are', 'be']),
  fact('Chọn dạng đúng: “They ___ playing football.” (be)', 'are', '“They” đi với “are”.', ['am', 'is', 'be']),
  fact('Chọn dạng đúng: “He is ___ TV now.” (watch)', 'watching', 'Sau “is” dùng động từ thêm -ing: “watching”.', ['watch', 'watches', 'watched']),
  fact('Chọn dạng đúng: “We are ___ in the garden.” (play)', 'playing', 'Sau “are” dùng “playing”.', ['play', 'plays', 'played']),
  fact('Chọn dạng đúng: “Lan is ___ her homework.” (do)', 'doing', 'Sau “is” dùng “doing”.', ['do', 'does', 'did']),
  fact('Chọn dạng đúng: “The baby is ___.” (sleep)', 'sleeping', 'Sau “is” dùng “sleeping”.', ['sleep', 'sleeps', 'slept']),
  fact('Trạng từ nào thường dùng với thì hiện tại tiếp diễn?', 'now', '“Now” chỉ việc đang diễn ra.', ['yesterday', 'last week', 'every day']),
  fact('Câu nào ở thì hiện tại tiếp diễn?', 'She is singing now.', 'Câu này có “is + singing” và “now”.', ['She sings every day.', 'She sang yesterday.', 'She will sing tomorrow.']),
  fact('Chọn câu đúng.', 'They are running in the park.', '“They” đi với “are” và động từ thêm -ing.', ['They is running in the park.', 'They are run in the park.', 'They am running in the park.']),
  fact('Chọn dạng đúng của “swim” khi thêm -ing.', 'swimming', '“Swim” gấp đôi phụ âm cuối thành “swimming”.', ['swiming', 'swimeing', 'swims']),
  fact('Chọn dạng đúng: “My mother ___ cooking in the kitchen.” (be)', 'is', '“My mother” là số ít nên đi với “is”.', ['am', 'are', 'be']),
];

const PRESENT_CONTINUOUS_MULTI = [
  multiFact('Chọn các câu ở thì hiện tại tiếp diễn.', ['He is reading a book.', 'They are playing chess.'], ['He reads a book every day.', 'They played chess yesterday.'], 'Hai câu đầu có “is/are + động từ -ing”.'),
  multiFact('Chọn các trạng từ thường đi với thì hiện tại tiếp diễn.', ['now', 'at the moment'], ['yesterday', 'last year'], '“Now” và “at the moment” chỉ việc đang diễn ra.'),
  multiFact('Chọn các dạng đúng khi thêm -ing.', ['running', 'swimming'], ['runing', 'swiming'], '“Run” và “swim” gấp đôi phụ âm cuối.'),
  multiFact('Chọn các câu đúng ngữ pháp.', ['I am listening to music.', 'She is writing a letter.'], ['I is listening to music.', 'She are writing a letter.'], '“I” đi với “am”, “she” đi với “is”.'),
];

const PRESENT_CONTINUOUS_TF = [
  tf('“She is reading a book.” là câu ở thì hiện tại tiếp diễn.', true, 'Đúng, câu có “is + reading”.'),
  tf('Thì hiện tại tiếp diễn thường dùng với “every day”.', false, 'Sai, “every day” dùng với hiện tại đơn; tiếp diễn dùng “now”.'),
  tf('“They are playing football.” là câu đúng.', true, 'Đúng, “they” đi với “are playing”.'),
  tf('“He is go to school now.” là câu đúng.', false, 'Sai, đúng phải là “He is going to school now.”'),
];

const PRESENT_CONTINUOUS_FILL = [
  fill('Chia động từ trong ngoặc: “She ___ (read) a book now.”', ['is reading'], '“She” đi với “is reading”.'),
  fill('Chia động từ trong ngoặc: “They ___ (play) football at the moment.”', ['are playing'], '“They” đi với “are playing”.'),
  fill('Chia động từ trong ngoặc: “I ___ (do) my homework now.”', ['am doing'], '“I” đi với “am doing”.'),
  fill('Chia động từ trong ngoặc: “Look! The baby ___ (sleep).”', ['is sleeping'], '“The baby” đi với “is sleeping”.'),
  fill('Chia động từ trong ngoặc: “We ___ (watch) TV now.”', ['are watching'], '“We” đi với “are watching”.'),
];

const presentContinuous = {
  single(k) { return PRESENT_CONTINUOUS_SINGLE[k]; },
  multi(k) { return PRESENT_CONTINUOUS_MULTI[k]; },
  tf(k) { return PRESENT_CONTINUOUS_TF[k]; },
  fill(k) { return PRESENT_CONTINUOUS_FILL[k]; },
};

// ===== Giới từ chỉ vị trí =====
const PREPOSITIONS_SINGLE = [
  fact('“Ở trong” trong tiếng Anh là gì?', 'in', '“In” nghĩa là ở trong.', ['on', 'under', 'near']),
  fact('“Ở trên” (bề mặt) trong tiếng Anh là gì?', 'on', '“On” nghĩa là ở trên bề mặt.', ['in', 'under', 'behind']),
  fact('“Ở dưới” trong tiếng Anh là gì?', 'under', '“Under” nghĩa là ở dưới.', ['on', 'in', 'above']),
  fact('“Phía sau” trong tiếng Anh là gì?', 'behind', '“Behind” nghĩa là phía sau.', ['in front of', 'between', 'on']),
  fact('“Phía trước” trong tiếng Anh là gì?', 'in front of', '“In front of” nghĩa là phía trước.', ['behind', 'under', 'next to']),
  fact('“Ở giữa” trong tiếng Anh là gì?', 'between', '“Between” nghĩa là ở giữa hai vật.', ['behind', 'near', 'on']),
  fact('“Bên cạnh” trong tiếng Anh là gì?', 'next to', '“Next to” nghĩa là bên cạnh.', ['above', 'under', 'in']),
  fact('“Gần” trong tiếng Anh là gì?', 'near', '“Near” nghĩa là gần.', ['far', 'behind', 'on']),
  fact('Điền từ: “The cat is ___ the table.” (con mèo ở dưới gầm bàn)', 'under', 'Con mèo ở dưới bàn nên dùng “under”.', ['on', 'in', 'above']),
  fact('Điền từ: “The book is ___ the desk.” (quyển sách ở trên mặt bàn)', 'on', 'Sách ở trên mặt bàn nên dùng “on”.', ['in', 'under', 'behind']),
  fact('Điền từ: “The pen is ___ the box.” (bút ở trong hộp)', 'in', 'Bút ở trong hộp nên dùng “in”.', ['on', 'under', 'near']),
  fact('Điền từ: “Nam sits ___ Hoa and Lan.” (ở giữa hai bạn)', 'between', 'Ở giữa hai người dùng “between”.', ['behind', 'next to', 'under']),
];

const PREPOSITIONS_MULTI = [
  multiFact('Chọn các giới từ chỉ vị trí.', ['in', 'under'], ['and', 'but'], '“In” và “under” là giới từ chỉ vị trí.'),
  multiFact('Chọn các từ chỉ vị trí phía sau hoặc phía trước.', ['behind', 'in front of'], ['in', 'on'], '“Behind” là phía sau, “in front of” là phía trước.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['under – ở dưới', 'between – ở giữa'], ['on – ở trong', 'near – ở trên'], '“Under” là ở dưới, “between” là ở giữa; “on” là ở trên, “near” là gần.'),
  multiFact('Chọn các câu đúng.', ['The ball is under the chair.', 'The cat is on the sofa.'], ['The ball is under of the chair.', 'The cat is on of the sofa.'], 'Giới từ chỉ vị trí không đi với “of” trong các câu này.'),
];

const PREPOSITIONS_TF = [
  tf('“Under” nghĩa là “ở dưới”.', true, 'Đúng, “under” là ở dưới.'),
  tf('“Behind” nghĩa là “phía trước”.', false, 'Sai, “behind” là phía sau; phía trước là “in front of”.'),
  tf('“Between” nghĩa là “ở giữa”.', true, 'Đúng, “between” là ở giữa.'),
  tf('“Next to” nghĩa là “ở trên”.', false, 'Sai, “next to” là bên cạnh; ở trên là “on/above”.'),
];

const PREPOSITIONS_FILL = [
  fill('Điền giới từ: “The picture is ___ the wall.”', ['on'], 'Tranh treo trên tường nên dùng “on”.'),
  fill('Điền giới từ: “The dog is ___ the table.” (ở dưới)', ['under'], 'Ở dưới dùng “under”.'),
  fill('Điền giới từ: “The pencils are ___ the bag.” (ở trong)', ['in'], 'Ở trong dùng “in”.'),
  fill('Điền giới từ: “Lan is standing ___ Nam.” (bên cạnh)', ['next to', 'beside'], 'Bên cạnh dùng “next to” hoặc “beside”.'),
  fill('Điền giới từ: “The shop is ___ the school and the park.” (ở giữa)', ['between'], 'Ở giữa hai vật dùng “between”.'),
];

const prepositions = {
  single(k) { return PREPOSITIONS_SINGLE[k]; },
  multi(k) { return PREPOSITIONS_MULTI[k]; },
  tf(k) { return PREPOSITIONS_TF[k]; },
  fill(k) { return PREPOSITIONS_FILL[k]; },
};

export const ENGLISH_GRADE_4 = {
  'tieng-anh-4-school-subjects': schoolSubjects,
  'tieng-anh-4-days-months': daysMonths,
  'tieng-anh-4-weather': weather,
  'tieng-anh-4-jobs': jobs,
  'tieng-anh-4-present-continuous': presentContinuous,
  'tieng-anh-4-prepositions': prepositions,
};
