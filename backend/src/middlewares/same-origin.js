import env from '../config/env.js';
import { AppError } from '../utils/errors.js';

export function requireSameOrigin(request, _response, next) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    next();
    return;
  }
  const origin = request.get('origin');
  if (origin && origin !== env.appOrigin) {
    next(new AppError(403, 'CSRF_ORIGIN', 'Yêu cầu không đến từ ứng dụng hợp lệ'));
    return;
  }
  next();
}
