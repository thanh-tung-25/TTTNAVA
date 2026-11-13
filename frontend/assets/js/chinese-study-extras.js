import {el} from './chinese-common.js';
import {questionAudio,withChoiceAudio} from './question-audio.js';
import {uniqueStudyWords} from './chinese-study-variety.js';
export {chooseQuiz} from './chinese-journey.js';
export function wordTable(root,words,setId){
 words=uniqueStudyWords(words);
 const input=el('input',{type:'search','aria-label':'Tìm từ trong bài',placeholder:'Lọc theo nghĩa, pinyin hoặc chữ Hán'}),wrap=el('div',{class:'hub-table-wrap'}),normalize=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('vi');
 const render=()=>{const filtered=words.filter(i=>[i.data.meaning,i.data.pinyin,i.data.hanzi].some(v=>normalize(v).includes(normalize(input.value))));
  wrap.replaceChildren(el('table',{class:'hub-table'},[el('thead',{},[el('tr',{},['Từ / Nghĩa tiếng Việt','Phiên âm (pinyin)','Hán tự'].map(text=>el('th',{scope:'col',text})))]),el('tbody',{},filtered.map(i=>el('tr',{'data-word-id':i.id},[el('td',{},[el('a',{text:i.data.meaning,href:'?'+new URLSearchParams({set:setId,mode:'cards',word:i.id})})]),el('td',{text:i.data.pinyin||'Chưa có phiên âm'}),el('td',{},[el('span',{text:i.data.hanzi}),questionAudio(i.data.hanzi,{label:'Nghe '+i.data.hanzi,compact:true})])])))]));};
 input.oninput=render;root.append(el('h2',{text:'Từ mới của bài'}),el('p',{text:words.length+' mục từ. Chạm vào nghĩa để mở thẻ học; bấm loa để nghe.'}),input,wrap);render();
 const id=new URLSearchParams(location.search).get('word');if(id)wrap.querySelector('[data-word-id="'+CSS.escape(id)+'"]')?.scrollIntoView({block:'center'});
}
export function listeningPractice(root,words,setId){
 const unique=[...new Map(uniqueStudyWords(words).filter(i=>i.data.hanzi&&i.data.meaning).map(i=>[i.data.meaning,i])).values()];
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
  area.replaceChildren(el('h3',{class:'quiz-prompt',text:'Nghe và chọn nghĩa · '+(index+1)+'/'+deck.length}),questionAudio(item.data.hanzi,{label:'Nghe từ tiếng Trung'}),choices,status,next);
 };render();
}
