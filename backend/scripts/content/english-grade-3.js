import { fact, fill, multiFact, tf } from './math-utils.js';

// ===== Màu sắc và hình khối =====
const COLORS_SHAPES_SINGLE = [
  fact('“Màu đỏ” trong tiếng Anh là gì?', 'red', '“Red” là màu đỏ.', ['blue', 'green', 'yellow']),
  fact('“Màu xanh dương” trong tiếng Anh là gì?', 'blue', '“Blue” là màu xanh dương.', ['green', 'black', 'red']),
  fact('“Màu xanh lá” trong tiếng Anh là gì?', 'green', '“Green” là màu xanh lá.', ['blue', 'yellow', 'brown']),
  fact('“Màu vàng” trong tiếng Anh là gì?', 'yellow', '“Yellow” là màu vàng.', ['orange', 'white', 'red']),
  fact('“Màu tím” trong tiếng Anh là gì?', 'purple', '“Purple” là màu tím.', ['pink', 'brown', 'blue']),
  fact('“Màu hồng” trong tiếng Anh là gì?', 'pink', '“Pink” là màu hồng.', ['purple', 'red', 'white']),
  fact('“Màu nâu” trong tiếng Anh là gì?', 'brown', '“Brown” là màu nâu.', ['black', 'green', 'orange']),
  fact('“Màu trắng” trong tiếng Anh là gì?', 'white', '“White” là màu trắng.', ['black', 'yellow', 'pink']),
  fact('“Hình tròn” trong tiếng Anh là gì?', 'circle', '“Circle” là hình tròn.', ['square', 'triangle', 'star']),
  fact('“Hình vuông” trong tiếng Anh là gì?', 'square', '“Square” là hình vuông.', ['circle', 'rectangle', 'star']),
  fact('“Hình tam giác” trong tiếng Anh là gì?', 'triangle', '“Triangle” là hình tam giác.', ['rectangle', 'circle', 'square']),
  fact('“Ngôi sao” trong tiếng Anh là gì?', 'star', '“Star” là ngôi sao.', ['circle', 'square', 'triangle']),
];

const COLORS_SHAPES_MULTI = [
  multiFact('Chọn các từ chỉ màu sắc.', ['red', 'yellow'], ['circle', 'square'], '“Red” và “yellow” là màu sắc.'),
  multiFact('Chọn các từ chỉ hình khối.', ['triangle', 'rectangle'], ['blue', 'purple'], '“Triangle” và “rectangle” là hình khối.'),
  multiFact('Chọn các màu thường thấy ở lá cây và bầu trời.', ['green', 'blue'], ['pink', 'brown'], 'Lá cây màu xanh lá, bầu trời màu xanh dương.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['white – trắng', 'black – đen'], ['red – xanh', 'green – vàng'], '“White” là trắng, “black” là đen; “red” là đỏ, “green” là xanh lá.'),
];

const COLORS_SHAPES_TF = [
  tf('“Red” là màu đỏ.', true, 'Đúng, “red” là màu đỏ.'),
  tf('“Blue” là màu vàng.', false, 'Sai, “blue” là xanh dương; vàng là “yellow”.'),
  tf('“Square” là hình vuông.', true, 'Đúng, “square” là hình vuông.'),
  tf('“Circle” là hình tam giác.', false, 'Sai, “circle” là hình tròn; tam giác là “triangle”.'),
];

const COLORS_SHAPES_FILL = [
  fill('Điền màu còn thiếu: “The sun is ___.” (vàng)', ['yellow'], 'Mặt trời màu vàng – “yellow”.'),
  fill('Điền màu còn thiếu: “The leaf is ___.” (xanh lá)', ['green'], 'Lá cây màu xanh lá – “green”.'),
  fill('Điền từ tiếng Anh: “A ___ has three sides.” (hình tam giác)', ['triangle'], '“Triangle” có ba cạnh.'),
  fill('Điền từ tiếng Anh: “My ball is round like a ___.” (hình tròn)', ['circle'], '“Circle” là hình tròn.'),
  fill('Điền màu còn thiếu: “Snow is ___.” (trắng)', ['white'], 'Tuyết màu trắng – “white”.'),
];

const colorsShapes = {
  single(k) { return COLORS_SHAPES_SINGLE[k]; },
  multi(k) { return COLORS_SHAPES_MULTI[k]; },
  tf(k) { return COLORS_SHAPES_TF[k]; },
  fill(k) { return COLORS_SHAPES_FILL[k]; },
};

// ===== Gia đình và ngôi nhà =====
const FAMILY_HOME_SINGLE = [
  fact('“Bố” trong tiếng Anh là gì?', 'father', '“Father” nghĩa là bố.', ['mother', 'brother', 'uncle']),
  fact('“Mẹ” trong tiếng Anh là gì?', 'mother', '“Mother” nghĩa là mẹ.', ['father', 'sister', 'aunt']),
  fact('“Anh trai, em trai” trong tiếng Anh là gì?', 'brother', '“Brother” nghĩa là anh/em trai.', ['sister', 'father', 'baby']),
  fact('“Chị gái, em gái” trong tiếng Anh là gì?', 'sister', '“Sister” nghĩa là chị/em gái.', ['brother', 'mother', 'grandmother']),
  fact('“Ông” trong tiếng Anh là gì?', 'grandfather', '“Grandfather” nghĩa là ông.', ['grandmother', 'father', 'brother']),
  fact('“Bà” trong tiếng Anh là gì?', 'grandmother', '“Grandmother” nghĩa là bà.', ['grandfather', 'mother', 'sister']),
  fact('“Ngôi nhà” trong tiếng Anh là gì?', 'house', '“House” nghĩa là ngôi nhà.', ['garden', 'room', 'school']),
  fact('“Phòng ngủ” trong tiếng Anh là gì?', 'bedroom', '“Bedroom” nghĩa là phòng ngủ.', ['kitchen', 'bathroom', 'garden']),
  fact('“Nhà bếp” trong tiếng Anh là gì?', 'kitchen', '“Kitchen” nghĩa là nhà bếp.', ['bedroom', 'bathroom', 'living room']),
  fact('“Phòng tắm” trong tiếng Anh là gì?', 'bathroom', '“Bathroom” nghĩa là phòng tắm.', ['bedroom', 'kitchen', 'garden']),
  fact('“Phòng khách” trong tiếng Anh là gì?', 'living room', '“Living room” nghĩa là phòng khách.', ['bedroom', 'bathroom', 'kitchen']),
  fact('“Cửa sổ” trong tiếng Anh là gì?', 'window', '“Window” nghĩa là cửa sổ.', ['door', 'wall', 'roof']),
];

const FAMILY_HOME_MULTI = [
  multiFact('Chọn các từ chỉ thành viên trong gia đình.', ['father', 'sister'], ['kitchen', 'window'], '“Father” và “sister” là thành viên gia đình.'),
  multiFact('Chọn các từ chỉ các phòng trong nhà.', ['bedroom', 'kitchen'], ['brother', 'mother'], '“Bedroom” và “kitchen” là các phòng.'),
  multiFact('Chọn các từ chỉ đồ vật, bộ phận của ngôi nhà.', ['door', 'window'], ['father', 'baby'], '“Door” và “window” thuộc ngôi nhà.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['mother – mẹ', 'brother – anh trai'], ['father – bà', 'sister – ông'], '“Mother” là mẹ, “brother” là anh trai; “father” là bố, “sister” là chị gái.'),
];

const FAMILY_HOME_TF = [
  tf('“Mother” nghĩa là “mẹ”.', true, 'Đúng, “mother” là mẹ.'),
  tf('“Brother” nghĩa là “chị gái”.', false, 'Sai, “brother” là anh/em trai; chị/em gái là “sister”.'),
  tf('“Kitchen” là “nhà bếp”.', true, 'Đúng, “kitchen” là nhà bếp.'),
  tf('“Bedroom” là “phòng khách”.', false, 'Sai, “bedroom” là phòng ngủ; phòng khách là “living room”.'),
];

const FAMILY_HOME_FILL = [
  fill('Điền từ tiếng Anh: “This is my ___. She is a teacher.” (mẹ)', ['mother', 'mum', 'mom'], '“Mother” là mẹ.'),
  fill('Điền từ tiếng Anh: “I sleep in the ___.” (phòng ngủ)', ['bedroom'], '“Bedroom” là phòng ngủ.'),
  fill('Điền từ tiếng Anh: “There are five ___ in my family.” (thành viên)', ['members'], '“Members” là các thành viên.'),
  fill('Điền từ tiếng Anh: “We cook in the ___.” (nhà bếp)', ['kitchen'], '“Kitchen” là nhà bếp.'),
  fill('Điền từ tiếng Anh: “Open the ___ to see the garden.” (cửa sổ)', ['window'], '“Window” là cửa sổ.'),
];

const familyHome = {
  single(k) { return FAMILY_HOME_SINGLE[k]; },
  multi(k) { return FAMILY_HOME_MULTI[k]; },
  tf(k) { return FAMILY_HOME_TF[k]; },
  fill(k) { return FAMILY_HOME_FILL[k]; },
};

// ===== Động vật =====
const ANIMALS_SINGLE = [
  fact('“Con mèo” trong tiếng Anh là gì?', 'cat', '“Cat” là con mèo.', ['dog', 'bird', 'pig']),
  fact('“Con chó” trong tiếng Anh là gì?', 'dog', '“Dog” là con chó.', ['cat', 'fish', 'duck']),
  fact('“Con chim” trong tiếng Anh là gì?', 'bird', '“Bird” là con chim.', ['fish', 'cat', 'cow']),
  fact('“Con cá” trong tiếng Anh là gì?', 'fish', '“Fish” là con cá.', ['bird', 'rabbit', 'horse']),
  fact('“Con thỏ” trong tiếng Anh là gì?', 'rabbit', '“Rabbit” là con thỏ.', ['cat', 'dog', 'pig']),
  fact('“Con ngựa” trong tiếng Anh là gì?', 'horse', '“Horse” là con ngựa.', ['cow', 'dog', 'tiger']),
  fact('“Con bò” trong tiếng Anh là gì?', 'cow', '“Cow” là con bò.', ['horse', 'pig', 'lion']),
  fact('“Con lợn” trong tiếng Anh là gì?', 'pig', '“Pig” là con lợn.', ['cow', 'dog', 'duck']),
  fact('“Con gà” trong tiếng Anh là gì?', 'chicken', '“Chicken” là con gà.', ['duck', 'bird', 'cat']),
  fact('“Con vịt” trong tiếng Anh là gì?', 'duck', '“Duck” là con vịt.', ['chicken', 'fish', 'cat']),
  fact('“Con khỉ” trong tiếng Anh là gì?', 'monkey', '“Monkey” là con khỉ.', ['elephant', 'tiger', 'cat']),
  fact('“Con voi” trong tiếng Anh là gì?', 'elephant', '“Elephant” là con voi.', ['tiger', 'monkey', 'horse']),
];

const ANIMALS_MULTI = [
  multiFact('Chọn các từ chỉ động vật sống dưới nước.', ['fish', 'duck'], ['tiger', 'horse'], '“Fish” và “duck” sống ở môi trường nước.'),
  multiFact('Chọn các từ chỉ động vật nuôi trong nhà.', ['cat', 'dog'], ['tiger', 'elephant'], '“Cat” và “dog” là vật nuôi trong nhà.'),
  multiFact('Chọn các từ chỉ động vật to lớn.', ['elephant', 'horse'], ['cat', 'duck'], '“Elephant” và “horse” là động vật to lớn.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['cow – con bò', 'pig – con lợn'], ['bird – con cá', 'rabbit – con ngựa'], '“Cow” là con bò, “pig” là con lợn; “bird” là con chim, “rabbit” là con thỏ.'),
];

const ANIMALS_TF = [
  tf('“Cat” nghĩa là “con mèo”.', true, 'Đúng, “cat” là con mèo.'),
  tf('“Dog” nghĩa là “con chim”.', false, 'Sai, “dog” là con chó; con chim là “bird”.'),
  tf('“Elephant” là “con voi”.', true, 'Đúng, “elephant” là con voi.'),
  tf('“Rabbit” là “con hổ”.', false, 'Sai, “rabbit” là con thỏ; con hổ là “tiger”.'),
];

const ANIMALS_FILL = [
  fill('Điền từ tiếng Anh: “The ___ says meow.” (con mèo)', ['cat'], '“Meow” là tiếng mèo kêu.'),
  fill('Điền từ tiếng Anh: “The ___ can fly.” (con chim)', ['bird'], '“Bird” là con chim.'),
  fill('Điền từ tiếng Anh: “The ___ has a long trunk.” (con voi)', ['elephant'], '“Elephant” có cái vòi dài.'),
  fill('Điền từ tiếng Anh: “A ___ gives us milk.” (con bò)', ['cow'], '“Cow” cho chúng ta sữa.'),
  fill('Điền từ tiếng Anh: “The ___ can swim.” (con cá)', ['fish'], '“Fish” là con cá, bơi được.'),
];

const animals = {
  single(k) { return ANIMALS_SINGLE[k]; },
  multi(k) { return ANIMALS_MULTI[k]; },
  tf(k) { return ANIMALS_TF[k]; },
  fill(k) { return ANIMALS_FILL[k]; },
};

// ===== Đồ ăn và thức uống =====
const FOOD_DRINKS_SINGLE = [
  fact('“Mì” trong tiếng Anh là gì?', 'noodles', '“Noodles” nghĩa là mì.', ['rice', 'soup', 'bread']),
  fact('“Bánh mì kẹp” trong tiếng Anh là gì?', 'sandwich', '“Sandwich” là bánh mì kẹp.', ['cake', 'bread', 'salad']),
  fact('“Súp” trong tiếng Anh là gì?', 'soup', '“Soup” nghĩa là súp.', ['salad', 'sandwich', 'noodles']),
  fact('“Rau trộn” trong tiếng Anh là gì?', 'salad', '“Salad” nghĩa là rau trộn.', ['soup', 'noodles', 'sandwich']),
  fact('“Thịt gà” trong tiếng Anh là gì?', 'chicken', '“Chicken” nghĩa là thịt gà.', ['beef', 'fish', 'pork']),
  fact('“Thịt bò” trong tiếng Anh là gì?', 'beef', '“Beef” nghĩa là thịt bò.', ['chicken', 'fish', 'meat']),
  fact('“Nước ép” trong tiếng Anh là gì?', 'juice', '“Juice” nghĩa là nước ép.', ['tea', 'milk', 'water']),
  fact('“Trà” trong tiếng Anh là gì?', 'tea', '“Tea” nghĩa là trà.', ['coffee', 'juice', 'soup']),
  fact('“Cà phê” trong tiếng Anh là gì?', 'coffee', '“Coffee” nghĩa là cà phê.', ['tea', 'juice', 'milk']),
  fact('“Kem” trong tiếng Anh là gì?', 'ice cream', '“Ice cream” nghĩa là kem.', ['chocolate', 'cake', 'candy']),
  fact('“Sô-cô-la” trong tiếng Anh là gì?', 'chocolate', '“Chocolate” nghĩa là sô-cô-la.', ['cake', 'candy', 'ice cream']),
  fact('Từ nào chỉ một loại đồ uống làm từ chanh?', 'lemonade', '“Lemonade” là nước chanh.', ['coffee', 'tea', 'soup']),
];

const FOOD_DRINKS_MULTI = [
  multiFact('Chọn các từ chỉ đồ uống.', ['juice', 'tea'], ['soup', 'sandwich'], '“Juice” và “tea” là đồ uống.'),
  multiFact('Chọn các từ chỉ món ăn.', ['noodles', 'salad'], ['coffee', 'lemonade'], '“Noodles” và “salad” là món ăn.'),
  multiFact('Chọn các món thường dùng khi trời lạnh.', ['soup', 'tea'], ['ice cream', 'lemonade'], 'Món nóng như súp, trà hợp với trời lạnh.'),
  multiFact('Chọn các cặp từ tiếng Anh – tiếng Việt đúng.', ['beef – thịt bò', 'juice – nước ép'], ['tea – cà phê', 'soup – kem'], '“Beef” là thịt bò, “juice” là nước ép; “tea” là trà, “soup” là súp.'),
];

const FOOD_DRINKS_TF = [
  tf('“Juice” nghĩa là “nước ép”.', true, 'Đúng, “juice” là nước ép.'),
  tf('“Tea” nghĩa là “cà phê”.', false, 'Sai, “tea” là trà; cà phê là “coffee”.'),
  tf('“Sandwich” là “bánh mì kẹp”.', true, 'Đúng, “sandwich” là bánh mì kẹp.'),
  tf('“Ice cream” là “sô-cô-la”.', false, 'Sai, “ice cream” là kem; sô-cô-la là “chocolate”.'),
];

const FOOD_DRINKS_FILL = [
  fill('Điền từ tiếng Anh: “I drink ___ in the morning.” (trà)', ['tea'], '“Tea” là trà.'),
  fill('Điền từ tiếng Anh: “Children love ___ on hot days.” (kem)', ['ice cream'], '“Ice cream” là kem.'),
  fill('Điền từ tiếng Anh: “I would like a glass of orange ___.” (nước ép)', ['juice'], '“Juice” là nước ép.'),
  fill('Điền từ tiếng Anh: “We eat ___ with beef for lunch.” (mì)', ['noodles'], '“Noodles” là mì.'),
  fill('Điền từ tiếng Anh: “My mother makes chicken ___.” (súp)', ['soup'], '“Soup” là súp.'),
];

const foodDrinks = {
  single(k) { return FOOD_DRINKS_SINGLE[k]; },
  multi(k) { return FOOD_DRINKS_MULTI[k]; },
  tf(k) { return FOOD_DRINKS_TF[k]; },
  fill(k) { return FOOD_DRINKS_FILL[k]; },
};

// ===== This, that, these, those =====
const THIS_THAT_SINGLE = [
  fact('Chọn từ đúng: “___ is my book.” (quyển sách ở gần)', 'This', 'Danh từ số ít ở gần dùng “this”.', ['These', 'Those', 'That']),
  fact('Chọn từ đúng: “___ are my books.” (nhiều sách ở gần)', 'These', 'Danh từ số nhiều ở gần dùng “these”.', ['This', 'That', 'Those']),
  fact('Chọn từ đúng: “___ is my school.” (ngôi trường ở xa)', 'That', 'Danh từ số ít ở xa dùng “that”.', ['This', 'These', 'Those']),
  fact('Chọn từ đúng: “___ are my friends.” (nhiều bạn ở xa)', 'Those', 'Danh từ số nhiều ở xa dùng “those”.', ['This', 'That', 'These']),
  fact('Từ nào đi với danh từ số ít ở gần?', 'this', '“This” đi với danh từ số ít ở gần.', ['these', 'those', 'them']),
  fact('Từ nào đi với danh từ số nhiều ở gần?', 'these', '“These” đi với danh từ số nhiều ở gần.', ['this', 'that', 'it']),
  fact('Từ nào đi với danh từ số ít ở xa?', 'that', '“That” đi với danh từ số ít ở xa.', ['this', 'these', 'they']),
  fact('Từ nào đi với danh từ số nhiều ở xa?', 'those', '“Those” đi với danh từ số nhiều ở xa.', ['this', 'that', 'these']),
  fact('“This” nghĩa là gì?', 'Cái này', '“This” chỉ vật ở gần, số ít.', ['Cái kia', 'Những cái này', 'Những cái kia']),
  fact('“Those” nghĩa là gì?', 'Những cái kia', '“Those” chỉ nhiều vật ở xa.', ['Cái này', 'Cái kia', 'Những cái này']),
  fact('Chọn câu đúng.', 'This is a pen.', '“This” đi với “is” và danh từ số ít.', ['These is a pen.', 'This are a pen.', 'Those is a pen.']),
  fact('Câu nào đúng khi nói về nhiều vật ở gần?', 'These are my pencils.', '“These” đi với “are” và danh từ số nhiều.', ['This are my pencils.', 'These is my pencils.', 'That are my pencils.']),
];

const THIS_THAT_MULTI = [
  multiFact('Chọn các từ dùng với danh từ số nhiều.', ['these', 'those'], ['this', 'that'], '“These” và “those” dùng với số nhiều.'),
  multiFact('Chọn các từ dùng với danh từ số ít.', ['this', 'that'], ['these', 'those'], '“This” và “that” dùng với số ít.'),
  multiFact('Chọn các từ chỉ vật ở gần người nói.', ['this', 'these'], ['that', 'those'], '“This” và “these” chỉ vật ở gần.'),
  multiFact('Chọn các câu đúng ngữ pháp.', ['This is my bag.', 'Those are my shoes.'], ['These is my bag.', 'That are my shoes.'], '“This” đi với “is”, “those” đi với “are”.'),
];

const THIS_THAT_TF = [
  tf('“This” dùng cho danh từ số ít ở gần.', true, 'Đúng, “this” dùng cho số ít ở gần.'),
  tf('“These” dùng cho danh từ số ít.', false, 'Sai, “these” dùng cho danh từ số nhiều ở gần.'),
  tf('“That” dùng cho danh từ số ít ở xa.', true, 'Đúng, “that” dùng cho số ít ở xa.'),
  tf('“Those is my books.” là câu đúng.', false, 'Sai, đúng phải là “Those are my books.”'),
];

const THIS_THAT_FILL = [
  fill('Điền this hoặc these: “___ is my ruler.”', ['This'], 'Danh từ số ít nên dùng “this”.'),
  fill('Điền this hoặc these: “___ are my crayons.”', ['These'], 'Danh từ số nhiều nên dùng “these”.'),
  fill('Điền that hoặc those: “___ is my house.” (ở xa)', ['That'], 'Số ít ở xa dùng “that”.'),
  fill('Điền that hoặc those: “___ are my shoes.” (ở xa)', ['Those'], 'Số nhiều ở xa dùng “those”.'),
  fill('Điền từ còn thiếu: “___ is my friend, Nam.” (bạn ở gần)', ['This'], 'Bạn ở gần dùng “this”.'),
];

const thisThat = {
  single(k) { return THIS_THAT_SINGLE[k]; },
  multi(k) { return THIS_THAT_MULTI[k]; },
  tf(k) { return THIS_THAT_TF[k]; },
  fill(k) { return THIS_THAT_FILL[k]; },
};

// ===== Thì hiện tại đơn =====
const PRESENT_SIMPLE_SINGLE = [
  fact('Chọn dạng đúng: “I ___ to school every day.” (go)', 'go', 'Chủ ngữ “I” đi với động từ nguyên mẫu “go”.', ['goes', 'going', 'went']),
  fact('Chọn dạng đúng: “She ___ English every day.” (study)', 'studies', '“She” đi với động từ thêm -es, “study” thành “studies”.', ['study', 'studying', 'studied']),
  fact('Chọn dạng đúng: “He ___ football after school.” (play)', 'plays', '“He” đi với “plays”.', ['play', 'playing', 'played']),
  fact('Chọn dạng đúng: “They ___ in Ha Noi.” (live)', 'live', '“They” đi với động từ nguyên mẫu “live”.', ['lives', 'living', 'lived']),
  fact('Chọn dạng đúng: “My mother ___ breakfast at six.” (cook)', 'cooks', '“My mother” là số ít nên dùng “cooks”.', ['cook', 'cooking', 'cooked']),
  fact('Chọn dạng đúng: “We ___ TV in the evening.” (watch)', 'watch', '“We” đi với “watch”.', ['watches', 'watching', 'watched']),
  fact('Chọn dạng đúng: “Nam ___ his homework every day.” (do)', 'does', '“Nam” là số ít nên “do” thành “does”.', ['do', 'doing', 'did']),
  fact('Chọn dạng đúng: “The cat ___ milk.” (like)', 'likes', '“The cat” là số ít nên dùng “likes”.', ['like', 'liking', 'liked']),
  fact('Trạng từ nào thường dùng với thì hiện tại đơn?', 'every day', '“Every day” chỉ việc lặp lại hằng ngày.', ['yesterday', 'now', 'last week']),
  fact('Câu nào ở thì hiện tại đơn?', 'I get up at six o’clock.', 'Câu này diễn tả thói quen hằng ngày.', ['I am getting up now.', 'I got up at six.', 'I will get up at six.']),
  fact('Chọn dạng đúng: “Lan and Hoa ___ good friends.” (be)', 'are', 'Hai người là số nhiều nên dùng “are”.', ['is', 'am', 'be']),
  fact('Chọn dạng đúng: “It ___ rainy today.” (be)', 'is', '“It” đi với “is”.', ['are', 'am', 'be']),
];

const PRESENT_SIMPLE_MULTI = [
  multiFact('Chọn các câu ở thì hiện tại đơn.', ['She goes to school every day.', 'They play football on Sundays.'], ['She is going to school now.', 'They played football yesterday.'], 'Hai câu đầu diễn tả thói quen ở hiện tại.'),
  multiFact('Chọn các trạng từ thường đi với thì hiện tại đơn.', ['always', 'every day'], ['yesterday', 'last night'], '“Always” và “every day” chỉ sự việc lặp lại.'),
  multiFact('Chọn các dạng đúng của động từ khi chủ ngữ là “he, she, it”.', ['goes', 'watches'], ['go', 'watch'], 'Chủ ngữ số ít thêm -s hoặc -es vào động từ.'),
  multiFact('Chọn các câu đúng ngữ pháp.', ['I like apples.', 'He likes apples.'], ['I likes apples.', 'He like apples.'], '“I” đi với “like”, “he” đi với “likes”.'),
];

const PRESENT_SIMPLE_TF = [
  tf('“She goes to school every day.” là câu đúng.', true, 'Đúng, “she” đi với “goes”.'),
  tf('Với chủ ngữ “he”, động từ “play” chia thành “playes”.', false, 'Sai, đúng là “plays”.'),
  tf('“They live in Da Nang.” là câu đúng.', true, 'Đúng, “they” đi với “live”.'),
  tf('Thì hiện tại đơn thường dùng với “yesterday”.', false, 'Sai, “yesterday” dùng với thì quá khứ đơn.'),
];

const PRESENT_SIMPLE_FILL = [
  fill('Chia động từ trong ngoặc: “She ___ (like) ice cream.”', ['likes'], '“She” đi với “likes”.'),
  fill('Chia động từ trong ngoặc: “They ___ (go) to the park on Sundays.”', ['go'], '“They” đi với “go”.'),
  fill('Chia động từ trong ngoặc: “My father ___ (work) in a hospital.”', ['works'], 'Chủ ngữ số ít nên dùng “works”.'),
  fill('Chia động từ trong ngoặc: “We ___ (be) in class 3A.”', ['are'], '“We” đi với “are”.'),
  fill('Chia động từ trong ngoặc: “Mai ___ (watch) TV every evening.”', ['watches'], '“Mai” là số ít nên dùng “watches”.'),
];

const presentSimple = {
  single(k) { return PRESENT_SIMPLE_SINGLE[k]; },
  multi(k) { return PRESENT_SIMPLE_MULTI[k]; },
  tf(k) { return PRESENT_SIMPLE_TF[k]; },
  fill(k) { return PRESENT_SIMPLE_FILL[k]; },
};

export const ENGLISH_GRADE_3 = {
  'tieng-anh-3-colors-shapes': colorsShapes,
  'tieng-anh-3-family-home': familyHome,
  'tieng-anh-3-animals': animals,
  'tieng-anh-3-food-drinks': foodDrinks,
  'tieng-anh-3-this-that': thisThat,
  'tieng-anh-3-present-simple': presentSimple,
};
