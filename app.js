let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let isAnswered = false; 

let correctCount = 0;
let wrongCount = 0;
let currentCategoryFile = 'ABC.txt';
let currentMode = 'quiz'; // 'quiz' (โหมดสอบ) หรือ 'study' (โหมดเรียนรู้เฉลยทันที)

// เริ่มต้นแอปเมื่อเลือกโหมดจากหน้าแรก
function startApp(mode) {
    currentMode = mode;
    const homeSelect = document.getElementById('homeCategory');
    if (homeSelect) {
        currentCategoryFile = homeSelect.value;
        const innerSelect = document.getElementById('licenseCategory');
        if (innerSelect) innerSelect.value = currentCategoryFile;
    }

    // ซ่อนหน้าหลัก สลับแสดงหน้า Quiz Wrapper แบบ flex
    document.getElementById('home-screen').style.display = 'none';
    const wrapper = document.getElementById('main-quiz-wrapper');
    wrapper.style.display = 'flex';

    // ซ่อนคะแนนสดถ้าอยู่ในโหมดเรียนรู้
    const scoreBoard = document.getElementById('live-score-board');
    if (scoreBoard) {
        scoreBoard.style.display = (currentMode === 'study') ? 'none' : 'flex';
    }

    fetchQuestions(currentCategoryFile, false);
}

// กลับสู่หน้าหลัก
function goHome() {
    document.getElementById('main-quiz-wrapper').style.display = 'none';
    document.getElementById('home-screen').style.display = 'block';
}

async function fetchQuestions(filename, isRestoring = false) {
    currentCategoryFile = filename;
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'flex';
    document.getElementById('question-text').innerText = 'ກຳລັງໂຫຼດຂໍ້ສອບຈາກ ' + filename + '...';
    document.getElementById('options-container').innerHTML = '';
    document.getElementById('image-container').innerHTML = '';
    
    try {
        // [แก้ไขแล้ว] ตัดคำว่า 'deta/' ออก ดึงไฟล์จากหน้าแรกโดยตรง
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error('ไม่พบไฟล์ ' + filename);
        }
        const textData = await response.text();
        quizQuestions = parseCsvInsideTxt(textData);
        
        if (!isRestoring && currentMode === 'quiz') {
            const savedData = localStorage.getItem('lao_quiz_state_' + filename);
            if (savedData) {
                const data = JSON.parse(savedData);
                currentQuestionIndex = data.currentQuestionIndex || 0;
                userAnswers = data.userAnswers || {};
                correctCount = data.correctCount || 0;
                wrongCount = data.wrongCount || 0;
            } else {
                currentQuestionIndex = 0;
                userAnswers = {};
                correctCount = 0;
                wrongCount = 0;
            }
        } else if (currentMode === 'study') {
            currentQuestionIndex = 0;
            userAnswers = {};
            correctCount = 0;
            wrongCount = 0;
        }
        
        isAnswered = (currentMode === 'study') ? true : (userAnswers[currentQuestionIndex] !== undefined);
        updateLiveScore();
        
        if (quizQuestions.length > 0) {
            loadQuestion();
        } else {
            document.getElementById('question-text').innerText = 'ບໍ່ພົບຂໍ້ມູນຂໍ້ສອບໃນໄຟລ໌ນີ້';
        }
    } catch (error) {
        console.error(error);
        document.getElementById('question-text').innerText = 'เกิดข้อผิดพลาดในการโหลดไฟล์ ' + filename;
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
                // ถ้ายังเก็บรูปไว้ในโฟลเดอร์ images ให้ใช้ "images/" แต่ถ้าเอาออกมารวมข้างนอก ให้เอา "images/" ออกได้เลยครับ
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
    if (currentMode !== 'quiz') return;
    const stateData = {
        currentQuestionIndex: currentQuestionIndex,
        userAnswers: userAnswers,
        correctCount: correctCount,
        wrongCount: wrongCount
    };
    localStorage.setItem('lao_quiz_state_' + currentCategoryFile, JSON.stringify(stateData));
}

function loadQuestion() {
    if (quizQuestions.length === 0) return;

    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'flex';

    const q = quizQuestions[currentQuestionIndex];
    
    if (currentMode === 'study') {
        isAnswered = true;
    } else {
        isAnswered = userAnswers[currentQuestionIndex] !== undefined;
    }

    document.getElementById('question-count').innerText = `ຄຳຖາມທີ ${currentQuestionIndex + 1} ຈາກ ${quizQuestions.length}`;
    document.getElementById('question-text').innerText = q.question;

    const imgContainer = document.getElementById('image-container');
    if (q.image) {
        imgContainer.innerHTML = `<img src="${q.image}" alt="Traffic Sign">`;
    } else {
        imgContainer.innerHTML = '';
    }

    const optionsContainer = document.getElementById('options-container');
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
                <input type="radio" name="option" value="${idx}" ${isChecked ? 'checked' : ''} ${isAnswered && currentMode === 'quiz' ? 'disabled' : ''} style="display: none;">
                <span style="font-weight: bold; margin-right: 10px; font-size: 1.05rem;">${letterLabel}.</span>
                <span>${opt}</span>
            </label>
        `;
        optionsContainer.innerHTML += optionHTML;
    });

    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
        if (currentQuestionIndex === quizQuestions.length - 1) {
            nextBtn.innerText = (currentMode === 'study') ? 'เสร็จสิ้น' : 'ສົ່ງຂໍ້ສອບ';
            nextBtn.className = 'btn-submit';
        } else {
            nextBtn.innerText = 'ຕໍ່ໄປ';
            nextBtn.className = 'btn-next';
        }

        if (currentMode === 'quiz' && !isAnswered) {
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
    if (currentMode === 'quiz' && !isAnswered) {
        alert('ກະລຸນາເລືອກຄຳຕອບກ່ອນກົດໄປຂໍ້ถັດไป!');
        return;
    }

    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        if (currentMode === 'study') {
            showStudyCompleteScreen();
        } else {
            showResults();
        }
    }
}

function showStudyCompleteScreen() {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    
    document.getElementById('final-score').innerHTML = '🎉 ທ່ານອ່ານທົບທວນຄຳຖາມຈົບໝົດທຸກຂໍ້ແລ້ວ!';
    document.getElementById('score-message').innerHTML = 'ຢາກລອງທົດສອບຄວາມຮູ້ໃນໂໝດສອບເສັງ (ຄິດຄະແນນ) ເລີຍບໍ່?';
    
    const resultContainer = document.getElementById('result-screen');
    
    let actionButtons = document.getElementById('study-action-buttons');
    if (!actionButtons) {
        actionButtons = document.createElement('div');
        actionButtons.id = 'study-action-buttons';
        actionButtons.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 15px;';
        resultContainer.appendChild(actionButtons);
    }

    actionButtons.innerHTML = `
        <button onclick="startApp('quiz')" style="padding: 12px; font-size: 0.95rem; font-weight: bold; background-color: #1b5e20; color: white; border: none; border-radius: 8px; cursor: pointer;">
            📝 ເລີ່ມເຂົ້າສູ່ໂໝດສອບເສັງເລີຍ
        </button>
        <button onclick="goHome()" style="padding: 10px; font-size: 0.9rem; font-weight: bold; background-color: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer;">
            🏠 ກັບໄປໜ້າຫຼັກ
        </button>
    `;
    
    const oldRestartBtn = resultContainer.querySelector('.btn-restart');
    if (oldRestartBtn) oldRestartBtn.style.display = 'none';
}

function showResults() {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    
    document.getElementById('final-score').innerText = `${correctCount} / ${quizQuestions.length}`;

    const passThreshold = Math.ceil(quizQuestions.length * 0.8);
    const msg = correctCount >= passThreshold
        ? '🎉 ຍິນດີດ້ວຍ! ທ່ານຜ່ານການສອບເສັງ'
        : '❌ ທ່ານບໍ່ຜ່ານການສອບເສັງ ກະລຸນາລອງໃໝ່ອີກຄັ້ງ';
    document.getElementById('score-message').innerText = msg;

    localStorage.removeItem('lao_quiz_state_' + currentCategoryFile);
}

function restartQuiz() {
    localStorage.removeItem('lao_quiz_state_' + currentCategoryFile);
    isAnswered = false;
    correctCount = 0;
    wrongCount = 0;
    updateLiveScore();
    goHome();
}

window.onload = function() {
    const selectElement = document.getElementById('licenseCategory');
    const initialFile = selectElement ? selectElement.value : 'ABC.txt';
    currentCategoryFile = initialFile;
};