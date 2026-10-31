import {$,$$,motion,enabled} from './dom.js';
import {setPanel} from './customize.js';

// The publication carries its own full-text index, including peer pages.
const modal=$('#search-modal'), searchInput=$('#search-input'), results=$('#search-results');
const entries=window.__compassTOC||[];
let visible=[],selectedIndex=0,previousFocus=null;
const pageName=window.__compassPage||'';
const searchEntries=(window.__compassSearch||[]).filter(item=>item.page!==pageName||document.getElementById(item.id));
for(const entry of entries)if(!searchEntries.some(item=>item.id===entry.id&&(!item.page||item.page===pageName)))searchEntries.push({...entry,page:pageName,text:entry.title,heading:true});
function filtered(){const term=searchInput.value.toLocaleLowerCase().trim();return searchEntries.filter(e=>term?e.text.toLocaleLowerCase().includes(term):e.heading).slice(0,100);}
function marked(container,text,term){
  let cursor=0,at=term?text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()):-1;
  while(at>=0){
    container.append(document.createTextNode(text.slice(cursor,at)));const mark=document.createElement('mark');mark.textContent=text.slice(at,at+term.length);container.append(mark);
    cursor=at+term.length;at=text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase(),cursor);
  }
  container.append(document.createTextNode(text.slice(cursor)));
}
function highlightResult(id,term){
  $$('#document mark.search-match').forEach(mark=>{const parent=mark.parentNode;mark.replaceWith(document.createTextNode(mark.textContent));parent.normalize();});
  const node=document.getElementById(id);if(!node||!term)return;
  const walker=document.createTreeWalker(node,4),texts=[];let text,offset=0;
  while((text=walker.nextNode()))if(!text.parentElement.closest('button,a.heading-anchor,script,style')){texts.push({node:text,start:offset});offset+=text.length;}
  const full=texts.map(item=>item.node.data).join('').toLocaleLowerCase(),needle=term.toLocaleLowerCase(),matches=[];
  for(let at=full.indexOf(needle);at>=0;at=full.indexOf(needle,at+needle.length))matches.push([at,at+needle.length]);
  for(const item of texts){
    const source=item.node.data,fragment=document.createDocumentFragment();let cursor=0;
    for(const [start,end] of matches){const from=Math.max(0,start-item.start),to=Math.min(source.length,end-item.start);if(from>=to)continue;
      fragment.append(document.createTextNode(source.slice(cursor,from)));const mark=document.createElement('mark');mark.className='search-match';mark.textContent=source.slice(from,to);fragment.append(mark);cursor=to;
    }
    fragment.append(document.createTextNode(source.slice(cursor)));item.node.replaceWith(fragment);
  }
}
function renderSearch(){
  visible=filtered();selectedIndex=Math.min(selectedIndex,Math.max(0,visible.length-1));
  results.replaceChildren();
  if(!visible.length){const empty=document.createElement('div');empty.className='search-empty';empty.textContent='No matching text';results.append(empty);return;}
  const term=searchInput.value.trim();
  visible.forEach((item,i)=>{
    const b=document.createElement('button');b.type='button';b.dataset.id=item.id;b.className=i===selectedIndex?'active':'';
    const key=document.createElement('span');key.className='key';key.textContent=item.heading?'§':'TXT';
    const label=document.createElement('span');label.className='search-copy';
    const title=document.createElement('strong');title.textContent=item.title;label.append(title);
    if(term){const snippet=document.createElement('span'),at=item.text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()),start=Math.max(0,at-45);marked(snippet,(start?'…':'')+item.text.slice(start,start+180)+(item.text.length>start+180?'…':''),term);label.append(snippet);}
    if(item.page&&item.page!==pageName){const page=document.createElement('small');page.textContent=item.page;label.append(page);}
    b.append(key,label);b.addEventListener('click',()=>jump(item));b.addEventListener('mouseenter',()=>{selectedIndex=i;syncSelected();});results.append(b);
  });
}
function syncSelected(){$$('button',results).forEach((button,i)=>{button.classList.toggle('active',i===selectedIndex);if(i===selectedIndex)button.scrollIntoView({block:'nearest'});});}
export function showSearch(){if(!enabled('search'))return;previousFocus=document.activeElement;motion.transition(modal,true,()=>modal.classList.add('open'));modal.setAttribute('aria-hidden','false');searchInput.value='';selectedIndex=0;renderSearch();searchInput.focus();setPanel(false);}
export function closeSearch(){motion.transition(modal,false,()=>modal.classList.remove('open'));modal.setAttribute('aria-hidden','true');previousFocus?.focus?.();}
export const searchOpen=()=>modal.classList.contains('open');
function jump(item){
  closeSearch();const term=searchInput.value.trim();
  if(item.page&&item.page!==pageName){
    const a=document.createElement('a');a.href=item.page+'?compass-find='+encodeURIComponent(term)+'#'+encodeURIComponent(item.id);document.body.append(a);a.click();a.remove();return;
  }
  const section=document.getElementById(item.id);if(section){location.hash=item.id;highlightResult(item.id,term);section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
}
const initialQuery=window.__compassQuery||new URLSearchParams(location.search).get('compass-find');
if(initialQuery&&enabled('search')){let id=location.hash.slice(1);try{id=decodeURIComponent(id);}catch(_){}highlightResult(window.__compassHash||id,initialQuery);}
$('#search-toggle').addEventListener('click',showSearch);
$('#close-search').addEventListener('click',closeSearch);
modal.addEventListener('click',e=>{if(e.target===modal)closeSearch();});
searchInput.addEventListener('input',()=>{selectedIndex=0;renderSearch();});
searchInput.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();selectedIndex=Math.min(visible.length-1,selectedIndex+1);syncSelected();}
  if(e.key==='ArrowUp'){e.preventDefault();selectedIndex=Math.max(0,selectedIndex-1);syncSelected();}
  if(e.key==='Enter'&&visible[selectedIndex]){e.preventDefault();jump(visible[selectedIndex]);}
});
