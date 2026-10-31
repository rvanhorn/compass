import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const read=relative=>readFile(path.join(root,relative),'utf8');
// Exported pages inline these as classic scripts. Each shared module is bundled with the global the reader runtime reads,
// and the reader runtime modules become one script; reader/library.js is part of that bundle and stays empty.
const CLASSIC={
  'shared/motion.js':"import {transition,details,install} from './shared/motion.js';window.CompassMotion={transition,details,install};",
  'shared/color-picker.js':"import {attachColorPicker} from './shared/color-picker.js';window.CompassColorPicker=attachColorPicker;",
  'shared/ui.js':"import {install,select,range,color,refresh} from './shared/ui.js';window.CompassUI={install,select,range,color,refresh};",
  'reader/controls.js':"import './reader/runtime/index.js';",
  'reader/library.js':'',
};
async function classic(contents) {
  if(!contents)return '';
  const result=await build({stdin:{contents,resolveDir:path.join(root,'src'),loader:'js'},bundle:true,write:false,format:'iife',platform:'browser',target:['es2022'],charset:'utf8',banner:{js:"'use strict';"},logLevel:'silent'});
  return result.outputFiles[0].text;
}
export async function loadResources() {
  const names=['reader/template.html','reader/assets/mathjax-loader.html','reader/assets/mermaid-loader.html','reader/styles.css','reader/controls.js','reader/library.js','shared/favicon.svg','shared/motion.js','shared/color-picker.js','shared/color-picker.css','shared/tokens.css','shared/ui.css','shared/ui.js'];
  const resources=Object.fromEntries(await Promise.all(names.map(async name=>[name,name in CLASSIC?await classic(CLASSIC[name]):await read('src/'+name)])));
  resources.syntax_css=await read('node_modules/highlight.js/styles/github.css');
  return resources;
}
