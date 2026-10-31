import {$,$$,project,history,reading,activePage,pages,setProject,setReading,setActivePage,keyLabel} from './state.js';
import {changed,frameCommand} from './preview.js';
import {sheetOpen,sheetFloats,hideSheet,syncSheetMode} from './sheets.js';
import {paletteOpen,openPalette,closePalette} from './palette.js';
import {sync} from './sync.js';

export function setMode(read){
 if(read&&!project.files.length)return;
 setReading(read);document.body.classList.toggle('read-mode',read);
 $('#mode-read').setAttribute('aria-pressed',String(read));
 syncSheetMode();if(read)closePalette();
 frameCommand({type:'compass-mode',mode:read?'read':'edit'});
 // Read hides the rail and shows the reader's own top bar, so focus moves to the control that switches back.
 // It waits a task: Read is chosen from the View menu, which returns focus to its trigger as it closes.
 setTimeout(()=>$(read?'#banner-edit':'#view-toggle').focus(),0);
}
$('#banner-edit').addEventListener('click',()=>setMode(false));$('#mode-read').addEventListener('click',()=>setMode(true));

export function syncHistory(){if(!history)return;$('#undo-project').disabled=!history.canUndo;$('#redo-project').disabled=!history.canRedo;}
function restoreHistory(direction){
 const value=history?.[direction]();if(!value)return;
 setProject(value);setActivePage(Math.min(activePage,Math.max(0,project.mode==='combined'?0:Math.max(pages.length,project.files.length)-1)));sync();changed({immediate:true,record:false});
}
$('#undo-project').addEventListener('click',()=>restoreHistory('undo'));
$('#redo-project').addEventListener('click',()=>restoreHistory('redo'));
document.addEventListener('keydown',event=>{
 if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
 const key=event.key.toLowerCase();if(!['z','y','x'].includes(key))return;
 const field=event.target.matches('input,textarea,[contenteditable=true]');
 // Redo is ⌘X by the owner's choice; inside any text field X stays Cut.
 if(field&&(key==='x'||event.target.id!=='source-text'))return;
 event.preventDefault();restoreHistory(key==='z'&&!event.shiftKey?'undo':'redo');
});

// ---------- Keyboard and shortcuts ----------
$$('.cx-kbd').forEach(kbd=>kbd.textContent=keyLabel(kbd.textContent));
$('#undo-project').title='Undo ('+keyLabel('⌘Z')+')';$('#redo-project').title='Redo ('+keyLabel('⌘X')+')';
// The Keyboard Shortcuts button sits in the palette footer; the dialog replaces the palette.
$('#show-shortcuts').addEventListener('click',()=>{closePalette();$('#shortcuts').showModal();});$('#close-shortcuts').addEventListener('click',()=>$('#shortcuts').close());
document.addEventListener('keydown',event=>{
 const typing=event.target.matches?.('input,textarea,select,[contenteditable=true]'),key=event.key.toLowerCase(),command=event.metaKey||event.ctrlKey;
 if(command&&key==='k'){event.preventDefault();paletteOpen()?closePalette():openPalette();return;}
 if(command&&key==='e'){event.preventDefault();setMode(!reading);return;}
 if(command&&key==='s'){event.preventDefault();$('#save-project').click();return;}
 if(event.key==='Escape'&&!event.defaultPrevented){
  if(paletteOpen()){closePalette();return;}
  if(document.querySelector('.command-menu:not([hidden]),.compass-color-picker:not([hidden]),.cx-listbox:not([hidden])'))return;
  if(reading){setMode(false);return;}
  if(sheetOpen()&&sheetFloats()){hideSheet();return;}
 }
 if(!typing&&!command&&!event.altKey&&event.key==='?')$('#show-shortcuts').click();
});
