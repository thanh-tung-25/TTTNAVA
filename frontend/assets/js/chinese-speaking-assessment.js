import {api,el} from './api.js';
import {speakingAssessmentEnabled} from './chinese-speaking-data.js';
import {speakingAnswerClips} from './chinese-speaking-audio.js';
import {renderSpeakingResult,speakingResultStyles} from './chinese-speaking-results.js';

export function speakingAssessment(ui,{set,profile,onBusy}){
 speakingResultStyles();
 const panel=el('section',{class:'speaking-ai-panel','aria-label':'AI chấm bài luyện nói'}),status=el('p',{role:'status','aria-live':'polite'}),output=el('div');
 const button=el('button',{type:'button',class:'btn btn-primary speaking-ai-submit',text:'AI chấm bài & gửi cô',disabled:true});
 panel.append(el('div',{class:'speaking-ai-title'},[el('span',{text:'✦'}),el('div',{},[el('h3',{text:'Cùng AI luyện nói tốt hơn'}),el('p',{text:'AI nhận diện lời nói và chấm đúng ý, từ và ngữ pháp. Kết quả gửi cho cô; tải bản ghi là tùy chọn.'})])]),button,status,output);ui.result.append(panel);
 let availability=null,recording=null,busy=false,disposed=false,controller;
 const permitted=()=>speakingAssessmentEnabled(set)&&profile.role==='student';
 const update=()=>{
  button.disabled=busy||!recording?.audio||!availability?.configured||!permitted();
  if(recording?.assessment){button.disabled=true;button.textContent='Đã gửi kết quả cho cô';}
 };
 const ready=async()=>{
  if(!permitted()){status.textContent=profile.role==='admin'?'Đây là bản xem trước. Kết quả thật chỉ được gửi từ tài khoản học sinh.':'Cô giáo chưa bật chấm AI cho bài này.';update();return;}
  try{availability=(await api('/api/v1/chinese/speaking/availability')).data;status.textContent=availability.configured?'Âm thanh trả lời chỉ gửi khi bạn bấm chấm. Sau xử lý, chỉ điểm và nhận xét được lưu.':availability.reason||'Chấm AI chưa được bật.';}catch{status.textContent='Chưa kiểm tra được dịch vụ chấm. Bản ghi vẫn nghe và tải được.';}
  update();
 };
 ready();
 button.onclick=async()=>{
  if(button.disabled||disposed)return;
  const take=recording;busy=true;controller=new AbortController();onBusy(true);update();
  try{
   if(!take.submissionId){status.textContent='Đang chuẩn bị gửi bài cho cô…';const response=await api('/api/v1/chinese/sets/'+set.id+'/speaking-submissions',{method:'POST',signal:controller.signal,body:{recording_id:take.meta.recording_id,recorded_at:take.meta.recorded_at,questions:take.meta.questions}});take.submissionId=response.data.id;}
   const saved=(await api('/api/v1/chinese/speaking-submissions/'+take.submissionId,{signal:controller.signal})).data;
   if(saved.result){take.assessment=saved;take.audio=null;if(!disposed){renderSpeakingResult(output,saved);status.textContent='Đã gửi kết quả cho cô. Chỉ điểm và nhận xét được lưu.';}return;}
   if(saved.status==='grading')throw Error('Bài đang được chấm. Hãy chờ một chút rồi cập nhật kết quả.');
   let count=0;
   for await(const clip of speakingAnswerClips(take.audio,take.meta)){
    if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
    status.textContent=`Đang nghe và chấm câu ${clip.index}…`;
    try{const body=new FormData();body.append('audio',new Blob([clip.buffer],{type:'audio/wav'}),'answer.wav');await api(`/api/v1/chinese/speaking-submissions/${take.submissionId}/clips/${clip.index}/${clip.chunk}`,{method:'POST',body,signal:controller.signal});count++;}finally{new Uint8Array(clip.buffer).fill(0);}
   }
   if(!count)throw Error('Chưa có phần trả lời sau khi nghe câu hỏi. Bạn có thể ghi âm lại; bản ghi hiện tại vẫn nghe và tải được.');
   status.textContent='Đang tổng hợp điểm và cách sửa cho từng câu…';
   const response=await api(`/api/v1/chinese/speaking-submissions/${take.submissionId}/finish`,{method:'POST',signal:controller.signal,body:{}});
   take.assessment=response.data;take.audio=null;
   if(disposed)return;renderSpeakingResult(output,response.data);status.textContent='Đã gửi kết quả cho cô. Server chỉ lưu điểm và nhận xét. Bạn vẫn có thể nghe lại hoặc tải bản ghi.';
  }catch(error){if(!disposed&&error.name!=='AbortError')status.textContent=error.message+' Bản ghi vẫn nghe và tải được.';}
  finally{busy=false;if(!disposed){onBusy(false);update();}}
 };
 return {attach(take){recording=take;output.replaceChildren();button.textContent='AI chấm bài & gửi cô';ready();update();},dispose(){disposed=true;controller?.abort();if(recording)recording.audio=null;recording=null;}};
}
