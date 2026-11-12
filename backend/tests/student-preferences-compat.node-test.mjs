import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {closePool} from '../src/config/db.js';
import {preferenceView} from '../src/services/student-experience.js';

after(async()=>{await closePool();});

test('new students receive a lion name while retaining the compatible stored companion key',()=>{
 assert.deepEqual(preferenceView('new-student'),{profile_id:'new-student',minutes:10,font_scale:'normal',speech_rate:1,effects_enabled:1,companion:'owl',companion_name:'Sư tử nhỏ',equipped_frame:null,equipped_background:null,onboarding_at:null});
});

test('legacy default names are presented as lions without mutating saved preferences',()=>{
 for(const [oldName,newName]of [['Cú nhỏ','Sư tử nhỏ'],['Cú thông thái','Sư tử thông thái'],['Cú mèo','Sư tử nhỏ'],[' Cú nhỏ ','Sư tử nhỏ']]){
  const row=Object.freeze({profile_id:'existing-student',companion:'owl',companion_name:oldName,minutes:15,font_scale:'large',equipped_frame:'frame-mint'});
  assert.deepEqual(preferenceView('existing-student',row),{...row,companion_name:newName});
  assert.equal(row.companion_name,oldName);
 }
});

test('custom companion names and the names of other animals remain unchanged',()=>{
 for(const [companion,name]of [['owl','Bạn Nắng'],['owl','Cú nhỏ của Minh'],['panda','Cú nhỏ'],['bunny','Thỏ của An'],['owl','Sư tử nhỏ']]){
  const row=Object.freeze({profile_id:'student',companion,companion_name:name,minutes:5});
  assert.equal(preferenceView('student',row),row);
 }
});
