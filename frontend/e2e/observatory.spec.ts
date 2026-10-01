import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('public observatory',()=>{
 test('core evidence routes load without authentication',async({page})=>{
  const routes=[
   ['/',/clearer view of the venue landscape/i],
   ['/venues',/venue explorer/i],
   ['/map',/venue map/i],
   ['/compare',/compare evidence/i],
   ['/lineage',/sql & data lineage/i],
   ['/predictions',/ml explanation/i],
   ['/data-quality',/data quality/i]
  ] as const;
  for(const [path,title] of routes){
   await page.goto(path);
   await expect(page.getByRole('heading',{level:1,name:title})).toBeVisible();
   await expect(page.getByText(/sign in|log in/i)).toHaveCount(0);
  }
 });

 test('manual theme choice persists across pages',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Dark'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.goto('/lineage');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'Light'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 });

 test('lineage explanation changes with the selected evidence tab',async({page})=>{
  await page.goto('/lineage');
  await expect(page.getByText(/one historical record, traceable end to end/i)).toBeVisible();
  await page.getByRole('tab',{name:'SQL evidence'}).click();
  await expect(page.getByText(/SQL behind the public evidence/i)).toBeVisible();
  await page.getByRole('tab',{name:'Model lineage'}).click();
  await expect(page.getByText(/stored experiment identity/i)).toBeVisible();
 });

 test('aggregate export and security headers are available',async({request})=>{
  const response=await request.get('/api/data?kind=export_summary');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('text/csv');
  expect(response.headers()['content-disposition']).toContain('playo-observatory-aggregate-summary.csv');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
 });

 test('overview and lineage have no serious accessibility violations',async({page})=>{
  for(const path of ['/','/lineage']){
   await page.goto(path);
   await page.locator('[aria-label="Loading live database data"]').waitFor({state:'detached'}).catch(()=>{});
   const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
   const serious=results.violations.filter(v=>['serious','critical'].includes(v.impact||''));
   expect(serious,serious.map(v=>`${v.id}: ${v.help}`).join('\n')).toEqual([]);
  }
 });
});
