// 处理视频跳转
export function handleVideoClick(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
    } else {
        alert('视频链接无效，请检查配置');
    }
}