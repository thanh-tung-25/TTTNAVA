import {el} from './chinese-common.js';
import {questionAudio} from './question-audio.js';
import {uniqueStudyWords} from './chinese-study-variety.js';
export {chooseQuiz} from './chinese-journey.js';
export {listeningPractice} from './chinese-listening.js';
export function wordTable(root,words,setId){
 words=uniqueStudyWords(words);
 const input=el('input',{type:'search','aria-label':'Tìm từ trong bài',placeholder:'Lọc theo nghĩa, pinyin hoặc chữ Hán'}),wrap=el('div',{class:'hub-table-wrap'}),normalize=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('vi');
 const render=()=>{const filtered=words.filter(i=>[i.data.meaning,i.data.pinyin,i.data.hanzi].some(v=>normalize(v).includes(normalize(input.value))));
  wrap.replaceChildren(el('table',{class:'hub-table'},[el('thead',{},[el('tr',{},['Từ / Nghĩa tiếng Việt','Phiên âm (pinyin)','Hán tự'].map(text=>el('th',{scope:'col',text})))]),el('tbody',{},filtered.map(i=>el('tr',{'data-word-id':i.id},[el('td',{},[el('a',{text:i.data.meaning,href:'?'+new URLSearchParams({set:setId,mode:'cards',word:i.id})})]),el('td',{text:i.data.pinyin||'Chưa có phiên âm'}),el('td',{},[el('span',{text:i.data.hanzi}),questionAudio(i.data.hanzi,{label:'Nghe '+i.data.hanzi,compact:true})])])))]));};
 input.oninput=render;root.append(el('h2',{text:'Từ mới của bài'}),el('p',{text:words.length+' mục từ. Chạm vào nghĩa để mở thẻ học; bấm loa để nghe.'}),input,wrap);render();
 const id=new URLSearchParams(location.search).get('word');if(id)wrap.querySelector('[data-word-id="'+CSS.escape(id)+'"]')?.scrollIntoView({block:'center'});
}
