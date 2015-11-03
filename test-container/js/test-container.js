/* global b$ */
(function () {
    "use strict";

    var Container = b$.bdom
                    .getNamespace('http://backbase.com/2013/portalView')
                    .getClass('container');
 
    Container.extend(function (bdomDocument, node) {
        Container.apply(this, arguments);
        this.isPossibleDragTarget = true;
    }, {
        localName: 'testTemplate',
        // the same as the viewNamespace property in the import XML for the container and in the soy template
        namespaceURI: 'Backbase'
    }, {
        template: function(json) {
            var data = {item: json.model.originalItem};
            var sTemplate = Backbase.testTemplate(data);
            return sTemplate;
        },

        handlers: {
            DOMReady: function(){

            },

            preferencesSaved: function(event){
                if(event.target === this) {
                    this.refreshHTML(function(item){
                        // console.log(item)
                    })
                }
            }
        }
    });
})();
