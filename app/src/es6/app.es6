'use strict';
import console from 'console';
import d3 from 'd3';
import $ from 'jquery';

/**
 */
var base_url = 'http://localhost:8004';
// var base_url = '';

var en_status = '';
var notebook = {};

function main(){
	info();	
	$('#auth').on('click', function(e){
          e.preventDefault();
          var url = $(e.target).attr('href');
          if (url.indexOf('logout')!=-1) window.localStorage.clear();
          window.location.href = url;
	});
	$("#switch").on("click", function(e) {
		var id = $('.notebook_box option:selected').attr('id');
		var data = {};
		if (id == 'personal'){
			data = notebook.personal;
		} else {
			data = notebook.business;
		}
		if (e.target.className == 'normal'){
    		data = _.sortBy(data, function(a){return a.count}).reverse();
			$(e.target).attr('class', 'sort');
		} else {
			$(e.target).attr('class', 'normal');
		}
		draw(data);
	});
	$('.notebook_box').on('change', function(e){
		var data = {};
		if(e.target.selectedIndex == 0){
			data = notebook.personal;
		} else {
			data = notebook.business;
		}
		draw(data);
	});

	$('#wordsBtn').on('click', function(e){
		e.preventDefault();
		getWords();
	});
}

function truncateName(arr){
	for (var i=0; i<arr.length; i++){
		var notebook = arr[i];
		notebook.name = notebook.name.length > 10 ? notebook.name.substring(0,10)+'...' : notebook.name;
	}
	return arr;
}

function info(){
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
				en_status = response;
				document.cookie = 'csrftoken=' + response.csrf_token;
				window.localStorage.setItem('access_token', response.access_token);
				window.localStorage.setItem('business_token', response.business_token);
				notebook = response.notebook;
				var data = truncateName(notebook.personal);
				draw(data);
			}
		}
	});
}

function getWords(){
	$.ajax({
		type: 'POST',
		xhrFields: { withCredentials: true },
		beforeSend: function(xhr, settings) {
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    	},
		url: base_url + '/words/',
		data: {
			'access_token': window.localStorage.getItem('access_token'),
			'business_token': window.localStorage.getItem('business_token')
		},
		dataType: 'json',
		success: function(response) {
			console.log(response);
		}
	});	
}

function draw(data){
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

function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
          var cookie = jQuery.trim(cookies[i]);
          // Does this cookie string begin with the name we want?
          if (cookie.substring(0, name.length + 1) == (name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
          }
      }
  }
return cookieValue;
}


$( document ).ready(function() {
	main();
});
