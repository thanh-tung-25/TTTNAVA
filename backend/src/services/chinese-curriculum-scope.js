import {q1QuizVocabulary} from '../data/chinese-q1-quiz-vocabulary.js';
import {curriculumSpeaking} from '../data/chinese-curriculum-speaking.js';
import {segmentLearnedChinese,cumulativeVocabulary} from './chinese-quiz-language.js';
export function vocabularyLesson(lesson){const n=Number(lesson?.position);return Number(lesson?.level_id)===1&&q1QuizVocabulary.some(l=>l.number===n)?n:null;}
export function boundChatSettings(lesson,settings){
 const number=vocabularyLesson(lesson);if(!number)return settings;
 const approved=curriculumSpeaking[number],allowed_words=[...new Set(cumulativeVocabulary(number).words.map(w=>w.hanzi))];
 let opening=settings.opening,translation=settings.translation;
 try{segmentLearnedChinese(opening,number);segmentLearnedChinese(translation,number);}catch{opening=approved[0].text;translation=approved[0].meaning;}
 return {...settings,opening,translation,_vocabulary_lesson:number,allowed_words};
}
export function boundedClosing(settings){
 const n=settings?._vocabulary_lesson;
 return n?{reply_zh:n>=4?'再见！':'好！',translation_vi:'Mình kết thúc buổi trò chuyện ở đây nhé. Hẹn gặp lại!'}:{reply_zh:'今天先聊到这里吧。下次见！',translation_vi:'Hôm nay mình trò chuyện đến đây nhé. Hẹn gặp lại!'};
}
export function boundedFallback(settings){
 const n=settings?._vocabulary_lesson;if(!n)return {reply_zh:'请再说一次，好吗？',translation_vi:'Kết nối vừa gián đoạn. Bạn nói lại một lần nhé?'};
 const q=curriculumSpeaking[n][0];return {reply_zh:q.text,translation_vi:q.meaning};
}
export function restrictChatReply(reply,settings){
 if(!settings?._vocabulary_lesson)return reply;
 try{segmentLearnedChinese(reply.reply_zh,settings._vocabulary_lesson);segmentLearnedChinese(reply.translation_vi,settings._vocabulary_lesson);return reply;}catch{return boundedFallback(settings);}
}
