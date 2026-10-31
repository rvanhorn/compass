import {transition} from '../shared/motion.js';
import {icon} from '../shared/icons.mjs';
import {$,element,status,api,dataURL,download,getBackend,root,project,history,setProject,setActivePage,setPreviewScroll} from './state.js';
import {changed,preview} from './preview.js';
import {renderFiles} from './pages.js';
import {closeSource} from './source.js';
import {sync} from './sync.js';

let dragDepth=0,folderParent=null;
const selectedFiles=new Map();
function relativePath(from,to){const a=from.split('/').slice(0,-1),b=to.split('/');while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift();}return [...a.map(()=>'..'),...b].join('/');}
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
// A drag that enters the preview frame reaches the workspace only as a message.
export function showFileDrop(){dragDepth=1;document.body.classList.add('drag-files');}
document.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();dragDepth++;document.body.classList.add('drag-files');}});
document.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
document.addEventListener('dragleave',()=>{if(--dragDepth<=0){dragDepth=0;document.body.classList.remove('drag-files');}});
document.addEventListener('drop',async e=>{if(![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();dragDepth=0;document.body.classList.remove('drag-files');try{const entries=[...e.dataTransfer.items].map(item=>item.webkitGetAsEntry?.()).filter(Boolean);const files=entries.length?(await Promise.all(entries.map(entry=>collectEntries(entry)))).flat():[...e.dataTransfer.files];await importFiles(files);}catch(error){status(error.message,true);}});
$('#dropzone').addEventListener('click',()=>$('#file-input').click());$('#dropzone').addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();$('#file-input').click();}});
$('#file-input').addEventListener('change',async event=>{await importFiles(event.target.files);event.target.value='';});$('#folder-input').addEventListener('change',async event=>{await importFiles(event.target.files);event.target.value='';});$('#folder-upload').addEventListener('click',()=>$('#folder-input').click());
async function browse(path='.'){
 try{const result=await (await api('/api/files?path='+encodeURIComponent(path))).json();$('#folder-path').value=result.path;folderParent=result.parent;$('#folder-up').disabled=folderParent===null;$('#browser-entries').replaceChildren();for(const item of result.entries){
  if(item.directory){const button=element('button','browser-entry directory');button.innerHTML=icon('folder-open');button.append(element('span','',item.name));button.addEventListener('click',()=>browse(item.path));$('#browser-entries').append(button);}else{const row=element('label','browser-entry'),input=element('input');input.type='checkbox';input.checked=selectedFiles.has(item.path);input.addEventListener('change',()=>{if(input.checked)selectedFiles.set(item.path,item);else selectedFiles.delete(item.path);$('#selection-count').textContent=selectedFiles.size+' Selected';});row.append(input,element('span','',item.name),element('small','','Markdown'));$('#browser-entries').append(row);}}
  if(!result.entries.length)$('#browser-entries').append(element('p','empty-note','No folders or Markdown files here.'));
 }catch(error){status(error.message,true);}
}
$('#browse').addEventListener('click',async()=>{try{if(!await getBackend().connectWorkspace())return;selectedFiles.clear();$('#selection-count').textContent='0 Selected';$('#workspace-root').textContent=getBackend().root;transition($('#file-browser'),true,()=>$('#file-browser').showModal());browse();}catch(error){if(error.name!=='AbortError')status(error.message,true);}});$('#file-browser').addEventListener('cancel',event=>{event.preventDefault();transition($('#file-browser'),false,()=>$('#file-browser').close());});$('#close-browser').addEventListener('click',()=>transition($('#file-browser'),false,()=>$('#file-browser').close()));$('#folder-up').addEventListener('click',()=>browse(folderParent));$('#folder-go').addEventListener('click',()=>browse($('#folder-path').value));$('#folder-path').addEventListener('keydown',e=>{if(e.key==='Enter')browse(e.target.value);});
$('#add-selected').addEventListener('click',()=>{for(const item of selectedFiles.values()){if(!project.files.some(file=>file.path===item.path))project.files.push({name:item.name,path:item.path,title:''});}transition($('#file-browser'),false,()=>$('#file-browser').close());renderFiles();changed();});
$('#save-project').addEventListener('click',async()=>{try{const clean=await (await api('/api/project?portable=1',project)).json();download(new Blob([JSON.stringify({...clean,workspace:root},null,2)],{type:'application/json'}),'compass.json');status('Project Saved');}catch(error){status(error.message,true);}});
// Replaces the open project; undo history starts again from the loaded one.
function openProject(value){closeSource();setProject(value);setActivePage(0);setPreviewScroll(0);history.reset(project);sync();changed({record:false});}
async function loadExample(name){try{closeSource();openProject(await (await api('/api/project',getBackend().examples[name])).json());await preview();}catch(error){status(error.message,true);}}
$('#load-example')?.addEventListener('click',()=>loadExample('demo'));
$('#load-combined-example')?.addEventListener('click',()=>loadExample('combined'));
$('#download-app')?.addEventListener('click',()=>{const link=element('a');link.href=new URL('compass.html',location.href).href;link.download='compass.html';document.body.append(link);link.click();link.remove();});
$('#open-project').addEventListener('click',()=>$('#project-input').click());$('#project-input').addEventListener('change',async event=>{try{const value=JSON.parse(await event.target.files[0].text());openProject(await (await api('/api/project',value)).json());status(value.workspace&&value.workspace!==root?'Project Opened. Linked paths use this workspace: '+root:'Project Opened');}catch(error){status(error.message,true);}event.target.value='';});
for(const [id,target] of [['add-files','#file-input'],['add-folder','#folder-input']])$('#'+id).addEventListener('click',()=>$(target).click());
$('#link-folder').addEventListener('click',()=>$('#browse').click());
