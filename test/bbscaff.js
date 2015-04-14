var bbscaff = Object.create(require('../lib/bbscaff'));
var should = require('should');

describe('bbscaff', function(){

    describe('getCurrentBundle()', function(){
        before(function(){
            global.process.cwd = function(){
                return '/myBundle/widgets';
            };
        });

        it('should return the current bundle', function(){
            bbscaff.getCurrentBundle().should.be.equal('myBundle');
        });
    });

    describe('toCamelCase()', function(){
        it('should return a string in CamelCase', function(){
            bbscaff.toCamelCase('my-string with_spaces').should.be.equal('myStringWithSpaces');
        });
    });

    describe('getPRefix()', function(){
        it('should return the prefix of a string', function(){
            bbscaff.getPrefix('my-string with_spaces').should.be.equal('msws');
        });
    });
});
