/**
 * 数据加载模块
 * 负责加载：
 *   1. 轮播图片列表（data/sources.txt）
 *   2. 所有商品数据（data/items/ 下的 TXT，通过 manifest.txt 索引）
 *   3. 每个商品对应的防伪码（data/verify/ 下的同名 TXT，不存在则静默忽略）
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

        // ----- 3. 加载每个商品数据 + 对应的防伪码 -----
        const productPromises = fileNames.map(async (fileName) => {
            const baseName = fileName.replace(/\.txt$/i, ''); // 去除 .txt 后缀

            // 3a. 加载商品数据
            let product = null;
            try {
                const itemRes = await fetch(`data/items/${fileName}`);
                if (!itemRes.ok) {
                    console.warn(`⚠️ 商品文件 data/items/${fileName} 加载失败，跳过`);
                    return null;
                }
                const itemText = await itemRes.text();
                product = parseProductText(itemText);
                if (!product) {
                    console.warn(`⚠️ 解析商品文件 ${fileName} 失败（缺少商品名称），跳过`);
                    return null;
                }
            } catch (err) {
                console.warn(`⚠️ 加载商品文件 ${fileName} 时发生错误:`, err);
                return null;
            }

            // 3b. 尝试加载对应的防伪码文件（静默降级）
            let antiFakeCodes = [];
            try {
                const verifyRes = await fetch(`data/verify/${baseName}.txt`);
                if (verifyRes.ok) {
                    const verifyText = await verifyRes.text();
                    antiFakeCodes = verifyText
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
                }
                // 如果文件不存在 (404)，静默忽略，antiFakeCodes 保持为空数组
            } catch (err) {
                // 网络错误或其他异常，也静默忽略
            }

            // 将防伪码数组挂载到商品对象上
            product.antiFakeCodes = antiFakeCodes;

            return product;
        });

        // 等待所有商品加载完成，过滤掉 null
        const products = (await Promise.all(productPromises)).filter(p => p !== null);

        return { images, products };
    } catch (error) {
        console.error('❌ 数据加载失败:', error);
        throw error;
    }
}

// ========== 解析单个商品 TXT ==========
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
        price: '',
        // antiFakeCodes 由外部加载，此处不解析
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