var Geo = require('geo-core');

/**
* Binary search to find the closest number to @num in an array
* @param arr - Array to search in
* @param num - Number to find the closest value to
* @return closest number to @num
*/
// Adopted from http://stackoverflow.com/questions/8584902/get-closest-number-out-of-array
function binaryClosest(arr, num) {
  var mid;
  var lo = 0;
  var hi = arr.length - 1;
  while (hi - lo > 1) {
    mid = Math.floor((lo + hi) / 2);
    if (arr[mid].distance < num) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (num - arr[lo].distance <= arr[hi].distance - num) ? lo : hi;
}

/**
* @param item - Object containing distance, lat, lon properties
* @return The expected structure of a managed geolocation item
*/
function _generateManagedItem(item) {
  if (!item.distance || !item.lat || !item.lon) {
    throw new Error('Incorrect item format provided');
  }

  return {
    distance: item.distance,
    data: [item]
  };
}

/**
* GeoManager was created to enable fast lookup of the closest data in a specific
* minimum distance. This is good for categorizing users into geo specific lists.
*
* @param options.lat - The pivot latitude to calculate point distance from
* @param options.lon - The pivot longitude to calculate point distance from
* @param options.minDistance - Minimum distance (miles) that a user must be less
*                              than or equal to from a pre-existing list to be
*                              placed in. Otherwise placed in their own list.
*/
function GeoManager(options) {
  // Expected format of managed
  // [
  //   {
  //     distance: 246,
  //     data: [
  //         {
  //           distance: 245,
  //           lat: 72.4,
  //           lon: 34.5,
  //           data: 'any type'
  //         }
  //         ...
  //     ]
  //   },
  //   ...
  // ]
  this.managed = [];

  // Defaults to New York City and 10 miles
  this.pivotLat = options.lat || 40.7127;
  this.pivotLon = options.lon || 74.0059;
  this.minDistance = options.minDistance || 10;
}

GeoManager.prototype = {
  /**
  * Attempts to find the specific list within the minimum distance to to add a
  * new geolocation + data to. If one is found, it adds it to that list.
  * Otherwise it creates its own new list
  * @param options
  * @param options.lat {required} - The latitude to find + add
  * @param options.lon {required} - The longitude to find + add
  * @param options.data - The data attached to this geolocation
  */
  add: function(options) {
    var lat = options.lat;
    var lon = options.lon;

    if (!lat || !lon) {
      throw new Error('Must include latitude and longitude in GeoManager add');
    }

    var distance = Geo.distanceCalculation(lat, lon, this.pivotLat, this.pivotLon);

    var item = {
      distance: distance,
      lat: lat,
      lon: lon
    };

    if (options.data) {
      item.data = options.data;
    }

    if (this.managed.length === 0) {
      this.managed.push(_generateManagedItem(item));
      return;
    }

    var closestEle = binaryClosest(this.managed, distance);
    var distanceDifference = Math.abs(this.managed[closestEle].distance - distance);
    var splicedIndex;

    // We check if the distance of the closest element that we found from the
    // pivot minus the actual distance to our pivot is less than or equal to
    // the minimum distance that an element can be. If it is, we put the new
    // data into this element's data array, otherwise we create a new element
    // at this distance.
    if (distanceDifference <= this.minDistance) {
      // This should never happen, but we handle this case anyway. For every
      // object we should have data with the original latitude and longitude
      if (!this.managed[closestEle].data) {
        this.managed[closestEle].data = item;
      } else {
        this.managed[closestEle].data.push(item);
      }
    } else if (distanceDifference < distance) {
      // Validate that the spliced index will not be beyond the length of the
      // managed geo locations. If it, push it to the end of the array
      splicedIndex = closestEle + 1;

      if (splicedIndex < this.managed.length) {
        this.managed.splice(splicedIndex, 0, _generateManagedItem(item));
      } else {
        this.managed.push(_generateManagedItem(item));
      }
    } else if (distanceDifference < distance) {
      // Validate that the spliced index will not be less than 0. If it is,
      // then we simply unshift to add it to the beginning of the managed geo
      // location array
      splicedIndex = closestEle - 1;

      if (splicedIndex < 0) {
        this.managed.unshift(_generateManagedItem(item));
      } else {
        this.managed.splice(splicedIndex, 0, _generateManagedItem(item));
      }
    }
  },

  /**
  * Delete a specific latitude and longitude from the manager
  * @param options
  * @param options.lat {required} - The latitude to find + delete
  * @param options.lon {required} - The longitude to find + delete
  * @param options.data - If this is included in the options object, the
  *                       geolocation will only be deleted if it includes this
  *                       data exactly even if it has the exact lat/lon
  */
  delete: function(options) {
    var lat = options.lat;
    var lon = options.lon;

    if (!lat || !lon) {
      throw new Error('Must include latitude and longitude in delete');
    }

    var data = options.data;

    var distance = Geo.distanceCalculation(lat, lon, this.pivotLat, this.pivotLon);
    var closestEle = binaryClosest(this.managed, distance);

    if (!this.managed[closestEle] || !this.managed[closestEle].data) {
      return;
    }

    for (var i = 0; i < this.managed[closestEle].data.length; i++) {
      if (this.managed[closestEle].data[i].lat === lat &&
        this.managed[closestEle].data[i].lon === lon) {
        if (data) {
          if (this.managed[closestEle].data[i].data === data) {
            this.managed[closestEle].data.splice(i, 1);
          }
        } else {
          this.managed[closestEle].data.splice(i, 1);
        }
      }
    }

    if (this.managed[closestEle].data.length <= 0) {
      this.managed.splice(closestEle, 1);
    }
  },

  /**
  * @param options
  * @param options.lat {required} - The latitude to find
  * @param options.lon {required} - The longitude to find
  * @param options.ignoreMin - If this property is included and true, this will
  *                            will return the closest data regardless if its
  *                            distance is outside of minDistance.
  * @return The list where the @lat, @lon is in within the minDistance. If none
  *         is found, null is returned.
  */
  findClosest: function(options) {
    var lat = options.lat;
    var lon = options.lon;

    if (!lat || !lon) {
      throw new Error('Must include latitude and longitude in delete');
    }

    var distance = Geo.distanceCalculation(lat, lon, this.pivotLat, this.pivotLon);
    var closestEle = binaryClosest(this.managed, distance);

    var distanceDifference = Math.abs(this.managed[closestEle].distance - distance);

    // If the ignoreMin flag is true, we validate that the element actually
    // exists (it should), and we return it. We ignore the minimum distance
    // that was set in the constructor
    if (options.ignoreMin === true) {
      return this.managed[closestEle] ? this.managed[closestEle] : null;
    }

    // If the ignoreMin flag was not set, we validate that the distance is less
    // than or equal to the minimum distance set in the constructor.
    return distanceDifference <= this.minDistance ? this.managed[closestEle] : null;
  },

  /**
  * @return The managed list of geolocations
  */
  getManagedList: function() {
    return this.managed;
  }
};

exports.create = function(options) {
  return new GeoManager(options);
};
