import {withTransaction,isPostgres,closePool} from '../src/config/db.js';
import {seedSecondaryCatalog} from './lib/seed-secondary.mjs';
import {seedLiteratureCatalog} from './lib/seed-literature.mjs';
import {seedSecondaryEnglishCatalog} from './lib/seed-english-secondary.mjs';

try{
 const {counts,literature,english}=await withTransaction(async connection=>{
  const run=async(sql,params)=>(await connection.query(sql,params))[0];
  return {counts:await seedSecondaryCatalog(run,{postgres:isPostgres}),literature:await seedLiteratureCatalog(run,{postgres:isPostgres}),english:await seedSecondaryEnglishCatalog(run,{postgres:isPostgres})};
 });
 console.log(`Đã đồng bộ THCS: ${counts.courses} khóa; Toán 9: ${counts.chapters} chương/${counts.lessons} mục; Ngữ văn 6–9: ${literature.chapters} bài/${literature.lessons} mục; Tiếng Anh 6–9: ${english.chapters} Unit/Review, ${english.lessons} mục. Không nhập câu hỏi hoặc cấp quyền học.`);
}catch(error){
 console.error('Đồng bộ THCS thất bại:',error.message);
 process.exitCode=1;
}finally{await closePool();}
