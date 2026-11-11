import {describe,it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {parseChineseText,extractChinese} from '../src/services/chinese-import.js';
import {issues,setSchema} from '../src/validators/chinese.js';
const require=createRequire(import.meta.url),JSZip=require('jszip');
const oral=raw=>parseChineseText(raw,{destination:'speaking'});

describe('Chinese speaking Word source',()=>{
 it('reads numbered Chinese questions and retains optional teacher meanings',()=>{
  const items=oral('MÔN: Tiếng Trung\n[LUYEN NOI]\nCâu 1. 你叫什么名字？\nNghĩa: Bạn tên là gì?\n2. 你是哪国人？\n第三题：请问，这是谁的名片？');
  expect(items.map(i=>i.data.text)).toEqual(['你叫什么名字？','你是哪国人？','请问，这是谁的名片？']);
  expect(items[0].data.meaning).toBe('Bạn tên là gì?');
  expect(items.every(i=>i.kind==='dialogue'&&i.data.practice==='speaking')).toBe(true);
  expect(issues(items)).toEqual([]);
  expect(setSchema.parse({title:'Word speaking',status:'published',items}).items).toEqual(items);
 });
 it('reads table rows without making headings, numbering or meanings part of the audio',()=>{
  const items=oral('STT\tCâu hỏi tiếng Trung\tNghĩa\n1\t你叫什么名字？\tBạn tên là gì?\n2 | 你好吗？ | Bạn khỏe không?');
  expect(items).toHaveLength(2);expect(items[0].data.text).toBe('你叫什么名字？');expect(items[1].data.meaning).toBe('Bạn khỏe không?');
 });
 it('preserves notes and answers for explicit review instead of silently including them as questions',()=>{
  const items=oral('你叫什么名字？\nGhi chú cần kiểm tra\nĐáp án: 我叫安。\n答案：我叫安。');
  expect(items.map(i=>i.kind)).toEqual(['dialogue','unknown','unknown','unknown']);
  expect(issues(items).filter(i=>i.message.startsWith('Nội dung chưa xác định'))).toHaveLength(3);
 });
 it('keeps speaking sections separate from quiz and reading blocks in a combined Word',()=>{
  const items=parseChineseText('[CAU HOI]\nCâu 1. Nghĩa là gì?\nA. Chào\nB. Tạm biệt\nĐáp án: A\n[LUYỆN NÓI]\nCâu 1. 你好吗？\nCâu 2. 你叫什么名字？\n[BAI DOC]\n你好！');
  expect(items.map(i=>i.kind)).toEqual(['question','dialogue','dialogue','reading']);
  expect(items[1].data.practice).toBe('speaking');expect(items[3].data.practice).toBeUndefined();
 });
 it('blocks duplicates, non-Chinese and overlong questions before publication',()=>{
  const item={kind:'dialogue',data:{practice:'speaking',text:'你好吗？'}};
  expect(issues([item,item]).some(e=>e.message==='Nội dung trùng trong bộ')).toBe(true);
  for(const text of ['Bạn khỏe không?','你'.repeat(181),''])expect(issues([{...item,data:{...item.data,text}}]).some(e=>e.message.includes('180'))).toBe(true);
 });
 it('extracts the real downloadable Word template',async()=>{
  const file=await readFile(new URL('../../frontend/assets/templates/chinese-speaking-template.docx',import.meta.url));
  const result=await extractChinese(file,{destination:'speaking'});
  expect(result.items).toHaveLength(3);expect(issues(result.items)).toEqual([]);expect(result.items[2].data.text).toBe('请问，这是谁的名片？');
 });
 it('retains paragraph boundaries in native Word numbered lists and tables',async()=>{
  const zip=new JSZip();
  zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>');
  zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/numbering.xml','<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>');
  zip.file('word/_rels/document.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>');
  const p=text=>`<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
  zip.file('word/document.xml',`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p('你叫什么名字？')}${p('你是哪国人？')}<w:tbl><w:tr><w:tc><w:p><w:r><w:t>你好吗？</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Bạn khỏe không?</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`);
  const result=await extractChinese(await zip.generateAsync({type:'nodebuffer'}),{destination:'speaking'});
  expect(result.items.map(i=>i.data.text)).toEqual(['你叫什么名字？','你是哪国人？','你好吗？']);expect(result.items[2].data.meaning).toBe('Bạn khỏe không?');
 });
});
