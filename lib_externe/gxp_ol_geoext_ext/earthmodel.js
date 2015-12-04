var app;
var timeslider;
var slider_value = age;

OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;
OpenLayers.Util.onImageLoadErrorColor = 'transparent';
OpenLayers.DOTS_PER_INCH = 90.71428571428572;

var loadingPanel = new OpenLayers.Control.LoadingPanel();


Ext.namespace("Earthmodel.plugins");

// CustomIconsLayerTree --------------------------------

/** api: constructor
 *  .. class:: CustomIconsLayerTree(config)
 *
 *     Plugin for adding a tree of layers to a :class:`gxp.Viewer` using custom icons for layers. Also
 *    provides a context menu on layer nodes.
 */
Earthmodel.plugins.CustomIconsLayerTree = Ext.extend(gxp.plugins.LayerTree, {

    /** api: ptype = em_layertree */
    ptype: "em_layertree",

    /** api: layersConfig  */
    layersConfig: null,

    /** private: method[configureLayerNode]
     *  :arg loader: ``GeoExt.tree.LayerLoader``
     *  :arg node: ``Object`` The node
     */
    configureLayerNode: function (loader, attr) {
        attr.uiProvider = this.treeNodeUI;
        var layer = attr.layer;
        var store = attr.layerStore;
        if (layer && store) {
            var record = store.getAt(store.findBy(function (r) {
                return r.getLayer() === layer;
            }));
            if (record) {
                attr.qtip = record.get('name');
                //if (!record.get("queryable")) {
                //    attr.iconCls = "gxp-tree-rasterlayer-icon";
                //}

                for (lc in this.layersConfig) {
                    if (record.get('name') == this.layersConfig[lc].name) {
                        // Set the custom icon for layer in tree (see earthmodel.css for css styles)
                        attr.iconCls = "tree-" + this.layersConfig[lc].iconCls;
                        break;
                    }
                }

                if (record.get("fixed")) {
                    attr.allowDrag = false;
                }
                attr.listeners = {
                    rendernode: function (node) {
                        if (record === this.target.selectedLayer) {
                            node.select();
                        }
                        this.target.on("layerselectionchange", function (rec) {
                            if (!this.selectionChanging && rec === record) {
                                node.select();
                            }
                        }, this);
                    },
                    scope: this
                };
            }
        }
    }

});

Ext.preg(Earthmodel.plugins.CustomIconsLayerTree.prototype.ptype, Earthmodel.plugins.CustomIconsLayerTree);

// CustomIconsLayerTree --------------------------------



// FilterTool ------------------------------------------

/** api: constructor
 *  .. class:: FilterTool(config)
 *
 *    Provides an action to define a CQL filter to a layer.
 */
Earthmodel.plugins.FilterTool = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = em_filtertool */
    ptype: "em_filtertool",

    /** api: config[menuText]
     *  ``String``
     *  Text for filter menu item (i18n).
     */
    menuText: "Filter",

    /** api: config[tooltip]
     *  ``String``
     *  Text for filter action tooltip (i18n).
     */
    tooltip: "Filter options",

    cqlFilter: "",

    /** api: layersConfig  
    *   
    * 
    */
    layersConfig: null,

    /** api: layersConfig  */
    layersWithCql: null,

    /** api: config[actionTarget]
     *  ``Object`` or ``String`` or ``Array`` Where to place the tool's actions
     *  (e.g. buttons or menus)? Use null as the default since our tool has both 
     *  output and action(s).
     */
    actionTarget: null,

    /** private: method[constructor]
     */
    constructor: function (config) {
        Earthmodel.plugins.FilterTool.superclass.constructor.apply(this, arguments);

        if (!this.outputConfig) {
            this.outputConfig = {
                width: 300,
                height: 200
            };
        }
        Ext.applyIf(this.outputConfig, { title: this.menuText });
    },

    /** api: method[addActions]
     */
    addActions: function () {
        var arguments = [{
            menuText: this.menuText,
            iconCls: "gxp-icon-filtertool",
            tooltip: this.tooltip,
            handler: function () {
                this.removeOutput();
                this.addOutput();
            },
            scope: this
        }];


        var actions = Earthmodel.plugins.FilterTool.superclass.addActions.apply(this, [arguments]);
        actions[0].disable();

        this.target.on("layerselectionchange", function (record) {
            var isNotLayer = !record || !record.get("layer");
            var disableTool = true;

            if (!isNotLayer) {
                // Check if context menu item should be enabled/disabled
                for (var j = 0; j < layersWithCql.length; j++) {
                    for (lc in this.layersConfig) {
                        if ((layersWithCql[j] == this.layersConfig[lc].title) &&
                            (record.get('name') == this.layersConfig[lc].name)) {

                            disableTool = false;

                            SelectedLayerConfig = this.layersConfig[lc];
                            ASpecFilter = (this.layersConfig[lc].custom_cql_filter == null)?"":this.layersConfig[lc].custom_cql_filter;

                            break;
                        }
                    }

                    if (!disableTool) break;
                }

                if (disableTool) {
                    SelectedLayerConfig = null;
                    ASpecFilter = "";
                }
            }

            actions[0].setDisabled(disableTool);
        }, this);

        return actions;
    },

    /** private: method[addOutput]
     *  :arg config: ``Object``
     */
    addOutput: function (config) {
        var ttl = this.target.selectedLayer.data.title;
        return Earthmodel.plugins.FilterTool.superclass.addOutput.call(this, Ext.apply({
            xtype: 'panel',
            ascending: false,
            border: false,
            filter: function (record) {
                if (record.data.title == ttl) return true;
                return false;
            },
            padding: 15,
            html: "CQL filter: <input id=cqlFilter type=text value='" + ASpecFilter.replace(/\'/g, '&#39;') + "'><br/><button onclick=\"ASpecFilter = Ext.fly('cqlFilter').dom.value;applyFilterLayer();return false;\">Apply</button>",
            hideMode: "offsets",
            layerStore: this.target.mapPanel.layers,
            defaults: { cls: 'gxp-legend-item', autoScroll: true }
        }, config));
    }

});

Ext.preg(Earthmodel.plugins.FilterTool.prototype.ptype, Earthmodel.plugins.FilterTool);

// FilterTool ------------------------------------------

function initApp() {

    Ext.onReady(function () {

        Ext.BLANK_IMAGE_URL = 'scripts/ext-3.4.0/resources/images/default/s.gif';

        //keep session alive
        function keepAlive() {
            Ext.Ajax.request({ url: "handlers/setSetting.ashx?action=keepalive&rnd=" + Math.random(), method: 'get' })
        }
        Ext.TaskMgr.start({
            run: keepAlive,
            interval: 300000 //5min
        });

        //show disclaimer
        if (typeof (skipDisClaimer) == "undefined") //set in userconfig
            new Ext.Window({
                id: "Disclaimer"
                , width: 600
                , height: 450
                , plain: true
                , autoScroll: true
                , modal: true
                , autoLoad: {
                    url: 'disclaimer.htm'
                }
            }).show();

        //timeslider map options
        var options = {
            numZoomLevels: 1, //no zooming
            maxExtent: new OpenLayers.Bounds(0, -50, 0, 50), //restrict to pan north-south
            controls: [new OpenLayers.Control.Navigation()], //to not show the panzoombar
            eventListeners: { "moveend": getSliderValue} //add event when map is mooved
        };

        var aHelpButton = { xtype: "button", hideLabel: true, icon: "icons/help.png", handler: function () { new Ext.Window({ width: 400, height: 400, bodyCls: { "background-color": "white" }, padding: 10, autoScroll: true, title: "Help", autoLoad: "help.htm" }).show() } };

        //the timeslider map
        timeslider = new OpenLayers.Map(options);
        //the timebar image
        var timebar = new OpenLayers.Layer.Image(
                'TimeSlider',
                'images/slider/new_time_slider.png',
                new OpenLayers.Bounds(-1.15, -55.95, 1.15, 55.95), //pix size/100 around 0
                new OpenLayers.Size(230, 11190),
                options
            );

        timeslider.addLayer(timebar);


        //style for featureInfo highlight
        var featureInfoStyle = new OpenLayers.StyleMap({
            pointRadius: 8,
            graphicName: "circle",
            fillOpacity: 0.4,
            fillColor: "#ccccff",
            strokeWidth: 2,
            strokeColor: "#9999ff"
        });



        // timeslider.addControl(OpenLayers.Control.MousePosition());

        //add map to panel
    mapPanel = new GeoExt.MapPanel({
        id: "SliderPanel",
        region: "center",
        map: timeslider,
        center: new OpenLayers.LonLat(0, getLatFromAge(age)),
        zoom: 1,
        listeners: {
            'afterLayout': function (thisCmp) {//draw a triangle in the middle of timeslider after each resize
                var mdpnr = Ext.get('sliderMidr');
                if (mdpnr) mdpnr.remove();
                var mdpnl = Ext.get('sliderMidl');
                if (mdpnl) mdpnl.remove();
                var cmpbox = Ext.getCmp("SliderPanel").getBox();
                if (cmpbox.height > 100) {
                    Ext.getBody().createChild("<div id='sliderMidr' style='position:absolute;top:" + Math.floor((cmpbox.y + cmpbox.height / 2) - 4) + "px;left:" + cmpbox.x + "px;background-image:url(images/slider/triangle_right.png);z-index:999;'></div>");
                    Ext.getBody().createChild("<div id='sliderMidl' style='position:absolute;top:" + Math.floor((cmpbox.y + cmpbox.height / 2) - 4) + "px;left:" + (cmpbox.x + 230 - 28) + "px;background-image:url(images/slider/triangle_left.png);z-index:999;'></div>");
                }
            }
        },
        tbar: new Ext.Toolbar({
            items: [{
                xtype: 'tbbutton',
                icon: "scripts/GXP/src/theme/img/silk/arrow_up.png",
                handler: function () { getPrevious() }
            }, {
                xtype: 'tbbutton',
                icon: "scripts/GXP/src/theme/img/silk/arrow_down.png",
                handler: function () { getNext() }
            },
            '->',
            {
                xtype: 'textfield',
                width: 100,
                name: 'current_seq',
                id: 'current_seq',
                fieldLabel: "Age"
            }, {
                xtype: 'tbbutton',
                icon: "scripts/GXP/src/theme/img/silk/control_repeat.png",
                handler: function () { findagde() }
            }
            ]
        })
    })



        app = new gxp.Viewer({
            proxy: "handlers/provider.ashx?url=",

            portalConfig: {
                // renderTo: document.body,
                layout: "border",
                //height: 800,
                // by configuring items here, we don't need to configure portalItems
                // and save a wrapping container
                items: [
			{ id: "header", height: 16, contentEl: "MainContent_topbar", region: "north", xtype: "panel" },
			{
			    // a TabPanel with the map and a dummy tab
			    id: "centerpanel",
			    border: false,
			    region: "center",
			    layout: "fit",
			    activeTab: 0, // map needs to be visible on initialization
			    border: true,
			    items: ["mymap"]
			},
			{
			    id: 'slider',
			    region: 'east',
			    width: 230,
			    layout: 'border',
			    items: [
                    mapPanel,
                    { region: 'south', id: 'slider_footer', height: 90, html: "<img src='images/slider/sliderkey_white.png'/>" }
                ]
			},
			{
			    // container for the queryform
			    title: "Table of Contents",
			    border: false,
			    frame: false,
			    split: true,
			    padding: 0,
			    layout: "border",
			    region: "west",
			    defaults: {
			        width: 230, autoScroll: true, layout: 'fit', border: false, frame: true, split: true
			    },
			    width: 230,
			    items: [
                     { id: 'treepanel', xtype: "container", region: 'center' },
                     { id: 'infoPanel', title: "Sequence information", region: 'south', height: 250, padding: 0, border: false, frame: false }
                 ],
			    listeners: {
			        'resize': function () { Ext.getCmp("treepanel").doLayout() }
			    }
			},
             { id: "PageFooter", height: 14, contentEl: "FooterPanel", region: "south", xtype: "panel" }
             ]
            },

            // configuration of all tool plugins for this application
            tools: [{
                ptype: "em_layertree",
                groups: currentGroups,
                layersConfig: currentLayers,
                outputConfig: {
                    id: "tree",
                    border: true,
                    autoScroll: true
                },
                outputTarget: "treepanel"
            }, {
                ptype: "gxp_zoomtoextent",
                actionTarget: "map.tbar"
            }, {
                ptype: "gxp_zoom",
                actionTarget: "map.tbar"
            },
        {
            ptype: "em_filtertool",
            layersConfig: currentLayers,
            layersWithCql: layersWithCql,
            actionTarget: "tree.contextMenu"
        },
        {
            ptype: "gxp_navigationhistory",
            actionTarget: "map.tbar"
        },
        {
            ptype: "gxp_wmsgetfeatureinfo",
            outputConfig: {
                width: 500,
                height: 400
            },
            layerParams: ["CQL_FILTER"],
            format: "grid",
            actionTarget: "map.tbar", // this is the default, could be omitted
            toggleGroup: "layertools",
            highlightFeatures: true,
            listeners: {
                beforegetfeatureinfo: function (evt) {
                    //clean up features from previous request or add layer if not present
                    try {
                        app.mapPanel.map.getLayersByName("highlightLayer")[0].removeAllFeatures();
                    } catch (e) { }
                    Ext.select("div.gx-popup").remove();
                },
                getfeatureinfo: function (evt, title) {
                    //console.log(evt);
                },
                render: getCustomRenderer,
                deactivate: function () {
                    if (app.mapPanel.map.getLayersByName("highlightLayer").length > 0)
                        app.mapPanel.map.getLayersByName("highlightLayer")[0].removeAllFeatures();
                },
                beforedestroy: function () {
                    try {
                        app.mapPanel.map.getLayersByName("highlightLayer")[0].removeAllFeatures();
                    } catch (e) { }
                }
            }
        }, {
            // shared FeatureManager for feature editing, grid and querying
            ptype: "gxp_featuremanager",
            id: "featuremanager",
            maxFeatures: 20
        }, {
            ptype: "gxp_legend",
            autoScroll: true,
            outputConfig: { autoScroll: true, width: 500, height: 600 },
            actionTarget: ["tree.contextMenu"]
        }, {
            ptype: "gxp_layerproperties",
            actionTarget: ["tree.contextMenu"]
        }

        ],

            // layer sources
            defaultSourceType: "gxp_wmssource",
            sources: {
                local: {
                    url: "handlers/provider.ashx",
                    version: "1.1.1"
                },
                "osm": {
                    ptype: "gxp_osmsource"
                },
                ol: {
                    ptype: "gxp_olsource"
                }
            },

            // map and layers
            map: {
                id: "mymap", // id needed to reference map in portalConfig above
                border: false,
                //todo: change to epsg:4326 (and later to polar-proj)
                projection: "epsg:" + currentProjection,
                resolutions: resolutions,
                units: Units,
                maxResolution: maxRes,
                //todo: set maxextent for user?
                maxExtent: maxExt,
                //todo: dependant on customer set default center
                center: Center,
                zoom: Zoom,
                layers: currentLayers,
                items: [{
                    xtype: "gx_zoomslider",
                    vertical: true,
                    height: 100
                }]
            },
            listeners: {
                ready: function () {
                    //add higlight layer
                    app.mapPanel.map.addLayer(new OpenLayers.Layer.Vector("highlightLayer", { styleMap: featureInfoStyle, displayInLayerSwitcher: false }));
                    //set slider
                    //console.log(age);
                    getSeqDetails(age, "closest");
                    loadingPanel.hide(); //no loading at first load
                    //app.mapPanel.map.addControl(new OpenLayers.Control.MousePosition());
                    //app.mapPanel.map.addControl(new OpenLayers.Control.Scale());
                    //app.mapPanel.map.baseLayer.events.listeners.loadend = [{ func: showDynLayers}];
                    app.mapPanel.map.addControl(loadingPanel);

                    //add projection/mode pull downs
                    Ext.getCmp("mymap").topToolbar.add({ xtype: 'tbfill' });
                    Ext.getCmp("mymap").topToolbar.add(aModeCombo);
                    Ext.getCmp("mymap").topToolbar.add(aProjCombo);
                    Ext.getCmp("mymap").topToolbar.add(aHelpButton);
                    Ext.getCmp("mymap").doLayout();
                }
            }
        });

    });
}

var prop;
function showProp(record) {
    if (prop) {
        prop.close();
    }
    prop = new Ext.Window({
        title: "Properties: " + record.get("title"),
        width: 280,
        height: 350,
        layout: "fit",
        items: [{
            xtype: "gxp_wmslayerpanel",
            layerRecord: record,
            defaults: { style: "padding: 10px" }
        }]
    });
    prop.show();
}

//js-inits from slider.js

var gde = curMode == "GDE" ? true : false;                     // true = GDE mode, false = gdy mode
var userFilter = null;              //Extra cql filters added by user to text box
var cqlFilter;                      // complete cql used to update service
var cqlSequence = "seq = 'K_140M'"; // initial cql

// Variables for current time sequence, Geological & Publishing Info
var sequence = 'K_140M';    // Default for initial page load
//var age = 93.5;             // Default for initial page load - Should be same as slider_value in slider JScript file = set in userconfig.ashx
var epoch = '';
var stage = '';
var bugzone = '';
var version = '';
var published = '';
var period = '';
var period_code = '';
var wms_link = '';
var mRegion = new Array();
var mPubVersion = new Array();
var mPubDate = new Array();
var mModule = new Array();
var mPdf = new Array();
var mZip = new Array();

var skipMoveEnd = false;
var AgeRecalculating = false;

var slider_lastclicked = null;

function setProjection(val) { //set new projection in session and restart app
    waitMsg();
    try {//reproject center to new projection
        xy = app.mapPanel.map.center.transform(new OpenLayers.Projection('EPSG:' + currentProjection), new OpenLayers.Projection('EPSG:' + val)).toShortString();
    } catch (e) { }
    //todo: also send current active layers
    Ext.Ajax.request({
        url: "handlers/setSetting.ashx?action=projection&projection=" + val + "&zoom=" + app.mapPanel.map.zoom + "&center=" + xy + "&age=" + age + "&layers=" + getActiveLayers().toString() + "&custom_cql_filters=" + getCustomCqlFilters().toString(),
        method: 'get',
        success: function (res) { location.href = 'index.aspx'; }
    });
}
function setMode(val) { //set new projection in session and restart app
    waitMsg();
    
    Ext.Ajax.request({
        url: "handlers/setSetting.ashx?action=mode&mode=" + val + "&zoom=" + app.mapPanel.map.zoom + "&center=" + app.mapPanel.map.center.toShortString() + "&age=" + age + "&layers=" + getActiveLayers().toString() + "&custom_cql_filters=" + getCustomCqlFilters().toString(),
        method: 'get',
        success: function (res) { location.href = 'index.aspx'; }
    });
}

function waitMsg() {
    new Ext.Window({html:"Please wait for the application to reload",padding:12,dialog:true,closable:false,width:400,height:100}).show();
}

function getActiveLayers () {
var lrs = [];
for (var l in app.mapPanel.map.layers) {
    try{
        if (app.mapPanel.map.layers[l].visibility) lrs.push(app.mapPanel.map.layers[l].name); //check: this is layer title!
    } catch(e){}
}
return lrs;
}


function getCustomCqlFilters() {
    var filters = [];

    for (var j = 0; j < layersWithCql.length; j++) {
        for (lc in currentLayers) {
            if ((layersWithCql[j] == currentLayers[lc].title) && (currentLayers[lc].custom_cql_filter)) {
                filters.push(currentLayers[lc].title + ":;:" + escape(currentLayers[lc].custom_cql_filter));
                break;
            }
        }
    }
     
    return filters;
}


// Set variables for current time sequence whenever slider is changed
function getSeqDetails(sliderAge, direction) {
    loadingPanel.show();
    //remove feature highlights and popups
    try {
        app.mapPanel.map.getLayersByName("highlightLayer")[0].removeAllFeatures();
    } catch (e) { }
    Ext.select("div.gx-popup").remove();

    AgeRecalculating = true;
    //when at end, stop at end
    //if (sliderAge < slider_lastvalue && direction == "current") { direction = "last"; }

    gde = curMode == "GDE" ? true : false;

    Ext.Ajax.request({
        url: "handlers/seqQuery.ashx?age=" + sliderAge + "&direction=" + direction + "&mode=" + gde + "&rnd=" + Math.random(),
        method: 'get',
        success: function (res) { parseRes(res, direction) }
    });
}
//function that parses result of getseqdetails
function parseRes(res,direction) {
        result = res.responseText;
        //var result = request.responseText;
        // note that results[0] are common values accross all regions
        // this will change value of sequence, age, period, bugzone etc..
        var results = result.split("~");
        eval(results[0]);//add .replace(",", ".")) if age is returned as 3,5 (european style)
        
        cqlSequence = sequence;
        // note that results[1] are different for each licensed region so use arrays
        // each regional map has different version and publishing dates
        var rows = results[1].split("@");
        var rowslen = rows.length - 1;
        // Empty arrays from last query then repopulate from results[1]
        mRegion.length = 0;
        mPubDate.length = 0;
        mPubVersion.length = 0;
        mModule.length = 0;
        mPdf.length = 0;
        mZip.length = 0;
        for (var x = 0; x <= rowslen; x++) {
            var parts = rows[x].split(";");
            mRegion[x] = parts[0];
            mPubVersion[x] = parts[1];
            mModule[x] = parts[2];
            mPubDate[x] = parts[3];
            mZip[x] = (parts[4] != undefined) ? parts[4].replace(/\\/g, "/") : "";
            mPdf[x] = (parts[5] != undefined) ? parts[5].replace(/\\/g, "/") : "";
        }
        showVariables();    // Display sequence, mode & publishing details in side panel html
        showCurrentMap(); //add age to box
        applyFilter();
        slider_value = age; 
        setSliderValue(age);
        AgeRecalculating = false;
    }

//this is triggered when openlayers baselayer fires onloadend
    function showDynLayers() {
        try {
            //set initial visibility on dynamic layers
            for (var j = 0; j < toActivateList.length; j++) {
                //if active, add to toActivateList and set incactive
                var ly = app.mapPanel.map.getLayersByName(toActivateList[j])[0];
                if (ly) {
                    ly.setVisibility(true);
                }
            }
        } catch (e) { }
    }

// In addition to changeMaps function, in Geodynamics mode the basemap will need to be changed
// *TO CHANGE - replace text & alert with requests to swap basemap WMS layers
function getPlateModel(sliderAge, direction) {
    var htmlStr = "";
    htmlStr = htmlStr + "<b>Load Plate Model for GDY Basemap</b> <br />";
    htmlStr = htmlStr + "Age = " + sliderAge + "<br />";
    htmlStr = htmlStr + "Direction = " + direction;
    alert(htmlStr);
}

// DISPLAY INFO FOR CURRENT SURFACE JUST FOR THIS DEMO
function showVariables() {
    var htmlStr = "";
    htmlStr = htmlStr + "<table cellspacing=0>";
    htmlStr = htmlStr + "<tr><th>Sequence Age</th><td>" + age + " MA </td></tr>";
    htmlStr = htmlStr + "<tr><th>Neftex Sequence</th><td>" + sequence + "</td></tr>";
    htmlStr = htmlStr + "<tr><th>Sequence Period</th><td>" + period + "</td></tr>";
    htmlStr = htmlStr + "<tr><th>Sequence Epoch</th><td>" + epoch + "</td></tr>";
    htmlStr = htmlStr + "<tr><th>Sequence Stage</th><td>" + stage + "</td></tr>";
    htmlStr = htmlStr + "<tr><th>Sequence Biozone</th><td>" + bugzone + "</td></tr>";
    htmlStr = htmlStr + "<tr><th>WMS</th><td><a href='" + wms_link + "' target=_blank title='From context menu, copy location, paste in WMS Client as Service-Url'>Link</a></td></tr>";
    htmlStr = htmlStr + "</table>";
    var len = mRegion.length - 1;
    htmlStr = htmlStr + "<br/><p><b>Product Information:</b> <br />";
    htmlStr = htmlStr + "<table cellspacing=0>";
    htmlStr = htmlStr + "<tr><th>Region</th><th>Date</th><th>Ver</th><th>ZIP</th><th>PDF</th>";
    for (var x = 0; x < len; x++) {
        htmlStr += "<tr><td>" + mRegion[x] + "</td><td>" + mPubDate[x] + "</td><td>" + mPubVersion[x] + "</td><td><a href='" + mZip[x] + "' target=_blank><img src=icons/zip.gif border=0></a></td><td><a href='" + mPdf[x] + "' target=_blank><img src=icons/pdf.gif border=0></a></td></tr>";
    }
    htmlStr = htmlStr + "</table>";
    Ext.getCmp('infoPanel').update(htmlStr);
}

/** CQL filter to selected layer in tree **/
var ASpecFilter = "";

/** Layer configuration related to selected layer in tree **/
var SelectedLayerConfig = null;

/**
 * Applies the CQL filters to layers on initialization
 *
 */
function applyFilter() {
    var cqlFilterBase = "seq = '" + sequence + "'";

    for (var j = 0; j < layersWithCql.length; j++) {
        // Check for related layer config
        for (lc in currentLayers) {
            if ((layersWithCql[j] == currentLayers[lc].title)) {

                var cqlFilter = cqlFilterBase;
                if (currentLayers[lc].custom_cql_filter) {
                    cqlFilter = cqlFilter + " and " + currentLayers[lc].custom_cql_filter;
                }

                var ly = app.mapPanel.map.getLayersByName(layersWithCql[j])[0];
                
                if (ly && ly.mergeNewParams) {
                    ly.mergeNewParams({ cql_filter: cqlFilter });
                }

                break;
            }
        }
    }
}

/**
 * Applies custom CQL filter to selected layer
 *
 */
function applyFilterLayer() {
    cqlFilter = "seq = '" + sequence + "'";
    if (ASpecFilter != "")
        cqlFilter += " and " + ASpecFilter;

    SelectedLayerConfig.custom_cql_filter = ASpecFilter;

    //todo: don't use name (=title) to get layerByName
    var selectedLayerName = app.selectedLayer.data.name;

    for (var j = 0; j < layersWithCql.length; j++) { //which layers to filter is defined in userconfig.ashx
        if (layersWithCql[j] == SelectedLayerConfig.title) {
            var ly = app.mapPanel.map.getLayersByName(layersWithCql[j])[0];
            if (ly && ly.mergeNewParams)
                ly.mergeNewParams({ cql_filter: cqlFilter });        
        }
    }
}

// Slider graphic = 11190px (in height) x 230px (width)
// 720px above & 720px below 650MA of time
// For 9750px timescale 1px = 15MA
//650 =  824lat -48.75
//325 =    0lat
//0   = -176lat 48.75

//called when map moved
function getSliderValue() {
    if (!AgeRecalculating) {//todo: weird bug that a second map-move is asked with strange params
        AgeRecalculating = true;
        //get center from map and convert to pix
        slider_lastvalue = slider_value;
        slider_value = 650 - ((timeslider.center.lat + 48.75) / 97.5 * 650);
        getSeqDetails(slider_value, "closest");
        
    }
}

function getLatFromAge(age){
    return ((-(age-650) / 650 * 97.5) - 48.75);
}

function setSliderValue(myVal) {
    AgeRecalculating = true;
    slider_value = myVal;
    timeslider.setCenter(new OpenLayers.LonLat(0, getLatFromAge(myVal))); //for slide use panTo, but it triggers getslidervalue too much, AgeRecalculating should be ended with a openlayers-moveend-event listener
    return true;
}

///////////////////////////////////////////
// FUNCTIONS FOR CONTROLS AT TOP OF SLIDER

function getPrevious() {
    AgeRecalculating = true;
    getSeqDetails(parseFloat(slider_value), "previous");
    setLastClicked(slider_value);
}

function getNext() {
    AgeRecalculating = true;
    getSeqDetails((parseFloat(slider_value) + 0.1), "next");
    setLastClicked(slider_value);
}

function setLastClicked(c) {
    slider_lastclicked = c;
}

function showCurrentMap() {
    Ext.getCmp('current_seq').setValue(age + " Ma (" + sequence + ")");
}



////////////////////////////////
// Slider text search functions

function findagde() {
    var userStr = "";
    userStr = userStr + document.getElementById('current_seq').value; // capture user input from text form
    // Check if user entered an integer
    if (isInteger(userStr) === true) {
        processText(userStr);
    }
    else {
        var splitDecimal = "";
        splitDecimal = userStr.split(".");
        var splitR = splitDecimal[1].substr(0, 2); // retrieve first 2 decimal place numbers
        var userVal = "";
        userVal = userVal + splitDecimal[0];
        userVal = userVal + "." + splitR; 	// Build up number to 1 decimal place
        processText(userVal);
    }
}

// Check that a valid number was searched for
function isInteger(val) {
    if (val == null) { return false; }
    if (val.length == 0) { return false; }
    for (var i = 0; i < val.length; i++) {
        var ch = val.charAt(i);
        if (i == 0 && ch == "-") { continue; }
        if (ch < "0" || ch > "9") { return false; }
    }
    return true;
}

// Change GDE Overlay [+ Plate Model basemap if GDY mode]
// .. only if search number is within valid timescale range
function processText(v) {
    if (v > 0 && v < 650) {
        getSeqDetails(v, "closest");
    }
    else { clearAgeBox(); }
}

// to clear the text search box on slider control
function clearAgeBox() {
    Ext.getCmp('current_seq').update("");
}

function closeDisclaimer() {
    Ext.getCmp('Disclaimer').close();
    Ext.Ajax.request({
        url: "handlers/setSetting.ashx?action=disclaimer&disclaimer=ok",
        method: 'get'
    });
}

//add highlight of identified object to map, called from feature-info render-event, configured in userconfig.ashx (from database))
function addHighlight(feature) {
    //add feature to map
    var vectors = app.mapPanel.map.getLayersByName("highlightLayer")[0];
    //reproject feature to mapProj (considering all overlays are in epsg:4326)
    if (app.mapPanel.map.baseLayer.projection.projCode != 'EPSG:4326') {
        var geom = feature.geometry.transform(new OpenLayers.Projection('EPSG:4326'), app.mapPanel.map.baseLayer.projection);
        feature = new OpenLayers.Feature.Vector(geom);
    }
    vectors.addFeatures([feature]);
}

//remove fields from feature_info response (called from feature-info render-event, configured in userconfig.ashx (from database))
function removeFields(feature,fields) {
    if (typeof(fields) != "undefined" && fields != "" && feature.attributes) {
        var fieldsarr = fields.split(",");
        var remFlds = [];//array to hold fields to remove from object
        for (var n in feature.attributes) {
            if (fieldsarr.indexOf(n) == -1) remFlds.push(n);
        }
        for (var m = 0; m < remFlds.length; m++) feature.attributes[remFlds[m]] = null;
    }
}