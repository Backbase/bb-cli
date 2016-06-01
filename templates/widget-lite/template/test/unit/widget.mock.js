/**
* ------------------------------------------------------------------------
* Widget Class Mock
* ------------------------------------------------------------------------
*/
var Widget = module.exports = function Widget () {

};

Widget.prototype.getPreference = function(name) {
    switch (name) {
        case 'some-pref': return 'some-value'; break;
    }
}
Widget.prototype.setPreference = function() {}
