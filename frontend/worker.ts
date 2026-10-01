import handler from 'vinext/server/fetch-handler';

const contentSecurityPolicy=[
 "default-src 'self'",
 "base-uri 'self'",
 "object-src 'none'",
 "frame-ancestors 'none'",
 "form-action 'self'",
 "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
 "style-src 'self' 'unsafe-inline'",
 "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
 "font-src 'self' data:",
 "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
 "frame-src https://challenges.cloudflare.com",
 "worker-src 'self' blob:",
 "upgrade-insecure-requests",
].join('; ');

export default {
 async fetch(request:Request,env:any,ctx:ExecutionContext){
  const response=await handler.fetch(request,env,ctx),headers=new Headers(response.headers);
  headers.set('Content-Security-Policy',contentSecurityPolicy);
  headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains; preload');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('X-Frame-Options','DENY');
  headers.set('Cross-Origin-Opener-Policy','same-origin-allow-popups');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
};
