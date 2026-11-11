export const chineseModes=[
 {key:'cards',label:'Thẻ lật',destination:'general',image:'panda',description:'Từ vựng và câu hỏi để lật thẻ ôn tập.'},
 {key:'words',label:'Từ mới',destination:'vocabulary',image:'bunny',description:'Chữ Hán, pinyin và nghĩa trong bảng từ mới.'},
 {key:'listen',label:'Luyện nghe',destination:'vocabulary',image:'owl',description:'Dùng từ mới của bài để nghe và chọn nghĩa.'},
 {key:'quiz',label:'Quiz 20 câu',destination:'question',image:'panda',description:'Câu hỏi có lựa chọn, đáp án và lời giải.'},
 {key:'read',label:'Bài đọc',destination:'reading',image:'bunny',description:'Bài đọc, ngữ pháp và hội thoại để đọc hiểu.'},
 {key:'apply',label:'Luyện vận dụng',destination:null,image:'owl',description:'Xếp câu, sửa lỗi, điền từ và hội thoại.'},
 {key:'speak',label:'Luyện nói',destination:'speaking',image:'panda',description:'Câu hỏi tiếng Trung để nghe, trả lời và quay video nộp qua Zalo.'}
];
export const chineseMode=key=>chineseModes.find(m=>m.key===key);
export function modeCounts(set,counts=[]){
 const rows=counts.filter(c=>c.set_id===set.id),count=kind=>Number(rows.find(c=>c.kind===kind)?.total)||0;
 const spoken=Number(set.speaking_count)||Number(rows.find(c=>c.kind==='dialogue')?.speaking_total)||0;
 return {cards:count('vocabulary')+count('question'),words:count('vocabulary'),listen:count('vocabulary'),quiz:count('question'),read:count('reading')+count('grammar')+count('dialogue')-spoken,apply:Number(set.activity_count)||0,speak:spoken};
}
export function itemMode(item){
 if(item.kind==='dialogue'&&item.data?.practice==='speaking')return 'speak';
 return {vocabulary:'words',question:'quiz',grammar:'read',dialogue:'read',reading:'read'}[item.kind]||null;
}
