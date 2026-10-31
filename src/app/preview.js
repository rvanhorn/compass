import {$,$$,element,status,api,saveDraft,project,history,editing,reading,activePage,pages,previewScroll,setEditing,setActivePage,setPages,setPreviewScroll,setSearchIndex,bumpCheckRevision} from './state.js';
import {syncEmpty,syncOutput,renderBreaks,promoteHeading} from './pages.js';
import {renderChecks} from './publish.js';
import {sheetOpen} from './sheets.js';
import {setMode,syncHistory} from './mode.js';
import {showFileDrop} from './files.js';

let timer,request=0,controller=null,inFlight=false,lastHTML='',pendingFrame=null,themeOverride=null;
export function changed({immediate=false,target='',record=true}={}){
 if(record&&history){const active=document.activeElement;history.record(project,{group:active?.matches('input:not([type=checkbox]):not([type=radio]),textarea')?active:null});}
 syncHistory();bumpCheckRevision();$('#check-summary').textContent='Changes made. Run a check to review this version.';$('#check-results').classList.add('checks-stale');
 saveDraft();clearTimeout(timer);
 if(editing||project.files.length){if(immediate)preview(false,target);else timer=setTimeout(()=>preview(false,target),120);}
}
export async function preview(quiet=false,target=''){
 clearTimeout(timer);discardPendingFrame();
 if(!project.files.length){++request;controller?.abort();setPages([]);lastHTML='';setSearchIndex(null);$('#preview-frame').removeAttribute('srcdoc');$('#preview-page').replaceChildren();setEditing(false);document.body.classList.remove('editing');syncEmpty();return;}
 const id=++request;controller?.abort();controller=new AbortController();inFlight=true;
 try{
  const response=await api('/api/preview',project,controller.signal),result=await response.json();if(id!==request)return;
  $$('[data-feature]').forEach(button=>button.hidden=project.options[button.dataset.feature]===false);
  setPages(result.pages);setActivePage(Math.min(activePage,pages.length-1));$('#preview-page').replaceChildren(...pages.map((page,index)=>{const option=element('option','',page.title);option.value=index;return option;}));$('#preview-page').value=activePage;$('#preview-page').hidden=pages.length===1;
  if(!editing){setEditing(true);document.body.classList.add('editing');syncEmpty();}
   setSearchIndex(null);syncOutput();if(project.mode==='heading'&&sheetOpen())renderBreaks();
  renderChecks(result.issues||[]);showPage({target});
 }catch(error){if(error.name!=='AbortError')status(error.message,true);}finally{if(id===request)inFlight=false;}
}
// Linked sources are re-read on each preview; unchanged output leaves the frame alone.
export function watchLinkedSources(){setInterval(()=>{if(editing&&!inFlight&&project.files.some(file=>file.path)&&document.visibilityState!=='hidden')preview(true);},4000);}
// This runs inside the sandboxed preview, which owns its layout and scroll position.
// It is injected with toString(), so it must not use imports or anything declared outside its own body.
function previewNavigation({scroll,target,hash,names,mode='edit',split=false}){
 const selectors={contents:'.section-map',contents_open:'.section-map',outline:'.right-rail,#mobile-menu',outline_depth:'.right-rail,#mobile-menu',search:'#search-toggle',customize:'#settings-toggle',reading_time:'.reading-time',reading_speed:'.reading-time',progress:'.reading-progress',logo:'.brand-logo',filename:'.brand-doc',footer:'.doc-footer',subtitle:'.hero>p',metadata:'.meta',copy_code:'.copy-btn',section_links:'.heading-anchor',table_sort:'.table-scroll',table_resize:'.table-scroll',table_scroll:'.table-scroll',table_rows:'.table-scroll',image_zoom:'#document img',media:'.mermaid-frame,.math-block,.math-inline',title_case:'#document h1,#document h2,#document h3',chapter_titles:'.publication-chapter>:first-child',assessments:'.assessment,#document ul'};
 function reveal(){
  let candidates=[...document.querySelectorAll(selectors[target]||':not(*)')];
  if(target==='assessments')candidates=candidates.filter(el=>el.matches('.assessment')||/^What it is:/i.test(el.textContent.trim()));
  if(target==='footer'&&candidates[0]?.hidden){scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});return;}
  candidates=candidates.map(el=>{
   if(!el.closest('[hidden]'))return el;
   if(['contents','contents_open'].includes(target))return document.querySelector('.hero');
   if(['outline','outline_depth'].includes(target))return document.querySelector('.topbar');
   if(['reading_time','reading_speed','subtitle','metadata'].includes(target))return document.querySelector('.hero');
   return el.parentElement;
  }).filter(el=>el&&!el.closest('[hidden]'));
  const bounds=candidates.map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
  const visible=r=>r.bottom>80&&r.top<innerHeight-24&&r.right>0&&r.left<innerWidth;
  if(bounds.some(visible)||!bounds.length)return;
  const distance=r=>r.bottom<=80?80-r.bottom:Math.max(0,r.top-innerHeight+24);
  bounds.sort((a,b)=>distance(a)-distance(b));
  scrollTo({top:Math.max(0,scrollY+bounds[0].top-96),behavior:'instant'});
 }
 addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='compass-theme'&&['light','dark'].includes(event.data.theme))document.documentElement.dataset.theme=event.data.theme;});
  const style=document.createElement('style');// Edit hides the reader's top bar, since the workspace rail stands in for it; Read shows the page exactly as published.
  style.textContent='html:not(.compass-read) .reader-dock{display:none!important}::view-transition-group(root){animation-duration:220ms;animation-timing-function:cubic-bezier(.2,.8,.2,1)}html:not(.compass-read) .contents-card{top:12px}html:not(.compass-read) .settings-panel{top:0}html:not(.compass-read) .contents-card{max-height:calc(100dvh - 24px)}html:not(.compass-read) body.contents-docked .contents-card{top:48px;max-height:none}html:not(.compass-read) body.customize-docked .settings-panel{top:0}@media(max-width:670px){.contents-card,body.contents-docked .contents-card{top:auto;max-height:75vh;}}';document.head.append(style);
  const setMode=value=>document.documentElement.classList.toggle('compass-read',value==='read');setMode(mode);
  const commands={contents:'#mobile-menu',find:'#search-toggle',customize:'#settings-toggle',print:'#reader-print'};
  addEventListener('message',event=>{
   if(event.source!==parent)return;const data=event.data||{};
   // A view transition crossfades snapshots of both modes, so the page never passes through an empty frame.
   if(data.type==='compass-mode'){if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.startViewTransition(()=>setMode(data.mode));else setMode(data.mode);}
   if(data.type==='compass-viewport'){if(data.unit>0)document.documentElement.style.setProperty('--compass-vw',data.unit+'px');else document.documentElement.style.removeProperty('--compass-vw');}
   if(data.type==='compass-command'&&commands[data.command]){const control=document.querySelector(commands[data.command]);if(control&&!control.closest('[hidden]')&&!control.hidden)control.click();else parent.postMessage({type:'compass-notice',command:data.command},'*');}
  });
  addEventListener('keydown',event=>{
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='e'){event.preventDefault();parent.postMessage({type:'compass-toggle-mode'},'*');}
   if(event.key==='?'&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.target.closest?.('input,textarea,select,[contenteditable=true]'))parent.postMessage({type:'compass-shortcuts'},'*');
   // In Read mode, Escape returns to Edit once the reader has no panel of its own open.
   if(event.key==='Escape'&&document.documentElement.classList.contains('compass-read')&&!document.querySelector('.settings-panel.visible,.search-modal.open,body:not(.contents-docked) .contents-card.open,dialog[open],.lightbox.open'))parent.postMessage({type:'compass-edit'},'*');
  });
  // Page per H1: a button on each H2 makes it an H1 so a new page starts there.
  if(split){
   style.textContent+='.compass-split{display:none;margin-left:12px;padding:3px 8px;border:1px dashed currentColor;border-radius:6px;background:transparent;color:inherit;font:500 14px system-ui,sans-serif;letter-spacing:0;vertical-align:middle;opacity:.55;cursor:pointer}html:not(.compass-read) #document h2:hover .compass-split,html:not(.compass-read) .compass-split:focus-visible{display:inline-block}.compass-split:hover{opacity:1}@media (hover:none){html:not(.compass-read) .compass-split{display:inline-block}}';
   const source=document.querySelector('#document')?.dataset.compassSource||'';
   document.querySelectorAll('#document h2').forEach(heading=>{
    const title=[...heading.childNodes].filter(node=>!(node.nodeType===1&&node.classList.contains('heading-anchor'))).map(node=>node.textContent).join('').trim();
    const button=document.createElement('button');button.type='button';button.className='compass-split';button.textContent='Start Page Here';button.title='Make this heading an H1 so a new page starts here';
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();parent.postMessage({type:'compass-promote',source,title},'*');});
    heading.append(button);
   });
  }
 addEventListener('scroll',()=>parent.postMessage({type:'compass-scroll',y:scrollY},'*'),{passive:true});
 document.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files'))parent.postMessage({type:'compass-drag'},'*');});
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a)return;
  const raw=a.getAttribute('href'),path=raw.split('#')[0],index=names.indexOf(path.split('?')[0]);
  if(index>=0){e.preventDefault();parent.postMessage({type:'compass-page',index,hash:raw.split('#')[1]||'',query:new URLSearchParams(path.split('?')[1]||'').get('compass-find')||''},'*');}
 });
 // Do not wait for load: optional online libraries can keep it pending for seconds.
 // A frame the browser is not painting may never run animation frames, so a timer backs it up.
 let ready=false;
 const restore=()=>{
  if(ready)return;ready=true;
  scrollTo({top:scroll,behavior:'instant'});
  if(hash){let id=hash;try{id=decodeURIComponent(hash);}catch(_){}document.getElementById(id)?.scrollIntoView({behavior:'instant'});}
  else reveal();
  parent.postMessage({type:'compass-ready',y:scrollY},'*');
 };
 requestAnimationFrame(restore);setTimeout(restore,150);
}
function discardPendingFrame(){pendingFrame?.remove();pendingFrame=null;}
export function showPage({target='',hash='',query=''}={}){
 if(!pages[activePage])return;
 const page=pages[activePage];if(lastHTML===page.html&&!hash&&!target&&!query)return;
 discardPendingFrame();
 const config=JSON.stringify({scroll:previewScroll,target,hash,names:pages.map(p=>p.name),mode:reading?'read':'edit',split:project.mode==='heading'}).replace(/</g,'\\u003c');
 const navigation='<script>('+previewNavigation.toString()+')('+config+');<\/script>';
 // srcdoc inherits the workspace URL as its base; keep fragment links local.
 let html=page.html.replace('<html lang="en"','<html lang="en" data-theme="'+(themeOverride||document.documentElement.dataset.theme||'light')+'"').replace('<head>',()=>'<head><base href="about:srcdoc"><script>window.__compassHash='+JSON.stringify(hash).replace(/</g,'\\u003c')+';window.__compassQuery='+JSON.stringify(query).replace(/</g,'\\u003c')+';<\/script>').replace('</body>',navigation+'</body>');
 html=printPreviewHTML(html);
 const current=$('#preview-frame');
 if(!lastHTML){current.classList.add('publication-frame');current.srcdoc=html;lastHTML=page.html;return;}
 // Keep the current document on screen while the replacement initializes.
 const next=current.cloneNode(false);next.removeAttribute('id');next.className='publication-frame preview-incoming';next.setAttribute('aria-hidden','true');next.inert=true;
 pendingFrame=next;next._compassHTML=page.html;next.srcdoc=html;current.after(next);
}
export function goToPage(index,view={}){setActivePage(index);setPreviewScroll(0);$('#preview-page').value=index;showPage(view);}
// The reader sizes its title in vw. At full width the frame gets the window's unit, so a docked panel does not shrink the title in Edit mode.
function sendViewportUnit(frame){
 const zoom=Number($('#preview-canvas').style.getPropertyValue('--preview-zoom'))||1,full=$('#view-toggle').dataset.width==='full';
 frame?.contentWindow?.postMessage({type:'compass-viewport',unit:full?innerWidth/zoom/100:0},'*');
}
window.addEventListener('resize',()=>sendViewportUnit($('#preview-frame')));
window.addEventListener('message',event=>{
 if(event.data?.type==='compass-ready')document.querySelectorAll('.publication-frame').forEach(frame=>{if(frame.contentWindow===event.source)sendViewportUnit(frame);});
 if(event.data?.type==='compass-ready'&&pendingFrame&&event.source===pendingFrame.contentWindow){
  const current=$('#preview-frame'),next=pendingFrame;pendingFrame=null;
  current.removeAttribute('id');current.classList.add('preview-retiring');current.setAttribute('aria-hidden','true');current.inert=true;
  next.id='preview-frame';next.removeAttribute('aria-hidden');next.inert=false;
  void next.offsetWidth; // Establish the transparent starting style before fading in.
  next.classList.remove('preview-incoming');lastHTML=next._compassHTML;
  setPreviewScroll(Math.max(0,Number(event.data.y)||0));setTimeout(()=>current.remove(),140);return;
 }
 if(event.source!==$('#preview-frame').contentWindow)return;
 if(event.data?.type==='compass-scroll'||event.data?.type==='compass-ready'){setPreviewScroll(Math.max(0,Number(event.data.y)||0));return;}
 if(event.data?.type==='compass-drag'){showFileDrop();return;}
 if(event.data?.type==='compass-edit'){setMode(false);return;}
 // ⌘E pressed inside the page switches modes both ways, as it does in the workspace.
 if(event.data?.type==='compass-toggle-mode'){setMode(!reading);return;}
 if(event.data?.type==='compass-shortcuts'){$('#show-shortcuts').click();return;}
  if(event.data?.type==='compass-promote'){promoteHeading(String(event.data.source||''),String(event.data.title||''));return;}
  if(event.data?.type==='compass-notice'){status({contents:'Turn on Contents Panel in Tools to use it.',find:'Turn on Find in Tools to use it.'}[event.data.command]||'That tool is turned off in Tools.');return;}
  if(event.data?.type!=='compass-page')return;
 const index=Number(event.data.index);if(Number.isInteger(index)&&pages[index])goToPage(index,{hash:String(event.data.hash||''),query:String(event.data.query||'')});
});
$('#preview-page').addEventListener('change',event=>{setActivePage(Number(event.target.value));setPreviewScroll(0);showPage();});
function setViewport(button){
 $$('[data-viewport]').forEach(b=>b.setAttribute('aria-checked',String(b===button)));$('#view-toggle').dataset.width=button.dataset.viewport;
 $('#preview-canvas').style.setProperty('--preview-width',button.dataset.viewport==='full'?'100%':'calc('+button.dataset.viewport+'px * var(--preview-zoom))');document.body.classList.toggle('preview-framed',button.dataset.viewport!=='full');
 sendViewportUnit($('#preview-frame'));
}
$$('[data-viewport]').forEach(button=>button.addEventListener('click',()=>setViewport(button)));
$$('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{
 $$('[data-zoom]').forEach(b=>b.setAttribute('aria-checked',String(b===button)));
 $('#preview-canvas').style.setProperty('--preview-zoom',button.dataset.zoom);$('#zoom-label').textContent=Math.round(button.dataset.zoom*100)+'%';
 sendViewportUnit($('#preview-frame'));
}));
function printPreviewHTML(html){
 if(!$('#print-preview').checked)return html;
 let css='';
 for(const style of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)){
  const source=style[1];for(const match of source.matchAll(/@media print\s*\{/g)){
   let depth=1,end=match.index+match[0].length;const start=end;
   while(end<source.length&&depth){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}css+=source.slice(start,end-1)+'\n';
  }
 }
 const paper=project.options.print_paper==='A4'?'210mm':project.options.print_paper==='Letter'?'215.9mm':'210mm';
 css+='body{padding:'+project.options.print_margin+'mm!important;} .page-shell{width:100%;max-width:calc('+paper+' - '+(project.options.print_margin*2)+'mm)!important;margin:auto!important;} .publication-chapter+.publication-chapter{'+(project.options.print_chapters?'border-top:1px dashed #aaa;padding-top:24px;margin-top:24px;':'')+'}';
 return html.replace('</head>',()=>'<style>'+css+'</style></head>');
}
$('#print-preview').addEventListener('change',()=>showPage({target:'print'}));
export function frameCommand(message){$('#preview-frame')?.contentWindow?.postMessage(message,'*');}
// While the Design sheet edits one theme's colors, the preview shows that theme instead of the workspace theme.
export function previewTheme(theme){themeOverride=theme;frameCommand({type:'compass-theme',theme});}
export function clearPreviewTheme(){if(!themeOverride)return;themeOverride=null;frameCommand({type:'compass-theme',theme:document.documentElement.dataset.theme||'light'});}
