'use client';

import ContextualInsight from '@/components/contextual-insight';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';

function n(v:any,d=2){return Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d})}

export default function ModelDiagnostics({data}:{data:any}){
 const o=data?.overview||{},residuals=data?.residuals||[],cal=data?.calibration||[];
 const within=o.records?100*o.within_half_star/o.records:0,max=Math.max(1,...residuals.map((x:any)=>x.records));
 const direction=Math.abs(Number(o.mean_error))<.03?'shows little overall directional bias':Number(o.mean_error)>0?'leans slightly high overall':'leans slightly low overall';
 return <>
  <div className="diagnostic-strip"><div><strong>{n(data.baseline_improvement_pct,1)}%</strong><span>MAE improvement over median baseline</span></div><div><strong>{n(within,1)}%</strong><span>held-out estimates within 0.5 stars</span></div><div><strong>{n(o.p90_absolute_error,2)}</strong><span>90th-percentile absolute error</span></div><div><strong>{n(o.mean_error,3)}</strong><span>mean signed error</span></div></div>
  <ContextualInsight headline={`The model ${direction}`} lead={`Across ${o.records??'—'} held-out records, the mean signed error is ${n(o.mean_error,3)} stars. This average can still hide difficult rating ranges.`} prompt="Interpret the result beyond one score"><p>The model is useful only relative to the baseline and within the historical sample. A modest R² and uneven regional sensitivity mean it should be described as a limited rating-estimation experiment—not a quality, demand or future-performance system.</p></ContextualInsight>
  <div className="dashboard-grid diagnostics-grid"><section className="panel"><h2>Residual distribution</h2><p>Residual = predicted rating minus observed rating. Negative means under-estimation.</p><div className="residual-chart">{residuals.map((r:any)=><div key={r.band}><span>{r.band}</span><i><b style={{width:`${r.records/max*100}%`}}/></i><strong>{r.records}</strong></div>)}</div></section><section className="panel"><h2>Observed versus estimated bands</h2><p>Aggregation reveals where predictions compress toward the centre.</p><Table><TableHeader><TableRow><TableHead>Observed band</TableHead><TableHead>n</TableHead><TableHead>Observed mean</TableHead><TableHead>Estimated mean</TableHead><TableHead>Gap</TableHead></TableRow></TableHeader><TableBody>{cal.map((r:any)=><TableRow key={r.observed_band}><TableCell>{r.observed_band}</TableCell><TableCell>{r.records}</TableCell><TableCell>{n(r.mean_observed)}</TableCell><TableCell>{n(r.mean_predicted)}</TableCell><TableCell>{n(r.mean_predicted-r.mean_observed)}</TableCell></TableRow>)}</TableBody></Table></section></div>
 </>;
}
