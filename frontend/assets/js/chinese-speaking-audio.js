// Microphone-only audio remains in browser memory until an explicit AI request.
// PCM chunks keep every HTTP request below 1 MB, including long answer turns.
export function encodeSpeakingWav(samples){
 const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
 const text=(offset,value)=>{for(let n=0;n<value.length;n++)view.setUint8(offset+n,value.charCodeAt(n));};
 text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
 for(let n=0;n<samples.length;n++){const value=Math.max(-1,Math.min(1,samples[n]));view.setInt16(44+n*2,Math.round(value*(value<0?32768:32767)),true);}
 return buffer;
}
export function answerSampleRanges(meta,length,sampleRate=16000){
 const ranges=new Map();let lastEnd=0;
 for(const segment of meta.answer_segments||[]){
  const start=Math.max(lastEnd,Math.min(length,Math.round(segment.start*sampleRate))),end=Math.min(length,Math.round(segment.end*sampleRate));
  if(!Number.isInteger(segment.index)||segment.index<1||segment.index>meta.questions.length||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
  lastEnd=end;const group=ranges.get(segment.index)||[];group.push([start,end]);ranges.set(segment.index,group);
 }
 return ranges;
}
export async function* speakingAnswerClips(blob,meta){
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!Offline)throw Error('Thiết bị chưa hỗ trợ chuẩn bị âm thanh chấm AI. Bản ghi vẫn nghe và tải được.');
 let audio;
 try{audio=await new Offline(1,16000,16000).decodeAudioData(await blob.arrayBuffer());}catch{throw Error('Chưa đọc được âm thanh để chấm AI trên thiết bị này. Bản ghi vẫn nghe và tải được.');}
 const source=audio.getChannelData(0),ranges=answerSampleRanges(meta,source.length,audio.sampleRate);
 try{
  for(const [index,parts]of ranges){
   const length=parts.reduce((sum,[start,end])=>sum+end-start,0),samples=new Float32Array(length);let offset=0;
   for(const [start,end]of parts){samples.set(source.subarray(start,end),offset);offset+=end-start;}
   try{for(let start=0,chunk=1;start<samples.length;start+=400000,chunk++){
    const slice=samples.subarray(start,Math.min(start+400000,samples.length));if(slice.length<1600)continue;
    yield {index,chunk,buffer:encodeSpeakingWav(slice)};
   }}finally{samples.fill(0);}
  }
 }finally{source.fill(0);audio=null;}
}
