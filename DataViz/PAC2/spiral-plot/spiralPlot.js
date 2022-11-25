(function (d3) {
  'use strict';

  const width = 700;
  const height = 700;
  const start = 0;
  const end = 2.25;
  const numSpirals = 2;
  const theta = function(r) {
    return numSpirals * Math.PI * r;
  };
  const margin = 75;
  const r = d3.min([width, height]) / 2 - margin;
  const radius = d3.scaleLinear()
    .domain([start, end])
    .range([margin, r]);

  const svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  // create the spiral, borrowed from http://bl.ocks.org/syntagmatic/3543186
  const points = d3.range(start, end + 0.001, (end - start) / 1000);

  const spiral = d3.radialLine()
    .curve(d3.curveCardinal)
    .angle(theta)
    .radius(radius);

  const path = svg.append("path")
    .datum(points)
    .attr("id", "spiral")
    .attr("d", spiral)
    .style("fill", "none")
    .style("stroke", "steelblue");

  const spiralLength = path.node().getTotalLength();

  const parseRow = (d) => {
    d.date = new Date(parseInt(d.year), 0, 1);
    d.ghg_emissions = parseFloat(d.ghg_emissions);
    return d;
  };

  const main = async (emissions) => {
    var N = emissions.length;
    const barWidth = (spiralLength / N) - 1;

    var parsedEmissions = [];
    var totalEmissions = 0;
    var totalIncrease = 0;
    for (var i = 0; i < N; i++) {
      var value = 0;
      if (i > 0) {
        value = emissions[i].ghg_emissions - emissions[i - 1].ghg_emissions;
        totalIncrease += value;
      }
      parsedEmissions.push({
        date: emissions[i].date,
        emissions: emissions[i].ghg_emissions,
        value: value,
        aboveAverageEmissions: false,
        aboveAverageIncrease: false
      });
      totalEmissions += parsedEmissions[i].emissions;
    }

    const averageEmissions = totalEmissions / N;
    const averageIncrease = totalIncrease / (N - 1);

    for (var i = 0; i < N; i++) {
      if (parsedEmissions[i].emissions > averageEmissions) {
        parsedEmissions[i].aboveAverageEmissions = true;
      }
      if (parsedEmissions[i].value > averageIncrease) {
        parsedEmissions[i].aboveAverageIncrease = true;
      }
    }

    // parsedEmissions = parsedEmissions.slice(1);
    // N -= 1;

    // here's our time scale that'll run along the spiral
    var timeScale = d3.scaleTime()
      .domain(d3.extent(parsedEmissions, function(d){
        return d.date;
      }))
      .range([0, spiralLength]);

    // yScale for the bar height
    var yScale = d3.scaleLinear()
      .domain([0, d3.max(parsedEmissions, function(d){
        return d.value;
      })])
      .range([0, (r / numSpirals) - (margin / 2)]);

    // append our rects
    const columns = svg.selectAll("rect")
      .data(parsedEmissions)
      .enter()
      .append("rect")
      .attr("x", function(d,i){

        // placement calculations
        var linePer = timeScale(d.date),
            posOnLine = path.node().getPointAtLength(linePer),
            angleOnLine = path.node().getPointAtLength(linePer - barWidth);

        d.linePer = linePer; // % distance are on the spiral
        d.x = posOnLine.x; // x postion on the spiral
        d.y = posOnLine.y; // y position on the spiral

        d.a = (Math.atan2(angleOnLine.y, angleOnLine.x) * 180 / Math.PI) - 90; //angle at the spiral position

        return d.x;
      })
      .attr("y", function(d){
        return d.y;
      })
      .attr("width", function(d){
        return barWidth;
      })
      .attr("height", function(d){
        return yScale(d.value);
      })
      .style("fill", function(d) {
        if (d.aboveAverageIncrease) {
          return "red";
        }
        return "steelblue";
      })
      .style("stroke", "none")
      .attr("transform", function(d){
        return "rotate(" + d.a + "," + d.x  + "," + d.y + ")"; // rotate the bar
      });

    // add date labels
    var tF = d3.timeFormat("%Y");
    svg.selectAll("text")
      .data(parsedEmissions)
      .enter()
      .append("text")
      .attr("dy", 20)
      .attr("dx", 10)
      .style("text-anchor", "start")
      .style("font", "bold 16px arial")
      .append("textPath")
      .text(function(d){
        return tF(d.date);
      })
      // place text along spiral
      .attr("xlink:href", "#spiral")
      .style("fill", "#222")
      .attr("startOffset", function(d){
        return ((d.linePer / spiralLength) * 100 - 100 / N) + "%";
      });

    svg.selectAll("dummy").data(parsedEmissions)
      .enter()
      .append("text")
      .attr("dy", -10)
      .attr("dx", 15)
      .style("text-anchor", "start")
      .style("font", "bold 14px arial")
      .append("textPath")
      .text(function(d){
        return d.value.toFixed(2);
      })
      // place text along spiral
      .attr("xlink:href", "#spiral")
      .style("fill", "#cecece")
      .attr("startOffset", function(d){
        return ((d.linePer / spiralLength) * 100 - 100 / N) + "%";
      });

    // Legend
    const legendPosX = -width / 2 + 20;
    const legendPosY = -height / 2 + 10;
    svg.append("circle").attr("cx", legendPosX).attr("cy", legendPosY).attr("r", 6).style("fill", "steelblue");
    svg.append("text").attr("x", legendPosX + 20).attr("y", legendPosY).text("Increment below average").style("font-size", "15px").style("font-weight", "bold").attr("alignment-baseline","middle");

    svg.append("circle").attr("cx", legendPosX).attr("cy", legendPosY + 30).attr("r", 6).style("fill", "red")
    svg.append("text").attr("x", legendPosX + 20).attr("y", legendPosY + 30).text("Increment above average").style("font-size", "15px").style("font-weight", "bold").attr("alignment-baseline","middle");

  };

  // Load data and call main once loaded
  d3.csv('ghg_emissions.csv', parseRow, main);
}(d3));
