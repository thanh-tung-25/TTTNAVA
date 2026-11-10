import {el,card,action,link,message} from './experience-ui.js';
const root=document.getElementById('experience-root'),questions=[
 {prompt:'Có 3 quả táo, thêm 2 quả. Có tất cả bao nhiêu quả?',options:['4','5','6'],correct:1,why:'3 + 2 = 5.'},
 {prompt:'Giải phương trình 2x + 3 = 11. x bằng bao nhiêu?',options:['3','4','7'],correct:1,why:'Trừ 3 hai vế: 2x = 8. Chia 2: x = 4.'},
 {prompt:'Trong câu “Mầm cây vươn mình đón nắng”, sự vật nào được nhân hóa?',options:['Mầm cây','Nắng','Không có'],correct:0,why:'Mầm cây được tả bằng hành động “vươn mình” như con người.'},
 {prompt:'Chọn lời chào bằng tiếng Anh.',options:['Thank you','Goodbye','Hello'],correct:2,why:'Hello là lời chào. Thank you là cảm ơn; Goodbye là tạm biệt.'},
 {prompt:'你好 (nǐ hǎo) có nghĩa gì?',options:['Xin chào','Tạm biệt','Cảm ơn'],correct:0,why:'你好 là lời chào thông dụng trong tiếng Trung.'}
];let index=0,score=0;
function render(){message('');root.replaceChildren();if(index===questions.length){root.append(card('Bạn đã thử đủ 5 câu',el('p',{text:score+'/5 câu đúng. Đây là bài minh họa, không lưu vào tài khoản.'}),link('Đăng ký bằng Gmail','/pages/register/',true),link('Đã có tài khoản? Đăng nhập','/pages/login/')));return;}
 const q=questions[index],feedback=el('p',{class:'experience-feedback',role:'status'}),choices=el('div',{class:'experience-choices'}),next=action('Câu tiếp theo',()=>{index++;render();},true);let answered=false;next.hidden=true;const buttons=q.options.map((text,i)=>action(text,()=>{if(answered)return;answered=true;buttons.forEach(b=>b.disabled=true);if(i===q.correct)score++;feedback.textContent=(i===q.correct?'Đúng rồi! ':'Mình xem lại nhé. ')+q.why;next.hidden=false;}));choices.append(...buttons);root.append(card('Câu '+(index+1)+'/5',el('p',{class:'experience-question',text:q.prompt}),choices,feedback,next));
}render();
