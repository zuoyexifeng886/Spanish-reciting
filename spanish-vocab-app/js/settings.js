/**
 * 设置页面逻辑
 */

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
});

/**
 * 加载设置
 */
function loadSettings() {
    const settings = getSettings();
    
    document.getElementById('dailyNewWords').value = settings.dailyNewWords;
    document.getElementById('speechRate').value = settings.speechRate;
    document.getElementById('autoPronounce').checked = settings.autoPronounce;
    document.getElementById('showExample').checked = settings.showExample;
    document.getElementById('showConjugation').checked = settings.showConjugation;
}

/**
 * 保存单个设置
 */
function saveSetting(key, value) {
    const settings = {};
    settings[key] = value;
    saveSettings(settings);
}

/**
 * 导出全部数据
 */
function exportAllData() {
    if (getAllWords().length === 0) {
        alert('暂无数据可导出');
        return;
    }
    
    const data = {
        words: getAllWords(),
        wrongWords: getWrongWords(),
        settings: getSettings(),
        dailyStats: getDailyStats(),
        exportDate: new Date().toISOString(),
        version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `西语背单词备份_${getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('数据导出成功！');
}

/**
 * 导入数据
 */
function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('导入数据会覆盖当前所有数据，确定继续吗？')) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.words) {
                localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(data.words));
            }
            if (data.wrongWords) {
                localStorage.setItem(STORAGE_KEYS.WRONG_WORDS, JSON.stringify(data.wrongWords));
            }
            if (data.settings) {
                localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
            }
            if (data.dailyStats) {
                localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(data.dailyStats));
            }
            
            alert('数据导入成功！');
            loadSettings();
        } catch (err) {
            alert('导入失败：文件格式不正确');
            console.error(err);
        }
    };
    reader.readAsText(file);
    
    event.target.value = '';
}

/**
 * 重置学习进度
 */
function resetStudyProgress() {
    if (!confirm('确定要重置所有学习进度吗？词库会保留，但学习记录会清空。')) {
        return;
    }
    
    const words = getAllWords();
    const resetWords = words.map(w => ({
        ...w,
        studyCount: 0,
        correctCount: 0,
        nextReviewDate: null,
        lastStudyDate: null,
        masteryLevel: 0
    }));
    saveAllWords(resetWords);
    
    // 清空错题本
    clearWrongWords();
    
    // 清空每日统计
    localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify({}));
    
    alert('学习进度已重置');
}

/**
 * 清空所有数据
 */
function clearAllData() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        return;
    }
    
    if (!confirm('再次确认：所有单词、学习记录都会被删除，确定吗？')) {
        return;
    }
    
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    
    alert('所有数据已清空');
    loadSettings();
}
