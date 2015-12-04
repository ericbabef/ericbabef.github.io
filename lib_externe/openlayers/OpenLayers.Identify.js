/* Copyright (c) 2006-2007 MetaCarta, Inc., published under the Clear BSD
 * license.  See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */

/**
 * @requires OpenLayers/Control.js
 * @requires OpenLayers/Handler/Click.js
 *
 * Class: OpenLayers.Control.Identify
 *
 * Inherits from:
 *  - <OpenLayers.Control>
 */
OpenLayers.Control.Identify = OpenLayers.Class(OpenLayers.Control, {
    /**
     * Property: type
     * {OpenLayers.Control.TYPE}
     */
    type: OpenLayers.Control.TYPE_TOOL,
    
    /**
     * Constructor: OpenLayers.Control.Identify 
     * Fires a user defined function with the mouse position
     *
     * Parameters:
     * options - {userFunction} An optional object whose properties will be used
     *     to extend the control.
     */
    initialize: function(userFunction, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        this.userFunc = userFunction;
    },

    
    /**
     * Method: draw
     */    
    draw: function() {
        this.handler = new OpenLayers.Handler.Click( this, 
                             {"click": this.identify}, {keyMask: this.keyMask} );
    },

    /**
     * Method: identify
     * Placeholder for user defined identify function
     *
     * Parameters:
     * evt - {Click Event}
     *
     */
    identify: function (evt) {
        var position = evt.xy;
        this.userFunc(position);
    },
    
    CLASS_NAME: "OpenLayers.Control.Identify"
});