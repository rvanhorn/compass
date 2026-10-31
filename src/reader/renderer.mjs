import {DEFAULT_OPTIONS,normalizeOptions,normalizeProject,normalizeBranding,FONT_STACKS,basename,stem,slug,normalizePath,resolvePath} from '../shared/options.mjs';
import {publicationChecks,indexPage,publicationKey} from './publication.mjs';
import {createMarkdown,parseFrontmatter,escapeHTML as esc} from './markdown.mjs';
import {zipSync,strToU8} from 'fflate';
import {icon,ICON_HTML} from '../shared/icons.mjs';
export {DEFAULT_OPTIONS,normalizeOptions,normalizeProject,parseFrontmatter};

const HEADING='h1,h2,h3,h4,h5,h6';
const SMALL=new Set('a an and as at but by for from in into nor of on or per than the to via with'.split(' '));
const WORD=/\p{L}[\p{L}\p{N}_]*(?:[’'.-][\p{L}\p{N}_]+)*/gu;
const PALETTE=[['#3b5bdb','Indigo'],['#14b8a6','Teal'],['#f97316','Orange'],['#8b5cf6','Violet'],['#f59e0b','Amber'],['#ec4899','Pink']];
const CLOCK=icon('clock');
const HIDDEN={customize:'#settings-toggle,#settings-panel',outline:'.right-rail,#mobile-menu,#mobile-toc',contents:'.section-map',search:'#search-toggle,#search-modal,.rail-hint',reading_time:'.reading-time',progress:'.reading-progress',filename:'.brand-doc',footer:'.doc-footer',logo:'.brand-logo',metadata:'.meta',subtitle:'.hero>p',copy_code:'.copy-btn',section_links:'.heading-anchor'};
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const plain=node=>node.textContent.trim().replace(/\s+/g,' ');
const decode=value=>{try{return decodeURIComponent(value);}catch(_){return value;}};
const external=value=>/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
function urlParts(value) {
  const [beforeHash,...hash]=value.split('#');
  return {path:beforeHash.split('?')[0],fragment:hash.join('#')};
}
export function titleCase(value,start=0,total=null) {
  total??=[...value.matchAll(WORD)].length;
  let index=start;
  return value.replace(WORD,word=>{
    const position=index++;
    if(word.includes('.')||word.includes('_')||word!==word.toLowerCase())return word;
    if(position>0&&position<total-1&&SMALL.has(word))return word;
    return word.split('-').map(part=>part[0].toUpperCase()+part.slice(1)).join('-');
  });
}
function titleCaseElement(element) {
  const walker=element.ownerDocument.createTreeWalker(element,4),nodes=[];
  let node;while((node=walker.nextNode()))if(!node.parentElement.closest('code,script,style'))nodes.push(node);
  const total=nodes.reduce((n,text)=>n+[...text.data.matchAll(WORD)].length,0);
  let offset=0;
  for(const text of nodes){const count=[...text.data.matchAll(WORD)].length;text.data=titleCase(text.data,offset,total);offset+=count;}
}
function textValue(value) {
  if(value===null||value===undefined)return '';
  if(typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)) {
    const date=new Date(value+'T12:00:00Z');
    if(Number.isFinite(date.getTime()))return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);
  }
  return String(value);
}
function getTitle(body,metadata,filename,keep=false) {
  let title=String(metadata.title??'').trim();
  const h1=body.querySelector('h1');
  if(!title&&h1)title=plain(h1);
  if(!title)title=stem(filename).replace(/[_-]/g,' ').replace(/\b\w/g,char=>char.toUpperCase());
  if(!keep&&h1&&plain(h1).toLowerCase()===title.toLowerCase()&&body.querySelector(HEADING)===h1)h1.remove();
  return title;
}
function alerts(body) {
  for(const quote of [...body.querySelectorAll('blockquote')]) {
    const p=quote.querySelector(':scope > p'),first=p?.firstChild;
    if(first?.nodeType!==3)continue;
    const match=/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i.exec(first.data);
    if(!match)continue;
    const label=match[1].toUpperCase();first.data=first.data.slice(match[0].length);
    if(!plain(p)&&!p.querySelector('*'))p.remove();
    const alert=body.ownerDocument.createElement('aside');alert.className='callout callout-'+label.toLowerCase();alert.setAttribute('role','note');
    alert.innerHTML='<div class="callout-head"><span class="icon" aria-hidden="true">'+icon({NOTE:'info',TIP:'lightbulb',IMPORTANT:'info',WARNING:'warning',CAUTION:'caution'}[label])+'</span><span>'+titleCase(label.toLowerCase())+'</span></div>';
    alert.append(...quote.childNodes);quote.replaceWith(alert);
  }
}
function assessments(body) {
  const pattern=/^\s*(What it is|Benefit|Cost|Us|Why it hinders us|Recommendation):\s*/i;
  for(const list of [...body.querySelectorAll('ul')]) {
    const items=[...list.children].filter(n=>n.tagName==='LI');
    const matches=items.map(item=>{const walker=body.ownerDocument.createTreeWalker(item,4),node=walker.nextNode();return {node,match:node&&pattern.exec(node.data)};});
    if(items.length<2||matches.some(m=>!m.match)||!matches.some(m=>m.match[1].toLowerCase()==='what it is'))continue;
    const headings=[...body.querySelectorAll(HEADING)].filter(h=>!h.classList.contains('assessment-label')&&(h.compareDocumentPosition(list)&4));
    const level=Math.min(6,Number(headings.at(-1)?.tagName[1]||2)+1),group=body.ownerDocument.createElement('div');group.className='assessment';
    items.forEach((item,index)=>{
      const {node,match}=matches[index],label=match[1].toLowerCase();node.data=node.data.slice(match[0].length);
      const section=body.ownerDocument.createElement('div');section.className='assessment-item';section.dataset.label=label;
      const h=body.ownerDocument.createElement('h'+level);h.className='assessment-label';h.textContent=({us:'Current State','why it hinders us':'Impact of the Gap'}[label])||titleCase(label);
      const content=body.ownerDocument.createElement('div');content.className='assessment-body';
      if(!item.querySelector(':scope > p,:scope > ul,:scope > ol,:scope > pre,:scope > blockquote')) {
        const p=body.ownerDocument.createElement('p');p.append(...item.childNodes);content.append(p);
      } else content.append(...item.childNodes);
      section.append(h,content);group.append(section);
    });
    list.replaceWith(group);
  }
}
function enhance(body,options,assets={}) {
  alerts(body);if(options.assessments)assessments(body);
  for(const table of [...body.querySelectorAll('table')]) {
    const rows=[...table.querySelectorAll('tr')],count=Math.max(1,...rows.map(row=>[...row.children].filter(cell=>['TH','TD'].includes(cell.tagName)).length));
    table.classList.add('data-table');if(count===2)table.classList.add('table--two-col');
    const headers=table.querySelectorAll('thead th');
    if(count===3&&headers.length===3&&['status','state','result'].includes(plain(headers[1]).toLowerCase())) {
      table.classList.add('table--status');
      for(const cell of table.querySelectorAll('tbody tr > td:nth-child(2)')) {
        const value=plain(cell).toLowerCase(),state=['followed','pass','done','yes'].includes(value)?'positive':['not done','fail','no'].includes(value)?'negative':'mixed';
        const badge=body.ownerDocument.createElement('span');badge.className='status-badge status-badge--'+state;badge.append(...cell.childNodes);cell.append(badge);
      }
    }
    table.style.setProperty('--table-min',(count===2?660:Math.min(1400,Math.max(560,count*170)))+'px');
    const wrap=body.ownerDocument.createElement('div');wrap.className='table-scroll';wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Data table (scroll horizontally for more columns)');wrap.tabIndex=0;
    table.replaceWith(wrap);wrap.append(table);
    const dataRows=table.querySelectorAll('tbody tr').length;
    if(options.table_scroll&&dataRows>options.table_rows&&table.querySelector('thead')) {
      wrap.classList.add('table-scroll--long');wrap.setAttribute('aria-label',`Data table with ${dataRows} rows (scroll to view all rows and columns)`);
      const note=body.ownerDocument.createElement('div');note.className='table-scroll-note';note.textContent=dataRows+' rows · Scroll to explore';
      const frame=body.ownerDocument.createElement('div');frame.className='table-frame has-more-below';wrap.replaceWith(note,frame);frame.append(wrap);
    }
  }
  for(const image of body.querySelectorAll('img')) {
    image.setAttribute('loading','lazy');image.setAttribute('decoding','async');if(!image.hasAttribute('alt'))image.alt='';
    const src=image.getAttribute('src')||'',path=decode(urlParts(src).path);
    if(!external(src)&&assets[path])image.setAttribute('src',assets[path]);
  }
  for(const link of body.querySelectorAll('a[href]'))if(/^https?:\/\//i.test(link.getAttribute('href'))) {
    link.target='_blank';link.rel='noopener noreferrer';
  }
}
function assignHeadingIDs(body) {
  const counts=new Map();
  for(const heading of body.querySelectorAll(HEADING)) {
    if(heading.id)continue;
    const base=plain(heading).toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'')||'section';
    const count=counts.get(base)||0;counts.set(base,count+1);heading.id=base+(count?'-'+count:'');
  }
}
const tocOf=body=>[...body.querySelectorAll(HEADING)].filter(h=>h.id).map(h=>({id:h.id,title:plain(h),level:Number(h.tagName[1])}));
function tocMarkup(toc,depth) {
  const actual=toc.length?Math.min(...toc.map(t=>t.level)):2;
  return toc.filter(t=>t.level-actual<depth).map(t=>`<a href="#${esc(t.id)}" class="lvl-${t.level} depth-${t.level-actual}" data-target="${esc(t.id)}" title="${esc(t.title)}">${esc(t.title)}</a>`).join('');
}
function contentsMarkup(toc) {
  const base=Math.min(...toc.map(t=>t.level)),chapters=toc.filter(t=>t.level===base);
  if(chapters.length<2)return '';
  const cards=chapters.map((t,index)=>`<a href="#${esc(t.id)}"><b aria-hidden="true">${String(index+1).padStart(2,'0')}</b><span class="chapter-name">${esc(t.title.replace(/^\s*\d{1,3}\s*[.·–—:\-]\s*/,''))}</span><span class="chapter-arrow" aria-hidden="true">${icon('arrow-up-right')}</span></a>`).join('');
  return `<section class="section-map" aria-label="Chapter directory"><details class="contents-disclosure"><summary class="section-map-head"><strong>Contents</strong><span>${chapters.length} sections</span><span class="contents-action"><span class="contents-show">Show Sections</span><span class="contents-hide">Hide Sections</span></span><span class="contents-chevron" aria-hidden="true">${icon('chevron-right')}</span></summary><nav class="section-map-grid" aria-label="Chapter shortcuts">${cards}</nav></details></section>`;
}

/** DOM-based renderer; accepts an inert DOMParser in browsers and in Node tests. */
export function createRenderer(resources,window) {
  const parse=html=>new window.DOMParser().parseFromString(html,'text/html');
  const fragment=html=>parse('<!doctype html><html><body>'+html+'</body></html>').body;
  function prepare(source,{safe=true,options={},assets={}}={}) {
    const {metadata,markdown}=parseFrontmatter(source),body=fragment(createMarkdown(safe).render(markdown));
    assignHeadingIDs(body);enhance(body,normalizeOptions(options),assets);
    return {metadata,markdown,body};
  }
  function renderDocument({source='document.md',markdown='',metadata={},body=null,options={},safe=true,assets={},keepTitle=false,branding={}}={}) {
    options=normalizeOptions(options);
    branding=normalizeBranding(branding);
    if(!body) {
      const prepared=prepare(markdown,{safe,options,assets});
      body=prepared.body;metadata={...prepared.metadata,...metadata};markdown=prepared.markdown;
    }
    let title=getTitle(body,metadata,source,keepTitle);
    if(options.title_case) {title=titleCase(title);for(const el of body.querySelectorAll(HEADING+',th,button'))titleCaseElement(el);}
    const first=body.querySelector('h1[id],h2[id],h3[id],h4[id]');
    if(first) {
      const before=[];let sibling=first.previousSibling;while(sibling){before.unshift(sibling);sibling=sibling.previousSibling;}
      const paragraphs=before.filter(n=>n.nodeType===1&&n.tagName==='P');
      if(paragraphs.length>=2&&before.every(n=>n.nodeType!==1||n.tagName==='P')) {
        const intro=body.ownerDocument.createElement('section');intro.className='document-intro';intro.setAttribute('aria-label','Overview');intro.innerHTML='<p class="document-intro-label">Overview</p>';intro.append(...paragraphs);first.before(intro);
      }
    }
    const toc=tocOf(body),headings=tocMarkup(toc,options.outline_depth);
    for(const heading of body.querySelectorAll(HEADING))if(heading.id) {
      const link=body.ownerDocument.createElement('a');link.className='heading-anchor';link.setAttribute('href','#'+heading.id);link.setAttribute('aria-label','Copy link to section');link.innerHTML=icon('link');heading.append(link);
    }
    const subtitle=textValue(metadata.subtitle||metadata.description).trim(),author=textValue(metadata.author).trim(),date=textValue(metadata.date).trim();
    const words=(markdown.match(/[\p{L}\p{N}_]+/gu)||[]).length,minutes=Math.max(1,Math.round(words/options.reading_speed));
    // The icon is drawn in the workspace's Iris accent; a publication shows it in its own accent.
    const logo=resources['shared/favicon.svg'].replaceAll('#5b5bd6',options.accent);
    const favicon=branding.favicon||'data:image/svg+xml;base64,'+window.btoa(unescape(encodeURIComponent(logo.replaceAll('#fff',options.logo_color))));
    const rail=toc.length?'<aside class="right-rail contents-card cx cx-card" id="contents-card" aria-label="Contents"><div class="cx-head"><div class="cx-head-text"><h2>Contents</h2></div><button type="button" class="cx-btn icon sm" id="pin-contents" aria-pressed="false" aria-label="Dock Contents Beside the Page" title="Dock beside the page">'+icon('pin')+'</button><button type="button" class="cx-btn icon sm" id="close-contents" aria-label="Close Contents">'+icon('x')+'</button></div><div class="contents-scroll"><nav class="contents-pages" aria-label="Pages" hidden></nav><div class="rail-title">On This Page</div><nav class="toc-list">'+headings+'</nav><div class="rail-hint"><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> to find any text</div></div></aside>':'';
    const defaults=Object.fromEntries(['font','width','radius','leading','accent','dark_accent'].map(key=>[key,options[key]]));
    const media=options.media?((body.querySelector('.math-inline,.math-block')?resources['reader/assets/mathjax-loader.html']:'')+(body.querySelector('.mermaid')?resources['reader/assets/mermaid-loader.html']:'')):'';
    const substitutions={
      ...Object.fromEntries(Object.entries(ICON_HTML).map(([name,svg])=>['icon_'+name.replaceAll('-','_'),svg])),
      description:esc(subtitle||title),favicon_uri:favicon,logo_svg:logo,title:esc(title),source_name:esc(basename(source)),
      css:(resources['shared/tokens.css']||'')+'\n'+(resources['shared/ui.css']||'')+'\n'+resources['reader/styles.css']+'\n'+resources['shared/color-picker.css'],syntax_css:resources.syntax_css||'',picker_js:resources['shared/motion.js']+'\n'+resources['shared/color-picker.js'],ui_js:resources['reader/controls.js']+'\n'+(resources['reader/library.js']||''),
      headings_html:headings,swatch_html:PALETTE.map(([c,name])=>`<button type="button" data-color="${c}" title="${name}" aria-label="Set ${name} accent" aria-pressed="false"><span class="swatch-dot" style="background:${c}"></span><span>${name}</span></button>`).join(''),
      shell_class:'page-shell'+(toc.length?'':' no-outline'),subtitle_html:subtitle?'<p>'+esc(subtitle)+'</p>':'',
      meta_html:author||date?'<div class="meta">'+[author,date].filter(Boolean).map(v=>'<span class="meta-item">'+esc(v)+'</span>').join('')+'</div>':'',
      reading_time_html:CLOCK+'<span>'+minutes+' min read</span>',chapter_map:contentsMarkup(toc),body_html:body.innerHTML,outline_html:rail,
      defaults_json:json(defaults),toc_json:json(toc),media_scripts:media,
    };
    const output=resources['reader/template.html'].replace(/\$\$|\$\{(\w+)\}/g,(match,key)=>match==='$$'?'$':substitutions[key]??'');
    const page=parse(output);
    page.documentElement.setAttribute('style',`--accent:${options.accent};--text-size:${options.font}px;--reader-max:${options.width}px;--radius:${options.radius}px;--body-leading:${options.leading};--bg:${options.background};--letter-spacing:${options.letter_spacing}em;--paragraph-gap:${options.paragraph_spacing}px;--heading-scale:${options.heading_scale};--light-bg:${options.background};--dark-bg:${options.dark_background};--dark-accent:${options.dark_accent};--light-logo-ink:${options.logo_color};--dark-logo-ink:${options.dark_logo_color}`);
    for(const [key,property] of [['surface','--light-surface'],['dark_surface','--dark-surface'],['text','--light-text'],['dark_text','--dark-text']])if(options[key])page.documentElement.style.setProperty(property,options[key]);
    page.querySelector('meta[name="theme-color"]').content=options.accent;
    page.querySelector('link[rel="icon"]').type=favicon.slice(5,favicon.indexOf(';'));
    page.documentElement.style.setProperty('--body-font',FONT_STACKS[options.body_font]);
    page.documentElement.style.setProperty('--heading-font',FONT_STACKS[options.heading_font]);
    page.querySelector('.brand-name').textContent=branding.name||'Compass';
    page.querySelector('.brand').setAttribute('aria-label',(branding.name||'Compass')+', back to top');
    page.title=title+' · '+(branding.name||'Compass');
    if(branding.logo){const img=page.createElement('img');img.src=branding.logo;img.alt='';page.querySelector('.brand-logo').replaceChildren(img);}
    if(branding.footer)page.querySelector('.doc-footer>span').textContent=branding.footer;
    const print=page.createElement('style');print.id='publication-print';
    print.textContent='@page{size:'+options.print_paper+';margin:'+options.print_margin+'mm;}@media print{'+(options.print_chapters?'.publication-chapter+.publication-chapter{break-before:page;}':'')+'}';page.head.append(print);
    page.querySelector('.color-heading>span').textContent='Default: '+(PALETTE.find(([c])=>c===options.accent)?.[1]||options.accent.toUpperCase());
    const config=page.createElement('script');config.textContent='window.__compassIcons='+json(ICON_HTML)+';window.__compassFeatures='+json(options)+';';page.querySelector('script').before(config);
    for(const [key,selector] of Object.entries(HIDDEN))if(!options[key])for(const el of page.querySelectorAll(selector))el.setAttribute('hidden','');
    if(!options.outline)page.querySelector('.page-shell').className='page-shell no-outline';
    if(options.contents_open)page.querySelector('.contents-disclosure')?.setAttribute('open','');
    if(options.compact)page.body.classList.add('compact-layout');
    const searchConfig=page.createElement('script');searchConfig.id='publication-data';
    searchConfig.textContent='window.__compassSearch='+json(indexPage(page,'',title))+';window.__compassPage="";window.__compassPublication='+json(source)+';';page.querySelector('script').before(searchConfig);
    return '<!doctype html>\n'+page.documentElement.outerHTML;
  }
  function splitAtH1(doc) {
    const parts=[{title:doc.title,nodes:[],split:false}];
    for(const node of [...doc.body.childNodes]) {
      if(node.nodeType===1&&node.tagName==='H1') {
        const marker=doc.body.ownerDocument.createElement('span');if(node.id)marker.id=node.id;
        parts.push({title:plain(node),nodes:[marker],split:true});continue;
      }
      parts.at(-1).nodes.push(node);
    }
    const kept=parts.filter(part=>part.split||part.nodes.some(node=>node.nodeType===1||node.textContent.trim()));
    return kept.map(part=>{const body=fragment('');body.append(...part.nodes);return {...doc,body,title:part.title,split:part.split};});
  }
  function renderProject(value,{preview=false}={}) {
    const project=normalizeProject(value);
    if(!project.files.length)throw Error('Add at least one Markdown file to preview or export.');
    const docs=project.files.map((item,index)=>{
      if(typeof item.text!=='string')throw Error('Reconnect the source folder or import this Markdown file: '+(item.path||item.name));
      const prepared=prepare(item.text,{safe:project.safe,options:project.options,assets:item.assets});
      const sourceHeadings=[...prepared.body.querySelectorAll(HEADING)];
      const sourceIDs=new Set([...prepared.body.querySelectorAll('[id]')].map(el=>el.id));
      const name=item.path||item.name,title=item.title.trim()||getTitle(prepared.body,prepared.metadata,name);
      // A title override does not prevent removal of the matching source H1.
      if(item.title.trim())getTitle(prepared.body,prepared.metadata,name);
      return {...prepared,item,title,name,sourceIDs,sourceHeadings,prefix:'chapter-'+(index+1),output:String(index+1).padStart(2,'0')+'-'+slug(stem(name))+'.html'};
    });
    const issues=publicationChecks(docs,project,resolvePath,normalizePath);
    // Page per H1: each file becomes one page per H1, so ids, links, and pages below work on these parts.
    if(project.mode==='heading') {
      const parts=docs.flatMap(splitAtH1);
      parts.forEach((part,index)=>{part.prefix='chapter-'+(index+1);part.output=String(index+1).padStart(2,'0')+'-'+slug(part.split?part.title:stem(part.name))+'.html';});
      docs.splice(0,docs.length,...parts);
    }
    const maps=docs.map(doc=>new Map([...doc.body.querySelectorAll('[id]')].map(el=>[el.id,doc.prefix+'-'+el.id]))),names=new Map();
    docs.forEach((doc,i)=>{for(const key of [normalizePath(doc.name),normalizePath(doc.item.name)])if(!names.has(key))names.set(key,i);});
    // A fragment can name a heading that Page per H1 moved to another part of the same file.
    const holder=(target,id)=>{if(maps[target].has(id))return target;const found=docs.findIndex((doc,i)=>doc.name===docs[target].name&&maps[i].has(id));return found<0?target:found;};
    // Checks ran on whole files; point each issue at the page and id it lands on after any split.
    for(const issue of issues) {
      const original='chapter-'+(issue.file+1),anchor=issue.target.startsWith(original+'-')?issue.target.slice(original.length+1):'',item=project.files[issue.file];
      let page=docs.findIndex((doc,i)=>doc.item===item&&(!anchor||maps[i].has(anchor)));if(page<0)page=docs.findIndex(doc=>doc.item===item);
      issue.page=project.mode==='combined'?0:Math.max(0,page);
      if(page>=0&&project.mode==='heading')issue.target=(anchor&&maps[page].get(anchor))||docs[page].prefix;
    }
    const warnings=[];
    docs.forEach((doc,index)=>{
      for(const el of doc.body.querySelectorAll('[id]'))el.id=maps[index].get(el.id);
      for(const el of doc.body.querySelectorAll('[for],[aria-labelledby],[aria-describedby]'))for(const attr of ['for','aria-labelledby','aria-describedby'])if(el.hasAttribute(attr))el.setAttribute(attr,el.getAttribute(attr).split(/\s+/).map(id=>maps[index].get(id)||id).join(' '));
      for(const link of doc.body.querySelectorAll('a[href]')) {
        const href=link.getAttribute('href');if(external(href))continue;
        const parts=urlParts(href);let target=parts.path?undefined:index;
        if(parts.path)try{target=names.get(resolvePath(doc.name,decode(parts.path)));}catch(_){}
        if(target!==undefined) {
          if(parts.fragment)target=holder(target,decode(parts.fragment));
          const fragment=parts.fragment?(maps[target].get(decode(parts.fragment))||docs[target].prefix):docs[target].prefix;
          link.setAttribute('href',(project.mode==='combined'?'#':docs[target].output+'#')+fragment);
        } else if(/\.(md|markdown|mdown)$/i.test(parts.path))warnings.push('Linked Markdown is not included: '+parts.path);
      }
      for(const image of doc.body.querySelectorAll('img[src]'))if(!external(image.getAttribute('src')))warnings.push('Image could not be embedded: '+image.getAttribute('src'));
    });
    const options={...project.options,...(preview?{remember:false}:{})},pages=[];
    const serialize=page=>'<!doctype html>\n'+page.documentElement.outerHTML;
    if(project.mode==='combined') {
      const merged=fragment('');
      for(const doc of docs) {
        const chapter=merged.ownerDocument.createElement('section');chapter.className='publication-chapter';chapter.id=doc.prefix;chapter.dataset.compassSource=doc.name;
        if(project.chapter_titles&&docs.length>1) {
          const headings=[...doc.body.querySelectorAll(HEADING)],base=Math.min(2,...headings.filter(h=>h.id).map(h=>Number(h.tagName[1])));
          const actual=headings.some(h=>h.id)?Math.min(...headings.filter(h=>h.id).map(h=>Number(h.tagName[1]))):base;
          for(const old of headings) {const h=merged.ownerDocument.createElement('h'+Math.max(2,Math.min(6,Number(old.tagName[1])+2-actual)));for(const attr of old.attributes)h.setAttribute(attr.name,attr.value);h.append(...old.childNodes);old.replaceWith(h);}
          const heading=merged.ownerDocument.createElement('h1');heading.id=doc.prefix+'-title';heading.textContent=doc.title;chapter.append(heading);
        }
        chapter.append(...doc.body.childNodes);merged.append(chapter);
      }
      const fallback=docs.length===1&&project.name==='Untitled Publication'?docs[0].title:project.name;
      const metadata={...(docs.length===1?docs[0].metadata:{}),title:project.title||fallback};
      for(const key of ['subtitle','author'])if(project[key])metadata[key]=project[key];
      const source=docs.length===1?basename(docs[0].name):docs.length+' Markdown Files';
      const html=renderDocument({source,markdown:docs.map(d=>d.markdown).join('\n'),metadata,body:merged,options,safe:project.safe,keepTitle:true,branding:project.branding});
      pages.push({name:slug(project.name==='Untitled Publication'?metadata.title:project.name)+'.html',title:metadata.title,html});
    } else docs.forEach(doc=>{
      const marker=doc.body.ownerDocument.createElement('span');marker.id=doc.prefix;doc.body.prepend(marker);
      const metadata={...doc.metadata,title:doc.title};for(const key of ['subtitle','author'])if(project[key])metadata[key]=project[key];
      const page=parse(renderDocument({source:doc.name,markdown:doc.markdown,metadata,body:doc.body,options,safe:project.safe,keepTitle:true,branding:project.branding}));
      page.querySelector('#document').dataset.compassSource=doc.name;
      const nav=page.createElement('nav');nav.className='publication-nav';nav.setAttribute('aria-label','Publication Pages');
      for(const peer of docs){const a=page.createElement('a');a.setAttribute('href',peer.output);a.textContent=peer.title;if(peer===doc)a.setAttribute('aria-current','page');nav.append(a);}
      page.querySelector('.hero').before(nav);
      const list=page.querySelector('.contents-pages');
      if(list){list.hidden=false;for(const [index,peer] of docs.entries()){const a=page.createElement('a');a.setAttribute('href',peer.output);a.innerHTML='<b>'+(index+1)+'</b><span></span>';a.lastChild.textContent=peer.title;if(peer===doc)a.setAttribute('aria-current','page');list.append(a);}}
      pages.push({name:doc.output,title:doc.title,html:serialize(page)});
    });
    const rendered=pages.map(page=>parse(page.html));
    if(project.mode==='combined'&&docs.length===1)rendered[0].querySelector('#document').dataset.compassSource=docs[0].name;
    const search=rendered.flatMap((page,i)=>indexPage(page,pages[i].name,pages[i].title));
    rendered.forEach((page,i)=>{
      page.querySelector('#publication-data').textContent='window.__compassSearch='+json(search)+';window.__compassPage='+json(pages[i].name)+';window.__compassPublication='+json(publicationKey(project))+';window.__compassPreview='+json(preview)+';';
      pages[i].html=serialize(page);
    });
    return {project,pages,issues,warnings:[...new Set(warnings)]};
  }
  return {prepare,renderDocument,renderProject};
}
export function exportPublication(result) {
  if(result.pages.length===1)return {data:strToU8(result.pages[0].html),name:result.pages[0].name,mime:'text/html; charset=utf-8'};
  const entries=Object.fromEntries(result.pages.map(page=>[page.name,strToU8(page.html)]));
  entries['index.html']=strToU8(result.pages[0].html);entries['compass.json']=strToU8(JSON.stringify(result.project,null,2));
  return {data:zipSync(entries),name:slug(result.project.name)+'.zip',mime:'application/zip'};
}
