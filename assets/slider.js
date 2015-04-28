
var lectureRunning = false;
var duration = 1000 * 60 * 60;
var windowSize = duration / 20;
var startTime;
var endTime;
var markers = [];
var questionRefs = [];
var questionTimes = [];
var fbUrl;
var lectureID;
var triadCount = 0;
var liveData = true;
var timerInterval = 3000;
var liveDataTimer = setInterval("getLast5Minutes()", timerInterval);
var hashtagsArray = new Array(5);
var drag = false;
var oldData = [ 0, 0, 0 ];
var svg, pie, arc, outerArc, color, key, radius;

var sums = 
{
	x : 0,
	y : 0,
	z : 0
};

/**
 * Moves the time bar's marker to the current position (the current time)
 */
function moveTimebar()
{
	//Get the width of the window to work with
	var width = window.innerWidth;

	//Find the time now (to calculate from)
	var now = +(new Date());

	//Find the percentage of now from the start to the end, and linearly interpolate with this percentage
	var timePercent = (now - startTime) / (endTime - startTime);
	var timeX = width * clamp01(timePercent);

	//Set the width to the calculated time (this will move it)
	$("#time-bar").width(timeX + "px");

	if(liveData)
	{
		//If we're continously moving the time marker, then move it
		$("#slider").css('left', (timeX - $("#slider").width()) + "px");
		$("#slider").width(pixelsPerMS(windowSize) + "px");
	}
}

/**
 * Gets the average values in the last 5 minutes for the donut chart and updates it.
 */
function getLast5Minutes()
{
	if(!lectureRunning)
		return;

	//Get the width of the window to work with.
	var width = window.innerWidth;

	//Left hand side of the window (in time)
	var left = $("#slider").position().left;
	var leftHandTime = lintime(startTime, endTime, (left / width));

	//Right hand side of the window (in time)
	var right = left + $("#slider").width();
	var rightHandTime = lintime(startTime, endTime, (right / width));

	//Set sums and count to 0 for a new average count.
	sums.x = sums.y = sums.z = 0;
	triadCount = 0;

	fbUrl.orderByChild("time").startAt(leftHandTime).endAt(rightHandTime).once('value', function(value)
	{
		value.forEach(function(subvalue, index)
		{
			//Grab all sent values, and loop through them. Get the actual
			//value:
			var entry = subvalue.val();

			//Add the values from the value pulled to the relevant components of the sums object
			sums.x += entry.x;
			sums.y += entry.y;
			sums.z += entry.z;

			//Increment the count to divide by and update the chart.
			triadCount++;
			change(updateValues());
		});
	});

	if(!triadCount)
	{
		//Nothing has been pulled, so set everything to 1
		sums.x = sums.y = sums.z = 1;

		//.. and the count to 3 (so everything is 0.33)
		triadCount = 3;

		//And update the chart
		change(updateValues());
	}
}

/**
 * Move a marker to the current time, just above the time bar.
 *
 * @param {object} marker - The marker to move to the current time.
 * @param {object} firebaseRef - The reference to the firebase associated with this question.
 */
function moveMarkerToCurrentTime(marker, firebaseRef)
{
	//Get the width of the window to work with
	var width = window.innerWidth;

	//Get the current time to calculate the percentages
	var now = +(new Date());

	//Calculate the percentage of now between the start and the end, and linearly interpolate with this 
	//percentage (to calculate the X to move it to)
	var timePercent = (now - startTime) / (endTime - startTime);
	var timeX = width * clamp01(timePercent);
	
	//Move the marker left by this amount
	marker.css("left", timeX + "px");

	//Push the current marker into the array of markers, and push the question time and reference.
	markers.push(marker);
	questionRefs.push(firebaseRef);
	questionTimes.push(now);

	marker.click(function()
	{
		for(var i = 0; i < markers.length; i++)
		{
			//When a marker is clicked, run through the array of markers, and if marker is found,
			//show the bar chart containing the results for this question.
			if(markers[i] == marker)
				showDisplay(questionRefs[i]);
		}
	});
}

/**
 * Generates a string of labels for the question type:
 *
 * - 1: true/false
 * - 2: a, b
 * - 3: a, b, c
 * ...
 *
 * @param {number} type - The type of question that was supplied.
*/
function generateLabels(type)
{
	//If the type was one, return T/F
	if(type == 1)
		return ["True", "False"];
		
	//Otherwise return a, b, c, etc.
	return ["a", "b", "c", "d", "e"].slice(0, type);
}

/**
 * Gets the difference in human-readable form from the millisecond supplied to now.
 * [A modified version of http://stackoverflow.com/questions/8211744/convert-time-interval-given-in-seconds-into-more-human-readable-form]
 *
 * @param {number} milliseconds - The time to calculate the difference between, in milliseconds.
 */
function timediff(milliseconds) 
{
    function numberEnding (number) 
    {
    	//If the number is greater than 1, use 's' (plural), otherwise, none.
        return (number > 1) ? 's' : '';
    }
 
    //Set the milliseconds to the difference between now and the milliseconds
	milliseconds = new Date().getTime() - milliseconds;
    
    var temp = Math.floor(milliseconds / 1000);
    var years = Math.floor(temp / 31536000);

    if (years)
        return years + ' year' + numberEnding(years) + " ago";
    
    var days = Math.floor((temp %= 31536000) / 86400);
    if (days)
        return days + ' day' + numberEnding(days) + " ago";
    
    var hours = Math.floor((temp %= 86400) / 3600);
    if (hours)
        return hours + ' hour' + numberEnding(hours) + " ago";
    
    var minutes = Math.floor((temp %= 3600) / 60);
    if (minutes)
        return minutes + ' minute' + numberEnding(minutes) + " ago";
    
    var seconds = temp % 60;
    if (seconds)
        return seconds + ' second' + numberEnding(seconds) + " ago";
    
    return 'just now';
}

/**
 * Shows the barchart dialog along with the results of a specific question.
 *
 * @param {object} ref - A reference to the question to grab the results from.
 */
function showDisplay(ref)
{
	//Generated labels and an array of answers to map to.
	var labels, answers;
	
	ref.once('value', function(value)
	{
		//Pull each answer from the question results, and get the value.
		var data = value.val();
		
		//Generate the labels from the type, and produce an empty array of this length
		labels = generateLabels(data.type);
		answers = [0, 0, 0, 0, 0].slice(0, labels.length);
		
		if("answers" in data)
		{
			for(var key in data.answers)
			{
				//If there are answers to this question, loop through them and find the choice that was selected
				var index = parseInt(data.answers[key].answer) - 1;
				
				//If the index is true, set the index to 0
				if(data.answers[key].answer == "T")
					index = 0;
					
				//.. and 1 for false.
				else if(data.answers[key].answer == "F")
					index = 1;
				
				//Otherwise just use the index directly and increment the answer count for this choice.
				answers[index]++;
			}
		}
		
		//Clear the barchart before appending.
		$("#barchart").html("");
		
		//Calculate the difference string from the question to now and set up the header
		var difference = timediff(data.time);
		$("#barchart-dialog > h3").text("Question results (asked " + difference + ")");
		
		//Sum all of the answer counts, to check if there are any answers.
		var answersSum = answers.reduce(function(p, c) { return p + c });
		
		//If there are no answers, display a notice, otherwise update the barchart with the data provided.
		if(answersSum == 0)
			$("#barchart").html("There are no answers just yet!");
		else
			updateBarChart(labels, answers);
		
		//Fade in the dialog, and centre it.
		$("#barchart-dialog").fadeIn("slow");
		$("#barchart-dialog").css("left", ((window.innerWidth / 2) - ($("#barchart-dialog").width()) / 2) + "px");
		$("#barchart-dialog").css("top", ((window.innerHeight / 2) - ($("#barchart-dialog").height()) / 2) + "px");
	});
}

/**
 * Clamps a given x to the bounds of the time bar's width.
 *
 * @param {number} x - The given x component to use.
 */
function getCursorXPercent(x)
{
    return Math.min(x, $("#time-bar").width());
}

/**
 * Calculates how many pixels are needed for a given time.
 *
 * @param {number} inputTime - The input time in milliseconds.
 */
function pixelsPerMS(inputTime)
{
	//Get current width of the window
	var windowWidth = window.innerWidth;

	//How many pixels per millisecond?
	var pixels = windowWidth / duration;

	//Return that amount of pixels for the width multiplied by the input time in ms.
	return pixels * inputTime;
}

/**
 * Clamps a value between 0 and 1, normalizing it.
 *
 * @param {number} value - The number to clamp.
 */
function clamp01(value)
{
	if(value < 0.0)
		return 0.0;

	else if(value > 1.0)
		return 1.0;

	else
		return value;
}

/**
 * Starts the slider bar moving, and is called when the lecture is started.
 *
 * @param {string} id - The unique identifier of the current lecture.
 */
function startSliderBar(id)
{
	//Start the lecture, set id passed
	lectureRunning = true;
	lectureID = id;

	//Set up the starting and ending times of the lecture.
	startTime = +(new Date());
	endTime   = startTime + duration;

	//Set up firebase URL based on the lecture ID (for triad data)
	fbUrl = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + id + "/triad");

	//Reset sums to 1 and triadCount for 3 (for 0.33), and update the donut chart.
	sums.x = sums.y = sums.z = 1;
	triadCount = 3;
	change(updateValues());
		
	//Show the bar, and show the option to see live data
	$("#outer-bar").show();
	$("#live-data-box").show();

	//Move the time bar continously and hide the pre-lecture elements.
	setInterval(moveTimebar, 10);
	$(".inner").hide();

	//Set up firebase URL based on the lecture ID (for hashtag data)
	ref = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + lectureID + "/hashtags");

	ref.on("child_added", function(value)
	{
		//Called when a hashtag is added.
		//..

		//If the hashtag array is empty, show the container div for the hashtags
		if(typeof(hashtagsArray[0]) === "undefined")
			$(".hashtag-content").show();

		//Grab the text of the hashtag
		var tag = value.val().tag;

		//Truncate the tag (with ellipsis) so that they aren't too long.
		var truncTag = (tag.length > 10) ? (tag.slice(0, 10) + '...') : (tag);

		//Slice from the second element onwards (and set) to cycle the array
		hashtagsArray = hashtagsArray.slice(1, hashtagsArray.length);

		//And push the HTML for a hashtag label into the array (cyclically)
		hashtagsArray.push(
		"<div class=\"ui label\">" 
			+ truncTag + 
			"<div class=\"hover-label\" style=\"display:none;left:0px;top:0px;position:absolute;\">" 
				+ tag + 
			"</div>" +
		"</div>");

		//Set the content of the container to the joined array.
		$(".hashtag-content").html(hashtagsArray.join(""));
	});
}

/**
 * Calculates a time between start and end using percent, using linear interpolation.
 *
 * @param {number} start   - The start time to interpolate from.
 * @param {number} end     - The end time to interpolate to.
 * @param {number} percent - The normalized percentage to interpolate with.
 */
function lintime(start, end, percent)
{
    return (end - start) * percent + start;
}

/**
 * Called when the content of the page has finished loading completely.
 *
 * @param {function} anonymous - The callback to run code within when the page is loaded.
 */
$(window).load(function()
{
	/**
	 * Called when the live data checkbox is clicked.
	 *
	 * @param {function} anonymous - The code to run when the live data checkbox is clicked.
	 */
	$("#live-data-box").click(function()
	{
		//Find the child input field inside this one and (un)check it
		var elem = $(this).find("input");
		elem.prop("checked", !elem.prop("checked"));
		
		//Grab the checked value
		liveData = elem.prop("checked");

		//If it's checked, then constantly update the donut chart - otherwise clear the timer.
		if(liveData)
			liveDataTimer = setInterval("getLast5Minutes()", timerInterval);
		else
			clearInterval(liveDataTimer), liveDataTimer = null;
	});
	
	/**
	 * Called when one of the lecture duration options is clicked
	 *
	 * @param {function} anonymous - The code to run when one of the lecture duration options is clicked.
	 */
	$(".ui.radio.checkbox").click(function()
	{
		//Grab the text of the checkbox and parse out the value 
		var text = $(this).find("label").text();
		var value = parseInt(text.replace(/(\d+)\s.+/g, "$1"));

		//Multiply one hour (in ms) by this value, and calculate the window size (a 20th of the duration)
		duration = (1000 * 60) * 60 * value;
		windowSize = duration / 20;

		//Check the checkbox
		$(this).find("input").prop("checked", true);
	});

	/**
	 * Called when the window is resized.
	 *
	 * @param {function} anonymous - The code to run when the window is resized.
	 */
	$(window).resize(function()
	{
		//Set the width of the slider and re-centre the barchart dialog
		$("#slider").width(pixelsPerMS(windowSize) + "px");
		$("#barchart-dialog").css("left", ((window.innerWidth / 2) - $("#barchart-dialog").width() / 2) + "px");
		$("#barchart-dialog").css("top", ((window.innerHeight / 2) - $("#barchart-dialog").height() / 2) + "px");
	});

	/**
	 * Called whenever any element in the document is clicked.
	 *
	 * @param {function} anonymous - The code to run whenever any element in the document is clicked.
	 */
	$(document).bind('click', function(elem)
	{
		//If the element is the barchart dialog, skip
		if($(elem.target).is("#barchart-dialog"))
			return;
			
		//If the element is a question marker, skip
		if($(elem.target).is(".big.marker.icon"))
			return;
			
		//Otherwise fade out the barchart dialog (if it's shown)
		if($("#barchart-dialog").css('display') != 'none')
			$("#barchart-dialog").fadeOut("slow");
	});
	
	//Hide all elements before the lecture is started
	$("#live-data-box").hide();
	$("#barchart-dialog").hide();
	$("#outer-bar").hide();
	$(".hashtag-content").hide();

	/**
	 * Called when the time bar is clicked down upon.
	 *
	 * @param {function} anonymous - The code to run.
	 */
	$("#outer-bar").mousedown(function() 
	{ 
		//If the window is not to be moved (live data streaming), skip
		if(liveData)
			return;

		drag = true;
		
		//Fade in the slider if needed (for the first time)
		if($("#slider").css("opacity") == "0")
			$("#slider").animate({ opacity : 1.0 }, "slow");
	});
	
	/**
	 * Called when the mouse button is released
	 *
	 * @param {function} anonymous - The code to run.
	 */
	$("*").mouseup(function() 
	{ 
		//If the mouse has been dragged, update the chart
		if(drag)
			getLast5Minutes();
		
		drag = false; 
	});

	/**
	 * Called when the mouse is moved on the page.
	 *
	 * @param {function} anonymous - The code to run.
	 */
	$("body").mousemove(function(e)
	{
		//If we're not dragging, do nothing
		if(!drag)
			return;

		//If the lecture isnt running, do nothing
		if(!lectureRunning)
			return;

		//If we can't move the window (live data), do nothing
		if(liveData)
			return;

		//Get the x position of the mouse on the page
		var x = e.pageX;

		//Use the width of the slider to calculate the percentage between this and the total width of the time bar
		var widthOfSlider = $("#slider").width();
		var percent = widthOfSlider / $("#time-bar").width();

		//Move the slider to the position of the mouse (right-aligned), and reupdate the width
		$("#slider").css('left', getCursorXPercent(x) - widthOfSlider + "px");
		$("#slider").width(pixelsPerMS(windowSize) + "px");
	});

});

/**
 * Returns values for updating the chart in the correct format.
 *
 */
function updateValues ()
{
	//Grab each label of the chart
	var labels = color.domain();
	
	return labels.map(function(label,index)
	{
		//Map each label name to an average of the values for this label.
		return
		{ 
			label: label, 
			value: sums[Object.keys(sums)[index]] / triadCount
		}
	});
}

/**
 * Changes and updates the chart with given data.
 * [A modified version of http://bl.ocks.org/dbuezas/9306799]
 *
 * @param {object} data - The data to update with.
*/
function change(data)
{
	//If the old data is the same as the new data, why update?
	if(data[0].value == oldData[0].value 
	&& data[1].value == oldData[1].value
	&& data[2].value == oldData[2].value)
		return;

	//Otherwise set old data to the new data passed.
	else
		oldData = data;

	//------- PIE SLICES -------
	var slice = svg.select(".slices").selectAll("path.slice")
		.data(pie(data), key);

	slice.enter()
		.insert("path")
		.style("fill", function(d) { return color(d.data.label); })
		.attr("class", "slice");

	slice		
		.transition().duration(1000)
		.attrTween("d", function(d) {
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				return arc(interpolate(t));
			};
		})

	slice.exit()
		.remove();

	// ------- TEXT LABELS -------

	var text = svg.select(".labels").selectAll("text")
		.data(pie(data), key);

	text.enter()
		.append("text")
		.attr("dy", ".35em")
		.text(function(d) {
			return d.data.label;
		});
	
	function midAngle(d){
		return d.startAngle + (d.endAngle - d.startAngle)/2;
	}

	text.transition().duration(1000)
		.attrTween("transform", function(d) {
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				var pos = outerArc.centroid(d2);
				pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
				return "translate("+ pos +")";
			};
		})
		.styleTween("text-anchor", function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				return midAngle(d2) < Math.PI ? "start":"end";
			};
		});

	text.exit()
		.remove();

	// ------- SLICE TO TEXT POLYLINES -------

	var polyline = svg.select(".lines").selectAll("polyline")
		.data(pie(data), key);
	
	polyline.enter()
		.append("polyline");

	polyline.transition().duration(1000)
		.attrTween("points", function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				var pos = outerArc.centroid(d2);
				pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
				return [arc.centroid(d2), outerArc.centroid(d2), pos];
			};			
		});
	
	polyline.exit()
		.remove();
};


/**
 * Checks whether or not a question can be added at this point.
 */
function canAddQuestion()
{
	//Get the current time
	var now = +(new Date());

	for(var i = 0; i < questionTimes.length; i++)
	{
		//If any of the last question times are within 2 minutes of now, return false (impose the limit)
		if(questionTimes[i] > (now - (1000 * 60 * 2)))
			return false;
	}

	//Otherwise return true
	return true;
}

/**
 * Makes the donut chart on the page.
 * [A modified version of http://bl.ocks.org/dbuezas/9306799]
*/
function makeDonutChart()
{
	svg = d3.select("#chart")
		.append("svg")
		.append("g")

	svg.append("g")
		.attr("class", "slices");
	svg.append("g")
		.attr("class", "labels");
	svg.append("g")
		.attr("class", "lines");

	var width = 800,
	    height = 460;
	
	radius = Math.min(width, height) / 2;

	pie = d3.layout.pie()
		.sort(null)
		.value(function(d) {
			return d.value;
		});

	arc = d3.svg.arc()
		.outerRadius(radius * 0.8)
		.innerRadius(radius * 0.4);

	outerArc = d3.svg.arc()
		.innerRadius(radius * 0.9)
		.outerRadius(radius * 0.9);

	svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

	key = function(d){ return d.data.label; };

	color = d3.scale.ordinal()
		.domain(["Too fast", "Enlightened", "Confused"])
		.range(["#9b59b6", "#2980b9", "#2ecc71"]);
}

/**
 * Updates the bar chart with the given labels and values.
 *
 * @param {array} labels - The labels for each bar.
 * @param {array} values - The values mapped to each label (for each bar).
 */
function updateBarChart(labels, values)
{	
	//The div selector to update
	var divID = "#barchart";

	//Clear the div before appending
	$(divID).html("");
	
	//The maximum range (length) of each bar
	var max = 410;

	//Set up the bars with the range specified.
	var x = d3.scale.linear()
		.domain([0, d3.max(values) ])
		.range([0, max]);
	
	//Sum the values to be used (to calculate the percentage)
	var valueSum = values.reduce(function(p, c) { return p + c });
	
	//Create the bar chart.
	d3.select(divID)
	  .selectAll("rect")
		.data(values)
	  .enter().append("rect")
		.style("width", function(d, i)
		{
			//Get the percentage of each bar to the max
			var percent = (values[i] / valueSum);
			
			//And return this percentage of the max bar width.
			return max * percent + 40 + "px";
		})
			.style("height", "50px")
			.style("display", "block")
		.text(function(d, i) { return (labels[i] + " - " + Math.floor(values[i] / valueSum * 100) + "%"); });
}

/**
 * Called when the document is to be generated.
 *
 * @param {function} anonymous - The code to be run.
 */
$(document).ready(function()
{
	//Just make the donut chart before it is shown and updated.
	makeDonutChart();
});
