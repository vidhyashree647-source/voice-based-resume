/**
 * VoiceResume AI - Voice-Based Resume Builder Engine
 * Text & Speech Analysis College Project
 */

// Global Resume State Data Model
const resumeData = {
    personal: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: ''
    },
    objective: '',
    education: [
        // { degree: '', college: '', year: '', cgpa: '' }
    ],
    skills: [],
    projects: [
        // { name: '', description: '', tech: '' }
    ],
    experience: [
        // { company: '', role: '', duration: '', responsibilities: '' }
    ],
    certifications: [
        // { name: '', org: '', year: '' }
    ],
    achievements: [],
    hobbies: [],
    template: 'modern'
};

// Known Technical Skills Dictionary for NLP Extraction
const TECH_SKILLS_DICTIONARY = [
    'Python', 'Java', 'C++', 'C#', 'C', 'JavaScript', 'TypeScript', 'HTML', 'CSS',
    'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'SQLite', 'Redis',
    'Git', 'GitHub', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud',
    'Machine Learning', 'Deep Learning', 'Data Science', 'Artificial Intelligence',
    'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-Learn', 'OpenCV', 'NLP',
    'Tailwind CSS', 'Bootstrap', 'Sass', 'Figma', 'UI/UX', 'Flutter', 'React Native', 'Android', 'iOS',
    'Linux', 'Bash', 'REST API', 'GraphQL', 'Cybersecurity', 'Agile', 'Jira'
];

// Speech Recognition & App Variables
let recognition = null;
let isRecording = false;
let speechDurationSeconds = 0;
let speechTimerInterval = null;
let totalWordsDetected = 0;
let recognitionConfidence = 91;

// DOM Element References
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    initSpeechRecognition();
    setupEventListeners();
    setupTabNavigation();
    setupTemplateSelector();
    renderResumePreview();
    updateScoreAndAnalytics();
}

/* ==========================================================================
   1. SPEECH RECOGNITION SYSTEM (Web Speech API)
   ========================================================================== */

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const statusLabel = document.getElementById('mic-status-label');
    const micDot = document.getElementById('mic-dot');
    const modalMicStatus = document.getElementById('modal-mic-status');

    if (!SpeechRecognition) {
        updateMicStatusUI('unsupported', 'Web Speech API Not Supported');
        if (modalMicStatus) {
            modalMicStatus.innerHTML = `
                <span class="status-dot warning"></span>
                <span class="status-text">Browser Web Speech API unavailable. Manual typing & Demo mode available!</span>
            `;
        }
        return;
    }

    try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isRecording = true;
            updateMicStatusUI('recording', 'Listening...');
            startSpeechTimer();
            logVoiceCommand('System: Started listening to microphone input...');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptChunk = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptChunk + ' ';
                    if (event.results[i][0].confidence) {
                        recognitionConfidence = Math.round(event.results[i][0].confidence * 100);
                    }
                } else {
                    interimTranscript += transcriptChunk;
                }
            }

            if (finalTranscript.trim()) {
                appendTranscription(finalTranscript);
                processSpokenTextNLP(finalTranscript);
                checkVoiceCommands(finalTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            logVoiceCommand(`Error: ${event.error}`);
            stopRecording();
        };

        recognition.onend = () => {
            if (isRecording) {
                // Restart if continuous recording was unexpectedly interrupted
                try { recognition.start(); } catch (e) { stopRecording(); }
            } else {
                stopRecordingUI();
            }
        };

        updateMicStatusUI('active', 'Mic Ready');
        if (modalMicStatus) {
            modalMicStatus.innerHTML = `
                <span class="status-dot active"></span>
                <span class="status-text">Microphone Ready (Web Speech API Active)</span>
            `;
        }
    } catch (err) {
        console.error('Failed to init speech recognition:', err);
        updateMicStatusUI('unsupported', 'Mic Error');
    }
}

function updateMicStatusUI(state, text) {
    const statusLabel = document.getElementById('mic-status-label');
    const micDot = document.getElementById('mic-dot');
    const recBadge = document.getElementById('rec-status-badge');

    if (statusLabel) statusLabel.textContent = text;

    if (micDot) {
        micDot.className = 'status-dot ' + (state === 'recording' ? 'recording' : state === 'active' ? 'active' : 'inactive');
    }

    if (recBadge) {
        if (state === 'recording') {
            recBadge.textContent = 'Listening...';
            recBadge.className = 'badge badge-live recording';
        } else {
            recBadge.textContent = 'Idle';
            recBadge.className = 'badge badge-live';
        }
    }
}

function toggleRecording() {
    if (!recognition) {
        alert('Web Speech API is not supported in this browser. You can type details manually or click "Try Demo"!');
        return;
    }
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (!recognition) return;
    try {
        isRecording = true;
        recognition.start();
        document.getElementById('btn-toggle-record').classList.add('listening');
        document.getElementById('waveform').classList.add('active');
        document.getElementById('voice-state-desc').textContent = 'Listening... Speak your details or commands now';
        document.getElementById('btn-start-rec').disabled = true;
        document.getElementById('btn-stop-rec').disabled = false;
    } catch (e) {
        console.warn('Recognition start error:', e);
    }
}

function stopRecording() {
    isRecording = false;
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }
    stopRecordingUI();
}

function stopRecordingUI() {
    stopSpeechTimer();
    document.getElementById('btn-toggle-record').classList.remove('listening');
    document.getElementById('waveform').classList.remove('active');
    document.getElementById('voice-state-desc').textContent = 'Click microphone to start listening';
    document.getElementById('btn-start-rec').disabled = false;
    document.getElementById('btn-stop-rec').disabled = true;
    updateMicStatusUI('active', 'Mic Ready');
}

function startSpeechTimer() {
    stopSpeechTimer();
    speechTimerInterval = setInterval(() => {
        speechDurationSeconds++;
        document.getElementById('stat-duration').textContent = speechDurationSeconds + 's';
    }, 1000);
}

function stopSpeechTimer() {
    if (speechTimerInterval) {
        clearInterval(speechTimerInterval);
        speechTimerInterval = null;
    }
}

function appendTranscription(text) {
    const box = document.getElementById('live-transcription-box');
    if (!box) return;

    const currentText = box.innerText || '';
    const updatedText = currentText ? currentText + ' ' + text : text;
    box.innerText = updatedText;

    // Word count calculation
    const words = updatedText.trim().split(/\s+/).filter(Boolean);
    totalWordsDetected = words.length;
    document.getElementById('stat-words').textContent = totalWordsDetected;

    // Highlight keywords visually
    highlightTranscriptionKeywords();
}

function highlightTranscriptionKeywords() {
    const box = document.getElementById('live-transcription-box');
    if (!box) return;

    let text = box.innerText;
    if (!text) return;

    // Highlight found skills in the text box
    TECH_SKILLS_DICTIONARY.forEach(skill => {
        const regex = new RegExp(`\\b(${skill})\\b`, 'gi');
        text = text.replace(regex, `<span class="kw-highlight">$1</span>`);
    });
}

/* ==========================================================================
   2. SMART INFORMATION EXTRACTION (NLP ENGINE)
   ========================================================================== */

function processSpokenTextNLP(text) {
    if (!text) return;
    const lowerText = text.toLowerCase();

    // 1. Extract Skills
    TECH_SKILLS_DICTIONARY.forEach(skill => {
        const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (skillRegex.test(text)) {
            if (!resumeData.skills.includes(skill)) {
                resumeData.skills.push(skill);
                logVoiceCommand(`Extracted Skill: "${skill}"`);
            }
        }
    });

    // 2. Extract Personal Details (Email, Phone, Name)
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    if (emailMatch && !resumeData.personal.email) {
        resumeData.personal.email = emailMatch[0];
        document.getElementById('input-email').value = emailMatch[0];
        logVoiceCommand(`Extracted Email: ${emailMatch[0]}`);
    }

    const phoneMatch = text.match(/(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}|\b\d{10}\b/);
    if (phoneMatch && !resumeData.personal.phone) {
        resumeData.personal.phone = phoneMatch[0];
        document.getElementById('input-phone').value = phoneMatch[0];
        logVoiceCommand(`Extracted Phone: ${phoneMatch[0]}`);
    }

    // Name Extraction heuristic: "My name is Shyam", "I am Shyam", "This is Shyam"
    const nameMatch = text.match(/(?:my name is|i am|this is)\s+([a-zA-Z\s]+?)(?:\.|\s+and|\s+i|\s+a|$)/i);
    if (nameMatch && nameMatch[1] && !resumeData.personal.name) {
        const extractedName = nameMatch[1].trim();
        if (extractedName.length < 30) {
            resumeData.personal.name = capitalizeWords(extractedName);
            document.getElementById('input-name').value = resumeData.personal.name;
            logVoiceCommand(`Extracted Name: ${resumeData.personal.name}`);
        }
    }

    // Location heuristic: "living in Chennai", "located in Mumbai", "from Bangalore"
    const locationMatch = text.match(/(?:living in|located in|from)\s+([a-zA-Z\s,]+?)(?:\.|\s+and|\s+i|$)/i);
    if (locationMatch && locationMatch[1] && !resumeData.personal.location) {
        const extractedLoc = locationMatch[1].trim();
        if (extractedLoc.length < 25) {
            resumeData.personal.location = capitalizeWords(extractedLoc);
            document.getElementById('input-location').value = resumeData.personal.location;
            logVoiceCommand(`Extracted Location: ${resumeData.personal.location}`);
        }
    }

    // 3. Extract Education Details
    if (lowerText.includes('degree') || lowerText.includes('b.tech') || lowerText.includes('b.e.') || lowerText.includes('computer science') || lowerText.includes('college') || lowerText.includes('university')) {
        let degree = '';
        if (lowerText.includes('b.tech') || lowerText.includes('btech')) degree = 'B.Tech';
        else if (lowerText.includes('b.e') || lowerText.includes('be ')) degree = 'B.E.';
        else if (lowerText.includes('m.tech')) degree = 'M.Tech';
        else if (lowerText.includes('b.sc')) degree = 'B.Sc';
        else degree = 'Degree in Computer Science';

        const yearMatch = text.match(/\b(20[1-3][0-9])\b/);
        const year = yearMatch ? yearMatch[0] : '2026';

        // Check if education already added
        const exists = resumeData.education.some(e => e.degree === degree);
        if (!exists) {
            resumeData.education.push({
                degree: degree + (lowerText.includes('computer science') ? ' Computer Science Engineering' : ''),
                college: 'Engineering College',
                year: year,
                cgpa: '8.5 CGPA'
            });
            logVoiceCommand(`Extracted Education: ${degree}`);
        }
    }

    // 4. Auto Objective Generation
    if (!resumeData.objective) {
        if (resumeData.skills.length > 0 || resumeData.education.length > 0) {
            resumeData.objective = `Motivated ${resumeData.education[0]?.degree || 'Computer Science student'} proficient in ${resumeData.skills.slice(0, 4).join(', ') || 'software development'}. Seeking an entry-level software engineering role to leverage problem-solving skills and technical expertise.`;
            document.getElementById('input-objective').value = resumeData.objective;
        }
    }

    renderSkillsChips();
    renderEducationList();
    renderResumePreview();
    updateScoreAndAnalytics();
}

/* ==========================================================================
   3. VOICE COMMANDS ENGINE
   ========================================================================== */

function checkVoiceCommands(spokenText) {
    const text = spokenText.toLowerCase().trim();

    // Command: "Add [Skill] to skills"
    const addSkillMatch = text.match(/add\s+([a-z0-9.#+]+)\s+to\s+(?:my\s+)?skills/i);
    if (addSkillMatch && addSkillMatch[1]) {
        const newSkill = capitalizeWords(addSkillMatch[1].trim());
        if (!resumeData.skills.includes(newSkill)) {
            resumeData.skills.push(newSkill);
            renderSkillsChips();
            renderResumePreview();
            logVoiceCommand(`[Voice Cmd] Added Skill: ${newSkill}`);
        }
        return;
    }

    // Command: "Clear skills"
    if (text.includes('clear skills') || text.includes('clear my skills')) {
        resumeData.skills = [];
        renderSkillsChips();
        renderResumePreview();
        logVoiceCommand(`[Voice Cmd] Cleared all skills`);
        return;
    }

    // Command: "Add education"
    if (text.includes('add education') || text.includes('add my education')) {
        switchTab('tab-education');
        addEducationItem();
        logVoiceCommand(`[Voice Cmd] Added education section item`);
        return;
    }

    // Command: "Add project"
    if (text.includes('add project') || text.includes('add my project')) {
        switchTab('tab-projects');
        addProjectItem();
        logVoiceCommand(`[Voice Cmd] Added project section item`);
        return;
    }

    // Command: "Show my resume" / "Preview resume"
    if (text.includes('show my resume') || text.includes('show resume') || text.includes('preview resume')) {
        const previewSec = document.querySelector('.pane-preview');
        if (previewSec) previewSec.scrollIntoView({ behavior: 'smooth' });
        logVoiceCommand(`[Voice Cmd] Navigated to Resume Preview`);
        return;
    }

    // Command: "Generate resume"
    if (text.includes('generate resume') || text.includes('build resume')) {
        const fullTranscript = document.getElementById('live-transcription-box').innerText;
        processSpokenTextNLP(fullTranscript);
        logVoiceCommand(`[Voice Cmd] Executed Full Resume Generation`);
        return;
    }

    // Command: "Download resume" / "Print resume"
    if (text.includes('download resume') || text.includes('print resume')) {
        logVoiceCommand(`[Voice Cmd] Triggering Print / Download`);
        window.print();
        return;
    }
}

function logVoiceCommand(msg) {
    const list = document.getElementById('command-log-list');
    const cmdCountBadge = document.getElementById('cmd-count');

    if (list) {
        const item = document.createElement('div');
        item.className = 'cmd-item';
        item.textContent = `> ${msg}`;
        list.prepend(item);

        const count = list.querySelectorAll('.cmd-item:not(.system)').length;
        if (cmdCountBadge) cmdCountBadge.textContent = `${count} Commands`;
    }
}

/* ==========================================================================
   4. DOM EVENT HANDLERS & FORM CONTROL BINDINGS
   ========================================================================== */

function setupEventListeners() {
    // Welcome Modal Buttons
    document.getElementById('btn-start-voice-welcome')?.addEventListener('click', () => {
        closeWelcomeModal();
        startRecording();
    });

    document.getElementById('btn-enter-manual-welcome')?.addEventListener('click', () => {
        closeWelcomeModal();
        switchTab('tab-personal');
    });

    document.getElementById('btn-try-demo-welcome')?.addEventListener('click', () => {
        closeWelcomeModal();
        loadDemoData();
    });

    // Top Header Buttons
    document.getElementById('btn-try-demo')?.addEventListener('click', loadDemoData);
    document.getElementById('btn-save')?.addEventListener('click', saveResumeToStorage);
    document.getElementById('btn-load')?.addEventListener('click', loadResumeFromStorage);
    document.getElementById('btn-clear')?.addEventListener('click', clearAllResumeData);
    document.getElementById('btn-print')?.addEventListener('click', () => window.print());
    document.getElementById('btn-print-preview')?.addEventListener('click', () => window.print());

    // Mic Panel Buttons
    document.getElementById('btn-toggle-record')?.addEventListener('click', toggleRecording);
    document.getElementById('btn-start-rec')?.addEventListener('click', startRecording);
    document.getElementById('btn-stop-rec')?.addEventListener('click', stopRecording);
    document.getElementById('btn-clear-transcript')?.addEventListener('click', () => {
        document.getElementById('live-transcription-box').innerText = '';
        totalWordsDetected = 0;
        document.getElementById('stat-words').textContent = 0;
    });

    document.getElementById('btn-extract-now')?.addEventListener('click', () => {
        const text = document.getElementById('live-transcription-box').innerText;
        processSpokenTextNLP(text);
    });

    document.getElementById('btn-auto-fill-extracted')?.addEventListener('click', () => {
        const text = document.getElementById('live-transcription-box').innerText;
        processSpokenTextNLP(text);
    });

    // Mobile Sidebar Toggle
    document.getElementById('toggle-sidebar-btn')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Personal Form Inputs Real-time Binding
    const personalInputs = ['name', 'email', 'phone', 'location', 'linkedin', 'github'];
    personalInputs.forEach(field => {
        const el = document.getElementById(`input-${field}`);
        if (el) {
            el.addEventListener('input', (e) => {
                resumeData.personal[field] = e.target.value;
                renderResumePreview();
                updateScoreAndAnalytics();
            });
        }
    });

    // Objective Binding & Generator
    const objInput = document.getElementById('input-objective');
    if (objInput) {
        objInput.addEventListener('input', (e) => {
            resumeData.objective = e.target.value;
            renderResumePreview();
            updateScoreAndAnalytics();
        });
    }

    document.getElementById('btn-generate-objective')?.addEventListener('click', () => {
        resumeData.objective = `Results-oriented ${resumeData.education[0]?.degree || 'Engineering graduate'} with hands-on expertise in ${resumeData.skills.slice(0, 3).join(', ') || 'modern software technologies'}. Adept at designing scalable applications, solving complex algorithms, and collaborating in team environments.`;
        if (objInput) objInput.value = resumeData.objective;
        renderResumePreview();
        updateScoreAndAnalytics();
    });

    // Skills Add/Clear Buttons
    document.getElementById('btn-add-skill')?.addEventListener('click', handleManualSkillAdd);
    document.getElementById('input-new-skill')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleManualSkillAdd();
    });
    document.getElementById('btn-clear-skills')?.addEventListener('click', () => {
        resumeData.skills = [];
        renderSkillsChips();
        renderResumePreview();
        updateScoreAndAnalytics();
    });

    // Section Dynamic Add Item Buttons
    document.getElementById('btn-add-education')?.addEventListener('click', addEducationItem);
    document.getElementById('btn-add-project')?.addEventListener('click', addProjectItem);
    document.getElementById('btn-add-experience')?.addEventListener('click', addExperienceItem);
    document.getElementById('btn-add-cert')?.addEventListener('click', addCertItem);
    document.getElementById('btn-add-achievement')?.addEventListener('click', addAchievementItem);

    // Hobbies Binding
    const hobbiesInput = document.getElementById('input-hobbies');
    if (hobbiesInput) {
        hobbiesInput.addEventListener('input', (e) => {
            resumeData.hobbies = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            renderResumePreview();
        });
    }
}

function closeWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (modal) modal.classList.add('hidden');
}

/* ==========================================================================
   5. TAB NAVIGATION & SIDEBAR JUMP
   ========================================================================== */

function setupTabNavigation() {
    // Editor Tabs
    const tabs = document.querySelectorAll('.editor-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');
            switchTab(targetId);
        });
    });

    // Sidebar Nav Items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const target = item.getAttribute('data-target');
            if (target === 'panel-voice') {
                document.querySelector('.pane-voice').scrollIntoView({ behavior: 'smooth' });
            } else if (target === 'panel-preview') {
                document.querySelector('.pane-preview').scrollIntoView({ behavior: 'smooth' });
            } else {
                document.querySelector('.pane-extracted').scrollIntoView({ behavior: 'smooth' });
                // Map navigation to editor tab
                const tabMap = {
                    'panel-personal': 'tab-personal',
                    'panel-objective': 'tab-objective',
                    'panel-education': 'tab-education',
                    'panel-skills': 'tab-skills',
                    'panel-projects': 'tab-projects',
                    'panel-experience': 'tab-experience',
                    'panel-certifications': 'tab-certs',
                    'panel-achievements': 'tab-certs',
                    'panel-analytics': 'tab-certs'
                };
                if (tabMap[target]) switchTab(tabMap[target]);
            }
        });
    });
}

function switchTab(tabId) {
    const tabs = document.querySelectorAll('.editor-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(t => {
        if (t.getAttribute('data-tab') === tabId) t.classList.add('active');
        else t.classList.remove('active');
    });

    panes.forEach(p => {
        if (p.id === tabId) p.classList.add('active');
        else p.classList.remove('active');
    });
}

/* ==========================================================================
   6. TEMPLATE SELECTOR ENGINE
   ========================================================================== */

function setupTemplateSelector() {
    const templateBtns = document.querySelectorAll('.template-btn');
    const resumePaper = document.getElementById('resume-preview-sheet');

    templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            templateBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const templateName = btn.getAttribute('data-template');
            resumeData.template = templateName;

            if (resumePaper) {
                resumePaper.className = `resume-paper ${templateName}-template`;
            }
        });
    });
}

/* ==========================================================================
   7. SKILLS CHIPS MANAGEMENT
   ========================================================================== */

function handleManualSkillAdd() {
    const input = document.getElementById('input-new-skill');
    if (!input) return;

    const val = input.value.trim();
    if (val) {
        const skillsToAdd = val.split(',').map(s => s.trim()).filter(Boolean);
        skillsToAdd.forEach(s => {
            const formatted = capitalizeWords(s);
            if (!resumeData.skills.includes(formatted)) {
                resumeData.skills.push(formatted);
            }
        });
        input.value = '';
        renderSkillsChips();
        renderResumePreview();
        updateScoreAndAnalytics();
    }
}

function renderSkillsChips() {
    const cloud = document.getElementById('skills-tag-cloud');
    if (!cloud) return;

    cloud.innerHTML = '';
    resumeData.skills.forEach((skill, index) => {
        const chip = document.createElement('div');
        chip.className = 'skill-chip';
        chip.innerHTML = `
            <span>${skill}</span>
            <span class="remove-chip" title="Remove Skill">&times;</span>
        `;
        chip.querySelector('.remove-chip').addEventListener('click', () => {
            resumeData.skills.splice(index, 1);
            renderSkillsChips();
            renderResumePreview();
            updateScoreAndAnalytics();
        });
        cloud.appendChild(chip);
    });
}

/* ==========================================================================
   8. DYNAMIC SECTION LIST MANAGERS (Education, Projects, Experience, Certs)
   ========================================================================== */

function addEducationItem(data = null) {
    const item = data || { degree: 'B.E. Computer Science Engineering', college: 'ABC Institute of Technology', year: '2026', cgpa: '8.8 CGPA' };
    if (!data) resumeData.education.push(item);
    renderEducationList();
    renderResumePreview();
    updateScoreAndAnalytics();
}

function renderEducationList() {
    const container = document.getElementById('education-list-container');
    if (!container) return;

    container.innerHTML = '';
    resumeData.education.forEach((edu, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-card-header">
                <span class="item-title">Education #${idx + 1}</span>
                <button class="btn-remove-item">&times;</button>
            </div>
            <div class="form-grid">
                <input type="text" placeholder="Degree / Course" value="${edu.degree}" data-field="degree">
                <input type="text" placeholder="College / University" value="${edu.college}" data-field="college">
                <input type="text" placeholder="Year of Passing" value="${edu.year}" data-field="year">
                <input type="text" placeholder="CGPA / Percentage" value="${edu.cgpa}" data-field="cgpa">
            </div>
        `;

        card.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.getAttribute('data-field');
                resumeData.education[idx][field] = e.target.value;
                renderResumePreview();
                updateScoreAndAnalytics();
            });
        });

        card.querySelector('.btn-remove-item').addEventListener('click', () => {
            resumeData.education.splice(idx, 1);
            renderEducationList();
            renderResumePreview();
            updateScoreAndAnalytics();
        });

        container.appendChild(card);
    });
}

function addProjectItem(data = null) {
    const item = data || { name: 'AI Voice Resume Builder', description: 'Built an interactive speech-to-resume application converting voice commands into structured resumes using JavaScript & NLP parsing.', tech: 'HTML, CSS, JavaScript, Web Speech API' };
    if (!data) resumeData.projects.push(item);
    renderProjectsList();
    renderResumePreview();
    updateScoreAndAnalytics();
}

function renderProjectsList() {
    const container = document.getElementById('projects-list-container');
    if (!container) return;

    container.innerHTML = '';
    resumeData.projects.forEach((proj, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-card-header">
                <span class="item-title">Project #${idx + 1}</span>
                <button class="btn-remove-item">&times;</button>
            </div>
            <div class="form-group mb-4">
                <input type="text" placeholder="Project Name" value="${proj.name}" data-field="name">
            </div>
            <div class="form-group mb-4">
                <textarea rows="2" placeholder="Description & Key Contributions" data-field="description">${proj.description}</textarea>
            </div>
            <div class="form-group">
                <input type="text" placeholder="Technologies Used (e.g. Python, SQL)" value="${proj.tech}" data-field="tech">
            </div>
        `;

        card.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.getAttribute('data-field');
                resumeData.projects[idx][field] = e.target.value;
                renderResumePreview();
                updateScoreAndAnalytics();
            });
        });

        card.querySelector('.btn-remove-item').addEventListener('click', () => {
            resumeData.projects.splice(idx, 1);
            renderProjectsList();
            renderResumePreview();
            updateScoreAndAnalytics();
        });

        container.appendChild(card);
    });
}

function addExperienceItem(data = null) {
    const item = data || { company: 'Tech Solutions Inc.', role: 'Software Developer Intern', duration: 'June 2025 - August 2025', responsibilities: 'Developed REST APIs, optimized database queries, and collaborated on frontend web UI.' };
    if (!data) resumeData.experience.push(item);
    renderExperienceList();
    renderResumePreview();
    updateScoreAndAnalytics();
}

function renderExperienceList() {
    const container = document.getElementById('experience-list-container');
    if (!container) return;

    container.innerHTML = '';
    resumeData.experience.forEach((exp, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-card-header">
                <span class="item-title">Experience #${idx + 1}</span>
                <button class="btn-remove-item">&times;</button>
            </div>
            <div class="form-grid mb-4">
                <input type="text" placeholder="Company Name" value="${exp.company}" data-field="company">
                <input type="text" placeholder="Role / Title" value="${exp.role}" data-field="role">
            </div>
            <div class="form-group mb-4">
                <input type="text" placeholder="Duration (e.g. Summer 2025)" value="${exp.duration}" data-field="duration">
            </div>
            <div class="form-group">
                <textarea rows="2" placeholder="Responsibilities & Key Achievements" data-field="responsibilities">${exp.responsibilities}</textarea>
            </div>
        `;

        card.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.getAttribute('data-field');
                resumeData.experience[idx][field] = e.target.value;
                renderResumePreview();
                updateScoreAndAnalytics();
            });
        });

        card.querySelector('.btn-remove-item').addEventListener('click', () => {
            resumeData.experience.splice(idx, 1);
            renderExperienceList();
            renderResumePreview();
            updateScoreAndAnalytics();
        });

        container.appendChild(card);
    });
}

function addCertItem(data = null) {
    const item = data || { name: 'Full Stack Web Development Certification', org: 'Coursera / Meta', year: '2025' };
    if (!data) resumeData.certifications.push(item);
    renderCertsList();
    renderResumePreview();
    updateScoreAndAnalytics();
}

function renderCertsList() {
    const container = document.getElementById('certs-list-container');
    if (!container) return;

    container.innerHTML = '';
    resumeData.certifications.forEach((cert, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-card-header">
                <span class="item-title">Cert #${idx + 1}</span>
                <button class="btn-remove-item">&times;</button>
            </div>
            <div class="form-grid">
                <input type="text" placeholder="Certification Name" value="${cert.name}" data-field="name">
                <input type="text" placeholder="Organization" value="${cert.org}" data-field="org">
                <input type="text" placeholder="Year" value="${cert.year}" data-field="year">
            </div>
        `;

        card.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.getAttribute('data-field');
                resumeData.certifications[idx][field] = e.target.value;
                renderResumePreview();
                updateScoreAndAnalytics();
            });
        });

        card.querySelector('.btn-remove-item').addEventListener('click', () => {
            resumeData.certifications.splice(idx, 1);
            renderCertsList();
            renderResumePreview();
            updateScoreAndAnalytics();
        });

        container.appendChild(card);
    });
}

function addAchievementItem(data = null) {
    const item = data || 'Secured 1st place in National Level AI Hackathon 2025.';
    if (!data) resumeData.achievements.push(item);
    renderAchievementsList();
    renderResumePreview();
    updateScoreAndAnalytics();
}

function renderAchievementsList() {
    const container = document.getElementById('achievements-list-container');
    if (!container) return;

    container.innerHTML = '';
    resumeData.achievements.forEach((ach, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-card-header">
                <span class="item-title">Achievement #${idx + 1}</span>
                <button class="btn-remove-item">&times;</button>
            </div>
            <input type="text" placeholder="Achievement details..." value="${ach}">
        `;

        card.querySelector('input').addEventListener('input', (e) => {
            resumeData.achievements[idx] = e.target.value;
            renderResumePreview();
            updateScoreAndAnalytics();
        });

        card.querySelector('.btn-remove-item').addEventListener('click', () => {
            resumeData.achievements.splice(idx, 1);
            renderAchievementsList();
            renderResumePreview();
            updateScoreAndAnalytics();
        });

        container.appendChild(card);
    });
}

/* ==========================================================================
   9. LIVE RESUME PREVIEW GENERATOR
   ========================================================================== */

function renderResumePreview() {
    const { personal, objective, education, skills, projects, experience, certifications, achievements, hobbies } = resumeData;

    // 1. Personal Header
    document.getElementById('res-display-name').textContent = personal.name || 'YOUR NAME';
    
    const contactRow = document.getElementById('res-display-contact');
    if (contactRow) {
        contactRow.innerHTML = `
            ${personal.phone ? `<span>📱 ${personal.phone}</span>` : ''}
            ${personal.email ? `<span>✉️ ${personal.email}</span>` : ''}
            ${personal.location ? `<span>📍 ${personal.location}</span>` : ''}
            ${personal.linkedin ? `<span>🔗 ${personal.linkedin}</span>` : ''}
            ${personal.github ? `<span>💻 ${personal.github}</span>` : ''}
        `;
    }

    // 2. Career Objective
    const objSec = document.getElementById('res-sec-objective');
    const objText = document.getElementById('res-display-objective');
    if (objective) {
        objSec.style.display = 'block';
        objText.textContent = objective;
    } else {
        objSec.style.display = 'none';
    }

    // 3. Technical Skills
    const skillsSec = document.getElementById('res-sec-skills');
    const skillsContainer = document.getElementById('res-display-skills');
    if (skills && skills.length > 0) {
        skillsSec.style.display = 'block';
        skillsContainer.innerHTML = skills.map(sk => `<span class="res-skill-badge">${sk}</span>`).join('');
    } else {
        skillsSec.style.display = 'none';
    }

    // 4. Education
    const eduSec = document.getElementById('res-sec-education');
    const eduContainer = document.getElementById('res-display-education');
    if (education && education.length > 0) {
        eduSec.style.display = 'block';
        eduContainer.innerHTML = education.map(e => `
            <div class="res-item-row">
                <div class="res-item-top">
                    <span>${e.degree || 'Degree'}</span>
                    <span>${e.year || ''}</span>
                </div>
                <div class="res-item-sub">${e.college || ''} ${e.cgpa ? '• ' + e.cgpa : ''}</div>
            </div>
        `).join('');
    } else {
        eduSec.style.display = 'none';
    }

    // 5. Projects
    const projSec = document.getElementById('res-sec-projects');
    const projContainer = document.getElementById('res-display-projects');
    if (projects && projects.length > 0) {
        projSec.style.display = 'block';
        projContainer.innerHTML = projects.map(p => `
            <div class="res-item-row">
                <div class="res-item-top">
                    <span>${p.name || 'Project'}</span>
                </div>
                <div class="res-item-desc">${p.description || ''}</div>
                ${p.tech ? `<div class="res-item-sub">Tech: ${p.tech}</div>` : ''}
            </div>
        `).join('');
    } else {
        projSec.style.display = 'none';
    }

    // 6. Experience
    const expSec = document.getElementById('res-sec-experience');
    const expContainer = document.getElementById('res-display-experience');
    if (experience && experience.length > 0) {
        expSec.style.display = 'block';
        expContainer.innerHTML = experience.map(x => `
            <div class="res-item-row">
                <div class="res-item-top">
                    <span>${x.role || 'Role'} - ${x.company || 'Company'}</span>
                    <span>${x.duration || ''}</span>
                </div>
                <div class="res-item-desc">${x.responsibilities || ''}</div>
            </div>
        `).join('');
    } else {
        expSec.style.display = 'none';
    }

    // 7. Certifications
    const certSec = document.getElementById('res-sec-certifications');
    const certContainer = document.getElementById('res-display-certifications');
    if (certifications && certifications.length > 0) {
        certSec.style.display = 'block';
        certContainer.innerHTML = certifications.map(c => `
            <div class="res-item-row">
                <div class="res-item-top">
                    <span>${c.name || 'Certification'}</span>
                    <span>${c.year || ''}</span>
                </div>
                <div class="res-item-sub">${c.org || ''}</div>
            </div>
        `).join('');
    } else {
        certSec.style.display = 'none';
    }

    // 8. Achievements
    const achSec = document.getElementById('res-sec-achievements');
    const achContainer = document.getElementById('res-display-achievements');
    if (achievements && achievements.length > 0) {
        achSec.style.display = 'block';
        achContainer.innerHTML = achievements.map(a => `<div class="res-item-desc">• ${a}</div>`).join('');
    } else {
        achSec.style.display = 'none';
    }

    // 9. Hobbies
    const hobSec = document.getElementById('res-sec-hobbies');
    const hobText = document.getElementById('res-display-hobbies');
    if (hobbies && hobbies.length > 0) {
        hobSec.style.display = 'block';
        hobText.textContent = hobbies.join(', ');
    } else {
        hobSec.style.display = 'none';
    }
}

/* ==========================================================================
   10. QUALITY SCORE & ANALYTICS DASHBOARD
   ========================================================================== */

function updateScoreAndAnalytics() {
    let score = 0;
    const suggestions = [];

    // Personal Info check (20%)
    if (resumeData.personal.name) score += 5;
    if (resumeData.personal.email) score += 5;
    if (resumeData.personal.phone) score += 5;
    if (resumeData.personal.location) score += 5;

    if (!resumeData.personal.github) suggestions.push('⚠️ Add GitHub profile to showcase projects');
    else suggestions.push('✅ GitHub profile added');

    if (!resumeData.personal.linkedin) suggestions.push('⚠️ Add LinkedIn profile for networking');

    // Objective (10%)
    if (resumeData.objective && resumeData.objective.length > 20) {
        score += 10;
        suggestions.push('✅ Professional objective completed');
    } else {
        suggestions.push('⚠️ Add a career objective or summary');
    }

    // Education (15%)
    if (resumeData.education.length > 0) {
        score += 15;
        suggestions.push('✅ Education details included');
    } else {
        suggestions.push('⚠️ Add education details (Degree, College, Year)');
    }

    // Skills (20%)
    if (resumeData.skills.length >= 5) {
        score += 20;
        suggestions.push('✅ Technical skills section complete');
    } else if (resumeData.skills.length > 0) {
        score += 10;
        suggestions.push('⚠️ Add more skills (at least 5 recommended)');
    } else {
        suggestions.push('⚠️ No skills identified yet');
    }

    // Projects (15%)
    if (resumeData.projects.length >= 1) {
        score += 15;
        suggestions.push('✅ Project details added');
    } else {
        suggestions.push('⚠️ Add at least 1 key project description');
    }

    // Experience (10%)
    if (resumeData.experience.length > 0) score += 10;

    // Certifications & Achievements (10%)
    if (resumeData.certifications.length > 0) score += 5;
    if (resumeData.achievements.length > 0) score += 5;

    score = Math.min(100, score);

    // Update Progress UI
    document.getElementById('main-score-fill').style.width = score + '%';
    document.getElementById('sidebar-score-fill').style.width = score + '%';
    document.getElementById('score-percentage-badge').textContent = score + '%';
    document.getElementById('sidebar-score-text').textContent = score + '%';

    // Update Suggestions List
    const sugList = document.getElementById('score-suggestions-list');
    if (sugList) {
        sugList.innerHTML = suggestions.slice(0, 4).map(s => {
            const isSuccess = s.startsWith('✅');
            return `<div class="suggestion-item ${isSuccess ? 'success' : 'warning'}">${s}</div>`;
        }).join('');
    }

    // Update Analytics Numbers
    document.getElementById('stat-skills').textContent = resumeData.skills.length;
    document.getElementById('stat-edu').textContent = resumeData.education.length;
    document.getElementById('stat-proj').textContent = resumeData.projects.length;
    document.getElementById('stat-confidence').textContent = recognitionConfidence + '%';
}

/* ==========================================================================
   11. DEMO DATA LOADER ("TRY DEMO")
   ========================================================================== */

function loadDemoData() {
    resumeData.personal = {
        name: 'Shyam N',
        email: 'shyam.n@example.com',
        phone: '+91 98765 43210',
        location: 'Chennai, India',
        linkedin: 'linkedin.com/in/shyam-n',
        github: 'github.com/shyam-n'
    };

    resumeData.objective = 'Passionate Computer Science Engineering student skilled in software development, full-stack web technologies, and machine learning. Seeking an opportunity to solve challenging problems and build innovative AI-driven software applications.';

    resumeData.skills = ['Python', 'Java', 'HTML', 'CSS', 'JavaScript', 'SQL'];

    resumeData.education = [
        {
            degree: 'B.E. Computer Science Engineering',
            college: 'College of Engineering & Technology',
            year: '2026',
            cgpa: '8.9 CGPA'
        }
    ];

    resumeData.projects = [
        {
            name: 'AI Traffic Monitoring System',
            description: 'Developed a real-time computer vision system using Python & OpenCV to analyze vehicle density and automatically optimize traffic light timing.',
            tech: 'Python, OpenCV, TensorFlow, SQL'
        },
        {
            name: 'Voice-Based Resume Builder',
            description: 'Created an intelligent web app utilizing browser Web Speech API and NLP keyword parsing to convert speech dictation into structured resumes.',
            tech: 'HTML5, CSS3, JavaScript, Web Speech API'
        }
    ];

    resumeData.experience = [
        {
            company: 'Alpha Innovations',
            role: 'Software Intern',
            duration: 'May 2025 - July 2025',
            responsibilities: 'Worked on building responsive UI components and integrating backend RESTful APIs using JavaScript and Python.'
        }
    ];

    resumeData.certifications = [
        { name: 'Python for Data Science', org: 'NPTEL / IIT Madras', year: '2025' }
    ];

    resumeData.achievements = [
        'Winner of Smart India Hackathon College Round 2025.',
        'Published research paper on Traffic Density Analysis in AI Journal.'
    ];

    resumeData.hobbies = ['Open Source Contribution', 'Chess', 'Tech Blogging'];

    // Update Form Inputs
    document.getElementById('input-name').value = resumeData.personal.name;
    document.getElementById('input-email').value = resumeData.personal.email;
    document.getElementById('input-phone').value = resumeData.personal.phone;
    document.getElementById('input-location').value = resumeData.personal.location;
    document.getElementById('input-linkedin').value = resumeData.personal.linkedin;
    document.getElementById('input-github').value = resumeData.personal.github;
    document.getElementById('input-objective').value = resumeData.objective;
    document.getElementById('input-hobbies').value = resumeData.hobbies.join(', ');

    // Fill sample transcript
    const sampleText = "My name is Shyam N. I am a Computer Science Engineering student. I know Python, Java, HTML, CSS, JavaScript and SQL. I built an AI Traffic Monitoring System using Python.";
    document.getElementById('live-transcription-box').innerText = sampleText;
    totalWordsDetected = sampleText.split(' ').length;
    document.getElementById('stat-words').textContent = totalWordsDetected;

    renderSkillsChips();
    renderEducationList();
    renderProjectsList();
    renderExperienceList();
    renderCertsList();
    renderAchievementsList();
    renderResumePreview();
    updateScoreAndAnalytics();

    logVoiceCommand('System: Demo data successfully loaded!');
}

/* ==========================================================================
   12. LOCALSTORAGE PERSISTENCE & UTILS
   ========================================================================== */

function saveResumeToStorage() {
    try {
        localStorage.setItem('voiceresume_saved_data', JSON.stringify(resumeData));
        alert('Resume data saved successfully to LocalStorage!');
        logVoiceCommand('System: Saved resume state to LocalStorage.');
    } catch (e) {
        alert('Failed to save to LocalStorage.');
    }
}

function loadResumeFromStorage() {
    try {
        const saved = localStorage.getItem('voiceresume_saved_data');
        if (!saved) {
            alert('No saved resume found in LocalStorage.');
            return;
        }
        const parsed = JSON.parse(saved);
        Object.assign(resumeData, parsed);

        // Update form fields
        document.getElementById('input-name').value = resumeData.personal.name || '';
        document.getElementById('input-email').value = resumeData.personal.email || '';
        document.getElementById('input-phone').value = resumeData.personal.phone || '';
        document.getElementById('input-location').value = resumeData.personal.location || '';
        document.getElementById('input-linkedin').value = resumeData.personal.linkedin || '';
        document.getElementById('input-github').value = resumeData.personal.github || '';
        document.getElementById('input-objective').value = resumeData.objective || '';
        document.getElementById('input-hobbies').value = (resumeData.hobbies || []).join(', ');

        renderSkillsChips();
        renderEducationList();
        renderProjectsList();
        renderExperienceList();
        renderCertsList();
        renderAchievementsList();
        renderResumePreview();
        updateScoreAndAnalytics();

        alert('Resume loaded successfully!');
        logVoiceCommand('System: Loaded resume state from LocalStorage.');
    } catch (e) {
        alert('Error loading resume data.');
    }
}

function clearAllResumeData() {
    if (!confirm('Are you sure you want to clear all resume data?')) return;

    resumeData.personal = { name: '', email: '', phone: '', location: '', linkedin: '', github: '' };
    resumeData.objective = '';
    resumeData.education = [];
    resumeData.skills = [];
    resumeData.projects = [];
    resumeData.experience = [];
    resumeData.certifications = [];
    resumeData.achievements = [];
    resumeData.hobbies = [];

    // Clear inputs
    ['name', 'email', 'phone', 'location', 'linkedin', 'github', 'objective', 'hobbies'].forEach(id => {
        const el = document.getElementById(`input-${id}`);
        if (el) el.value = '';
    });
    document.getElementById('live-transcription-box').innerText = '';

    renderSkillsChips();
    renderEducationList();
    renderProjectsList();
    renderExperienceList();
    renderCertsList();
    renderAchievementsList();
    renderResumePreview();
    updateScoreAndAnalytics();

    logVoiceCommand('System: Cleared all resume data.');
}

function capitalizeWords(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, c => c.toUpperCase());
}
