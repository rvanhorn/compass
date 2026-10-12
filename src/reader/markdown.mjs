import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import deflist from 'markdown-it-deflist';
import abbr from 'markdown-it-abbr';
import mark from 'markdown-it-mark';
import ins from 'markdown-it-ins';
import sup from 'markdown-it-sup';
import sub from 'markdown-it-sub';
import tasks from 'markdown-it-task-lists';
import YAML from 'yaml';
import hljs from 'highlight.js';

export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[char]));
export function parseFrontmatter(source) {
  source=source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const match=/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(source);
  if(match)try {
    const metadata=YAML.parse(match[1],{maxAliasCount:100});
    if(metadata&&typeof metadata==='object'&&!Array.isArray(metadata))return {metadata,markdown:source.slice(match[0].length)};
  }catch(_) { /* Malformed frontmatter remains visible as Markdown. */ }
  return {metadata:{},markdown:source};
}
function math(md) {
  md.inline.ruler.before('escape','compass_math_inline',(state,silent)=>{
    if(state.src[state.pos]!=='$'||state.src[state.pos+1]==='$')return false;
    const match=/^\$(?!\s)([^$\n]*?\S)\$/.exec(state.src.slice(state.pos));
    if(!match)return false;
    if(!silent){const token=state.push('math_inline','span',0);token.content=match[1];}
    state.pos+=match[0].length;return true;
  });
  md.block.ruler.before('fence','compass_math_block',(state,start,end,silent)=>{
    const line=n=>state.src.slice(state.bMarks[n]+state.tShift[n],state.eMarks[n]);
    if(line(start).trim()!=='$$')return false;
    let finish=start+1;while(finish<end&&line(finish).trim()!=='$$')finish++;
    if(finish===end)return false;
    if(silent)return true;
    const token=state.push('math_block','div',0);token.content=state.getLines(start+1,finish,state.blkIndent,false);token.map=[start,finish+1];
    state.line=finish+1;return true;
  },{alt:['paragraph','reference','blockquote','list']});
  md.renderer.rules.math_inline=(tokens,index)=>'<span class="math-inline">\\('+escapeHTML(tokens[index].content)+'\\)</span>';
  md.renderer.rules.math_block=(tokens,index)=>'<div class="math-block">\\['+escapeHTML(tokens[index].content)+'\\]</div>\n';
}
// Support ^^text^^ insertion syntax alongside ++text++.
function compassInsertion(md) {
  md.inline.ruler.before('sup','compass_insertion',(state,silent)=>{
    if(state.src.slice(state.pos,state.pos+2)!=='^^')return false;
    const match=/^\^\^(?=\S)([\s\S]*?\S)\^\^/.exec(state.src.slice(state.pos));
    if(!match)return false;
    if(!silent) {
      state.push('ins_open','ins',1);
      const children=[];md.inline.parse(match[1],md,state.env,children);state.tokens.push(...children);
      state.push('ins_close','ins',-1);
    }
    state.pos+=match[0].length;return true;
  });
}
export function createMarkdown(safe=true) {
  const md=new MarkdownIt({html:!safe,linkify:true,breaks:false,typographer:false});
  for(const plugin of [footnote,deflist,abbr,mark,ins,sup,sub,tasks,math,compassInsertion])md.use(plugin);
  md.renderer.rules.fence=(tokens,index)=>{
    const token=tokens[index],language=(token.info.trim().split(/\s+/)[0]||'text').toLowerCase(),code=token.content;
    if(['mermaid','mmd'].includes(language))return '<div class="mermaid-frame"><div class="mermaid-header">✧ Flow Diagram · Mermaid</div><pre class="mermaid">'+escapeHTML(code)+'</pre></div>\n';
    let highlighted=escapeHTML(code);
    try{if(hljs.getLanguage(language))highlighted=hljs.highlight(code,{language,ignoreIllegals:true}).value;}catch(_){}
    return '<div class="code-frame"><div class="code-bar"><span class="code-language"><span class="code-dots"><i></i><i></i><i></i></span>'+escapeHTML(language.toUpperCase())+'</span><button class="copy-btn" type="button" aria-label="Copy code">Copy code</button></div><pre><code>'+highlighted+'</code></pre></div>\n';
  };
  return md;
}
