import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import apiRouter from './routes/index.js';
import { requirePageRole, redirectIfAuthenticated, resolveUser } from './middlewares/auth.js';
import { requireSameOrigin } from './middlewares/same-origin.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';

const frontendRoot = path.join(env.backendRoot, '..', 'frontend');
const pagesRoot = path.join(frontendRoot, 'pages');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('strict routing', true);
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        // Giao diện dùng vài thuộc tính style động (màu môn học, khoảng cách nhỏ).
        styleSrcAttr: ["'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use('/api/v1/chinese', express.json({ limit: '2mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  app.use('/assets', express.static(path.join(frontendRoot, 'assets'), {
    maxAge: env.isProduction ? '7d' : 0,
    fallthrough: true,
  }));

  app.get('/', async (request, response) => {
    try {
      const user = await resolveUser(request);
      response.redirect(user.role === 'admin' ? '/pages/admin/students/' : '/pages/student/home/');
    } catch {
      response.sendFile(path.join(pagesRoot, 'welcome', 'index.html'));
    }
  });

  app.get('/pages/login', (_request, response) => response.redirect('/pages/login/'));
  app.get('/pages/login/', redirectIfAuthenticated, (_request, response) => {
    response.sendFile(path.join(pagesRoot, 'login', 'index.html'));
  });

  app.use('/pages/student', requirePageRole('student'), express.static(path.join(pagesRoot, 'student'), {
    extensions: ['html'],
  }));
  app.use('/pages/admin', requirePageRole('admin'), express.static(path.join(pagesRoot, 'admin'), {
    extensions: ['html'],
  }));

  app.get('/api/v1/health', (_request, response) => {
    response.json({ data: { status: 'ok', time: new Date().toISOString() } });
  });

  app.use('/api/v1', requireSameOrigin, apiRouter);
  app.use('/api', notFoundHandler);

  app.use((request, response, next) => {
    if (!request.accepts('html')) {
      notFoundHandler(request, response);
      return;
    }
    response.status(404).sendFile(path.join(pagesRoot, 'not-found.html'), (error) => {
      if (error) next(error);
    });
  });

  app.use(errorHandler);
  return app;
}

export default createApp;
