import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['worksheet-exams.spec.js'],workers:1,timeout:45000,reporter:'list',use:{headless:true,viewport:{width:1280,height:900}}});
