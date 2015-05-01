// application data model
var AppData = function () {
    'use strict';
    var self = this;
    self.places = ko.observableArray([]); // places will hold markers objects
    self.keyword = ko.observable(); // search keyword value
    self.mapElem = null; // map container
    self.mapCoord = {centerLat : ko.observable(), centerLon : ko.observable()}; // initial map coordinates populated from DOM attributes
    self.showDetail = function () {
        google.maps.event.trigger(this, 'click', true);
        // hide menu on click on small screen
        var winWidth = $(window).width();
        if (winWidth < 768) {
            $("#wrapper").removeClass("toggled");
        }
    }; // marker popup function
};

// application controller
var Places = function () {
        // initial vars
        'use strict';
        var self = this;
        // initialize map
        self.init = function () {
            self.defLoc = new google.maps.LatLng(appData.mapCoord.centerLat(),  appData.mapCoord.centerLon());
            // default map options
            var mapOptions = {
                    zoom: 12,
                    center: self.defLoc,
                    // hiding default google point of interests
                    styles: [{
                        featureType : "poi",
                        elementType : "labels",
                        stylers : [{
                            visibility : "off"
                        }]
                    }]
                };
            // create map object
            self.map = new google.maps.Map(appData.mapElem, mapOptions);
            // call loadPlaces function
            self.loadPlaces();
        };
        
        // load places from google nearbysearch api
        self.loadPlaces = function () {
            // google nearbySearch service settings 
            var request = {
                    location: self.defLoc,
                    radius: 10000,
                    name : 'park'
                },
                service = new google.maps.places.PlacesService(self.map);
            
            service.nearbySearch(request, callback); // service call
            
            // callback function on successfull return
            function callback(results, status) {
                // check status OK
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    // iterate throuh returned places and call createMarker() function
                    var i = 0;
                    for (i; i < results.length; i += 1) {
                        self.createMarker(results[i]);
                    }
                    
                } else {
                    alert("There was a problem connecting to Google Places service!");
                
                }
            }
        
        };
      
        // search  
        appData.keyword.subscribe(function (newValue) {
            self.hideAllInfoWindows();
             // iterate through places and find matches
            var i = 0;
            for (i; i < appData.places().length; i += 1) {
                if (appData.places()[i].name.toLowerCase().indexOf(newValue.toLowerCase()) > -1) {
                    // show list items and infoWindow
                    appData.places()[i].display(true);
                    appData.places()[i].setVisible(true);
                } else {
                    // hide list items and infoWindow
                    appData.places()[i].display(false);
                    appData.places()[i].setVisible(false);
                }
                   
            }
        });
        
        // hides all infowindows and resets marker icons
        self.hideAllInfoWindows = function () {
            var i = 0;
            for (i; i < appData.places().length; i += 1) {
                appData.places()[i].infowindow.close();
            }
        
        };
        
        // create markers function. called once when setting up initial places retuned from google
        this.createMarker = function (place) {
            // define location object
            var placeLoc = place.geometry.location,
            // define infoWindow object
                infowindow = new google.maps.InfoWindow(),
                // define marker
                marker = new google.maps.Marker({
                    map: self.map,
                    icon: 'http://maps.google.com/mapfiles/kml/pal2/icon4.png',
                    position: placeLoc
                });
            // append additional values to marker object
            marker.setValues({  name : place.name,
                                id : place.id,
                                address : place.vicinity,
                                display : ko.observable(true), //setting display as observable to filter list
                                infowindow : infowindow
                             });
            
            // populate places observable array with new marker
            appData.places.push(marker);
            
            // add marker click listener
            google.maps.event.addListener(marker, 'click', function () {
                // get window height
                var wHeight =  $(window).height();
            
                    
                // hide all infowin on the map
                self.hideAllInfoWindows();
                // change marker icon to active
                // bring marker on top
                marker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
               
                
                // offset infowindow if browser window hight is smaller than 740
                if (wHeight < 740) {
                    // get stale value based on current zoom level
                    var scale = Math.pow(2, self.map.getZoom()),
                        //map projection obj
                        projection = self.map.getProjection(),
                        // cur pixel position of marker
                        pixPosition = projection.fromLatLngToPoint(marker.position),
                        // new position obj 
                        newPos = new google.maps.Point(
                            pixPosition.x,
                            pixPosition.y - (wHeight * 0.35 / scale)
                        ),
                         // new offset location
                        newLoc = projection.fromPointToLatLng(newPos);
                        // center map in selected point
                    self.map.setCenter(newLoc);
                   
                } else {
                    // center map in selected point
                    self.map.setCenter(placeLoc);
                }
                
                          
                // populate and open infowindow
                // this is where additional APIs will be called
                infowindow.setContent('loading...');
                infowindow.open(self.map, this);
                // load flickr content
                self.loadFlickr(placeLoc.lat(), placeLoc.lng(), marker);
            });
            
            // add infowindow close instener
            google.maps.event.addListener(infowindow, 'closeclick', function () {
                self.hideAllInfoWindows();
            });
        };
        
        self.loadFlickr = function (lt, lg, marker) {
                // flickr arguments   
            var FLICKR_API_KEY = '3952dd1df4c91bafb5e073bc5166801c',
                marker = marker,
                searchUrl = "https://api.flickr.com/services/rest/?method=flickr.photos.search",
                searchReqParams = {
                    'api_key': FLICKR_API_KEY,
                    'has_geo': true,
                    'lat': lt,
                    'lon': lg,
                    'radius': 2,
                    'format': 'json',
                    'tags' : 'park, trees, birds',
                    'nojsoncallback' : 1,
                    'per_page': 5
                };
                 
                // ajax request
            $.ajax({
                type: 'GET',
                url : searchUrl,
                cache : false,
                crossDomain : true,
                data: searchReqParams,
                success: function (data) {
                    if (data.photos.photo.length > 0) {
                        var images = '',
                            i = 0;
                        for (i; i < data.photos.photo.length; i += 1) {
                            images += '<a href="https://farm' + data.photos.photo[i].farm + '.staticflickr.com/';
                            images += data.photos.photo[i].server + '/' + data.photos.photo[i].id + '_';
                            images += data.photos.photo[i].secret + '.jpg" target="_blank"><img src="https://farm' + data.photos.photo[i].farm + '.staticflickr.com/';
                            images += data.photos.photo[i].server + '/' + data.photos.photo[i].id + '_';
                            images += data.photos.photo[i].secret + '_s.jpg"></a>';
                        }
                            
                        marker.infowindow.setContent(marker.name + '<br>' + marker.address + '<hr>' + images);
                           
                    } else {
                        marker.infowindow.setContent(marker.name + '<br>' + marker.address + '<hr>(no photos found for this location)');
                
                    }
                }
            }) // failed request
                .fail(function (jqXHR, textStatus, errorThrown) {
                    marker.infowindow.setContent(marker.name + '<br>' + marker.address + '<hr>(Flickr service is unavailable!)');
                    //console.log('req failed');
                    //console.log('textStatus: ', textStatus, ' code: ', jqXHR.status);
                });
        };
    };



// instantiate objects
var appData = new AppData();
var places = new Places();


// custom binding to get default google coordinates and DOM element
ko.bindingHandlers.googlemap = {
    init: function (element, valueAccessor) {
        'use strict';
        var value = valueAccessor();
        appData.mapCoord.centerLat(value.centerLat);
        appData.mapCoord.centerLon(value.centerLon);
        appData.mapElem = element;
        // if attrubutes set correctly init Places
        if (value) {
            places.init();
        }
    }
};

// initiate data bindings
ko.applyBindings(appData);

// toggle menu button script
$("#menu-toggle").click(function (e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});