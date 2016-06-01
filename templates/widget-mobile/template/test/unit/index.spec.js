'use strict';

require('angular');
require('angular-mocks');

var Widget = require('./widget.mock'); // mock the b$ widget class
var App = require('../../src/scripts/index'); // main file

var ngModule = window.module; // alias
var ngInject = window.inject; // alias


describe('${widget.name}', function() {
    beforeEach(function() {
        this.app = App(new Widget()).bootstrap();
        ngModule(this.app.module.name);
        ngInject(function($controller,  $rootScope) {
            var scope = $rootScope.$new();
            this.createController = function(ctrlName) {
                return $controller(ctrlName, {scope : scope});
            };
        })
    });

    it('should be defined', function() {
        expect(this.app).toBeDefined();
    });

    it('should contain some-preference', function() {
        expect(this.app.widget.getPreference('some-pref')).toBe('some-value');
    });
    describe('Main Controller', function() {
        beforeEach(function() {
            this.mainCtrl = this.createController('MainCtrl');
        })
        it('should have a main controller', function() {
            expect(this.mainCtrl).toBeObject();
        });
    });

    describe('Error Controller', function() {
        beforeEach(function() {
            this.errorCtrl = this.createController('ErrorCtrl');
        })
        it('should have an error controller', function() {
            expect(this.errorCtrl).toBeObject();
        });
    });

});
