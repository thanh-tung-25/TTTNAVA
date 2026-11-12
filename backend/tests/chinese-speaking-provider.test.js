import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import env from '../src/config/env.js';
import {assessSpeakingAudio,judgeSpeakingAnswers,speakingAiAvailability} from '../src/services/chinese-speaking-provider.js';
import {encodeSpeakingWav} from '../../frontend/assets/js/chinese-speaking-audio.js';

const original=env.speakingAi;
const wav=()=>Buffer.from(encodeSpeakingWav(new Float32Array(4000).fill(.2)));
const answer=index=>({index,question:'你叫什么名字？',transcript:'我叫安。',answer_reference:'我叫小明。',assessment_notes:'Chấp nhận mọi tên thật.'});
const grade=index=>({index,content:90,grammar:80,feedback:'Trả lời đúng ý.',correction:'',correction_pinyin:'',errors:[]});
const reply=answers=>Response.json({choices:[{message:{content:JSON.stringify({answers})}}]});
beforeEach(()=>{env.speakingAi={enabled:true,key:'test-groq-key',zeroRetentionConfirmed:true,dailyLimit:5};});
afterEach(()=>{env.speakingAi=original;vi.unstubAllGlobals();});

it('requires the zero-retention confirmation for both audio and text calls',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);env.speakingAi.zeroRetentionConfirmed=false;
 expect(speakingAiAvailability().configured).toBe(false);
 await expect(assessSpeakingAudio(wav())).rejects.toMatchObject({status:503});
 await expect(judgeSpeakingAnswers([answer(1)],1)).rejects.toMatchObject({status:503});
 expect(fetch).not.toHaveBeenCalled();expect(JSON.stringify(speakingAiAvailability())).not.toContain('test-groq-key');
});

it('sends Chinese transcription to Groq without teacher references and wipes the multipart copy',async()=>{
 const source=wav();let payload;
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');expect(options.redirect).toBe('error');
  payload=options.body;expect(payload.includes(source)).toBe(true);
  const text=payload.toString('latin1');expect(text).toContain('name="language"\r\n\r\nzh');expect(text).not.toContain('name="prompt"');
  return Response.json({text:'我叫安。',accuracy:100,fluency:100,segments:[]});
 }));
 const result=await assessSpeakingAudio(source);
 expect(result).toMatchObject({transcript:'我叫安。',accuracy:null,fluency:null,words:[]});expect(payload.every(byte=>byte===0)).toBe(true);
 // The route owns and erases the original input; the adapter erases its copy.
 expect(source.some(byte=>byte!==0)).toBe(true);
});

it('wipes the upload copy even when the network throws and hides provider details',async()=>{
 let payload;vi.stubGlobal('fetch',vi.fn(async(url,options)=>{payload=options.body;throw new Error('private connection credential');}));
 await expect(assessSpeakingAudio(wav())).rejects.toMatchObject({code:'SPEAKING_AUDIO_PROVIDER_ERROR'});
 expect(payload.every(byte=>byte===0)).toBe(true);
});

it('keeps hallucinated words in high-confidence non-speech unscored and rejects malformed responses',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({text:'谢谢观看。',segments:[{no_speech_prob:.99,avg_logprob:-2}]})).mockResolvedValueOnce(Response.json({provider_private:'invalid'}));vi.stubGlobal('fetch',fetch);
 expect((await assessSpeakingAudio(wav())).transcript).toBe('');
 await expect(assessSpeakingAudio(wav())).rejects.toMatchObject({code:'SPEAKING_AUDIO_PROVIDER_ERROR'});
});

it('rejects invented, duplicated or missing answer indices from the text model',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(reply([grade(2)])).mockResolvedValueOnce(reply([grade(1),grade(1)])).mockResolvedValueOnce(reply([]));vi.stubGlobal('fetch',fetch);
 for(let n=0;n<3;n++)await expect(judgeSpeakingAnswers([answer(1)],1)).rejects.toMatchObject({code:'SPEAKING_JUDGE_INVALID'});
});

it('saves completed text batches before quota failure, so callers can resume safely',async()=>{
 const saved=[];let count=0;
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  const body=JSON.parse(options.body);expect(body).not.toHaveProperty('store');expect(body).not.toHaveProperty('tools');
  if(count++===1)return new Response('private quota details',{status:429});
  const input=JSON.parse(body.messages[1].content);return reply(input.answers.map(a=>grade(a.index)));
 }));
 await expect(judgeSpeakingAnswers([1,2,3,4].map(answer),1,async batch=>saved.push(...batch))).rejects.toMatchObject({status:429,code:'SPEAKING_PROVIDER_LIMIT'});
 expect(saved.map(g=>g.index)).toEqual([1,2,3]);
});

it('does not silently truncate oversized grading criteria to fit the free quota',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 await expect(judgeSpeakingAnswers([{...answer(1),assessment_notes:'标准'.repeat(4000)}],1)).rejects.toMatchObject({code:'SPEAKING_JUDGE_INPUT_LIMIT'});
 expect(fetch).not.toHaveBeenCalled();
});
