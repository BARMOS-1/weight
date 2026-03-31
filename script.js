const CACHE_KEY = 'equipment_data_shared_cache'; 
const GAS_URL = "https://script.google.com/macros/s/AKfycby0faWengFZ9TdfnX3LX7JBCbGEy5A1Pw4308MJSWISOLDU2d8vjJcQwmOCoOHBwji7Sg/exec";

let rawData = [], selectedItems = {};

const el = id => document.getElementById(id);
const loadingOverlay = el('loadingOverlay');

async function loadData() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) { processRawData(JSON.parse(cachedData)); loadingOverlay.style.display = 'none'; } 
    else { loadingOverlay.style.display = 'flex'; }
    try {
        const res = await fetch(GAS_URL);
        const newData = await res.json();
        if (JSON.stringify(newData) !== cachedData) { localStorage.setItem(CACHE_KEY, JSON.stringify(newData)); processRawData(newData); }
    } catch (e) { console.error("Sync error:", e); } finally { loadingOverlay.style.display = 'none'; }
}

function processRawData(data) {
    rawData = data.map(r => ({
        code: r['機材コード'] || r['機材ＣＤ'] || r['code'] || '',
        name: r['機材名'] || r['name'] || '',
        weight: parseFloat(r['単品重量（kg)'] || r['単品重量（kg）'] || r['weight'] || 0),
        category: r['区分'] || r['category'] || ''
    }));
    const categoryFilter = el('categoryFilter');
    const categories = [...new Set(rawData.map(r => r.category).filter(c => c))].sort();
    categoryFilter.innerHTML = '<option value="">カテゴリ</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        categoryFilter.appendChild(opt);
    });
    renderSelected();
}

// script.js 内の renderSuggestion 関数を修正
function renderSuggestion(results) {
    const suggestion = el('searchSuggestion');
    const searchInput = el('searchInput');
    
    if (!suggestion) return; // 要素がない場合は中断
    
    suggestion.innerHTML = '';
    
    if (!results.length) {
        suggestion.innerHTML = '<div class="p-2 text-gray-500 text-xs text-center bg-white">該当なし</div>';
        suggestion.style.display = 'block';
        return;
    }

    results.forEach(r => {
        const div = document.createElement('div');
        // デザインを調整：1行をスッキリさせてタップしやすく
        div.className = 'p-3 rounded flex justify-between bg-white border-b hover:bg-gray-50 cursor-pointer active:bg-gray-100';
        div.innerHTML = `
            <span class="font-bold text-xs text-lime-600">${r.code}</span> 
            <span class="text-xs text-slate-700">${r.name}</span>
        `;
        
        // 選択した時の処理
        div.addEventListener('mousedown', e => {
            e.preventDefault();
            if (selectedItems[r.code]) {
                suggestion.style.display = 'none';
                return;
            }
            selectedItems[r.code] = { ...r, qty: 0 };
            renderSelected(); // リストを更新
            suggestion.style.display = 'none';
            searchInput.value = ''; // 入力欄をクリア
        });
        suggestion.appendChild(div);
    });
    suggestion.style.display = 'block';
}
function applySearch() {
    const searchInput = el('searchInput');
    const categoryFilter = el('categoryFilter');
    const kw = (searchInput.value || '').toLowerCase();
    const category = categoryFilter.value;
    const keywords = kw.split(/\s+/).filter(k => k);
    const results = rawData.filter(r => {
        if (category && r.category !== category) return false;
        if (!keywords.length) return true;
        return keywords.every(k => (r.code || '').toLowerCase().includes(k) || (r.name || '').toLowerCase().includes(k));
    });
    renderSuggestion(results);
}

// script.js の下の方にあるイベント設定
el('searchInput').addEventListener('focus', () => {
    applySearch(); // フォーカスした瞬間に現在の条件で検索実行
});

el('searchInput').addEventListener('input', _.debounce(() => {
    applySearch(); // 入力するたびに検索実行
}, 200));

// 画面の他の場所をタップしたら語群を閉じる
document.addEventListener('click', e => {
    const searchInput = el('searchInput');
    const suggestion = el('searchSuggestion');
    if (searchInput && suggestion && !searchInput.contains(e.target) && !suggestion.contains(e.target)) {
        suggestion.style.display = 'none';
    }
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
    const selectedList = el('selectedList');
    selectedList.innerHTML = '';
    
    if (!arr.length) {
        selectedList.innerHTML = '<div class="text-center py-10 text-white/50 text-xs border-2 border-dashed border-white/20 rounded-2xl font-bold">機材が選択されていません</div>';
        setTotal(0);
        return;
    }

   arr.forEach(r => {
        const div = document.createElement('div');
        div.className = 'p-2 flex justify-between items-center bg-white rounded-lg shadow-sm mb-1';
        
        div.innerHTML = `
            <div class="flex-1 min-w-0 pr-2 leading-tight">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-[9px] text-lime-600">${r.code}</span>
                    <span class="text-xs font-bold text-slate-700 truncate">${r.name}</span>
                </div>
                <div class="text-[9px] text-gray-400">単品: ${r.weight}kg</div>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                    <input type="number" inputmode="numeric" pattern="[0-9]*" value="${r.qty || ''}" 
                           class="w-20 border-2 border-gray-100 rounded-xl py-2 text-center text-base font-black shadow-sm focus:border-lime-500 outline-none" 
                           oninput="updateQty('${r.code}',this.value)" id="input-${r.code}">
                    <span class="text-xs text-gray-500 font-bold">本</span>
                </div>
                <button class="text-red-400 p-1 active:scale-90 transition-transform" onclick="removeItem('${r.code}')">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
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
    el('totalWeight').textContent = val.toFixed(2);
    const percent = Math.min((val / 20) * 100, 100);
    const meter = el('weightMeter');
    if (meter) {
        meter.style.width = percent + '%';
        const ratio = Math.min(val / 20, 1);
        let r = ratio <= 0.5 ? Math.round(255 * (ratio / 0.5)) : 255;
        let g = ratio <= 0.5 ? 255 : Math.round(255 * ((1 - ratio) / 0.5));
        meter.style.backgroundColor = `rgb(${r},${g},0)`;
    }
}



function handleInstallChoice(choice) {
    const confirmBox = document.getElementById('inline-confirm');
    confirmBox.style.maxHeight = "0";
    confirmBox.style.opacity = "0";
    if (choice) showGuide();
}

function showGuide() {
    const overlay = document.getElementById('guide-overlay');
    const guide = document.getElementById('ios-guide');
    overlay.style.display = 'block';
    guide.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = "1";
        guide.style.opacity = "1";
    }, 10);
}

function closeGuide() {
    const overlay = document.getElementById('guide-overlay');
    const guide = document.getElementById('ios-guide');
    overlay.style.opacity = "0";
    guide.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = 'none';
        guide.style.display = 'none';
    }, 300);
}

window.addEventListener('DOMContentLoaded', loadData);