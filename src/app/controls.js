(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let defaults={},root='',draftKey='',project=null,editing=false,activePage=0,pages=[],lastHTML='',timer,request=0,controller=null,inFlight=false,previewScroll=0,dragIndex=null,folderParent=null;
const selectedFiles=new Map();
const {normalizeProject,normalizeBranding,DESIGN_KEYS,createDesignPreset,readDesignPreset,createHistory}=window.CompassProject;
let history=null,sourceKey='',sourceOriginal=null,sourceRequest=0,drawerWasHidden=false,checkRevision=0,brandingTarget='logo';
const {pairedAccent}=window.CompassDesign,icon=window.CompassIcons;
let editTheme=document.documentElement.dataset.theme||'light';
const colorKeys=['accent','background','logo_color','dark_accent','dark_background','dark_logo_color','surface','dark_surface'];
let pendingFrame=null;
const featureGroups=[
 ['Navigation','Contents, outline, and finding sections',[
 ['contents','Opening Contents','Expandable chapter directory near the title.'],['contents_open','Expand Contents Initially','Open the directory when the page loads.'],['outline','Side Outline','Sticky section navigation with scroll tracking.'],['search','Find in Publication','Search text, headings, and code across chapters.'],['section_links','Section Links','Copy direct links to document headings.']]],
 ['Reader Experience','Customization, focus, and progress',[
 ['customize','Customize Menu','Reader controls for appearance and layout.'],['remember','Reader Preferences','Allow exports to remember reader adjustments.'],['focus','Focus Button','Let readers hide navigation while reading.'],['reading_time','Reading Time','Show a reading estimate beside the title.'],['progress','Reading Progress','Accent line showing progress through the page.'],['bookmarks','Bookmarks','Save sections locally for later reading.'],['resume','Resume Reading','Offer to continue at the last section when preferences are remembered.']]],
 ['Page Elements','Branding, attribution, and footer',[
 ['logo','Compass Icon','Display the logo in the toolbar.'],['filename','Source Filename','Show the source filename beside Compass.'],['footer','Document Footer','Source information and a link back to the top.'],['subtitle','Subtitle','Display the introduction from publication metadata.'],['metadata','Author & Date','Display source attribution when available.']]],
 ['Tables','Sorting, resizing, and scrolling',[
 ['table_sort','Sortable Columns','Click table headings to sort the rows.'],['table_resize','Resizable Columns','Drag column edges or use keyboard arrows.'],['table_scroll','Bound Long Tables','Keep long tables in a scrolling region.']]],
 ['Content Tools','Formatting, code, images, and diagrams',[
 ['assessments','Structured Assessments','Turn repeated label-and-explanation lists into clear sections.'],['title_case','Title Case','Format headings and buttons consistently.'],['copy_code','Copy Code Buttons','Copy the contents of fenced code blocks.'],['image_zoom','Image Enlargement','Click images to inspect them in a lightbox.'],['media','Diagrams & Equations','Load online Mermaid and MathJax libraries when needed.']]]
];
const ranges=[['font','Text Size',14,22,1,'px','typography-controls'],['leading','Line Spacing',1.55,2.05,.05,'','typography-controls'],['letter_spacing','Letter Spacing',-.02,.08,.005,'em','typography-controls'],['paragraph_spacing','Paragraph Spacing',8,32,1,'px','typography-controls'],['heading_scale','Heading Size',.85,1.35,.05,'×','typography-controls'],['width','Content Width',640,1320,10,'px','layout-controls'],['radius','Corner Radius',0,28,1,'px','layout-controls'],['outline_depth','Outline Levels',1,4,1,'','feature-tuning'],['table_rows','Table Scroll Threshold',3,100,1,' rows','feature-tuning'],['reading_speed','Reading Speed',100,500,10,' words/min','feature-tuning']];
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function status(message,error=false){$('#status').textContent=message;$('#status').classList.toggle('error',error);$('#status').hidden=false;clearTimeout(status.timeout);status.timeout=setTimeout(()=>$('#status').hidden=true,error?9000:3500);}
const api=(path,data,signal)=>window.CompassBrowser.request(path,data,signal);
function saveDraft(){
 try{localStorage.setItem(draftKey,JSON.stringify(project));$('#save-state').textContent='Changes saved on this device';}
 catch(_){$('#save-state').textContent='Use Save Project to keep changes';}
}
function changed({immediate=false,target='',record=true}={}){
 if(record&&history){const active=document.activeElement;history.record(project,{group:active?.matches('input:not([type=checkbox]):not([type=radio]),textarea')?active:null});}
 syncHistory();checkRevision++;$('#check-summary').textContent='Changes made. Run a check to review this version.';$('#check-results').classList.add('checks-stale');
 saveDraft();clearTimeout(timer);
 if(editing){if(immediate)preview(false,target);else timer=setTimeout(()=>preview(false,target),120);}
}
function buildControls(){
 for(const theme of ['light','dark']){
  const panel=element('div','theme-color-panel');panel.dataset.colorTheme=theme;panel.hidden=theme!==editTheme;
  const fields=element('div','theme-color-fields');
  for(const [key,label] of [['accent','Accent'],['background','Background'],['surface','Surface'],['logo_color','Icon Color']]){
   const option=(theme==='dark'?'dark_':'')+key,field=element('div','color-field'),title=element('div','color-label'),labelText=element('label','',label),value=element('div','color-value'),swatch=element('span','color-swatch'),color=element('button'),hex=element('input','color-hex');
   color.id='opt-'+option;color.setAttribute('aria-label',(theme==='light'?'Light':'Dark')+' '+label);labelText.htmlFor=color.id;title.append(labelText);window.CompassColorPicker(color);
   hex.type='text';hex.id='hex-'+option;hex.maxLength=7;hex.spellcheck=false;hex.setAttribute('aria-label',(theme==='light'?'Light':'Dark')+' '+label+' Hex');
   const update=value=>{project.options[option]=value.toLowerCase();if(key==='accent'&&project.options.link_accents)project.options[theme==='dark'?'accent':'dark_accent']=pairedAccent(value,theme==='dark'?'light':'dark');syncValues();changed();};
   color.addEventListener('input',()=>update(color.value));hex.addEventListener('input',()=>{const value=hex.value.startsWith('#')?hex.value:'#'+hex.value;if(/^#[0-9a-f]{6}$/i.test(value))update(value);});
   hex.addEventListener('blur',()=>hex.value=project.options[option].toUpperCase());hex.addEventListener('keydown',event=>{if(event.key==='Enter')hex.blur();});
   swatch.append(color);value.append(swatch,hex);field.append(title,value);fields.append(field);
   if(key!=='surface')title.append(element('small','color-description',({accent:'Links, buttons, and highlights.',background:'The page behind your content.',logo_color:'Foreground of the Compass mark.'})[key]));
   if(key==='surface'){hex.placeholder='Automatic';const help=element('div','surface-help'),reset=element('button','text-button','Reset to Automatic');reset.type='button';reset.dataset.resetSurface=option;reset.addEventListener('click',()=>{project.options[option]='';syncValues();changed();});help.append(element('small','','Header, cards, and panels.'),reset);title.append(help);reset.setAttribute('aria-label','Reset '+(theme==='dark'?'Dark':'Light')+' Surface to Automatic');reset.textContent='Reset to Automatic';}
  }
  panel.append(fields);$('#theme-color-controls').append(panel);
 }
 $$('[data-edit-theme]').forEach(button=>button.addEventListener('click',()=>selectEditTheme(button.dataset.editTheme)));
 selectEditTheme(editTheme);
 window.CompassMotion.install();window.CompassMenus.install();
 $('#theme-colors-section').addEventListener('toggle',()=>{if($('#theme-colors-section').open)selectEditTheme(document.documentElement.dataset.theme||'light');});
 for(const [title,description,features] of featureGroups){const group=element('details','settings-section'),summary=element('summary'),copy=element('span');copy.append(element('strong','',title),element('small','',description));summary.append(copy);summary.insertAdjacentHTML('beforeend',icon('chevron-down'));const body=element('div','settings-section-body');group.append(summary,body);
  for(const [key,label,description] of features){const row=element('label','toggle-row'),copy=element('span');copy.append(element('strong','',label),element('small','',description));const input=element('input');input.type='checkbox';input.dataset.option=key;row.append(copy,input);body.append(row);}$('#feature-controls').append(group);
 }
 for(const [key,label,min,max,step,unit,container] of ranges){const wrap=element('div','range-control'),line=element('span'),title=element('label','',label),value=element('span','range-value'),number=element('input');number.type='number';Object.assign(number,{min,max,step});number.id='value-'+key;number.dataset.option=key;number.setAttribute('aria-label',label);value.append(number,element('span','',unit.trim()));title.htmlFor='option-'+key;line.append(title,value);const input=element('input');input.type='range';Object.assign(input,{min,max,step});input.dataset.option=key;input.dataset.unit=unit;input.id='option-'+key;
  const hint=element('small','',`Default: ${defaults[key]}${unit}`);wrap.append(line,input,hint);$('#'+container).append(wrap);
 }
 window.CompassMotion.install();
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
function selectEditTheme(theme){
 editTheme=theme==='dark'?'dark':'light';
 $$('[data-edit-theme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.editTheme===editTheme)));
 $$('[data-color-theme]').forEach(panel=>panel.hidden=panel.dataset.colorTheme!==editTheme);
}
function syncValues(){
 for(const [key,,min,max] of ranges){const slider=$('#option-'+key);slider.value=project.options[key];slider.style.setProperty('--range-progress',((project.options[key]-min)/(max-min)*100)+'%');const number=$('#value-'+key);if(document.activeElement!==number)number.value=project.options[key];}
 for(const key of colorKeys){const color=$('#opt-'+key),hex=$('#hex-'+key),value=project.options[key];
  const background=project.options[key.startsWith('dark_')?'dark_background':'background'];
  const weight=key.startsWith('dark_')?.94:.15;
  const automatic='#'+background.slice(1).match(/../g).map(channel=>Math.round(parseInt(channel,16)*weight+255*(1-weight)).toString(16).padStart(2,'0')).join('');
  color.value=value||automatic;color.parentElement.style.setProperty('--swatch-color',color.value);if(document.activeElement!==hex)hex.value=value.toUpperCase();
  const reset=$('[data-reset-surface="'+key+'"]');if(reset)reset.hidden=!value;
 }


}
function sync(){
 for(const [id,key] of [['project-name','name'],['publication-title','title'],['subtitle','subtitle'],['author','author'],['mode','mode']])$('#'+id).value=project[key];
 project.branding=normalizeBranding(project.branding);
 for(const [id,key] of [['body-font','body_font'],['heading-font','heading_font'],['print-paper','print_paper'],['print-margin','print_margin']])$('#'+id).value=project.options[key];
 $('#print-chapters').checked=project.options.print_chapters;
 $('#brand-name').value=project.branding.name;$('#brand-footer').value=project.branding.footer;
 for(const key of ['logo','favicon']){const img=$('#brand-'+key+'-preview');img.hidden=!project.branding[key];if(project.branding[key])img.src=project.branding[key];else img.removeAttribute('src');$('#remove-'+key).disabled=!project.branding[key];}
 syncSource();
 $('#safe').checked=project.safe;$('#chapter-titles').checked=project.chapter_titles;syncOutput();
 $$('[data-option]').forEach(input=>{if(input.type==='checkbox')input.checked=project.options[input.dataset.option];else input.value=project.options[input.dataset.option];});syncValues();renderFiles();
}
function renderFiles(){
 const list=$('#file-list');list.replaceChildren();$('#file-count').textContent=project.files.length;$('#files-empty').hidden=!!project.files.length;$('#clear-files').disabled=!project.files.length;$('#export').disabled=!project.files.length;$('#start-preview').disabled=!project.files.length;syncOutput();
 $('#document-summary').textContent=project.files.length?project.files.length+' file'+(project.files.length===1?'':'s')+' added':'No files added';
 project.files.forEach((file,index)=>{
  const card=element('li','file-card');card.draggable=true;card.dataset.index=index;
  const grip=element('span','file-grip');grip.innerHTML=icon('grip');grip.setAttribute('aria-hidden','true');
  const info=element('div','file-info'),name=element('strong','',file.title||file.name.split('/').pop());info.append(name,element('small','',file.name.split('/').pop()+(file.path?' · Linked':'')));
  const menu=element('details','file-menu'),summary=element('summary');summary.innerHTML=icon('ellipsis');summary.setAttribute('aria-label','Actions for '+file.name);menu.append(summary);
  const actions=element('div','file-menu-actions');
  const editor=element('div','file-title-editor');editor.hidden=true;const titleLabel=element('label','', 'Chapter Title'),title=element('input');title.id='file-title-'+index;titleLabel.htmlFor=title.id;title.placeholder='Automatic';title.value=file.title||'';title.setAttribute('aria-label','Chapter Title for '+file.name);
  title.addEventListener('input',()=>{file.title=title.value;name.textContent=file.title||file.name.split('/').pop();changed();});title.addEventListener('pointerdown',e=>e.stopPropagation());
  const done=element('button');done.innerHTML=icon('check');done.setAttribute('aria-label','Done Editing Title');done.addEventListener('click',()=>window.CompassMotion.transition(editor,false,()=>editor.hidden=true));editor.append(titleLabel,title,done);
  const edit=element('button');edit.innerHTML=icon('pencil')+'<span>Edit Chapter Title</span>';edit.addEventListener('click',()=>{window.CompassMotion.details(menu,false);window.CompassMotion.transition(editor,true,()=>editor.hidden=false);title.focus();});actions.append(edit);
  for(const [label,direction] of [['Move Up',-1],['Move Down',1]]){const button=element('button');button.innerHTML=icon(direction<0?'arrow-up':'arrow-down')+'<span>'+label+'</span>';button.disabled=index+direction<0||index+direction>=project.files.length;button.setAttribute('aria-label','Move '+file.name+(direction<0?' Up':' Down'));button.addEventListener('click',()=>moveFile(index,index+direction));actions.append(button);}
  const source=element('button');source.innerHTML=icon('file-text')+'<span>Edit Markdown</span>';source.addEventListener('click',()=>{window.CompassMotion.details(menu,false);openSource(index);});actions.append(source);
  const remove=element('button','remove');remove.innerHTML=icon('trash')+'<span>Remove</span>';remove.setAttribute('aria-label','Remove '+file.name);remove.addEventListener('click',()=>{project.files.splice(index,1);renderFiles();changed();});actions.append(remove);menu.append(actions);card.append(grip,info,menu,editor);list.append(card);window.CompassMotion.install(card);
  menu.addEventListener('toggle',()=>{if(menu.open)$$('.file-menu').filter(other=>other!==menu).forEach(other=>window.CompassMotion.details(other,false));});
  card.addEventListener('dragstart',event=>{if(event.target.closest('input,button,summary')){event.preventDefault();return;}dragIndex=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/compass-index',index);card.classList.add('dragging');});
  card.addEventListener('dragover',event=>{if(dragIndex!==null){event.preventDefault();card.classList.add('drag-over');}});
  card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
  card.addEventListener('drop',event=>{if(dragIndex!==null){event.preventDefault();event.stopPropagation();moveFile(dragIndex,index);dragIndex=null;}});
  card.addEventListener('dragend',()=>{dragIndex=null;$$('.file-card').forEach(c=>c.classList.remove('drag-over','dragging'));});
 });
}
document.addEventListener('click',event=>$$('.file-menu[open]').forEach(menu=>{if(!menu.contains(event.target))window.CompassMotion.details(menu,false);}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')$$('.file-menu[open]').forEach(menu=>{window.CompassMotion.details(menu,false);menu.querySelector('summary').focus();});});
function moveFile(from,to){if(to<0||to>=project.files.length)return;project.files.splice(to,0,project.files.splice(from,1)[0]);renderFiles();changed();}
function relativePath(from,to){const a=from.split('/').slice(0,-1),b=to.split('/');while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift();}return [...a.map(()=>'..'),...b].join('/');}
async function dataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read '+file.name));reader.readAsDataURL(file);});}
async function importFiles(files){
 try{
  const items=Array.from(files),markdown=items.filter(f=>/\.(md|markdown|mdown)$/i.test(f.name)),images=items.filter(f=>/^image\//.test(f.type));
  if(!markdown.length){status('Choose Markdown files or a folder containing Markdown.',true);return;}
  if(project.files.length+markdown.length>100)throw Error('A publication can contain up to 100 documents.');
  if(items.reduce((sum,f)=>sum+f.size,0)>28*1024*1024)throw Error('Import up to 28 MB at once, or link large documents with Link Folder.');
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
$$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{$('#export').hidden=button.dataset.tab!=='publishing';$('#reset-options').hidden=button.dataset.tab!=='appearance';$('#reset-features').hidden=button.dataset.tab!=='features';if(button.dataset.tab==='appearance')selectEditTheme(document.documentElement.dataset.theme||'light');$$('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));$$('.tab-panel').forEach(panel=>panel.hidden=panel.id!=='tab-'+button.dataset.tab);}));
for(const [id,key] of [['project-name','name'],['publication-title','title'],['subtitle','subtitle'],['author','author'],['mode','mode'],['safe','safe'],['chapter-titles','chapter_titles']])$('#'+id).addEventListener('input',event=>{project[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;if(key==='mode')syncOutput();renderFiles();changed({immediate:event.target.type==='checkbox'||event.target.tagName==='SELECT',target:key==='chapter_titles'?key:''});});
const appearanceKeys=DESIGN_KEYS;
const printKeys=['print_paper','print_margin','print_chapters'];
$('#reset-options').addEventListener('click',()=>{for(const key of appearanceKeys)project.options[key]=defaults[key];sync();changed({immediate:true});status('Design reset to defaults');});
$('#reset-features').addEventListener('click',()=>{for(const key of Object.keys(defaults))if(!appearanceKeys.includes(key)&&!printKeys.includes(key))project.options[key]=defaults[key];sync();changed({immediate:true});status('Features reset to defaults');});
function syncOutput(){
 $$('[name=output-mode]').forEach(input=>input.checked=input.value===project.mode);
 $('#export').innerHTML=icon('download')+'<span>Download '+(project.mode==='separate'&&project.files.length>1?'ZIP':'HTML')+'</span>';
 $('#chapter-titles').closest('.toggle-row').hidden=project.mode!=='combined'||project.files.length<2;
}
$$('[name=output-mode]').forEach(input=>input.addEventListener('change',()=>{if(input.checked){$('#mode').value=input.value;$('#mode').dispatchEvent(new Event('input',{bubbles:true}));syncOutput();}}));
$('#go-publish').addEventListener('click',()=>{$('[data-tab=publishing]').click();if(document.body.classList.contains('drawer-hidden'))window.CompassMotion.transition($('#drawer'),true,()=>document.body.classList.remove('drawer-hidden'),'drawer');setTimeout(()=>$('[name=output-mode]:checked').focus(),0);});

async function preview(quiet=false,target=''){
 clearTimeout(timer);discardPendingFrame();
 if(!project.files.length){++request;controller?.abort();if(editing){pages=[];lastHTML='';$('#preview-frame').srcdoc='<body style="font-family:system-ui;text-align:center;padding:80px 20px;color:#67788e"><h2>Your Next Publication Starts Here</h2><p>Drop Markdown files anywhere in the workspace.</p></body>';$('#preview-page').replaceChildren();}else if(!quiet)status('Add a Markdown file to begin.',true);return;}
 const id=++request;controller?.abort();controller=new AbortController();inFlight=true;
 try{
  const response=await api('/api/preview',project,controller.signal),result=await response.json();if(id!==request)return;
  pages=result.pages;activePage=Math.min(activePage,pages.length-1);$('#preview-page').replaceChildren(...pages.map((page,index)=>{const option=element('option','',page.title);option.value=index;return option;}));$('#preview-page').value=activePage;$('#preview-page').hidden=pages.length===1;
  if(!editing){editing=true;document.body.classList.add('editing');$('#preview-pane').hidden=false;if(innerWidth<650)document.body.classList.add('drawer-hidden');}
  renderChecks(result.issues||[]);showPage({target});
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
 addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='compass-theme'&&['light','dark'].includes(event.data.theme))document.documentElement.dataset.theme=event.data.theme;});
 addEventListener('scroll',()=>parent.postMessage({type:'compass-scroll',y:scrollY},'*'),{passive:true});
 document.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files'))parent.postMessage({type:'compass-drag'},'*');});
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a)return;
  const raw=a.getAttribute('href'),path=raw.split('#')[0],index=names.indexOf(path.split('?')[0]);
  if(index>=0){e.preventDefault();parent.postMessage({type:'compass-page',index,hash:raw.split('#')[1]||'',query:new URLSearchParams(path.split('?')[1]||'').get('compass-find')||''},'*');}
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
function showPage({target='',hash='',query=''}={}){
 if(!pages[activePage])return;
 const page=pages[activePage];if(lastHTML===page.html&&!hash&&!target&&!query)return;
 discardPendingFrame();
 const config=JSON.stringify({scroll:previewScroll,target,hash,names:pages.map(p=>p.name)}).replace(/</g,'\\u003c');
 const navigation='<script>('+previewNavigation.toString()+')('+config+');<\/script>';
 // srcdoc inherits the workspace URL as its base; keep fragment links local.
 let html=page.html.replace('<html lang="en"','<html lang="en" data-theme="'+(document.documentElement.dataset.theme||'light')+'"').replace('<head>',()=>'<head><base href="about:srcdoc"><script>window.__compassHash='+JSON.stringify(hash).replace(/</g,'\\u003c')+';window.__compassQuery='+JSON.stringify(query).replace(/</g,'\\u003c')+';<\/script>').replace('</body>',navigation+'</body>');
 html=printPreviewHTML(html);
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
 const index=Number(event.data.index);if(Number.isInteger(index)&&pages[index]){activePage=index;previewScroll=0;$('#preview-page').value=index;showPage({hash:String(event.data.hash||''),query:String(event.data.query||'')});}
});
$('#preview-page').addEventListener('change',event=>{activePage=Number(event.target.value);previewScroll=0;showPage();});$('#start-preview').addEventListener('click',()=>preview());$('#hide-drawer').addEventListener('click',()=>window.CompassMotion.transition($('#drawer'),false,()=>document.body.classList.add('drawer-hidden'),'drawer'));$('#show-drawer').addEventListener('click',()=>window.CompassMotion.transition($('#drawer'),true,()=>document.body.classList.remove('drawer-hidden'),'drawer'));
$$('[data-viewport]').forEach(button=>button.addEventListener('click',()=>{$$('[data-viewport]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#preview-canvas').style.setProperty('--preview-width',button.dataset.viewport==='full'?'100%':'calc('+button.dataset.viewport+'px * var(--preview-zoom))');}));
$$('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{$$('[data-zoom]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#preview-canvas').style.setProperty('--preview-zoom',button.dataset.zoom);}));
async function browse(path='.'){
 try{const result=await (await api('/api/files?path='+encodeURIComponent(path))).json();$('#folder-path').value=result.path;folderParent=result.parent;$('#folder-up').disabled=folderParent===null;$('#browser-entries').replaceChildren();for(const item of result.entries){
  if(item.directory){const button=element('button','browser-entry directory');button.innerHTML=icon('folder-open');button.append(element('span','',item.name));button.addEventListener('click',()=>browse(item.path));$('#browser-entries').append(button);}else{const row=element('label','browser-entry'),input=element('input');input.type='checkbox';input.checked=selectedFiles.has(item.path);input.addEventListener('change',()=>{if(input.checked)selectedFiles.set(item.path,item);else selectedFiles.delete(item.path);$('#selection-count').textContent=selectedFiles.size+' Selected';});row.append(input,element('span','',item.name),element('small','','Markdown'));$('#browser-entries').append(row);}}
  if(!result.entries.length)$('#browser-entries').append(element('p','empty-note','No folders or Markdown files here.'));
 }catch(error){status(error.message,true);}
}
$('#browse').addEventListener('click',async()=>{try{if(!await window.CompassBrowser.connectWorkspace())return;selectedFiles.clear();$('#selection-count').textContent='0 Selected';$('#workspace-root').textContent=window.CompassBrowser.root;window.CompassMotion.transition($('#file-browser'),true,()=>$('#file-browser').showModal());browse();}catch(error){if(error.name!=='AbortError')status(error.message,true);}});$('#file-browser').addEventListener('cancel',event=>{event.preventDefault();window.CompassMotion.transition($('#file-browser'),false,()=>$('#file-browser').close());});$('#close-browser').addEventListener('click',()=>window.CompassMotion.transition($('#file-browser'),false,()=>$('#file-browser').close()));$('#folder-up').addEventListener('click',()=>browse(folderParent));$('#folder-go').addEventListener('click',()=>browse($('#folder-path').value));$('#folder-path').addEventListener('keydown',e=>{if(e.key==='Enter')browse(e.target.value);});
$('#add-selected').addEventListener('click',()=>{for(const item of selectedFiles.values()){if(!project.files.some(file=>file.path===item.path))project.files.push({name:item.name,path:item.path,title:''});}window.CompassMotion.transition($('#file-browser'),false,()=>$('#file-browser').close());renderFiles();changed();});
function download(blob,name){const url=URL.createObjectURL(blob),link=element('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('#save-project').addEventListener('click',async()=>{try{const clean=await (await api('/api/project?portable=1',project)).json();download(new Blob([JSON.stringify({...clean,workspace:root},null,2)],{type:'application/json'}),'compass.json');status('Project Saved');}catch(error){status(error.message,true);}});
async function loadExample(name){try{closeSource();project=await (await api('/api/project',window.CompassBrowser.examples[name])).json();activePage=0;previewScroll=0;history.reset(project);sync();changed({record:false});await preview();}catch(error){status(error.message,true);}}
$('#load-example')?.addEventListener('click',()=>loadExample('demo'));
$('#load-combined-example')?.addEventListener('click',()=>loadExample('combined'));
$('#download-app')?.addEventListener('click',()=>{const link=element('a');link.href=new URL('compass.html',location.href).href;link.download='compass.html';document.body.append(link);link.click();link.remove();});
$('#open-project').addEventListener('click',()=>$('#project-input').click());$('#project-input').addEventListener('change',async event=>{try{const value=JSON.parse(await event.target.files[0].text());const clean=await (await api('/api/project',value)).json();closeSource();project=clean;activePage=0;previewScroll=0;history.reset(project);sync();changed({record:false});status(value.workspace&&value.workspace!==root?'Project Opened. Linked paths use this workspace: '+root:'Project Opened');}catch(error){status(error.message,true);}event.target.value='';});
$('#export').addEventListener('click',async()=>{
 const button=$('#export');button.disabled=true;button.textContent='Building…';
 try{
  // Check and export the same materialized snapshot, including linked sources.
  const report=await (await api('/api/preview',project)).json();renderChecks(report.issues||[]);
  const response=await api('/api/export',report.project||project),name=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||'publication.html';
  download(await response.blob(),name);status('Publication Exported'+(report.issues?.length?' · '+report.issues.length+' items to review in Publish':''));
 }catch(error){status(error.message,true);}finally{syncOutput();button.disabled=!project.files.length;}
});
function syncHistory(){if(!history)return;$('#undo-project').disabled=!history.canUndo;$('#redo-project').disabled=!history.canRedo;}
function restoreHistory(direction){
 const value=history?.[direction]();if(!value)return;
 project=value;activePage=Math.min(activePage,Math.max(0,project.mode==='separate'?project.files.length-1:0));sync();changed({immediate:true,record:false});
}
$('#undo-project').addEventListener('click',()=>restoreHistory('undo'));
$('#redo-project').addEventListener('click',()=>restoreHistory('redo'));
document.addEventListener('keydown',event=>{
 if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
 const key=event.key.toLowerCase();if(!['z','y'].includes(key))return;
 if(event.target.matches('input,textarea,[contenteditable=true]')&&event.target.id!=='source-text')return;
 event.preventDefault();restoreHistory(key==='y'||event.shiftKey?'redo':'undo');
});
for(const [id,key] of [['body-font','body_font'],['heading-font','heading_font'],['print-paper','print_paper'],['print-margin','print_margin'],['print-chapters','print_chapters']]){
 $('#'+id).addEventListener('input',event=>{
  if(event.target.type==='number'&&(event.target.value===''||!event.target.validity.valid))return;
  project.options[key]=event.target.type==='checkbox'?event.target.checked:event.target.type==='number'?Number(event.target.value):event.target.value;changed();
 });
}
$('#print-margin').addEventListener('blur',()=>$('#print-margin').value=project.options.print_margin);
for(const [id,key] of [['brand-name','name'],['brand-footer','footer']])$('#'+id).addEventListener('input',event=>{project.branding[key]=event.target.value;changed();});
for(const key of ['logo','favicon']){
 $('#upload-'+key).addEventListener('click',()=>{brandingTarget=key;$('#branding-input').click();});
 $('#remove-'+key).addEventListener('click',()=>{project.branding[key]='';sync();changed();});
}
$('#branding-input').addEventListener('change',async event=>{
 const file=event.target.files?.[0],target=brandingTarget;if(!file)return;
 try{if(file.size>2*1024*1024)throw Error('Choose an image under 2 MB.');const value=normalizeBranding({[target]:await dataURL(file)})[target];if(!value)throw Error('Choose a PNG, JPEG, WebP, GIF, AVIF, or SVG image.');project.branding[target]=value;sync();changed();}
 catch(error){status(error.message,true);}finally{event.target.value='';}
});
$('#save-design').addEventListener('click',()=>{const preset=createDesignPreset(project.options,$('#design-name').value);download(new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}),'compass-design.json');status('Design Saved');});
$('#import-design').addEventListener('click',()=>$('#design-input').click());
$('#design-input').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{if(file.size>64*1024)throw Error('Choose a design preset under 64 KB.');const preset=readDesignPreset(JSON.parse(await file.text()));Object.assign(project.options,preset.options);$('#design-name').value=preset.name;sync();changed({immediate:true});status('Design Imported');}
 catch(error){status(error.message,true);}finally{event.target.value='';}
});
function renderChecks(issues){
 const list=$('#check-results');list.replaceChildren();list.classList.remove('checks-stale');
 $('#check-summary').textContent=issues.length?issues.length+' item'+(issues.length===1?'':'s')+' to review.':'No issues found in local links, images, heading order, or offline dependencies.';
 for(const issue of issues){
  const button=element('button','check-result'),label=element('strong','',issue.source),message=element('span','',issue.message);button.type='button';button.append(label,message);
  button.addEventListener('click',async()=>{if(!editing)await preview();activePage=project.mode==='separate'?issue.file:0;previewScroll=0;$('#preview-page').value=activePage;showPage({hash:issue.target});});list.append(button);
 }
}
$('#check-publication').addEventListener('click',async()=>{
 const button=$('#check-publication'),revision=checkRevision;button.disabled=true;$('#check-summary').textContent='Checking publication…';
 try{const result=await (await api('/api/preview',project)).json();if(revision===checkRevision){pages=result.pages;renderChecks(result.issues||[]);}else $('#check-summary').textContent='Changes made during the check. Check again to review this version.';}
 catch(error){$('#check-summary').textContent=error.message;status(error.message,true);}finally{button.disabled=false;}
});
function syncSource(){
 if(!sourceKey)return;
 const file=project.files.find(file=>(file.path||file.name)===sourceKey);if(!file){closeSource();return;}
 const text=file.text??sourceOriginal?.text??'';
 if($('#source-text').value!==text)$('#source-text').value=text;
 $('#source-editor-help').textContent=file.path?'Typing creates a local copy. The linked original is not changed.':'Edits are saved in this project and update the preview.';
}
async function openSource(index){
 const file=project.files[index],token=++sourceRequest;if(!file)return;
 try{
  const loaded=typeof file.text==='string'?file:(await (await api('/api/project?portable=1',{...project,files:[file]})).json()).files[0];
  if(token!==sourceRequest||!project.files.includes(file))return;
  if(!editing)await preview();
  if(token!==sourceRequest||!project.files.includes(file))return;
  if(!sourceKey)drawerWasHidden=document.body.classList.contains('drawer-hidden');
  sourceKey=file.path||file.name;sourceOriginal=loaded;
  $('#source-editor-title').textContent='Edit '+sourceKey;$('#source-editor').hidden=false;document.body.classList.add('source-editing','drawer-hidden');syncSource();$('#source-editor-status').textContent='';$('#source-text').focus();$('#source-text').setSelectionRange(0,0);$('#source-text').scrollTop=0;
 }catch(error){status(error.message,true);}
}
function closeSource(){
 ++sourceRequest;if(!sourceKey)return;sourceKey='';sourceOriginal=null;$('#source-editor').hidden=true;document.body.classList.remove('source-editing');if(!drawerWasHidden)document.body.classList.remove('drawer-hidden');
}
$('#close-source').addEventListener('click',()=>{closeSource();$('[data-tab=files]').click();});
$('#source-text').addEventListener('input',event=>{
 const index=project.files.findIndex(file=>(file.path||file.name)===sourceKey);if(index<0)return;
 const file=project.files[index];
 project.files[index]={...file,name:sourceKey,text:event.target.value,assets:{...(sourceOriginal?.assets||{}),...(file.assets||{})}};delete project.files[index].path;
 $('#source-editor-help').textContent='Edits are saved in this project and update the preview.';$('#source-editor-status').textContent='Local copy saved';renderFiles();changed();
});
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
let printFrame=null;
$('#print-publication').addEventListener('click',async()=>{
 const button=$('#print-publication');button.disabled=true;
 try{
  const result=await (await api('/api/preview',{...project,mode:'combined'})).json();renderChecks(result.issues||[]);printFrame?.remove();
  const frame=element('iframe');frame.id='print-frame';frame.title='Print Publication';frame.setAttribute('sandbox','allow-scripts allow-modals');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;printFrame=frame;
  frame.srcdoc=result.pages[0].html.replace('</body>','<script>addEventListener("afterprint",()=>parent.postMessage({type:"compass-printed"},"*"),{once:true});addEventListener("load",()=>{focus();print();},{once:true});<\/script></body>');document.body.append(frame);
  status('Opening print preview. Choose Save as PDF in the print dialog.');
 }catch(error){status(error.message,true);}finally{button.disabled=false;}
});
window.addEventListener('message',event=>{if(event.source===printFrame?.contentWindow&&event.data?.type==='compass-printed'){printFrame.remove();printFrame=null;}});
async function start(){
 try{const session=await (await api('/api/session')).json();defaults=session.defaults;root=session.root;project={version:1,name:'Untitled Publication',title:'',subtitle:'',author:'',mode:'combined',safe:true,chapter_titles:true,options:{...defaults},files:[]};
  draftKey='compass-project:'+root;
  if(session.project){project=session.project;draftKey+=':startup:'+project.name;}
  else try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(draft)project=await (await api('/api/project',draft)).json();}catch(_){}
  project=normalizeProject(project);if(!project.id)project.id=window.crypto?.randomUUID?.()||'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);history=createHistory(project);buildControls();sync();syncHistory();
  $('#save-state').textContent='';
  $('#source-help').textContent=window.showDirectoryPicker?'Import a snapshot, or link a folder for live updates.':'Folders include local images. Reimport to refresh their contents.';
  $$('.browser-examples').forEach(el=>el.hidden=false);
  if(location.protocol!=='file:')$('#download-app').hidden=false;
  if(session.project&&project.files.length)await preview();
  // Linked sources are re-read on each preview; unchanged output leaves the frame alone.
  setInterval(()=>{if(editing&&!inFlight&&project.files.some(file=>file.path)&&document.visibilityState!=='hidden')preview(true);},4000);
 }catch(error){status(error.message,true);}
}
start();
})();
