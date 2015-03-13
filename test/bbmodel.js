var bbmodel = require('../lib/bbmodel');
var should = require('should');

var xml2js = require('xml2js');
var parseString = xml2js.parseString;
var fs = require('fs');

describe('bbmodel', function(){
    describe('parseWidget()', function(){

        var str_widget = fs.readFileSync(__dirname + '/content/widget.xml').toString();

        it('should be able to get a widget', function(){
            str_widget.should.startWith('<widget>');
        });

        it('should be able to parse the widget xml to a js object', function(done){
            parseString(str_widget, function(err, obj){
                should.not.exist(err);
                should.exist(obj);
                done();
            });
        });

        it('should return the parsed widget without unecessary data', function(done){
            parseString(str_widget, function(err, obj){
                var parsedWidget = bbmodel.parseWidget(obj.widget);
                parsedWidget.should.be.an.Object;
                parsedWidget.should.have.properties(['name', 'contextItemName']);
                parsedWidget.should.not.have.properties(['lastModifiedTimestamp']);
                done();
            });
        });
    });
});

