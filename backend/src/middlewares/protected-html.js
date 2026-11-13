import path from 'node:path';
import {sendAppHtml} from '../utils/app-html.js';
import {recordUserAccess} from '../services/user-access-history.js';

// Local page modules may live beside HTML. The CDN build copies JS/CSS only;
// HTML continues to require authentication through Express.
export function protectedHtml(directory) {
  const root = path.resolve(directory);
  return (request, response, next) => {
    let relative;
    try { relative = decodeURIComponent(request.path); } catch { return next(); }
    if (relative.includes('\0') || relative.includes('\\')) return next();
    if (relative.split('/').some(segment => segment.startsWith('.'))) return next();
    let file = path.resolve(root, '.' + relative);
    if (file !== root && !file.startsWith(root + path.sep)) return next();
    if (relative.endsWith('/')) file = path.join(file, 'index.html');
    else if (!path.extname(file)) {
      const url = new URL(request.originalUrl, 'http://internal');
      url.pathname += '/';
      response.redirect(308, url.pathname + url.search);
      return;
    }
    if (!['.html', '.js', '.css'].includes(path.extname(file))) return next();
    response.set('Cache-Control', 'private, no-store');
    if(path.extname(file)==='.html'){
      sendAppHtml(response,file,()=>recordUserAccess(request.user,'page',request)).catch(error=>{if(error.code==='ENOENT')next();else next(error);});return;
    }
    response.sendFile(file, { cacheControl: false, lastModified: false }, error => {
      if (error?.code === 'ENOENT' || error?.status === 404) next();
      else if (error) next(error);
    });
  };
}
