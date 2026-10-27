import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signToken(profile) {
  return jwt.sign(
    { sub: profile.id, role: profile.role, username: profile.username },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}
