import test from 'node:test';
import assert from 'node:assert/strict';
import {isAllowedPublicRoute} from '../lib/public-routes.ts';

test('all documented single-page routes are accepted',()=>{
 for(const route of ['venues','map','compare','lineage','analytics','predictions','data-quality','add-venue','submitted-venues']){
  assert.equal(isAllowedPublicRoute([route]),true,route);
 }
});

test('only UUID-shaped venue detail routes and known pages are accepted',()=>{
 assert.equal(isAllowedPublicRoute(['venues','11111111-1111-4111-8111-111111111111']),true);
 for(const route of [['venues','bad'],['unknown'],['lineage','extra'],[]])assert.equal(isAllowedPublicRoute(route),false);
});
