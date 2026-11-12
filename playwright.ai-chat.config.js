import {defineConfig} from '@playwright/test';
const origin='http://localhost:'+(process.env.AI_CHAT_UI_PORT||'3021');
export default defineConfig({testDir:'./e2e',testMatch:'chinese-ai-chat.spec.js',workers:1,timeout:30000,outputDir:'test-results/ai-chat',reporter:'list',use:{baseURL:origin,headless:true,permissions:['microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},webServer:{command:'node backend/src/server.js',url:origin+'/api/v1/health',reuseExistingServer:true,env:{PORT:process.env.AI_CHAT_UI_PORT||'3021',APP_ORIGIN:origin}}});
