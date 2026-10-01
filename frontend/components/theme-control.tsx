'use client';

import {useEffect,useSyncExternalStore} from 'react';
import {Clock3,Moon,Sun} from 'lucide-react';
import {isThemeMode,nextAutomaticThemeBoundary,resolveTheme,THEME_STORAGE_KEY,type ResolvedTheme,type ThemeMode} from '@/lib/theme';

const options=[
  {mode:'auto' as const,label:'Auto',Icon:Clock3,title:'Automatic: light 6 AM–6 PM, dark 6 PM–6 AM'},
  {mode:'light' as const,label:'Light',Icon:Sun,title:'Always use light theme'},
  {mode:'dark' as const,label:'Dark',Icon:Moon,title:'Always use dark theme'},
];

function applyTheme(mode:ThemeMode):ResolvedTheme{
 const resolved=resolveTheme(mode);
 const root=document.documentElement;
 root.dataset.theme=resolved;
 root.dataset.themeMode=mode;
 root.classList.toggle('dark',resolved==='dark');
 root.style.colorScheme=resolved;
 window.dispatchEvent(new CustomEvent('playo-theme-change',{detail:{mode,resolved}}));
 return resolved;
}

function subscribeTheme(callback:()=>void){
 const changed=()=>callback();
 window.addEventListener('playo-theme-change',changed);
 window.addEventListener('storage',changed);
 return()=>{window.removeEventListener('playo-theme-change',changed);window.removeEventListener('storage',changed)};
}

function currentMode():ThemeMode{
 const value=document.documentElement.dataset.themeMode;
 return isThemeMode(value)?value:'auto';
}

function currentTheme():ResolvedTheme{
 return document.documentElement.dataset.theme==='dark'?'dark':'light';
}

export default function ThemeControl(){
 const mode=useSyncExternalStore(subscribeTheme,currentMode,()=> 'auto');
 const resolved=useSyncExternalStore(subscribeTheme,currentTheme,()=> 'light');

 useEffect(()=>{
  if(mode!=='auto')return;
  let timer:ReturnType<typeof setTimeout>;
  function scheduleNext(){
   const now=new Date();
   const delay=Math.max(1000,nextAutomaticThemeBoundary(now).getTime()-now.getTime()+1000);
   timer=setTimeout(()=>{applyTheme('auto');scheduleNext()},delay);
  }
  scheduleNext();
  return()=>clearTimeout(timer);
 },[mode]);

 function choose(selected:ThemeMode){
  window.localStorage.setItem(THEME_STORAGE_KEY,selected);
  applyTheme(selected);
 }

 return <div className="theme-switcher" role="group" aria-label={`Colour theme. Current appearance: ${resolved}`}>
  {options.map(({mode:option,label,Icon,title})=><button key={option} type="button" className="theme-option" aria-pressed={mode===option} onClick={()=>choose(option)} title={title}>
   <Icon size={15} aria-hidden="true"/><span>{label}</span>
  </button>)}
 </div>;
}
