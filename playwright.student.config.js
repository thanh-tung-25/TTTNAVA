import { defineConfig } from '@playwright/test';
const origin='http://localhost:'+(process.env.STUDENT_UI_PORT||'3000');

// Isolated UI regressions: API stubs avoid changing the local database.
export default defineConfig({
 testDir:'./e2e',testMatch:'student-appearance.spec.js',workers:1,timeout:30000,
 outputDir:'test-results/student-regressions',reporter:'list',
 use:{baseURL:origin,headless:true},
 projects:[
  {name:'desktop',use:{viewport:{width:1440,height:900}}},
  {name:'mobile',use:{viewport:{width:360,height:800}}},
 ],
 webServer:{command:'node backend/src/server.js',url:origin+'/api/v1/health',reuseExistingServer:true,env:{PORT:process.env.STUDENT_UI_PORT||'3000',APP_ORIGIN:origin}},
});
