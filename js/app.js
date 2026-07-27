import { loadData } from './dataLoader.js';
import { initCarousel } from './carousel.js';
import { filterProducts } from './search.js';
import { renderProducts } from './renderer.js';
import { openModal, closeModal, bindModalEvents } from './modal.js';

// DOM 元素
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clear-btn');
const searchTip = document.getElementById('search-tip');
const suggestionsBox = document.getElementById('suggestions');
const productList = document.getElementById('product-list');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreInfo = document.getElementById('load-more-info');
const categorySelect = document.getElementById('category-select');
const sortSelect = document.getElementById('sort-select');

// 全局数据
let allProducts = [];
let currentFiltered = [];
let currentPage = 1;
const PAGE_SIZE = 20;

// ====== 防抖工具 ======
function debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ====== 提取所有分类 ======
function extractCategories(products) {
    const cats = new Set();
    products.forEach(p => {
        if (p.category && p.category.trim()) {
            cats.add(p.category.trim());
        }
    });
    return ['', ...Array.from(cats).sort()];
}

// ====== 更新分类下拉框 ======
function updateCategorySelect(products) {
    const categories = extractCategories(products);
    const currentVal = categorySelect.value;
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat || '全部分类';
        categorySelect.appendChild(opt);
    });
    if (currentVal && categories.includes(currentVal)) {
        categorySelect.value = currentVal;
    }
}

// ====== 排序函数 ======
function sortProducts(products, sortType) {
    const arr = [...products];
    if (sortType === 'name_asc') {
        arr.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    } else if (sortType === 'name_desc') {
        arr.sort((a, b) => b.name.localeCompare(a.name, 'zh-Hans-CN'));
    }
    return arr;
}

// ====== 执行筛选 + 排序 ======
function filterAndSort() {
    const keyword = searchInput.value.trim();
    const category = categorySelect.value;
    const sortType = sortSelect.value;

    let result = allProducts;

    if (keyword !== '') {
        result = filterProducts(allProducts, keyword);
    }

    if (category !== '') {
        result = result.filter(p => p.category === category);
    }

    result = sortProducts(result, sortType);

    currentFiltered = result;
    currentPage = 1;
    renderPage();
    searchTip.textContent = result.length > 0 ? `找到 ${result.length} 件商品` : '未找到匹配商品';
    searchTip.classList.toggle('has-result', result.length > 0);
}

// ====== 渲染分页 ======
function renderPage(append = false) {
    const total = currentFiltered.length;
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);
    const pageData = currentFiltered.slice(start, end);

    if (pageData.length === 0 && append) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = '已加载全部';
        loadMoreInfo.textContent = '';
        return;
    }

    renderProducts(pageData, '#product-list', append);

    const hasMore = end < total;
    if (hasMore) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = '加载更多';
        loadMoreInfo.textContent = `显示 ${end} / ${total} 件`;
    } else {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = '已加载全部';
        loadMoreInfo.textContent = total > 0 ? `共 ${total} 件商品` : '';
    }
}

// ====== 更新下拉建议（带防抖） ======
const updateSuggestions = debounce(function(keyword) {
    const kw = keyword.trim().toLowerCase();
    if (kw === '') {
        suggestionsBox.style.display = 'none';
        return;
    }
    const matched = allProducts
        .filter(p => p.name.toLowerCase().includes(kw))
        .slice(0, 8);

    if (matched.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    let html = '';
    matched.forEach(p => {
        const name = p.name;
        const index = name.toLowerCase().indexOf(kw);
        let displayName = name;
        if (index !== -1) {
            const before = name.substring(0, index);
            const highlight = name.substring(index, index + kw.length);
            const after = name.substring(index + kw.length);
            displayName = `${before}<span class="highlight">${highlight}</span>${after}`;
        }
        html += `<div class="suggestion-item" data-name="${p.name}">${displayName}</div>`;
    });

    suggestionsBox.innerHTML = html;
    suggestionsBox.style.display = 'block';

    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const name = this.dataset.name;
            searchInput.value = name;
            suggestionsBox.style.display = 'none';
            filterAndSort();
        });
    });
}, 250);

// =====================================================
// ====== 🆕 从 URL 参数自动打开商品并填入防伪码 ======
// =====================================================
function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const productName = params.get('product');
    const code = params.get('code');

    if (!productName || !code) return;   // 没有参数则不做任何事

    // 解码（因为商品名称在 URL 中被 encodeURIComponent 编码过）
    const decodedName = decodeURIComponent(productName).trim();

    // 在所有商品中查找（忽略大小写）
    const product = allProducts.find(p =>
        p.name.trim().toLowerCase() === decodedName.toLowerCase()
    );

    if (!product) {
        console.warn('未找到匹配的商品：', decodedName);
        return;
    }

    // 1. 打开商品详情弹窗
    openModal(product);

    // 2. 等待模态框渲染完成后，自动填入防伪码
    //    使用轮询检测输入框是否存在（因为模态框有动画，需要延时）
    const fillCode = () => {
        const input = document.getElementById('verification-input');
        if (input) {
            input.value = code;
            // 触发 input 事件，让监听器（如果有）感知变化
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // 🟢 如需自动点击“验证正品”按钮，取消下面注释
            // const verifyBtn = document.getElementById('verification-btn');
            // if (verifyBtn) verifyBtn.click();

            console.log(`✅ 已自动填入防伪码: ${code}`);
        } else {
            // 如果还没渲染出来，再试一次
            setTimeout(fillCode, 200);
        }
    };

    // 首次等待 500ms（给模态框动画留时间），然后开始填充
    setTimeout(fillCode, 500);
}

// ====== 初始化应用 ======
async function initApp() {
    try {
        const data = await loadData();
        allProducts = data.products;
        currentFiltered = allProducts;

        initCarousel(data.images, '#carousel-container');

        updateCategorySelect(allProducts);

        renderPage();
        searchTip.textContent = `共 ${allProducts.length} 件商品`;

        // ====== 事件绑定（原有） ======
        searchInput.addEventListener('input', function() {
            const keyword = this.value.trim();
            if (keyword === '') {
                suggestionsBox.style.display = 'none';
                filterAndSort();
                return;
            }
            updateSuggestions(keyword);
        });

        searchBtn.addEventListener('click', function() {
            suggestionsBox.style.display = 'none';
            filterAndSort();
        });

        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                suggestionsBox.style.display = 'none';
                filterAndSort();
            }
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            suggestionsBox.style.display = 'none';
            categorySelect.value = '';
            sortSelect.value = 'default';
            filterAndSort();
        });

        categorySelect.addEventListener('change', () => {
            suggestionsBox.style.display = 'none';
            filterAndSort();
        });

        sortSelect.addEventListener('change', () => {
            filterAndSort();
        });

        loadMoreBtn.addEventListener('click', function() {
            currentPage++;
            renderPage(true);
        });

        document.addEventListener('click', function(e) {
            if (!document.getElementById('search-section').contains(e.target)) {
                suggestionsBox.style.display = 'none';
            }
        });

        bindModalEvents();

        // =============================================================
        // 🆕 数据加载完成后，检查 URL 参数并执行自动打开 + 填码
        // =============================================================
        initFromUrl();

    } catch (error) {
        alert('数据加载失败，请确保通过 Live Server 或 GitHub Pages 访问。\n' + error.message);
        console.error(error);
    }
}

// 启动
initApp();