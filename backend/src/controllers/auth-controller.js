import env from '../config/env.js';
import { loginSchema,requestRegistrationOtpSchema,completeRegistrationSchema } from '../validators/auth.js';
import { login } from '../services/auth-service.js';
import {registrationAvailable} from '../services/registration-mail.js';
import {requestRegistrationOtp,completeRegistration} from '../services/public-registration.js';
import { publicProfile } from '../utils/serializers.js';
import { asyncHandler } from '../utils/errors.js';
import {recordUserAccess} from '../services/user-access-history.js';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookie.secure,
    path: '/',
  };
}

export const loginHandler = asyncHandler(async (request, response) => {
  const { username, password } = loginSchema.parse(request.body);
  const result = await login(username, password);
  await recordUserAccess(result.profile,'login',request);
  response.cookie(env.cookie.name, result.token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE });
  response.json({ data: { profile: result.profile } });
});

export const logoutHandler = asyncHandler(async (request, response) => {
  await recordUserAccess(request.user,'logout',request);
  response.clearCookie(env.cookie.name, cookieOptions());
  response.json({ data: { loggedOut: true } });
});

export const meHandler = asyncHandler(async (request, response) => {
  response.json({ data: { profile: publicProfile(request.user) } });
});

export const registrationStatusHandler=asyncHandler(async(_request,response)=>{
 response.set('Cache-Control','no-store').json({data:{available:registrationAvailable()}});
});
export const requestRegistrationOtpHandler=asyncHandler(async(request,response)=>{
 const {email}=requestRegistrationOtpSchema.parse(request.body);
 response.set('Cache-Control','no-store').json({data:await requestRegistrationOtp(email)});
});
export const registerHandler=asyncHandler(async(request,response)=>{
 const result=await completeRegistration(completeRegistrationSchema.parse(request.body));
 await recordUserAccess(result.profile,'login',request);
 response.cookie(env.cookie.name,result.token,{...cookieOptions(),maxAge:COOKIE_MAX_AGE});
 response.set('Cache-Control','no-store').status(201).json({data:{profile:result.profile}});
});
