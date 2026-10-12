import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
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
// Crawlers need static metadata and an absolute image URL on the hosted demo.
const siteURL=JSON.parse(await read('package.json')).homepage;
const title='Compass — Your Markdown. Beautifully Published.';
const description='Turn Markdown into polished, customizable HTML publications. Shape the reading experience, preview, and export entirely in your browser.';
const imageAlt='Compass — Your Markdown. Beautifully Published. A Markdown document becomes a polished publication on a pale blue canvas.';
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const imageURL=new URL('og-card.png',siteURL).href;
// Advertise one image so Discord does not crop alternatives into a gallery.
const metadata=[
  ['name','description',description],
  ['property','og:type','website'],['property','og:site_name','Compass'],
  ['property','og:title',title],['property','og:description',description],
  ['property','og:url',siteURL],['property','og:image',imageURL],
  ['property','og:image:type','image/png'],['property','og:image:width','1200'],
  ['property','og:image:height','630'],['property','og:image:alt',imageAlt],
  ['name','twitter:card','summary_large_image'],['name','twitter:title',title],
  ['name','twitter:description',description],['name','twitter:image',imageURL],
  ['name','twitter:image:alt',imageAlt],
].map(([attribute,key,value])=>`<meta ${attribute}="${key}" content="${escape(value)}">`).join('\n');
const social=`\n<link rel="canonical" href="${escape(siteURL)}">\n${metadata}\n`;
const demo=html.replace('<body>','<body data-demo="true">').replace('<title>Compass Workspace</title>',`<title>${escape(title)}</title>`);
await writeFile(path.join(root,'dist/index.html'),demo.replace('<!-- social-metadata -->',social));
// Remove the former compact demo page when rebuilding an existing dist/.
await rm(path.join(root,'dist/compact.html'),{force:true});
await writeFile(path.join(root,'dist/compass.html'),html.replace('<body>','<body data-demo="false">').replace('<!-- social-metadata -->',''));
await copyFile(path.join(root,'src/app/assets/og-card.png'),path.join(root,'dist/og-card.png'));
await copyFile(path.join(root,'src/app/assets/og-card-compact.png'),path.join(root,'dist/og-card-compact.png'));
await writeFile(path.join(root,'dist/THIRD_PARTY_NOTICES.txt'),notices);
await writeFile(path.join(root,'dist/.nojekyll'),'');
console.log('Built dist/index.html (demo) and dist/compass.html (downloadable app).');
