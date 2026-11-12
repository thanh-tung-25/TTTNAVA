import {defineConfig} from '@playwright/test';

// Isolated frontend checks: serve real assets and mock published lesson API data.
export default defineConfig({
 testDir:'./e2e',testMatch:['chinese-applied-practice.spec.js','chinese-question-prompt.spec.js','chinese-vocabulary-parity.spec.js','chinese-speaking.spec.js','chinese-admin-speaking.spec.js','chat-widget.spec.js','learning-support.spec.js','study-hub.spec.js'],workers:1,
 timeout:60000,reporter:'list',use:{headless:true,viewport:{width:1280,height:800}},
});
