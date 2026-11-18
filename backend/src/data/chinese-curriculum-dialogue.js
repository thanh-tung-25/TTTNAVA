// Context establishes the facts before the question. Distractors stay in the
// same topic and change a person, fact, time, place or quantity; they are not
// arbitrary greetings or equally valid answers to an open personal question.
const rows=text=>text.trim().split('\n').map(line=>{
 const [speech,answer,first,second,reason]=line.split('|');
 return {speech,answer,options:[answer,first,second],reason};
});
export const curriculumDialogue={
 1:rows(`他是老师。她是学生。她是老师？|她是学生。|他是学生。|她是老师。|Câu hỏi nói về cô ấy: cô ấy là học sinh; anh ấy mới là giáo viên.
她是经理。他是老板。他是经理？|他是老板。|她是老板。|他是经理。|Anh ấy là ông chủ; cô ấy là giám đốc. Chú ý 他 và 她.
他们是学生。她们是老师。她们是学生？|她们是老师。|他们是老师。|她们是学生。|Nhóm nữ là giáo viên; nhóm được gọi bằng 他们 là học sinh.
他是学生。她是经理。他是老师？|他是学生。|她是学生。|他是老师。|Anh ấy là học sinh; không đổi sang cô ấy hoặc đổi vai trò thành giáo viên.
她们是经理。他们是老师。他们是经理？|他们是老师。|她们是老师。|他们是经理。|Câu hỏi hỏi nhóm 他们: nhóm này là giáo viên, nhóm 她们 mới là giám đốc.
她是老师。他是老板。她是老板？|她是老师。|他是老师。|她是老板。|Cô ấy là giáo viên; ông chủ là anh ấy.
他们是老板。她们是学生。他们是学生？|他们是老板。|她们是老板。|他们是学生。|Nhóm 他们 là các ông chủ; nhóm 她们 là học sinh.
他是经理。她是老板。她是经理？|她是老板。|他是老板。|她是经理。|Cô ấy là ông chủ; người làm giám đốc là anh ấy.
她们是老师。他们是经理。她们是经理？|她们是老师。|他们是老师。|她们是经理。|Nhóm nữ là giáo viên, còn nhóm 他们 là giám đốc.
她是学生。他是老师。他是学生？|他是老师。|她是老师。|他是学生。|Anh ấy là giáo viên; cô ấy mới là học sinh.`),
 2:rows(`她叫美美。他叫帅帅。她叫什么名字？|她叫美美。|他叫美美。|她叫帅帅。|Câu hỏi hỏi tên cô ấy: 美美; 帅帅 là tên anh ấy.
他是中国人。她是越南人。他是哪国人？|他是中国人。|她是中国人。|他是越南人。|Anh ấy là người Trung Quốc; cô ấy là người Việt Nam.
她是美国人。他是英国人。她是哪国人？|她是美国人。|他是美国人。|她是英国人。|Cô ấy là người Mỹ; anh ấy là người Anh.
他们是学生。她们是老师。谁是老师？|她们是老师。|他们是老师。|她们是学生。|Nhóm nữ là giáo viên; đừng đổi nhóm người hoặc đổi vai trò.
咖啡很贵。烤鸭很便宜。什么很便宜？|烤鸭很便宜。|咖啡很便宜。|烤鸭很贵。|Vịt quay rẻ; cà phê đắt. Câu hỏi hỏi thứ rẻ.
毛笔很新。飞机很旧。什么很新？|毛笔很新。|飞机很新。|毛笔很旧。|Bút lông mới; máy bay cũ. Phân biệt 新 và 旧.
他不是日本人。他是泰国人。他是哪国人？|他是泰国人。|他是日本人。|他不是泰国人。|Thông tin đã phủ định quốc tịch Nhật và xác nhận quốc tịch Thái Lan.
她很美。他很帅。谁很帅？|他很帅。|她很帅。|他很美。|Anh ấy được miêu tả là đẹp trai; câu còn lại nói cô ấy đẹp.
她是老师。她不是经理。她是经理吗？|她不是经理，她是老师。|她是经理，她不是老师。|他不是经理，他是老师。|Đáp lại về đúng cô ấy và giữ đúng ý phủ định: cô ấy là giáo viên.
他们是英国人。她们是美国人。她们是哪国人？|她们是美国人。|他们是美国人。|她们是英国人。|Nhóm nữ là người Mỹ; nhóm 他们 là người Anh.`),
 3:rows(`这是马先生的名片。那是王女士的名片。这是谁的名片？|这是马先生的名片。|这是王女士的名片。|那是马先生的名片。|这 chỉ danh thiếp của ông Mã; 那 chỉ danh thiếp của bà Vương.
马先生有名片，王女士没有名片。谁没有名片？|王女士没有名片。|马先生没有名片。|王女士有名片。|Bà Vương không có danh thiếp; ông Mã có. Không đảo người hoặc phủ định.
这些是汉语书，那些是英语书。那些是什么？|那些是英语书。|那些是汉语书。|这些是英语书。|Câu hỏi hỏi 那些: những cuốn kia là sách tiếng Anh.
她是我的女朋友，他是我的好朋友。他是谁？|他是我的好朋友。|她是我的好朋友。|他是我的女朋友。|Câu hỏi hỏi 他, người bạn thân; 女朋友 nói về cô ấy.
马先生很忙，王女士身体很好。谁很忙？|马先生很忙。|王女士很忙。|马先生身体很好。|Thông tin về bận rộn thuộc ông Mã; sức khỏe tốt thuộc bà Vương.
他认识马先生，不认识王女士。他认识谁？|他认识马先生。|他认识王女士。|他不认识马先生。|Anh ấy quen ông Mã và không quen bà Vương.
他们都是学生，她们都是老师。她们都是学生吗？|她们都是老师。|她们都是学生。|他们都是老师。|Nhóm nữ đều là giáo viên; nhóm 他们 đều là học sinh.
我觉得烤鸭很好吃。她觉得烤鸭不好吃。她觉得烤鸭好吃吗？|她觉得烤鸭不好吃。|她觉得烤鸭很好吃。|我觉得烤鸭不好吃。|Phải trả lời theo ý kiến của cô ấy, không lấy ý kiến của người nói.
这不是我的名片，这是他的名片。这是谁的名片？|这是他的名片。|这是我的名片。|那是他的名片。|Danh thiếp này thuộc anh ấy; 我的 đã bị phủ định và câu hỏi dùng 这.
王女士是他的朋友。马先生是她的朋友。谁是她的朋友？|马先生是她的朋友。|王女士是她的朋友。|马先生是他的朋友。|Câu hỏi hỏi bạn của cô ấy: ông Mã. Phân biệt 他的 và 她的.`),
 4:rows(`他上午去学校，下午去公司。他下午去哪儿？|他下午去公司。|他下午去学校。|他上午去公司。|Buổi chiều anh ấy đi công ty; trường học là nơi đến buổi sáng.
学校离公司很近，医院离公司很远。医院离公司远吗？|医院离公司很远。|医院离公司很近。|学校离公司很远。|Bệnh viện xa công ty; trường học mới gần công ty.
她去人民广场找老师。他去公司找经理。她去找谁？|她去找老师。|她去找经理。|他去找老师。|Cô ấy đi tìm giáo viên; anh ấy đi tìm giám đốc.
他晚上去电影院，妹妹下午去超市。妹妹下午去哪儿？|妹妹下午去超市。|妹妹下午去电影院。|妹妹晚上去超市。|Em gái đi siêu thị vào buổi chiều, không phải rạp phim hay buổi tối.
咖啡十块钱，烤鸭九十块钱。咖啡多少钱？|咖啡十块钱。|咖啡九十块钱。|烤鸭十块钱。|Cà phê giá mười đồng; chín mươi đồng là giá vịt quay.
超市离学校很近，宿舍离学校很远。宿舍离学校近吗？|宿舍离学校很远。|宿舍离学校很近。|超市离学校很远。|Ký túc xá xa trường học; siêu thị mới gần trường học.
她上午来，他下午来。他上午来吗？|他下午来。|他上午来。|她下午来。|Anh ấy đến buổi chiều; cô ấy đến buổi sáng.
马先生去医院，王女士去公司。谁去医院？|马先生去医院。|王女士去医院。|马先生去公司。|Ông Mã đi bệnh viện, còn bà Vương đi công ty.
他知道医院离学校很远，她不知道。谁不知道医院离学校很远？|她不知道医院离学校很远。|他不知道医院离学校很远。|她知道医院离学校很远。|Cô ấy chưa biết bệnh viện xa trường học; anh ấy đã biết thông tin này.
我明白了，他还不明白。谁还不明白？|他还不明白。|我还不明白。|他明白了。|Người chưa hiểu là anh ấy; người nói đã hiểu.`),
 5:rows(`他想吃包子，她想吃饺子。他想吃什么？|他想吃包子。|他想吃饺子。|她想吃包子。|Anh ấy muốn ăn bánh bao, còn cô ấy muốn ăn sủi cảo.
她喝茶，他喝牛奶。她喝什么？|她喝茶。|她喝牛奶。|他喝茶。|Cô ấy uống trà; người uống sữa là anh ấy.
他要两碗米饭，她要一碗米饭。他要几碗米饭？|他要两碗米饭。|他要一碗米饭。|她要两碗米饭。|Anh ấy gọi hai bát; một bát là phần cô ấy gọi.
她买苹果，他买香蕉。他买什么水果？|他买香蕉。|他买苹果。|她买香蕉。|Anh ấy mua chuối; cô ấy mua táo.
这些苹果很新鲜，那些苹果不新鲜。这些苹果新鲜吗？|这些苹果很新鲜。|这些苹果不新鲜。|那些苹果很新鲜。|Những quả táo này tươi; những quả kia không tươi.
牛肉五十块钱一斤，蔬菜十块钱一斤。牛肉多少钱一斤？|牛肉五十块钱一斤。|牛肉十块钱一斤。|蔬菜五十块钱一斤。|Thịt bò năm mươi đồng một cân Trung Quốc; mười đồng là giá rau.
他有点儿饿，她很饱。谁有点儿饿？|他有点儿饿。|她有点儿饿。|他不饿。|Anh ấy hơi đói; cô ấy rất no.
她要一杯奶茶，他要两杯茶。她要什么？|她要一杯奶茶。|她要两杯茶。|他要一杯奶茶。|Cô ấy gọi một cốc trà sữa; hai cốc trà là của anh ấy.
他要两公斤香蕉，她要一公斤香蕉。她要几公斤香蕉？|她要一公斤香蕉。|她要两公斤香蕉。|他要一公斤香蕉。|Cô ấy muốn một kilôgam chuối; anh ấy muốn hai kilôgam.
苹果十块钱，香蕉五块钱，一共十五块钱。一共多少钱？|一共十五块钱。|一共十块钱。|一共五块钱。|Câu hỏi hỏi tổng tiền là mười lăm đồng, không phải giá riêng từng loại.`),
 6:rows(`他在公司工作，她在大学工作。她在哪儿工作？|她在大学工作。|她在公司工作。|他在大学工作。|Cô ấy làm ở đại học; anh ấy làm ở công ty.
他正在看电视，她正在学习汉语。她现在做什么？|她正在学习汉语。|她正在看电视。|他正在学习汉语。|Cô ấy đang học tiếng Hán; người xem ti vi là anh ấy.
他会说英语，不会说汉语。他会说什么？|他会说英语。|他会说汉语。|他不会说英语。|Anh ấy biết nói tiếng Anh và không biết nói tiếng Hán.
她在大学学习汉语，他在大学学习英语。她学习什么？|她学习汉语。|她学习英语。|他学习汉语。|Cô ấy học tiếng Hán; anh ấy học tiếng Anh.
他的手机坏了，她的手机很好。谁的手机坏了？|他的手机坏了。|她的手机坏了。|他的手机很好。|Điện thoại hỏng thuộc anh ấy; điện thoại của cô ấy tốt.
这是马文的电脑，那是海伦的电脑。这是谁的电脑？|这是马文的电脑。|这是海伦的电脑。|那是马文的电脑。|Máy tính này của Marvin; máy tính kia mới của Helen.
他下班了，她还在工作。谁下班了？|他下班了。|她下班了。|他没有下班。|Anh ấy đã tan làm; cô ấy vẫn đang làm việc.
海伦想去北京留学，马文想去上海留学。马文想去哪里留学？|马文想去上海留学。|马文想去北京留学。|海伦想去上海留学。|Marvin muốn du học ở Thượng Hải; Bắc Kinh là nơi Helen muốn đến.
他觉得汉语很难，英语很容易。他觉得什么很难？|他觉得汉语很难。|他觉得英语很难。|他觉得汉语很容易。|Anh ấy thấy tiếng Hán khó, tiếng Anh dễ.
她可以打电话，他现在不可以打电话。谁可以打电话？|她可以打电话。|他可以打电话。|她不可以打电话。|Cô ấy có thể gọi điện; anh ấy hiện không được gọi.`),
 7:rows(`附近有银行，邮局很远。附近有什么？|附近有银行。|附近有邮局。|银行很远。|Ngân hàng ở gần; bưu điện ở xa.
书店在超市旁边，银行在超市对面。书店在哪里？|书店在超市旁边。|书店在超市对面。|银行在超市旁边。|Hiệu sách ở cạnh siêu thị; đối diện siêu thị là ngân hàng.
中国银行在公司左边，邮局在公司右边。中国银行在哪里？|中国银行在公司左边。|中国银行在公司右边。|邮局在公司左边。|Ngân hàng Trung Quốc ở bên trái công ty; bưu điện ở bên phải.
他住在学校附近，她住在公司附近。她住在哪里？|她住在公司附近。|她住在学校附近。|他住在公司附近。|Cô ấy sống gần công ty; anh ấy sống gần trường học.
他去邮局寄快递，她去银行取钱。他去邮局做什么？|他去邮局寄快递。|他去邮局取钱。|她去邮局寄快递。|Anh ấy đến bưu điện gửi chuyển phát nhanh; cô ấy đến ngân hàng rút tiền.
请往前走，然后左拐。往前走，然后往哪儿拐？|然后往左拐。|然后往右拐。|然后往前走。|Đi về phía trước rồi rẽ trái; rẽ phải và tiếp tục đi thẳng không đúng bước tiếp theo.
从学校到银行很近，从公司到银行很远。从公司到银行远吗？|从公司到银行很远。|从公司到银行很近。|从学校到银行很远。|Câu hỏi hỏi từ công ty đến ngân hàng, khoảng cách này xa.
马先生跟朋友去市场，王女士跟老师去市场。王女士跟谁一起去市场？|王女士跟老师一起去市场。|王女士跟朋友一起去市场。|马先生跟老师一起去市场。|Bà Vương đi chợ cùng giáo viên; ông Mã đi cùng bạn.
这个房间很大，那个房间很小。这个房间大吗？|这个房间很大。|这个房间很小。|那个房间很大。|Căn phòng này rộng; căn phòng kia nhỏ.
他去银行取钱，她去银行找朋友。她去银行做什么？|她去银行找朋友。|她去银行取钱。|他去银行找朋友。|Cô ấy đến ngân hàng tìm bạn, còn anh ấy đến rút tiền.`),
 8:rows(`他的生日是三月五号，她的生日是五月三号。她的生日是几月几号？|她的生日是五月三号。|她的生日是三月五号。|她的生日是三月三号。|Sinh nhật cô ấy là ngày ba tháng năm. Chú ý thứ tự tháng trước, ngày sau.
今天是星期五，明天是星期六。明天是星期几？|明天是星期六。|明天是星期五。|今天是星期六。|Ngày mai là thứ Bảy; thứ Sáu là hôm nay.
马文今天有空儿，明天很忙。马文哪天有空儿？|马文今天有空儿。|马文明天有空儿。|马文今天很忙。|Marvin rảnh hôm nay nhưng ngày mai bận.
现在是三点半，不是四点半。现在是几点？|现在是三点半。|现在是四点半。|现在是三点一刻。|Giờ hiện tại là ba giờ rưỡi, không phải bốn giờ rưỡi hay ba giờ mười lăm.
他属龙，她属马。她属什么？|她属马。|她属龙。|他属马。|Cô ấy cầm tinh con ngựa; anh ấy cầm tinh con rồng.
他想休息一小时，她想休息半小时。她想休息几小时？|她想休息半小时。|她想休息一小时。|他想休息半小时。|Cô ấy muốn nghỉ nửa tiếng; một tiếng là thời gian anh ấy muốn nghỉ.
马文去过中国，没有去过日本。马文去过哪国？|马文去过中国。|马文去过日本。|马文没有去过中国。|Marvin đã từng đến Trung Quốc và chưa từng đến Nhật Bản.
她昨天看电影，今天看电视剧。她昨天做什么？|她昨天看电影。|她昨天看电视剧。|她今天看电影。|Hôm qua cô ấy xem phim; xem phim truyền hình là việc hôm nay.
这个蛋糕很好吃，那个蛋糕不好吃。哪个蛋糕好吃？|这个蛋糕很好吃。|那个蛋糕很好吃。|这个蛋糕不好吃。|Chiếc bánh này ngon; chiếc bánh kia không ngon.
他这个星期有空儿，下个星期很忙。他下个星期有空儿吗？|他下个星期很忙。|他下个星期有空儿。|他这个星期很忙。|Tuần sau anh ấy bận; tuần này mới rảnh.`),
 9:rows(`她喜欢中国电影，不喜欢美国电影。她喜欢什么电影？|她喜欢中国电影。|她喜欢美国电影。|她不喜欢中国电影。|Cô ấy thích phim Trung Quốc và không thích phim Mỹ.
他坐公交车去学校，坐地铁去公司。他怎么去学校？|他坐公交车去学校。|他坐地铁去学校。|他坐公交车去公司。|Anh ấy đến trường bằng xe buýt; tàu điện ngầm dùng để đi công ty.
她会骑自行车，不会开车。她会做什么？|她会骑自行车。|她会开车。|她不会骑自行车。|Cô ấy biết đi xe đạp và không biết lái ô tô.
昨天是晴天，今天是阴天。今天天气怎么样？|今天是阴天。|今天是晴天。|昨天是阴天。|Hôm nay trời âm u; hôm qua mới là ngày nắng.
他不喜欢下雨天，她很喜欢下雨天。谁喜欢下雨天？|她喜欢下雨天。|他喜欢下雨天。|她不喜欢下雨天。|Cô ấy thích ngày mưa; anh ấy không thích.
这个菜很好吃，这杯茶不好喝。这杯茶好喝吗？|这杯茶不好喝。|这杯茶很好喝。|这个菜不好吃。|Trà không ngon; thông tin món ăn ngon không trả lời thay cho đồ uống.
这杯茶很好喝，那杯茶不好喝。哪杯茶好喝？|这杯茶很好喝。|那杯茶很好喝。|这杯茶不好喝。|Cốc trà này ngon; cốc trà kia không ngon. Chú ý 这 và 那.
马文会开车，不会骑马。马文会做什么？|马文会开车。|马文会骑马。|马文不会开车。|Marvin biết lái xe và không biết cưỡi ngựa.
他想跟朋友一起打球，她想跟同学一起打球。她想跟谁一起打球？|她想跟同学一起打球。|她想跟朋友一起打球。|他想跟同学一起打球。|Cô ấy muốn chơi bóng cùng bạn học; anh ấy muốn chơi cùng bạn bè.
她每天早上跑步，晚上看电影。她每天早上做什么？|她每天早上跑步。|她每天早上看电影。|她每天晚上跑步。|Cô ấy chạy bộ buổi sáng và xem phim buổi tối.`),
 10:rows(`他家有四口人，她家有五口人。她家有几口人？|她家有五口人。|她家有四口人。|他家有五口人。|Gia đình cô ấy có năm người; gia đình anh ấy có bốn người.
他爸爸是工人，他妈妈是医生。他爸爸做什么工作？|他爸爸是工人。|他爸爸是医生。|他妈妈是工人。|Bố anh ấy là công nhân; mẹ anh ấy là bác sĩ.
她妈妈是律师，她爸爸是医生。她妈妈做什么工作？|她妈妈是律师。|她妈妈是医生。|她爸爸是律师。|Mẹ cô ấy là luật sư; bố cô ấy là bác sĩ.
他弟弟今年十岁，他妹妹今年九岁。他弟弟今年多大？|他弟弟今年十岁。|他弟弟今年九岁。|他妹妹今年十岁。|Em trai anh ấy mười tuổi; em gái chín tuổi.
这是她全家的照片，那是他全家的照片。这是谁的照片？|这是她全家的照片。|这是他全家的照片。|那是她全家的照片。|Bức ảnh này của cả gia đình cô ấy; bức ảnh kia của gia đình anh ấy.
他家有一只狗，没有猫。他家有什么？|他家有一只狗。|他家有一只猫。|他家没有狗。|Nhà anh ấy có một con chó và không có mèo.
他每天七点起床，八点去公司。他每天几点起床？|他每天七点起床。|他每天八点起床。|他每天七点去公司。|Anh ấy thức dậy lúc bảy giờ; tám giờ mới đi công ty.
她姐姐正在洗衣服，哥哥正在洗碗。她姐姐现在做什么？|她姐姐正在洗衣服。|她姐姐正在洗碗。|她哥哥正在洗衣服。|Chị gái cô ấy đang giặt quần áo; anh trai đang rửa bát.
这只猫很可爱，那只猫不可爱。哪只猫很可爱？|这只猫很可爱。|那只猫很可爱。|这只猫不可爱。|Con mèo này đáng yêu; câu đã nói rõ con mèo kia không đáng yêu.
他晚上十点睡觉，她晚上十一点睡觉。她什么时候睡觉？|她晚上十一点睡觉。|她晚上十点睡觉。|他晚上十一点睡觉。|Cô ấy ngủ lúc mười một giờ tối; anh ấy ngủ lúc mười giờ tối.`),
};
