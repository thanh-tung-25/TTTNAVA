const lessons = [
 {title:'你好',aliases:['Xin Chào'],topic:'Chào hỏi',order:[
  ['Chào cô giáo.',['老师','，','你好','！'],'老师，你好！','lǎoshī, nǐ hǎo','Gọi người đối thoại trước, sau đó nói lời chào.'],
  ['Tôi rất khỏe.',['我','很','好','。'],'我很好。','wǒ hěn hǎo','Chủ ngữ 我 đứng trước 很好.']],
 fix:[
  ['我好很。','我很好。',['我好很。','我很好。','很我好。'],'很 đứng trước tính từ 好: 我很好。'],
  ['你吗好？','你好吗？',['你好吗？','吗你好？','你好吗好？'],'吗 đứng cuối câu hỏi: 你好吗？']],
 dialogue:[
  ['Bạn gặp cô giáo vào buổi đầu tiên.','你好！','nǐ hǎo','Chào em!',['老师，你好！','再见！','我不认识。'],'老师，你好！','Chào cô giáo bằng 老师，你好！'],
  ['Cô hỏi thăm bạn.','你好吗？','nǐ hǎo ma','Em có khỏe không?',['我很好，谢谢！','你去哪儿？','多少钱？'],'我很好，谢谢！','我很好 nói tình trạng của mình; 谢谢 là cảm ơn.'],
  ['Bạn ra về sau buổi học.','再见！','zàijiàn','Tạm biệt!',['再见！','对不起！','不客气！'],'再见！','Đáp lại lời tạm biệt bằng 再见.']]},
 {title:'你叫什么名字',aliases:['Hỏi tên, Hỏi họ, Quốc tịch'],topic:'Làm quen',order:[
  ['Bạn tên là gì?',['你','叫','什么','名字','？'],'你叫什么名字？','nǐ jiào shénme míngzi','叫 đứng trước 什么名字.'],
  ['Tôi là học sinh.',['我','是','学生','。'],'我是学生。','wǒ shì xuésheng','是 nối chủ ngữ với danh từ chỉ người hoặc nghề nghiệp.']],
 fix:[
  ['我不是叫小明。','我不叫小明。',['我不叫小明。','我没叫是小明。','我是不叫小明的名字。'],'Phủ định việc tên là gì dùng 不叫; không thêm 是 trước 叫.'],
  ['你叫什么名字吗？','你叫什么名字？',['你叫什么名字？','你吗叫什么名字？','你什么叫吗名字？'],'Câu đã có từ nghi vấn 什么 thì không thêm 吗 trong cách hỏi này.']],
 dialogue:[
  ['Một bạn mới hỏi tên bạn.','你叫什么名字？','nǐ jiào shénme míngzi','Bạn tên là gì?',['我叫小明。','我是咖啡。','我很名字。'],'我叫小明。','Dùng 我叫 + tên để giới thiệu tên.'],
  ['Bạn mới hỏi quốc tịch của bạn.','你是哪国人？','nǐ shì nǎ guó rén','Bạn là người nước nào?',['我是越南人。','我叫越南。','我去名字。'],'我是越南人。','我是越南人 nghĩa là tôi là người Việt Nam.'],
  ['Bạn muốn hỏi tên người đối diện sau khi giới thiệu mình.','我叫王明。','wǒ jiào Wáng Míng','Tôi tên là Vương Minh.',['你呢？','多少钱？','在哪里工作？'],'你呢？','你呢？ là cách hỏi lại ngắn gọn: Còn bạn?']]},
 {title:'很高兴认识你',topic:'Trao danh thiếp',order:[
  ['Đây là danh thiếp của tôi.',['这','是','我','的','名片','。'],'这是我的名片。','zhè shì wǒ de míngpiàn','我的名片: danh thiếp của tôi.'],
  ['Tôi cũng rất vui.',['我','也','很','高兴','。'],'我也很高兴。','wǒ yě hěn gāoxìng','也 đứng sau chủ ngữ, trước 很高兴.']],
 fix:[
  ['我不有名片。','我没有名片。',['我没有名片。','我不是有名片。','我名片没有的。'],'Phủ định của 有 là 没有, không dùng 不有.'],
  ['我很也高兴。','我也很高兴。',['我也很高兴。','我很高兴也。','也我高兴很。'],'也 đứng trước 很 và tính từ, sau chủ ngữ 我.']],
 dialogue:[
  ['Bạn gặp đối tác lần đầu và muốn hỏi họ một cách lịch sự.','您好！','nín hǎo','Xin chào!',['请问，您贵姓？','你多少钱？','你吃什么？'],'请问，您贵姓？','您贵姓 là cách hỏi họ lịch sự.'],
  ['Đối tác trao danh thiếp nhưng bạn không mang theo.','这是我的名片。','zhè shì wǒ de míngpiàn','Đây là danh thiếp của tôi.',['对不起，我没有名片。','不客气，我很远。','这是我的米饭。'],'对不起，我没有名片。','Xin lỗi rồi giải thích 我没有名片.'],
  ['Đối tác bày tỏ niềm vui được làm quen.','很高兴认识你！','hěn gāoxìng rènshi nǐ','Rất vui được làm quen với bạn!',['认识你我也很高兴！','我不认识名片。','你多少钱？'],'认识你我也很高兴！','也 giúp đáp lại rằng mình cũng vui được làm quen.']]},
 {title:'你去哪儿',topic:'Đi taxi',order:[
  ['Tôi đi Quảng trường Nhân Dân.',['我','去','人民广场','。'],'我去人民广场。','wǒ qù Rénmín Guǎngchǎng','去 đứng trước địa điểm muốn đến.'],
  ['Quảng trường Nhân Dân có xa không?',['人民广场','远','不','远','？'],'人民广场远不远？','Rénmín Guǎngchǎng yuǎn bu yuǎn','Câu hỏi chính phản lặp tính từ: 远不远.']],
 fix:[
  ['你有不有名片？','你有没有名片？',['你有没有名片？','你不有没有名片？','你有没有名片吗？'],'Dạng chính phản của 有 là 有没有; không thêm 吗.'],
  ['我家学校离很近。','我家离学校很近。',['我家离学校很近。','我家学校很离近。','离很近我家学校。'],'Mẫu khoảng cách: A 离 B + tính từ.']],
 dialogue:[
  ['Bạn lên taxi. Hãy nói điểm đến.','你去哪儿？','nǐ qù nǎr','Bạn đi đâu?',['我去人民广场。','我叫广场。','我没有米饭。'],'我去人民广场。','我去 + địa điểm nêu nơi muốn đến.'],
  ['Bạn muốn biết điểm đến xa hay gần.','好，知道了。','hǎo, zhīdào le','Được, tôi biết rồi.',['人民广场远不远？','人民广场是谁？','我叫多少？'],'人民广场远不远？','远不远 hỏi có xa không.'],
  ['Xe đến nơi, bạn hỏi số tiền cần trả.','人民广场到了。','Rénmín Guǎngchǎng dào le','Đã đến Quảng trường Nhân Dân.',['多少钱？','哪国人？','什么名字？'],'多少钱？','多少钱 dùng để hỏi giá, số tiền cần thanh toán.']]},
 {title:'你要吃什么',topic:'Gọi món',order:[
  ['Tôi muốn hai bát cơm.',['我','要','两','碗','米饭','。'],'我要两碗米饭。','wǒ yào liǎng wǎn mǐfàn','Hai bát cơm là 两碗米饭; dùng 两 trước lượng từ 碗.'],
  ['Bạn uống trà hay cà phê?',['你','喝','茶','还是','咖啡','？'],'你喝茶还是咖啡？','nǐ hē chá háishi kāfēi','还是 nối hai lựa chọn trong câu hỏi.']],
 fix:[
  ['我要二杯茶。','我要两杯茶。',['我要两杯茶。','我要两本茶。','我要二位茶。'],'Khi nói hai cốc trà, dùng 两杯茶.'],
  ['这个菜一点儿辣。','这个菜有点儿辣。',['这个菜有点儿辣。','这个菜辣有点儿。','这个有菜点儿辣。'],'有点儿 đứng trước tính từ: 有点儿辣, hơi cay.']],
 dialogue:[
  ['Bạn muốn gọi thịt bò và rau xanh.','您要吃什么？','nín yào chī shénme','Quý khách muốn ăn gì?',['我要牛肉和青菜。','我在公司工作。','我是英国人。'],'我要牛肉和青菜。','我要 + món ăn; 和 nối thịt bò và rau.'],
  ['Gọi thêm hai bát cơm.','还要什么？','hái yào shénme','Quý khách cần thêm gì?',['还要两碗米饭。','两本米饭。','我不去学校。'],'还要两碗米饭。','还要 là muốn thêm; cơm dùng lượng từ 碗.'],
  ['Bạn muốn một cốc trà.','您喝茶还是咖啡？','nín hē chá háishi kāfēi','Quý khách uống trà hay cà phê?',['我要一杯茶。','茶或者吗。','我要一本茶。'],'我要一杯茶。','Trả lời câu hỏi lựa chọn bằng đồ uống mình muốn.']]},
 {title:'你在哪儿工作',topic:'Giới thiệu công việc',order:[
  ['Tôi làm việc ở công ty Apple.',['我','在','苹果公司','工作','。'],'我在苹果公司工作。','wǒ zài Píngguǒ Gōngsī gōngzuò','Chủ ngữ + 在 + địa điểm + động từ.'],
  ['Anh ấy đang xem tivi.',['他','正在','看','电视','。'],'他正在看电视。','tā zhèngzài kàn diànshì','正在 đứng trước hành động đang diễn ra.']],
 fix:[
  ['我在不这儿学汉语。','我不在这儿学汉语。',['我不在这儿学汉语。','我在这儿不汉语学。','我学不在汉语这儿。'],'不 đứng trước 在 khi phủ định việc làm gì ở một nơi.'],
  ['他在大学叫英语。','他在大学教英语。',['他在大学教英语。','他在英语大学喝。','他英语是大学在。'],'教 jiāo là dạy; 叫 jiào là gọi.']],
 dialogue:[
  ['Bạn mới hỏi nơi bạn làm việc.','你在哪儿工作？','nǐ zài nǎr gōngzuò','Bạn làm việc ở đâu?',['我在苹果公司工作。','我工作什么名字。','我有两杯茶。'],'我在苹果公司工作。','在 + địa điểm đứng trước 工作.'],
  ['Bạn muốn giới thiệu bạn mình là giáo viên tiếng Anh.','你朋友做什么工作？','nǐ péngyou zuò shénme gōngzuò','Bạn của bạn làm nghề gì?',['他是英语老师。','他是英语米饭。','他叫大学工作。'],'他是英语老师。','是 + nghề nghiệp; 英语老师 là giáo viên tiếng Anh.'],
  ['Bạn nói nơi người bạn ấy dạy học.','他在哪儿教英语？','tā zài nǎr jiāo Yīngyǔ','Anh ấy dạy tiếng Anh ở đâu?',['他在大学教英语。','他在哪儿大学。','他教在英语。'],'他在大学教英语。','在大学 là ở đại học, đứng trước 教英语.']]}
];

export function activityTemplate(set){
 if(Number(set.level_id)!==1)return null;
 const normalize=value=>String(value).normalize('NFC').toLocaleLowerCase('vi').replace(/[\s？?！!。.,，:：–—-]/gu,'');
 const title=normalize(set.lesson_title||set.title||'');
 const lesson=[...lessons].sort((a,b)=>b.title.length-a.title.length).find(l=>[l.title,...(l.aliases||[])].some(alias=>title.includes(normalize(alias))));
 if(!lesson)return null;
 return {topic:lesson.topic,tasks:[
  ...lesson.order.map(r=>({type:'order',prompt:r[0],tokens:r[1],answer:r[2],pinyin:r[3],explanation:r[4],hint:''})),
  ...lesson.fix.map(r=>({type:'fix',prompt:r[0],answer:r[1],options:r[2],explanation:r[3],hint:''})),
  ...lesson.dialogue.map(r=>({type:'dialogue',prompt:r[0],speech:r[1],pinyin:r[2],meaning:r[3],options:r[4],answer:r[5],explanation:r[6],hint:''}))
 ]};
}
