const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {unzipSync,strFromU8}=require('fflate');
const root=path.resolve(__dirname,'../..');
let dom,renderer,api;
before(async()=>{
  api=await import('./renderer.mjs');
  const {loadResources}=await import('../../build-scripts/resources.mjs');
  dom=new JSDOM('');renderer=api.createRenderer(await loadResources(),dom.window);
});
after(()=>dom.window.close());
const parse=html=>new dom.window.DOMParser().parseFromString(html,'text/html');
const render=(markdown,extra={})=>parse(renderer.renderDocument({markdown,...extra}));
const project=()=>({name:'Field Guide',files:[
  {name:'book/a.md',text:'# Alpha\n\n## Shared\n\n[Next](b.md#shared)\n\nA note[^1].\n\n[^1]: First note.'},
  {name:'book/b.md',text:'# Beta\n\n## Shared\n\n[Back](a.md#shared)\n\nA note[^1].\n\n[^1]: Second note.'},
]});
test('all 33 options survive project round trips and invalid values use defaults',()=>{
  assert.equal(Object.keys(api.DEFAULT_OPTIONS).length,33);
  const options={...api.DEFAULT_OPTIONS};
  for(const key of Object.keys(options))if(typeof options[key]==='boolean')options[key]=!options[key];
  Object.assign(options,{accent:'#EC4899',background:'#123456',font:21,width:1200,radius:0,leading:2,table_rows:3,outline_depth:4,reading_speed:400});
  const normalized=api.normalizeProject({...project(),options});
  assert.deepEqual(normalized.options,{...options,accent:'#ec4899'});
  assert.deepEqual(api.normalizeProject(JSON.parse(JSON.stringify(normalized))),normalized);
  for(const key of Object.keys(api.DEFAULT_OPTIONS)) {
    const value=api.DEFAULT_OPTIONS[key],bad=typeof value==='boolean'?'false':typeof value==='number'?Infinity:'red;display:none';
    assert.equal(api.normalizeOptions({[key]:bad})[key],value,key);
  }
  assert.throws(()=>api.normalizeProject({version:2}));
  assert.throws(()=>api.normalizeProject({files:[{path:'../secret.md'}]}));
  assert.throws(()=>api.normalizeProject({files:[{path:'/secret.md'}]}));
  assert.throws(()=>renderer.renderProject({files:[]}));
});
test('frontmatter supplies title, attribution, dates and descriptions without duplicate H1',()=>{
  const page=render('\uFEFF---\r\ntitle: Source\r\nauthor: Writer\r\ndate: 2026-10-11\r\ndescription: Intro\r\n---\r\n# Source\r\n\r\n## Section');
  assert.equal(page.querySelector('h1').textContent,'Source');assert.equal(page.querySelectorAll('h1').length,1);
  assert.equal(page.querySelector('.hero>p').textContent,'Intro');
  assert.match(page.querySelector('.meta').textContent,/Writer.*October 11, 2026/);
  assert.equal(api.parseFrontmatter('---\ntitle: [broken\n---\n# Body').metadata.title,undefined);
  assert.equal(render('# Unrelated',{metadata:{title:'Override'}}).querySelector('#document h1').textContent,'Unrelated#');
});
test('extended Markdown preserves the established syntax and nested formatting',()=>{
  const page=render('~~removed~~ ==marked== ^^inserted **strong**^^ x^2^ H~2~O\n\n- [x] Done\n- [ ] Later\n\nTerm\n: Definition\n\nHTML\n\n*[HTML]: HyperText\n\nNote[^1].\n\n[^1]: Footnote\n\nhttps://example.com');
  for(const selector of ['s','mark','ins strong','sup','sub','input[type=checkbox]:checked','dl dt','abbr[title="HyperText"]','.footnote-ref','a[href="https://example.com"]'])assert(page.querySelector('#document '+selector),selector);
  assert.equal(page.querySelectorAll('#document input[type=checkbox]').length,2);
});
test('safe mode escapes HTML and metadata cannot break scripts or template interpolation',()=>{
  const title='<Title> & ${body_html} </script><script>window.bad=1</script>';
  const page=render('Literal `${title}` and `${ui_js}`.\n\n<script>window.bad=1</script>',{metadata:{title,subtitle:'<subtitle>'},options:{title_case:false}});
  assert.equal(page.querySelector('h1').textContent,title);
  assert.equal(page.querySelector('.hero>p').textContent,'<subtitle>');
  assert.equal(page.querySelector('#document script'),null);
  assert.match(page.querySelector('#document').textContent,/<script>window.bad=1<\/script>/);
  assert.equal(render('<div class="trusted">Trusted</div>',{safe:false}).querySelector('.trusted').textContent,'Trusted');
  assert.equal(page.querySelector('link[rel=stylesheet]'),null);
  assert.equal(page.querySelector('script[src]'),null);
  assert.match(page.querySelector('link[rel=icon]').href,/^data:image\/svg\+xml;base64,/);
});
test('title case preserves identifiers and heading IDs including duplicates and Unicode',()=>{
  const page=render('# working with MCP and PyYAML\n\n## use `SKILL.md` with iOS\n\n## repeat\n\n## repeat\n\n## Café 東京');
  assert.equal(page.querySelector('h1').textContent,'Working with MCP and PyYAML');
  assert.equal(page.querySelector('#use-skill-md-with-ios code').textContent,'SKILL.md');
  assert(page.getElementById('repeat-1'));assert(page.getElementById('café-東京'));
  assert.match(page.querySelector('#use-skill-md-with-ios').textContent,/Use SKILL.md with iOS/);
});
test('Contents, outline depth, Find data and display switches retain all headings',()=>{
  const markdown='# Title\n\n## Main A\n\n### Child\n\n#### Detail\n\n##### Deep\n\n###### Deepest\n\n## Main B';
  const page=render(markdown,{options:{outline_depth:4,contents_open:true}});
  assert.equal(page.querySelectorAll('.section-map-grid a').length,2);
  assert(page.querySelector('.contents-disclosure').open);
  assert.equal(page.querySelectorAll('.right-rail a[data-target]').length,5);
  assert(page.querySelector('h6 .heading-anchor'));
  assert.match(page.querySelector('script').nextElementSibling.textContent,/deepest/);
  const switches=['customize','outline','contents','search','focus','reading_time','progress','filename','footer','logo','metadata','subtitle','copy_code','section_links'];
  const disabled=render(markdown+'\n\n```js\nconst x=1;\n```',{metadata:{subtitle:'Subtitle',author:'Author'},options:Object.fromEntries(switches.map(key=>[key,false]))});
  for(const selector of ['#settings-toggle','#settings-panel','.right-rail','.section-map','#search-toggle','#focus-toggle','.reading-time','.reading-progress','.brand-doc','.doc-footer','.brand-logo','.meta','.hero>p','.copy-btn','.heading-anchor'])assert(disabled.querySelector(selector)?.hidden,selector);
  assert(disabled.querySelector('.page-shell').classList.contains('no-outline'));
});
test('tables retain all rows, status badges and configurable scrolling',()=>{
  const source='| Practice | Status | Notes |\n| --- | --- | --- |\n'+Array.from({length:15},(_,i)=>`| Row ${i} | ${i%2?'Done':'Not done'} | More |`).join('\n');
  const page=render(source);
  assert.equal(page.querySelectorAll('.table-scroll--long tbody tr').length,15);
  assert.equal(page.querySelector('.table-scroll--long').tabIndex,0);
  assert.equal(page.querySelector('.table-scroll-note').textContent,'15 rows · Scroll to explore');
  assert(page.querySelector('.table--status .status-badge--negative'));
  assert(page.querySelector('.status-badge--positive'));
  assert.equal(render(source,{options:{table_scroll:false}}).querySelector('.table-scroll--long'),null);
  assert.equal(render(source,{options:{table_rows:20}}).querySelector('.table-scroll--long'),null);
});
test('alerts, assessments and highlighting remain available and configurable',()=>{
  const source='# Title\n\n## Practice\n\n> [!TIP]\n> Try this.\n\n- What it is: Definition.\n- Benefit: Benefit.\n- Us: Use `commit` and **checks**.\n\n```javascript\nconst x = "<script>";\n```\n\n```unknown-language\n<script>\n```';
  const page=render(source);
  assert(page.querySelector('.callout-tip[role=note]'));
  assert.equal(page.querySelectorAll('.assessment-item').length,3);
  assert.equal(page.querySelector('[data-label=us] .assessment-label').textContent,'Current State');
  assert.equal(page.querySelectorAll('.right-rail a').length,1);
  assert(page.querySelector('.hljs-keyword'));assert.equal(page.querySelectorAll('.copy-btn').length,2);
  assert.equal(page.querySelectorAll('.code-frame')[1].querySelector('code').textContent,'<script>\n');
  assert.equal(render(source,{options:{assessments:false}}).querySelector('.assessment'),null);
});
test('media loaders appear only when required and enabled',()=>{
  const plain=renderer.renderDocument({markdown:'# Plain'});
  const math=renderer.renderDocument({markdown:'# Math\n\n$x^2$\n\n$$\nx^2 + y^2\n$$'});
  const diagram=renderer.renderDocument({markdown:'# Diagram\n\n```mermaid\ngraph LR\nA-->B\n```'});
  assert(!plain.includes('window.MathJax='));assert(!plain.includes('await import('));
  assert(math.includes('window.MathJax='));assert(!math.includes('await import('));
  const mediaConfig=[...parse(math).querySelectorAll('script')].find(s=>s.textContent.includes('window.MathJax='));
  const host={};new Function('window',mediaConfig.textContent)(host);
  assert.deepEqual(host.MathJax.tex.inlineMath,[['\\(','\\)']]);
  assert.deepEqual(host.MathJax.tex.displayMath,[['\\[','\\]']]);
  assert(diagram.includes('await import('));assert(!diagram.includes('window.MathJax='));
  assert.equal(parse(math).querySelector('.math-block').textContent,'\\[x^2 + y^2\\]');
  const disabled=renderer.renderDocument({markdown:'$x$\n\n```mermaid\nA-->B\n```',options:{media:false}});
  assert(!disabled.includes('window.MathJax='));assert(!disabled.includes('await import('));
  assert(parse(disabled).querySelector('.mermaid'));assert(parse(disabled).querySelector('.math-inline'));
});
test('combined chapters namespace IDs, footnotes, cross links and preserve order',()=>{
  const result=renderer.renderProject(project()),page=parse(result.pages[0].html);
  assert.deepEqual(result.warnings,[]);
  const ids=[...page.querySelectorAll('[id]')].map(el=>el.id);assert.equal(ids.length,new Set(ids).size);
  assert.deepEqual([...page.querySelectorAll('.publication-chapter>h1')].map(h=>h.textContent),['Alpha#','Beta#']);
  assert.equal([...page.querySelectorAll('a')].find(a=>a.textContent==='Next').getAttribute('href'),'#chapter-2-shared');
  for(const a of page.querySelectorAll('#document a[href^="#"]'))assert(page.getElementById(a.getAttribute('href').slice(1)),a.outerHTML);
  const reversed=project();reversed.files.reverse();
  assert.equal(parse(renderer.renderProject(reversed).pages[0].html).querySelector('.publication-chapter>h1').textContent,'Beta#');
});
test('separate pages export a portable ZIP with publication navigation',()=>{
  const result=renderer.renderProject({...project(),mode:'separate'});
  const page=parse(result.pages[0].html);
  assert.equal(page.querySelectorAll('.publication-nav a').length,2);
  assert.equal([...page.querySelectorAll('a')].find(a=>a.textContent==='Next').getAttribute('href'),'02-b.html#chapter-2-shared');
  const exported=api.exportPublication(result),zip=unzipSync(exported.data);
  assert.equal(exported.mime,'application/zip');assert.equal(exported.name,'field-guide.zip');
  assert.deepEqual(Object.keys(zip).sort(),['01-a.html','02-b.html','compass.json','index.html']);
  assert.equal(JSON.parse(strFromU8(zip['compass.json'])).mode,'separate');
  const single=api.exportPublication(renderer.renderProject({files:[project().files[0]]}));
  assert.equal(single.mime,'text/html; charset=utf-8');assert(strFromU8(single.data).startsWith('<!doctype html>'));
});
test('source-relative assets and unresolved links produce useful output and warnings',()=>{
  const result=renderer.renderProject({files:[{name:'folder/a.md',text:'# A\n\n![X](../images/x.png)\n\n[Missing](missing.md)',assets:{'../images/x.png':'data:image/png;base64,eA=='}}]});
  assert.equal(parse(result.pages[0].html).querySelector('#document img').getAttribute('src'),'data:image/png;base64,eA==');
  assert.deepEqual(result.warnings,['Linked Markdown is not included: missing.md']);
  assert.deepEqual(renderer.renderProject({files:[{name:'a.md',text:'![X](missing.png)'}]}).warnings,['Image could not be embedded: missing.png']);
});
test('bundled examples have working chapter links, assets and no warnings in both modes',()=>{
  for(const name of ['feature-guide','two-chapter-guide'])for(const mode of ['combined','separate']) {
    const value=JSON.parse(fs.readFileSync(path.join(root,'demo/'+name+'.compass.json'),'utf8'));
    value.mode=mode;
    for(const doc of value.files){doc.name=doc.path;doc.text=fs.readFileSync(path.join(root,doc.path),'utf8');delete doc.path;doc.assets={'assets/publishing-workflow.svg':'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'demo/assets/publishing-workflow.svg')).toString('base64')};}
    const result=renderer.renderProject(value),pages=new Map(result.pages.map(p=>[p.name,parse(p.html)]));
    assert.deepEqual(result.warnings,[]);
    for(const [name,page] of pages)for(const a of page.querySelectorAll('#document a[href]')) {
      const href=a.getAttribute('href');if(!href.includes('#')||/^[a-z]+:/i.test(href))continue;
      const [target,fragment]=href.split('#');assert(pages.get(target||name)?.getElementById(fragment),href);
    }
  }
});
