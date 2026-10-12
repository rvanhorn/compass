const {test}=require('node:test');
const assert=require('node:assert/strict');
test('paired accents retain hue while adapting lightness in either direction',async()=>{
 const {pairedAccent}=await import('./design.mjs');
 for(const [color,dominant] of [['#d52222',0],['#22a544',1],['#2255c9',2]]){
  const light=pairedAccent(color,'light').slice(1).match(/../g).map(v=>parseInt(v,16));
  const dark=pairedAccent(color,'dark').slice(1).match(/../g).map(v=>parseInt(v,16));
  assert.equal(light.indexOf(Math.max(...light)),dominant);assert.equal(dark.indexOf(Math.max(...dark)),dominant);
  assert(dark.reduce((a,b)=>a+b)>light.reduce((a,b)=>a+b));
 }
 for(const color of ['#000000','#808080','#ffffff']){
  const pair=pairedAccent(color,'dark').slice(1).match(/../g);assert.equal(new Set(pair).size,1);
 }
});
