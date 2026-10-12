// Keep immutable snapshots while sharing large Markdown and image strings.
const clone=value=>({...value,options:{...value.options},branding:{...value.branding},files:value.files.map(file=>({...file,assets:{...file.assets}}))});
const equal=(a,b)=>{
  const scalar=value=>JSON.stringify({...value,options:undefined,branding:undefined,files:undefined});
  return scalar(a)===scalar(b)&&JSON.stringify(a.options)===JSON.stringify(b.options)&&JSON.stringify(a.branding)===JSON.stringify(b.branding)&&a.files.length===b.files.length&&a.files.every((file,i)=>{
    const other=b.files[i];return Object.keys({...file,...other}).every(key=>key==='assets'?JSON.stringify(file.assets)===JSON.stringify(other.assets):file[key]===other[key]);
  });
};
export function createHistory(initial) {
  let current=clone(initial),past=[],future=[],lastGroup=null,lastTime=0;
  const trim=()=>{
    if(past.length>40)past.shift();
    // Limit retained source/asset strings without multiplying shared content.
    while(past.length>1){const strings=new Set([current,...past].flatMap(p=>p.files.flatMap(f=>[f.text||'',...Object.values(f.assets||{})])));if([...strings].reduce((n,s)=>n+s.length,0)<=12_000_000)break;past.shift();}
  };
  return {
    get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
    reset(value){current=clone(value);past=[];future=[];lastGroup=null;},
    record(value,{group=null,now=Date.now()}={}){
      if(equal(current,value))return;
      if(!group||group!==lastGroup||now-lastTime>650||future.length)past.push(current);
      current=clone(value);future=[];lastGroup=group;lastTime=now;trim();
    },
    undo(){if(!past.length)return null;future.push(current);current=past.pop();lastGroup=null;return clone(current);},
    redo(){if(!future.length)return null;past.push(current);current=future.pop();lastGroup=null;return clone(current);},
  };
}
