import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('frontend');
export default async function setup(){
 const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let target=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))target=path.join(target,'index.html');
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const body=await readFile(target);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'})[path.extname(target)]||'application/octet-stream');res.end(body);
 }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(Number(process.env.E2E_STATIC_PORT||4193),'127.0.0.1',resolve));
 return async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));};
}
