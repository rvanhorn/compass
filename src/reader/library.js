(() => {
  'use strict';
  const $=selector=>document.querySelector(selector),features=window.__compassFeatures||{};
  const page=window.__compassPage||'',index=window.__compassSearch||[];
  const key='compass-reading:'+window.__compassPublication;
  const persistent=features.remember!==false&&!window.__compassPreview;
  let state={bookmarks:[],resume:null};
  const resolve=item=>{
    if(!item||typeof item.id!=='string'||typeof item.page!=='string')return null;
    const entry=item.source&&item.anchor?index.find(entry=>entry.source===item.source&&entry.anchor===item.anchor):index.find(entry=>entry.id===item.id&&entry.page===item.page);
    return entry?{id:entry.id,page:entry.page,title:entry.title,source:entry.source,anchor:entry.anchor}:null;
  };
  try{
    const saved=persistent?JSON.parse(localStorage.getItem(key)||'null'):null;
    if(saved){state.bookmarks=Array.isArray(saved.bookmarks)?saved.bookmarks.map(resolve).filter(Boolean).slice(0,100):[];state.resume=resolve(saved.resume);}
  }catch(_){}
  const store=()=>{try{if(persistent){localStorage.setItem(key,JSON.stringify(state));return true;}}catch(_){}return false;};
  function current(){
    const headings=[...document.querySelectorAll('#document h1[id],#document h2[id],#document h3[id],#document h4[id],#document h5[id],#document h6[id]')];
    const node=headings.filter(node=>node.getBoundingClientRect().top<=110).at(-1)||headings[0]||document.querySelector('.hero h1[id]')||document.querySelector('#document [id]');
    return node?resolve({id:node.id,page}):null;
  }
  const href=item=>(item.page===page?'':item.page)+'#'+encodeURIComponent(item.id);
  function render(){
    const list=$('#bookmark-list');list.replaceChildren();
    if(!state.bookmarks.length){const empty=document.createElement('p');empty.textContent='No bookmarks yet. Save a section to return to it later.';list.append(empty);}
    state.bookmarks.forEach(item=>{
      const row=document.createElement('div');row.className='bookmark-row';
      const a=document.createElement('a');a.href=href(item);a.textContent=item.title||item.id;a.addEventListener('click',()=>$('#reader-library').close());
      const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove bookmark '+(item.title||item.id));
      remove.addEventListener('click',()=>{state.bookmarks=state.bookmarks.filter(entry=>entry!==item);store();render();$('#library-status').textContent='Bookmark removed.';});
      row.append(a,remove);list.append(row);
    });
  }
  $('#bookmarks-toggle').addEventListener('click',()=>{if(features.bookmarks===false)return;render();$('#reader-library').showModal();});
  $('#close-library').addEventListener('click',()=>$('#reader-library').close());
  $('#save-bookmark').addEventListener('click',()=>{
    const item=current();if(!item)return;
    if(state.bookmarks.some(entry=>entry.id===item.id&&entry.page===page)){$('#library-status').textContent='This section is already bookmarked.';return;}
    if(state.bookmarks.length>=100){$('#library-status').textContent='Remove a bookmark before adding another (100 maximum).';return;}
    state.bookmarks.push(item);const saved=store();render();$('#library-status').textContent=saved?'Section bookmarked.':'Section bookmarked for this session.';
  });
  if(features.resume!==false&&state.resume&&!location.hash){$('#resume-reading').href=href(state.resume);$('#resume-prompt').hidden=false;}
  $('#dismiss-resume').addEventListener('click',()=>$('#resume-prompt').hidden=true);
  $('#resume-reading').addEventListener('click',()=>$('#resume-prompt').hidden=true);
  let timer;
  const remember=()=>{if(features.resume===false||!persistent)return;const item=current();if(item){state.resume=item;store();}};
  window.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(remember,500);},{passive:true});
  window.addEventListener('pagehide',()=>{clearTimeout(timer);remember();});
  $('#reader-print').addEventListener('click',()=>window.print());
})();
