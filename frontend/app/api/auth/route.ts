import {supabaseConfig} from '@/lib/supabase-config';
import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){const token=req.cookies.get('playo_access')?.value;if(!token)return NextResponse.json({user:null});try{
 const r=await fetch(supabaseConfig().url+'/auth/v1/user',{headers:{apikey:supabaseConfig().key,Authorization:'Bearer '+token},cache:'no-store'});const u:any=await r.json();let admin=false;if(r.ok){const a=await fetch(supabaseConfig().url+'/rest/v1/rpc/is_admin',{method:'POST',headers:{apikey:supabaseConfig().key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',cache:'no-store'});admin=a.ok&&await a.json()===true;}return NextResponse.json({user:r.ok?{email:u.email,id:u.id,is_admin:admin}:null},{headers:{'Cache-Control':'no-store'}});
}catch{return NextResponse.json({user:null,error:'Session could not be verified'},{status:503});}}
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 try{const b:any=await req.json();if(b.action==='logout'){const token=req.cookies.get('playo_access')?.value;if(token)await fetch(supabaseConfig().url+'/auth/v1/logout',{method:'POST',headers:{apikey:supabaseConfig().key,Authorization:'Bearer '+token}});const out=NextResponse.json({ok:true});out.cookies.set('playo_access','',{maxAge:0,path:'/'});return out;}
 if(!['login','signup'].includes(b.action)||typeof b.email!=='string'||typeof b.password!=='string'||b.password.length<8)return NextResponse.json({error:'Enter your email and a password of at least 8 characters.'},{status:400});
 const r=await fetch(supabaseConfig().url+'/auth/v1/'+(b.action==='signup'?'signup':'token?grant_type=password'),{method:'POST',headers:{apikey:supabaseConfig().key,'Content-Type':'application/json'},body:JSON.stringify({email:b.email,password:b.password})});const data:any=await r.json();
 if(!r.ok)return NextResponse.json({error:b.action==='login'?'Sign-in failed. Check your email, password and email confirmation.':'Account creation was not completed. Check your details or try again later.'},{status:400});
 const out=NextResponse.json({ok:true,message:data.access_token?'Signed in.':'Check your email to confirm your account before signing in.'});
 if(data.access_token)out.cookies.set('playo_access',data.access_token,{httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'strict',path:'/',maxAge:Math.min(data.expires_in||3600,3600)});return out;
 }catch{return NextResponse.json({error:'Authentication is temporarily unavailable.'},{status:503});}}
