import {afterEach,describe,it,expect,vi} from 'vitest';
import {registrationAvailable} from '../src/services/registration-mail.js';
import {passwordResetAvailable,sendPasswordResetOtp,sendPasswordChangedNotice} from '../src/services/password-reset-mail.js';
const smtp=vi.hoisted(()=>({createTransport:vi.fn(),sendMail:vi.fn(),close:vi.fn()}));
vi.mock('nodemailer',()=>({default:{createTransport:smtp.createTransport}}));
afterEach(()=>{vi.restoreAllMocks();vi.clearAllMocks();vi.unstubAllEnvs();});
function configure(){
 vi.stubEnv('REGISTRATION_ENABLED','false');vi.stubEnv('REGISTRATION_MAIL_PROVIDER','gmail');vi.stubEnv('GMAIL_USER','sender@gmail.com');vi.stubEnv('GMAIL_APP_PASSWORD','abcdefghijklmnop');vi.stubEnv('PASSWORD_RESET_ENABLED','true');
 smtp.createTransport.mockReturnValue({sendMail:smtp.sendMail,close:smtp.close});smtp.sendMail.mockResolvedValue({messageId:'mock-reset-message',accepted:['person@gmail.com']});
}
describe('password recovery mail',()=>{
 it('remains available when new registrations are paused and uses a distinct email purpose',async()=>{
  configure();expect(registrationAvailable()).toBe(false);expect(passwordResetAvailable()).toBe(true);await sendPasswordResetOtp({email:'person@gmail.com',otp:'012345'});
  const message=smtp.sendMail.mock.calls[0][0];expect(message.subject).toContain('lấy lại mật khẩu');expect(message.text).toContain('012345');expect(message.text).toContain('5 phút');expect(message.text).not.toContain('xác minh đăng ký');expect(smtp.close).toHaveBeenCalledOnce();
 });
 it('can disable recovery without pausing registrations',async()=>{
  configure();vi.stubEnv('REGISTRATION_ENABLED','true');vi.stubEnv('PASSWORD_RESET_ENABLED','false');expect(registrationAvailable()).toBe(true);expect(passwordResetAvailable()).toBe(false);await expect(sendPasswordResetOtp({email:'person@gmail.com',otp:'123456'})).rejects.toMatchObject({code:'PASSWORD_RESET_UNAVAILABLE'});expect(smtp.sendMail).not.toHaveBeenCalled();
 });
 it('rejects malformed codes and email header injection before sending',async()=>{
  configure();await expect(sendPasswordResetOtp({email:'person@gmail.com',otp:'<12345'})).rejects.toMatchObject({code:'INVALID_OTP'});await expect(sendPasswordResetOtp({email:'person@gmail.com\r\nBcc:someone@gmail.com',otp:'123456'})).rejects.toMatchObject({code:'INVALID_GMAIL'});expect(smtp.sendMail).not.toHaveBeenCalled();
 });
 it('reports provider failures without exposing the code or transport secrets',async()=>{
  configure();smtp.sendMail.mockRejectedValue(Error('provider rejected OTP 123456 and abcdefghijklmnop'));const failure=await sendPasswordResetOtp({email:'person@gmail.com',otp:'123456'}).catch(error=>error);expect(failure.code).toBe('MAIL_DELIVERY_FAILED');expect(failure.message).not.toContain('123456');expect(failure.message).not.toContain('abcdefghijklmnop');
 });
 it('sends a completion notice without including a new password or code',async()=>{
  configure();await sendPasswordChangedNotice({email:'person@gmail.com'});const message=smtp.sendMail.mock.calls[0][0];expect(message.subject).toContain('đã được thay đổi');expect(message.text).toContain('phiên đăng nhập cũ');expect(message.text).toContain('Khóa học và kết quả học tập');expect(message.text).not.toContain('012345');
 });
});
