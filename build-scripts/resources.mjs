import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const read=relative=>readFile(path.join(root,relative),'utf8');
export async function loadResources() {
  const names=['reader/template.html','reader/assets/mathjax-loader.html','reader/assets/mermaid-loader.html','reader/styles.css','reader/controls.js','shared/favicon.svg'];
  const resources=Object.fromEntries(await Promise.all(names.map(async name=>[name,await read('src/'+name)])));
  resources.syntax_css=await read('node_modules/highlight.js/styles/github.css');
  return resources;
}
