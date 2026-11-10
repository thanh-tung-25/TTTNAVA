import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signToken(profile) {
  return jwt.sign(
    { sub: profile.id, role: profile.role, username: profile.username, ...(profile.role === 'admin' ? { av: Number(profile.admin_auth_version || 0) } : {}),...(profile.role==='student'?{sv:Number(profile.student_auth_version||0)}:{}) },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}
