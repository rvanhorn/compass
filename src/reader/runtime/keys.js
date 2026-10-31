import {setPanel} from './customize.js';
import {setMobile} from './contents.js';
import {showSearch,closeSearch,searchOpen} from './find.js';
import {closeLightbox} from './lightbox.js';

document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(searchOpen())closeSearch();else showSearch();}
  if(e.key==='Escape'){closeSearch();setPanel(false);setMobile(false);closeLightbox();}
});
