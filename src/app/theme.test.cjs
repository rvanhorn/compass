const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(path.join(__dirname,'theme.js'),'utf8');
async function setup({saved,dark=false,storage=true,matchMedia=true}={}){
 const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'template.html'),'utf8'),{url:storage?'https://compass.test/':'file:///downloads/compass.html',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const media=new w.EventTarget();media.matches=dark;
 if(matchMedia)w.matchMedia=query=>{assert.equal(query,'(prefers-color-scheme: dark)');return media;};
 if(saved!==undefined)w.localStorage.setItem('compass-theme',saved);
 w.eval(script);
 assert.equal(d.documentElement.dataset.theme,saved==='light'||saved==='dark'?saved:dark&&matchMedia?'dark':'light','theme applies immediately');
 await new Promise(resolve=>w.setTimeout(resolve,0));
 const choose=value=>{d.querySelector('[data-theme-choice='+value+']').click();};
 const system=value=>{media.matches=value;media.dispatchEvent(new w.Event('change'));};
 return {w,d,choose,system};
}
test('System follows device appearance changes until an explicit theme is chosen',async()=>{
 const {w,d,choose,system}=await setup({dark:true});
 try{
  assert.equal(d.querySelector('[data-theme-choice][aria-checked=true]').dataset.themeChoice,'system');
  system(false);assert.equal(d.documentElement.dataset.theme,'light');
  choose('dark');system(true);system(false);assert.equal(d.documentElement.dataset.theme,'dark');
  choose('light');system(true);assert.equal(d.documentElement.dataset.theme,'light');
  choose('system');assert.equal(d.documentElement.dataset.theme,'dark');
 }finally{w.close();}
});
test('explicit choices restore on startup and persist independently of publication drafts',async()=>{
 for(const saved of ['light','dark']){
  const {w,d,choose}=await setup({saved,dark:saved==='light'});
  try{
   assert.equal(d.querySelector('[data-theme-choice][aria-checked=true]').dataset.themeChoice,saved);
   w.localStorage.setItem('compass-project:/workspace','{"options":{"accent":"#2563eb"}}');
   choose(saved==='light'?'dark':'light');
   assert.equal(w.localStorage.getItem('compass-theme'),d.querySelector('[data-theme-choice][aria-checked=true]').dataset.themeChoice);
   assert.equal(w.localStorage.getItem('compass-project:/workspace'),'{"options":{"accent":"#2563eb"}}');
   choose('system');assert.equal(w.localStorage.getItem('compass-theme'),'system');
  }finally{w.close();}
 }
});
test('invalid stored themes fall back to System and storage changes sync across windows',async()=>{
 const {w,d,system}=await setup({saved:'invalid',dark:true});
 try{
  assert.equal(d.querySelector('[data-theme-choice][aria-checked=true]').dataset.themeChoice,'system');
  w.dispatchEvent(new w.StorageEvent('storage',{key:'compass-theme',newValue:'light'}));
  assert.equal(d.documentElement.dataset.theme,'light');assert.equal(d.querySelector('[data-theme-choice][aria-checked=true]').dataset.themeChoice,'light');
  w.dispatchEvent(new w.StorageEvent('storage',{key:'unrelated',newValue:'dark'}));assert.equal(d.documentElement.dataset.theme,'light');
  w.dispatchEvent(new w.StorageEvent('storage',{key:null}));assert.equal(d.querySelector('[data-theme-choice][aria-checked=true]').dataset.themeChoice,'system');
  system(false);assert.equal(d.documentElement.dataset.theme,'light');
 }finally{w.close();}
});
test('offline files still switch themes when browser storage is unavailable',async()=>{
 const {w,d,choose,system}=await setup({storage:false,dark:true});
 try{
  choose('light');assert.equal(d.documentElement.dataset.theme,'light');
  choose('system');system(false);system(true);assert.equal(d.documentElement.dataset.theme,'dark');
 }finally{w.close();}
});
test('browsers without matchMedia default to light and support manual dark mode',async()=>{
 const {w,d,choose}=await setup({matchMedia:false});
 try{choose('dark');assert.equal(d.documentElement.dataset.theme,'dark');choose('system');assert.equal(d.documentElement.dataset.theme,'light');}finally{w.close();}
});
test('theme changes reach visible and pending previews, including frames that become ready later',async()=>{
 const {w,d,choose,system}=await setup();
 try{
  const current=d.querySelector('#preview-frame'),pending=current.cloneNode(false);pending.removeAttribute('id');pending.className='publication-frame preview-incoming';current.after(pending);
  const messages=[];
  for(const frame of [current,pending])frame.contentWindow.postMessage=message=>messages.push({frame,theme:message.theme});
  choose('dark');assert.equal(messages.length,2);assert(messages.every(message=>message.theme==='dark'));
  messages.length=0;choose('system');system(true);assert.equal(messages.at(-1).theme,'dark');
  messages.length=0;w.dispatchEvent(new w.MessageEvent('message',{source:pending.contentWindow,data:{type:'compass-ready'}}));
  assert.equal(messages.length,1);assert.equal(messages[0].frame,pending);assert.equal(messages[0].theme,'dark');
 }finally{w.close();}
});
