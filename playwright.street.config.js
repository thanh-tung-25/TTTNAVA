import {defineConfig} from '@playwright/test';
const origin='http://localhost:'+(process.env.STREET_UI_PORT||'3024');
export default defineConfig({testDir:'./e2e',testMatch:'chinese-street.spec.js',workers:1,timeout:30000,outputDir:'test-results/street',reporter:'list',use:{baseURL:origin,headless:true,viewport:{width:1280,height:900}},webServer:{command:'node backend/src/server.js',url:origin+'/api/v1/health',reuseExistingServer:true,env:{PORT:process.env.STREET_UI_PORT||'3024',APP_ORIGIN:origin}}});
