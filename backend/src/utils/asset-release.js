// Keep HTML entry modules and their imports on the same deployed release.
export function releaseAsset(url,release){
 if(!release||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url))return url;
 const hashAt=url.indexOf('#'),fragment=hashAt<0?'':url.slice(hashAt),target=hashAt<0?url:url.slice(0,hashAt);
 const queryAt=target.indexOf('?'),file=queryAt<0?target:target.slice(0,queryAt);
 if(!/\.(?:js|css)$/i.test(file))return url;
 const params=new URLSearchParams(queryAt<0?'':target.slice(queryAt+1));
 params.set('release',release);
 return file+'?'+params.toString()+fragment;
}

export function releaseModuleImports(source,release){
 return source.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(["'])(\.{1,2}\/[^"']+|\/assets\/[^"']+)\2/g,
  (_match,prefix,quote,url)=>prefix+quote+releaseAsset(url,release)+quote);
}
