import proj4 from 'proj4';
import L from 'leaflet';

/**
*  A general purpose metric grid overlay for Leaflet.
*  Designed to show grids such as the British, Irish and UTM.
*  Such grids are composed of fixed size squares and were
*  traditionally used for estimating grid references on printed maps.
*  The grid is restricted to 100m, 1km, 10km or 100km intervals (more intervals would be possible but unusual).
*  Most grids repeat their numbering every 100km.
*  Grid lines will tend to straight as a Web Mercator map is zoomed in.
*  At low zooms, the minimum number of straight line segments are used to
*  draw grid lines that project as curves on Web Mercator.
*  Depends on proj4.js 2.5.0 or later
*  Author: bill.chadwick2@gmail.com
*  Inspired by lanwei@cloudybay.com.tw and Open Layers 3
*/

L.MetricGrid = L.Layer.extend({

    options: {

        proj4ProjDef: "must be provided",                    // must be provided
        bounds: [[0, 0] , [0, 0]],                           // must be provided. First coord is bottom left, second is top right in [x,y] format
        clip: null,                                          // optional, clip polygon in grid coordinates
        latLonClipBounds: null,                              // optional, Leaflet.LatLngBounds or equivalent array
        drawClip: false,                                     // optional, when true, the clip bounds are drawn with the same pen as the grid
        hundredKmSquareFunc: function(e, n) {return "";},    // optional, params are eastings and northings in metres

        showAxisLabels: [100, 1000, 10000],                  // show axis for listed grid spacings - omit 100000
        showAxis100km: false,
        showSquareLabels: [],                                // show square labels for listed grid spacings
        opacity: 0.7,
        weight: 2,                                           // use 2 for best results, else label rub-out is less good (antialiased pixels)
        color: "#00f",
        font: "bold 16px Verdana",
        density: 1,
        minInterval: 100,                   // minimum grid interval in metres
        maxInterval: 100000,                // maximum grid interval in metres, the bounds values should be multiples of this
        minZoom: 4                          // minimum zoom at which grid is drawn
    },


    // Pseudo class constructor
    initialize: function (options) {

        L.setOptions(this, options); // merge with default options above

        if (!this.options.fontColor) {
            this.options.fontColor = this.options.color;
        }
    },


    // Base class override
    onAdd: function (map) {

        this._map = map;

        if (!this._container) {
            this._initCanvas();
        }

        map._panes.overlayPane.appendChild(this._container);
        map.on("viewreset", this._reset, this);
        map.on("move", this._reset, this);
        // map.on("moveend", this._reset, this);
        // map.on("zoomanim", this._reset, this);

        this._reset();
    },


    // Base class override
    onRemove: function (map) {

        map.getPanes().overlayPane.removeChild(this._container);
        map.off("viewreset", this._reset, this);
        map.off("move", this._reset, this);
        map.off("moveend", this._reset, this);
    },


    // Base class override
    addTo: function (map) {
        map.addLayer(this);
        return this;
    },


    // Base class override, unlikely to be needed
    getAttribution: function () {
        return this.options.attribution;
    },


    // MetricGrid method
    setOpacity: function (opacity) {
        this.options.opacity = opacity;
        this._updateOpacity();
        return this;
    },


    // MetricGrid method
    bringToFront: function () {
        if (this._canvas) {
            this._map._panes.overlayPane.appendChild(this._canvas);
        }
        return this;
    },


    // MetricGrid method
    bringToBack: function () {
        var pane = this._map._panes.overlayPane;
        if (this._canvas) {
            pane.insertBefore(this._canvas, pane.firstChild);
        }
        return this;
    },


    // Private method to initialize a drawing canvas for the grid.
    // No animation support (yet).
    _initCanvas: function () {

        this._container = L.DomUtil.create("div", "leaflet-image-layer");
        this._canvas = L.DomUtil.create("canvas", "");
        this._updateOpacity();
        this._container.appendChild(this._canvas);

        // No canvas interactions, but bind canvas onload to our _onCanvasLoad
        L.extend(this._canvas, {
            onselectstart: L.Util.falseFn,
            onmousemove: L.Util.falseFn,
            onload: L.bind(this._onCanvasLoad, this)
        });
    },


    // Sets the clip region for a grid.
    // Useful at low zooms to prevent multiple grids drawing on top of each other.
    // See the demo for clipping of the British and Irish grids.
    // The clip path is specified in the options as an array of grid coordinates.
    // These should represent a simple closed polygon and start and end with the same point.
    // Individual points are an array of two coordinates - east/x then north/y.
    // The clip outline is drawn using the same pen (color and width) as the grid lines
    // Clipping is only used if one or more of the corners of the grid covering the visible map
    // lie outside of the clipping path.
    _setClip: function (ctx) {

        var map = this._map;
        var proj = this.options.proj4ProjDef;
        var i;

        if (this.options.clip) {

            // iterate the segments of the clip path
            var x2;
            var y2;
            var x1;
            var y1;
            var dX;
            var dY;
            var pts;
            var j;

            for(i=0; i < (this.options.clip.length-1); i+=1) {

                x2 = this.options.clip[i+1][0];
                x1 = this.options.clip[i][0];
                y2 = this.options.clip[i+1][1];
                y1 = this.options.clip[i][1];
                dX = x2-x1;
                dY = y2-y1;

                // interpolate a point along the line segment
                function _interpolate (frac) {
                    return proj4(proj).inverse([x1 + (frac * dX), y1 + (frac * dY)]);
                }

                // get set of Web Mercator line segments fitted to this segment with a maximum error of 1 pixel
                pts = this._getPoints(_interpolate, 1.0, map);

                // draw the clip path segment
                j = 0;
                if (i == 0) {
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    j = 1;
                }
                for (j=j; j < pts.length; j+=1) {
                    ctx.lineTo(pts[j].x, pts[j].y);
                }
            }

            // finish the path and set the clip region
            if (this.options.drawClip) {
                ctx.stroke();                
            }
            ctx.clip();   


            
        }
    },
    
    // sets a rectangular lat/lon clip
    // the latLonClipBounds should be [[bottom lat, left lon],[top lat, right lon]]
    // return is clip bounds in canvas coords
    _setLLClipBounds: function (ctx, map) {
      
        var b = L.latLngBounds(this.options.latLonClipBounds);
        var bl = map.latLngToContainerPoint(b.getSouthWest());
        var tr = map.latLngToContainerPoint(b.getNorthEast());
        
        ctx.beginPath();
        ctx.moveTo(bl.x, bl.y);
        ctx.lineTo(tr.x, bl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(bl.x, tr.y);
        ctx.lineTo(bl.x, bl.y);
        
        // finish the path and set the clip region
        if (this.options.drawClip) {
            ctx.stroke();                
        }
        ctx.clip();        
        
        // LL bounds in canvas coords, for use when labelling
        return L.bounds(bl, tr); 
    },


    // redraw the overlay after a map pan or zoom etc
    _reset: function () {

        var container = this._container;
        var canvas = this._canvas;
        var size = this._map.getSize();
        var lt = this._map.containerPointToLayerPoint([0, 0]);

        // position the canvas ontop of the map
        L.DomUtil.setPosition(container, lt);

        container.style.width = size.x + "px";
        container.style.height = size.y + "px";

        canvas.width  = size.x;
        canvas.height = size.y;
        canvas.style.width  = size.x + "px";
        canvas.style.height = size.y + "px";

        this._draw();
    },


    // fire a Layer loaded event
    _onCanvasLoad: function () {
        this.fire("load");
    },


    // internal opacity control
    _updateOpacity: function () {
        L.DomUtil.setOpacity(this._canvas, this.options.opacity);
    },


    // Formats eastings or northings within a 100km square for axis / square labelling
    // Most grids repeat their numbering every 100km
    // If grid spacing < 1km, uses 3 digits,
    // else if grid spacing < 10km uses 2 digits,
    // else one digit
    _formatEastOrNorth(n, spacing) {

        var r;
        var h = Math.floor(n / 100000);
        n = n % 100000; // metres within 100km square

        if (spacing < 1000) {
            r = Math.floor(n / 100).toString();
            r = (r.length == 1) ? "0" + r : r;
            r = (r.length == 2) ? "0" + r : r;
        }
        else if (spacing < 10000) {
            r = Math.floor(n / 1000).toString();
            r = (r.length == 1) ? "0" + r : r;
        }
        else {
            r = Math.floor(n / 10000).toString();
        }
        
        // prepend hundreds of km in subscript
        if (this.options.showAxis100km) {
            var hs = h.toString();
            var i;
            for(i = (hs.length-1); i >= 0; i--) {
                r = String.fromCharCode(hs.charCodeAt(i) + 8272) + r; 
            }
        }

        return r;
    },


    // Formats eastings value for grid line labels
    // This shows distance within each 100 km grid square - most grid stytems work like this
    _format_eastings: function(eastings, spacing) {
        return this._formatEastOrNorth(eastings, spacing);
    },


    // Formats northings value for grid line labels
    // This shows distance within each 100 km grid square - most grid stytems work like this
    _format_northings: function(northings, spacing) {
           return this._formatEastOrNorth(northings, spacing);
    },


    // Calculates map scale at the center of map in metres per pixel
    // On a Web Mercator map, scale changes with latitude (y axis)
    _mPerPx: function()
    {
        // get map resolution by moving 1 pixel at the center
        var ll1 = this._map.getCenter();
        var p1 = this._map.project(ll1);
        var p2 = p1.add(new L.Point(1,0));
        var ll2 = this._map.unproject(p2);
        return ll1.distanceTo(ll2);
    },


    // Determines graticule interval according to map scale
    // Because the grid can only be a power of 10 and map zooms are powers of two
    // some zooms will have small grid squares and some large.
    // The only way around this would be to introduce grids at decimal multiples of say 2 and 5 meters.
    // We don't do that as such a grid square can not be properly labeled.
    _calcInterval: function() {

        var mPerPx = this._mPerPx();

        // select the grid interval according to the map resolution
        // TODO make these limits into an option perhaps setting spacing by zoom
        var spacing;
        if (mPerPx <= 1) {
            spacing = 100;
        } else if (mPerPx <= 20) {
            spacing = 1000;
        } else if (mPerPx <= 175) {
            spacing = 10000;
        } else {
            spacing = 100000;
        }

        if (this.options.density)
            spacing = spacing / this.options.density;
         
        //limit to min/max interval
        if (spacing < this.options.minInterval) {
            spacing = this.options.minInterval;
        }
        if (spacing > this.options.maxInterval) {
            spacing = this.options.maxInterval;
        }

        return spacing;
    },

    // Finds the set of screen points corresponding to a grid line.
    // Most metric grid lines are nearly straight on a Web Mercator map, especially when zoomed in.
    // We use the minimum number of line segments that represent the actual grid line,
    // by chopping the grid line into a set of straight line segments that fit the grid line curve with less
    // than 1 screen pixel of error.
    // This approach can be used to draw e.g. a great circle on a Web Mercator map.
    // However if the WM curve of your line has a point of inflexion then you will need to
    // proceed in two parts about the inflexion.
    // There is an inflexion when a Great Circle crosses the equator on a WM map.
    //
    // The interpolate function should return the Lat/Lon of point a for a fraction of 0.0
    // and the Lat/Lon of point b for a fraction of 1.0.
    //
    // This code is adapted from OpenLayers 3
    //
    _getPoints: function (interpolate, tolerance, map) {

        var geoA = interpolate(0);
        var geoB = interpolate(1);

        var a = map.latLngToContainerPoint(L.latLng(geoA[1], geoA[0]));
        var b = map.latLngToContainerPoint(L.latLng(geoB[1], geoB[0]));

        var coords = [];
        var geoStack = [geoB, geoA];
        var stack = [b, a];
        var fractionStack = [1, 0];
        var fractions = {};
        var maxIterations = 1000;
        var geoM;
        var m;
        var fracA;
        var fracB;
        var fracM;
        var key;

        while (--maxIterations > 0 && fractionStack.length > 0) {
            // Pop the a coordinate off the stack
            fracA = fractionStack.pop();
            geoA = geoStack.pop();
            a = stack.pop();

            // Add the a coordinate if it has not been added yet
            key = fracA.toString();
            if (!fractions[key]) {
              coords.push(a);
              fractions[key] = true;
            }

            // Pop the b coordinate off the stack
            fracB = fractionStack.pop();
            geoB = geoStack.pop();
            b = stack.pop();

            // Find the m point between the a and b coordinates
            fracM = (fracA + fracB) / 2;
            geoM = interpolate(fracM);
            m = map.latLngToContainerPoint(L.latLng(geoM[1], geoM[0]));

            if (L.LineUtil.pointToSegmentDistance(m, a, b) < tolerance){
              // If the m point is sufficiently close to the straight line, then we
              // discard it.  Just use the b coordinate and move on to the next line
              // segment.
              coords.push(b);
              key = fracB.toString();
              fractions[key] = true;
            }
            else {
              // Otherwise, we need to subdivide the current line segment.  Split it
              // into two and push the two line segments onto the stack.
              fractionStack.push(fracB, fracM, fracM, fracA);
              stack.push(b, m, m, a);
              geoStack.push(geoB, geoM, geoM, geoA);
            }
        }
        return coords;
    },


    // Determine if a point lies inside a polygon
    // This is used to check if a point lies outside the clipping region.
    // vs is an array of 2d points [[x,y],,,]
    _inside: function (point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

        var x = point[0];
        var y = point[1];
        var i;

        var inside = false;
        for (i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    },


    // Draw the grid.
    // We compute, in the current grid interval, a bounding box that contains the map view.
    // Then we draw vertical and horizontal grid lines for that box.
    // Then we optionally label the left and right axis, taking care to avoid colliding labels.
    // Then we optionally label each grid square in its bottom left corner.
    _draw: function() {

        var canvas = this._canvas;
        var map = this._map;

        if (L.Browser.canvas && map) {
            var zoom = map.getZoom();
            if (this.options.minZoom && zoom < this.options.minZoom)
                return;
            if (this.options.maxZoom && zoom > this.options.maxZoom)
                return;
            if (this.options.skipZoom && this.options.skipZoom.indexOf(zoom) > -1)
                return;

            var spacing = this._calcInterval();
            var proj = this.options.proj4ProjDef
            var ctx = canvas.getContext("2d");

            //set up canvas for drawing and writing
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = this.options.weight;
            ctx.strokeStyle = this.options.color;
            ctx.fillStyle = this.options.fontColor;

            if (this.options.font) {
                ctx.font = this.options.font;
            }
            var txtWidth = ctx.measureText("0").width;
            var txtHeight;
            var _font_frags = ctx.font.split(" ");
            var i;
            for (i=0; i < _font_frags.length; i+=1) {
                txtHeight = parseInt(_font_frags[i], 10);
                if (!isNaN(txtHeight)) {
                    break;
                }
            }

            // get bounds of map corners in grid projection
            var mapB = map.getBounds();
            var mapSW = mapB.getSouthWest();
            var mapNE = mapB.getNorthEast();
            var mapNW = mapB.getNorthWest();
            var mapSE = mapB.getSouthEast();
            var mapSWg = proj4(proj).forward([mapSW.lng, mapSW.lat]);
            var mapNEg = proj4(proj).forward([mapNE.lng, mapNE.lat]);
            var mapNWg = proj4(proj).forward([mapNW.lng, mapNW.lat]);
            var mapSEg = proj4(proj).forward([mapSE.lng, mapSE.lat]);
            
            //also the middles of the sides of the map            
            var mapSMg = proj4(proj).forward([mapB.getCenter().lng, mapB.getSouth()]);
            var mapNMg = proj4(proj).forward([mapB.getCenter().lng, mapB.getNorth()]);
            var mapWMg = proj4(proj).forward([mapB.getWest(), mapB.getCenter().lat]);
            var mapEMg = proj4(proj).forward([mapB.getEast(), mapB.getCenter().lat,]);

            // extend grid bounds to enclose the map corners           
            var grdWx = Math.min(mapSWg[0], mapNWg[0]);
            var grdEx = Math.max(mapSEg[0], mapNEg[0]);
            var grdSy = Math.min(mapSWg[1], mapSEg[1]);
            var grdNy = Math.max(mapNWg[1], mapNEg[1]);

            // extend grid bounds to enclose the middles of the sides
            grdWx = Math.min(mapWMg[0], grdWx);
            grdEx = Math.max(mapEMg[0], grdEx);
            grdSy = Math.min(mapSMg[1], grdSy);
            grdNy = Math.max(mapNMg[1], grdNy);
            
            // round up/down based on the spacing
            grdWx = Math.floor(grdWx / spacing) * spacing;
            grdSy = Math.floor(grdSy / spacing) * spacing;
            grdEx = Math.ceil(grdEx / spacing) * spacing;
            grdNy = Math.ceil(grdNy / spacing) * spacing;

            var canvasClipBounds = null;
            if (this.options.clip) {
                // if any of the corners of our grid are outside the clip path then we need to clip
                // must do this before restricting to grid bounds

                var swInClip = this._inside([grdWx, grdSy], this.options.clip);
                var seInClip = this._inside([grdEx, grdSy], this.options.clip);
                var neInClip = this._inside([grdEx, grdNy], this.options.clip);
                var nwInClip = this._inside([grdWx, grdNy], this.options.clip);

                if ((!swInClip) || (!seInClip) || (!neInClip) || (!nwInClip)){
                    this._setClip(ctx);
                }
            }
            else if (this.options.latLonClipBounds) {     
                canvasClipBounds = this._setLLClipBounds(ctx, map);
            }

            // Limit to grid bounds. We don't need to draw anything
            // if the map is way outside the area of the grid.
            if (grdWx < this.options.bounds[0][0]) {
                grdWx = Math.floor(this.options.bounds[0][0] / spacing) * spacing;
            }
            if (grdWx > this.options.bounds[1][0]) {
                return; // left of grid > east limit
            }
            if (grdEx > this.options.bounds[1][0]) {
                grdEx = Math.ceil(this.options.bounds[1][0] / spacing) * spacing;
            }
            if (grdEx < this.options.bounds[0][0]) {
                return; // right of grid < west limit
            }
            if (grdSy < this.options.bounds[0][1]) {
                grdSy = Math.floor(this.options.bounds[0][1] / spacing) * spacing;
            }
            if (grdSy > this.options.bounds[1][1]) {
                return; // south of grid > north limit
            }
            if (grdNy > this.options.bounds[1][1]) {
                grdNy = Math.ceil(this.options.bounds[1][1] / spacing) * spacing;
            }
            if (grdNy < this.options.bounds[0][1]) {
                return; // north of grid < south limit
            }

            var ww = canvas.width;
            var hh = canvas.height;

            // now draw lines
            var d = spacing;
            var d2 = d / 2;

            // Verticals of constant Eastings
            var h = grdNy - grdSy;
            for (let x = grdWx; x <= grdEx; x += d) {

                // interpolate northings from top to bottom
                function _interpolateY (frac) {
                    return proj4(proj).inverse([x, grdNy - (frac * h)]);
                }

                var pts = this._getPoints(_interpolateY, 1.0, map)

                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i].x, pts[i].y);
                }
                ctx.stroke();
            }

            // Horizontals of constant Northings
            var w = grdEx - grdWx;
            for (let y = grdSy; y <= grdNy; y += d) {

                // interpolate eastings from right to left
                function _interpolateX (frac) {
                    return proj4(proj).inverse([grdEx - (frac * w), y]);
                }

                var pts = this._getPoints(_interpolateX, 1.0, map)

                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i].x, pts[i].y);
                }
                ctx.stroke();
            }

            // Now the axis labels
            // We label the West and South axis at grid croosings that are on screen.
            // We label in the middle of the vertical or horizontal edge of a grid square,
            // like the OS do on their printed maps. This means the labels never collide.
            
            ctx.fillStyle=this.options.color; // for rub out
            var rubWidth = this.options.weight * 3;
            
            // Eastings axis labels
            if (this.options.showAxisLabels.indexOf(d) >= 0) {
                for (let x = grdWx; x <= grdEx; x += d) {
                    for (let y = grdSy; y <= grdNy; y += d) {

                        var ll = proj4(proj).inverse([x, y+d2]); // middle of vertical square edge
                        var s = map.latLngToContainerPoint(L.latLng(ll[1], ll[0])); // screen point

                        // check on screen and within grid bounds
                        if ((s.x > 0) && (s.y < hh) && (x < this.options.bounds[1][0])) {
                            
                            if (this.options.clip) {
                                if (!this._inside([x, y+d2], this.options.clip)) {
                                    continue;
                                }
                            }
                            else if (this.options.latLonClipBounds) {
                                if (!canvasClipBounds.contains([s.x, s.y])) {
                                    continue;
                                }
                            }
                            
                            var eStr = this._format_eastings(x, d);
                            txtWidth = ctx.measureText(eStr).width;
                            
                            // rub out the bit of the grid line the text will be over
                            ctx.globalCompositeOperation = "destination-out";
                            ctx.fillRect(s.x - (rubWidth/2), s.y-txtHeight, rubWidth, txtHeight * 1.2);
                            ctx.globalCompositeOperation = "source-over";
                            
                            ctx.fillText(eStr, s.x - (txtWidth / 2), s.y);
                            break;
                        }
                    }
                }
            }

            // Northings axis labels
            if (this.options.showAxisLabels.indexOf(d) >= 0) {
                for (let y = grdSy; y <= grdNy; y += d) {
                    for (let x = grdWx; x <= grdEx; x += d) {

                        var ll = proj4(proj).inverse([x+d2, y]); // middle of horizontal square edge
                        var s = map.latLngToContainerPoint(L.latLng(ll[1], ll[0])); // screen point

                        // check on screen and within grid bounds
                        if ((s.x > 0) && (s.y < hh) && (y < this.options.bounds[1][1])) {
                            
                            if (this.options.clip) {
                                if (!this._inside([x+d2, y], this.options.clip)) {
                                    continue;
                                }
                            }
                            else if (this.options.latLonClipBounds) {
                                if (!canvasClipBounds.contains([s.x, s.y])) {
                                    continue;
                                }
                            }
                            
                            var nStr = this._format_northings(y, d);
                            txtWidth = ctx.measureText(nStr).width;
                            
                            // rub out the bit of the grid line the text will be over
                            ctx.globalCompositeOperation = "destination-out";
                            ctx.fillRect(s.x - txtWidth * 0.1, s.y - (rubWidth/2), txtWidth * 1.2, rubWidth);
                            ctx.globalCompositeOperation = "source-over";
                                                        
                            ctx.fillText(nStr, s.x, s.y + (txtHeight / 2));
                            break;
                        }
                    }
                }
            }

            // Grid Square labels in bottom left of each square, with a 2px padding
            var str;
            if (this.options.showSquareLabels.indexOf(d) >= 0) {
                for (y = grdSy; y <= grdNy; y += d) {
                    for (let x = grdWx; x <= grdEx; x += d) {

                        var ll = proj4(proj).inverse([x, y]); // bottom left corner of grid square
                        var s = map.latLngToContainerPoint(L.latLng(ll[1], ll[0]));

                        // check on screen and within grid bounds
                        if ((s.x > 0) && (s.y < hh) && (x < this.options.bounds[1][0]) && (y < this.options.bounds[1][1])) {
                            var nStr = this._format_northings(y, d);
                            var eStr = this._format_eastings(x, d);
                            var sq = this.options.hundredKmSquareFunc(x, y);
                            str = sq;
                            if (d < 100000) {
                                str += eStr + nStr;
                            }
                            ctx.fillText(str, s.x + 2, s.y - 2);
                        }
                    }
                }
            }
        }
    },

});

// instance factory
L.metricGrid = function (options) {
    return new L.MetricGrid(options);
};

/** Definitions for a British Grid - EPSG code 27700
* Clip path avoids overlaying L.IrishGrid.
*/
L.BritishGrid = L.MetricGrid.extend({

    options: {
        proj4ProjDef: "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs",
        bounds: [[0, 0] , [700000, 1300000]],
        clip: [[0, 0], [700000, 0], [700000, 1300000], [0, 1300000], [0, 700000],
               [100000, 650000], [150000, 600000],  [190000, 550000], [200000, 500000], [200000, 400000],[0,0]],
        hundredKmSquareFunc: function(e, n) {
            var osgbGridSquares =  // index by  Northing kM / 100, Easting kM / 100
            [
                ["SV","SW","SX","SY","SZ","TV","TW"],
                ["SQ","SR","SS","ST","SU","TQ","TR"],
                ["SL","SM","SN","SO","SP","TL","TM"],
                ["SF","SG","SH","SJ","SK","TF","TG"],
                ["SA","SB","SC","SD","SE","TA","TB"],
                ["SV","NW","NX","NY","NZ","OV","OW"],
                ["NQ","NR","NS","NT","NU","OQ","OR"],
                ["NL","NM","NN","NO","NP","OL","OM"],
                ["NF","NG","NH","NJ","NK","OF","OG"],
                ["NA","NB","NC","ND","NE","OA","OB"],
                ["HV","HW","HX","HY","HZ","JV","JW"],
                ["HQ","HR","HS","HT","HU","JQ","JR"],
                ["HL","HM","HN","HO","HP","JL","JM"]
            ];
            var eSq = Math.floor(e / 100000);
            var nSq = Math.floor(n / 100000);
            return ((eSq < 7) && (nSq < 13) && (eSq >= 0) && (nSq >= 0)) ? osgbGridSquares[nSq][eSq] : "--";
        }
    }
});

// instance factory
L.britishGrid = function (options) {
    return new L.BritishGrid(options);
};

/** Definitions for a Irish Grid - EPSG code 29903 (TM75)
* Clip path avoids overlaying L.BritishGrid
*/
L.IrishGrid = L.MetricGrid.extend({

    options: {
        proj4ProjDef: "+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=1.000035 +x_0=200000 +y_0=250000 +ellps=mod_airy +towgs84=482.5,-130.6,564.6,-1.042,-0.214,-0.631,8.15 +uni+units=m +no_defs",
        bounds: [[0, 0] , [500000, 500000]],
        clip: [
            [0, 0],
            [290000, 0],
            [370000, 300000],
            [370000, 400000],
            [310000, 460000],
            [200000, 500000],
            [0, 500000],
            [0, 0]],
        hundredKmSquareFunc: function(e, n) {
            var    irishGridSquares = // index by Easting kM / 100, Northing kM / 100
            [
            ["V", "Q", "L", "F", "A"],
            ["W", "R", "M", "G", "B"],
            ["X", "S", "N", "H", "C"],
            ["Y", "T", "O", "J", "D"],
            ["Z", "U", "P", "K", "E"]
            ];
            var eSq = Math.floor(e / 100000);
            var nSq = Math.floor(n / 100000);
            return ((eSq < 5) && (nSq < 5) && (eSq >= 0) && (nSq >= 0)) ? irishGridSquares[eSq][nSq] : "--";
        }
    }
});

// instance factory
L.irishGrid = function (options) {
    return new L.IrishGrid(options);
};

/** Definitions for UTM grid
*/

L.UtmGrid = L.MetricGrid.extend({

    options: {
        bounds: [[100000, 0] , [900000, 9400000]]
    },
    
    initialize: function(zone, bSouth, options) {
        
        options.proj4ProjDef = "+proj=utm +zone=" + zone + " +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
        if (bSouth) {
            options.proj4ProjDef += " +south";
            options.bounds = [[100000, 600000] , [900000, 10000000]];
        }

        options.hundredKmSquareFunc = function(e, n) {
            
            var r = "";
            
            // 100kM square UTM Easting letters, standard treatment (NIMA 8358.1 Appx B3)

            var UTMEast = [
            "ABCDEFGH", // zones 1,4, ...,   -400, -300, -200, -100, 0, 100, 200, 300 kM
            "JKLMNPQR", // zones 2,5, ...,
            "STUVWXYZ"  // zones 3,6, ...,
            ];

            // 100kM square UTM Northing letters, standard treatment (NIMA 8358.1 Appx B3)
            // repeat every 2000 kM
            // start at A at 0 Lat and go forwards for northern hemisphere
            // start at V at 0 Lat and go backwards for southern hemisphere

            var UTMNorthGroup1 =
            [
            "ABCDEFGHJKLMNPQRSTUV", // odd numbered zones
            "FGHJKLMNPQRSTUVABCDE"  // even numbered zones
            ];     
            
            var x = Math.floor(e / 100000);
            var y = Math.floor(n / 100000);
            var z = zone - 1;

            if (bSouth) {
                y -= 100;
            }
            
            if ((x >= 1) && (x <= 8)) {                           
                r  = UTMEast[z % 3].charAt(x - 1);
            }
            else {
                r = '-';
            }

            if (y >= 0) {
                r += UTMNorthGroup1[z % 2].charAt(y % 20);// Northern Hemisphere
            }
            else {
                r += UTMNorthGroup1[z  % 2].charAt(19+((y+1) % 20));// Southern Hemisphere      
            }
            return r;            
        }
        
        L.setOptions(this, options);
    }
    
});
            
// instance factory
// constructor params are UTM zone 1..60 and boolean true for southern hemisphere
L.utmGrid = function (zone, bSouth, options) {
    return new L.UtmGrid(zone, bSouth, options);
};