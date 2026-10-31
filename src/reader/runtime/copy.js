import {$,$$,copyText,toast} from './dom.js';

$$('.copy-btn').forEach(btn=>btn.addEventListener('click',()=>{
  const code=$('pre code',btn.closest('.code-frame'))?.textContent||'';
  copyText(code).then(()=>toast(btn,'Copied ✓')).catch(()=>toast(btn,'Copy Unavailable'));
}));
$$('.heading-anchor').forEach(link=>link.addEventListener('click',()=>{
  const hash=link.getAttribute('href');
  const addr=location.href.split('#')[0]+hash;
  copyText(addr).then(()=>{link.title='Copied section link';}).catch(()=>{});
}));
