// 模糊搜索（不区分大小写）
export function filterProducts(products, keyword) {
    if (!keyword || keyword.trim() === '') {
        return products;
    }
    const kw = keyword.trim().toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(kw));
}