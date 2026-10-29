import multer from 'multer';
import { AppError } from '../utils/errors.js';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
  'application/zip',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter(_request, file, callback) {
    if (!file.originalname.toLocaleLowerCase('vi').endsWith('.docx')) {
      callback(new AppError(415, 'FILE_TYPE_INVALID', 'Chỉ chấp nhận tệp .docx'));
      return;
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      callback(new AppError(415, 'FILE_TYPE_INVALID', 'Kiểu tệp không hợp lệ. Chỉ chấp nhận .docx'));
      return;
    }
    callback(null, true);
  },
}).single('file');

export function uploadDocx(request, response, next) {
  upload(request, response, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(413, 'FILE_TOO_LARGE', 'Tệp .docx tối đa 20 MB'));
      } else {
        next(new AppError(400, 'UPLOAD_INVALID', `Tải tệp thất bại: ${error.message}`));
      }
      return;
    }
    if (error) {
      next(error);
      return;
    }
    if (!request.file) {
      next(new AppError(400, 'FILE_REQUIRED', 'Vui lòng chọn tệp .docx'));
      return;
    }
    next();
  });
}
