(() => {
 'use strict';
 function transition(element,show,commit,kind='panel'){
  element._compassAnimation?.cancel();element._compassAnimation=null;element.inert=!show;element.dataset.motion=show?'open':'closed';
  if(show)commit();
  if(!element.animate||matchMedia('(prefers-reduced-motion: reduce)').matches||!element.getBoundingClientRect().height){if(!show)commit();return;}
  const rect=element.getBoundingClientRect();
  let from={opacity:0,transform:'translateY(6px) scale(.985)'},to={opacity:1,transform:'translateY(0) scale(1)'};
  if(kind==='details'){const style=getComputedStyle(element);from={height:'0px',paddingTop:'0px',paddingBottom:'0px',opacity:0,overflow:'hidden'};to={height:rect.height+'px',paddingTop:style.paddingTop,paddingBottom:style.paddingBottom,opacity:1,overflow:'hidden'};}
  if(kind==='drawer'){
   from={opacity:0,transform:'translateX(-24px)'};to={opacity:1,transform:'translateX(0)'};
   if(getComputedStyle(element).position!=='absolute'){Object.assign(from,{width:'0px',minWidth:'0px',overflow:'hidden'});Object.assign(to,{width:rect.width+'px',minWidth:rect.width+'px',overflow:'hidden'});}
  }
  const animation=element.animate(show?[from,to]:[to,from],{duration:kind==='drawer'?240:180,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
  element._compassAnimation=animation;
  animation.onfinish=()=>{if(element._compassAnimation!==animation)return;if(!show)commit();animation.cancel();element._compassAnimation=null;};
 }
 function details(element,show){
  const body=element.querySelector(':scope>summary')?.nextElementSibling;if(!body){element.open=show;return;}
  element._compassDetailsOpen=show;
  transition(body,show,()=>{element.open=show;},element.classList.contains('file-menu')?'panel':'details');
 }
 function install(scope=document){
  scope.querySelectorAll('details').forEach(element=>{
   if(element._compassMotionInstalled)return;element._compassMotionInstalled=true;
   element.querySelector(':scope>summary')?.addEventListener('click',event=>{event.preventDefault();details(element,!(element._compassDetailsOpen??element.open));});
  });
 }
 window.CompassMotion={transition,details,install};
})();
