import {env} from 'cloudflare:workers';

type TurnstileResult={success:boolean;hostname?:string;action?:string;'error-codes'?:string[]};

function bindings(){
 const runtime=env as unknown as Record<string,string|undefined>;
 return {
  siteKey:runtime.TURNSTILE_SITE_KEY||process.env.TURNSTILE_SITE_KEY,
  secretKey:runtime.TURNSTILE_SECRET_KEY||process.env.TURNSTILE_SECRET_KEY,
 };
}

export function turnstileSiteKey(){
 const {siteKey}=bindings();
 if(!siteKey)throw new Error('Bot protection is not configured');
 return siteKey;
}

export async function verifyTurnstile(token:string,remoteIp:string|undefined,expectedHostname:string){
 const {secretKey}=bindings();
 if(!secretKey)return {success:false,error:'Bot protection is not configured.'};
 if(!token||token.length>2048)return {success:false,error:'Complete the verification challenge.'};
 try{
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({secret:secretKey,response:token,remoteip:remoteIp,idempotency_key:crypto.randomUUID()}),
  });
  const result=await response.json() as TurnstileResult;
  if(!response.ok||!result.success)return {success:false,error:'Verification failed. Refresh the challenge and try again.',codes:result['error-codes']||[]};
  if(result.hostname&&result.hostname!==expectedHostname&&expectedHostname!=='localhost')return {success:false,error:'Verification hostname did not match.'};
  return {success:true};
 }catch{
  return {success:false,error:'Verification service is temporarily unavailable.'};
 }
}
