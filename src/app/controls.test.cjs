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
 const options=await import('../shared/options.mjs'),{createHistory}=await import('./history.mjs');w.CompassProject={...options,createHistory};
 const design=await import('../shared/design.mjs');w.CompassDesign={pairedAccent:design.pairedAccent};w.CompassIcons=(await import('../shared/icons.mjs')).icon;w.CompassBrandMark=fs.readFileSync(path.join(root,'src/shared/favicon.svg'),'utf8');
 if(draft)w.localStorage.setItem('compass-project:/workspace',JSON.stringify(draft));
 w.CompassBrowser={root:'/workspace',connectWorkspace:async()=>true,request:async(url,value)=>{
  calls.push({url,value});let data;
  if(url==='/api/session')data={root:'/workspace',defaults,project:initialProject};
  else if(url.startsWith('/api/project'))data=value;
  else if(url.startsWith('/api/files'))data={path:'.',parent:null,entries:[{name:'one.md',path:'one.md',directory:false},{name:'two.md',path:'two.md',directory:false}]};
  else if(url==='/api/preview')data={pages:(value.mode==='separate'?value.files:[value.files[0]]).map((f,i)=>({title:f.title||f.name,name:i+'.html',html:'<html lang="en"><head></head><body><h1>'+f.name+'</h1></body></html>'})),warnings:[]};
  return {ok:true,json:async()=>data,headers:{get:()=> 'attachment; filename="guide.html"'},blob:async()=>new w.Blob(['export'])};
 }};
 w.matchMedia=()=>({matches:false});w.eval(fs.readFileSync(path.join(root,'src/shared/motion.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(root,'src/shared/color-picker.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'src/app/menus.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(root,'src/app/controls.js'),'utf8'));await settle();
 return {dom,w,d,calls};
}
const draft=()=>({version:1,name:'Guide',title:'',subtitle:'',author:'',mode:'combined',safe:true,chapter_titles:true,options:{...defaults},files:[{name:'one.md',path:'one.md',title:''},{name:'two.md',path:'two.md',title:''}]});
test('custom menus support keyboard navigation, Escape, selected appearance, and a clear publishing route',async()=>{
 const {w,d}=await setup(draft());
 try{
  const trigger=d.querySelector('#workspace-theme'),menu=d.querySelector('#theme-menu');
  assert.equal(trigger.tagName,'BUTTON');assert.equal(d.querySelector('.workspace-brand').tagName,'DIV');
  trigger.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(menu.hidden,false);
  const first=d.activeElement;menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.notEqual(d.activeElement,first);
  menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.hidden,true);assert.equal(d.activeElement,trigger);
  d.querySelector('#file-menu-toggle').click();assert.equal(d.querySelector('#project-menu').hidden,false);
  d.querySelector('#go-publish').click();await settle();assert.equal(d.querySelector('#tab-publishing').hidden,false);assert.equal(d.querySelector('#project-menu').hidden,true);assert.equal(d.querySelector('#export').hidden,false);assert.equal(d.activeElement,d.querySelector('[name=output-mode]:checked'));
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
test('settings are grouped and initially collapsed, with examples visible and the current theme selected',async()=>{
 const {w,d}=await setup(draft());
 try{
  assert([...d.querySelectorAll('.settings-section')].every(section=>!section.open));
  assert(!d.querySelector('.browser-examples').hidden);assert(!d.querySelector('.examples-section details'));
  assert.equal(d.querySelector('#load-example strong').textContent,'Explore Compass');
  assert.equal(d.querySelector('#load-combined-example strong').textContent,'Publishing Guide');
  assert.equal(d.querySelector('[data-preset]'),null);assert.equal(d.querySelector('.theme-sample'),null);
  for(const key of ['outline_depth','table_rows','reading_speed'])assert(d.querySelector('#value-'+key).closest('#feature-tuning'));
  d.documentElement.dataset.theme='dark';d.querySelector('[data-tab=appearance]').click();
  assert.equal(d.querySelector('[data-edit-theme=dark]').getAttribute('aria-pressed'),'true');
  d.documentElement.dataset.theme='light';d.querySelector('#theme-colors-section summary').click();await settle();
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
  d.querySelector('[data-tab=files]').click();assert.equal(d.querySelectorAll('.compass-color-picker:not([hidden])').length,0);
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
test('Files uses compact rows with optional title editing and publishing owns format and chapter titles',async()=>{
 const {w,d}=await setup(draft());
 try{
  assert(d.querySelector('#tab-publishing #chapter-titles'));assert(d.querySelector('#tab-publishing #mode'));
  const publication=d.querySelector('#tab-publishing'),output=publication.querySelector('.output-options');
  for(const id of ['publication-title','author','subtitle']){const field=publication.querySelector('#'+id);assert.equal(field.closest('details'),null);assert(field.compareDocumentPosition(output)&w.Node.DOCUMENT_POSITION_FOLLOWING);}
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
  d.documentElement.dataset.theme='dark';d.querySelector('#start-preview').click();await settle();
  const html=d.querySelector('#preview-frame').srcdoc;assert.match(html,/<html lang="en" data-theme="dark">/);
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
test('design and feature controls are saved and sent to the renderer',async()=>{
 const {w,d,calls}=await setup(draft());
 try{
  const accent=d.querySelector('#hex-accent');accent.value='#ef4444';accent.dispatchEvent(new w.Event('input'));
  const customize=d.querySelector('[data-option="customize"]');customize.checked=false;customize.dispatchEvent(new w.Event('input'));
  d.querySelector('#start-preview').click();await settle();
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
