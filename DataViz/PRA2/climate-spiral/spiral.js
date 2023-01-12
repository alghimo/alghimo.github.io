(function (d3) {
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

    getBarlowFontface.then(function(barlow_fontface) {
        let tempDataURL = "worldTempsMonthly.json"
        let duration = 15000
        let date_extent = 5367168000000
        // chart_width = Math.min(width, 750)
        let chart_width = 750
        let chart_height = chart_width
        let margin = 0.05 * chart_width
        let innerRadius = chart_width / 8
        let outerRadius = chart_width / 2 - margin

        let theta = d3.scaleUtc()
            .domain([Date.UTC(0, 0, 1), Date.UTC(1, 0, 1) - 1])
            .range([0, 2 * Math.PI])

        let r = d3.scaleLinear()
            .domain([-1, 2.4])
            .range([innerRadius, outerRadius])

        let radialColour = (context, alpha=1) => {
            let interpolateColScheme = d3.interpolateRgbBasis(d3.schemeRdBu[10])
            let colour = d3.scaleDiverging(interpolateColScheme)
            .domain([-1.5, 0, 1.5].reverse())
            let grd = context.createRadialGradient(0,0, r(colour.domain()[0]), 0, 0, r(colour.domain()[2]))
            let stops = 50
            for (let i = 0; i <= stops; i ++){
                let stop = i/stops;
                grd.addColorStop(stop, d3.color(interpolateColScheme(stop)).copy({opacity:alpha}))
            }

            return grd
        }

        let container = d3.select("#main").append("figure").attr("id", "main-figure")
        let mainFigure = d3.select("#main-figure")
        let axes = mainFigure.append("svg")
            .attr("viewBox", [-chart_width / 2, -chart_height / 2, chart_width, chart_height])
            .attr("width", chart_width)
            .attr("height", chart_height)
            .style("left", "0px")
            .style("top", "0px")
            .style("z-index", 0)
            .style("position", "relative")

        // container.append(axes.node())

        var numMonths = 0
        let getId = (name) => {
            return name + "-" + ++numMonths
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
                    .attr("xlink:href", d => "#" + d.id)
                    .text(d3.utcFormat("%B"))))

        let addCircle = (g, maxAnomaly) => {
            color = "#f00"
            opacity = 0.2
            if (!d3.select("#max-anomaly-text").empty()) {
                // d3.select("#max-anomaly-circle").node().remove()
                d3.select("#max-anomaly-text").node().remove()
                d3.select("#max-anomaly-text-shadow").node().remove()
            }

            g.append("text")
                .attr("id", "max-anomaly-text")
                .attr("x", "-0.5em")
                .attr("y", -r(maxAnomaly))
                .attr("dy", "0.35em")
                .attr("stroke", "#f00")
                .attr("stroke-width", 4)
                .text(`${maxAnomaly.toFixed(2)}°C`)
                .clone(true)
                .attr("id", "max-anomaly-text-shadow")
                .attr("fill", "currentColor")
                .attr("stroke", "none")
        }
        let rAxis = g => g
            .call(g => g.append('style').text(barlow_fontface))
            .attr('font-family',  "Barlow-Light")
            .attr("text-anchor", "end")
            .attr("font-size", outerRadius/20)
            .call(g => g.selectAll("g")
                .data([2, 1.5, 0])
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

        let getYearDisplay = data => {
            let yearDisplay = text => {
                text
                    .attr("id", "year")
                    .call(g => g.append('style').text(barlow_fontface))
                    .attr("font-family",  "Barlow-Light")
                    .attr("font-size", 0.5*innerRadius)
                    .attr("y", 0)
                    .attr("fill", "#444")
                    .attr("dominant-baseline", "central")
                    .attr("text-anchor", "start")
                .attr("visibility", "visible")

                text
                    .text(data.slice(-2)[0].date.getFullYear())

                let length = axes.select("#year").node().getBBox().width

                text
                    .attr("x", -length*0.5)
                    .attr("fill-opacity", 1)
                    .text("")
            }

            return yearDisplay
        }

        let replayLink = g => {
            g.attr("id", "replay")
            .on("mouseover", (d,i) => g.select("line")
                                        .transition()
                                        .attr("stroke-opacity", 1))
            .on("mouseout", (d,i) => g.select("line")
                                        .transition()
                                        .attr("stroke-opacity", 0))
            .attr("visibility", "hidden")
            .attr("font-size", outerRadius/20)
            .attr("opacity", 0)
            .append("text")
            .call(g => g.append('style').text(barlow_fontface))
            .attr("font-family",  "Barlow-Light")
            .attr("letter-spacing", "0.2em")
            .attr("x", 0)
            .attr("y", innerRadius/2)
            .attr("text-anchor", "middle")
            .text("REPLAY")
            .attr("fill", "#444")

            let uline_length = axes.select("#replay").node().getBBox().width

            g.append("line")
            .attr("x1", -uline_length/2 + outerRadius*0.005)
            .attr("y1", innerRadius/2 + outerRadius*0.01)
            .attr("x2", uline_length/2)// - outerRadius/75)
            .attr("y2", innerRadius/2 + outerRadius*0.01)
            .attr("stroke", "#444")
            .attr("stroke-opacity", 0)
            .attr("stroke-width", outerRadius*0.002)
        }

        let drawSeg = (context, data_slice) => {
            context.beginPath()
            let fn = d3.lineRadial()
                .context(context)
                .curve(d3.curveCatmullRomOpen)
                .angle(d => theta(Date.UTC(0, d.month, 0)))
                .radius(d => r(d.anomaly))

            let line = fn(data_slice)

            context.stroke()

            return line
        }

        let newContext = function () {
            var canvas = document.createElement("canvas");
            // const dpi = Window.devicePixelRatio
            // canvas.width = chart_width * dpi;
            // canvas.height = chart_height * dpi;
            canvas.width = chart_width;
            canvas.height = chart_height;
            canvas.style.width = chart_width + "px";

            const context = canvas.getContext("2d");
            // context.scale(dpi, dpi);
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

        // console.log(contexts)

        // console.log(canvases)
        mainFigure.node().appendChild(canvases.static)
        mainFigure.node().appendChild(canvases.dynamic)
        mainFigure.node().appendChild(d3.create("figcaption").text("Animated temperature spiral showing HadCRUT5 temperature anomalies above 1850–1900 baseline, from 1850 to December 2022.").node())


        let newDOM = () =>  {
            const custom = d3.create("custom")

            custom.selectAll("custom.pathlist")
                .data([{name: "dynamic"}, {name: "static"}])
                .join("custom")
                    .attr("class", "pathlist")
                    .attr("id", d => d.name)
            return custom
        }

        let hideReplay = () => {
            axes.select("#replay")
            .transition()
                .attr("opacity", 0)
                .on("end", _ => axes.select("#replay")
                    .attr("visibility", "hidden"))
        }

        let showReplay = () => {
            axes.select("#replay")
            .attr("visibility", "visible")
                .transition()
                .attr("opacity", 1)
        }

        let timer = d3.timer(_ => _) // global timer object for convenient restarting instead of creating duplicates

        let extendData = (data) => {
            let data_extended = Array.from(data)
            let anomalies_1850_1900 = data.filter(d => d.date > Date.UTC(1850,0,0) && d.date< Date.UTC(1901,0,0)).map(d => d.anomaly)
            let mean_1850_1900 = anomalies_1850_1900.reduce((a,b) => a += b) / anomalies_1850_1900.length

            // Duplicate first and last values
            data_extended.unshift(Object.assign({}, data_extended[0]))
            data_extended.push(Object.assign({}, data_extended[data_extended.length-1]))

            // Offset first and last date/month by 1 month
            data_extended[0].date = d3.utcParse("%m/%d/%Y")(moment(data_extended[0].date).subtract(1,"months").calendar())
            data_extended[0].month = data_extended[0].date.getMonth()

            data_extended[data_extended.length-1].date = d3.utcParse("%m/%d/%Y")(moment(data_extended[data_extended.length-1].date).add(1, "months").calendar())
            data_extended[data_extended.length-1].month = data_extended[data_extended.length-1].date.getMonth()


            for (let i=0; i<data_extended.length; ++i) {
                data_extended[i].i = i-1 // Add line segment index
                data_extended[i].anomaly = data_extended[i].anomaly - mean_1850_1900 // Rebaseline anomalies to 1850–1900
            }

            return data_extended
        }

        let getUpdate = (data, data_extended) => {
            var maxAnomaly = data_extended[1].anomaly;
            var newMax = false

            let update = (root, elapsed) => {
                const year_in_ms = 365.25 * 24 * 3600 * 1000
                const fade_after = 0
                const fade_over = 30 * year_in_ms * duration / date_extent
                const faded_after = fade_after + fade_over

                let t = date_extent*elapsed/duration
                t = moment(data_extended[1].date).add(t, "milliseconds")

                const d_faded = t.clone().subtract(date_extent*faded_after/duration, "milliseconds") // date before which all segments are finished fading

                const elapsed_data = data_extended.slice(1,-2).filter(d => d.date <= t._d)
                const static_path_data = elapsed_data.filter(d => d.date < d_faded._d)
                const dynamic_path_data = elapsed_data.filter(d => d.date >= d_faded._d)

                axes.select("#year").text(t.year())

                contexts.dynamic.clearRect(-chart_width/2, -chart_height/2, chart_width, chart_height)

                let dynamic_paths = root.select("custom#dynamic").selectAll("custom.pathsegment")

                dynamic_paths
                    .data(dynamic_path_data, d => d.date)
                    .join(enter =>
                        enter.append("custom")
                            .attr("class", "pathsegment")
                            .attr("date", d => d.date)
                            .attr("strokeOpacity", 1)
                            .call(enter => enter.transition()
                            .duration(fade_over)
                            .delay(fade_after)
                            // .ease(d3.easeLinear)
                            .ease(d3.easeCubicIn)
                            .attr("strokeOpacity", 0.2)))

                dynamic_paths = root.select("custom#dynamic").selectAll("custom.pathsegment")

                dynamic_paths.each((d,i) => {
                    const segment = dynamic_paths.nodes()[i]
                    const opacity = segment.getAttribute("strokeOpacity")
                    contexts.dynamic.strokeStyle = radialColour(contexts.dynamic, opacity)

                    drawSeg(contexts.dynamic, data_extended.slice(d.i, d.i+4))
                })

                root.select("custom#static").selectAll("custom.pathsegment")
                    .data(static_path_data, d => d.date)
                    .enter()
                    .append("custom")
                    .attr("class", "pathsegment")
                    .each((d,i) => {
                        drawSeg(contexts.static, data_extended.slice(d.i, d.i+4))
                    })

                newMax = false
                dynamic_path_data.forEach((d) => {
                    if (d.anomaly > maxAnomaly) {
                        maxAnomaly = d.anomaly
                        newMax = true
                    }
                })

                if (newMax) {
                    console.log("New max anomaly")
                    addCircle(d3.select("#r-axis"), maxAnomaly)
                }
            }

            return update
        }
        // CONTINUE HERE

        let mainLoop = (data) => {
            data_extended = extendData(data)
            //data.map(d => d.anomaly).reduce((a,b) => Math.min(a,b))
            let yearDisplay = getYearDisplay(data)

            let drawAxes = () => {
                axes.append("g").call(thetaAxis);
                axes.append("g").attr("id", "r-axis").call(rAxis);
                axes.append("text").call(yearDisplay);
                axes.append("g").call(replayLink)
            }

            let setup = () => {
                axes.selectAll("g").remove()
                axes.selectAll("text").remove()
                drawAxes()

                t = moment(data_extended[1].date)
                axes.select("#year").text(t.year())

                contexts.static.strokeStyle = radialColour(contexts.static, 0.2)

                d3.namespaces.custom = "https://d3js.org/namespace/custom"
            }
            setup()
            let update = getUpdate(data, data_extended)

            main = () => {
                d3.selectAll("custom").remove()
                let root = newDOM()

                contexts.static.clearRect(-chart_width/2, -chart_height/2, chart_width, chart_height)
                contexts.dynamic.clearRect(-chart_width/2, -chart_height/2, chart_width, chart_height)

                axes.select("#year").text("")
                hideReplay()

                const runTimer = () => {
                    timer.restart(elapsed => {
                    if (elapsed >= duration) {
                        update(root, duration)

                        timer.stop()
                        setTimeout(showReplay, 250)
                    }
                    else update(root, elapsed)
                })
                }

                setTimeout(runTimer, 250)
            }

            d3.select("#play").on("click", function() {
                setup()
                main()
            });

            d3.select("#stop").on("click", function() {
                timer.stop()
            });
        }

        let parseYearMonthToDate = d3.utcParse("%Y/%m");
        let parseRow = (d) => {
            let parsedDate = parseYearMonthToDate(d.year_month)

            return {
                date: parsedDate,
                month: parsedDate.getMonth(),
                anomaly: +d.anomaly
            }
        }
        d3.json(tempDataURL).then(
            (data, error) => {
                if (error) {
                    console.log("Error loading temperature data from " + tempDataURL)
                    console.log(error)
                } else {
                    console.log("Data loaded")
                    data.forEach(function(d, index) {
                        let parsedDate = parseYearMonthToDate(d.year_month)

                        data[index] = {
                            date: parsedDate,
                            month: parsedDate.getMonth(),
                            anomaly: +d.anomaly
                        }
                    }, data)
                    console.log(data)
                    mainLoop(data)
                }
            }
        )
    })
    // d3.json(countryURL).then(
    //     (data, error) => {
    //         if(error){
    //             console.log("Error loading country data from " + countryURL)
    //             console.log(error)
    //         }else{

    //         }
    //     })

}(d3));