'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';

declare global{interface Window{turnstile?:{render:(el:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void}}}

function subscribeTheme(callback:()=>void){const changed=()=>callback();window.addEventListener('playo-theme-change',changed);return()=>window.removeEventListener('playo-theme-change',changed)}
function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark' as const:'light' as const}

export default function TurnstileWidget({siteKey,action,onToken,resetKey=0}:{siteKey:string;action:string;onToken:(token:string)=>void;resetKey?:number}){
 const element=useRef<HTMLDivElement>(null);const [error,setError]=useState('');const theme=useSyncExternalStore(subscribeTheme,currentTheme,()=> 'light' as const);
 useEffect(()=>{let widget='';let cancelled=false;
  const render=()=>{if(cancelled||!element.current||!window.turnstile)return;try{widget=window.turnstile.render(element.current,{sitekey:siteKey,action,theme,callback:(token:string)=>{setError('');onToken(token)},'expired-callback':()=>onToken(''),'error-callback':()=>{onToken('');setError('Verification could not load. Please retry.')}})}catch{setError('Verification could not load. Please retry.')}};
  const existing=document.querySelector<HTMLScriptElement>('script[data-playo-turnstile]');
  if(window.turnstile)render();else if(existing)existing.addEventListener('load',render,{once:true});else{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.playoTurnstile='true';script.addEventListener('load',render,{once:true});script.addEventListener('error',()=>setError('Verification service is unavailable.'),{once:true});document.head.appendChild(script)}
  return()=>{cancelled=true;if(widget&&window.turnstile)window.turnstile.remove(widget)};
 },[siteKey,action,resetKey,onToken,theme]);
 return <div className="turnstile-block"><div ref={element}/>{error&&<p role="alert">{error}</p>}</div>;
}
