$._curvase = {
    getDimensionCount: function(prop) {
        var vt = prop.propertyValueType;
        if (vt === PropertyValueType.ThreeD_SPATIAL || vt === PropertyValueType.ThreeD) return 3;
        if (vt === PropertyValueType.TwoD_SPATIAL || vt === PropertyValueType.TwoD) return 2;
        if (vt === PropertyValueType.OneD) return 1;
        if (vt === PropertyValueType.COLOR) return 4;
        if (vt === PropertyValueType.SHAPE) return 1;
        return 0;
    },

    isShape: function(prop) {
        return prop.propertyValueType === PropertyValueType.SHAPE;
    },

    computeShapeDistance: function(shapeA, shapeB) {
        var vA = shapeA.vertices;
        var vB = shapeB.vertices;
        if (vA.length !== vB.length) return -1;
        var sum = 0;
        for (var i = 0; i < vA.length; i++) {
            var dx = vB[i][0] - vA[i][0];
            var dy = vB[i][1] - vA[i][1];
            sum += Math.sqrt(dx * dx + dy * dy);
        }
        return sum;
    },

    isSpatial: function(prop) {
        var vt = prop.propertyValueType;
        return (vt === PropertyValueType.TwoD_SPATIAL || vt === PropertyValueType.ThreeD_SPATIAL);
    },

    computeSpatialDistance: function(valA, valB, dims) {
        var sum = 0;
        for (var i = 0; i < dims; i++) {
            var dd = valB[i] - valA[i];
            sum += dd * dd;
        }
        return Math.sqrt(sum);
    },

    interpName: function(type) {
        if (type === KeyframeInterpolationType.LINEAR) return "LINEAR";
        if (type === KeyframeInterpolationType.BEZIER) return "BEZIER";
        if (type === KeyframeInterpolationType.HOLD) return "HOLD";
        return "UNKNOWN";
    },

    readKeyframeData: function() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return '{"error":"No active composition found."}';
        }

        var props = comp.selectedProperties;
        if (!props || props.length === 0) {
            return '{"error":"No properties selected."}';
        }

        var validProps = [];
        var hasExplicitSelection = false;

        // FILTER BARU: Cek apakah ada keyframe yang BENAR-BENAR diselect
        for (var i = 0; i < props.length; i++) {
            if (props[i].propertyType === PropertyType.PROPERTY && props[i].canVaryOverTime && props[i].numKeys > 0) {
                if (props[i].selectedKeys && props[i].selectedKeys.length >= 2) {
                    hasExplicitSelection = true;
                }
                validProps.push(props[i]);
            }
        }

        if (validProps.length === 0) {
            return '{"error":"No keyframed properties selected."}';
        }

        var propsArrayJSON = [];
        
        for (var vp = 0; vp < validProps.length; vp++) {
            var prop = validProps[vp];
            var selKeys = prop.selectedKeys;
            
            if (!selKeys || selKeys.length < 2) {
                if (hasExplicitSelection) {
                    // Abaikan property ini jika dia tidak punya seleksi keyframe, 
                    // tapi property lain memilikinya (mencegah bug 0,0,0,0)
                    continue; 
                } else {
                    selKeys = [];
                    for (var k = 1; k <= prop.numKeys; k++) {
                        selKeys.push(k);
                    }
                }
            }
            
            if (selKeys.length < 2) continue;

            var dims = $._curvase.getDimensionCount(prop);
            var spatial = $._curvase.isSpatial(prop);
            var keyArr = [];

            for (var ki = 0; ki < selKeys.length; ki++) {
                var idx = selKeys[ki];
                var t = prop.keyTime(idx);
                var v = prop.keyValue(idx);
                var inEase = prop.keyInTemporalEase(idx);
                var outEase = prop.keyOutTemporalEase(idx);
                var inType = $._curvase.interpName(prop.keyInInterpolationType(idx));
                var outType = $._curvase.interpName(prop.keyOutInterpolationType(idx));

                var valStr;
                if ($._curvase.isShape(prop)) {
                    valStr = '{"vertexCount":' + v.vertices.length + '}';
                } else if (dims === 1) {
                    valStr = String(v);
                } else {
                    var parts = [];
                    for (var vi = 0; vi < dims; vi++) parts.push(String(v[vi]));
                    valStr = "[" + parts.join(",") + "]";
                }

                var inArr = [];
                for (var ei = 0; ei < inEase.length; ei++) {
                    inArr.push('{"speed":' + inEase[ei].speed + ',"influence":' + inEase[ei].influence + '}');
                }
                var outArr = [];
                for (var eo = 0; eo < outEase.length; eo++) {
                    outArr.push('{"speed":' + outEase[eo].speed + ',"influence":' + outEase[eo].influence + '}');
                }

                keyArr.push('{"index":' + idx +
                    ',"time":' + t +
                    ',"value":' + valStr +
                    ',"inEase":[' + inArr.join(",") + ']' +
                    ',"outEase":[' + outArr.join(",") + ']' +
                    ',"inType":"' + inType + '"' +
                    ',"outType":"' + outType + '"}');
            }

            var isShapeProp = $._curvase.isShape(prop);
            var propResult = '{"property":"' + prop.name +
                '","matchName":"' + prop.matchName +
                '","spatial":' + (spatial ? "true" : "false") +
                ',"shape":' + (isShapeProp ? "true" : "false") +
                ',"dimensions":' + dims +
                ',"keyframes":[' + keyArr.join(",") + ']}';
            
            propsArrayJSON.push(propResult);
        }

        return '{"properties":[' + propsArrayJSON.join(",") + ']}';
    },

    applyBezierEase: function(x1, y1, x2, y2) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return "No active composition found.";
        }

        var props = comp.selectedProperties;
        if (!props || props.length === 0) {
            return "No properties selected. Select keyframed properties in the timeline.";
        }

        var isLinear = (Math.abs(x1) < 0.005 && Math.abs(y1) < 0.005 &&
                       Math.abs(x2 - 1) < 0.005 && Math.abs(y2 - 1) < 0.005);

        var totalKeys = 0;
        var processedProps = 0;
        var skippedProps = 0;

        app.beginUndoGroup("Curvase: Apply Bezier Easing");

        try {
            for (var p = 0; p < props.length; p++) {
                var prop = props[p];

                if (prop.propertyType !== PropertyType.PROPERTY) {
                    skippedProps++;
                    continue;
                }
                if (!prop.canVaryOverTime) {
                    skippedProps++;
                    continue;
                }
                if (prop.numKeys < 2) {
                    skippedProps++;
                    continue;
                }

                var selKeys = prop.selectedKeys;
                if (!selKeys || selKeys.length < 1) {
                    skippedProps++;
                    continue;
                }

                var dims = $._curvase.getDimensionCount(prop);
                if (dims === 0) {
                    skippedProps++;
                    continue;
                }

                var spatial = $._curvase.isSpatial(prop);

                for (var ki = 0; ki < selKeys.length; ki++) {
                    var idx = selKeys[ki];

                    if (isLinear) {
                        prop.setInterpolationTypeAtKey(
                            idx,
                            KeyframeInterpolationType.LINEAR,
                            KeyframeInterpolationType.LINEAR
                        );
                        totalKeys++;
                        continue;
                    }

                    prop.setInterpolationTypeAtKey(
                        idx,
                        KeyframeInterpolationType.BEZIER,
                        KeyframeInterpolationType.BEZIER
                    );

                    var curIn = prop.keyInTemporalEase(idx);
                    var curOut = prop.keyOutTemporalEase(idx);
                    var temporalDims = curIn.length;
                    var newIn = [];
                    var newOut = [];
                    var hasPrev = idx > 1;
                    var hasNext = idx < prop.numKeys;

                    for (var d = 0; d < temporalDims; d++) {
                        var inSpd = curIn[d].speed;
                        var inInf = curIn[d].influence;
                        var outSpd = curOut[d].speed;
                        var outInf = curOut[d].influence;

                        if (hasPrev) {
                            var prevIdx = idx - 1;
                            var dt = prop.keyTime(idx) - prop.keyTime(prevIdx);
                            var valCur = prop.keyValue(idx);
                            var valPrev = prop.keyValue(prevIdx);
                            var dv;

                            if (spatial) {
                                dv = $._curvase.computeSpatialDistance(valPrev, valCur, dims);
                            } else if (dims === 1) {
                                dv = valCur - valPrev;
                            } else {
                                dv = valCur[d] - valPrev[d];
                            }

                            inInf = Math.max(0.1, Math.min(100, (1 - x2) * 100));

                            if (Math.abs(dv) < 0.0001 || dt <= 0) {
                                inSpd = 0;
                            } else {
                                var avg = dv / dt;
                                if ((1 - x2) > 0.001) {
                                    inSpd = avg * ((1 - y2) / (1 - x2));
                                } else {
                                    inSpd = 0;
                                }
                            }
                        }

                        if (hasNext) {
                            var nextIdx = idx + 1;
                            var dtN = prop.keyTime(nextIdx) - prop.keyTime(idx);
                            var valStart = prop.keyValue(idx);
                            var valEnd = prop.keyValue(nextIdx);
                            var dvN;

                            if (spatial) {
                                dvN = $._curvase.computeSpatialDistance(valStart, valEnd, dims);
                            } else if (dims === 1) {
                                dvN = valEnd - valStart;
                            } else {
                                dvN = valEnd[d] - valStart[d];
                            }

                            outInf = Math.max(0.1, Math.min(100, x1 * 100));

                            if (Math.abs(dvN) < 0.0001 || dtN <= 0) {
                                outSpd = 0;
                            } else {
                                var avgN = dvN / dtN;
                                if (x1 > 0.001) {
                                    outSpd = avgN * (y1 / x1);
                                } else {
                                    outSpd = 0;
                                }
                            }
                        }

                        inInf = Math.max(0.1, Math.min(100, inInf));
                        outInf = Math.max(0.1, Math.min(100, outInf));
                        newIn.push(new KeyframeEase(inSpd, inInf));
                        newOut.push(new KeyframeEase(outSpd, outInf));
                    }

                    prop.setTemporalEaseAtKey(idx, newIn, newOut);
                    totalKeys++;
                }

                processedProps++;
            }
        } catch (e) {
            app.endUndoGroup();
            return "Error: " + e.toString();
        }

        app.endUndoGroup();

        if (totalKeys === 0) {
            if (skippedProps > 0) {
                return "No valid keyframes found. Ensure properties have at least 1 selected keyframe.";
            }
            return "No keyframes modified. Select at least 1 keyframe on an animatable property.";
        }

        var msg = "Applied to " + totalKeys + " keyframe" + (totalKeys !== 1 ? "s" : "");
        if (processedProps > 0) {
            msg += " across " + processedProps + " propert" + (processedProps !== 1 ? "ies" : "y");
        }
        return msg + ".";
    },

    insertMidKeyframes: function(prop, keyIdx, midPoints) {
        var time0 = prop.keyTime(keyIdx);
        var time1 = prop.keyTime(keyIdx + 1);
        var span = time1 - time0;
        var val0 = prop.valueAtTime(time0, true);
        var val1 = prop.valueAtTime(time1, true);
        var isShapeProp = $._curvase.isShape(prop);

        if (isShapeProp) {
            var s0 = prop.keyValue(keyIdx);
            var s1 = prop.keyValue(keyIdx + 1);
            if (s0.vertices.length !== s1.vertices.length) return;
        }

        for (var mi = 0; mi < midPoints.length; mi += 2) {
            var fracT = midPoints[mi];
            var fracY = midPoints[mi + 1];
            var newTime = time0 + span * fracT;
            var newVal;

            if (isShapeProp) {
                var sA = prop.keyValue(keyIdx);
                var sB = prop.keyValue(keyIdx + 1);
                var ns = new Shape();
                var nv = [];
                var nit = [];
                var not = [];
                for (var vi = 0; vi < sA.vertices.length; vi++) {
                    nv.push([
                        sA.vertices[vi][0] + (sB.vertices[vi][0] - sA.vertices[vi][0]) * fracY,
                        sA.vertices[vi][1] + (sB.vertices[vi][1] - sA.vertices[vi][1]) * fracY
                    ]);
                    nit.push([
                        sA.inTangents[vi][0] + (sB.inTangents[vi][0] - sA.inTangents[vi][0]) * fracY,
                        sA.inTangents[vi][1] + (sB.inTangents[vi][1] - sA.inTangents[vi][1]) * fracY
                    ]);
                    not.push([
                        sA.outTangents[vi][0] + (sB.outTangents[vi][0] - sA.outTangents[vi][0]) * fracY,
                        sA.outTangents[vi][1] + (sB.outTangents[vi][1] - sA.outTangents[vi][1]) * fracY
                    ]);
                }
                ns.vertices = nv;
                ns.inTangents = nit;
                ns.outTangents = not;
                ns.closed = sA.closed;
                newVal = ns;
            } else if (val0 instanceof Array) {
                newVal = [];
                for (var vi = 0; vi < val0.length; vi++) {
                    newVal.push(val0[vi] + (val1[vi] - val0[vi]) * fracY);
                }
            } else {
                newVal = val0 + (val1 - val0) * fracY;
                if (prop.matchName === "ADBE Opacity" || prop.matchName === "ADBE Vector Group Opacity") {
                    if (newVal < 0) newVal = 0;
                    else if (newVal > 100) newVal = 100;
                }
            }

            prop.setValueAtTime(newTime, newVal);
        }
    },

    buildSegmentEase: function(prop, k0, k1, sx1, sy1, sx2, sy2) {
        var time0 = prop.keyTime(k0);
        var time1 = prop.keyTime(k1);
        var dur = time1 - time0;
        if (Math.abs(dur) < 1e-9) return null;

        var vt = prop.propertyValueType;
        var dims = $._curvase.getDimensionCount(prop);
        var spatial = $._curvase.isSpatial(prop);
        var shape = $._curvase.isShape(prop);
        var outEaseArr = [];
        var inEaseArr = [];

        if (vt === PropertyValueType.ThreeD || vt === PropertyValueType.TwoD) {
            var vA = prop.keyValue(k0);
            var vB = prop.keyValue(k1);
            for (var d = 0; d < vA.length; d++) {
                var delta = vB[d] - vA[d];
                var outSpd = (Math.abs(delta) < 0.0001 || dur <= 0) ? 0 : sy1 * delta / (sx1 * dur);
                var outInf = Math.max(0.1, Math.min(100, sx1 * 100));
                var inSpd = (Math.abs(delta) < 0.0001 || dur <= 0) ? 0 : (1 - sy2) * delta / ((1 - sx2) * dur);
                var inInf = Math.max(0.1, Math.min(100, (1 - sx2) * 100));
                outEaseArr.push(new KeyframeEase(outSpd, outInf));
                inEaseArr.push(new KeyframeEase(inSpd, inInf));
            }
            if (vt === PropertyValueType.TwoD) {
                outEaseArr = [outEaseArr[0], outEaseArr[1]];
                inEaseArr = [inEaseArr[0], inEaseArr[1]];
            }
        } else {
            var delta;
            if (shape) {
                var shapeA = prop.keyValue(k0);
                var shapeB = prop.keyValue(k1);
                delta = $._curvase.computeShapeDistance(shapeA, shapeB);
                if (delta < 0) return null;
            } else if (spatial) {
                delta = $._curvase.computeSpatialDistance(prop.keyValue(k0), prop.keyValue(k1), dims);
            } else {
                delta = prop.keyValue(k1) - prop.keyValue(k0);
            }
            var outSpd = (Math.abs(delta) < 0.0001 || dur <= 0) ? 0 : sy1 * delta / (sx1 * dur);
            var outInf = Math.max(0.1, Math.min(100, sx1 * 100));
            var inSpd = (Math.abs(delta) < 0.0001 || dur <= 0) ? 0 : (1 - sy2) * delta / ((1 - sx2) * dur);
            var inInf = Math.max(0.1, Math.min(100, (1 - sx2) * 100));
            outEaseArr = [new KeyframeEase(outSpd, outInf)];
            inEaseArr = [new KeyframeEase(inSpd, inInf)];
        }

        return { outEase: outEaseArr, inEase: inEaseArr };
    },

    applySegmentsEase: function(segmentsJson, midPointsJson, modeStr) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return "No active composition found.";
        }

        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) {
            return "No layers selected.";
        }

        var segments, midPoints;
        try {
            segments = eval("(" + segmentsJson + ")");
            midPoints = eval("(" + midPointsJson + ")");
        } catch (ex) {
            return "Error parsing curve data.";
        }

        if (!segments || segments.length === 0) {
            return "No curve segments defined.";
        }
        if (!midPoints) midPoints = [];

        var ctrlVals = [];
        for (var si = 0; si < segments.length; si++) {
            var sx1 = segments[si].x1;
            var sy1 = segments[si].y1;
            var sx2 = segments[si].x2;
            var sy2 = segments[si].y2;
            if (sx1 < 0.001) sx1 = 0.001; else if (sx1 > 0.999) sx1 = 0.999;
            if (sx2 < 0.001) sx2 = 0.001; else if (sx2 > 0.999) sx2 = 0.999;
            ctrlVals.push(sx1, sy1, sx2, sy2);
        }

        var hasOvershoot = false;
        for (var oi = 0; oi < ctrlVals.length; oi += 4) {
            if (ctrlVals[oi + 1] > 1 || ctrlVals[oi + 1] < 0 || ctrlVals[oi + 3] > 1 || ctrlVals[oi + 3] < 0) {
                hasOvershoot = true;
                break;
            }
        }
        if (!hasOvershoot) {
            for (var mi = 1; mi < midPoints.length; mi += 2) {
                if (midPoints[mi] > 1 || midPoints[mi] < 0) {
                    hasOvershoot = true;
                    break;
                }
            }
        }

        var isRelative = (modeStr === "relative");
        var hasMidPoints = midPoints.length >= 2;
        var needsSeparation = hasOvershoot || hasMidPoints || isRelative;
        var totalPairs = 0;
        var processedProps = 0;
        var skippedProps = 0;
        var createdKeys = 0;

        app.beginUndoGroup("Curvase: Apply Easing");

        try {
            for (var li = 0; li < layers.length; li++) {
                var layer = layers[li];
                var layerProps = layer.selectedProperties;
                if (!layerProps || layerProps.length === 0) continue;

                var propList = [];
                var savedKeys = [];
                for (var pi = 0; pi < layerProps.length; pi++) {
                    propList.push(layerProps[pi]);
                    savedKeys.push(layerProps[pi].selectedKeys || []);
                }

                var propCount = propList.length;
                var priorPosKeys = [];
                var dimensionSplit = false;

                for (var pi = 0; pi < propCount; pi++) {
                    var prop = propList[pi];

                    if (prop.propertyType !== PropertyType.PROPERTY) { skippedProps++; continue; }
                    if (!prop.canVaryOverTime) { skippedProps++; continue; }
                    if (prop.numKeys < 2) { skippedProps++; continue; }

                    var dims = $._curvase.getDimensionCount(prop);
                    if (dims === 0) { skippedProps++; continue; }

                    if (needsSeparation && prop.matchName === "ADBE Position" && !prop.dimensionsSeparated) {
                        priorPosKeys = savedKeys[pi] || [];
                        if (priorPosKeys.length < 2) { skippedProps++; continue; }
                        prop.dimensionsSeparated = true;
                        dimensionSplit = true;
                        for (var dsi = 0; dsi < layer.selectedProperties.length; dsi++) {
                            var mn = layer.selectedProperties[dsi].matchName;
                            if (mn === "ADBE Position_0" || mn === "ADBE Position_1" || mn === "ADBE Position_2") {
                                propList.push(layer.selectedProperties[dsi]);
                                savedKeys.push([]);
                                propCount++;
                            }
                        }
                        continue;
                    }

                    var targetKeys;

                    if (dimensionSplit && (prop.matchName === "ADBE Position_0" || prop.matchName === "ADBE Position_1" || prop.matchName === "ADBE Position_2")) {
                        for (var ri = 0; ri < priorPosKeys.length; ri++) {
                            prop.setSelectedAtKey(priorPosKeys[ri], true);
                        }
                        targetKeys = [];
                        for (var ri = 0; ri < priorPosKeys.length; ri++) targetKeys.push(priorPosKeys[ri]);
                    } else {
                        var selKeys = savedKeys[pi];
                        if (!selKeys || selKeys.length < 2) { skippedProps++; continue; }
                        targetKeys = [];
                        for (var ki = 0; ki < selKeys.length; ki++) targetKeys.push(selKeys[ki]);
                    }

                    if (targetKeys.length < 2) { skippedProps++; continue; }

                    if (isRelative) {
                        var firstIdx = targetKeys[0];
                        var lastIdx = targetKeys[targetKeys.length - 1];
                        var firstTime = prop.keyTime(firstIdx);
                        var lastTime = prop.keyTime(lastIdx);
                        var firstVal = prop.keyValue(firstIdx);
                        var lastVal = prop.keyValue(lastIdx);
                        var isArr = (firstVal instanceof Array);
                        var isShapeProp = $._curvase.isShape(prop);

                        var reflected = [];
                        for (var ri = lastIdx - 1; ri > firstIdx; ri--) {
                            var rTime = firstTime + lastTime - prop.keyTime(ri);
                            var rVal;
                            if (isShapeProp) {
                                rVal = prop.keyValue(ri);
                            } else if (isArr) {
                                var ov = prop.keyValue(ri);
                                rVal = [];
                                for (var rd = 0; rd < ov.length; rd++) {
                                    rVal.push(firstVal[rd] + lastVal[rd] - ov[rd]);
                                }
                            } else {
                                rVal = firstVal + lastVal - prop.keyValue(ri);
                            }
                            reflected.push({time: rTime, value: rVal});
                        }

                        for (var rk = lastIdx - 1; rk > firstIdx; rk--) {
                            prop.removeKey(rk);
                        }

                        for (var ri = 0; ri < reflected.length; ri++) {
                            prop.setValueAtTime(reflected[ri].time, reflected[ri].value);
                        }

                        targetKeys = [];
                        var newLastIdx = firstIdx + reflected.length + 1;
                        for (var ki = firstIdx; ki <= newLastIdx; ki++) {
                            targetKeys.push(ki);
                        }
                    } else if (hasMidPoints) {
                        var firstIdx = targetKeys[0];
                        var lastIdx = targetKeys[targetKeys.length - 1];

                        for (var rk = lastIdx - 1; rk > firstIdx; rk--) {
                            prop.removeKey(rk);
                        }
                        targetKeys = [firstIdx, firstIdx + 1];

                        $._curvase.insertMidKeyframes(prop, firstIdx, midPoints);

                        var numMids = midPoints.length / 2;
                        createdKeys += numMids;
                        targetKeys = [];
                        for (var ki = firstIdx; ki <= firstIdx + numMids + 1; ki++) {
                            targetKeys.push(ki);
                        }
                    }

                    var numSegs = ctrlVals.length / 4;
                    for (var ki = 0; ki < targetKeys.length - 1; ki++) {
                        var segIdx = hasMidPoints ? (ki % numSegs) : Math.min(ki, numSegs - 1);
                        var ci = segIdx * 4;
                        var esx1 = ctrlVals[ci], esy1 = ctrlVals[ci + 1];
                        var esx2 = ctrlVals[ci + 2], esy2 = ctrlVals[ci + 3];

                        var k0 = targetKeys[ki];
                        var k1 = targetKeys[ki + 1];

                        var result = $._curvase.buildSegmentEase(prop, k0, k1, esx1, esy1, esx2, esy2);
                        if (!result) continue;

                        var existingIn = prop.keyInTemporalEase(k0);
                        var existingOut = prop.keyOutTemporalEase(k1);
                        var interpIn = prop.keyInInterpolationType(k0);
                        var interpOut = prop.keyOutInterpolationType(k1);

                        prop.setTemporalEaseAtKey(k0, existingIn, result.outEase);
                        prop.setTemporalEaseAtKey(k1, result.inEase, existingOut);
                        prop.setInterpolationTypeAtKey(k0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                        prop.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

                        totalPairs++;
                    }

                    processedProps++;
                }
            }
        } catch (e) {
            app.endUndoGroup();
            return "Error: " + e.toString();
        }

        app.endUndoGroup();

        if (totalPairs === 0) {
            if (skippedProps > 0) {
                return "No valid keyframe pairs found. Select at least 2 keyframes on an animatable property (1D, 2D, 3D, Spatial, Color, or Shape).";
            }
            return "No keyframes modified. Ensure selected properties have keyframes and are supported types.";
        }

        var midMsg = createdKeys > 0 ? " (+" + createdKeys + " keyframe" + (createdKeys !== 1 ? "s" : "") + " created)" : "";
        var relMsg = isRelative ? " [Relative]" : "";
        var msg = "Applied " + segments.length + " segment" + (segments.length !== 1 ? "s" : "") + " to " + totalPairs + " pair" + (totalPairs !== 1 ? "s" : "") + midMsg + relMsg;
        if (processedProps > 0) {
            msg += " across " + processedProps + " propert" + (processedProps !== 1 ? "ies" : "y");
        }
        return msg + ".";
    },

    duplicateAndApply: function(segmentsJson, midPointsJson, modeStr) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return "No active composition found.";
        var layers = comp.selectedLayers;
        if (!layers || layers.length === 0) return "No layers selected.";

        var segments, midPoints;
        try {
            segments = eval("(" + segmentsJson + ")");
            midPoints = eval("(" + midPointsJson + ")");
        } catch (ex) { return "Error parsing curve data."; }
        if (!segments || segments.length === 0) return "No curve segments defined.";
        if (!midPoints) midPoints = [];

        var isMirror = (modeStr === "mirror");
        var undoLabel = isMirror ? "Curvase: Mirror & Apply" : "Curvase: Duplicate & Apply";

        app.beginUndoGroup(undoLabel);

        try {
            var totalDuped = 0;

            for (var li = 0; li < layers.length; li++) {
                var layer = layers[li];
                var layerProps = layer.selectedProperties;
                if (!layerProps || layerProps.length === 0) continue;

                for (var pi = 0; pi < layerProps.length; pi++) {
                    var prop = layerProps[pi];
                    if (prop.propertyType !== PropertyType.PROPERTY) continue;
                    if (!prop.canVaryOverTime) continue;

                    var selKeys = prop.selectedKeys;
                    if (!selKeys || selKeys.length < 2) continue;

                    var nk = selKeys.length;
                    var firstTime = prop.keyTime(selKeys[0]);
                    var lastTime = prop.keyTime(selKeys[nk - 1]);
                    var span = lastTime - firstTime;
                    if (span <= 0) continue;

                    var firstVal = prop.keyValue(selKeys[0]);
                    var lastVal = prop.keyValue(selKeys[nk - 1]);
                    var isArr = (firstVal instanceof Array);
                    var isShapeProp = $._curvase.isShape(prop);
                    var dupeIndices = [];

                    for (var ki = 0; ki < nk; ki++) {
                        var origTime = prop.keyTime(selKeys[ki]);
                        var newTime = lastTime + (origTime - firstTime);
                        var newVal;

                        if (ki === 0) {
                            dupeIndices.push(prop.nearestKeyIndex(lastTime));
                            continue;
                        }

                        if (isMirror) {
                            newVal = prop.keyValue(selKeys[nk - 1 - ki]);
                        } else if (isShapeProp) {
                            newVal = prop.keyValue(selKeys[ki]);
                        } else if (isArr) {
                            var origVal = prop.keyValue(selKeys[ki]);
                            newVal = [];
                            for (var d = 0; d < origVal.length; d++) {
                                newVal.push(origVal[d] + (lastVal[d] - firstVal[d]));
                            }
                        } else {
                            newVal = prop.keyValue(selKeys[ki]) + (lastVal - firstVal);
                        }

                        prop.setValueAtTime(newTime, newVal);
                        dupeIndices.push(prop.nearestKeyIndex(newTime));
                    }

                    for (var di = 1; di < dupeIndices.length; di++) {
                        prop.setInterpolationTypeAtKey(dupeIndices[di], KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    }

                    var ctrlVals = [];
                    for (var si = 0; si < segments.length; si++) {
                        var sx1 = segments[si].x1;
                        var sy1 = segments[si].y1;
                        var sx2 = segments[si].x2;
                        var sy2 = segments[si].y2;
                        if (sx1 < 0.001) sx1 = 0.001; else if (sx1 > 0.999) sx1 = 0.999;
                        if (sx2 < 0.001) sx2 = 0.001; else if (sx2 > 0.999) sx2 = 0.999;
                        ctrlVals.push(sx1, sy1, sx2, sy2);
                    }

                    if (midPoints.length >= 2) {
                        var dFirst = dupeIndices[0];
                        var dLast = dupeIndices[dupeIndices.length - 1];
                        for (var rk = dLast - 1; rk > dFirst; rk--) {
                            prop.removeKey(rk);
                        }
                        dupeIndices = [dFirst, dFirst + 1];
                        $._curvase.insertMidKeyframes(prop, dFirst, midPoints);
                        var numMids = midPoints.length / 2;
                        dupeIndices = [];
                        for (var ki = dFirst; ki <= dFirst + numMids + 1; ki++) {
                            dupeIndices.push(ki);
                        }
                    }

                    var numSegs = ctrlVals.length / 4;
                    for (var ki = 0; ki < dupeIndices.length - 1; ki++) {
                        var segIdx = midPoints.length >= 2 ? (ki % numSegs) : Math.min(ki, numSegs - 1);
                        var ci = segIdx * 4;
                        var k0 = dupeIndices[ki];
                        var k1 = dupeIndices[ki + 1];
                        var result = $._curvase.buildSegmentEase(prop, k0, k1, ctrlVals[ci], ctrlVals[ci + 1], ctrlVals[ci + 2], ctrlVals[ci + 3]);
                        if (!result) continue;
                        var existingIn = prop.keyInTemporalEase(k0);
                        var existingOut = prop.keyOutTemporalEase(k1);
                        prop.setTemporalEaseAtKey(k0, existingIn, result.outEase);
                        prop.setTemporalEaseAtKey(k1, result.inEase, existingOut);
                    }

                    totalDuped += dupeIndices.length;
                }
            }

            app.endUndoGroup();
            var label = isMirror ? "Mirrored" : "Duplicated";
            return totalDuped > 0 ? label + " & applied to " + totalDuped + " keyframes." : "No keyframes processed.";
        } catch (e) {
            app.endUndoGroup();
            return "Error: " + e.toString();
        }
    }
};