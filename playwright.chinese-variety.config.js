import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['chinese-content-variety.spec.js','chinese-vocabulary-parity.spec.js'],workers:1,timeout:30000,outputDir:'test-results/chinese-variety',reporter:'list',use:{headless:true,viewport:{width:390,height:844}}});
