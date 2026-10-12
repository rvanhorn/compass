const {test}=require('node:test');
const assert=require('node:assert/strict');
test('history groups typing, restores removed content and invalidates redo after a new edit',async()=>{
 const {createHistory}=await import('./history.mjs');
 let value={options:{font:17},branding:{name:'Brand'},files:[{name:'one.md',text:'Original',assets:{}}]},history=createHistory(value);
 value.files[0].text='O';history.record(value,{group:'source',now:1});value.files[0].text='Other';history.record(value,{group:'source',now:2});
 assert.equal(history.undo().files[0].text,'Original');assert.equal(history.canUndo,false);value=history.redo();assert.equal(value.files[0].text,'Other');
 value.files=[];history.record(value,{now:3});assert.equal(history.undo().files.length,1);
 value=history.undo();value.options.font=20;history.record(value,{now:4});assert.equal(history.canRedo,false);assert.equal(history.undo().options.font,17);
});
