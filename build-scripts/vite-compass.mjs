import {readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {root,read,loadResources} from './resources.mjs';
import {icon} from '../src/shared/icons.mjs';

const TEMPLATE='src/app/template.html';
const STYLES=['src/shared/tokens.css','src/shared/ui.css','src/app/styles.css','src/shared/color-picker.css'];
const VIRTUAL={'virtual:compass-resources':async()=>loadResources(),'virtual:compass-examples':loadExamples};

async function loadExamples() {
  const image='data:image/svg+xml;base64,'+(await readFile(path.join(root,'demo/assets/publishing-workflow.svg'))).toString('base64');
  const examples={};
  for(const [name,file] of [['demo','feature-guide'],['combined','two-chapter-guide']]) {
    const project=JSON.parse(await read('demo/'+file+'.compass.json'));
    for(const doc of project.files) {
      doc.name=doc.path;doc.text=await read(doc.path);doc.assets=doc.path.endsWith('feature-guide.md')?{'assets/publishing-workflow.svg':image}:{};delete doc.path;
    }
    examples[name]=project;
  }
  return examples;
}

// The demo flag is added to this exact tag; a looser match would hit markup strings inside the bundled renderer.
function withDemo(html,demo) {
  if(!html.includes('<body class="cx drawer-hidden">'))throw Error(TEMPLATE+' must open its body with <body class="cx drawer-hidden">');
  return html.replace('<body class="cx drawer-hidden">',`<body class="cx drawer-hidden" data-demo="${demo}">`);
}

async function expandTemplate(html) {
  const resources=await loadResources();
  const favicon='data:image/svg+xml;base64,'+Buffer.from(resources['shared/favicon.svg']).toString('base64');
  // The theme script stays classic and inline so it runs before first paint.
  const theme=(await read('src/app/theme.js')).replace(/<\/script/gi,'<\\/script');
  return html
    .replace(/<i data-icon="([\w-]+)"><\/i>/g,(_,name)=>icon(name))
    .replaceAll('favicon.svg',favicon)
    .replace('<script src="theme.js"></script>',()=>'<script>'+theme+'</script>')
    .replace('<link rel="stylesheet" href="app.css">',()=>STYLES.map(file=>`<link rel="stylesheet" href="/${file}">`).join(''))
    .replace('<script src="app.js"></script>',()=>'<script type="module" src="/src/app/main.js"></script>');
}

async function notices(moduleIds) {
  const packages=new Set();
  for(const id of moduleIds) {
    // Use the innermost package directory, including pnpm's virtual store paths.
    const match=/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(path.relative(root,id).replaceAll('\\','/'));if(match)packages.add(match[1]);
  }
  let text='Third-party packages bundled with Compass\n\n';
  for(const directory of [...packages].sort()) {
    const pkg=JSON.parse(await read(directory+'/package.json'));
    let license='';for(const file of ['LICENSE','LICENSE.md','LICENSE.txt','license','license.md'])try{license=await read(directory+'/'+file);break;}catch(_){}
    text+=pkg.name+' '+pkg.version+' ('+pkg.license+')\n'+license+'\n\n';
  }
  return text;
}

async function socialMetadata() {
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
  return {title:`<title>${escape(title)}</title>`,head:`\n<link rel="canonical" href="${escape(siteURL)}">\n${metadata}\n`};
}

export function compass() {
  let moduleIds=[];
  const source={
    name:'compass',
    resolveId(id){if(id in VIRTUAL)return '\0'+id;},
    async load(id){if(id.startsWith('\0')&&id.slice(1) in VIRTUAL)return 'export default '+JSON.stringify(await VIRTUAL[id.slice(1)]())+';';},
    transformIndexHtml:{order:'pre',handler:expandTemplate},
    configureServer(server) {
      server.middlewares.use(async(req,res,next)=>{
        const pathname=new URL(req.url,'http://localhost').pathname;
        const demo={'/':true,'/index.html':true,'/compass.html':false}[pathname];
        if(demo===undefined)return next();
        try{
          const html=await server.transformIndexHtml(pathname,withDemo(await read(TEMPLATE),demo).replace('<!-- social-metadata -->',''));
          res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
        }catch(error){next(error);}
      });
      // Reader and demo files reach the app as strings through the virtual modules, outside Vite's module graph.
      server.watcher.on('change',file=>{
        const relative=path.relative(root,file).replaceAll('\\','/');
        // The template is served by the middleware above, and Vite's own HTML reload only matches the page's own path.
        if(!/^(src\/reader|src\/shared|demo)\//.test(relative)&&!['src/app/theme.js','src/app/template.html'].includes(relative))return;
        for(const id of Object.keys(VIRTUAL)){const module=server.moduleGraph.getModuleById('\0'+id);if(module)server.moduleGraph.invalidateModule(module);}
        server.ws.send({type:'full-reload'});
      });
    },
  };
  // Runs after vite-plugin-singlefile has inlined the script and styles.
  const finish={
    name:'compass-finish',
    apply:'build',
    enforce:'post',
    renderChunk(_code,chunk){moduleIds.push(...chunk.moduleIds);return null;},
    async generateBundle(_options,bundle) {
      const name=Object.keys(bundle).find(file=>file.endsWith('template.html'));
      let html=String(bundle[name].source);delete bundle[name];
      // jsdom and the old layout both need a classic script after the markup, not a deferred module in <head>.
      const script=/<script type="module" crossorigin>([\s\S]*?)<\/script>/.exec(html);
      if(!script)throw Error('Inlined app script not found in the built template.');
      html=html.replace(script[0],()=>'').replaceAll('<style crossorigin>','<style>');
      const text=await notices(moduleIds);
      const escaped=text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
      const bodyEnd=html.lastIndexOf('</body>');
      html=html.slice(0,bodyEnd)+'<script>'+script[1].replace(/<\/script/gi,'<\\/script')+'</script><template id="third-party-notices">'+escaped+'</template>'+html.slice(bodyEnd);
      const social=await socialMetadata();
      const demo=withDemo(html,true).replace('<title>Compass Publisher</title>',()=>social.title).replace('<!-- social-metadata -->',()=>social.head);
      this.emitFile({type:'asset',fileName:'index.html',source:demo});
      this.emitFile({type:'asset',fileName:'compass.html',source:withDemo(html,false).replace('<!-- social-metadata -->','')});
      for(const file of ['og-card.png','og-card-compact.png'])this.emitFile({type:'asset',fileName:file,source:await readFile(path.join(root,'src/app/assets',file))});
      this.emitFile({type:'asset',fileName:'THIRD_PARTY_NOTICES.txt',source:text});
      this.emitFile({type:'asset',fileName:'.nojekyll',source:''});
    },
    // Remove the former compact demo page when rebuilding an existing dist/.
    async closeBundle(){await rm(path.join(root,'dist/compact.html'),{force:true});},
  };
  return [source,finish];
}
