import {env} from 'cloudflare:workers';
/** Server-only runtime bindings. Never inline credentials into client bundles. */
export function supabaseConfig(){
 const bindings=env as unknown as Record<string,string|undefined>;
 const url=bindings.SUPABASE_URL||process.env.SUPABASE_URL;
 const key=bindings.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Database connection is not configured');
 return {url,key};
}
