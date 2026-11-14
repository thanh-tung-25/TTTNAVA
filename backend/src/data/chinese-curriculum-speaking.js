const rows=text=>text.trim().split('\n').map(line=>{const [text,meaning,answer_reference]=line.split('|');return {text,meaning,answer_reference,assessment_notes:'Trả lời đúng ý bằng từ đã học. Chấp nhận thông tin cá nhân và cách diễn đạt hợp lý; đáp án chỉ là ví dụ.'};});
export const curriculumSpeaking={
1:rows(`你是学生？|Bạn là học sinh phải không?|我是学生。
您是老师？|Ngài là giáo viên phải không?|我是老师。
你们是学生？|Các bạn là học sinh phải không?|我们是学生。
他们是老师？|Họ là giáo viên phải không?|他们是老师。
她是经理？|Cô ấy là giám đốc phải không?|她是经理。
他是老板？|Anh ấy là ông chủ phải không?|他是老板。
她们是学生？|Họ (nữ) là học sinh phải không?|她们是学生。
你是经理？|Bạn là giám đốc phải không?|我是学生。
他是老师？|Anh ấy là giáo viên phải không?|他是老师。
她是学生？|Cô ấy là học sinh phải không?|她是学生。`),
2:rows(`你叫什么名字？|Bạn tên là gì?|我叫……。
您贵姓？|Ngài họ gì?|我姓……。
你是哪国人？|Bạn là người nước nào?|我是越南人。
你是学生吗？|Bạn có phải là học sinh không?|我是学生。
他是谁？|Anh ấy là ai?|他是老师。
她是中国人吗？|Cô ấy là người Trung Quốc phải không?|她是中国人。
咖啡贵吗？|Cà phê có đắt không?|咖啡很贵。
烤鸭便宜吗？|Vịt quay có rẻ không?|烤鸭很便宜。
你是老师吗？|Bạn là giáo viên phải không?|我不是老师。我是学生。
他们是哪国人？|Họ là người nước nào?|他们是越南人。`),
3:rows(`你有名片吗？|Bạn có danh thiếp không?|我没有名片。
你认识马先生吗？|Bạn có quen ông Mã không?|我认识马先生。
这是谁的名片？|Đây là danh thiếp của ai?|这是我的名片。
你的身体好吗？|Sức khỏe của bạn có tốt không?|我的身体很好。
这些是什么？|Những cái này là gì?|这些是汉语书。
那些是英语书吗？|Những cuốn kia là sách tiếng Anh phải không?|那些是英语书。
你觉得烤鸭好吃吗？|Bạn thấy vịt quay có ngon không?|我觉得烤鸭很好吃。
你们都很忙吗？|Các bạn đều rất bận phải không?|我们都很忙。
她是你的朋友吗？|Cô ấy là bạn của bạn phải không?|她是我的好朋友。
你认识王女士吗？|Bạn có quen bà Vương không?|我认识王女士。`),
4:rows(`你去哪儿？|Bạn đi đâu?|我去学校。
人民广场远吗？|Quảng trường Nhân dân có xa không?|人民广场很近。
学校离公司远吗？|Trường học có xa công ty không?|学校离公司很近。
你去找谁？|Bạn đi tìm ai?|我去找老师。
超市离学校近吗？|Siêu thị có gần trường không?|超市离学校很近。
你上午去哪儿？|Buổi sáng bạn đi đâu?|我上午去学校。
你下午去公司吗？|Buổi chiều bạn đến công ty phải không?|我下午去公司。
你晚上去电影院吗？|Buổi tối bạn đến rạp chiếu phim phải không?|我晚上去电影院。
多少钱？|Bao nhiêu tiền?|十块钱。
你明白了吗？|Bạn đã hiểu chưa?|我明白了。`),
5:rows(`你想吃什么？|Bạn muốn ăn gì?|我想吃包子。
你喝茶还是牛奶？|Bạn uống trà hay sữa bò?|我喝茶。
你要几碗米饭？|Bạn muốn mấy bát cơm?|我要一碗米饭。
你想买什么水果？|Bạn muốn mua hoa quả gì?|我想买苹果。
这些苹果新鲜吗？|Những quả táo này có tươi không?|这些苹果很新鲜。
牛肉多少钱一斤？|Thịt bò bao nhiêu tiền một cân Trung Quốc?|五十块钱一斤。
你饿了吗？|Bạn đói chưa?|我有点儿饿。
你要一杯奶茶吗？|Bạn muốn một cốc trà sữa phải không?|我要一杯奶茶。
你要买几公斤香蕉？|Bạn muốn mua mấy kilôgam chuối?|我要买两公斤香蕉。
一共多少钱？|Tổng cộng bao nhiêu tiền?|一共十块钱。`),
6:rows(`你在哪儿工作？|Bạn làm việc ở đâu?|我在公司工作。
你现在做什么？|Bây giờ bạn đang làm gì?|我正在学习汉语。
你会说英语吗？|Bạn biết nói tiếng Anh không?|我会说英语。
你在大学学习什么？|Bạn học gì ở đại học?|我在大学学习汉语。
你的手机好吗？|Điện thoại của bạn có tốt không?|我的手机很好。
这是谁的电脑？|Đây là máy tính của ai?|这是我的电脑。
你下班了吗？|Bạn tan làm chưa?|我下班了。
你想去哪里留学？|Bạn muốn đi đâu du học?|我想去中国留学。
汉语难吗？|Tiếng Hán có khó không?|汉语有点儿难。
你可以打电话吗？|Bạn có thể gọi điện không?|我可以打电话。`),
7:rows(`附近有银行吗？|Gần đây có ngân hàng không?|附近有中国银行。
书店在哪里？|Hiệu sách ở đâu?|书店在超市旁边。
中国银行在哪里？|Ngân hàng Trung Quốc ở đâu?|中国银行在公司对面。
你住在哪里？|Bạn sống ở đâu?|我住在学校附近。
你要去邮局做什么？|Bạn đến bưu điện làm gì?|我去邮局寄快递。
银行在左边还是右边？|Ngân hàng ở bên trái hay bên phải?|银行在左边。
从学校到公司远吗？|Từ trường đến công ty có xa không?|从学校到公司很近。
你跟谁一起去市场？|Bạn đi chợ cùng ai?|我跟朋友一起去市场。
这个房间大吗？|Căn phòng này có rộng không?|这个房间很大。
你想去银行取钱吗？|Bạn muốn đến ngân hàng rút tiền phải không?|我想去银行取钱。`),
8:rows(`你的生日是几月几号？|Sinh nhật của bạn là ngày mấy tháng mấy?|我的生日是三月五号。
今天是星期几？|Hôm nay là thứ mấy?|今天是星期五。
你明天有空儿吗？|Ngày mai bạn có rảnh không?|我明天有空儿。
现在是几点？|Bây giờ là mấy giờ?|现在是三点半。
你属什么？|Bạn cầm tinh con gì?|我属龙。
你想休息几小时？|Bạn muốn nghỉ ngơi mấy tiếng?|我想休息一小时。
你去过中国吗？|Bạn đã từng đến Trung Quốc chưa?|我去过中国。
你昨天做什么？|Hôm qua bạn làm gì?|我昨天去看电影了。
这个蛋糕好吃吗？|Chiếc bánh ngọt này có ngon không?|这个蛋糕很好吃。
你下个星期有空儿吗？|Tuần sau bạn có rảnh không?|我下个星期有空儿。`),
9:rows(`你喜欢中国电影还是美国电影？|Bạn thích phim Trung Quốc hay phim Mỹ?|我喜欢中国电影。
你怎么去学校？|Bạn đến trường bằng cách nào?|我坐公交车去学校。
你会骑自行车吗？|Bạn biết đi xe đạp không?|我会骑自行车。
今天的天气怎么样？|Thời tiết hôm nay thế nào?|今天是晴天。
你喜欢下雨天吗？|Bạn có thích những ngày trời mưa không?|我不喜欢下雨天。
这个菜好吃吗？|Món ăn này có ngon không?|这个菜很好吃。
这杯茶好喝吗？|Cốc trà này có ngon không?|这杯茶很好喝。
你会开车吗？|Bạn biết lái xe không?|我会开车。
你想跟谁一起打球？|Bạn muốn chơi bóng cùng ai?|我想跟朋友一起打球。
你每天早上跑步吗？|Bạn có chạy bộ mỗi sáng không?|我每天早上跑步。`),
10:rows(`你家有几口人？|Gia đình bạn có mấy người?|我家有四口人。
你爸爸做什么工作？|Bố bạn làm nghề gì?|我爸爸是工人。
你妈妈是医生吗？|Mẹ bạn là bác sĩ phải không?|我妈妈是医生。
你弟弟今年多大？|Năm nay em trai bạn bao nhiêu tuổi?|我弟弟今年十岁。
这是谁的照片？|Đây là ảnh của ai?|这是我们全家的照片。
你家有狗吗？|Nhà bạn có chó không?|我家有一只狗。
你每天几点起床？|Mỗi ngày bạn thức dậy lúc mấy giờ?|我每天七点起床。
你姐姐现在做什么？|Bây giờ chị gái bạn làm gì?|我姐姐正在洗衣服。
这只猫可爱吗？|Con mèo này có đáng yêu không?|这只猫很可爱。
你什么时候睡觉？|Bạn đi ngủ lúc mấy giờ?|我晚上十点睡觉。`),
};
