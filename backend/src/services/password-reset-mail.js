import {emailDeliveryAvailable,sendAccountEmail} from './registration-mail.js';
import {AppError} from '../utils/errors.js';
export const passwordResetAvailable=()=>process.env.PASSWORD_RESET_ENABLED!=='false'&&emailDeliveryAvailable();
export async function sendPasswordResetOtp({email,otp}){
 if(!passwordResetAvailable())throw new AppError(503,'PASSWORD_RESET_UNAVAILABLE','Lấy lại mật khẩu đang tạm chưa khả dụng. Bạn vui lòng thử lại sau.');
 if(typeof otp!=='string'||!/^\d{6}$/u.test(otp))throw new AppError(400,'INVALID_OTP','Mã xác thực phải gồm 6 chữ số.');
 const text=`Mã xác thực lấy lại mật khẩu TTNAVA của bạn là: ${otp}\n\nMã có hiệu lực trong 5 phút, chỉ dùng một lần. Bạn cần nhập mã trên trang lấy lại mật khẩu trước khi đặt mật khẩu mới. Không chia sẻ mã với người khác.\nNếu bạn không yêu cầu lấy lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại chưa thay đổi.`;
 const html=`<div lang="vi" style="font-family:Arial,sans-serif;line-height:1.7;color:#493365;max-width:520px;margin:auto;padding:24px"><h1 style="font-size:24px">Lấy lại mật khẩu TTNAVA</h1><p>Nhập mã sau trên trang lấy lại mật khẩu:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${otp}</p><p>Mã có hiệu lực <strong>5 phút</strong> và chỉ dùng một lần. Không chia sẻ mã với người khác.</p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại chưa thay đổi.</p></div>`;
 return sendAccountEmail({to:[email],subject:'Mã xác thực lấy lại mật khẩu TTNAVA',text,html});
}
export async function sendPasswordChangedNotice({email}){
 const text='Mật khẩu tài khoản TTNAVA liên kết với email này vừa được thay đổi sau khi xác minh mã qua email. Các phiên đăng nhập cũ đã hết hiệu lực.\n\nNếu chính bạn thực hiện, bạn có thể đăng nhập bằng mật khẩu mới. Khóa học và kết quả học tập vẫn được giữ nguyên. Nếu bạn không thực hiện, hãy liên hệ quản trị viên để được hỗ trợ ngay.\nTTNAVA không gửi mật khẩu trong email.';
 return sendAccountEmail({to:[email],subject:'Mật khẩu TTNAVA đã được thay đổi',text,html:'<div lang="vi" style="font-family:Arial,sans-serif;line-height:1.7;max-width:520px;margin:auto;padding:24px"><h1 style="font-size:24px">Mật khẩu đã được thay đổi</h1>'+text.split('\n\n').map(part=>'<p>'+part+'</p>').join('')+'</div>'});
}
