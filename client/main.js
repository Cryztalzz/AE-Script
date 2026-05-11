var csInterface = new CSInterface();

var selectedPos = "MC"; 
var posButtons = document.querySelectorAll('.pos-btn');
var wmScaleInput = document.getElementById('wmScale');
var radioMove = document.getElementById('radioMove');
var adjBox = document.getElementById('adjDurationBox');
var noteArea = document.getElementById('projectNotes');

// --- LOGIKA TABS ---
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }

    tablinks = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");

    if (tabName === 'notes') {
        loadProjectNote();
    }
}

function getRasio() { return document.getElementById('pilihComp').value; }

// --- TAB ESSENTIALS ---
document.getElementById('btnBikinCompOtomatis').addEventListener('click', function() { csInterface.evalScript('buatCompCustom("' + getRasio() + '")'); });

document.getElementById('btnSolidFill').addEventListener('click', function() { 
    var addFill = document.getElementById('checkFillEffect').checked;
    csInterface.evalScript('buatSolidFill("' + getRasio() + '", ' + addFill + ')'); 
});

document.getElementById('btnKamera').addEventListener('click', function() {
    csInterface.evalScript('buatKamera("' + getRasio() + '")'); 
});

document.getElementById('btnNullParent').addEventListener('click', function() { csInterface.evalScript('buatNullParent()'); });
document.getElementById('btnTeksTengah').addEventListener('click', function() { csInterface.evalScript('buatTeksTengah("' + getRasio() + '")'); });
document.getElementById('btnAdjComp').addEventListener('click', function() { csInterface.evalScript('buatAdjComp("' + getRasio() + '")'); });
document.getElementById('btnAdjLayer').addEventListener('click', function() { csInterface.evalScript('buatAdjLayer()'); });

// --- TAB PROJECT MANAGER ---
document.getElementById('btnAutoOrganize').addEventListener('click', function() { csInterface.evalScript('autoOrganizeProject()'); });

// --- TAB TIMELINE TOOLS ---
document.getElementById('pilihStagger').addEventListener('change', function() {
    var btnCut = document.getElementById('btnStaggerCut');
    btnCut.style.display = (this.value === 'end') ? 'none' : 'block';
});
document.getElementById('btnStagger').addEventListener('click', function() {
    var val = document.getElementById('pilihStagger').value;
    csInterface.evalScript('staggerLayers("' + val + '", false)');
});
document.getElementById('btnStaggerCut').addEventListener('click', function() {
    var val = document.getElementById('pilihStagger').value;
    csInterface.evalScript('staggerLayers("' + val + '", true)');
});
document.getElementById('btnUnComp').addEventListener('click', function() { csInterface.evalScript('unPrecompose()'); });
document.getElementById('btnPurgeCache').addEventListener('click', function() { csInterface.evalScript('purgeCache()'); });

// --- TAB PRE-COMPOSE ---
document.getElementsByName('precompOpt').forEach(function(elem) {
    elem.addEventListener('change', function() { adjBox.style.display = radioMove.checked ? 'flex' : 'none'; });
});

document.getElementById('btnPreComp').addEventListener('click', function() {
    var moveAll = radioMove.checked;
    var adjDuration = document.getElementById('checkAdjDuration').checked;
    var compName = document.getElementById('precompName').value.replace(/"/g, '\\"');
    csInterface.evalScript('preComposePro("' + moveAll + '", "' + adjDuration + '", "' + compName + '")');
});

// --- TAB FX ---
document.getElementById('btnApplyMT').addEventListener('click', function() {
    var val = document.getElementById('pilihMT').value;
    var mirror = document.getElementById('checkMirror').checked;
    csInterface.evalScript('applyNativeMotionTile(' + val + ', ' + mirror + ')');
});

// --- LOGIKA WATERMARK ---
if (wmScaleInput) {
    wmScaleInput.addEventListener('input', function() { document.getElementById('wmScaleVal').innerText = this.value + "%"; });
}

posButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
        posButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedPos = this.getAttribute('data-pos');
        saveSettings();
        updateWM();
    });
});

document.getElementById('btnGenerateWM').addEventListener('click', updateWM);

function updateWM() {
    var teks = document.getElementById('wmText').value || "Alz";
    var scale = wmScaleInput.value;
    csInterface.evalScript('generateOrUpdateWM("' + teks + '", "' + selectedPos + '", ' + scale + ')');
}

// --- LOGIKA PERSISTENCE ---

const saveableElements = ['pilihComp', 'pilihStagger', 'pilihMT', 'wmScale', 'precompName', 'wmText'];
const saveableCheckboxes = ['checkFillEffect', 'checkMirror',  'radioMove', 'checkAdjDuration', 'noteThemeToggle'];

function saveSettings() {
    const settings = {};
    
    saveableElements.forEach(id => {
        settings[id] = document.getElementById(id).value;
    });

    saveableCheckboxes.forEach(id => {
        settings[id] = document.getElementById(id).checked;
    });

    settings['selectedPos'] = selectedPos;

    localStorage.setItem('at_essentials_settings', JSON.stringify(settings));
}

function loadSettings() {
    const savedData = localStorage.getItem('at_essentials_settings');
    if (!savedData) return;

    const settings = JSON.parse(savedData);

    saveableElements.forEach(id => {
        if (settings[id] !== undefined) {
            document.getElementById(id).value = settings[id];
            document.getElementById(id).dispatchEvent(new Event('change'));
        }
    });

    saveableCheckboxes.forEach(id => {
        if (settings[id] !== undefined) {
            document.getElementById(id).checked = settings[id];
            document.getElementById(id).dispatchEvent(new Event('change'));
        }
    });

    if (settings['selectedPos']) {
        selectedPos = settings['selectedPos'];
        posButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-pos') === selectedPos) {
                btn.classList.add('active');
            }
        });
    }

    if(document.getElementById('wmScaleVal')) {
        document.getElementById('wmScaleVal').innerText = document.getElementById('wmScale').value + "%";
    }
}

loadSettings();

[...saveableElements, ...saveableCheckboxes].forEach(id => {
    document.getElementById(id).addEventListener('change', saveSettings);
});

document.getElementById('wmScale').addEventListener('input', saveSettings);
document.getElementById('precompName').addEventListener('input', saveSettings);
document.getElementById('wmText').addEventListener('input', saveSettings);

// --- NOTEPAD (AUTO-SAVE PER PROJECT) ---
const fs = require('fs');
const path = require('path');

const extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
const notesFilePath = path.join(extensionPath, 'project_notes.json');

var typingTimer;
var doneTypingInterval = 600;
const SEPARATOR = "||AT_SPLIT||"; 

const notesContainer = document.getElementById('notesContainer');
const btnAddNote = document.getElementById('btnAddNote');

function createNoteUI(text = "") {
    const wrapper = document.createElement('div');
    wrapper.className = 'note-wrapper';

    const textarea = document.createElement('textarea');
    textarea.className = 'note-area';
    textarea.spellcheck = false;
    textarea.placeholder = "Write your project notes here...";
    textarea.value = text;

    if (document.getElementById('noteThemeToggle').checked) {
        textarea.classList.add('dark-theme');
    }

    textarea.addEventListener('input', function() {
        document.getElementById('noteStatus').innerText = "Mengetik...";
        clearTimeout(typingTimer);
        typingTimer = setTimeout(saveProjectNote, doneTypingInterval);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-del-note';
    delBtn.innerHTML = '✖';
    delBtn.onclick = function() {
        wrapper.remove();
        if (notesContainer.querySelectorAll('.note-area').length === 0) {
            createNoteUI(""); 
        }
        saveProjectNote();
    };

    wrapper.appendChild(textarea);
    wrapper.appendChild(delBtn);
    notesContainer.appendChild(wrapper);
}

btnAddNote.addEventListener('click', () => {
    createNoteUI(""); 
    saveProjectNote();
});

function loadProjectNote() {
    csInterface.evalScript('getProjectPath()', function(currentPath) {
        let notesData = {};
        if (fs.existsSync(notesFilePath)) {
            try { notesData = JSON.parse(fs.readFileSync(notesFilePath, 'utf8')); } catch (e) { notesData = {}; }
        }

        notesContainer.innerHTML = ''; 
        const statusEl = document.getElementById('noteStatus');
        
        let savedText = notesData[currentPath];
        
        if (savedText === undefined || savedText === "") {
            createNoteUI(""); 
        } else {
            let notesArray = savedText.split(SEPARATOR);
            if (notesArray.length === 0) {
                createNoteUI("");
            } else {
                notesArray.forEach(text => createNoteUI(text));
            }
        }

        statusEl.dataset.path = currentPath;
        updateStatusUI(currentPath);
    });
}

function saveProjectNote() {
    const statusEl = document.getElementById('noteStatus');
    const projectPath = statusEl.dataset.path;
    if (!projectPath) return;

    const textareas = notesContainer.querySelectorAll('.note-area');
    const combinedText = Array.from(textareas).map(ta => ta.value).join(SEPARATOR);

    let notesData = {};
    if (fs.existsSync(notesFilePath)) {
        try { notesData = JSON.parse(fs.readFileSync(notesFilePath, 'utf8')); } catch (e) { notesData = {}; }
    }

    notesData[projectPath] = combinedText;

    try {
        fs.writeFileSync(notesFilePath, JSON.stringify(notesData, null, 4), 'utf8');
        statusEl.innerText = "✓ Saved to extension folder";
        statusEl.classList.add('status-saved');
        setTimeout(() => {
            statusEl.classList.remove('status-saved');
            updateStatusUI(projectPath);
        }, 2000);
    } catch (err) {
        statusEl.innerText = "❌ Failed to save file!";
    }
}

function updateStatusUI(path) {
    const statusEl = document.getElementById('noteStatus');
    if (path === "Untitled_Project") {
        statusEl.innerText = "⚠️ Project not saved! Notes will be saved in 'Untitled' category";
        statusEl.classList.add('status-warning');
    } else {
        var fileName = path.split('\\').pop().split('/').pop();
        statusEl.innerText = "Storage: project_notes.json (" + fileName + ")";
        statusEl.classList.remove('status-warning');
    }
}

setInterval(function() {
    csInterface.evalScript('getProjectPath()', function(currentPath) {
        if (!currentPath) return;
        const statusEl = document.getElementById('noteStatus');
        const oldPath = statusEl.dataset.path;
        if (!oldPath) return; 

        if (oldPath === "Untitled_Project" && currentPath !== "Untitled_Project") {
            let notesData = {};
            if (fs.existsSync(notesFilePath)) {
                try { notesData = JSON.parse(fs.readFileSync(notesFilePath, 'utf8')); } catch (e) {}
            }
            if (notesData["Untitled_Project"] !== undefined) {
                notesData[currentPath] = notesData["Untitled_Project"];
                delete notesData["Untitled_Project"];
                try { fs.writeFileSync(notesFilePath, JSON.stringify(notesData, null, 4), 'utf8'); } catch(e) {}
            }
            loadProjectNote();
        }
        else if (oldPath !== currentPath && oldPath !== "Untitled_Project") {
            loadProjectNote();
        }
    });
}, 1500);

document.getElementById('noteThemeToggle').addEventListener('change', function() {
    const isDark = this.checked;
    const textareas = document.querySelectorAll('.note-area');
    
    textareas.forEach(ta => {
        if (isDark) {
            ta.classList.add('dark-theme');
        } else {
            ta.classList.remove('dark-theme');
        }
    });
});