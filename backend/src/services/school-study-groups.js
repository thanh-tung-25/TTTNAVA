export function schoolGroupId(row){return Number(row.grade)>=6&&['tieng-anh','tieng-viet'].includes(row.subject_id)?row.chapter_id:row.lesson_id;}
export function buildSchoolGroups(rows){
 const groups=new Map();
 for(const row of rows){
  const id=schoolGroupId(row),merged=id===row.chapter_id;
  if(!groups.has(id))groups.set(id,{id,grade:Number(row.grade),subjectId:row.subject_id,title:merged?row.chapter_name:row.lesson_name,chapterId:row.chapter_id,chapterName:row.chapter_name,semester:row.semester,parts:[],questionCount:0});
  const group=groups.get(id);group.parts.push({id:row.lesson_id,topicId:row.topic_id,title:row.lesson_name});group.questionCount+=Number(row.question_count||0);
 }
 return [...groups.values()];
}
