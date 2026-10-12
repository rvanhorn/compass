import {rm} from 'node:fs/promises';
import path from 'node:path';
import {root} from './resources.mjs';

await rm(path.join(root,'dist'),{recursive:true,force:true});
console.log('Removed generated dist/ output.');
