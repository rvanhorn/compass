(() => {
 'use strict';
 let active=null;
 window.CompassMenus={install(){
  document.querySelectorAll('.menu-trigger[aria-controls]').forEach(trigger=>{
   if(trigger._menuInstalled)return;trigger._menuInstalled=true;
   const panel=document.getElementById(trigger.getAttribute('aria-controls'));
   const items=()=>[...panel.querySelectorAll('[role^=menuitem]')].filter(item=>!item.hidden&&!item.disabled);
   function close(focus=false){trigger.setAttribute('aria-expanded','false');window.CompassMotion.transition(panel,false,()=>panel.hidden=true);if(active?.panel===panel)active=null;if(focus)trigger.focus();}
   function open(last=false){
    active?.close();window.CompassMotion.transition(panel,true,()=>panel.hidden=false);trigger.setAttribute('aria-expanded','true');
    const bounds=trigger.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(innerWidth-panel.offsetWidth-8,bounds.right-panel.offsetWidth))+'px';panel.style.top=Math.max(bounds.bottom+8,document.querySelector('.workspace-header').getBoundingClientRect().bottom+8)+'px';
    active={panel,trigger,close};const choices=items();choices.forEach(item=>item.tabIndex=-1);(last?choices.at(-1):choices.find(item=>item.getAttribute('aria-checked')==='true')||choices[0])?.focus();
   }
   trigger.addEventListener('click',()=>trigger.getAttribute('aria-expanded')==='true'?close():open());
   trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open(event.key==='ArrowUp');}});
   panel.addEventListener('click',event=>{if(event.target.closest('[role^=menuitem]'))close(true);});
   panel.addEventListener('keydown',event=>{
    const choices=items(),index=choices.indexOf(document.activeElement);
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
    else if(event.key==='Tab')close();
    else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?choices.length-1:(index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length;choices[next]?.focus();}
   });
  });
 }};
 document.addEventListener('pointerdown',event=>{if(active&&!active.panel.contains(event.target)&&!active.trigger.contains(event.target))active.close();},true);
 document.addEventListener('click',event=>{if(active&&!active.panel.contains(event.target)&&!active.trigger.contains(event.target))active.close();},true);
 window.addEventListener('blur',()=>active?.close());window.addEventListener('resize',()=>active?.close());
})();
