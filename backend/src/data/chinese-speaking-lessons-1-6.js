// Reviewed oral-answer questions based on the vocabulary and dialogue sources
// already published in HSK 1, lessons 1–6. References/criteria are teacher-only.
const common='Chấp nhận câu trả lời hợp lý khác ví dụ và cách nói rút gọn tự nhiên. Không suy đoán hoàn cảnh thật của người nói; ví dụ không phải đáp án duy nhất.';
const q=(text,meaning,answer_reference,criteria)=>({text,meaning,answer_reference,assessment_notes:criteria+' '+common});

export const speakingLessonBanks=[
 {lesson:1,topic:'Chào hỏi và hỏi thăm',focus:['你好','您','好','很','老师','学生','同学','今天','是'],questions:[
  q('你好吗？','Bạn có khỏe không?','我很好，谢谢。 / 我不太好。','Trả lời về sức khỏe của bản thân; chấp nhận khỏe hoặc không khỏe.'),
  q('您好吗？','Thầy/cô, ông/bà có khỏe không?','我很好，谢谢。 / 我也很好。','Nhận biết cách hỏi thăm kính trọng; không bắt buộc lặp lại 您 trong câu trả lời.'),
  q('你今天好吗？','Hôm nay bạn có khỏe không?','我今天很好。 / 我今天不太好。','Trả lời tình trạng hôm nay; có thể dùng 今天 hoặc lược bỏ nếu rõ ngữ cảnh.'),
  q('你们好吗？','Các bạn có khỏe không?','我们很好，谢谢。 / 我们都很好。','Trả lời thay cho nhóm bằng 我们; chấp nhận tình trạng khác ví dụ.'),
  q('老师好吗？','Thầy/cô giáo có khỏe không?','老师很好。 / 老师不太好。','Trả lời về sức khỏe thầy/cô; không yêu cầu biết tình trạng thật của một giáo viên cụ thể.'),
  q('同学们好吗？','Các bạn học có khỏe không?','同学们都很好。 / 他们很好。','Trả lời về các bạn học; chấp nhận 同学们 hoặc đại từ phù hợp.'),
  q('他好吗？','Anh ấy có khỏe không?','他很好。 / 他不太好。','Giữ đúng đối tượng ngôi thứ ba; mọi tình trạng sức khỏe hợp lý đều được chấp nhận.'),
  q('她好吗？','Cô ấy có khỏe không?','她很好。 / 她不太好。','Trả lời về một người nữ; không suy ra lỗi 他/她 chỉ từ bản nhận diện vì hai chữ đồng âm.'),
  q('你是学生吗？','Bạn có phải là học sinh không?','我是学生。 / 是，我是学生。 / 我不是学生。','Trả lời có hoặc không bằng cấu trúc 是 / 不是; không áp đặt nghề nghiệp thật.'),
  q('您是老师吗？','Thầy/cô, anh/chị có phải là giáo viên không?','我不是老师，我是学生。 / 我是老师。','Chấp nhận khẳng định hoặc phủ định phù hợp; câu trả lời có thể giới thiệu mình là học sinh.')
 ]},
 {lesson:2,topic:'Hỏi tên, họ và quốc tịch',focus:['叫','名字','姓','贵姓','哪','国','人','越南','中国','还是'],questions:[
  q('你叫什么名字？','Bạn tên là gì?','我叫李文。 / 我的名字是李文。','Chấp nhận mọi tên tự chọn; không bắt buộc tên trong ví dụ.'),
  q('你姓什么？','Bạn họ gì?','我姓陈。 / 我姓阮。','Nêu họ bằng 姓 hoặc cách trả lời ngắn tự nhiên; mọi họ hợp lý đều được chấp nhận.'),
  q('您贵姓？','Xin hỏi anh/chị họ gì?','我姓王。 / 我姓李。','Nhận biết câu hỏi họ lịch sự; không dùng 我贵姓 để tự xưng.'),
  q('你是哪国人？','Bạn là người nước nào?','我是越南人。 / 我是中国人。','Chấp nhận bất kỳ quốc tịch phù hợp; không mặc định mọi học sinh là người Việt Nam.'),
  q('你是越南人吗？','Bạn có phải là người Việt Nam không?','我是越南人。 / 我不是越南人，我是泰国人。','Chấp nhận có hoặc không; nếu phủ định có thể nêu quốc tịch khác.'),
  q('你是中国人吗？','Bạn có phải là người Trung Quốc không?','我不是中国人，我是越南人。 / 我是中国人。','Chấm cấu trúc 是 / 不是 và cách nói quốc tịch, không kiểm tra thông tin cá nhân thật.'),
  q('你是日本人还是越南人？','Bạn là người Nhật Bản hay người Việt Nam?','我是越南人。 / 我是日本人。 / 我都不是，我是泰国人。','Chấp nhận chọn một phương án hoặc trả lời quốc tịch thứ ba; không dùng 吗 sau câu lựa chọn.'),
  q('你叫小明吗？','Bạn có tên là Tiểu Minh không?','我不叫小明，我叫李文。 / 我叫小明。','Chấp nhận tên khác và cách phủ định 不叫; không chấm sai vì khác tên mẫu.'),
  q('你姓王吗？','Bạn có họ Vương không?','我不姓王，我姓陈。 / 我姓王。','Chấp nhận có hoặc không, chú ý 姓 / 不姓; mọi họ khác đều được chấp nhận.'),
  q('你们都是学生吗？','Các bạn đều là học sinh phải không?','我们都是学生。 / 我们不都是学生。','Chấp nhận 都是, 不都是 hoặc cách diễn đạt phù hợp với nhóm; không áp đặt đáp án khẳng định.')
 ]},
 {lesson:3,topic:'Làm quen, bạn bè và danh thiếp',focus:['认识','高兴','朋友','名片','有','没有','谁','的','忙','觉得'],questions:[
  q('认识新朋友，你高兴吗？','Bạn có vui khi làm quen với bạn mới không?','认识新朋友，我很高兴。 / 我很高兴。','Trả lời cảm nhận khi làm quen; chấp nhận nhiều cách diễn đạt, không ép phải có 也.'),
  q('你有名片吗？','Bạn có danh thiếp không?','我没有名片。 / 我有名片。','Trả lời có hoặc không bằng 有 / 没有; học sinh không có danh thiếp vẫn trả lời đúng.'),
  q('你有没有汉语书？','Bạn có sách tiếng Trung không?','我有汉语书。 / 我没有汉语书。','Nhận biết câu hỏi 有没有; chấp nhận cả khẳng định và phủ định.'),
  q('这是谁的名片？','Đây là danh thiếp của ai?','这是我的名片。 / 这是老师的名片。','Không có hình hoặc danh thiếp cố định; chấp nhận mọi chủ sở hữu tự chọn hợp lý với 的.'),
  q('那是谁的书？','Kia là sách của ai?','那是我的书。 / 那是我朋友的书。','Chấp nhận chủ sở hữu tự chọn; kiểm tra quan hệ sở hữu, không áp đặt tên người.'),
  q('你的朋友叫什么名字？','Bạn của bạn tên là gì?','我的朋友叫李文。 / 她叫小丽。','Chấp nhận mọi tên và giới tính phù hợp; có thể dùng 我的朋友, 他 hoặc 她.'),
  q('你认识王老师吗？','Bạn có quen thầy/cô Vương không?','我认识王老师。 / 我不认识王老师。','Chấp nhận 认识 / 不认识; không đòi người học thật sự quen một giáo viên tên Vương.'),
  q('你今天忙吗？','Hôm nay bạn có bận không?','我今天很忙。 / 我今天不忙。','Chấp nhận bận hoặc không bận; chú ý 很忙 / 不忙.'),
  q('你的朋友忙不忙？','Bạn của bạn có bận không?','我的朋友很忙。 / 他不忙。','Trả lời về bạn của mình với 忙 hoặc 不忙; không lặp cả câu hỏi A不A làm đáp án.'),
  q('你觉得烤鸭好吃吗？','Bạn thấy vịt quay có ngon không?','我觉得烤鸭很好吃。 / 我觉得烤鸭不好吃。','Chấp nhận các ý kiến khác nhau; đây là ý kiến cá nhân, không có một đánh giá ngon/dở bắt buộc.')
 ]},
 {lesson:4,topic:'Đi đâu, phương tiện, khoảng cách và tiền đi lại',focus:['去','哪儿','学校','人民广场','坐','地铁','离','远','近','多少钱'],questions:[
  q('你去哪儿？','Bạn đi đâu?','我去学校。 / 我去人民广场。','Chấp nhận mọi địa điểm hợp lý, dùng 去 + địa điểm hoặc câu trả lời ngắn rõ nghĩa.'),
  q('你去学校吗？','Bạn có đi đến trường không?','我去学校。 / 我不去学校，我去超市。','Chấp nhận có hoặc không và địa điểm khác; không ép học sinh đi đến một nơi cố định.'),
  q('你下午去哪儿？','Buổi chiều bạn đi đâu?','我下午去公园。 / 我去超市。','Nêu địa điểm định đi buổi chiều; có thể lược bỏ 下午 khi rõ ngữ cảnh.'),
  q('你坐地铁去学校吗？','Bạn có đi tàu điện ngầm đến trường không?','我坐地铁去学校。 / 我不坐地铁，我坐公共汽车。','Chấp nhận mọi phương tiện phù hợp hoặc phủ định; không kiểm tra thói quen đi lại thật.'),
  q('你去公司还是去超市？','Bạn đến công ty hay đến siêu thị?','我去超市。 / 我去公司。 / 我都不去，我去学校。','Chấp nhận một trong hai nơi hoặc địa điểm thứ ba, không ép người học phải đi làm.'),
  q('学校离人民广场远吗？','Trường học có xa Quảng trường Nhân Dân không?','学校离人民广场很远。 / 不远，很近。','Không có bản đồ cố định; chấp nhận xa hoặc gần, chấm cách diễn đạt khoảng cách.'),
  q('你家离学校远不远？','Nhà bạn có xa trường không?','我家离学校不远。 / 我家离学校很远。','Trả lời khái quát xa/gần; không yêu cầu địa chỉ thật hoặc khoảng cách chính xác.'),
  q('你知道人民广场吗？','Bạn có biết Quảng trường Nhân Dân không?','我知道。 / 我不知道人民广场。','Chấp nhận 知道 / 不知道; không bắt buộc đã từng đến địa điểm này.'),
  q('从学校到人民广场，大概多少钱？','Từ trường đến Quảng trường Nhân Dân khoảng bao nhiêu tiền?','大概二十块。 / 大概三十块钱。','Đây là tình huống giả định không có bảng giá; chấp nhận số tiền tự chọn hợp lý kèm đơn vị, không buộc đúng số mẫu.'),
  q('到学校了吗？','Đã đến trường chưa?','到学校了。 / 还没到。','Chấp nhận đã đến hoặc chưa đến; chú ý cách trả lời về việc đã hoàn thành với 了.')
 ]},
 {lesson:5,topic:'Gọi món, đồ uống và số lượng',focus:['要','想','吃','喝','还是','碗','杯','还','饿','一共'],questions:[
  q('你要吃什么？','Bạn muốn ăn gì?','我要吃牛肉和青菜。 / 我要一碗米饭。','Chấp nhận mọi món ăn hợp lý; không buộc chọn thịt bò hoặc rau như ví dụ.'),
  q('你想喝什么？','Bạn muốn uống gì?','我想喝茶。 / 我想喝牛奶。','Chấp nhận mọi đồ uống hợp lý; phân biệt động từ 喝 với 吃.'),
  q('你喝茶还是咖啡？','Bạn uống trà hay cà phê?','我喝茶。 / 我喝咖啡。 / 我都不喝，我喝牛奶。','Chấp nhận một lựa chọn hoặc đồ uống thứ ba; câu lựa chọn không thêm 吗.'),
  q('你要几碗米饭？','Bạn muốn mấy bát cơm?','我要一碗米饭。 / 我要两碗米饭。','Chấp nhận số lượng tự chọn với lượng từ 碗; chú ý 两碗 thay cho 二碗 trong cách nói thông thường.'),
  q('你要几杯奶茶？','Bạn muốn mấy cốc trà sữa?','我要一杯奶茶。 / 我要两杯奶茶。','Chấp nhận số lượng tự chọn với 杯, hoặc trả lời không muốn uống trà sữa.'),
  q('你还要什么？','Bạn còn muốn thêm gì nữa?','我还要一个包子。 / 我不要别的了。','Chấp nhận gọi thêm món/đồ uống hoặc nói không cần thêm; không ép phải gọi thêm.'),
  q('你饿吗？','Bạn có đói không?','我很饿。 / 我不饿。','Chấp nhận đói hoặc không đói; trả lời đúng tình trạng, không suy đoán cảm giác thật.'),
  q('你吃饱了吗？','Bạn đã ăn no chưa?','我吃饱了。 / 我还没吃饱。','Chấp nhận đã no hoặc chưa no; phân biệt 饱 với 饿.'),
  q('这个菜辣不辣？','Món này có cay không?','这个菜有点儿辣。 / 这个菜不辣。','Không có món ăn cố định; chấp nhận cay hoặc không cay, dùng đúng từ chỉ vị.'),
  q('一共多少钱？','Tổng cộng bao nhiêu tiền?','一共五十块。 / 一共三十块钱。','Không có hóa đơn hay giá cố định; chấp nhận tổng tiền tự chọn có đơn vị, không bắt buộc số trong ví dụ.')
 ]},
 {lesson:6,topic:'Công việc, nơi học và hoạt động đang diễn ra',focus:['在','工作','学生','学习','汉语','教','英语','会','正在','难'],questions:[
  q('你在哪儿工作？','Bạn làm việc ở đâu?','我在公司工作。 / 我现在不工作，我是学生。','Chấp nhận mọi nơi làm việc hoặc trả lời chưa đi làm, đang là học sinh; không ép học sinh phải có nghề.'),
  q('你是学生还是老师？','Bạn là học sinh hay giáo viên?','我是学生。 / 我是老师。 / 我都不是，我在公司工作。','Chấp nhận lựa chọn phù hợp hoặc vai trò khác; không kiểm chứng nghề nghiệp thật.'),
  q('你在哪儿学汉语？','Bạn học tiếng Trung ở đâu?','我在学校学汉语。 / 我在家学汉语。','Chấp nhận nơi học tự chọn; chú ý 在 + nơi chốn đứng trước 学汉语.'),
  q('你的朋友做什么工作？','Bạn của bạn làm nghề gì?','我的朋友是医生。 / 他是学生，还没有工作。','Chấp nhận mọi nghề hợp lý hoặc bạn cũng là học sinh, chưa đi làm; không ép theo nghề trong ví dụ.'),
  q('你的老师教汉语还是教英语？','Thầy/cô của bạn dạy tiếng Trung hay tiếng Anh?','我的老师教汉语。 / 我的老师教英语。 / 我的老师教两种语言。','Chấp nhận một ngôn ngữ, cả hai hoặc ngôn ngữ khác; chú ý dùng 教 thay vì 叫 theo nghĩa dạy.'),
  q('你会说汉语吗？','Bạn có biết nói tiếng Trung không?','我会说一点儿汉语。 / 我还不会说汉语。','Chấp nhận biết, biết một ít hoặc chưa biết; chấm cấu trúc 会 + động từ, không chấm trình độ phát âm.'),
  q('你现在在哪儿？','Bây giờ bạn đang ở đâu?','我现在在学校。 / 我在家。','Chấp nhận địa điểm khái quát; không yêu cầu hoặc đối chiếu địa chỉ thật.'),
  q('你现在做什么？','Bây giờ bạn đang làm gì?','我正在学汉语。 / 我正在看书。','Chấp nhận hoạt động hợp lý; có thể dùng 正在 / 在 + động từ hoặc cách trả lời tự nhiên khác.'),
  q('你觉得汉语难不难？','Bạn thấy tiếng Trung có khó không?','我觉得汉语有点儿难。 / 我觉得汉语不难。','Chấp nhận các đánh giá khác nhau về độ khó; không có một ý kiến đúng duy nhất.'),
  q('你在大学学习吗？','Bạn có học ở trường đại học không?','我不在大学学习，我在中学学习。 / 我在大学学习。','Chấp nhận mọi cấp học, kể cả tiểu học; chú ý vị trí 在 + nơi học trước 学习 và cách phủ định.')
 ]}
];
