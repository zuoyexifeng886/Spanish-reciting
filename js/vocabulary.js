/**
 * 词库管理页面逻辑
 */

let currentCategory = 'all';
let currentLevel = 'all';
let currentSearch = '';
let editingWordId = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initCategoryTabs();
    initLevelFilter();
    initSearch();
    renderWordList();
});

/**
 * 初始化分类标签
 */
function initCategoryTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            renderWordList();
        });
    });
}

/**
 * 初始化难度筛选
 */
function initLevelFilter() {
    const select = document.getElementById('levelFilter');
    if (select) {
        select.addEventListener('change', function() {
            currentLevel = this.value;
            renderWordList();
        });
    }
}

/**
 * 初始化搜索
 */
function initSearch() {
    const input = document.getElementById('searchInput');
    if (input) {
        input.addEventListener('input', function() {
            currentSearch = this.value.trim();
            renderWordList();
        });
    }
}

/**
 * 渲染单词列表
 */
function renderWordList() {
    const wordList = document.getElementById('wordList');
    const emptyState = document.getElementById('emptyState');
    let words = getAllWords();
    
    // 分类筛选
    if (currentCategory !== 'all') {
        words = words.filter(w => w.category === currentCategory);
    }
    
    // 难度筛选
    if (currentLevel !== 'all') {
        words = words.filter(w => w.level === currentLevel);
    }
    
    // 搜索筛选
    if (currentSearch) {
        const search = currentSearch.toLowerCase();
        words = words.filter(w => 
            w.spanish.toLowerCase().includes(search) || 
            w.chinese.includes(search)
        );
    }
    
    if (words.length === 0) {
        wordList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    wordList.innerHTML = words.map(word => `
        <div class="word-item">
            <div class="word-info">
                <div class="word-es">${word.spanish}</div>
                <div class="word-cn">${word.chinese}</div>
                <div class="word-meta">
                    <span class="word-tag level-${word.level}">${word.level}</span>
                    ${word.isHighFreq ? '<span class="word-tag">⭐ 高频</span>' : ''}
                    ${word.type ? `<span class="word-tag">${word.type}</span>` : ''}
                </div>
            </div>
            <div class="word-actions">
                <button class="word-action-btn" onclick="playWordPronounce('${word.id}')" title="发音">🔊</button>
                <button class="word-action-btn" onclick="editWord('${word.id}')" title="编辑">✏️</button>
                <button class="word-action-btn" onclick="deleteWordConfirm('${word.id}')" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

/**
 * 播放单词发音
 */
function playWordPronounce(wordId) {
    const word = getWordById(wordId);
    if (word) {
        pronounceSpanish(word.spanish);
    }
}

/**
 * 打开添加单词弹窗
 */
function showAddWordModal() {
    editingWordId = null;
    document.getElementById('modalTitle').textContent = '添加单词';
    document.getElementById('wordForm').reset();
    document.getElementById('wordModal').style.display = 'flex';
}

/**
 * 编辑单词
 */
function editWord(wordId) {
    const word = getWordById(wordId);
    if (!word) return;
    
    editingWordId = wordId;
    document.getElementById('modalTitle').textContent = '编辑单词';
    document.getElementById('spanishInput').value = word.spanish;
    document.getElementById('typeInput').value = word.type;
    document.getElementById('chineseInput').value = word.chinese;
    document.getElementById('conjugationInput').value = word.conjugation;
    document.getElementById('exampleInput').value = word.example;
    document.getElementById('levelInput').value = word.level;
    document.getElementById('categoryInput').value = word.category;
    document.getElementById('highFreqInput').checked = word.isHighFreq;
    
    document.getElementById('wordModal').style.display = 'flex';
}

/**
 * 关闭弹窗
 */
function closeWordModal() {
    document.getElementById('wordModal').style.display = 'none';
    editingWordId = null;
}

/**
 * 保存单词
 */
function saveWord() {
    const spanish = document.getElementById('spanishInput').value.trim();
    const chinese = document.getElementById('chineseInput').value.trim();
    
    if (!spanish || !chinese) {
        alert('请填写西语单词和中文释义');
        return;
    }
    
    const wordData = {
        spanish: spanish,
        type: document.getElementById('typeInput').value.trim(),
        chinese: chinese,
        conjugation: document.getElementById('conjugationInput').value.trim(),
        example: document.getElementById('exampleInput').value.trim(),
        level: document.getElementById('levelInput').value,
        category: document.getElementById('categoryInput').value,
        isHighFreq: document.getElementById('highFreqInput').checked
    };
    
    if (editingWordId) {
        updateWord(editingWordId, wordData);
    } else {
        addWord(wordData);
    }
    
    closeWordModal();
    renderWordList();
}

/**
 * 确认删除单词
 */
function deleteWordConfirm(wordId) {
    if (confirm('确定要删除这个单词吗？')) {
        deleteWord(wordId);
        renderWordList();
    }
}

/**
 * 导入Excel（CSV）词库
 */
function importVocabulary() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const lines = content.split('\n').filter(line => line.trim());
                
                // 跳过表头
                const startIndex = lines[0].includes('单词') || lines[0].includes('spanish') ? 1 : 0;
                
                let imported = 0;
                for (let i = startIndex; i < lines.length; i++) {
                    const parts = parseCSVLine(lines[i]);
                    if (parts.length >= 2) {
                        addWord({
                            spanish: parts[0].replace(/^"|"$/g, '').trim(),
                            type: parts[1] ? parts[1].replace(/^"|"$/g, '').trim() : '',
                            chinese: parts[2] ? parts[2].replace(/^"|"$/g, '').trim() : '',
                            conjugation: parts[3] ? parts[3].replace(/^"|"$/g, '').trim() : '',
                            example: parts[4] ? parts[4].replace(/^"|"$/g, '').trim() : '',
                            level: parts[5] ? parts[5].replace(/^"|"$/g, '').trim() : 'A1',
                            category: parts[6] ? parts[6].replace(/^"|"$/g, '').trim() : 'daily'
                        });
                        imported++;
                    }
                }
                
                alert(`成功导入 ${imported} 个单词`);
                renderWordList();
            } catch (err) {
                alert('导入失败：' + err.message);
            }
        };
        reader.readAsText(file, 'UTF-8');
    };
    
    input.click();
}

/**
 * 解析CSV行（处理引号内的逗号）
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    return result;
}

/**
 * 导出词库
 */
function exportVocabulary() {
    exportWordsToCSV();
}

/**
 * 加载示例词库
 */
function loadSampleVocabulary() {
    if (getAllWords().length > 0) {
        if (!confirm('当前已有单词，是否继续加载示例词库？')) {
            return;
        }
    }
    
    const count = loadSampleWords();
    alert(`成功加载 ${count} 个示例单词`);
    renderWordList();
}

// 点击弹窗外部关闭
document.addEventListener('click', function(e) {
    const modal = document.getElementById('wordModal');
    if (e.target === modal) {
        closeWordModal();
    }
});
