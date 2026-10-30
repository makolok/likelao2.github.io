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

function getCompletedRounds(mode, filename) {
    if (mode === 'study') return 0;
    const key = `lao_quiz_rounds_${mode}_${filename}`;
    return parseInt(localStorage.getItem(key)) || 0;
}

function incrementCompletedRounds(mode, filename) {
    if (mode === 'study') return;
    const key = `lao_quiz_rounds_${mode}_${filename}`;
    let rounds = parseInt(localStorage.getItem(key)) || 0;
    rounds++;
    localStorage.setItem(key, rounds);
    return rounds;
}

function updateRoundBanner() {
    const banner = document.getElementById('round-counter-banner');
    const countSpan = document.getElementById('completed-rounds-count');
    if (!banner || !countSpan) return;

    if (currentMode === 'quiz' || currentMode === 'random') {
        banner.style.display = 'block';
        const rounds = getCompletedRounds(currentMode, currentCategoryFile);
        countSpan.innerText = rounds;
    } else {
        banner.style.display = 'none';
    }
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

    const quizBox = document.getElementById('main-quiz-box');

    // 🎨 เปลี่ยนสีกล่องตามหมวด (ตัวหนังสือในกล่องทั้งหมดบังคับเป็นสีขาว)
    if (currentMode === 'study') {
        if (quizBox) {
            quizBox.style.backgroundColor = '#18181b'; // หมวด 1: สีดำ/เทาเข้ม
            quizBox.style.color = '#ffffff';
        }
    } else if (currentMode === 'quiz') {
        if (quizBox) {
            quizBox.style.backgroundColor = '#713f12'; // หมวด 2: สีเหลืองเข้ม/น้ำตาลทอง
            quizBox.style.color = '#ffffff';
        }
    } else if (currentMode === 'random') {
        if (quizBox) {
            quizBox.style.backgroundColor = '#581c87'; // หมวด 3: สีม่วงเข้ม
            quizBox.style.color = '#ffffff';
        }
    }

    const scoreBoard = document.getElementById('live-score-board');
    if (scoreBoard) {
        scoreBoard.style.display = (currentMode === 'study') ? 'none' : 'flex';
    }

    updateRoundBanner();
    fetchQuestions(currentCategoryFile, false);
}

function goHome() {
    const wrapper = document.getElementById('main-quiz-wrapper');
    if (wrapper) wrapper.style.display = 'none';

    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.style.display = 'block';

    const quizBox = document.getElementById('main-quiz-box');
    if (quizBox) {
        quizBox.style.backgroundColor = '#1e3a8a'; // หน้าแรก: สีน้ำเงิน
        quizBox.style.color = '#ffffff';
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
        updateRoundBanner();
        
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
                <label class="option-label ${extraClass}" onclick="selectOption(${idx})" style="cursor: pointer; color: #ffffff;">
                    <input type="radio" name="option" value="${idx}" ${isChecked ? 'checked' : ''} ${isAnswered && currentMode !== 'study' ? 'disabled' : ''} style="display: none;">
                    <span style="font-weight: bold; margin-right: 8px;">${letterLabel}.</span>
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
            incrementCompletedRounds(currentMode, currentCategoryFile);
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
                <button onclick="startApp('study')" style="padding: 11px; font-size: 0.9rem; font-weight: bold; background: #0284c7; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                    🔄 ເລີ່ມຕົ້ນໃໝ່
                </button>
                <button onclick="goHome()" style="padding: 10px; font-size: 0.85rem; font-weight: bold; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
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
            <button onclick="startApp('quiz')" style="padding: 11px; font-size: 0.9rem; font-weight: bold; background: #0284c7; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                📝 ເລີ່ມເຂົ້າສູ່ໂໝດສອບເສັງເລີຍ
            </button>
            <button onclick="goHome()" style="padding: 10px; font-size: 0.85rem; font-weight: bold; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                🏠 กลับไปหน้าหลัก
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
    const resultRoundDisplay = document.getElementById('result-round-display');

    const totalRounds = getCompletedRounds(currentMode, currentCategoryFile);
    if (resultRoundDisplay) {
        resultRoundDisplay.innerHTML = `🔄 ທ່ານເຮັດຈົບຮອບນີ້ແລ້ວ | <strong>ລວມທັງໝົດ: ${totalRounds} ຮອບ</strong>`;
    }

    if (hasSkipped) {
        if (finalScore) finalScore.innerText = `❌ ສອບເສັງບໍ່ຜ່ານ (ມີການກົດຂ້າມ)`;
        if (scoreMsg) scoreMsg.innerText = `⚠️ ທ່ານໄດ້ກົດຂ້າມ! ລະບົບເຕືອນ: ສອບບໍ່ຜ່ານ ຕ້ອງສອບເສັງໃໝ່!`;
        wrongCount = 999; 
        
        localStorage.removeItem('lao_quiz_state_' + currentMode + '_' + currentCategoryFile);

        if (actionButtons) {
            actionButtons.innerHTML = `
                <button onclick="startApp('${currentMode}')" style="padding: 11px; font-size: 0.9rem; font-weight: bold; background: #0284c7; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                    🔄 ເລີ່ມຕົ້ນໃໝ່
                </button>
                <button onclick="goHome()" style="padding: 10px; font-size: 0.85rem; font-weight: bold; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
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
            <button onclick="startApp('review_wrong')" style="padding: 11px; font-size: 0.9rem; font-weight: bold; background: #0284c7; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                🔄 ໄປແກ້ສະເພາະຂໍ້ທີ່ຜິດ (${wrongQuestionsList.length} ຂໍ້)
            </button>
        `;
    }

    if (actionButtons) {
        actionButtons.innerHTML = `
            ${reviewButtonHtml}
            <button onclick="restartQuiz()" class="btn-restart" style="width: 100%; background: #0284c7;">ເລີ່ມສອບໃໝ່</button>
            <button onclick="goHome()" style="padding: 10px; font-size: 0.85rem; font-weight: bold; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                🏠 กลับไปหน้าหลัก
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