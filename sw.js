// sw.js
self.addEventListener('fetch', function(event) {
  // ネットワークからデータを取得する最小限の処理
  event.respondWith(
    fetch(event.request).catch(() => {
      // オフライン時のエラー回避用（空のレスポンスを返すなど）
      return new Response('Offline');
    })
  );
});