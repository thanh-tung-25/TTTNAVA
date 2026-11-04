import path from 'node:path';

// Serve protected HTML through Express itself. Only public assets go to CDN.
export function protectedHtml(directory) {
  const root = path.resolve(directory);
  return (request, response, next) => {
    let relative;
    try { relative = decodeURIComponent(request.path); } catch { return next(); }
    if (relative.includes('\0') || relative.includes('\\')) return next();
    let file = path.resolve(root, '.' + relative);
    if (file !== root && !file.startsWith(root + path.sep)) return next();
    if (relative.endsWith('/')) file = path.join(file, 'index.html');
    else if (!path.extname(file)) {
      const url = new URL(request.originalUrl, 'http://internal');
      url.pathname += '/';
      response.redirect(308, url.pathname + url.search);
      return;
    }
    if (path.extname(file) !== '.html') return next();
    response.set('Cache-Control', 'private, no-store');
    response.sendFile(file, { cacheControl: false, lastModified: false }, error => {
      if (error?.code === 'ENOENT' || error?.status === 404) next();
      else if (error) next(error);
    });
  };
}
