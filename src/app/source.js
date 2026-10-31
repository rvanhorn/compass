import {$,status,api,project,editing} from './state.js';
import {changed,preview} from './preview.js';
import {renderFiles} from './pages.js';
import {transition} from '../shared/motion.js';

let sourceKey='',sourceOriginal=null,sourceRequest=0,drawerWasHidden=false;
export function syncSource(){
 if(!sourceKey)return;
 const file=project.files.find(file=>(file.path||file.name)===sourceKey);if(!file){closeSource();return;}
 const text=file.text??sourceOriginal?.text??'';
 if($('#source-text').value!==text)$('#source-text').value=text;
 $('#source-editor-help').textContent=file.path?'Typing creates a local copy. The linked original is not changed.':'Edits are saved in this project and update the preview.';
}
export async function openSource(index){
 const file=project.files[index],token=++sourceRequest;if(!file)return;
 try{
  const loaded=typeof file.text==='string'?file:(await (await api('/api/project?portable=1',{...project,files:[file]})).json()).files[0];
  if(token!==sourceRequest||!project.files.includes(file))return;
  if(!editing)await preview();
  if(token!==sourceRequest||!project.files.includes(file))return;
  if(!sourceKey)drawerWasHidden=document.body.classList.contains('drawer-hidden');
  sourceKey=file.path||file.name;sourceOriginal=loaded;
  $('#source-editor-title').textContent='Edit '+sourceKey;transition($('#source-editor'),true,()=>$('#source-editor').hidden=false,'drawer');document.body.classList.add('source-editing','drawer-hidden');syncSource();$('#source-editor-status').textContent='';$('#source-text').focus();$('#source-text').setSelectionRange(0,0);$('#source-text').scrollTop=0;
 }catch(error){status(error.message,true);}
}
export function closeSource(){
 ++sourceRequest;if(!sourceKey)return;sourceKey='';sourceOriginal=null;transition($('#source-editor'),false,()=>$('#source-editor').hidden=true,'drawer');document.body.classList.remove('source-editing');if(!drawerWasHidden)document.body.classList.remove('drawer-hidden');
}
$('#close-source').addEventListener('click',()=>closeSource());
$('#source-text').addEventListener('input',event=>{
 const index=project.files.findIndex(file=>(file.path||file.name)===sourceKey);if(index<0)return;
 const file=project.files[index];
 project.files[index]={...file,name:sourceKey,text:event.target.value,assets:{...(sourceOriginal?.assets||{}),...(file.assets||{})}};delete project.files[index].path;
 $('#source-editor-help').textContent='Edits are saved in this project and update the preview.';$('#source-editor-status').textContent='Local copy saved';renderFiles();changed();
});
