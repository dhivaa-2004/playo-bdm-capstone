import test from 'node:test';
import assert from 'node:assert/strict';
import {isThemeMode,nextAutomaticThemeBoundary,resolveTheme,themeForHour} from '../lib/theme.ts';

test('automatic theme changes at the exact 6 AM and 6 PM boundaries',()=>{
 assert.equal(themeForHour(5),'dark');
 assert.equal(themeForHour(6),'light');
 assert.equal(themeForHour(17),'light');
 assert.equal(themeForHour(18),'dark');
 assert.equal(themeForHour(23),'dark');
});

test('manual light and dark selections override the time',()=>{
 const noon=new Date(2026,9,1,12,0,0);
 const night=new Date(2026,9,1,22,0,0);
 assert.equal(resolveTheme('dark',noon),'dark');
 assert.equal(resolveTheme('light',night),'light');
 assert.equal(resolveTheme('auto',noon),'light');
 assert.equal(resolveTheme('auto',night),'dark');
});

test('only supported persisted values are accepted',()=>{
 for(const value of ['auto','light','dark'])assert.equal(isThemeMode(value),true);
 for(const value of ['',null,'system','night'])assert.equal(isThemeMode(value),false);
});

test('the next automatic boundary is local 6 AM or 6 PM',()=>{
 assert.equal(nextAutomaticThemeBoundary(new Date(2026,9,1,2,30)).getHours(),6);
 assert.equal(nextAutomaticThemeBoundary(new Date(2026,9,1,10,30)).getHours(),18);
 const after=nextAutomaticThemeBoundary(new Date(2026,9,1,21,30));
 assert.equal(after.getDate(),2);
 assert.equal(after.getHours(),6);
});
