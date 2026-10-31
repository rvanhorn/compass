// Exported pages carry their icons as window.__compassIcons; the workspace supplies its own source at startup.
let source=name=>window.__compassIcons?.[name]||'';
export const icon=name=>source(name);
export function setIconSource(lookup){source=lookup;}
