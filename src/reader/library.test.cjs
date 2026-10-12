const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
let renderer,host;
before(async()=>{const {createRenderer}=await import('./renderer.mjs'),{loadResources}=await import('../../build-scripts/resources.mjs');host=new JSDOM('');renderer=createRenderer(await loadResources(),host.window);});
after(()=>host.window.close());
const project={id:'library-book',name:'Book',mode:'separate',files:[{name:'one.md',text:'# One\n\n## Opening\n\nAn introductory paragraph.\n\n## Later\n\nReturn to this place.'},{name:'two.md',text:'# Two\n\n## Reference\n\nA remote chapter needle in body text.\n\n```js\nconst searchableCode = 42;\n```'}]};
function open(html,{saved={},url='https://example.test/01-one.html'}={}){
 const errors=[],links=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));
 const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console}),w=dom.window,d=w.document;
 w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLAnchorElement.prototype.click=function(){links.push(this.getAttribute('href'));};w.requestAnimationFrame=callback=>{callback();return 0;};w.print=()=>{};
 for(const [key,value] of Object.entries(saved))w.localStorage.setItem(key,value);
 [...d.querySelectorAll('#document h2')].forEach((heading,i)=>heading.getBoundingClientRect=()=>({top:200+i*400-w.scrollY}));
 for(const script of d.querySelectorAll('script:not([src])'))w.eval(script.textContent);
 return {w,d,errors,links};
}
test('full-text Find searches paragraph and code text on peer pages with highlighted snippets and destinations',()=>{
 const result=renderer.renderProject(project),{w,d,links,errors}=open(result.pages[0].html);
 try{
  d.querySelector('#search-toggle').click();const input=d.querySelector('#search-input');input.value='chapter needle';input.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('#search-results button').length,1);assert.equal(d.querySelector('#search-results mark').textContent,'chapter needle');d.querySelector('#search-results button').click();assert.match(links[0],/^02-two.html\?compass-find=chapter%20needle#compass-text-/);
  d.querySelector('#search-toggle').click();input.value='searchableCode';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('#search-results button').length,1);assert.match(d.querySelector('#search-results').textContent,/searchableCode/);
  input.value='introductory';input.dispatchEvent(new w.Event('input'));d.querySelector('#search-results button').click();assert.equal(d.querySelector('#document mark.search-match').textContent,'introductory');assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('bookmarks persist per publication and resume offers the last section without overriding a direct link',()=>{
 const result=renderer.renderProject(project),first=open(result.pages[0].html);let second,deep;
 try{
  first.w.scrollY=650;first.d.querySelector('#bookmarks-toggle').click();first.d.querySelector('#save-bookmark').click();first.w.dispatchEvent(new first.w.Event('pagehide'));
  const key='compass-reading:library-book',state=first.w.localStorage.getItem(key);assert.equal(JSON.parse(state).bookmarks[0].id,'chapter-1-later');
  second=open(result.pages[1].html,{saved:{[key]:state},url:'https://example.test/02-two.html'});assert.equal(second.d.querySelector('#resume-prompt').hidden,false);assert.equal(second.d.querySelector('#resume-reading').getAttribute('href'),'01-one.html#chapter-1-later');second.d.querySelector('#bookmarks-toggle').click();assert.match(second.d.querySelector('#bookmark-list').textContent,/Later/);second.d.querySelector('#bookmark-list button').click();assert.equal(JSON.parse(second.w.localStorage.getItem(key)).bookmarks.length,0);
  deep=open(result.pages[1].html,{saved:{[key]:state},url:'https://example.test/02-two.html#chapter-2-reference'});assert.equal(deep.d.querySelector('#resume-prompt').hidden,true);
 }finally{first.w.close();second?.w.close();deep?.w.close();}
});
test('previews and disabled preference storage do not persist reading state',()=>{
 for(const options of [{preview:true},{options:{remember:false}}]){
  const result=renderer.renderProject({...project,...(options.options?{options:options.options}:{})},{preview:!!options.preview}),{w,d,errors}=open(result.pages[0].html);
  try{d.querySelector('#bookmarks-toggle').click();d.querySelector('#save-bookmark').click();w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.localStorage.getItem('compass-reading:library-book'),null);assert.deepEqual(errors,[]);}finally{w.close();}
 }
});

test('saved sections follow chapter reordering and switching between combined and separate output',()=>{
 const original=renderer.renderProject(project),first=open(original.pages[0].html);let revised;
 try{
  first.w.scrollY=650;first.d.querySelector('#bookmarks-toggle').click();first.d.querySelector('#save-bookmark').click();first.w.dispatchEvent(new first.w.Event('pagehide'));
  const key='compass-reading:library-book',state=first.w.localStorage.getItem(key),changed=renderer.renderProject({...project,mode:'combined',files:[...project.files].reverse()});
  revised=open(changed.pages[0].html,{saved:{[key]:state}});revised.d.querySelector('#bookmarks-toggle').click();
  assert.equal(revised.d.querySelector('#bookmark-list a').getAttribute('href'),'#chapter-2-later');assert.equal(revised.d.querySelector('#resume-reading').getAttribute('href'),'#chapter-2-later');
 }finally{first.w.close();revised?.w.close();}
});

test('cross-page arrivals highlight phrases across syntax spans and preserve code text',()=>{
 const result=renderer.renderProject(project),first=open(result.pages[0].html);let second;
 try{
  const entry=first.w.__compassSearch.find(entry=>entry.text.includes('const searchableCode'));
  second=open(result.pages[1].html,{url:'https://example.test/02-two.html?compass-find=const%20searchableCode#'+entry.id});
  assert.equal([...second.d.querySelectorAll('mark.search-match')].map(mark=>mark.textContent).join(''),'const searchableCode');
  assert.equal(second.d.getElementById(entry.id).textContent.trim(),'const searchableCode = 42;');
 }finally{first.w.close();second?.w.close();}
});
