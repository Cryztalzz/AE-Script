var csInterface = new CSInterface();

// --- LOGIKA TABS ---
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;

    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    tablinks = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// --- TAB ESSENTIALS ---
function getRasio() {
    return document.getElementById('pilihComp').value;
}

document.getElementById('btnBikinCompOtomatis').addEventListener('click', function() {
    csInterface.evalScript('buatCompCustom("' + getRasio() + '")');
});
document.getElementById('btnSolidFill').addEventListener('click', function() { 
    csInterface.evalScript('buatSolidFill("' + getRasio() + '")'); 
});
document.getElementById('btnCam15').addEventListener('click', function() { 
    csInterface.evalScript('buatKamera15mm("' + getRasio() + '")'); 
});
document.getElementById('btnNullParent').addEventListener('click', function() { 
    csInterface.evalScript('buatNullParent()'); 
});
document.getElementById('btnTeksTengah').addEventListener('click', function() { 
    csInterface.evalScript('buatTeksTengah("' + getRasio() + '")'); 
});
document.getElementById('btnAdjComp').addEventListener('click', function() { 
    csInterface.evalScript('buatAdjComp()');
});
document.getElementById('btnAdjLayer').addEventListener('click', function() { 
    csInterface.evalScript('buatAdjLayer()');
});

// --- TAB PROJECT MANAGER ---
document.getElementById('btnAutoOrganize').addEventListener('click', function() {
    csInterface.evalScript('autoOrganizeProject()');
});

// --- TAB TIMELINE TOOLS ---
document.getElementById('pilihStagger').addEventListener('change', function() {
    var btnCut = document.getElementById('btnStaggerCut');
    if (this.value === 'end') {
        btnCut.style.display = 'none';
    } else {
        btnCut.style.display = 'block';
    }
});
document.getElementById('btnStagger').addEventListener('click', function() {
    var staggerValue = document.getElementById('pilihStagger').value;
    csInterface.evalScript('staggerLayers("' + staggerValue + '", false)');
});
document.getElementById('btnStaggerCut').addEventListener('click', function() {
    var staggerValue = document.getElementById('pilihStagger').value;
    csInterface.evalScript('staggerLayers("' + staggerValue + '", true)');
});
document.getElementById('btnPurgeCache').addEventListener('click', function() { 
    csInterface.evalScript('purgeCache()'); 
});

// --- TAB PRESETS ---
var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);

document.getElementById('btnApplyGlitch').addEventListener('click', function() {
    var namaPreset = document.getElementById('pilihGlitch').value;
    csInterface.evalScript('applyPreset("' + extPath + '", "' + namaPreset + '")');
});
document.getElementById('btnApplyMT').addEventListener('click', function() {
    var mtValue = document.getElementById('pilihMT').value;
    var isMirror = document.getElementById('checkMirror').checked;
    
    csInterface.evalScript('applyNativeMotionTile(' + mtValue + ', ' + isMirror + ')');
});
document.getElementById('btnTeksAnimasi').addEventListener('click', function() { 
    csInterface.evalScript('applyPreset("' + extPath + '", "texticatk.ffx")'); 
});
document.getElementById('btnRadiant').addEventListener('click', function() { 
    csInterface.evalScript('applyPreset("' + extPath + '", "radramp.ffx")'); 
});
document.getElementById('btnTwitch').addEventListener('click', function() { 
    csInterface.evalScript('applyPreset("' + extPath + '", "twitchvar.ffx")'); 
});