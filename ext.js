var curvaseApp = (function() {
    "use strict";
    var csInterface, editor;
    var selectedIndex = -1;

    var allPresets = [
        { name: "Linear", x1: 0.00, y1: 0.00, x2: 1.00, y2: 1.00 },
        { name: "Ease", x1: 0.25, y1: 0.10, x2: 0.25, y2: 1.00 },
        { name: "Ease In", x1: 0.42, y1: 0.00, x2: 1.00, y2: 1.00 },
        { name: "Ease Out", x1: 0.00, y1: 0.00, x2: 0.58, y2: 1.00 },
        { name: "Ease In Out", x1: 0.42, y1: 0.00, x2: 0.58, y2: 1.00 },
        { name: "Fast 1", x1: 0.00, y1: 1.00, x2: 1.00, y2: 1.00 },
        { name: "Fast 2", x1: 0.00, y1: 1.00, x2: 0.50, y2: 1.00 },
        { name: "Fast 3", x1: 0.00, y1: 1.00, x2: 0.00, y2: 1.00 },
        { name: "Slow 1", x1: 1.00, y1: 0.00, x2: 0.00, y2: 0.00 },
        { name: "Slow 2", x1: 0.50, y1: 0.00, x2: 0.00, y2: 0.00 },
        { name: "Slow 3", x1: 0.00, y1: 0.00, x2: 0.00, y2: 0.00 },
        { name: "Urgent", x1: 0.00, y1: 1.00, x2: 0.00, y2: 0.00 },
        { name: "Brisk", x1: 1.00, y1: 1.00, x2: 0.00, y2: 1.00 },
        { name: "Uniform", x1: 1.00, y1: 0.00, x2: 1.00, y2: 1.00 },
        { name: "Stark", x1: 0.00, y1: 0.00, x2: 1.00, y2: 0.00 },
        { name: "None", x1: 0.00, y1: 0.00, x2: 0.00, y2: 1.00 },
        { name: "Rough", x1: 1.00, y1: 0.00, x2: 0.00, y2: 1.00 },
        { name: "Exposed", x1: 1.00, y1: 1.00, x2: 0.00, y2: 0.00 },
        { name: "Inverse", x1: 1.00, y1: 1.00, x2: 1.00, y2: 1.00 },
        { name: "Default", x1: 0.00, y1: 0.00, x2: 0.00, y2: 0.00 }
    ];
    function init() {
        try { csInterface = new CSInterface(); } catch(e) { return; }
        editor = new Curvase.BezierEditor("curve-canvas");
        editor.onUpdate = syncInputs;

        loadData();
        render();

        var demakLogic = `
        $._demak = $._demak || {};
            Object.assign($._demak, {
                moveAnchor: function(x, y) {
                    app.beginUndoGroup("Move Anchor");
                    var comp = app.project.activeItem;
                    if (!(comp instanceof CompItem)) { app.endUndoGroup(); return; }
                    var sel = comp.selectedLayers;
                    if (sel.length === 0) { app.endUndoGroup(); return; }
                    for (var i = 0; i < sel.length; i++) {
                        var L = sel[i];
                        if (!L.source && L.nullLayer) continue;
                        var oldAnchor = L.anchorPoint.value;
                        var newAnchor = [oldAnchor[0], oldAnchor[1], oldAnchor[2]];
                        var r;
                        try { r = L.sourceRectAtTime(comp.time, false); } catch(e) { continue; }
                        if (x === "left") newAnchor[0] = r.left;
                        if (x === "center") newAnchor[0] = r.left + r.width / 2;
                        if (x === "right") newAnchor[0] = r.left + r.width;
                        if (y === "top") newAnchor[1] = r.top;
                        if (y === "middle") newAnchor[1] = r.top + r.height / 2;
                        if (y === "bottom") newAnchor[1] = r.top + r.height;
                        var anchorDelta = [newAnchor[0] - oldAnchor[0], newAnchor[1] - oldAnchor[1], newAnchor[2] - oldAnchor[2]];
                        L.anchorPoint.setValue(newAnchor);
                        var oldPos = L.position.value;
                        var s = L.scale.value[0] / 100;
                        L.position.setValue([oldPos[0] + anchorDelta[0] * s, oldPos[1] + anchorDelta[1] * s, oldPos[2] + anchorDelta[2] * s]);
                    }
                    app.endUndoGroup();
                },
                alignLayer: function(x, y) {
                    app.beginUndoGroup("Align Layer");
                    var comp = app.project.activeItem;
                    if (!(comp instanceof CompItem)) { app.endUndoGroup(); return; }
                    var sel = comp.selectedLayers;
                    if (sel.length === 0) { app.endUndoGroup(); return; }
                    for (var i = 0; i < sel.length; i++) {
                        var L = sel[i];
                        var pos = L.position.value;
                        var layerWidth, layerHeight;
                        if (L.source && L.source instanceof CompItem) {
                            layerWidth = L.source.width * (L.scale.value[0] / 100);
                            layerHeight = L.source.height * (L.scale.value[1] / 100);
                        } else {
                            try {
                                var rect = L.sourceRectAtTime(comp.time, false);
                                layerWidth = rect.width;
                                layerHeight = rect.height;
                            } catch(e) {
                                layerWidth = L.width;
                                layerHeight = L.height;
                            }
                        }
                        if (x === "left") pos[0] = layerWidth / 2;
                        else if (x === "center") pos[0] = comp.width / 2;
                        else if (x === "right") pos[0] = comp.width - (layerWidth / 2);
                        if (y === "top") pos[1] = layerHeight / 2;
                        else if (y === "middle") pos[1] = comp.height / 2;
                        else if (y === "bottom") pos[1] = comp.height - (layerHeight / 2);
                        L.position.setValue(pos);
                    }
                    app.endUndoGroup();
                },
                ensureComp: function(rasio) {
                    var comp = app.project.activeItem;
                    if (comp && (comp instanceof CompItem)) return comp;
                    var w = 1920, h = 1080;
                    if (rasio === "4:3") { w = 1440; h = 1080; }
                    else if (rasio === "1:1") { w = 1080; h = 1080; }
                    comp = app.project.items.addComp("Comp " + rasio, w, h, 1, 10, 30);
                    comp.openInViewer();
                    return comp;
                },
                makeComp: function(rasio) {
                    app.beginUndoGroup("Bikin Comp " + rasio);
                    var w = 1920, h = 1080;
                    if (rasio === "4:3") { w = 1440; h = 1080; }
                    else if (rasio === "1:1") { w = 1080; h = 1080; }
                    var comp = app.project.items.addComp("Comp " + rasio, w, h, 1, 10, 30);
                    comp.openInViewer();
                    app.endUndoGroup();
                },
                solidFill: function(rasio) {
                    app.beginUndoGroup("Solid + Fill Hitam");
                    var comp = $._demak.ensureComp(rasio);
                    var solid = comp.layers.addSolid([0, 0, 0], "Solid Hitam", comp.width, comp.height, 1, comp.duration);
                    var fillFx = solid.property("ADBE Effect Parade").addProperty("ADBE Fill");
                    fillFx.property("Color").setValue([0, 0, 0]);
                    app.endUndoGroup();
                },
                cam15: function(rasio) {
                    app.beginUndoGroup("Kamera 15mm");
                    var comp = $._demak.ensureComp(rasio);
                    var cam = comp.layers.addCamera("Kamera 15mm", [comp.width / 2, comp.height / 2]);
                    var zoom = (comp.width / 36) * 15;
                    cam.property("ADBE Camera Zoom").setValue(zoom);
                    app.endUndoGroup();
                },
                nullParent: function() {
                    app.beginUndoGroup("Null Parent & Track");
                    var comp = app.project.activeItem;
                    if (!(comp instanceof CompItem)) { app.endUndoGroup(); return; }
                    var selectedLayers = comp.selectedLayers;
                    var targetLayer = selectedLayers.length > 0 ? selectedLayers[0] : null;
                    var nullLayer = comp.layers.addNull(comp.duration);
                    if (targetLayer) {
                        nullLayer.moveBefore(targetLayer);
                        nullLayer.parent = targetLayer;
                    } else if (comp.numLayers >= 2) {
                        nullLayer.parent = comp.layer(2);
                    }
                    app.endUndoGroup();
                },
                textCenter: function(rasio) {
                    app.beginUndoGroup("Teks Tengah");
                    var comp = $._demak.ensureComp(rasio);
                    var txt = comp.layers.addText("ANJAY");
                    var r = txt.sourceRectAtTime(0, false);
                    var anchorX = r.left + (r.width / 2);
                    var anchorY = r.top + (r.height / 2);
                    txt.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([anchorX, anchorY]);
                    txt.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);
                    app.endUndoGroup();
                },
                newSolid: function() {
                    var c = app.project.activeItem;
                    if (!(c instanceof CompItem)) return;
                    for (var i = 1; i <= c.numLayers; i++) { c.layer(i).selected = false; }
                    try { app.executeCommand(2038); } catch(e) {}
                },
                newNull: function() {
                    var c = app.project.activeItem;
                    if (!(c instanceof CompItem)) return;
                    var selectedLayers = c.selectedLayers;
                    if (selectedLayers.length !== 1) return;
                    var targetLayer = selectedLayers[0];
                    app.beginUndoGroup("Create Null Above Layer");
                    var newNull = c.layers.addNull();
                    newNull.name = "Null Controller";
                    newNull.inPoint = targetLayer.inPoint;
                    newNull.outPoint = targetLayer.outPoint;
                    newNull.moveBefore(targetLayer);
                    targetLayer.parent = newNull;
                    app.endUndoGroup();
                },
                newAdj: function() {
                    app.beginUndoGroup("New Adjustment Layer");
                    var c = app.project.activeItem;
                    if (!(c instanceof CompItem)) { app.endUndoGroup(); return; }
                    var adj = c.layers.addSolid([0.9, 0.9, 0.98], "Adjustment Layer", c.width, c.height, 1);
                    adj.adjustmentLayer = true;
                    adj.label = 5;
                    app.endUndoGroup();
                },
                newAdjLayer: function() {
                    app.beginUndoGroup("Adj Layer (Target)");
                    var comp = app.project.activeItem;
                    if (!(comp instanceof CompItem)) { app.endUndoGroup(); return; }
                    var selectedLayers = comp.selectedLayers;
                    if (selectedLayers.length === 0) { app.endUndoGroup(); return; }
                    var targetLayer = selectedLayers[0];
                    var adjLayer = comp.layers.addSolid([1, 1, 1], "Adjustment (Target)", comp.width, comp.height, 1, comp.duration);
                    adjLayer.adjustmentLayer = true;
                    adjLayer.label = 5;
                    adjLayer.moveBefore(targetLayer);
                    adjLayer.startTime = targetLayer.startTime;
                    adjLayer.inPoint = targetLayer.inPoint;
                    adjLayer.outPoint = targetLayer.outPoint;
                    app.endUndoGroup();
                },
                precomp: function() {
                    var c = app.project.activeItem;
                    if (!(c instanceof CompItem)) return;
                    if (c.selectedLayers.length === 0) return;
                    try { app.executeCommand(2071); } catch(e) {}
                }
            });
        `;
        csInterface.evalScript(demakLogic);

        var btnMode = document.getElementById("ext-name");
        var viewCurve = document.getElementById("view-curve");
        var viewTools = document.getElementById("view-tools");
        var isToolsMode = false;

        btnMode.onclick = function() {
            isToolsMode = !isToolsMode;
            if (isToolsMode) {
                viewCurve.style.display = "none";
                viewTools.style.display = "flex";
                btnMode.style.color = "#ff8c42"; 
            } else {
                viewCurve.style.display = "flex";
                viewTools.style.display = "none";
                btnMode.style.color = "#00d4aa";
            }
        };

        function bindDemakBtn(id, scriptStr) {
            document.getElementById(id).onclick = function() { csInterface.evalScript(scriptStr); };
        }
        
        bindDemakBtn("anc-tl", "$._demak.moveAnchor('left', 'top')");
        bindDemakBtn("anc-tc", "$._demak.moveAnchor('center', 'top')");
        bindDemakBtn("anc-tr", "$._demak.moveAnchor('right', 'top')");
        bindDemakBtn("anc-ml", "$._demak.moveAnchor('left', 'middle')");
        bindDemakBtn("anc-mc", "$._demak.moveAnchor('center', 'middle')");
        bindDemakBtn("anc-mr", "$._demak.moveAnchor('right', 'middle')");
        bindDemakBtn("anc-bl", "$._demak.moveAnchor('left', 'bottom')");
        bindDemakBtn("anc-bc", "$._demak.moveAnchor('center', 'bottom')");
        bindDemakBtn("anc-br", "$._demak.moveAnchor('right', 'bottom')");
        
        bindDemakBtn("ali-tl", "$._demak.alignLayer('left', 'top')");
        bindDemakBtn("ali-tc", "$._demak.alignLayer('center', 'top')");
        bindDemakBtn("ali-tr", "$._demak.alignLayer('right', 'top')");
        bindDemakBtn("ali-ml", "$._demak.alignLayer('left', 'middle')");
        bindDemakBtn("ali-mc", "$._demak.alignLayer('center', 'middle')");
        bindDemakBtn("ali-mr", "$._demak.alignLayer('right', 'middle')");
        bindDemakBtn("ali-bl", "$._demak.alignLayer('left', 'bottom')");
        bindDemakBtn("ali-bc", "$._demak.alignLayer('center', 'bottom')");
        bindDemakBtn("ali-br", "$._demak.alignLayer('right', 'bottom')");
        
        function getCompRatio() {
            var ratioEl = document.getElementById("tool-comp-ratio");
            return ratioEl ? ratioEl.value : "16:9";
        }
        document.getElementById("tool-make-comp").onclick = function() { csInterface.evalScript("buatCompCustom('" + getCompRatio() + "')"); };
        document.getElementById("tool-solid-fill").onclick = function() { csInterface.evalScript("buatSolidFill('" + getCompRatio() + "')"); };
        document.getElementById("tool-cam-15").onclick = function() { csInterface.evalScript("buatKamera15mm('" + getCompRatio() + "')"); };
        document.getElementById("tool-null-parent").onclick = function() { csInterface.evalScript("buatNullParent()"); };
        document.getElementById("tool-text-center").onclick = function() { csInterface.evalScript("buatTeksTengah('" + getCompRatio() + "')"); };
        document.getElementById("tool-adj-comp").onclick = function() { csInterface.evalScript("buatAdjComp()"); };
        document.getElementById("tool-adj-layer").onclick = function() { csInterface.evalScript("buatAdjLayer()"); };
        document.getElementById("tool-precomp").onclick = function() { csInterface.evalScript("buatPrecompose()"); };
        document.getElementById("tool-light").onclick = function() { csInterface.evalScript("buatLight('" + getCompRatio() + "')"); };

        var btnSpeed = document.getElementById("btn-speed-mode");
        btnSpeed.onclick = function() {
            if(editor.toggleMode) editor.toggleMode();
            this.style.color = editor.isSpeedMode ? "#00d4aa" : "#eee";
        };

        document.getElementById("btn-save-preset").onclick = function() {
            var n = prompt("Nama Preset:", "Custom");
            if (n) {
                var v = editor.getValues();
                allPresets.push({ name: n, x1: v[0], y1: v[1], x2: v[2], y2: v[3] });
                saveData(); render();
            }
        };

        document.getElementById("btn-delete-selected").onclick = function() {
            if (selectedIndex !== -1) {
                allPresets.splice(selectedIndex, 1);
                selectedIndex = -1;
                saveData(); render();
            }
        };

        document.getElementById("btn-export-preset").onclick = function() {
            if (window.cep && window.cep.fs) {
                var data = JSON.stringify(allPresets, null, 2);
                var result = window.cep.fs.showSaveDialogEx("Save Presets", "", ["json"], "curvase_presets.json");
                if (result.data) {
                    var writeResult = window.cep.fs.writeFile(result.data, data);
                    if (writeResult.err !== 0) alert("Gagal menyimpan file!");
                }
            } else {
                alert("Sistem file CEP tidak tersedia.");
            }
        };

        document.getElementById("btn-import-preset").onclick = function() {
            if (window.cep && window.cep.fs) {
                var result = window.cep.fs.showOpenDialogEx(false, false, "Import Presets", "", ["json"]);
                if (result.data && result.data.length > 0) {
                    var readResult = window.cep.fs.readFile(result.data[0]);
                    if (readResult.err === 0) {
                        try {
                            var imported = JSON.parse(readResult.data);
                            if(Array.isArray(imported)) {
                                allPresets = allPresets.concat(imported);
                                saveData(); render();
                            } else {
                                alert("Format JSON preset tidak valid!");
                            }
                        } catch(err) {
                            alert("Gagal membaca file preset!");
                        }
                    } else {
                        alert("Gagal membuka file!");
                    }
                }
            } else {
                alert("Sistem file CEP tidak tersedia.");
            }
        };

        var editModal = document.getElementById("edit-modal");
        var bezierDisplay = document.getElementById("bezier-display");

        bezierDisplay.onclick = function() {
            var v = editor.getValues();
            document.getElementById("m-bezier-val").value = v[0].toFixed(2) + ", " + v[1].toFixed(2) + ", " + v[2].toFixed(2) + ", " + v[3].toFixed(2);
            editModal.style.display = "flex";
        };

        document.getElementById("btn-modal-cancel").onclick = function() { 
            editModal.style.display = "none"; 
        };

        document.getElementById("btn-modal-save").onclick = function() {
            var valStr = document.getElementById("m-bezier-val").value;
            var parts = valStr.split(",");
            
            if (parts.length === 4) {
                var nx1 = parseFloat(parts[0].trim());
                var ny1 = parseFloat(parts[1].trim());
                var nx2 = parseFloat(parts[2].trim());
                var ny2 = parseFloat(parts[3].trim());
                
                if (!isNaN(nx1) && !isNaN(ny1) && !isNaN(nx2) && !isNaN(ny2)) {
                    editor.setEndHandles(nx1, ny1, nx2, ny2);
                    syncInputs();
                    editModal.style.display = "none";
                } else {
                    alert("Format angka tidak valid! Pastikan hanya memasukkan angka dan koma.");
                }
            } else {
                alert("Masukkan tepat 4 nilai yang dipisahkan dengan koma!\nContoh: 0.25, 0.10, 0.25, 1.00");
            }
        };

        var resizer = document.getElementById("resizer");
        var presetsPanel = document.getElementById("presets-panel");
        var isResizing = false;
        var startY, startHeight;

        resizer.addEventListener('mousedown', function(e) {
            isResizing = true;
            startY = e.clientY;
            startHeight = parseInt(window.getComputedStyle(presetsPanel).height, 10);
            document.documentElement.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        window.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            var dy = e.clientY - startY;
            var newHeight = startHeight - dy;
            
            if(newHeight < 0) newHeight = 0; 
            
            var maxH = window.innerHeight - 200; 
            if(newHeight > maxH) newHeight = maxH;

            presetsPanel.style.height = newHeight + 'px';
            editor.resize(); 
        });

        window.addEventListener('mouseup', function() {
            if(isResizing) {
                isResizing = false;
                document.documentElement.style.cursor = 'default';
            }
        });

        document.getElementById("btn-bg").onclick = function() { document.getElementById("bg-file-input").click(); };
        document.getElementById("bg-file-input").onchange = function(e) {
            var file = e.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(ev) {
                    var type = file.type.includes("video") ? "video" : "image";
                    editor.setBackgroundImage(ev.target.result, type);
                };
                reader.readAsDataURL(file);
            }
        };

        document.getElementById("btn-apply").onclick = function() {
            csInterface.evalScript("$._curvase.applySegmentsEase('" + JSON.stringify(editor.getSegments()) + "','" + JSON.stringify(editor.getMidPoints()) + "')");
        };
        
        document.getElementById("btn-read").onclick = function() {
            csInterface.evalScript("$._curvase.readKeyframeData()", function(res) {
                if(!res) return;
                try {
                    var data = JSON.parse(res);
                    if (data.error) { return; }
                    
                    if (data.properties && data.properties.length > 0) {
                        var sumX1 = 0, sumY1 = 0, sumX2 = 0, sumY2 = 0;
                        var validCount = 0;

                        for (var i = 0; i < data.properties.length; i++) {
                            var propData = data.properties[i];

                            if (propData.keyframes && propData.keyframes.length >= 2) {
                                var k1 = propData.keyframes[0];
                                var k2 = propData.keyframes[1];
                                
                                var dt = k2.time - k1.time;
                                var dv = 0;
                                
                                if (propData.spatial) {
                                    var sumSq = 0;
                                    var val1Arr = Array.isArray(k1.value) ? k1.value : [k1.value];
                                    var val2Arr = Array.isArray(k2.value) ? k2.value : [k2.value];
                                    for (var dim = 0; dim < propData.dimensions; dim++) {
                                        var diff = (val2Arr[dim] || 0) - (val1Arr[dim] || 0);
                                        sumSq += diff * diff;
                                    }
                                    dv = Math.sqrt(sumSq);
                                } else if (propData.dimensions > 1) {
                                    var v1x = Array.isArray(k1.value) ? k1.value[0] : k1.value;
                                    var v2x = Array.isArray(k2.value) ? k2.value[0] : k2.value;
                                    dv = v2x - v1x;
                                } else if (propData.shape) {
                                    dv = 100;
                                } else {
                                    dv = k2.value - k1.value;
                                }

                                var outEase = (k1.outEase && k1.outEase.length > 0) ? k1.outEase[0] : {speed: 0, influence: 0};
                                var inEase = (k2.inEase && k2.inEase.length > 0) ? k2.inEase[0] : {speed: 0, influence: 0};
                                
                                var px1 = parseFloat(outEase.influence) / 100;
                                var px2 = 1 - (parseFloat(inEase.influence) / 100);
                                var py1 = px1;
                                var py2 = px2;

                                if (Math.abs(dv) > 0.0001 && dt > 0) {
                                    var avgSpeed = dv / dt;
                                    py1 = (parseFloat(outEase.speed) / avgSpeed) * px1;
                                    py2 = 1 - ((parseFloat(inEase.speed) / avgSpeed) * (1 - px2));
                                }

                                if (isNaN(px1)) px1 = 0;
                                if (isNaN(py1)) py1 = px1;
                                if (isNaN(px2)) px2 = 1;
                                if (isNaN(py2)) py2 = px2;
                                
                                px1 = Math.max(0, Math.min(1, px1));
                                px2 = Math.max(0, Math.min(1, px2));

                                sumX1 += px1;
                                sumY1 += py1;
                                sumX2 += px2;
                                sumY2 += py2;
                                validCount++;
                            }
                        }

                        if (validCount > 0) {
                            var avgX1 = sumX1 / validCount;
                            var avgY1 = sumY1 / validCount;
                            var avgX2 = sumX2 / validCount;
                            var avgY2 = sumY2 / validCount;

                            editor.setEndHandles(avgX1, avgY1, avgX2, avgY2);
                            syncInputs();
                        }
                    }
                } catch(err) {
                }
            });
        };
        
        window.onresize = function() { editor.resize(); };
        ["x1","y1","x2","y2"].forEach(function(id) {
            document.getElementById(id).oninput = function() {
                editor.setEndHandles(parseFloat(document.getElementById("x1").value), parseFloat(document.getElementById("y1").value), parseFloat(document.getElementById("x2").value), parseFloat(document.getElementById("y2").value));
            };
        });

        var btnMute = document.getElementById("btn-mute");
        var volSlider = document.getElementById("volume-slider");

        volSlider.oninput = function() {
            var vol = parseFloat(this.value);
            editor.setVolume(vol); 
            if (vol === 0) {
                btnMute.innerText = "×"; 
            } else {
                btnMute.innerText = "🔊";
            }
        };

        btnMute.onclick = function() {
            var isMuted = editor.toggleMute(); 
            this.innerText = isMuted ? "×" : "🔊";
            this.style.color = isMuted ? "#ff4444" : "#eee";
        };

    }

    function render() {
        var panel = document.getElementById("presets-panel");
        panel.innerHTML = "";
        allPresets.forEach(function(p, i) {
            var item = document.createElement("div");
            item.className = "preset-item" + (i === selectedIndex ? " selected" : "");
            
            var iconCanvas = document.createElement("canvas");
            iconCanvas.width = 54;
            iconCanvas.height = 40;
            var ctx = iconCanvas.getContext("2d");
            
            var w = iconCanvas.width, h = iconCanvas.height;
            var padX = 6, padY = 6;
            var cw = w - padX*2;
            var ch = h - padY*2;
            var sx = padX, sy = h - padY;
            var ex = w - padX, ey = padY;
            
            var cp1x = sx + p.x1 * cw;
            var cp1y = sy - p.y1 * ch;
            var cp2x = sx + p.x2 * cw;
            var cp2y = sy - p.y2 * ch;

            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cp1x, cp1y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(cp2x, cp2y); ctx.stroke();

            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.beginPath(); ctx.arc(cp1x, cp1y, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(cp2x, cp2y, 1.5, 0, Math.PI*2); ctx.fill();

            ctx.strokeStyle = "#ccc";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
            ctx.stroke();

            ctx.fillStyle = "#ccc";
            ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI*2); ctx.fill();

            var img = document.createElement("img");
            img.src = iconCanvas.toDataURL();
            img.className = "preset-icon";

            item.innerHTML = "<span>" + p.name + "</span>";
            item.insertBefore(img, item.firstChild);
            
            item.onclick = function() {
                selectedIndex = i;
                editor.setEndHandles(p.x1, p.y1, p.x2, p.y2);
                syncInputs();
                render();
            };
            panel.appendChild(item);
        });
    }

    function syncInputs() {
        var v = editor.getValues();
        
        if (document.getElementById("x1")) {
            document.getElementById("x1").value = v[0].toFixed(2);
            document.getElementById("y1").value = v[1].toFixed(2);
            document.getElementById("x2").value = v[2].toFixed(2);
            document.getElementById("y2").value = v[3].toFixed(2);
        }
        
        var displayEl = document.getElementById("bezier-display");
        if (displayEl) {
            displayEl.innerText = v[0].toFixed(2) + ", " + v[1].toFixed(2) + ", " + v[2].toFixed(2) + ", " + v[3].toFixed(2);
        }
    }

    function saveData() { localStorage.setItem("curvase_presets_final", JSON.stringify(allPresets)); }
    function loadData() { var s = localStorage.getItem("curvase_presets_final"); if(s) allPresets = JSON.parse(s); }

    return { init: init };
})();
window.onload = curvaseApp.init;