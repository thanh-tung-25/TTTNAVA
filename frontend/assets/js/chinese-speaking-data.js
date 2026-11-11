import {chineseQuestionPrompt} from './chinese-question-prompt.js';

export const SPEAKING_SECONDS=30;
export function speakingQuestions(activities,items=[]){
 const seen=new Set();
 const imported=items.filter(i=>i.kind==='dialogue'&&i.data?.practice==='speaking');
 const source=imported.length?imported.map(i=>({speech:i.data.text})):(activities?.tasks||[]).filter(t=>t.type==='dialogue');
 return source.flatMap(t=>{
  const text=chineseQuestionPrompt(t.speech).trim();
  // Use explicit Word questions first, then the lesson's dialogue source.
  if(!text||text.length>180||! /\p{Script=Han}/u.test(text)||seen.has(text))return [];
  seen.add(text);return [{text}];
 });
}
export function shuffledQuestions(questions){
 const copy=[...questions];
 for(let n=copy.length-1;n>0;n--){const j=Math.floor(Math.random()*(n+1));[copy[n],copy[j]]=[copy[j],copy[n]];}
 return copy.slice(0,10);
}
export function speakingStamp(profile,set,index){
 const now=new Date(),code=crypto.randomUUID().slice(0,8).toUpperCase();
 const name=String(profile.displayName||profile.display_name||profile.username||'Học sinh');
 const date=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'medium'}).format(now);
 return {name,username:profile.username||'',lesson:set.lesson_title||set.title,level:set.level_id,index:index+1,code,date,origin:location.host};
}
export function speakingFilename(stamp,mime){
 const name=stamp.name.normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/gu,'d').replace(/[^a-z0-9]+/giu,'_').replace(/^_|_$/gu,'').slice(0,45)||'HocSinh';
 return `TTNAVA_HSK${stamp.level}_Cau${String(stamp.index).padStart(2,'0')}_${name}_${stamp.code}.${mime.includes('mp4')?'mp4':'webm'}`;
}
export function speakingError(error){
 if(['NotAllowedError','PermissionDeniedError'].includes(error.name))return 'Camera hoặc microphone đang bị chặn. Hãy cho phép trong trình duyệt rồi bấm bật lại.';
 if(['NotFoundError','DevicesNotFoundError'].includes(error.name))return 'Chưa tìm thấy camera và microphone. Hãy kết nối thiết bị rồi thử lại.';
 if(['NotReadableError','TrackStartError'].includes(error.name))return 'Camera hoặc microphone đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
 return error.message||'Chưa quay được video. Hãy thử bật lại camera.';
}
