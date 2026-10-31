import {$,$$} from './dom.js';

// Track the last heading above the reading line, even in long sections.
const entries=window.__compassTOC||[];
const outlineHeadings=entries.map(item=>document.getElementById(item.id)).filter(Boolean);
const outlineLinks=$$('.right-rail .toc-list a[data-target]');
const visibleTargets=new Set(outlineLinks.map(link=>link.dataset.target));
let lastOutlineTarget=null;
const outlineTargets=new Map(entries.map(item=>{
  if(visibleTargets.has(item.id))lastOutlineTarget=item.id;
  return [item.id,lastOutlineTarget];
}));
const longTables=$$('.table-scroll--long');
function updateTableFade(region){
  region.closest('.table-frame')?.classList.toggle('has-more-below',region.scrollHeight-region.clientHeight-region.scrollTop>2);
}
longTables.forEach(region=>region.addEventListener('scroll',()=>updateTableFade(region),{passive:true}));
export function revealOutlineLink(link){
  const rail=link.closest('.contents-scroll');
  if(!rail || !rail.clientHeight)return;
  const top=rail.getBoundingClientRect().top+rail.clientTop;
  const bottom=top+rail.clientHeight;
  const bounds=link.getBoundingClientRect();
  const padding=12;
  const delta=bounds.top<top+padding?bounds.top-top-padding:
              bounds.bottom>bottom-padding?bounds.bottom-bottom+padding:0;
  if(delta)rail.scrollTop=Math.max(0,Math.min(rail.scrollHeight-rail.clientHeight,rail.scrollTop+delta));
}
let activeHeading=null;
let queued=false;
function tick(){
  queued=false;
  const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
  const progress=max>0?Math.max(0,Math.min(100,(scrollY/max)*100)):100;
  $('#reading-progress').style.width=progress+'%';
  longTables.forEach(updateTableFade);
  if(outlineHeadings.length){
    const readingLine=Math.min(innerHeight*.3,220);
    let current=null;
    for(const heading of outlineHeadings){
      if(heading.getBoundingClientRect().top>readingLine)break;
      current=heading;
    }
    if(current && max>0 && scrollY>=max-2)current=outlineHeadings[outlineHeadings.length-1];
    const currentId=current?outlineTargets.get(current.id)||null:null;
    if(currentId!==activeHeading){
      activeHeading=currentId;
      outlineLinks.forEach(link=>{
        const active=link.dataset.target===activeHeading;
        link.classList.toggle('active',active);
        if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
        if(active)revealOutlineLink(link);
      });
    }
  }
}
export function schedule(){if(!queued){queued=true;requestAnimationFrame(tick);}}
window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule,true);
document.addEventListener('input',schedule);document.addEventListener('click',schedule);requestAnimationFrame(tick);
