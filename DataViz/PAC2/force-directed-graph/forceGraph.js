(function (d3) {
  'use strict';

  const width = 600;//window.innerWidth;
  const height = 600;//window.innerHeight;
  const centerX = width / 2;
  const centerY = height / 2;

  const svg = d3.select('#canvas')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const parseRow = (d) => {
    return d;
  };

  const nodeColor = (d) => {
    if (d.segment == 1) {
      return "blue";
    } else if (d.segment == 2) {
      return "orange"
    } else {
      return "red";
    }
  }
  const main = async () => {
    const [nodes, links] = await Promise.all([
      d3.csv('customers.csv', parseRow),
      d3.csv('transactions.csv', parseRow),
    ]);

    const simulation = d3.forceSimulation(nodes)
      .force(
        'charge',
        d3.forceManyBody()
          .strength(-200)
          .distanceMax(200)
      )
      .force(
        'link',
        d3.forceLink(links)
          .id(function (d) {
            return d.id;
          })
          .distance(130)
      )
      .force(
        'center',
        d3.forceCenter(centerX, centerY)
      )
      .force(
        'collision',
        d3.forceCollide().radius(30)
      );

    const dragInteraction = d3.drag().on(
      'drag',
      (event, node) => {
        node.fx = event.x;
        node.fy = event.y;
        simulation.alpha(1);
        simulation.restart();
      }
    );

    const lines = svg
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', 'grey');

    const circles = svg
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr("r", function(d) {
        d.weight = links.filter(function(l) {
          return l.source.index == d.index || l.target.index == d.index
        }).length;
        const minRadius = 10;
        return minRadius + (d.weight * 2);
      })
      .attr('fill', nodeColor)
      .attr('stroke', 'MediumSeaGreen')
      .call(dragInteraction);

    const nodeText = svg
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('text-anchor', 'start')
      .attr(
        'alignment-baseline',
        'text-before-edge'
      )
      .style('pointer-events', 'none')
      .text((node) => node.id);

    simulation.on('tick', () => {
      circles
        .attr('cx', (node) => node.x)
        .attr('cy', (node) => node.y);
      nodeText
        .attr('x', (node) => node.x + 10 + node.weight)
        .attr('y', (node) => node.y + 10 + node.weight);
      lines
        .attr('x1', (link) => link.source.x)
        .attr('y1', (link) => link.source.y)
        .attr('x2', (link) => link.target.x)
        .attr('y2', (link) => link.target.y);
    });


    // Legend
    const legendPosX = 10;
    const legendPosY = 10;
    svg.append("circle").attr("cx", legendPosX).attr("cy", legendPosY).attr("r", 6).style("fill", "blue");
    svg.append("text").attr("x", legendPosX + 20).attr("y", legendPosY).text("Companies").style("font-size", "15px").attr("alignment-baseline","middle");

    svg.append("circle").attr("cx", legendPosX).attr("cy", legendPosY + 30).attr("r", 6).style("fill", "orange")
    svg.append("text").attr("x", legendPosX + 20).attr("y", legendPosY + 30).text("Retail Customers").style("font-size", "15px").attr("alignment-baseline","middle");

    svg.append("circle").attr("cx", legendPosX).attr("cy", legendPosY + 60).attr("r", 6).style("fill", "red");
    svg.append("text").attr("x", legendPosX + 20).attr("y", legendPosY + 60).text("Wealthy Customers").style("font-size", "15px").attr("alignment-baseline","middle");

  };

  main();

}(d3));
