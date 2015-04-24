var app = angular.module("lv", ["firebase"]);
app.factory('lectureService', function($rootScope, $firebase){
	lectureId = null;
	var setLectureId = function(callBack){
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
		var childRef;
		sync.$set({
			status: 1
		}).then(function(newChildRef){
			$rootScope.ref = lectureRef;
			clients = lectureRef.child('users')
			callBack();
		});


	}
	var getClients = function(){
		return clients;
	}
	var getLectureId = function(){
		return lectureId;
	}
	return{
		setLectureId: setLectureId,
		lectureId: getLectureId,
		getClients: getClients
	}
});
app.controller("lecture", function($rootScope, $scope, $firebase, lectureService){
	$scope.connections = 0;
	$scope.openLecture = function(){
		lectureService.setLectureId(function(){
			$scope.leccode = lectureService.lectureId();
			$scope.clients = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + $scope.leccode + "/users");
			
			$scope.clients.on('child_added', function(){
				$scope.connections++;
				$rootScope.$apply();
			});
			$scope.clients.on('child_removed', function(){
				$scope.connections--;
				$rootScope.$apply();
			});

			startSliderBar($scope.leccode);

		});
		
		

	}
	
	
	$scope.isUndefined = function (thing) {
	    return (typeof thing === "undefined");
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
		});
		
		var marker = $("<i class=\"big marker icon\"></i>").appendTo("#markers");
		moveMarkerToCurrentTime(marker);
	}
});

/*app.directive("ticker", function(){
	return{
		templateUrl: "assets/ang-templates/ticker.html",
		restrict: "E"
	}
});*/
	