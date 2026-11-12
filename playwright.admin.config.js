import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:['admin-scopes.spec.js','chinese-admin-layout.spec.js','chinese-enrollment-review.spec.js'],workers:1,timeout:45000,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4193',headless:true,viewport:{width:1440,height:950}},
 projects:[{name:'desktop-admin'},{name:'mobile-admin',testMatch:['admin-scopes.spec.js','chinese-enrollment-review.spec.js'],use:{viewport:{width:390,height:844}}}],
 globalSetup:'./e2e/serve-frontend.mjs',
});
