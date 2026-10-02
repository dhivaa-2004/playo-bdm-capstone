'use client';

import {useEffect,useMemo,useState} from 'react';
import {GitCompareArrows,X} from 'lucide-react';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import ContextualInsight from '@/components/contextual-insight';

const venueKey='playo-observatory-venue-compare-v1';
function fmt(v:any,d=0){return v==null?'—':Number(v).toLocaleString('en-IN',{maximumFractionDigits:d,minimumFractionDigits:d})}

export default function CompareView({summary,regions}:{summary:any;regions:Record<string,string>}){
 const all=useMemo(()=>summary?.regions||[],[summary]);
 const [selected,setSelected]=useState<string[]>(all.slice(0,2).map((x:any)=>x.region)),[venues,setVenues]=useState<any[]>([]),[loading,setLoading]=useState(false);
 useEffect(()=>{let stored:any[]=[];try{stored=JSON.parse(localStorage.getItem(venueKey)||'[]')}catch{}const ids=stored.map(x=>x.id).filter(Boolean).slice(0,4);if(!ids.length)return;setLoading(true);fetch('/api/data?'+new URLSearchParams({kind:'compare',ids:ids.join(',')})).then(r=>r.json()).then(d=>setVenues(Array.isArray(d)?d:[])).finally(()=>setLoading(false))},[]);
 const rows=useMemo(()=>selected.map(k=>all.find((x:any)=>x.region===k)).filter(Boolean),[selected,all]);
 function toggle(k:string){setSelected(s=>s.includes(k)?s.filter(x=>x!==k):s.length<4?[...s,k]:s)}
 function removeVenue(id:string){const next=venues.filter(x=>x.venue_id!==id);setVenues(next);localStorage.setItem(venueKey,JSON.stringify(next.map(v=>({id:v.venue_id,name:v.name}))))}
 return <>
  <section className="panel"><div className="panel-head"><div><h2>Compare source regions</h2><p>Select two to four regions. These are dataset query regions, not verified municipal boundaries.</p></div><GitCompareArrows/></div><div className="compare-choices">{all.map((r:any)=><label key={r.region}><input type="checkbox" checked={selected.includes(r.region)} onChange={()=>toggle(r.region)} disabled={!selected.includes(r.region)&&selected.length>=4}/>{regions[r.region]||r.region}</label>)}</div><Table><TableHeader><TableRow><TableHead>Measure</TableHead>{rows.map((r:any)=><TableHead key={r.region}>{regions[r.region]||r.region}</TableHead>)}</TableRow></TableHeader><TableBody>{[
   ['Historical records','venues',0],['Rated records','rated',0],['Unrated records','unrated',0],['Mean rating','mean_rating',3],['Median rating','median_rating',3],['Median rating count','median_rating_count',0],['Activity diversity','activity_diversity',0]
  ].map(([label,key,d]:any)=><TableRow key={key}><TableCell>{label}</TableCell>{rows.map((r:any)=><TableCell key={r.region}>{fmt(r[key],d)}</TableCell>)}</TableRow>)}</TableBody></Table>{rows.length>=2&&<ContextualInsight headline="A comparison is not automatically a ranking" lead={`The selected regions differ in record count and missing-rating coverage, so the largest mean is not automatically the strongest evidence.`} prompt="Read this comparison responsibly" tone="caution"><p>Use coverage, rated/unrated counts and rating-count evidence together. The dataset does not contain prices, bookings, revenue, current availability or a representative national sample.</p></ContextualInsight>}</section>
  <section className="panel"><div className="panel-head"><div><h2>Compare saved venues</h2><p>Open any historical or approved community venue and choose “Add to comparison”. Up to four are stored only in this browser.</p></div></div>{loading?<p role="status">Loading saved venues…</p>:venues.length?<div className="venue-comparison"><Table><TableHeader><TableRow><TableHead>Measure</TableHead>{venues.map(v=><TableHead key={v.venue_id}>{v.name}<button type="button" onClick={()=>removeVenue(v.venue_id)} aria-label={'Remove '+v.name}><X size={14}/></button></TableHead>)}</TableRow></TableHeader><TableBody><TableRow><TableCell>Source region</TableCell>{venues.map(v=><TableCell key={v.venue_id}>{regions[v.region]||v.region}</TableCell>)}</TableRow><TableRow><TableCell>Record source</TableCell>{venues.map(v=><TableCell key={v.venue_id}>{v.source_type==='user_submitted'?'Approved community':'Historical'}</TableCell>)}</TableRow><TableRow><TableCell>Recorded rating</TableCell>{venues.map(v=><TableCell key={v.venue_id}>{fmt(v.avg_rating,2)}</TableCell>)}</TableRow><TableRow><TableCell>Rating count</TableCell>{venues.map(v=><TableCell key={v.venue_id}>{fmt(v.rating_count)}</TableCell>)}</TableRow><TableRow><TableCell>Activities / services</TableCell>{venues.map(v=><TableCell key={v.venue_id}>{v.activities.join(', ')}</TableCell>)}</TableRow></TableBody></Table></div>:<div className="empty-state">No venues are saved for comparison yet. <a className="text-link" href="/venues">Open the venue explorer →</a></div>}</section>
 </>;
}
