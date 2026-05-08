(function CompactFixed(thisObj) {

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "2026", undefined, { resizeable: false });

        var main = win.add("group");
        main.orientation = "column";
        main.alignChildren = ["fill", "top"];
        main.margins = 4;
        main.spacing = 3;

        var header = main.add("statictext", undefined, "2026");
        header.alignment = "center";

        var line0 = main.add("panel");
        line0.alignment = "fill";
        line0.preferredSize.height = 1;

        
        var aGrp = main.add("group");
        aGrp.orientation = "column";
        aGrp.alignChildren = ["center", "top"];
        aGrp.spacing = 1;

        var aLbl = aGrp.add("statictext", undefined, "Anchor");
        aLbl.alignment = "center";

        var aBtns = [];
        var gridA = [["↖", "↑", "↗"], ["←", "⊕", "→"], ["↙", "↓", "↘"]];
        for (var i = 0; i < 3; i++) {
            var row = aGrp.add("group");
            row.spacing = 1;
            for (var j = 0; j < 3; j++) {
                var b = row.add("button", undefined, gridA[i][j]);
                b.preferredSize = [20, 20];
                aBtns.push(b);
            }
        }

        var line1 = main.add("panel");
        line1.alignment = "fill";
        line1.preferredSize.height = 1;

    
        var bGrp = main.add("group");
        bGrp.orientation = "column";
        bGrp.alignChildren = ["center", "top"];
        bGrp.spacing = 1;

        var bLbl = bGrp.add("statictext", undefined, "Align");
        bLbl.alignment = "center";

        var bBtns = [];
        var gridB = [["↖", "↑", "↗"], ["←", "⊕", "→"], ["↙", "↓", "↘"]];
        for (var i2 = 0; i2 < 3; i2++) {
            var row2 = bGrp.add("group");
            row2.spacing = 1;
            for (var j2 = 0; j2 < 3; j2++) {
                var b2 = row2.add("button", undefined, gridB[i2][j2]);
                b2.preferredSize = [20, 20];
                bBtns.push(b2);
            }
        }

        var line2 = main.add("panel");
        line2.alignment = "fill";
        line2.preferredSize.height = 1;

        
        var toolGrp = main.add("group");
        toolGrp.orientation = "column";
        toolGrp.alignChildren = ["fill", "top"];
        toolGrp.spacing = 2;

        var tLbl = toolGrp.add("statictext", undefined, "Layer Tools");
        tLbl.alignment = "center";

        var btnSolid = toolGrp.add("button", undefined, "New Solid");
        var btnNull = toolGrp.add("button", undefined, "New Null");
        var btnPre = toolGrp.add("button", undefined, "Precompose");
        var btnAdj = toolGrp.add("button", undefined, "New Adjustment");

        var toolButtons = [btnSolid, btnNull, btnPre, btnAdj];
        for (var i = 0; i < toolButtons.length; i++) {
            toolButtons[i].preferredSize = [100, 22];
        }

        var line3 = main.add("panel");
        line3.alignment = "fill";
        line3.preferredSize.height = 1;

       
        var foot = main.add("statictext", undefined, "Demak Demek");
        foot.alignment = "center";

        
        function moveAnchor(x, y) {
            app.beginUndoGroup("Move Anchor");
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) { 
                alert("No active comp."); 
                app.endUndoGroup(); 
                return; 
            }
            var sel = comp.selectedLayers;
            if (sel.length === 0) { 
                alert("Select a layer first."); 
                app.endUndoGroup(); 
                return; 
            }

            for (var i = 0; i < sel.length; i++) {
                var L = sel[i];
                
                if (!L.source && L.nullLayer) continue;
                
                var oldAnchor = L.anchorPoint.value;
                var newAnchor = [oldAnchor[0], oldAnchor[1], oldAnchor[2]];
                
                var r;
                try {
                    r = L.sourceRectAtTime(comp.time, false);
                } catch(e) {
                    continue;
                }
                
                if (x === "left") newAnchor[0] = r.left;
                if (x === "center") newAnchor[0] = r.left + r.width / 2;
                if (x === "right") newAnchor[0] = r.left + r.width;
                
                if (y === "top") newAnchor[1] = r.top;
                if (y === "middle") newAnchor[1] = r.top + r.height / 2;
                if (y === "bottom") newAnchor[1] = r.top + r.height;
                
                var anchorDelta = [
                    newAnchor[0] - oldAnchor[0],
                    newAnchor[1] - oldAnchor[1],
                    newAnchor[2] - oldAnchor[2]
                ];
                
                L.anchorPoint.setValue(newAnchor);
                
                var oldPos = L.position.value;
                var s = L.scale.value[0] / 100;
                L.position.setValue([
                    oldPos[0] + anchorDelta[0] * s,
                    oldPos[1] + anchorDelta[1] * s,
                    oldPos[2] + anchorDelta[2] * s
                ]);
            }
            app.endUndoGroup();
        }

       
        function alignLayer(x, y) {
            app.beginUndoGroup("Align Layer");
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) { 
                alert("No active comp."); 
                app.endUndoGroup(); 
                return; 
            }
            var sel = comp.selectedLayers;
            if (sel.length === 0) { 
                alert("Select a layer first."); 
                app.endUndoGroup(); 
                return; 
            }

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

                if (x === "left") {
                    pos[0] = layerWidth / 2;
                } else if (x === "center") {
                    pos[0] = comp.width / 2;
                } else if (x === "right") {
                    pos[0] = comp.width - (layerWidth / 2);
                }

                if (y === "top") {
                    pos[1] = layerHeight / 2;
                } else if (y === "middle") {
                    pos[1] = comp.height / 2;
                } else if (y === "bottom") {
                    pos[1] = comp.height - (layerHeight / 2);
                }

                L.position.setValue(pos);
            }
            app.endUndoGroup();
        }


        btnSolid.onClick = function () {
            var c = app.project.activeItem;
            if (!(c instanceof CompItem)) { 
                alert("No active comp."); 
                return; 
            }
            
            // Deselect semua layer dulu
            for (var i = 1; i <= c.numLayers; i++) {
                c.layer(i).selected = false;
            }
            
            // Langsung panggil dialog Solid Settings TANPA bikin solid dulu
            try {
                app.executeCommand(2038); // Command ID untuk "New Solid" dialog
            } catch(e) {
                alert("Error opening Solid Settings dialog");
            }
        };

        // === NEW NULL ===
        btnNull.onClick = function () {
            var c = app.project.activeItem;
            if (!(c instanceof CompItem)) {
                alert("No active comp.");
                return;
            }

            var selectedLayers = c.selectedLayers;

            if (selectedLayers.length !== 1) {
                alert("Pilih tepat 1 layer.");
                return;
            }

            var targetLayer = selectedLayers[0];

            app.beginUndoGroup("Create Null Above Layer");

            var newNull = c.layers.addNull();
            newNull.name = "Null Controller";

            // Samakan durasi
            newNull.inPoint = targetLayer.inPoint;
            newNull.outPoint = targetLayer.outPoint;

            // 🔥 Ini yang bikin posisinya bener
            newNull.moveBefore(targetLayer);

            // Parent
            targetLayer.parent = newNull;

            app.endUndoGroup();
        };

        // === NEW ADJUSTMENT ===
        btnAdj.onClick = function () {
            app.beginUndoGroup("New Adjustment Layer");
            var c = app.project.activeItem;
            if (!(c instanceof CompItem)) { 
                alert("No active comp."); 
                app.endUndoGroup(); 
                return; 
            }
            var adj = c.layers.addSolid([0.9, 0.9, 0.98], "Adjustment Layer", c.width, c.height, 1);
            adj.adjustmentLayer = true;
            adj.label = 5; // lavender
            app.endUndoGroup();
        };
        // === PRECOMPOSE ===
        btnPre.onClick = function () {
            var c = app.project.activeItem;
            if (!(c instanceof CompItem)) { 
                alert("No active comp."); 
                return; 
            }
            if (c.selectedLayers.length === 0) { 
                alert("Select layers to precompose."); 
                return; 
            }
            
            try {
                app.executeCommand(2071);
            } catch(e) {
                alert("Error: Make sure you have selected layers.");
            }
        };

        var map = [
            ["left", "top"], ["center", "top"], ["right", "top"],
            ["left", "middle"], ["center", "middle"], ["right", "middle"],
            ["left", "bottom"], ["center", "bottom"], ["right", "bottom"]
        ];

        for (var n = 0; n < 9; n++) {
            (function (nx, ny) { 
                aBtns[n].onClick = function () { moveAnchor(nx, ny); }; 
            })(map[n][0], map[n][1]);
        }
        
        for (var n2 = 0; n2 < 9; n2++) {
            (function (nx, ny) { 
                bBtns[n2].onClick = function () { alignLayer(nx, ny); }; 
            })(map[n2][0], map[n2][1]);
        }

        return win;
    }

    var myPanel = buildUI(thisObj);
    if (myPanel instanceof Window) {
        myPanel.center();
        myPanel.show();
    } else {
        myPanel.layout.layout(true);
    }

})(this);
