import Observatory from '../observatory';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{route:string[]}>}){
 const {route}=await params;
 const allowed=['venues','sports','cities','analytics','predictions','models','data-quality','quality','data-management','workspace','admin'];
 if(!(route.length===1&&allowed.includes(route[0]))&&!(route.length===2&&route[0]==='venues'&&/^[0-9a-f-]{36}$/i.test(route[1])))notFound();
 return <Observatory/>;
}
