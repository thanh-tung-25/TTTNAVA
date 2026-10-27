const PROVIDER_MODULES = [
  './math-grade-1a.js',
  './math-grade-1b.js',
  './math-grade-2.js',
  './math-grade-3.js',
  './math-grade-4.js',
  './math-grade-5a.js',
  './math-grade-5b.js',
  './vietnamese-grade-1.js',
  './vietnamese-grade-2.js',
  './vietnamese-grade-3.js',
  './vietnamese-grade-4.js',
  './vietnamese-grade-5.js',
  './english-grade-1.js',
  './english-grade-2.js',
  './english-grade-3.js',
  './english-grade-4.js',
  './english-grade-5.js',
];

/**
 * Gộp mọi module nội dung thành một bản đồ topicId -> provider.
 * Báo lỗi rõ ràng nếu thiếu file hoặc hai module cùng khai báo một chủ đề.
 */
export async function loadProviders({ allowMissing = false } = {}) {
  const providers = new Map();
  const missing = [];
  for (const modulePath of PROVIDER_MODULES) {
    let loaded;
    try {
      loaded = await import(modulePath);
    } catch (error) {
      if (allowMissing && error.code === 'ERR_MODULE_NOT_FOUND') {
        missing.push(modulePath);
        continue;
      }
      throw new Error(`Không nạp được ${modulePath}: ${error.message}`);
    }
    for (const [exportName, value] of Object.entries(loaded)) {
      if (!exportName.endsWith('_GRADE_') && !/_(GRADE_\d+[A-Z]?)$/.test(exportName)) continue;
      if (!value || typeof value !== 'object') continue;
      for (const [topicId, provider] of Object.entries(value)) {
        if (providers.has(topicId)) {
          throw new Error(`Chủ đề ${topicId} được khai báo hai lần (${modulePath})`);
        }
        providers.set(topicId, provider);
      }
    }
  }
  return providers;
}
