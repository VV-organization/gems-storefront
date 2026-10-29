import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',workers:1,timeout:45000,use:{baseURL:'http://127.0.0.1:5203',channel:process.env.CI?undefined:'chrome',reducedMotion:'reduce',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:[
  {command:'node e2e/fixtures/server.mjs',url:'http://127.0.0.1:5204/health/live',reuseExistingServer:false,timeout:30000},
  {command:'npx next start --hostname 127.0.0.1 --port 5203',env:{GEMS_BACKEND_ORIGIN:'http://127.0.0.1:5204'},url:'http://127.0.0.1:5203',reuseExistingServer:false,timeout:30000},
 ],
});
