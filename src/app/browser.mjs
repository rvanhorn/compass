import {createRenderer,exportPublication,DEFAULT_OPTIONS,normalizeProject} from '../reader/renderer.mjs';
import {normalizePath,resolvePath,basename} from '../shared/options.mjs';

const resources=__COMPASS_RESOURCES__;
const examples=__COMPASS_EXAMPLES__;
const MIMES={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',avif:'image/avif'};
const MAX_BYTES=40*1024*1024;
const external=value=>/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
const decode=value=>{try{return decodeURIComponent(value);}catch(_){return value;}};
const renderer=createRenderer(resources,window);

export function createBrowserBackend({window,renderer,examples}) {
  const catalog=new Map();
  let workspace=null;
  async function fileAt(path) {
    path=normalizePath(path);
    if(catalog.has(path))return catalog.get(path);
    if(!workspace)return null;
    const parts=path.split('/');let folder=workspace;
    try{
      for(const part of parts.slice(0,-1))folder=await folder.getDirectoryHandle(part);
      const handle=await folder.getFileHandle(parts.at(-1));
      catalog.set(path,handle);return handle;
    }catch(error){if(error.name==='NotFoundError')return null;throw error;}
  }
  async function imageData(file) {
    const mime=MIMES[file.name.split('.').pop().toLowerCase()];
    if(!mime||file.size>12_000_000)return null;
    const bytes=new Uint8Array(await file.arrayBuffer());
    let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return 'data:'+mime+';base64,'+window.btoa(binary);
  }
  async function materialize(value,{portable=false}={}) {
    const project=normalizeProject(value);
    let total=0;
    for(const doc of project.files) {
      if(typeof doc.text!=='string') {
        const handle=await fileAt(doc.path);
        if(!handle)throw Error('Reconnect the source folder using Browse Workspace, or import '+doc.path+'.');
        const file=await handle.getFile();
        if(file.size>MAX_BYTES)throw Error('Missing or oversized source: '+doc.path);
        doc.text=await file.text();
      }
      total+=new TextEncoder().encode(doc.text).length;
      if(total>MAX_BYTES)throw Error('Project content must be under 40 MB.');
      const prepared=renderer.prepare(doc.text,{safe:project.safe,options:project.options,assets:doc.assets});
      for(const image of prepared.body.querySelectorAll('img[src]')) {
        const src=image.getAttribute('src');if(external(src))continue;
        const relative=decode(src.split('#')[0].split('?')[0]);
        if(doc.assets[relative])continue;
        let path;try{path=resolvePath(doc.path||doc.name,relative);}catch(_){continue;}
        const handle=await fileAt(path);if(!handle)continue;
        const data=await imageData(await handle.getFile());if(data)doc.assets[relative]=data;
      }
      if(portable&&doc.path){doc.name=doc.path;delete doc.path;}
    }
    return project;
  }
  const response=data=>({ok:true,json:async()=>data});
  const backend={
    get root(){return workspace?.name||'Browser files';},
    examples,
    async connectWorkspace() {
      if(!window.showDirectoryPicker) {
        window.document.querySelector('#folder-input').click();return false;
      }
      // Must run directly from a user gesture to obtain read-only directory access.
      workspace=await window.showDirectoryPicker({mode:'read'});catalog.clear();return true;
    },
    async list(path='.') {
      path=normalizePath(path);if(!workspace)throw Error('Select a source folder with Browse Workspace first.');
      let folder=workspace;for(const part of path.split('/').filter(Boolean))folder=await folder.getDirectoryHandle(part);
      const entries=[];
      for await(const [name,handle] of folder.entries()) {
        if(name.startsWith('.'))continue;
        const entryPath=[path,name].filter(Boolean).join('/');
        if(handle.kind==='directory'||/\.(md|markdown|mdown)$/i.test(name))entries.push({name,path:entryPath,directory:handle.kind==='directory'});
        if(handle.kind==='file')catalog.set(entryPath,handle);
        if(entries.length>=1000)break;
      }
      entries.sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name));
      return {path:path||'.',parent:path?path.split('/').slice(0,-1).join('/')||'.':null,entries};
    },
    async request(path,value,signal) {
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      const url=new URL(path,'https://compass.invalid');
      if(url.pathname==='/api/session')return response({root:'Browser files',defaults:DEFAULT_OPTIONS,project:window.document.body.dataset.demo==='true'?normalizeProject(examples.demo):null});
      if(url.pathname==='/api/files')return response(await backend.list(url.searchParams.get('path')||'.'));
      if(url.pathname==='/api/project')return response(url.searchParams.has('portable')?await materialize(value,{portable:true}):normalizeProject(value));
      const project=await materialize(value);
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      if(url.pathname==='/api/preview')return response(renderer.renderProject(project,{preview:true}));
      if(url.pathname==='/api/export') {
        const exported=exportPublication(renderer.renderProject(project));
        return {ok:true,headers:{get:name=>name.toLowerCase()==='content-disposition'?'attachment; filename="'+exported.name+'"':null},blob:async()=>new window.Blob([exported.data],{type:exported.mime})};
      }
      throw Error('Unknown browser action: '+url.pathname);
    },
  };
  return backend;
}
window.CompassBrowser=createBrowserBackend({window,renderer,examples});
// Public, local-only API also makes the packaged renderer testable without HTTP.
window.CompassRenderer=renderer;
