const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'../..');
async function app({demo=false,url='file:///downloads/compass.html',directory}={}) {
  const errors=[],network=[],downloads=[];
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(fs.readFileSync(path.join(root,'dist',demo?'index.html':'compass.html'),'utf8'),{url,runScripts:'dangerously',virtualConsole:console,beforeParse(w){
    w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
    w.fetch=async(...args)=>{network.push(args);throw Error('No server available');};
    w.setInterval=()=>0;w.HTMLElement.prototype.scrollIntoView=function(){};
    // jsdom does not execute srcdoc; simulate the replacement's ready handshake.
    new w.MutationObserver(()=>{
      const frame=w.document.querySelector('.preview-incoming');
      if(frame)w.dispatchEvent(new w.MessageEvent('message',{source:frame.contentWindow,data:{type:'compass-ready',y:0}}));
    }).observe(w.document,{childList:true,subtree:true});
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
    w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:test';};w.URL.revokeObjectURL=()=>{};
    w.HTMLAnchorElement.prototype.click=function(){};
    if(directory)w.showDirectoryPicker=async options=>{assert.equal(options.mode,'read');return directory;};
  }});
  // Rendering and source materialization are async; wait for initialized controls.
  for(let i=0;i<100&&!dom.window.document.querySelector('[data-option=customize]');i++)await new Promise(r=>setTimeout(r,10));
  if(demo)for(let i=0;i<100&&!dom.window.document.querySelector('#preview-frame').srcdoc;i++)await new Promise(r=>setTimeout(r,10));
  return {dom,w:dom.window,d:dom.window.document,errors,network,downloads};
}
const readBlob=(w,blob)=>new Promise((resolve,reject)=>{const r=new w.FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsText(blob);});
test('downloadable single HTML initializes offline without HTTP or browser storage',async()=>{
  const {w,d,errors,network}=await app();
  try{
    assert(w.CompassRenderer);assert.equal(d.querySelectorAll('.file-card').length,0);
    assert.equal(d.querySelectorAll('script[src],link[rel=stylesheet]').length,0);
    const notices=d.querySelector('#third-party-notices').content.textContent;
    assert.equal(notices,fs.readFileSync(path.join(root,'dist/THIRD_PARTY_NOTICES.txt'),'utf8'));
    for(const name of ['markdown-it','highlight.js','fflate','yaml','linkify-it','uc.micro','lucide'])assert(notices.includes(name+' '),name+' license notice missing');
    assert.match(notices,/Permission is hereby granted/);
    assert(!notices.includes('undefined'));
    assert.equal(d.querySelector('#download-app').hidden,true);
    const backend=w.CompassBrowser,project={files:[{name:'offline.md',text:'# Offline\n\n## Ready\n\nWorks without a server.'}]};
    const response=await backend.request('/api/preview',project),result=await response.json();
    assert(result.pages[0].html.includes('Works without a server.'));
    const exported=await backend.request('/api/export',project),html=await readBlob(w,await exported.blob());
    assert(html.includes('Works without a server.'));assert.match(exported.headers.get('Content-Disposition'),/offline.html/);
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  }finally{w.close();}
});
test('demo works under a GitHub Pages subpath and shares the downloadable renderer',async()=>{
  const {w,d,errors,network,downloads}=await app({demo:true,url:'https://example.github.io/compass/'});
  try{
    assert(d.body.classList.contains('editing'));assert.equal(d.querySelectorAll('.file-card').length,1);
    assert.equal(d.querySelector('#download-app').hidden,false);
    assert.match(d.querySelector('#preview-frame').srcdoc,/Explore Compass/);
    // Model srcdoc's inherited parent base URL: fragment links must stay in
    // the preview instead of resolving to the workspace and nesting the app.
    const preview=new JSDOM(d.querySelector('#preview-frame').srcdoc,{url:'https://example.github.io/compass/'});
    assert.equal(preview.window.document.querySelector('base').href,'about:srcdoc');
    assert.equal(preview.window.document.querySelector('.doc-footer a').href,'about:srcdoc#top');
    preview.window.close();
    d.querySelector('#load-combined-example').click();
    for(let i=0;i<100&&d.querySelectorAll('.file-card').length!==2;i++)await new Promise(r=>setTimeout(r,10));
    assert.equal(d.querySelectorAll('.file-card').length,2);
    const saved=await (await w.CompassBrowser.request('/api/project?portable=1',w.CompassBrowser.examples.combined)).json();
    assert(saved.files.every(f=>typeof f.text==='string'&&!f.path));
    d.querySelector('#save-project').click();
    for(let i=0;i<100&&!downloads.length;i++)await new Promise(r=>setTimeout(r,10));
    assert.equal(JSON.parse(await readBlob(w,downloads[0])).files.length,2);
    const result=await (await w.CompassBrowser.request('/api/preview',{...saved,mode:'separate'})).json();
    assert.equal(result.pages.length,2);assert.deepEqual(Array.from(result.warnings),[]);
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  }finally{w.close();}
});
test('linked browser folders reread changed sources, resolve per-folder images and save portable copies',async()=>{
  const source={first:'# First\n\n![X](asset.png)\n\n[Next](../second/doc.md#shared)',second:'# Second\n\n## Shared'};
  const file=(name,get)=>({kind:'file',getFile:async()=>{const text=get();return {name,size:Buffer.byteLength(text),text:async()=>text,arrayBuffer:async()=>Uint8Array.from(Buffer.from(text)).buffer};}});
  const folder=(name,entries)=>({kind:'directory',name,entries:async function*(){yield*Object.entries(entries);},getDirectoryHandle:async name=>entries[name],getFileHandle:async name=>{if(!entries[name])throw Object.assign(Error('Not found'),{name:'NotFoundError'});return entries[name];}});
  const directory=folder('Book',{first:folder('first',{'doc.md':file('doc.md',()=>source.first),'asset.png':file('asset.png',()=> 'first')}),second:folder('second',{'doc.md':file('doc.md',()=>source.second),'asset.png':file('asset.png',()=> 'second')})});
  const {w,errors,network}=await app({directory});
  try{
    const backend=w.CompassBrowser;await backend.connectWorkspace();
    assert.equal((await backend.list()).entries.length,2);
    assert.equal((await backend.list('first')).entries[0].name,'doc.md');
    const project={files:[{path:'first/doc.md'},{path:'second/doc.md'}]};
    let result=await (await backend.request('/api/preview',project)).json();
    assert.deepEqual(Array.from(result.warnings),[]);assert(result.pages[0].html.includes('data:image/png;base64,Zmlyc3Q='));
    source.first='# Changed\n\n![X](asset.png)';
    result=await (await backend.request('/api/preview',project)).json();assert(result.pages[0].html.includes('Changed'));
    const saved=await (await backend.request('/api/project?portable=1',project)).json();
    assert.equal(saved.files[0].name,'first/doc.md');assert.equal(saved.files[0].path,undefined);assert(saved.files[0].text.includes('Changed'));
    assert(saved.files[0].assets['asset.png']);
    assert.equal(project.files[0].text,undefined);
    await assert.rejects(backend.request('/api/preview',{files:[{path:'missing.md'}]}),/Reconnect the source folder/);
    await assert.rejects(backend.list('../outside'),/inside the workspace/);
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  }finally{w.close();}
});
test('folder import embeds images and reimport refreshes the existing document',async()=>{
  const {w,d,errors,network}=await app();
  try{
    let text='# Imported\n\n![X](asset.png)';
    const md={name:'doc.md',webkitRelativePath:'book/doc.md',size:40,text:async()=>text};
    const image=new w.File(['image'],'asset.png',{type:'image/png'});Object.defineProperty(image,'webkitRelativePath',{value:'book/asset.png'});
    Object.defineProperty(d.querySelector('#folder-input'),'files',{value:[md,image]});
    d.querySelector('#folder-input').dispatchEvent(new w.Event('change'));
    for(let i=0;i<100&&!d.querySelector('.file-card');i++)await new Promise(r=>setTimeout(r,10));
    d.querySelector('#start-preview').click();
    for(let i=0;i<100&&!d.querySelector('#preview-frame').srcdoc;i++)await new Promise(r=>setTimeout(r,10));
    assert.match(d.querySelector('#preview-frame').srcdoc,/data:image\/png;base64,aW1hZ2U=/);
    text='# Updated';d.querySelector('#folder-input').dispatchEvent(new w.Event('change'));
    const title=()=>new w.DOMParser().parseFromString(d.querySelector('#preview-frame').srcdoc,'text/html').querySelector('.hero h1')?.textContent;
    for(let i=0;i<100&&title()!=='Updated';i++)await new Promise(r=>setTimeout(r,10));
    assert.equal(d.querySelectorAll('.file-card').length,1);assert.equal(title(),'Updated');
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  }finally{w.close();}
});

test('editing a linked chapter creates an undoable local copy and leaves its original untouched',async()=>{
 const original='# Linked\n\nOriginal paragraph.',handle={kind:'file',getFile:async()=>({name:'linked.md',size:original.length,text:async()=>original})};
 const directory={name:'Sources',kind:'directory',entries:async function*(){yield ['linked.md',handle];},getFileHandle:async()=>handle};
 const {w,d,errors,network}=await app({directory,url:'https://compass.test/compass.html'});
 const wait=async predicate=>{for(let i=0;i<100&&!predicate();i++)await new Promise(r=>setTimeout(r,10));assert(predicate());};
 try{
  d.querySelector('#browse').click();await wait(()=>d.querySelector('#browser-entries input'));
  const input=d.querySelector('#browser-entries input');input.checked=true;input.dispatchEvent(new w.Event('change'));d.querySelector('#add-selected').click();
  [...d.querySelectorAll('.file-menu-actions button')].find(button=>button.textContent==='Edit Markdown').click();await wait(()=>!d.querySelector('#source-editor').hidden);
  const source=d.querySelector('#source-text');assert.equal(source.value,original);source.value='# Linked\n\nEdited in Compass';source.dispatchEvent(new w.Event('input'));
  const draft=()=>JSON.parse(w.localStorage.getItem('compass-project:Browser files'));assert.equal(draft().files[0].path,undefined);assert.match(draft().files[0].text,/Edited in Compass/);assert.equal(await (await handle.getFile()).text(),original);
  d.querySelector('#undo-project').click();assert.equal(draft().files[0].path,'linked.md');assert.equal(draft().files[0].text,undefined);assert.equal(source.value,original);
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 }finally{w.close();}
});
test('publication checks stay visible and export includes custom branding and print settings',async()=>{
 const {w,d,downloads,errors}=await app({url:'https://compass.test/compass.html'});
 const wait=async predicate=>{for(let i=0;i<100&&!predicate();i++)await new Promise(r=>setTimeout(r,10));assert(predicate());};
 try{
  const value={name:'Check Book',branding:{name:'House Brand',footer:'Team reference'},options:{print_paper:'A4',print_margin:24,body_font:'serif'},files:[{name:'chapter.md',text:'# Chapter\n\n## Intro\n\n[Bad](#absent)\n\n![](missing.png)'}]};
  Object.defineProperty(d.querySelector('#project-input'),'files',{value:[{text:async()=>JSON.stringify(value)}]});d.querySelector('#project-input').dispatchEvent(new w.Event('change'));await wait(()=>d.querySelector('.file-card'));
  d.querySelector('#check-publication').click();await wait(()=>d.querySelectorAll('.check-result').length===3);
  assert.match(d.querySelector('#check-results').textContent,/Section link does not exist/);assert.match(d.querySelector('#check-results').textContent,/alternative text/);
  d.querySelector('#export').click();await wait(()=>downloads.length===1);
  const html=await readBlob(w,downloads[0]);assert.match(html,/House Brand/);assert.match(html,/Team reference/);assert.match(html,/size:A4;margin:24mm/);assert.match(html,/Georgia/);
  assert.equal(d.querySelectorAll('.check-result').length,3);assert.deepEqual(errors,[]);
 }finally{w.close();}
});
