import {waitUntil} from '@vercel/functions';
export function backgroundTask(promise,event){
 // Log the event only. Jobs may contain OTPs, addresses, or reset credentials.
 const handled=promise.catch(()=>{console.error(JSON.stringify({event}));});
 if(process.env.VERCEL)waitUntil(handled);
 return handled;
}
