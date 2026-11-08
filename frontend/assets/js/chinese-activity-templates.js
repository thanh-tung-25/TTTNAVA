import {expandedActivities} from './chinese-activity-bank.js';
const lessons = [
 {title:'你好',aliases:['Xin Chào'],topic:'Chào hỏi'},
 {title:'你叫什么名字',aliases:['Hỏi tên, Hỏi họ, Quốc tịch'],topic:'Làm quen'},
 {title:'很高兴认识你',topic:'Trao danh thiếp'},
 {title:'你去哪儿',topic:'Đi taxi'},
 {title:'你要吃什么',topic:'Gọi món'},
 {title:'你在哪儿工作',topic:'Giới thiệu công việc'}
];

export function activityTemplate(set){
 if(Number(set.level_id)!==1)return null;
 const normalize=value=>String(value).normalize('NFC').toLocaleLowerCase('vi').replace(/[\s？?！!。.,，:：–—-]/gu,'');
 const title=normalize(set.lesson_title||set.title||'');
 const lesson=[...lessons].sort((a,b)=>b.title.length-a.title.length).find(l=>[l.title,...(l.aliases||[])].some(alias=>title.includes(normalize(alias))));
 if(!lesson)return null;
 return {topic:lesson.topic,tasks:expandedActivities(lesson.title)};
}
