import {normalizeBranding} from '../shared/options.mjs';
import {$,$$,project} from './state.js';
import {syncValues} from './design.js';
import {renderFiles,syncOutput} from './pages.js';
import {syncSource} from './source.js';

// Writes the whole project into every control, after the project is replaced or reset.
export function sync(){
 for(const [id,key] of [['project-name','name'],['publication-title','title'],['subtitle','subtitle'],['author','author'],['mode','mode']])$('#'+id).value=project[key];
 project.branding=normalizeBranding(project.branding);
 for(const [id,key] of [['body-font','body_font'],['heading-font','heading_font'],['print-paper','print_paper'],['print-margin','print_margin']])$('#'+id).value=project.options[key];
 $('#print-chapters').checked=project.options.print_chapters;
 $('#brand-name').value=project.branding.name;$('#brand-footer').value=project.branding.footer;
 for(const key of ['logo','favicon']){const img=$('#brand-'+key+'-preview');img.hidden=!project.branding[key];if(project.branding[key])img.src=project.branding[key];else img.removeAttribute('src');$('#remove-'+key).disabled=!project.branding[key];}
 syncSource();
 $('#safe').checked=project.safe;$('#chapter-titles').checked=project.chapter_titles;syncOutput();
 $$('[data-option]').forEach(input=>{if(input.type==='checkbox')input.checked=project.options[input.dataset.option];else input.value=project.options[input.dataset.option];});syncValues();renderFiles();
 document.dispatchEvent(new CustomEvent('compass-synced'));
}
