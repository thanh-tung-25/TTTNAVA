import {formatDate} from './api.js';

export const courseOrderLabels={admin_free:'Được cấp miễn phí',pending:'Chờ thanh toán',approved:'Đã thanh toán',rejected:'Đã từ chối',cancelled:'Đã hủy'};
const originalLabels={pending:'Chờ duyệt',approved:'Đã duyệt',rejected:'Đã từ chối',cancelled:'Đã hủy'};
export function courseOrderView(order){
 const status=order.display_status||order.status,free=status==='admin_free';
 let period='';
 if(free){
  const start=order.free_starts_at,end=order.free_ends_at,now=Date.now();
  period=order.free_revoked_at?'Quyền miễn phí đã thu hồi':end&&new Date(end).getTime()<=now?'Quyền miễn phí đã hết hạn':start&&new Date(start).getTime()>now?'Miễn phí chưa bắt đầu':'Được cấp miễn phí theo đợt đăng ký';
  if(start&&end)period+=' · Từ '+formatDate(start,false)+' đến '+formatDate(end,false);
 }
 return {status,free,amount:order.display_amount_vnd??order.amount_vnd,label:courseOrderLabels[status]||status,period,originalLabel:originalLabels[order.status]||order.status};
}
