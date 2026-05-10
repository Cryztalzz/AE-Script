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
const saveableCheckboxes = ['checkFillEffect', 'checkMirror', 'checkAdjDuration'];

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
        }
    });

    saveableCheckboxes.forEach(id => {
        if (settings[id] !== undefined) {
            document.getElementById(id).checked = settings[id];
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

function loadProjectNote() {
    csInterface.evalScript('getProjectPath()', function(currentPath) {
        let notesData = {};
        if (fs.existsSync(notesFilePath)) {
            try { notesData = JSON.parse(fs.readFileSync(notesFilePath, 'utf8')); } catch (e) { notesData = {}; }
        }

        const noteArea = document.getElementById('projectNotes');
        const statusEl = document.getElementById('noteStatus');
        
        noteArea.value = notesData[currentPath] || "";
        statusEl.dataset.path = currentPath;
        
        if (currentPath === "Untitled_Project") {
            statusEl.innerText = "⚠️ Project belum di-save! Catatan masuk ke kategori 'Untitled'";
            statusEl.classList.add('status-warning');
        } else {
            var fileName = currentPath.split('\\').pop().split('/').pop();
            statusEl.innerText = "Storage: project_notes.json (" + fileName + ")";
            statusEl.classList.remove('status-warning');
        }
    });
}

function saveProjectNote() {
    const noteVal = document.getElementById('projectNotes').value;
    const statusEl = document.getElementById('noteStatus');
    const projectPath = statusEl.dataset.path;
    
    if (!projectPath) return;

    let notesData = {};
    if (fs.existsSync(notesFilePath)) {
        try { notesData = JSON.parse(fs.readFileSync(notesFilePath, 'utf8')); } catch (e) { notesData = {}; }
    }

    notesData[projectPath] = noteVal;

    try {
        fs.writeFileSync(notesFilePath, JSON.stringify(notesData, null, 4), 'utf8');
        
        statusEl.innerText = "✓ Saved to extension folder";
        statusEl.classList.add('status-saved');
        statusEl.classList.remove('status-warning');
        
        setTimeout(() => {
            statusEl.classList.remove('status-saved');
            if (projectPath === "Untitled_Project") {
                statusEl.innerText = "⚠️ Project belum di-save! Catatan masuk ke kategori 'Untitled'";
                statusEl.classList.add('status-warning');
            } else {
                var fileName = projectPath.split('\\').pop().split('/').pop();
                statusEl.innerText = "Storage: project_notes.json (" + fileName + ")";
            }
        }, 2000);
    } catch (err) {
        statusEl.innerText = "❌ Gagal save file!";
        console.error(err);
    }
}

document.getElementById('projectNotes').addEventListener('input', function() {
    document.getElementById('noteStatus').innerText = "Mengetik...";
    clearTimeout(typingTimer);
    typingTimer = setTimeout(saveProjectNote, doneTypingInterval);
});

// --- BACKGROUND MONITOR (OTOMATIS MIGRASI & REFRESH) ---
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

            statusEl.dataset.path = currentPath;
            var fileName = currentPath.split('\\').pop().split('/').pop();
            
            statusEl.innerText = "✨ Auto-Migrated to " + fileName;
            statusEl.classList.remove('status-warning');
            statusEl.classList.add('status-saved');
            setTimeout(() => {
                 statusEl.classList.remove('status-saved');
                 statusEl.innerText = "Storage: project_notes.json (" + fileName + ")";
            }, 3000);
        }
        
        else if (oldPath !== currentPath && oldPath !== "Untitled_Project") {
            loadProjectNote();
        }
    });
}, 1500);