import {attachColorPicker} from '../shared/color-picker.js';
import {pairedAccent} from '../shared/design.mjs';
import {normalizeBranding,DESIGN_KEYS,createDesignPreset,readDesignPreset} from '../shared/options.mjs';
import {$,$$,element,status,dataURL,download,defaults,project} from './state.js';
import {changed,previewTheme} from './preview.js';
import {sync} from './sync.js';

let editTheme=document.documentElement.dataset.theme||'light',brandingTarget='logo';
const colorKeys=['accent','background','logo_color','dark_accent','dark_background','dark_logo_color','surface','dark_surface','text','dark_text'];
const ranges=[['font','Text Size',14,22,1,'px','typography-controls'],['leading','Line Spacing',1.55,2.05,.05,'','typography-controls'],['letter_spacing','Letter Spacing',-.02,.08,.005,'em','typography-controls'],['paragraph_spacing','Paragraph Spacing',8,32,1,'px','typography-controls'],['heading_scale','Heading Size',.85,1.35,.05,'×','typography-controls'],['width','Content Width',640,1320,10,'px','layout-controls'],['radius','Corner Radius',0,28,1,'px','layout-controls'],['outline_depth','Outline Levels',1,4,1,'','sub-outline'],['table_rows','Scroll After',3,100,1,' rows','sub-table_scroll'],['reading_speed','Reading Speed',100,500,10,' words/min','sub-reading_time']];
const COLOR_ROWS=[['accent','Accent','Links, buttons, and highlights.'],['background','Background','The page behind the text.'],['surface','Surface','Code blocks, tables, and callouts.'],['text','Text','Body text and headings.'],['logo_color','Icon Color','The mark inside the publication icon.']];
function colorRow(theme,key,label,description){
 const option=(theme==='dark'?'dark_':'')+key,themeLabel=theme==='light'?'Light':'Dark';
 const row=element('div','cx-row color-field'),copy=element('span','cx-row-text'),name=element('label','',label),help=element('small','',description);
 const field=element('span','cx-color'),hex=element('input','cx-hex'),color=element('button','cx-swatch');
 color.type='button';color.id='opt-'+option;color.setAttribute('aria-label',themeLabel+' '+label);name.htmlFor=color.id;
 hex.type='text';hex.id='hex-'+option;hex.maxLength=7;hex.spellcheck=false;hex.setAttribute('aria-label',themeLabel+' '+label+' Hex');
 const automatic=key==='surface'||key==='text';
 if(automatic){hex.placeholder='Automatic';const reset=element('button','cx-link quiet','Automatic');reset.type='button';reset.dataset.resetSurface=option;reset.setAttribute('aria-label','Reset '+themeLabel+' '+label+' to Automatic');reset.addEventListener('click',()=>{project.options[option]='';syncValues();changed();});help.append(' ',reset);}
 const update=value=>{project.options[option]=value.toLowerCase();if(key==='accent'&&project.options.link_accents)project.options[theme==='dark'?'accent':'dark_accent']=pairedAccent(value,theme==='dark'?'light':'dark');syncValues();changed();};
 attachColorPicker(color);
 color.addEventListener('input',()=>update(color.value));
 hex.addEventListener('input',()=>{const value=hex.value.startsWith('#')?hex.value:'#'+hex.value;if(/^#[0-9a-f]{6}$/i.test(value))update(value);});
 hex.addEventListener('blur',()=>hex.value=(project.options[option]||'').toUpperCase());hex.addEventListener('keydown',event=>{if(event.key==='Enter')hex.blur();});
 copy.append(name,help);field.append(hex,color);row.append(copy,field);return row;
}
export function buildColorControls(){
 for(const theme of ['light','dark']){
  const panel=element('div','theme-color-panel');panel.dataset.colorTheme=theme;panel.hidden=theme!==editTheme;
  for(const [key,label,description] of COLOR_ROWS)panel.append(colorRow(theme,key,label,description));
  $('#theme-color-controls').append(panel);
 }
 $$('[data-edit-theme]').forEach(button=>button.addEventListener('click',()=>{selectEditTheme(button.dataset.editTheme);previewTheme(editTheme);}));
 selectEditTheme(editTheme);
}
export function buildRangeControls(){
 for(const [key,label,min,max,step,unit,container] of ranges){
  const wrap=element('div','cx-slider-row range-control'),line=element('span','cx-slider-top'),title=element('label','',label),value=element('span','range-value'),number=element('input');
  number.type='number';Object.assign(number,{min,max,step});number.id='value-'+key;number.dataset.option=key;number.setAttribute('aria-label',label);value.append(number,element('span','',unit.trim()));
  title.htmlFor='option-'+key;line.append(title,value);
  const input=element('input','cx-range');input.type='range';Object.assign(input,{min,max,step});input.dataset.option=key;input.dataset.unit=unit;input.id='option-'+key;
  wrap.append(line,input,element('small','range-default',`Default: ${defaults[key]}${unit}`));$('#'+container).append(wrap);
 }
}
export function bindOptionInputs(){
 $$('[data-option]').forEach(input=>{
  const update=()=>{if(input.type==='number'&&(input.value===''||!input.validity.valid))return;const key=input.dataset.option;project.options[key]=input.type==='checkbox'?input.checked:Number(input.value);syncValues();changed({immediate:input.type==='checkbox',target:key});};
  input.addEventListener('input',update);
  if(input.type==='number'){
   const commit=()=>{if(input.value===''){input.value=project.options[input.dataset.option];return;}const min=Number(input.min),max=Number(input.max),step=Number(input.step);input.value=Number(Math.max(min,Math.min(max,min+Math.round((Number(input.value)-min)/step)*step)).toFixed(5));if(Number(input.value)!==project.options[input.dataset.option])update();};
   input.addEventListener('change',commit);input.addEventListener('blur',commit);
   input.addEventListener('keydown',event=>{if(event.key==='Enter')input.blur();});
  }
 });
}
export function selectEditTheme(theme){
 editTheme=theme==='dark'?'dark':'light';
 $$('[data-edit-theme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.editTheme===editTheme)));
 $$('[data-color-theme]').forEach(panel=>panel.hidden=panel.dataset.colorTheme!==editTheme);
}
const mixHex=(a,b,weight)=>'#'+a.slice(1).match(/../g).map((channel,i)=>Math.round(parseInt(channel,16)*weight+parseInt(b.slice(1+i*2,3+i*2),16)*(1-weight)).toString(16).padStart(2,'0')).join('');
function automaticColor(key){
 const dark=key.startsWith('dark_'),background=project.options[dark?'dark_background':'background'];
 if(key.endsWith('surface'))return dark?mixHex(background,'#ffffff',.94):mixHex(background,'#ffffff',.15);
 return dark?mixHex(background,'#ffffff',.12):mixHex(background,'#171717',.14);
}
export function syncValues(){
 for(const [key,,min,max] of ranges){const slider=$('#option-'+key);slider.value=project.options[key];slider.style.setProperty('--fill',((project.options[key]-min)/(max-min)*100)+'%');const number=$('#value-'+key);if(document.activeElement!==number)number.value=project.options[key];}
 for(const key of colorKeys){
  const color=$('#opt-'+key),hex=$('#hex-'+key),value=project.options[key]||'';
  color.value=value||automaticColor(key);color.style.setProperty('--swatch',color.value);if(document.activeElement!==hex)hex.value=value.toUpperCase();
  const reset=$('[data-reset-surface="'+key+'"]');if(reset)reset.hidden=!value;
 }
}
$('#reset-options').addEventListener('click',()=>{for(const key of DESIGN_KEYS)project.options[key]=defaults[key];sync();changed({immediate:true});status('Design reset to defaults');});
for(const [id,key] of [['body-font','body_font'],['heading-font','heading_font']])$('#'+id).addEventListener('input',event=>{project.options[key]=event.target.value;changed();});
for(const [id,key] of [['brand-name','name'],['brand-footer','footer']])$('#'+id).addEventListener('input',event=>{project.branding[key]=event.target.value;changed();});
for(const key of ['logo','favicon']){
 $('#upload-'+key).addEventListener('click',()=>{brandingTarget=key;$('#branding-input').click();});
 $('#remove-'+key).addEventListener('click',()=>{project.branding[key]='';sync();changed();});
}
$('#branding-input').addEventListener('change',async event=>{
 const file=event.target.files?.[0],target=brandingTarget;if(!file)return;
 try{if(file.size>2*1024*1024)throw Error('Choose an image under 2 MB.');const value=normalizeBranding({[target]:await dataURL(file)})[target];if(!value)throw Error('Choose a PNG, JPEG, WebP, GIF, AVIF, or SVG image.');project.branding[target]=value;sync();changed();}
 catch(error){status(error.message,true);}finally{event.target.value='';}
});
$('#save-design').addEventListener('click',()=>{const preset=createDesignPreset(project.options,$('#design-name').value);download(new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}),'compass-design.json');status('Design Saved');});
$('#import-design').addEventListener('click',()=>$('#design-input').click());
$('#design-input').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{if(file.size>64*1024)throw Error('Choose a design preset under 64 KB.');const preset=readDesignPreset(JSON.parse(await file.text()));Object.assign(project.options,preset.options);$('#design-name').value=preset.name;sync();changed({immediate:true});status('Design Imported');}
 catch(error){status(error.message,true);}finally{event.target.value='';}
});

// ---------- Randomize: one hue drives a matching set for both themes ----------
function oklchHex(l,c,h){
 const rgb=chroma=>{const a=chroma*Math.cos(h*Math.PI/180),b=chroma*Math.sin(h*Math.PI/180),L=(l+.3963377774*a+.2158037573*b)**3,M=(l-.1055613458*a-.0638541728*b)**3,S=(l-.0894841775*a-1.291485548*b)**3;return [4.0767416621*L-3.3077115913*M+.2309699292*S,-1.2684380046*L+2.6097574011*M-.3413193965*S,-.0041960863*L-.7034186147*M+1.707614701*S];};
 const inGamut=v=>v.every(x=>x>=-.0001&&x<=1.0001);
 if(!inGamut(rgb(c))){let lo=0,hi=c;for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(inGamut(rgb(mid)))lo=mid;else hi=mid;}c=lo;}
 return '#'+rgb(c).map(v=>{v=Math.max(0,Math.min(1,v));v=v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;return Math.round(v*255).toString(16).padStart(2,'0');}).join('');
}
function luminance(hex){return hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
function readableAccent(hue,chroma,lightness,background,step){let hex=oklchHex(lightness,chroma,hue);for(let i=0;i<30&&contrast(hex,background)<4.5;i++){lightness+=step;hex=oklchHex(lightness,chroma,hue);}return hex;}
const hueGap=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d);};
const rand=(low,high)=>low+Math.random()*(high-low),wrap=h=>(h%360+360)%360,choose=list=>list[Math.floor(Math.random()*list.length)];
// A set varies on three axes, so presses look different, not only re-hued:
// the background mood (how light, dark, and tinted the page is), how the background hue relates to the accent, and the accent itself.
// OKLCH ranges follow measured values from Nord, Catppuccin, Tokyo Night, Solarized, Ayu, GitHub and others.
const MOODS=[
 {name:'clean',weight:3,light:[.975,.995],lightTint:[0,.006],dark:[.17,.22],darkTint:[.004,.014],chroma:[.13,.21]},
 {name:'tinted',weight:3,light:[.945,.97],lightTint:[.014,.032],dark:[.19,.25],darkTint:[.018,.04],chroma:[.1,.17]},
 {name:'deep',weight:2,light:[.985,1],lightTint:[0,.004],dark:[.11,.155],darkTint:[.008,.028],chroma:[.15,.22]},
 {name:'soft',weight:2,light:[.91,.945],lightTint:[.006,.02],dark:[.26,.32],darkTint:[.008,.024],chroma:[.07,.13]}];
const HARMONIES=[accent=>accent,accent=>accent+rand(-35,35),accent=>accent+180+rand(-20,20),accent=>accent+choose([150,210])+rand(-12,12)];
// Candidates are compared by the colours they actually produce, in OKLab, where distance follows perceived difference.
// Hue alone misleads: readable accents darken, and yellows, oranges, and golds all turn brown.
// Each press builds 64 candidates and keeps the one farthest from the last twelve sets; consecutive sets never share a mood.
const RECENT=12,CANDIDATES=64;
const recent=[];let lastMood=null;
function oklab(hex){
 const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
const labGap=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function pickMood(){
 const pool=MOODS.filter(mood=>mood!==lastMood);let pick=Math.random()*pool.reduce((sum,m)=>sum+m.weight,0);
 return pool.find(m=>(pick-=m.weight)<0)||pool[0];
}
function buildSet(mood){
 const accentHue=rand(0,360),hue=wrap(choose(HARMONIES)(accentHue));
 const lightL=rand(...mood.light),darkL=rand(...mood.dark),lightTint=rand(...mood.lightTint),darkTint=rand(...mood.darkTint),chroma=rand(...mood.chroma);
 const light=oklchHex(lightL,lightTint,hue),dark=oklchHex(darkL,darkTint,hue);
 const accent=readableAccent(accentHue,chroma,rand(.48,.64),light,-.02),darkAccent=readableAccent(accentHue,chroma*.9,rand(.68,.8),dark,.02);
 const mark=(onColor,markHue)=>contrast('#ffffff',onColor)>=contrast('#111111',onColor)?oklchHex(.985,.008,markHue):oklchHex(.2,.03,markHue);
 return {background:light,surface:oklchHex(lightL-rand(.025,.06),lightTint*1.2+.002,hue),text:oklchHex(rand(.2,.34),rand(.01,.04),hue),accent,logo_color:mark(accent,accentHue),
  dark_background:dark,dark_surface:oklchHex(darkL+rand(.035,.07),darkTint*1.2+.002,hue),dark_text:oklchHex(rand(.87,.95),rand(.01,.045),hue),dark_accent:darkAccent,dark_logo_color:mark(darkAccent,accentHue)};
}
// A set's look is its accent plus its two backgrounds; the accent counts most.
const signature=set=>({accent:oklab(set.accent),background:oklab(set.background),dark:oklab(set.dark_background)});
const setGap=(a,b)=>labGap(a.accent,b.accent)+.5*labGap(a.background,b.background)+.5*labGap(a.dark,b.dark);
export function randomizeColors(){
 const mood=pickMood();
 const score=set=>{const look=signature(set);return recent.length?Math.min(...recent.map(previous=>setGap(look,previous))):Infinity;};
 const values=Array.from({length:CANDIDATES},()=>buildSet(mood)).reduce((best,set)=>score(set)>score(best)?set:best);
 lastMood=mood;recent.push(signature(values));if(recent.length>RECENT)recent.shift();
 Object.assign(project.options,values);syncValues();changed({immediate:true});status('New colors chosen. Undo restores the previous set.');
}
$('#randomize-colors').addEventListener('click',randomizeColors);
