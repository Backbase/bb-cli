/*----------------------------------------------------------------*/
/* Webpack main entry point
/*----------------------------------------------------------------
 * look for every <filename>.spec.js or <filename>.Spec.js
 * in 'unit/' and '../../src/'  folder
 * except 3rd party vendors like bower_components or node_modules
 */

var mock = require('mock');
window.gadgets = mock.gadgets;
window.b$ = { portal: mock.Portal() };

var testsContext = [
    require.context('./', true, /^((?![\\/]node_modules|bower_components[\\/]).)*\.[Ss]pec$/),
    require.context('../../src/', true, /^((?![\\/]node_modules|bower_components[\\/]).)*\.[Ss]pec$/)
];

testsContext.forEach(function(context) {
    context.keys().forEach(context);
});
