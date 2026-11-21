import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['feedback.spec.js'],workers:1,timeout:45000,reporter:'list',use:{headless:true,viewport:{width:1440,height:1000}}});
