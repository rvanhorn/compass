// Reader interactions against the generated JavaScript renderer fixture.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..');
function page(initialScroll=0,sectionCount=0,options={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'dist/previews/readme.html'),'utf8'),{url:'http://localhost/document.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,frames=[];
  const synthetic=Array.from({length:sectionCount},(_,i)=>({id:'section-'+i,title:'Section '+(i+1),level:options.levels?options.levels[i]:2}));
  if(sectionCount){
    d.querySelector('#document').innerHTML=synthetic.map(item=>`<h${item.level} id="${item.id}">${item.title}</h${item.level}>`).join('');
    d.querySelectorAll('.toc-list').forEach(nav=>nav.innerHTML=synthetic.filter(item=>item.level<=3).map(item=>`<a href="#${item.id}" data-target="${item.id}">${item.title}</a>`).join(''));
  }
  if(options.longTable){
    d.querySelector('#document').insertAdjacentHTML('beforeend','<div class="table-frame"><div class="table-scroll table-scroll--long"><table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Example</td></tr></tbody></table></div></div>');
    const region=d.querySelector('.table-scroll--long');
    Object.defineProperty(region,'clientHeight',{value:200});
    Object.defineProperty(region,'scrollHeight',{value:1000});
  }
  if(options.interactiveTable){
    d.querySelector('#document').innerHTML='<div class="table-scroll"><table><thead><tr><th>Name</th><th>Amount</th></tr></thead><tbody><tr data-id="a"><td>Item 10</td><td>10</td></tr><tr data-id="b"><td>Item 2</td><td>2.5</td></tr><tr data-id="c"><td>Item 2</td><td>-3</td></tr><tr data-id="d"><td>Empty</td><td></td></tr></tbody></table></div>';
    d.querySelectorAll('th').forEach(th=>th.getBoundingClientRect=()=>({width:200}));
    w.HTMLElement.prototype.setPointerCapture=function(){};
  }
  w.scrollY=initialScroll;
  w.requestAnimationFrame=callback=>frames.push(callback);
  w.matchMedia=()=>({matches:true});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  Object.defineProperty(w,'innerHeight',{value:724,writable:true});
  Object.defineProperty(d.documentElement,'scrollHeight',{value:sectionCount?sectionCount*500+1000:5000,configurable:true});
  const headings=[...d.querySelectorAll('#document h2, #document h3, #document h4')];
  headings.forEach((heading,i)=>heading.getBoundingClientRect=()=>({top:300+i*500-w.scrollY}));
  d.querySelector('.topbar').getBoundingClientRect=()=>({bottom:69});
  w.localStorage.setItem('compass-northstar-v1',JSON.stringify({fontFamily:'serif',font:19,accent:'#325fb4'}));
  if(options.features)w.__compassFeatures=options.features;
  for(const script of d.querySelectorAll('script:not([src])')){
    if(options.features && script.textContent.includes("'use strict'"))w.__compassFeatures=options.features;
    if(sectionCount && script.textContent.includes('const outlineHeadings='))w.__compassTOC=synthetic;
    w.eval(script.textContent);
  }
  function flush(){while(frames.length)frames.shift()();}
  function scroll(y){w.scrollY=y;w.dispatchEvent(new w.Event('scroll'));flush();}
  flush();
  return {dom,w,d,headings,scroll,flush};
}
test('disabled reader features stay disabled and project preview ignores saved preferences',()=>{
 const {w,d}=page(0,0,{features:{remember:false,search:false,customize:false,table_sort:false,table_resize:false}});
 try{
  assert.equal(d.querySelector('#ctrl-font').value,'17');
  d.querySelector('#settings-toggle').click();assert(!d.querySelector('#settings-panel').classList.contains('visible'));
  d.querySelector('#search-toggle').click();
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
  assert(!d.querySelector('#search-modal').classList.contains('open'));
  assert.equal(d.querySelectorAll('.table-sort,.column-resizer').length,0);
 }finally{w.close();}
});
test('table sorting handles numbers, natural text, ties, blanks and preserves row nodes',()=>{
  const {w,d,flush}=page(0,0,{interactiveTable:true});
  try{
    const rows=[...d.querySelectorAll('tbody tr')],buttons=d.querySelectorAll('.table-sort');
    const ids=()=>[...d.querySelectorAll('tbody tr')].map(row=>row.dataset.id);
    buttons[1].click();flush();assert.deepEqual(ids(),['c','b','a','d']);
    assert.equal(d.querySelectorAll('th')[1].getAttribute('aria-sort'),'ascending');
    buttons[1].click();flush();assert.deepEqual(ids(),['a','b','c','d']);
    buttons[0].click();flush();assert.deepEqual(ids(),['d','b','c','a']);
    assert.equal(d.querySelectorAll('th')[1].getAttribute('aria-sort'),'none');
    assert(rows.every(row=>row.isConnected));
    assert.match(d.querySelector('.table-scroll-note').textContent,/Drag Column Edges/);
  }finally{w.close();}
});
test('table columns resize by keyboard and pointer without sorting, with a minimum width',()=>{
  const {w,d,flush}=page(0,0,{interactiveTable:true});
  try{
    const grip=d.querySelector('.column-resizer'),table=d.querySelector('table');
    grip.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));flush();
    assert.equal(table.querySelector('col').style.width,'210px');assert.equal(table.style.width,'410px');
    function pointer(type,x){grip.dispatchEvent(new w.MouseEvent(type,{clientX:x,button:0,bubbles:true}));}
    pointer('pointerdown',100);pointer('pointermove',150);pointer('pointerup',150);flush();
    assert.equal(table.querySelector('col').style.width,'260px');
    assert.equal(d.querySelector('th').getAttribute('aria-sort'),'none');
    assert(!d.body.classList.contains('resizing-columns'));
    pointer('pointerdown',100);pointer('pointermove',-1000);pointer('pointercancel',-1000);flush();
    assert.equal(grip.getAttribute('aria-valuenow'),'64');
    assert.equal(table.querySelectorAll('col')[1].style.width,'200px');
  }finally{w.close();}
});
test('outline follows scrolling in both directions and handles the document bottom',()=>{
  const {dom,w,d,headings,scroll}=page();
  try{
    function selected(index){
      for(const selector of ['.right-rail .toc-list','#mobile-toc .toc-list']){
        const active=d.querySelectorAll(selector+' a.active');
        assert.equal(active.length,1);
        assert.equal(active[0].dataset.target,headings[index].id);
        assert.equal(active[0].getAttribute('aria-current'),'location');
        assert.equal(w.getComputedStyle(active[0]).borderLeftWidth,'1px');
        assert.equal(w.getComputedStyle(active[0]).borderLeftStyle,'solid');
        assert.equal(d.querySelectorAll(selector+' [aria-current]').length,1);
      }
      assert.equal(d.querySelectorAll('.section-map a.active').length,0);
    }
    function unselected(){
      assert.equal(d.querySelectorAll('.toc-list a.active, .toc-list [aria-current]').length,0);
    }
    unselected();scroll(80);unselected();scroll(90);selected(0);
    scroll(700);selected(1);scroll(1000);selected(1);
    scroll(1250);selected(2);scroll(700);selected(1);
    scroll(4276);selected(headings.length-1);scroll(0);unselected();
    const css=d.querySelector('style').textContent;
    assert(!css.includes('border-left-color:transparent;background:transparent;color:var(--muted);font-weight:590;'));
  }finally{dom.window.close();}
});
test('a long outline follows its active item without moving the document or fighting manual scrolling',()=>{
  const {dom,w,d,scroll}=page(0,51);
  try{
    const rail=d.querySelector('.right-rail');
    Object.defineProperty(rail,'clientHeight',{value:200});
    Object.defineProperty(rail,'clientTop',{value:1});
    Object.defineProperty(rail,'scrollHeight',{value:51*38});
    rail.getBoundingClientRect=()=>({top:90,bottom:291});
    rail.querySelectorAll('a').forEach((link,i)=>link.getBoundingClientRect=()=>({top:91+i*38-rail.scrollTop,bottom:91+(i+1)*38-rail.scrollTop}));
    function visible(){
      const bounds=rail.querySelector('a.active').getBoundingClientRect();
      assert(bounds.top>=91 && bounds.bottom<=291);
    }
    scroll(12200);assert.equal(rail.querySelector('a.active').dataset.target,'section-24');visible();
    assert(rail.scrollTop>0);assert.equal(w.scrollY,12200);
    const original=rail.scrollTop;
    scroll(12250);assert.equal(rail.scrollTop,original);
    rail.scrollTop=0;scroll(12260);assert.equal(rail.scrollTop,0);
    scroll(12700);visible();assert.equal(w.scrollY,12700);
    scroll(200);visible();assert.equal(rail.scrollTop,0);
  }finally{w.close();}
});
test('outline initializes correctly when a section is already reached on load',()=>{
  const {dom,d,headings}=page(700);
  try{
    assert.equal(d.querySelector('.right-rail a.active').dataset.target,headings[1].id);
  }finally{dom.window.close();}
});
test('Contents starts collapsed and opens and closes with its native summary control',()=>{
  const {dom,w,d}=page();
  try{
    const details=d.querySelector('.contents-disclosure');
    const grid=details.querySelector('.section-map-grid');
    assert.equal(details.open,false);
    assert.notEqual(w.getComputedStyle(details.querySelector('.contents-show')).display,'none');
    assert.equal(w.getComputedStyle(details.querySelector('.contents-hide')).display,'none');
    assert.equal(w.getComputedStyle(grid).display,'none');
    details.querySelector('summary').click();
    assert.equal(details.open,true);
    assert.equal(w.getComputedStyle(details.querySelector('.contents-show')).display,'none');
    assert.notEqual(w.getComputedStyle(details.querySelector('.contents-hide')).display,'none');
    assert.equal(w.getComputedStyle(grid).display,'grid');
    details.querySelector('summary').click();
    assert.equal(details.open,false);
    assert.equal(w.getComputedStyle(grid).display,'none');
  }finally{w.close();}
});
test('old serif preferences are dropped while other saved settings survive',()=>{
  const {dom,w,d}=page();
  try{
    assert.equal(d.querySelector('#font-family-options'),null);
    assert.equal(d.documentElement.style.getPropertyValue('--text-size'),'19px');
    assert(!d.body.classList.contains('serif-reading'));
    assert.equal(JSON.parse(w.localStorage.getItem('compass-northstar-v1')).fontFamily,undefined);
    assert.equal(d.documentElement.style.getPropertyValue('--reader-font'),'');
    assert(d.querySelector('style').textContent.includes('font-family:var(--body-font)!important'));
    assert.equal(d.querySelector('#ctrl-font-default').textContent,'17px');
  }finally{w.close();}
});
test('bright accent presets retain readable text and have no footer divider',()=>{
  const {dom,w,d}=page();
  try{
    const swatches=[...d.querySelectorAll('.swatches button')];
    assert.equal(swatches.length,6);
    for(const button of swatches){
      button.click();
      assert.equal(d.documentElement.style.getPropertyValue('--accent'),button.dataset.color);
      assert(button.classList.contains('selected'));
      const rgb=button.dataset.color.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
      const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
      const foreground=d.documentElement.style.getPropertyValue('--accent-ink');
      const channels=foreground.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
      const ink=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];
      assert((Math.max(luminance,ink)+.05)/(Math.min(luminance,ink)+.05)>=4.5,button.title+' should keep button text readable');
      assert.equal(d.querySelector('#accent-name').textContent,button.title);
      assert.equal(button.getAttribute('aria-pressed'),'true');
    }
    const style=w.getComputedStyle(d.querySelector('.settings-footer'));
    assert.notEqual(style.borderTopStyle,'solid');
  }finally{w.close();}
});

test('deeper sections highlight the visible parent and remain in Find',()=>{
  const {dom,w,d,scroll}=page(0,4,{levels:[2,3,4,2]});
  try{
    assert.equal(d.querySelector('.right-rail a[data-target="section-2"]'),null);
    scroll(1200);
    assert.equal(d.querySelector('.right-rail a.active').dataset.target,'section-1');
    d.querySelector('#search-toggle').click();
    assert.equal(d.querySelectorAll('#search-results button').length,4);
  }finally{w.close();}
});
test('long table fade clears at the bottom and returns when there are more rows',()=>{
  const {dom,w,d}=page(0,0,{longTable:true});
  try{
    const frame=d.querySelector('.table-frame'),region=frame.querySelector('.table-scroll');
    assert(frame.classList.contains('has-more-below'));
    region.scrollTop=800;region.dispatchEvent(new w.Event('scroll'));
    assert(!frame.classList.contains('has-more-below'));
    region.scrollTop=400;region.dispatchEvent(new w.Event('scroll'));
    assert(frame.classList.contains('has-more-below'));
  }finally{w.close();}
});
test('preferences show defaults, preserve current values, and clearly identify custom colors',()=>{
  const {dom,w,d}=page();
  try{
    assert.equal(d.querySelector('#ctrl-font-value').value,'19');
    assert.equal(d.querySelector('#ctrl-font-default').textContent,'17px');
    assert.equal(d.querySelector('#ctrl-width-default').textContent,'930px');
    assert.equal(d.querySelector('#ctrl-leading-default').textContent,'1.75');
    assert.equal(d.querySelector('#ctrl-radius-default').textContent,'13px');
    assert.equal(d.documentElement.style.getPropertyValue('--accent'),'#2563eb');
    const custom=d.querySelector('#ctrl-accent');custom.value='#ffdd00';custom.dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.equal(d.querySelector('#accent-name').textContent,'Custom');
    assert.equal(d.querySelector('#accent-value').textContent,'#FFDD00');
    assert(d.querySelector('.custom-color').classList.contains('selected'));
    assert.equal(d.querySelectorAll('.swatches button.selected').length,0);
    d.querySelector('#reset-settings').click();
    assert.equal(d.querySelector('#ctrl-font-value').value,'17');
    assert.equal(d.querySelector('#accent-name').textContent,'Blue');
    assert.equal(d.querySelector('#print-button'),null);
  }finally{w.close();}
});
