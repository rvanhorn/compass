import {attachColorPicker} from './color-picker.js';
import {icon} from './kit-icons.js';
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 let openList=null;

 // Select: keeps the native <select> for value, events, and forms, and draws a button and listbox over it.
 export function select(native){
  if(native._cx)return native._cx;
  const wrap=document.createElement('span');wrap.className='cx-select';
  const button=document.createElement('button');button.type='button';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
  const label=native.id&&document.querySelector('label[for="'+native.id+'"]');
  if(label){label.id=label.id||native.id+'-label';button.setAttribute('aria-labelledby',label.id+' '+native.id+'-button');}else if(native.getAttribute('aria-label'))button.setAttribute('aria-label',native.getAttribute('aria-label'));
  button.id=native.id?native.id+'-button':'';
  button.innerHTML='<span></span>'+icon('chevron-down');
  native.classList.add('cx-select-native');native.tabIndex=-1;native.setAttribute('aria-hidden','true');
  native.before(wrap);wrap.append(button,native);
  const list=document.createElement('ul');list.className='cx-listbox';list.setAttribute('role','listbox');list.hidden=true;list.id=(native.id||'cx')+'-listbox'+Math.random().toString(36).slice(2,6);
  button.setAttribute('aria-controls',list.id);document.body.append(list);
  let active=0;
  const options=()=>[...native.options].filter(option=>!option.hidden);
  const update=()=>{button.firstChild.textContent=native.selectedOptions[0]?.textContent||'';button.disabled=native.disabled;};
  function render(){
   list.innerHTML='';
   options().forEach((option,index)=>{const item=document.createElement('li');item.setAttribute('role','option');item.id=list.id+'-'+index;item.setAttribute('aria-selected',String(option.selected));item.innerHTML='<span></span>'+icon('check');item.firstChild.textContent=option.textContent;item.addEventListener('pointerdown',event=>event.preventDefault());item.addEventListener('click',()=>choose(index));item.addEventListener('pointermove',()=>{active=index;mark();});list.append(item);});
  }
  function mark(){[...list.children].forEach((item,index)=>item.classList.toggle('active',index===active));list.children[active]?.scrollIntoView({block:'nearest'});button.setAttribute('aria-activedescendant',list.children[active]?.id||'');}
  function open(){
   if(button.disabled)return;openList?.close();render();list.hidden=false;button.setAttribute('aria-expanded','true');
   active=Math.max(0,options().findIndex(option=>option.selected));mark();
   const bounds=button.getBoundingClientRect(),height=list.offsetHeight;
   list.style.minWidth=bounds.width+'px';list.style.left=clamp(bounds.left,8,innerWidth-list.offsetWidth-8)+'px';
   list.style.top=(bounds.bottom+4+height<=innerHeight-8?bounds.bottom+4:Math.max(8,bounds.top-height-4))+'px';
   openList={close,list,button};
  }
  function close(focus){if(list.hidden)return;list.hidden=true;button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');if(openList?.list===list)openList=null;if(focus)button.focus();}
  function choose(index){const option=options()[index];close(true);if(!option||option.selected)return;native.value=option.value;update();native.dispatchEvent(new Event('input',{bubbles:true}));native.dispatchEvent(new Event('change',{bubbles:true}));}
  let typed='',typedAt=0;
  button.addEventListener('click',()=>list.hidden?open():close());
  button.addEventListener('keydown',event=>{
   const count=options().length;
   if(list.hidden){if(['ArrowDown','ArrowUp','Enter',' '].includes(event.key)){event.preventDefault();open();}return;}
   if(event.key==='ArrowDown'){event.preventDefault();active=Math.min(count-1,active+1);mark();}
   else if(event.key==='ArrowUp'){event.preventDefault();active=Math.max(0,active-1);mark();}
   else if(event.key==='Home'){event.preventDefault();active=0;mark();}
   else if(event.key==='End'){event.preventDefault();active=count-1;mark();}
   else if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(active);}
   else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
   else if(event.key==='Tab')close();
   else if(event.key.length===1){const now=Date.now();typed=(now-typedAt<700?typed:'')+event.key.toLowerCase();typedAt=now;const found=options().findIndex(option=>option.textContent.toLowerCase().startsWith(typed));if(found>=0){active=found;mark();}}
  });
  button.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==button)close();},0));
  native.addEventListener('change',update);native.addEventListener('input',update);
  // Code that sets .value directly fires no event, so the label follows the property itself.
  const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
  Object.defineProperty(native,'value',{configurable:true,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);update();}});
  update();
  return native._cx={update,open,close,button};
 }

 // Slider fill: the track shows the chosen part in the brand color.
 export function range(input){
  if(input._cxRange)return;input._cxRange=true;
  const fill=()=>{const min=Number(input.min||0),max=Number(input.max||100);input.style.setProperty('--fill',((Number(input.value)-min)/(max-min)*100)+'%');};
  input.addEventListener('input',fill);
  const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  Object.defineProperty(input,'value',{configurable:true,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);fill();}});
  fill();
 }

 // Color field: a swatch that opens the Compass color picker, and an editable hex code beside it.
 export function color(swatch){
  if(swatch._cxColor)return swatch._cxColor;
  const hex=swatch.parentElement.querySelector('.cx-hex');
  const paint=()=>{const value=/^#[0-9a-f]{6}$/i.test(swatch.value)?swatch.value:'';swatch.style.setProperty('--swatch',value||swatch.dataset.fallback||'transparent');if(hex&&document.activeElement!==hex)hex.value=value?value.toUpperCase():'';};
  attachColorPicker(swatch);
  swatch.addEventListener('input',paint);
  hex?.addEventListener('input',()=>{const value=hex.value.startsWith('#')?hex.value:'#'+hex.value;if(/^#[0-9a-f]{6}$/i.test(value)){swatch.value=value.toLowerCase();paint();swatch.dispatchEvent(new Event('input',{bubbles:true}));}});
  hex?.addEventListener('change',()=>swatch.dispatchEvent(new Event('change',{bubbles:true})));
  hex?.addEventListener('blur',paint);
  hex?.addEventListener('keydown',event=>{if(event.key==='Enter')hex.blur();});
  paint();
  return swatch._cxColor={paint};
 }

 export function install(scope=document){
  scope.querySelectorAll('select.cx-enhance').forEach(select);
  scope.querySelectorAll('input.cx-range').forEach(range);
  scope.querySelectorAll('button.cx-swatch').forEach(color);
 }
 const outside=event=>{if(openList&&!openList.list.contains(event.target)&&!openList.button.contains(event.target))openList.close();};
 document.addEventListener('pointerdown',outside,true);
 window.addEventListener('resize',()=>openList?.close());
 document.addEventListener('scroll',event=>{if(openList&&!openList.list.contains(event.target))openList.close();},true);
 export function refresh(scope=document){scope.querySelectorAll('select.cx-select-native').forEach(native=>native._cx?.update());scope.querySelectorAll('button.cx-swatch').forEach(swatch=>swatch._cxColor?.paint());}
