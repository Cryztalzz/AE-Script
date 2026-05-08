var csInterface = new CSInterface();

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

var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);

document.getElementById('btnApplyGlitch').addEventListener('click', function() {
    var namaPreset = document.getElementById('pilihGlitch').value;
    csInterface.evalScript('applyPreset("' + extPath + '", "' + namaPreset + '")');
});

document.getElementById('btnApplyMT').addEventListener('click', function() {
    var namaPreset = document.getElementById('pilihMT').value;
    csInterface.evalScript('applyPreset("' + extPath + '", "' + namaPreset + '")');
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