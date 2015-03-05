var app = angular.module("lv", ["firebase"]);
app.factory('lectureService', function($rootScope, $firebase){
	var lectureId = null;
	var setLectureId = function(){
		var time = new Date();
		var mins = (parseInt(time.getUTCMinutes()) % 16).toString(16);
		var hour = parseInt(time.getUTCHours()).toString(16);
		var day = parseInt(time.getDate()).toString(16);
		var month = parseInt(time.getMonth()).toString(16);
		var year = parseInt(time.getFullYear().toString().substr(2,2)).toString(16);
		id = year + "" + month + "" + day + "" + hour + "" + mins
		lectureId = id;
		var lectureRef = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + lectureId);
		var sync = $firebase(lectureRef);
		sync.$push({
			status: 1
		}).then(function(newChildRef){
			$rootScope.ref = lectureRef;
		});


	}
	var getLectureId = function(){
		return lectureId;
	}
	return{
		setLectureId: setLectureId,
		lectureId: getLectureId
	}
});
app.controller("lecture", function($scope, $firebase, lectureService){
	$scope.openLecture = function(){
		lectureService.setLectureId();
		$scope.leccode = lectureService.lectureId();
	}
})
app.controller("hashtags", function($scope, $firebase){
	$scope.ref = new Firebase("https://interactive-lecture.firebaseio.com/Test/hashtags");
	var sync = $firebase($scope.ref);
	$scope.hashtags = sync.$asArray();
	$scope.alert = function(message){
		alert(message);
	}
});
app.controller("questions", function($rootScope, $scope, $firebase){
	// $scope.ref = new Firebase("https://interactive-lecture.firebaseio.com/Test/Questions");
	// $scope.sync = $firebase($scope.ref);
	//$scope.sync = $firebase($rootScope.ref.child('Questions'));
	$scope.send = function(type){
		var sync = $firebase($rootScope.ref.child('Questions'));
		console.log("Working");
		sync.$push({
			type: type,
			time: Date.now()
		})
	}
});

app.directive("ticker", function(){
	return{
		templateUrl: "assets/ang-templates/ticker.html",
		restrict: "E"
	}
});
	