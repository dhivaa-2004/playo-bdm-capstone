import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const illustrations=['activities.svg','source-regions.svg','data-lineage.svg','community-review.svg'];
const pagePhotos=['multi-sport-venue.webp','urban-sports-complex.webp','community-venue-review.webp'];

test('page visuals are local, referenced and kept within the performance budget',async()=>{
 const source=await readFile(new URL('../app/observatory.tsx',import.meta.url),'utf8');
 let svgBytes=0;
 for(const name of illustrations){
  const path=new URL(`../public/images/${name}`,import.meta.url);
  const size=(await stat(path)).size;
  svgBytes+=size;
  assert.ok(size<3000,`${name} should stay below 3 KB`);
 }
 assert.ok(svgBytes<8000,'all SVG guides should stay below 8 KB combined');
 assert.match(source,/\/images\/data-lineage\.svg/);
 for(const name of pagePhotos){
  const path=new URL(`../public/images/${name}`,import.meta.url);
  const size=(await stat(path)).size;
  assert.ok(size<150000,`${name} should stay below 150 KB`);
  assert.match(source,new RegExp(`/images/${name.replace('.','\\.')}`));
 }
 const rasterBytes=(await stat(new URL('../public/images/sports-courts.webp',import.meta.url))).size+(await stat(new URL('../public/images/badminton-racket.webp',import.meta.url))).size;
 assert.ok(rasterBytes<300000,'loaded overview photographs should stay below 300 KB combined');
 assert.match(source,/Illustrative image · not a listed or verified venue/);
 assert.match(source,/loading=\{kind==='photo'\?'eager':'lazy'\}/);
 assert.match(source,/fetchPriority=\{kind==='photo'\?'high':'low'\}/);
});
