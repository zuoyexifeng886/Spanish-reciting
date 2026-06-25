/**
 * 首页逻辑
 */

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    updateStats();
});

/**
 * 更新统计数据
 */
function updateStats() {
    const stats = getStudyStats();
    
    // 更新今日新词
    document.getElementById('todayNewCount').textContent = stats.todayNewCount;
    
    // 更新待复习
    document.getElementById('reviewCount').textContent = stats.todayReviewCount;
    
    // 更新总词汇量
    document.getElementById('totalWords').textContent = stats.totalWords;
    
    // 更新连续打卡
    document.getElementById('streakDays').textContent = stats.streakDays;
}
