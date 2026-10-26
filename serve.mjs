import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAiHandler} from './ai-api.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const handleAi=createAiHandler();
http.createServer(async(req,res)=>{
  if(await handleAi(req,res))return;
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end('Bad request');return}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return}
  const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(target,(error,bytes)=>{if(error){res.writeHead(404).end('Not found');return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(target)]||'application/octet-stream');res.end(req.method==='HEAD'?undefined:bytes)})
}).listen(Number(process.env.PORT)||4174,'127.0.0.1',()=>console.log('Local: http://localhost:'+(process.env.PORT||4174)));
