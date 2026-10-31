import {$,$$,motion,enabled} from './dom.js';

const lightbox=$('#lightbox');
export function closeLightbox(){motion.transition(lightbox,false,()=>lightbox.classList.remove('open'));lightbox.setAttribute('aria-hidden','true');}
$$('.md-body img').forEach(img=>{
  if(!enabled('image_zoom'))return;
  img.dataset.zoomable='true';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge image: '+(img.alt||'document image'));
  function zoom(){const full=$('img',lightbox);full.src=img.currentSrc||img.src;full.alt=img.alt;motion.transition(lightbox,true,()=>lightbox.classList.add('open'));lightbox.setAttribute('aria-hidden','false');}
  img.addEventListener('click',zoom);img.addEventListener('keydown',e=>{if(e.key==='Enter')zoom();});
});
lightbox.addEventListener('click',e=>{if(e.target===lightbox||e.target.closest('button'))closeLightbox();});
