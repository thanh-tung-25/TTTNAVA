import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:'chinese-simple-learning.spec.js',workers:1,timeout:30000,
 outputDir:'test-results/chinese-simple',reporter:'list',use:{headless:true},
 projects:[
  {name:'mobile-360',use:{viewport:{width:360,height:800}}},
  {name:'mobile-390',use:{viewport:{width:390,height:844}}},
  {name:'desktop',use:{viewport:{width:1366,height:900}}},
 ],
});
