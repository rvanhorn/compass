import {$,element,status,api,download,project,editing,checkRevision,setPages} from './state.js';
import {changed,preview,goToPage} from './preview.js';
import {syncOutput} from './pages.js';

export const PRINT_KEYS=['print_paper','print_margin','print_chapters'];
$('#export').addEventListener('click',async()=>{
 const button=$('#export');button.disabled=true;button.textContent='Building…';
 try{
  // Check and export the same materialized snapshot, including linked sources.
  const report=await (await api('/api/preview',project)).json();renderChecks(report.issues||[]);
  const response=await api('/api/export',report.project||project),name=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||'publication.html';
  download(await response.blob(),name);status('Publication Exported'+(report.issues?.length?' · '+report.issues.length+' items to review in Publish':''));
 }catch(error){status(error.message,true);}finally{syncOutput();button.disabled=!project.files.length;}
});
for(const [id,key] of [['print-paper','print_paper'],['print-margin','print_margin'],['print-chapters','print_chapters']]){
 $('#'+id).addEventListener('input',event=>{
  if(event.target.type==='number'&&(event.target.value===''||!event.target.validity.valid))return;
  project.options[key]=event.target.type==='checkbox'?event.target.checked:event.target.type==='number'?Number(event.target.value):event.target.value;changed();
 });
}
$('#print-margin').addEventListener('blur',()=>$('#print-margin').value=project.options.print_margin);
export function renderChecks(issues){
 const list=$('#check-results');list.replaceChildren();list.classList.remove('checks-stale');
 $('#check-summary').textContent=issues.length?issues.length+' item'+(issues.length===1?'':'s')+' to review.':'No issues found in local links, images, heading order, or offline dependencies.';
 for(const issue of issues){
  const button=element('button','check-result'),label=element('strong','',issue.source),message=element('span','',issue.message);button.type='button';button.append(label,message);
  button.addEventListener('click',async()=>{if(!editing)await preview();goToPage(issue.page??(project.mode==='separate'?issue.file:0),{hash:issue.target});});list.append(button);
 }
}
$('#check-publication').addEventListener('click',async()=>{
 const button=$('#check-publication'),revision=checkRevision;button.disabled=true;$('#check-summary').textContent='Checking publication…';
 try{const result=await (await api('/api/preview',project)).json();if(revision===checkRevision){setPages(result.pages);renderChecks(result.issues||[]);}else $('#check-summary').textContent='Changes made during the check. Check again to review this version.';}
 catch(error){$('#check-summary').textContent=error.message;status(error.message,true);}finally{button.disabled=false;}
});
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
