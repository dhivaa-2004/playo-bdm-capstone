import {expect,test} from '@playwright/test';

// Real API checks verify the deployed Worker uses the combined discovery queries.
test('public discovery counts, filters and historical details are consistent',async({request})=>{
 const [summaryResponse,allResponse,historicalResponse,communityResponse,activitiesResponse]=await Promise.all([
  request.get('/api/data?kind=summary'),
  request.get('/api/data?kind=search'),
  request.get('/api/data?kind=search&source=historical'),
  request.get('/api/data?kind=search&source=community'),
  request.get('/api/data?kind=activities')
 ]);
 for(const response of [summaryResponse,allResponse,historicalResponse,communityResponse,activitiesResponse])expect(response.ok()).toBeTruthy();
 const summary=await summaryResponse.json(),all=await allResponse.json(),historical=await historicalResponse.json(),community=await communityResponse.json(),activities=await activitiesResponse.json();
 expect(all.total).toBe(all.historical_total+all.community_total);
 expect(historical.total).toBe(summary.counts.venues);
 expect(all.historical_total).toBe(historical.total);
 expect(all.community_total).toBe(community.total);
 expect(community.rows.every((v:any)=>v.source_type==='user_submitted'&&v.avg_rating===null&&v.rating_count===null)).toBeTruthy();
 expect(allResponse.headers()['cache-control']).toBe('no-store');
 expect(activitiesResponse.headers()['cache-control']).toBe('no-store');
 expect(activities.length).toBeGreaterThan(0);
 for(const a of activities)expect(a.discoverable_venues).toBe(a.venues+a.approved_community_venues);
 const activity=activities[0],activitySearch=await request.get('/api/data?'+new URLSearchParams({kind:'search',activity:activity.label}));
 expect(activitySearch.ok()).toBeTruthy();
 expect((await activitySearch.json()).total).toBe(activity.discoverable_venues);
 const historicalDetail=await request.get('/api/data?'+new URLSearchParams({kind:'detail',id:historical.rows[0].venue_id}));
 expect(historicalDetail.ok()).toBeTruthy();
 const detail=await historicalDetail.json();
 expect(detail[0].source_type).toBe('third_party_historical');
 expect(detail[0].venue_activities.length).toBeGreaterThan(0);
 expect(Array.isArray(detail[0].predictions)).toBeTruthy();
 expect((await request.get('/api/data?kind=search&source=pending')).status()).toBe(400);
 expect((await request.get('/api/data?kind=search&source=community&min=1')).ok()).toBeTruthy();
 expect((await (await request.get('/api/data?kind=search&source=community&min=1')).json()).total).toBe(0);
});

// Browser fixtures never create submissions in production.
async function fixtureDirectories(route:any){
 const kind=new URL(route.request().url()).searchParams.get('kind');
 if(kind==='summary')return route.fulfill({json:{counts:{venues:8,rated:7,unrated:1,activity_labels:1,regions:1},regions:[{region:'chennai',venues:8,rated:7,unrated:1,mean_rating:4}]}});
 if(kind==='regions')return route.fulfill({json:[{region:'chennai',display_name:'Chennai',venues:8,rated:7,unrated:1}]});
 if(kind==='labels')return route.fulfill({json:[{label:'Badminton'}]});
 return route.continue();
}
test('approved community venues open from explorer and can be compared',async({page})=>{
 const fixture={venue_id:'00000000-0000-4000-8000-000000000001',name:'Browser fixture community court',region:'chennai',source_type:'user_submitted',is_synthetic:false,avg_rating:null,rating_count:null,activities:['Badminton'],locality:'Fixture locality',address:'Fixture address',description:'Fixture description',latitude:null,longitude:null,submitted_at:'2026-10-02T00:00:00Z',venue_ratings:{avg_rating:null,rating_count:null},venue_activities:[{label:'Badminton'}],predictions:[]};
 await page.route('**/api/data?**',async route=>{
  const p=new URL(route.request().url()).searchParams,kind=p.get('kind');
  if(kind==='search')return route.fulfill({json:{total:1,historical_total:0,community_total:1,rows:[fixture]}});
  if(kind==='detail')return route.fulfill({json:[fixture]});
  if(kind==='compare')return route.fulfill({json:[fixture]});
  return fixtureDirectories(route);
 });
 await page.goto('/venues?source=community');
 await expect(page.getByText('0 historical + 1 approved community', {exact:false})).toBeVisible();
 await expect(page.getByText('Not collected',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:fixture.name,exact:true}).click();
 await expect(page.getByRole('heading',{name:fixture.name,exact:true})).toBeVisible();
 await expect(page.getByText('COMMUNITY · APPROVED FOR DISPLAY',{exact:true})).toBeVisible();
 await expect(page.getByText('Ratings and rating counts are not collected for community submissions.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
 await page.getByRole('link',{name:'Open comparison →',exact:true}).click();
 await expect(page.getByRole('cell',{name:'Approved community',exact:true})).toBeVisible();
 const storage=await page.evaluate(()=>JSON.parse(localStorage.getItem('playo-observatory-venue-compare-v1')||'[]'));
 expect(storage[0].id).toBe(fixture.venue_id);
});

test('activity directory shows both sources and opens the combined activity filter',async({page})=>{
 await page.route('**/api/data?**',async route=>{
  const p=new URL(route.request().url()).searchParams;
  if(p.get('kind')==='activities')return route.fulfill({json:[{label:'Badminton',venues:8,approved_community_venues:2,discoverable_venues:10,rated:7,unrated:1,mean_rating:4}]});
  return fixtureDirectories(route);
 });
 await page.goto('/sports');
 for(const name of ['Historical','Approved community','Total venues','Historical mean rating'])await expect(page.getByRole('columnheader',{name,exact:true})).toBeVisible();
 const link=page.getByRole('link',{name:'Badminton',exact:true});
 await expect(link).toHaveAttribute('href','/venues?activity=Badminton');
 const row=page.getByRole('row').filter({has:link});
 await expect(row.getByRole('cell',{name:'2',exact:true})).toBeVisible();
 await expect(row.getByRole('cell',{name:'10',exact:true})).toBeVisible();
});
