import {validateVenueSubmission} from '@/lib/venue-submission';
import {supabaseConfig as cfg} from '@/lib/supabase-config';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic='force-dynamic';
function uuid(s:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);}
async function call(path:string,req:NextRequest,method='GET',body?:unknown){
 const {url,key}=cfg();
 const response=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:key,'Content-Type':'application/json',...(method!=='GET'?{Prefer:'return=representation'}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const text=await response.text();if(!response.ok){let code='';try{code=JSON.parse(text).code}catch{}const message=code==='23505'?'This venue name and locality already exist in the selected region.':code==='23503'?'Choose a region from the directory.':code==='23514'?'Check the venue fields and choose activities from the directory.':code==='P0001'?'The public submission limit has been reached. Try again another day.':'The database request could not be completed.';return NextResponse.json({error:message},{status:code==='P0001'?429:response.status});}
 return new NextResponse(text||'[]',{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
export async function GET(req:NextRequest){try{const p=req.nextUrl.searchParams;const kind=p.get('kind');
 if(kind==='summary')return await call('rpc/dashboard_summary',req,'POST',{});
 if(kind==='quality')return await call('rpc/quality_summary',req,'POST',{});
 if(kind==='regions')return await call('region_directory?select=*&order=display_name.asc',req);
 if(kind==='activities')return await call('activity_statistics?select=*&order=venues.desc,label.asc',req);
 if(kind==='analytics')return await call('rpc/analytics_detail',req,'POST',{});
 if(kind==='predictions')return await call('rpc/prediction_summary',req,'POST',{});
 if(kind==='labels')return await call('activity_labels?select=label&order=label.asc',req);
 if(kind==='models')return await call('model_runs?select=*&order=created_at.desc&limit=1',req);
 if(kind==='search'){
 const page=Number(p.get('page')||1),min=Number(p.get('min')||0),rating=Number(p.get('rating')||0),sort=p.get('sort')||'name';
 if(!Number.isInteger(page)||page<1||page>10000||!Number.isInteger(min)||min<0||min>2147483647||!Number.isFinite(rating)||rating<0||rating>5||!['name','rating_desc','count_desc'].includes(sort)||(p.get('q')||'').length>160)return NextResponse.json({error:'Invalid search filters or page number.'},{status:400});
 return await call('rpc/venue_search_v2',req,'POST',{q:p.get('q')||'',region_filter:p.get('region')||'',activity_filter:p.get('activity')||'',min_count:min,min_rating:rating,sort_by:sort,page_number:page,page_size:20});}
 if(kind==='detail'){const id=p.get('id')||'';if(!uuid(id))return NextResponse.json({error:'Invalid venue ID'},{status:400});const latest=await call('model_runs?select=run_id&order=created_at.desc,run_id.asc&limit=1',req);if(!latest.ok)return latest;const runs:any=await latest.json();return await call('venues?predictions.run_id=eq.'+(runs[0]?.run_id||'00000000-0000-0000-0000-000000000000')+'&venue_id=eq.'+id+'&select=venue_id,name,region,latitude,longitude,source_type,is_synthetic,source_dataset,observed_at,venue_ratings(avg_rating,rating_count),venue_activities(label),predictions(predicted_rating,split,run_id,feature_hash)',req);}
 if(kind==='submissions'){
 const page=Number(p.get('page')||1),q=(p.get('q')||'').trim(),region=p.get('region')||'';
 if(!Number.isInteger(page)||page<1||page>10000||q.length>160||region.length>60)return NextResponse.json({error:'Invalid search.'},{status:400});
 const query=new URLSearchParams({select:'*',order:'submitted_at.desc,id.asc',limit:'21',offset:String((page-1)*20)});
 if(q)query.set('name','ilike.*'+q.replace(/[*,%_()\\]/g,'')+'*');if(region)query.set('region','eq.'+region);
 return await call('submitted_venues?'+query.toString(),req);
 }
 return NextResponse.json({error:'Unknown request'},{status:400});
 }catch(e){return NextResponse.json({error:e instanceof Error&&e.message==='Database connection is not configured'?'Database connection is not configured.':'Unable to reach the database. Please retry.'},{status:503});}}
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 let data;
 try{const raw=await req.text();if(raw.length>12000)return NextResponse.json({error:'Submission is too large.'},{status:413});const b=JSON.parse(raw);if(b.action!=='submit_venue')return NextResponse.json({error:'Only venue submissions are supported.'},{status:400});data=validateVenueSubmission(b);}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid venue form.'},{status:400});}
 try{return await call('submitted_venues',req,'POST',data);}catch{return NextResponse.json({error:'Could not reach the database. Your draft is still available.'},{status:503});}
}
