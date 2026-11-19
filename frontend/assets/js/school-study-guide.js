import {el} from './api.js';
export function studyKnowledge(content){
 const root=el('div',{class:'school-knowledge'});
 root.append(el('h3',{text:'Cần nhớ trong bài này'}));
 const sectionView=section=>el('section',{class:'school-note'},[el('h4',{text:section.heading}),el('p',{text:section.body})]);
 for(const section of (content.summary||[]).slice(0,2))root.append(sectionView(section));
 if(content.formulas?.length){const rules=el('section',{class:'school-rules'},[el('h3',{text:'Công thức / quy tắc cần nhớ'})]);for(const rule of content.formulas)rules.append(el('article',{class:'school-rule'},[el('h4',{text:rule.name}),el('p',{class:'school-rule-expression',text:rule.expression}),...(rule.conditions?[el('p',{class:'school-rule-condition',text:'Lưu ý: '+rule.conditions})]:[])]));root.append(rules);}
 if(content.mistakes?.length)root.append(el('aside',{class:'school-mistakes'},[el('h4',{text:'Những chỗ dễ nhầm'}),el('ul',{},content.mistakes.map(text=>el('li',{text})))]));
 if(content.summary?.length>2)root.append(el('details',{class:'school-knowledge-more'},[el('summary',{text:'Xem thêm kiến thức trong bài ('+(content.summary.length-2)+' mục)'}),...(content.summary||[]).slice(2).map(sectionView)]));
 return root;
}
export function studyExamples(content){
 const root=el('div',{class:'school-examples'},[el('h3',{text:'Ví dụ có hướng dẫn'})]);
 for(const [index,example]of (content.examples||[]).entries())root.append(el('article',{class:'school-example'},[el('span',{class:'school-example-label',text:'Ví dụ '+(index+1)}),el('p',{class:'school-example-prompt',text:example.prompt}),el('h4',{text:'Cách làm'}),el('p',{text:example.solution})]));
 return root;
}
