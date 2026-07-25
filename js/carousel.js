// 轮播模块：渲染并控制自动播放
let timer = null;

export function initCarousel(images, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    if (!images || images.length === 0) {
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#868e96;">暂无轮播图片</div>`;
        return;
    }

    // 生成 HTML
    let slidesHtml = images.map(img => `<img src="${img}" alt="轮播图片" loading="lazy">`).join('');
    const indicatorsHtml = images.map((_, i) => `<span class="${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');

    container.innerHTML = `
        <div class="carousel-slide" style="transform: translateX(0);">
            ${slidesHtml}
        </div>
        <button class="carousel-btn left" id="carousel-left">‹</button>
        <button class="carousel-btn right" id="carousel-right">›</button>
        <div class="carousel-indicators">${indicatorsHtml}</div>
    `;

    const slide = container.querySelector('.carousel-slide');
    const indicators = container.querySelectorAll('.carousel-indicators span');
    let current = 0;
    const total = images.length;

    // 切换函数
    function goTo(index) {
        if (index < 0) index = total - 1;
        if (index >= total) index = 0;
        current = index;
        slide.style.transform = `translateX(-${current * 100}%)`;
        indicators.forEach((dot, i) => dot.classList.toggle('active', i === current));
    }

    // 事件绑定
    container.querySelector('#carousel-left').addEventListener('click', () => {
        goTo(current - 1);
        resetTimer();
    });
    container.querySelector('#carousel-right').addEventListener('click', () => {
        goTo(current + 1);
        resetTimer();
    });
    indicators.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            goTo(i);
            resetTimer();
        });
    });

    // 自动播放
    function startTimer() {
        if (timer) clearInterval(timer);
        timer = setInterval(() => goTo(current + 1), 3500);
    }
    function resetTimer() {
        if (timer) clearInterval(timer);
        startTimer();
    }
    startTimer();

    // 鼠标悬停暂停
    container.addEventListener('mouseenter', () => {
        if (timer) clearInterval(timer);
    });
    container.addEventListener('mouseleave', startTimer);
}