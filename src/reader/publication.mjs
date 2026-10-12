// Local publication diagnostics and the portable full-text index.
const external=value=>/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
const decode=value=>{try{return decodeURIComponent(value);}catch{return value;}};
export function publicationChecks(docs,project,resolvePath,normalizePath) {
  const issues=[],names=new Map();
  docs.forEach((doc,index)=>{names.set(normalizePath(doc.name),index);names.set(normalizePath(doc.item.name),index);});
  const add=(index,node,kind,message)=>{
    const doc=docs[index];let anchor=node?.id;
    if(!anchor&&node){const nodes=[...doc.body.querySelectorAll('[id]')];anchor=nodes.filter(el=>el.compareDocumentPosition(node)&4).at(-1)?.id;}
    issues.push({file:index,source:doc.name,kind,message,target:anchor?doc.prefix+'-'+anchor:doc.prefix});
  };
  docs.forEach((doc,index)=>{
    let previous=0;
    for(const heading of doc.sourceHeadings) {
      const level=Number(heading.tagName[1]);
      if(previous&&level>previous+1)add(index,heading,'heading','Heading skips a level: '+heading.textContent.trim());
      previous=level;
    }
    for(const img of doc.body.querySelectorAll('img')) {
      const src=img.getAttribute('src')||'';
      if(!img.getAttribute('alt')?.trim())add(index,img,'alt','Image has no alternative text: '+src.slice(0,120));
      if(!external(src))add(index,img,'image','Image could not be embedded: '+src);
      else if(/^(https?:)?\/\//i.test(src))add(index,img,'online','Image requires internet access: '+src);
    }
    for(const link of doc.body.querySelectorAll('a[href]')) {
      const href=link.getAttribute('href');if(external(href))continue;
      const [beforeHash,...fragments]=href.split('#'),path=beforeHash.split('?')[0],hash=decode(fragments.join('#'));
      let target=index;
      if(path){try{target=names.get(resolvePath(doc.name,decode(path)));}catch{target=undefined;}}
      if(target===undefined){if(/\.(md|markdown|mdown)$/i.test(path))add(index,link,'document','Linked Markdown is not included: '+path);continue;}
      if(hash&&!docs[target].sourceIDs.has(hash))add(index,link,'anchor','Section link does not exist: '+href);
    }
    if(project.options.media&&doc.body.querySelector('.mermaid,.math-inline,.math-block'))add(index,null,'online','Diagrams or equations use online libraries.');
  });
  return issues;
}

export function indexPage(page,name='',title='') {
  const article=page.querySelector('#document');if(!article)return [];
  const index=[];let section=title,counter=0;
  // Prefer leaf reading blocks, so nested lists and code aren't indexed twice.
  for(const node of [page.querySelector('.hero h1'),...article.querySelectorAll('h1,h2,h3,h4,h5,h6,p,pre,li,td,th,dt,dd')].filter(Boolean)) {
    if(node.matches('h1,h2,h3,h4,h5,h6'))section=node.textContent.trim();
    const copy=node.cloneNode(true);copy.querySelectorAll('p,pre,li,td,th,dt,dd').forEach(child=>child.remove());
    const text=copy.textContent.replace(/\s+/g,' ').trim();if(!text)continue;
    if(!node.id){let id;do{id='compass-text-'+(++counter);}while(page.getElementById(id));node.id=id;}
    const source=node.closest('[data-compass-source]')?.dataset.compassSource||article.dataset.compassSource||'@publication';
    const anchor=node.closest('.hero')||node.matches('.publication-chapter > h1[id$="-title"]')?'@title':node.id.replace(/^chapter-\d+-/,'');
    index.push({id:node.id,page:name,source,anchor,title:section||title,text,heading:/^H[1-6]$/.test(node.tagName)});
  }
  return index;
}

export function publicationKey(project) {
  if(project.id)return project.id;
  // Older projects retain a reproducible namespace, independent of chapter order.
  const input=project.name+'\n'+project.files.map(f=>f.path||f.name).sort().join('\n');
  let hash=2166136261;for(const char of input)hash=Math.imul(hash^char.codePointAt(0),16777619);
  return 'publication-'+(hash>>>0).toString(36);
}
