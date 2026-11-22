import {worksheetExpressionMatches} from './worksheet-expression-matching.js';
const plain=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase('vi').replace(/[−–]/gu,'-').replace(/[⁄∕]/gu,'/');
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){[a,b]=[b,a%b];}return a;};
function rational(value){
 const match=/^([+-]?)(\d+)(?:[.,](\d*))?$/u.exec(value);
 if(!match)return null;
 const denominator=10n**BigInt(match[3]?.length||0),numerator=BigInt(match[2]+(match[3]||''))*(match[1]==='-'?-1n:1n);
 return {n:numerator,d:denominator};
}
function number(value,unit=''){
 let text=plain(value).replace(/^[\p{L}][\p{L}\p{N}_]*\s*=\s*/u,'');
 if(unit){const suffix=plain(unit).replace(/\^/gu,'').replace(/\s/gu,'');if(suffix){const pattern=[...suffix].map(c=>c.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')).join('\\s*');text=text.replace(/\^/gu,'').replace(new RegExp('\\s*'+pattern+'\\s*$','u'),'').trim();}}
 const mixed=/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/u.exec(text);
 if(mixed){const d=BigInt(mixed[3]);if(!d)return null;const whole=BigInt(mixed[1]);return {n:whole*d+(mixed[1].startsWith('-')?-1n:1n)*BigInt(mixed[2]),d};}
 text=text.replace(/\s/gu,'');const parts=text.split('/');
 if(parts.length===1)return rational(text);
 if(parts.length!==2)return null;
 const a=rational(parts[0]),b=rational(parts[1]);if(!a||!b||!b.n)return null;
 return {n:a.n*b.d,d:a.d*b.n};
}
const equal=(a,b)=>Boolean(a&&b&&a.n*b.d===b.n*a.d);
function numeric(value,expected,unit){
 const target=number(expected,unit);if(equal(number(value,unit),target))return true;
 // Vietnamese grouped integers, such as 5.625.000, are unambiguous here.
 const grouped=plain(value).replace(/\s/gu,'');if(target&&target.n%target.d===0n&&(target.n/target.d>=1000n||target.n/target.d<=-1000n)&&/^[+-]?\d{1,3}(?:[.,]\d{3})+$/u.test(grouped))return equal(number(grouped.replace(/[.,]/gu,'')),target);
 return false;
}
function splitTop(text){
 let depth=0,hasSemicolon=false;
 for(const c of text){if('([{'.includes(c))depth++;else if(')]}'.includes(c))depth--;else if(c===';'&&depth===0)hasSemicolon=true;if(depth<0)return null;}
 if(depth)return null;
 const delimiter=hasSemicolon?';':',',parts=[];let current='';depth=0;
 for(const c of text){if('([{'.includes(c))depth++;else if(')]}'.includes(c))depth--;if(c===delimiter&&depth===0){parts.push(current);current='';}else current+=c;}
 parts.push(current);return parts;
}
function atom(text){
 const value=number(text);if(value){let {n,d}=value;if(d<0n){n=-n;d=-d;}const divisor=gcd(n,d);return 'n:'+String(n/divisor)+'/'+String(d/divisor);}
 if(text.startsWith('(')&&text.endsWith(')')){const parts=splitTop(text.slice(1,-1));if(!parts||parts.length<2)return null;const values=parts.map(atom);return values.every(v=>v!==null)?'p:('+values.join('|')+')':null;}
 return text?'t:'+text.replace(/\s/gu,''):null;
}
function set(value){
 let text=plain(value).replace(/^[\p{L}][\p{L}\p{N}_]*\s*(?:=|∈)\s*/u,'').replace(/[,(;]?\s*[knm]\s*(?:∈|thuộc)\s*z\s*\)?$/u,'');
 if(text==='∅'||text==='\\varnothing')return [];
 if(text.startsWith('{')&&text.endsWith('}'))text=text.slice(1,-1);else if(text.includes('{')||text.includes('}'))return null;
 if(!text.trim())return [];
 const parts=splitTop(text);if(!parts)return null;const values=parts.map(part=>atom(part.trim()));return values.every(v=>v!==null)?[...new Set(values)].sort():null;
}
export function worksheetAnswerMatches(value,expected,config={}){
 if(config.answer_format==='expression')return worksheetExpressionMatches(value,expected);
 if(config.answer_format==='number')return numeric(value,expected,config.unit||'');
 if(config.answer_format==='set'){
  const left=set(value),right=set(expected);if(left===null||right===null)return false;
  const same=(a,b)=>a===b||a.startsWith('t:')&&b.startsWith('t:')&&worksheetExpressionMatches(a.slice(2),b.slice(2));
  const unique=values=>values.filter((item,n)=>!values.slice(0,n).some(other=>same(item,other))),a=unique(left),b=unique(right);
  return a.length===b.length&&a.every(item=>b.some(other=>same(item,other)));
 }
 return null;
}
