import {readFile} from 'node:fs/promises';

const metadata=`
<link rel="manifest" href="/manifest.webmanifest" data-ttnava-app="true">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/icons/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">
<meta name="application-name" content="TTNAVA">
<meta name="apple-mobile-web-app-title" content="TTNAVA">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#815cc5">
`;
export function appHtml(html){
 if(html.includes('data-ttnava-app="true"'))return html;
 const clean=html.replace(/<link\b(?=[^>]*\brel\s*=\s*["'](?:shortcut\s+)?icon["'])[^>]*>/gi,'');
 return clean.replace(/<\/head\s*>/i,metadata+'</head>');
}
export async function sendAppHtml(response,file){
 const html=await readFile(file,'utf8');response.type('html').send(appHtml(html));
}
