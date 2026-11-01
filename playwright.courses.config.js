import {defineConfig} from '@playwright/test';
process.env.DB_NAME='kids_learning_test';
process.env.COURSE_E2E='1';
const origin='http://localhost:3110';
export default defineConfig({
 testDir:'./e2e',testMatch:'courses.spec.js',workers:1,timeout:60000,
 outputDir:'test-results/courses',reporter:'list',
 use:{baseURL:origin,headless:true,screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'mobile',use:{viewport:{width:360,height:820}}}],
 webServer:{command:'node backend/src/server.js',url:origin+'/api/v1/health',reuseExistingServer:false,env:{PORT:'3110',APP_ORIGIN:origin,DB_NAME:'kids_learning_test'}},
});
