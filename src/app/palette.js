import {$,$$,element,project,reading,pages,searchIndex,setSearchIndex,keyLabel} from './state.js';
import {frameCommand,goToPage} from './preview.js';
import {openSheet} from './sheets.js';
import {setMode} from './mode.js';
import {randomizeColors} from './design.js';
import {transition} from '../shared/motion.js';

// ---------- Command palette: commands, every setting, and the publication's text ----------
const palette=$('#palette'),paletteInput=$('#palette-input'),paletteResults=$('#palette-results');
let paletteItems=[],paletteIndex=0,paletteReturn=null;
function commandList(){
 const list=[
  ['Open Sources','Sheet',()=>openSheet('sources')],['Open Pages','Sheet',()=>openSheet('pages')],['Open Style','Sheet',()=>openSheet('appearance')],['Open Reader Tools','Sheet',()=>openSheet('features')],['Open Details','Sheet',()=>openSheet('details')],['Publish and Download','Sheet',()=>openSheet('publishing')],
  ['Download '+($('#export span')?.textContent.replace('Download ','')||'HTML'),'Publish',()=>project.files.length&&$('#export').click()],['Check Publication','Publish',()=>{openSheet('publishing');$('#check-publication').click();}],['Print or Save PDF','Publish',()=>$('#print-publication').click()],
  ['Page Layout: One Page','Pages',()=>chooseLayout('combined')],['Page Layout: Page per File','Pages',()=>chooseLayout('separate')],['Page Layout: Page per H1','Pages',()=>chooseLayout('heading')],
  ['Open Contents','Reader',()=>frameCommand({type:'compass-command',command:'contents'})],['Switch to '+(reading?'Edit':'Read'),'⌘E',()=>setMode(!reading)],['Randomize Colors','Design',randomizeColors],
  ['Add Files','Pages',()=>$('#file-input').click()],['Open Project','Project',()=>$('#open-project').click()],['Save Project','⌘S',()=>$('#save-project').click()],
  ['Appearance: System','Workspace',()=>$('[data-theme-choice=system]').click()],['Appearance: Light','Workspace',()=>$('[data-theme-choice=light]').click()],['Appearance: Dark','Workspace',()=>$('[data-theme-choice=dark]').click()],
  ['Keyboard Shortcuts','?',()=>$('#show-shortcuts').click()],
 ];
 return list.map(([title,hint,run])=>({group:'Commands',title,hint:keyLabel(hint),run}));
}
function chooseLayout(mode){const input=$('[name=output-mode][value='+mode+']');input.checked=true;input.dispatchEvent(new Event('change'));openSheet('pages');}
function settingList(){
 const names={sources:'Sources',pages:'Pages',appearance:'Style',features:'Reader',details:'Details',publishing:'Publish'};
 return $$('.tab-panel .cx-row, .tab-panel .cx-stack, .tab-panel .cx-slider-row').map(row=>{
  const tab=row.closest('.tab-panel').id.replace('tab-',''),label=(row.querySelector('label, .cx-row-text > span')?.textContent||'').replace(/Optional$/,'').trim();
  return label&&!row.closest('[hidden]:not(.tab-panel)')&&{group:'Settings',title:label,hint:names[tab],run:()=>{openSheet(tab);requestAnimationFrame(()=>{row.scrollIntoView({block:'center'});row.classList.remove('flash');void row.offsetWidth;row.classList.add('flash');row.querySelector('input,button,select')?.focus({preventScroll:true});});}};
 }).filter(Boolean);
}
function publicationIndex(){
 if(searchIndex)return searchIndex;
 const match=pages[0]?.html.match(/window\.__compassSearch=(\[[\s\S]*?\]);window\.__compassPage=/);
 try{setSearchIndex(match?JSON.parse(match[1]):[]);}catch(_){setSearchIndex([]);}
 return searchIndex;
}
function textResults(query){
 const needle=query.toLowerCase();if(!needle)return [];
 return publicationIndex().filter(item=>item.text?.toLowerCase().includes(needle)).slice(0,12).map(item=>{
  const at=item.text.toLowerCase().indexOf(needle),start=Math.max(0,at-40);
  return {group:'In This Publication',title:item.title,detail:(start?'...':'')+item.text.slice(start,at+needle.length+70),query,hint:pages.length>1?(pages.find(page=>page.name===item.page)?.title||''):'',run:()=>goToPage(Math.max(0,pages.findIndex(page=>page.name===item.page)),{hash:item.id,query})};
 });
}
function renderPalette(){
 const query=paletteInput.value.trim(),lower=query.toLowerCase(),match=item=>!lower||item.title.toLowerCase().includes(lower)||String(item.hint||'').toLowerCase().includes(lower);
 paletteItems=[...commandList().filter(match).slice(0,query?6:8),...(query?settingList().filter(match).slice(0,6):[]),...textResults(query)];
 paletteIndex=Math.min(paletteIndex,Math.max(0,paletteItems.length-1));paletteResults.replaceChildren();
 let group='';
 paletteItems.forEach((item,index)=>{
  if(item.group!==group){group=item.group;paletteResults.append(element('div','palette-group',group));}
  const option=element('div','palette-item');option.id='palette-item-'+index;option.setAttribute('role','option');option.setAttribute('aria-selected',String(index===paletteIndex));
  const copy=element('span','palette-copy'),title=element('span','palette-title',item.title);copy.append(title);
  if(item.detail){const detail=element('span','palette-detail'),lowerDetail=item.detail.toLowerCase();let cursor=0,at=lowerDetail.indexOf(item.query.toLowerCase());while(at>=0){detail.append(item.detail.slice(cursor,at),element('mark','',item.detail.slice(at,at+item.query.length)));cursor=at+item.query.length;at=lowerDetail.indexOf(item.query.toLowerCase(),cursor);}detail.append(item.detail.slice(cursor));copy.append(detail);}
  option.append(copy);if(item.hint)option.append(element('span','palette-hint',item.hint));
  option.addEventListener('pointermove',()=>{if(paletteIndex!==index){paletteIndex=index;markPalette();}});
  option.addEventListener('click',()=>runPalette(index));paletteResults.append(option);
 });
 if(!paletteItems.length)paletteResults.append(element('p','palette-empty','No results for "'+query+'". Try fewer words.'));
 markPalette();
}
function markPalette(){$$('.palette-item').forEach((item,index)=>item.setAttribute('aria-selected',String(index===paletteIndex)));const current=$('#palette-item-'+paletteIndex);current?.scrollIntoView({block:'nearest'});paletteInput.setAttribute('aria-activedescendant',current?.id||'');}
export const paletteOpen=()=>!palette.hidden&&palette.dataset.motion!=='closed';
export function openPalette(){
 if(reading){frameCommand({type:'compass-command',command:'find'});return;}
 paletteReturn=document.activeElement;transition(palette,true,()=>palette.hidden=false,'fade');paletteInput.value='';paletteIndex=0;renderPalette();paletteInput.focus();
}
export function closePalette(){if(!paletteOpen())return;transition(palette,false,()=>palette.hidden=true,'fade');paletteReturn?.focus?.();}
function runPalette(index){const item=paletteItems[index];if(!item)return;closePalette();item.run();}
$('#command-toggle').addEventListener('click',openPalette);
paletteInput.addEventListener('input',()=>{paletteIndex=0;renderPalette();});
paletteInput.addEventListener('keydown',event=>{
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const count=paletteItems.length||1;paletteIndex=(paletteIndex+(event.key==='ArrowDown'?1:-1)+count)%count;markPalette();}
 else if(event.key==='Enter'){event.preventDefault();runPalette(paletteIndex);}
 else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closePalette();}
});
$('.palette-scrim').addEventListener('click',closePalette);
$('.palette-card').addEventListener('focusout',event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))closePalette();});
$('#command-key').textContent=keyLabel('⌘K');$('#command-toggle').title='Search and commands ('+$('#command-key').textContent+')';
