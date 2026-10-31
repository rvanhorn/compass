import {$,$$,motion,features,enabled,copyText,toast} from './dom.js';

motion.install();
const defaults = window.__compassDefaults;
const prefs = {...defaults};
const themeMedia=window.matchMedia?.('(prefers-color-scheme: dark)');
const followsSystem=!document.documentElement.dataset.theme;
const isDark=()=>document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&themeMedia?.matches);
const storageKey = 'compass-northstar-v1';
try {const stored = JSON.parse(enabled('remember')?localStorage.getItem(storageKey)||'{}':'{}');
  for(const k of Object.keys(defaults)){ if(stored[k]!==undefined) prefs[k]=stored[k]; }
} catch (_) {}
for(const key of ['accent','dark_accent'])if(!/^#[0-9a-f]{6}$/i.test(prefs[key]))prefs[key]=defaults[key]||defaults.accent;
// The Blue swatch moved from #2563eb to #2c55c9; a reader's saved old Blue follows it, but a publication whose own
// accent is #2563eb keeps it.
if(prefs.accent.toLowerCase()==='#2563eb'&&String(defaults.accent).toLowerCase()!=='#2563eb')prefs.accent='#2c55c9';
const paletteMigration={'#325fb4':'#2c55c9','#0f766e':'#14b8a6','#c2410c':'#f97316','#7c3aed':'#8b5cf6','#a16207':'#f59e0b','#be185d':'#ec4899'};
prefs.accent=paletteMigration[prefs.accent.toLowerCase()]||prefs.accent.toLowerCase();
// The Blue swatch moved again, from #2c55c9 to #0969da, to match the GitHub palette; the same rule applies.
if(prefs.accent==='#2c55c9'&&String(defaults.accent).toLowerCase()!=='#2c55c9')prefs.accent='#0969da';
// On 2026-10-31 the first swatch became Indigo, #3b5bdb; a saved old Blue follows it the same way.
if(prefs.accent==='#0969da'&&String(defaults.accent).toLowerCase()!=='#0969da')prefs.accent='#3b5bdb';
const inputs = {font:$('#ctrl-font'), width:$('#ctrl-width'), radius:$('#ctrl-radius'), leading:$('#ctrl-leading')};
const formats={font:v=>v+'px',width:v=>v+'px',radius:v=>v+'px',leading:v=>Number(v).toFixed(2)};
const vars={font:'--text-size',width:'--reader-max',radius:'--radius',leading:'--body-leading',accent:'--accent'};
function luminance(hex){
  const channels=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function readableAccent(hex){
  let channels=hex.slice(1).match(/../g).map(value=>parseInt(value,16));
  while(1.05/(luminance(hex)+.05)<4.8){channels=channels.map(value=>Math.floor(value*.9));hex='#'+channels.map(value=>value.toString(16).padStart(2,'0')).join('');}
  return hex;
}
function apply(){
  if(followsSystem){const theme=themeMedia?.matches?'dark':'light';if(document.documentElement.dataset.theme!==theme)document.documentElement.dataset.theme=theme;}
  for(const key of Object.keys(inputs)){
    const el=inputs[key];
    const value=Number(prefs[key]);
    prefs[key]=Math.max(Number(el.min),Math.min(Number(el.max),Number.isFinite(value)?value:defaults[key]));
    document.documentElement.style.setProperty(vars[key],formats[key](prefs[key]));
    el.value=prefs[key];
    const number=$('#ctrl-'+key+'-value');
    if(document.activeElement!==number)number.value=prefs[key];
    $('#ctrl-'+key+'-default').textContent=formats[key](defaults[key]);
    el.style.setProperty('--fill',((prefs[key]-Number(el.min))/(Number(el.max)-Number(el.min))*100)+'%');
    el.parentElement.style.setProperty('--default-position',((defaults[key]-Number(el.min))/(Number(el.max)-Number(el.min))*100)+'%');
  }
  const accent=isDark()?(prefs.dark_accent||features.dark_accent||prefs.accent):prefs.accent;
  document.documentElement.style.setProperty('--dark-accent',prefs.dark_accent||features.dark_accent||prefs.accent);
  document.documentElement.style.setProperty('--accent',accent);
  document.documentElement.style.setProperty('--accent-text',readableAccent(accent));
  const lightContrast=1.05/(luminance(accent)+.05);
  const darkContrast=(luminance(accent)+.05)/(luminance('#142238')+.05);
  document.documentElement.style.setProperty('--accent-ink',lightContrast>=4.5?'#ffffff':darkContrast>=4.5?'#142238':'#000000');
  $('#ctrl-accent').value=accent;
  $$('.swatches button[data-color]').forEach(b=>{const selected=b.dataset.color===accent;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  const selected=$('.swatches button[data-color].selected');
  $('.custom-color').classList.toggle('selected',!selected);
  $('#accent-name').textContent=selected?selected.title:accent===(isDark()?defaults.dark_accent:defaults.accent)?'Default':'Custom';
  $('#accent-value').textContent=accent.toUpperCase();
  const defaultAccent=isDark()?defaults.dark_accent:defaults.accent;
  const defaultSwatch=$('.swatches button[data-color="'+defaultAccent+'"]');
  $('.color-heading>span').textContent='Default: '+(defaultSwatch?.title||defaultAccent.toUpperCase());
  try{if(enabled('remember'))localStorage.setItem(storageKey,JSON.stringify(prefs));}catch(_){}
}
apply();
new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
themeMedia?.addEventListener?.('change',()=>{if(followsSystem)apply();});
Object.keys(inputs).forEach(key=>{
  inputs[key].addEventListener('input',e=>{prefs[key]=Number(e.target.value);apply();});
  const number=$('#ctrl-'+key+'-value');
  number.addEventListener('input',()=>{if(number.value===''||!number.validity.valid)return;prefs[key]=Number(number.value);apply();});
  const commit=()=>{const min=Number(number.min),max=Number(number.max),step=Number(number.step);if(number.value!=='')prefs[key]=Number(Math.max(min,Math.min(max,min+Math.round((Number(number.value)-min)/step)*step)).toFixed(5));number.value=prefs[key];apply();};
  number.addEventListener('change',commit);number.addEventListener('blur',commit);
  number.addEventListener('keydown',event=>{if(event.key==='Enter')number.blur();});
});
window.CompassColorPicker($('#ctrl-accent'));
$('#ctrl-accent').addEventListener('input',e=>{prefs[isDark()?'dark_accent':'accent']=e.target.value;apply();});
$$('.swatches button[data-color]').forEach(b=>b.addEventListener('click',()=>{prefs[isDark()?'dark_accent':'accent']=b.dataset.color;apply();}));
const panel=$('#settings-panel'), settingsButton=$('#settings-toggle');
let pinned=false;
try{pinned=enabled('remember')&&localStorage.getItem('compass-customize-pinned')==='1';}catch(_){}
function setPinned(value){pinned=value;document.body.classList.toggle('customize-docked',value);$('#pin-settings').setAttribute('aria-pressed',String(value));try{if(enabled('remember'))localStorage.setItem('compass-customize-pinned',value?'1':'0');}catch(_){} }
setPinned(pinned);
export function setPanel(show){show=show&&enabled('customize');motion.transition(panel,show,()=>{panel.classList.toggle('visible',show);document.body.classList.toggle('customize-visible',show);});settingsButton.setAttribute('aria-expanded',String(show));}
settingsButton.addEventListener('click',()=>setPanel(settingsButton.getAttribute('aria-expanded')!=='true'));$('#pin-settings').addEventListener('click',()=>setPinned(!pinned));
$('#close-settings').addEventListener('click',()=>setPanel(false));
$('#reset-settings').addEventListener('click',()=>{Object.assign(prefs,defaults);apply();});
$('#copy-settings').addEventListener('click',()=>{
  const accent=isDark()?prefs.dark_accent:prefs.accent;
  const css=':root {\n' +Object.entries(vars).map(([key,v])=>'  '+v+': '+(formats[key]?formats[key](prefs[key]):accent)+';').join('\n')+'\n  --accent-text: '+readableAccent(accent)+';\n  --accent-ink: '+document.documentElement.style.getPropertyValue('--accent-ink')+';\n}';
  copyText(css).then(()=>toast($('#copy-settings'),'Copied ✓')).catch(()=>toast($('#copy-settings'),'Copy Unavailable'));
});
document.addEventListener('click',e=>{if(!pinned&&panel.classList.contains('visible') && !panel.contains(e.target)&&!settingsButton.contains(e.target)&&!e.target.closest('.compass-color-picker'))setPanel(false);});
