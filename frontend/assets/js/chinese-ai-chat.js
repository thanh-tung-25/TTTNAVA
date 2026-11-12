import {el,link} from './chinese-common.js';

export function renderChineseAiChat(host,{role='student',level=1}={}){
 host.append(el('section',{class:'card chinese-ai-upgrade','aria-labelledby':'chinese-ai-upgrade-title'},[
  el('div',{class:'chinese-ai-upgrade-art','aria-hidden':'true'},[
   el('img',{src:'/assets/images/mascot-lion.svg',alt:'',width:120,height:132}),
   el('span',{text:'AI'}),
  ]),
  el('p',{class:'chinese-ai-upgrade-label',text:'Giao tiếp với AI'}),
  el('span',{class:'chinese-ai-upgrade-badge',text:'Đang nâng cấp'}),
  el('h2',{id:'chinese-ai-upgrade-title',text:'Hệ thống đang nâng cấp'}),
  el('p',{class:'chinese-ai-upgrade-description',text:'Tính năng giao tiếp tiếng Trung với AI đang được chuẩn bị. Bạn quay lại học bài trong lúc chờ nhé!'}),
  link('← Về bài học',{level},role),
 ]));
}
