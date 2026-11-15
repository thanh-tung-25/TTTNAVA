import {defineConfig} from '@playwright/test';
process.env.DB_NAME='kids_learning_test';
const origin='http://localhost:3138';
export default defineConfig({testDir:'./e2e',testMatch:'study-rewards.spec.js',workers:1,timeout:120000,outputDir:'test-results/study-rewards',reporter:'list',use:{baseURL:origin,headless:true,permissions:['microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},projects:[{name:'desktop',use:{viewport:{width:1280,height:900}}},{name:'mobile',use:{viewport:{width:390,height:844}}}],webServer:{command:'node backend/src/server.js',url:origin+'/api/v1/health',reuseExistingServer:false,env:{PORT:'3138',APP_ORIGIN:origin,DB_NAME:'kids_learning_test'}}});
