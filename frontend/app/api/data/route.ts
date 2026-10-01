import {validateVenueReport,validateVenueSubmission} from '@/lib/venue-submission';
import {supabaseConfig as cfg} from '@/lib/supabase-config';
import {turnstileSiteKey,verifyTurnstile} from '@/lib/turnstile';
import {NextRequest,NextResponse} from 'next/server';

export const dynamic='force-dynamic';

function uuid(s:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)}
function requestId(req:NextRequest){return (req.headers.get('cf-ray')||crypto.randomUUID()).slice(0,80)}
function event(level:'info'|'error',name:string,id:string,details:Record<string,unknown>={}){console[level](JSON.stringify({event:name,request_id:id,...details}))}
function cacheValue(seconds:number){return seconds>0?`public, max-age=${Math.min(seconds,60)}, s-maxage=${seconds}, stale-while-revalidate=${seconds*2}`:'no-store'}
async function entityTag(text:string){const bytes=new TextEncoder().encode(text);const hash=await crypto.subtle.digest('SHA-256',bytes);return `"${Array.from(new Uint8Array(hash)).slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('')}"`}

async function call(path:string,req:NextRequest,method='GET',body?:unknown,prefer='return=representation',cacheSeconds=0){
 const id=requestId(req),{url,key}=cfg();
 const response=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:key,'Content-Type':'application/json',...(method!=='GET'?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const text=await response.text();
 if(!response.ok){let code='';try{code=JSON.parse(text).code}catch{}const message=code==='23505'?'A matching venue submission already exists in this region and locality.':code==='23503'?'Choose a region from the directory.':code==='23514'?'Check the venue fields, activities and moderation note.':code==='P0001'?'The public submission limit has been reached. Try again another day.':code==='P0002'?'The selected venue record is no longer available.':'The database request could not be completed.';event('error','database_request_failed',id,{status:response.status,code,path:path.split('?')[0]});return NextResponse.json({error:message,requestId:id},{status:code==='P0001'?429:response.status,headers:{'X-Request-ID':id,'Cache-Control':'no-store'}})}
 const tag=await entityTag(text||'[]');
 const headers={'Content-Type':'application/json','Cache-Control':cacheValue(cacheSeconds),'ETag':tag,'Vary':'Accept-Encoding','X-Request-ID':id};
 if(cacheSeconds>0&&req.headers.get('if-none-match')===tag)return new NextResponse(null,{status:304,headers});
 return new NextResponse(text||'[]',{status:200,headers});
}

function csvCell(value:unknown){const text=String(value??'');return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text}

export async function GET(req:NextRequest){
 try{
  const p=req.nextUrl.searchParams,kind=p.get('kind');
  if(kind==='public_config')return NextResponse.json({turnstileSiteKey:turnstileSiteKey()},{headers:{'Cache-Control':cacheValue(300)}});
  if(kind==='health')return await call('source_regions?select=region&limit=1',req);
  if(kind==='summary')return await call('rpc/dashboard_summary',req,'POST',{},undefined,300);
  if(kind==='quality')return await call('rpc/quality_summary',req,'POST',{},undefined,600);
  if(kind==='quality_detail')return await call('rpc/quality_drilldown',req,'POST',{},undefined,600);
  if(kind==='lineage')return await call('rpc/lineage_summary',req,'POST',{},undefined,600);
  if(kind==='model_diagnostics')return await call('rpc/model_diagnostics',req,'POST',{},undefined,600);
  if(kind==='regions')return await call('region_directory?select=*&order=display_name.asc',req,'GET',undefined,undefined,3600);
  if(kind==='activities')return await call('activity_statistics?select=*&order=venues.desc,label.asc',req,'GET',undefined,undefined,600);
  if(kind==='analytics')return await call('rpc/analytics_detail',req,'POST',{},undefined,600);
  if(kind==='predictions')return await call('rpc/prediction_summary',req,'POST',{},undefined,600);
  if(kind==='labels')return await call('activity_labels?select=label&order=label.asc',req,'GET',undefined,undefined,3600);
  if(kind==='models')return await call('model_runs?select=*&order=created_at.desc&limit=1',req,'GET',undefined,undefined,600);
  if(kind==='map'){
   const region=p.get('region')||'';
   if(region.length>60)return NextResponse.json({error:'Invalid region.'},{status:400});
   return await call('rpc/venue_map_points',req,'POST',{p_region:region},undefined,300);
  }
  if(kind==='duplicate_check'){
   const name=(p.get('name')||'').trim(),region=p.get('region')||'',locality=(p.get('locality')||'').trim();
   if(name.length<2||name.length>160||region.length<1||region.length>60||locality.length<2||locality.length>120)return NextResponse.json({error:'Enter a venue name, region and locality.'},{status:400});
   return await call('rpc/venue_duplicate_candidates',req,'POST',{p_name:name,p_region:region,p_locality:locality});
  }
  if(kind==='search'){
   const page=Number(p.get('page')||1),min=Number(p.get('min')||0),rating=Number(p.get('rating')||0),sort=p.get('sort')||'name';
   if(!Number.isInteger(page)||page<1||page>10000||!Number.isInteger(min)||min<0||min>2147483647||!Number.isFinite(rating)||rating<0||rating>5||!['name','rating_desc','count_desc'].includes(sort)||(p.get('q')||'').length>160)return NextResponse.json({error:'Invalid search filters or page number.'},{status:400});
   return await call('rpc/venue_search_v2',req,'POST',{q:p.get('q')||'',region_filter:p.get('region')||'',activity_filter:p.get('activity')||'',min_count:min,min_rating:rating,sort_by:sort,page_number:page,page_size:20},undefined,30);
  }
  if(kind==='detail'){
   const id=p.get('id')||'';if(!uuid(id))return NextResponse.json({error:'Invalid venue ID'},{status:400});
   const latest=await call('model_runs?select=run_id&order=created_at.desc,run_id.asc&limit=1',req,'GET',undefined,undefined,60);if(!latest.ok)return latest;
   const runs:any=await latest.json();
   return await call('venues?predictions.run_id=eq.'+(runs[0]?.run_id||'00000000-0000-0000-0000-000000000000')+'&venue_id=eq.'+id+'&select=venue_id,name,region,latitude,longitude,source_type,is_synthetic,source_dataset,observed_at,venue_ratings(avg_rating,rating_count),venue_activities(label),predictions(predicted_rating,split,run_id,feature_hash)',req,'GET',undefined,undefined,60);
  }
  if(kind==='compare'){
   const ids=(p.get('ids')||'').split(',').filter(Boolean);
   if(!ids.length||ids.length>4||ids.some(x=>!uuid(x)))return NextResponse.json({error:'Choose one to four valid venue records.'},{status:400});
   const result=await call(`venues?venue_id=in.(${ids.join(',')})&select=venue_id,name,region,latitude,longitude,venue_ratings(avg_rating,rating_count),venue_activities(label)`,req,'GET',undefined,undefined,60);
   if(!result.ok)return result;
   const rows:any[]=await result.json();
   return NextResponse.json(rows.map(v=>({venue_id:v.venue_id,name:v.name,region:v.region,latitude:v.latitude,longitude:v.longitude,avg_rating:v.venue_ratings?.avg_rating??null,rating_count:v.venue_ratings?.rating_count??0,activities:(v.venue_activities||[]).map((a:any)=>a.label).sort()})),{headers:{'Cache-Control':cacheValue(60)}});
  }
  if(kind==='submissions'){
   const page=Number(p.get('page')||1),q=(p.get('q')||'').trim(),region=p.get('region')||'';
   if(!Number.isInteger(page)||page<1||page>10000||q.length>160||region.length>60)return NextResponse.json({error:'Invalid search.'},{status:400});
   const query=new URLSearchParams({select:'*',order:'submitted_at.desc,id.asc',limit:'21',offset:String((page-1)*20)});
   if(q)query.set('name','ilike.*'+q.replace(/[*,%_()\\]/g,'')+'*');if(region)query.set('region','eq.'+region);
   return await call('submitted_venues?'+query.toString(),req);
  }
  if(kind==='export_summary'){
   const result=await call('rpc/dashboard_summary',req,'POST',{},undefined,300);if(!result.ok)return result;const data:any=await result.json();
   const lines=[['section','item','value'],['dataset','historical_venues',data.counts.venues],['dataset','rated_venues',data.counts.rated],['dataset','unrated_venues',data.counts.unrated],['dataset','activity_service_labels',data.counts.activity_labels],['dataset','source_regions',data.counts.regions],['dataset','synthetic_records',data.counts.synthetic],...data.regions.flatMap((r:any)=>[['region',`${r.region}_venues`,r.venues],['region',`${r.region}_rated`,r.rated],['region',`${r.region}_unrated`,r.unrated],['region',`${r.region}_mean_rating`,r.mean_rating]]),['model','run_id',data.model?.run_id||''],['model','selected_model',data.model?.model_name||''],['model','test_mae',data.model?.metrics?.[data.model?.model_name]?.mae??''],['model','test_rmse',data.model?.metrics?.[data.model?.model_name]?.rmse??''],['model','test_r2',data.model?.metrics?.[data.model?.model_name]?.r2??'']];
   const csv=lines.map((row:any[])=>row.map(csvCell).join(',')).join('\n')+'\n';
   return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="playo-observatory-aggregate-summary.csv"','Cache-Control':cacheValue(300),'X-Content-Type-Options':'nosniff'}});
  }
  return NextResponse.json({error:'Unknown request'},{status:400});
 }catch(e){return NextResponse.json({error:e instanceof Error&&e.message==='Database connection is not configured'?'Database connection is not configured.':'Unable to reach the database. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}

export async function POST(req:NextRequest){
 const id=requestId(req);if(req.headers.get('origin')!==req.nextUrl.origin){event('error','write_rejected',id,{reason:'origin'});return NextResponse.json({error:'Invalid origin',requestId:id},{status:403})}
 let body:Record<string,unknown>;
 try{const raw=await req.text();if(raw.length>12000)return NextResponse.json({error:'Submission is too large.',requestId:id},{status:413});body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid request.')}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid request.',requestId:id},{status:400})}
 try{
  const remoteIp=req.headers.get('cf-connecting-ip')||undefined;
  if(body.action==='submit_venue'){
   const {record,turnstileToken}=validateVenueSubmission(body),check=await verifyTurnstile(turnstileToken,remoteIp,req.nextUrl.hostname);
   if(!check.success){event('error','turnstile_rejected',id,{action:'submit_venue'});return NextResponse.json({error:check.error,requestId:id},{status:400})}
   const response=await call('submitted_venues',req,'POST',record,'return=minimal');
   if(response.ok){event('info','venue_submission_queued',id);return NextResponse.json([{name:record.name,verification_status:'pending'}],{headers:{'X-Request-ID':id,'Cache-Control':'no-store'}})}return response;
  }
  if(body.action==='report_issue'){
   const {report,turnstileToken}=validateVenueReport(body),check=await verifyTurnstile(turnstileToken,remoteIp,req.nextUrl.hostname);
   if(!check.success){event('error','turnstile_rejected',id,{action:'report_issue'});return NextResponse.json({error:check.error,requestId:id},{status:400})}
   const payload={target_type:report.targetType,venue_id:report.targetType==='historical'?report.targetId:null,submitted_venue_id:report.targetType==='submitted'?report.targetId:null,reason:report.reason,details:report.details};
   const response=await call('venue_correction_reports',req,'POST',payload,'return=minimal');
   if(response.ok){event('info','correction_report_queued',id);return NextResponse.json([{status:'pending'}],{headers:{'X-Request-ID':id,'Cache-Control':'no-store'}})}return response;
  }
  return NextResponse.json({error:'Unsupported write action.',requestId:id},{status:400});
 }catch(e){event('error','write_failed',id,{message:e instanceof Error?e.message:'unknown'});return NextResponse.json({error:e instanceof Error?e.message:'Could not complete the request.',requestId:id},{status:503})}
}
