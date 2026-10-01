import Observatory from '../observatory';
import {notFound} from 'next/navigation';
import {isAllowedPublicRoute} from '@/lib/public-routes';
export default async function Page({params}:{params:Promise<{route:string[]}>}){
 const {route}=await params;
 if(!isAllowedPublicRoute(route))notFound();
 return <Observatory/>;
}
