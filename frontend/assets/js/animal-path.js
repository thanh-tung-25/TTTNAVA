import {el} from './api.js';
const friends=[['Gấu trúc','Rừng trúc','panda','#e9f6ef','#3a8c74'],['Thỏ ngọc','Vườn hoa','bunny','#fff2e4','#b97849'],['Sư tử thông thái','Đồi sao','lion','#f0eafa','#8969b0']];
export function animalPath(container,{selector=':scope > article',title='Cùng khám phá',hint='Chọn bài phù hợp với điều con đang học.',completed=()=>false}={}){
 if(!document.querySelector('link[data-student-design]')){const css=el('link',{rel:'stylesheet',href:'/assets/css/student-unified.css','data-student-design':'true'});document.head.append(css);}
 const cards=[...container.querySelectorAll(selector)];if(!cards.length)return;
 container.classList.add('animal-path');
 const zones=[];
 for(let offset=0;offset<cards.length;offset+=4){
  const index=offset/4,[name,place,animal,soft,color]=friends[index%friends.length],items=cards.slice(offset,offset+4);
  const zone=el('section',{class:'animal-zone','aria-label':name+' · Nhóm '+(index+1)});zone.style.setProperty('--zone-soft',soft);zone.style.setProperty('--zone-color',color);
  const head=el('header',{class:'animal-zone-head'},[el('img',{src:'/assets/images/mascot-'+animal+'.svg',width:88,height:94,alt:'',loading:index?'lazy':'eager'}),el('div',{},[el('span',{class:'animal-zone-eyebrow',text:place.toLocaleUpperCase('vi')+' · '+(index+1)}),el('h2',{text:title+' cùng '+name}),el('p',{text:hint})])]);
  const grid=el('div',{class:'animal-zone-items'});
  for(const [n,card]of items.entries()){
   card.classList.add('animal-path-stop');
   if(card.tagName==='BUTTON'&&!card.hasAttribute('aria-label'))card.setAttribute('aria-label',card.textContent);
   const done=completed(card);card.prepend(el('span',{class:'animal-stop-number'+(done?' is-complete':''),text:done?'✓':'Chặng '+(offset+n+1),'aria-label':done?'Đã hoàn thành':'Chặng '+(offset+n+1)}));grid.append(card);
  }
  zone.append(head,grid);zones.push(zone);
 }
 // Keep unrelated notices and empty states; the actual cards retain their events and IDs.
 container.append(...zones);
}
