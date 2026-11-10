import {z} from 'zod';
import {badRequest} from '../utils/errors.js';
import {randomInt} from 'node:crypto';
const text=z.string().trim().min(1).max(300);
const list=z.array(text).min(1).max(20);
const configs={
 fill:z.object({}),word:z.object({unit:z.string().trim().max(30).default('')}),
 choice:z.object({options:list.min(2).max(6)}),compare:z.object({}),
 blanks:z.object({labels:list}),ordering:z.object({tokens:list.min(2)}),
 matching:z.object({left:list,targets:list}),
 column:z.object({a:z.number().int().min(0).max(9999),b:z.number().int().min(0).max(9999),operator:z.enum(['+','-'])}),
 drawing:z.object({}),
};
const answers={fill:z.object({accepted:list}),word:z.object({accepted:list}),choice:z.object({index:z.number().int().min(0).max(5)}),compare:z.object({value:z.enum(['<','>','='])}),blanks:z.object({values:list}),ordering:z.object({values:list}),matching:z.object({values:list}),column:z.object({}),drawing:z.object({})};
export const sheetSchema=z.object({title:z.string().trim().min(1).max(180),grade:z.number().int().min(1).max(9),subject_id:z.enum(['toan','tieng-viet','tieng-anh']),status:z.enum(['draft','published','hidden']),version:z.number().int().min(1).optional(),items:z.array(z.object({id:z.string().uuid(),type:z.enum(Object.keys(configs)),prompt:z.string().trim().min(1).max(3000),explanation:z.string().trim().max(4000).default(''),imageId:z.string().uuid().nullable().default(null),config:z.any(),answer:z.any()})).max(50)});
export function validateSheet(body){
 const d=sheetSchema.parse(body);
 d.lesson_id=z.string().trim().min(1).max(90).nullable().optional().parse(body.lesson_id)??null;
 if(d.status==='published'&&!d.items.length)throw badRequest('Thêm ít nhất một câu trước khi đăng bài.');
 if(new Set(d.items.map(i=>i.id)).size!==d.items.length)throw badRequest('Mã câu hỏi bị trùng.');
 for(const item of d.items){
  item.config=configs[item.type].parse(item.config);item.answer=answers[item.type].parse(item.answer);
  const c=item.config,a=item.answer;
  if(item.type==='choice'&&a.index>=c.options.length)throw badRequest('Chọn đáp án có trong danh sách.');
  if(item.type==='blanks'&&a.values.length!==c.labels.length)throw badRequest('Mỗi ô trống cần một đáp án.');
  if(item.type==='ordering'&&(new Set(c.tokens).size!==c.tokens.length||[...c.tokens].sort().join('\0')!==[...a.values].sort().join('\0')))throw badRequest('Thẻ sắp xếp không trùng và đáp án phải dùng đủ thẻ.');
  if(item.type==='matching'&&(c.left.length!==a.values.length||new Set(c.left).size!==c.left.length||a.values.some(v=>!c.targets.includes(v))))throw badRequest('Mỗi vế trái cần một đáp án trong vế phải.');
  if(item.type==='column'&&c.operator==='-'&&c.a<c.b)throw badRequest('Phép trừ đặt tính cần số thứ nhất lớn hơn hoặc bằng số thứ hai.');
 }
 return d;
}
const normalize=v=>String(v??'').normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ');
export function gradeItem(item,value){
 const a=item.answer,c=item.config;
 if(item.type==='drawing')return {correct:null,expected:'Giáo viên sẽ xem và chấm bài.',explanation:item.explanation};
 let expected,checks;
 if(['fill','word'].includes(item.type)){expected=a.accepted.join(' / ');checks=[a.accepted.map(normalize).includes(normalize(value))];}
 else if(item.type==='choice'){expected=c.options[a.index];checks=[Number.isInteger(value)&&value===a.index];}
 else if(item.type==='compare'){expected=a.value;checks=[value===a.value];}
 else if(['blanks','ordering','matching'].includes(item.type)){expected=a.values.join(' · ');checks=a.values.map((v,n)=>normalize(value?.[n])===normalize(v));}
 else{const result=c.operator==='+'?c.a+c.b:c.a-c.b;expected=String(result);checks=[normalize(value)===expected];}
 return {correct:checks.every(Boolean),checks,expected,explanation:item.explanation};
}
export function publicItem({answer,explanation,...item}){
 const copy=structuredClone(item);
 if(copy.type==='ordering')for(let n=copy.config.tokens.length-1;n>0;n--){const k=randomInt(n+1);[copy.config.tokens[n],copy.config.tokens[k]]=[copy.config.tokens[k],copy.config.tokens[n]];}
 return copy;
}
export function validateResponses(items,body){
 const d=z.record(z.string(),z.any()).parse(body);const ids=new Set(items.map(i=>i.id));
 for(const [id,value]of Object.entries(d)){
  if(!ids.has(id))throw badRequest('Câu trả lời không thuộc bộ bài.');
  const item=items.find(i=>i.id===id);
  if(item.type==='drawing'){
   const result=z.object({text:z.string().max(6000).default(''),drawing:z.string().max(400000).default('')}).parse(value);
   if(result.drawing&&!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.drawing))throw badRequest('Bản vẽ không hợp lệ.');
   if(result.drawing&&!Buffer.from(result.drawing.split(',')[1],'base64').subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw badRequest('Bản vẽ phải là ảnh PNG.');
   d[id]=result;
  }else if(['blanks','ordering','matching'].includes(item.type))d[id]=z.array(z.string().max(300)).max(20).parse(value);
  else if(item.type==='choice')d[id]=z.number().int().min(0).max(5).parse(value);
  else d[id]=z.string().max(300).parse(value);
 }
 return d;
}
