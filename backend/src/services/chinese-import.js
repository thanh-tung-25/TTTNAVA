import mammoth from 'mammoth';
import { badRequest } from '../utils/errors.js';
import { cleanChineseLine, isQuestionStart, isChineseSection, parseChineseQuestion } from './chinese-question-text.js';
// Only explicit source data is recognized. Unrecognized paragraphs remain editable.
export function parseChineseText(raw) {
 const items = []; let section = 'unknown';
 const sections = { '[TU VUNG]':'vocabulary','[NGU PHAP]':'grammar','[HOI THOAI]':'dialogue','[BAI DOC]':'reading','[CAU HOI]':'question' };
 const lines=raw.split(/\r?\n/).map(cleanChineseLine).filter(Boolean);
 for (let n=0;n<lines.length;n++) {
  const line=lines[n];
  if(isQuestionStart(line)) {
   const block=[line];
   while(n+1<lines.length&&!isQuestionStart(lines[n+1])&&!isChineseSection(lines[n+1]))block.push(lines[++n]);
   items.push(...parseChineseQuestion(block));continue;
  }
  // These are document metadata, retained in raw_text, not learning activities.
  if(/^(MÔN|MON|LỚP|LOP|CHỦ ĐỀ|CHU DE)\s*[:：]/iu.test(line))continue;
  if (sections[line.toUpperCase()]) { section = sections[line.toUpperCase()]; continue; }
  const cells = line.split(/\t|\s*\|\s*/).map(s => s.trim());
  if (/^(Hanzi|Chữ Hán|Loại|Type)\s*$/iu.test(cells[0]) && cells.length > 1) continue;
  let data;
  if (section === 'vocabulary' && cells.length >= 3) {
   const [hanzi,pinyin,meaning,part_of_speech='',example='',example_pinyin='',example_meaning='',audio_url='',image_url='',mnemonic='',radicals='',group='main'] = cells;
   data = {hanzi,pinyin,meaning,part_of_speech,example,example_pinyin,example_meaning,audio_url,image_url,mnemonic,radicals,group};
  } else if (section === 'question' && cells.length >= 4) {
   const [type,prompt,options,accepted,explanation='',audio_url='',difficulty='medium',targets=''] = cells;
   data = {type,prompt,options:options.split(';;').filter(Boolean),targets:targets.split(';;').filter(Boolean),accepted:accepted.split(';;').filter(Boolean),explanation,audio_url,difficulty,approved:false};
  } else if (['grammar','dialogue','reading'].includes(section)) data = {text:line};
  else { items.push({kind:'unknown', data:{text:line}}); continue; }
  items.push({kind:section,data});
 }
 return items;
}
export async function extractChinese(buffer) {
 if (buffer.length<4 || buffer.readUInt16LE(0) !== 0x4b50) throw badRequest('Tệp không phải tài liệu .docx hợp lệ');
 // Bound declared decompressed ZIP size before Mammoth allocates document/media buffers.
 let end=-1;
 for(let p=buffer.length-22;p>=Math.max(0,buffer.length-65557);p--)if(buffer.readUInt32LE(p)===0x06054b50){end=p;break;}
 if(end<0)throw badRequest('Cấu trúc ZIP của .docx không hợp lệ');
 const entries=buffer.readUInt16LE(end+10);let offset=buffer.readUInt32LE(end+16),total=0;
 if(entries>2000||offset===0xffffffff)throw badRequest('Tệp Word vượt giới hạn cấu trúc');
 for(let n=0;n<entries;n++){
  if(offset+46>buffer.length||buffer.readUInt32LE(offset)!==0x02014b50)throw badRequest('Cấu trúc .docx không hợp lệ');
  total+=buffer.readUInt32LE(offset+24);
  if(total>80*1024*1024)throw badRequest('Tệp Word giải nén vượt 80 MB');
  offset+=46+buffer.readUInt16LE(offset+28)+buffer.readUInt16LE(offset+30)+buffer.readUInt16LE(offset+32);
 }
 try {
  // Mammoth HTML preserves table cells; convert only structural separators to plain text.
  const result = await mammoth.convertToHtml({buffer});
  const html = result.value.replace(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi,cell=>cell.replace(/<\/p>/gi,' ').replace(/<p[^>]*>/gi,''));
  const raw = html.replace(/<br\s*\/?>/gi,'\n').replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi,'\t').replace(/<\/p>\s*<p[^>]*>/gi,'\n')
   .replace(/<\/tr>|<\/h[1-6]>|<\/p>/gi,'\n').replace(/<[^>]*>/g,'')
   .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
  if (raw.length > 500000) throw badRequest('Nội dung giải nén quá lớn (tối đa 500.000 ký tự)');
  return {raw,items:parseChineseText(raw),warnings:result.messages.map(m => m.message)};
 } catch(e) { if (e.status) throw e; throw badRequest('Không đọc được .docx. Hãy chuyển .doc sang .docx và dùng mẫu nhập liệu.'); }
}
