'use strict';
import console from 'console';
import d3 from 'd3';
import cloud from 'd3-cloud';
import $ from 'jquery';
import _ from 'lodash';

/**
 */
var base_url = 'http://localhost:8004';
// var base_url = '';

var en_status = '';
var notebook_data = {};
var note_data = {};


class Utils {
	constructor(){}
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
	selectChange(e, callback){
		if(e.target.selectedIndex == 0){
			en_status = 'personal';
		} else {
			en_status = 'business';
		}
		callback();
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
				$('#auth').attr('href', base_url + response.redirect_url +'?callback='+encodeURIComponent(window.location.href)).text(response.msg);
				if (response.status != 'redirect'){
					$("#menu").show();
					document.cookie = 'csrftoken=' + response.csrf_token;
					window.localStorage.setItem('access_token', response.access_token);
					window.localStorage.setItem('business_token', response.business_token);
					notebook_data = response.notebook;
					callback(notebook_data.personal);
					en_status = 'personal';
				}
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
				note_data = response.notes;
				var ndata = {};
				if (en_status == 'personal'){
					ndata = response.notes.personal;
				} else {
					ndata = response.notes.business;
				}
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
		width = 60 * data.length,
		height = 512;

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

		d3.selectAll("svg").remove();	
		var svg = d3.select("body").append("svg")
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

	showBubbleChart(){
		var diameter = 960,
		format = d3.format(",d"),
		color = d3.scale.category20c();

		var bubble = d3.layout.pack()
			.sort(null)
			.size([diameter, diameter])
			.padding(1.5);

		var svg = d3.select("body").append("svg")
			.attr("width", diameter)
			.attr("height", diameter)
			.attr("class", "bubble");

		d3.json("flare.json", function(error, root) {
			if (error) throw error;

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
				.style("fill", function(d) { return color(d.packageName); });

			node.append("text")
				.attr("dy", ".3em")
				.style("text-anchor", "middle")
				.text(function(d) { return d.className.substring(0, d.r / 3); });
			});

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

function main(){
	var api = new Apis();
	var view = new View();
	var utils = new Utils();
	var bar = new BarChart();
	var bubble = new BubbleChart();
	api.info(data => { 
		bar.draw(data);
	});
	$('#auth').on('click', e => {
		e.preventDefault();
		utils.auth(e);
	});
	$("#switch").on("click", e => {
		utils.change(e, data =>{
			bar.draw(data);
		});
	});
	$('.notebook_box').on('change', e => {
		utils.selectChange(e, function(){
			var ndata = {};
			var bdata = {};
			if (en_status == 'personal'){
				ndata = notebook_data.personal;
				bdata = note_data.personal;
			} else {
				ndata = notebook_data.business;
				bdata = note_data.business;
			}
			bar.draw(ndata);
			view.showResults(bdata);
		});
	});

	$('#wordsBtn').on('click', e => {
		e.preventDefault();
		api.words((ndata) => {
			// view.showResults(ndata);

			test(ndata[3].content.split(" "));
			// bubble.showBubbleChart();
		});
	});
}

function test(list){
	var fill = d3.scale.category20();

	var layout = cloud()
	    .size([500, 500])
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
  d3.select("body").append("svg")
      .attr("width", layout.size()[0])
      .attr("height", layout.size()[1])
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



$( document ).ready(() => {
	main();
});
