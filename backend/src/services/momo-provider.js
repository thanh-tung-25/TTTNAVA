import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import env from '../config/env.js';
import {AppError} from '../utils/errors.js';

export const momoSignature=(config,data)=>createHmac('sha256',config.secret_key).update(Object.keys(data).sort().map(k=>k+'='+data[k]).join('&')).digest('hex');
export function verifyMomoSignature(config,data,signature){const expected=momoSignature(config,data);return typeof signature==='string'&&/^[a-f0-9]{64}$/iu.test(signature)&&timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'));}
const origin=config=>config.environment==='production'?'https://payment.momo.vn':'https://test-payment.momo.vn';
export function safeMomoPayUrl(value,config){try{const url=new URL(value);return url.origin===origin(config)&&url.pathname.startsWith('/v2/gateway/')&&!url.username&&!url.password?url.href:null;}catch{return null;}}
async function call(config,action,body){
 try{const response=await fetch(origin(config)+'/v2/gateway/api/'+action,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('http');return await response.json();}
 catch{throw new AppError(502,'MOMO_UNAVAILABLE','Chưa kết nối được MoMo. Đơn đã được lưu, bạn có thể kiểm tra hoặc thử lại.');}
}
export async function createMomoPayment(config,order){
 const data={accessKey:config.access_key,amount:Number(order.amount_vnd),extraData:'',ipnUrl:new URL('/api/v1/payments/momo/ipn',env.appOrigin).href,orderId:order.id,orderInfo:'Thanh toan khoa hoc '+order.course_id,partnerCode:config.partner_code,redirectUrl:new URL('/pages/student/courses/?payment='+order.id,env.appOrigin).href,requestId:order.request_id,requestType:'captureWallet'};
 const {accessKey,...request}=data;
 const result=await call(config,'create',{...request,autoCapture:true,lang:'vi',signature:momoSignature(config,data)});
 if(result.orderId!==order.id||result.requestId!==order.request_id||result.partnerCode!==config.partner_code||Number(result.amount)!==Number(order.amount_vnd))throw new AppError(502,'MOMO_RESPONSE_INVALID','MoMo chưa trả về kết quả phù hợp với đơn. Bạn kiểm tra lại trạng thái thanh toán.');
 if(result.signature&&!verifyMomoSignature(config,{accessKey,amount:Number(result.amount),orderId:result.orderId,partnerCode:result.partnerCode,payUrl:result.payUrl||'',requestId:result.requestId,responseTime:result.responseTime,resultCode:result.resultCode},result.signature))throw new AppError(502,'MOMO_RESPONSE_INVALID','Chưa xác thực được phản hồi MoMo.');
 if(result.resultCode!==0)throw new AppError(502,'MOMO_CREATE_FAILED','MoMo chưa tạo được phiên thanh toán. Bạn thử lại hoặc liên hệ quản trị viên.');
 const url=safeMomoPayUrl(result.payUrl,config);if(!url)throw new AppError(502,'MOMO_URL_INVALID','MoMo chưa trả về đường dẫn thanh toán hợp lệ.');
 return url;
}
export async function queryMomoPayment(config,order){
 const requestId=randomUUID(),data={accessKey:config.access_key,orderId:order.id,partnerCode:config.partner_code,requestId};
 const result=await call(config,'query',{partnerCode:config.partner_code,orderId:order.id,requestId,lang:'vi',signature:momoSignature(config,data)});
 if(result.partnerCode!==config.partner_code||result.orderId!==order.id||result.requestId!==requestId)throw new AppError(502,'MOMO_QUERY_INVALID','Chưa đối chiếu được giao dịch MoMo.');
 return result;
}
