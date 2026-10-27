export class AppError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return function wrapped(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function notFound(message = 'Không tìm thấy tài nguyên') {
  return new AppError(404, 'NOT_FOUND', message);
}

export function badRequest(message, details = null) {
  return new AppError(400, 'BAD_REQUEST', message, details);
}

export function forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
  return new AppError(403, 'FORBIDDEN', message);
}
