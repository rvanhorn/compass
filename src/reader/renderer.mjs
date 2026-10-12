import {DEFAULT_OPTIONS,normalizeOptions,normalizeProject,basename,stem,slug,normalizePath,resolvePath} from '../shared/options.mjs';
import {createMarkdown,parseFrontmatter,escapeHTML as esc} from './markdown.mjs';
import {zipSync,strToU8} from 'fflate';
export {DEFAULT_OPTIONS,normalizeOptions,normalizeProject,parseFrontmatter};

const HEADING='h1,h2,h3,h4,h5,h6';
const SMALL=new Set('a an and as at but by for from in into nor of on or per than the to via with'.split(' '));
const WORD=/\p{L}[\p{L}\p{N}_]*(?:[’'.-][\p{L}\p{N}_]+)*/gu;
const PALETTE=[['#2563eb','Blue'],['#14b8a6','Teal'],['#f97316','Orange'],['#8b5cf6','Violet'],['#f59e0b','Amber'],['#ec4899','Pink']];
const CLOCK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const HIDDEN={customize:'#settings-toggle,#settings-panel',outline:'.right-rail,#mobile-menu,#mobile-toc',contents:'.section-map',search:'#search-toggle,#search-modal,.rail-hint',focus:'#focus-toggle',reading_time:'.reading-time',progress:'.reading-progress',filename:'.brand-doc',footer:'.doc-footer',logo:'.brand-logo',metadata:'.meta',subtitle:'.hero>p',copy_code:'.copy-btn',section_links:'.heading-anchor'};
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
    alert.innerHTML='<div class="callout-head"><span class="icon" aria-hidden="true">'+({NOTE:'i',TIP:'✓',IMPORTANT:'✦',WARNING:'!',CAUTION:'×'}[label])+'</span><span>'+titleCase(label.toLowerCase())+'</span></div>';
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
  const cards=chapters.map((t,index)=>`<a href="#${esc(t.id)}"><b aria-hidden="true">${String(index+1).padStart(2,'0')}</b><span class="chapter-name">${esc(t.title.replace(/^\s*\d{1,3}\s*[.·–—:\-]\s*/,''))}</span><span class="chapter-arrow" aria-hidden="true">↗</span></a>`).join('');
  return `<section class="section-map" aria-label="Chapter directory"><details class="contents-disclosure"><summary class="section-map-head"><strong>Contents</strong><span>${chapters.length} sections</span><span class="contents-action"><span class="contents-show">Show Sections</span><span class="contents-hide">Hide Sections</span></span></summary><nav class="section-map-grid" aria-label="Chapter shortcuts">${cards}</nav></details></section>`;
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
  function renderDocument({source='document.md',markdown='',metadata={},body=null,options={},safe=true,assets={},keepTitle=false}={}) {
    options=normalizeOptions(options);
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
      const link=body.ownerDocument.createElement('a');link.className='heading-anchor';link.setAttribute('href','#'+heading.id);link.setAttribute('aria-label','Copy link to section');link.textContent='#';heading.append(link);
    }
    const subtitle=textValue(metadata.subtitle||metadata.description).trim(),author=textValue(metadata.author).trim(),date=textValue(metadata.date).trim();
    const words=(markdown.match(/[\p{L}\p{N}_]+/gu)||[]).length,minutes=Math.max(1,Math.round(words/options.reading_speed));
    const logo=resources['shared/favicon.svg'].replaceAll('#2563eb',options.accent);
    const favicon='data:image/svg+xml;base64,'+window.btoa(unescape(encodeURIComponent(logo)));
    const rail=toc.length?'<aside class="right-rail" aria-label="Document outline"><div class="rail-title">On This Page</div><nav class="toc-list">'+headings+'</nav><div class="rail-hint"><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> to find a heading</div></aside>':'';
    const defaults=Object.fromEntries(['font','width','radius','leading','accent'].map(key=>[key,options[key]]));
    const media=options.media?((body.querySelector('.math-inline,.math-block')?resources['reader/assets/mathjax-loader.html']:'')+(body.querySelector('.mermaid')?resources['reader/assets/mermaid-loader.html']:'')):'';
    const substitutions={
      description:esc(subtitle||title),favicon_uri:favicon,logo_svg:logo,title:esc(title),source_name:esc(basename(source)),
      css:resources['reader/styles.css'],syntax_css:resources.syntax_css||'',ui_js:resources['reader/controls.js'],
      headings_html:headings,swatch_html:PALETTE.map(([c,name])=>`<button type="button" data-color="${c}" title="${name}" aria-label="Set ${name} accent" aria-pressed="false"><span class="swatch-dot" style="background:${c}"></span><span>${name}</span></button>`).join(''),
      shell_class:'page-shell'+(toc.length?'':' no-outline'),subtitle_html:subtitle?'<p>'+esc(subtitle)+'</p>':'',
      meta_html:author||date?'<div class="meta">'+[author,date].filter(Boolean).map(v=>'<span class="meta-item">'+esc(v)+'</span>').join('')+'</div>':'',
      reading_time_html:CLOCK+'<span>'+minutes+' min read</span>',chapter_map:contentsMarkup(toc),body_html:body.innerHTML,outline_html:rail,
      defaults_json:json(defaults),toc_json:json(toc),media_scripts:media,
    };
    const output=resources['reader/template.html'].replace(/\$\$|\$\{(\w+)\}/g,(match,key)=>match==='$$'?'$':substitutions[key]??'');
    const page=parse(output);
    page.documentElement.setAttribute('style',`--accent:${options.accent};--text-size:${options.font}px;--reader-max:${options.width}px;--radius:${options.radius}px;--body-leading:${options.leading};--bg:${options.background}`);
    page.querySelector('meta[name="theme-color"]').content=options.accent;
    page.querySelector('.color-heading>span').textContent='Default: '+(PALETTE.find(([c])=>c===options.accent)?.[1]||options.accent.toUpperCase());
    const config=page.createElement('script');config.textContent='window.__compassFeatures='+json(options)+';';page.querySelector('script').before(config);
    for(const [key,selector] of Object.entries(HIDDEN))if(!options[key])for(const el of page.querySelectorAll(selector))el.setAttribute('hidden','');
    if(!options.outline)page.querySelector('.page-shell').className='page-shell no-outline';
    if(options.contents_open)page.querySelector('.contents-disclosure')?.setAttribute('open','');
    if(options.compact)page.body.classList.add('compact-layout');
    return '<!doctype html>\n'+page.documentElement.outerHTML;
  }
  function renderProject(value,{preview=false}={}) {
    const project=normalizeProject(value);
    if(!project.files.length)throw Error('Add at least one Markdown file to preview or export.');
    const docs=project.files.map((item,index)=>{
      if(typeof item.text!=='string')throw Error('Reconnect the source folder or import this Markdown file: '+(item.path||item.name));
      const prepared=prepare(item.text,{safe:project.safe,options:project.options,assets:item.assets});
      const name=item.path||item.name,title=item.title.trim()||getTitle(prepared.body,prepared.metadata,name);
      // A title override does not prevent removal of the matching source H1.
      if(item.title.trim())getTitle(prepared.body,prepared.metadata,name);
      return {...prepared,item,title,name,prefix:'chapter-'+(index+1),output:String(index+1).padStart(2,'0')+'-'+slug(stem(name))+'.html'};
    });
    const maps=docs.map(doc=>new Map([...doc.body.querySelectorAll('[id]')].map(el=>[el.id,doc.prefix+'-'+el.id]))),names=new Map();
    docs.forEach((doc,i)=>{names.set(normalizePath(doc.name),i);names.set(normalizePath(doc.item.name),i);});
    const warnings=[];
    docs.forEach((doc,index)=>{
      for(const el of doc.body.querySelectorAll('[id]'))el.id=maps[index].get(el.id);
      for(const el of doc.body.querySelectorAll('[for],[aria-labelledby],[aria-describedby]'))for(const attr of ['for','aria-labelledby','aria-describedby'])if(el.hasAttribute(attr))el.setAttribute(attr,el.getAttribute(attr).split(/\s+/).map(id=>maps[index].get(id)||id).join(' '));
      for(const link of doc.body.querySelectorAll('a[href]')) {
        const href=link.getAttribute('href');if(external(href))continue;
        const parts=urlParts(href);let target=parts.path?undefined:index;
        if(parts.path)try{target=names.get(resolvePath(doc.name,decode(parts.path)));}catch(_){}
        if(target!==undefined) {
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
        const chapter=merged.ownerDocument.createElement('section');chapter.className='publication-chapter';chapter.id=doc.prefix;
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
      const html=renderDocument({source,markdown:docs.map(d=>d.markdown).join('\n'),metadata,body:merged,options,safe:project.safe,keepTitle:true});
      pages.push({name:slug(project.name==='Untitled Publication'?metadata.title:project.name)+'.html',title:metadata.title,html});
    } else docs.forEach(doc=>{
      const marker=doc.body.ownerDocument.createElement('span');marker.id=doc.prefix;doc.body.prepend(marker);
      const metadata={...doc.metadata,title:doc.title};for(const key of ['subtitle','author'])if(project[key])metadata[key]=project[key];
      const page=parse(renderDocument({source:doc.name,markdown:doc.markdown,metadata,body:doc.body,options,safe:project.safe,keepTitle:true}));
      const nav=page.createElement('nav');nav.className='publication-nav';nav.setAttribute('aria-label','Publication Pages');
      for(const peer of docs){const a=page.createElement('a');a.setAttribute('href',peer.output);a.textContent=peer.title;if(peer===doc)a.setAttribute('aria-current','page');nav.append(a);}
      page.querySelector('.hero').before(nav);pages.push({name:doc.output,title:doc.title,html:serialize(page)});
    });
    return {project,pages,warnings:[...new Set(warnings)]};
  }
  return {prepare,renderDocument,renderProject};
}
export function exportPublication(result) {
  if(result.pages.length===1)return {data:strToU8(result.pages[0].html),name:result.pages[0].name,mime:'text/html; charset=utf-8'};
  const entries=Object.fromEntries(result.pages.map(page=>[page.name,strToU8(page.html)]));
  entries['index.html']=strToU8(result.pages[0].html);entries['compass.json']=strToU8(JSON.stringify(result.project,null,2));
  return {data:zipSync(entries),name:slug(result.project.name)+'.zip',mime:'application/zip'};
}
