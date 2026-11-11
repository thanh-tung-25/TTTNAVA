// Sentence sets reviewed for the vocabulary and structures of each Q1 lesson.
// Vietnamese | segmented sentence | incorrect sentence | partner's line | error explanation
const sources={
 '你好':`Tôi rất khỏe.|我/很/好/。|我好很。|你好吗？|很 đứng trước tính từ 好.
Chào cô giáo.|老师/，/你好/！|老师，你吗好！|你好！|Lời chào dùng 你好, không chen 吗 vào giữa.
Các bạn khỏe không?|你们/好/吗/？|你们吗好？|我们很好，你们呢？|吗 đứng cuối câu hỏi.
Chúng tôi rất khỏe.|我们/很/好/。|我们好很。|你们好吗？|很 đứng trước 好, sau chủ ngữ 我们.
Tôi cũng rất khỏe.|我/也/很/好/。|我很好也。|我很好，你呢？|也 đứng sau chủ ngữ và trước 很好.
Chào ngài.|您/好/！|您吗好！|你好！|您好 là lời chào kính trọng.
Chào mọi người.|大家/好/！|大好家！|请打个招呼。|大家 là một từ, không tách và chen 好 vào giữa.
Thầy rất khỏe.|老师/很/好/。|老师好很。|老师好吗？|很 đứng trước tính từ 好.
Tôi không khỏe lắm.|我/不/太/好/。|我太不好。|你好吗？|不太好 nghĩa là không khỏe lắm; 不 đứng trước 太.
Học sinh đều rất khỏe.|学生/都/很/好/。|学生很都好。|学生们好吗？|都 đứng sau chủ ngữ, trước 很好.`,
 '你叫什么名字':`Tôi tên là Tiểu Minh.|我/叫/小明/。|我小明叫。|你叫什么名字？|叫 đứng trước tên người.
Bạn tên là gì?|你/叫/什么/名字/？|你什么名字叫？|我叫小明，你想问什么？|Mẫu hỏi tên là 你叫什么名字.
Tôi là người Việt Nam.|我/是/越南人/。|我是人越南。|你是哪国人？|越南人 là người Việt Nam, tên nước đứng trước 人.
Anh ấy là người Trung Quốc.|他/是/中国人/。|他中国人是。|他是哪国人？|是 đứng giữa chủ ngữ và danh từ chỉ quốc tịch.
Cô ấy là học sinh.|她/是/学生/。|她学生是。|她是老师吗？|是 đứng trước 学生.
Tôi không phải giáo viên.|我/不/是/老师/。|我是不老师。|你是老师吗？|不 đứng trước 是 để phủ định.
Bạn có phải người Mỹ không?|你/是/美国人/吗/？|你是吗美国人？|你想问我的国籍吗？|吗 đứng cuối câu hỏi.
Tôi họ Vương.|我/姓/王/。|我王姓。|你姓什么？|姓 đứng trước họ.
Cô ấy tên là Lệ Lệ.|她/叫/丽丽/。|她丽丽叫。|她叫什么名字？|叫 đứng trước tên 丽丽.
Chúng tôi đều là học sinh.|我们/都/是/学生/。|我们是都学生。|你们都是学生吗？|都 đứng trước 是, sau chủ ngữ 我们.`,
 '很高兴认识你':`Đây là danh thiếp của tôi.|这/是/我/的/名片/。|这是我名片的。|这是什么？|的 đứng giữa 我 và 名片 để chỉ sở hữu.
Tôi không có danh thiếp.|我/没有/名片/。|我不有名片。|你有名片吗？|Phủ định của 有 là 没有.
Tôi cũng rất vui.|我/也/很/高兴/。|我很也高兴。|我很高兴，你呢？|也 đứng trước 很高兴.
Anh ấy là bạn của tôi.|他/是/我/的/朋友/。|他是我的朋友的。|他是谁？|我的朋友 đã là cụm danh từ đầy đủ, không thêm 的 cuối câu.
Chúng tôi đều rất bận.|我们/都/很/忙/。|我们很都忙。|你们忙吗？|都 đứng sau chủ ngữ và trước 很忙.
Tôi rất vui được làm quen với bạn.|很/高兴/认识/你/。|很高兴你认识。|认识你我也很高兴！|认识你 là làm quen với bạn, động từ đứng trước tân ngữ.
Đó là danh thiếp của cô giáo.|那/是/老师/的/名片/。|那是老师名片的。|那是谁的名片？|老师的名片 là danh thiếp của cô giáo.
Tôi không quen anh ấy.|我/不/认识/他/。|我认识不他。|你认识他吗？|不 đứng trước động từ 认识.
Đây là bạn gái của tôi.|这/是/我/的/女朋友/。|这是我女朋友的。|这是谁？|的 đứng trước danh từ 女朋友.
Họ đều là người Trung Quốc.|他们/都/是/中国人/。|他们是都中国人。|他们是哪国人？|都 đứng trước 是.`,
 '你去哪儿':`Tôi đi Quảng trường Nhân Dân.|我/去/人民广场/。|我人民广场去。|你去哪儿？|去 đứng trước điểm đến.
Quảng trường Nhân Dân không xa.|人民广场/不/远/。|人民广场远不。|人民广场远吗？|不 đứng trước tính từ 远.
Nhà tôi cách trường rất gần.|我家/离/学校/很/近/。|我家学校离很近。|你家离学校远吗？|Mẫu khoảng cách: A 离 B + tính từ.
Bạn có danh thiếp không?|你/有/没有/名片/？|你有不有名片？|你想问我有没有名片吗？|Dạng chính phản của 有 là 有没有.
Tôi đi tàu điện ngầm đến trường.|我/坐/地铁/去/学校/。|我去坐学校地铁。|你怎么去学校？|坐地铁 nêu phương tiện, 去学校 nêu điểm đến.
Quảng trường Nhân Dân đã đến rồi.|人民广场/到/了/。|人民广场了到。|我们到哪儿了？|了 đứng sau 到 trong 到了.
Anh ấy đi công ty.|他/去/公司/。|他公司去。|他去哪儿？|去 đứng trước 公司.
Tôi biết rồi.|我/知道/了/。|我了知道。|你知道了吗？|了 đứng sau 知道 để biểu thị đã biết.
Trường học cách công ty rất xa.|学校/离/公司/很/远/。|学校公司离很远。|学校离公司近吗？|离 đứng giữa hai địa điểm.
Tôi đi bệnh viện.|我/去/医院/。|我医院去。|你去哪儿？|去医院 là đi bệnh viện.`,
 '你要吃什么':`Tôi muốn hai bát cơm.|我/要/两/碗/米饭/。|我要二碗米饭。|你要几碗米饭？|Trước lượng từ 碗 dùng 两 để chỉ hai bát.
Tôi muốn một cốc trà.|我/要/一/杯/茶/。|我要一本茶。|你要喝什么？|Đồ uống trong cốc dùng lượng từ 杯.
Món này hơi cay.|这个/菜/有点儿/辣/。|这个菜一点儿辣。|这个菜怎么样？|有点儿 đứng trước tính từ.
Tôi muốn thịt bò và rau xanh.|我/要/牛肉/和/青菜/。|我要牛肉青菜和。|你要吃什么？|和 đứng giữa hai danh từ được nối.
Bạn uống trà hay cà phê?|你/喝/茶/还是/咖啡/？|你喝茶还是咖啡吗？|你想问我喝哪种饮料吗？|Câu hỏi lựa chọn dùng 还是 và không thêm 吗.
Tôi còn muốn một bánh bao.|我/还/要/一/个/包子/。|我要还一个包子。|你还要什么？|还 đứng trước 要.
Tôi rất đói.|我/很/饿/。|我是很饿。|你饿吗？|Tính từ làm vị ngữ trong mẫu này không cần 是.
Tôi muốn hai cốc trà sữa.|我/要/两/杯/奶茶/。|我要两本奶茶。|你要什么饮料？|Trà sữa dùng lượng từ 杯.
Tổng cộng năm mươi tệ.|一共/五十/块/。|五十一共块。|一共多少钱？|一共 đứng trước tổng số tiền.
Tôi không muốn uống cà phê.|我/不/想/喝/咖啡/。|我想不喝咖啡。|你想喝咖啡吗？|不想喝 là không muốn uống; 不 đứng trước 想.`,
 '你在哪儿工作':`Tôi làm việc ở công ty Apple.|我/在/苹果公司/工作/。|我在工作苹果公司。|你在哪儿工作？|在 + địa điểm đứng trước động từ 工作.
Anh ấy đang xem tivi.|他/正在/看/电视/。|他看正在电视。|他现在做什么？|正在 đứng trước động từ 看.
Tôi không học tiếng Hán ở đây.|我/不/在/这儿/学/汉语/。|我在不这儿学汉语。|你在这儿学汉语吗？|不 đứng trước 在.
Anh ấy dạy tiếng Anh ở đại học.|他/在/大学/教/英语/。|他在大学叫英语。|他做什么工作？|教 jiāo là dạy, khác 叫 jiào là gọi.
Tôi là du học sinh.|我/是/留学生/。|我留学生是。|你是留学生吗？|是 đứng trước danh từ 留学生.
Cô ấy là giáo viên trung học.|她/是/中学/老师/。|她中学是老师。|她是大学老师吗？|中学老师 là một cụm danh từ, 是 đứng trước cả cụm.
Tôi đang ở thư viện.|我/在/图书馆/。|我图书馆在。|你在哪儿？|在 đứng trước địa điểm 图书馆.
Chúng tôi học tiếng Hán ở trường.|我们/在/学校/学/汉语/。|我们学在学校汉语。|你们在哪儿学汉语？|在学校 đứng trước 学汉语.
Tôi biết nói tiếng Hán.|我/会/说/汉语/。|我说会汉语。|你会说汉语吗？|会 đứng trước động từ chỉ kỹ năng 说.
Cô ấy đang gọi điện thoại.|她/正在/打/电话/。|她打正在电话。|她现在做什么？|正在 đứng trước 打电话.`
};

export function expandedActivities(title){
 const source=sources[title];if(!source)return [];
 const rows=source.split('\n').map(line=>{
  const [meaning,segmented,wrong,speech,explanation]=line.split('|');
  const tokens=segmented.split('/');return {meaning,tokens,answer:tokens.join(''),wrong,speech,explanation};
 });
 return rows.flatMap((r,index)=>{
  const target=r.tokens.findIndex(t=>!['我','你','他','她','我们','你们','他们','，','。','！','？'].includes(t));
  const fillTokens=[...r.tokens],answer=fillTokens[target];fillTokens[target]='___';
  const alternatives=[r.answer,rows[(index+1)%rows.length].answer,rows[(index+3)%rows.length].answer];
  return [
   {type:'order',prompt:r.meaning,tokens:r.tokens,answer:r.answer,explanation:r.explanation},
   {type:'fix',prompt:r.wrong,options:[r.answer,r.wrong],answer:r.answer,explanation:r.explanation},
   {type:'fill',prompt:fillTokens.join('')+' ('+r.meaning+')',answer,explanation:r.explanation},
   {type:'dialogue',prompt:'Nghe câu thoại và chọn câu đáp lại phù hợp.',speech:r.speech,options:alternatives,answer:r.answer,explanation:r.explanation}
  ];
 });
}
