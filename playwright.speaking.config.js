import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./e2e',testMatch:'chinese-speaking.spec.js',workers:1,timeout:60000,reporter:'list',
 use:{headless:true,viewport:{width:1280,height:950},permissions:['camera','microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}}
});
