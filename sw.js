// ...既存の関数（loadData, processRawDataなど）はそのまま...

window.addEventListener('DOMContentLoaded', () => {
    // データの読み込み開始
    loadData();

    // --- ホーム画面追加バナーの制御 ---
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const confirmBox = document.getElementById('inline-confirm');

    if (!isStandalone) {
        if (isiOS) {
            // iOSの場合は即座に表示
            confirmBox.style.maxHeight = "200px";
            confirmBox.style.opacity = "1";
        }
        // Androidの場合は、既存の 'beforeinstallprompt' イベントが発火した時に表示される（今のコードでOK）
    }
});

// 既存の beforeinstallprompt イベント（Android用）
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const confirmBox = document.getElementById('inline-confirm');
    if (confirmBox) {
        confirmBox.style.maxHeight = "200px";
        confirmBox.style.opacity = "1";
    }
});