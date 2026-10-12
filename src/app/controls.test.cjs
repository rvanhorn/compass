const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const defaults=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e','import {DEFAULT_OPTIONS} from "./src/shared/options.mjs";console.log(JSON.stringify(DEFAULT_OPTIONS))'],{cwd:root,encoding:'utf8'}));
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
async function setup(draft,initialProject){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'src/app/template.html'),'utf8'),{url:'https://compass.test/compass.html',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.setInterval=()=>0;
 if(draft)w.localStorage.setItem('compass-project:/workspace',JSON.stringify(draft));
 w.CompassBrowser={root:'/workspace',connectWorkspace:async()=>true,request:async(url,value)=>{
  calls.push({url,value});let data;
  if(url==='/api/session')data={root:'/workspace',defaults,project:initialProject};
  else if(url.startsWith('/api/project'))data=value;
  else if(url.startsWith('/api/files'))data={path:'.',parent:null,entries:[{name:'one.md',path:'one.md',directory:false},{name:'two.md',path:'two.md',directory:false}]};
  else if(url==='/api/preview')data={pages:(value.mode==='separate'?value.files:[value.files[0]]).map((f,i)=>({title:f.title||f.name,name:i+'.html',html:'<html><body><h1>'+f.name+'</h1></body></html>'})),warnings:[]};
  return {ok:true,json:async()=>data,headers:{get:()=> 'attachment; filename="guide.html"'},blob:async()=>new w.Blob(['export'])};
 }};
 w.eval(fs.readFileSync(path.join(root,'src/app/controls.js'),'utf8'));await settle();
 return {dom,w,d,calls};
}
const draft=()=>({version:1,name:'Guide',title:'',subtitle:'',author:'',mode:'combined',safe:true,chapter_titles:true,options:{...defaults},files:[{name:'one.md',path:'one.md',title:''},{name:'two.md',path:'two.md',title:''}]});
test('startup projects open in preview and preserve the ordinary workspace draft',async()=>{
 const existing=draft(),initial={...draft(),name:'Explore Compass',files:[{name:'feature-guide.md',path:'demo/feature-guide.md',title:''}]};
 const {w,d,calls}=await setup(existing,initial);
 try{
  assert(d.body.classList.contains('editing'));
  assert.equal(d.querySelectorAll('.file-card').length,1);
  assert.equal(d.querySelector('#project-name').value,'Explore Compass');
  assert.equal(calls.find(c=>c.url==='/api/preview').value.files[0].path,'demo/feature-guide.md');
  d.querySelector('[data-preset="vivid"]').click();
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).name,'Guide');
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace:startup:Explore Compass')).options.accent,'#ec4899');
 }finally{w.close();}
});
test('centered setup becomes a drawer and supports reordering and separate preview pages',async()=>{
 const {w,d,calls}=await setup(draft());
 try{
  assert(!d.body.classList.contains('editing'));assert.equal(d.querySelectorAll('.file-card').length,2);
  d.querySelector('[aria-label="Move two.md Up"]').click();
  d.querySelector('#start-preview').click();await settle();
  assert(d.body.classList.contains('editing'));assert(!d.querySelector('#preview-pane').hidden);
  assert.equal(calls.filter(c=>c.url==='/api/preview').at(-1).value.files[0].name,'two.md');
  d.querySelector('#mode').value='separate';d.querySelector('#mode').dispatchEvent(new w.Event('input'));await new Promise(r=>setTimeout(r,500));
  assert.equal(d.querySelector('#preview-page').options.length,2);
  d.querySelector('#hide-drawer').click();assert(d.body.classList.contains('drawer-hidden'));
  d.querySelector('#show-drawer').click();assert(!d.body.classList.contains('drawer-hidden'));
 }finally{w.close();}
});
test('design presets and feature controls are saved and sent to the renderer',async()=>{
 const {w,d,calls}=await setup(draft());
 try{
  d.querySelector('[data-preset="vivid"]').click();
  const customize=d.querySelector('[data-option="customize"]');customize.checked=false;customize.dispatchEvent(new w.Event('input'));
  d.querySelector('#start-preview').click();await settle();
  const value=calls.filter(c=>c.url==='/api/preview').at(-1).value;
  assert.equal(value.options.accent,'#ec4899');assert.equal(value.options.customize,false);
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).options.customize,false);
  d.querySelector('#reset-options').click();assert(d.querySelector('[data-option="customize"]').checked);
  assert.equal(d.querySelector('#opt-accent').value,defaults.accent);
 }finally{w.close();}
});
test('workspace selection adds linked files and project/export requests preserve configuration',async()=>{
 const {w,d,calls}=await setup();
 try{
  d.querySelector('#browse').click();await settle();
  const inputs=d.querySelectorAll('#browser-entries input');inputs.forEach(input=>{input.checked=true;input.dispatchEvent(new w.Event('change'));});
  d.querySelector('#add-selected').click();assert.equal(d.querySelectorAll('.file-card').length,2);
  d.querySelector('#save-project').click();await settle();assert.equal(calls.filter(c=>c.url==='/api/project?portable=1').at(-1).value.files[0].path,'one.md');
  d.querySelector('#export').click();await settle();assert.equal(calls.filter(c=>c.url==='/api/export').at(-1).value.files.length,2);
  assert.equal(d.querySelector('#export').disabled,false);
 }finally{w.close();}
});
test('file imports include folder images and update the preview',async()=>{
 const {w,d,calls}=await setup();
 try{
  const md={name:'chapter.md',webkitRelativePath:'book/chapter.md',size:40,text:async()=> '# Chapter\n\n![X](image.png)'};
  const image=new w.File(['image'],'image.png',{type:'image/png'});Object.defineProperty(image,'webkitRelativePath',{value:'book/image.png'});
  Object.defineProperty(d.querySelector('#folder-input'),'files',{value:[md,image]});
  d.querySelector('#folder-input').dispatchEvent(new w.Event('change'));await settle();await settle();
  d.querySelector('#start-preview').click();await settle();
  const file=calls.filter(c=>c.url==='/api/preview').at(-1).value.files[0];
  assert.equal(file.name,'book/chapter.md');assert.match(file.assets['image.png'],/^data:image\/png;base64,/);
 }finally{w.close();}
});

test('switches render immediately and keep the visible frame until the latest replacement is ready',async()=>{
 const {w,d,calls}=await setup(null,draft());
 try{
  const original=d.querySelector('#preview-frame'),input=d.querySelector('[data-option="footer"]');
  const count=()=>calls.filter(call=>call.url==='/api/preview').length;
  const before=count();
  input.checked=false;input.dispatchEvent(new w.Event('input'));
  assert.equal(count(),before+1,'no debounce on a switch');
  await settle();
  const stale=d.querySelector('.preview-incoming'),staleWindow=stale.contentWindow;
  assert.equal(d.querySelector('#preview-frame'),original);
  assert(stale.srcdoc.includes('"target":"footer"'));
  assert.equal(stale.getAttribute('aria-hidden'),'true');
  input.checked=true;input.dispatchEvent(new w.Event('input'));await settle();
  const replacement=d.querySelector('.preview-incoming');assert.notEqual(replacement,stale);
  w.dispatchEvent(new w.MessageEvent('message',{source:staleWindow,data:{type:'compass-ready',y:999}}));
  assert.equal(d.querySelector('#preview-frame'),original,'discarded frames cannot replace the newest preview');
  w.dispatchEvent(new w.MessageEvent('message',{source:replacement.contentWindow,data:{type:'compass-ready',y:400}}));
  assert.equal(d.querySelector('#preview-frame'),replacement);
  assert.equal(replacement.getAttribute('aria-hidden'),null);
  assert(original.isConnected,'old document remains under the crossfade');
  assert(original.classList.contains('preview-retiring'));
  await new Promise(resolve=>setTimeout(resolve,160));assert(!original.isConnected);
 }finally{w.close();}
});

test('preview positioning reveals offscreen features and hidden contexts before ready without waiting for load',async()=>{
 const {w,d}=await setup(null,draft());
 const preview=new JSDOM(d.querySelector('#preview-frame').srcdoc,{runScripts:'outside-only'}),p=preview.window,doc=p.document;
 try{
  const script=[...doc.scripts].at(-1).textContent;
  // Extract the actual injected bridge, then exercise it with controlled layout.
  const bridge=script.slice(0,script.lastIndexOf(')(')+1);
  const run=(target,scroll=0,hash='')=>p.eval(bridge+'('+JSON.stringify({target,scroll,hash,names:['one.html']})+');');
  let ready,scrolls=[];p.requestAnimationFrame=callback=>callback();
  p.postMessage=message=>{ready=message;};
  p.scrollTo=options=>{p.scrollY=options.top;scrolls.push(options.top);};
  doc.body.innerHTML='<header class="hero"></header><div class="code-frame"><button class="copy-btn">Copy</button></div><footer class="doc-footer" hidden></footer>';
  const rect=top=>({top,bottom:top+40,left:0,right:200,width:200,height:40});
  doc.querySelector('.copy-btn').getBoundingClientRect=()=>rect(1000-p.scrollY);
  doc.querySelector('.code-frame').getBoundingClientRect=()=>rect(1000-p.scrollY);
  doc.querySelector('.hero').getBoundingClientRect=()=>rect(0-p.scrollY);
  run('copy_code');assert.equal(p.scrollY,904);assert.equal(ready.type,'compass-ready');
  scrolls=[];run('copy_code',900);assert.deepEqual(scrolls,[900],'visible features do not move the reader');
  doc.querySelector('.copy-btn').hidden=true;run('copy_code');assert.equal(p.scrollY,904,'disabled feature reveals its container');
  Object.defineProperty(doc.documentElement,'scrollHeight',{value:2500});run('footer');assert.equal(p.scrollY,2500);
  doc.body.innerHTML='';scrolls=[];run('image_zoom',300);assert.deepEqual(scrolls,[300],'missing content preserves position');
  doc.body.innerHTML='<h2 id="destination">Destination</h2>';
  let reached=false;doc.querySelector('h2').scrollIntoView=()=>{reached=true;};run('',0,'destination');assert(reached,'page fragments apply after restoration');
 }finally{p.close();w.close();}
});
