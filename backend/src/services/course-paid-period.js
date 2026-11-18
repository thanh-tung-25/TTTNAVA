// A confirmed purchase adds its duration after the access already remaining.
// This only computes the next period; it never rewrites existing receipts.
export function continuedPaidPeriod(previous,gift,durationDays,now=new Date()){
 const time=now.getTime();
 const paid=previous&&!previous.revoked_at&&(previous.expires_at==null||new Date(previous.expires_at).getTime()>time);
 const free=gift&&!gift.revoked_at&&new Date(gift.starts_at).getTime()<=time&&new Date(gift.ends_at).getTime()>time;
 const permanent=paid&&previous.expires_at==null;
 const paidEnd=paid&&previous.expires_at?new Date(previous.expires_at).getTime():time;
 const freeEnd=free?new Date(gift.ends_at).getTime():time;
 const base=Math.max(time,paidEnd,freeEnd);
 return {
  starts_at:paid?new Date(previous.starts_at):new Date(base),
  expires_at:permanent||durationDays==null?null:new Date(base+Number(durationDays)*86400000),
 };
}
