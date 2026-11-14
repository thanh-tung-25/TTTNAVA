// Reviewed sentence pairs. The generator checks every Chinese character in
// prompts and choices against the cumulative user vocabulary through this lesson.
const pairs=text=>text.trim().split('\n').map(line=>{const [hanzi,meaning]=line.split('|');return {hanzi,meaning};});
export const q1QuizApplication={
 1:pairs(`你好！|Xin chào!
您好！|Xin chào ngài! (lịch sự)
老师好！|Chào thầy/cô!
大家好！|Chào mọi người!
你们好！|Chào các bạn!
我是老师。|Tôi là giáo viên.
我是学生。|Tôi là học sinh.
你是老师。|Bạn là giáo viên.
你是学生。|Bạn là học sinh.
他是老师。|Anh ấy là giáo viên.
她是学生。|Cô ấy là học sinh.
我们是学生。|Chúng tôi là học sinh.
你们是老师。|Các bạn là giáo viên.
他们是学生。|Họ là học sinh.
她们是老师。|Họ (nữ) là giáo viên.
我是经理。|Tôi là giám đốc.
他是老板。|Anh ấy là ông chủ.
她是经理。|Cô ấy là giám đốc.
他们是老板。|Họ là những ông chủ.
我们是老师。|Chúng tôi là giáo viên.`),
 2:pairs(`你是哪国人？|Bạn là người nước nào?
我是越南人。|Tôi là người Việt Nam.
他是中国人。|Anh ấy là người Trung Quốc.
她是美国人。|Cô ấy là người Mỹ.
你是日本人吗？|Bạn có phải là người Nhật không?
我是英国人。|Tôi là người Anh.
他们是泰国人。|Họ là người Thái Lan.
你叫什么名字？|Bạn tên là gì?
您贵姓？|Ngài họ gì? (lịch sự)
他是谁？|Anh ấy là ai?
谁是老师？|Ai là giáo viên?
我不是老师。|Tôi không phải là giáo viên.
她不是经理。|Cô ấy không phải là giám đốc.
他很帅。|Anh ấy rất đẹp trai.
她很美。|Cô ấy rất đẹp.
咖啡很贵。|Cà phê rất đắt.
烤鸭很便宜。|Vịt quay rất rẻ.
毛笔很贵。|Bút lông rất đắt.
飞机很新。|Máy bay rất mới.
你呢？|Còn bạn thì sao?`),
 3:pairs(`请进！|Mời vào!
请坐！|Mời ngồi!
这是我的名片。|Đây là danh thiếp của tôi.
那是他的朋友。|Kia là bạn của anh ấy.
我有朋友。|Tôi có bạn bè.
我没有名片。|Tôi không có danh thiếp.
很高兴认识你。|Rất vui được làm quen với bạn.
我们都是学生。|Chúng tôi đều là học sinh.
他们也很忙。|Họ cũng rất bận.
我觉得烤鸭很好吃。|Tôi thấy vịt quay rất ngon.
这些是汉语书。|Những cuốn này là sách tiếng Hán.
那些是英语书。|Những cuốn kia là sách tiếng Anh.
他是我的好朋友。|Anh ấy là bạn thân của tôi.
她是我的女朋友。|Cô ấy là bạn gái của tôi.
对不起！|Xin lỗi!
没关系！|Không sao đâu!
我的身体很好。|Sức khỏe của tôi rất tốt.
我认识马先生。|Tôi quen ông Mã.
这是王女士。|Đây là bà Vương.
请问，您忙吗？|Xin hỏi, ngài có bận không?`),
 4:pairs(`你去哪儿？|Bạn đi đâu?
我去人民广场。|Tôi đi đến Quảng trường Nhân dân.
学校离公司很近。|Trường học ở rất gần công ty.
医院离学校很远。|Bệnh viện ở rất xa trường học.
请问，超市离学校远吗？|Xin hỏi, siêu thị có xa trường học không?
我知道了。|Tôi biết rồi.
我明白了。|Tôi hiểu rồi.
多少钱？|Bao nhiêu tiền?
十块钱。|Mười đồng.
师傅，谢谢！|Cảm ơn bác tài!
不客气！|Không có gì!
再见，老师！|Tạm biệt thầy/cô!
她上午去学校。|Buổi sáng cô ấy đi đến trường.
我下午去公司。|Buổi chiều tôi đi đến công ty.
他晚上去电影院。|Buổi tối anh ấy đi đến rạp chiếu phim.
妹妹去宿舍。|Em gái đi đến ký túc xá.
我去找老师。|Tôi đi tìm thầy/cô.
你下午来吗？|Buổi chiều bạn có đến không?
我有钱。|Tôi có tiền.
不用谢！|Không cần cảm ơn!`),
 5:pairs(`你要吃什么？|Bạn muốn ăn gì?
我要一碗米饭。|Tôi muốn một bát cơm.
你喝茶还是牛奶？|Bạn uống trà hay sữa bò?
我想买两个包子。|Tôi muốn mua hai chiếc bánh bao.
这些苹果很新鲜。|Những quả táo này rất tươi.
我有点儿饿。|Tôi hơi đói.
他很饱。|Anh ấy rất no.
我想喝一杯奶茶。|Tôi muốn uống một cốc trà sữa.
牛肉多少钱一斤？|Thịt bò bao nhiêu tiền một cân Trung Quốc?
一共五十块钱。|Tổng cộng năm mươi đồng.
我还要一点儿米饭。|Tôi còn muốn thêm một chút cơm.
这些水果很便宜。|Những loại hoa quả này rất rẻ.
我要买两公斤香蕉。|Tôi muốn mua hai kilôgam chuối.
她想吃饺子。|Cô ấy muốn ăn sủi cảo.
我要其他的蔬菜。|Tôi muốn các loại rau củ khác.
我想买一本汉语书。|Tôi muốn mua một quyển sách tiếng Hán.
这棵树很大。|Cái cây này rất to.
我想买两本汉语书。|Tôi muốn mua hai quyển sách tiếng Hán.
这是什么水果？|Đây là loại hoa quả gì?
我想喝一杯茶。|Tôi muốn uống một cốc trà.`),
 6:pairs(`你在哪儿工作？|Bạn làm việc ở đâu?
我在苹果公司工作。|Tôi làm việc ở công ty Apple.
她正在看电视。|Cô ấy đang xem ti vi.
我现在去上课。|Bây giờ tôi đi học.
老师教我们汉语。|Thầy/cô dạy chúng tôi tiếng Hán.
他是留学生。|Anh ấy là du học sinh.
我在大学学习英语。|Tôi học tiếng Anh ở trường đại học.
这是我的手机。|Đây là điện thoại di động của tôi.
她的电脑坏了。|Máy tính của cô ấy hỏng rồi.
我会说汉语。|Tôi biết nói tiếng Hán.
你可以看汉语书。|Bạn được phép đọc sách tiếng Hán.
我下班了。|Tôi tan làm rồi.
我在图书馆看书。|Tôi đọc sách ở thư viện.
他的衣服很好看。|Quần áo của anh ấy rất đẹp.
我想去北京留学。|Tôi muốn đến Bắc Kinh du học.
海伦在上海工作。|Helen làm việc ở Thượng Hải.
马文是我的同学。|Marvin là bạn học của tôi.
这是什么地方？|Đây là nơi nào?
汉语很难。|Tiếng Hán rất khó.
你能打电话吗？|Bạn có thể gọi điện thoại không?`),
 7:pairs(`附近有银行吗？|Gần đây có ngân hàng không?
我去邮局寄快递。|Tôi đến bưu điện gửi chuyển phát nhanh.
书店在超市旁边。|Hiệu sách ở bên cạnh siêu thị.
银行就在公司对面。|Ngân hàng ở ngay đối diện công ty.
请往前走。|Xin đi về phía trước.
前面左拐。|Rẽ trái ở phía trước.
然后往右走。|Sau đó đi về bên phải.
我住在学校附近。|Tôi sống ở gần trường học.
我们一起去市场。|Chúng ta cùng đi chợ.
这家商店很大。|Cửa hàng này rất lớn.
我给你送水果。|Tôi mang hoa quả đến cho bạn.
我跟朋友去商场。|Tôi đi trung tâm thương mại cùng bạn.
中国银行在左边。|Ngân hàng Trung Quốc ở bên trái.
酒店在右边。|Khách sạn ở bên phải.
这个房间很好。|Căn phòng này rất tốt.
我在门口接你。|Tôi đón bạn ở cửa ra vào.
房子里面有电脑。|Bên trong ngôi nhà có máy tính.
学校外面有商店。|Bên ngoài trường học có cửa hàng.
从公司到银行很近。|Từ công ty đến ngân hàng rất gần.
我想去银行取钱。|Tôi muốn đến ngân hàng rút tiền.`),
 8:pairs(`你的生日是几月几号？|Sinh nhật của bạn là ngày mấy tháng mấy?
生日快乐！|Chúc mừng sinh nhật!
今天是星期五。|Hôm nay là thứ Sáu.
你明天有空儿吗？|Ngày mai bạn có rảnh không?
我昨天去看电影了。|Hôm qua tôi đã đi xem phim.
这个蛋糕很好吃。|Chiếc bánh ngọt này rất ngon.
我每天学习汉语。|Tôi học tiếng Hán mỗi ngày.
我们下个星期见。|Chúng ta gặp nhau vào tuần sau.
她今年在北京工作。|Năm nay cô ấy làm việc ở Bắc Kinh.
我想休息一小时。|Tôi muốn nghỉ ngơi một tiếng.
你为什么不去学校？|Tại sao bạn không đến trường?
因为我很忙。|Bởi vì tôi rất bận.
她太漂亮了！|Cô ấy quá xinh đẹp!
请介绍你的朋友。|Xin hãy giới thiệu bạn của bạn.
我想跟你聊天。|Tôi muốn trò chuyện với bạn.
她正在看电视剧。|Cô ấy đang xem phim truyền hình.
门票多少钱？|Vé vào cửa bao nhiêu tiền?
我去过中国。|Tôi đã từng đến Trung Quốc.
我属马。|Tôi cầm tinh con ngựa.
现在是三点半。|Bây giờ là ba giờ rưỡi.`),
 9:pairs(`你喜欢中国电影还是美国电影？|Bạn thích phim Trung Quốc hay phim Mỹ?
我坐地铁去公司。|Tôi đi tàu điện ngầm đến công ty.
她骑自行车去学校。|Cô ấy đạp xe đạp đến trường.
我们走路去银行吧。|Chúng ta đi bộ đến ngân hàng nhé.
我想出去玩。|Tôi muốn ra ngoài chơi.
她的衣服又便宜又好看。|Quần áo của cô ấy vừa rẻ vừa đẹp.
今天的天气怎么样？|Thời tiết hôm nay thế nào?
今天是晴天。|Hôm nay trời nắng.
我不喜欢下雨天。|Tôi không thích những ngày trời mưa.
这杯茶很好喝。|Cốc trà này rất ngon.
她说话很好听。|Cô ấy nói chuyện rất hay.
你会开车吗？|Bạn biết lái xe không?
他坐出租车去医院。|Anh ấy đi taxi đến bệnh viện.
我想跟朋友一起打球。|Tôi muốn chơi bóng cùng bạn.
请等一下。|Xin đợi một chút.
这家饭店很有名。|Nhà hàng này rất nổi tiếng.
这个菜很好吃。|Món ăn này rất ngon.
我想去电影院看电影。|Tôi muốn đến rạp chiếu phim xem phim.
我每天早上跑步。|Tôi chạy bộ mỗi sáng sớm.
他喜欢骑马。|Anh ấy thích cưỡi ngựa.`),
 10:pairs(`你家有几口人？|Gia đình bạn có mấy người?
我爸爸是医生。|Bố tôi là bác sĩ.
她妈妈是律师。|Mẹ cô ấy là luật sư.
我弟弟今年十岁。|Năm nay em trai tôi mười tuổi.
这是我们全家的照片。|Đây là ảnh của cả gia đình tôi.
我家有一只狗。|Nhà tôi có một con chó.
这只猫很可爱。|Con mèo này rất đáng yêu.
哥哥正在洗衣服。|Anh trai đang giặt quần áo.
妹妹正在唱歌。|Em gái đang hát.
这是什么时候的照片？|Đây là bức ảnh chụp khi nào?
他在开玩笑。|Anh ấy đang nói đùa.
妈妈生气了。|Mẹ giận rồi.
我想去医院看病。|Tôi muốn đến bệnh viện khám bệnh.
我每天七点起床。|Tôi thức dậy lúc bảy giờ mỗi ngày.
爸爸现在睡觉了。|Bây giờ bố đã ngủ rồi.
姐姐在洗碗。|Chị gái đang rửa bát.
我的家人都很好。|Người nhà của tôi đều rất khỏe.
这张照片是谁的？|Bức ảnh này là của ai?
弟弟很小，但是他会写字。|Em trai còn nhỏ nhưng đã biết viết chữ.
我有时候跟家人一起看电视。|Thỉnh thoảng tôi xem ti vi cùng gia đình.`),
};
