import {api} from './api.js';
import {setupPasswordToggle} from './password-toggle.js';
const byId=id=>document.getElementById(id),emailForm=byId('reset-email-form'),codeStep=byId('reset-code-step'),passwordStep=byId('reset-password-step'),codeForm=byId('reset-code-form'),passwordForm=byId('reset-password-form'),error=byId('reset-error');
const send=byId('reset-send'),verify=byId('reset-verify'),save=byId('reset-save'),resend=byId('reset-resend'),email=byId('reset-email'),otp=byId('reset-code'),password=byId('reset-password'),confirm=byId('reset-password-confirm');
let challengeId='',recipient='',resetId='',resetToken='',codeExpires=0,sessionExpires=0,resendAt=0,busy=false,step='email';
setupPasswordToggle(password);setupPasswordToggle(confirm);
function clearError(){error.hidden=true;error.textContent='';}
function showError(message){error.textContent=message;error.hidden=false;error.focus();}
function seconds(until){return Math.max(0,Math.ceil((until-Date.now())/1000));}
function duration(value){return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');}
function update(){
 const retry=seconds(resendAt),code=seconds(codeExpires),session=seconds(sessionExpires);
 send.disabled=busy;verify.disabled=busy||!challengeId||!code;resend.disabled=busy||!challengeId||Boolean(retry);save.disabled=busy||!resetToken||!session;
 resend.textContent=retry?'Gửi lại mã sau '+retry+' giây':'Gửi lại mã';
 byId('reset-code-expiry').textContent=!challengeId?'':code?'Mã còn hiệu lực '+duration(code)+'.':'Mã đã hết hạn. Bạn hãy gửi lại mã.';
 byId('reset-session-expiry').textContent=!resetToken?'':session?'Bạn có '+duration(session)+' để đặt mật khẩu mới.':'Phiên đã hết hạn. Bạn hãy xác minh Gmail lại.';
 for(const node of [email,byId('reset-change-email'),byId('reset-restart')])node.disabled=busy;
 for(const form of [emailForm,codeForm,passwordForm])form.setAttribute('aria-busy',String(busy));
}
function busyState(value){busy=value;update();}
function showStep(value){
 step=value;emailForm.hidden=value!=='email';codeStep.hidden=value!=='code';passwordStep.hidden=value!=='password';byId('reset-success').hidden=value!=='success';
 for(const key of ['email','code','password']){const label=byId('reset-step-'+key);if(key===value)label.setAttribute('aria-current','step');else label.removeAttribute('aria-current');}
 byId('reset-content').querySelector('.reset-steps').hidden=value==='success';clearError();update();
}
function restart(){
 if(busy)return;challengeId='';resetId='';resetToken='';codeExpires=0;sessionExpires=0;otp.value='';password.value='';confirm.value='';showStep('email');email.focus();
}
function applyRetry(failure){const retry=Number(failure.details?.retryAfterSeconds);if(retry>0)resendAt=Date.now()+retry*1000;}
async function requestCode(address){
 const {data}=await api('/api/v1/auth/password-reset/request',{method:'POST',body:{email:address}});
 challengeId=data.challengeId;recipient=address;resetId='';resetToken='';codeExpires=Date.now()+data.expiresIn*1000;resendAt=Date.now()+data.resendAfter*1000;otp.value='';
 byId('reset-sent-message').textContent=data.message;byId('reset-recipient').textContent='Gmail bạn vừa nhập: '+recipient;showStep('code');otp.focus();
}
emailForm.onsubmit=async event=>{
 event.preventDefault();if(busy)return;clearError();const address=email.value.trim().toLowerCase();
 if(!email.checkValidity()||!address.endsWith('@gmail.com'))return showError('Bạn hãy nhập Gmail đã đăng ký, ví dụ tenban@gmail.com.');
 busyState(true);send.textContent='Đang yêu cầu mã…';try{await requestCode(address);}catch(failure){applyRetry(failure);showError(failure.message);}finally{busyState(false);send.textContent='Gửi mã xác thực';}
};
resend.onclick=async()=>{
 if(busy||!challengeId||resendAt>Date.now())return;clearError();busyState(true);
 try{await requestCode(recipient);}catch(failure){applyRetry(failure);showError(failure.message);}finally{busyState(false);}
};
codeForm.onsubmit=async event=>{
 event.preventDefault();if(busy||!challengeId)return;clearError();if(!/^\d{6}$/u.test(otp.value.trim()))return showError('Bạn hãy nhập đủ 6 số trong email.');
 if(codeExpires<=Date.now())return showError('Mã đã hết hạn. Bạn hãy gửi lại mã.');
 busyState(true);verify.textContent='Đang xác minh…';
 try{const {data}=await api('/api/v1/auth/password-reset/verify',{method:'POST',body:{challengeId,otp:otp.value.trim()}});resetId=data.resetId;resetToken=data.resetToken;sessionExpires=Date.now()+data.expiresIn*1000;challengeId='';otp.value='';showStep('password');password.focus();}
 catch(failure){showError(failure.message);}finally{busyState(false);verify.textContent='Xác minh mã';}
};
passwordForm.onsubmit=async event=>{
 event.preventDefault();if(busy||!resetToken)return;clearError();
 if(password.value.length<6||password.value.length>72)return showError('Mật khẩu cần từ 6 đến 72 ký tự.');
 if(new TextEncoder().encode(password.value).length>72)return showError('Mật khẩu quá dài. Bạn hãy dùng mật khẩu ngắn hơn.');
 if(password.value!==confirm.value)return showError('Hai mật khẩu chưa giống nhau. Bạn hãy kiểm tra lại.');
 if(sessionExpires<=Date.now())return showError('Phiên đã hết hạn. Bạn hãy xác minh Gmail lại.');
 busyState(true);save.textContent='Đang lưu mật khẩu…';
 try{const {data}=await api('/api/v1/auth/password-reset/complete',{method:'POST',body:{resetId,resetToken,newPassword:password.value}});resetId='';resetToken='';password.value='';confirm.value='';byId('reset-login-name').textContent='Tên đăng nhập của bạn: '+data.username;showStep('success');}
 catch(failure){showError(failure.message);}finally{busyState(false);save.textContent='Lưu mật khẩu mới';}
};
byId('reset-change-email').onclick=restart;byId('reset-restart').onclick=restart;
let timer=setInterval(update,1000);
window.addEventListener('pagehide',()=>{clearInterval(timer);otp.value='';password.value='';confirm.value='';resetToken='';resetId='';});
window.addEventListener('pageshow',event=>{if(event.persisted){busy=false;restart();clearInterval(timer);timer=setInterval(update,1000);}});
api('/api/v1/auth/password-reset/status').then(({data})=>{
 const availability=byId('reset-availability');if(!data.available){availability.textContent='Lấy lại mật khẩu đang tạm chưa khả dụng. Bạn vui lòng thử lại sau hoặc liên hệ quản trị viên.';return;}
 availability.hidden=true;byId('reset-content').hidden=false;showStep('email');
}).catch(failure=>{byId('reset-availability').textContent=failure.message;});
