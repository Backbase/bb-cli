// Add your Javascript code.
${widget.namespace} = ${widget.namespace} || {};
${widget.namespace}.widgets = ${widget.namespace}.widgets || {};
${widget.namespace}.widgets['${widget.name}'] = {
    init: function (widgetInstance) {
        console.log(widgetInstance.name);
    }
};