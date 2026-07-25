const overlay = document.getElementById('modal-overlay');
const closeBtn = document.getElementById('modal-close');
const modalImage = document.getElementById('modal-image');
const modalName = document.getElementById('modal-name');
const modalCategory = document.getElementById('modal-category');
const modalDescription = document.getElementById('modal-description');
const modalVideo = document.getElementById('modal-video');

// 打开弹窗
export function openModal(product) {
    modalImage.src = product.image || 'https://via.placeholder.com/600x280?text=无图片';
    modalImage.alt = product.name;
    modalName.textContent = product.name;
    modalCategory.textContent = product.category || '未分类';
    modalDescription.textContent = product.description || '暂无介绍';
    if (product.video) {
        modalVideo.href = product.video;
        modalVideo.style.display = 'inline-flex';
    } else {
        modalVideo.style.display = 'none';
    }
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 关闭弹窗
export function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// 绑定全局事件
export function bindModalEvents() {
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}