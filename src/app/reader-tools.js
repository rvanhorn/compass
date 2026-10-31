import {DESIGN_KEYS} from '../shared/options.mjs';
import {$,element,status,defaults,project} from './state.js';
import {changed} from './preview.js';
import {PRINT_KEYS} from './publish.js';
import {sync} from './sync.js';

const featureGroups=[
 ['Navigation',[
  ['outline','Contents Panel','A panel listing every page and section, opened from the reader toolbar.'],['contents','Contents Near the Title','A collapsible list of sections under the title.'],['contents_open','Open the List at Start','Show that list expanded when the page loads.'],['search','Find','Search text, headings, and code across every page.'],['section_links','Section Links','A link icon beside each heading copies its address.']]],
 ['Reading',[
  ['customize','Customize Menu','Readers change text size, width, and accent for themselves.'],['remember','Remember Reader Choices','Keep those choices in the reader\'s browser.'],['reading_time','Reading Time','The estimated minutes beside the title.'],['progress','Progress Bar','A thin bar at the top shows how far the reader is.']]],
 ['Page Elements',[
  ['logo','Logo','The publication icon in the reader toolbar.'],['filename','Source File Name','The Markdown file name beside the publication name.'],['footer','Page Footer','Source information and a Back to Top link.'],['subtitle','Introduction','The introduction text under the title.'],['metadata','Author and Date','Attribution from the Markdown front matter.']]],
 ['Tables',[
  ['table_sort','Sortable Columns','Readers select a column heading to sort the rows.'],['table_resize','Resizable Columns','Readers drag column edges, or use the arrow keys.'],['table_scroll','Scroll Long Tables','Long tables scroll inside a box of fixed height.']]],
 ['Content',[
  ['assessments','Structured Assessments','Turn repeated label and explanation lists into sections.'],['title_case','Title Case','Capitalize headings and buttons consistently.'],['copy_code','Copy Buttons on Code','A Copy button on each code block.'],['image_zoom','Image Zoom','Readers select an image to see it larger.'],['media','Diagrams and Equations','Load Mermaid and MathJax online when a page uses them.']]]
];
// A setting that only matters while another tool is on sits right under that tool and is disabled while the tool is off.
// The sliders for outline_depth, reading_speed, and table_rows join these containers from design.js.
const PARENTS=['outline','contents','customize','reading_time','table_scroll'];
const NESTED={contents_open:'contents',remember:'customize'};
function parentSwitch(key){return $('#feature-controls input[type=checkbox][data-option="'+key+'"]');}
function syncNesting(){
 for(const key of PARENTS){
  const on=parentSwitch(key).checked,sub=$('#sub-'+key);
  sub.classList.toggle('is-off',!on);sub.querySelectorAll('input').forEach(input=>input.disabled=!on);
 }
}
export function buildFeatureControls(){
 const subs={};
 for(const [title,features] of featureGroups){
  const group=element('section','cx-group feature-group'),head=element('div','cx-group-head');head.append(element('h3','',title));group.append(head);
  for(const [key,label,description] of features){
   const row=element('label','cx-row toggle-row'),copy=element('span','cx-row-text');copy.append(element('span','',label),element('small','',description));const input=element('input','cx-switch');input.type='checkbox';input.dataset.option=key;row.append(copy,input);
   (subs[NESTED[key]]||group).append(row);
   if(PARENTS.includes(key)){const sub=subs[key]=element('div','cx-sub');sub.id='sub-'+key;group.append(sub);input.addEventListener('change',syncNesting);}
  }
  $('#feature-controls').append(group);
 }
}
// sync() writes checkbox values without change events, so it announces the rewrite instead.
document.addEventListener('compass-synced',syncNesting);
$('#reset-features').addEventListener('click',()=>{for(const key of Object.keys(defaults))if(!DESIGN_KEYS.includes(key)&&!PRINT_KEYS.includes(key))project.options[key]=defaults[key];sync();changed({immediate:true});status('Features reset to defaults');});
