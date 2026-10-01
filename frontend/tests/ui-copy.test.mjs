import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('sidebar stays focused and the venue filters retain clear spacing hooks',async()=>{
 const source=await readFile(new URL('../app/observatory.tsx',import.meta.url),'utf8');
 const styles=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');
 assert.doesNotMatch(source,/Historical data\. Clear context\.|Historical-only analysis/);
 assert.match(source,/className="filters venue-filters"/);
 assert.match(source,/className="callout explorer-notice"/);
 assert.match(styles,/\.explorer-notice\{[^}]*margin:0 0 22px/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
});
