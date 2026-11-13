import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'admin-access-history.spec.js',workers:1,timeout:30000,outputDir:'test-results/access-history',reporter:'list',use:{headless:true,viewport:{width:1440,height:1000}}});
