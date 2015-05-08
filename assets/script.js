/**
 * @file Controls the logic for question asking, connection handling, lecture ID generation and handling of opening lectures.
 * @author James Jackson <eeu203@bangor.ac.uk>
 * @author Benjamin Williams <eeu222@bangor.ac.uk>
 * @author Liam Chapman <eeu239@bangor.ac.uk>
*/

//Create an app for angular
var app = angular.module("lv", ["firebase"]);

/**
 * Set the lecture id using a hash 
 * 
 * @param {object} $rootScope - Angular scope object.
 * @param {object} $firebase - Connection to firebase to use
*/
app.factory('lectureService', function($rootScope, $firebase)
{
	//The global lecture id (to be used between scripts)
	lectureId = null;

	/**
	 * Generates and sets the current lecture id.
	 *
	 * @param {function} callBack - The callback to run when finished.
	 */
	var setLectureId = function(callBack)
	{
		//Use timestamp to build the id, and set lectureId to this
		var time = new Date();
		var mins = (parseInt(time.getUTCMinutes()) % 16).toString(16);
		var hour = parseInt(time.getUTCHours()).toString(16);
		var day = parseInt(time.getDate()).toString(16);
		var month = parseInt(time.getMonth()).toString(16);
		var year = parseInt(time.getFullYear().toString().substr(2,2)).toString(16);
		id = year + "" + month + "" + day + "" + hour + "" + mins
		lectureId = id;

		//Reference to the current lecture branch
		var lectureRef = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + lectureId);

		//Synchronize an object from firebase for the lecture
		var sync = $firebase(lectureRef);
		var childRef;
		
		sync.$set({
			//Status 1 represents an open lecture
			status: 1 
		}).then(function(newChildRef)
		{
			//Set up the reference, sync the current users and call the callback.
			$rootScope.ref = lectureRef;
			clients = lectureRef.child('users') 
			callBack();
		});
	}
	
	/**
	 * Gets the currently connected clients.
	 */
	var getClients = function()
	{
		return clients;
	}
	
	/**
	 * Gets the current lecture id.
	 */
	var getLectureId = function()
	{
		return lectureId;
	}
	
	return {
		//Return each function as a property of an object.
		setLectureId: setLectureId,
		lectureId: getLectureId,
		getClients: getClients
	}
});

/**
 * The controller for the lecture functionality - handles managing of the connection count.
 *
 * @param {function} anonymous - The callback to run.
 */
app.controller("lecture", function($rootScope, $scope, $firebase, lectureService)
{
	//Initially start with no connections
	$scope.connections = 0;
	
	/**
	 * Called when the open lecture button is pressed.
	 */
	$scope.openLecture = function()
	{
		lectureService.setLectureId(function()
		{
			//Set up the lecture ID, and grab it:
			$scope.leccode = lectureService.lectureId();
			
			//Set up a connection to the users branch for later
			$scope.clients = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + $scope.leccode + "/users");
			
			$scope.clients.on('child_added', function()
			{
				//When a user is added to the branch, increment the amount of connections and apply the changes
				$scope.connections++;
				$rootScope.$apply();
			});
			
			$scope.clients.on('child_removed', function()
			{
				//When a user is removed from the branch, decrement the amount of connections and apply the changes.
				$scope.connections--;
				$rootScope.$apply();
			});
			
			//And start the time bar moving (signal to slider.js).
			startSliderBar($scope.leccode);
		});
	}
	
	/**
	 * Utility function to check if a given variable is undefined.
	 *
	 * @param {mixed} thing - The variable to check.
	 */
	$scope.isUndefined = function (thing) 
	{
	    return (typeof thing === "undefined");
	}
})

/**
 * Controller for questions functionality - handles the addition of questions.
 *
 * @param {function} anonymous - The callback to run.
 */
app.controller("questions", function($rootScope, $scope, $firebase)
{
	/**
	 * Adds a question to the lecture.
	 *
	 * @param {number} type - The question type to add.
	*/
	$scope.send = function(type)
	{
		//Find the questions branch to add into
		var sync = $firebase($rootScope.ref.child('Questions'));
		
		if(!canAddQuestion())
		{
			//If they can't add a question just yet (the limit is imposed), skip
			alert("A question has already been asked in the last 2 minutes.");
			return;
		}

		//Otherwise push the question to firebase
		sync.$push(
		{
			type: type,
			time: Date.now()
		}).then(function(ref)
		{
			//And then generate a marker for this question on the page
			var marker = $("<i class=\"big marker icon\"></i>").appendTo("#markers");
			
			//And move it to the current time.
			moveMarkerToCurrentTime(marker, ref);
		});
		
	}
});

	