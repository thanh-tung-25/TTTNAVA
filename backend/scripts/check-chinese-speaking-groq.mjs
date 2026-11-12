// Read-only setup check. Never print credentials, headers or raw provider errors.
// --test-text sends two fictional example answers, never student data.
// --test-audio uses the app's TTS and installed Playwright to test a synthetic
// Chinese sentence in memory; it does not open a microphone or write audio files.
import env from '../src/config/env.js';
import {speakingAiAvailability,judgeSpeakingAnswers,assessSpeakingAudio} from '../src/services/chinese-speaking-provider.js';

let stage='configuration';
try{
 const availability=speakingAiAvailability();
 console.log(JSON.stringify({stage,enabled:env.speakingAi.enabled,keyPresent:Boolean(env.speakingAi.key?.trim()),zeroRetentionConfirmed:env.speakingAi.zeroRetentionConfirmed,configured:availability.configured}));
 if(!availability.configured){process.exitCode=1;}
 else{
  stage='models';
  const response=await fetch('https://api.groq.com/openai/v1/models',{headers:{Authorization:'Bearer '+env.speakingAi.key},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok){console.log(JSON.stringify({stage,ok:false,httpStatus:response.status}));process.exitCode=1;}
  else{
   const body=await response.json(),models=new Set(body.data?.map(model=>model.id));
   const speech=models.has('whisper-large-v3'),judge=models.has('openai/gpt-oss-120b');
   console.log(JSON.stringify({stage,ok:speech&&judge,speechModelAvailable:speech,judgeModelAvailable:judge}));
   if(!speech||!judge)process.exitCode=1;
   else{
   if(process.argv.includes('--test-text')){
    stage='text-grading';
    const result=await judgeSpeakingAnswers([
     {index:1,question:'你叫什么名字？',transcript:'我叫小明。',answer_reference:'我叫安。',assessment_notes:'Chấp nhận các tên khác nhau.'},
     {index:2,question:'你叫什么名字？',transcript:'我叫是小明。',answer_reference:'我叫安。',assessment_notes:'Chấp nhận các tên khác nhau; chỉ rõ lỗi từ và ngữ pháp nếu có.'}
    ],1);
    console.log(JSON.stringify({stage,ok:true,examples:result.map(answer=>({index:answer.index,content:answer.content,grammar:answer.grammar,errorCount:answer.errors.length,feedback:answer.feedback,correction:answer.correction}))}));
   }
   if(process.argv.includes('--test-audio')){
    stage='sample-audio';
    const {speechAudio}=await import('../src/routes/question-audio.js');
    const {encodeSpeakingWav}=await import('../../frontend/assets/js/chinese-speaking-audio.js');
    const {chromium}=await import('@playwright/test');
    const mp3=await speechAudio('我叫小明。','zh-CN');
    const browser=await chromium.launch({headless:true});
    let samples,wav;
    try{
     const page=await browser.newPage();
     samples=await page.evaluate(async bytes=>{
      const context=new OfflineAudioContext(1,1,16000);
      const decoded=await context.decodeAudioData(Uint8Array.from(bytes).buffer);
      return Array.from(decoded.getChannelData(0));
     },Array.from(mp3));
     wav=Buffer.from(encodeSpeakingWav(Float32Array.from(samples)));
     stage='audio-transcription';
     const result=await assessSpeakingAudio(wav);
     const matched=result.transcript.normalize('NFKC').replace(/[\p{Punctuation}\s]/gu,'')==='我叫小明';
     console.log(JSON.stringify({stage,ok:matched,transcript:result.transcript,syntheticAudio:true,audioSaved:false}));
     if(!matched)process.exitCode=1;
    }finally{samples?.fill(0);wav?.fill(0);mp3.fill(0);await browser.close();}
   }
   }
  }
 }
}catch(error){
 const code=typeof error.code==='string'&&/^SPEAKING_[A-Z_]+$/.test(error.code)?error.code:'CONNECTION_CHECK_FAILED';
 const networkCodes=new Set(['EPERM','EACCES','ENOTFOUND','ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
 const networkCode=networkCodes.has(error.cause?.code)?error.cause.code:undefined;
 console.log(JSON.stringify({stage,ok:false,code,networkCode}));process.exitCode=1;
}
