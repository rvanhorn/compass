// The page provides these as globals: the renderer's config script and the shared motion script run before the runtime.
export const $ = (s, scope=document) => scope.querySelector(s);
export const $$ = (s, scope=document) => [...scope.querySelectorAll(s)];
export const motion=window.CompassMotion;
export const features=window.__compassFeatures||{};
export const enabled=key=>features[key]!==false;
export const icon=name=>window.__compassIcons[name];
export async function copyText(s){
  if(navigator.clipboard && window.isSecureContext)return navigator.clipboard.writeText(s);
  const textarea=document.createElement('textarea');textarea.value=s;textarea.style.position='fixed';textarea.style.left='-9999px';document.body.append(textarea);textarea.select();
  const ok=document.execCommand('copy');textarea.remove();if(!ok)throw Error('Clipboard unavailable');
}
export function toast(button, message){const old=button.dataset.defaultHTML||button.innerHTML;button.dataset.defaultHTML=old;button.innerHTML=(message.startsWith('Copied')?icon('check'):'')+'<span>'+message.replace(' ✓','')+'</span>';clearTimeout(button._toastTimer);button._toastTimer=setTimeout(()=>{button.innerHTML=old;},1600);}
