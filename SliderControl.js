Array.prototype.keySort = function(key, desc){ // Sort time info
  
  this.sort(function(a, b) {
    var result = desc ? (parseInt(a[key].time) < parseInt(b[key].time)) : (parseInt(a[key].time) > parseInt(b[key].time));
    return result ? 1 : -1;
  });
  return this;
}

L.Control.SliderControl = L.Control.extend({
    options: {
        position: 'topright',
        layers: null,
        timeAttribute: 'time',
        isEpoch: false,     // whether the time attribute is seconds elapsed from epoch
        startTimeIdx: 0,    // where to start looking for a timestring
        timeStrLength: 21,  // the size of  yyyy-mm-dd hh:mm:ss - if millis are present this will be larger
        maxValue: -1,
        minValue: 0,
        showAllOnStart: false,
        markers: null,
        range: false,
        follow: false,
        alwaysShowDate : false,
        rezoom: null
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this._layer = this.options.layer;

    },

    extractTimestamp: function(time, options) {
        if (options.isEpoch) {
            time = (new Date(parseInt(time))).toLocaleString(); // this is local time
        }
        return time.substr(options.startTimeIdx, options.startTimeIdx + options.timeStrLength);
    },

    setPosition: function (position) {
        var map = this._map;

        if (map) {
            map.removeControl(this);
        }

        this.options.position = position;

        if (map) {
            map.addControl(this);
        }
        this.startSlider();
        return this;
    },

    onAdd: function (map) {
        this.options.map = map;

        // Create a control sliderContainer with a jquery ui slider
        var sliderContainer = L.DomUtil.create('div', 'slider', this._container);
        $(sliderContainer).append('<div id="leaflet-slider" style="width:200px"><div class="ui-slider-handle"></div><div id="slider-timestamp" style="width:200px; margin-top:13px; background-color:#FFFFFF; text-align:center; border-radius:5px;"></div></div>');
        //Prevent map panning/zooming while using the slider
        $(sliderContainer).mousedown(function () {
            map.dragging.disable();
        });
        $(document).mouseup(function () {
            map.dragging.enable();
            //Hide the slider timestamp if not range and option alwaysShowDate is set on false
            if (!options.range || !options.alwaysShowDate) {
                $('#slider-timestamp').html('');
            }
        });

        var options = this.options;
        this.options.markers = [];

        //If a layer has been provided: calculate the min and max values for the slider
        if (this._layer) {
            var index_temp = 0;
            this._layer.eachLayer(function (layer) {
		layer.eachLayer(function (layer2) { //Maybe we should check if there are more layers?		  
		   options.markers[index_temp]=layer2;
		   ++index_temp;		  
		});
		if(options in layer) { //ajouté par fred 24/02/2017 pour les erreurs
		  options.markers[index_temp] = layer;		  
		  ++index_temp;
		}
            });
	    
	    options.markers.keySort('options',false); //sort markers in chronological order
            options.maxValue = index_temp - 1;
            this.options = options;
        } else {
            console.log("Error: You have to specify a layer via new SliderControl({layer: your_layer});");
        }
        return sliderContainer;
    },

    onRemove: function (map) {
        //Delete all markers which where added via the slider and remove the slider div
        for (i = this.options.minValue; i < this.options.maxValue; i++) {
            map.removeLayer(this.options.markers[i]);
        }
        $('#leaflet-slider').remove();
    },

    startSlider: function () {
        _options = this.options;
        _extractTimestamp = this.extractTimestamp
        var index_start = _options.minValue;
        if(_options.showAllOnStart){
            index_start = _options.maxValue;
            if(_options.range) _options.values = [_options.minValue,_options.maxValue];
            else _options.value = _options.maxValue;
        }
        this.options.oldminpos=_options.minValue; //saving displayed min-max range
	this.options.oldmaxpos=index_start;
	this.options.fg = L.featureGroup();
        $("#leaflet-slider").slider({
            range: _options.range,
            value: _options.value,
            values: _options.values,
            min: _options.minValue,
            max: _options.maxValue,
            step: 1,
            slide: function (e, ui) {
                var map = _options.map;
                //var fg = L.featureGroup();
		var fg = _options.fg;
                if(!!_options.markers[ui.value]) {
                    // If there is no time property, this line has to be removed (or exchanged with a different property)
                    if(_options.markers[ui.value].feature !== undefined) {
                        if(_options.markers[ui.value].feature.properties[_options.timeAttribute]){
			//Would be better to localize this part and/or add a .css file for personalisation
			   if(_options.markers[ui.value]) $('#slider-timestamp').html("Fr: "+
                                _extractTimestamp(_options.markers[ui.values[0]].feature.properties[_options.timeAttribute], _options)+
										     "<br>To: "+
				_extractTimestamp(_options.markers[ui.values[1]].feature.properties[_options.timeAttribute], _options));
                        }else {
                            console.error("Time property "+ _options.timeAttribute +" not found in data");
                        }
                    }else {
                        // set by leaflet Vector Layers
                        if(_options.markers [ui.value].options[_options.timeAttribute]){
                            if(_options.markers[ui.value]) $('#slider-timestamp').html(
                                _extractTimestamp(_options.markers[ui.value].options[_options.timeAttribute], _options));
                        }else {
                            console.error("Time property "+ _options.timeAttribute +" not found in data");
                        }
                    }
                    //console.log(ui.values);
                    var i;
                    if(_options.range){
                        // jquery ui using range
			// Only add or delete selected markers
                        if(ui.values[0]>_options.oldminpos) { // Delete markers
			  for (i = _options.oldminpos; i <= ui.values[0]; i++) {
			    if(_options.markers[i]) {
			      map.removeLayer(_options.markers[i]);
			      fg.removeLayer(_options.markers[i]);
			    }
			  }
			  _options.oldminpos=ui.values[0];
			}
			
			if(ui.values[0]<_options.oldminpos) { // add missing markers
			  for (i=ui.values[0]; i<=_options.oldminpos; i++) {
			    if(_options.markers[i]) {
                               map.addLayer(_options.markers[i]);
                               fg.addLayer(_options.markers[i]);
                            }
			  }
			  _options.oldminpos=ui.values[0];
			}
			
			if(ui.values[1]>_options.oldmaxpos) { // add missing markers
			  for(i=_options.oldmaxpos;i<=ui.values[1];i++) {
			    if(_options.markers[i]) {
                               map.addLayer(_options.markers[i]);
                               fg.addLayer(_options.markers[i]);
                            }
			  }			
			  _options.oldmaxpos=ui.values[1];
			}
			
			if(ui.values[1]<_options.oldmaxpos) { // Delete markers
			  for(i=ui.values[1];i<=_options.oldmaxpos;i++) {
			    if(_options.markers[i]) {
			      map.removeLayer(_options.markers[i]);
			      fg.removeLayer(_options.markers[i]);
			    }
			  }
			  _options.oldmaxpos=ui.values[1];
			}
			
                    }else if(_options.follow){
			// clear markers. We could probably optimize this!
			for (i = _options.minValue; i <= _options.maxValue; i++) {
			  if(_options.markers[i]) map.removeLayer(_options.markers[i]);
			}
			
                        for (i = ui.value - _options.follow + 1; i <= ui.value ; i++) {
                            if(_options.markers[i]) {
                                map.addLayer(_options.markers[i]);
                                fg.addLayer(_options.markers[i]);
                            }
                        }
                    }else{
			// clear markers. We could probably optimize this!
			for (i = _options.minValue; i <= _options.maxValue; i++) {
			  if(_options.markers[i]) map.removeLayer(_options.markers[i]);
			}
                        for (i = _options.minValue; i <= ui.value ; i++) {
                            if(_options.markers[i]) {
                                map.addLayer(_options.markers[i]);
                                fg.addLayer(_options.markers[i]);
                            }
                        }
                    }
                };
                if(_options.rezoom) {
                    map.fitBounds(fg.getBounds(), {
                        maxZoom: _options.rezoom
                    });
                }
            }
        });
        if (!_options.range && _options.alwaysShowDate) {
            $('#slider-timestamp').html(_extractTimeStamp(_options.markers[index_start].feature.properties[_options.timeAttribute], _options));
        }
        if(_options.range) { // Should localize and/or add .css file for this...
	  $('#slider-timestamp').html("Fr: "+
                                _extractTimestamp(_options.markers[_options.minValue].feature.properties[_options.timeAttribute], _options)+
										     "<br>To: "+
				_extractTimestamp(_options.markers[_options.maxValue].feature.properties[_options.timeAttribute], _options));
	}
        
        for (i = _options.minValue; i <= index_start; i++) {
            _options.map.addLayer(_options.markers[i]);
	    _options.fg.addLayer(_options.markers[i]);
        }
    }
});

L.control.sliderControl = function (options) {
    return new L.Control.SliderControl(options);
};
