/**
 * 学习页面逻辑
 */

let studyWords = [];
let currentIndex = 0;
let isFlipped = false;
let newWordsCount = 0;
let reviewWordsCount = 0;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initStudy();
});

/**
 * 初始化学习
 */
function initStudy() {
    // 获取今日复习单词 + 今日新词
    const reviewWords = getTodayReviewWords();
    const newWords = getTodayNewWords();
    
    studyWords = [...reviewWords, ...newWords];
    reviewWordsCount = reviewWords.length;
    newWordsCount = newWords.length;
    
    if (studyWords.length === 0) {
        showCompleteState();
        return;
    }
    
    currentIndex = 0;
    isFlipped = false;
    updateProgress();
    showCurrentWord();
    
    // 自动发音
    const settings = getSettings();
    if (settings.autoPronounce) {
        setTimeout(() => {
            pronounceCurrentWord();
        }, 500);
    }
}

/**
 * 更新进度
 */
function updateProgress() {
    const total = studyWords.length;
    const progress = ((currentIndex + 1) / total) * 100;
    
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('currentIndex').textContent = currentIndex + 1;
    document.getElementById('totalCount').textContent = total;
}

/**
 * 显示当前单词
 */
function showCurrentWord() {
    const word = studyWords[currentIndex];
    if (!word) return;
    
    const settings = getSettings();
    
    // 正面
    document.getElementById('wordLevel').textContent = word.level;
    document.getElementById('wordSpanish').textContent = word.spanish;
    
    // 背面
    document.getElementById('wordType').textContent = word.type || '';
    document.getElementById('wordChinese').textContent = word.chinese;
    
    // 动词变位
    const conjugationEl = document.getElementById('wordConjugation');
    if (settings.showConjugation && word.conjugation) {
        conjugationEl.textContent = word.conjugation;
        conjugationEl.style.display = 'block';
    } else {
        conjugationEl.style.display = 'none';
    }
    
    // 例句
    const exampleEl = document.getElementById('wordExample');
    if (settings.showExample && word.example) {
        exampleEl.textContent = word.example;
        exampleEl.style.display = 'block';
    } else {
        exampleEl.style.display = 'none';
    }
    
    // 重置翻转状态
    const card = document.getElementById('wordCard');
    card.classList.remove('flipped');
    isFlipped = false;
    
    // 隐藏评级按钮
    document.getElementById('ratingArea').style.display = 'none';
}

/**
 * 翻转卡片
 */
function flipCard() {
    const card = document.getElementById('wordCard');
    card.classList.toggle('flipped');
    isFlipped = !isFlipped;
    
    // 翻转后显示评级按钮
    if (isFlipped) {
        document.getElementById('ratingArea').style.display = 'block';
    }
}

/**
 * 发音当前单词
 */
function pronounceCurrentWord() {
    const word = studyWords[currentIndex];
    if (word) {
        pronounceSpanish(word.spanish);
    }
}

/**
 * 发音单词（兼容HTML调用）
 */
function pronounceWord() {
    pronounceCurrentWord();
}

/**
 * 评级并进入下一个
 */
function rateWord(rating) {
    const word = studyWords[currentIndex];
    if (!word) return;
    
    // 记录学习结果
    recordStudyResult(word.id, rating);
    
    // 下一个单词
    nextWord();
}

/**
 * 下一个单词
 */
function nextWord() {
    currentIndex++;
    
    if (currentIndex >= studyWords.length) {
        showCompleteState();
        return;
    }
    
    updateProgress();
    showCurrentWord();
    
    // 自动发音
    const settings = getSettings();
    if (settings.autoPronounce) {
        setTimeout(() => {
            pronounceCurrentWord();
        }, 300);
    }
}

/**
 * 显示完成状态
 */
function showCompleteState() {
    // 隐藏学习区域
    document.querySelector('.study-area').style.display = 'none';
    document.getElementById('ratingArea').style.display = 'none';
    document.querySelector('.progress-bar-container').style.display = 'none';
    
    // 显示完成状态
    document.getElementById('completeState').style.display = 'block';
    
    // 更新统计
    document.getElementById('learnedCount').textContent = studyWords.length;
    const accuracy = Math.round((newWordsCount + reviewWordsCount * 0.8) / studyWords.length * 100);
    document.getElementById('accuracyRate').textContent = accuracy + '%';
}

/**
 * 开始练习（兼容HTML调用）
 */
function startPractice() {
    goPractice();
}

/**
 * 返回首页
 */
function goHome() {
    window.location.href = 'index.html';
}

/**
 * 去做练习
 */
function goPractice() {
    window.location.href = 'practice.html';
}
