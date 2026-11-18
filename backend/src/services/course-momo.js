import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction,dialectSql} from '../config/db.js';
import {AppError} from '../utils/errors.js';
import {momoConfig,momoLive} from './momo-settings.js';
import {createMomoPayment,queryMomoPayment,verifyMomoSignature} from './momo-provider.js';

const active=e=>e&&!e.revoked_at&&new Date(e.starts_at)<=new Date()&&(!e.expires_at||new Date(e.expires_at)>new Date());
async function paidEnrollment(run,student,course,lock=false){
 const [row]=await run('SELECT * FROM course_enrollments WHERE student_id=? AND course_id=?'+(lock?' FOR UPDATE':''),[student,course]);
 if(!row)return null;
 const [registration]=await run('SELECT r.student_id,a.origin FROM course_registration_free r LEFT JOIN course_paid_access a ON a.student_id=r.student_id AND a.course_id=r.course_id WHERE r.student_id=? AND r.course_id=?',[student,course]);
 return registration&&registration.origin!=='momo'?null:row;
}
const orderQuery=`SELECT o.id,o.student_id,o.course_id,o.amount_vnd,o.duration_days,o.status,o.created_at,c.title,p.settings_id,p.request_id,p.state,p.pay_url,p.transaction_id,p.last_checked_at,p.paid_at FROM course_orders o JOIN course_momo_payments p ON p.order_id=o.id JOIN courses c ON c.id=o.course_id`;
export async function ownedMomoOrder(student,id){const [row]=await query(orderQuery+' WHERE o.id=? AND o.student_id=?',[id,student]);if(!row)throw new AppError(404,'ORDER_NOT_FOUND','Không tìm thấy giao dịch MoMo.');return row;}
export function publicMomoOrder(order){const {settings_id,request_id,last_checked_at,student_id,...safe}=order;return safe;}
export async function checkoutMomo(student,body){
 const {course_id}=z.object({course_id:z.string().min(1).max(32)}).strict().parse(body);
 const config=await momoConfig();if(!momoLive(config))throw new AppError(503,'MOMO_NOT_READY','Thanh toán MoMo đang chờ quản trị viên kết nối. Bạn vui lòng quay lại sau.');
 const id=await withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[student]);
  const [course]=await run('SELECT * FROM courses WHERE id=? AND active=1 FOR UPDATE',[course_id]);
  if(!course)throw new AppError(404,'COURSE_NOT_FOUND','Khóa học chưa mở đăng ký.');
  if(course.price_vnd==null||Number(course.price_vnd)<1000||Number(course.price_vnd)>50000000)throw new AppError(409,'COURSE_PRICE_INVALID','Khóa học đang chờ cấu hình học phí phù hợp cho MoMo (1.000–50.000.000đ).');
  const enrollment=await paidEnrollment(run,student,course_id);
  if(active(enrollment))throw new AppError(409,'ALREADY_ENROLLED','Bạn đã có quyền học khóa này.');
  const [pending]=await run("SELECT o.id FROM course_orders o JOIN course_momo_payments p ON p.order_id=o.id WHERE o.student_id=? AND o.course_id=? AND o.status='pending' ORDER BY o.created_at DESC LIMIT 1",[student,course_id]);
  if(pending)return pending.id;
  const orderId=randomUUID();
  await run('INSERT INTO course_orders(id,student_id,course_id,amount_vnd,duration_days,payer_name,payment_reference,note) VALUES (?,?,?,?,?,?,?,?)',[orderId,student,course_id,course.price_vnd,course.duration_days,'MoMo',orderId,'Thanh toán MoMo tự động']);
  await run('INSERT INTO course_momo_payments(order_id,settings_id,request_id) VALUES (?,?,?)',[orderId,config.id,randomUUID()]);
  return orderId;
 });
 let order=await ownedMomoOrder(student,id);
 if(order.state==='paid'||order.pay_url)return publicMomoOrder(order);
 // Claim the provider request across processes. Retries reuse its requestId.
 const claimed=await query("UPDATE course_momo_payments SET last_checked_at=CURRENT_TIMESTAMP(3) WHERE order_id=? AND state<>'paid' AND (last_checked_at IS NULL OR last_checked_at<?)",[id,new Date(Date.now()-35000)]);
 if(!claimed.affectedRows)throw new AppError(409,'MOMO_CREATING','Phiên thanh toán đang được tạo. Bạn đợi một chút rồi bấm tiếp tục.');
 try{
  const originalConfig=await momoConfig(order.settings_id),payUrl=await createMomoPayment(originalConfig,order);
  await query("UPDATE course_momo_payments SET state='ready',pay_url=? WHERE order_id=? AND state<>'paid'",[payUrl,id]);
 }catch(error){await query("UPDATE course_momo_payments SET state='unknown' WHERE order_id=? AND state<>'paid'",[id]);throw error;}
 return publicMomoOrder(await ownedMomoOrder(student,id));
}

// Shared by authenticated IPN and a server-to-server status lookup. Never called
// with browser return parameters. Profile lock serializes simultaneous purchases.
async function settle(orderId,amount,transactionId){
 if(!Number.isSafeInteger(Number(amount))||!/^\d{1,30}$/u.test(String(transactionId))||Number(transactionId)<=0)throw new AppError(400,'MOMO_TRANSACTION_INVALID','Thông tin giao dịch MoMo không hợp lệ.');
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  const [initial]=await run('SELECT student_id FROM course_orders WHERE id=?',[orderId]);if(!initial)throw new AppError(404,'ORDER_NOT_FOUND','Không tìm thấy đơn.');
  const [profile]=await run('SELECT id,deleted_at FROM profiles WHERE id=? FOR UPDATE',[initial.student_id]);
  const [order]=await run('SELECT * FROM course_orders WHERE id=? FOR UPDATE',[orderId]);
  const [payment]=await run('SELECT * FROM course_momo_payments WHERE order_id=? FOR UPDATE',[orderId]);
  if(!payment||Number(amount)!==Number(order.amount_vnd))throw new AppError(400,'MOMO_AMOUNT_MISMATCH','Số tiền không khớp với đơn.');
  const [setting]=await run('SELECT partner_code,environment FROM course_momo_settings WHERE id=?',[payment.settings_id]);
  if(setting.environment!=='production')throw new AppError(400,'MOMO_TEST_PAYMENT','Giao dịch thử không cấp quyền học thật.');
  const transaction=setting.partner_code+':'+transactionId;
  if(payment.state==='paid'){if(payment.transaction_id!==transaction)throw new AppError(409,'MOMO_TRANSACTION_CONFLICT','Đơn đã có một giao dịch khác.');return;}
  await run("UPDATE course_momo_payments SET state='paid',transaction_id=?,result_code=0,paid_at=CURRENT_TIMESTAMP(3) WHERE order_id=?",[transaction,orderId]);
  await run("UPDATE course_orders SET status='approved',payment_reference=?,review_note=?,reviewed_at=CURRENT_TIMESTAMP(3) WHERE id=?",[String(transactionId),'MoMo xác nhận thanh toán tự động.',orderId]);
  // Keep the receipt even for a subsequently deleted/locked account, without
  // undoing that account's state. Entitlement checks still enforce account locks.
  if(!profile||profile.deleted_at)return;
  const previous=await paidEnrollment(run,order.student_id,order.course_id,true);
  const permanent=active(previous)&&previous.expires_at==null;
  const starts=active(previous)?previous.starts_at:new Date();
  const base=active(previous)&&previous.expires_at?Math.max(Date.now(),new Date(previous.expires_at).getTime()):Date.now();
  const expires=permanent||order.duration_days==null?null:new Date(base+Number(order.duration_days)*86400000);
  await run(dialectSql(
   "INSERT INTO course_enrollments(student_id,course_id,source,starts_at,expires_at) VALUES (?,?,'order',?,?) ON DUPLICATE KEY UPDATE source='order',starts_at=VALUES(starts_at),expires_at=VALUES(expires_at),revoked_at=NULL",
   "INSERT INTO course_enrollments(student_id,course_id,source,starts_at,expires_at) VALUES (?,?,'order',?,?) ON CONFLICT(student_id,course_id) DO UPDATE SET source='order',starts_at=EXCLUDED.starts_at,expires_at=EXCLUDED.expires_at,revoked_at=NULL"
  ),[order.student_id,order.course_id,starts,expires]);
  await run(dialectSql(
   "INSERT INTO course_paid_access(student_id,course_id,origin,order_id) VALUES (?,?,'momo',?) ON DUPLICATE KEY UPDATE origin='momo',order_id=VALUES(order_id)",
   "INSERT INTO course_paid_access(student_id,course_id,origin,order_id) VALUES (?,?,'momo',?) ON CONFLICT(student_id,course_id) DO UPDATE SET origin='momo',order_id=EXCLUDED.order_id"
  ),[order.student_id,order.course_id,orderId]);
  await run('INSERT INTO course_access_audit(student_id,course_id,actor_id,action,note) VALUES (?,?,NULL,?,?)',[order.student_id,order.course_id,'momo_paid','MoMo · '+transactionId+' · '+orderId]);
 });
}
export async function receiveMomoIpn(body){
 const string=z.string().max(1000),d=z.object({partnerCode:string,orderId:z.string().uuid(),requestId:string,amount:z.number().int().positive(),extraData:string,orderInfo:string,orderType:string,payType:string,message:string,responseTime:z.number().int().nonnegative(),resultCode:z.number().int(),transId:z.union([z.number().int().nonnegative(),z.string().regex(/^\d{1,30}$/u)]),signature:z.string().regex(/^[a-f0-9]{64}$/iu)}).parse(body);
 const [payment]=await query('SELECT settings_id,request_id FROM course_momo_payments WHERE order_id=?',[d.orderId]);
 if(!payment)throw new AppError(400,'MOMO_ORDER_UNKNOWN','Thông báo không hợp lệ.');
 const config=await momoConfig(payment.settings_id);
 const signed=Object.fromEntries(['amount','extraData','message','orderId','orderInfo','orderType','partnerCode','payType','requestId','responseTime','resultCode','transId'].map(k=>[k,d[k]]));signed.accessKey=config.access_key;
 if(config.environment!=='production'||d.partnerCode!==config.partner_code||d.requestId!==payment.request_id||!verifyMomoSignature(config,signed,d.signature))throw new AppError(400,'MOMO_SIGNATURE_INVALID','Không xác thực được thông báo thanh toán.');
 if(d.resultCode===0)await settle(d.orderId,d.amount,d.transId);
 else await query('UPDATE course_momo_payments SET result_code=? WHERE order_id=? AND state<>\'paid\'',[d.resultCode,d.orderId]);
}
export async function checkMomoOrder(student,id){
 let order=await ownedMomoOrder(student,id);if(order.state==='paid')return publicMomoOrder(order);
 const claimed=await query("UPDATE course_momo_payments SET last_checked_at=CURRENT_TIMESTAMP(3) WHERE order_id=? AND state<>'paid' AND (last_checked_at IS NULL OR last_checked_at<?)",[id,new Date(Date.now()-30000)]);
 if(!claimed.affectedRows)return publicMomoOrder(order);
 const config=await momoConfig(order.settings_id);
 if(config.environment!=='production')return publicMomoOrder(order);
 const result=await queryMomoPayment(config,order);
 if(result.resultCode===0){
  if(result.refundTrans?.some(r=>r.resultCode===0))throw new AppError(409,'MOMO_REFUNDED','Giao dịch có hoàn tiền; cần quản trị viên đối soát.');
  await settle(id,result.amount,result.transId);
 }else await query('UPDATE course_momo_payments SET result_code=? WHERE order_id=? AND state<>\'paid\'',[Number.isInteger(result.resultCode)?result.resultCode:null,id]);
 return publicMomoOrder(await ownedMomoOrder(student,id));
}
