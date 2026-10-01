'use client';

import {useState} from 'react';
import {Database,Download,FileCode2,GitBranch,Printer} from 'lucide-react';
import {Button} from '@/components/ui/button';
import ContextualInsight from '@/components/contextual-insight';

export default function LineageView({data}:{data:any}){
 const [tab,setTab]=useState<'journey'|'sql'|'model'>('journey');
 const d=data.dataset||{},m=data.model||{};
 return <>
  <div className="lineage-actions"><a className="download-action" href="/api/data?kind=export_summary"><Download size={16}/>Download aggregate CSV</a><Button variant="outline" onClick={()=>window.print()}><Printer size={16}/>Print / Save PDF</Button></div>
  <div className="evidence-tabs" role="tablist" aria-label="Lineage explanation sections">{([['journey','Data journey',GitBranch],['sql','SQL evidence',FileCode2],['model','Model lineage',Database]] as const).map(([value,label,Icon])=><button type="button" role="tab" aria-selected={tab===value} key={value} onClick={()=>setTab(value)}><Icon size={16}/>{label}</button>)}</div>
  {tab==='journey'&&<section className="panel lineage-story" role="tabpanel"><h2>One historical record, traceable end to end</h2><div className="lineage-flow">{[
   ['01','Private archive',`${d.raw_rows??'—'} raw rows · SHA-256 ${String(d.archive_hash||'').slice(0,12)}…`],
   ['02','Python validation',`${d.duplicate_rows??'—'} exact duplicate extras removed · parser ${d.parser_version||'—'}`],
   ['03','Normalized PostgreSQL',`${d.accepted_rows??'—'} venues split across identity, rating and activity tables`],
   ['04','Feature store',`Target stays missing for ${d.unrated_rows??'—'} unrated rows; no synthetic filling`],
   ['05','Versioned model',m.run_id?`Run ${m.run_id} · feature version ${m.feature_version}`:'No stored model run']
  ].map(x=><article key={x[0]}><span>{x[0]}</span><div><strong>{x[1]}</strong><p>{x[2]}</p></div></article>)}</div>
  <ContextualInsight headline="Why the hashes matter" lead="The archive, dataset and training hashes connect a visible result to the exact inputs and experiment that produced it." prompt="Follow the reproducibility logic" tone="method"><p>If any raw member, normalized record, feature or training configuration changes, its downstream hash changes. That makes silent replacement detectable without exposing the private raw archive.</p></ContextualInsight></section>}
  {tab==='sql'&&<section className="query-gallery" role="tabpanel"><div className="panel"><h2>SQL behind the public evidence</h2><p>These are sanitized, read-only examples. They explain how each result is constructed; visitors cannot run arbitrary SQL.</p></div>{(data.queries||[]).map((q:any)=><details className="query-card" key={q.id}><summary><span><b>{q.title}</b><small>{q.purpose}</small></span><FileCode2 size={18}/></summary><pre><code>{q.sql}</code></pre></details>)}</section>}
  {tab==='model'&&<section className="panel" role="tabpanel"><h2>Stored experiment identity</h2>{m.run_id?<div className="lineage-metadata"><dl><div><dt>Run ID</dt><dd>{m.run_id}</dd></div><div><dt>Feature version</dt><dd>{m.feature_version}</dd></div><div><dt>Model</dt><dd>{String(m.model_name).replaceAll('_',' ')}</dd></div><div><dt>Created</dt><dd>{new Date(m.created_at).toLocaleString('en-IN')}</dd></div><div><dt>Dataset hash</dt><dd>{m.dataset_hash}</dd></div><div><dt>Training hash</dt><dd>{m.training_hash}</dd></div></dl><ContextualInsight headline="Evaluation and inference are deliberately separated" lead={`${m.split_summary?.test_rows??'—'} held-out rows measure accuracy; ${m.split_summary?.unrated_rows??'—'} unrated rows receive estimates but cannot validate them.`} prompt="Why not combine all predictions?" tone="caution"><p>Training predictions are in-sample, and unrated rows have no observed target. Only the test split provides independent error evidence. Combining the three would make the model appear better supported than it is.</p></ContextualInsight></div>:<p>No stored model run is available.</p>}</section>}
 </>;
}
