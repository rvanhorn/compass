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
test('all 49 options survive project round trips and invalid values use defaults',()=>{
  assert.equal(Object.keys(api.DEFAULT_OPTIONS).length,49);
  for(const removed of ['focus','bookmarks','resume'])assert.equal(api.normalizeOptions({[removed]:false})[removed],undefined,removed+' is no longer an option');
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
test('both theme palettes and SVG colors survive projects and standalone exports',()=>{
 const options={accent:'#ee3344',dark_accent:'#ff7788',background:'#fff8f8',dark_background:'#231114',logo_color:'#000000',dark_logo_color:'#112233'};
 const publication=renderer.renderProject({...project(),options}),page=parse(publication.pages[0].html);
 for(const [property,value] of Object.entries({'--accent':options.accent,'--dark-accent':options.dark_accent,'--light-bg':options.background,'--dark-bg':options.dark_background,'--light-logo-ink':options.logo_color,'--dark-logo-ink':options.dark_logo_color}))assert.equal(page.documentElement.style.getPropertyValue(property),value);
 const favicon=Buffer.from(page.querySelector('link[rel=icon]').href.split(',')[1],'base64').toString();assert(favicon.includes('fill="#000000"'));assert(favicon.includes('stroke="#000000"'));
 assert(page.querySelector('#search-toggle svg.lucide-search'));assert(page.querySelector('.heading-anchor svg.lucide-link'));
 assert.deepEqual(api.normalizeProject(JSON.parse(JSON.stringify(publication.project))).options,api.normalizeOptions(options));
 const legacy=api.normalizeOptions({accent:'#bb2222'});assert.notEqual(legacy.dark_accent,api.DEFAULT_OPTIONS.dark_accent);
});
test('surface overrides and typography adjustments reach exports and preserve fractional values',()=>{
 const options={surface:'#fff4ee',dark_surface:'#282422',letter_spacing:.015,paragraph_spacing:24,heading_scale:1.15};
 const page=render('# Title\n\n## Heading\n\nParagraph.',{options});
 for(const [property,value] of Object.entries({'--light-surface':'#fff4ee','--dark-surface':'#282422','--letter-spacing':'.015em','--paragraph-gap':'24px','--heading-scale':'1.15'}))assert.equal(page.documentElement.style.getPropertyValue(property).replace(/^0\./,'.'),value);
 assert.deepEqual(api.normalizeOptions({...options}).letter_spacing,.015);
 const automatic=render('# Title');assert.equal(automatic.documentElement.style.getPropertyValue('--light-surface'),'');assert.equal(automatic.documentElement.style.getPropertyValue('--dark-surface'),'');
});
test('frontmatter supplies title, attribution, dates and descriptions without duplicate H1',()=>{
  const page=render('\uFEFF---\r\ntitle: Source\r\nauthor: Writer\r\ndate: 2026-10-11\r\ndescription: Intro\r\n---\r\n# Source\r\n\r\n## Section');
  assert.equal(page.querySelector('h1').textContent,'Source');assert.equal(page.querySelectorAll('h1').length,1);
  assert.equal(page.querySelector('.hero>p').textContent,'Intro');
  assert.match(page.querySelector('.meta').textContent,/Writer.*October 11, 2026/);
  assert.equal(api.parseFrontmatter('---\ntitle: [broken\n---\n# Body').metadata.title,undefined);
  assert.equal(render('# Unrelated',{metadata:{title:'Override'}}).querySelector('#document h1').textContent,'Unrelated');
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
  assert.match(page.querySelector('#publication-data').textContent,/deepest/);
  const switches=['customize','outline','contents','search','reading_time','progress','filename','footer','logo','metadata','subtitle','copy_code','section_links'];
  const disabled=render(markdown+'\n\n```js\nconst x=1;\n```',{metadata:{subtitle:'Subtitle',author:'Author'},options:Object.fromEntries(switches.map(key=>[key,false]))});
  for(const selector of ['#settings-toggle','#settings-panel','.right-rail','.section-map','#search-toggle','.reading-time','.reading-progress','.brand-doc','.doc-footer','.brand-logo','.meta','.hero>p','.copy-btn','.heading-anchor'])assert(disabled.querySelector(selector)?.hidden,selector);
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
  assert.deepEqual([...page.querySelectorAll('.publication-chapter>h1')].map(h=>h.textContent),['Alpha','Beta']);
  assert.equal([...page.querySelectorAll('a')].find(a=>a.textContent==='Next').getAttribute('href'),'#chapter-2-shared');
  for(const a of page.querySelectorAll('#document a[href^="#"]'))assert(page.getElementById(a.getAttribute('href').slice(1)),a.outerHTML);
  const reversed=project();reversed.files.reverse();
  assert.equal(parse(renderer.renderProject(reversed).pages[0].html).querySelector('.publication-chapter>h1').textContent,'Beta');
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

test('offline full-text indexes span exported pages and every result has a real destination',()=>{
 const result=renderer.renderProject({name:'Search Book',mode:'separate',files:[{name:'a.md',text:'# Alpha\n\n## Intro\n\nWords in paragraphs: éléphant.\n\n```js\nconst needle = "<unsafe>";\n```'},{name:'b.md',text:'# Beta\n\n## Reference\n\nA uniquely searchable body sentence.'}]});
 const pages=result.pages.map(page=>parse(page.html)),config=new JSDOM('').window;
 try{
  config.eval=code=>require('node:vm').runInNewContext(code,{window:config});config.eval(pages[0].querySelector('#publication-data').textContent);
  const entries=config.__compassSearch;assert(entries.some(e=>e.text.includes('éléphant')));assert(entries.some(e=>e.text.includes('const needle')));assert(entries.some(e=>e.page===result.pages[1].name&&e.text.includes('uniquely searchable')));
  for(const entry of entries){const i=result.pages.findIndex(page=>page.name===entry.page);assert(pages[i].getElementById(entry.id));}
  assert.equal(pages[0].querySelector('#publication-data').textContent.includes('<unsafe>'),false);
  assert.equal(pages[0].querySelectorAll('script[src]').length,0);
 }finally{config.close();}
});
test('publication checks identify source locations without flagging valid footnotes or removed titles',()=>{
 const result=renderer.renderProject({files:[{name:'a.md',text:'# Alpha\n\n## Good\n\n#### Gap\n\n[Broken](b.md#absent) [Title](b.md#beta) [Valid](#good) [Missing](missing.md)\n\n![](missing.png)\n\n![Remote](https://example.com/image.png)'},{name:'b.md',text:'# Beta\n\n## Target\n\nNote[^1].\n\n[^1]: Text'}]});
 const kinds=new Set(result.issues.map(issue=>issue.kind));for(const kind of ['anchor','document','image','alt','heading','online'])assert(kinds.has(kind),kind);
 assert.equal(result.issues.filter(issue=>issue.kind==='anchor').length,1);
 assert(result.issues.every(issue=>issue.source==='a.md'));
 const page=parse(result.pages[0].html);for(const issue of result.issues)assert(page.getElementById(issue.target),issue.target);
});
test('branding, local font families and print defaults survive portable project round trips',()=>{
 const logo='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64');
 const value={...project(),branding:{name:'Field & Co',footer:'Private reference <draft>',logo,favicon:logo},options:{body_font:'serif',heading_font:'mono',print_paper:'Letter',print_margin:22,print_chapters:true}};
 const result=renderer.renderProject(value),page=parse(result.pages[0].html);
 assert.equal(page.querySelector('.brand-name').textContent,'Field & Co');assert.equal(page.querySelector('.brand-logo img').src,logo);assert.equal(page.querySelector('link[rel=icon]').href,logo);assert.equal(page.querySelector('.doc-footer>span').textContent,'Private reference <draft>');
 assert.match(page.documentElement.style.getPropertyValue('--body-font'),/Georgia/);assert.match(page.documentElement.style.getPropertyValue('--heading-font'),/monospace/);
 assert.match(page.querySelector('#publication-print').textContent,/size:Letter; margin:22mm|size:Letter;margin:22mm/);assert.match(page.querySelector('#publication-print').textContent,/break-before:page/);
 assert.deepEqual(api.normalizeProject(JSON.parse(JSON.stringify(result.project))),result.project);
 assert.equal(api.normalizeOptions({body_font:'url(https://evil.test)',print_paper:'bad',print_margin:-1}).body_font,'system');
 assert.equal(api.normalizeProject({...project(),branding:{logo:'javascript:alert(1)'}}).branding.logo,'');
});
test('design presets include appearance only and reject unrelated projects',async()=>{
 const {createDesignPreset,readDesignPreset,DESIGN_KEYS}=await import('../shared/options.mjs');
 const preset=createDesignPreset({...api.DEFAULT_OPTIONS,font:21,body_font:'serif',search:false,print_margin:30},'House Style');
 assert.deepEqual(Object.keys(preset.options),DESIGN_KEYS);assert.equal(preset.options.search,undefined);assert.equal(preset.options.print_margin,undefined);assert.equal(preset.files,undefined);assert.equal(preset.options.body_font,'serif');
 assert.deepEqual(readDesignPreset(JSON.parse(JSON.stringify(preset))),preset);assert.throws(()=>readDesignPreset(project()));assert.throws(()=>readDesignPreset({...preset,version:2}));
});
test('page per H1 starts a page at each H1 and keeps links and search across the new pages',()=>{
  const result=renderer.renderProject({name:'Split Guide',mode:'heading',files:[
    {name:'a.md',text:'# Alpha\n\nOpening words.\n\n## Setup\n\nSee [the reference](#reference-notes).\n\n# Reference Notes\n\nA unique needle phrase.\n\n## Details\n\nMore.'},
    {name:'b.md',text:'# Beta\n\n## Only Section\n\n[Back to setup](a.md#setup) and [notes](a.md#reference-notes).'},
  ]});
  assert.deepEqual(result.pages.map(page=>page.title),['Alpha','Reference Notes','Beta']);
  assert.deepEqual(result.pages.map(page=>page.name),['01-a.html','02-reference-notes.html','03-b.html']);
  const [alpha,notes,beta]=result.pages.map(page=>parse(page.html));
  assert.equal(alpha.querySelector('.hero h1').textContent,'Alpha');
  assert.equal(notes.querySelector('.hero h1').textContent,'Reference Notes');
  assert.match(notes.querySelector('#document').textContent,/unique needle phrase/);
  assert.doesNotMatch(alpha.querySelector('#document').textContent,/unique needle phrase/);
  assert.equal(alpha.querySelector('#document a[href*="reference-notes"]').getAttribute('href'),'02-reference-notes.html#chapter-2-reference-notes');
  assert.equal(beta.querySelector('#document a[href*="setup"]').getAttribute('href'),'01-a.html#chapter-1-setup');
  assert.equal(beta.querySelectorAll('.publication-nav a').length,3);
  assert.match(alpha.querySelector('#publication-data').textContent,/02-reference-notes\.html/);
  assert.equal(api.exportPublication(result).mime,'application/zip');
});
test('page per H1 is a valid project mode and other values fall back to one page',async()=>{
  const {normalizeProject}=await import('../shared/options.mjs');
  assert.equal(normalizeProject({mode:'heading',files:[]}).mode,'heading');
  assert.equal(normalizeProject({mode:'chapters',files:[]}).mode,'combined');
});
test('optional text colors reach exports for each theme and stay automatic when empty',()=>{
  const page=render('# Title',{options:{text:'#1a2b3c',dark_text:'#E0E0E0'}});
  assert.equal(page.documentElement.style.getPropertyValue('--light-text'),'#1a2b3c');
  assert.equal(page.documentElement.style.getPropertyValue('--dark-text'),'#e0e0e0');
  const automatic=render('# Title');
  assert.equal(automatic.documentElement.style.getPropertyValue('--light-text'),'');
  assert.match(automatic.querySelector('style').textContent,/--ink:var\(--light-text,/);
  assert.equal(api.normalizeOptions({text:'red'}).text,'');
});
test('page per H1 points publication issues at the page that holds them',()=>{
  const result=renderer.renderProject({name:'Split Checks',mode:'heading',files:[{name:'a.md',text:'# Alpha\n\nIntro.\n\n# Second Part\n\nMore words.\n\n![](missing.png)'}]});
  const issue=result.issues.find(item=>/image/i.test(item.message));
  assert(issue,'the missing image is reported');
  assert.equal(issue.page,1);
  assert.match(issue.target,/^chapter-2/);
  assert(parse(result.pages[1].html).getElementById(issue.target),'the target id exists on that page');
});
// Requirement from the owner (2026-10-31): the reader's own controls (top bar, side nav, Customize) take the publication's
// colours, so Randomize shows the designer the whole page. Every colour token they use must be remapped inside .cx.
test('reader controls take every colour from the publication, not the workspace palette',()=>{
  const css=['src/reader/styles.css','src/shared/ui.css','src/shared/color-picker.css'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
  const mapping=fs.readFileSync(path.join(root,'src/reader/styles.css'),'utf8').match(/\.cx\{(--ui-[^}]*)\}/)[1];
  const neutral=new Set(['danger','scrim','shadow','shadow-sm']),notColour=/^(ease|font|mono|h|h-sm|in|out|r|r-panel|r-sm|row|text|text-sm|text-xs|title)$/;
  for(const name of new Set([...css.matchAll(/var\(--ui-([a-z0-9-]+)/g)].map(match=>match[1]))){
    if(neutral.has(name)||notColour.test(name))continue;
    assert.match(mapping,new RegExp('--ui-'+name+':'),'--ui-'+name+' follows the publication');
  }
});
