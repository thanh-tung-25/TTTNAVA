import { defineConfig } from '@playwright/test';
const port=process.env.DELETION_UI_PORT||'3123',origin='http://localhost:'+port;
export default defineConfig({
 testDir:'./e2e',testMatch:'deletion.spec.js',workers:1,timeout:30000,
 outputDir:'test-results/deletion',reporter:'list',
 use:{baseURL:origin,headless:true,screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'mobile',use:{viewport:{width:360,height:820}}}],
 webServer:{command:'node backend/src/server.js',url:origin+'/api/v1/health',reuseExistingServer:false,env:{PORT:port,APP_ORIGIN:origin}},
});
