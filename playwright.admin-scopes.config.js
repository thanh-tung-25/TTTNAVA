import { defineConfig } from '@playwright/test';
const port=process.env.ADMIN_UI_PORT||'3016', origin='http://localhost:'+port;
export default defineConfig({
 testDir:'./e2e',testMatch:'admin-scopes.spec.js',workers:1,timeout:30000,
 outputDir:'test-results/admin-scopes',reporter:'list',use:{baseURL:origin,headless:true},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'mobile',use:{viewport:{width:360,height:800}}}],
 webServer:{command:'node backend/src/server.js',url:origin+'/api/v1/health',reuseExistingServer:true,env:{PORT:port,APP_ORIGIN:origin}},
});
