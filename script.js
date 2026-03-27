// ★重要：機材検索アプリと全く同じ名前にすることでデータを共有
const CACHE_KEY = 'equipment_data_shared_cache'; 
const GAS_URL = "https://script.google.com/macros/s/AKfycby0faWengFZ9TdfnX3LX7JBCbGEy5A1Pw4308MJSWISOLDU2d8vjJcQwmOCoOHBwji7Sg/exec";

let rawData = [], selectedItems = {};

const el = id => document.getElementById(id);
const categoryFilter = el('categoryFilter');
const searchInput = el('searchInput');
const suggestion = el('searchSuggestion');
const selectedList = el('selectedList');
const loadingOverlay = el('loadingOverlay');

// データ読み込み（爆速キャッシュ対応）
async function loadData() {
    // 1. まずキャッシュをチェック（機材検索アプリが保存したデータもここで拾える）
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
        processRawData(JSON.parse(cachedData));
        loadingOverlay.style.display = 'none'; // キャッシュがあれば即表示
        console.log("Shared cache loaded: Instant display");
    } else {
        loadingOverlay.style.display = 'flex';
    }

    // 2. 裏側で最新データを取得（バックグラウンド更新）
    try {
        const res = await fetch(GAS_URL);
        const newData = await res.json();
        
        // 取得したデータがキャッシュと異なる場合のみ更新
        if (JSON.stringify(newData) !== cachedData) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
            processRawData(newData);
            console.log("Data updated and synchronized");
        }
    } catch (e) {
        console.error("Sync error:", e);
        if (!cachedData) alert("初回起動にはネット接続が必要です");
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// データの整形（カラム名の揺れを吸収）
function processRawData(data) {
    rawData = data.map(r => ({
        // 機材検索側の「機材コード」と重量計算側の「機材ＣＤ」の両方に対応
        code: r['機材コード'] || r['機材ＣＤ'] || r['code'] || '',
        name: r['機材名'] || r['name'] || '',
        weight: parseFloat(r['単品重量（kg)'] || r['単品重量（kg）'] || r['weight'] || 0),
        category: r['区分'] || r['category'] || ''
    }));
    
    // カテゴリセレクトボックスの生成・更新
    const currentVal = categoryFilter.value;
    const categories = [...new Set(rawData.map(r => r.category).filter(c => c))].sort();
    
    categoryFilter.innerHTML = '<option value="">すべてのカテゴリ</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        categoryFilter.appendChild(opt);
    });
    categoryFilter.value = currentVal;

    renderSelected();
}

// --- 以下、計算およびUIロジック（変更なし） ---

function renderSuggestion(results) {
    suggestion.innerHTML = '';
    if (!results.length) {
        suggestion.innerHTML = '<div class="p-2 text-gray-500 text-sm">該当なし</div>';
        suggestion.style.display = 'block';
        return;
    }
    results.forEach(r => {
        const div = document.createElement('div');
        div.className = 'p-3 rounded cursor-pointer flex justify-between hover-gradient bg-white border-b';
        div.innerHTML = `<span class="font-semibold text-sm" style="color: rgb(161,193,44);">${r.code}</span> 
                         <span class="text-sm" style="color: rgb(44,161,193);">${r.name}</span>`;
        
        div.addEventListener('mousedown', e => {
            e.preventDefault();
            if (selectedItems[r.code]) return;
            selectedItems[r.code] = { ...r, qty: 0 };
            renderSelected();
            suggestion.style.display = 'none';
            focusInput(r.code);
        });
        suggestion.appendChild(div);
    });
    suggestion.style.display = 'block';
}

function focusInput(code) {
    const input = el(`input-${code}`);
    if (!input) return;
    input.focus({ preventScroll: true });
    
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && window.visualViewport) {
        setTimeout(() => {
            const vv = window.visualViewport;
            const container = selectedList;
            const inputRect = input.getBoundingClientRect();
            const offsetTop = container.scrollTop + inputRect.top - container.getBoundingClientRect().top;
            const scrollPos = offsetTop - (vv.height - inputRect.height) / 2;
            container.scrollTo({ top: scrollPos, behavior: 'smooth' });
        }, 300);
    }
}

function applySearch() {
    const kw = (searchInput.value || '').toLowerCase();
    const category = categoryFilter.value;
    const keywords = kw.split(/\s+/).filter(k => k);
    const results = rawData.filter(r => {
        if (category && r.category !== category) return false;
        if (!keywords.length) return true;
        return keywords.some(k => (r.code || '').toLowerCase().includes(k) || (r.name || '').toLowerCase().includes(k));
    });
    renderSuggestion(results);
}

searchInput.addEventListener('focus', applySearch);
searchInput.addEventListener('input', _.debounce(() => {
    if (searchInput.value.trim() !== '') applySearch();
}, 200));
categoryFilter.addEventListener('change', applySearch);
document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !suggestion.contains(e.target)) suggestion.style.display = 'none';
});

window.updateQty = (code, val) => {
    const n = parseInt(val);
    selectedItems[code].qty = (isNaN(n) || n < 1) ? 0 : n;
    updateTotal();
};

window.removeItem = (code) => {
    delete selectedItems[code];
    renderSelected();
};

function renderSelected() {
    const arr = Object.values(selectedItems);
    selectedList.innerHTML = '<div id="spacer" style="height: 120px;"></div>';
    
    if (!arr.length) {
        const div = document.createElement('div');
        div.className = 'text-gray-500 p-2 text-sm';
        div.textContent = '選択済み機材がありません';
        selectedList.prepend(div);
        setTotal(0);
        return;
    }

    arr.forEach(r => {
        const div = document.createElement('div');
        div.className = 'p-3 mb-2 flex justify-between items-center transition gradient-border hover-gradient bg-white shadow-sm';
        div.innerHTML = `
            <div>
                <div class="font-semibold" style="color: rgb(161,193,44);">${r.code}</div>
                <div style="color: rgb(44,161,193);">${r.name}</div>
                <div class="text-[10px] text-gray-400">単品重量: ${r.weight} kg</div>
            </div>
            <div class="flex items-center gap-2">
                <input type="number" inputmode="numeric" pattern="[0-9]*" value="${r.qty || ''}" 
                       class="w-14 border rounded px-1 py-1 text-right text-base" 
                       oninput="updateQty('${r.code}',this.value)" id="input-${r.code}">
                <span class="text-sm" style="color: rgb(161,193,44);">本</span>
                <button class="px-2 py-1 rounded text-white text-[10px]" style="background-color: rgb(250,102,115);" 
                        onclick="removeItem('${r.code}')">削除</button>
            </div>`;
        selectedList.prepend(div);
    });
    updateTotal();
}

function updateTotal() {
    const t = Object.values(selectedItems).reduce((sum, r) => sum + r.weight * r.qty, 0) / 1000;
    setTotal(t);
}

function setTotal(val) {
    const max = 20;
    const percent = Math.min((val / max) * 100, 100);
    el('totalWeight').textContent = val.toFixed(2);
    
    const meter = el('weightMeter');
    meter.style.width = percent + '%';
    
    const ratio = Math.min(val / max, 1);
    let r = ratio <= 0.5 ? Math.round(255 * (ratio / 0.5)) : 255;
    let g = ratio <= 0.5 ? 255 : Math.round(255 * ((1 - ratio) / 0.5));
    meter.style.backgroundColor = `rgb(${r},${g},0)`;
    
    el('weightMarker').style.left = `calc(${percent}% - 4px)`;
}

// 起動！
loadData();