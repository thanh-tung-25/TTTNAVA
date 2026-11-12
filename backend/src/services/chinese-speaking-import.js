import {chineseQuestionPrompt} from '../../../frontend/assets/js/chinese-question-prompt.js';

export const speakingSection=/^\[(?:LUYEN NOI|LUYỆN NÓI|SPEAKING)\]$/iu;
const prefix=/^(?:(?:câu(?: hỏi)?|question)\s*\d+\s*[.:：)．、-]?|第[\d一二三四五六七八九十]+[题題问問]\s*[.:：、]?|\d+\s*[.)．、:：-]|[-•])\s*/iu;
export function parseSpeakingText(raw){
 const items=[];
 for(const rawLine of raw.split(/\r?\n/u)){
  const line=rawLine.replace(/\u00a0|\*\*/gu,' ').trim();
  if(!line||speakingSection.test(line)||/^(?:MÔN|MON|LỚP|LOP|CHỦ ĐỀ|CHU DE|HSK)\s*[:：\d]/iu.test(line))continue;
  const meaning=line.match(/^(?:Nghĩa(?: tiếng Việt)?|Dịch|译文|意思)\s*[:：]\s*(.*)$/iu);
  if(meaning&&items.at(-1)?.data.practice==='speaking'){items.at(-1).data.meaning=meaning[1];continue;}
  const grading=line.match(/^(Đáp án tham khảo|Câu trả lời tham khảo|参考答案|Tiêu chí chấm|Từ cần dùng)\s*[:：]\s*(.*)$/iu);
  if(grading&&items.at(-1)?.data.practice==='speaking'){items.at(-1).data[/^(?:Tiêu chí|Từ cần)/iu.test(grading[1])?'assessment_notes':'answer_reference']=grading[2];continue;}
  const cells=line.split(/\t|\s*[|｜]\s*/u).map(v=>v.trim());
  if(cells.length>1&&/^(?:STT|序号|Câu hỏi(?: tiếng Trung)?|中文|Chữ Hán)$/iu.test(cells[0]))continue;
  if(cells.length>1&&/^\d+[.)]?$/u.test(cells[0]))cells.shift();
  const text=chineseQuestionPrompt(cells[0].replace(prefix,'').trim());
  if(!text)continue;
  if(/\p{Script=Han}/u.test(text)&&! /^(?:Đáp án|Lời giải|Gợi ý|答案|参考答案|回答|拼音)\s*[:：]/iu.test(text)){
   items.push({kind:'dialogue',data:{practice:'speaking',text,...(cells[1]?{meaning:cells[1]}:{}),...(cells[2]?{answer_reference:cells[2]}:{}),...(cells[3]?{assessment_notes:cells.slice(3).join(' | ')}:{})}});
  }else items.push({kind:'unknown',data:{text:line}});
 }
 return items;
}
