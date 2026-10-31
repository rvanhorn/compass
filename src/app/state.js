// Shared workspace state. Other modules read these live bindings and change them only through the setters below.
// This module imports no other app module, so it is always evaluated before the modules that use it.
export let defaults={},root='',draftKey='',project=null,history=null;
export let editing=false,reading=false,activePage=0,pages=[],previewScroll=0,searchIndex=null,checkRevision=0;
let backend=null;
export function $(s){return document.querySelector(s);}
export function $$(s){return [...document.querySelectorAll(s)];}
// Key labels are written in Mac form (⌘, ⇧); other systems show Ctrl and Shift.
export const isMac=/Mac|iPhone|iPad/.test(navigator.platform);
export function keyLabel(text){return isMac?text:text.replace('⌘','Ctrl ').replace('⇧','Shift ');}
export function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
export function status(message,error=false){$('#status').textContent=message;$('#status').classList.toggle('error',error);$('#status').hidden=false;clearTimeout(status.timeout);status.timeout=setTimeout(()=>$('#status').hidden=true,error?9000:3500);}
export const api=(path,data,signal)=>backend.request(path,data,signal);
export const getBackend=()=>backend;
export function setBackend(value){backend=value;}
export function setSession(value){({defaults,root,draftKey}=value);}
export function setProject(value){project=value;}
export function setHistory(value){history=value;}
export function setEditing(value){editing=value;}
export function setReading(value){reading=value;}
export function setActivePage(value){activePage=value;}
export function setPages(value){pages=value;}
export function setPreviewScroll(value){previewScroll=value;}
export function setSearchIndex(value){searchIndex=value;}
export function bumpCheckRevision(){return ++checkRevision;}
export function saveDraft(){
 try{localStorage.setItem(draftKey,JSON.stringify(project));$('#save-state').textContent='Changes saved on this device';}
 catch(_){$('#save-state').textContent='Use Save Project to keep changes';}
}
// Settings panel preferences, kept per browser. open is null until the owner opens or closes the panel once.
// Version 1 also stored a side and a floating flag. The rail fixed the side and made floating the default, so only open carries over.
const panelKey='compass-panel';
export function panelPrefs(){
 try{
  const value=JSON.parse(localStorage.getItem(panelKey)||'null');
  if(value?.version===1||value?.version===2)return {open:typeof value.open==='boolean'?value.open:null,docked:value.version===2&&value.docked===true};
 }catch(_){}
 return {open:null,docked:false};
}
export function savePanelPrefs(change){
 const {open,docked}={...panelPrefs(),...change};
 try{localStorage.setItem(panelKey,JSON.stringify({version:2,open,docked}));}catch(_){}
}
export function download(blob,name){const url=URL.createObjectURL(blob),link=element('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export async function dataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read '+file.name));reader.readAsDataURL(file);});}
