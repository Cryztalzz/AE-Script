function ensureComp(rasio, forceNew) {
    var comp = app.project.activeItem;
    
    if (forceNew || comp == null || !(comp instanceof CompItem)) {
        var w = 1920; var h = 1080;
        if (rasio === "16:9") { w = 1920; h = 1080; }
        else if (rasio === "4:3") { w = 1440; h = 1080; }
        else if (rasio === "1:1") { w = 1080; h = 1080; }
        
        comp = app.project.items.addComp("Comp " + rasio, w, h, 1, 10, 30);
        
        comp.motionBlurSamplesPerFrame = 64;
        comp.motionBlurAdaptiveSampleLimit = 256;
        
        comp.openInViewer();
    }
    return comp;
}

function buatCompCustom(rasio) {
    app.beginUndoGroup("Bikin Comp Baru");
    ensureComp(rasio, true); 
    app.endUndoGroup();
}

function buatSolidFill(rasio, addFill) {
    app.beginUndoGroup("Bikin Black Solid");
    var comp = ensureComp(rasio);
    var solidLayer = comp.layers.addSolid([0, 0, 0], "Black Solid", comp.width, comp.height, 1, comp.duration);
    
    if (addFill === true || addFill === "true") {
        var fillEffect = solidLayer.property("Effects").addProperty("ADBE Fill");
        fillEffect.property("Color").setValue([0, 0, 0]);
    }
    app.endUndoGroup();
}

function buatKamera(rasio) {
    app.beginUndoGroup("Bikin Kamera");
    var comp = ensureComp(rasio);
    
    comp.openInViewer();

    app.executeCommand(2564);
    
    app.endUndoGroup();
}

function buatNullParent() {
    app.beginUndoGroup("Bikin Null + Parent");
    var comp = app.project.activeItem;

    if (!comp || !(comp instanceof CompItem)) {
        alert("Open or select a composition first!");
        app.endUndoGroup();
        return;
    }

    var selectedLayers = comp.selectedLayers;
    var nullLayer = comp.layers.addNull(comp.duration);
    nullLayer.name = "Control Null";

    nullLayer.position.setValue([comp.width / 2, comp.height / 2]);

    if (selectedLayers.length > 0) {
        var topIndex = selectedLayers[0].index;
        var isAny3D = false;
        
        var minIn = selectedLayers[0].inPoint;
        var maxOut = selectedLayers[0].outPoint;

        for (var i = 0; i < selectedLayers.length; i++) {
            var currentLayer = selectedLayers[i];
            
            if (currentLayer.threeDLayer) isAny3D = true;
            
            if (currentLayer.inPoint < minIn) minIn = currentLayer.inPoint;
            if (currentLayer.outPoint > maxOut) maxOut = currentLayer.outPoint;
            
            currentLayer.parent = nullLayer;
            
            if (currentLayer.index < topIndex) topIndex = currentLayer.index;
        }

        nullLayer.moveBefore(comp.layer(topIndex));
        
        nullLayer.inPoint = minIn;
        nullLayer.outPoint = maxOut;
        
        if (isAny3D) {
            nullLayer.threeDLayer = true;
            nullLayer.position.setValue([comp.width / 2, comp.height / 2, 0]);
        }

    } else {
        if (comp.numLayers > 1) {
            var targetLayer = comp.layer(2);
            targetLayer.parent = nullLayer;
            
            nullLayer.inPoint = targetLayer.inPoint;
            nullLayer.outPoint = targetLayer.outPoint;

            if (targetLayer.threeDLayer) {
                nullLayer.threeDLayer = true;
                nullLayer.position.setValue([comp.width / 2, comp.height / 2, 0]);
            }
        }
    }

    app.endUndoGroup();
}

function buatTeksTengah(rasio) {
    app.beginUndoGroup("Bikin Text Tengah");
    var comp = ensureComp(rasio);
    
    var textLayer = comp.layers.addText("NEW TEXT");
    
    var sourceText = textLayer.property("Source Text");
    var textDocument = sourceText.value;
    sourceText.setValue(textDocument); 

    var rect = textLayer.sourceRectAtTime(0, false);
    
    var xAnchor = rect.left + rect.width / 2;
    var yAnchor = rect.top + rect.height / 2;
    textLayer.anchorPoint.setValue([xAnchor, yAnchor]);
    
    var xPos = comp.width / 2;
    var yPos = comp.height / 2;
    textLayer.position.setValue([xPos, yPos]);
    
    app.endUndoGroup();
}

function buatAdjComp(rasio) {
    app.beginUndoGroup("Adj Comp");
    var comp = ensureComp(rasio);
    var adjLayer = comp.layers.addSolid([1, 1, 1], "Adjustment Layer", comp.width, comp.height, 1, comp.duration);
    adjLayer.adjustmentLayer = true; 
    adjLayer.label = 5; 
    
    app.endUndoGroup();
}

function buatAdjLayer() {
    app.beginUndoGroup("Adj Layer");
    var comp = app.project.activeItem;
    
    if (comp != null && comp instanceof CompItem) {
        var selectedLayers = comp.selectedLayers;
        var adjLayer = comp.layers.addSolid([1, 1, 1], "Adjustment Layer", comp.width, comp.height, 1, comp.duration);
        adjLayer.adjustmentLayer = true;
        adjLayer.label = 5;
        
        if (selectedLayers.length > 0) {
            var target = selectedLayers[0];
            adjLayer.moveBefore(target);
            adjLayer.startTime = target.startTime;
            adjLayer.inPoint = target.inPoint;
            adjLayer.outPoint = target.outPoint;
        }
    } else {
        alert("Open or select a composition first!");
    }
    app.endUndoGroup();
}

function autoOrganizeProject() {
    app.beginUndoGroup("Auto Organize Project");
    var proj = app.project;
    function getFolder(name) {
        for (var i = 1; i <= proj.numItems; i++) {
            if (proj.item(i) instanceof FolderItem && proj.item(i).name === name) return proj.item(i);
        }
        return proj.items.addFolder(name);
    }
    var root = proj.rootFolder;
    var files = [];
    for (var i = 1; i <= proj.numItems; i++) {
        var it = proj.item(i);
        if (it.parentFolder === root && !(it instanceof FolderItem)) files.push(it);
    }
    var fComps = null, fAssets = null, fAudio = null;
    for (var j = 0; j < files.length; j++) {
        var it = files[j];
        if (it instanceof CompItem) {
            if (!fComps) fComps = getFolder("01_COMPS");
            it.parentFolder = fComps;
        } else if (it instanceof FootageItem) {
            if (it.hasAudio && !it.hasVideo) {
                if (!fAudio) fAudio = getFolder("03_AUDIO");
                it.parentFolder = fAudio;
            } else {
                if (!fAssets) fAssets = getFolder("02_ASSETS");
                it.parentFolder = fAssets;
            }
        }
    }
    app.endUndoGroup();
}

function preComposePro(moveAllStr, adjDurStr, customName) {
    app.beginUndoGroup("Pre-compose Pro");
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return;
    var moveAll = (moveAllStr === "true"), adjDur = (adjDurStr === "true");
    var layers = comp.selectedLayers, indices = [], minIn = layers[0].inPoint, maxOut = layers[0].outPoint;
    for (var i = 0; i < layers.length; i++) {
        indices.push(layers[i].index);
        if (layers[i].inPoint < minIn) minIn = layers[i].inPoint;
        if (layers[i].outPoint > maxOut) maxOut = layers[i].outPoint;
    }
    var name = customName === "" ? "Pre-comp" : customName;
    var newComp = comp.layers.precompose(indices, name, moveAll);
    if (moveAll && adjDur) {
        newComp.duration = maxOut - minIn;
        for (var k = 1; k <= newComp.numLayers; k++) newComp.layer(k).startTime -= minIn;
        for (var l = 1; l <= comp.numLayers; l++) {
            if (comp.layer(l).source === newComp) { comp.layer(l).startTime = minIn; break; }
        }
    }
    app.endUndoGroup();
}

function unPrecompose() {
    app.beginUndoGroup("Un-Precompose Pro");
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length !== 1) return;
    var preL = comp.selectedLayers[0];
    if (!(preL.source instanceof CompItem)) return;
    var src = preL.source, oldT = comp.time, lStart = preL.startTime, lIn = preL.inPoint, lOut = preL.outPoint;
    src.openInViewer();
    var data = [];
    for (var i = 1; i <= src.numLayers; i++) {
        var L = src.layer(i);
        data.push({ name: L.name, start: L.startTime, pName: L.parent ? L.parent.name : null });
        L.parent = null; L.locked = false; L.selected = true;
    }
    app.executeCommand(app.findMenuCommandId("Copy"));
    comp.openInViewer(); comp.time = lStart;
    for (var j = 1; j <= comp.numLayers; j++) comp.layer(j).selected = false;
    preL.selected = true;
    app.executeCommand(app.findMenuCommandId("Paste"));
    var pasted = comp.selectedLayers;
    for (var k = 0; k < pasted.length; k++) {
        pasted[k].startTime = lStart + data[k].start;
        try { if (pasted[k].inPoint < lIn) pasted[k].inPoint = lIn; if (pasted[k].outPoint > lOut) pasted[k].outPoint = lOut; } catch(e) {}
    }
    for (var m = 0; m < pasted.length; m++) {
        var pN = data[m].pName;
        if (pN) {
            for (var n = 0; n < pasted.length; n++) {
                if (pasted[n].name === pN) { pasted[m].parent = pasted[n]; break; }
            }
        }
    }
    preL.remove(); comp.time = oldT;
    app.endUndoGroup();
}

function staggerLayers(val, doTrim) {
    app.beginUndoGroup("Stagger Layers & Auto Cut");
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length < 1) {
        app.endUndoGroup();
        return;
    }

    var layers = comp.selectedLayers;
    var fDur = comp.frameDuration;
    var isTrim = (doTrim === true || doTrim === "true");
    
    var stepFrames = parseInt(val);
    var stepDuration = stepFrames * fDur;

    for (var i = 0; i < layers.length; i++) {
        var cur = layers[i];
        
        if (i > 0) {
            var prev = layers[i-1];
            var offset = cur.inPoint - cur.startTime;
            var target;

            if (val === "end") {
                target = prev.outPoint;
            } else {
                target = prev.inPoint + stepDuration;
            }
            cur.startTime = target - offset;
        }

        if (isTrim) {
            if (val !== "end") {
                cur.outPoint = cur.inPoint + stepDuration;
            } else {
            }
        }
    }
    app.endUndoGroup();
}

function applyNativeMotionTile(mtVal, mirror) {
    app.beginUndoGroup("Apply Motion Tile");
    var comp = app.project.activeItem;
    if (!comp || comp.selectedLayers.length === 0) return;
    for (var i = 0; i < comp.selectedLayers.length; i++) {
        var L = comp.selectedLayers[i];
        var fx = L.property("Effects").addProperty("ADBE Tile");
        fx.property("Output Width").setValue(parseInt(mtVal));
        fx.property("Output Height").setValue(parseInt(mtVal));
        fx.property("Mirror Edges").setValue(mirror ? 1 : 0);
    }
    app.endUndoGroup();
}

function generateOrUpdateWM(txt, pos, scaleVal) {
    app.beginUndoGroup("Generate/Update Watermark");
    var comp = app.project.activeItem;
    if (!comp) return;
    var wm = null, tag = " (WM)";
    for (var i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i).name.indexOf(tag) !== -1) { wm = comp.layer(i); break; }
    }
    if (!wm) {
        wm = comp.layers.addText(txt);
        wm.blendingMode = BlendingMode.OVERLAY;
        wm.label = 11;
    } else {
        wm.property("Source Text").setValue(txt);
    }
    wm.name = txt + tag;
    var r = wm.sourceRectAtTime(0, false);
    wm.anchorPoint.setValue([r.left + r.width/2, r.top + r.height/2]);
    wm.scale.setValue([scaleVal, scaleVal]);
    var pad = 60, w = comp.width, h = comp.height;
    var cW = (r.width * scaleVal) / 100, cH = (r.height * scaleVal) / 100;
    var nP = [w/2, h/2];
    switch(pos) {
        case "TL": nP = [pad + cW/2, pad + cH/2]; break;
        case "TC": nP = [w/2, pad + cH/2]; break;
        case "TR": nP = [w - pad - cW/2, pad + cH/2]; break;
        case "ML": nP = [pad + cW/2, h/2]; break;
        case "MC": nP = [w/2, h/2]; break;
        case "MR": nP = [w - pad - cW/2, h/2]; break;
        case "BL": nP = [pad + cW/2, h - pad - cH/2]; break;
        case "BC": nP = [w/2, h - pad - cH/2]; break;
        case "BR": nP = [w - pad - cW/2, h - pad - cH/2]; break;
    }
    wm.position.setValue(nP);
    app.endUndoGroup();
}

function purgeCache() { app.purge(PurgeTarget.ALL_CACHES); alert("Memory & Disk cache cleared!"); }

function getProjectPath() {
    if (app.project && app.project.file) {
        return app.project.file.fsName;
    } else {
        return "Untitled_Project";
    }
}