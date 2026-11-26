import {renderChineseLessons} from '/assets/js/chinese-lesson-list.js';
import {initPage,syncDiamondTotal} from '/assets/js/ui-core.js';
import {request,el,root,button,link,card,field,table,error,notice,percentage} from '/assets/js/chinese-common.js';
import {writing,recording} from './learning-tools.js';
import {renderHistory} from './history-view.js';
import {mountPractice} from './applied-practice.js';
import {questionAudio,withChoiceAudio} from '/assets/js/question-audio.js';
import {chooseQuiz,wordTable,listeningPractice} from '/assets/js/chinese-study-extras.js';
import {animalPath} from '/assets/js/animal-path.js';
import {chineseQuestionPrompt} from '/assets/js/chinese-question-prompt.js';
import {sessionStudyDeck,uniqueStudyWords} from '/assets/js/chinese-study-variety.js';
import {mountSpeaking} from '/assets/js/chinese-speaking.js';
import {renderChineseAiChat} from '/assets/js/chinese-ai-chat.js';
import {renderChineseStreet} from '/assets/js/chinese-street.js';
import {configureChinesePage} from '/assets/js/chinese-student-navigation.js';
import {studyReward} from '/assets/js/study-reward.js';
import {prepareAnswerSound,playAnswerSound} from '/assets/js/answer-sound.js';
const params=new URLSearchParams(location.search);let catalog,timer,learner,activeStudyTimer,activeStudyAttempt,activeStudyNode,activeStudyWeekDays,lastStudyEngagement=Date.now(),activeStudyRequest=false;
const json=v=>typeof v==='string'?JSON.parse(v):v;
const extra=(title,children)=>el('details',{class:'learn-extra'},[el('summary',{text:title}),...children]);
function action(text,fn,primary=false){const b=button(text,async()=>{b.disabled=true;try{await fn();}catch(e){error(e);}finally{b.disabled=false;}});if(primary)b.className='btn btn-primary';return b;}
const markStudyEngagement=()=>{lastStudyEngagement=Date.now();};
for(const event of ['pointerdown','keydown','touchstart','input','scroll'])document.addEventListener(event,markStudyEngagement,{passive:true});
function stopActiveStudyClock(){clearInterval(activeStudyTimer);activeStudyTimer=null;activeStudyAttempt=null;activeStudyNode=null;}
function startActiveStudyClock(id,node){
 activeStudyNode=node;
 if(activeStudyAttempt===id&&activeStudyTimer)return;
 stopActiveStudyClock();activeStudyAttempt=id;activeStudyWeekDays=undefined;lastStudyEngagement=Date.now();
 const pulse=async()=>{
  if(activeStudyRequest||document.visibilityState!=='visible'||Date.now()-lastStudyEngagement>45000)return;
  activeStudyRequest=true;
  try{const state=await request('/study-time/activity','POST',{active:true});if(activeStudyAttempt!==id)return;
   if(Number.isFinite(state.week_days))activeStudyWeekDays=state.week_days;
   const minutes=Math.floor((state.daily_seconds||0)/60),earnedLabels=[...(state.earned||[]).map(item=>`${item.minutes} phút +${item.amount}`),...(state.week_earned||[]).map(item=>`${item.days} ngày học +${item.amount}`)];
   activeStudyNode?.replaceChildren(el('span',{text:`⏱ Hôm nay: ${minutes} phút làm bài · Mốc ngày: 10 phút +1, 30 phút tổng +5, 60 phút tổng +10. Chuỗi tuần: ${activeStudyWeekDays||0}/7 ngày · 5 ngày +5, 7 ngày tổng +10 kim cương.`}),...(state.earned_now?[el('strong',{class:'answer-correct',text:` Vừa nhận +${state.earned_now} kim cương${earnedLabels.length?' · '+earnedLabels.join(', '):''}.`})]:[]));
   if(state.earned_now)syncDiamondTotal();
  }catch{}
  finally{activeStudyRequest=false;}
 };
 void pulse();activeStudyTimer=setInterval(pulse,15000);
}
const quiz=async(id,review=false)=>chooseQuiz(id,async body=>{const a=await request('/attempts','POST',body);location.href='?attempt='+a.id;},review);
function studyStreakCard(progress){
 const minutes=Math.floor((progress.daily_seconds||0)/60),days=progress.week_days||0;
 return card('Chuỗi học tuần',[el('p',{class:'quiz-position',text:`🔥 ${days}/7 ngày học có ghi nhận trong tuần này`}),el('p',{text:`Hôm nay đã làm bài ${minutes} phút. Mốc thời gian: 10 phút nhận 1 kim cương, 30 phút tổng 5, 60 phút tổng 10.`}),el('p',{class:'muted',text:'Đạt mục tiêu 5 ngày trong tuần nhận 5 kim cương; đủ 7 ngày nhận thêm 5. Các ngày học đã lưu từ đầu tuần cũng được tính.'}),el('a',{class:'btn btn-ghost',href:'/pages/student/leaderboard/?program=chinese&range=week',text:'🏆 Bảng xếp hạng tuần'})]);
}
async function showStudyStreak(){try{const progress=await request('/study-time');root().prepend(studyStreakCard(progress));}catch{}}
async function boot(){
 if(params.get('view')==='practice'){params.delete('view');window.history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}
 const aiChat=params.get('view')==='ai-chat',street=params.get('view')==='street';
 document.body.classList.toggle('is-studying',!aiChat&&!street&&(params.has('set')||params.has('attempt')));
 document.body.classList.toggle('is-speaking',!aiChat&&!street&&params.get('mode')==='speak');
 const activeView={tests:'exam',notebook:'notebook',history:'history'}[params.get('view')]||'chinese';
 const profile=await initPage('student',activeView);
 learner=profile;
 if(profile.course?.kind!=='chinese'){location.replace('/pages/student/courses/?program=chinese');return;}
 if(profile.course?.kind==='chinese')params.set('level',String(profile.course.level));
 configureChinesePage(profile,params);
 if(aiChat){notice('');return renderChineseAiChat(root(),{level:profile.course.level});}
 if(street){notice('');return renderChineseStreet(root(),{level:profile.course.level});}
 notice('');if(params.has('attempt'))return showAttempt(await request('/attempts/'+params.get('attempt')));
 if(params.get('view')==='tests')return tests();
 catalog=await request('/catalog');
 if(params.has('set'))return learn(params.get('set'));
 if(params.get('view')==='notebook')return notebook();
 if(params.get('view')==='history')return renderHistory(catalog);
 lessons();
}
function lessons(){renderChineseLessons({catalog,params,quiz});void showStudyStreak();}
async function learn(id){
 const {set,items,progress,activities}=await request('/sets/'+id);let read=json(progress?.read_items||[]),last=progress?.last_item||null,displayed=null;
 const save=async item=>{await request('/sets/'+id+'/progress','PUT',{last_item:item,read_items:read});last=item;};
 root().append(el('header',{class:'study-bar'},[
  el('a',{class:'study-back',href:'?lesson='+encodeURIComponent(set.lesson_id),text:'←','aria-label':'Về danh sách bài',title:'Về danh sách bài'}),
  el('h1',{text:set.lesson_title}),
  el('details',{class:'study-menu'},[el('summary',{text:'⋯','aria-label':'Thêm tùy chọn'}),el('div',{class:'study-menu-content'},[
   link('Sổ từ',{view:'notebook'}),link('Kết quả',{view:'history'}),el('p',{class:'study-source',text:set.title})
  ])])
 ]));
 const clock=el('p',{class:'muted',text:'⏱ Thời gian học hôm nay sẽ được ghi nhận khi con đang học.'});root().append(clock);startActiveStudyClock('lesson-'+id,clock);
 const words=uniqueStudyWords(items.filter(i=>i.kind==='vocabulary')),questions=items.filter(i=>i.kind==='question'),reads=items.filter(i=>['grammar','reading','dialogue'].includes(i.kind)&&i.data.practice!=='speaking'),spoken=items.some(i=>i.kind==='dialogue'&&i.data.practice==='speaking');
 const mode=params.get('mode')||(words.length||questions.length?'cards':spoken?'speak':'read');
 const applied=activities?.tasks?.length?activities:null;
 if(mode==='speak'){mountSpeaking(root(),{set,activities:applied,items,profile:learner});return;}
 if(mode==='words'){wordTable(root(),words,id,catalog.lesson_progress?.find(row=>row.lessonId===set.lesson_id)?.studiedWordIds||[]);return;}
 if(mode==='listen'){listeningPractice(root(),words,id);return;}
 if(mode==='review'){root().append(action('Ôn 20 câu đã học',()=>quiz(id,true),true));await quiz(id,true);return;}
 if(mode==='apply'){
  if(applied)mountPractice(root(),applied,id);
  else root().append(el('p',{text:'Bài này chưa có hoạt động vận dụng. Hãy chọn Thẻ lật hoặc Bài đọc để tiếp tục.'}));
  return;
 }
 if(mode==='read'){
  const reward=studyReward({activity:'reading',sourceId:id,required:reads.length});
  if(reads.length)reward.begin();
  for(const i of reads)root().append(card(i.data.title||'Bài đọc',[el('p',{class:'read-text',text:i.data.text}),action(read.includes(i.id)?'Đã đọc':'Đánh dấu đã đọc',async()=>{if(!read.includes(i.id))read.push(i.id);await save(i.id);reward.item(i.id);notice('Đã lưu tiến độ đọc.');})]));
  if(reads.length)root().append(reward.node);
  if(!reads.length)root().append(el('p',{text:'Tài liệu này chưa có bài đọc.'}));
 }else if(words.length||questions.length){
  const cardReward=studyReward({activity:'cards',sourceId:id,required:Math.min(5,words.length)});
  if(words.length)cardReward.begin();
  let vocab=words.length>0&&!questions.some(q=>q.id===(params.get('word')||last));
  let deckKey=id+':'+(vocab?'vocabulary':'question'),deck=sessionStudyDeck(vocab?words:questions,deckKey),current=Math.max(0,deck.findIndex(w=>w.id===(params.get('word')||last))),flipped=false,frontMode='hanzi';
  const answers=new Map(),area=el('div'),caption=el('p',{class:'learn-caption',text:vocab?'Thẻ từ vựng':'Thẻ câu hỏi'});
  root().append(caption);
  const flip=async()=>{
   const item=deck[current];if(!flipped&&item.kind==='question'&&!answers.has(item.id))answers.set(item.id,await request('/sets/'+id+'/study/'+item.id));
   if(deck[current]?.id===item.id){flipped=!flipped;if(flipped&&item.kind==='vocabulary')cardReward.track(item.id);render();}
  };
  const move=async delta=>{current=(current+delta+deck.length)%deck.length;flipped=false;render();await save(deck[current].id);};
 const render=()=>{
   const focusLabel=area.contains(document.activeElement)?document.activeElement.matches('.flashcard')?'flashcard':document.activeElement.textContent:null;
   area.replaceChildren();if(!deck.length){area.append(el('p',{text:'Nhóm này chưa có từ.'}));return;}
   const item=deck[current],d=item.data,answer=answers.get(item.id);displayed=item.id;
   const face=action('',flip);face.className='flashcard';face.setAttribute('aria-label','Lật thẻ');face.setAttribute('aria-pressed',String(flipped));
   if(vocab){
    if(!flipped)face.append(el('div',{class:'hanzi',text:d[frontMode]||'Chưa có dữ liệu cho mặt thẻ này'}));
    else face.append(el('div',{class:'hanzi',text:d.hanzi}),el('div',{class:'pinyin',text:d.pinyin||''}),el('p',{class:'card-meaning',text:d.meaning}),...['example','example_pinyin','example_meaning','mnemonic','radicals'].filter(k=>d[k]).map(k=>el('p',{text:d[k]})),...(d.image_url?[el('img',{src:d.image_url,alt:d.meaning})]:[]));
   }else if(!flipped)face.append(el('p',{class:'study-prompt',text:chineseQuestionPrompt(d.prompt)}));
   else face.append(el('p',{class:'card-meaning',text:answer?.accepted?.join(' / ')||''}),el('p',{class:'study-explanation',text:answer?.explanation||''}));
   area.append(el('p',{class:'card-count',text:`Thẻ ${current+1} / ${deck.length}`}),face,el('div',{class:'card-controls'},[action('← Trước',()=>move(-1)),action('Lật thẻ',flip,true),action('Tiếp →',()=>move(1))]));
   area.append(questionAudio(vocab?(flipped?[d.hanzi,d.meaning].filter(Boolean).join('. '):d[frontMode]||''):chineseQuestionPrompt(d.prompt)));
   if(vocab){
    const review=catalog.reviews.find(r=>r.item_id===item.id),tools=el('div',{class:'learn-actions'}),audio=audioButton(d);if(audio)tools.append(audio);else area.append(el('p',{class:'muted',text:'Thẻ này chưa có âm thanh hoặc thiết bị chưa có giọng đọc tiếng Trung.'}));
    for(const [memory,label]of [['new','Chưa nhớ'],['review','Cần ôn'],['remembered','Đã nhớ']])tools.append(action(label,async()=>{const r=await request('/reviews/'+item.id,'PUT',{event_id:crypto.randomUUID(),memory});upsert(r);await save(item.id);cardReward.item(item.id);notice('Đã lưu tự đánh giá và lịch ôn.');await move(1);}));
    area.append(tools,extra('Yêu thích',[action(review?.favorite?'★ Bỏ yêu thích':'☆ Yêu thích',async()=>{upsert(await request('/reviews/'+item.id,'PUT',{event_id:crypto.randomUUID(),favorite:!review?.favorite}));render();})]));
   }
   if(focusLabel){const target=focusLabel==='flashcard'?face:[...area.querySelectorAll('button:not(.flashcard)')].find(b=>b.textContent===focusLabel);target?.focus({preventScroll:true});}
  };
  const shuffle=action('Trộn thẻ',async()=>{deck=sessionStudyDeck(deck,deckKey,{reshuffle:true});current=0;flipped=false;render();await save(deck[0].id);});
  const settings=[shuffle];
  if(words.length){
   const front=field('Mặt trước','front','hanzi','text',[['hanzi','Chữ Hán'],['meaning','Nghĩa tiếng Việt'],['pinyin','Pinyin']]);front.onchange=()=>{frontMode=front.querySelector('select').value;flipped=false;render();};settings.push(front);
   if(words.some(w=>w.data.group==='extended')){
    const group=field('Nhóm từ','group','all','text',[['all','Tất cả'],['main','Từ chính'],['extended','Từ mở rộng']]);group.onchange=()=>{if(!vocab)return;const value=group.querySelector('select').value;deckKey=id+':vocabulary:'+value;deck=sessionStudyDeck(words.filter(w=>value==='all'||(w.data.group||'main')===value),deckKey);current=0;flipped=false;render();};settings.push(group);
   }
  }
  if(words.length&&questions.length){
   const source=field('Loại thẻ','source',vocab?'vocabulary':'question','text',[['vocabulary','Thẻ từ vựng'],['question','Thẻ câu hỏi']]);source.onchange=()=>{vocab=source.querySelector('select').value==='vocabulary';deckKey=id+':'+(vocab?'vocabulary':'question');deck=sessionStudyDeck(vocab?words:questions,deckKey);current=0;flipped=false;caption.textContent=vocab?'Thẻ từ vựng':'Thẻ câu hỏi';render();save(deck[0].id).catch(error);};settings.unshift(source);
  }
  root().append(area,...(words.length?[cardReward.node]:[]),extra('Tùy chọn thẻ',settings));render();
  if(words.length)root().append(extra('Tự luyện viết và đọc theo',[writing(id),recording(id)]));
 }else root().append(el('p',{text:'Tài liệu này chưa có thẻ lật.'}));
 if(items.length)await save(displayed||(last&&items.some(i=>i.id===last)?last:items[0].id));
}
function upsert(r){const n=catalog.reviews.findIndex(v=>v.item_id===r.item_id);if(n>=0)catalog.reviews[n]=r;else catalog.reviews.push(r);}
function audioButton(d){
 if(d.audio_url)return action('▶ Nghe mẫu',()=>new Audio(d.audio_url).play());
 const voice=window.speechSynthesis?.getVoices().find(v=>/^zh(-|_)/i.test(v.lang));if(!voice||!d.hanzi)return null;
 return action('▶ Nghe mẫu',()=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(d.hanzi);u.voice=voice;u.lang=voice.lang;speechSynthesis.speak(u);});
}
async function notebook(){
 const f=el('form',{},[field('Từ cần ôn','filter',params.get('filter')||'','text',[['','Tất cả'],['favorite','Yêu thích'],['new','Chưa nhớ'],['wrong','Thường nhầm'],['due','Đến hạn ôn']])]),list=el('div');
 const load=async()=>{const rows=await request('/notebook?'+new URLSearchParams(new FormData(f)));list.replaceChildren(...(rows.length?rows.map(w=>card(w.data.hanzi,[el('p',{class:'pinyin',text:w.data.pinyin||''}),el('p',{text:w.data.meaning}),link('Ôn từ này',{set:w.set_id,word:w.id})])):[el('p',{text:'Chưa có từ trong danh sách này.'})]));animalPath(list,{selector:':scope > .card',title:'Ôn từ',hint:''});};f.onchange=()=>load().catch(error);root().append(f,list);await load();
}
async function tests(){
 const [rows,progress]=await Promise.all([request('/tests'),request('/study-time')]),main=rows.filter(t=>t.reward_policy==='record_best'),daily=rows.filter(t=>t.reward_policy==='daily_3');
 root().append(studyStreakCard(progress));
 const makeCard=t=>card(t.title,[el('p',{text:`${t.question_count||30} câu trắc nghiệm · Lấy ngẫu nhiên từ 10 bài HSK1.`}),el('p',{class:'muted',text:t.reward_policy==='daily_3'?'Ba lượt đầu mỗi ngày được thưởng theo điểm, tối đa 10 kim cương mỗi lượt. Các lượt sau vẫn lưu điểm.':'Lần đầu nhận kim cương theo điểm. Làm lại chỉ nhận phần chênh lệch khi vượt kỷ lục; mỗi mốc 10% tương ứng 1 kim cương.'}),action('Bắt đầu',async()=>{const a=await request('/attempts','POST',{test_id:t.id});location.href='?view=tests&attempt='+a.id;},true)]);
 root().append(el('h2',{text:'10 đề HSK1 chính'}),...main.map(makeCard));
 if(daily.length)root().append(el('h2',{text:'Thử thách hằng ngày'}),...daily.map(makeCard));
 const board=el('a',{class:'btn btn-ghost',href:'/pages/student/leaderboard/?program=chinese&range=week',text:'🏆 Xem bảng xếp hạng Tiếng Trung tuần này'});root().append(board);
 animalPath(root(),{selector:':scope > .card',title:'Bài kiểm tra',hint:'Đề chính ghi nhận kỷ lục cá nhân; thử thách hằng ngày giúp con tiếp tục đua top.'});
 if(!rows.length)root().append(el('p',{text:'Chưa có bài kiểm tra. Con có thể làm quiz ngay trong bài học.'}));
}
async function showAttempt(a,index){
 clearInterval(timer);notice('');root().replaceChildren(link('← Bài học',{}),el('h2',{text:a.title}));
 if(a.finished_at)stopActiveStudyClock();
 if(a.source_updated){root().append(card('Bộ câu hỏi đã được cập nhật',[el('p',{text:'Lượt cũ dùng bộ câu hỏi trước khi rút gọn. Mở bản đồ để học đúng chặng và tránh các câu lặp đã bỏ.'}),el('p',{text:'Lượt chưa hoàn thành này không bị tính điểm hay trừ Kim Cương.'}),action('Mở chặng hiện tại →',()=>quiz(a.set_id),true)]));return;}
 if(a.finished_at){
  syncDiamondTotal();
  const correct=a.items.filter(i=>i.result?.correct).length;
  root().append(card('Đã hoàn thành!',[el('p',{class:'quiz-score',text:a.score+'/100'}),el('p',{text:`${correct} / ${a.items.length} câu đúng · ${Math.max(0,Math.round((new Date(a.finished_at)-new Date(a.started_at))/1000))} giây`}),...(a.diamonds_delta!==null&&a.diamonds_delta!==undefined?[el('p',{class:a.diamonds_delta<0?'answer-wrong':'answer-correct',text:a.diamonds_delta>0?`+${a.diamonds_delta} Kim Cương`:a.diamonds_delta<0?`${a.diamonds_delta} Kim Cương`:a.reward_note||'Lượt này không nhận thêm kim cương.'})]:[]),action('Làm lại',async()=>{const body=a.test_id?{test_id:a.test_id}:{set_id:a.set_id,count:20,selection:a.selection==='review'?'review':'sequential',block:a.block};const next=await request('/attempts','POST',body);location.href=(a.test_id?'?view=tests&attempt=':'?attempt=')+next.id;},true)]));
  if(a.set_id&&!a.test_id)root().append(action('Về bản đồ khám phá →',()=>quiz(a.set_id),true));
  const reviews=el('div');const render=wrong=>{reviews.replaceChildren(...a.items.filter(i=>!wrong||!i.result?.correct).map((i,n)=>card((i.result?.correct?'✓ ':'✕ ')+chineseQuestionPrompt(i.data.prompt),[questionAudio(chineseQuestionPrompt(i.data.prompt)),el('p',{text:'Con chọn: '+(i.result?.value||'Chưa trả lời')}),el('p',{class:'answer-correct',text:'Đáp án: '+i.result.accepted.join(' / ')}),el('p',{text:i.result.explanation||''})])));reviews.querySelectorAll('h2').forEach(h=>h.classList.add('study-prompt'));};
  root().append(action('Ôn câu sai',()=>render(true)),action('Xem tất cả',()=>render(false)),reviews);render(true);return;
 }
 if(index===undefined){index=a.items.findIndex(i=>!i.result);if(index<0)index=a.items.length-1;}
 const i=a.items[index],q=i.data;let selection=i.selection||'';
 const navigate=async n=>{let current=a;if(!i.result&&selection.trim())current=await request('/attempts/'+a.id+'/answers','POST',{item_id:i.id,value:selection,lock:false});await showAttempt(current,n);};
 const completed=a.items.filter(i=>i.result).length;
 if(!a.finished_at){const clock=el('p',{class:'muted',text:'⏱ Đang tính thời gian làm bài · Mốc ngày: 10 phút +1, 30 phút tổng +5, 60 phút tổng +10 kim cương. Đạt 5 ngày học trong tuần +5, đủ 7 ngày tổng +10.'});root().append(clock);startActiveStudyClock(a.id,clock);}
 const navigation=el('nav',{class:'quiz-jump','aria-label':'Danh sách câu hỏi'});
 const firstOpen=a.items.findIndex(i=>!i.result);
 for(const [n,item]of a.items.entries()){
  const jump=action(String(n+1),()=>navigate(n));jump.disabled=!item.result&&n!==firstOpen;jump.classList.add(...(item.result?[item.result.correct?'done':'incorrect']:[]));jump.setAttribute('aria-label','Câu '+(n+1)+(item.result?' · Đã làm':' · Chưa làm'));if(n===index)jump.setAttribute('aria-current','true');navigation.append(jump);
 }root().append(navigation);
 root().append(el('p',{class:'quiz-position',text:`Câu ${index+1} / ${a.items.length}`}),el('progress',{max:a.items.length,value:completed,'aria-label':'Tiến độ quiz'}));
 if(a.ends_at){const time=el('p',{class:'quiz-time'});root().append(time);const tick=()=>{const seconds=Math.max(0,Math.ceil((new Date(a.ends_at)-Date.now())/1000));time.textContent=`Còn ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;if(!seconds){clearInterval(timer);request('/attempts/'+a.id).then(next=>showAttempt(next,index)).catch(error);}};timer=setInterval(tick,1000);tick();}
 const prompt=chineseQuestionPrompt(q.prompt),box=card('',[el('p',{class:'quiz-prompt',text:prompt})]);
 box.append(questionAudio(prompt));
 if(q.image_url)box.append(el('img',{src:q.image_url,alt:'Hình câu hỏi',width:220}));if(q.audio_url)box.append(el('audio',{src:q.audio_url,controls:true}));
 if(i.result){
  box.append(el('p',{class:i.result.correct?'answer-correct':'answer-wrong',text:i.result.correct?'Đúng rồi!':'Chưa đúng, con xem lại nhé.'}),el('p',{text:'Con đã trả lời: '+(i.result.value||'Chưa trả lời')}),el('p',{class:'answer-correct',text:'Đáp án: '+i.result.accepted.join(' / ')}),el('p',{text:i.result.explanation||''}));
  box.append(index<a.items.length-1?action('Câu tiếp theo →',()=>showAttempt(a,index+1),true):action('Xem kết quả',async()=>showAttempt(await request('/attempts/'+a.id+'/finish','POST')),true));
 }else{
  const controls=el('div',{class:'quiz-choices'});
  if(['choice','listening'].includes(q.type))for(const [n,option]of q.options.entries()){
   const radio=el('input',{type:'radio',name:'answer',value:option});radio.checked=selection===option;
   const label=el('label',{class:'quiz-option'+(radio.checked?' selected':'')},[radio,el('span',{class:'option-letter',text:String.fromCharCode(65+n)}),el('span',{text:option})]);
   radio.onchange=()=>{selection=option;controls.querySelectorAll('.quiz-option').forEach(l=>l.classList.remove('selected'));label.classList.add('selected');};controls.append(withChoiceAudio(label,option,n+1));
  }else if(q.type==='ordering'&&q.options?.length){let chosen=[];const output=el('p',{text:selection});controls.append(output,...q.options.map((o,n)=>{const b=action(o,()=>{chosen.push(o);selection=chosen.join(' ');output.textContent=selection;row.hidden=true;}),row=withChoiceAudio(b,o,n+1);return row;}),action('Chọn lại',()=>{chosen=[];selection='';output.textContent='';controls.querySelectorAll('.choice-with-audio').forEach(row=>row.hidden=false);}));}
  else if(q.type==='matching'&&q.options?.length){const pairs=new Map();for(const [n,left]of q.options.entries()){const f=field(left,left,'','text',[['','Chọn nghĩa'],...q.targets.map(t=>[t,t])]);f.onchange=()=>{pairs.set(left,f.querySelector('select').value);selection=q.options.map(l=>l+'='+(pairs.get(l)||'')).join(' | ');};controls.append(withChoiceAudio(f,left,n+1));}controls.append(extra('Nghe các lựa chọn',q.targets.map((t,n)=>withChoiceAudio(el('span',{text:t}),t,n+1))));}
  else{const input=el('input',{type:'text',class:'quiz-text','aria-label':'Câu trả lời',value:selection});input.oninput=()=>selection=input.value;controls.append(input);if(q.type==='pinyin')controls.append(el('p',{class:'muted',text:'Nhớ nhập đúng dấu thanh.'}));}
  box.append(controls,action('Kiểm tra',async()=>{if(!selection.trim()){notice('Con chọn hoặc nhập một câu trả lời trước nhé.');return;}prepareAnswerSound();const checked=await request('/attempts/'+a.id+'/answers','POST',{item_id:i.id,value:selection,lock:true});const answerResult=checked.items.find(item=>item.id===i.id)?.result;if(answerResult&&typeof answerResult.correct==='boolean')playAnswerSound(answerResult.correct);await showAttempt(checked,index);},true));
 }
 root().append(box);
 const backActions=el('div',{class:'hub-actions'});if(index>0)backActions.append(action('← Câu trước',()=>navigate(index-1)));if(index<firstOpen)backActions.append(action('Về câu đang làm →',()=>navigate(firstOpen),true));root().append(backActions);
 const tools=[];
 tools.push(action('Nộp bài sớm',async()=>{if(confirm('Nộp bài ngay? Câu chưa kiểm tra sẽ được tính sai.'))await showAttempt(await request('/attempts/'+a.id+'/finish','POST'));}));root().append(extra('Tùy chọn quiz',tools));
}
window.addEventListener('pagehide',()=>{clearInterval(timer);stopActiveStudyClock();});
boot().catch(error);
