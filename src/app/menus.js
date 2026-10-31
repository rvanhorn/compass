import {transition} from '../shared/motion.js';
 let active=null;
 export function installMenus(){
  document.querySelectorAll('.menu-trigger[aria-controls]').forEach(trigger=>{
   if(trigger._menuInstalled)return;trigger._menuInstalled=true;
   const panel=document.getElementById(trigger.getAttribute('aria-controls'));
   const items=()=>[...panel.querySelectorAll('[role^=menuitem]')].filter(item=>!item.hidden&&!item.disabled);
   const kind=()=>panel.classList.contains('rail-menu')?'drawer':'panel';
   function close(focus=false){trigger.setAttribute('aria-expanded','false');transition(panel,false,()=>panel.hidden=true,kind());if(active?.panel===panel)active=null;if(focus)trigger.focus();}
   function open(last=false){
    // A trigger on the side rail (data-menu-align="side") slides its menu out from under the rail's edge, like a section panel,
    // top-aligned with the trigger and kept on screen. Others open above the trigger, or below when there is no room,
    // lined up with its right edge or, for "start", its left edge.
    // At 700 px and below the rail is a bottom bar (styles.css), so its menus open above it like any other.
    const rail=trigger.closest('#rail'),phone=typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches;
    const side=trigger.dataset.menuAlign==='side'&&!!rail&&!phone;
    panel.classList.toggle('rail-menu',side);
    active?.close();transition(panel,true,()=>panel.hidden=false,kind());trigger.setAttribute('aria-expanded','true');
    const bounds=trigger.getBoundingClientRect(),width=panel.offsetWidth,height=panel.offsetHeight,align=trigger.dataset.menuAlign;
    if(side){panel.style.left=Math.min(innerWidth-width-8,rail.getBoundingClientRect().right+8)+'px';panel.style.top=Math.max(8,Math.min(innerHeight-height-8,bounds.top))+'px';}
    else{const edge=align==='start'?bounds.left:bounds.right-width;panel.style.left=Math.max(8,Math.min(innerWidth-width-8,edge))+'px';panel.style.top=(bounds.top-height-8>=8?bounds.top-height-8:Math.max(8,Math.min(innerHeight-height-8,bounds.bottom+8)))+'px';}
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
 }
 document.addEventListener('pointerdown',event=>{if(active&&!active.panel.contains(event.target)&&!active.trigger.contains(event.target))active.close();},true);
 document.addEventListener('click',event=>{if(active&&!active.panel.contains(event.target)&&!active.trigger.contains(event.target))active.close();},true);
 window.addEventListener('blur',()=>active?.close());window.addEventListener('resize',()=>active?.close());
 // A click on a modal dialog's backdrop closes it. Such a click targets the dialog element itself; clicks on its content do not.
 document.addEventListener('click',event=>{if(event.target instanceof HTMLDialogElement&&event.target.open)event.target.close();});
