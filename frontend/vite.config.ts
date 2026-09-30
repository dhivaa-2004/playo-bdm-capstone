import vinext from 'vinext';
import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';
// Standalone Cloudflare build. No Sites runtime, connector, or ChatGPT account.
export default defineConfig({
 plugins:[vinext(),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false})],
 server:{host:'0.0.0.0',allowedHosts:['terminal.local']}
});
