import {install as installMotion} from '../shared/motion.js';
import {install as installUI} from '../shared/ui.js';
import {setIconSource} from '../shared/kit-icons.js';
import {icon} from '../shared/icons.mjs';
import {normalizeProject} from '../shared/options.mjs';
import {installMenus} from './menus.js';
import {createHistory} from './history.mjs';
import {$,$$,status,api,project,setBackend,setSession,setProject,setHistory} from './state.js';
import {preview,watchLinkedSources} from './preview.js';
import {syncEmpty} from './pages.js';
import {buildColorControls,buildRangeControls,bindOptionInputs} from './design.js';
import {buildFeatureControls} from './reader-tools.js';
import {syncHistory} from './mode.js';
import {sync} from './sync.js';
import './files.js';
import {restoreSheet} from './sheets.js';
import './publish.js';
import './source.js';
import './palette.js';

function buildControls(){
 buildColorControls();
 installMotion();installMenus();
 buildFeatureControls();buildRangeControls();
 installMotion();installUI();
 bindOptionInputs();
}
// preview() resolves once srcdoc is set, before the document loads; the cap keeps a frame that never loads from holding the page.
function frameLoaded(frame){return new Promise(resolve=>{if(!frame)return resolve();frame.addEventListener('load',resolve,{once:true});setTimeout(resolve,1000);});}
// The backend is passed in so tests can drive the workspace with a stand-in.
export async function start(backend){
 setBackend(backend);setIconSource(icon);
 try{const session=await (await api('/api/session')).json();let draftKey='compass-project:'+session.root;
  let value={version:1,name:'Untitled Publication',title:'',subtitle:'',author:'',mode:'combined',safe:true,chapter_titles:true,options:{...session.defaults},files:[]};
  if(session.project){value=session.project;draftKey+=':startup:'+value.name;}
  else try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(draft)value=await (await api('/api/project',draft)).json();}catch(_){}
  setSession({defaults:session.defaults,root:session.root,draftKey});
  value=normalizeProject(value);if(!value.id)value.id=window.crypto?.randomUUID?.()||'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);setProject(value);setHistory(createHistory(project));document.body.classList.add('drawer-hidden');buildControls();sync();syncHistory();restoreSheet();
  $('#save-state').textContent='';
  $('#source-help').textContent=window.showDirectoryPicker?'Import a snapshot, or link a folder for live updates.':'Folders include local images. Reimport to refresh their contents.';
  $$('.browser-examples').forEach(el=>el.hidden=false);
  if(location.protocol!=='file:')$('#download-app').hidden=false;
  if(project.files.length)await preview();else syncEmpty();
  watchLinkedSources();
  if(project.files.length)await frameLoaded($('#preview-frame'));
 }catch(error){syncEmpty();$('#dock-title').textContent||='Compass';status(error.message,true);}
 // The template hides the page until here, so the first frame shows the loaded state, not the placeholders.
 finally{document.documentElement.classList.remove('booting');}
}
