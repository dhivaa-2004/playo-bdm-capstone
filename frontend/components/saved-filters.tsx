'use client';

import {useEffect,useState} from 'react';
import {Bookmark,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

type Saved={name:string;query:string};
const key='playo-observatory-saved-filters-v1';

function read():Saved[]{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(x=>x&&typeof x.name==='string'&&typeof x.query==='string').slice(0,10):[]}catch{return[]}}

export default function SavedFilters({query}:{query:string}){
 const [items,setItems]=useState<Saved[]>([]),[editing,setEditing]=useState(false),[name,setName]=useState('');
 useEffect(()=>setItems(read()),[]);
 function persist(next:Saved[]){setItems(next);localStorage.setItem(key,JSON.stringify(next))}
 function save(){const clean=name.trim().slice(0,40);if(!clean)return;persist([{name:clean,query},...items.filter(x=>x.name.toLowerCase()!==clean.toLowerCase())].slice(0,10));setName('');setEditing(false)}
 return <div className="saved-filters" aria-label="Saved venue filters">
  <Button type="button" variant="outline" onClick={()=>setEditing(v=>!v)}><Bookmark size={15}/>Save view</Button>
  {!!items.length&&<select aria-label="Open a saved filter" defaultValue="" onChange={e=>e.target.value&&window.location.assign('/venues?'+e.target.value)}><option value="" disabled>Saved views</option>{items.map(x=><option key={x.name} value={x.query}>{x.name}</option>)}</select>}
  {editing&&<div className="saved-filter-editor"><Input aria-label="Saved filter name" maxLength={40} placeholder="Example: Chennai badminton" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();save()}}}/><Button type="button" onClick={save} disabled={!name.trim()}>Save</Button></div>}
  {!!items.length&&<details className="saved-filter-manage"><summary>Manage</summary>{items.map(x=><button type="button" key={x.name} onClick={()=>persist(items.filter(y=>y.name!==x.name))} aria-label={'Delete saved view '+x.name}><Trash2 size={14}/>{x.name}</button>)}</details>}
 </div>;
}
