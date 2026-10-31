import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
import {compass} from './build-scripts/vite-compass.mjs';

export default defineConfig({
  publicDir:false,
  // Builds and test runs rewrite dist/, which the dev page never loads.
  server:{host:'127.0.0.1',port:5173,strictPort:true,watch:{ignored:['**/dist/**']}},
  preview:{host:'127.0.0.1',port:4173,strictPort:true},
  build:{
    outDir:'dist',
    // dist/previews comes from a separate script and must survive a rebuild.
    emptyOutDir:false,
    target:'es2022',
    modulePreload:false,
    cssMinify:false,
    rollupOptions:{input:'src/app/template.html',output:{format:'iife'}},
  },
  plugins:[viteSingleFile(),compass()],
});
