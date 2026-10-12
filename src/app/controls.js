(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let defaults={},root='',draftKey='',project=null,editing=false,activePage=0,pages=[],lastHTML='',timer,request=0,controller=null,inFlight=false,previewScroll=0,dragIndex=null,folderParent=null;
const selectedFiles=new Map();
let pendingFrame=null;
const featureGroups=[
 ['Navigation',[
 ['contents','Opening Contents','Expandable chapter directory near the title.'],['contents_open','Expand Contents Initially','Open the directory when the page loads.'],['outline','Side Outline','Sticky section navigation with scroll tracking.'],['search','Find Sections','Heading search and the Ctrl / ⌘ K shortcut.'],['focus','Focus Button','Let readers hide navigation while reading.'],['section_links','Section Links','Copy direct links to document headings.']]],
 ['Page Elements',[
 ['customize','Customize Menu','Reader controls for appearance and layout.'],['reading_time','Reading Time','Show a reading estimate beside the title.'],['progress','Reading Progress','Accent line showing progress through the page.'],['logo','Compass Icon','Display the logo in the toolbar.'],['filename','Source Filename','Show the source filename beside Compass.'],['footer','Document Footer','Source information and a link back to the top.'],['subtitle','Subtitle','Display the introduction from publication metadata.'],['metadata','Author & Date','Display source attribution when available.']]],
 ['Content & Tables',[
 ['table_sort','Sortable Columns','Click table headings to sort the rows.'],['table_resize','Resizable Columns','Drag column edges or use keyboard arrows.'],['table_scroll','Bound Long Tables','Keep long tables in a scrolling region.'],['assessments','Structured Assessments','Turn repeated label-and-explanation lists into clear sections.'],['title_case','Title Case','Format headings and buttons consistently.'],['copy_code','Copy Code Buttons','Copy the contents of fenced code blocks.'],['image_zoom','Image Enlargement','Click images to inspect them in a lightbox.'],['media','Diagrams & Equations','Load online Mermaid and MathJax libraries when needed.']]]
];
const ranges=[['font','Text Size',14,22,1,'px'],['width','Content Width',640,1320,10,'px'],['leading','Line Spacing',1.55,2.05,.05,''],['radius','Corner Radius',0,28,1,'px'],['outline_depth','Outline Levels',1,4,1,''],['table_rows','Table Scroll Threshold',3,100,1,' rows'],['reading_speed','Reading Speed',100,500,10,' words/min']];
const palette=[['#2563eb','Blue'],['#14b8a6','Teal'],['#f97316','Orange'],['#8b5cf6','Violet'],['#f59e0b','Amber'],['#ec4899','Pink']];
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function status(message,error=false){$('#status').textContent=message;$('#status').classList.toggle('error',error);$('#status').hidden=false;clearTimeout(status.timeout);status.timeout=setTimeout(()=>$('#status').hidden=true,error?9000:3500);}
const api=(path,data,signal)=>window.CompassBrowser.request(path,data,signal);
function saveDraft(){
 try{localStorage.setItem(draftKey,JSON.stringify(project));$('#save-state').textContent='Draft Saved Locally';}
 catch(_){$('#save-state').textContent='Save Project to Keep Changes';}
}
function changed({immediate=false,target=''}={}){
 saveDraft();clearTimeout(timer);
 if(editing){if(immediate)preview(false,target);else timer=setTimeout(()=>preview(false,target),120);}
}
function buildControls(){
 for(const [title,features] of featureGroups){const group=element('section','feature-group');group.append(element('h3','',title));
  for(const [key,label,description] of features){const row=element('label','toggle-row'),copy=element('span');copy.append(element('strong','',label),element('small','',description));const input=element('input');input.type='checkbox';input.dataset.option=key;row.append(copy,input);group.append(row);}$('#feature-controls').append(group);
 }
 for(const [key,label,min,max,step,unit] of ranges){const wrap=element('div','range-control'),line=element('span'),title=element('label','',label),value=element('span','range-value'),number=element('input');number.type='number';Object.assign(number,{min,max,step});number.id='value-'+key;number.dataset.option=key;number.setAttribute('aria-label',label);value.append(number,element('span','',unit.trim()));title.htmlFor='option-'+key;line.append(title,value);const input=element('input');input.type='range';Object.assign(input,{min,max,step});input.dataset.option=key;input.dataset.unit=unit;input.id='option-'+key;
  const hint=element('small','',`Default: ${defaults[key]}${unit}`);wrap.append(line,input,hint);(key==='outline_depth'||key==='table_rows'||key==='reading_speed'?$('#tab-features'):$('#design-controls')).append(wrap);
 }
 for(const [color,name] of palette){const button=element('button');button.style.background=color;button.title=name;button.setAttribute('aria-label',name+' Accent');button.dataset.accent=color;$('#palette').append(button);button.addEventListener('click',()=>{project.options.accent=color;sync();changed({immediate:true});});}
 $$('[data-option]').forEach(input=>{
  const update=()=>{if(input.type==='number'&&(input.value===''||!input.validity.valid))return;const key=input.dataset.option;project.options[key]=input.type==='checkbox'?input.checked:Number(input.value);syncValues();changed({immediate:input.type==='checkbox',target:key});};
  input.addEventListener('input',update);
  if(input.type==='number'){
   const commit=()=>{if(input.value===''){input.value=project.options[input.dataset.option];return;}const min=Number(input.min),max=Number(input.max),step=Number(input.step);input.value=Number(Math.max(min,Math.min(max,min+Math.round((Number(input.value)-min)/step)*step)).toFixed(5));if(Number(input.value)!==project.options[input.dataset.option])update();};
   input.addEventListener('change',commit);input.addEventListener('blur',commit);
   input.addEventListener('keydown',event=>{if(event.key==='Enter')input.blur();});
  }
 });
}
function syncValues(){
 for(const [key,,min,max] of ranges){const slider=$('#option-'+key);slider.value=project.options[key];slider.style.setProperty('--range-progress',((project.options[key]-min)/(max-min)*100)+'%');const number=$('#value-'+key);if(document.activeElement!==number)number.value=project.options[key];}
 for(const key of ['accent','background']){const color=$('#opt-'+key),hex=$('#hex-'+key);color.value=project.options[key];color.parentElement.style.setProperty('--swatch-color',project.options[key]);if(document.activeElement!==hex)hex.value=project.options[key].toUpperCase();}
 $$('[data-accent]').forEach(b=>{const selected=b.dataset.accent===project.options.accent;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
}
function sync(){
 for(const [id,key] of [['project-name','name'],['publication-title','title'],['subtitle','subtitle'],['author','author'],['mode','mode']])$('#'+id).value=project[key];
 $('#safe').checked=project.safe;$('#chapter-titles').checked=project.chapter_titles;
 $('#opt-accent').value=project.options.accent;$('#opt-background').value=project.options.background;
 $$('[data-option]').forEach(input=>{if(input.type==='checkbox')input.checked=project.options[input.dataset.option];else input.value=project.options[input.dataset.option];});syncValues();renderFiles();
}
function renderFiles(){
 const list=$('#file-list');list.replaceChildren();$('#file-count').textContent=project.files.length;$('#files-empty').hidden=!!project.files.length;$('#export').disabled=!project.files.length;
 $('#document-summary').textContent=project.files.length?project.files.length+' Document'+(project.files.length===1?'':'s')+' · '+(project.mode==='combined'?'One Publication':'Connected Pages'):'Add a File to Begin';
 project.files.forEach((file,index)=>{
  const card=element('li','file-card');card.draggable=true;card.dataset.index=index;
  const grip=element('span','file-grip','⠿');grip.setAttribute('aria-hidden','true');const info=element('div');info.append(element('strong','',file.name.split('/').pop()),element('small','',file.path?'Linked · '+file.path:'Imported · Included in Project'));
  const title=element('input');title.placeholder='Chapter Title (Automatic)';title.value=file.title||'';title.setAttribute('aria-label','Chapter Title for '+file.name);title.addEventListener('input',()=>{file.title=title.value;changed();});title.addEventListener('pointerdown',e=>e.stopPropagation());info.append(title);
  const actions=element('div','file-card-actions');for(const [label,direction] of [['↑',-1],['↓',1]]){const button=element('button','',label);button.disabled=index+direction<0||index+direction>=project.files.length;button.setAttribute('aria-label','Move '+file.name+(direction<0?' Up':' Down'));button.addEventListener('click',()=>moveFile(index,index+direction));actions.append(button);}
  const remove=element('button','remove','Remove');remove.setAttribute('aria-label','Remove '+file.name);remove.addEventListener('click',()=>{project.files.splice(index,1);renderFiles();changed();});actions.append(remove);card.append(grip,info,actions);list.append(card);
  card.addEventListener('dragstart',event=>{if(event.target.closest('input,button')){event.preventDefault();return;}dragIndex=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/compass-index',index);card.classList.add('dragging');});
  card.addEventListener('dragover',event=>{if(dragIndex!==null){event.preventDefault();card.classList.add('drag-over');}});
  card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
  card.addEventListener('drop',event=>{if(dragIndex!==null){event.preventDefault();event.stopPropagation();moveFile(dragIndex,index);dragIndex=null;}});
  card.addEventListener('dragend',()=>{dragIndex=null;$$('.file-card').forEach(c=>c.classList.remove('drag-over','dragging'));});
 });
}
function moveFile(from,to){if(to<0||to>=project.files.length)return;project.files.splice(to,0,project.files.splice(from,1)[0]);renderFiles();changed();}
function relativePath(from,to){const a=from.split('/').slice(0,-1),b=to.split('/');while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift();}return [...a.map(()=>'..'),...b].join('/');}
async function dataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read '+file.name));reader.readAsDataURL(file);});}
async function importFiles(files){
 try{
  const items=Array.from(files),markdown=items.filter(f=>/\.(md|markdown|mdown)$/i.test(f.name)),images=items.filter(f=>/^image\//.test(f.type));
  if(!markdown.length){status('Choose Markdown files or a folder containing Markdown.',true);return;}
  if(project.files.length+markdown.length>100)throw Error('A publication can contain up to 100 documents.');
  if(items.reduce((sum,f)=>sum+f.size,0)>28*1024*1024)throw Error('Import up to 28 MB at once, or link large documents through Browse Workspace.');
  const assets=await Promise.all(images.map(async f=>[f.webkitRelativePath||f._compassPath||f.name,await dataURL(f)]));
  for(const file of markdown){const name=file.webkitRelativePath||file._compassPath||file.name;const existing=project.files.find(item=>'text' in item&&item.name===name);const text=await file.text();const doc={name,text,title:existing?.title||'',assets:Object.fromEntries(assets.map(([path,url])=>[relativePath(name,path),url]).filter(([path])=>text.includes(path)||text.includes(encodeURI(path))))};if(existing)Object.assign(existing,doc);else project.files.push(doc);}
  renderFiles();changed();status(markdown.length+' Document'+(markdown.length===1?'':'s')+' Imported');
 }catch(error){status(error.message,true);}
}
async function collectEntries(entry,prefix=''){
 if(entry.isFile)return new Promise((resolve,reject)=>entry.file(file=>{file._compassPath=prefix+file.name;resolve([file]);},reject));
 if(entry.isDirectory){const reader=entry.createReader();let result=[];while(true){const entries=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!entries.length)break;for(const child of entries)result.push(...await collectEntries(child,prefix+entry.name+'/'));}return result;}return [];
}
let dragDepth=0;
document.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();dragDepth++;document.body.classList.add('drag-files');}});
document.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
document.addEventListener('dragleave',()=>{if(--dragDepth<=0){dragDepth=0;document.body.classList.remove('drag-files');}});
document.addEventListener('drop',async e=>{if(![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();dragDepth=0;document.body.classList.remove('drag-files');try{const entries=[...e.dataTransfer.items].map(item=>item.webkitGetAsEntry?.()).filter(Boolean);const files=entries.length?(await Promise.all(entries.map(entry=>collectEntries(entry)))).flat():[...e.dataTransfer.files];await importFiles(files);}catch(error){status(error.message,true);}});
$('#dropzone').addEventListener('click',()=>$('#file-input').click());$('#dropzone').addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();$('#file-input').click();}});
$('#file-input').addEventListener('change',async event=>{await importFiles(event.target.files);event.target.value='';});$('#folder-input').addEventListener('change',async event=>{await importFiles(event.target.files);event.target.value='';});$('#folder-upload').addEventListener('click',()=>$('#folder-input').click());
$('#clear-files').addEventListener('click',()=>{project.files=[];renderFiles();changed();});
$$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{$$('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));$$('.tab-panel').forEach(panel=>panel.hidden=panel.id!=='tab-'+button.dataset.tab);}));
for(const [id,key] of [['project-name','name'],['publication-title','title'],['subtitle','subtitle'],['author','author'],['mode','mode'],['safe','safe'],['chapter-titles','chapter_titles']])$('#'+id).addEventListener('input',event=>{project[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;renderFiles();changed({immediate:event.target.type==='checkbox'||event.target.tagName==='SELECT',target:key==='chapter_titles'?key:''});});
for(const key of ['accent','background']){
 $('#opt-'+key).addEventListener('input',event=>{project.options[key]=event.target.value;syncValues();changed();});
 const hex=$('#hex-'+key);
 hex.addEventListener('input',()=>{const value=hex.value.startsWith('#')?hex.value:'#'+hex.value;if(!/^#[0-9a-f]{6}$/i.test(value))return;project.options[key]=value.toLowerCase();syncValues();changed();});
 hex.addEventListener('blur',()=>{hex.value=project.options[key].toUpperCase();});
 hex.addEventListener('keydown',event=>{if(event.key==='Enter')hex.blur();});
}
const presets={standard:{...{}},editorial:{accent:'#d97706',background:'#faf8f3',font:18,width:820,leading:1.85,radius:6},compact:{accent:'#0d9488',font:15,width:1100,leading:1.6,radius:6,compact:true},vivid:{accent:'#ec4899',background:'#f8f7fc',font:17,width:960,radius:16}};
$$('[data-preset]').forEach(button=>button.addEventListener('click',()=>{const preset=presets[button.dataset.preset];for(const key of ['accent','background','font','width','leading','radius','compact'])project.options[key]=key in preset?preset[key]:defaults[key];sync();changed({immediate:true});}));
$('#reset-options').addEventListener('click',()=>{project.options={...defaults};sync();changed({immediate:true});status('Design & Features Reset');});
async function preview(quiet=false,target=''){
 clearTimeout(timer);discardPendingFrame();
 if(!project.files.length){++request;controller?.abort();if(editing){pages=[];lastHTML='';$('#preview-frame').srcdoc='<body style="font-family:system-ui;text-align:center;padding:80px 20px;color:#67788e"><h2>Your Next Publication Starts Here</h2><p>Drop Markdown files anywhere in the workspace.</p></body>';$('#preview-page').replaceChildren();}else if(!quiet)status('Add a Markdown file to begin.',true);return;}
 const id=++request;controller?.abort();controller=new AbortController();inFlight=true;
 try{
  const response=await api('/api/preview',project,controller.signal),result=await response.json();if(id!==request)return;
  pages=result.pages;activePage=Math.min(activePage,pages.length-1);$('#preview-page').replaceChildren(...pages.map((page,index)=>{const option=element('option','',page.title);option.value=index;return option;}));$('#preview-page').value=activePage;$('#preview-page').hidden=pages.length===1;
  if(!editing){editing=true;document.body.classList.add('editing');$('#preview-pane').hidden=false;if(innerWidth<650)document.body.classList.add('drawer-hidden');}
  showPage({target});if(result.warnings.length&&!quiet)status(result.warnings.join(' · '),true);
 }catch(error){if(error.name!=='AbortError')status(error.message,true);}finally{if(id===request)inFlight=false;}
}
// This runs inside the sandboxed preview, which owns its layout and scroll position.
function previewNavigation({scroll,target,hash,names}){
 const selectors={contents:'.section-map',contents_open:'.section-map',outline:'.right-rail,#mobile-menu',outline_depth:'.right-rail,#mobile-menu',search:'#search-toggle',focus:'#focus-toggle',customize:'#settings-toggle',reading_time:'.reading-time',reading_speed:'.reading-time',progress:'.reading-progress',logo:'.brand-logo',filename:'.brand-doc',footer:'.doc-footer',subtitle:'.hero>p',metadata:'.meta',copy_code:'.copy-btn',section_links:'.heading-anchor',table_sort:'.table-scroll',table_resize:'.table-scroll',table_scroll:'.table-scroll',table_rows:'.table-scroll',image_zoom:'#document img',media:'.mermaid-frame,.math-block,.math-inline',title_case:'#document h1,#document h2,#document h3',chapter_titles:'.publication-chapter>:first-child',assessments:'.assessment,#document ul'};
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
 addEventListener('scroll',()=>parent.postMessage({type:'compass-scroll',y:scrollY},'*'),{passive:true});
 document.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files'))parent.postMessage({type:'compass-drag'},'*');});
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a)return;
  const raw=a.getAttribute('href'),index=names.indexOf(raw.split('#')[0]);
  if(index>=0){e.preventDefault();parent.postMessage({type:'compass-page',index,hash:raw.split('#')[1]||''},'*');}
 });
 // Do not wait for load: optional online libraries can keep it pending for seconds.
 requestAnimationFrame(()=>{
  scrollTo({top:scroll,behavior:'instant'});
  if(hash){let id=hash;try{id=decodeURIComponent(hash);}catch(_){}document.getElementById(id)?.scrollIntoView({behavior:'instant'});}
  else reveal();
  parent.postMessage({type:'compass-ready',y:scrollY},'*');
 });
}
function discardPendingFrame(){pendingFrame?.remove();pendingFrame=null;}
function showPage({target='',hash=''}={}){
 if(!pages[activePage])return;
 const page=pages[activePage];if(lastHTML===page.html&&!hash&&!target)return;
 discardPendingFrame();
 const config=JSON.stringify({scroll:previewScroll,target,hash,names:pages.map(p=>p.name)}).replace(/</g,'\\u003c');
 const navigation='<script>('+previewNavigation.toString()+')('+config+');<\/script>';
 // srcdoc inherits the workspace URL as its base; keep fragment links local.
 const html=page.html.replace('<head>','<head><base href="about:srcdoc">').replace('</body>',navigation+'</body>');
 const current=$('#preview-frame');
 if(!lastHTML){current.classList.add('publication-frame');current.srcdoc=html;lastHTML=page.html;return;}
 // Keep the current document on screen while the replacement initializes.
 const next=current.cloneNode(false);next.removeAttribute('id');next.className='publication-frame preview-incoming';next.setAttribute('aria-hidden','true');next.inert=true;
 pendingFrame=next;next._compassHTML=page.html;next.srcdoc=html;current.after(next);
}
window.addEventListener('message',event=>{
 if(event.data?.type==='compass-ready'&&pendingFrame&&event.source===pendingFrame.contentWindow){
  const current=$('#preview-frame'),next=pendingFrame;pendingFrame=null;
  current.removeAttribute('id');current.classList.add('preview-retiring');current.setAttribute('aria-hidden','true');current.inert=true;
  next.id='preview-frame';next.removeAttribute('aria-hidden');next.inert=false;
  void next.offsetWidth; // Establish the transparent starting style before fading in.
  next.classList.remove('preview-incoming');lastHTML=next._compassHTML;
  previewScroll=Math.max(0,Number(event.data.y)||0);setTimeout(()=>current.remove(),140);return;
 }
 if(event.source!==$('#preview-frame').contentWindow)return;
 if(event.data?.type==='compass-scroll'||event.data?.type==='compass-ready'){previewScroll=Math.max(0,Number(event.data.y)||0);return;}
 if(event.data?.type==='compass-drag'){dragDepth=1;document.body.classList.add('drag-files');return;}
 if(event.data?.type!=='compass-page')return;
 const index=Number(event.data.index);if(Number.isInteger(index)&&pages[index]){activePage=index;previewScroll=0;$('#preview-page').value=index;showPage({hash:String(event.data.hash||'')});}
});
$('#preview-page').addEventListener('change',event=>{activePage=Number(event.target.value);previewScroll=0;showPage();});$('#start-preview').addEventListener('click',()=>preview());$('#hide-drawer').addEventListener('click',()=>document.body.classList.add('drawer-hidden'));$('#show-drawer').addEventListener('click',()=>document.body.classList.remove('drawer-hidden'));
$$('[data-viewport]').forEach(button=>button.addEventListener('click',()=>{$$('[data-viewport]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#preview-canvas').style.setProperty('--preview-width',button.dataset.viewport==='full'?'100%':'calc('+button.dataset.viewport+'px * var(--preview-zoom))');}));
$$('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{$$('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#preview-canvas').style.setProperty('--preview-zoom',button.dataset.zoom);}));
async function browse(path='.'){
 try{const result=await (await api('/api/files?path='+encodeURIComponent(path))).json();$('#folder-path').value=result.path;folderParent=result.parent;$('#folder-up').disabled=folderParent===null;$('#browser-entries').replaceChildren();for(const item of result.entries){
  if(item.directory){const button=element('button','browser-entry directory','▸ '+item.name);button.addEventListener('click',()=>browse(item.path));$('#browser-entries').append(button);}else{const row=element('label','browser-entry'),input=element('input');input.type='checkbox';input.checked=selectedFiles.has(item.path);input.addEventListener('change',()=>{if(input.checked)selectedFiles.set(item.path,item);else selectedFiles.delete(item.path);$('#selection-count').textContent=selectedFiles.size+' Selected';});row.append(input,element('span','',item.name),element('small','','Markdown'));$('#browser-entries').append(row);}}
  if(!result.entries.length)$('#browser-entries').append(element('p','empty-note','No folders or Markdown files here.'));
 }catch(error){status(error.message,true);}
}
$('#browse').addEventListener('click',async()=>{try{if(!await window.CompassBrowser.connectWorkspace())return;selectedFiles.clear();$('#selection-count').textContent='0 Selected';$('#workspace-root').textContent=window.CompassBrowser.root;$('#file-browser').showModal();browse();}catch(error){if(error.name!=='AbortError')status(error.message,true);}});$('#close-browser').addEventListener('click',()=>$('#file-browser').close());$('#folder-up').addEventListener('click',()=>browse(folderParent));$('#folder-go').addEventListener('click',()=>browse($('#folder-path').value));$('#folder-path').addEventListener('keydown',e=>{if(e.key==='Enter')browse(e.target.value);});
$('#add-selected').addEventListener('click',()=>{for(const item of selectedFiles.values()){if(!project.files.some(file=>file.path===item.path))project.files.push({name:item.name,path:item.path,title:''});}$('#file-browser').close();renderFiles();changed();});
function download(blob,name){const url=URL.createObjectURL(blob),link=element('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('#save-project').addEventListener('click',async()=>{try{const clean=await (await api('/api/project?portable=1',project)).json();download(new Blob([JSON.stringify({...clean,workspace:root},null,2)],{type:'application/json'}),'compass.json');status('Project Saved');}catch(error){status(error.message,true);}});
async function loadExample(name){try{project=await (await api('/api/project',window.CompassBrowser.examples[name])).json();activePage=0;previewScroll=0;sync();changed();await preview();}catch(error){status(error.message,true);}}
$('#load-example')?.addEventListener('click',()=>loadExample('demo'));
$('#load-combined-example')?.addEventListener('click',()=>loadExample('combined'));
$('#download-app')?.addEventListener('click',()=>{const link=element('a');link.href=new URL('compass.html',location.href).href;link.download='compass.html';document.body.append(link);link.click();link.remove();});
$('#open-project').addEventListener('click',()=>$('#project-input').click());$('#project-input').addEventListener('change',async event=>{try{const value=JSON.parse(await event.target.files[0].text());const clean=await (await api('/api/project',value)).json();project=clean;activePage=0;sync();changed();status(value.workspace&&value.workspace!==root?'Project Opened. Linked paths use this workspace: '+root:'Project Opened');}catch(error){status(error.message,true);}event.target.value='';});
$('#export').addEventListener('click',async()=>{const button=$('#export');button.disabled=true;button.textContent='Building…';try{const response=await api('/api/export',project),name=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||'publication.html';download(await response.blob(),name);status('Publication Exported');}catch(error){status(error.message,true);}finally{button.textContent='Export HTML ↗';button.disabled=!project.files.length;}});
async function start(){
 try{const session=await (await api('/api/session')).json();defaults=session.defaults;root=session.root;project={version:1,name:'Untitled Publication',title:'',subtitle:'',author:'',mode:'combined',safe:true,chapter_titles:true,options:{...defaults},files:[]};
  draftKey='compass-project:'+root;
  if(session.project){project=session.project;draftKey+=':startup:'+project.name;}
  else try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(draft)project=await (await api('/api/project',draft)).json();}catch(_){}
  buildControls();sync();
  $('#save-state').textContent='Converts in Your Browser';
  $('#source-help').textContent=window.showDirectoryPicker?'Import folders with local images, or Browse Workspace to link a folder and refresh source changes. Files stay in your browser.':'Import folders with local images. Reimport a file to refresh its contents. Files stay in your browser.';
  $$('.browser-examples').forEach(el=>el.hidden=false);
  if(location.protocol!=='file:')$('#download-app').hidden=false;
  if(session.project&&project.files.length)await preview();
  // Linked sources are re-read on each preview; unchanged output leaves the frame alone.
  setInterval(()=>{if(editing&&!inFlight&&project.files.some(file=>file.path)&&document.visibilityState!=='hidden')preview(true);},4000);
 }catch(error){status(error.message,true);}
}
start();
})();
