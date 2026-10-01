import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./e2e',
 timeout:30_000,
 expect:{timeout:10_000},
 fullyParallel:true,
 forbidOnly:Boolean(process.env.CI),
 retries:process.env.CI?2:0,
 reporter:process.env.CI?'github':'list',
 use:{
  baseURL:process.env.PLAYO_BASE_URL||'https://playo-venue-observatory.dhivaa2004.workers.dev',
  trace:'on-first-retry',
  screenshot:'only-on-failure'
 },
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}]
});
