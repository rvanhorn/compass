
(() => {
  'use strict';
  const $ = (s, scope=document) => scope.querySelector(s);
  const $$ = (s, scope=document) => [...scope.querySelectorAll(s)];
  const defaults = window.__compassDefaults;
  const features=window.__compassFeatures||{};
  const enabled=key=>features[key]!==false;
  const prefs = {...defaults};
  const storageKey = 'compass-northstar-v1';
  try {const stored = JSON.parse(enabled('remember')?localStorage.getItem(storageKey)||'{}':'{}');
    for(const k of Object.keys(defaults)){ if(stored[k]!==undefined) prefs[k]=stored[k]; }
  } catch (_) {}
  if(!/^#[0-9a-f]{6}$/i.test(prefs.accent))prefs.accent=defaults.accent;
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
    document.documentElement.style.setProperty('--accent',prefs.accent);
    document.documentElement.style.setProperty('--accent-text',readableAccent(prefs.accent));
    const lightContrast=1.05/(luminance(prefs.accent)+.05);
    const darkContrast=(luminance(prefs.accent)+.05)/(luminance('#142238')+.05);
    document.documentElement.style.setProperty('--accent-ink',lightContrast>=4.5?'#ffffff':darkContrast>=4.5?'#142238':'#000000');
    $('#ctrl-accent').value=prefs.accent;
    $$('.swatches button').forEach(b=>{const selected=b.dataset.color===prefs.accent;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    const selected=$('.swatches button.selected');
    $('.custom-color').classList.toggle('selected',!selected);
    $('#accent-name').textContent=selected?selected.title:'Custom';
    $('#accent-value').textContent=prefs.accent.toUpperCase();
    try{if(enabled('remember'))localStorage.setItem(storageKey,JSON.stringify(prefs));}catch(_){}
  }
  apply();
  Object.keys(inputs).forEach(key=>{
    inputs[key].addEventListener('input',e=>{prefs[key]=Number(e.target.value);apply();});
    const number=$('#ctrl-'+key+'-value');
    number.addEventListener('input',()=>{if(number.value===''||!number.validity.valid)return;prefs[key]=Number(number.value);apply();});
    const commit=()=>{const min=Number(number.min),max=Number(number.max),step=Number(number.step);if(number.value!=='')prefs[key]=Number(Math.max(min,Math.min(max,min+Math.round((Number(number.value)-min)/step)*step)).toFixed(5));number.value=prefs[key];apply();};
    number.addEventListener('change',commit);number.addEventListener('blur',commit);
    number.addEventListener('keydown',event=>{if(event.key==='Enter')number.blur();});
  });
  $('#ctrl-accent').addEventListener('input',e=>{prefs.accent=e.target.value;apply();});
  $$('.swatches button').forEach(b=>b.addEventListener('click',()=>{prefs.accent=b.dataset.color;apply();}));
  const panel=$('#settings-panel'), settingsButton=$('#settings-toggle');
  function setPanel(show){show=show&&enabled('customize');panel.classList.toggle('visible',show);settingsButton.setAttribute('aria-expanded',String(show));}
  settingsButton.addEventListener('click',()=>setPanel(!panel.classList.contains('visible')));
  $('#close-settings').addEventListener('click',()=>setPanel(false));
  $('#reset-settings').addEventListener('click',()=>{Object.assign(prefs,defaults);apply();});
  $('#copy-settings').addEventListener('click',()=>{
    const css=':root {\n' +Object.entries(vars).map(([key,v])=>'  '+v+': '+(formats[key]?formats[key](prefs[key]):prefs[key])+';').join('\n')+'\n  --accent-text: '+readableAccent(prefs.accent)+';\n  --accent-ink: '+document.documentElement.style.getPropertyValue('--accent-ink')+';\n}';
    copyText(css).then(()=>toast($('#copy-settings'),'Copied ✓')).catch(()=>toast($('#copy-settings'),'Copy Unavailable'));
  });
  document.addEventListener('click',e=>{if(panel.classList.contains('visible') && !panel.contains(e.target)&&!settingsButton.contains(e.target))setPanel(false);});
  async function copyText(s){
    if(navigator.clipboard && window.isSecureContext)return navigator.clipboard.writeText(s);
    const textarea=document.createElement('textarea');textarea.value=s;textarea.style.position='fixed';textarea.style.left='-9999px';document.body.append(textarea);textarea.select();
    const ok=document.execCommand('copy');textarea.remove();if(!ok)throw Error('Clipboard unavailable');
  }
  function toast(button, message){const old=button.dataset.defaultText||button.textContent;button.dataset.defaultText=old;button.textContent=message;clearTimeout(button._toastTimer);button._toastTimer=setTimeout(()=>{button.textContent=old;},1600);}
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
    mobile.classList.toggle('open',open);mobileBtn.setAttribute('aria-expanded',String(open));
    if(open){const active=$('a.active',mobile);if(active)revealOutlineLink(active);}
  }
  mobileBtn.addEventListener('click',()=>setMobile(!mobile.classList.contains('open')));
  $$('#mobile-toc a').forEach(a=>a.addEventListener('click',()=>setMobile(false)));
  $('#focus-toggle').addEventListener('click',()=>{
    const value=document.body.classList.toggle('focus-mode');
    $('#focus-toggle').classList.toggle('active',value);
    $('#focus-toggle').setAttribute('aria-pressed',String(value));
  });
  // Search the live document outline, rather than indexing hidden/deleted text.
  const modal=$('#search-modal'), searchInput=$('#search-input'), results=$('#search-results');
  const entries=window.__compassTOC||[];
  let visible=[],selectedIndex=0,previousFocus=null;
  function filtered(){const term=searchInput.value.toLocaleLowerCase().trim();return entries.filter(e=>e.title.toLocaleLowerCase().includes(term));}
  function renderSearch(){
    visible=filtered();selectedIndex=Math.min(selectedIndex,Math.max(0,visible.length-1));
    results.replaceChildren();
    if(!visible.length){const empty=document.createElement('div');empty.className='search-empty';empty.textContent='No matching headings';results.append(empty);return;}
    visible.forEach((item,i)=>{
      const b=document.createElement('button');b.type='button';b.dataset.id=item.id;b.className=i===selectedIndex?'active':'';
      const key=document.createElement('span');key.className='key';key.textContent=item.level===2?'CH.': 'H'+item.level;
      const label=document.createElement('span');label.textContent=item.title;
      b.append(key,label);b.addEventListener('click',()=>jump(item));b.addEventListener('mouseenter',()=>{selectedIndex=i;syncSelected();});results.append(b);
    });
  }
  function syncSelected(){$$('button',results).forEach((button,i)=>button.classList.toggle('active',i===selectedIndex));}
  function showSearch(){if(!enabled('search'))return;previousFocus=document.activeElement;modal.classList.add('open');modal.setAttribute('aria-hidden','false');searchInput.value='';selectedIndex=0;renderSearch();searchInput.focus();setPanel(false);}
  function closeSearch(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');previousFocus?.focus?.();}
  function jump(item){closeSearch();const section=document.getElementById(item.id);if(section){location.hash=item.id;section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}}
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
      const icon=document.createElement('span');icon.className='table-sort-icon';icon.textContent='↕';icon.setAttribute('aria-hidden','true');button.append(icon);
      button.title='Sort by '+label;button.setAttribute('aria-label','Sort by '+label);
      button.addEventListener('click',()=>{
        const direction=th.getAttribute('aria-sort')==='ascending'?'descending':'ascending';
        headers.forEach(cell=>{cell.setAttribute('aria-sort','none');cell.querySelector('.table-sort-icon').textContent='↕';});
        th.setAttribute('aria-sort',direction);icon.textContent=direction==='ascending'?'↑':'↓';
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
  function closeLightbox(){lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');}
  $$('.md-body img').forEach(img=>{
    if(!enabled('image_zoom'))return;
    img.dataset.zoomable='true';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge image: '+(img.alt||'document image'));
    function zoom(){const full=$('img',lightbox);full.src=img.currentSrc||img.src;full.alt=img.alt;lightbox.classList.add('open');lightbox.setAttribute('aria-hidden','false');}
    img.addEventListener('click',zoom);img.addEventListener('keydown',e=>{if(e.key==='Enter')zoom();});
  });
  lightbox.addEventListener('click',e=>{if(e.target===lightbox||e.target.closest('button'))closeLightbox();});
})();
