let currentProduct = null;

const overlay = document.getElementById('modal-overlay');
const closeBtn = document.getElementById('modal-close');
const modalImage = document.getElementById('modal-image');
const modalName = document.getElementById('modal-name');
const modalCategory = document.getElementById('modal-category');
const modalDescription = document.getElementById('modal-description');
const modalVideo = document.getElementById('modal-video');

const verificationArea = document.getElementById('verification-area');
const verificationInput = document.getElementById('verification-input');
const verificationBtn = document.getElementById('verification-btn');
const verificationClearBtn = document.getElementById('verification-clear-btn');
const verificationResult = document.getElementById('verification-result');
const verifyHistory = document.getElementById('verify-history');
const historyList = document.getElementById('history-list');

// ========== Cloudflare Worker 配置 ==========
// ⚠️ 替换为你的 Worker 地址（部署后获得）
const WORKER_URL = 'https://verify-log-writer.shikurei77.workers.dev/';
// ============================================

// ========== 弹窗控制 ==========
export function openModal(product) {
    currentProduct = product;

    if (modalImage) modalImage.src = product.image || 'https://via.placeholder.com/600x280?text=无图片';
    if (modalImage) modalImage.alt = product.name;
    if (modalName) modalName.textContent = product.name;
    if (modalCategory) modalCategory.textContent = product.category || '未分类';
    if (modalDescription) modalDescription.textContent = product.description || '暂无介绍';

    if (modalVideo) {
        if (product.video) {
            modalVideo.href = product.video;
            modalVideo.style.display = 'inline-flex';
        } else {
            modalVideo.style.display = 'none';
        }
    }

    const hasAntiFake = product.antiFakeCodes && product.antiFakeCodes.length > 0;
    if (verificationArea) {
        if (hasAntiFake) {
            verificationArea.style.display = 'block';
            if (verificationInput) {
                verificationInput.value = '';
                verificationInput.placeholder = '请输入防伪码';
            }
            if (verificationResult) {
                verificationResult.textContent = '';
                verificationResult.style.color = '';
            }
            if (verifyHistory) verifyHistory.style.display = 'none';
        } else {
            verificationArea.style.display = 'none';
        }
    }

    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeModal() {
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    currentProduct = null;
}

// ========== 工具函数 ==========
function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getTimeStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

function isTodayRecorded(code) {
    const key = `verify_today_${code}`;
    const today = getTodayKey();
    const stored = localStorage.getItem(key);
    return stored === today;
}

function markTodayRecorded(code) {
    const key = `verify_today_${code}`;
    localStorage.setItem(key, getTodayKey());
}

// ========== 通过 Worker 读取所有验证记录 ==========
async function fetchAllVerifyLogs() {
    try {
        const response = await fetch(WORKER_URL);
        if (!response.ok) {
            if (response.status === 404) return [];
            console.warn('读取记录失败:', response.status);
            return [];
        }
        const content = await response.text();
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const records = lines.map(line => {
            const match = line.match(/^\[(.*?)\]\s+(.*?)\s+\|\s+(.*)$/);
            if (match) {
                return {
                    time: match[1],
                    code: match[2].trim(),
                    product: match[3].trim()
                };
            }
            return null;
        }).filter(r => r !== null);
        return records;
    } catch (err) {
        console.warn('读取记录异常:', err);
        return [];
    }
}

// ========== 展示历史记录（最早1条 + 最近3条） ==========
function renderHistory(records, targetCode) {
    if (!historyList || !verifyHistory) return;

    const filtered = records.filter(r => r.code === targetCode);

    if (filtered.length === 0) {
        verifyHistory.style.display = 'none';
        return;
    }

    const sorted = filtered.sort((a, b) => a.time.localeCompare(b.time));
    const earliest = sorted[0];
    const latest = sorted.slice(-3).reverse();

    let html = '';
    html += `<div style="color:var(--text-muted); font-size:12px; margin-bottom:4px;">🕐 首次查询：${earliest.time}</div>`;

    if (latest.length > 0) {
        html += `<div style="margin-top:4px; font-size:13px;">`;
        latest.forEach((record, index) => {
            const isNewest = index === 0;
            const prefix = isNewest ? '🆕 最近' : '   ';
            html += `<div>${prefix} ${record.time}</div>`;
        });
        html += `</div>`;
        if (sorted.length > 4) {
            html += `<div style="color:var(--text-muted); font-size:11px; margin-top:2px;">📊 共 ${sorted.length} 次查询记录</div>`;
        }
    }

    historyList.innerHTML = html;
    verifyHistory.style.display = 'block';
}

// ========== 通过 Worker 写入记录（每日首次） ==========
async function writeVerifyLog(code, productName) {
    if (isTodayRecorded(code)) {
        console.log(`ℹ️ 防伪码 ${code} 今日已记录，跳过写入`);
        return;
    }

    const timeStr = getTimeStr();

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                time: timeStr,
                product: productName || '未知商品'
            })
        });

        const result = await response.json();
        if (response.ok && result.success) {
            markTodayRecorded(code);
            console.log(`✅ 验证记录已写入: ${code} at ${timeStr}`);
        } else {
            console.warn('⚠️ 写入失败:', result.error || '未知错误');
        }
    } catch (err) {
        console.warn('⚠️ 记录写入异常（不影响验证）:', err);
    }
}

// ========== 验证逻辑 ==========
function verifyAntiFake() {
    if (!currentProduct || !verificationInput || !verificationResult) {
        console.warn('验证失败：当前商品为空或 DOM 元素缺失');
        return;
    }

    const inputCode = verificationInput.value.trim();
    if (inputCode === '') {
        verificationResult.textContent = '⚠️ 请输入防伪码';
        verificationResult.style.color = '#ff9800';
        return;
    }

    const codes = currentProduct.antiFakeCodes || [];
    const matched = codes.some(code => code === inputCode);

    if (matched) {
        verificationResult.textContent = '✅ 验证通过，该商品为正品！';
        verificationResult.style.color = '#22c55e';

        // 1. 写入记录（通过 Worker）
        writeVerifyLog(inputCode, currentProduct.name);

        // 2. 读取并展示历史记录（通过 Worker）
        fetchAllVerifyLogs().then(records => {
            renderHistory(records, inputCode);
        });
    } else {
        verificationResult.textContent = '❌ 防伪码错误，请确认渠道！';
        verificationResult.style.color = '#ef4444';
        if (verifyHistory) verifyHistory.style.display = 'none';
    }
}

function clearVerification() {
    if (verificationInput) verificationInput.value = '';
    if (verificationResult) {
        verificationResult.textContent = '';
        verificationResult.style.color = '';
    }
    if (verifyHistory) verifyHistory.style.display = 'none';
}

// ========== 绑定事件 ==========
export function bindModalEvents() {
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    if (document) document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
    if (verificationBtn) verificationBtn.addEventListener('click', verifyAntiFake);
    if (verificationClearBtn) verificationClearBtn.addEventListener('click', clearVerification);
    if (verificationInput) verificationInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') verifyAntiFake();
    });
}
