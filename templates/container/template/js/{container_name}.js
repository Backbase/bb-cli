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
        localName: '<%=template_name%>',
        // the same as the viewNamespace property in the import XML for the container and in the soy template
        namespaceURI: '<%=bundle_name%>'
    }, {
        template: function(json) {
            var data = {item: json.model.originalItem};
            var sTemplate = <%=bundle_name.replace(/[\.-]/gi, '_')%>.<%=template_name%>(data);
            return sTemplate;
        },

        handlers: {
            DOMReady: function(){

            },

            preferencesSaved: function(event){
                if(event.targeet === this) {
                    this.refreshHTML(function(item){
                        // console.log(item)
                    })
                }
            }
        }
    });
})();
