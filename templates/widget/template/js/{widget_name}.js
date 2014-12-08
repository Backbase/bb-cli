define(['angular'], function(angular){
	"use strict";

	angular
		.module('<%=widget_name%>', [])
		.controller('main', ['$scope', 'Widget', function($scope, Widget) {
			$scope.data = 'Hello from Angular';
			console.log(widget);
		}]);

	return function(widget) {
		angular
			.module('<%=widget_name%>')
			.value('Widget', widget);

		angular.bootstrap(widget.body, ['<%=widget_name%>'])
	}
})
