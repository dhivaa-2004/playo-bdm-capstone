'use client';

import {useState} from 'react';
import {ChevronDown,Lightbulb} from 'lucide-react';

type Props={
  headline:string;
  lead:string;
  prompt:string;
  children:React.ReactNode;
  tone?:'evidence'|'caution'|'method';
};

export default function ContextualInsight({headline,lead,prompt,children,tone='evidence'}:Props){
 const [open,setOpen]=useState(false);
 return <aside className={`context-insight ${tone}`} aria-label={headline}>
  <div className="context-insight-lead"><Lightbulb size={19}/><div><strong>{headline}</strong><p>{lead}</p></div></div>
  <button type="button" className="insight-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{prompt}<ChevronDown size={16} className={open?'rotated':''}/></button>
  {open&&<div className="insight-body">{children}</div>}
 </aside>;
}
