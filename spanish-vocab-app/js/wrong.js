/**
 * 错题本页面逻辑
 */

let currentFilter = 'all';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initFilterTabs();
    renderWrongList();
    updateStats();
});

/**
 * 初始化筛选标签
 */
function initFilterTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderWrongList();
        });
    });
}

/**
 * 更新统计
 */
function updateStats() {
    const wrongWords = getWrongWords();
    const today = getTodayString();
    
    const todayWrong = wrongWords.filter(w => w.lastWrongDate === today);
    
    document.getElementById('wrongTotal').textContent = wrongWords.length;
    document.getElementById('wrongToday').textContent = todayWrong.length;
    
    // 显示/隐藏底部操作栏
    const bottomActions = document.getElementById('bottomActions');
    if (wrongWords.length > 0) {
        bottomActions.style.display = 'flex';
    } else {
        bottomActions.style.display = 'none';
    }
}

/**
 * 渲染错题列表
 */
function renderWrongList() {
    const wrongList = document.getElementById('wrongList');
    const emptyState = document.getElementById('emptyWrong');
    
    let wrongWords = getWrongWords();
    const today = getTodayString();
    
    // 筛选
    if (currentFilter === 'today') {
        wrongWords = wrongWords.filter(w => w.lastWrongDate === today);
    } else if (currentFilter === 'frequent') {
        wrongWords = wrongWords.filter(w => w.wrongCount >= 2);
    }
    
    if (wrongWords.length === 0) {
        wrongList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // 按错误次数排序
    wrongWords.sort((a, b) => b.wrongCount - a.wrongCount);
    
    wrongList.innerHTML = wrongWords.map(wrong => {
        const word = getWordById(wrong.wordId);
        if (!word) return '';
        
        return `
            <div class="wrong-item">
                <div class="wrong-info">
                    <div class="wrong-es">${word.spanish}</div>
                    <div class="wrong-cn">${word.chinese}</div>
                </div>
                <div class="wrong-count">错${wrong.wrongCount}次</div>
            </div>
        `;
    }).join('');
}

/**
 * 开始错题专项练习
 */
function startWrongPractice() {
    const wrongWords = getWrongWords();
    if (wrongWords.length === 0) {
        alert('暂无错题');
        return;
    }
    
    window.location.href = 'practice.html?mode=wrong';
}

/**
 * 清空错题本
 */
function clearAllWrong() {
    if (confirm('确定要清空所有错题吗？')) {
        clearWrongWords();
        renderWrongList();
        updateStats();
    }
}
