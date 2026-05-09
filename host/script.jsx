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
    app.beginUndoGroup("Bikin Solid");
    var comp = app.project.activeItem;
    if (comp == null || !(comp instanceof CompItem)) {
        alert("Buka comp dulu!");
    } else {
        comp.layers.addSolid([1, 1, 1], "Solid Layer", comp.width, comp.height, 1, comp.duration);
    }
    app.endUndoGroup();
}

function buatKamera15mm(rasio) {
    app.beginUndoGroup("Bikin Kamera 15mm");
    var comp = app.project.activeItem;
    if (comp != null && comp instanceof CompItem) {
        comp.layers.addCamera("Camera 15mm", [comp.width/2, comp.height/2]);
    }
    app.endUndoGroup();
}

function buatNullParent() {
    app.beginUndoGroup("Bikin Null + Parent");
    var comp = app.project.activeItem;
    if (comp != null && comp instanceof CompItem) {
        var nullLayer = comp.layers.addNull(comp.duration);
        nullLayer.name = "Controller Null";
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            comp.selectedLayers[i].parent = nullLayer;
        }
    }
    app.endUndoGroup();
}

function buatTeksTengah(rasio) {
    app.beginUndoGroup("Bikin Teks");
    var comp = app.project.activeItem;
    if (comp != null && comp instanceof CompItem) {
        var textLayer = comp.layers.addText("Teks Baru");
        var textProp = textLayer.property("Source Text").value;
        textProp.justification = ParagraphJustification.CENTER_JUSTIFY;
        textLayer.property("Source Text").setValue(textProp);
    }
    app.endUndoGroup();
}

function buatAdjComp() {
    app.beginUndoGroup("Adj Comp");
    var comp = app.project.activeItem;
    if (comp != null && comp instanceof CompItem) {
        var adjLayer = comp.layers.addSolid([1, 1, 1], "Adjustment Layer", comp.width, comp.height, 1, comp.duration);
        adjLayer.adjustmentLayer = true;
    }
    app.endUndoGroup();
}

function buatAdjLayer() {
    app.beginUndoGroup("Adj Layer");
    var comp = app.project.activeItem;
    if (comp != null && comp instanceof CompItem) {
        if (comp.selectedLayers.length === 0) {
            alert("Pilih layer dulu bos!");
            return;
        }
        var target = comp.selectedLayers[0];
        var adjLayer = comp.layers.addSolid([1, 1, 1], "Adj Target", comp.width, comp.height, 1, comp.duration);
        adjLayer.adjustmentLayer = true;
        adjLayer.moveBefore(target);
        adjLayer.startTime = target.startTime;
        adjLayer.inPoint = target.inPoint;
        adjLayer.outPoint = target.outPoint;
    }
    app.endUndoGroup();
}

function autoOrganizeProject() {
    app.beginUndoGroup("Auto Organize Project");
    var proj = app.project;
    function ambilAtauBikinFolder(namaFolder) {
        for (var i = 1; i <= proj.numItems; i++) {
            if (proj.item(i) instanceof FolderItem && proj.item(i).name === namaFolder) return proj.item(i);
        }
        return proj.items.addFolder(namaFolder);
    }

    var rootFolder = proj.rootFolder;
    var daftarFile = [];
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item.parentFolder !== rootFolder || item instanceof FolderItem) continue;
        if (item instanceof FootageItem && item.mainSource instanceof SolidSource) continue;
        daftarFile.push(item);
    }

    var folderComps = null, folderAssets = null, folderAudio = null;

    for (var j = 0; j < daftarFile.length; j++) {
        var item = daftarFile[j];
        if (item instanceof CompItem) {
            if (!folderComps) folderComps = ambilAtauBikinFolder("01_COMPS");
            item.parentFolder = folderComps;
        } else if (item instanceof FootageItem) {
            if (item.hasAudio && !item.hasVideo) {
                if (!folderAudio) folderAudio = ambilAtauBikinFolder("03_AUDIO");
                item.parentFolder = folderAudio;
            } else {
                if (!folderAssets) folderAssets = ambilAtauBikinFolder("02_ASSETS");
                item.parentFolder = folderAssets;
            }
        }
    }
    app.endUndoGroup();
}

function unPrecompose() {
    app.beginUndoGroup("Un-Precompose Pro");
    var comp = app.project.activeItem;
    
    if (comp == null || !(comp instanceof CompItem) || comp.selectedLayers.length !== 1) {
        alert("Cuma bisa pilih 1 layer composition!");
        return;
    }

    var precompLayer = comp.selectedLayers[0];
    if (!(precompLayer.source instanceof CompItem)) {
        alert("Ini bukan layer composition!");
        return;
    }

    var sourceComp = precompLayer.source;
    var oldTime = comp.time;
    var layerStart = precompLayer.startTime;
    var layerIn = precompLayer.inPoint;
    var layerOut = precompLayer.outPoint;

    sourceComp.openInViewer();
    
    var layerData = [];
    for (var i = 1; i <= sourceComp.numLayers; i++) {
        var L = sourceComp.layer(i);
        layerData.push({
            name: L.name,
            startTime: L.startTime,
            parentName: (L.parent !== null) ? L.parent.name : null
        });
        
        L.parent = null;
        L.locked = false;
        L.selected = true;
    }

    app.executeCommand(app.findMenuCommandId("Copy")); 

    comp.openInViewer();
    comp.time = layerStart; 

    for (var j = 1; j <= comp.numLayers; j++) { comp.layer(j).selected = false; }
    precompLayer.selected = true;

    app.executeCommand(app.findMenuCommandId("Paste"));

    var pastedLayers = comp.selectedLayers;

    for (var k = 0; k < pastedLayers.length; k++) {
        var pLayer = pastedLayers[k];
        var data = layerData[k];
        
        pLayer.startTime = layerStart + data.startTime;

        try {
            if (pLayer.inPoint < layerIn) pLayer.inPoint = layerIn;
            if (pLayer.outPoint > layerOut) pLayer.outPoint = layerOut;
        } catch(e) {}
    }

    for (var m = 0; m < pastedLayers.length; m++) {
        var childLayer = pastedLayers[m];
        var pName = layerData[m].parentName;

        if (pName !== null) {
            for (var n = 0; n < pastedLayers.length; n++) {
                if (pastedLayers[n].name === pName) {
                    childLayer.parent = pastedLayers[n];
                    break;
                }
            }
        }
    }

    precompLayer.remove();
    comp.time = oldTime;
    
    app.endUndoGroup();
}

function getNextPrecompName() {
    var baseName = "Precomp ";
    var index = 1;
    var nameFound = true;
    var proj = app.project;

    while (nameFound) {
        nameFound = false;
        var checkName = baseName + index;
        for (var i = 1; i <= proj.numItems; i++) {
            if (proj.item(i).name === checkName) {
                nameFound = true;
                index++;
                break;
            }
        }
    }
    return baseName + index;
}

function preComposePro(moveAllStr, adjDurationStr, customName) {
    app.beginUndoGroup("Pre-compose Pro");
    var comp = app.project.activeItem;

    if (comp == null || !(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
        alert("Pilih layer dulu yang mau di pre-comp!");
        return;
    }

    var moveAll = (moveAllStr === "true");
    var adjDuration = (adjDurationStr === "true");

    if (!moveAll && comp.selectedLayers.length > 1) {
        alert("Peringatan: Kalo pilih 'Leave all attributes', pilih 1 layer aja bos!");
        return;
    }

    var layers = comp.selectedLayers;
    var indices = [];
    var minIn = layers[0].inPoint;
    var maxOut = layers[0].outPoint;

    for (var i = 0; i < layers.length; i++) {
        indices.push(layers[i].index);
        if (layers[i].inPoint < minIn) minIn = layers[i].inPoint;
        if (layers[i].outPoint > maxOut) maxOut = layers[i].outPoint;
    }

    var compName = customName;
    if (compName === "" || compName === null) {
        compName = getNextPrecompName();
    }

    var newComp = comp.layers.precompose(indices, compName, moveAll);

    if (moveAll && adjDuration) {
        newComp.duration = maxOut - minIn;
        for (var k = 1; k <= newComp.numLayers; k++) {
            newComp.layer(k).startTime -= minIn;
        }
        for (var l = 1; l <= comp.numLayers; l++) {
            if (comp.layer(l).source === newComp) {
                comp.layer(l).startTime = minIn;
                break;
            }
        }
    }

    app.endUndoGroup();
}

function staggerLayers(val, doTrim) {
    app.beginUndoGroup("Stagger Layers");
    var comp = app.project.activeItem;
    if (comp == null || !(comp instanceof CompItem) || comp.selectedLayers.length < 2) {
        alert("Pilih minimal 2 layer!");
    } else {
        var layers = comp.selectedLayers, frameDur = comp.frameDuration;
        for (var i = 1; i < layers.length; i++) {
            var prevLayer = layers[i - 1], currLayer = layers[i];
            var offsetToInPoint = currLayer.inPoint - currLayer.startTime;
            var targetInPoint = (val === "end") ? prevLayer.outPoint : prevLayer.inPoint + (parseInt(val) * frameDur);
            currLayer.startTime = targetInPoint - offsetToInPoint;
            if (doTrim === true || doTrim === "true") prevLayer.outPoint = currLayer.inPoint;
        }
        if ((doTrim === true || doTrim === "true") && val !== "end") {
            var lastLayer = layers[layers.length - 1];
            lastLayer.outPoint = lastLayer.inPoint + (parseInt(val) * frameDur);
        }
    }
    app.endUndoGroup();
}

function applyNativeMotionTile(mtValue, isMirror) {
    app.beginUndoGroup("Apply Motion Tile");
    var comp = app.project.activeItem;
    if (comp == null || comp.selectedLayers.length === 0) return;
    for (var i = 0; i < comp.selectedLayers.length; i++) {
        var layer = comp.selectedLayers[i];
        var mtEffect = layer.property("Effects").addProperty("ADBE Tile");
        mtEffect.property("Output Width").setValue(parseInt(mtValue));
        mtEffect.property("Output Height").setValue(parseInt(mtValue));
        mtEffect.property("Mirror Edges").setValue((isMirror === true || isMirror === "true") ? 1 : 0);
    }
    app.endUndoGroup();
}

function purgeCache() { app.purge(PurgeTarget.ALL_CACHES); alert("Memory & Disk Cache Bersih!"); }