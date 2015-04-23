
var svg = d3.select("body")
	.append("svg")
	.append("g")

svg.append("g")
	.attr("class", "slices");
svg.append("g")
	.attr("class", "labels");
svg.append("g")
	.attr("class", "lines");

var width = 960,
    height = 450,
	radius = Math.min(width, height) / 2;

var pie = d3.layout.pie()
	.sort(null)
	.value(function(d) {
		return d.value;
	});

var arc = d3.svg.arc()
	.outerRadius(radius * 0.8)
	.innerRadius(radius * 0.4);

var outerArc = d3.svg.arc()
	.innerRadius(radius * 0.9)
	.outerRadius(radius * 0.9);

svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var key = function(d){ return d.data.label; };

var color = d3.scale.ordinal()
	.domain(["Too fast", "Enlightened", "Confused"])
	.range(["#9b59b6", "#2980b9", "#2ecc71"]);



var sums = {
	        x : 0,
	        y : 0,
	        z : 0
	    };

var fbUrl = new Firebase("https://interactive-lecture.firebaseio.com/Test/f212a1/triad");
var triadCount = 0;

function getLast5Minutes()
{
	var time = +(new Date());

	sums.x = sums.y = sums.z = 0;
	triadCount = 0;

	fbUrl.orderByChild("time").startAt(time - 300000).once('value', function(value)
	{
		value.forEach(function(subvalue, index)
		{
			var entry = subvalue.val();

			sums.x += entry.x;
			sums.y += entry.y;
			sums.z += entry.z;

			triadCount++;
			change(updateValues());
		});



	});
	
}

function getCursorXPercent(x)
{
    //var width = window.innerWidth;
    return Math.min(x, $("#time-bar").width());
}
 
function lintime(start, end, percent)
{
    return (end - start) * percent + start;
}

var drag = false;

$(window).load(function()
{
	$("#outer-bar").mousedown(function() { drag = true; });
	$("*").mouseup(function() { drag = false; });

	$("body").mousemove(function(e)
	{
		if(!drag)
			return;

		var x = e.pageX;
		

		var widthOfSlider = 40;
		var percent = widthOfSlider/$("#time-bar").width();

		var endPercent = (getCursorXPercent(x)/* - (percent / 2)*/);

		if(endPercent <= percent / 2)
			endPercent = 0;

		else if(endPercent >= 1.0 - percent / 2)
			endPercent = 1.0 - percent;

		else
			endPercent -= percent / 2;

		$("#slider").css('left', getCursorXPercent(x) - widthOfSlider + "px");
	});

	$("#time-bar").animate({ width: '100%' }, 100000, 'linear');
});


var timer = window.setInterval(getLast5Minutes, 5000);
//getLast5Minutes();

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
			value: sums[Object.keys(sums)[index]] / triadCount
		}
	});
}

d3.select(".randomize")
	.on("click", function(){
		change(updateValues());
	});


function change(data) {

	/* ------- PIE SLICES -------*/
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

	/* ------- TEXT LABELS -------*/

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

	/* ------- SLICE TO TEXT POLYLINES -------*/

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