export async function loadData() {
    try {
        const sourcesRes = await fetch('data/sources.txt');
        if (!sourcesRes.ok) throw new Error('sources.txt 加载失败');
        const sourcesText = await sourcesRes.text();
        const images = sourcesText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));

        const manifestRes = await fetch('data/items/manifest.txt');
        if (!manifestRes.ok) throw new Error('manifest.txt 加载失败');
        const manifestText = await manifestRes.text();
        const fileNames = manifestText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));

        const productPromises = fileNames.map(async (fileName) => {
            const res = await fetch(`data/items/${fileName}`);
            if (!res.ok) {
                console.warn(`商品文件 ${fileName} 加载失败，跳过`);
                return null;
            }
            const text = await res.text();
            return parseProductText(text);
        });
        const products = (await Promise.all(productPromises)).filter(p => p !== null);

        return { images, products };
    } catch (error) {
        console.error('数据加载失败:', error);
        throw error;
    }
}

function parseProductText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
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
            if (key === '商品名称') data.name = value;
            else if (key === '图片链接') data.image = value;
            else if (key === '商品介绍') data.description = value;
            else if (key === '视频链接') data.video = value;
            else if (key === '商品分类') data.category = value;
            else if (key === '价格') data.price = value;
        }
    }
    if (!data.name) return null;
    return data;
}