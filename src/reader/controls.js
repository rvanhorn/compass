
(() => {
  'use strict';
  const $ = (s, scope=document) => scope.querySelector(s);
  const $$ = (s, scope=document) => [...scope.querySelectorAll(s)];
  const motion=window.CompassMotion;motion.install();
  const defaults = window.__compassDefaults;
  const features=window.__compassFeatures||{};
  const enabled=key=>features[key]!==false;
  const prefs = {...defaults};
  const icon=name=>window.__compassIcons[name];
  const themeMedia=window.matchMedia?.('(prefers-color-scheme: dark)');
  const followsSystem=!document.documentElement.dataset.theme;
  const isDark=()=>document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&themeMedia?.matches);
  const storageKey = 'compass-northstar-v1';
  try {const stored = JSON.parse(enabled('remember')?localStorage.getItem(storageKey)||'{}':'{}');
    for(const k of Object.keys(defaults)){ if(stored[k]!==undefined) prefs[k]=stored[k]; }
  } catch (_) {}
  for(const key of ['accent','dark_accent'])if(!/^#[0-9a-f]{6}$/i.test(prefs[key]))prefs[key]=defaults[key]||defaults.accent;
  const paletteMigration={'#325fb4':'#2563eb','#0f766e':'#14b8a6','#c2410c':'#f97316','#7c3aed':'#8b5cf6','#a16207':'#f59e0b','#be185d':'#ec4899'};
  prefs.accent=paletteMigration[prefs.accent.toLowerCase()]||prefs.accent.toLowerCase();
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
      el.style.setProperty('--range-progress',((prefs[key]-Number(el.min))/(Number(el.max)-Number(el.min))*100)+'%');
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
  function setPanel(show){show=show&&enabled('customize');motion.transition(panel,show,()=>panel.classList.toggle('visible',show));settingsButton.setAttribute('aria-expanded',String(show));}
  settingsButton.addEventListener('click',()=>setPanel(settingsButton.getAttribute('aria-expanded')!=='true'));
  $('#close-settings').addEventListener('click',()=>setPanel(false));
  $('#reset-settings').addEventListener('click',()=>{Object.assign(prefs,defaults);apply();});
  $('#copy-settings').addEventListener('click',()=>{
    const accent=isDark()?prefs.dark_accent:prefs.accent;
    const css=':root {\n' +Object.entries(vars).map(([key,v])=>'  '+v+': '+(formats[key]?formats[key](prefs[key]):accent)+';').join('\n')+'\n  --accent-text: '+readableAccent(accent)+';\n  --accent-ink: '+document.documentElement.style.getPropertyValue('--accent-ink')+';\n}';
    copyText(css).then(()=>toast($('#copy-settings'),'Copied ✓')).catch(()=>toast($('#copy-settings'),'Copy Unavailable'));
  });
  document.addEventListener('click',e=>{if(panel.classList.contains('visible') && !panel.contains(e.target)&&!settingsButton.contains(e.target)&&!e.target.closest('.compass-color-picker'))setPanel(false);});
  async function copyText(s){
    if(navigator.clipboard && window.isSecureContext)return navigator.clipboard.writeText(s);
    const textarea=document.createElement('textarea');textarea.value=s;textarea.style.position='fixed';textarea.style.left='-9999px';document.body.append(textarea);textarea.select();
    const ok=document.execCommand('copy');textarea.remove();if(!ok)throw Error('Clipboard unavailable');
  }
  function toast(button, message){const old=button.dataset.defaultHTML||button.innerHTML;button.dataset.defaultHTML=old;button.innerHTML=(message.startsWith('Copied')?icon('check'):'')+'<span>'+message.replace(' ✓','')+'</span>';clearTimeout(button._toastTimer);button._toastTimer=setTimeout(()=>{button.innerHTML=old;},1600);}
  $$('.copy-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const code=$('pre code',btn.closest('.code-frame'))?.textContent||'';
    copyText(code).then(()=>toast(btn,'Copied ✓')).catch(()=>toast(btn,'Copy Unavailable'));
  }));
  $$('.heading-anchor').forEach(link=>link.addEventListener('click',()=>{
    const hash=link.getAttribute('href');
    const addr=location.href.split('#')[0]+hash;
    copyText(addr).then(()=>{link.title='Copied section link';}).catch(()=>{});
  }));
  const mobile=$('#mobile-toc'), mobileBtn=$('#mobile-menu');
  function setMobile(open){
    motion.transition(mobile,open,()=>mobile.classList.toggle('open',open));mobileBtn.setAttribute('aria-expanded',String(open));
    if(open){const active=$('a.active',mobile);if(active)revealOutlineLink(active);}
  }
  mobileBtn.addEventListener('click',()=>setMobile(mobileBtn.getAttribute('aria-expanded')!=='true'));
  $$('#mobile-toc a').forEach(a=>a.addEventListener('click',()=>setMobile(false)));
  const focusButton=$('#focus-toggle'),focusPanels=[$('.right-rail'),$('.section-map')].filter(Boolean),focusDefaults=new Map(focusPanels.map(element=>[element,element.hidden]));
  function focusLayout(value){
    const content=$('.main-column'),before=content.getBoundingClientRect();
    document.body.classList.toggle('focus-mode',value);
    const after=content.getBoundingClientRect();
    content._focusAnimation?.cancel();
    if(content.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&after.width)content._focusAnimation=content.animate([{transform:'translate('+ (before.left-after.left)+'px,'+(before.top-after.top)+'px) scaleX('+(before.width/after.width)+')',transformOrigin:'top left'},{transform:'none',transformOrigin:'top left'}],{duration:260,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  focusButton.addEventListener('click',()=>{
    const value=focusButton.getAttribute('aria-pressed')!=='true';
    focusButton.classList.toggle('active',value);focusButton.setAttribute('aria-pressed',String(value));
    const panels=focusPanels.filter(element=>!focusDefaults.get(element));
    if(value){let pending=panels.length;if(!pending)focusLayout(true);panels.forEach(element=>motion.transition(element,false,()=>{element.hidden=true;if(--pending===0&&focusButton.getAttribute('aria-pressed')==='true')focusLayout(true);},element.classList.contains('section-map')?'details':'panel'));}
    else{focusPanels.forEach(element=>element.hidden=focusDefaults.get(element));focusLayout(false);panels.forEach(element=>motion.transition(element,true,()=>element.hidden=false,element.classList.contains('section-map')?'details':'panel'));}
  });
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
  function showSearch(){if(!enabled('search'))return;previousFocus=document.activeElement;motion.transition(modal,true,()=>modal.classList.add('open'));modal.setAttribute('aria-hidden','false');searchInput.value='';selectedIndex=0;renderSearch();searchInput.focus();setPanel(false);}
  function closeSearch(){motion.transition(modal,false,()=>modal.classList.remove('open'));modal.setAttribute('aria-hidden','true');previousFocus?.focus?.();}
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
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(modal.classList.contains('open'))closeSearch();else showSearch();}
    if(e.key==='Escape'){closeSearch();setPanel(false);setMobile(false);closeLightbox();}
  });
  // Track the last heading above the reading line, even in long sections.
  const outlineHeadings=entries.map(item=>document.getElementById(item.id)).filter(Boolean);
  const outlineLinks=$$('.right-rail .toc-list a[data-target], #mobile-toc .toc-list a[data-target]');
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
  // Enhance rectangular tables; merged cells retain their original layout.
  const tableCollator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
  $$('.table-scroll table').forEach(table=>{
    if(!enabled('table_sort')&&!enabled('table_resize'))return;
    const head=table.tHead,body=table.tBodies[0];
    if(!head||head.rows.length!==1||!body||table.tBodies.length!==1)return;
    const headers=Array.from(head.rows[0].cells),rows=Array.from(body.rows);
    if(!headers.length||Array.from(table.rows).some(row=>row.cells.length!==headers.length||Array.from(row.cells).some(cell=>cell.colSpan!==1||cell.rowSpan!==1)))return;
    const originalOrder=new Map(rows.map((row,i)=>[row,i]));
    let widths=null,cols=null;
    function setWidth(index,value){
      if(!widths){
        widths=headers.map(th=>Math.max(64,th.getBoundingClientRect().width));
        const group=document.createElement('colgroup');
        cols=widths.map(()=>{const col=document.createElement('col');group.append(col);return col;});
        table.querySelectorAll(':scope > colgroup').forEach(group=>group.remove());
        if(table.caption)table.caption.after(group);else table.prepend(group);
        table.classList.add('table--resized');
      }
      widths[index]=Math.max(64,Math.round(value));
      cols.forEach((col,i)=>col.style.width=widths[i]+'px');
      table.style.width=widths.reduce((sum,width)=>sum+width,0)+'px';
      headers.forEach((th,i)=>th.querySelector('.column-resizer').setAttribute('aria-valuenow',widths[i]));
      schedule();
    }
    headers.forEach((th,index)=>{
      const label=th.textContent.trim();
      th.classList.add('table-interactive-header');th.setAttribute('aria-sort','none');
      const button=document.createElement('button');button.type='button';button.className='table-sort';
      while(th.firstChild)button.append(th.firstChild);
      const icon=document.createElement('span');icon.className='table-sort-icon';icon.innerHTML=window.__compassIcons['arrow-up-down'];icon.setAttribute('aria-hidden','true');button.append(icon);
      button.title='Sort by '+label;button.setAttribute('aria-label','Sort by '+label);
      button.addEventListener('click',()=>{
        const direction=th.getAttribute('aria-sort')==='ascending'?'descending':'ascending';
        headers.forEach(cell=>{cell.setAttribute('aria-sort','none');cell.querySelector('.table-sort-icon').innerHTML=window.__compassIcons['arrow-up-down'];});
        th.setAttribute('aria-sort',direction);icon.innerHTML=window.__compassIcons[direction==='ascending'?'arrow-up':'arrow-down'];
        const values=new Map(rows.map(row=>[row,row.cells[index].textContent.trim()]));
        const numeric=rows.filter(row=>values.get(row)).every(row=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(values.get(row).replace(/,/g,'')));
        rows.sort((a,b)=>{
          const av=values.get(a),bv=values.get(b);
          if(!av||!bv)return av? -1:bv?1:originalOrder.get(a)-originalOrder.get(b);
          const result=numeric?Number(av.replace(/,/g,''))-Number(bv.replace(/,/g,'')):tableCollator.compare(av,bv);
          return result*(direction==='ascending'?1:-1)||originalOrder.get(a)-originalOrder.get(b);
        });
        rows.forEach(row=>body.append(row));schedule();
      });
      const grip=document.createElement('span');grip.className='column-resizer';grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','vertical');grip.setAttribute('aria-label','Resize '+label+' column');grip.setAttribute('aria-valuemin','64');grip.setAttribute('aria-valuenow',Math.round(th.getBoundingClientRect().width));grip.title='Drag to resize; use Left or Right Arrow when focused';
      grip.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
        event.preventDefault();setWidth(index,(widths?widths[index]:th.getBoundingClientRect().width)+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?40:10));
      });
      grip.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        event.preventDefault();event.stopPropagation();
        const startX=event.clientX,startWidth=widths?widths[index]:th.getBoundingClientRect().width;
        grip.setPointerCapture(event.pointerId);document.body.classList.add('resizing-columns');
        const move=e=>setWidth(index,startWidth+e.clientX-startX);
        const stop=()=>{document.body.classList.remove('resizing-columns');grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',stop);grip.removeEventListener('pointercancel',stop);grip.removeEventListener('lostpointercapture',stop);};
        grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);grip.addEventListener('lostpointercapture',stop);
      });
      th.append(button,grip);
      if(!enabled('table_sort')){button.disabled=true;icon.hidden=true;button.removeAttribute('title');button.removeAttribute('aria-label');th.removeAttribute('aria-sort');}
      if(!enabled('table_resize'))grip.hidden=true;
    });
    const container=table.closest('.table-frame')||table.closest('.table-scroll');
    let hint=container.previousElementSibling;
    if(!hint?.classList.contains('table-scroll-note')){hint=document.createElement('div');hint.className='table-scroll-note';container.before(hint);}
    hint.textContent=[table.closest('.table-scroll--long')?rows.length+' rows · Scroll to explore':'',enabled('table_sort')?'Click Headers to Sort':'',enabled('table_resize')?'Drag Column Edges to Resize':''].filter(Boolean).join(' · ');
  });
  function revealOutlineLink(link){
    const rail=link.closest('.right-rail, .mobile-toc');
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
      const readingLine=Math.max($('.topbar').getBoundingClientRect().bottom+24,Math.min(innerHeight*.3,220));
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
  function schedule(){if(!queued){queued=true;requestAnimationFrame(tick);}}
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('hashchange',schedule);window.addEventListener('load',schedule,true);
  document.addEventListener('input',schedule);document.addEventListener('click',schedule);requestAnimationFrame(tick);
  const lightbox=$('#lightbox');
  function closeLightbox(){motion.transition(lightbox,false,()=>lightbox.classList.remove('open'));lightbox.setAttribute('aria-hidden','true');}
  $$('.md-body img').forEach(img=>{
    if(!enabled('image_zoom'))return;
    img.dataset.zoomable='true';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge image: '+(img.alt||'document image'));
    function zoom(){const full=$('img',lightbox);full.src=img.currentSrc||img.src;full.alt=img.alt;motion.transition(lightbox,true,()=>lightbox.classList.add('open'));lightbox.setAttribute('aria-hidden','false');}
    img.addEventListener('click',zoom);img.addEventListener('keydown',e=>{if(e.key==='Enter')zoom();});
  });
  lightbox.addEventListener('click',e=>{if(e.target===lightbox||e.target.closest('button'))closeLightbox();});
})();
