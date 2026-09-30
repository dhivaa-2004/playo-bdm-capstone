'use client';
import {useCallback,useEffect,useState} from 'react';
import TurnstileWidget from '@/components/turnstile-widget';
import {Button} from '@/components/ui/button';

const reasons=[
 ['duplicate','Duplicate record'],['closed_or_moved','Venue closed or moved'],['incorrect_location','Incorrect location'],
 ['incorrect_activities','Incorrect activities or services'],['incorrect_name','Incorrect venue name'],['other','Other correction'],
] as const;

export default function VenueReport({targetType,targetId,targetName}:{targetType:string;targetId:string;targetName:string}){
 const [siteKey,setSiteKey]=useState(''),[token,setToken]=useState(''),[resetKey,setResetKey]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const onToken=useCallback((value:string)=>setToken(value),[]);
 useEffect(()=>{fetch('/api/data?kind=public_config',{cache:'no-store'}).then(async r=>{const d:any=await r.json();if(!r.ok)throw new Error(d.error);setSiteKey(d.turnstileSiteKey)}).catch(e=>setError(e.message||'Bot protection unavailable.'))},[]);
 if(!['historical','submitted'].includes(targetType)||!/^[0-9a-f-]{36}$/i.test(targetId))return <section className="panel"><h2>Select a venue first</h2><p>Open a venue record and choose “Report incorrect information”.</p><a className="text-link" href="/venues">Browse historical venues →</a></section>;
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const fields=new FormData(form);setBusy(true);setError('');try{const response=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'report_issue',targetType,targetId,reason:fields.get('reason'),details:fields.get('details'),turnstileToken:token})});const data:any=await response.json();if(!response.ok)throw new Error(data.error||'Could not save the report.');if(data[0]?.status!=='pending')throw new Error('The database did not confirm the report.');setSaved('pending');form.reset();setToken('');setResetKey(v=>v+1)}catch(e){setError(e instanceof Error?e.message:'Could not save the report.');setToken('');setResetKey(v=>v+1)}finally{setBusy(false)}}
 return <section className="panel report-panel"><div className="panel-head"><div><h2>Report incorrect information</h2><p>Reports are private and reviewed by the project owner in Supabase.</p></div><a className="text-link" href={targetType==='historical'?'/venues/'+targetId:'/submitted-venues'}>Back to venue</a></div>
 <div className="callout"><strong>Selected record</strong><p>{targetName||targetId} · {targetType==='historical'?'Historical third-party record':'Approved community submission'}</p></div>
 {saved&&<div className="callout success-callout" role="status"><strong>Correction report saved</strong><p>Thank you. It is now pending owner review.</p></div>}
 {error&&<p className="error-inline" role="alert">{error}</p>}
 <form className="form report-form" onSubmit={submit}><label>What is incorrect?<select name="reason" defaultValue="" required><option value="" disabled>Select a reason</option>{reasons.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Correction details<textarea name="details" minLength={10} maxLength={2000} rows={6} required placeholder="Explain what is incorrect and what the accurate information should be."/></label>{siteKey?<TurnstileWidget key={resetKey} siteKey={siteKey} action="report_issue" onToken={onToken} resetKey={resetKey}/>:<p>Loading bot protection…</p>}<Button disabled={busy||!token}>{busy?'Saving report…':'Submit correction report'}</Button></form>
 </section>;
}
