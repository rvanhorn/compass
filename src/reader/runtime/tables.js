import {$$,enabled} from './dom.js';
import {schedule} from './outline.js';

// Enhance rectangular tables; merged cells retain their original layout.
const tableCollator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
$$('.table-scroll table').forEach(table=>{
  if(!enabled('table_sort')&&!enabled('table_resize'))return;
  const head=table.tHead,body=table.tBodies[0];
  if(!head||head.rows.length!==1||!body||table.tBodies.length!==1)return;
  const headers=Array.from(head.rows[0].cells),rows=Array.from(body.rows);
  if(!headers.length||Array.from(table.rows).some(row=>row.cells.length!==headers.length||Array.from(row.cells).some(cell=>cell.colSpan!==1||cell.rowSpan!==1)))return;
  const originalOrder=new Map(rows.map((row,i)=>[row,i]));
  let widths=null,cols=null;
  function setWidth(index,value){
    if(!widths){
      widths=headers.map(th=>Math.max(64,th.getBoundingClientRect().width));
      const group=document.createElement('colgroup');
      cols=widths.map(()=>{const col=document.createElement('col');group.append(col);return col;});
      table.querySelectorAll(':scope > colgroup').forEach(group=>group.remove());
      if(table.caption)table.caption.after(group);else table.prepend(group);
      table.classList.add('table--resized');
    }
    widths[index]=Math.max(64,Math.round(value));
    cols.forEach((col,i)=>col.style.width=widths[i]+'px');
    table.style.width=widths.reduce((sum,width)=>sum+width,0)+'px';
    headers.forEach((th,i)=>th.querySelector('.column-resizer').setAttribute('aria-valuenow',widths[i]));
    schedule();
  }
  headers.forEach((th,index)=>{
    const label=th.textContent.trim();
    th.classList.add('table-interactive-header');th.setAttribute('aria-sort','none');
    const button=document.createElement('button');button.type='button';button.className='table-sort';
    while(th.firstChild)button.append(th.firstChild);
    const icon=document.createElement('span');icon.className='table-sort-icon';icon.innerHTML=window.__compassIcons['arrow-up-down'];icon.setAttribute('aria-hidden','true');button.append(icon);
    button.title='Sort by '+label;button.setAttribute('aria-label','Sort by '+label);
    button.addEventListener('click',()=>{
      const direction=th.getAttribute('aria-sort')==='ascending'?'descending':'ascending';
      headers.forEach(cell=>{cell.setAttribute('aria-sort','none');cell.querySelector('.table-sort-icon').innerHTML=window.__compassIcons['arrow-up-down'];});
      th.setAttribute('aria-sort',direction);icon.innerHTML=window.__compassIcons[direction==='ascending'?'arrow-up':'arrow-down'];
      const values=new Map(rows.map(row=>[row,row.cells[index].textContent.trim()]));
      const numeric=rows.filter(row=>values.get(row)).every(row=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(values.get(row).replace(/,/g,'')));
      rows.sort((a,b)=>{
        const av=values.get(a),bv=values.get(b);
        if(!av||!bv)return av? -1:bv?1:originalOrder.get(a)-originalOrder.get(b);
        const result=numeric?Number(av.replace(/,/g,''))-Number(bv.replace(/,/g,'')):tableCollator.compare(av,bv);
        return result*(direction==='ascending'?1:-1)||originalOrder.get(a)-originalOrder.get(b);
      });
      rows.forEach(row=>body.append(row));schedule();
    });
    const grip=document.createElement('span');grip.className='column-resizer';grip.tabIndex=0;grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','vertical');grip.setAttribute('aria-label','Resize '+label+' column');grip.setAttribute('aria-valuemin','64');grip.setAttribute('aria-valuenow',Math.round(th.getBoundingClientRect().width));grip.title='Drag to resize; use Left or Right Arrow when focused';
    grip.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();setWidth(index,(widths?widths[index]:th.getBoundingClientRect().width)+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?40:10));
    });
    grip.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      event.preventDefault();event.stopPropagation();
      const startX=event.clientX,startWidth=widths?widths[index]:th.getBoundingClientRect().width;
      grip.setPointerCapture(event.pointerId);document.body.classList.add('resizing-columns');
      const move=e=>setWidth(index,startWidth+e.clientX-startX);
      const stop=()=>{document.body.classList.remove('resizing-columns');grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',stop);grip.removeEventListener('pointercancel',stop);grip.removeEventListener('lostpointercapture',stop);};
      grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);grip.addEventListener('lostpointercapture',stop);
    });
    th.append(button,grip);
    if(!enabled('table_sort')){button.disabled=true;icon.hidden=true;button.removeAttribute('title');button.removeAttribute('aria-label');th.removeAttribute('aria-sort');}
    if(!enabled('table_resize'))grip.hidden=true;
  });
  const container=table.closest('.table-frame')||table.closest('.table-scroll');
  let hint=container.previousElementSibling;
  if(!hint?.classList.contains('table-scroll-note')){hint=document.createElement('div');hint.className='table-scroll-note';container.before(hint);}
  hint.textContent=[table.closest('.table-scroll--long')?rows.length+' rows · Scroll to explore':'',enabled('table_sort')?'Click Headers to Sort':'',enabled('table_resize')?'Drag Column Edges to Resize':''].filter(Boolean).join(' · ');
});
