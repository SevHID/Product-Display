import { handleVideoClick } from './videoHandler.js';
import { openModal } from './modal.js';

export function renderProducts(products, containerSelector, append = false) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    if (!products || products.length === 0) {
        if (!append) {
            container.innerHTML = `<div class="empty-tip">😕 没有找到匹配的商品</div>`;
        }
        return;
    }

    let html = '';
    products.forEach((p, index) => {
        const videoHtml = p.video
            ? `<button class="video-btn" data-video="${p.video}">观看介绍视频</button>`
            : `<span class="no-video">暂无视频</span>`;
        const categoryHtml = p.category ? `<span class="category-tag">${p.category}</span>` : '';
        html += `
            <div class="product-card" data-index="${index}" data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
                <img src="${p.image || 'https://via.placeholder.com/400x200?text=无图片'}"
                     alt="${p.name}"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x200?text=图片加载失败'; this.onerror=null;">
                <div class="info">
                    <div class="name">${p.name}</div>
                    ${categoryHtml}
                    <div class="desc">${p.description || '暂无简介'}</div>
                    ${videoHtml}
                </div>
            </div>
        `;
    });

    if (append) {
        container.insertAdjacentHTML('beforeend', html);
    } else {
        container.innerHTML = html;
    }

    // 绑定视频按钮事件
    container.querySelectorAll('.video-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止冒泡，避免触发卡片弹窗
            const url = e.currentTarget.dataset.video;
            if (url) handleVideoClick(url);
        });
    });

    // 绑定卡片点击事件（打开弹窗）
    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', function() {
            const productData = this.dataset.product;
            if (productData) {
                try {
                    const product = JSON.parse(productData);
                    openModal(product);
                } catch (e) {
                    console.warn('解析商品数据失败', e);
                }
            }
        });
    });
}