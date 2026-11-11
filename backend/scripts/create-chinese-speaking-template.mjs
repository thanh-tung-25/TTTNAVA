import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Zip=createRequire(require.resolve('mammoth'))('jszip');
const zip=new Zip(),escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const paragraphs=[
 'MÔN: Tiếng Trung',
 'CHỦ ĐỀ: Luyện nói theo bài học',
 '[LUYEN NOI]',
 'Câu 1. 你叫什么名字？',
 'Nghĩa: Bạn tên là gì?',
 'Câu 2. 你是哪国人？',
 'Nghĩa: Bạn là người nước nào?',
 'Câu 3. 请问，这是谁的名片？',
 'Nghĩa: Xin hỏi, đây là danh thiếp của ai?'
];
zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paragraphs.map(text=>'<w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>').join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>');
await writeFile(new URL('../../frontend/assets/templates/chinese-speaking-template.docx',import.meta.url),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Chinese speaking Word template created.');
