import {withTransaction} from '../config/db.js';
import {notFound,AppError} from '../utils/errors.js';
import {parseJson} from '../utils/normalize.js';
import {validateQuestionPayload,normalizeQuestionStatus} from './admin-question-validation.js';

export async function publishLessonQuestions(lessonId,adminId){
 return withTransaction(async connection=>{
  const [lessons]=await connection.query('SELECT topic_id FROM curriculum_lessons WHERE id=?',[lessonId]);
  if(!lessons[0])throw notFound();
  const [questions]=await connection.query("SELECT * FROM questions WHERE topic_id=? AND status IN ('draft','visible') ORDER BY id FOR UPDATE",[lessons[0].topic_id]);
  for(const question of questions){
   const [options]=await connection.query('SELECT opt_key,option_text FROM question_options WHERE question_id=? ORDER BY sort_order',[question.id]);
   const [answers]=await connection.query('SELECT answer_json,explanation FROM question_answers WHERE question_id=?',[question.id]);
   const before={topicId:question.topic_id,type:question.type,prompt:question.prompt,difficulty:question.difficulty,status:normalizeQuestionStatus(question),imageUrl:question.image_url,options:options.map(o=>({key:o.opt_key,text:o.option_text})),answer:parseJson(answers[0]?.answer_json),explanation:answers[0]?.explanation};
   try{validateQuestionPayload(question.type,{...before,status:'published'});}catch(error){
    if(error instanceof AppError)throw new AppError(400,'BULK_PUBLISH_INVALID',`Chưa đăng câu nào. Câu “${question.prompt.slice(0,80)}” cần sửa: ${error.message}`);
    throw error;
   }
   await connection.query("UPDATE questions SET status='published',published_at=CURRENT_TIMESTAMP(3),updated_by=? WHERE id=?",[adminId,question.id]);
   await connection.query("INSERT INTO atomic_question_writes (question_id,admin_id,action,before_json,after_json) VALUES (?,?,'publish',?,?)",[question.id,adminId,JSON.stringify(before),JSON.stringify({...before,status:'published'})]);
  }
  return {published:questions.length};
 });
}
