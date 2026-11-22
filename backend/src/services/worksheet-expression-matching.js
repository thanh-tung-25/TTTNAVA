import nerdamer from 'nerdamer';
const superscripts={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+'};
const functions=new Set(['sqrt','sin','cos','tan','abs','log','ln']);
const variables=new Set(['x','y','z','a','b','c','n','k','t','m','p','q']);
export function canonicalWorksheetExpression(value){
 let text=String(value??'').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/gu,group=>'^('+[...group].map(c=>superscripts[c]).join('')+')').normalize('NFKC').trim().toLowerCase();
 text=text.replace(/\$|\\left|\\right/gu,'').replace(/\\pi|π/gu,'pi').replace(/[−–]/gu,'-').replace(/[×·∙]/gu,'*').replace(/[⁄∕:]/gu,'/');
 text=text.replace(/[,(;]?\s*[knm]\s*(?:∈|thuộc)\s*z\s*\)?$/u,'').replace(/^[a-z][a-z0-9_]*\s*=\s*/u,'');
 for(let n=0;n<6;n++)text=text.replace(/\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/gu,'(($1)/($2))').replace(/\\sqrt\s*\{([^{}]+)\}/gu,'sqrt($1)');
 text=text.replace(/√\s*(pi|[a-z]|\d+(?:[.,]\d+)?)/gu,'sqrt($1)').replace(/√\s*\(/gu,'sqrt(').replace(/(\d),(\d)/gu,'$1.$2').replace(/\{/gu,'(').replace(/\}/gu,')');
 text=text.replace(/kpi/gu,'k*pi').replace(/pik/gu,'pi*k');
 if(!text||text.length>300||!/^[\da-z\s()+\-*/^.]+$/u.test(text))return null;
 const tokens=text.match(/\d+(?:\.\d*)?|[a-z]+|[()+\-*/^]/gu)||[];
 if(tokens.join('')!==text.replace(/\s/gu,'')||tokens.length>80)return null;
 const seen=new Set(),output=[];let depth=0,powers=0;
 for(let n=0;n<tokens.length;n++){
  const token=tokens[n],identifier=/^[a-z]+$/u.test(token),number=/^\d/u.test(token);
  if(identifier){if(functions.has(token)){if(tokens[n+1]!=='(')return null;}else if(!['pi','e'].includes(token)){if(!variables.has(token))return null;seen.add(token);}}
  if(number&&(token.length>10||!Number.isFinite(Number(token))))return null;
  if(token==='('){depth++;if(depth>10)return null;}if(token===')'&&--depth<0)return null;
  if(token==='^'){
   if(++powers>4)return null;
   let end=n+1;const wrapped=tokens[end]==='(';if(wrapped)end++;
   if(tokens[end]==='+'||tokens[end]==='-')end++;
   if(!/^\d+$/u.test(tokens[end]||'')||Number(tokens[end])>16)return null;
   if(wrapped&&tokens[end+1]!==')')return null;
  }
  const previous=tokens[n-1];if(n&&((number||identifier||token==='(')&&(/^(?:\d|[a-z])/u.test(previous)||previous===')'))&&!(functions.has(previous)&&token==='('))output.push('*');
  output.push(token);
 }
 if(depth||seen.size>3)return null;
 const result=output.join('');if(/\^[^+*/-]{0,30}\^/u.test(result))return null;return result;
}
export function worksheetExpressionMatches(value,expected,{periodic=true}={}){
 const a=canonicalWorksheetExpression(value),b=canonicalWorksheetExpression(expected);if(!a||!b)return false;if(a===b)return true;
 try{
  const left=nerdamer(a),right=nerdamer(b);if(left.eq(right))return true;
  if(periodic&&left.variables().includes('k')&&right.variables().includes('k')){
   const stepLeft=nerdamer.diff(left,'k'),stepRight=nerdamer.diff(right,'k');
   if(stepLeft.variables().length||stepRight.variables().length||stepLeft.eq('0')||!(stepLeft.eq(stepRight)||stepLeft.eq(nerdamer('-1').multiply(stepRight))))return false;
   const offsetLeft=left.sub('k','0'),offsetRight=right.sub('k','0');
   if(!left.eq(stepLeft.multiply(nerdamer('k')).add(offsetLeft))||!right.eq(stepRight.multiply(nerdamer('k')).add(offsetRight)))return false;
   const offset=nerdamer.simplify(offsetLeft.subtract(offsetRight).divide(stepLeft)).toString();return /^[+-]?\d+$/u.test(offset);
  }
 }catch{return false;}
 return false;
}
