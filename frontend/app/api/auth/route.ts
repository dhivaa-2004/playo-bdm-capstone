import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({user:null},{headers:{'Cache-Control':'no-store'}})}
export async function POST(){const response=NextResponse.json({error:'Website sign-in has been removed. Open the dashboard directly.'},{status:410});response.cookies.delete('playo_access');return response;}
