(() => {
'use strict';
const key='compass-theme',choices=['system','light','dark'];
const media=window.matchMedia?.('(prefers-color-scheme: dark)');
let preference='system';
const valid=value=>choices.includes(value)?value:'system';
try{preference=valid(localStorage.getItem(key));}catch(_){}
function apply(){
 document.documentElement.dataset.theme=preference==='system'?(media?.matches?'dark':'light'):preference;
 const trigger=document.querySelector('#workspace-theme');if(trigger)trigger.value=preference;
 const label=document.querySelector('#workspace-theme-label');if(label)label.textContent=preference[0].toUpperCase()+preference.slice(1);
 document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.themeChoice===preference)));
 const icon=document.querySelector('#workspace-theme-icon');if(icon&&window.CompassIcons)icon.innerHTML=window.CompassIcons({system:'monitor',light:'sun',dark:'moon'}[preference]);
 document.querySelectorAll('.publication-frame,#preview-frame').forEach(sendTheme);
}
function sendTheme(frame){frame.contentWindow?.postMessage({type:'compass-theme',theme:document.documentElement.dataset.theme},'*');}
apply();
media?.addEventListener?.('change',apply);
document.addEventListener('DOMContentLoaded',()=>{
 apply();
 document.querySelectorAll('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>{
  preference=valid(button.dataset.themeChoice);apply();
  try{localStorage.setItem(key,preference);}catch(_){}
 }));
});
window.addEventListener('message',event=>{
 if(event.data?.type==='compass-ready')document.querySelectorAll('.publication-frame,#preview-frame').forEach(frame=>{if(frame.contentWindow===event.source)sendTheme(frame);});
});
window.addEventListener('storage',event=>{
 if(event.key===key||event.key===null){preference=valid(event.newValue);apply();}
});
})();
