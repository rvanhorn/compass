// Version 1 project options are shared by the browser app and exported readers.
export const DEFAULT_OPTIONS = Object.freeze({
  accent:'#2563eb', font:17, width:930, radius:13, leading:1.75, background:'#f7f9fc',
  customize:true, outline:true, contents:true, contents_open:false, search:true,
  focus:true, reading_time:true, progress:true, filename:true, footer:true, logo:true,
  metadata:true, subtitle:true, copy_code:true, section_links:true, image_zoom:true,
  table_sort:true, table_resize:true, table_scroll:true, table_rows:12, outline_depth:2,
  reading_speed:220, title_case:true, assessments:true, media:true, compact:false, remember:true,
});
const BOUNDS = {font:[14,22],width:[640,1320],radius:[0,28],leading:[1.55,2.05],table_rows:[3,100],outline_depth:[1,4],reading_speed:[100,500]};
export function normalizeOptions(value={}) {
  const result={...DEFAULT_OPTIONS};
  for(const [key, fallback] of Object.entries(result)) {
    const candidate=value?.[key];
    if(typeof fallback==='boolean' && typeof candidate==='boolean')result[key]=candidate;
    else if(typeof fallback==='number' && typeof candidate==='number' && Number.isFinite(candidate)) {
      const [low,high]=BOUNDS[key];
      if(candidate>=low && candidate<=high)result[key]=key==='leading'?candidate:Math.trunc(candidate);
    } else if(typeof fallback==='string' && typeof candidate==='string' && /^#[\da-f]{6}$/i.test(candidate))result[key]=candidate.toLowerCase();
  }
  return result;
}
export const basename=path=>String(path).replace(/\\/g,'/').split('/').pop();
export const stem=path=>basename(path).replace(/\.[^.]+$/,'');
export function normalizePath(path) {
  const pieces=[];
  for(const piece of String(path).replace(/\\/g,'/').split('/')) {
    if(!piece||piece==='.')continue;
    if(piece==='..') { if(!pieces.length)throw Error('Choose a file inside the workspace folder.');pieces.pop(); }
    else pieces.push(piece);
  }
  return pieces.join('/');
}
export function resolvePath(from, destination) {
  return normalizePath([...String(from).replace(/\\/g,'/').split('/').slice(0,-1),destination].join('/'));
}
export function slug(value) {
  return String(value).toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,80)||'document';
}
const text=(value,max)=>String(value??'').slice(0,max);
export function normalizeProject(value) {
  if(!value || typeof value!=='object' || Array.isArray(value) || (value.version??1)!==1)throw Error('This is not a supported Compass project (version 1).');
  const files=value.files??[];
  if(!Array.isArray(files)||files.length>100)throw Error('A project can contain up to 100 Markdown files.');
  return {
    version:1,name:text(value.name??'Untitled Publication',300).trim()||'Untitled Publication',
    title:text(value.title,300),subtitle:text(value.subtitle,2000),author:text(value.author,300),
    mode:value.mode==='separate'?'separate':'combined',safe:value.safe!==false,chapter_titles:value.chapter_titles!==false,
    options:normalizeOptions(value.options),files:files.map(item=>{
      if(!item || typeof item!=='object' || Array.isArray(item))throw Error('Invalid document entry.');
      const name=String(item.name||basename(item.path||'document.md'));
      if(!/\.(md|markdown|mdown)$/i.test(name))throw Error('Select Markdown files (.md, .markdown, or .mdown).');
      const doc={name,title:text(item.title,300),assets:{}};
      if('text' in item) {if(typeof item.text!=='string')throw Error('Document content must be text.');doc.text=item.text;}
      else if(typeof item.path!=='string')throw Error('Each document needs a path or uploaded content.');
      if(typeof item.path==='string') {
        if(/^(?:[a-z]:|\/)/i.test(item.path))throw Error('Choose a file inside the workspace folder.');
        doc.path=normalizePath(item.path);
      }
      if(item.assets&&typeof item.assets==='object')for(const [key,asset] of Object.entries(item.assets)) {
        if(typeof asset==='string'&&/^data:image\/(?:png|jpeg|webp|gif|avif|svg\+xml);/i.test(asset))doc.assets[key]=asset;
      }
      return doc;
    }),
  };
}
