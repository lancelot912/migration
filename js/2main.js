(function () {
  //pseudo-global variables
  var attrArray = ['All Speakers',
                  'Speaks Daily Within the Education System Only',
                  'Speaks Daily Within and Daily Outside the Classroom',
                  'Speaks Daily Within and Weekly Outside the Classroom',
                  'Speaks Daily Within and Less Often Outside the Classroom',
                  'Speaks Daily Within and Never Outside the Classroom',
                  'Speaks Daily (Not in Education System)',
                  'Speaks Weekly (Not in Education System)',
                  'Speaks Less Often (Not in Education System)',
                  'Never Speaks (Not in Education System)',
                ];
  var expressed = attrArray[0]; //initial attribute

  //chart frame dimensions
  var chartWidth = window.innerWidth * 0.425;
  var chartHeight = 443;
  var leftPadding = 60;
  var rightPadding = 2;
  var topBottomPadding = 5;
  var chartInnerWidth = chartWidth - leftPadding - rightPadding;
  var chartInnerHeight = chartHeight - topBottomPadding * 2;
  var translate = 'translate(' + leftPadding + ',' + topBottomPadding + ')';

  //create a scale to size bars proportionally to frame for axis
  var yScale = d3.scaleLinear()
    .range([chartHeight - 10, 0])
    .domain([30, 44 * 1.1]); //csv first column max = 44

  //begin script when window loads
  window.onload = setMap();

  //set up Ireland choropleth map
  function setMap() {

    //map frame dimensions
    var width = window.innerWidth * 0.5;
    var height = 960;

    //create new svg container for the map
    var map = d3.select('#mapArea')
      .append('svg')
      .attr('class', 'map')
      .attr('width', width)
      .attr('height', height);

    //create Albers equal area conic projection centered on Ireland
    var projection = d3.geoAlbers()
      .center([-8.026, 53.367])
      .rotate([0, 0, 0])
      .parallels([43, 62])
      .scale(11000)
      .translate([width / 2, height / 2]);

    var path = d3.geoPath()
      .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv('data/irishSpeakers1.csv')); //load attributes from csv
    promises.push(d3.json('data/UK.topojson')); //load background spatial data
    promises.push(d3.json('data/Ireland.topojson')); //load choropleth spatial data
    promises.push(d3.json('data/Gaeltacht.topojson')); //load gaeltach spatial data
    Promise.all(promises).then(callback);

    function callback(data) {
      [csvData, uk, ireland, gaeltacht] = data;

      //place graticule on the map
      setGraticule(map, path);

      //translate UK and Ireland TopoJSON
      var ukCountries = topojson.feature(uk, uk.objects.UK);
      var irelandCounties = topojson.feature(ireland, ireland.objects.IrelandRegions).features;
      var gaeltachtRegions = topojson.feature(gaeltacht, gaeltacht.objects.Gaeltacht);

      //add UK countries to map
      var countries = map.append('path')
        .datum(ukCountries)
        .attr('class', 'countries')
        .attr('d', path);

      //join csv data to geojson enumeration units
      irelandCounties = joinData(irelandCounties, csvData);

      //create the color scale
      var colorScale = makeColorScale(csvData);

      //add enumeration units to the map
      setEnumerationUnits(irelandCounties, map, path, colorScale);

      //add coordinated visualization to the map
      setChart(csvData, colorScale);

      //create dropdown option
      createDropdown(csvData);

      //add Gaeltacht regions to map
      var gRegions = map.append('path')
        .datum(gaeltachtRegions)
        .attr('class', 'regions')
        .attr('d', path);

      var caption = map.append('text')
        .attr('class', 'caption')
        .attr('x', width - 5)
        .attr('y', height - 10)
        .style('text-anchor', 'end')
        .html('Source: Ireland Central Statistics Office - 2016 Census');

      var mapTitle = map.append('text')
        .attr('class', 'maptitle')
        .attr('x', (width / 2))
        .attr('y', height - 920)
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('font-size', '1.5em')
        .text('Irish Speakers - Percent of County Population');
    }
  } //end of setMap()

  function setGraticule(map, path) {
    //create graticule generator
    var graticule = d3.geoGraticule()
      .step([5, 5]); //place the graticule lines every 5 degrees of longitude and latitude

    var gratBackground = map.append('path')
      .datum(graticule.outline()) //bind graticule background
      .attr('class', 'gratBackground') //assign class for styling
      .attr('d', path); //project graticule

    //create graticule lines
    var gratLines = map.selectAll('.gratLines') //select graticule elements that will be created
      .data(graticule.lines()) //bind graticule lines to each element to be created
      .enter() //create an element for each datum
      .append('path') //append each element to the svg as a path element
      .attr('class', 'gratLines') //assign class for styling
      .attr('d', path); //project graticule lines
  }

  function joinData(irelandCounties, csvData) {
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i = 0; i < csvData.length; i++) {
      var csvRegion = csvData[i]; //the current region
      var csvKey = csvRegion.GID; //the CSV primary key

      //loop through geojson regions to find correct region
      for (var a = 0; a < irelandCounties.length; a++) {

        var geojsonProps = irelandCounties[a].properties; //the current region geojson properties
        var geojsonKey = geojsonProps.GID; //the geojson primary key

        //where primary keys match, transfer csv data to geojson properties object
        if (geojsonKey == csvKey) {

          //assign all attributes and values
          attrArray.forEach(function (attr) {
            var val = parseFloat(csvRegion[attr]); //get csv attribute value
            geojsonProps[attr] = val; //assign attribute and value to geojson properties
          });
        }
      }
    }

    return irelandCounties;
  }

  function makeColorScale(data) {
    var colorClasses = [
      '#a7b69e',
      '#758d68',
      '#527142',
      '#274e13',
      '#0f1d07',
    ];

    //create color scale generator
    var colorScale = d3.scaleThreshold()
      .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i = 0; i < data.length; i++) {
      var val = parseFloat(data[i][expressed]);
      domainArray.push(val);
    }

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);

    //reset domain array to cluster minimums
    domainArray = clusters.map(function (d) {
      return d3.min(d);
    });

    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
  }

  //function to test for data value and return color
  function choropleth(props, colorScale) {
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);

    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)) {
      return colorScale(val);
    } else {
      return '#CCC';
    }
  }

  function setEnumerationUnits(irelandCounties, map, path, colorScale) {
    //...REGIONS BLOCK FROM MODULE 8
    //add Ireland Counties to map
    var counties = map.selectAll('.counties')
      .data(irelandCounties)
      .enter()
      .append('path')
      .attr('class', function (d) {
        return 'counties ' + d.properties.GID;
      })
      .attr('d', path)
      .style('fill', function (d) {
        return choropleth(d.properties, colorScale);
      })
      .on('mouseover', function (d) {
        highlight(d.properties);
      })
      .on('mouseout', function (d) {
        dehighlight(d.properties);
      })
      .on('mousemove', moveLabel);

    //add style descriptor to each path
    var desc = counties.append('desc')
      .text('{"stroke": "#fff", "stroke-width": "0.5px"}');
  }

  //function to create coordinated bar chart
  function setChart(csvData, colorScale) {

    //create a second svg element to hold the bar chart
    var chart = d3.select('#mapArea')
      .append('svg')
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('class', 'chart');

    //create a rectangle for chart background fill
    var chartBackground = chart.append('rect')
      .attr('class', 'chartBackground')
      .attr('width', chartInnerWidth)
      .attr('height', chartInnerHeight)
      .attr('transform', translate);

    //set bars for each province
    var bars = chart.selectAll('.bar')
      .data(csvData)
      .enter()
      .append('rect')
      .sort(function (a, b) {
        return b[expressed] - a[expressed];
      })
      .attr('class', function (d) {
        return 'bar ' + d.GID;
      })
      .attr('width', chartInnerWidth / csvData.length - 1)
      .on('mouseover', highlight)
      .on('mouseout', dehighlight)
      .on('mousemove', moveLabel);

    //add style descriptor to each rect
    var desc = bars.append('desc')
      .text('{"stroke": "none", "stroke-width": "0px"}');

    //create a text element for the chart title
    var chartTitle = chart.append('text')
      .attr('x', (chartInnerWidth / 2) + 35)
      .attr('y', 40)
      .attr('class', 'chartTitle')
      .style('text-anchor', 'middle')
      .text(expressed + ' by County (%)');

    var chartYear = chart.append('text')
      .attr('x', (chartInnerWidth / 2) + 35)
      .attr('y', 60)
      .attr('class', 'chartYear')
      .style('text-anchor', 'middle')
      .style('fill', '#999')
      .text('2016 Data');

    //create vertical axis generator
    var yAxis = d3.axisLeft()
      .scale(yScale);

    //place axis
    var axis = chart.append('g')
      .attr('class', 'axis')
      .attr('transform', translate)
      .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append('rect')
      .attr('class', 'chartFrame')
      .attr('width', chartInnerWidth)
      .attr('height', chartInnerHeight)
      .attr('transform', translate);

    //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);
  }

  //function to create a dropdown menu for attribute selection
  function createDropdown(csvData) {
    //add select element
    var dropdown = d3.select('#mapArea')
      .append('select')
      .attr('class', 'dropdown')
      .on('change', function () {
        changeAttribute(this.value, csvData);
      });

    //add initial option for dropdown
    var titleOption = dropdown.append('option')
      .attr('class', 'titleOption')
      .attr('disabled', 'true')
      .text('Select Map Option');

    //add attribute name options
    var attrOptions = dropdown.selectAll('attrOptions')
      .data(attrArray)
      .enter()
      .append('option')
      .attr('value', function (d) { return d; })
      .text(function (d) {return d; });
  }

  function changeAttribute(attribute, csvData) {
    //change the expressed attribute
    expressed = attribute;

    //change yscale dynamically
    csvmax = d3.max(csvData, function (d) { return parseFloat(d[expressed]); });

    csvmin = d3.min(csvData, function (d) { return parseFloat(d[expressed]); });

    console.log(csvmax);

    yScale = d3.scaleLinear()
      .range([chartHeight - 10, 0])
      .domain([csvmin * 0.75, csvmax * 1.1]);

    //update vertical axis
    d3.select('.axis').remove();
    var yAxis = d3.axisLeft()
      .scale(yScale);

    //place the axis
    var axis = d3.select('.chart')
      .append('g')
      .attr('class', 'axis')
      .attr('transform', translate)
      .call(yAxis);

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var counties = d3.selectAll('.counties')
      .transition()
      .duration(1000)
      .style('fill', function (d) {
        return choropleth(d.properties, colorScale);
      });

    //re-sort, resize, and recolor bars
    var bars = d3.selectAll('.bar')
      .sort(function (a, b) {
        return b[expressed] - a[expressed];
      })
      .transition() //add animation
      .delay(function (d, i) {
        return i * 20;
      })
      .duration(500);

    updateChart(bars, csvData.length, colorScale);
  }

  //function to position, size, and color bars in chart
  function updateChart(bars, n, colorScale) {
    //position bars
    bars.attr('x', function (d, i) {
        return i * (chartInnerWidth / n) + leftPadding;
      })

      //size or resize bars
      .attr('height', function (d, i) {
        return 963 - yScale(parseFloat(d[expressed]));
      })
      .attr('y', function (d, i) {
        return yScale(parseFloat(d[expressed])) + topBottomPadding;
      })

      //color/recolor bars
      .style('fill', function (d) {
        return choropleth(d, colorScale);
      });

    //add text to chart title
    var chartTitle = d3.select('.chartTitle')
      .text(expressed + ' (%)');
  }

  //function to highlight enumeration units and bars
  function highlight(props) {
    //change stroke
    var selected = d3.selectAll('.' + props.GID)
      .style('stroke', 'darkorange')
      .style('stroke-width', '3');

    setLabel(props);
  }

  //function to reset the element style on mouseout
  function dehighlight(props) {
    var selected = d3.selectAll('.' + props.GID)
      .style('stroke', function () {
        return getStyle(this, 'stroke');
      })
      .style('stroke-width', function () {
        return getStyle(this, 'stroke-width');
      });

    //remove info label
    d3.select('.infolabel')
      .remove();

    function getStyle(element, styleName) {
      var styleText = d3.select(element)
        .select('desc')
        .text();

      var styleObject = JSON.parse(styleText);

      return styleObject[styleName];
    }
  }

  //function to create dynamic label
  function setLabel(props) {
    //label content
    var labelAttribute = '<h1>' + props[expressed] + '%</h1>' + expressed;

    //create info label div
    var infolabel = d3.select('#mapArea')
      .append('div')
      .attr('class', 'infolabel')
      .attr('id', props.GID + '_label')
      .html(labelAttribute);

    var regionName = infolabel.append('div')
      .attr('class', 'labelname')
      .html('County ' + props.NAME);

  }

  //function to move info label with mouse
  function moveLabel() {
    //get width of label
    var labelWidth = d3.select('.infolabel')
      .node()
      .getBoundingClientRect()
      .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10;
    var y1 = d3.event.clientY - 75;
    var x2 = d3.event.clientX - labelWidth - 10;
    var y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;

    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select('.infolabel')
      .style('left', x + 'px')
      .style('top', y + 'px');
  }

})(); //last line of main.js
