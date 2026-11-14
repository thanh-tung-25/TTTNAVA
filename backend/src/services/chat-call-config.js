import {AppError} from '../utils/errors.js';

const bounded=(name,fallback,min,max)=>{
 const value=Number(process.env[name]??fallback);
 return Number.isFinite(value)?Math.max(min,Math.min(max,Math.floor(value))):fallback;
};
export function callConfig(){
 const enabled=process.env.CHAT_CALLS_ENABLED==='true'&&Boolean(process.env.CLOUDFLARE_TURN_KEY_ID&&process.env.CLOUDFLARE_TURN_API_TOKEN);
 return {
  enabled,maxSeconds:bounded('CHAT_CALL_MAX_SECONDS',900,60,1800),ringSeconds:45,
  maxConcurrent:bounded('CHAT_CALL_MAX_CONCURRENT',5,1,50),monthlySeconds:bounded('CHAT_CALL_MONTHLY_MINUTES',3000,1,30000)*60,
  pushEnabled:enabled&&Boolean(process.env.WEB_PUSH_PUBLIC_KEY&&process.env.WEB_PUSH_PRIVATE_KEY&&process.env.WEB_PUSH_SUBJECT),
 };
}
export function requireCalls(){if(!callConfig().enabled)throw new AppError(503,'CALLS_DISABLED','Gọi thoại/video chưa được bật. Con vẫn có thể nhắn tin.');}

export async function turnCredentials(ttl){
 requireCalls();
 let response;
 try{
  response=await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(process.env.CLOUDFLARE_TURN_KEY_ID)}/credentials/generate-ice-servers`,{
   method:'POST',headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_TURN_API_TOKEN}`,'Content-Type':'application/json'},
   body:JSON.stringify({ttl:Math.max(60,Math.min(1900,Math.ceil(ttl)))}),signal:AbortSignal.timeout(8000),
  });
  if(!response.ok)throw Error('TURN unavailable');
  const data=await response.json(),servers=Array.isArray(data.iceServers)?data.iceServers:[data.iceServers];
  // Relay-only ICE keeps a participant's public IP out of their peer's SDP.
  const iceServers=servers.filter(Boolean).map(s=>({urls:(Array.isArray(s.urls)?s.urls:[s.urls]).filter(url=>/^turns?:/.test(url)),username:s.username,credential:s.credential})).filter(s=>s.urls.length&&s.username&&s.credential);
  if(!iceServers.length)throw Error('TURN unavailable');
  return {iceServers,iceTransportPolicy:'relay'};
 }catch{throw new AppError(503,'TURN_UNAVAILABLE','Chưa kết nối được dịch vụ gọi. Con thử lại sau nhé.');}
}
