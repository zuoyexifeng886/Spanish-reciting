/**
 * 练习页面逻辑
 */

let currentMode = null; // es2cn, cn2es, listening, choice
let practiceWords = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let answered = false;
let questionCount = 10;
let wordRange = 'all';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initModeCards();
});

/**
 * 初始化模式卡片
 */
function initModeCards() {
    // 兼容HTML的onclick调用方式，不需要额外绑定
}

/**
 * 开始练习
 */
function startPractice(mode) {
    if (mode) {
        currentMode = mode;
    }
    
    questionCount = parseInt(document.getElementById('questionCount').value) || 10;
    wordRange = document.getElementById('wordScope').value || 'all';
    
    // 获取练习单词
    let words = getPracticeWords();
    
    if (words.length === 0) {
        alert('没有可练习的单词，请先添加词库');
        return;
    }
    
    // 随机打乱并取指定数量
    practiceWords = shuffleArray(words).slice(0, Math.min(questionCount, words.length));
    
    if (practiceWords.length === 0) {
        alert('没有可练习的单词');
        return;
    }
    
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    answered = false;
    
    // 隐藏模式选择，显示练习区域
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('practiceArea').style.display = 'block';
    
    showQuestion();
}

/**
 * 获取练习单词
 */
function getPracticeWords() {
    let words = getAllWords();
    
    if (wordRange === 'learned') {
        // 已学过的单词
        words = words.filter(w => w.studyCount > 0);
    } else if (wordRange === 'wrong') {
        // 错题本
        const wrongWords = getWrongWords();
        const wrongIds = wrongWords.map(w => w.wordId);
        words = words.filter(w => wrongIds.includes(w.id));
    }
    
    return words;
}

/**
 * 显示题目
 */
function showQuestion() {
    const word = practiceWords[currentIndex];
    if (!word) {
        showResult();
        return;
    }
    
    answered = false;
    
    // 更新进度
    document.getElementById('currentQ').textContent = currentIndex + 1;
    document.getElementById('totalQ').textContent = practiceWords.length;
    document.getElementById('correctCount').textContent = correctCount;
    
    // 更新进度条
    const progress = ((currentIndex + 1) / practiceWords.length) * 100;
    document.getElementById('practiceProgress').style.width = progress + '%';
    
    // 隐藏反馈
    document.getElementById('answerFeedback').style.display = 'none';
    
    // 根据模式显示不同内容
    const questionContent = document.getElementById('questionContent');
    const answerInputArea = document.getElementById('answerInputArea');
    const choiceOptions = document.getElementById('choiceOptions');
    const listenBtn = document.getElementById('listenBtn');
    
    // 清空输入
    const input = document.getElementById('answerInput');
    if (input) input.value = '';
    
    switch (currentMode) {
        case 'es2cn':
            // 看西语写中文
            document.getElementById('questionType').textContent = '看西语写中文';
            questionContent.innerHTML = `
                <h2 class="question-word">${word.spanish}</h2>
            `;
            listenBtn.style.display = 'inline-block';
            listenBtn.onclick = () => pronounceSpanish(word.spanish);
            answerInputArea.style.display = 'flex';
            choiceOptions.style.display = 'none';
            input.placeholder = '请输入中文释义';
            break;
            
        case 'cn2es':
            // 看中文写西语
            document.getElementById('questionType').textContent = '看中文写西语';
            questionContent.innerHTML = `
                <h2 class="question-word">${word.chinese}</h2>
            `;
            listenBtn.style.display = 'none';
            answerInputArea.style.display = 'flex';
            choiceOptions.style.display = 'none';
            input.placeholder = '请输入西语单词';
            break;
            
        case 'listening':
            // 听力听写
            document.getElementById('questionType').textContent = '听力听写';
            questionContent.innerHTML = `
                <p style="font-size: 14px; color: #666;">听发音，写出西语单词</p>
            `;
            listenBtn.style.display = 'inline-block';
            listenBtn.onclick = () => pronounceSpanish(word.spanish);
            answerInputArea.style.display = 'flex';
            choiceOptions.style.display = 'none';
            input.placeholder = '请输入西语单词';
            
            // 自动播放一次
            setTimeout(() => {
                pronounceSpanish(word.spanish);
            }, 500);
            break;
            
        case 'choice':
            // 选择题
            document.getElementById('questionType').textContent = '选择题';
            questionContent.innerHTML = `
                <h2 class="question-word">${word.spanish}</h2>
                <p style="font-size: 14px; color: #666;">请选择正确的中文释义</p>
            `;
            listenBtn.style.display = 'none';
            answerInputArea.style.display = 'none';
            choiceOptions.style.display = 'flex';
            
            // 生成选项
            generateChoices(word);
            break;
    }
}

/**
 * 生成选择题选项
 */
function generateChoices(correctWord) {
    const allWords = getAllWords();
    const wrongWords = allWords.filter(w => w.id !== correctWord.id);
    
    // 随机选3个错误选项
    const shuffledWrong = shuffleArray(wrongWords).slice(0, 3);
    const options = shuffleArray([correctWord, ...shuffledWrong]);
    
    const choiceOptions = document.getElementById('choiceOptions');
    choiceOptions.innerHTML = options.map(word => `
        <div class="choice-option" onclick="selectChoice('${word.id}', this)">
            ${word.chinese}
        </div>
    `).join('');
}

/**
 * 选择选项
 */
function selectChoice(wordId, element) {
    if (answered) return;
    answered = true;
    
    const correctWord = practiceWords[currentIndex];
    const isCorrect = wordId === correctWord.id;
    
    // 标记正确和错误
    const allOptions = document.querySelectorAll('.choice-option');
    allOptions.forEach(opt => {
        if (opt.textContent.trim() === correctWord.chinese) {
            opt.classList.add('correct');
        }
    });
    
    if (!isCorrect) {
        element.classList.add('wrong');
    }
    
    // 处理结果
    handleAnswer(isCorrect, correctWord);
}

/**
 * 提交答案
 */
function submitAnswer() {
    if (answered) return;
    
    const input = document.getElementById('answerInput');
    const userAnswer = input.value.trim();
    
    if (!userAnswer) {
        alert('请输入答案');
        return;
    }
    
    answered = true;
    const word = practiceWords[currentIndex];
    let correctAnswer = '';
    let isCorrect = false;
    
    switch (currentMode) {
        case 'es2cn':
            correctAnswer = word.chinese;
            // 中文匹配，支持部分匹配
            isCorrect = word.chinese.includes(userAnswer) || userAnswer.includes(word.chinese);
            break;
            
        case 'cn2es':
        case 'listening':
            correctAnswer = word.spanish;
            // 西语匹配，忽略大小写和重音
            isCorrect = normalizeSpanish(userAnswer) === normalizeSpanish(word.spanish);
            break;
    }
    
    handleAnswer(isCorrect, word, userAnswer);
}

/**
 * 处理答案结果
 */
function handleAnswer(isCorrect, word, userAnswer = '') {
    const feedback = document.getElementById('answerFeedback');
    feedback.style.display = 'block';
    
    if (isCorrect) {
        correctCount++;
        feedback.className = 'answer-feedback correct';
        document.getElementById('feedbackIcon').textContent = '✅';
        document.querySelector('.feedback-text').innerHTML = '回答正确！';
    } else {
        wrongCount++;
        addToWrongWords(word.id);
        feedback.className = 'answer-feedback wrong';
        document.getElementById('feedbackIcon').textContent = '❌';
        
        let correctText = '';
        if (currentMode === 'es2cn') {
            correctText = word.chinese;
        } else {
            correctText = word.spanish;
        }
        
        document.getElementById('correctAnswer').textContent = '正确答案：' + correctText;
        document.getElementById('yourAnswer').textContent = userAnswer ? '你的答案：' + userAnswer : '';
    }
    
    // 更新分数
    document.getElementById('correctCount').textContent = correctCount;
}

/**
 * 下一题
 */
function nextQuestion() {
    currentIndex++;
    
    if (currentIndex >= practiceWords.length) {
        showResult();
        return;
    }
    
    showQuestion();
}

/**
 * 显示结果
 */
function showResult() {
    document.getElementById('practiceArea').style.display = 'none';
    document.getElementById('resultArea').style.display = 'block';
    
    const total = practiceWords.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    
    document.getElementById('finalScore').textContent = accuracy;
    document.getElementById('totalQuestions').textContent = total;
    document.getElementById('totalCorrect').textContent = correctCount;
    document.getElementById('totalWrong').textContent = wrongCount;
    document.getElementById('accuracyPercent').textContent = accuracy + '%';
}

/**
 * 重新练习
 */
function restartPractice() {
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('modeSelect').style.display = 'block';
}

/**
 * 查看错题
 */
function viewWrongAnswers() {
    window.location.href = 'wrong.html';
}

/**
 * 返回模式选择
 */
function backToModes() {
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('practiceArea').style.display = 'none';
    document.getElementById('modeSelect').style.display = 'block';
}

/**
 * 发音题目（兼容HTML调用）
 */
function pronounceQuestion() {
    const word = practiceWords[currentIndex];
    if (word) {
        pronounceSpanish(word.spanish);
    }
}

/**
 * 返回首页
 */
function goHome() {
    window.location.href = 'index.html';
}

/**
 * 西语标准化（忽略大小写和重音）
 */
function normalizeSpanish(text) {
    return text.toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/ü/g, 'u')
        .trim();
}

/**
 * 数组随机打乱
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 回车提交答案
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.getElementById('practiceArea').style.display !== 'none') {
        if (currentMode === 'choice') {
            return;
        }
        if (!answered) {
            submitAnswer();
        } else {
            nextQuestion();
        }
    }
});
