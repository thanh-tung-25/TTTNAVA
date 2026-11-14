import {createRequire} from 'node:module';
import {extractChinese} from './chinese-import.js';
const require=createRequire(import.meta.url),Zip=createRequire(require.resolve('mammoth'))('jszip');
export async function zipCurriculumArtifacts(files){
 const zip=new Zip(),date=new Date('2026-11-14T00:00:00Z');
 for(const [name,bytes]of files)zip.file(name,bytes,{date,createFolders:false});
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const p=text=>'<w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="23"/></w:rPr><w:t xml:space="preserve">'+esc(text)+'</w:t></w:r></w:p>';
const table=rows=>'<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="single" w:sz="4" w:color="D9D2E9"/>`).join('')+'</w:tblBorders></w:tblPr>'+rows.map((row,n)=>'<w:tr>'+row.map(cell=>'<w:tc><w:tcPr>'+(n===0?'<w:shd w:fill="EDE5FA"/>':'')+'</w:tcPr>'+p(cell)+'</w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>';
export async function buildCurriculumWord(plan,section='all'){
 const body=[p('MÔN: Tiếng Trung — HSK 1'),p('CHỦ ĐỀ: '+plan.source.title),p('CHỦ ĐỀ: Đồng bộ theo danh sách từ vựng đầy đủ ngày 14/11/2026')];
 if(['all','vocabulary'].includes(section)){
  body.push(p('[TU VUNG]'),table([['Chữ Hán','Pinyin','Nghĩa tiếng Việt','Nhóm'],...plan.source.words.map(w=>[w.hanzi,w.pinyin,w.meaning,w.group==='main'?'Từ mới':w.group==='numbers'?'Số đếm':'Từ mở rộng'])]));
 }
 if(['all','questions'].includes(section)){
  body.push(p('[CAU HOI]'));
  plan.items.filter(i=>i.kind==='question').forEach((q,n)=>{body.push(p(`Câu ${n+1}. ${q.data.prompt}`),...q.data.options.map((o,k)=>p(`${'ABCD'[k]}. ${o}`)),p('Đáp án: '+'ABCD'[q.data.options.indexOf(q.data.accepted[0])]),p('Lời giải: '+q.data.explanation),p('Độ khó: '+(q.data.difficulty==='easy'?'Dễ':'Vừa')));});
 }
 if(['all','reading'].includes(section))for(const [kind,heading]of [['grammar','[NGU PHAP]'],['reading','[BAI DOC]'],['dialogue','[HOI THOAI]']]){
  body.push(p(heading));for(const item of plan.items.filter(i=>i.kind===kind&&!i.data.practice))body.push(p((item.data.title?item.data.title+': ':'')+item.data.text.replaceAll('\n',' ')+(item.data.meaning?' — '+item.data.meaning.replaceAll('\n',' '):'')));
 }
 if(['all','speaking'].includes(section)){
  body.push(p('[LUYEN NOI]'));plan.items.filter(i=>i.data.practice==='speaking').forEach((item,n)=>body.push(p(`Câu ${n+1}. ${item.data.text}`),p('Nghĩa: '+item.data.meaning),p('Đáp án tham khảo: '+item.data.answer_reference),p('Tiêu chí chấm: '+item.data.assessment_notes)));
 }
 if(section==='activities')for(const [n,t]of plan.activities.tasks.entries())body.push(p(`Hoạt động ${n+1} — ${t.type}`),p(t.prompt),...(t.speech?[p('Câu nghe: '+t.speech)]:[]),...(t.tokens?[p('Từ để xếp: '+t.tokens.join(' | '))]:[]),...(t.options||[]).map((o,k)=>p(`${k+1}. ${o}`)),p('Đáp án: '+t.answer),p('Lời giải: '+t.explanation));
 if(section==='ai')body.push(p('Chủ đề: '+plan.chat.goal),p('Câu mở đầu: '+plan.chat.opening),p('Nghĩa: '+plan.chat.translation),p('Từ trọng tâm: '+plan.chat.required_words.join('、')),p(`Chỉ dùng từ trong danh sách bài 1 đến bài ${plan.number}. Khi câu sinh ra có từ ngoài phạm vi, dùng câu hỏi dự phòng đã duyệt trong bài.`));
 if(section==='street')for(const [n,m]of plan.street.missions.entries())body.push(p('Nhiệm vụ '+(n+1)),p(m.instruction),p('Câu nghe: '+m.speech),...m.options.map(o=>p(o.id+'. '+o.label)),p('Đáp án: '+m.answer),p('Phản hồi: '+m.feedback));
 const zip=new Zip(),date=new Date('2026-11-14T00:00:00Z'),file=(name,data)=>zip.file(name,data,{date,createFolders:false});
 file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 file('word/document.xml','<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body.join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="900" w:bottom="1080" w:left="900"/></w:sectPr></w:body></w:document>');
 const buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
 return {buffer,...(['all','vocabulary','questions','reading','speaking'].includes(section)?await extractChinese(buffer,{destination:section==='speaking'?'speaking':'general'}):{})};
}
