/**
 * 数据加载模块
 * 负责加载：
 *   1. 轮播图片列表（data/sources.txt）
 *   2. 所有商品数据（data/items/ 下的 TXT，通过 manifest.txt 索引）
 *   注意：防伪码已迁移到 Cloudflare Worker，不再从前端加载
 */

export async function loadData() {
    try {
        // ----- 1. 加载轮播图片 -----
        const sourcesRes = await fetch('data/sources.txt');
        if (!sourcesRes.ok) {
            throw new Error('sources.txt 加载失败，请检查文件是否存在');
        }
        const sourcesText = await sourcesRes.text();
        const images = sourcesText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));

        // ----- 2. 加载商品清单 manifest.txt -----
        const manifestRes = await fetch('data/items/manifest.txt');
        if (!manifestRes.ok) {
            throw new Error('manifest.txt 加载失败，请检查 data/items/manifest.txt 是否存在');
        }
        const manifestText = await manifestRes.text();
        const fileNames = manifestText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));

        // ----- 3. 加载每个商品数据（不再加载防伪码） -----
        const productPromises = fileNames.map(async (fileName) => {
            // 提取文件名（不含 .txt）作为商品 ID
            const baseName = fileName.replace(/\.txt$/i, '');
            try {
                const itemRes = await fetch(`data/items/${fileName}`);
                if (!itemRes.ok) {
                    console.warn(`⚠️ 商品文件 data/items/${fileName} 加载失败，跳过`);
                    return null;
                }
                const itemText = await itemRes.text();
                const product = parseProductText(itemText);
                if (!product) {
                    console.warn(`⚠️ 解析商品文件 ${fileName} 失败（缺少商品名称），跳过`);
                    return null;
                }
                // ✅ 增加 id 字段（用于防伪码验证，与 laws/ 中的文件名对应）
                product.id = baseName;
                return product;
            } catch (err) {
                console.warn(`⚠️ 加载商品文件 ${fileName} 时发生错误:`, err);
                return null;
            }
        });

        const products = (await Promise.all(productPromises)).filter(p => p !== null);
        return { images, products };
    } catch (error) {
        console.error('❌ 数据加载失败:', error);
        throw error;
    }
}

// ========== 解析单个商品 TXT（不含防伪码） ==========
function parseProductText(text) {
    const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const data = {
        name: '',
        image: '',
        description: '',
        video: '',
        category: '',
        price: ''
    };

    for (const line of lines) {
        if (line.includes('：')) {
            const [key, ...rest] = line.split('：');
            const value = rest.join('：').trim();
            switch (key) {
                case '商品名称':
                    data.name = value;
                    break;
                case '图片链接':
                    data.image = value;
                    break;
                case '商品介绍':
                    data.description = value;
                    break;
                case '视频链接':
                    data.video = value;
                    break;
                case '商品分类':
                    data.category = value;
                    break;
                case '价格':
                    data.price = value;
                    break;
                default:
                    break;
            }
        }
    }

    if (!data.name) return null;
    return data;
}