import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {root,read,loadResources} from './resources.mjs';
const resources=await loadResources();
const image='data:image/svg+xml;base64,'+(await readFile(path.join(root,'demo/assets/publishing-workflow.svg'))).toString('base64');
const examples={};
for(const [name,file] of [['demo','feature-guide'],['combined','two-chapter-guide']]) {
  const project=JSON.parse(await read('demo/'+file+'.compass.json'));
  for(const doc of project.files) {
    doc.name=doc.path;doc.text=await read(doc.path);doc.assets=doc.path.endsWith('feature-guide.md')?{'assets/publishing-workflow.svg':image}:{};delete doc.path;
  }
  examples[name]=project;
}
const bundled=await build({
  absWorkingDir:root,entryPoints:['src/app/browser.mjs'],bundle:true,write:false,format:'iife',platform:'browser',target:['es2022'],
  minify:true,charset:'utf8',metafile:true,legalComments:'inline',
  define:{__COMPASS_RESOURCES__:JSON.stringify(resources),__COMPASS_EXAMPLES__:JSON.stringify(examples)},
});
const runtime=bundled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const controls=(await read('src/app/controls.js')).replace(/<\/script/gi,'<\\/script');
const favicon='data:image/svg+xml;base64,'+Buffer.from(resources['shared/favicon.svg']).toString('base64');
const builderCSS=await read('src/app/styles.css');
let html=(await read('src/app/template.html'))
  .replaceAll('favicon.svg',favicon)
  .replace('<link rel="stylesheet" href="app.css">',()=>'<style>'+builderCSS+'</style>')
  .replace('<script src="app.js"></script>',()=>'<script>'+runtime+'</script><script>'+controls+'</script>');
// Include complete notices inside each downloadable file and next to the site.
const packages=new Set();
for(const input of Object.keys(bundled.metafile.inputs)) {
  // Use the innermost package directory, including pnpm's virtual store paths.
  const match=/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input.replaceAll('\\','/'));if(match)packages.add(match[1]);
}
let notices='Third-party packages bundled with Compass\n\n';
for(const directory of [...packages].sort()) {
  const pkg=JSON.parse(await read(directory+'/package.json'));
  let license='';for(const file of ['LICENSE','LICENSE.md','LICENSE.txt','license','license.md'])try{license=await read(directory+'/'+file);break;}catch(_){}
  notices+=pkg.name+' '+pkg.version+' ('+pkg.license+')\n'+license+'\n\n';
}
const escaped=notices.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const bodyEnd=html.lastIndexOf('</body>');
html=html.slice(0,bodyEnd)+'<template id="third-party-notices">'+escaped+'</template>'+html.slice(bodyEnd);
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist/index.html'),html.replace('<body>','<body data-demo="true">'));
await writeFile(path.join(root,'dist/compass.html'),html.replace('<body>','<body data-demo="false">'));
await writeFile(path.join(root,'dist/THIRD_PARTY_NOTICES.txt'),notices);
await writeFile(path.join(root,'dist/.nojekyll'),'');
console.log('Built dist/index.html (demo) and dist/compass.html (downloadable app).');
