
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

function moveMarkerToCurrentTime(marker, firebaseRef)
{
	//Window inner width
	var width = window.innerWidth;

	var now = +(new Date());

	var timePercent = (now - startTime) / (endTime - startTime);
	var timeX = width * clamp01(timePercent);
	
	marker.css("left", timeX + "px");

	markers.push(marker);
	questionRefs.push(firebaseRef);
	
	questionTimes.push(now);

	marker.click(function()
	{
		for(var i = 0; i < markers.length; i++)
		{
			if(markers[i] == marker)
				showDisplay(questionRefs[i]);
		}
	});
}

function generateLabels(type)
{
	if(type == 1)
		return ["True", "False"];
		
	return ["a", "b", "c", "d", "e"].slice(0, type);
}

function timediff(milliseconds) 
{
    function numberEnding (number) 
    {
        return (number > 1) ? 's' : '';
    }
 
    //var oldDate = +(new Date(milliseconds));
	milliseconds = new Date().getTime() - milliseconds;
    
    var temp = Math.floor(milliseconds / 1000);
    var years = Math.floor(temp / 31536000);
    if (years)
        return years + ' year' + numberEnding(years) + " ago";
    
    //TODO: Months! Maybe weeks? 
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

function showDisplay(ref)
{
	var labels, answers;
	
	ref.once('value', function(value)
	{
		var data = value.val();
		
		labels = generateLabels(data.type);
		answers = [0, 0, 0, 0, 0].slice(0, labels.length);
		
		if("answers" in data)
		{
			for(var key in data.answers)
			{
				var index = parseInt(data.answers[key].answer) - 1;
				
				if(data.answers[key].answer == "T")
					index = 0;
					
				else if(data.answers[key].answer == "F")
					index = 1;
					
				answers[index]++;
			}
		}
		
		$("#barchart").html("");
		
		var difference = timediff(data.time);
		
		$("#barchart-dialog > h3").text("Question results (asked " + difference + ")");
		
		var answersSum = answers.reduce(function(p, c) { return p + c });
		
		if(answersSum == 0)
			$("#barchart").html("There are no answers just yet!");
		else
			updateBarChart(labels, answers);
		
		$("#barchart-dialog").fadeIn("slow");
		$("#barchart-dialog").css("left", ((window.innerWidth / 2) - ($("#barchart-dialog").width()) / 2) + "px");
		$("#barchart-dialog").css("top", ((window.innerHeight / 2) - ($("#barchart-dialog").height()) / 2) + "px");
	});
}

function getCursorXPercent(x)
{
    //var width = window.innerWidth;
    return Math.min(x, $("#time-bar").width());
}

function pixelsPerMS(inputTime)
{
	//Get current width of the window
	var windowWidth = window.innerWidth;

	//How many pixels per millisecond?
	var pixels = windowWidth / duration;

	//Return that amount of pixels for the width multiplied by the input time in ms.
	return pixels * inputTime;
}

function clamp01(value)
{
	if(value < 0.0)
		return 0.0;

	else if(value > 1.0)
		return 1.0;

	else
		return value;
}

var hashtagsArray = new Array(5);

function startSliderBar(id)
{
	//Start the lecture, set id passed
	lectureRunning = true;
	lectureID = id;

	startTime = +(new Date());
	endTime   = startTime + duration;

	//Set up firebase URL
	fbUrl = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + id + "/triad");

	sums.x = sums.y = sums.z = 1;
	triadCount = 3;
	change(updateValues());
		
	//Show the bar and start the animation.
	$("#outer-bar").show();
	$("#live-data-box").show();

	setInterval(moveTimebar, 10);
	
	$(".inner").hide();

	ref = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + lectureID + "/hashtags");

	//console.dir(ref);
	//var builtText = "";
	//console.log("hi");

	ref.on("child_added", function(value)
	{
		if(typeof(hashtagsArray[0]) === "undefined")
			$(".hashtag-content").show();

		var tag = value.val().tag;

		var truncTag = (tag.length > 10) ? (tag.slice(0, 10) + '...') : (tag);

		// console.log(value.val().tag);
		hashtagsArray = hashtagsArray.slice(1, hashtagsArray.length);
		hashtagsArray.push(
		"<div class=\"ui label\">" 
			+ truncTag + 
			"<div class=\"hover-label\" style=\"display:none;left:0px;top:0px;position:absolute;\">" 
				+ tag + 
			"</div>" +
		"</div>");

		$(".hashtag-content").html(hashtagsArray.join(""));
	});

	//$(".hashtag-content").html(builtText);
}
 
function lintime(start, end, percent)
{
    return (end - start) * percent + start;
}

var drag = false;

$(window).load(function()
{
	//$("#slider").css("opacity", "0.0");
	
	$("#live-data-box").click(function()
	{
		var elem = $(this).find("input");
		
		elem.prop("checked", !elem.prop("checked"));
		
		liveData = elem.prop("checked");

		if(liveData)
			liveDataTimer = setInterval("getLast5Minutes()", timerInterval);
		else
			clearInterval(liveDataTimer), liveDataTimer = null;
	});
	
	$(".ui.radio.checkbox").click(function()
	{
		//console.log("hi");
		var text = $(this).find("label").text();
		var value = parseInt(text.replace(/(\d+)\s.+/g, "$1"));

		duration = (1000 * 60) * 60 * value;
		windowSize = duration / 20;

		$(this).find("input").prop("checked", true);
	});

	$(window).resize(function()
	{
		$("#slider").width(pixelsPerMS(windowSize) + "px");
		$("#barchart-dialog").css("left", ((window.innerWidth / 2) - $("#barchart-dialog").width() / 2) + "px");
		$("#barchart-dialog").css("top", ((window.innerHeight / 2) - $("#barchart-dialog").height() / 2) + "px");
	});


	$(document).bind('click', function(elem)
	{
		if($(elem.target).is("#barchart-dialog"))
			return;
			
		if($(elem.target).is(".big.marker.icon"))
			return;
			
		if($("#barchart-dialog").css('display') != 'none')
			$("#barchart-dialog").fadeOut("slow");
	});
	
	$("#live-data-box").hide();
	$("#barchart-dialog").hide();
	$("#outer-bar").hide();
	$(".hashtag-content").hide();

	$("#outer-bar").mousedown(function() 
	{ 
		if(liveData)
			return;

		drag = true;
		
		if($("#slider").css("opacity") == "0")
			$("#slider").animate({ opacity : 1.0 }, "slow");
	});
	
	$("*").mouseup(function() 
	{ 
		if(drag)
			getLast5Minutes();
		
		drag = false; 
	});
	
	$("body").mousemove(function(e)
	{
		if(!drag)
			return;

		if(!lectureRunning)
			return;

		if(liveData)
			return;

		var x = e.pageX;

		var widthOfSlider = $("#slider").width();
		var percent = widthOfSlider/$("#time-bar").width();

		var endPercent = (getCursorXPercent(x)/* - (percent / 2)*/);

		if(endPercent <= percent / 2)
			endPercent = 0;

		else if(endPercent >= 1.0 - percent / 2)
			endPercent = 1.0 - percent;

		else
			endPercent -= percent / 2;

		$("#slider").css('left', getCursorXPercent(x) - widthOfSlider + "px");
		$("#slider").width(pixelsPerMS(windowSize) + "px");
	});

});

function updateValues ()
{
	var labels = color.domain();
	
	return labels.map(function(label,index)
	{
		return { 
			label: label, 
			value: sums[Object.keys(sums)[index]] / triadCount
		}
	});
}

var oldData = [ 0, 0, 0 ];

function change(data)
{
	if(data[0].value == oldData[0].value 
	&& data[1].value == oldData[1].value
	&& data[2].value == oldData[2].value)
		return;

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

var svg, pie, arc, outerArc, color, key, radius;

function canAddQuestion()
{
	var now = +(new Date());

	for(var i = 0; i < questionTimes.length; i++)
	{
		if(questionTimes[i] > (now - (1000 * 60 * 2)))
			return false;
	}

	return true;
}

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


function updateBarChart(labels, values)
{	
	var divID = "#barchart";
	//var data = [4, 55, 15, 16, 23, 42];

	//Clear the div
	$(divID).html("");
	
	var max = 410;

	//Create the bar chart within the div
	var x = d3.scale.linear()
		.domain([0, d3.max(values) ])
		.range([0, max]);
	
	var valueSum = values.reduce(function(p, c) { return p + c });
	
	d3.select(divID)
	  .selectAll("rect")
		.data(values)
	  .enter().append("rect")
		.style("width", function(d, i)
		{
			var percent = (values[i] / valueSum);
			//console.log(max * percent);
			return max * percent + 40 + "px";
			//return ( x(d)) + 40 + "px"; 
		})
			.style("height", "50px")
			.style("display", "block")
			//.style("top")
			//.attr("transform", function(d, i) { return "translate(" + i * barWidth + ",0)"; })
			//.style("height", 420 - x(d) + "px")
		.text(function(d, i) { return (labels[i] + " - " + Math.floor(values[i] / valueSum * 100) + "%"); });

}

$(document).ready(function()
{
	makeDonutChart();
	//updateBarChart(["a", "b"], [0, 200]);
});
