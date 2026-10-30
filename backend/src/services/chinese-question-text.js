// Paragraph-based Word questions. Answers are resolved only from explicit source labels.
const start = /^(?:câu|cau)\s*(\d+)\s*[.:)\-]\s*(.*)$/iu;
const section = /^\[(TU VUNG|NGU PHAP|HOI THOAI|BAI DOC|CAU HOI)\]$/i;
export function cleanChineseLine(line) {
  return line.replace(/\u00a0/g,' ').replace(/\*\*/g,'').trim();
}
export function isQuestionStart(line) { return start.test(line); }
export function isChineseSection(line) { return section.test(line); }
export function parseChineseQuestion(lines) {
  const match=lines[0].match(start), options=[], extras=[];
  let prompt=match[2], explanation='', answer='', difficulty='', last='prompt';
  for(const line of lines.slice(1)) {
    const option=line.match(/^([A-Z])\s*[.)：:]\s*(.+)$/u);
    const field=line.match(/^(đáp án(?: đúng)?|dap an|answer|lời giải|loi giai|giải thích|giai thich|độ khó|do kho|difficulty)\s*[:：]\s*(.*)$/iu);
    if(field) {
      const key=field[1].toLocaleLowerCase('vi');
      if(/^(đáp án|dap an|answer)/u.test(key)){answer=field[2];last='answer';}
      else if(/^(độ khó|do kho|difficulty)/u.test(key)){difficulty=field[2];last='';}
      else{explanation=field[2];last='explanation';}
    } else if(option) {options.push({key:option[1],text:option[2]});last='option';}
    else if(last==='prompt')prompt+='\n'+line;
    else if(last==='option')options[options.length-1].text+='\n'+line;
    else if(last==='explanation')explanation+='\n'+line;
    else {extras.push(line);last='';}
  }
  const accepted=[];
  if(answer) {
    const key=answer.trim().match(/^([A-Z])[.)]?$/iu);
    const selected=key?options.filter(o=>o.key===key[1].toUpperCase()):options.filter(o=>o.text===answer.trim());
    if(selected.length===1)accepted.push(selected[0].text);
    else extras.push('Đáp án chưa xác định được: '+answer);
  }
  const difficultyMap={'dễ':'easy','de':'easy','easy':'easy','trung bình':'medium','vừa':'medium','medium':'medium','khó':'hard','kho':'hard','hard':'hard'};
  const resolvedDifficulty=difficultyMap[difficulty.toLocaleLowerCase('vi').trim()];
  if(difficulty&&!resolvedDifficulty)extras.push('Độ khó chưa xác định: '+difficulty);
  const keys=options.map(o=>o.key);
  if(new Set(keys).size!==keys.length) {accepted.length=0;extras.push('Ký hiệu lựa chọn bị trùng; cần kiểm tra: '+keys.join(', '));}
  return [{kind:'question',data:{type:'choice',prompt,options:options.map(o=>o.text),accepted,explanation,...(resolvedDifficulty?{difficulty:resolvedDifficulty}:{}),approved:false}},...extras.map(text=>({kind:'unknown',data:{text}}))];
}
