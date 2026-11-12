import {el} from './chinese-common.js';
import {questionAudio} from './question-audio.js';

export function speakingResultStyles(){if(!document.querySelector('link[data-speaking-ai-style]'))document.head.append(el('link',{rel:'stylesheet',href:'/assets/css/chinese-speaking-ai.css','data-speaking-ai-style':'true'}));}

export function renderSpeakingResult(host,submission){
 speakingResultStyles();
 const result=submission.result;if(!result){host.replaceChildren(el('p',{text:'Bài chưa có kết quả hoàn tất. Học sinh có thể gửi chấm lại từ bản ghi đang mở.'}));return;}
 const summary=el('div',{class:'speaking-ai-summary'},[el('strong',{class:'speaking-ai-score',text:result.overall_score===null?'Cô xem lại':result.overall_score+'/100'}),el('div',{},[el('h3',{text:'Kết quả luyện nói'}),el('p',{text:`${result.scored_count}/${result.question_count} câu đủ dữ liệu chấm · Mã lượt ${submission.recording_code}`})])]);
 const cards=result.questions.map(question=>{
  const body=[el('header',{},[el('h4',{text:'Câu '+question.index}),el('span',{class:'speaking-ai-question-score',text:question.score===null?'Cần xem lại':question.score+'/100'})]),el('p',{class:'speaking-ai-hanzi',text:question.question}),el('p',{class:'speaking-ai-transcript',text:'AI nghe được: '+(question.transcript||'Chưa nghe rõ')}),el('p',{text:question.feedback})];
  const scores=[['Đúng ý',question.content_score],['Từ & ngữ pháp',question.grammar_score]];
  // Preserve older four-part results; new transcription-based assessments only
  // display the two criteria actually graded.
  if(result.weights?.pronunciation>0||!result.weights&&question.pronunciation_score!=null)scores.push(['Phát âm',question.pronunciation_score]);
  if(result.weights?.fluency>0||!result.weights&&question.fluency_score!=null)scores.push(['Trôi chảy',question.fluency_score]);
  body.push(el('dl',{class:'speaking-ai-metrics'},scores.map(([label,value])=>el('div',{},[el('dt',{text:label}),el('dd',{text:value===null?'—':String(value)})]))));
  if(question.errors?.length)body.push(el('ul',{class:'speaking-ai-errors'},question.errors.map(error=>el('li',{},[el('strong',{text:error.original+' → '+error.suggestion}),el('p',{text:error.explanation})]))));
  if(question.practice_words?.length)body.push(el('p',{class:'speaking-ai-practice',text:'Từ nên luyện phát âm: '+question.practice_words.map(word=>word.word).join(' · ')}));
  if(question.correction)body.push(el('div',{class:'speaking-ai-correction'},[el('span',{text:'Cách nói gợi ý'}),el('p',{class:'speaking-ai-hanzi',text:question.correction}),el('p',{text:question.correction_pinyin||''}),questionAudio(question.correction,{language:'zh-CN',label:'Nghe câu gợi ý'})]));
  return el('article',{class:'speaking-ai-question'},body);
 });
 host.replaceChildren(summary,...cards,el('p',{class:'speaking-note',text:result.notice}));
}
