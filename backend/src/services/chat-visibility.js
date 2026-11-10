import {query} from '../config/db.js';
import {one} from '../repositories/chinese.js';
import {notFound} from '../utils/errors.js';
import {studentVisibleCondition,canProfilesInteract} from '../utils/student-visibility.js';

export function chatProfileCondition(viewer,alias='p'){
 if(!/^[a-z_]+$/.test(alias))throw Error('Invalid profile alias');
 const visible=studentVisibleCondition(viewer,alias);
 if(viewer.role==='student'&&viewer.student_creator_scope!=='chinese'){
  return `(${visible} AND (${alias}.role<>'admin' OR COALESCE(${alias}.admin_scope,'super')<>'chinese'))`;
 }
 return visible;
}
export function chatRoomCondition(viewer,alias='r'){
 if(!/^[a-z_]+$/.test(alias))throw Error('Invalid room alias');
 const allowed=chatProfileCondition(viewer,'pv');
 if(allowed==='1=1')return allowed;
 const denied=`NOT COALESCE((${allowed}),FALSE)`;
 return `(NOT EXISTS(SELECT 1 FROM profiles pv WHERE pv.id=${alias}.owner_id AND ${denied})
  AND NOT EXISTS(SELECT 1 FROM chat_members mv JOIN profiles pv ON pv.id=mv.student_id WHERE mv.room_id=${alias}.id AND ${denied})
  AND NOT EXISTS(SELECT 1 FROM chat_messages xv JOIN profiles pv ON pv.id=xv.sender_id WHERE xv.room_id=${alias}.id AND ${denied}))`;
}
export async function chatProfile(id,run=query){
 return one('SELECT id,role,admin_scope,student_creator_scope FROM profiles WHERE id=?',[id],run);
}
export async function assertChatParticipants(ids,run=query){
 const profiles=[];for(const id of [...new Set(ids)])profiles.push(await chatProfile(id,run));
 for(let i=0;i<profiles.length;i++)for(let j=i+1;j<profiles.length;j++){
  if(!canProfilesInteract(profiles[i],profiles[j]))throw notFound();
 }
}
export async function assertRoomVisibleTo(user,id,run=query){
 const viewer=await chatProfile(user,run);
 return one(`SELECT r.id FROM chat_rooms r WHERE r.id=? AND ${chatRoomCondition(viewer)}`,[id],run);
}
