
/*
*/

/*var lectureRunning = false;
var windowSize =  1000 * 10;
var duration = 100000;
var startTime;// = +(new Date());
var endTime;// = startTime + duration;

var sums = {
	        x : 0,
	        y : 0,
	        z : 0
	    };

var fbUrl;//= new Firebase("https://interactive-lecture.firebaseio.com/Test/f212a1/triad");
var lectureID;
var triadCount = 0;

function moveTimebar()
{
	//Window inner width
	var width = window.innerWidth;

	//$("#time-bar").animate({ width: '100%' }, duration, 'linear');
	var now = +(new Date());

	var timePercent = (now - startTime) / (endTime - startTime);
	var timeX = width * clamp01(timePercent);

	$("#time-bar").width(timeX + "px");
}

function getLast5Minutes()
{
	if(!lectureRunning)
		return;


	//Window inner width
	var width = window.innerWidth;

	
	//animate({ width: '100%' }, duration, 'linear');

	//Left hand
	var left = $("#slider").position().left;
	var leftHandTime = lintime(startTime, endTime, (left / width));

	//Right hand
	var right = left + $("#slider").width();
	var rightHandTime = lintime(startTime, endTime, (right / width));

	sums.x = sums.y = sums.z = 0;
	triadCount = 0;

	fbUrl.orderByChild("time").startAt(leftHandTime).endAt(rightHandTime).once('value', function(value)
	{
		value.forEach(function(subvalue, index)
		{
			var entry = subvalue.val();

			console.log(entry);
			sums.x += entry.x;
			sums.y += entry.y;
			sums.z += entry.z;

			triadCount++;
			change(updateValues());
		});
	});

	//fb.pull(time > left && time < right)
	//console.log(rightHandTime - windowSize);
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

function startSliderBar(id)
{
	//Start the lecture, set id passed
	lectureRunning = true;
	lectureID = id;

	startTime = +(new Date());
	endTime   = startTime + duration;

	//Set up firebase URL
	fbUrl = new Firebase("https://interactive-lecture.firebaseio.com/Test/" + id + "/triad");
	
	//Show the bar and start the animation.
	$("#outer-bar").show();
	setInterval(moveTimebar, 10);
	//$("#time-bar").animate({ width: '100%' }, duration, 'linear');
}
 
function lintime(start, end, percent)
{
    return (end - start) * percent + start;
}

var drag = false;

$(window).load(function()
{
	$(window).resize(function()
	{
		$("#slider").width(pixelsPerMS(windowSize) + "px");
	});

	$("#outer-bar").hide();

	$("#outer-bar").mousedown(function() { drag = true; });
	$("*").mouseup(function() { drag = false; });

	$("body").mousemove(function(e)
	{
		if(!drag)
			return;

		if(!lectureRunning)
			return;

		var x = e.pageX;
		

		var widthOfSlider = $("#slider").width();
		var percent = widthOfSlider/$("#time-bar").width();

		var endPercent = (getCursorXPercent(x)// - (percent / 2));

		if(endPercent <= percent / 2)
			endPercent = 0;

		else if(endPercent >= 1.0 - percent / 2)
			endPercent = 1.0 - percent;

		else
			endPercent -= percent / 2;

		$("#slider").css('left', getCursorXPercent(x) - widthOfSlider + "px");
		$("#slider").width(pixelsPerMS(windowSize) + "px");
	});

	//if()
	//$("#time-bar").animate({ width: '100%' }, duration, 'linear');
});


var timer = window.setInterval(getLast5Minutes, 5000);
//getLast5Minutes();
*/
/*svg.firebase(fbUrl,
{
	createFunc : function(newData) 
	{
		//var values = getLast5Minutes();
		
		getLast5Minutes();
		console.log(newData.val())
		
		change(updateValues());
		getLast5Minutes();
	}
});*/


function updateValues ()
{
	var labels = color.domain();
	
	return labels.map(function(label,index)
	{
		return { 
			label: label, 
			value: 3//sums[Object.keys(sums)[index]] / triadCount
		}
	});
}

function change(data) {

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

function makeChart()
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

	var width = 960,
	    height = 450;
	
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

$(document).ready(function()
{
	makeChart();
	change(updateValues());
});
