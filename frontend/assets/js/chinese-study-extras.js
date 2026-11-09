import {el,request} from './chinese-common.js';
import {questionAudio,withChoiceAudio} from './question-audio.js';
export async function chooseQuiz(setId,start,review=false){
 const plan=await request('/sets/'+setId+'/quiz-plan'),dialog=el('dialog',{class:'feedback-dialog','aria-label':'Chọn nội dung quiz'}),notice=el('p',{role:'status'});
 const select=el('select',{'aria-label':'Phần muốn luyện'},plan.blocks.map(b=>el('option',{value:b.block,text:'Phần '+(b.block+1)+' · Câu '+b.from+'–'+b.to})));
 const kind=el('select',{'aria-label':'Cách chọn câu'},[el('option',{value:'sequential',text:'Luyện theo phần — xem trước nội dung'}),el('option',{value:'review',text:'Ôn câu đã làm — ưu tiên câu từng sai'})]);kind.value=review?'review':'sequential';
 const preview=el('details',{},[el('summary',{text:'Xem câu hỏi của phần này trước khi làm'})]),content=el('div');preview.append(content);
 const update=()=>{select.disabled=kind.value==='review';preview.hidden=kind.value==='review';const b=plan.blocks.find(b=>b.block===Number(select.value));content.replaceChildren(...(b?.questions||[]).map((i,n)=>el('p',{text:(n+1)+'. '+i.data.prompt})));go.disabled=kind.value==='review'?plan.review_count<20:!b;notice.textContent=kind.value==='review'?'Đã có '+plan.review_count+' câu đã làm. Lượt ôn chỉ dùng những câu này, không thêm câu mới.':'Các phần đi theo thứ tự tài liệu. Phần cuối có thể giao với phần trước để đủ 20 câu khác nhau. Mở Từ mới để học từ trước khi luyện.';};
 const go=el('button',{type:'button',class:'btn btn-primary',text:'Bắt đầu / tiếp tục 20 câu',onclick:async()=>{go.disabled=true;try{await start({set_id:setId,count:20,selection:kind.value,block:Number(select.value)||0});dialog.close();}catch(e){notice.textContent=e.message;go.disabled=false;}}});
 kind.onchange=select.onchange=update;
 dialog.append(el('h2',{text:'Luyện vừa với bài đang học'}),el('p',{text:'Nếu có lượt đang làm, con sẽ tiếp tục lượt đó. Câu mới chưa chắc đã là từ con biết; hãy xem trước và học từ trước.'}),el('a',{class:'btn btn-secondary',text:'Từ mới của bài',href:'?set='+setId+'&mode=words'}),el('label',{},[el('span',{text:'Cách luyện'}),kind]),el('label',{},[el('span',{text:'Phần nội dung'}),select]),notice,preview,go,el('button',{type:'button',class:'btn btn-ghost',text:'Đóng',onclick:()=>dialog.close()}));
 document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());update();dialog.showModal();
}
export function wordTable(root,words,setId){
 const input=el('input',{type:'search','aria-label':'Tìm từ trong bài',placeholder:'Lọc theo nghĩa, pinyin hoặc chữ Hán'}),wrap=el('div',{class:'hub-table-wrap'}),normalize=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('vi');
 const render=()=>{const filtered=words.filter(i=>[i.data.meaning,i.data.pinyin,i.data.hanzi].some(v=>normalize(v).includes(normalize(input.value))));
  wrap.replaceChildren(el('table',{class:'hub-table'},[el('thead',{},[el('tr',{},['Từ / Nghĩa tiếng Việt','Phiên âm (pinyin)','Hán tự'].map(text=>el('th',{scope:'col',text})))]),el('tbody',{},filtered.map(i=>el('tr',{'data-word-id':i.id},[el('td',{},[el('a',{text:i.data.meaning,href:'?'+new URLSearchParams({set:setId,mode:'cards',word:i.id})})]),el('td',{text:i.data.pinyin||'Chưa có phiên âm'}),el('td',{},[el('span',{text:i.data.hanzi}),questionAudio(i.data.hanzi,{label:'Nghe '+i.data.hanzi,compact:true})])])))]));};
 input.oninput=render;root.append(el('h2',{text:'Từ mới của bài'}),el('p',{text:words.length+' mục từ. Chạm vào nghĩa để mở thẻ học; bấm loa để nghe.'}),input,wrap);render();
 const id=new URLSearchParams(location.search).get('word');if(id)wrap.querySelector('[data-word-id="'+CSS.escape(id)+'"]')?.scrollIntoView({block:'center'});
}
export function listeningPractice(root,words,setId){
 const unique=[...new Map(words.filter(i=>i.data.hanzi&&i.data.meaning).map(i=>[i.data.meaning,i])).values()];
 root.append(el('h2',{text:'Luyện nghe từ trong bài'}),el('p',{text:'Tự luyện 10 từ, không tính Kim Cương. Chỉ phát âm thanh khi bấm loa; có thể nghe lại. Học bảng Từ mới trước nếu chưa quen.'}));
 if(unique.length<2){root.append(el('p',{text:'Cần ít nhất 2 từ có nghĩa khác nhau để luyện nghe.'}));return;}
 const shuffle=values=>{const a=[...values];for(let n=a.length-1;n>0;n--){const j=Math.floor(Math.random()*(n+1));[a[n],a[j]]=[a[j],a[n]];}return a;};
 let deck=shuffle(unique).slice(0,10),index=0,score=0;const area=el('section',{class:'hub-card'});root.append(area);
 const render=()=>{
  if(index>=deck.length){area.replaceChildren(el('h3',{text:'Đã luyện xong'}),el('p',{text:score+'/'+deck.length+' câu đúng trong lượt tự luyện này.'}),el('button',{type:'button',class:'btn btn-primary',text:'Luyện lượt khác',onclick:()=>{deck=shuffle(unique).slice(0,10);index=0;score=0;render();}}));return;}
  const item=deck[index],options=shuffle([item,...shuffle(unique.filter(i=>i.id!==item.id)).slice(0,3)]),status=el('p',{role:'status'}),choices=el('div',{class:'hub-listen-options'}),next=el('button',{type:'button',class:'btn btn-primary',text:'Câu tiếp theo',hidden:true,onclick:()=>{index++;render();}});
  for(const [n,o]of options.entries()){
   const b=el('button',{type:'button',class:'btn btn-secondary',text:o.data.meaning,onclick:()=>{const correct=o.id===item.id;if(correct)score++;for(const c of choices.querySelectorAll('button'))if(!c.closest('.question-audio'))c.disabled=true;status.textContent=(correct?'Đúng rồi! ':'Chưa đúng. ')+item.data.hanzi+' · '+(item.data.pinyin||'')+' · '+item.data.meaning;next.hidden=false;}});choices.append(withChoiceAudio(b,o.data.meaning,n+1));
  }
  area.replaceChildren(el('h3',{class:'quiz-prompt',text:'Nghe và chọn nghĩa · '+(index+1)+'/'+deck.length}),questionAudio(item.data.hanzi,{label:'Nghe từ tiếng Trung'}),el('details',{class:'hub-hint'},[el('summary',{text:'Gợi ý'}),el('p',{text:'Nghe lại âm đầu và thanh điệu. So sánh với các từ trong bảng từ mới của bài.'})]),choices,status,next);
 };render();
}
export function questionHint(data){
 const hints={pinyin:'Nhớ âm đầu, âm cuối và dấu thanh của từ. Có thể gõ từ từ rồi kiểm tra lại.',ordering:'Tìm chủ ngữ trước, sau đó đến động từ và phần bổ sung. Đặt dấu câu ở cuối.',matching:'Đọc từng vế trái rồi tìm nghĩa tương ứng; kiểm tra để không bỏ sót cặp nào.',dictation:'Nghe lại từng cụm, chú ý âm đầu và dấu thanh trước khi viết.',listening:'Nghe hết câu rồi so sánh ý nghĩa của từng lựa chọn.',fill:'Đọc cả câu trước và sau chỗ trống để nhận ra từ loại cần điền.'};
 return el('details',{class:'hub-hint'},[el('summary',{text:'Gợi ý cách làm'}),el('p',{text:data.hint||hints[data.type]||'Đọc chậm câu hỏi, xác định yêu cầu về nghĩa, chữ Hán hay phiên âm rồi so sánh từng lựa chọn.'})]);
}
