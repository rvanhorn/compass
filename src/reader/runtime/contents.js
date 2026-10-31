import {$,$$,enabled} from './dom.js';
import {revealOutlineLink} from './outline.js';

// Contents docks beside the page by default and opens there on wide screens; a reader can float or close it.
// The docked choice is a reader preference. The first key was written on every load, so it held "not docked" for
// readers who never chose; the v2 key is written only when a reader pins or unpins.
const contents=$('.right-rail'),contentsButton=$('#mobile-menu'),dockKey='compass-contents-docked-v2';
let docked=true;try{const saved=enabled('remember')?localStorage.getItem(dockKey):null;if(saved!==null)docked=saved==='1';}catch(_){}
function setContents(open){
  if(!contents)return;
  contents.classList.toggle('open',open);document.body.classList.toggle('contents-visible',open);contentsButton?.setAttribute('aria-expanded',String(open));
  if(open){const active=$('a.active',contents);if(active)revealOutlineLink(active);}
}
function setDocked(value,{save=true}={}){
  docked=value;document.body.classList.toggle('contents-docked',value);$('#pin-contents')?.setAttribute('aria-pressed',String(value));
  if(save)try{if(enabled('remember'))localStorage.setItem(dockKey,value?'1':'0');}catch(_){}
}
export const setMobile=open=>{if(!open&&docked&&innerWidth>670)return;setContents(open);};
setDocked(docked,{save:false});if(docked&&innerWidth>1020)setContents(true);
contentsButton?.addEventListener('click',()=>setContents(!contents?.classList.contains('open')));
$('#close-contents')?.addEventListener('click',()=>setContents(false));
$('#pin-contents')?.addEventListener('click',()=>{setDocked(!docked);setContents(true);});
if(contents)$$('a',contents).forEach(a=>a.addEventListener('click',()=>setMobile(false)));
