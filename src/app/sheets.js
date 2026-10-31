import {$,$$,reading,project,panelPrefs,savePanelPrefs} from './state.js';
import {setMode} from './mode.js';
import {selectEditTheme} from './design.js';
import {clearPreviewTheme} from './preview.js';
import {renderBreaks} from './pages.js';

let lastSettings='sources';
// Each rail button opens one section; the panel heading and description come from here.
const SECTIONS={
 sources:['Sources','Your Markdown, in reading order.'],
 pages:['Pages','How your files become pages.'],
 appearance:['Style','Colors, type, and layout of the publication.'],
 features:['Reader','Tools people reading your page can use.'],
 details:['Details','Title, author, and branding readers see.'],
 publishing:['Publish','Check the publication and download it.'],
};
// Below this width a docked column leaves too little page, so the panel always floats.
const NARROW='(max-width: 1000px)';
const matches=query=>typeof matchMedia==='function'&&matchMedia(query).matches;
const body=()=>document.body;
// The panel is open or closed by one body class; the styles animate every change to it, whoever makes the change.
export const sheetOpen=()=>!body().classList.contains('drawer-hidden');
export const sheetFloats=()=>!body().classList.contains('panel-docked')||matches(NARROW);
const railButton=tab=>$('#rail [data-tab="'+tab+'"]');

// Read hides the panel through the styles but remembers that it is open.
function syncState(){
 const open=sheetOpen()&&!reading,tab=$('#drawer').dataset.tabOpen;
 $$('#rail [data-tab]').forEach(button=>button.setAttribute('aria-pressed',String(open&&button.dataset.tab===tab)));
 $('#drawer').inert=!open;
}
export function syncSheetMode(){
 syncState();
 if(reading)clearPreviewTheme();
 else if(sheetOpen()&&$('#drawer').dataset.tabOpen==='appearance')selectEditTheme(document.documentElement.dataset.theme||'light');
}

// Floating is the default: the panel opens over the page. Docked keeps it open beside the page and narrows the page.
function applyLayout({docked}){
 body().classList.toggle('panel-docked',docked);
 const pin=$('#pin-sheet'),label=docked?'Float Over the Page':'Keep Open Beside the Page';
 pin.setAttribute('aria-pressed',String(docked));pin.setAttribute('aria-label',label);pin.title=label;
}
// The header only crossfades: it must not move when the section changes. Panel content may rise into place.
function fadeIn(elements,{move=false}={}){
 const duration=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-in'))||220,still=!move||matches('(prefers-reduced-motion: reduce)');
 for(const element of elements){
  if(!element?.animate)continue;
  element._sheetFade?.cancel();
  element._sheetFade=element.animate([{opacity:0,transform:still?'none':'translateY(6px)'},{opacity:1,transform:'none'}],{duration,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
}
function showSection(tab){
 const [title,description]=SECTIONS[tab];
 $('#sheet-title').textContent=title;$('#sheet-desc').textContent=description;
 $$('.tab-panel').forEach(panel=>panel.hidden=panel.id!=='tab-'+tab);
}

export function openSheet(tab,{toggle=false,remember=true}={}){
 const drawer=$('#drawer');
 if(toggle&&sheetOpen()&&drawer.dataset.tabOpen===tab){hideSheet();return;}
 if(reading)setMode(false);
 const switching=sheetOpen()&&drawer.dataset.tabOpen!==tab;
 drawer.dataset.tabOpen=tab;if(tab!=='publishing')lastSettings=tab;
 $('#export').hidden=tab!=='publishing';$('#reset-options').hidden=tab!=='appearance';$('#reset-features').hidden=tab!=='features';
 if(tab==='appearance')selectEditTheme(document.documentElement.dataset.theme||'light');else clearPreviewTheme();
 showSection(tab);
 body().classList.remove('drawer-hidden');syncState();
 if(remember)savePanelPrefs({open:true});
 if(switching){$('.drawer-scroll').scrollTop=0;fadeIn([$('#tab-'+tab)],{move:true});fadeIn([$('.sheet-heading'),$('#sheet-desc')]);}
 if(tab==='pages')renderBreaks();
}
export function hideSheet({remember=true}={}){
 clearPreviewTheme();
 if($('#drawer').contains(document.activeElement))railButton($('#drawer').dataset.tabOpen)?.focus();
 body().classList.add('drawer-hidden');syncState();
 if(remember)savePanelPrefs({open:false});
}
// Called once at startup, before the boot gate lifts. Only a docked panel reopens: a floating one would cover the page.
export function restoreSheet(){
 const prefs=panelPrefs();applyLayout(prefs);
 if(prefs.docked&&prefs.open!==false&&!matches(NARROW)&&project.files.length&&!reading)openSheet(lastSettings,{remember:false});
 else syncState();
}

// A rail button opens its section, or closes the panel when its section is already showing.
$$('#rail [data-tab]').forEach(button=>button.addEventListener('click',()=>openSheet(button.dataset.tab,{toggle:true})));
$('#change-layout').addEventListener('click',()=>{openSheet('pages');setTimeout(()=>$('[name=output-mode]:checked').focus(),0);});
$('#hide-drawer').addEventListener('click',()=>hideSheet());
$('#pin-sheet').addEventListener('click',()=>{const docked=!body().classList.contains('panel-docked');applyLayout({docked});savePanelPrefs({docked});});
// A floating panel closes on any click outside it. Rail buttons manage the panel themselves, and popups that belong to
// the panel's controls (menus, the colour picker, select lists, dialogs, the palette) count as inside.
// A click inside the preview moves focus into its frame instead of reaching this document, so blur covers that case.
function closeFloating(){if(sheetOpen()&&sheetFloats()&&!reading)hideSheet();}
document.addEventListener('pointerdown',event=>{
 if(event.target.closest?.('#drawer,#rail button,.command-menu,.compass-color-picker,.cx-listbox,dialog,#palette'))return;
 closeFloating();
});
window.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement?.tagName==='IFRAME'&&$('#workspace').contains(document.activeElement))closeFloating();},0));
