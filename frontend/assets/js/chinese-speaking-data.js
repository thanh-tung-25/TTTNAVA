import {chineseQuestionPrompt} from './chinese-question-prompt.js';

export const SPEAKING_SECONDS=90;
export const SPEAKING_LIMIT=20;
export function speakingAssessmentEnabled(set){let value=set?.speaking_settings;try{if(typeof value==='string')value=JSON.parse(value);}catch{return false;}return value?.ai_assessment===true;}
export function speakingSettings(set){
 let value=set?.speaking_settings;try{if(typeof value==='string')value=JSON.parse(value);}catch{value=null;}
 const seconds=Number(value?.duration_seconds);return {duration_seconds:Number.isInteger(seconds)&&seconds>=30&&seconds<=300&&seconds%30===0?seconds:SPEAKING_SECONDS,order:value?.order==='free'?'free':'sequential'};
}
export const speakingTime=seconds=>`${String(Math.floor(Math.max(0,seconds)/60)).padStart(2,'0')}:${String(Math.max(0,Math.floor(seconds))%60).padStart(2,'0')}`;
export function speakingQuestions(activities,items=[]){
 const seen=new Set();
 const imported=items.filter(i=>i.kind==='dialogue'&&i.data?.practice==='speaking');
 const chosen=imported.some(i=>i.data.speaking_selected!==undefined)?imported.filter(i=>i.data.speaking_selected!==false):imported.slice(0,3);
 const source=imported.length?chosen.map(i=>({speech:i.data.text})):(activities?.tasks||[]).filter(t=>t.type==='dialogue');
 return source.flatMap(t=>{
  const text=chineseQuestionPrompt(t.speech).trim();
  // Use explicit Word questions first, then the lesson's dialogue source.
  if(!text||text.length>180||! /\p{Script=Han}/u.test(text)||seen.has(text))return [];
  seen.add(text);return [{text}];
 }).slice(0,imported.length?SPEAKING_LIMIT:3);
}
export function speakingStamp(profile,set){
 const now=new Date(),recording_id=crypto.randomUUID(),code=recording_id.slice(0,8).toUpperCase();
 const name=String(profile.displayName||profile.display_name||profile.username||'Học sinh');
 const date=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'medium'}).format(now);
 return {name,level:set.level_id,code,date,recording_id,recorded_at:now.toISOString()};
}
export function speakingFilename(stamp,mime){
 const name=stamp.name.normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/gu,'d').replace(/[^a-z0-9]+/giu,'_').replace(/^_|_$/gu,'').slice(0,45)||'HocSinh';
 return `TTNAVA_HSK${stamp.level}_BaiNoi_${stamp.total||1}Cau_${name}_${stamp.code}.${mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':'webm'}`;
}
export function speakingError(error){
 if(['NotAllowedError','PermissionDeniedError'].includes(error.name))return 'Micro đang bị chặn. Hãy cho phép trong trình duyệt rồi bấm bật lại.';
 if(['NotFoundError','DevicesNotFoundError'].includes(error.name))return 'Chưa tìm thấy micro. Hãy kết nối thiết bị rồi thử lại.';
 if(['NotReadableError','TrackStartError'].includes(error.name))return 'Micro đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
 return error.message||'Chưa ghi âm được. Hãy thử bật lại micro.';
}
