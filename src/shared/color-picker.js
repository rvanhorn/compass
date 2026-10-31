import {transition} from './motion.js';
import {icon} from './kit-icons.js';
 let active=null;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function hsv(hex){
  const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
  let h=0;if(delta){h=max===rgb[0]?(rgb[1]-rgb[2])/delta:max===rgb[1]?(rgb[2]-rgb[0])/delta+2:(rgb[0]-rgb[1])/delta+4;h=(h*60+360)%360;}
  return {h,s:max?delta/max*100:0,v:max*100};
 }
 function hex({h,s,v}){
  s/=100;v/=100;
  const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
  const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return '#'+rgb.map(value=>Math.round((value+m)*255).toString(16).padStart(2,'0')).join('');
 }
 export function attachColorPicker(trigger){
  // Swatches built by the workspace are attached directly and again by ui.js install(); a second picker would close the first.
  if(trigger._compassPicker)return trigger._compassPicker;
  trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  const picker=document.createElement('div');picker.className='compass-color-picker';picker.hidden=true;picker.setAttribute('role','dialog');picker.setAttribute('aria-label',trigger.getAttribute('aria-label')+' Picker');
  picker.innerHTML='<div class="ccp-heading"><strong>Choose a Color</strong><button type="button" aria-label="Close Color Picker">'+icon('x')+'</button></div><div class="ccp-plane" aria-hidden="true"><i></i></div><div class="ccp-sliders"></div><label class="ccp-hex"><span>Hex</span><input type="text" maxlength="7" spellcheck="false" aria-label="Color Hex"></label>';
  document.body.append(picker);
  const plane=picker.querySelector('.ccp-plane'),cursor=plane.querySelector('i'),text=picker.querySelector('input'),sliders={};
  let color={h:0,s:0,v:0},dragging=false;
  for(const [key,label,max] of [['h','Hue',360],['s','Saturation',100],['v','Brightness',100]]){
   const row=document.createElement('label');row.className='ccp-slider';
   const title=document.createElement('span');title.textContent=label;
   const range=document.createElement('input');range.type='range';range.min=0;range.max=max;range.step=1;range.setAttribute('aria-label',label);range.dataset.channel=key;
   range.addEventListener('input',()=>{color[key]=Number(range.value);update(true);});sliders[key]=range;row.append(title,range);picker.querySelector('.ccp-sliders').append(row);
  }
  function update(emit=false){
   const value=hex(color),hue=hex({h:color.h,s:100,v:100});
   picker.style.setProperty('--picker-hue',hue);picker.style.setProperty('--picker-color',value);
   cursor.style.left=color.s+'%';cursor.style.top=(100-color.v)+'%';
   for(const key of Object.keys(sliders))sliders[key].value=color[key];
   sliders.s.style.background='linear-gradient(to right,#fff,'+hue+')';sliders.v.style.background='linear-gradient(to right,#000,'+hex({...color,v:100})+')';
   if(document.activeElement!==text)text.value=value.toUpperCase();
   if(emit){trigger.value=value;trigger.dispatchEvent(new Event('input',{bubbles:true}));}
  }
  function close({focus=false}={}){
   if(trigger.getAttribute('aria-expanded')!=='true')return;
   transition(picker,false,()=>picker.hidden=true);dragging=false;trigger.setAttribute('aria-expanded','false');if(active?.picker===picker)active=null;
   if(focus)trigger.focus();
   trigger.dispatchEvent(new Event('change',{bubbles:true}));
  }
  trigger.addEventListener('click',()=>{
   if(trigger.getAttribute('aria-expanded')==='true'){close();return;}
   active?.close();color=hsv(/^#[0-9a-f]{6}$/i.test(trigger.value)?trigger.value:'#2c55c9');update();
   picker.hidden=false;trigger.setAttribute('aria-expanded','true');active={picker,trigger,close};
   const bounds=trigger.getBoundingClientRect(),width=picker.offsetWidth,height=picker.offsetHeight;
   picker.style.left=clamp(bounds.right-width,8,Math.max(8,innerWidth-width-8))+'px';
   picker.style.top=clamp(bounds.bottom+height+8<=innerHeight?bounds.bottom+8:bounds.top-height-8,8,Math.max(8,innerHeight-height-8))+'px';
   transition(picker,true,()=>picker.hidden=false);
   text.value=trigger.value.toUpperCase();sliders.h.focus();
  });
  picker.querySelector('.ccp-heading button').addEventListener('click',()=>close({focus:true}));
  text.addEventListener('input',()=>{const value=text.value.startsWith('#')?text.value:'#'+text.value;if(/^#[0-9a-f]{6}$/i.test(value)){color=hsv(value);update(true);}});
  text.addEventListener('blur',()=>text.value=trigger.value.toUpperCase());
  picker.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close({focus:true});}else if(event.key==='Enter'&&event.target===text)close({focus:true});});
  picker.addEventListener('focusout',event=>{if(event.relatedTarget&&!picker.contains(event.relatedTarget)&&event.relatedTarget!==trigger)close();});
  function point(event){const bounds=plane.getBoundingClientRect();color.s=clamp((event.clientX-bounds.left)/bounds.width*100,0,100);color.v=clamp(100-(event.clientY-bounds.top)/bounds.height*100,0,100);update(true);}
  plane.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();dragging=true;plane.setPointerCapture?.(event.pointerId);point(event);});
  plane.addEventListener('pointermove',event=>{if(dragging)point(event);});
  plane.addEventListener('pointerup',()=>dragging=false);plane.addEventListener('pointercancel',()=>dragging=false);
  return trigger._compassPicker={close};
 }
 const outside=event=>{if(active&&!active.picker.contains(event.target)&&!active.trigger.contains(event.target))active.close();};
 document.addEventListener('pointerdown',outside,true);document.addEventListener('click',outside,true);
 // Pointer events inside a preview iframe don't bubble into its workspace.
 window.addEventListener('blur',()=>active?.close());
 window.addEventListener('resize',()=>active?.close());
 document.addEventListener('scroll',event=>{if(active&&!active.picker.contains(event.target))active.close();},true);
