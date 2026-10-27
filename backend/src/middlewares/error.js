import { ZodError } from 'zod';
import env from '../config/env.js';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(request, response) {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Không tìm thấy ${request.method} ${request.originalUrl}`,
    },
  });
}

export function errorHandler(error, request, response, _next) {
  if (response.headersSent) return;

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu chưa hợp lệ',
        details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.code === 'ACCOUNT_LOCKED' || error.code === 'INVALID_TOKEN' || error.code === 'UNAUTHENTICATED') {
      response.clearCookie(env.cookie.name, { httpOnly: true, sameSite: 'lax', secure: env.cookie.secure });
    }
    response.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details ?? undefined },
    });
    return;
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    response.status(409).json({ error: { code: 'DUPLICATE', message: 'Dữ liệu này đã tồn tại' } });
    return;
  }

  console.error(`[${request.method} ${request.originalUrl}]`, error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Hệ thống đang bận, con thử lại sau nhé',
      ...(env.isProduction ? {} : { detail: error.message }),
    },
  });
}
