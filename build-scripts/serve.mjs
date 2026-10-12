import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||4173);
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const name=pathname==='/'?'index.html':pathname.replace(/^\//,'');
  if(!['index.html','compass.html','THIRD_PARTY_NOTICES.txt','previews/readme.html','previews/feature-guide.html'].includes(name)){res.writeHead(404);res.end('Not found');return;}
  try{const data=await readFile(path.join(root,name));res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(data);}
  catch(_){res.writeHead(404);res.end(name.startsWith('previews/')?'Run pnpm run previews first.':'Run pnpm run build first.');}
});
server.listen(port,'127.0.0.1',()=>console.log('Compass: http://127.0.0.1:'+port+'/'));
