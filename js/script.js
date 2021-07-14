var data = d3.range(500).map(d3.randomBates(10));

var svg = d3.select("svg");
var width = svg.attr("width");
var height = svg.attr("height") - 50;
var g = DragEvent.append("g");