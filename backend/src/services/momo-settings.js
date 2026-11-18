import {createCipheriv,createDecipheriv,hkdfSync,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import env from '../config/env.js';
import {query,withTransaction} from '../config/db.js';
import {AppError} from '../utils/errors.js';

// Domain-separated encryption key. No credential ever leaves the server after saving.
const key=()=>Buffer.from(hkdfSync('sha256',process.env.PAYMENT_CONFIG_ENCRYPTION_KEY||env.jwt.secret,'ttnava-payments-v1','momo-credentials',32));
function encrypt(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(v=>v.toString('base64')).join('.');}
function decrypt(value){try{const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64')),cipher=createDecipheriv('aes-256-gcm',key(),iv);cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8'));}catch{throw new AppError(503,'MOMO_CONFIG_UNREADABLE','Cấu hình MoMo cần được nhập lại trong trang quản trị.');}}
export async function momoConfig(id){const [row]=await query(id?'SELECT * FROM course_momo_settings WHERE id=?':'SELECT * FROM course_momo_settings WHERE active=1 ORDER BY created_at DESC LIMIT 1',id?[id]:[]);return row?{...row,...decrypt(row.credentials)}:null;}
export const momoLive=c=>Boolean(c&&Number(c.enabled)&&c.environment==='production'&&c.partner_code&&c.access_key&&c.secret_key);
export async function momoStatus(){
 const [c]=await query('SELECT id,enabled,environment,partner_code,credentials FROM course_momo_settings WHERE active=1 ORDER BY created_at DESC LIMIT 1');
 let readable=true;if(c)try{decrypt(c.credentials);}catch{readable=false;}
 return {configured:Boolean(c),enabled:Boolean(Number(c?.enabled)),environment:c?.environment||'production',partner_code:c?.partner_code||'',ready:Boolean(c&&readable&&Number(c.enabled)&&c.environment==='production'),needs_keys:Boolean(c&&!readable),ipn_url:new URL('/api/v1/payments/momo/ipn',env.appOrigin).href};
}
export async function saveMomoSettings(admin,body){
 const d=z.object({enabled:z.boolean(),environment:z.enum(['production','sandbox']),partner_code:z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),access_key:z.string().trim().max(200).default(''),secret_key:z.string().trim().max(200).default('')}).strict().parse(body);
 let previous;try{previous=await momoConfig();}catch{/* A changed encryption key can be repaired by entering both credentials. */}
 const same=previous&&previous.partner_code===d.partner_code&&previous.environment===d.environment;
 const access_key=d.access_key||(same?previous.access_key:''),secret_key=d.secret_key||(same?previous.secret_key:'');
 if(!access_key||!secret_key)throw new AppError(400,'MOMO_KEYS_REQUIRED','Nhập đủ Access Key và Secret Key của kênh MoMo.');
 if(/[&\r\n]/u.test(access_key+secret_key))throw new AppError(400,'MOMO_KEYS_INVALID','Khóa kết nối MoMo không hợp lệ.');
 const origin=new URL(env.appOrigin);if(d.enabled&&d.environment==='production'&&origin.protocol!=='https:')throw new AppError(400,'MOMO_HTTPS_REQUIRED','Thanh toán thật cần địa chỉ website HTTPS.');
 await withTransaction(async c=>{
  // Lock the single owner account so concurrent saves cannot create two active settings.
  await c.query('SELECT id FROM profiles WHERE id=? FOR UPDATE',[admin]);
  await c.query('UPDATE course_momo_settings SET active=0 WHERE active=1');
  await c.query('INSERT INTO course_momo_settings(id,enabled,environment,partner_code,credentials,created_by) VALUES (?,?,?,?,?,?)',[randomUUID(),Number(d.enabled),d.environment,d.partner_code,encrypt({access_key,secret_key}),admin]);
 });
 return momoStatus();
}
