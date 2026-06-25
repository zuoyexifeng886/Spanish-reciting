/**
 * 西语背单词 - 核心数据存储与业务逻辑
 * 基于localStorage本地存储，纯离线运行
 */

// 存储键名常量
const STORAGE_KEYS = {
    WORDS: 'spanish_vocab_words',
    STUDY_RECORDS: 'spanish_vocab_study_records',
    WRONG_WORDS: 'spanish_vocab_wrong_words',
    SETTINGS: 'spanish_vocab_settings',
    DAILY_STATS: 'spanish_vocab_daily_stats'
};

// 艾宾浩斯遗忘曲线间隔（天）
const EBBAUGHUS_INTERVALS = {
    bad: 1,      // 没记住 - 1天后复习
    medium: 3,   // 有点印象 - 3天后复习
    good: 7,     // 记住了 - 7天后复习
    perfect: 15  // 非常熟 - 15天后复习
};

// 默认设置
const DEFAULT_SETTINGS = {
    dailyNewWords: 15,
    speechRate: 0.8,
    autoPronounce: true,
    showExample: true,
    showConjugation: true
};

// ===== 工具函数 =====

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 */
function getTodayString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/**
 * 生成唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 计算两个日期之间的天数差
 */
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
}

// ===== 词库管理 =====

/**
 * 获取所有单词
 */
function getAllWords() {
    const data = localStorage.getItem(STORAGE_KEYS.WORDS);
    return data ? JSON.parse(data) : [];
}

/**
 * 保存所有单词
 */
function saveAllWords(words) {
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(words));
}

/**
 * 添加单个单词
 */
function addWord(wordData) {
    const words = getAllWords();
    const newWord = {
        id: generateId(),
        spanish: wordData.spanish,
        type: wordData.type || '',
        chinese: wordData.chinese,
        conjugation: wordData.conjugation || '',
        example: wordData.example || '',
        level: wordData.level || 'A1',
        category: wordData.category || 'daily',
        isHighFreq: wordData.isHighFreq || false,
        createdAt: new Date().toISOString(),
        studyCount: 0,
        correctCount: 0,
        nextReviewDate: null,
        lastStudyDate: null,
        masteryLevel: 0 // 0-5，掌握程度
    };
    words.push(newWord);
    saveAllWords(words);
    return newWord;
}

/**
 * 更新单词
 */
function updateWord(wordId, updateData) {
    const words = getAllWords();
    const index = words.findIndex(w => w.id === wordId);
    if (index !== -1) {
        words[index] = { ...words[index], ...updateData };
        saveAllWords(words);
        return words[index];
    }
    return null;
}

/**
 * 删除单词
 */
function deleteWord(wordId) {
    const words = getAllWords();
    const filtered = words.filter(w => w.id !== wordId);
    saveAllWords(filtered);
    
    // 同时从错题本删除
    removeFromWrongWords(wordId);
}

/**
 * 根据ID获取单词
 */
function getWordById(wordId) {
    const words = getAllWords();
    return words.find(w => w.id === wordId);
}

// ===== 艾宾浩斯复习逻辑 =====

/**
 * 获取今日待学习的新单词
 */
function getTodayNewWords(count = null) {
    const settings = getSettings();
    const dailyCount = count || settings.dailyNewWords;
    const words = getAllWords();
    
    // 筛选从未学习过的单词（nextReviewDate为null）
    const newWords = words.filter(w => w.nextReviewDate === null);
    
    // 按创建时间排序，取前N个
    return newWords.slice(0, dailyCount);
}

/**
 * 获取今日待复习的单词
 */
function getTodayReviewWords() {
    const words = getAllWords();
    const today = getTodayString();
    
    // 筛选下次复习日期 <= 今天的单词
    return words.filter(w => {
        if (!w.nextReviewDate) return false;
        return w.nextReviewDate <= today;
    });
}

/**
 * 记录单词学习结果，更新下次复习时间
 */
function recordStudyResult(wordId, rating) {
    const word = getWordById(wordId);
    if (!word) return;
    
    const interval = EBBAUGHUS_INTERVALS[rating] || 1;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    
    // 更新掌握等级
    let masteryLevel = word.masteryLevel || 0;
    if (rating === 'bad') {
        masteryLevel = Math.max(0, masteryLevel - 1);
    } else if (rating === 'medium') {
        masteryLevel = Math.min(5, masteryLevel + 0);
    } else if (rating === 'good') {
        masteryLevel = Math.min(5, masteryLevel + 1);
    } else if (rating === 'perfect') {
        masteryLevel = Math.min(5, masteryLevel + 2);
    }
    
    updateWord(wordId, {
        studyCount: (word.studyCount || 0) + 1,
        correctCount: rating !== 'bad' ? (word.correctCount || 0) + 1 : word.correctCount,
        nextReviewDate: nextDate.toISOString().split('T')[0],
        lastStudyDate: getTodayString(),
        masteryLevel: masteryLevel
    });
    
    // 更新每日统计
    updateDailyStats(rating);
}

// ===== 错题本 =====

/**
 * 获取错题本
 */
function getWrongWords() {
    const data = localStorage.getItem(STORAGE_KEYS.WRONG_WORDS);
    return data ? JSON.parse(data) : [];
}

/**
 * 添加到错题本
 */
function addToWrongWords(wordId) {
    const wrongWords = getWrongWords();
    const existing = wrongWords.find(w => w.wordId === wordId);
    
    if (existing) {
        existing.wrongCount = (existing.wrongCount || 1) + 1;
        existing.lastWrongDate = getTodayString();
    } else {
        wrongWords.push({
            wordId: wordId,
            wrongCount: 1,
            firstWrongDate: getTodayString(),
            lastWrongDate: getTodayString()
        });
    }
    
    localStorage.setItem(STORAGE_KEYS.WRONG_WORDS, JSON.stringify(wrongWords));
}

/**
 * 从错题本移除
 */
function removeFromWrongWords(wordId) {
    const wrongWords = getWrongWords();
    const filtered = wrongWords.filter(w => w.wordId !== wordId);
    localStorage.setItem(STORAGE_KEYS.WRONG_WORDS, JSON.stringify(filtered));
}

/**
 * 清空错题本
 */
function clearWrongWords() {
    localStorage.setItem(STORAGE_KEYS.WRONG_WORDS, JSON.stringify([]));
}

// ===== 设置管理 =====

/**
 * 获取设置
 */
function getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
    return { ...DEFAULT_SETTINGS };
}

/**
 * 保存设置
 */
function saveSettings(settings) {
    const current = getSettings();
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
}

// ===== 统计数据 =====

/**
 * 获取每日统计
 */
function getDailyStats() {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    return data ? JSON.parse(data) : {};
}

/**
 * 更新每日统计
 */
function updateDailyStats(rating) {
    const stats = getDailyStats();
    const today = getTodayString();
    
    if (!stats[today]) {
        stats[today] = {
            studied: 0,
            correct: 0,
            wrong: 0,
            newWords: 0
        };
    }
    
    stats[today].studied += 1;
    if (rating === 'bad') {
        stats[today].wrong += 1;
    } else {
        stats[today].correct += 1;
    }
    
    localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(stats));
}

/**
 * 获取学习统计概览
 */
function getStudyStats() {
    const words = getAllWords();
    const todayNew = getTodayNewWords();
    const todayReview = getTodayReviewWords();
    const dailyStats = getDailyStats();
    const today = getTodayString();
    
    // 计算连续打卡天数
    let streakDays = 0;
    let checkDate = new Date();
    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (dailyStats[dateStr] && dailyStats[dateStr].studied > 0) {
            streakDays++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return {
        totalWords: words.length,
        todayNewCount: todayNew.length,
        todayReviewCount: todayReview.length,
        streakDays: streakDays,
        todayStats: dailyStats[today] || { studied: 0, correct: 0, wrong: 0 }
    };
}

// ===== 发音功能 =====

/**
 * 发音功能（使用Web Speech API）
 */
function pronounceSpanish(text, rate = null) {
    if (!('speechSynthesis' in window)) {
        console.warn('浏览器不支持语音合成');
        return;
    }
    
    const settings = getSettings();
    const speechRate = rate || settings.speechRate;
    
    // 取消之前的发音
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // 西班牙语
    utterance.rate = parseFloat(speechRate);
    utterance.pitch = 1;
    
    // 尝试选择西班牙语语音
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) {
        utterance.voice = spanishVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

// ===== 数据导入导出 =====

/**
 * 导出全部数据
 */
function exportAllData() {
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
}

/**
 * 导入数据
 */
function importAllData(jsonData) {
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
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
        
        return true;
    } catch (e) {
        console.error('导入失败:', e);
        return false;
    }
}

/**
 * 导出单词为CSV
 */
function exportWordsToCSV() {
    const words = getAllWords();
    const headers = ['单词', '词性', '中文释义', '动词变位', '例句', '难度等级', '分类'];
    
    let csv = headers.join(',') + '\n';
    words.forEach(word => {
        const row = [
            `"${word.spanish}"`,
            `"${word.type}"`,
            `"${word.chinese}"`,
            `"${word.conjugation}"`,
            `"${word.example}"`,
            `"${word.level}"`,
            `"${word.category}"`
        ];
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `西语单词表_${getTodayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 重置学习进度（保留词库）
 */
function resetStudyProgress() {
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
}

/**
 * 清空所有数据
 */
function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

// ===== 示例词库 =====

/**
 * 加载示例词库
 */
function loadSampleWords() {
    const sampleWords = [
        // 日常基础 A1
        { spanish: 'hola', type: '感叹词', chinese: '你好', conjugation: '', example: '¡Hola! ¿Cómo estás?', level: 'A1', category: 'daily' },
        { spanish: 'adiós', type: '感叹词', chinese: '再见', conjugation: '', example: 'Adiós, hasta mañana.', level: 'A1', category: 'daily' },
        { spanish: 'gracias', type: '感叹词', chinese: '谢谢', conjugation: '', example: 'Muchas gracias por tu ayuda.', level: 'A1', category: 'daily' },
        { spanish: 'por favor', type: '短语', chinese: '请', conjugation: '', example: 'Un café, por favor.', level: 'A1', category: 'daily' },
        { spanish: 'buenos días', type: '短语', chinese: '早上好', conjugation: '', example: 'Buenos días, señor.', level: 'A1', category: 'daily' },
        { spanish: 'buenas tardes', type: '短语', chinese: '下午好', conjugation: '', example: 'Buenas tardes a todos.', level: 'A1', category: 'daily' },
        { spanish: 'buenas noches', type: '短语', chinese: '晚上好/晚安', conjugation: '', example: 'Buenas noches, dulces sueños.', level: 'A1', category: 'daily' },
        { spanish: 'sí', type: '副词', chinese: '是，是的', conjugation: '', example: 'Sí, quiero.', level: 'A1', category: 'daily' },
        { spanish: 'no', type: '副词', chinese: '不，不是', conjugation: '', example: 'No, gracias.', level: 'A1', category: 'daily' },
        { spanish: 'amigo', type: '名词', chinese: '朋友', conjugation: '', example: 'Él es mi mejor amigo.', level: 'A1', category: 'daily' },
        
        // 旅游 A2
        { spanish: 'aeropuerto', type: '名词', chinese: '机场', conjugation: '', example: 'El aeropuerto está lejos.', level: 'A2', category: 'travel' },
        { spanish: 'hotel', type: '名词', chinese: '酒店', conjugation: '', example: 'Reservé un hotel en el centro.', level: 'A2', category: 'travel' },
        { spanish: 'pasaporte', type: '名词', chinese: '护照', conjugation: '', example: 'No olvides tu pasaporte.', level: 'A2', category: 'travel' },
        { spanish: 'billete', type: '名词', chinese: '票', conjugation: '', example: 'Compré el billete de avión.', level: 'A2', category: 'travel' },
        { spanish: 'mapa', type: '名词', chinese: '地图', conjugation: '', example: 'Necesito un mapa de la ciudad.', level: 'A2', category: 'travel' },
        { spanish: 'taxi', type: '名词', chinese: '出租车', conjugation: '', example: 'Vamos en taxi.', level: 'A2', category: 'travel' },
        { spanish: 'estación', type: '名词', chinese: '车站', conjugation: '', example: 'La estación de tren está cerca.', level: 'A2', category: 'travel' },
        { spanish: 'turista', type: '名词', chinese: '游客', conjugation: '', example: 'Hay muchos turistas en verano.', level: 'A2', category: 'travel' },
        
        // 商务 B1
        { spanish: 'reunión', type: '名词', chinese: '会议', conjugation: '', example: 'Tenemos una reunión a las 3.', level: 'B1', category: 'business' },
        { spanish: 'empresa', type: '名词', chinese: '公司', conjugation: '', example: 'Trabajo en una empresa internacional.', level: 'B1', category: 'business' },
        { spanish: 'contrato', type: '名词', chinese: '合同', conjugation: '', example: 'Firma el contrato, por favor.', level: 'B1', category: 'business' },
        { spanish: 'cliente', type: '名词', chinese: '客户', conjugation: '', example: 'El cliente está muy satisfecho.', level: 'B1', category: 'business' },
        { spanish: 'proyecto', type: '名词', chinese: '项目', conjugation: '', example: 'Estamos trabajando en un nuevo proyecto.', level: 'B1', category: 'business' },
        { spanish: 'presupuesto', type: '名词', chinese: '预算', conjugation: '', example: 'El presupuesto es limitado.', level: 'B1', category: 'business' },
        
        // DELE真题 B2
        { spanish: 'desarrollar', type: '动词', chinese: '发展，开发', conjugation: 'yo desarrollo, tú desarrollas, él desarrolla', example: 'Desarrollamos nuevas tecnologías.', level: 'B2', category: 'dele', isHighFreq: true },
        { spanish: 'investigación', type: '名词', chinese: '调查，研究', conjugation: '', example: 'La investigación duró tres años.', level: 'B2', category: 'dele', isHighFreq: true },
        { spanish: 'impacto', type: '名词', chinese: '影响', conjugation: '', example: 'El impacto ambiental es enorme.', level: 'B2', category: 'dele', isHighFreq: true },
        { spanish: 'sostenible', type: '形容词', chinese: '可持续的', conjugation: '', example: 'El desarrollo sostenible es importante.', level: 'B2', category: 'dele', isHighFreq: true },
        { spanish: 'conciencia', type: '名词', chinese: '意识，觉悟', conjugation: '', example: 'Hay que concienciar a la gente.', level: 'B2', category: 'dele', isHighFreq: true }
    ];
    
    sampleWords.forEach(word => {
        addWord(word);
    });
    
    return sampleWords.length;
}

// 初始化语音（部分浏览器需要先加载语音列表）
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}
