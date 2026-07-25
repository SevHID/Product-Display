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

    // 防伪验证区域
    if (verificationArea) {
        if (product.antiFakeCodes && product.antiFakeCodes.length > 0) {
            verificationArea.style.display = 'block';
            if (verificationInput) verificationInput.value = '';
            if (verificationResult) {
                verificationResult.textContent = '';
                verificationResult.style.color = '';
            }
            if (verificationInput) {
                const codeCount = product.antiFakeCodes.length;
                verificationInput.placeholder = codeCount > 1
                    ? `请输入防伪码（共 ${codeCount} 个有效码）`
                    : '请输入防伪码';
            }
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

function verifyAntiFake() {
    if (!currentProduct || !verificationInput || !verificationResult) return;

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
    } else {
        verificationResult.textContent = '❌ 防伪码错误，请确认渠道！';
        verificationResult.style.color = '#ef4444';
    }
}

function clearVerification() {
    if (verificationInput) verificationInput.value = '';
    if (verificationResult) {
        verificationResult.textContent = '';
        verificationResult.style.color = '';
    }
}

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