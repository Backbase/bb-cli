/*----------------------------------------------------------------*/
/* Webpack main entry point
/*----------------------------------------------------------------*/
var testsContext = require.context('./', true, /^\.\/.*\.spec$/);
testsContext.keys().forEach(testsContext);

var testsContext = require.context('../../scripts/', true, /^\.\/.*\.spec$/);
testsContext.keys().forEach(testsContext);
