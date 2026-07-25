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
    // 恢复选中值
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
    // 'default' 不排序，保持原顺序
    return arr;
}

// ====== 执行筛选 + 排序 ======
function filterAndSort() {
    const keyword = searchInput.value.trim();
    const category = categorySelect.value;
    const sortType = sortSelect.value;

    let result = allProducts;

    // 1. 关键词筛选
    if (keyword !== '') {
        result = filterProducts(allProducts, keyword);
    }

    // 2. 分类筛选
    if (category !== '') {
        result = result.filter(p => p.category === category);
    }

    // 3. 排序
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

// ====== 初始化应用 ======
async function initApp() {
    try {
        const data = await loadData();
        allProducts = data.products;
        currentFiltered = allProducts;

        initCarousel(data.images, '#carousel-container');

        // 更新分类下拉框
        updateCategorySelect(allProducts);

        // 首次渲染
        renderPage();
        searchTip.textContent = `共 ${allProducts.length} 件商品`;

        // ====== 事件绑定 ======
        // 搜索输入（实时 + 防抖）
        searchInput.addEventListener('input', function() {
            const keyword = this.value.trim();
            if (keyword === '') {
                suggestionsBox.style.display = 'none';
                filterAndSort();
                return;
            }
            updateSuggestions(keyword);
        });

        // 搜索按钮
        searchBtn.addEventListener('click', function() {
            suggestionsBox.style.display = 'none';
            filterAndSort();
        });

        // 回车键
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                suggestionsBox.style.display = 'none';
                filterAndSort();
            }
        });

        // 清空按钮
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            suggestionsBox.style.display = 'none';
            categorySelect.value = '';
            sortSelect.value = 'default';
            filterAndSort();
        });

        // 分类切换
        categorySelect.addEventListener('change', () => {
            suggestionsBox.style.display = 'none';
            filterAndSort();
        });

        // 排序切换
        sortSelect.addEventListener('change', () => {
            filterAndSort();
        });

        // 加载更多
        loadMoreBtn.addEventListener('click', function() {
            currentPage++;
            renderPage(true);
        });

        // 点击页面其他地方关闭下拉框
        document.addEventListener('click', function(e) {
            if (!document.getElementById('search-section').contains(e.target)) {
                suggestionsBox.style.display = 'none';
            }
        });

        // 绑定弹窗事件
        bindModalEvents();

    } catch (error) {
        alert('数据加载失败，请确保通过 Live Server 或 GitHub Pages 访问。\n' + error.message);
        console.error(error);
    }
}

// 启动
initApp();