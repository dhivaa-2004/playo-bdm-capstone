'use client';
import {useCallback,useEffect,useState} from 'react';
import TurnstileWidget from '@/components/turnstile-widget';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

type Venue={id:string;name:string;region:string;locality:string;address:string;description:string;activities:string[];latitude:number|null;longitude:number|null;submitted_at:string;verification_status:string};
type Saved={name:string;verification_status:string};

export default function VenueSubmissions({form=false,regions,labels}:{form?:boolean;regions:Record<string,string>;labels:string[]}){
 const [rows,setRows]=useState<Venue[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(!form),[busy,setBusy]=useState(false),[page,setPage]=useState(1),[q,setQ]=useState(''),[search,setSearch]=useState(''),[region,setRegion]=useState(''),[version,setVersion]=useState(0),[saved,setSaved]=useState<Saved|null>(null);
 const [activities,setActivities]=useState<string[]>([]),[siteKey,setSiteKey]=useState(''),[token,setToken]=useState(''),[resetKey,setResetKey]=useState(0),[protectionError,setProtectionError]=useState('');
 const [draft,setDraft]=useState({name:'',region:'',locality:''}),[duplicates,setDuplicates]=useState<any[]>([]),[checking,setChecking]=useState(false);
 const onToken=useCallback((value:string)=>setToken(value),[]);

 useEffect(()=>{if(!form)return;fetch('/api/data?kind=public_config',{cache:'no-store'}).then(async r=>{const d:any=await r.json();if(!r.ok||!d.turnstileSiteKey)throw new Error(d.error||'Bot protection unavailable.');setSiteKey(d.turnstileSiteKey)}).catch(e=>setProtectionError(e.message))},[form]);
 useEffect(()=>{if(form)return;let active=true;setLoading(true);setError('');fetch('/api/data?'+new URLSearchParams({kind:'submissions',page:String(page),q:search,region}),{cache:'no-store'}).then(async r=>{const data:any=await r.json();if(!r.ok)throw new Error(data.error);if(active)setRows(data)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[form,page,search,region,version]);
 useEffect(()=>{if(!form||draft.name.trim().length<2||draft.locality.trim().length<2||!draft.region){setDuplicates([]);return}const controller=new AbortController();const timer=setTimeout(()=>{setChecking(true);fetch('/api/data?'+new URLSearchParams({kind:'duplicate_check',name:draft.name,region:draft.region,locality:draft.locality}),{signal:controller.signal,cache:'no-store'}).then(async r=>{const d:any=await r.json();if(r.ok)setDuplicates(d)}).catch(()=>{}).finally(()=>setChecking(false))},450);return()=>{clearTimeout(timer);controller.abort()}},[form,draft]);

 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const target=e.currentTarget;const fields=new FormData(target);setBusy(true);setError('');try{
  const body={action:'submit_venue',name:fields.get('name'),region:fields.get('region'),locality:fields.get('locality'),address:fields.get('address'),description:fields.get('description'),latitude:fields.get('latitude'),longitude:fields.get('longitude'),activities,turnstileToken:token};
  const r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d:any=await r.json();if(!r.ok)throw new Error(d.error||'Could not save the venue.');if(d[0]?.verification_status!=='pending')throw new Error('The database did not confirm a queued record.');setSaved(d[0]);target.reset();setActivities([]);setDraft({name:'',region:'',locality:''});setDuplicates([]);setToken('');setResetKey(v=>v+1);
 }catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft remains in the form.');setToken('');setResetKey(v=>v+1)}finally{setBusy(false)}}

 return <section className="panel"><div className="panel-head"><div><h2>{form?'Add a venue':'Approved community venues'}</h2><p>{form?'No sign-in required. Every entry is reviewed before public display.':'Owner-reviewed submissions; they remain unverified community claims.'}</p></div><a className="text-link" href={form?'/submitted-venues':'/add-venue'}>{form?'View approved venues':'Add a venue →'}</a></div>
 <div className="callout"><strong>Separate from historical research</strong><p>Community entries never change historical KPIs, model training or predictions. Approval means suitable for display—it does not mean Playo or real-world verification.</p></div>
 {error&&<div role="alert" className="error-state">{error}{!form&&<Button onClick={()=>setVersion(v=>v+1)}>Retry</Button>}</div>}
 {form?<>{saved&&<div role="status" className="callout success-callout"><strong>Venue queued in Supabase</strong><p>{saved.name} · Pending owner review</p><p>It will appear in the community directory only after approval.</p></div>}
 {(!labels.length||!Object.keys(regions).length)&&<p role="status">Waiting for the database region and activity directories. Use Refresh live data if they do not load.</p>}
 <form className="form submission-form" onSubmit={submit}>
  <label>Venue name<Input name="name" minLength={2} maxLength={160} required value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></label>
  <label>Source region<select name="region" required value={draft.region} onChange={e=>setDraft(d=>({...d,region:e.target.value}))}><option value="" disabled>Select a region</option>{Object.entries(regions).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <label>Locality / area<Input name="locality" minLength={2} maxLength={120} required value={draft.locality} onChange={e=>setDraft(d=>({...d,locality:e.target.value}))}/></label>
  {checking&&<p className="muted" role="status">Checking for similar venue records…</p>}
  {!!duplicates.length&&<div className="duplicate-warning" role="status"><strong>Possible duplicate found</strong><p>Review these records before continuing:</p><ul>{duplicates.map((v:any)=><li key={v.source_type+v.id}><a href={v.source_type==='third_party_historical'?'/venues/'+v.id:'/submitted-venues'}>{v.name}</a> · {regions[v.region]||v.region}{v.locality?' · '+v.locality:''}</li>)}</ul><p>You may continue only if this is a genuinely different venue.</p></div>}
  <label>Venue address (optional)<Input name="address" maxLength={400}/></label>
  <div className="coordinate-fields"><label>Latitude (optional)<Input name="latitude" type="number" step="any" min={-90} max={90}/></label><label>Longitude (optional)<Input name="longitude" type="number" step="any" min={-180} max={180}/></label></div>
  <fieldset><legend>Activities & services — choose 1 to 15</legend><div className="activity-options">{labels.map(label=><label key={label}><input type="checkbox" checked={activities.includes(label)} disabled={!activities.includes(label)&&activities.length>=15} onChange={e=>setActivities(a=>e.target.checked?[...a,label]:a.filter(x=>x!==label))}/>{label}</label>)}</div></fieldset>
  <label>Venue description (optional)<textarea name="description" maxLength={2000} rows={4}/></label>
  <label className="consent-row"><input type="checkbox" required/>I understand this is a public community claim that requires moderation.</label>
  {siteKey?<TurnstileWidget key={resetKey} siteKey={siteKey} action="submit_venue" onToken={onToken} resetKey={resetKey}/>:<p className="error-inline" role="alert">{protectionError||'Loading bot protection…'}</p>}
  <Button disabled={busy||!activities.length||!Object.keys(regions).length||!token}>{busy?'Queuing in database…':'Submit for review'}</Button>
 </form></>:<><form className="filters" onSubmit={e=>{e.preventDefault();setPage(1);setSearch(q)}}><Input aria-label="Search community venues" placeholder="Search approved venue names" maxLength={160} value={q} onChange={e=>setQ(e.target.value)}/><Button type="submit">Search</Button><select aria-label="Community venue region" value={region} onChange={e=>{setRegion(e.target.value);setPage(1)}}><option value="">All regions</option>{Object.entries(regions).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><Button type="button" variant="outline" onClick={()=>setVersion(v=>v+1)}>Refresh</Button></form>
 {loading?<p role="status">Loading approved community venues…</p>:!error&&<><div className="submission-grid">{rows.slice(0,20).map(v=><article className="region-card" key={v.id}><span className="small-badge">COMMUNITY · APPROVED FOR DISPLAY</span><h3>{v.name}</h3><p>{v.locality} · {regions[v.region]||v.region}</p>{v.address&&<p>{v.address}</p>}<div className="tags">{v.activities.map(a=><span key={a}>{a}</span>)}</div>{v.description&&<p>{v.description}</p>}{v.latitude!=null&&<p>Coordinates: {v.latitude}, {v.longitude}</p>}<p>Submitted {new Date(v.submitted_at).toLocaleDateString('en-IN')}</p><a className="text-link" href={'/report?type=submitted&id='+encodeURIComponent(v.id)+'&name='+encodeURIComponent(v.name)}>Report incorrect information →</a></article>)}</div>{!rows.length&&<p className="empty-state">No approved community venues match. New submissions remain private until reviewed.</p>}<div className="pagination"><span>Page {page}</span><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Button variant="outline" disabled={rows.length<=20} onClick={()=>setPage(p=>p+1)}>Next</Button></div></>}
 </>}
 </section>;
}
