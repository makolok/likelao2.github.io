let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let isAnswered = false; 

let correctCount = 0;
let wrongCount = 0;
let wrongQuestionsList = []; 
let currentCategoryFile = 'ABC.txt';
let currentMode = 'quiz'; 
let hasSkipped = false; 

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startApp(mode) {
    currentMode = mode;
    hasSkipped = false; 
    
    const homeSelect = document.getElementById('homeCategory');
    if (homeSelect) {
        currentCategoryFile = homeSelect.value;
        const innerSelect = document.getElementById('licenseCategory');
        if (innerSelect) innerSelect.value = currentCategoryFile;
    }

    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.style.display = 'none';

    const wrapper = document.getElementById('main-quiz-wrapper');
    if (wrapper) wrapper.style.display = 'flex';

    const appBody = document.getElementById('app-body');
    const quizBox = document.getElementById('main-quiz-box');
    const subHeader = document.getElementById('sub-header-bar');
    const modeHeader = document.getElementById('mode-header-title');

    if (currentMode === 'study') {
        if (appBody) appBody.style.backgroundColor = '#bbdefb';
        if (quizBox) {
            quizBox.style.backgroundColor = '#e3f2fd';
            quizBox.style.borderColor = '#64b5f6';
        }
        if (subHeader) subHeader.style.borderColor = '#42a5f5';
        if (modeHeader) modeHeader.style.color = '#1565c0';
    } else if (currentMode === 'quiz') {
        if (appBody) appBody.style.backgroundColor = '#c8e6c9';
        if (quizBox) {
            quizBox.style.backgroundColor = '#e8f5e9';
            quizBox.style.borderColor = '#81c784';
        }
        if (subHeader) subHeader.style.borderColor = '#66bb6a';
        if (modeHeader) modeHeader.style.color = '#2e7d32';
    } else if (currentMode === 'random') {
        if (appBody) appBody.style.backgroundColor = '#fff9c4';
        if (quizBox) {
            quizBox.style.backgroundColor = '#fffde7';
            quizBox.style.borderColor = '#ffd54f';
        }
        if (subHeader) subHeader.style.borderColor = '#ffca28';
        if (modeHeader) modeHeader.style.color = '#f57f17';
    }

    const scoreBoard = document.getElementById('live-score-board');
    if (scoreBoard) {
        scoreBoard.style.display = (currentMode === 'study') ? 'none' : 'flex';
    }

    fetchQuestions(currentCategoryFile, false);
}

function goHome() {
    const wrapper = document.getElementById('main-quiz-wrapper');
    if (wrapper) wrapper.style.display = 'none';

    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.style.display = 'block';

    const appBody = document.getElementById('app-body');
    if (appBody) appBody.style.backgroundColor = '';

    const quizBox = document.getElementById('main-quiz-box');
    if (quizBox) {
        quizBox.style.backgroundColor = '';
        quizBox.style.borderColor = '';
    }
}

async function fetchQuestions(filename, isRestoring = false) {
    currentCategoryFile = filename;
    
    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) resultScreen.style.display = 'none';

    const quizScreen = document.getElementById('quiz-screen');
    if (quizScreen) quizScreen.style.display = 'flex';

    const questionText = document.getElementById('question-text');
    if (questionText) questionText.innerText = 'ກຳລັງໂຫຼດຂໍ້ສອບຈາກ ' + filename + '...';

    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) optionsContainer.innerHTML = '';

    const imgContainer = document.getElementById('image-container');
    if (imgContainer) imgContainer.innerHTML = '';
    
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error('ไม่พบไฟล์ ' + filename);
        }
        const textData = await response.text();
        
        if (currentMode === 'review_wrong') {
            const savedWrong = localStorage.getItem('lao_quiz_wrong_' + filename);
            if (savedWrong) {
                quizQuestions = JSON.parse(savedWrong);
            } else {
                quizQuestions = [];
            }
            currentQuestionIndex = 0;
            userAnswers = {};
            correctCount = 0;
            wrongCount = 0;
        } else {
            quizQuestions = parseCsvInsideTxt(textData);
            
            if (!isRestoring) {
                const storageKey = 'lao_quiz_state_' + currentMode + '_' + filename;
                const savedData = localStorage.getItem(storageKey);
                if (savedData) {
                    const data = JSON.parse(savedData);
                    currentQuestionIndex = data.currentQuestionIndex || 0;
                    userAnswers = data.userAnswers || {};
                    correctCount = data.correctCount || 0;
                    wrongCount = data.wrongCount || 0;
                    if (currentMode === 'random' && data.quizQuestions) {
                        quizQuestions = data.quizQuestions;
                    }
                } else {
                    currentQuestionIndex = 0;
                    userAnswers = {};
                    correctCount = 0;
                    wrongCount = 0;
                    if (currentMode === 'random') {
                        shuffleArray(quizQuestions);
                    }
                }
            } else {
                if (currentMode === 'random') {
                    shuffleArray(quizQuestions);
                }
            }
        }
        
        isAnswered = (currentMode === 'study') ? true : (userAnswers[currentQuestionIndex] !== undefined);
        updateLiveScore();
        
        if (quizQuestions.length > 0) {
            loadQuestion();
        } else {
            if (questionText) questionText.innerText = 'ບໍ່ມີຂໍ້ສອບທີ່ຜິດໃຫ້ແກ້';
            const nextBtn = document.getElementById('btn-next');
            if(nextBtn) nextBtn.style.display = 'none';
        }
    } catch (error) {
        console.error(error);
        if (questionText) questionText.innerText = 'เกิดข้อผิดพลาดในการโหลดไฟล์ ' + filename;
    }
}

function parseCsvInsideTxt(text) {
    const questions = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        if (!line.trim()) return;

        let parts = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            let char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim().replace(/^"|"$/g, ''));

        if (parts.length < 6) return;

        const qText = parts[0];
        let ansNum = 1;
        try {
            ansNum = parseInt(parts[1]) || 1;
        } catch(e) {
            ansNum = 1;
        }
        const ansIndex = ansNum - 1;

        let options = [];
        for (let i = 2; i <= 5; i++) {
            if (parts[i]) {
                let opt = parts[i];
                if (opt && opt !== '-') {
                    options.push(opt);
                }
            }
        }

        let imagePath = null;
        for (let i = 6; i < parts.length; i++) {
            let p = parts[i];
            if (p.endsWith('.png') || p.endsWith('.jpg')) {
                imagePath = p.startsWith('http') ? p : p;
                break;
            }
        }

        if (qText && options.length > 0) {
            questions.push({
                id: questions.length + 1,
                question: qText,
                image: imagePath,
                options: options,
                answer: ansIndex
            });
        }
    });

    return questions;
}

function changeCategory() {
    const selectElement = document.getElementById('licenseCategory');
    if (!selectElement) return;
    const selectedFile = selectElement.value;
    
    const homeSelect = document.getElementById('homeCategory');
    if (homeSelect) homeSelect.value = selectedFile;

    fetchQuestions(selectedFile, false);
}

function saveQuizState() {
    if (currentMode === 'review_wrong') return;
    if (hasSkipped) {
        localStorage.removeItem('lao_quiz_state_' + currentMode + '_' + currentCategoryFile);
        return;
    }
    const stateData = {
        currentQuestionIndex: currentQuestionIndex,
        userAnswers: userAnswers,
        correctCount: correctCount,
        wrongCount: wrongCount,
        quizQuestions: (currentMode === 'random') ? quizQuestions : undefined
    };
    localStorage.setItem('lao_quiz_state_' + currentMode + '_' + currentCategoryFile, JSON.stringify(stateData));
}

function loadQuestion() {
    if (quizQuestions.length === 0) return;

    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) resultScreen.style.display = 'none';

    const quizScreen = document.getElementById('quiz-screen');
    if (quizScreen) quizScreen.style.display = 'flex';

    const nextBtn = document.getElementById('btn-next');
    if(nextBtn) nextBtn.style.display = 'block';

    const q = quizQuestions[currentQuestionIndex];
    
    if (currentMode === 'study') {
        isAnswered = true;
    } else {
        isAnswered = userAnswers[currentQuestionIndex] !== undefined;
    }

    const qCount = document.getElementById('question-count');
    if (qCount) qCount.innerText = `ຄຳຖາມທີ ${currentQuestionIndex + 1} ຈາກ ${quizQuestions.length}`;

    const qText = document.getElementById('question-text');
    if (qText) qText.innerText = q.question;

    const imgContainer = document.getElementById('image-container');
    if (imgContainer) {
        if (q.image) {
            imgContainer.innerHTML = `<img src="${q.image}" alt="Traffic Sign">`;
        } else {
            imgContainer.innerHTML = '';
        }
    }

    const optionsContainer = document.getElementById('options-container');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';

        const laoLetters = ['ກ', 'ຂ', 'ຄ', 'ງ'];

        q.options.forEach((opt, idx) => {
            const isChecked = userAnswers[currentQuestionIndex] === idx;
            let extraClass = '';

            if (currentMode === 'study') {
                if (idx === q.answer) {
                    extraClass = 'correct-option';
                }
            } else {
                if (isAnswered) {
                    if (idx === q.answer) {
                        extraClass = 'correct-option'; 
                    } else if (isChecked && idx !== q.answer) {
                        extraClass = 'wrong-option';    
                    }
                }
            }

            const letterLabel = laoLetters[idx] || (idx + 1);

            const optionHTML = `
                <label class="option-label ${extraClass}" onclick="selectOption(${idx})" style="cursor: pointer;">
                    <input type="radio" name="option" value="${idx}" ${isChecked ? 'checked' : ''} ${isAnswered && currentMode !== 'study' ? 'disabled' : ''} style="display: none;">
                    <span style="font-weight: bold; margin-right: 10px; font-size: 1.05rem;">${letterLabel}.</span>
                    <span>${opt}</span>
                </label>
            `;
            optionsContainer.innerHTML += optionHTML;
        });
    }

    if (nextBtn) {
        if (currentQuestionIndex === quizQuestions.length - 1) {
            nextBtn.innerText = (currentMode === 'study') ? 'เสร็จสิ้น' : 'ສົ່ງຂໍ້ສອບ';
            nextBtn.className = 'btn-submit';
        } else {
            nextBtn.innerText = 'ຕໍ່ໄປ';
            nextBtn.className = 'btn-next';
        }

        if (currentMode !== 'study' && !isAnswered) {
            nextBtn.style.opacity = '0.5';
            nextBtn.style.cursor = 'not-allowed';
        } else {
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
        }
    }

    saveQuizState();
}

function selectOption(index) {
    if (currentMode === 'study') return;
    if (isAnswered) return; 

    userAnswers[currentQuestionIndex] = index;
    isAnswered = true;

    const q = quizQuestions[currentQuestionIndex];
    if (index === q.answer) {
        correctCount++;
    } else {
        wrongCount++;
        if (!wrongQuestionsList.some(item => item.question === q.question)) {
            wrongQuestionsList.push(q);
        }
    }
    updateLiveScore();
    saveQuizState();

    loadQuestion(); 
}

function updateLiveScore() {
    const correctEl = document.getElementById('live-correct');
    const wrongEl = document.getElementById('live-wrong');
    if (correctEl) correctEl.innerText = correctCount;
    if (wrongEl) wrongEl.innerText = wrongCount;
}

function nextQuestion() {
    if (currentMode !== 'study' && !isAnswered) {
        alert('ກະລຸນາເລືອກຄຳຕອບກ່ອນກົດໄປຂໍ້ถัดไป!');
        return;
    }

    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        saveQuizState();
        loadQuestion();
    } else {
        if (currentMode === 'study') {
            showStudyCompleteScreen();
        } else {
            showResults();
        }
    }
}

function jumpToLastQuestion() {
    if (quizQuestions.length === 0) return;
    
    hasSkipped = true;

    currentQuestionIndex = quizQuestions.length - 1;
    loadQuestion();
}

function showStudyCompleteScreen() {
    const quizScreen = document.getElementById('quiz-screen');
    if (quizScreen) quizScreen.style.display = 'none';

    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) resultScreen.style.display = 'block';
    
    const finalScore = document.getElementById('final-score');
    const scoreMsg = document.getElementById('score-message');
    const actionButtons = document.getElementById('result-action-buttons');

    if (hasSkipped) {
        if (finalScore) finalScore.innerHTML = '⚠️ ທ່ານໄດ້ກົດຂ້າມ (ມີການກົດຂ້າມ)';
        if (scoreMsg) scoreMsg.innerHTML = '⚠️ ທ່ານໄດ້ກົດຂ້າມຂັ້ນຕອນ! ລະບົບເຕືອນ: ຖືວ່າອ່ານບໍ່ຈົບ ຕ້ອງທົບທວນໃໝ່';
        
        localStorage.removeItem('lao_quiz_state_study_' + currentCategoryFile);

        if (actionButtons) {
            actionButtons.innerHTML = `
                <button onclick="startApp('study')" style="padding: 12px; font-size: 0.95rem; font-weight: bold; background-color: #e67e22; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                    🔄  ເລີ່ມຕົ້ນໃໝ່
                </button>
                <button onclick="goHome()" style="padding: 10px; font-size: 0.9rem; font-weight: bold; background-color: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                    🏠 ກຼັບຄືນໜ້າທຳອິດ
                </button>
            `;
        }
        return;
    } else {
        if (finalScore) finalScore.innerHTML = '🎉 ທ່ານອ່ານທົບທວນຄຳຖາມຈົບໝົດທຸກຂໍ້ແລ້ວ!';
        if (scoreMsg) scoreMsg.innerHTML = 'ຢາກລອງທົດສອບຄວາມຮູ້ໃນໂໝດສອບເສັງ (ຄິດຄະແນນ) ເລີຍບໍ່?';
    }
    
    if (actionButtons) {
        actionButtons.innerHTML = `
            <button onclick="startApp('quiz')" style="padding: 12px; font-size: 0.95rem; font-weight: bold; background-color: #1b5e20; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                📝 ເລີ່ມເຂົ້າສູ່ໂໝດສອບເສັງເລີຍ
            </button>
            <button onclick="goHome()" style="padding: 10px; font-size: 0.9rem; font-weight: bold; background-color: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                🏠 กลับໄປหน้าหลัก
            </button>
        `;
    }
}

function showResults() {
    const quizScreen = document.getElementById('quiz-screen');
    if (quizScreen) quizScreen.style.display = 'none';

    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) resultScreen.style.display = 'block';
    
    const actionButtons = document.getElementById('result-action-buttons');
    let reviewButtonHtml = '';

    const finalScore = document.getElementById('final-score');
    const scoreMsg = document.getElementById('score-message');

    if (hasSkipped) {
        if (finalScore) finalScore.innerText = `❌ ສອບເສັງບໍ່ຜ່ານ (ມີການກົດຂ້າມ)`;
        if (scoreMsg) scoreMsg.innerText = `⚠️ ທ່ານໄດ້ກົດຂ້າມ! ລະບົບເຕືອນ: ສອບບໍ່ຜ່ານ ຕ້ອງສອບເສັງໃໝ່!`;
        wrongCount = 999; 
        
        localStorage.removeItem('lao_quiz_state_' + currentMode + '_' + currentCategoryFile);

        if (actionButtons) {
            actionButtons.innerHTML = `
                <button onclick="startApp('${currentMode}')" style="padding: 12px; font-size: 0.95rem; font-weight: bold; background-color: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                    🔄 ເລີ່ມຕົ້ນໃໝ່
                </button>
                <button onclick="goHome()" style="padding: 10px; font-size: 0.9rem; font-weight: bold; background-color: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                    🏠 ກຼັບຄືນໜ້າທຳອິດ
                </button>
            `;
        }
        return;
    } else {
        if (finalScore) finalScore.innerText = `ຜິດພາດ: ${wrongCount} ຂໍ້ (ຈາກ ${quizQuestions.length} ຂໍ້)`;

        const isPassed = wrongCount <= 10;
        const msg = isPassed
            ? `🎉 ຍິນດີດ້ວຍ! ທ່ານຜ່ານການສອບເສັງ (ຜິດ ${wrongCount} ຂໍ້ ເຊິ່ງບໍ່ເກີນເກນ 10 ຂໍ້)`
            : `❌ ທ່ານບໍ່ຜ່ານການສອບເສັງ (ຜິດ ${wrongCount} ຂໍ້ ເຊິ່ງເກີນເກນ 10 ຂໍ້)`;
        if (scoreMsg) scoreMsg.innerText = msg;
    }

    if (wrongQuestionsList.length > 0) {
        localStorage.setItem('lao_quiz_wrong_' + currentCategoryFile, JSON.stringify(wrongQuestionsList));
    }

    if (!hasSkipped) {
        localStorage.removeItem('lao_quiz_state_' + currentMode + '_' + currentCategoryFile);
    }

    if (wrongQuestionsList.length > 0 && !hasSkipped) {
        reviewButtonHtml = `
            <button onclick="startApp('review_wrong')" style="padding: 12px; font-size: 0.95rem; font-weight: bold; background-color: #c0392b; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                🔄 ໄປແກ້ສະເພາະຂໍ້ທີ່ຜິດ (${wrongQuestionsList.length} ຂໍ້)
            </button>
        `;
    }

    if (actionButtons) {
        actionButtons.innerHTML = `
            ${reviewButtonHtml}
            <button onclick="restartQuiz()" class="btn-restart" style="width: 100%;">ເລີ່ມສອບໃໝ່</button>
            <button onclick="goHome()" style="padding: 10px; font-size: 0.9rem; font-weight: bold; background-color: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                🏠 ກຼັບຄືນໜ້າທຳອິດ
            </button>
        `;
    }
}

function restartQuiz() {
    localStorage.removeItem('lao_quiz_state_' + currentMode + '_' + currentCategoryFile);
    isAnswered = false;
    correctCount = 0;
    wrongCount = 0;
    hasSkipped = false;
    wrongQuestionsList = [];
    updateLiveScore();
    goHome();
}

window.onload = function() {
    const selectElement = document.getElementById('licenseCategory');
    const initialFile = selectElement ? selectElement.value : 'ABC.txt';
    currentCategoryFile = initialFile;
};