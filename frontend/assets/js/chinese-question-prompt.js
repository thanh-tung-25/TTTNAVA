// Remove pronunciation annotations beside Hanzi, while keeping parenthetical notes.
const annotation=/(\p{Script=Han}[，。！？、：；]*["'”’」』]?)\s*[（(]\s*([^()（）\r\n]+?)\s*[)）]/gu;
const pinyinLetters=/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ\u0300-\u036f1-5\s'’:\-]+$/iu;
const syllables=/^(?:(?:[zcs]h|[bpmfdtnlgkhjqxrzcsyw])?(?:iang|iong|uang|uai|iao|ian|uan|ang|eng|ing|ong|ai|ei|ao|ou|an|en|er|ia|ie|iu|in|ua|uo|ui|un|ue|a|o|e|i|u)r?[1-5]?)+$/u;
export function chineseQuestionPrompt(value){
 const text=String(value??''),needsWords=/(?:sắp xếp|xếp (?:các )?từ|ghép|nối)/iu.test(text.split(/\r?\n/u)[0]);
 return text.replace(/\r?\n\s*Từ\/cụm từ gợi ý\s*[:：]([^\r\n]*)/giu,(match,words)=>needsWords?'\nCác mục trong bài:'+words:'').replace(annotation,(match,hanzi,pinyin)=>{
  if(!pinyinLetters.test(pinyin))return match;
  const plain=pinyin.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/u:/gu,'u');
  return plain.split(/[\s'’\-]+/u).every(part=>syllables.test(part))?hanzi:match;
 });
}
