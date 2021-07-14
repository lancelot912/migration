(function(){
    //pseudo-global variables for data join
    var attrArray = ["1960","1965","1970","1975","1980","1985","1990","1995","2000","2005","2010","2015","2019"] //list of attributes
    var expressed = attrArray[0]; //initial attribute
    
    //chart frame dimensions
    var chartWidth = 475,
        chartHeight = 500,
        leftPadding = 50,
        rightPadding = 2,
        topBottomPadding = -5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
           chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scaleLinear()
        .range([chartHeight-10, 0])
        .domain([0, 65000]); //csv first column max = ~60000
    

//begin script when window loads
window.onload = setMap();

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        //lab has "responsive" design using window.innerWidth, but this works very poorly because the map and chart don't actually resize. Opted for fixed width.
        var width = 1050,
            height = 750;

        //create new svg container for the map
        var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //create Albers equal area conic projection centered on the US
    var projection = d3.geoAlbers()
        .center([-3.8, 36.5])
        .rotate([93, 0, 0])
        .parallels([45.00, 33.00])
        .scale(1000)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/migrant_data.csv") //load attributes from csv
        .defer(d3.json, "data/asia.json") //load background spatial data
        .await(callback);

    function callback(error, csv, asia){
        //translate states TopoJSON
        var asianCountries = topojson.feature(asia, asia.objects.countries).features;

        //call joinData() to join csv data to GeoJson enumeration units
        countriesJoin = joinData(csv, asianCountries);

        //create the color scale
        var colorScale = makeColorScale(csv);

        //call setEnumerationUnits() to add enumeration units to the map
        setEnumerationUnits(asianCountries, map, path, colorScale);
        
        //add coordinated viz to the map
        setChart(csv, colorScale);
        
        createDropdown(csv);

        
    } //end of the callback() function

} //end of setMap()

    function joinData(csv, asia){
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csv.length; i++){
        var csvRegion = csv[i]; //the current region
        var csvKey = csvRegion.name; //the CSV primary key

            //loop through geojson countries to find correct region
            for (var a=0; a<asia.length; a++){

                var geojsonProps = asia[a].properties; //the current countries geojson properties
                var geojsonKey = geojsonProps.name; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    }); //end of .forEach anonymous function
                } //end of if statement
            } //end of inner for loop
        } //end of outer for loop

        //console.log(us);
        return us;

} //end of joinData()

    function setEnumerationUnits(asianCountries, map, path, colorScale){
        //add US states to map
        var statesPath = map.selectAll(".countriesPath")
        .data(statesUS)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "countriesPath " + d.properties.name;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties,colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);
        
        //add style descriptor to each path
        var desc = countriesPath.append("desc")
        .text('{"stroke": "#443626", "stroke-width": "0.5px"}');
        
    } //end of setEnumerationUnits

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
        var colorScale = d3.scaleThreshold()
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


        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;

    } //end of makeColorScale()

    //function to test for data value and return color
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists and is not equal to zero, assign a color; otherwise assign gray; values designed as undisclosed in USDA dataset (D) or under 0.5 acres [(Z) or not included] have been assigned zero value in original CSV.
        if (typeof val == 'number' && !isNaN(val) && val !== 0){
            return colorScale(val);
        } else {
            return "#f3f1e7";
        };
    }; //end of choropleth
    
    //function to create coordinated bar chart
    function setChart(csv, colorScale){
        
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
                
        //set bars for each state
        var bars = chart.selectAll(".bars")
        .data(csv)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.name;
        })
        .attr("width", chartInnerWidth / csv.length - 1)
        .attr("width", chartInnerWidth / csv.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
        
    
        //create a text element for the chart title
        var chartTitle = chart.append("text")
        .attr("x", 120)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Acres of " + expressed + " grown");
        
        //create vertical axis generator
        var yAxis = d3.axisLeft()
        .scale(yScale)
        //.orient("left");

        //place axis
        var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);
        
        //create frame for chart border
        var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
        
        //set bar positions, heights, and colors
        updateChart(bars, csv.length, colorScale);
        
        //add style descriptor to each rect
        var desc = bars.append("desc")
        .text('{"stroke": "#444336", "stroke-width": "0px"}');
        
    }; //end of setChart()
    
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
        .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
        
    }; //end of createDropdown()
    
    //dropdown change listener handler
    function changeAttribute(attribute, csv){
        //change the expressed attribute
        expressed = attribute;
        
        // change yscale dynamically
        csvmax = d3.max(csv, function(d) { return parseFloat(d[expressed]); });
    
        yScale = d3.scaleLinear()
            .range([chartHeight - 10, 0])
            .domain([0, csvmax*1.1]);
        
        //updata vertical axis 
        d3.select(".axis").remove();
        var yAxis = d3.axisLeft()
        .scale(yScale);

        //place axis
        var axis = d3.select(".chart")
        .append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

        //recreate the color scale
        var colorScale = makeColorScale(csv);

        //recolor enumeration units
        var statesPath = d3.selectAll(".statesPath")
        .transition() //add animation
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
        
        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return 1 * 20
        })
        .duration(500);
        
        //set bar positions, heights, and colors
        updateChart(bars, csv.length, colorScale);
        
    }; //end of changeAttribute
    
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        
        bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        .attr("height", function(d){
            return chartHeight - 10 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
        
        var chartTitle = d3.select(".chartTitle")
        .text("Acres of " + expressed + " Grown");

    }; //end of update chart
    
     //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.name)
        .style("stroke", "#443626")
        .style("stroke-width", "3");
        
        setLabel(props);
        
    }; //end of highlight()
    
    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.name)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    
        //remove info label
        d3.select(".infolabel")
            .remove();

        function getStyle(element, styleName){
            var styleText = d3.select(element)
            .select("desc")
            .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
    }; //end of dehighlight()
    
    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + "acres of " +expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.state + "_label")
        .html(labelAttribute);
        
        var formatName = props.name.replace("_", " ");

        var regionName = infolabel.append("div")
        .attr("class", "labelname")
        //.html(props.name);
        .html(formatName);
        
    }; //end of setLabel()
    
    

    //function to move info label with mouse
    function moveLabel(){
        //use coordinates of mousemove event to set label coordinates
        var x = d3.event.clientX + 10,
            y = d3.event.clientY - 75;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
})(); //end of self-executing anonymous function wrap which moves pseudo-global variables to local scope