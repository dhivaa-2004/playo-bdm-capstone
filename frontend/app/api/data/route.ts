import {supabaseConfig as cfg} from '@/lib/supabase-config';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic='force-dynamic';
function uuid(s:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);}
async function call(path:string,req:NextRequest,method='GET',body?:unknown,privateData=false){
 const {url,key}=cfg();const token=req.cookies.get('playo_access')?.value;
 if(privateData&&!token)return NextResponse.json({error:'Sign in to access administration'},{status:401});
 if(privateData){const a=await fetch(url+'/rest/v1/rpc/is_admin',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',cache:'no-store'});if(!a.ok)return NextResponse.json({error:'Your session could not be verified. Please sign in again.'},{status:a.status===401?401:503});if(await a.json()!==true)return NextResponse.json({error:'Administrator access is required. Account registration does not grant write access.'},{status:403});}
 const response=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:key,'Content-Type':'application/json',...(privateData&&token?{Authorization:'Bearer '+token}:{}),...(method!=='GET'?{Prefer:'return=representation'}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const text=await response.text();if(!response.ok){return NextResponse.json({error:response.status===401?'Your session expired. Please sign in again.':'The database request could not be completed.'},{status:response.status});}
 if(privateData&&['PATCH','DELETE'].includes(method)&&text.trim()==='[]')return NextResponse.json({error:'Record not found or access denied.'},{status:404});
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
 if(kind==='workspace')return await call('workspace_records?select=*&order=updated_at.desc&limit=100',req,'GET',undefined,true);
 if(kind==='audit')return await call('workspace_audit?select=*&order=changed_at.desc&limit=50',req,'GET',undefined,true);
 return NextResponse.json({error:'Unknown request'},{status:400});
 }catch(e){return NextResponse.json({error:e instanceof Error&&e.message==='Database connection is not configured'?'Database connection is not configured.':'Unable to reach the database. Please retry.'},{status:503});}}
export async function POST(req:NextRequest){try{
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 const b:any=await req.json();if(!['create','update','delete'].includes(b.action))return NextResponse.json({error:'Invalid action'},{status:400});
 if(b.action!=='create'&&!uuid(b.id||''))return NextResponse.json({error:'Invalid record ID'},{status:400});
 const data={name:String(b.name||'').trim(),note:String(b.note||''),...(typeof b.archived==='boolean'?{archived:b.archived}:{}),...(b.venue_id&&uuid(b.venue_id)?{venue_id:b.venue_id}:{})};
 if(b.action!=='delete'&&(!data.name||data.name.length>160||data.note.length>4000))return NextResponse.json({error:'Enter a name (1–160 characters) and a note up to 4,000 characters.'},{status:400});
 return await call('workspace_records'+(b.action==='create'?'':'?id=eq.'+b.id),req,b.action==='create'?'POST':b.action==='delete'?'DELETE':'PATCH',b.action==='delete'?undefined:data,true);
 }catch{return NextResponse.json({error:'Could not save the record. Your draft is still available.'},{status:503});}}
