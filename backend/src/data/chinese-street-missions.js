const options=labels=>labels.map((label,i)=>({id:'c'+(i+1),label}));
const choice=(id,title,instruction,speech,labels,answer,feedback)=>({id,title,instruction,speech,type:'choice',options:options(labels),answer:'c'+answer,feedback});
const map=(id,title,speech,answer,feedback)=>({id,title,instruction:'Nghe rồi chạm vào đúng địa điểm trên bản đồ.',speech,type:'map',options:[],answer,feedback});
export const streetMissionBank=[
 {number:1,place_id:'school',missions:[
  choice('greeting','Lời chào đầu ngày','Nghe lời chào và chọn câu đáp phù hợp.','你好！',['谢谢！','你好！','再见！'],2,'你好！ là lời chào; con có thể đáp lại bằng 你好！'),
  choice('wellbeing','Hôm nay bạn khỏe không?','Nghe câu hỏi và chọn câu trả lời đúng ý.','你好吗？',['我很好，谢谢！','再见！','不客气！'],1,'你好吗？ hỏi thăm sức khỏe. 我很好，谢谢！ nghĩa là “Mình khỏe, cảm ơn!”.'),
  choice('goodbye','Hẹn gặp lại','Nghe rồi chọn lời đáp khi chia tay.','再见！',['你好！','谢谢！','再见！'],3,'再见！ dùng khi chào tạm biệt. Đáp lại bằng 再见！ nhé.')
 ]},
 {number:2,place_id:'school',missions:[
  choice('name','Người bạn mới','Nghe câu hỏi rồi chọn lời giới thiệu tên.','你叫什么名字？',['我是学生。','我叫小安。','我很好。'],2,'你叫什么名字？ hỏi tên. 我叫小安。 nghĩa là “Mình tên là Tiểu An”.'),
  choice('country','Thẻ quốc tịch','Nghe bạn giới thiệu và chọn quốc tịch của bạn ấy.','你好，我叫小明。我是越南人。',['中国人','美国人','越南人'],3,'Bạn ấy nói 我是越南人。 nghĩa là “Mình là người Việt Nam”.'),
  choice('surname','Bạn họ gì?','Chọn câu trả lời phù hợp với câu vừa nghe.','你姓什么？',['我姓王。','我去学校。','我喝水。'],1,'姓 dùng khi hỏi họ. 我姓王。 nghĩa là “Mình họ Vương”.')
 ]},
 {number:3,place_id:'school',missions:[
  choice('meeting','Rất vui được gặp bạn','Nghe rồi chọn lời đáp tự nhiên.','很高兴认识你！',['我也很高兴。','我去银行。','我吃面条。'],1,'我也很高兴。 là cách đáp “Mình cũng rất vui”.'),
  choice('teacher','Gặp cô giáo','Nghe lời giới thiệu và nhận biết nghề nghiệp.','这是王老师。她是我们的汉语老师。',['学生','老师','医生'],2,'老师 nghĩa là giáo viên. 她是我们的汉语老师。: “Cô ấy là giáo viên tiếng Trung của chúng mình”.'),
  choice('card','Tấm danh thiếp','Nghe rồi chọn chủ nhân của tấm danh thiếp.','这是谁的名片？这是李老师的名片。',['王老师','小安','李老师'],3,'李老师的名片 là danh thiếp của thầy/cô Lý. 的 thể hiện quan hệ sở hữu.')
 ]},
 {number:4,place_id:'park',missions:[
  map('destination','Đi học cùng bạn','我去学校。你也来吧！','school','学校 là trường học. Bạn ấy đang rủ con đến trường.'),
  map('going-home','Tan học rồi!','我现在回家。','home','回家 nghĩa là về nhà. Con đã tìm đúng ngôi nhà trên phố.'),
  choice('where','Bạn đang ở đâu?','Nghe câu hỏi rồi chọn câu nói về vị trí.','你在哪儿？',['我叫小安。','我在学校。','我很好。'],2,'在哪儿？ hỏi “ở đâu?”. 我在学校。 nghĩa là “Mình ở trường”.')
 ]},
 {number:5,place_id:'restaurant',missions:[
  choice('noodles','Gọi món đầu tiên','Nghe khách gọi món và chọn đúng món ăn.','我要吃面条。',['米饭','包子','面条'],3,'面条 là mì. Khách vừa nói muốn ăn mì.'),
  choice('drink','Một món đồ uống','Nghe rồi chọn đúng đồ uống khách muốn.','我不喝茶，我要喝咖啡。',['咖啡','茶','水'],1,'Khách không uống trà (不喝茶), muốn uống cà phê (要喝咖啡).'),
  choice('menu','Đến lượt con gọi món','Nghe người bán hỏi rồi chọn câu trả lời về món ăn.','你要吃什么？',['我是老师。','我要吃米饭。','我去学校。'],2,'你要吃什么？ hỏi muốn ăn gì. 我要吃米饭。 nghĩa là “Mình muốn ăn cơm”.')
 ]},
 {number:6,place_id:'office',missions:[
  choice('job','Đoán nghề nghiệp','Nghe lời giới thiệu rồi chọn đúng nghề.','我在学校工作，我是老师。',['医生','学生','老师'],3,'Bạn ấy làm việc ở trường và nói 我是老师。: “Mình là giáo viên”.'),
  map('workplace','Tìm nơi làm việc','我在中国银行工作。','bank','中国银行 là Ngân hàng Trung Quốc. Bạn ấy làm việc ở ngân hàng.'),
  choice('work','Làm việc ở đâu?','Nghe câu hỏi rồi chọn câu trả lời về nơi làm việc.','你在哪儿工作？',['我在公司工作。','我姓王。','我喜欢喝茶。'],1,'我在公司工作。 nghĩa là “Mình làm việc ở công ty”. 公司 là công ty.')
 ]},
 {number:7,place_id:'bank',missions:[
  map('bank-right','Ngân hàng ở bên nào?','中国银行在饭馆的右边。请找一找。','bank','中国银行在饭馆的右边。: Ngân hàng Trung Quốc ở bên phải nhà hàng. Trên bản đồ, hai nơi nằm cùng một hàng.'),
  map('office-left','Đi theo lời chỉ dẫn','公司在蛋糕店的左边。','office','公司在蛋糕店的左边。: Công ty ở bên trái tiệm bánh. 左边 nghĩa là bên trái.'),
  map('home-right','Tìm nhà của bạn','我家在电影院的右边。','home','我家在电影院的右边。: Nhà mình ở bên phải rạp phim. 右边 nghĩa là bên phải.')
 ]},
 {number:8,place_id:'bakery',missions:[
  choice('birthday','Chọn đúng ngày sinh','Nghe rồi chọn ngày sinh nhật của bạn.','我的生日是三月五号。',['五月三号','三月五号','三月十五号'],2,'三月五号 là ngày 5 tháng 3. 月 chỉ tháng, 号 chỉ ngày.'),
  choice('weekend','Lịch hẹn cuối tuần','Nghe câu hỏi và chọn ngày đúng.','今天是星期六，明天是星期几？',['星期日','星期五','星期六'],1,'Hôm nay là thứ Bảy (星期六), ngày mai là Chủ nhật (星期日).'),
  choice('party','Lời mời sinh nhật','Nghe rồi chọn lời chúc phù hợp.','今天是我的生日。',['早上好！','再见！','生日快乐！'],3,'生日快乐！ nghĩa là “Chúc mừng sinh nhật!”.')
 ]},
 {number:9,place_id:'cinema',missions:[
  choice('movie','Chọn một bộ phim','Nghe câu hỏi rồi chọn câu trả lời nói về sở thích phim.','你喜欢中国电影还是美国电影？',['我在银行工作。','我喜欢中国电影。','我家有三口人。'],2,'还是 nối các lựa chọn trong câu hỏi. 我喜欢中国电影。: “Mình thích phim Trung Quốc”.'),
  choice('preference','Sở thích của bạn','Nghe rồi chọn điều bạn ấy thích.','我不喜欢喝茶，我喜欢喝咖啡。',['咖啡','茶','水'],1,'Bạn ấy thích uống cà phê (喜欢喝咖啡), không thích uống trà (不喜欢喝茶).'),
  choice('invitation','Hẹn đi xem phim','Nghe lời rủ rồi chọn câu đồng ý.','我们星期天去看电影，好吗？',['我是越南人。','我家有四口人。','好啊！'],3,'好啊！ là lời đồng ý “Được chứ!”. 去看电影 nghĩa là đi xem phim.')
 ]},
 {number:10,place_id:'home',missions:[
  choice('family-count','Nhà có mấy người?','Nghe lời giới thiệu rồi chọn số người trong gia đình.','我家有四口人：爸爸、妈妈、姐姐和我。',['三口人','五口人','四口人'],3,'Gia đình có bố, mẹ, chị gái và bạn ấy: 四口人, bốn người.'),
  choice('younger-brother','Em trai của ai?','Nghe rồi nhận biết thành viên gia đình.','这是我弟弟，他是学生。',['弟弟','哥哥','爸爸'],1,'弟弟 là em trai; 哥哥 là anh trai; 爸爸 là bố.'),
  choice('family-question','Kể về gia đình','Nghe câu hỏi rồi chọn câu trả lời đúng ý.','你家有几口人？',['我喜欢中国电影。','我家有三口人。','我在公司工作。'],2,'你家有几口人？ hỏi gia đình có mấy người. 我家有三口人。: “Nhà mình có ba người”.')
 ]}
];
export function streetLessonNumber(lesson){
 if(Number(lesson.level_id)!==1)return null;
 const match=String(lesson.title).match(/Bài\s*(\d+)/iu),number=match?Number(match[1]):Number(lesson.position);
 return streetMissionBank.some(l=>l.number===number)?number:null;
}
export function defaultStreetLesson(lesson){
 const bank=streetMissionBank.find(l=>l.number===streetLessonNumber(lesson));
 return bank?structuredClone({enabled:true,place_id:bank.place_id,missions:bank.missions}):null;
}
