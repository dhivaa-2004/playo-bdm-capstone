'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

type Venue={id:string;name:string;region:string;locality:string;address:string;description:string;activities:string[];latitude:number|null;longitude:number|null;submitted_at:string};
export default function VenueSubmissions({form=false,regions,labels}:{form?:boolean;regions:Record<string,string>;labels:string[]}){
 const [rows,setRows]=useState<Venue[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(!form),[busy,setBusy]=useState(false),[page,setPage]=useState(1),[q,setQ]=useState(''),[search,setSearch]=useState(''),[region,setRegion]=useState(''),[version,setVersion]=useState(0),[saved,setSaved]=useState<Venue|null>(null);
 const [activities,setActivities]=useState<string[]>([]);
 useEffect(()=>{if(form)return;let active=true;setLoading(true);setError('');fetch('/api/data?'+new URLSearchParams({kind:'submissions',page:String(page),q:search,region}),{cache:'no-store'}).then(async r=>{const data:any=await r.json();if(!r.ok)throw new Error(data.error);if(active)setRows(data)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[form,page,search,region,version]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const target=e.currentTarget;const fields=new FormData(target);setBusy(true);setError('');try{
 const body={action:'submit_venue',name:fields.get('name'),region:fields.get('region'),locality:fields.get('locality'),address:fields.get('address'),description:fields.get('description'),latitude:fields.get('latitude'),longitude:fields.get('longitude'),activities};
 const r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d:any=await r.json();if(!r.ok)throw new Error(d.error||'Could not save the venue.');if(!d[0]?.id)throw new Error('The database did not confirm a saved record.');setSaved(d[0]);target.reset();setActivities([]);
 }catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft remains in the form.')}finally{setBusy(false)}}
 return <section className="panel"><div className="panel-head"><div><h2>{form?'Add a venue':'User-submitted venues'}</h2><p>No sign-in required. Entries are public, unverified claims.</p></div><a className="text-link" href={form?'/submitted-venues':'/add-venue'}>{form?'View submitted venues':'Add a venue →'}</a></div>
 <div className="callout"><strong>Separate from historical research</strong><p>These entries do not change historical KPIs or train the rating model. Do not enter private contact details or claim Playo verification.</p></div>
 {error&&<div role="alert" className="error-state">{error}{!form&&<Button onClick={()=>setVersion(v=>v+1)}>Retry</Button>}</div>}
 {form?<>{saved&&<div role="status" className="callout"><strong>Venue saved to Supabase</strong><p>{saved.name} · User-submitted · Unverified</p><p className="mono">Record ID: {saved.id}</p><a className="text-link" href="/submitted-venues">View the saved venue →</a></div>}
 {(!labels.length||!Object.keys(regions).length)&&<p role="status">Waiting for the database region and activity directories. Use Refresh live data if they do not load.</p>}
 <form className="form submission-form" onSubmit={submit}>
 <label>Venue name<Input name="name" minLength={2} maxLength={160} required/></label>
 <label>Source region<select name="region" required defaultValue=""><option value="" disabled>Select a region</option>{Object.entries(regions).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <label>Locality / area<Input name="locality" minLength={2} maxLength={120} required/></label>
 <label>Venue address (optional)<Input name="address" maxLength={400}/></label>
 <div className="coordinate-fields"><label>Latitude (optional)<Input name="latitude" type="number" step="any" min={-90} max={90}/></label><label>Longitude (optional)<Input name="longitude" type="number" step="any" min={-180} max={180}/></label></div>
 <fieldset><legend>Activities & services — choose 1 to 15</legend><div className="activity-options">{labels.map(label=><label key={label}><input type="checkbox" checked={activities.includes(label)} disabled={!activities.includes(label)&&activities.length>=15} onChange={e=>setActivities(a=>e.target.checked?[...a,label]:a.filter(x=>x!==label))}/>{label}</label>)}</div></fieldset>
 <label>Venue description (optional)<textarea name="description" maxLength={2000} rows={4}/></label>
 <label className="consent-row"><input type="checkbox" required/>I understand this entry will be public and labelled unverified.</label>
 <Button disabled={busy||!activities.length||!Object.keys(regions).length}>{busy?'Saving to database…':'Save venue'}</Button>
 </form></>:<><form className="filters" onSubmit={e=>{e.preventDefault();setPage(1);setSearch(q)}}><Input aria-label="Search submitted venues" placeholder="Search venue names" maxLength={160} value={q} onChange={e=>setQ(e.target.value)}/><Button type="submit">Search</Button><select aria-label="Submitted venue region" value={region} onChange={e=>{setRegion(e.target.value);setPage(1)}}><option value="">All regions</option>{Object.entries(regions).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><Button type="button" variant="outline" onClick={()=>setVersion(v=>v+1)}>Refresh</Button></form>
 {loading?<p role="status">Loading submitted venues…</p>:!error&&<><div className="submission-grid">{rows.slice(0,20).map(v=><article className="region-card" key={v.id}><span className="small-badge">USER-SUBMITTED · UNVERIFIED</span><h3>{v.name}</h3><p>{v.locality} · {regions[v.region]||v.region}</p>{v.address&&<p>{v.address}</p>}<div className="tags">{v.activities.map(a=><span key={a}>{a}</span>)}</div>{v.description&&<p>{v.description}</p>}{v.latitude!=null&&<p>Coordinates: {v.latitude}, {v.longitude}</p>}<p>Submitted {new Date(v.submitted_at).toLocaleDateString('en-IN')}</p></article>)}</div>{!rows.length&&<p className="empty-state">No submitted venues match. Add the first venue using the form.</p>}<div className="pagination"><span>Page {page}</span><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Button variant="outline" disabled={rows.length<=20} onClick={()=>setPage(p=>p+1)}>Next</Button></div></>}
 </>}
 </section>
}
