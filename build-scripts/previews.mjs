// Development-only DOM host. The downloadable app uses the browser's DOMParser.
import {JSDOM} from 'jsdom';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRenderer} from '../src/reader/renderer.mjs';
import {root,read,loadResources} from './resources.mjs';
const dom=new JSDOM(''),renderer=createRenderer(await loadResources(),dom.window);
await mkdir(path.join(root,'dist/previews'),{recursive:true});
for(const [source,name] of [['README.md','readme'],['demo/feature-guide.md','feature-guide']]) {
  const assets=source==='demo/feature-guide.md'?{'assets/publishing-workflow.svg':'data:image/svg+xml;base64,'+Buffer.from(await read('demo/assets/publishing-workflow.svg')).toString('base64')}:{};
  await writeFile(path.join(root,'dist/previews/'+name+'.html'),renderer.renderDocument({source,markdown:await read(source),assets}));
}
dom.window.close();
console.log('Rebuilt dist/previews/ with the JavaScript renderer.');
