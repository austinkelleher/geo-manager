/**
* Using .exist as a property instead of a function makes jshint unhappy!
*/
/*jshint -W030 */
var chai = require('chai');
chai.config.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

describe('GeoManager', function() {

  describe('Add', function() {
    var GeoManager;

    beforeEach(function() {
      GeoManager = require('../index').create({
        lat: 35.73265,
        lon: -78.85029,
        minDistance: 50
      });
    });

    it('should allow adding to the managed list', function() {
      var item = {
        lat: 35.73,
        lon: -78.85,
        data: 'Austin'
      };

      GeoManager.add(item);

      var managed = GeoManager.getManagedList();

      var expectedDistance = 0.1838296891494826;

      expect(managed.length).to.equal(1);
      expect(managed[0].distance).to.equal(expectedDistance);
      expect(managed[0].data.length).to.equal(1);

      expect(managed[0].data[0].distance).to.equal(expectedDistance);
      expect(managed[0].data[0].lat).to.equal(item.lat);
      expect(managed[0].data[0].lon).to.equal(item.lon);
      expect(managed[0].data[0].data).to.equal(item.data);
    });
  });

  describe('Find Closest', function() {
    var GeoManager;
    var addedItem = {
      lat: 35.73,
      lon: -78.85,
      data: 'Austin'
    };

    beforeEach(function() {
      GeoManager = require('../index').create({
        lat: 35.73265,
        lon: -78.85029,
        minDistance: 50
      });

      GeoManager.add(addedItem);
    });

    it('should find closest managed geo locations', function() {
      var closest = GeoManager.findClosest({
        lat: 35.7,
        lon: -78.8
      });

      expect(closest.distance).to.equal(0.1838296891494826);
      expect(closest.data[0].lat).to.equal(addedItem.lat);
      expect(closest.data[0].lon).to.equal(addedItem.lon);
      expect(closest.data[0].data).to.equal(addedItem.data);
    });

    it('should find closest managed geo locations when different distance lists exist', function() {
      GeoManager.add({
        lat: 42.1,
        lon: 97.6
      });

      var closest = GeoManager.findClosest({
        lat: 35.7,
        lon: -78.8
      });

      expect(closest.distance).to.equal(0.1838296891494826);
      expect(closest.data.length).to.equal(1);
      expect(closest.data[0].lat).to.equal(addedItem.lat);
      expect(closest.data[0].lon).to.equal(addedItem.lon);
      expect(closest.data[0].data).to.equal(addedItem.data);
    });

    it('should find closest not in range if ignoreMin flag included', function() {
      var closest = GeoManager.findClosest({
        lat: 23.2,
        lon: 70.4
      });

      expect(closest).to.equal(null);
    });

    it('should find closest not in range if ignoreMin flag included', function() {
      var closest = GeoManager.findClosest({
        lat: 23.2,
        lon: 70.4,
        ignoreMin: true
      });

      expect(closest).to.exist;
    });
  });

  describe('Delete', function() {
    var GeoManager;
    var addedItem = {
      lat: 35.73,
      lon: -78.85,
      data: 'Austin'
    };

    beforeEach(function() {
      GeoManager = require('../index').create({
        lat: 35.73265,
        lon: -78.85029,
        minDistance: 50
      });

      GeoManager.add(addedItem);
    });

    it('should allow deletion of existing geo location', function() {
      var managed = GeoManager.getManagedList();

      expect(managed.length).to.equal(1);

      GeoManager.delete({
        lat: addedItem.lat,
        lon: addedItem.lon
      });

      managed = GeoManager.getManagedList();
      expect(managed.length).to.equal(0);
    });

    it('should allow deletion of existing geo location when multiple in same list', function() {
      var managed = GeoManager.getManagedList();

      expect(managed.length).to.equal(1);

      var secondItem = {
        lat: 35.7,
        lon: -78.8,
        data: 'Test'
      };

      GeoManager.add(secondItem);

      managed = GeoManager.getManagedList();

      expect(managed[0].data.length).to.equal(2);

      GeoManager.delete({
        lat: addedItem.lat,
        lon: addedItem.lon
      });

      managed = GeoManager.getManagedList();
      expect(managed.length).to.equal(1);

      expect(managed[0].data[0].lat).to.equal(secondItem.lat);
      expect(managed[0].data[0].lon).to.equal(secondItem.lon);
      expect(managed[0].data[0].data).to.equal(secondItem.data);
    });

    it('should not delete any not within range', function() {
      var managed = GeoManager.getManagedList();

      expect(managed.length).to.equal(1);

      GeoManager.delete({
        lat: 23.2,
        lon: 70.4
      });

      managed = GeoManager.getManagedList();
      expect(managed.length).to.equal(1);
    });

    it('should not delete items with same lat/lon but different data', function() {
      GeoManager.delete({
        lat: addedItem.lat,
        lon: addedItem.lon,
        data: 'random data!'
      });

      var managed = GeoManager.getManagedList();
      expect(managed.length).to.equal(1);
    });

    it('should only delete the item with exact data if data specified in delete', function() {
      var secondItem = {
        lat: addedItem.lat,
        lon: addedItem.lon,
        data: 'Test'
      };

      GeoManager.add(secondItem);

      GeoManager.delete({
        lat: addedItem.lat,
        lon: addedItem.lon,
        data: 'Test'
      });

      var managed = GeoManager.getManagedList();
      expect(managed[0].data[0].data).to.equal(addedItem.data);
    });
  });
});
