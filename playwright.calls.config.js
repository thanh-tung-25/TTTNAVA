import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:['chat-calls.spec.js','chat-widget.spec.js'],workers:1,timeout:60000,reporter:'list',
 outputDir:'test-results/chat-calls',
 use:{headless:true,viewport:{width:390,height:844},launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},
});
