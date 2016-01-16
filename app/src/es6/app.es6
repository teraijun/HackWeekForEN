'use strict';
import console from 'console';
import d3 from 'd3';
import cloud from 'd3-cloud';
import 'jquery';
import 'bootstrap';
import _ from 'lodash';

/**
 */
var base_url = 'http://localhost:8006';
// var base_url = '';

var en_status = 'personal';
var notebook_data = {};
var note_data = {};
var notes_data = {};


class Utils {
	constructor(){
	}
	auth(e){
		var url = $(e.target).attr('href');
		if (url.indexOf('logout')!=-1) window.localStorage.clear();
		window.location.href = url;
	}
	change(e, callback){
		var data = {};
		if (en_status == 'personal'){
			data = notebook_data.personal;
		} else {
			data = notebook_data.business;
		}
		if (e.target.className == 'normal'){
			data = _.sortBy(data, function(a){return a.count}).reverse();
			$(e.target).attr('class', 'sort');
		} else {
			$(e.target).attr('class', 'normal');
		}
		callback(data);
	}
}

class View {
	constructor(){
	}
	showResults(notes){
		if (!notes || notes.length < 1) return;

		var parent = $('#list ul');
		parent.html('');
		for (var i=0; i<notes.length; i++){
			var note = notes[i];
			var title = note.title;
			var li = $('<li>');
			li.text(title);
			parent.append(li);
		}
		$('#list').show();
	}

}

class Apis {
	constructor(){
		this.csrftoken = this.getCookie('csrftoken');
	}
	getCookie(name){
		var cookieValue = null;
		if (document.cookie && document.cookie != '') {
			var cookies = document.cookie.split(';');
			for (var i = 0; i < cookies.length; i++) {
				var cookie = $.trim(cookies[i]);
				if (cookie.substring(0, name.length + 1) == (name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}
	info(callback){
		$.ajax({
			type: 'GET',
			xhrFields: { withCredentials: true },
			url: base_url + '/info/',
			// url: 'data.json',
			dataType: 'json',
			success: function(response) {
				$('.auth').attr('href', base_url + response.redirect_url +'?callback='+encodeURIComponent(window.location.href));
				if (response.status != 'redirect'){
					$(".before_login").hide();
					$(".after_login").show();
					document.cookie = 'csrftoken=' + response.csrf_token;
					window.localStorage.setItem('access_token', response.access_token);
					window.localStorage.setItem('business_token', response.business_token);					
					callback();
				} else {
					$(".before_login").show();
					$(".after_login").hide();
				}
			}
		});
	}

	notebook(callback){
		var that = this;
		$.ajax({
			type: 'POST',
			xhrFields: { withCredentials: true },
			beforeSend: function(xhr, settings) {
				xhr.setRequestHeader("X-CSRFToken", that.csrftoken);
			},
			url: base_url + '/notebook/',
			data: {
				'access_token': window.localStorage.getItem('access_token'),
				'business_token': window.localStorage.getItem('business_token')
			},
			dataType: 'json',
			success: function(response) {
				notebook_data = response.notebook;
				var bdata = {};
				if (en_status == 'personal'){
					bdata = response.notebook.personal;
				} else {
					bdata = response.notebook.business;
				}
				callback(bdata);
			}
		});
	}

	words(callback){
		var that = this;
		$.ajax({
			type: 'POST',
			xhrFields: { withCredentials: true },
			beforeSend: function(xhr, settings) {
				xhr.setRequestHeader("X-CSRFToken", that.csrftoken);
			},
			url: base_url + '/words/',
			data: {
				'access_token': window.localStorage.getItem('access_token'),
				'business_token': window.localStorage.getItem('business_token')
			},
			dataType: 'json',
			success: function(response) {
				notes_data = response.note;
				var ndata = {};
				if (en_status == 'personal'){
					ndata = response.note.personal;
				} else {
					ndata = response.note.business;
				}
				callback(ndata);
			}
		});
	}
	word(callback){
		var that = this;
		$.ajax({
			type: 'POST',
			xhrFields: { withCredentials: true },
			beforeSend: function(xhr, settings) {
				xhr.setRequestHeader("X-CSRFToken", that.csrftoken);
			},
			url: base_url + '/word/',
			data: {
				'access_token': window.localStorage.getItem('access_token'),
				'business_token': window.localStorage.getItem('business_token')
			},
			dataType: 'json',
			success: function(response) {
				note_data = response.words;
				var ndata = {};
				if (en_status == 'personal'){
					ndata = response.words.personal;
				} else {
					ndata = response.words.business;
				}
				callback(ndata);
			}
		});		
	}
	wordsForYear(callback){
		var that = this;
		$.ajax({
			type: 'POST',
			xhrFields: { withCredentials: true },
			beforeSend: function(xhr, settings) {
				xhr.setRequestHeader("X-CSRFToken", that.csrftoken);
			},
			url: base_url + '/year/',
			data: {
				'access_token': window.localStorage.getItem('access_token'),
				'business_token': window.localStorage.getItem('business_token')
			},
			dataType: 'json',
			success: function(response) {
				// notes_data = response.note;
				var ndata = {};
				// if (en_status == 'personal'){
				// 	ndata = response.note.personal;
				// } else {
				// 	ndata = response.note.business;
				// }
				callback(ndata);
			}
		});
	}
}

class BarChart {
	constructor(){
	}
	draw(data){
		data = this.truncateName(data);
		var margin = {top: 20, right: 20, bottom: 30, left: 40},
		// width = 1500,
		width = 940,
		height = 465;

		var x = d3.scale.ordinal()
		.rangeRoundBands([0, width], .1);

		var y = d3.scale.linear()
		.range([height, 0]);

		var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

		var yAxis = d3.svg.axis()
			.scale(y)
			.orient("left")
			.ticks(10);

		d3.selectAll("#barchart").remove();
		d3.selectAll("#loader_bar").remove();
		var svg = d3.select("#bar_chart").append("svg")
			.attr("id", "barchart")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		x.domain(data.map(function(d) { return d.name; }));
		y.domain([0, d3.max(data, function(d) { return d.count; })]);

		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);

		svg.append("g")
			.attr("class", "y axis")
			.call(yAxis)
		.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text("Note Count");

		svg.selectAll(".bar")
			.data(data)
			.enter().append("rect")
			.attr("class", "bar")
			.attr("x", function(d) { return x(d.name); })
			.attr("width", x.rangeBand())
			.attr("y", function(d) { return y(d.count); })
			.attr("height", function(d) { return height - y(d.count); });

	}
	truncateName(arr){
		for (var i=0; i<arr.length; i++){
			var notebook = arr[i];
			notebook.name = notebook.name.length > 10 ? notebook.name.substring(0,10)+'...' : notebook.name;
		}
		return arr;
	}
}

class BubbleChart{
	constructor(){
	}

	showBubbleChart(root){
		var diameter = 720,
		format = d3.format(",d"),
		color = d3.scale.category20c();

		var bubble = d3.layout.pack()
			.sort(null)
			.size([diameter, diameter])
			.padding(1.5);

		d3.selectAll(".bubble").remove();
		d3.selectAll("#loader_bubble").remove();
		var svg = d3.select("#bubble_chart").append("svg")
			.attr("width", diameter)
			.attr("height", diameter)
			.attr("class", "bubble");

		var node = svg.selectAll(".node")
			.data(bubble.nodes(classes(root))
			.filter(function(d) { return !d.children; }))
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

		node.append("title")
			.text(function(d) { return d.className + ": " + format(d.value); });

		node.append("circle")
			.attr("r", function(d) { return d.r; })
			.style("fill", function(d) { 
				return color(d.packageName); 
			});

		node.append("text")
			.attr("dy", ".3em")
			.style("text-anchor", "middle")
			.text(function(d) { return d.className.substring(0, d.r / 3); });

		// Returns a flattened hierarchy containing all leaf nodes under the root.
		function classes(root) {
			var classes = [];

			function recurse(name, node) {
				if (node.children) node.children.forEach(function(child) { recurse(node.name, child); });
				else classes.push({packageName: name, className: node.name, value: node.size});
			}

			recurse(null, root);
			return {children: classes};
		}

		d3.select(self.frameElement).style("height", diameter + "px");

	}
}

class Word_Cloud{
	constructor(){}
	showCloud(list){
		var that = this;
		var fill = d3.scale.category20();

		var layout = cloud()
			.size([600, 600])
			.words(list.map(function(d) {
				return {text: d, size: 10 + Math.random() * 90, test: "haha"};
			}))
			.padding(5)
			.rotate(function() { return ~~(Math.random() * 2) * 90; })
			.font("Impact")
			.fontSize(function(d) { return d.size; })
			.on("end", draw);

		layout.start();

		function draw(words) {
			d3.selectAll(".word_cloud").remove();
			d3.selectAll("#loader_word").remove();
			d3.select("#word_chart").append("svg")
			.attr("width", layout.size()[0])
			.attr("height", layout.size()[1])
			.attr("class", "word_cloud")
			.append("g")
				.attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
			.selectAll("text")
				.data(words)
			.enter().append("text")
				.style("font-size", function(d) { return d.size + "px"; })
				.style("font-family", "Impact")
				.style("fill", function(d, i) { return fill(i); })
				.attr("text-anchor", "middle")
				.attr("transform", function(d) {
				return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
			})
			.text(function(d) { return d.text; });
		}
	}
}


class Loading{
	constructor(){
	}
	show(config){
		var that = this;
		var width = 960, height = 500;
		var radius = Math.min(width, height) / 3;
		var tau = 2 * Math.PI;

		var arc = d3.svg.arc()
			.innerRadius(radius*0.5)
			.outerRadius(radius*0.9)
			.startAngle(0);

		var svg = d3.select(config.container).append("svg")
			.attr("id", config.id)
			.attr("width", width)
			.attr("height", height)
			.append("g")
			.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")

		var background = svg.append("path")
			.datum({endAngle: 0.33*tau})
			.style("fill", "#4D4D4D")
			.attr("d", arc)
			.call(spin, 1500)

		function spin(selection, duration) {
			var that = this;
			selection.transition()
				.ease("linear")
				.duration(duration)
				.attrTween("transform", function() {
					return d3.interpolateString("rotate(0)", "rotate(360)");
				});
			setTimeout(function() { spin(selection, duration); }, duration);
		}
	}
}

function stackedBarChart(){
	var margin = {top: 20, right: 20, bottom: 30, left: 40},
	    width = 960 - margin.left - margin.right,
	    height = 500 - margin.top - margin.bottom;

	var x = d3.scale.ordinal()
	    .rangeRoundBands([0, width], .2);

	var y = d3.scale.linear()
	    .rangeRound([height, 0]);

	var color = d3.scale.ordinal()
	    .range(["#000000", "#071313", "#0e2526", "#163a3a", "#1f5152", "#28696a", "#338485", "#3d9ea0", "#48bcbd", "#53d9db"]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left")
	    .tickFormat(d3.format(".2s"));

	var tooltip = d3.select("body")
		.append("div")
		.style("position", "absolute")
		.style("z-index", "10")
		.style("background-color", "#fff")
		.style("padding", "10px 20px 5px")
		.style("font-size", "16px")
		.style("border-radius", "5px")
		.style("border", "1px solid rgba(0,0,0,.15)")
		.style("box-shadow", "0 6px 12px rgba(0,0,0,.175)")
		.style("visibility", "hidden");
		
	d3.selectAll("#barchart").remove();
	d3.selectAll("#loader_bar").remove();
	var svg = d3.select("#bar_chart").append("svg")
	    .attr("id", "barchart")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	d3.json("src/stacked.json", function(error, data) {
	  if (error) throw error;

	  color.domain(d3.keys(data[0]).filter(function(key) { return key !== "State"; }));

	  data.forEach(function(d) {
	    var y0 = 0;
	    d.ages = color.domain().map(function(name) {
	    	//todo State --> Words
	    	return {name: name, y0: y0, y1: y0 += +d[name], State: d.State};
	    });
	    d.total = d.ages[d.ages.length - 1].y1;
	  });

	  // data.sort(function(a, b) { return b.total - a.total; });

	  x.domain(data.map(function(d) { return d.State; }));
	  y.domain([0, d3.max(data, function(d) { return d.total; })]);

	  svg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0," + height + ")")
	      .call(xAxis);

	  svg.append("g")
	      .attr("class", "y axis")
	      .call(yAxis)
	    .append("text")
	      .attr("transform", "rotate(-90)")
	      .attr("y", 6)
	      .attr("dy", ".71em")
	      .style("text-anchor", "end")
	      .text("Population");

	  var state = svg.selectAll(".state")
	      .data(data)
	    .enter().append("g")
	      .attr("class", "g")
	      .attr("transform", function(d) { return "translate(" + x(d.State) + ",0)"; });

	  state.selectAll("rect")
	      .data(function(d) { 
	      	return d.ages; 
	      })
	    .enter().append("rect")
	      .attr("width", x.rangeBand())
	      .attr("y", function(d) { return y(d.y1); })
	      .attr("height", function(d) { return y(d.y0) - y(d.y1); })
	      .style("fill", function(d) { 
	      	return color(d.name); 
	      })
	      .on("mouseover", function(){
	        return tooltip.style("visibility", "visible");
	      })
	      .on("mousemove", function(d){
	        return tooltip
	          .style("top", (d3.event.pageY-10)+"px")
	          .style("left",(d3.event.pageX+10)+"px")
	          .html("<p>"+d.name+" "+d.State+"</p>");
	      })
	      .on("mouseout", function(){
	        return tooltip.style("visibility", "hidden");
	      });
	      //<dl><dt>date</dt><dd>" + d3.time.format("%Y-%m-%d")(d.date) + "</dd><dt>temperature</dt><dd>" + d.temperature + "</dd><dt>name</dt><dd>" + d.name + "</dd></dl>

	  var legend = svg.selectAll(".legend")
	      .data(color.domain().slice().reverse())
	    .enter().append("g")
	      .attr("class", "legend")
	      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

	  legend.append("rect")
	      .attr("x", width - 18)
	      .attr("width", 18)
	      .attr("height", 18)
	      .style("fill", color);

	  legend.append("text")
	      .attr("x", width - 24)
	      .attr("y", 9)
	      .attr("dy", ".35em")
	      .style("text-anchor", "end")
	      .text(function(d) { return d; });

	});
}


var c1 = {
	parent_flg: true,
	setTreeRange: function(){
		c1.w = $('.c1 .graph-area').width();
		c1.h = $('.c1 .graph-area').height();
		c1.xScale = d3.scale.linear().range([0, c1.w]);
		c1.yScale = d3.scale.linear().range([0, c1.h]);
		c1.color = d3.scale.category20c();
		c1.fmt = d3.format(",");

	},
	getData: function(data, success){
		d3.json("treemap.json", function(error, res) {
			var data = {};
			data.children = res.notebook.business.children;
			data.children.forEach(function(d){

				var regid = d.name.split('').map(function(d){
					if((d === ',')||(d === ' ')||(d === '.')||(d === '/')){
						d = '-'
					}
					return d;

				}).join('');

				d.r_id = regid
			})
			c1.node = data;
			c1.root = data;

			success();
		});

	},
	drawTreeMap: function(){
		var treemap = d3.layout.treemap()
			.round(false)
			.size([c1.w, c1.h])
			// .sticky(true)
			.sort(function(a,b) {
    			return a.value - b.value;
			})
			.value(function(d) {
				// val default
				return d['count']; });

		c1.svg = d3.select("#tree_map")
			.attr("width", c1.w)
			.attr("height", c1.h)
		  .append("svg:g")
			.attr("transform", "translate(.5,.5)")
			.attr("class", "top-layer");

		var nodes = treemap.nodes(c1.root)
			.filter(function(d) { return !d.children; });

		var cell = c1.svg.selectAll("g")
			.data(nodes)
		  .enter().append("svg:g")
			.attr("class", function(d){return "cell rJapan"})
			.attr("transform", function(d) {
				return "translate(" + d.x + "," + d.y + ")"; })

		var prensentrect;

		cell.append("svg:rect")
			.attr('class', function(d){
				var classname = 'Japan' + ' co' + d.name;

				if(d.parent.asiaflg){
					classname += ' r_asia';
				}else{
					classname += ' r_notasia';
				}
				return classname;
			})
			.attr("width", function(d) {
				if(d.dx-1 < 0) return 0;
				return d.dx - 1; })
			.attr("height", function(d) {
				if(d.dy-1 < 0) return 0;
				return d.dy - 1; })
			.attr('fill-opacity', 0.5)
			.attr('stroke', 'transparent')
			.on('mouseenter', function(d){

				if(c1.parent_flg) {
					prensentrect = $(this).attr('class').split(" ")[0];
				}
				else {prensentrect = 'co' + d.c_id;}
				d3.selectAll('.'+prensentrect).classed('activeRect', true);
				d3.selectAll('.cell rect').classed('activeZoom',function(){ return c1.parent_flg ? true : false; });
			})
			.on('mouseout', function(d){
				d3.selectAll('.cell rect').classed('activeRect', false);
				exportTooltip.style('visibility', 'hidden')
			})
			.on('mousemove', function(d){
				var content = '';
				var a;
				if ($('.tree_box .slider .tooltip .tooltip-inner').text() == 'Q1') a = 'created:month-11 -created:month-8';
				else if ($('.tree_box .slider .tooltip .tooltip-inner').text() == 'Q2') a = 'created:month-8 -created:month-5';
				else if ($('.tree_box .slider .tooltip .tooltip-inner').text() == 'Q3') a = 'created:month-5 -created:month-2';
				else if ($('.tree_box .slider .tooltip .tooltip-inner').text() == 'Q4') a = 'created:month-2';
				content = "<div class='tooltip_container'><h4>" + d.name + "</h4><div class='amount_title'>Notebook</div><div class='amount_value'>" + d[a] + "<span>Notes</span></div></div>";
				exportTooltip.style('visibility', 'visible').html(content);
				return exportTooltip
					.style("top", (d3.event.pageY-110-$('.tooltip_container > h4').height())+"px")
					.style("left",(d3.event.pageX-96)+"px")
			});

		cell.append("svg:text")
			.attr("x", function(d) { return d.dx / 2; })
			.attr("y", function(d) { return d.dy / 2; })
			.attr("dy", ".35em")
			.attr("text-anchor", "middle")
			.text(function(d) { return d.name; })
			.attr('class', 'companylabel')
			.attr("visibility", 'hidden')

		cell.select('text')
			.attr('visibility',function(d){
				return 'hidden';
			})
		// parent text
		var parent_nodes = treemap.nodes(c1.root)
			.filter(function(d) {
				if(d.name !== 'rank') return d.children; });

		d3.select('#chart1 .top-layer').append('g').attr('class','labels')
		var parent_cell = d3.select('.labels')
			.selectAll('g')
			.data(parent_nodes)
		  	.enter()
			.append("g")
			.attr("class", "parent_cell")
			.attr("transform", function(d) {
				return "translate(" + d.x + "," + d.y + ")"; })

		parent_cell.append("svg:rect")
			.attr('class', 'region-border')
			.attr("width", function(d) {
				if(d.dx-1 < 0) return 0;
				return d.dx - 1; })
			.attr("height", function(d) {
				if(d.dy-1 < 0) return 0;
				return d.dy - 1; })

		parent_cell.append("svg:text")
			.attr('class','parent_label')
			.attr("x", function(d) {
				return d.dx / 2; })
			.attr("y", function(d) { return d.dy / 2; })
			.attr("dy", ".35em")
			.attr("text-anchor", "middle")
			.text(function(d) {
				return d.r_jp; })
			.attr('visibility', c1.showParentLabel);

		//tooltip
		var exportTooltip = d3.select("body")
			.append("div")
			.attr("class", "exportTooltip");

		c1.treemap = treemap;

	},
	showParentLabel: function(d){
		if(!c1.parent_flg) return 'hidden';
		var country_count = 0;
		var rect_length = d3.selectAll('.'+d.r_id)[0]
			.map(function(e){
				var w = +d3.select(e).attr('width')
				var h = +d3.select(e).attr('height')
				if(w>0&&h>0) country_count++;
			})
		// console.log(country_count, d.r_id);
		if(country_count>5) return 'visible';
		return 'hidden'
	},
	transitionRects: function(d){
		var kx = c1.w / d.dx, ky = c1.h / d.dy;

		c1.xScale.domain([d.x, d.x + d.dx]);
		c1.yScale.domain([d.y, d.y + d.dy]);
		// console.log(d3.event.altKey);

		var t = c1.svg.selectAll("g.cell")
			.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

		t.select("rect")
			.attr("width", function(d) {
				if(d.dx-1 < 0) return 0;
				return d.dx - 1; })
			.attr("height", function(d) {
				if(d.dy-1 < 0) return 0;
				return d.dy - 1; })
		//
		t.select("text")
			.attr("x", function(d) { return d.dx / 2; })
			.attr("y", function(d) { return d.dy / 2;
			})
			.attr('visibility',function(d){
				var rectHeight = parseFloat(d3.select(this.parentNode).select('rect').attr("height"));
				var bbox = this.getBBox();
				var textHeight = bbox.height;
				var adjuestTextSize = function(d3Text, origin_str) {
					var rectWidth = parseFloat(d3.select(d3Text.parentNode).select('rect').attr("width"));
					var textWidth = parseFloat(d3.select(d3Text).style("width").replace("px", ""));
					if (textWidth >= rectWidth) {
						// * 2 に意味は無い
						var ratio = rectWidth / textWidth * 2;
						var text = origin_str;
						// console.log(text.length, ratio)
						var trimLen = text.length - parseInt(text.length * ratio);
						var substrText = text.substr(0, text.length - trimLen) + "...";
						d3.select(d3Text).text(substrText);
					}
				};
				// adjuestTextSize(this, d.name);
				return 'hidden';
			})

		var t2 = d3.selectAll('.parent_cell')
			.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

		t2.select('rect')
			.attr("width", function(d) {
				if(d.dx-1 < 0) return 0;
				return d.dx - 1; })
			.attr("height", function(d) {
				if(d.dy-1 < 0) return 0;
				return d.dy - 1; })

		 t2.select('text')
		 	.attr("x", function(d) { return d.dx / 2; })
		 	.attr("y", function(d) { return d.dy / 2; })
			.attr('visibility', c1.showParentLabel);
	},
	propchange: function(d) {
	  return d[c1.val];
	},
	controlAutoplay: function(){
		var end_years = 12;
		var counter = $("#c1-slider").slider('getValue');

		$("#c1-slider").slider('setValue', counter+1);

		c1.timer = setTimeout(c1.controlAutoplay, 2000);
		if(end_years < counter+1){
		  c1.stopAnim();
		}
	},
	val: 'count',
	//スライドバーを設置する
	slideBarInit:function(){
		$("#c1-slider").slider({
			tooltip: "always",
			formatter: function(value) {
				d3.select('#c1-year').html(value);
				c1.val = 'y' + value;
				// console.log(c1.val, value);
					c1.treemap
						.sort(function(a,b) {
							return a.value - b.value;})
						.value(c1.propchange)
						.nodes(c1.root);
					// c1.transitionRects(c1.node);

				return "Q" + value;
			}
			})
			.on('slide',function(d){
            	c1.stopAnim();
      		});

		$('#c1-stop-button').hide();
		// add dblTap event
		if (Modernizr.touch){
			d3.selectAll('#c1-anim-button').dblTap(function(){
				if(c1.stopFlg){
					c1.startAnim();
				}else{
					c1.stopAnim();
				}
				exportTooltip.style('visibility', 'hidden')
			});
		}
		else{
			d3.selectAll('#c1-anim-button').on('click', function(){
				if(c1.stopFlg){
					c1.startAnim();
				}else{
					c1.stopAnim();
				}
			});		}
	},
	stopFlg: true,
    startAnim: function(){
        $('#c1-play-button').hide();
        $('#c1-stop-button').show();
        c1.controlAutoplay();
        c1.stopFlg = false;
    },
    stopAnim: function(){
        $('#c1-play-button').show();
        $('#c1-stop-button').hide();
        clearTimeout(c1.timer);
        c1.stopFlg = true;
    },
	init: function(data){
		c1.setTreeRange();
		c1.getData('', function(){
			c1.drawTreeMap();
			c1.slideBarInit();
		});
	},
}



function main(){
	var api = new Apis();
	var view = new View();
	var utils = new Utils();
	var bar = new BarChart();
	var bubble = new BubbleChart();
	var word_cloud = new Word_Cloud();
	var loading = new Loading();
	api.info(() => {
		loading.show({container: "#word_chart", id: "loader_word"});
		loading.show({container: "#bubble_chart", id: "loader_bubble"});
		loading.show({container: "#bar_chart", id: "loader_bar"});


		// api.notebook((data)=>{
			c1.init();
		// });

		// var c2 = {
		// 	data:{},
		// 	svg:d3.select("#chart2"),
		// 	//svgのサイズ　（親要素のサイズに合わせる）
		// 	baseWidth:parseInt(d3.select('.c2 .graph-area').style('width')),
		// 	svgWidth:document.querySelector("#chart2").parentNode.clientWidth,
		// 	svgHeight:document.querySelector("#chart2").parentNode.clientHeight,
		// 	//axisを表示するエリア
		// 	axisArea:d3.select("#chart2").append("g").attr("class", "axisArea"),
		// 	//チャートエリアのステージ(axisを除いたサークルが表示される範囲)
		// 	chartArea:d3.select("#chart2").append("g").attr("class", "chartArea"),
		// 	//チャートエリアのマージン
		// 	chartMargin:null,
		// 	//チャートエリアのサイズ（svgのサイズからマージンを引いたもの）
		// 	getChartAreaWidth :function(){ return c2.svgWidth - (c2.chartMargin.left + c2.chartMargin.right) },
		// 	getChartAreaHeight:function(){ return c2.svgHeight - (c2.chartMargin.top + c2.chartMargin.bottom) },
		// 	causes:["アジア","欧州","米国","その他"],
		// 	stackdata:null,
		// 	stackColor:{"欧州":"#00bfd1", "米国":"#b9e22b", "アジア":"#fb5a74", "その他":"#cccccc"},
		// 	//年代の配列
		// 	generationArray:[],
		// 	//最大値用変数
		// 	maxPercent:100, //パーセント
		// 	//スケール用変数
		// 	percentScale:null,
		// 	generationScale:null,
		// 	//ライン関数
		// 	popLineGen:null,
		// 	gdpLineGen:null,
		// 	//表示する年代
		// 	ticksValuesArray:[1000, 1500, 1700, 1900,1950].concat(d3.range(1950,2020, 10)),

		// 	//データセットをチャート用にコンバートする
		// 	dataInit: function(rawData) { //データの初期化を行う

		// 		//読み込んだデータを文字列から数値型に変換する
		// 		rawData.data.forEach(function(obj){
		// 			Object.keys(obj).forEach(function(key){
		// 				if (isNaN(+obj[key])) return null;
		// 				obj[key] = +obj[key]
		// 			})
		// 		});

		// 		//トップネームスペースにデータを保存
		// 		c2.data = rawData.data

		// 		//年代のリストを取得する
		// 		c2.generationArray = c2.data.map(function(d){
		// 			return d.year;
		// 		});

		// 		//データをスタック用に最適かする関数を生成
		// 		var stackFn = d3.layout.stack();

		// 		//スタック用データを保存
		// 		c2.stack = stackFn(c2.causes.map(function(c) {
		// 			return c2.data.map(function(d) {
		// 			  return {x: d.year, y: d[c], area:c, gdp_percent:d[c], yearLabel:d.year};  //yとgraowthrateの値は同じになるが一応保存しておく
		// 			});
		// 		  }));


		// 	},
		// 	//マージンを設定しなおす
		// 	marginInit: function(){
		// 		if(c2.baseWidth <= 480) {
		// 			c2.chartMargin = {top:64, left:35, right:15, bottom:60 }; // for SP
		// 		}else{
		// 			c2.chartMargin = {top:60, left:50, right:25, bottom:85 }; // for TB,PC
		// 		}
		// 	},
		// 	//各要素の初期サイズを設定
		// 	sizeInit:function(){
		// 		c2.svg.attr({
		// 				"width":c2.svgWidth,
		// 				"height":c2.svgHeight
		// 			})

		// 		c2.chartArea.attr({
		// 			"width":c2.getChartAreaWidth(),
		// 			"height":c2.getChartAreaHeight(),
		// 		})
		// 		.attr("transform", "translate("+ [c2.chartMargin.left, c2.chartMargin.top ] +")")

		// 		//イベントをブロックするための非表示要素
		// 		c2.chartArea.append("rect").attr({
		// 			"x":0,
		// 			"y":0,
		// 			"width":c2.getChartAreaWidth(),
		// 			"height":c2.getChartAreaHeight(),
		// 			"fill-opacity":0
		// 		})


		// 	},
		// 	//各種スケールを設定する
		// 	scaleInit:function(){
		// 		//パーセントスケールを作成
		// 		c2.percentScale = d3.scale.linear().domain([0, c2.maxPercent]).range([c2.getChartAreaHeight(),  0]);

		// 		//年代スケールを作成
		// 		c2.generationScale = d3.scale.ordinal().domain(c2.generationArray).rangeBands([0, c2.getChartAreaWidth()]);
		// 	},
		// 	//チャート上にaxisを設置する
		// 	addAixs:function(){

		// 		//Y軸（パーセント）の設置
		// 		var yAxis = d3.svg.axis().scale(c2.percentScale).outerTickSize(0).orient('left');
		// 		c2.axisLabel = c2.axisArea.append("g")
		// 			.attr({
		// 				"class": "y axis",
		// 				"transform": "translate("+[c2.chartMargin.left, c2.chartMargin.top]+")", //表示位置をステージ下位に移動
		// 			}).call(yAxis);

		// 		c2.axisLabel
		// 			.append('text')
		// 				.attr('class', 'axisLabel')
		// 				.attr('x', 2)
		// 				.attr('y', -18)
		// 				.attr('text-anchor', 'end')
		// 				.text('（％）');

		// 		//Y軸　グリッドの設置
		// 		c2.axisArea.append("g")
		// 			.attr({
		// 				"class": "y grid",
		// 				"transform": "translate("+[c2.chartMargin.left, c2.chartMargin.top]+")", //表示位置をステージ下位に移動
		// 			}).call(yAxis.tickSize(-c2.getChartAreaWidth(), 0, 0).tickFormat(""));


		// 		//X軸（年代）の設置
		// 		var xAxis = d3.svg.axis().scale(c2.generationScale).outerTickSize(0).orient('bottom')
		// 			.tickValues(c2.ticksValuesArray)
		// 			.tickFormat(function(d) { return d + "年"; });

		// 		c2.axisArea.append("g")
		// 			.attr({
		// 				"class": "x axis",
		// 				"transform": "translate("+[c2.chartMargin.left, c2.getChartAreaHeight()+c2.chartMargin.top]+")", //表示位置をステージ下位に移動
		// 			}).call(xAxis)
		// 			.selectAll("text")
		// 				.style("text-anchor", "end")
		// 				.attr("dx", "-.7em")
		// 				.attr("dy", "-.3em")
		// 				.attr("transform", "rotate(-90)" );
		// 	},
		// 	addBarchart:function(){
		// 		//棒グラフ追加
		// 		var layer = c2.chartArea.selectAll(".layer")
		// 			.data(c2.stack)
		// 			.enter()
		// 			.append("g")
		// 			.attr("class", "layer")

		// 		var bar = layer.selectAll("rect")
		// 			.data(function(d) { return d; })
		// 			.enter()
		// 			.append("rect")
		// 			.attr("x", function(d) { return c2.generationScale(d.x); })
		// 			.attr("y", function(d) { return c2.percentScale(d.y + d.y0); })
		// 			.attr("height", function(d) { return c2.percentScale(d.y0) - c2.percentScale(d.y + d.y0); })
		// 			.attr("width", c2.generationScale.rangeBand() - 1)
		// 			.attr("fill", function(d){ return c2.stackColor[d.area] })


		// 		//棒グラフにマウスオーバーイベントを束縛
		// 		var tooltip = d3.select(d3.select("#chart2").node().parentNode.parentNode.parentNode.parentNode)
		// 			.append("div")
		// 			.attr("class","chart2-tooltip")
		// 			.style("position", "absolute")

		// 		bar.on('mouseover', function(d) {
		// 				tooltip.style("visibility", "visible");
		// 			})
		// 			.on("mousemove", function(d){
		// 				tooltip
		// 					.html([
		// 						'<div class="tooltip_container">',
		// 							'<h4>', d.yearLabel ,'年</h4>',
		// 							'<h5>', d.area , '</h5>',
		// 							'<div class="amount_title">GDPシェア：</div><div class="amount_value">', d.gdp_percent ,'<span>％</span></div>',
		// 						'</div>'
		// 					].join(''))
		// 					.style("top", c3.svgWidth <= 480 ? (d3.event.pageY - 108) + "px" : (d3.event.pageY - 140) + "px")
		// 					.style("left",c3.svgWidth <= 480 ? (d3.event.pageX - 70) + "px" : (d3.event.pageX - 84) + "px");

		// 			})

		// 			//イベントを止める
		// 			var stopEvent = function(ev) {
		// 				ev.stopPropagation();
		// 			}
		// 			document.querySelector("#chart2 .chartArea").addEventListener("mouseover", stopEvent, false);


		// 			d3.select(".c2").on('mouseover', function(d) {
		// 				return tooltip.style("visibility", "hidden");
		// 			});

		// 	},
		// 	//各要素にイベントを設定
		// 	setEvent:function(){

		// 		//トグル処理を行うためのヘルパー関数
		// 		function toggle(){
		// 			var fn = arguments;
		// 			var l = arguments.length;
		// 			var i = 0;
		// 			return function(){
		// 				if(l <= i) i=0;
		// 				fn[i++]();
		// 			}
		// 		}


		// 	},
		// 	update:function(year){
		// 		//チャートをアップデートする

		// 	},
		// 	//非同期通信をまとめるためのヘルパー関数
		// 	loadDataSet: function (option){
		// 		var files = option["files"];
		// 		var endFn = option["endFn"];
		// 		var loadingStartFn = option["loadingStartFn"];
		// 		var loadingSuccessFn = option["loadingSuccessFn"];

		// 		if (!Array.isArray(files)) throw "TypeError: files is not a array!";
		// 		if (loadingStartFn && typeof loadingStartFn != "function") throw "TypeError: loadingStartFn is not a function!";
		// 		if (loadingSuccessFn && typeof loadingSuccessFn != "function") throw "TypeError: loadingSuccessFn is not a function!";
		// 		if (typeof endFn != "function") throw "TypeError: endFn is not a function!";

		// 		var dataStack = {}; //読み込んだデータを保存するスタック
		// 		var fnStack = []; //データ読み込みに必要なajax関数を保存するスタック

		// 		//非同期通信処理をチェインを使って順次実行する。各ファンクションにコールバックを仕込む
		// 		var chain = function(functions) {
		// 			return functions.reduceRight(function (next, curr) {
		// 				return function () {
		// 					curr.apply({next: next}, arguments);
		// 				}
		// 			});
		// 		}

		// 		//ファイルの数だけ非同期処理fanctionをスタックに積む
		// 		files.forEach(function(arg){
		// 			if (loadingStartFn) loadingStartFn(arg);
		// 			fnStack.push(
		// 				function() {
		// 					var that = this;

		// 					var exte = arg.file.split("?")[0].split(".")[arg.file.split(".").length-1];

		// 					if (arg.filetype) exte = arg.filetype;
		// 					var readfile;
		// 					switch(exte){
		// 						case "json": case "geojson": case "topojson":
		// 							readfile = d3.json;
		// 						break;
		// 						case "csv":
		// 							readfile = d3.csv;
		// 						break;
		// 						case "tsv":
		// 							readfile = d3.tsv;
		// 						break;
		// 						default:
		// 							throw "TypeError: " + exte + " is not supported";
		// 						break;
		// 					}

		// 					return readfile(arg.file,  function(data){
		// 						if (arg.callbackData) arg.callbackData = data;
		// 						if (loadingSuccessFn) loadingSuccessFn(arg);
		// 						dataStack[arg.key] = data;
		// 						that.next();
		// 					});
		// 				}
		// 			)
		// 		});

		// 		//スタックの最後にendFnを追加する
		// 		fnStack.push(function(){
		// 			endFn(dataStack);
		// 		});
		// 	}

		// };





		//マージンを再設定
		// c2.marginInit(); // chart要素のサイズに合わせて変更する
		//各種要素のサイズ初期設定
		// c2.sizeInit();
		// d3.json('stackedBarchartData.json', function(error, data){
		// 	var obj = {};
		// 	obj.data = data;
		// 	main2(obj);
		// });
		// function main2(rawData) {
		// 	//生ーデータをコンバート
		// 	c2.dataInit(rawData);
		// 	//スケールを設定
		// 	c2.scaleInit();
		// 	//軸をステージに追加
		// 	c2.addAixs();
		// 	c2.addBarchart();
	 //    }








// var c3 = {
// 	data:{},
// 	svg:d3.select("#chart3"),
// 	showCountry:[],
// 	showOrder:[ "中国","日本", "インド","東南アジア主要６カ国", "韓国",],
// 	//サークルの国別カラーセット
// 	circleColor:{"日本":"#ff5c5e","中国":"#00bfd1","韓国":"#ff8c64","インド":"#586266", "東南アジア主要６カ国":"#a1cf00"},
// 	// 数値フォーマット
// 	fmt1: d3.format(',f'),
// 	fmt2: d3.format(',.2f'),
// 	//svgのサイズ　（親要素のサイズに合わせる）
// 	svgWidth:document.querySelector("#chart3").parentNode.clientWidth,
// 	svgHeight:document.querySelector("#chart3").parentNode.clientHeight,
// 	//axisを表示するエリア
// 	axisArea:d3.select("#chart3").append("g").attr("class", "axisArea"),		
// 	//チャートエリアのステージ(axisを除いたサークルが表示される範囲)	
// 	chartArea:d3.select("#chart3").append("g").attr("class", "chartArea"),
// 	//チャートエリアのマージン
// 	chartMargin:null,  
// 	//チャートエリアのサイズ（svgのサイズからマージンを引いたもの）
// 	getChartAreaWidth :function(){ return c3.svgWidth - (c3.chartMargin.left + c3.chartMargin.right) },
// 	getChartAreaHeight:function(){ return c3.svgHeight - (c3.chartMargin.top + c3.chartMargin.bottom) },
// 	//サークルオブジェクト
// 	circle:null,
// 	//最大値用変数
// 	maxPop:null,
// 	maxGdp:null,
// 	//スケール用変数
// 	popScale:null,
// 	gdpScale:null,
// 	//年代表示用ラベル
// 	generationLabel1:d3.select("#chart3").append("text").attr({"class": "yearArea"}).append('tspan').attr({'class': 'yearAmount'}),
// 	// generationLabel2:d3.select("#chart3 .yearArea").append('tspan').attr({'class': 'yearUnit', dy:-2}),
// 	loopStopFlag:true,
// 	ticksValuesArray:[200000, 400000, 600000, 800000, 1000000, 1200000, 1400000],
	
// 	//データセットをチャート用にコンバートする
// 	dataInit: function(rawData) { //データの初期化を行う
// 		Object.keys(rawData).forEach(function(key){
// 			//jsonデータを文字列から数値型に変換する
// 			rawData[key].forEach(function(d){
// 				Object.keys(d).forEach(function(subkey){
// 					if (subkey == "year"){ d[subkey] = +d[subkey];}
// 					else {
// 						var value = +d[subkey];
// 						d[subkey] = {};
// 						d[subkey][key] = value;
// 					}
// 				})
// 			});			
// 		});
		

// 		//人口、GDP、成長率、それぞれのデータを年代でネストする
// 		var convertedDatas = []
// 		Object.keys(rawData).forEach(function(dataKind){
// 			//年代をキーに人口データをネストする
// 			var tmp = d3.nest()
// 				.key(function(d) { return d.year; })
// 				.rollup(function(d) { delete d[0].year ; return d[0] })  
// 				.map(rawData[dataKind])
				
// 			convertedDatas.push(tmp)
// 		})
		
					
// 		//人口、gdp、成長率のcsvデータを合成する。
// 		// 合成後のデータは、year->countiry->datakind(pop or gdp or growthrate)　という階層構造になる
// 		var tmp = {};
// 		convertedDatas.forEach(function(d){
// 			Object.keys(d).forEach(function(year){
// 				if(!tmp[year]) tmp[year] = {}
// 				Object.keys(d[year]).forEach(function(countryName){
// 					if (!tmp[year][countryName]) tmp[year][countryName] = {}
// 					Object.keys(d[year][countryName]).forEach(function(dataKind){ // "population" か "gdp"
// 						tmp[year][countryName][dataKind] = d[year][countryName][dataKind]	
// 					})
					
// 				})
// 			})
// 		})
// 		c3.data = tmp; //トップネームスペースに編集したデータを保存
		
	
// 		//人口とGDPそれぞれの最大値を取得する
// 		Object.keys(c3.data).forEach(function(year){
// 			Object.keys(c3.data[year]).forEach(function(countryName){
// 				if (countryName == "total") return;
// 				var pop = tmp[year][countryName]["population"];
// 				var gdp = tmp[year][countryName]["gdp"];
// 				if(c3.maxPop < pop)	 c3.maxPop = pop;
// 				if(c3.maxGdp < gdp)	 c3.maxGdp = gdp;			
// 			});
// 		});
		
		
// 	},
// 	//マージンを設定しなおす
// 	marginInit: function(){
// 		if(c3.svgWidth <= 480) {
// 			c3.chartMargin = {top:60, left:30, right:15, bottom:50 }; // for SP
// 		}else{
// 			c3.chartMargin = {top:40, left:60, right:50, bottom:50 }; // for TB,PC
// 		}			
// 	},
// 	//各要素の初期サイズを設定
// 	sizeInit:function(){
// 		c3.svg.attr({
// 				"width":c3.svgWidth,
// 				"height":c3.svgHeight
// 			})
		
// 		c3.chartArea.attr({
// 			"width":c3.getChartAreaWidth(),
// 			"height":c3.getChartAreaHeight(),
// 		})
// 		.attr("transform", "translate("+ [c3.chartMargin.left, c3.chartMargin.top ] +")")
		
// 		//年代ラベルの位置を調整
// 		c3.generationLabel1.attr({
// 			"x":c3.getChartAreaWidth()+c3.chartMargin.left,
// 			"y":c3.svgWidth <= 480 ? c3.chartMargin.top+46 : c3.chartMargin.top+82,
// 			"text-anchor": "end"
// 		});
		
		
// 	},
// 	//スライドバーを設置する
// 	slideBarInit:function(){		
// 		$("#c3-slider").slider({
// 			tooltip: "always",
// 			formatter: function(value) { return value + " 年";}
// 			})
		
// 		$('#c3-stop-button').hide();		
// 	},
// 	//各種スケールを設定する
// 	scaleInit:function(){
// 		//人口スケールを作成
// 		c3.popScale = d3.scale.linear().domain([0, c3.maxPop+100000]).range([0, c3.getChartAreaWidth()])
		
// 		//GDPスケールを作成
// 		c3.gdpScale = d3.scale.sqrt().domain([0, c3.maxGdp]).range([0, c3.svgWidth <= 480 ? 70 : 100 ])

// 		//GDP成長率スケールを作成
// 		c3.growthrateScale = d3.scale.linear().domain([15, -10]).range([0, c3.getChartAreaHeight()]);

// 	},
// 	//チャート上にaxisを設置する
// 	addAixs:function(){
		
// 		//Y軸（成長率）の設置
// 		var yAxis = d3.svg.axis().scale(c3.growthrateScale).outerTickSize(0).orient('left');
// 		c3.axisLabel = c3.axisArea.append("g")
// 			.attr({
// 				"class": "y axis",
// 				"transform": "translate("+[c3.chartMargin.left, c3.chartMargin.top]+")", //表示位置をステージ下位に移動
// 			}).call(yAxis);		

// 		c3.axisLabel
// 			.append('text')
// 				.attr('class', 'axisLabel')
// 				.attr('x', 2)
// 				.attr('y', -8)
// 				.attr('text-anchor', 'end')
// 				.text('（％）');

// 		//Y軸　グリッドの設置
// 		c3.axisArea.append("g")
// 			.attr({
// 				"class": "y grid",
// 				"transform": "translate("+[c3.chartMargin.left, c3.chartMargin.top]+")", //表示位置をステージ下位に移動
// 			}).call(yAxis.tickSize(-c3.getChartAreaWidth(), 0, 0).tickFormat(""));

// 		//zeroの線
// 		c3.axisArea.append("line")
// 			.attr({
// 				"class": "hrLine",
// 				"x1":c3.chartMargin.left,
// 				"y1":c3.chartMargin.top+c3.growthrateScale(0),
// 				"x2":c3.chartMargin.left + c3.getChartAreaWidth(),
// 				"y2":c3.chartMargin.top+c3.growthrateScale(0),
// 				"stroke":"black"
// 			});
		
		
// 		//X軸（人口）の設置
// 		var xAxis = d3.svg.axis().scale(c3.popScale).orient('bottom')
// 			.tickValues(c3.ticksValuesArray)
// 			.tickFormat(function(d) { return (d/100000) + "億人"; });

// 		c3.axisArea.append("g")
// 			.attr({
// 				"class": "x axis",
// 				"transform": "translate("+[c3.chartMargin.left, c3.getChartAreaHeight()+c3.chartMargin.top]+")", //表示位置をステージ下位に移動
// 			}).call(xAxis);
			
// 		c3.axisArea.append("text")
// 			.attr({
// 				x:c3.chartMargin.left,
// 				y:c3.chartMargin.top+10,
// 				"font-size":11
// 			})
// 			.text("↑成長率がプラス")

// 		c3.axisArea.append("text")
// 			.attr({
// 				x:c3.chartMargin.left,
// 				y:c3.getChartAreaHeight()+c3.chartMargin.top-10,
// 				"font-size":11
// 			})
// 			.text("↓成長率がマイナス")
// 	},
// 	//チャート上に各国のサークルを設置（初期処理）
// 	addHiddenCircle:function(year){
		
				
// 		//サークルグループを設置
// 		c3.circleGroup= c3.chartArea.selectAll(".countryCircle")
// 			.data(c3.obj2array(year))
// 			.enter()
// 			.append("g")
// 			.attr("class", "countryCircle")
// 			.attr("transform", function(d){
// 				return "translate(" + [c3.popScale (d.population), c3.growthrateScale(d.growthrate)] + ")";
// 			})
			
			
// 		//初期データを元に各国のサークルをチャート上に設置（非表示）
// 		c3.circleElement = c3.circleGroup.append("circle")
// 			.attr({
// 				"r":function(d){ return c3.gdpScale(d.gdp) }
// 			})
// 			.attr("fill", function(d){ return c3.circleColor[d.country] }) //サークルの国別カラーを反映
// 			.attr("stroke", function(d){ return c3.circleColor[d.country] }) //サークルの国別カラーを反映
			
// 		//初期データを元に各国の国名ラベルを表示
// 		c3.labelElemnt = c3.circleGroup.append("text")
// 			.attr({
// 				"text-anchor":"middle",
// 				"dominant-baseline":"middle",
// 				y: function(d){ return c3.gdpScale(d.gdp) + 16  }
// 			})
// 			.text(function(d){ return d.country ;})
		
// 		//初期データを元に年代ラベルを表示
// 		c3.generationLabel1.text(year)
// 		// c3.generationLabel2.text("年")

// 	},
// 	//凡例を追加する
// 	addLegend:function(){
		
// 		var legendInterval = [100, 1000, 5000];
// 		var legendIntervalMax = d3.max(legendInterval);
		
// 		var legendGroup = c3.chartArea.append("g")
// 			.attr("transform", "translate("+[
// 						c3.getChartAreaWidth() - c3.gdpScale(legendIntervalMax) -90,
// 				    c3.svgWidth <= 480 ? c3.getChartAreaHeight()-c3.gdpScale(legendIntervalMax)-7 : c3.getChartAreaHeight()-c3.gdpScale(legendIntervalMax)-5
// 					]+ ")") //表示位置をステージ下位に移動		
// 			.attr("class","legend-area")
			
// 		legendGroup.selectAll("circle")
// 			.data(legendInterval)
// 			.enter()
// 			.append("circle")
// 			.attr({
// 				"r": c3.gdpScale,
// 				"cy":function(d){ return c3.gdpScale(legendIntervalMax)-c3.gdpScale(d) },
// 				"stroke":"#ddd",
// 				"fill":"none"
// 			});
			
// 		legendGroup.selectAll("line")
// 			.data(legendInterval)
// 			.enter()
// 			.append("line")
// 			.attr({
// 				x1:0,
// 				y1:function(d){ return c3.gdpScale(legendIntervalMax) -c3.gdpScale(d)*2 },
// 				x2:60,
// 				y2:function(d){ return c3.gdpScale(legendIntervalMax) -c3.gdpScale(d)*2 },
// 			});
			
// 		legendGroup.selectAll("text")
// 			.data(legendInterval)
// 			.enter()
// 			.append("text")
// 			.attr({
// 				"dominant-baseline":"middle",				
// 				x:63,
// 				y:function(d){ return c3.gdpScale(legendIntervalMax) -c3.gdpScale(d)*2 },
// 				dy:2
// 			})
// 			.text(function(d){ return d + "兆ドル"})
					
// 		legendGroup.append('text')
// 			.attr('text-anchor', 'middle')
// 			.attr('y', -16)
// 			.text('GDP');
			
// 	},
// 	//各要素にイベントを設定
// 	setEvent:function(){
// 		//スライドバーにチェンジイベントを束縛する		
// 		$("#c3-slider").on('slide',function(d){
// 			c3.update(d.value);
// 		});
		
// 		//再生・停止ボタンにトグルイベントを束縛する
// 		$("#c3-btton").on("click",
// 				toggle(
// 				function(){
// 					 $("#c3-stop-button").show();
// 					 $("#c3-play-button").hide();
// 					 c3.loopStopFlag = false;
// 	            },
// 				function(){
// 					 $("#c3-stop-button").hide();
// 					 $("#c3-play-button").show();
// 					 c3.loopStopFlag = true;
// 				}
// 			))
		
// 		//各国のサークルにマウスオーバーイベントを束縛
// 		var tooltip = d3.select(c3.svg.node().parentNode)
// 			.append("div")
// 			.attr("class","chart3-tooltip")
// 			.style("position", "absolute")
			
// 		c3.circleGroup			.on('mouseover', function(d) { return tooltip.style("visibility", "visible"); })
// 			.on("mousemove", function(d){
// 				return tooltip
// 					.html([
// 						'<div class="tooltip_container">',
// 							'<h4>', d.country , '</h4>',
// 							'<div class="amount_title">人口：</div><div class="amount_value">', c3.fmt1(d.population) ,'<span>千人</span></div>',
// 							'<div class="amount_title">GDP：</div><div class="amount_value">', c3.fmt2(d.gdp) ,'<span>兆ドル</span></div>',
// 						'</div>'
// 					].join(''))
// 					.style("top", c3.svgWidth <= 480 ? (d3.event.pageY - 108) + "px" : (d3.event.pageY - 140) + "px")
// 					.style("left",c3.svgWidth <= 480 ? (d3.event.pageX - 82) + "px" : (d3.event.pageX - 100) + "px");
// 			})
// 			.on('mouseout', function(d) { return tooltip.style("visibility", "hidden"); });				
				
				
// 		//トグル処理を行うためのヘルパー関数
// 		function toggle(){
// 			var fn = arguments;
// 			var l = arguments.length;
// 			var i = 0;
// 			return function(){
// 				if(l <= i) i=0;
// 				fn[i++]();            
// 			}
// 		}
	
		
// 	},
// 	update:function(year){
// 		//チャートをアップデートする
// 		c3.circleGroup
// 			.data(c3.obj2array(year), function(d){ return d.country })
// 			.enter()
// 			.append("g")
// 			.attr("class", "countryCircle")
		
// 		//表示年代が2015年を超えていたら、クラス名estimatを付加する
// 		if(year > 2015){ c3.chartArea.selectAll(".countryCircle").classed("estimat", true); }
// 		else { c3.chartArea.selectAll(".countryCircle").classed("estimat", false); }
			
// 		c3.circleGroup
// 			.transition() // サークルのアップデート時のトランジション
// 			.attr("transform", function(d){
// 				return "translate(" + [c3.popScale (d.population), c3.growthrateScale(d.growthrate)] + ")";
// 			});

// 			c3.circleElement.data(c3.obj2array(year), function(d){ return d.country });
// 			c3.labelElemnt.data(c3.obj2array(year), function(d){ return d.country });
			
// 			c3.circleElement.attr({
// 				"r":function(d){  return c3.gdpScale(d.gdp) }
// 			})
// 			c3.labelElemnt.attr({
// 				"y":function(d){ return c3.gdpScale(d.gdp) + 16 }
// 			})

			
			
// 		//年代ラベルを更新
// 		c3.generationLabel1.text(year)
		
			
// 	},
// 	loop:function(){
// 		//スライダーの最大値と最小値を取得する
// 		var data = $("#c3-slider").data();
// 		var max = data.sliderMax;
// 		var min = data.sliderMin;
		
// 		return function(){
// 			if(c3.loopStopFlag) return null;
// 			var currentValue = $("#c3-slider").slider('getValue');
// 			var nextValue = (currentValue == max ) ? min : currentValue+1;
// 			$("#c3-slider").slider('setValue', nextValue);
// 			c3.update(nextValue);
// 		}
// 	},
// 	//オブジェクトを配列にして返すヘルパー関数
// 	obj2array:function(year){
// 		// var total = c3.data[year]["total"];
		
		
// 		var reslut = Object.keys(c3.data[undefined])
// 			.filter(function(d){
				
				
// 				//表示する国を選別
// 				if(!c3.showCountry.some(function(v){ return v === d })) return false;

// 				if(c3.data[year][d].gdp > 0) return true;
// 			})				
// 			.map(function(d){
// 				var tmp = c3.data[year][d];				
// 				tmp.country = d;
// 				return tmp
// 			})
// 			//iphoneだとなぜかsortが効かない
// 			.sort(function(a, b){
// 				return b.gdp - a.gdp; //gdp降順で並べ替え
// 			});
			
// 		return reslut;
	
	
// 	},
// 	//非同期通信をまとめるためのヘルパー関数
// 	loadDataSet: function (option){
// 		var files = option["files"];
// 		var endFn = option["endFn"];
// 		var loadingStartFn = option["loadingStartFn"];
// 		var loadingSuccessFn = option["loadingSuccessFn"];
		
// 		if (!Array.isArray(files)) throw "TypeError: files is not a array!";
// 		if (loadingStartFn && typeof loadingStartFn != "function") throw "TypeError: loadingStartFn is not a function!";
// 		if (loadingSuccessFn && typeof loadingSuccessFn != "function") throw "TypeError: loadingSuccessFn is not a function!";
// 		if (typeof endFn != "function") throw "TypeError: endFn is not a function!";
		
// 		var dataStack = {}; //読み込んだデータを保存するスタック
// 		var fnStack = []; //データ読み込みに必要なajax関数を保存するスタック
		
// 		//非同期通信処理をチェインを使って順次実行する。各ファンクションにコールバックを仕込む
// 		var chain = function(functions) {
// 			return functions.reduceRight(function (next, curr) {
// 				return function () {
// 					curr.apply({next: next}, arguments);
// 				}
// 			});
// 		}
		
// 		//ファイルの数だけ非同期処理fanctionをスタックに積む
// 		files.forEach(function(arg){
// 			if (loadingStartFn) loadingStartFn(arg);
// 			fnStack.push(
// 				function() {
// 					var that = this;
					
// 					var exte = arg.file.split("?")[0].split(".")[arg.file.split(".").length-1];
					
// 					if (arg.filetype) exte = arg.filetype; 
// 					var readfile;
// 					switch(exte){
// 						case "json": case "geojson": case "topojson": 
// 							readfile = d3.json;
// 						break;
// 						case "csv":
// 							readfile = d3.csv;
// 						break;
// 						case "tsv":
// 							readfile = d3.tsv;
// 						break;
// 						default:
// 							throw "TypeError: " + exte + " is not supported";
// 						break;                        
// 					}
					
// 					return readfile(arg.file,  function(data){
// 						if (arg.callbackData) arg.callbackData = data;
// 						if (loadingSuccessFn) loadingSuccessFn(arg);
// 						dataStack[arg.key] = data;
// 						that.next();
// 					});
// 				}
// 			)
// 		});
		
// 		//スタックの最後にendFnを追加する
// 		fnStack.push(function(){
// 			endFn(dataStack);
// 		});
		
// 		//チェイン処理実行
// 		chain(fnStack)(); 
			
// 		}
// };


//スライドバー初期化
	// c3.slideBarInit();
	
	//マージンを再設定
	// c3.marginInit(); // chart要素のサイズに合わせて変更する
	
	//各種要素のサイズ初期設定
	// c3.sizeInit();

	//データセットをダウンロード
	// c3.loadDataSet({
	// 	files:[
	// 		{key:'population', file:"./population.csv"},
	// 		{key:'gdp', file:"./gdp.csv"},			
	// 		{key:'growthrate', file:"./growthrate.csv"},			
	// 	],
	// 	endFn:main3
	// })
	
	function main3(rawData) {

		//生ーデータをコンバート
		c3.dataInit(rawData);

		//スケールと軸を表示		
		c3.scaleInit();
		
		c3.addAixs();

		c3.addLegend();
		
		//ステージにサークルを追加
		c3.addHiddenCircle(1980); //初期表示年数
		
		//イベントリスナーを各要素に束縛
		c3.setEvent();

		//自動再生機能の監視
		setInterval(c3.loop(), 1000)
    }









		// Word Cloud
		api.word((data)=>{
			word_cloud.showCloud(data);
		});

		// Bubble Chart
		setTimeout(function(){
			api.words((data)=>{
				bubble.showBubbleChart(data.most_common_words);
			});
		}, 200);

		// Bar Chart
		setTimeout(function(){
			// api.notebook((data)=>{
			api.wordsForYear((data)=>{
				stackedBarChart();
				$('.toggle_status').show();
			});
		}, 500);
	});

	$('.auth').on('click', e => {
		e.preventDefault();
		utils.auth(e);
	});
	$("#switch").on("click", e => {
		utils.change(e, data =>{
			bar.draw(data);
		});
	});
	$('.status').on('click', e => {
		e.preventDefault();
		$('.active').removeClass('active');
		var className = e.target.parentElement.className;
		if (className.indexOf('personal') != -1){
			en_status = 'personal';
		} else {
			en_status = 'business';
		}
		var n2data = {};
		var ndata = {};
		var bdata = {};
		if (en_status == 'personal'){
			$('.status.nav_personal').addClass('active');
			bdata = notebook_data.personal;
			n2data = notes_data.personal;
			ndata = note_data.personal;
		} else {
			$('.status.nav_business').addClass('active');
			bdata = notebook_data.business;
			n2data = notes_data.business;
			ndata = note_data.business;
		}
		// bar.draw(bdata);
		bubble.showBubbleChart(n2data.most_common_words);
		word_cloud.showCloud(ndata);
	});
}



$( document ).ready(() => {
	main();
});
