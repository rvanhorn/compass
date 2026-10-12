const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
function setup(reduced=false){
 const w=new JSDOM('<details><summary>Settings</summary><div>Content</div></details>',{runScripts:'outside-only'}).window,animations=[];
 w.matchMedia=()=>({matches:reduced});
 w.HTMLElement.prototype.getBoundingClientRect=()=>({width:300,height:200});
 w.HTMLElement.prototype.animate=function(frames,options){const animation={cancelled:false,cancel(){this.cancelled=true;},finish(){this.onfinish?.();}};animations.push(animation);return animation;};
 w.eval(fs.readFileSync(path.join(__dirname,'motion.js'),'utf8'));return {w,animations};
}
test('sections remain visible during closing and finish closed; rapid reversals cancel stale closes',()=>{
 const {w,animations}=setup(),details=w.document.querySelector('details'),summary=details.querySelector('summary');
 try{
  w.CompassMotion.install();summary.click();assert(details.open);animations.at(-1).finish();
  summary.click();assert(details.open);const closing=animations.at(-1);summary.click();assert(closing.cancelled);closing.finish();assert(details.open);
  animations.at(-1).finish();summary.click();animations.at(-1).finish();assert.equal(details.open,false);
 }finally{w.close();}
});
test('reduced motion changes state immediately without animating',()=>{
 const {w,animations}=setup(true),details=w.document.querySelector('details');
 try{w.CompassMotion.details(details,true);assert(details.open);w.CompassMotion.details(details,false);assert.equal(details.open,false);assert.equal(animations.length,0);}finally{w.close();}
});
