// set the dimensions and margins of the graph
var margin = {
    top: 40,
    right: 20,
    bottom: 60,
    left: 50,
  };
var width = window.innerWidth * 0.375;
var height = 425 - margin.top - margin.bottom;

// parse the year
var parseTime = d3.timeParse('%Y');

// set the ranges
var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// define the 1st line
var valueline = d3.line()
  .curve(d3.curveMonotoneX)
  .x(function (d) {
    return x(d.date);
  })
  .y(function (d) {
    return y(d.Ireland);
  });

// define the 2nd line~
var valueline2 = d3.line()
  .curve(d3.curveMonotoneX)
  .x(function (d) {
    return x(d.date);
  })
  .y(function (d) {
    return y(d.Leinster);
  });

// define the 3rd line
var valueline3 = d3.line()
  .curve(d3.curveMonotoneX)
  .x(function (d) {
    return x(d.date);
  })
  .y(function (d) {
    return y(d.Munster);
  });

// define the 4th line
var valueline4 = d3.line()
  .curve(d3.curveMonotoneX)
  .x(function (d) {
    return x(d.date);
  })
  .y(function (d) {
    return y(d.Connacht);
  });

// define the 5th line
var valueline5 = d3.line()
  .curve(d3.curveMonotoneX)
  .x(function (d) {
    return x(d.date);
  })
  .y(function (d) {
    return y(d.Ulster);
  });

// append the svg obgect to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = d3.select('#linechart').append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// Get the data
d3.csv('data/histData.csv').then(function (data) {

  // format the data
  data.forEach(function (d) {
    d.date = parseTime(d.date);
    d.Ireland = +d.Ireland;
    d.Leinster = +d.Leinster;
    d.Munster = +d.Munster;
    d.Connacht = +d.Connacht;
    d.Ulster = +d.Ulster;
  });

  // Scale the range of the data
  x.domain(d3.extent(data, function (d) {
    return d.date;
  }));

  y.domain([0, d3.max(data, function (d) {
    return Math.max(d.Ireland, d.Leinster, d.Munster, d.Connacht, d.Ulster);
  }),
]);

  let title = svg.append('text')
    .attr('class', 'lineTitle')
    .attr('x', (width / 2))
    .attr('y', 15)
    .style('text-anchor', 'middle')
    .style('font-weight', 'bold')
    .html('Irish Speakers Since 1861');

  let subTitle = svg.append('text')
    .attr('class', 'subTitle')
    .attr('x', (width / 2))
    .attr('y', 35)
    .style('text-anchor', 'middle')
    .style('fill', '#999')
    .html('by Province');

  svg.append('text')
    .attr('class', 'legend')
    .attr('x', width)
    .attr('y', height - 5)
    .style('text-anchor', 'end')
    .html('Ireland (Country)');

  svg.append('text')
    .attr('class', 'legend')
    .attr('x', width)
    .attr('y', height - 25)
    .style('fill', '#b30000')
    .style('text-anchor', 'end')
    .html('Leinster');

  svg.append('text')
    .attr('class', 'legend')
    .attr('x', width)
    .attr('y', height - 45)
    .style('fill', '#e34a33')
    .style('text-anchor', 'end')
    .html('Munster');

  svg.append('text')
    .attr('class', 'legend')
    .attr('x', width)
    .attr('y', height - 65)
    .style('fill', '#fc8d59')
    .style('text-anchor', 'end')
    .html('Connacht');

  svg.append('text')
    .attr('class', 'legend')
    .attr('x', width)
    .attr('y', height - 85)
    .style('fill', '#fdcc8a')
    .style('text-anchor', 'end')
    .html('Ulster');

  // Add the valueline path.
  svg.append('path')
    .data([data])
    .attr('class', 'line')
    .attr('data-legend', function (d) { return d.name;})
    .style('stroke', 'black')
    .attr('d', valueline);

  // Add the valueline2 path.
  svg.append('path')
    .data([data])
    .attr('class', 'line')
    .attr('data-legend', function (d) { return d.name;})
    .style('stroke', '#b30000')
    .attr('d', valueline2);

  // Add the valueline3 path.
  svg.append('path')
    .data([data])
    .attr('class', 'line')
    .attr('data-legend', function (d) { return d.name;})
    .style('stroke', '#e34a33')
    .attr('d', valueline3);

  // Add the valueline4 path.
  svg.append('path')
    .data([data])
    .attr('class', 'line')
    .attr('data-legend', function (d) { return d.name;})
    .style('stroke', '#fc8d59')
    .attr('d', valueline4);

  // Add the valueline4 path.
  svg.append('path')
    .data([data])
    .attr('class', 'line')
    .attr('data-legend', function (d) { return d.name;})
    .style('stroke', '#fdcc8a')
    .attr('d', valueline5);

  // Add the X Axis
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(x));

  // text label for the x axis
  svg.append('text')
    .attr('transform', 'translate(' + (width / 2) + ',' +
                         (height + margin.top + 10) + ')')
      .style('text-anchor', 'middle')
      .text('Year');

  // Add the Y Axis
  svg.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y));

  // text label for the y axis
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left)
    .attr('x', 0 - (height / 2))
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .text('Irish Speakers (%)');

});
