'use client';

import {useEffect,useState} from 'react';
import {GitCompareArrows} from 'lucide-react';

const key='playo-observatory-venue-compare-v1';
type Item={id:string;name:string};

export default function ComparisonButton({id,name}:{id:string;name:string}){
 const [saved,setSaved]=useState(false);
 useEffect(()=>{try{const rows:Item[]=JSON.parse(localStorage.getItem(key)||'[]');setSaved(rows.some(x=>x.id===id))}catch{}},[id]);
 function toggle(){let rows:Item[]=[];try{rows=JSON.parse(localStorage.getItem(key)||'[]')}catch{}rows=saved?rows.filter(x=>x.id!==id):[...rows.filter(x=>x.id!==id),{id,name}].slice(-4);localStorage.setItem(key,JSON.stringify(rows));setSaved(!saved)}
 return <button type="button" className="compare-action" onClick={toggle} aria-pressed={saved}><GitCompareArrows size={15}/>{saved?'Remove from comparison':'Add to comparison'}</button>;
}
