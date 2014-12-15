define(['angular'], function(angular){
	"use strict";

	angular.module('<%=widget_name%>', [])
		.controller('main', ['$scope', 'widget', function($scope, widget) {
			$scope.data = 'Hello from Angular';
			console.log(widget);
		}]);

	return function(widget) {
		angular.module('<%=widget_name%>').value('widget', widget);
		angular.bootstrap(widget.body, ['<%=widget_name%>'])
	}
})
