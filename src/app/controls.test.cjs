const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const defaults=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e','import {DEFAULT_OPTIONS} from "./src/shared/options.mjs";console.log(JSON.stringify(DEFAULT_OPTIONS))'],{cwd:root,encoding:'utf8'}));
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
// The workspace modules are bundled once and started in each window with a stand-in backend.
let bundle;
const appBundle=()=>bundle??=require('esbuild').build({entryPoints:[path.join(root,'src/app/app.js')],bundle:true,write:false,format:'iife',globalName:'CompassApp',platform:'browser',target:['es2022'],charset:'utf8',logLevel:'silent'}).then(result=>result.outputFiles[0].text);
async function setup(draft,initialProject,{prefs,before}={}){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'src/app/template.html'),'utf8'),{url:'https://compass.test/compass.html',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.setInterval=()=>0;
 // jsdom never loads srcdoc; fire load as a browser does, so startup does not wait out its cap.
 const srcdoc=Object.getOwnPropertyDescriptor(w.HTMLIFrameElement.prototype,'srcdoc');
 Object.defineProperty(w.HTMLIFrameElement.prototype,'srcdoc',{configurable:true,get(){return srcdoc.get.call(this);},set(value){srcdoc.set.call(this,value);setTimeout(()=>this.dispatchEvent(new w.Event('load')),0);}});
 if(draft)w.localStorage.setItem('compass-project:/workspace',JSON.stringify(draft));
 if(prefs)w.localStorage.setItem('compass-panel',JSON.stringify(prefs));
 before?.(w);
 const backend={root:'/workspace',connectWorkspace:async()=>true,request:async(url,value)=>{
  calls.push({url,value});let data;
  if(url==='/api/session')data={root:'/workspace',defaults,project:initialProject};
  else if(url.startsWith('/api/project'))data=value;
  else if(url.startsWith('/api/files'))data={path:'.',parent:null,entries:[{name:'one.md',path:'one.md',directory:false},{name:'two.md',path:'two.md',directory:false}]};
  else if(url==='/api/preview')data={pages:(value.mode==='separate'?value.files:[value.files[0]]).map((f,i)=>({title:f.title||f.name,name:i+'.html',html:'<html lang="en"><head></head><body><h1>'+f.name+'</h1></body></html>'})),warnings:[]};
  return {ok:true,json:async()=>data,headers:{get:()=> 'attachment; filename="guide.html"'},blob:async()=>new w.Blob(['export'])};
 }};
 w.matchMedia=()=>({matches:false});w.eval(await appBundle());
 await w.CompassApp.start(backend);await settle();
 return {dom,w,d,calls};
}
const draft=()=>({version:1,name:'Guide',title:'',subtitle:'',author:'',mode:'combined',safe:true,chapter_titles:true,options:{...defaults},files:[{name:'one.md',path:'one.md',title:''},{name:'two.md',path:'two.md',title:''}]});
test('custom menus support keyboard navigation, Escape, selected appearance, and a clear publishing route',async()=>{
 const {w,d}=await setup(draft());
 try{
  const trigger=d.querySelector('#view-toggle'),menu=d.querySelector('#view-menu');
  assert.equal(trigger.tagName,'BUTTON');
  trigger.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(menu.hidden,false);
  const first=d.activeElement;menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.notEqual(d.activeElement,first);
  menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.hidden,true);assert.equal(d.activeElement,trigger);
  d.querySelector('#publish-toggle').click();await settle();assert.equal(d.querySelector('#tab-publishing').hidden,false);assert.equal(d.querySelector('#publish-toggle').getAttribute('aria-pressed'),'true');assert.equal(d.querySelector('#export').hidden,false);
  d.querySelector('#change-layout').click();await settle();assert.equal(d.querySelector('#tab-pages').hidden,false);assert.equal(d.querySelector('#publish-toggle').getAttribute('aria-pressed'),'false');assert.equal(d.activeElement,d.querySelector('[name=output-mode]:checked'));
  const separate=d.querySelector('[name=output-mode][value=separate]');separate.checked=true;separate.dispatchEvent(new w.Event('change'));
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).mode,'separate');assert.equal(d.querySelector('#export span').textContent,'Download ZIP');
 }finally{w.close();}
});
test('footer resets are visible for their tab and reset only the requested settings',async()=>{
 const initial=draft();initial.options={...initial.options,font:21,customize:false};const {w,d}=await setup(initial);
 try{
  d.querySelector('[data-tab=appearance]').click();assert.equal(d.querySelector('#reset-options').hidden,false);
  d.querySelector('#reset-options').click();const saved=()=>JSON.parse(w.localStorage.getItem('compass-project:/workspace')).options;
  assert.equal(saved().font,defaults.font);assert.equal(saved().customize,false);
  d.querySelector('[data-tab=features]').click();assert.equal(d.querySelector('#reset-options').hidden,true);assert.equal(d.querySelector('#reset-features').hidden,false);
  d.querySelector('#reset-features').click();assert.equal(saved().customize,true);
 }finally{w.close();}
});
test('settings use flat groups with descriptions, examples stay available, and Design edits the current theme',async()=>{
 const {w,d}=await setup(draft());
 try{
  const groups=[...d.querySelectorAll('#feature-controls .feature-group')];assert.equal(groups.length,5);
  for(const group of groups){assert(group.querySelector('h3').textContent);for(const row of group.querySelectorAll('.toggle-row'))assert(row.querySelector('small').textContent.length>10,'every reader tool explains what it does');}
  assert.equal(d.querySelectorAll('#tab-features details,#tab-appearance details,#tab-sources details:not(.file-menu),#tab-pages details,#tab-details details').length,0,'no setting hides inside a collapsed section');
  assert(!d.querySelector('.browser-examples').hidden);assert(!d.querySelector('.examples-section details'));
  assert.equal(d.querySelector('#load-example strong').textContent,'Explore Compass');
  assert.equal(d.querySelector('#load-combined-example strong').textContent,'Publishing Guide');
  assert.equal(d.querySelector('[data-preset]'),null);assert.equal(d.querySelector('.theme-sample'),null);
  // Each fine-tuning setting sits under the tool it adjusts, stays visible, and is disabled while that tool is off.
  for(const [key,parent] of [['outline_depth','outline'],['table_rows','table_scroll'],['reading_speed','reading_time'],['contents_open','contents'],['remember','customize']]){
   const control=d.querySelector('[data-option="'+key+'"]'),sub=control.closest('.cx-sub');assert.equal(sub.id,'sub-'+parent);
   const toggle=d.querySelector('#feature-controls input[type=checkbox][data-option="'+parent+'"]');
   toggle.checked=true;toggle.dispatchEvent(new w.Event('change'));assert.equal(control.disabled,false,key+' works while '+parent+' is on');
   toggle.checked=false;toggle.dispatchEvent(new w.Event('change'));assert.equal(sub.hidden,false,key+' stays visible');assert.equal(control.disabled,true,key+' is disabled while '+parent+' is off');
   toggle.checked=true;toggle.dispatchEvent(new w.Event('change'));assert.equal(control.disabled,false);
  }
  assert.equal(d.querySelector('#feature-tuning'),null,'no separate Fine Tuning group');
  d.documentElement.dataset.theme='dark';d.querySelector('[data-tab=appearance]').click();
  assert.equal(d.querySelector('[data-edit-theme=dark]').getAttribute('aria-pressed'),'true');
  d.querySelector('#hide-drawer').click();d.documentElement.dataset.theme='light';d.querySelector('[data-tab=appearance]').click();await settle();
  assert.equal(d.querySelector('[data-edit-theme=light]').getAttribute('aria-pressed'),'true');
 }finally{w.close();}
});
test('surface overrides and typography controls persist independently without losing fractional spacing',async()=>{
 const {w,d}=await setup(draft());
 try{
  const change=(id,value)=>{const input=d.querySelector('#'+id);input.value=value;input.dispatchEvent(new w.Event('input'));};
  change('hex-dark_surface','#282422');change('value-letter_spacing','.015');change('value-paragraph_spacing','24');change('value-heading_scale','1.15');
  const saved=JSON.parse(w.localStorage.getItem('compass-project:/workspace')).options;
  assert.equal(saved.dark_surface,'#282422');assert.equal(saved.letter_spacing,.015);assert.equal(saved.paragraph_spacing,24);assert.equal(saved.heading_scale,1.15);
  d.querySelector('[data-reset-surface=dark_surface]').click();
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).options.dark_surface,'');
  assert.equal(d.querySelector('#hex-dark_surface').value,'');
 }finally{w.close();}
});
test('color pickers dismiss outside, on Escape, and when focus moves into the preview',async()=>{
 const {w,d}=await setup(draft());
 try{
  d.querySelector('[data-tab=appearance]').click();
  const trigger=d.querySelector('#opt-accent'),picker=d.querySelector('.compass-color-picker');
  trigger.click();assert.equal(picker.hidden,false);assert.equal(trigger.getAttribute('aria-expanded'),'true');
  d.querySelector('h2').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));assert.equal(picker.hidden,true);
  trigger.click();picker.querySelector('input').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(picker.hidden,true);assert.equal(d.activeElement,trigger);
  trigger.click();w.dispatchEvent(new w.Event('blur'));assert.equal(picker.hidden,true);
  trigger.click();d.querySelector('#opt-background').click();assert.equal(picker.hidden,true);
  assert.equal(d.querySelectorAll('.compass-color-picker:not([hidden])').length,1);
  d.querySelector('[data-tab=pages]').click();assert.equal(d.querySelectorAll('.compass-color-picker:not([hidden])').length,0);
 }finally{w.close();}
});
test('in-page color editing keeps live theme pairing and saved colors',async()=>{
 const {w,d}=await setup(draft());
 try{
  const trigger=d.querySelector('#opt-accent');trigger.click();
  const picker=d.querySelector('.compass-color-picker'),hex=picker.querySelector('.ccp-hex input');
  hex.value='#cc2244';hex.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(trigger.value,'#cc2244');assert.equal(d.querySelector('#hex-accent').value,'#CC2244');
  const saved=JSON.parse(w.localStorage.getItem('compass-project:/workspace')).options;
  assert.equal(saved.accent,'#cc2244');assert.equal(saved.dark_accent,(await import('../shared/design.mjs')).pairedAccent('#cc2244','dark'));
  const hue=picker.querySelector('[data-channel=h]');hue.value='120';hue.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(trigger.value,'#22cc22');assert.equal(picker.hidden,false);
 }finally{w.close();}
});
test('theme colors pair accents in both directions, support independent overrides, and save icon colors',async()=>{
 const {w,d}=await setup(draft());
 try{
  const design=await import('../shared/design.mjs');
  const change=(id,value)=>{const input=d.querySelector('#'+id);input.value=value;input.dispatchEvent(new w.Event('input'));};
  change('hex-dark_accent','#f87171');assert.equal(d.querySelector('#opt-accent').value,design.pairedAccent('#f87171','light'));
  change('opt-accent','#2277cc');assert.equal(d.querySelector('#opt-dark_accent').value,design.pairedAccent('#2277cc','dark'));
  const linked=d.querySelector('[data-option=link_accents]');linked.checked=false;linked.dispatchEvent(new w.Event('input'));
  const light=d.querySelector('#opt-accent').value;change('opt-dark_accent','#ff4444');assert.equal(d.querySelector('#opt-accent').value,light);
  change('opt-logo_color','#123456');change('opt-dark_logo_color','#abcdef');
  const saved=JSON.parse(w.localStorage.getItem('compass-project:/workspace')).options;
  assert.equal(saved.logo_color,'#123456');assert.equal(saved.dark_logo_color,'#abcdef');assert.equal(saved.dark_accent,'#ff4444');assert.equal(saved.link_accents,false);
 }finally{w.close();}
});
test('Sources holds compact file rows with optional title editing; Pages owns layout and file titles; Details owns the about fields',async()=>{
 const {w,d}=await setup(draft());
 try{
  assert(d.querySelector('#tab-sources #file-list'));assert(d.querySelector('#tab-sources #add-files'));
  assert(d.querySelector('#tab-pages #chapter-titles'));assert(d.querySelector('#tab-pages #mode'));assert(d.querySelector('#tab-pages .output-options'));
  for(const id of ['publication-title','author','subtitle','brand-name','upload-logo']){const field=d.querySelector('#tab-details #'+id);assert(field,id+' is in Details');assert.equal(field.closest('details'),null);}
  const publication=d.querySelector('#tab-publishing');
  assert.equal(publication.querySelectorAll('details').length,1);assert.equal(publication.querySelector('details').open,false);
  const card=d.querySelector('.file-card');assert(card.querySelector('.file-title-editor').hidden);assert.equal(card.querySelector('.file-menu').open,false);
  [...card.querySelectorAll('button')].find(button=>button.textContent==='Edit Chapter Title').click();assert(!card.querySelector('.file-title-editor').hidden);
  const title=card.querySelector('input');title.value='An Opening Chapter';title.dispatchEvent(new w.Event('input'));assert.equal(card.querySelector('strong').textContent,'An Opening Chapter');
  card.querySelector('[aria-label="Done Editing Title"]').click();assert(card.querySelector('.file-title-editor').hidden);
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).files[0].title,'An Opening Chapter');
 }finally{w.close();}
});
test('previews start in the workspace theme and accept live theme changes from their parent',async()=>{
 const {w,d}=await setup(draft());let reader;
 try{
  assert.match(d.querySelector('#preview-frame').srcdoc,/<html lang="en" data-theme="light">/);
  d.documentElement.dataset.theme='dark';const footer=d.querySelector('[data-option="footer"]');footer.checked=false;footer.dispatchEvent(new w.Event('input'));await settle();
  const html=d.querySelector('.preview-incoming').srcdoc;assert.match(html,/<html lang="en" data-theme="dark">/);
  reader=new JSDOM(html,{runScripts:'outside-only'});const p=reader.window;
  p.scrollTo=()=>{};p.requestAnimationFrame=()=>{};
  p.eval([...p.document.scripts].at(-1).textContent);
  p.dispatchEvent(new p.MessageEvent('message',{source:null,data:{type:'compass-theme',theme:'light'}}));assert.equal(p.document.documentElement.dataset.theme,'dark');
  p.dispatchEvent(new p.MessageEvent('message',{source:p.parent,data:{type:'compass-theme',theme:'invalid'}}));assert.equal(p.document.documentElement.dataset.theme,'dark');
  p.dispatchEvent(new p.MessageEvent('message',{source:p.parent,data:{type:'compass-theme',theme:'light'}}));assert.equal(p.document.documentElement.dataset.theme,'light');
  p.dispatchEvent(new p.MessageEvent('message',{source:p.parent,data:{type:'compass-theme',theme:'dark'}}));assert.equal(p.document.documentElement.dataset.theme,'dark');
 }finally{reader?.window.close();w.close();}
});
test('startup projects open in preview and preserve the ordinary workspace draft',async()=>{
 const existing=draft(),initial={...draft(),name:'Explore Compass',files:[{name:'feature-guide.md',path:'demo/feature-guide.md',title:''}]};
 const {w,d,calls}=await setup(existing,initial);
 try{
  assert(d.body.classList.contains('editing'));
  assert.equal(d.querySelectorAll('.file-card').length,1);
  assert.equal(d.querySelector('#project-name').value,'Explore Compass');
  assert.equal(calls.find(c=>c.url==='/api/preview').value.files[0].path,'demo/feature-guide.md');
  const accent=d.querySelector('#hex-accent');accent.value='#ef4444';accent.dispatchEvent(new w.Event('input'));
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).name,'Guide');
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace:startup:Explore Compass')).options.accent,'#ef4444');
 }finally{w.close();}
});
test('files open straight into the preview, the sheet opens and closes, and separate pages preview',async()=>{
 const {w,d,calls}=await setup(draft());
 try{
  assert(d.body.classList.contains('editing'));assert(d.querySelector('#empty-state').hidden);assert(d.body.classList.contains('drawer-hidden'),'the page opens with the panel closed');assert.equal(d.querySelectorAll('.file-card').length,2);
  d.querySelector('[aria-label="Move two.md Up"]').click();await settle();
  assert(!d.querySelector('#preview-pane').hidden);
  assert.equal(calls.filter(c=>c.url==='/api/preview').at(-1).value.files[0].name,'two.md');
  d.querySelector('#mode').value='separate';d.querySelector('#mode').dispatchEvent(new w.Event('input'));await new Promise(r=>setTimeout(r,500));
  assert.equal(d.querySelector('#preview-page').options.length,2);
  const sources=d.querySelector('#rail [data-tab=sources]');
  sources.click();assert(!d.body.classList.contains('drawer-hidden'));assert.equal(sources.getAttribute('aria-pressed'),'true');assert.equal(d.querySelector('#tab-sources').hidden,false);
  d.querySelector('#hide-drawer').click();assert(d.body.classList.contains('drawer-hidden'));assert.equal(sources.getAttribute('aria-pressed'),'false');
 }finally{w.close();}
});
test('design and feature controls are saved and sent to the renderer',async()=>{
 const {w,d,calls}=await setup(draft());
 try{
  const accent=d.querySelector('#hex-accent');accent.value='#ef4444';accent.dispatchEvent(new w.Event('input'));
  const customize=d.querySelector('[data-option="customize"]');customize.checked=false;customize.dispatchEvent(new w.Event('input'));await settle();
  const value=calls.filter(c=>c.url==='/api/preview').at(-1).value;
  assert.equal(value.options.accent,'#ef4444');assert.equal(value.options.customize,false);
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).options.customize,false);
  d.querySelector('#reset-features').click();assert(d.querySelector('[data-option="customize"]').checked);d.querySelector('#reset-options').click();
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
  await new Promise(resolve=>setTimeout(resolve,160));assert(d.body.classList.contains('editing'),'an import starts the preview');
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

test('project undo restores file order, removals, titles and independent design changes',async()=>{
 const {w,d}=await setup(draft());const saved=()=>JSON.parse(w.localStorage.getItem('compass-project:/workspace'));
 try{
  d.querySelector('[aria-label="Move two.md Up"]').click();assert.equal(saved().files[0].name,'two.md');
  d.querySelector('[aria-label="Remove two.md"]').click();assert.equal(saved().files.length,1);
  d.querySelector('#undo-project').click();assert.equal(saved().files.length,2);assert.equal(saved().files[0].name,'two.md');
  d.querySelector('#undo-project').click();assert.equal(saved().files[0].name,'one.md');
  d.querySelector('#redo-project').click();assert.equal(saved().files[0].name,'two.md');
  const color=d.querySelector('#hex-accent');color.value='#bb2244';color.dispatchEvent(new w.Event('input'));assert.equal(d.querySelector('#redo-project').disabled,true);
  d.querySelector('#undo-project').click();assert.equal(saved().options.accent,defaults.accent);
 }finally{w.close();}
});
test('source editing updates a local snapshot and undo restores the Markdown without losing assets',async()=>{
 const initial={...draft(),files:[{name:'book/one.md',title:'',text:'# One\n\nOriginal',assets:{'x.png':'data:image/png;base64,eA=='}}]};
 const {w,d,calls}=await setup(initial);
 try{
  [...d.querySelectorAll('.file-menu-actions button')].find(button=>button.textContent==='Edit Markdown').click();await settle();
  assert(!d.querySelector('#source-editor').hidden);assert.equal(d.querySelector('#source-text').value,initial.files[0].text);
  const input=d.querySelector('#source-text');input.value='# One\n\nUpdated';input.dispatchEvent(new w.Event('input'));await new Promise(r=>setTimeout(r,160));
  assert.equal(calls.filter(call=>call.url==='/api/preview').at(-1).value.files[0].text,input.value);
  input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));assert.equal(input.value,initial.files[0].text);
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).files[0].assets['x.png'],'data:image/png;base64,eA==');
  d.querySelector('#close-source').click();assert(d.querySelector('#source-editor').hidden);
 }finally{w.close();}
});
test('importing a design changes appearance without replacing content, reader features or print settings',async()=>{
 const {createDesignPreset}=await import('../shared/options.mjs'),initial=draft();initial.options.search=false;initial.options.print_margin=25;
 const {w,d}=await setup(initial);
 try{
  const preset=createDesignPreset({...defaults,font:21,body_font:'serif'},'House Style');
  Object.defineProperty(d.querySelector('#design-input'),'files',{value:[{size:500,text:async()=>JSON.stringify(preset)}]});d.querySelector('#design-input').dispatchEvent(new w.Event('change'));await settle();
  const saved=JSON.parse(w.localStorage.getItem('compass-project:/workspace'));assert.equal(saved.options.font,21);assert.equal(saved.options.body_font,'serif');assert.equal(saved.options.search,false);assert.equal(saved.options.print_margin,25);assert.equal(saved.files.length,2);assert.equal(d.querySelector('#design-name').value,'House Style');
  d.querySelector('#undo-project').click();assert.equal(d.querySelector('#body-font').value,'system');
 }finally{w.close();}
});
test('print builds all chapters as one document and carries paper, margins and page breaks',async()=>{
 const initial=draft();initial.mode='separate';const {w,d,calls}=await setup(initial);
 try{
  const change=(id,value)=>{const input=d.querySelector('#'+id);input.value=value;input.dispatchEvent(new w.Event('input'));};
  change('print-paper','A4');change('print-margin','24');const breaks=d.querySelector('#print-chapters');breaks.checked=true;breaks.dispatchEvent(new w.Event('input'));
  d.querySelector('#print-publication').click();await settle();
  const printed=calls.filter(call=>call.url==='/api/preview').at(-1).value;assert.equal(printed.mode,'combined');assert.equal(printed.options.print_paper,'A4');assert.equal(printed.options.print_margin,24);assert.equal(printed.options.print_chapters,true);
  assert.equal(JSON.parse(w.localStorage.getItem('compass-project:/workspace')).mode,'separate');assert.match(d.querySelector('#print-frame').srcdoc,/print\(\)/);
 }finally{w.close();}
});
test('the page starts with the drawer closed and the welcome hidden, so a refresh does not flash them',async()=>{
 const before=new JSDOM(fs.readFileSync(path.join(root,'src/app/template.html'),'utf8')).window.document;
 assert(before.body.classList.contains('drawer-hidden'));assert(before.querySelector('#empty-state').hidden);
 const {w,d}=await setup();
 try{assert.equal(d.querySelector('#empty-state').hidden,false);assert(d.body.classList.contains('drawer-hidden'));}finally{w.close();}
});
test('the page stays hidden until startup finishes, so a refresh shows the loaded state first',async()=>{
 const html=fs.readFileSync(path.join(root,'src/app/template.html'),'utf8'),before=new JSDOM(html).window.document;
 assert(before.documentElement.classList.contains('booting'));
 // Opacity, not visibility: visibility cannot fade, so the page would still appear in one frame.
 const gate=html.match(/<style>([^<]*)<\/style>/)[1];assert.match(gate,/html\.booting body\{[^}]*opacity:0/);assert.doesNotMatch(gate,/visibility/);assert.match(gate,/body\{[^}]*transition:opacity/);
 for(const run of [()=>setup(draft()),()=>setup()]){
  const {w,d}=await run();
  try{assert.equal(d.documentElement.classList.contains('booting'),false);}finally{w.close();}
 }
});
// Requirement from the owner (2026-10-31): Read shows the published file's own top bar instead of the workspace rail.
test('Read shows the page as published with its own top bar, and Edit brings the rail and the open panel back',async()=>{
 const {w,d}=await setup(draft());
 try{
  const sources=d.querySelector('#rail [data-tab=sources]');
  assert.equal(d.querySelector('#rail [data-reader-command]'),null,'the rail carries no copy of the reader tools');
  const css=fs.readFileSync(path.join(root,'src/app/styles.css'),'utf8'),preview=fs.readFileSync(path.join(root,'src/app/preview.js'),'utf8');
  assert.match(css,/body\.read-mode #rail\{display:none;\}/,'Read hides the rail');
  assert.match(preview,/html:not\(\.compass-read\) \.reader-dock\{display:none!important\}/,'the preview hides the reader top bar only in Edit');
  sources.click();
  d.querySelector('#view-toggle').click();d.querySelector('#mode-read').click();await settle();assert(d.body.classList.contains('read-mode'));assert.equal(d.querySelector('#view-menu').hidden,true);assert.equal(sources.getAttribute('aria-pressed'),'false');assert.equal(d.querySelector('#drawer').inert,true,'Read takes the panel out of reach');
  assert.equal(d.activeElement,d.querySelector('#banner-edit'),'focus moves to the button that switches back');
  // Requirement from the owner: Read mode needs its own indicator, not only a different rail.
  const banner=d.querySelector('#mode-banner');assert(banner.classList.contains('read-only'),'the Read Mode banner shows only in Read');assert.match(banner.textContent,/what your readers see/);
  d.querySelector('#banner-edit').click();await settle();assert.equal(d.body.classList.contains('read-mode'),false,'the banner returns to Edit');
  // Realistic failure: ⌘E pressed inside the page only ever went back to Edit. It now switches both ways.
  const frame=d.querySelector('#preview-frame'),fromPage=()=>w.dispatchEvent(new w.MessageEvent('message',{source:frame.contentWindow,data:{type:'compass-toggle-mode'}}));
  fromPage();assert(d.body.classList.contains('read-mode'),'⌘E in the page opens Read');fromPage();assert.equal(d.body.classList.contains('read-mode'),false,'and returns to Edit');
  d.querySelector('#mode-read').click();await settle();
  d.querySelector('#banner-edit').click();await settle();assert(!d.body.classList.contains('drawer-hidden'),'Edit brings the panel back');assert.equal(sources.getAttribute('aria-pressed'),'true');
  assert.equal(d.activeElement,d.querySelector('#view-toggle'),'focus returns to the menu that holds Read');
 }finally{w.close();}
});
test('the toolbar title starts empty and shows the project title once startup finishes',async()=>{
 const before=new JSDOM(fs.readFileSync(path.join(root,'src/app/template.html'),'utf8')).window.document;
 assert.equal(before.querySelector('#dock-title').textContent,'');
 const {w,d}=await setup(draft());
 try{assert.equal(d.querySelector('#dock-title').textContent,'Guide');}finally{w.close();}
});

test('Details holds the project file actions, Save Project still saves, and Keyboard Shortcuts opens from the palette',async()=>{
 const {w,d,calls}=await setup(draft());
 try{
  assert.equal(d.querySelector('#dock-title').textContent,'Guide');assert.equal(d.querySelector('#project-mark').title,'Guide');
  assert.equal(d.querySelector('#project-menu'),null,'no project menu');
  const details=d.querySelector('#tab-details');
  for(const id of ['save-project','open-project','download-app'])assert(details.querySelector('#'+id),id+' is in Details');
  assert.equal(details.querySelector('#save-project .cx-kbd').textContent,/Mac|iPhone|iPad/.test(w.navigator.platform)?'⌘S':'Ctrl S');
  const before=calls.length;d.querySelector('#save-project').click();await settle();
  assert(calls.slice(before).some(call=>call.url==='/api/project?portable=1'),'Save Project still builds the portable project');assert.equal(d.querySelector('#status').textContent,'Project Saved');
  const shortcuts=d.querySelector('#show-shortcuts');assert(shortcuts.closest('.palette-foot'),'Keyboard Shortcuts sits in the palette footer');assert.equal(shortcuts.querySelector('.cx-kbd').textContent,'?');
  assert.equal(d.querySelector('#palette-mode'),null,'the footer drops its mode label');
  d.querySelector('#command-toggle').click();assert.equal(d.querySelector('#palette').hidden,false);
  shortcuts.click();await settle();assert.equal(d.querySelector('#shortcuts').open,true);assert.equal(d.querySelector('#palette').hidden,true,'the dialog replaces the palette');
 }finally{w.close();}
});
test('the View menu sets the preview width and the zoom and shows both on its trigger',async()=>{
 const {w,d}=await setup(draft());
 try{
  const trigger=d.querySelector('#view-toggle'),menu=d.querySelector('#view-menu'),canvas=d.querySelector('#preview-canvas');
  assert.equal(d.querySelector('[role=radiogroup][aria-label="Preview Width"]'),null,'no device button row');assert.equal(d.querySelector('#zoom-menu'),null,'no separate zoom menu');
  assert.equal(trigger.getAttribute('aria-haspopup'),'menu');assert.equal(d.querySelector('#zoom-label').textContent,'100%');assert.equal(trigger.dataset.width,'full');
  assert.deepEqual([...menu.querySelectorAll('[data-viewport]')].map(item=>item.dataset.viewport),['full','820','390']);assert.deepEqual([...menu.querySelectorAll('[data-zoom]')].map(item=>item.dataset.zoom),['0.5','0.75','1','1.25']);
  assert.deepEqual([...menu.querySelectorAll('[data-theme-choice]')].map(item=>item.dataset.themeChoice),['system','light','dark'],'Appearance lives in the same menu');
  assert(menu.contains(d.querySelector('#mode-read')),'and so does Read as a Visitor');
  trigger.click();assert(menu.classList.contains('rail-menu'),'a rail menu slides out from the rail');trigger.click();
  assert.equal(menu.querySelectorAll('[role=menuitemradio]').length,10);assert.equal(menu.querySelectorAll('.cx-menu-label').length,3);
  trigger.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(menu.hidden,false);assert.equal(d.activeElement.dataset.viewport,'full','focus starts on the checked width');
  menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(d.activeElement.dataset.viewport,'820');
  d.activeElement.click();await settle();
  assert.equal(menu.hidden,true);assert.equal(trigger.dataset.width,'820','the trigger icon follows the width');assert.equal(d.body.classList.contains('preview-framed'),true);assert.match(canvas.style.getPropertyValue('--preview-width'),/820px/);
  assert.deepEqual([...menu.querySelectorAll('[data-viewport]')].map(item=>item.getAttribute('aria-checked')),['false','true','false']);
  trigger.click();menu.querySelector('[data-zoom="0.75"]').click();await settle();
  assert.equal(d.querySelector('#zoom-label').textContent,'75%');assert.equal(canvas.style.getPropertyValue('--preview-zoom'),'0.75');assert.deepEqual([...menu.querySelectorAll('[data-zoom]')].map(item=>item.getAttribute('aria-checked')),['false','true','false','false']);
  trigger.click();menu.querySelector('[data-viewport="390"]').click();await settle();assert.equal(trigger.dataset.width,'390');
  trigger.click();menu.querySelector('[data-viewport="full"]').click();await settle();assert.equal(trigger.dataset.width,'full');assert.equal(d.body.classList.contains('preview-framed'),false);
 }finally{w.close();}
});
test('the rail lists the sections in working order, then the tools, then Publish',async()=>{
 const {w,d}=await setup(draft());
 try{
  const rail=d.querySelector('#rail'),sections=[...rail.querySelectorAll('[data-tab]')];
  assert.equal(d.querySelector('#dock'),null,'no top bar');
  assert.deepEqual(sections.map(button=>button.dataset.tab),['sources','pages','appearance','features','details','publishing']);
  assert.deepEqual(sections.map(button=>button.textContent.trim()||button.getAttribute('aria-label')),['Sources','Pages','Style','Reader','Details','Publish'],'every section button carries its name');
  assert.equal(rail.firstElementChild.id,'project-mark','the Compass mark comes first');assert.equal(rail.firstElementChild.tagName,'SPAN','and it is not a menu');assert.equal(rail.lastElementChild,d.querySelector('#publish-toggle'),'Publish comes last');
  assert.deepEqual([...rail.querySelectorAll('.rail-tools button:not([role])')].map(button=>button.id),['command-toggle','undo-project','redo-project','view-toggle'],'one column of tools');
  for(const id of ['command-toggle','view-toggle','undo-project','redo-project','publish-toggle'])assert(d.querySelector('#'+id).getAttribute('aria-label'),id+' has a name');
  assert.equal(d.querySelector('#publish-toggle').textContent.trim(),'','Publish is an icon button');
 }finally{w.close();}
});
const stored=w=>JSON.parse(w.localStorage.getItem('compass-panel')||'null');
test('a rail button opens its section in one click and closes the panel on a second',async()=>{
 const {w,d}=await setup(draft());
 try{
  const tabs=[...d.querySelectorAll('#rail [data-tab]')],style=tabs[2],reader=tabs[3];
  assert(d.body.classList.contains('drawer-hidden'));
  style.focus();style.click();await settle();
  assert.equal(d.querySelector('#tab-appearance').hidden,false);assert.equal(d.querySelector('#tab-sources').hidden,true);
  assert.equal(d.querySelector('#sheet-title').textContent,'Style');assert.equal(d.querySelector('#sheet-desc').textContent,'Colors, type, and layout of the publication.');
  assert.deepEqual(tabs.map(button=>button.getAttribute('aria-pressed')),['false','false','true','false','false','false']);
  assert.equal(d.activeElement,style,'focus stays on the section button');
  reader.click();await settle();assert.equal(d.querySelector('#tab-features').hidden,false);assert.equal(d.querySelector('#sheet-title').textContent,'Reader');
  reader.click();assert(d.body.classList.contains('drawer-hidden'),'the open section button closes the panel');assert.equal(reader.getAttribute('aria-pressed'),'false');
  assert.deepEqual([...d.querySelectorAll('.tab-panel')].map(panel=>panel.id),['tab-sources','tab-pages','tab-appearance','tab-features','tab-details','tab-publishing']);
 }finally{w.close();}
});
test('version 1 panel preferences keep only the open state, and the panel floats by default',async()=>{
 const old=await setup(draft(),undefined,{prefs:{version:1,open:true,side:'right',floating:false}});
 try{
  assert.equal(old.d.body.classList.contains('panel-docked'),false,'the old docked default does not carry over');assert(old.d.body.classList.contains('drawer-hidden'),'a floating panel does not open at startup');
  old.d.querySelector('#pin-sheet').click();assert.deepEqual(stored(old.w),{version:2,open:true,docked:true});
 }finally{old.w.close();}
});
test('pinning docks the panel beside the page, and the choice persists',async()=>{
 const {w,d}=await setup(draft());
 try{
  const pin=d.querySelector('#pin-sheet');
  assert.equal(pin.getAttribute('aria-pressed'),'false');assert.equal(pin.getAttribute('aria-label'),'Keep Open Beside the Page');assert.equal(d.body.classList.contains('panel-docked'),false);
  pin.click();
  assert(d.body.classList.contains('panel-docked'));assert.equal(pin.getAttribute('aria-pressed'),'true');assert.equal(pin.getAttribute('aria-label'),'Float Over the Page');assert.equal(stored(w).docked,true);
  pin.click();assert.equal(d.body.classList.contains('panel-docked'),false);assert.equal(stored(w).docked,false);
 }finally{w.close();}
 const second=await setup(draft(),undefined,{prefs:{version:2,open:true,docked:true}});
 try{assert(second.d.body.classList.contains('panel-docked'));assert.equal(second.d.querySelector('#pin-sheet').getAttribute('aria-pressed'),'true');assert(!second.d.body.classList.contains('drawer-hidden'),'a docked panel reopens');}finally{second.w.close();}
});
test('a docked panel opens during startup with a document, before the boot gate lifts, unless the owner closed it',async()=>{
 let html;const records=[];
 const first=await setup(draft(),undefined,{prefs:{version:2,docked:true},before:w=>{html=w.document.documentElement;new w.MutationObserver(list=>records.push(...list)).observe(html,{attributes:true,attributeFilter:['class'],subtree:true,attributeOldValue:true});}});
 try{
  const body=first.d.body;
  const next=(list,index,target)=>{const later=list.slice(index+1).find(record=>record.target===target);return later?later.oldValue:target.getAttribute('class');};
  const opened=records.findIndex((record,index)=>record.target===body&&record.oldValue.includes('drawer-hidden')&&!next(records,index,body).includes('drawer-hidden'));
  const lifted=records.findIndex((record,index)=>record.target===html&&record.oldValue.includes('booting')&&!next(records,index,html).includes('booting'));
  assert(opened>=0,'the panel opened during startup');assert(lifted>=0);assert(opened<lifted,'the panel opens before the boot gate lifts');
  assert.equal(first.d.querySelector('#rail [data-tab=sources]').getAttribute('aria-pressed'),'true');assert.deepEqual(stored(first.w),{version:2,docked:true},'opening at startup is not a choice to remember');
 }finally{first.w.close();}
 const closed=await setup(draft(),undefined,{prefs:{version:2,open:false,docked:true}});
 try{assert(closed.d.body.classList.contains('drawer-hidden'),'a stored closed state wins');}finally{closed.w.close();}
 const floating=await setup(draft());
 try{assert(floating.d.body.classList.contains('drawer-hidden'),'a floating panel waits to be opened');}finally{floating.w.close();}
 const empty=await setup(undefined,undefined,{prefs:{version:2,docked:true}});
 try{assert(empty.d.body.classList.contains('drawer-hidden'),'no document keeps the panel closed');}finally{empty.w.close();}
});
test('closing the panel is remembered, Read hides it without forgetting, and Escape or the page closes only a floating panel',async()=>{
 const {w,d}=await setup(draft(),undefined,{prefs:{version:2,docked:true}});
 const escape=()=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 const sources=d.querySelector('#rail [data-tab=sources]');
 try{
  escape();assert.equal(d.body.classList.contains('drawer-hidden'),false,'a docked panel ignores Escape');
  d.querySelector('#workspace').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));assert.equal(d.body.classList.contains('drawer-hidden'),false,'and a click on the page');
  d.querySelector('#mode-read').click();assert.deepEqual(stored(w),{version:2,docked:true},'Read does not write the open state');
  d.querySelector('#banner-edit').click();assert.equal(d.body.classList.contains('drawer-hidden'),false);
  d.querySelector('#pin-sheet').click();escape();assert(d.body.classList.contains('drawer-hidden'),'a floating panel closes on Escape');assert.equal(stored(w).open,false);
  sources.click();assert.equal(stored(w).open,true);
  d.querySelector('#workspace').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));assert(d.body.classList.contains('drawer-hidden'),'a click on the page closes a floating panel');
  sources.click();d.querySelector('#drawer .sheet-head').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));assert(!d.body.classList.contains('drawer-hidden'),'a click inside keeps it open');
  d.querySelector('.rail-spacer').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));assert(d.body.classList.contains('drawer-hidden'),'so does a click on empty rail space');
  // Requirement from the owner: any dialog closes on a click outside it, which lands on the dialog's backdrop.
  d.querySelector('#show-shortcuts').click();const shortcuts=d.querySelector('#shortcuts');assert(shortcuts.open);
  shortcuts.querySelector('dl').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert(shortcuts.open,'a click on the content keeps it open');
  shortcuts.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(shortcuts.open,false,'a click on the backdrop closes it');
 }finally{w.close();}
});
// Realistic failure: the hover rule outranked the selected rule, so a clicked rail button stayed gray until the pointer left.
test('a selected rail button shows its selected colour while still hovered, with no accent bar',()=>{
 const css=fs.readFileSync(path.join(root,'src/app/styles.css'),'utf8');
 const hovers=css.match(/\.rail-item:hover[^{]*\{/g)||[];assert(hovers.length>0);
 for(const rule of hovers)assert.match(rule,/:not\(\[aria-pressed="true"\]\)/,'hover never restyles the selected item');
 assert.doesNotMatch(css,/\.rail-item\[aria-pressed="true"\]::before/,'no accent bar beside the selected item');
});
// Requirement from the owner (2026-10-31): Randomize produced near-identical sets and repeats within about 100 presses.
// Every set must stay readable, no two sets within twelve presses may look alike, and backgrounds must really vary.
test('Randomize gives readable, clearly different colour sets without near repeats',async()=>{
 const {w,d}=await setup(draft());
 try{
  const lum=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  // OKLab distance follows perceived difference; about 0.02 is one just-noticeable step.
  const lab=hex=>{const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];};
  const gap=(a,b)=>{const x=lab(a),y=lab(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);};
  const sets=[];
  for(let i=0;i<100;i++){d.querySelector('#randomize-colors').click();sets.push({...JSON.parse(w.localStorage.getItem('compass-project:/workspace')).options});}
  for(const set of sets){
   assert(ratio(set.accent,set.background)>=4.5,'light accent is readable');assert(ratio(set.dark_accent,set.dark_background)>=4.5,'dark accent is readable');
   assert(ratio(set.text,set.background)>=4.5,'light text is readable');assert(ratio(set.dark_text,set.dark_background)>=4.5,'dark text is readable');
  }
  for(let i=0;i<sets.length;i++)for(let j=i+1;j<Math.min(sets.length,i+12);j++){
   const a=sets[i],b=sets[j];
   const alike=gap(a.accent,b.accent)<.08&&gap(a.background,b.background)<.04&&gap(a.dark_background,b.dark_background)<.03;
   assert(!alike,'sets '+i+' and '+j+' look alike: '+a.accent+' '+a.background+' / '+b.accent+' '+b.background);
  }
  const spread=values=>Math.max(...values)-Math.min(...values);
  assert(spread(sets.map(set=>lum(set.background)))>.1,'light backgrounds vary');assert(spread(sets.map(set=>lum(set.dark_background)))>.02,'dark backgrounds vary');
 }finally{w.close();}
});
test('switch rows change only the switch',()=>{
 const css=fs.readFileSync(path.join(root,'src/app/styles.css'),'utf8');
 assert.doesNotMatch(css,/is-h1\s*[{.,]/,'the Page Breaks row keeps its look when its switch turns on');
 assert.doesNotMatch(css,/:has\([^)]*:checked/);
});
