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
		this.stop_words = [
			"a", "an", "and", "are", "as", "at", "be", "but", "by",
			"for", "if", "in", "into", "is", "it",
			"no", "not", "of", "on", "or", "such",
			"that", "the", "their", "then", "there", "these",
			"they", "this", "to", "was", "will", "with"
		];
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

function word_cloud(list){
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



function main(){
	var api = new Apis();
	var view = new View();
	var utils = new Utils();
	var bar = new BarChart();
	var bubble = new BubbleChart();
	api.info(() => {

		// Bubble Chart
		api.words((data)=>{
			bubble.showBubbleChart(data.most_common_words);
		});

		//Word Cloud
		api.word((data)=>{
			word_cloud(data);
		});

		//Bar Chart
		api.notebook((data)=>{
			bar.draw(data);
			$('.toggle_status').show();
		});
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
		bar.draw(bdata);
		bubble.showBubbleChart(n2data.most_common_words);
		word_cloud(ndata);
	});
}



$( document ).ready(() => {
	main();
});
