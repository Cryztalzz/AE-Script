function cekDanBikinComp(rasio) {
    var comp = app.project.activeItem;
    
    if (comp == null || !(comp instanceof CompItem)) {
        var w = 1920; 
        var h = 1080;
        
        if (rasio === "16:9") { w = 1920; h = 1080; }
        else if (rasio === "4:3") { w = 1440; h = 1080; }
        else if (rasio === "1:1") { w = 1080; h = 1080; }

        comp = app.project.items.addComp("Comp " + rasio, w, h, 1, 10, 30);
        comp.openInViewer();
    }
    return comp;
}

function buatCompCustom(rasio) {
    app.beginUndoGroup("Bikin Comp " + rasio);
    var w = 1920; var h = 1080;
    if (rasio === "16:9") { w = 1920; h = 1080; }
    else if (rasio === "4:3") { w = 1440; h = 1080; }
    else if (rasio === "1:1") { w = 1080; h = 1080; }
    var comp = app.project.items.addComp("Comp " + rasio, w, h, 1, 10, 30);
    comp.openInViewer();
    app.endUndoGroup();
}

function buatSolidFill(rasio) {
    app.beginUndoGroup("Solid + Fill Hitam");
    var comp = cekDanBikinComp(rasio);
    
    var solid = comp.layers.addSolid([0, 0, 0], "Solid Hitam", comp.width, comp.height, 1, comp.duration);
    var fillEffect = solid.property("ADBE Effect Parade").addProperty("ADBE Fill");
    fillEffect.property("Color").setValue([0, 0, 0]); 
    
    app.endUndoGroup();
}

function buatKamera15mm(rasio) {
    app.beginUndoGroup("Kamera 15mm");
    var comp = cekDanBikinComp(rasio);
    
    var cam = comp.layers.addCamera("Kamera 15mm", [comp.width/2, comp.height/2]);
    var zoomHitung = (comp.width / 36) * 15;
    cam.property("ADBE Camera Zoom").setValue(zoomHitung);
    
    app.endUndoGroup();
}

function buatNullParent() {
    app.beginUndoGroup("Null Parent & Track");
    var comp = app.project.activeItem;
    
    if (comp == null || !(comp instanceof CompItem)) {
        alert("Buka Composition dulu buat bikin Null!");
    } else {
        var layerYangDipilih = comp.selectedLayers;
        var adaTarget = layerYangDipilih.length > 0;
        var targetLayer = null;
        
        if (adaTarget) {
            targetLayer = layerYangDipilih[0];
        }

        var nullLayer = comp.layers.addNull(comp.duration);
        
        if (adaTarget && targetLayer != null) {
            nullLayer.moveBefore(targetLayer);
            nullLayer.parent = targetLayer;
        } 
        else if (comp.numLayers >= 2) {
            nullLayer.parent = comp.layer(2);
        }
    }
    app.endUndoGroup();
}

function buatTeksTengah(rasio) {
    app.beginUndoGroup("Teks Tengah");
    var comp = cekDanBikinComp(rasio);
    
    var txtLayer = comp.layers.addText("ANJAY");
    var txtRect = txtLayer.sourceRectAtTime(0, false);
    
    var anchorX = txtRect.left + (txtRect.width / 2);
    var anchorY = txtRect.top + (txtRect.height / 2);
    txtLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([anchorX, anchorY]);
    txtLayer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width/2, comp.height/2]);
    
    app.endUndoGroup();
}

function buatAdjComp() {
    app.beginUndoGroup("Adj Layer (Comp)");
    var comp = app.project.activeItem;
    
    if (comp == null || !(comp instanceof CompItem)) {
        alert("Buka Composition dulu buat bikin Adjustment Layer!");
    } else {
        var adjLayer = comp.layers.addSolid([1, 1, 1], "Adjustment Layer", comp.width, comp.height, 1, comp.duration);
        adjLayer.adjustmentLayer = true;
        adjLayer.label = 5; 
    }
    app.endUndoGroup();
}

function buatAdjLayer() {
    app.beginUndoGroup("Adj Layer (Target)");
    var comp = app.project.activeItem;
    
    if (comp == null || !(comp instanceof CompItem)) {
        alert("Buka Composition dulu buat bikin Adjustment Layer!");
    } else {
        var layerYangDipilih = comp.selectedLayers;
        
        if (layerYangDipilih.length == 0) {
            alert("Pilih layer dulu bos buat diikutin durasinya!");
        } else {
            var targetLayer = layerYangDipilih[0]; 
            
            var adjLayer = comp.layers.addSolid([1, 1, 1], "Adjustment (Target)", comp.width, comp.height, 1, comp.duration);
            adjLayer.adjustmentLayer = true;
            adjLayer.label = 5;
            adjLayer.moveBefore(targetLayer);
            adjLayer.startTime = targetLayer.startTime;
            adjLayer.inPoint = targetLayer.inPoint;
            adjLayer.outPoint = targetLayer.outPoint;
        }
    }
    app.endUndoGroup();
}

function applyPreset(extPath, namaFilePreset) {
    app.beginUndoGroup("Apply Preset " + namaFilePreset);
    var comp = app.project.activeItem;
    
    if (comp == null || !(comp instanceof CompItem) || comp.selectedLayers.length == 0) {
        alert("Pilih layer dulu buat dikasih preset!");
    } else {
        var presetFile = new File(extPath + "/effects/" + namaFilePreset);
        
        if (!presetFile.exists) {
            alert("File preset nggak ketemu di: " + decodeURI(presetFile.fsName));
        } else {
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                comp.selectedLayers[i].applyPreset(presetFile);
            }
        }
    }
    app.endUndoGroup();
}

function autoOrganizeProject() {
    app.beginUndoGroup("Auto Organize Project");
    var proj = app.project;
    
    function ambilAtauBikinFolder(namaFolder) {
        for (var i = 1; i <= proj.numItems; i++) {
            if (proj.item(i) instanceof FolderItem && proj.item(i).name === namaFolder) {
                return proj.item(i);
            }
        }
        return proj.items.addFolder(namaFolder);
    }

    var folderComps = ambilAtauBikinFolder("01_COMPS");
    var folderAssets = ambilAtauBikinFolder("02_ASSETS");
    var folderAudio = ambilAtauBikinFolder("04_AUDIO");

    var rootFolder = proj.rootFolder;
    
    var daftarFile = [];
    
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        
        if (item.parentFolder !== rootFolder || item instanceof FolderItem) {
            continue;
        }
        
        if (item instanceof FootageItem && item.mainSource instanceof SolidSource) {
            continue;
        }
        
        daftarFile.push(item);
    }

    for (var j = 0; j < daftarFile.length; j++) {
        var item = daftarFile[j];
        
        if (item instanceof CompItem) {
            item.parentFolder = folderComps;
        } else if (item instanceof FootageItem) {
            if (item.hasAudio && !item.hasVideo) {
                item.parentFolder = folderAudio;
            } else {
                item.parentFolder = folderAssets;
            }
        }
    }
    
    app.endUndoGroup();
}

function staggerLayers(val, doTrim) {
    app.beginUndoGroup("Stagger Layers");
    var comp = app.project.activeItem;

    if (comp == null || !(comp instanceof CompItem) || comp.selectedLayers.length < 2) {
        alert("Pilih minimal 2 layer di timeline bos!");
    } else {
        var layers = comp.selectedLayers;
        var frameDur = comp.frameDuration;
        
        for (var i = 1; i < layers.length; i++) {
            var prevLayer = layers[i - 1];
            var currLayer = layers[i];
            
            var offsetToInPoint = currLayer.inPoint - currLayer.startTime;
            var targetInPoint;

            if (val === "end") {
                targetInPoint = prevLayer.outPoint;
            } else {
                var framesToShift = parseInt(val);
                var timeToShift = framesToShift * frameDur;
                targetInPoint = prevLayer.inPoint + timeToShift;
            }

            currLayer.startTime = targetInPoint - offsetToInPoint;

            if (doTrim === true || doTrim === "true") {
                prevLayer.outPoint = currLayer.inPoint;
            }
        }

        if ((doTrim === true || doTrim === "true") && val !== "end") {
            var lastLayer = layers[layers.length - 1];
            var framesToShift = parseInt(val);
            var timeToShift = framesToShift * frameDur;
            lastLayer.outPoint = lastLayer.inPoint + timeToShift;
        }
    }
    app.endUndoGroup();
}

function purgeCache() {
    app.purge(PurgeTarget.ALL_CACHES);
    
    alert("Memory & Disk Cache Purged!");
}