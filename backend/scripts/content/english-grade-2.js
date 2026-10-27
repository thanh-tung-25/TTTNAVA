import { fact, fill, multiFact, tf } from './math-utils.js';

// ===== Số 11–20 =====
const NUMBERS_20_SINGLE = [
  fact('Số 11 trong tiếng Anh là gì?', 'eleven', '“Eleven” là số 11.', ['twelve', 'ten', 'one']),
  fact('Số 12 trong tiếng Anh là gì?', 'twelve', '“Twelve” là số 12.', ['twenty', 'eleven', 'two']),
  fact('Số 13 trong tiếng Anh là gì?', 'thirteen', '“Thirteen” là số 13.', ['thirty', 'three', 'thirteenth']),
  fact('Số 15 trong tiếng Anh là gì?', 'fifteen', '“Fifteen” là số 15.', ['fiveteen', 'fifty', 'five']),
  fact('Số 18 trong tiếng Anh là gì?', 'eighteen', '“Eighteen” là số 18.', ['eightteen', 'eighty', 'eight']),
  fact('Số 20 trong tiếng Anh là gì?', 'twenty', '“Twenty” là số 20.', ['twelve', 'twentieth', 'twoty']),
  fact('“Fourteen” là số nào?', '14', '“Fourteen” là số 14.', ['40', '4', '15']),
  fact('“Seventeen” là số nào?', '17', '“Seventeen” là số 17.', ['70', '7', '16']),
  fact('“Nineteen” là số nào?', '19', '“Nineteen” là số 19.', ['90', '9', '18']),
  fact('“Sixteen” là số nào?', '16', '“Sixteen” là số 16.', ['60', '6', '15']),
  fact('Số nào đứng ngay sau số 12 khi đếm tiếp bằng tiếng Anh?', 'thirteen', 'Sau “twelve” là “thirteen” (13).', ['twelve', 'twenty', 'eleven']),
  fact('Số nào đứng ngay trước số 20 khi đếm bằng tiếng Anh?', 'nineteen', 'Trước “twenty” là “nineteen” (19).', ['twenty', 'eighteen', 'twelve']),
];

const NUMBERS_20_MULTI = [
  multiFact('Chọn các số được viết đúng bằng tiếng Anh.', ['eleven', 'fifteen'], ['elevn', 'fiveteen'], '“Eleven” và “fifteen” viết đúng; hai từ còn lại sai chính tả.'),
  multiFact('Chọn các số lớn hơn 15 (viết bằng tiếng Anh).', ['sixteen', 'eighteen'], ['fourteen', 'thirteen'], '16 và 18 lớn hơn 15; 14 và 13 nhỏ hơn 15.'),
  multiFact('Chọn các số nhỏ hơn 13 (viết bằng tiếng Anh).', ['eleven', 'twelve'], ['thirteen', 'fifteen'], '11 và 12 nhỏ hơn 13; 13 và 15 thì không.'),
  multiFact('Chọn các cặp số – chữ tiếng Anh đúng.', ['12 – twelve', '20 – twenty'], ['13 – thirty', '15 – fifty'], '12 là “twelve”, 20 là “twenty”; 13 là “thirteen”, 15 là “fifteen”.'),
];

const NUMBERS_20_TF = [
  tf('Số 14 trong tiếng Anh là “fourteen”.', true, 'Đúng, 14 là “fourteen”.'),
  tf('Số 16 được viết là “sixtin”.', false, 'Sai, đúng là “sixteen”.'),
  tf('“Twenty” là số 20.', true, 'Đúng, “twenty” là 20.'),
  tf('“Thirteen” là số 30.', false, 'Sai, “thirteen” là 13; số 30 là “thirty”.'),
];

const NUMBERS_20_FILL = [
  fill('Điền số còn thiếu: “eleven, twelve, ___, fourteen”.', ['thirteen', '13'], 'Sau “twelve” là “thirteen” (13).'),
  fill('Viết số 17 bằng tiếng Anh: ___.', ['seventeen'], '17 là “seventeen”.'),
  fill('Viết số 20 bằng tiếng Anh: ___.', ['twenty'], '20 là “twenty”.'),
  fill('Điền số còn thiếu: “eighteen, ___, twenty”.', ['nineteen', '19'], 'Giữa 18 và 20 là 19 – “nineteen”.'),
  fill('“Fifteen” là số ___ trong tiếng Việt.', ['15', 'mười lăm'], '“Fifteen” là số 15.'),
];

const numbers20 = {
  single(k) { return NUMBERS_20_SINGLE[k]; },
  multi(k) { return NUMBERS_20_MULTI[k]; },
  tf(k) { return NUMBERS_20_TF[k]; },
  fill(k) { return NUMBERS_20_FILL[k]; },
};

// ===== Trường học =====
const SCHOOL_SINGLE = [
  fact('“Trường học” trong tiếng Anh là gì?', 'school', '“School” nghĩa là trường học.', ['classroom', 'library', 'house']),
  fact('“Giáo viên” trong tiếng Anh là gì?', 'teacher', '“Teacher” nghĩa là giáo viên.', ['student', 'doctor', 'farmer']),
  fact('“Học sinh” trong tiếng Anh là gì?', 'student', '“Student” nghĩa là học sinh.', ['teacher', 'worker', 'driver']),
  fact('“Quyển sách” trong tiếng Anh là gì?', 'book', '“Book” nghĩa là quyển sách.', ['notebook', 'pen', 'bag']),
  fact('“Bút chì” trong tiếng Anh là gì?', 'pencil', '“Pencil” nghĩa là bút chì.', ['pen', 'ruler', 'eraser']),
  fact('“Thước kẻ” trong tiếng Anh là gì?', 'ruler', '“Ruler” nghĩa là thước kẻ.', ['eraser', 'pencil', 'book']),
  fact('“Cái bảng” trong tiếng Anh là gì?', 'board', '“Board” nghĩa là cái bảng.', ['desk', 'chair', 'door']),
  fact('“Cặp sách” trong tiếng Anh là gì?', 'school bag', '“School bag” nghĩa là cặp sách.', ['school book', 'school desk', 'school chair']),
  fact('“Thư viện” trong tiếng Anh là gì?', 'library', '“Library” nghĩa là thư viện.', ['classroom', 'playground', 'office']),
  fact('“Cái ghế” trong tiếng Anh là gì?', 'chair', '“Chair” nghĩa là cái ghế.', ['desk', 'table', 'board']),
  fact('“Cái bàn học” trong tiếng Anh là gì?', 'desk', '“Desk” nghĩa là bàn học.', ['chair', 'board', 'bag']),
  fact('Từ nào chỉ đồ dùng để tẩy chì?', 'eraser', '“Eraser” là cục tẩy.', ['ruler', 'pencil', 'pen']),
];

const SCHOOL_MULTI = [
  multiFact('Chọn các từ chỉ đồ dùng học tập.', ['pencil', 'ruler'], ['teacher', 'window'], '“Pencil” và “ruler” là đồ dùng học tập.'),
  multiFact('Chọn các từ chỉ người trong trường học.', ['teacher', 'student'], ['pencil', 'desk'], '“Teacher” và “student” chỉ người.'),
  multiFact('Chọn các từ chỉ đồ vật có trong lớp học.', ['board', 'chair'], ['school', 'library'], '“Board” và “chair” là đồ vật trong lớp.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['book – sách', 'pen – bút mực'], ['desk – ghế', 'ruler – tẩy'], '“Book” là sách, “pen” là bút mực; “desk” là bàn, “ruler” là thước.'),
];

const SCHOOL_TF = [
  tf('“Teacher” nghĩa là “giáo viên”.', true, 'Đúng, “teacher” là giáo viên.'),
  tf('“Book” nghĩa là “cái bàn”.', false, 'Sai, “book” là quyển sách; cái bàn là “desk/table”.'),
  tf('“Pencil” là “bút chì”.', true, 'Đúng, “pencil” là bút chì.'),
  tf('“Library” là “sân chơi”.', false, 'Sai, “library” là thư viện; sân chơi là “playground”.'),
];

const SCHOOL_FILL = [
  fill('Điền từ tiếng Anh: “This is my ___.” (quyển sách)', ['book'], '“Book” là quyển sách.'),
  fill('Điền từ tiếng Anh chỉ người dạy học: “My ___ is Mrs Lan.”', ['teacher'], '“Teacher” là giáo viên.'),
  fill('Điền từ tiếng Anh: “I write with a ___.” (bút chì)', ['pencil'], '“Pencil” là bút chì.'),
  fill('Điền từ tiếng Anh: “We read books in the ___.” (thư viện)', ['library'], '“Library” là thư viện.'),
  fill('Điền từ tiếng Anh: “My school ___ is blue.” (cặp sách)', ['bag', 'school bag'], '“School bag” là cặp sách.'),
];

const school = {
  single(k) { return SCHOOL_SINGLE[k]; },
  multi(k) { return SCHOOL_MULTI[k]; },
  tf(k) { return SCHOOL_TF[k]; },
  fill(k) { return SCHOOL_FILL[k]; },
};

// ===== Cơ thể =====
const BODY_SINGLE = [
  fact('“Cái đầu” trong tiếng Anh là gì?', 'head', '“Head” nghĩa là cái đầu.', ['hand', 'hair', 'hat']),
  fact('“Mắt” trong tiếng Anh là gì?', 'eye', '“Eye” nghĩa là con mắt.', ['ear', 'nose', 'mouth']),
  fact('“Tai” trong tiếng Anh là gì?', 'ear', '“Ear” nghĩa là cái tai.', ['eye', 'arm', 'leg']),
  fact('“Mũi” trong tiếng Anh là gì?', 'nose', '“Nose” nghĩa là cái mũi.', ['mouth', 'neck', 'hair']),
  fact('“Miệng” trong tiếng Anh là gì?', 'mouth', '“Mouth” nghĩa là cái miệng.', ['nose', 'tooth', 'ear']),
  fact('“Bàn tay” trong tiếng Anh là gì?', 'hand', '“Hand” nghĩa là bàn tay.', ['foot', 'arm', 'leg']),
  fact('“Cánh tay” trong tiếng Anh là gì?', 'arm', '“Arm” nghĩa là cánh tay.', ['leg', 'hand', 'ear']),
  fact('“Bàn chân” trong tiếng Anh là gì?', 'foot', '“Foot” nghĩa là bàn chân.', ['hand', 'leg', 'head']),
  fact('“Ngón tay” trong tiếng Anh là gì?', 'finger', '“Finger” nghĩa là ngón tay.', ['toe', 'hand', 'arm']),
  fact('“Tóc” trong tiếng Anh là gì?', 'hair', '“Hair” nghĩa là mái tóc.', ['head', 'hat', 'hand']),
  fact('Từ nào chỉ bộ phận dùng để nhìn?', 'eyes', 'Chúng ta nhìn bằng “eyes” (đôi mắt).', ['ears', 'hands', 'feet']),
  fact('Từ nào chỉ bộ phận dùng để nghe?', 'ears', 'Chúng ta nghe bằng “ears” (đôi tai).', ['eyes', 'nose', 'mouth']),
];

const BODY_MULTI = [
  multiFact('Chọn các từ chỉ bộ phận trên khuôn mặt.', ['eye', 'nose'], ['leg', 'hand'], '“Eye” và “nose” ở trên mặt.'),
  multiFact('Chọn các từ chỉ bộ phận ở tay.', ['hand', 'finger'], ['foot', 'head'], '“Hand” và “finger” thuộc bàn tay.'),
  multiFact('Chọn các từ chỉ bộ phận ở chân.', ['leg', 'foot'], ['arm', 'ear'], '“Leg” và “foot” thuộc phần chân.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['hair – tóc', 'mouth – miệng'], ['nose – tai', 'hand – chân'], '“Hair” là tóc, “mouth” là miệng; “nose” là mũi, “hand” là tay.'),
];

const BODY_TF = [
  tf('“Eye” nghĩa là “con mắt”.', true, 'Đúng, “eye” là con mắt.'),
  tf('“Leg” nghĩa là “cánh tay”.', false, 'Sai, “leg” là cái chân; cánh tay là “arm”.'),
  tf('“Hand” là “bàn tay”.', true, 'Đúng, “hand” là bàn tay.'),
  tf('“Hair” là “cái mũi”.', false, 'Sai, “hair” là tóc; cái mũi là “nose”.'),
];

const BODY_FILL = [
  fill('Điền từ tiếng Anh: “I have two ___.” (mắt)', ['eyes', 'eye'], '“Eyes” là đôi mắt.'),
  fill('Điền từ tiếng Anh: “I hear with my ___.” (tai)', ['ears', 'ear'], '“Ears” là đôi tai.'),
  fill('Điền từ tiếng Anh: “I smell with my ___.” (mũi)', ['nose'], '“Nose” là cái mũi.'),
  fill('Điền từ tiếng Anh: “I clap with my ___.” (bàn tay)', ['hands', 'hand'], '“Hands” là bàn tay.'),
  fill('Điền từ tiếng Anh: “I walk with my ___.” (đôi chân)', ['feet', 'foot', 'legs'], '“Feet” là đôi chân.'),
];

const body = {
  single(k) { return BODY_SINGLE[k]; },
  multi(k) { return BODY_MULTI[k]; },
  tf(k) { return BODY_TF[k]; },
  fill(k) { return BODY_FILL[k]; },
};

// ===== Đồ ăn =====
const FOOD_SINGLE = [
  fact('“Cơm” trong tiếng Anh là gì?', 'rice', '“Rice” nghĩa là cơm, gạo.', ['bread', 'meat', 'fish']),
  fact('“Bánh mì” trong tiếng Anh là gì?', 'bread', '“Bread” nghĩa là bánh mì.', ['rice', 'cake', 'egg']),
  fact('“Trứng” trong tiếng Anh là gì?', 'egg', '“Egg” nghĩa là quả trứng.', ['meat', 'fish', 'milk']),
  fact('“Thịt” trong tiếng Anh là gì?', 'meat', '“Meat” nghĩa là thịt.', ['fish', 'rice', 'egg']),
  fact('“Cá” trong tiếng Anh là gì?', 'fish', '“Fish” nghĩa là con cá.', ['meat', 'chicken', 'rice']),
  fact('“Sữa” trong tiếng Anh là gì?', 'milk', '“Milk” nghĩa là sữa.', ['water', 'juice', 'rice']),
  fact('“Quả táo” trong tiếng Anh là gì?', 'apple', '“Apple” nghĩa là quả táo.', ['banana', 'orange', 'cake']),
  fact('“Quả chuối” trong tiếng Anh là gì?', 'banana', '“Banana” nghĩa là quả chuối.', ['apple', 'orange', 'bread']),
  fact('“Quả cam” trong tiếng Anh là gì?', 'orange', '“Orange” nghĩa là quả cam.', ['apple', 'banana', 'egg']),
  fact('“Bánh ngọt” trong tiếng Anh là gì?', 'cake', '“Cake” nghĩa là bánh ngọt.', ['bread', 'candy', 'rice']),
  fact('“Kẹo” trong tiếng Anh là gì?', 'candy', '“Candy” nghĩa là kẹo.', ['cake', 'bread', 'milk']),
  fact('Từ nào chỉ một loại đồ uống?', 'milk', '“Milk” là sữa, một loại đồ uống.', ['rice', 'egg', 'apple']),
];

const FOOD_MULTI = [
  multiFact('Chọn các từ chỉ đồ ăn.', ['bread', 'rice'], ['milk', 'water'], '“Bread” và “rice” là đồ ăn; “milk”, “water” là đồ uống.'),
  multiFact('Chọn các từ chỉ đồ uống.', ['milk', 'water'], ['cake', 'fish'], '“Milk” và “water” là đồ uống.'),
  multiFact('Chọn các từ chỉ các loại quả.', ['apple', 'banana'], ['egg', 'bread'], '“Apple” và “banana” là các loại quả.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['rice – cơm', 'egg – trứng'], ['meat – cá', 'milk – bánh mì'], '“Rice” là cơm, “egg” là trứng; “meat” là thịt, “milk” là sữa.'),
];

const FOOD_TF = [
  tf('“Apple” nghĩa là “quả táo”.', true, 'Đúng, “apple” là quả táo.'),
  tf('“Fish” nghĩa là “thịt”.', false, 'Sai, “fish” là con cá; thịt là “meat”.'),
  tf('“Milk” là “sữa”.', true, 'Đúng, “milk” là sữa.'),
  tf('“Candy” là “bánh mì”.', false, 'Sai, “candy” là kẹo; bánh mì là “bread”.'),
];

const FOOD_FILL = [
  fill('Điền từ tiếng Anh: “I eat ___ every morning.” (bánh mì)', ['bread'], '“Bread” là bánh mì.'),
  fill('Điền từ tiếng Anh: “I drink ___.” (sữa)', ['milk'], '“Milk” là sữa.'),
  fill('Điền từ tiếng Anh: “An ___ a day keeps the doctor away.” (quả táo)', ['apple'], '“Apple” là quả táo.'),
  fill('Điền từ tiếng Anh: “I like ___ very much.” (cá)', ['fish'], '“Fish” là con cá.'),
  fill('Điền từ tiếng Anh: “There is some ___ in my bowl.” (cơm)', ['rice'], '“Rice” là cơm.'),
];

const food = {
  single(k) { return FOOD_SINGLE[k]; },
  multi(k) { return FOOD_MULTI[k]; },
  tf(k) { return FOOD_TF[k]; },
  fill(k) { return FOOD_FILL[k]; },
};

// ===== Động từ thường gặp =====
const VERBS_SINGLE = [
  fact('“Chạy” trong tiếng Anh là gì?', 'run', '“Run” nghĩa là chạy.', ['walk', 'jump', 'swim']),
  fact('“Nhảy” trong tiếng Anh là gì?', 'jump', '“Jump” nghĩa là nhảy.', ['run', 'dance', 'draw']),
  fact('“Bơi” trong tiếng Anh là gì?', 'swim', '“Swim” nghĩa là bơi.', ['sing', 'run', 'drink']),
  fact('“Hát” trong tiếng Anh là gì?', 'sing', '“Sing” nghĩa là hát.', ['dance', 'swim', 'read']),
  fact('“Múa, khiêu vũ” trong tiếng Anh là gì?', 'dance', '“Dance” nghĩa là múa, khiêu vũ.', ['sing', 'jump', 'write']),
  fact('“Đọc” trong tiếng Anh là gì?', 'read', '“Read” nghĩa là đọc.', ['write', 'draw', 'eat']),
  fact('“Viết” trong tiếng Anh là gì?', 'write', '“Write” nghĩa là viết.', ['read', 'draw', 'play']),
  fact('“Vẽ” trong tiếng Anh là gì?', 'draw', '“Draw” nghĩa là vẽ.', ['write', 'read', 'cook']),
  fact('“Chơi” trong tiếng Anh là gì?', 'play', '“Play” nghĩa là chơi.', ['eat', 'drink', 'sleep']),
  fact('“Ăn” trong tiếng Anh là gì?', 'eat', '“Eat” nghĩa là ăn.', ['drink', 'cook', 'read']),
  fact('“Uống” trong tiếng Anh là gì?', 'drink', '“Drink” nghĩa là uống.', ['eat', 'swim', 'sleep']),
  fact('“Ngủ” trong tiếng Anh là gì?', 'sleep', '“Sleep” nghĩa là ngủ.', ['walk', 'run', 'play']),
];

const VERBS_MULTI = [
  multiFact('Chọn các từ chỉ hoạt động vận động.', ['run', 'jump'], ['read', 'sleep'], '“Run” và “jump” là vận động.'),
  multiFact('Chọn các từ chỉ hoạt động học tập.', ['read', 'write'], ['swim', 'dance'], '“Read” và “write” là hoạt động học tập.'),
  multiFact('Chọn các từ chỉ hoạt động vui chơi, giải trí.', ['sing', 'dance'], ['eat', 'drink'], '“Sing” và “dance” là hoạt động vui chơi.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['swim – bơi', 'cook – nấu ăn'], ['draw – chạy', 'sleep – hát'], '“Swim” là bơi, “cook” là nấu ăn; “draw” là vẽ, “sleep” là ngủ.'),
];

const VERBS_TF = [
  tf('“Run” nghĩa là “chạy”.', true, 'Đúng, “run” là chạy.'),
  tf('“Sing” nghĩa là “nhảy”.', false, 'Sai, “sing” là hát; nhảy là “jump/dance”.'),
  tf('“Read” là “đọc”.', true, 'Đúng, “read” là đọc.'),
  tf('“Sleep” là “ăn”.', false, 'Sai, “sleep” là ngủ; ăn là “eat”.'),
];

const VERBS_FILL = [
  fill('Điền từ tiếng Anh: “I ___ a book every day.” (đọc)', ['read'], '“Read” là đọc.'),
  fill('Điền từ tiếng Anh: “We ___ in the pool.” (bơi)', ['swim'], '“Swim” là bơi.'),
  fill('Điền từ tiếng Anh: “I ___ milk in the morning.” (uống)', ['drink'], '“Drink” là uống.'),
  fill('Điền từ tiếng Anh: “She can ___ very well.” (hát)', ['sing'], '“Sing” là hát.'),
  fill('Điền từ tiếng Anh: “They ___ football after school.” (chơi)', ['play'], '“Play” là chơi.'),
];

const verbs = {
  single(k) { return VERBS_SINGLE[k]; },
  multi(k) { return VERBS_MULTI[k]; },
  tf(k) { return VERBS_TF[k]; },
  fill(k) { return VERBS_FILL[k]; },
};

// ===== Chào hỏi và giới thiệu =====
const GREETINGS_SINGLE = [
  fact('Câu nào dùng để chào buổi sáng?', 'Good morning', '“Good morning” là chào buổi sáng.', ['Good night', 'Goodbye', 'Good afternoon']),
  fact('Câu nào dùng để chào buổi tối?', 'Good evening', '“Good evening” là chào buổi tối.', ['Good morning', 'Good afternoon', 'Goodbye']),
  fact('“Hello” nghĩa là gì?', 'Xin chào', '“Hello” là lời chào.', ['Tạm biệt', 'Cảm ơn', 'Xin lỗi']),
  fact('“Goodbye” nghĩa là gì?', 'Tạm biệt', '“Goodbye” là lời tạm biệt.', ['Xin chào', 'Cảm ơn', 'Mời bạn']),
  fact('Câu nào dùng để hỏi tên?', 'What is your name?', 'Câu này hỏi tên của bạn.', ['How old are you?', 'How are you?', 'Where are you from?']),
  fact('Câu nào dùng để trả lời khi được hỏi tên?', 'My name is Lan.', 'Câu này giới thiệu tên mình.', ['I am fine.', 'I am nine.', 'I am from Viet Nam.']),
  fact('“How are you?” nghĩa là gì?', 'Bạn có khỏe không?', 'Câu này dùng để hỏi thăm sức khỏe.', ['Bạn tên là gì?', 'Bạn bao nhiêu tuổi?', 'Bạn đến từ đâu?']),
  fact('“Nice to meet you.” nghĩa là gì?', 'Rất vui được gặp bạn.', 'Câu này dùng khi lần đầu gặp ai.', ['Tạm biệt bạn.', 'Cảm ơn bạn.', 'Xin lỗi bạn.']),
  fact('Câu nào dùng để cảm ơn?', 'Thank you.', '“Thank you” là lời cảm ơn.', ['Sorry.', 'Please.', 'Goodbye.']),
  fact('Câu nào dùng để xin lỗi?', 'I am sorry.', '“I am sorry” là lời xin lỗi.', ['Thank you.', 'Hello.', 'Good night.']),
  fact('Câu nào dùng để chào tạm biệt trước khi ra về?', 'Goodbye. See you tomorrow.', 'Đây là lời chào tạm biệt.', ['Good morning.', 'How are you?', 'What is your name?']),
  fact('“How old are you?” dùng để hỏi điều gì?', 'Tuổi của bạn', 'Câu này hỏi tuổi.', ['Tên của bạn', 'Trường của bạn', 'Màu bạn thích']),
];

const GREETINGS_MULTI = [
  multiFact('Chọn các câu dùng để chào hỏi.', ['Hello!', 'Good morning!'], ['Thank you.', 'I am sorry.'], '“Hello!” và “Good morning!” là lời chào.'),
  multiFact('Chọn các câu dùng để tạm biệt.', ['Goodbye!', 'See you later!'], ['Good morning!', 'Nice to meet you.'], '“Goodbye!” và “See you later!” dùng khi chia tay.'),
  multiFact('Chọn các câu nói lời cảm ơn hoặc xin lỗi.', ['Thank you.', 'I am sorry.'], ['Hello.', 'My name is Nam.'], '“Thank you” là cảm ơn, “I am sorry” là xin lỗi.'),
  multiFact('Chọn các câu trả lời đúng khi được hỏi “How are you?”', ['I am fine, thank you.', 'I am very well.'], ['My name is Lan.', 'I am nine years old.'], 'Hai câu đầu trả lời về sức khỏe.'),
];

const GREETINGS_TF = [
  tf('“Good morning” dùng để chào buổi sáng.', true, 'Đúng, dùng vào buổi sáng.'),
  tf('“Goodbye” dùng để chào khi gặp nhau.', false, 'Sai, “goodbye” dùng khi chia tay; khi gặp nhau dùng “hello”.'),
  tf('“Thank you” dùng để cảm ơn.', true, 'Đúng, “thank you” là cảm ơn.'),
  tf('“What is your name?” dùng để hỏi tuổi.', false, 'Sai, câu đó hỏi tên; hỏi tuổi là “How old are you?”.'),
];

const GREETINGS_FILL = [
  fill('Điền từ còn thiếu: “___ morning, Miss Hoa.”', ['Good'], '“Good morning” là chào buổi sáng.'),
  fill('Điền từ còn thiếu: “My ___ is Nam.”', ['name'], '“My name is Nam” là tôi tên Nam.'),
  fill('Điền từ còn thiếu: “Nice to ___ you.”', ['meet'], 'Cụm “nice to meet you” nghĩa là rất vui được gặp bạn.'),
  fill('Điền từ còn thiếu: “How ___ you?”', ['are'], 'Câu hỏi thăm là “How are you?”.'),
  fill('Điền từ còn thiếu: “I am nine years ___.”', ['old'], '“Years old” dùng để chỉ tuổi.'),
];

const greetings = {
  single(k) { return GREETINGS_SINGLE[k]; },
  multi(k) { return GREETINGS_MULTI[k]; },
  tf(k) { return GREETINGS_TF[k]; },
  fill(k) { return GREETINGS_FILL[k]; },
};

export const ENGLISH_GRADE_2 = {
  'tieng-anh-2-numbers-20': numbers20,
  'tieng-anh-2-school': school,
  'tieng-anh-2-body': body,
  'tieng-anh-2-food': food,
  'tieng-anh-2-verbs': verbs,
  'tieng-anh-2-greetings': greetings,
};
