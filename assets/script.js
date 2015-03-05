var app = angular.module("lv", ["firebase"]);
app.controller("hashtags", function($scope, $firebase) {
	$scope.ref = new Firebase("https://interactive-lecture.firebaseio.com/Test/hashtags");
	var sync = $firebase($scope.ref);
	$scope.hashtags = sync.$asArray();
	$scope.alert = function(message){
		alert(message);
	}
});
app.controller("questions", function($scope, $firebase){
	$scope.ref = new Firebase("https://interactive-lecture.firebaseio.com/Test/Questions");
	$scope.sync = $firebase($scope.ref);
	$scope.send = function(type){
		console.log("Working");
		$scope.sync.$push({
			type: type
		})
	}
});
app.directive("ticker", function(){
	return{
		templateUrl: "assets/ang-templates/ticker.html",
		restrict: "E"
	}
});
	