import {transition,details,install as installMotion} from '../shared/motion.js';
import {icon} from '../shared/icons.mjs';
import {$,$$,element,status,api,project,pages} from './state.js';
import {changed} from './preview.js';
import {openSource} from './source.js';

let dragIndex=null;
export function renderFiles(){
 const list=$('#file-list');list.replaceChildren();$('#file-count').textContent=project.files.length;$('#files-empty').hidden=!!project.files.length;$('#clear-files').disabled=!project.files.length;$('#export').disabled=!project.files.length;syncOutput();syncEmpty();
 $('#document-summary').textContent=project.files.length?project.files.length+' file'+(project.files.length===1?'':'s')+' added':'No files added';syncTitle();
 project.files.forEach((file,index)=>{
  const card=element('li','file-card');card.draggable=true;card.dataset.index=index;
  const grip=element('span','file-grip');grip.innerHTML=icon('grip');grip.setAttribute('aria-hidden','true');
  const info=element('div','file-info'),name=element('strong','',file.title||file.name.split('/').pop());info.append(name,element('small','',file.name.split('/').pop()+(file.path?' · Linked':'')));
  const menu=element('details','file-menu'),summary=element('summary');summary.innerHTML=icon('ellipsis');summary.setAttribute('aria-label','Actions for '+file.name);menu.append(summary);
  const actions=element('div','file-menu-actions');
  const editor=element('div','file-title-editor');editor.hidden=true;const titleLabel=element('label','', 'Chapter Title'),title=element('input');title.id='file-title-'+index;titleLabel.htmlFor=title.id;title.placeholder='Automatic';title.value=file.title||'';title.setAttribute('aria-label','Chapter Title for '+file.name);
  title.addEventListener('input',()=>{file.title=title.value;name.textContent=file.title||file.name.split('/').pop();changed();});title.addEventListener('pointerdown',e=>e.stopPropagation());
  const done=element('button');done.innerHTML=icon('check');done.setAttribute('aria-label','Done Editing Title');done.addEventListener('click',()=>transition(editor,false,()=>editor.hidden=true));editor.append(titleLabel,title,done);
  const edit=element('button');edit.innerHTML=icon('pencil')+'<span>Edit Chapter Title</span>';edit.addEventListener('click',()=>{details(menu,false);transition(editor,true,()=>editor.hidden=false);title.focus();});actions.append(edit);
  for(const [label,direction] of [['Move Up',-1],['Move Down',1]]){const button=element('button');button.innerHTML=icon(direction<0?'arrow-up':'arrow-down')+'<span>'+label+'</span>';button.disabled=index+direction<0||index+direction>=project.files.length;button.setAttribute('aria-label','Move '+file.name+(direction<0?' Up':' Down'));button.addEventListener('click',()=>moveFile(index,index+direction));actions.append(button);}
  const source=element('button');source.innerHTML=icon('file-text')+'<span>Edit Markdown</span>';source.addEventListener('click',()=>{details(menu,false);openSource(index);});actions.append(source);
  const remove=element('button','remove');remove.innerHTML=icon('trash')+'<span>Remove</span>';remove.setAttribute('aria-label','Remove '+file.name);remove.addEventListener('click',()=>{project.files.splice(index,1);renderFiles();changed();});actions.append(remove);menu.append(actions);card.append(grip,info,menu,editor);list.append(card);installMotion(card);
  menu.addEventListener('toggle',()=>{if(menu.open)$$('.file-menu').filter(other=>other!==menu).forEach(other=>details(other,false));});
  card.addEventListener('dragstart',event=>{if(event.target.closest('input,button,summary')){event.preventDefault();return;}dragIndex=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/compass-index',index);card.classList.add('dragging');});
  card.addEventListener('dragover',event=>{if(dragIndex!==null){event.preventDefault();card.classList.add('drag-over');}});
  card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
  card.addEventListener('drop',event=>{if(dragIndex!==null){event.preventDefault();event.stopPropagation();moveFile(dragIndex,index);dragIndex=null;}});
  card.addEventListener('dragend',()=>{dragIndex=null;$$('.file-card').forEach(c=>c.classList.remove('drag-over','dragging'));});
 });
}
document.addEventListener('click',event=>$$('.file-menu[open]').forEach(menu=>{if(!menu.contains(event.target))details(menu,false);}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')$$('.file-menu[open]').forEach(menu=>{details(menu,false);menu.querySelector('summary').focus();});});
function moveFile(from,to){if(to<0||to>=project.files.length)return;project.files.splice(to,0,project.files.splice(from,1)[0]);renderFiles();changed();}
$('#clear-files').addEventListener('click',()=>{project.files=[];renderFiles();changed();});
for(const [id,key] of [['project-name','name'],['publication-title','title'],['subtitle','subtitle'],['author','author'],['mode','mode'],['safe','safe'],['chapter-titles','chapter_titles']])$('#'+id).addEventListener('input',event=>{project[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;if(key==='mode')syncOutput();renderFiles();changed({immediate:event.target.type==='checkbox'||event.target.tagName==='SELECT',target:key==='chapter_titles'?key:''});});
const LAYOUTS={combined:['One HTML file','All files flow into one continuous page.'],separate:['Linked pages in a ZIP','Each Markdown file becomes its own page.'],heading:['Linked pages in a ZIP','A new page starts at each H1 heading.']};
export function syncOutput(){
 $$('[name=output-mode]').forEach(input=>input.checked=input.value===project.mode);
 const many=project.mode!=='combined'&&(project.files.length>1||pages.length>1);
 $('#export').innerHTML=icon('download')+'<span>Download '+(many?'ZIP':'HTML')+'</span>';
 $('#chapter-titles').closest('.toggle-row').hidden=project.mode!=='combined'||project.files.length<2;
 const [summary,detail]=LAYOUTS[project.mode]||LAYOUTS.combined,count=project.mode!=='combined'&&pages.length?' ('+pages.length+' pages)':'';
 $('#layout-note').textContent=detail+count;$('#output-summary').textContent=many?summary:'One HTML file';$('#output-detail').textContent=detail+count;
 $('#page-breaks-group').hidden=project.mode!=='heading';
 $('#footer-note').textContent=$('#export').hidden?'':(many?'ZIP':'HTML');
}
$$('[name=output-mode]').forEach(input=>input.addEventListener('change',()=>{if(input.checked){$('#mode').value=input.value;$('#mode').dispatchEvent(new Event('input',{bubbles:true}));syncOutput();}}));
export function syncEmpty(){
 const empty=!project?.files.length;
 document.body.classList.toggle('is-empty',empty);$('#empty-state').hidden=!empty;
 $$('.needs-doc').forEach(button=>button.disabled=empty);
}
function syncTitle(){
 const first=project.files[0];
 const title=project.title||(project.name!=='Untitled Publication'?project.name:'')||first?.title||(first?first.name.split('/').pop().replace(/\.[^.]+$/,''):'')||'Compass';
 $('#dock-title').textContent=title;$('#project-mark').title=title;
}

// ---------- Page Breaks: H1 headings start pages in Page per H1 ----------
const headingTexts=new Map();
async function loadText(file){
 if(typeof file.text==='string')return file.text;
 const key=file.path||file.name;if(headingTexts.has(key))return headingTexts.get(key);
 const loaded=(await (await api('/api/project?portable=1',{...project,files:[file]})).json()).files[0];
 headingTexts.set(key,loaded.text||'');return loaded.text||'';
}
function headingsOf(text){
 const result=[];let fence=false;
 text.split('\n').forEach((line,index)=>{if(/^\s*(```|~~~)/.test(line)){fence=!fence;return;}if(fence)return;const match=line.match(/^(#{1,2})\s+(.+?)\s*#*\s*$/);if(match)result.push({index,level:match[1].length,title:match[2]});});
 return result;
}
let breaksRequest=0;
export async function renderBreaks(){
 if(project.mode!=='heading'){$('#page-breaks').replaceChildren();return;}
 const token=++breaksRequest,box=element('div');
 for(const [fileIndex,file] of project.files.entries()){
  let text;try{text=await loadText(file);}catch(error){text=null;}
  if(token!==breaksRequest)return;
  box.append(element('div','break-file',file.title||file.name.split('/').pop()));
  const headings=text===null?[]:headingsOf(text);
  if(!headings.length){box.append(element('p','cx-help',text===null?'This linked file could not be read.':'No H1 or H2 headings.'));continue;}
  for(const heading of headings){
   const row=element('label','cx-row toggle-row break-row'),copy=element('span','cx-row-text');
   copy.append(element('span','',heading.title));
   const input=element('input','cx-switch');input.type='checkbox';input.checked=heading.level===1;input.setAttribute('aria-label','New page at '+heading.title);
   input.addEventListener('change',()=>setHeadingLevel(fileIndex,heading.index,input.checked?1:2));
   row.append(copy,input);box.append(row);
  }
 }
 if(token===breaksRequest)$('#page-breaks').replaceChildren(...box.childNodes);
}
const headingKey=text=>text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
export async function promoteHeading(source,title){
 const fileIndex=project.files.findIndex(file=>(file.path||file.name)===source);if(fileIndex<0)return;
 try{const heading=headingsOf(await loadText(project.files[fileIndex])).find(item=>item.level===2&&headingKey(item.title.replace(/[`*_]/g,''))===headingKey(title));if(heading)setHeadingLevel(fileIndex,heading.index,1);}
 catch(error){status(error.message,true);}
}
async function setHeadingLevel(fileIndex,lineIndex,level){
 const file=project.files[fileIndex];if(!file)return;
 try{
  const text=await loadText(file),lines=text.split('\n'),match=lines[lineIndex]?.match(/^(#{1,2})(\s+.*)$/);if(!match)return;
  lines[lineIndex]='#'.repeat(level)+match[2];
  const name=file.path||file.name,assets=file.assets||{};
  project.files[fileIndex]={...file,name,text:lines.join('\n'),assets};delete project.files[fileIndex].path;headingTexts.delete(name);
  renderFiles();changed({immediate:true});renderBreaks();
  status(level===1?'A new page starts at that heading.':'That heading joined the page before it.');
 }catch(error){status(error.message,true);}
}
