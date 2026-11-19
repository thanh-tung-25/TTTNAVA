// Import the user's outline as catalog data. Document text never executes.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import mammoth from 'mammoth';

const subjects=[['TOÁN','toan','Toán'],['TIẾNG ANH','tieng-anh','Tiếng Anh'],['NGỮ VĂN','tieng-viet','Ngữ văn'],['VẬT LÍ','vat-li','Vật lí'],['HÓA HỌC','hoa-hoc','Hóa học'],['SINH HỌC','sinh-hoc','Sinh học'],['LỊCH SỬ','lich-su','Lịch sử'],['ĐỊA LÍ','dia-li','Địa lí'],['GIÁO DỤC CÔNG DÂN (GIÁO DỤC KINH TẾ VÀ PHÁP LUẬT)','kinh-te-phap-luat','Giáo dục kinh tế và pháp luật']];
export function parseHighschoolOutline(text){
 const books=[];let subject,book,chapter,semester='year',part='';
 const newChapter=(name,key)=>{
  const prefix=`hs${book.grade}-${book.subjectId}`;
  chapter={id:`${prefix}-${key||'c'+String(book.chapters.length+1).padStart(2,'0')}`,name,semester,part,sortOrder:book.chapters.length+1,lessons:[]};book.chapters.push(chapter);return chapter;
 };
 const lesson=(name,key)=>{if(!chapter)newChapter(part||'Mở đầu');chapter.lessons.push({id:key||`${chapter.id}-m${String(chapter.lessons.length+1).padStart(2,'0')}`,name,sortOrder:chapter.lessons.length+1});};
 const lines=text.split(/\r?\n/).map(line=>line.replace(/\s+/gu,' ').trim()).filter(Boolean);
 for(const line of lines){
  const selected=subjects.find(([heading])=>line===heading);if(selected){subject=selected;book=null;continue;}
  if(!subject||line==='MỤC LỤC THEO LỚP')continue;
  const grade=line.match(/^LỚP (10|11|12)$/u);
  if(grade){book={grade:Number(grade[1]),subjectId:subject[1],subjectName:subject[2],book:subject[1]==='tieng-anh'?'Global Success':'Kết nối tri thức với cuộc sống',chapters:[]};books.push(book);chapter=null;semester='year';part='';continue;}
  if(!book)throw Error('Missing grade before: '+line);
  if(/^(?:TẬP |HỌC KÌ )/u.test(line)){semester=/HỌC KÌ II\b/u.test(line)?'hk2':'hk1';chapter=null;part='';continue;}
  if(line.startsWith('Nguồn tra cứu:')){book.referenceUrl=line.slice('Nguồn tra cứu:'.length).trim();continue;}
  if(line.startsWith('Phần ')){part=line;chapter=null;continue;}
  if(/^(?:Chương |Chủ đề |Hoạt động thực hành|Mở đầu)/u.test(line)){newChapter(line);continue;}
  const unit=line.match(/^(Unit|Review) (\d+)(?:[. ]|$)/u);
  if(unit){newChapter(line,(unit[1]==='Unit'?'u':'r')+unit[2].padStart(2,'0'));continue;}
  const numbered=line.match(/^Bài (\d+)\.\s*(.+)$/u);
  if(numbered){
   const name=`Bài ${Number(numbered[1])}. ${numbered[2]}`;
   if(book.subjectId==='tieng-viet')newChapter(name,'b'+numbered[1].padStart(2,'0'));
   else lesson(name,`hs${book.grade}-${book.subjectId}-b${numbered[1].padStart(3,'0')}`);
   continue;
  }
  if(line.startsWith('Ôn tập')){newChapter(line);lesson(line);continue;}
  if(line.startsWith('•')){
   const content=line.replace(/^•\s*/u,'');
   if(book.subjectId==='tieng-anh'){for(const item of content.split('•').map(s=>s.trim()).filter(Boolean))lesson(item);}
   else if(book.subjectId==='tieng-viet'){
    if(content.startsWith('Văn bản/chủ điểm đọc tiêu biểu:')){
     chapter.readingExamples=content.split(':').slice(1).join(':').trim();
     for(const item of chapter.readingExamples.split(';').map(s=>s.trim()).filter(Boolean))lesson('Đọc: '+item);
    }else if(content.startsWith('Mạch hoạt động:')){
     for(const item of content.split(':').slice(1).join(':').split('•').map(s=>s.trim()).filter(s=>s&&s!=='Đọc'))lesson(item);
    }else throw Error('Unknown literature line: '+line);
   }else lesson(content);
   continue;
  }
  if(book.subjectId==='dia-li'&&book.grade===11){newChapter(line);continue;}
  throw Error('Unrecognized outline line: '+line);
 }
 if(books.length!==27||new Set(books.map(b=>`${b.grade}:${b.subjectId}`)).size!==27)throw Error('Expected all 27 grade/subject outlines');
 const ids=new Set();
 for(const book of books)for(const chapter of book.chapters){
  if(!chapter.lessons.length)throw Error('Empty chapter: '+chapter.name);
  if(chapter.name.length>160)throw Error('Chapter title too long: '+chapter.name);
  for(const row of chapter.lessons){if(ids.has(row.id)||row.id.length>60||row.name.length>255)throw Error('Invalid lesson: '+row.name);ids.add(row.id);}
 }
 return {version:1,notes:['Mục lục theo tài liệu người dùng cung cấp; Ngữ văn gồm văn bản/chủ điểm tiêu biểu và mạch hoạt động ghi trong tài liệu.','Môn không có phân chia học kì trong tài liệu được xếp Cả năm.','Chỉ nhập mục lục, không tạo câu hỏi, bài giảng hoặc quyền học.'],books};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))await main();
async function main(){
 const input=process.argv[2];if(!input)throw Error('Usage: node backend/scripts/import-highschool-outline.mjs path-to-docx');
 const {value,messages}=await mammoth.extractRawText({path:input});if(messages.some(m=>m.type==='error'))throw Error('Could not extract outline');
 const catalog=parseHighschoolOutline(value),bytes=await fs.readFile(input);
 catalog.source={file:input.split(/[\\/]/u).at(-1),sha256:createHash('sha256').update(bytes).digest('hex')};
 await fs.writeFile(new URL('../seed-data/highschool-kntt.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n','utf8');
 console.log(JSON.stringify({books:catalog.books.length,chapters:catalog.books.reduce((n,b)=>n+b.chapters.length,0),lessons:catalog.books.reduce((n,b)=>n+b.chapters.reduce((m,c)=>m+c.lessons.length,0),0)}));
}
