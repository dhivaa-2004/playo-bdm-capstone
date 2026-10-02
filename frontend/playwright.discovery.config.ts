import {defineConfig} from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
 ...base,
 testMatch:'venue-discovery.spec.ts',
 use:{...base.use,baseURL:'http://127.0.0.1:5173'},
 webServer:{
  command:'pnpm dev --host 127.0.0.1',
  url:'http://127.0.0.1:5173',
  reuseExistingServer:!process.env.CI,
  timeout:120_000
 }
});
