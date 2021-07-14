(function(){

    //pseudo-global variables for data join
    var attrArray = ["1960","1965","1970","1975","1980","1985","1990","1995","2000","2005","2010","2015","2019"] //list of attributes
    var expressed = attrArray[0]; //initial attribute
    
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.43,
        chartHeight = 550,
        leftPadding = 70,
        rightPadding = 2,
        topBottomPadding = 50,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
    var yScale = d3.scale.linear()
        .range([485, 20])
        .domain([0, 2500000]);
    
    
          
    //begin script when window loads
    window.onload = setMap();
        
    //set up choropleth map
    function setMap(){
        
        //map frame dimensions
        var width = window.innerWidth * 0.45,
            height = 550;
    
    
        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
        //create Albers equal area conic projection centered on Asia
        var projection = d3.geo.mercator()
            .center([15, 1])
            .rotate([-2, 0, 0])
            .parallels([43, 62])
            .scale(320)
            .translate([width / 2, height / 2]);
    
        var path = d3.geo.path()
            .projection(projection);
    
        
        //use d3.queue to parallelize asynchronous data loading
        d3.queue()
            .defer(d3.csv, "data/migrant_data.csv") //load attributes from csv
            .defer(d3.json, "data/world.topojson") //load background spatial data
            .defer(d3.json, "data/asia.topojson") //load choropleth spatial data
            .await(callback);
        
        
    
        //Callback within setMap
    function callback(error, csv, world, asia){
            
            setGraticule(map, path);
        
            //translate world and Asia TopoJSONs
        var worldCountries = topojson.feature(world, world.objects.world);
         asianCountries = topojson.feature(asia, asia.objects.asia).features;
    
    
            //add world countries to map
        var countries = map.append("path")
                .datum(worldCountries)
                .attr("class", "countries")
                .attr("d", path);
            
        //join csv data to GeoJSON enumeration units
            asianCountries = joinData(asianCountries, csv);
    
            //create the color scale
            var colorScale = makeColorScale(csv);
    
        //add enumeration units to the map
            setEnumerationUnits(asianCountries, map, path, colorScale);
            setChart(csv, colorScale);
            createDropdown(csv)
            
            console.log(csv)
            console.log(asianCountries)
        };
    }; //end of setMap()

        
        
    function setGraticule(map, path){
            //create graticule generator
            var graticule = d3.geo.graticule()
                .step([15, 23.43679]); //place graticule lines every 5 degrees of longitude and latitude
            
            //create graticule background
            var gratBackground = map.append("path")
                .datum(graticule.outline()) //bind graticule background
                .attr("class", "gratBackground") //assign class for styling
                .attr("d", path) //project graticule
    
                        //create graticule lines
            var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
                .data(graticule.lines()) //bind graticule lines to each element to be created
                .enter() //create an element for each datum
                .append("path") //append each element to the svg as a path element
                .attr("class", "gratLines") //assign class for styling
                .attr("d", path); //project graticule lines
        };
        
       
        
    function joinData(asianCountries, csv){     
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csv.length; i++){
            var csvRegion = csv[i]; //the current region
            var csvKey = csvRegion.asia; //the CSV primary key
    
            //loop through geojson regions to find correct region
            for (var a=0; a<asianCountries.length; a++){
    
                var geojsonProps = asianCountries[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.asia; //the geojson primary key
    
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){
    
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
            
    return asianCountries;
        
    };
    
    
    function setEnumerationUnits(asianCountries, map, path, colorScale){
            //add Asian areas to map
            var areas = map.selectAll(".areas")
                .data(asianCountries)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "areas" + d.properties.asia;
                })
                .attr("d", path) 
                .style("fill", function(d){
                return choropleth(d.properties, colorScale);
                })
                .on("mouseover", function(d){
                highlight(d.properties);
                })
                .on("mouseout", function(d){
                dehighlight(d.properties)   
                })
                .on("mousemove", moveLabel);
            var desc = areas.append("desc")
            .text('{"stroke": "#444336", "stroke-width": "0.5px"}');
    };
        
        
        
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#fef0d9",
            "#fdcc8a",
            "#fc8d59",
            "#e34a33",
            "#b30000"
        ];
    
            //create color scale generator
        var colorScale = d3.scale.threshold()
            .range(colorClasses);
    
        
        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };
    
        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();
    
        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);
    
        return colorScale;
    };
    
          
        
    //function to test for data value and return color
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#d9d9d9";
        };
    };
        
    
      
    //function to create coordinated bar chart
    function setChart(csv, colorScale){
        //chart main frame dimensions
        var chartWidth = window.innerWidth * 0.45,
            chartHeight = 550,
            leftPadding = 65,
            rightPadding = 10,
            topBottomPadding = 69,
            chartInnerWidth = chartWidth - leftPadding - rightPadding-10,
            chartInnerHeight = chartHeight - topBottomPadding-14,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
        
        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    
        //create a scale to size bars proportionally to frame and for axis
        //stretches vertical scale bar
        var yScale = d3.scale.linear()
            .range([535, 70])
            .domain([0, 2500000]);
    
        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csv)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.WBA2016;
            })
            //width of actual vertical bars
            .attr("width", chartInnerWidth / csv.length - 2)  
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "1px"}');
    
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 10)
            .attr("y", 42)
            .attr("class", "chartTitle")
            
    
        //create vertical axis generator
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left");
    
        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
        //translate(65,0) to move the scale bar and numbers to the right 
        .attr("transform", "translate(65,0)")
            .call(yAxis);
    
        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
            //set bar positions, heights, and colors
        updateChart(bars, csv.length, colorScale); 
        
    };
    
       
        
    //function to create a dropdown menu for attribute selection
    function createDropdown(csv){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csv)
            });
    
        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Pick a year");
    
        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };
        
            
        
    //dropdown change listener handler
    function changeAttribute(attribute, csv){
        //change the expressed attribute
        expressed = attribute;
    
        //recreate the color scale
        var colorScale = makeColorScale(csv);
    
        //recolor enumeration units
        var areas = d3.selectAll(".areas")
            .transition()
            .duration(3000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            })
        
            //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(2000);
    
         updateChart(bars, csv.length, colorScale);
    };
    
        
    
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return chartHeight - 10 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){
                return choropleth(d, colorScale);
            })
        var chartTitle = d3.select(".chartTitle")
            .text([expressed] + " " + "Estimated Migrants");
    };
    
    
    
    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.asia)
            .style("stroke", "white")
            .style("stroke-width", "3");
        setLabel(props)
    };
    
        
        
     //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.asia)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });
    
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
    
            var styleObject = JSON.parse(styleText);
    
            return styleObject[styleName];
        };
        //below Example 2.4 line 21...remove info label
        d3.select(".infolabel")
            .remove();
    
    };
    
        
        
    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h4>In" + " <b>"+ expressed + "</b>, an estimated<br>" + " <b>" + props[expressed] + "</b> " + "migrants<br>originated from:<br></h4><b>";
    
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.asia + "_label")
            .html(labelAttribute);
    
        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.asia);
    };
    
        
        
    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 20,
            y1 = d3.event.clientY - 20,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 5;
    
        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1; 
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
        
        
    
    })();
    
    
    