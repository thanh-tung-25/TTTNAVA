// Shared curriculum defaults. Teacher settings override these per lesson.
export const chatScenarios=[
 {id:'greeting',title:'Làm quen',icon:'👋',goal:'Chào hỏi và hỏi thăm sức khỏe.',opening:'你好！你今天好吗？',translation:'Chào bạn! Hôm nay bạn khỏe không?'},
 {id:'identity',title:'Người bạn mới',icon:'🤝',goal:'Giới thiệu tên và quốc tịch.',opening:'你好！你叫什么名字？',translation:'Chào bạn! Bạn tên là gì?'},
 {id:'meeting',title:'Gặp bạn trong lớp',icon:'🎒',goal:'Làm quen, giới thiệu bạn bè và thầy cô.',opening:'你好！很高兴认识你。你是学生吗？',translation:'Chào bạn! Rất vui được làm quen. Bạn là học sinh phải không?'},
 {id:'going',title:'Hôm nay đi đâu?',icon:'🚶',goal:'Hỏi nơi đến và hoạt động trong ngày.',opening:'你好！你今天去哪儿？',translation:'Chào bạn! Hôm nay bạn đi đâu?'},
 {id:'food',title:'Gọi món cùng bạn',icon:'🍜',goal:'Hỏi món ăn, đồ uống và gọi món đơn giản.',opening:'你好！你想吃什么？',translation:'Chào bạn! Bạn muốn ăn gì?'},
 {id:'work',title:'Kể về công việc',icon:'💼',goal:'Hỏi nghề nghiệp và nơi làm việc.',opening:'你好！你做什么工作？',translation:'Chào bạn! Bạn làm công việc gì?'},
 {id:'directions',title:'Tìm đường trong thành phố',icon:'🧭',goal:'Hỏi địa điểm và chỉ đường đơn giản.',opening:'请问，中国银行在哪儿？',translation:'Xin hỏi, Ngân hàng Trung Quốc ở đâu?'},
 {id:'birthday',title:'Một bữa tiệc sinh nhật',icon:'🎂',goal:'Hỏi ngày sinh, ngày tháng và lên lịch gặp.',opening:'你的生日是几月几号？',translation:'Sinh nhật của bạn là ngày mấy tháng mấy?'},
 {id:'hobbies',title:'Cuối tuần xem gì?',icon:'🎬',goal:'Nói sở thích và lựa chọn với 还是.',opening:'你喜欢中国电影还是美国电影？',translation:'Bạn thích phim Trung Quốc hay phim Mỹ?'},
 {id:'family',title:'Gia đình của mình',icon:'🏡',goal:'Giới thiệu gia đình và các thành viên.',opening:'你家有几口人？',translation:'Gia đình bạn có mấy người?'}
];
export function defaultChatSettings(lesson){
 const match=String(lesson.title).match(/(?:Bài\s*|第\s*)(\d+)/i),number=match?Number(match[1]):Number(lesson.position);
 const scenario=chatScenarios[Math.max(0,Math.min(9,(number||1)-1))];
 return {enabled:true,scenario_id:scenario.id,goal:scenario.goal,opening:scenario.opening,translation:scenario.translation,required_words:[],max_turns:10};
}
