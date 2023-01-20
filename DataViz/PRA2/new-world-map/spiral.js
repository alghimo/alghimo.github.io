// From https://observablehq.com/@mootari/embedding-fonts-into-an-svg
async function toDataURL(url) {
    return new Promise(async(resolve, reject) => {
      const res = await fetch(url);
      if(!res.ok) return reject(`Error: ${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result);
    });
}

// From https://observablehq.com/@grahamsnyder/climate-spiral
async function getFontStyle(fontName, fontURL, fontType = 'woff2') {
    const fontData = await toDataURL(fontURL);
    return `
      @font-face {
        font-family: '${fontName}';
        src: url(${fontData}) format('${fontType}');
      }
    `
}

let getBarlowFontface = getFontStyle("Barlow-Light", "https://fonts.gstatic.com/s/barlow/v4/7cHqv4kjgoGqM7E3p-ks51ostz0rdg.woff2")

function ClimateSpiral (d3, containerId, width, monthlyTemps, barlow_fontface) {

    let chart_width = width
    let chart_height = chart_width
    let margin = 0.05 * chart_width
    let innerRadius = chart_width / 8
    let outerRadius = chart_width / 2 - margin
    const minAnomaly = monthlyTemps.reduce((previous, current) => {
        return current.anomaly < previous.anomaly ? current : previous;
    }).anomaly;
    const maxAnomaly = monthlyTemps.reduce((previous, current) => {
        return current.anomaly > previous.anomaly ? current : previous;
    }).anomaly;

    let theta = d3.scaleUtc()
        .domain([Date.UTC(0, 0, 1), Date.UTC(1, 0, 1) - 1])
        .range([0, 2 * Math.PI])

    let r = d3.scaleLinear()
        .domain([minAnomaly, maxAnomaly])
        .range([innerRadius, outerRadius])

    let radialColour = (context, alpha=1) => {
        let interpolateColScheme = d3.interpolateRgbBasis(d3.schemeRdBu[10])
        let colour = d3.scaleDiverging(interpolateColScheme)
        .domain([minAnomaly, 0, maxAnomaly].reverse())
        let grd = context.createRadialGradient(0,0, r(colour.domain()[0]), 0, 0, r(colour.domain()[2]))
        let stops = 50
        for (let i = 0; i <= stops; i ++){
            let stop = i/stops;
            grd.addColorStop(stop, d3.color(interpolateColScheme(stop)).copy({opacity:alpha}))
        }

        return grd
    }

    let container = d3.select("#" + containerId)
    container.append("figure").attr("id", `${containerId}-main-figure`)
    let mainFigure = d3.select(`#${containerId}-main-figure`)
    let axes = mainFigure.append("svg")
        .attr("viewBox", [-chart_width / 2, -chart_height / 2, chart_width, chart_height])
        .attr("width", chart_width)
        .attr("height", chart_height)
        .style("left", "0px")
        .style("top", "0px")
        .style("z-index", 0)
        .style("position", "relative")

    var numMonths = 0
    let getId = (name) => {
        return `${containerId}-${name}-` + ++numMonths
    }
    let thetaAxis = g => g
        .call(g => g.append('style').text(barlow_fontface))
        .attr('font-family',  "Barlow-Light")
        .attr("font-size", outerRadius/20)
        .call(g => g.selectAll("g")
        .data(theta.ticks())
        .join("g")
            .each((d, i) => d.id = getId("month"))
            .call(g => g.append("path")
                .attr("stroke", "#000")
                .attr("stroke-opacity", 0.2)
                .attr("d", d => `
                M${d3.pointRadial(theta(d), innerRadius)}
                L${d3.pointRadial(theta(d), outerRadius)}
                `))
            .call(g => g.append("path")
                .attr("id", d => d.id)
                .datum(d => [d, d3.utcMonth.offset(d, 1)])
                .attr("fill", "none")
                .attr("d", ([a, b]) => `
                M${d3.pointRadial(theta(a), outerRadius)}
                A${outerRadius},${outerRadius} 0,0,1 ${d3.pointRadial(theta(b), outerRadius)}
                `))
            .call(g => g.append("text")
                .append("textPath")
                .attr("startOffset", 12)
                .attr("font-size", "14px")
                .attr("xlink:href", d => "#" + d.id)
                .text(d3.utcFormat("%B"))))

    let maxAnomalyTextId = `${containerId}-max-anomaly-text`
    let maxAnomalyTextShadowId = `${containerId}-max-anomaly-text-shadow`
    let addCircle = (g, maxAnomaly) => {
        color = "#f00"
        opacity = 0.2
        if (!d3.select("#" + maxAnomalyTextId).empty()) {
            d3.select("#" + maxAnomalyTextId).node().remove()
            d3.select("#" + maxAnomalyTextShadowId).node().remove()
        }

        g.append("text")
            .attr("id", maxAnomalyTextId)
            .attr("x", "0")
            .attr("font-size", "18")
            .attr("y", -r(maxAnomaly))
            .attr("dy", "0.35em")
            .attr("stroke", "#f00")
            .attr("stroke-width", 4)
            .text(`${maxAnomaly.toFixed(2)}°C`)
            .attr("font-size", 24)
            .clone(true)
            .attr("id", maxAnomalyTextShadowId)
            .attr("fill", "currentColor")
            .attr("stroke", "none")
    }

    let rAxisId = `${containerId}-r-axis`
    let rAxisSelector = `#${rAxisId}`
    var rAxisDataTicks
    if (maxAnomaly - 2 > 3) {
        rAxisDataTicks = [maxAnomaly - 2, 2, 0, -2, minAnomaly]
    } else {
        rAxisDataTicks = [2, 0, -2, minAnomaly]
    }

    let rAxis = g => g
        .call(g => g.append('style').text(barlow_fontface))
        .attr('font-family',  "Barlow-Light")
        .attr("text-anchor", "end")
        .attr("font-size", outerRadius/15)
        .call(g => g.selectAll("g")
            .data(rAxisDataTicks)
            .join("g")
            .attr("fill", "none")
            .call(g => g.append("circle")
                .attr("stroke", "#000")
                .attr("stroke-opacity", 0.2)
                .attr("r", r))
            .call(g => g.append("text")
                .attr("x", "-0.5em")
                .attr("y", d => -r(d))
                .attr("dy", "0.35em")
                .attr("stroke", "#fff")
                .attr("stroke-width", 4)
                .text((x, i) => `${x.toFixed(1)}${i ? "" : "°C"}`)
                .clone(true)
                .attr("fill", "currentColor")
                .attr("stroke", "none")))

    let yearId = `${containerId}-year`
    let yearSelector = `#${yearId}`
    let getYearDisplay = data => {
        let yearDisplay = text => {
            text
                .attr("id", yearId)
                .call(g => g.append('style').text(barlow_fontface))
                .attr("font-family",  "Barlow-Light")
                .attr("font-size", 0.5*innerRadius)
                .attr("y", 0)
                .attr("fill", "#444")
                .attr("dominant-baseline", "central")
                .attr("text-anchor", "start")
            .attr("visibility", "visible")

            text
                .text(data.slice(-2)[0].year)

            let length = axes.select(yearSelector).node().getBBox().width

            text
                .attr("x", -length*0.5)
                .attr("fill-opacity", 1)
                .text("")
        }

        return yearDisplay
    }

    let drawSeg = (context, data_slice) => {
        context.beginPath()
        let fn = d3.lineRadial()
            .context(context)
            .curve(d3.curveCatmullRomOpen)
            .angle(d => theta(Date.UTC(0, d.date.getMonth(), 0)))
            .radius(d => r(d.anomaly))

        let line = fn(data_slice)

        context.stroke()

        return line
    }

    let newContext = function () {
        var canvas = document.createElement("canvas");
        canvas.width = chart_width;
        canvas.height = chart_height;
        canvas.style.width = chart_width + "px";

        const context = canvas.getContext("2d");
        context.translate(chart_width/2, chart_height/2);
        context.lineWidth = 1.5;
        context.globalCompositeOperation = "multiply";

        return context
    }

    let contexts = ({
        static: newContext(),
        dynamic: newContext()
    })

    let getCanvases = () => {
        let canvases = {
            static: contexts.static.canvas,
            dynamic: contexts.dynamic.canvas
        }

        for (let [name, canvas] of Object.entries(canvases)) {
            d3.select(canvas)
                .style("position", "absolute")
                .style("left", "0px")
                .style("top", "0px")
                .style("mix-blend-mode", "multiply")
        }

        d3.select(canvases.static).style("z-index", 10)

        d3.select(canvases.dynamic).style("z-index", 11)

        return canvases
    }

    const canvases = getCanvases()

    mainFigure.node().appendChild(canvases.static)
    mainFigure.node().appendChild(canvases.dynamic)

    let newDOM = () =>  {
        const custom = d3.create("custom")

        custom.selectAll("custom.pathlist")
            .data([{name: "dynamic"}, {name: "static"}])
            .join("custom")
                .attr("class", "pathlist")
                .attr("id", d => containerId + "-" + d.name)
        return custom
    }

    let getUpdate = (data_extended) => {
        let dynamicSelector = `custom#${containerId}-dynamic`
        let staticSelector = `custom#${containerId}-static`

        let update = (root, timeStep) => {
            if (timeStep >= data_extended.length) {
                t = moment(data_extended[data_extended.length].date).add(1, "months")
            } else {
                t = moment(data_extended[timeStep].date)
            }

            var d_faded = 0
            if (timeStep - 30 > 0) {
                d_faded = data_extended[timeStep - 30].date
            }

            const elapsed_data = data_extended.slice(1,-2).filter(d => d.date <= data_extended[timeStep].date)
            const static_path_data = elapsed_data.filter(d => d.date < d_faded)
            const dynamic_path_data = elapsed_data.filter(d => d.date >= d_faded)

            axes.select(yearSelector).text(data_extended[timeStep].year)

            contexts.dynamic.clearRect(-chart_width/2, -chart_height/2, chart_width, chart_height)

            let dynamic_paths = root.select(dynamicSelector).selectAll("custom.pathsegment")

            dynamic_paths
                .data(dynamic_path_data, d => d.date)
                .join(enter =>
                    enter.append("custom")
                        .attr("class", "pathsegment")
                        .attr("date", d => d.date)
                        .attr("strokeOpacity", 1)
                )

            dynamic_paths = root.select(dynamicSelector).selectAll("custom.pathsegment")

            dynamic_paths.each((d,i) => {
                const segment = dynamic_paths.nodes()[i]
                const opacity = segment.getAttribute("strokeOpacity")
                contexts.dynamic.strokeStyle = radialColour(contexts.dynamic, opacity)

                drawSeg(contexts.dynamic, data_extended.slice(d.i, d.i+4))
            })

            root.select(staticSelector).selectAll("custom.pathsegment")
                .data(static_path_data, d => d.date)
                .enter()
                .append("custom")
                .attr("class", "pathsegment")
                .each((d,i) => {
                    drawSeg(contexts.static, data_extended.slice(d.i, d.i+4))
                })

            let startIndex = (elapsed_data.length - 60) < 0 ? 0 : elapsed_data.length - 60;
            var lastAnomalies = elapsed_data.slice(startIndex)
            if (lastAnomalies.length > 0) {
                var averageAnomaly = lastAnomalies.map(d => d.anomaly).reduce((a, b) => a += b) / lastAnomalies.length
                addCircle(d3.select(rAxisSelector), averageAnomaly)
            }
        }

        return update
    }

    let mainLoop = (data) => {
        data_extended = data
        let yearDisplay = getYearDisplay(data)

        let drawAxes = () => {
            axes.append("g").call(thetaAxis);
            axes.append("g").attr("id", rAxisId).call(rAxis);
            axes.append("text").call(yearDisplay);
        }

        let setup = () => {
            axes.selectAll("g").remove()
            axes.selectAll("text").remove()
            drawAxes()

            // t = moment(data_extended[1].date)
            axes.select(yearSelector).text(data_extended[0].year)

            contexts.static.strokeStyle = radialColour(contexts.static, 0.2)

            d3.namespaces.custom = "https://d3js.org/namespace/custom"
        }
        setup()
        let update = getUpdate(data)

        main = () => {
            d3.selectAll("custom").remove()
            let root = newDOM()

            contexts.static.clearRect(-chart_width/2, -chart_height/2, chart_width, chart_height)
            contexts.dynamic.clearRect(-chart_width/2, -chart_height/2, chart_width, chart_height)

            axes.select(yearSelector).text("")

            return root
        }

        setup()
        let root = main()
        let curriedDrawSeg = (data_slice) => drawSeg(contexts.dynamic, data_slice)
        let curriedUpdate = (timeStep) => update(root, timeStep)
        return {
            drawSeg: curriedDrawSeg,
            update: curriedUpdate,
            yearDisplay: yearDisplay
        }
    }

    return mainLoop(monthlyTemps)
}