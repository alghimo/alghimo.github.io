(function (d3, L) {
    /**
     * Function prototypes and shared variables
     */
    // Variables
    var circles = {};
    var markers = {}
    var cities = {};
    var cityTemps = {};
    var timePoints = [];
    var currentIndex;
    var animationInterval;

    // Functions
    var drawCircle;
    var addMarker;
    var setup;
    var drawTimePoint;
    var createPopupContent;
    var playNextYear;
    var playPrevYear;
    var playFirstYear;
    var playLastYear;
    var playAnimation;
    var stopAnimation;
    var increaseAnimationSpeed;
    var decreaseAnimationSpeed;
    var changeAnimationSpeed;
    var updateSpiral1;
    var updateSpiral2;

    // End prototypes

    const spiralWidth = 400
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const radiusScale = 100000
    // Time to animate a year in ms
    const initialAnimateTimePointDuration = 250
    let animateTimePointDuration = 250
    // Time to animate a circle in ms
    const circleOpacity = 0.5
    let mapURL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    let citiesURL = "./data/cities.json"
    let cityTempURL = "./data/cityTemps.json"
    let currentDateText = d3.select("#current-date")
    let yearMonthSlider = d3.select("#year-month-slider")
    let playButton = d3.select("#play")
    let stopButton = d3.select("#stop")

    var getAnomalyColor = d3.scaleLinear()
        .domain(d3.ticks(-5, 5, 9))
        .range([
            "#2166AC", "#4393C3", "#92C5De", "#D1E5F0",
            "#F7F7F7",
            "#FDDBC7", "#F4A582", "#D6604D", "#B2182B"
        ]);

    var lat = 50.0755381;
    var lon = 14.43780049999998;
    var map = L.map('world-map').setView([lat, lon], 2);

    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.removeControl(map.zoomControl);

    L.tileLayer(mapURL, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);


    createPopupContent = (city, cityTemp) => {
        return `<strong>City:</strong> ${city.city}<br/>
        <strong>Country:</strong> ${city.country}<br/>
        <strong>Temp:</strong>${cityTemp.temp.toFixed(2)}<br/>
        <strong>Anomaly:</strong>${cityTemp.anomaly.toFixed(2)}`
    }

    drawCircle = (cityTemp) => {
        city = cities[cityTemp.id]

        if (cityTemp.id in circles) {
            circle = circles[cityTemp.id]
            let newColor = getAnomalyColor(cityTemp.anomaly)
            circle.setStyle({color: newColor, fillColor: newColor})


            circle.setPopupContent(createPopupContent(city, cityTemp))
        } else {
            let color = getAnomalyColor(cityTemp.anomaly)
            let radius = 2
            let circle = L
                .circle([city.lat, city.lon], {
                    color: color,
                    fillColor: color,
                    fillOpacity: circleOpacity,
                    radius: radius * radiusScale
                })
                .bindPopup(createPopupContent(city, cityTemp))
                .addTo(map);

            circle.on("mouseover", function(ev) {
                ev.target.openPopup()
            });

            circle.on("mouseout", function(ev) {
                ev.target.closePopup()
            });

            circles[city.id] = circle;
        }
    }

    addMarker = (city, openPopup) => {
        openPopup = openPopup || false
        marker = L.marker([city.lat, city.lon]).addTo(map)
            .bindPopup(city.city + " (" + city.country + ")");

        if (openPopup){
            marker.openPopup()
        }

        markers[city.id] = marker

        return marker
    }

    setup = (citiesData, cityTempData) => {
        timePoints = []
        cities = {}
        cityTemps = {}
        currentIndex = 0;
        animateTimePointDuration = initialAnimateTimePointDuration;

        citiesData.forEach(city => {
            city["lat"] = parseFloat(city["lat"])
            city["lon"] = parseFloat(city["lon"])
            cities[city.id] = city
            if (city.id in circles) {
                map.removeLayer(circles[city.id])
            }
        });

        let minYear = 1000000;
        cityTempData.forEach(cityTemp => {
            cityTemp["temp"] = parseFloat(cityTemp["temp"])
            cityTemp["standardized_temp"] = parseFloat(cityTemp["standardized_temp"])
            cityTemp["anomaly"] = parseFloat(cityTemp["anomaly"])
            year = parseInt(cityTemp.year)
            if (year < minYear) {
                minYear = year;
            }
            month = parseInt(cityTemp.month)
            if (!(year in cityTemps)) {
                cityTemps[year] = {}
            }

            if (!(month in cityTemps[year])) {
                timePoints.push({"year": year, "month": month});
                cityTemps[year][month] = {}
            }

            cityTemps[year][month][cityTemp.id] = cityTemp
        })
        yearMonthSlider.attr("min", "0")
        yearMonthSlider.attr("max", timePoints.length - 1)

        let compareTimePoints = (t1, t2) => {
            if ((t1.year == t2.year) && (t1.month == t2.month)) {
                return 0
            }
            if ((t1.year < t2.year) || ((t1.year == t2.year) && t1.month < t2.month)) {
                return -1
            }
            return 1
        }
        timePoints.sort(compareTimePoints);

        if (minYear in cityTemps) {
            drawTimePoint(currentIndex);
        } else {
            console.log("ERROR: minYear " + minYear + " is not loaded in the yearly temps!")
        }
        playButton.node().disabled = false;
        stopButton.node().disabled = true;
        yearMonthSlider.node().disabled = false;


        function checkKey(e) {
            // If the animation is playing, do not capture keys
            let animationPlaying = playButton.node().disabled

            e = e || window.event;
            if (!animationPlaying) {
                switch (e.key) {
                    case "ArrowLeft":
                        playPrevYear()
                        break;
                    case "ArrowRight":
                        playNextYear()
                        break;
                    case "ArrowUp":
                        playLastYear()
                        break;
                    case "ArrowDown":
                        playFirstYear()
                        break;
                }
            } else {
                switch (e.key) {
                    case "ArrowLeft":
                        decreaseAnimationSpeed()
                        break;
                    case "ArrowRight":
                        increaseAnimationSpeed()
                        break;
                }
            }
        }

        document.onkeydown = checkKey;
    }

    drawTimePoint = (index) => {
        year = timePoints[index].year
        month = timePoints[index].month
        if (!(year in cityTemps && month in cityTemps[year])) {
            console.log("ERROR drawing year: " + year + " is not loaded in the city yearly temps!")
            return
        }

        currentDateText.text(`${year}/${month.toString().padStart(2, '0')}`)
        let timePointTemps = cityTemps[year][month]

        for (const [cityId, cityTemp] of Object.entries(timePointTemps)) {
            drawCircle(cityTemp)
        }

        yearMonthSlider.attr("value", index);
        updateSpiral1(index);
        updateSpiral2(index);
    }

    playPrevYear = () => {
        currentIndex -= 1

        if (currentIndex < 0) {
            console.log("No prev year to play")
            currentIndex = 0
            return
        }

        drawTimePoint(currentIndex)
    }

    playNextYear = () => {
        currentIndex += 1

        if (currentIndex >= timePoints.length) {
            console.log("No next year to play")
            return
        }

        drawTimePoint(currentIndex)
    }

    playFirstYear = () => {
        currentIndex = 0

        drawTimePoint(currentIndex)
    }

    playLastYear = () => {
        currentIndex = timePoints.length - 1

        drawTimePoint(currentIndex)
    }

    playAnimation = () => {
        playButton.node().disabled = true;
        stopButton.node().disabled = false;
        animationInterval = setInterval(function() {
            playNextYear()
        }, animateTimePointDuration);
    }

    stopAnimation = () => {
        clearInterval(animationInterval);
        playButton.node().disabled = false;
        stopButton.node().disabled = true;
    }

    increaseAnimationSpeed = () => {
        changeAnimationSpeed(0.5)
    }

    decreaseAnimationSpeed = () => {
        changeAnimationSpeed(2)
    }

    changeAnimationSpeed = (scaleFactor) => {
        animateTimePointDuration = animateTimePointDuration * scaleFactor;
        clearInterval(animationInterval);
        animationInterval = setInterval(function() {
            playNextYear()
        }, animateTimePointDuration);

    }

    playButton.on("click", playAnimation);
    stopButton.on("click", stopAnimation);
    yearMonthSlider.on("input", function() {drawTimePoint(this.value)})

    var extractCityTemps = (cityId, allCityTemps) => {
        var parseYearMonthToDate = d3.utcParse("%Y/%m");
        var parseTimestepDate = ts => parseYearMonthToDate(`${ts.year}/${ts.month}`)

        let compareTimePoints = (t1, t2) => {
            if ((t1.year == t2.year) && (t1.month == t2.month)) {
                return 0
            }
            if ((t1.year < t2.year) || ((t1.year == t2.year) && t1.month < t2.month)) {
                return -1
            }
            return 1
        }

        var cityTemps = allCityTemps.filter(cityTemp => cityTemp.id == cityId).sort(compareTimePoints)

        for (let i=0; i < cityTemps.length; ++i) {
            cityTemps[i].i = i - 1
            cityTemps[i].date = parseTimestepDate(cityTemps[i])
        }

        return cityTemps.sort(compareTimePoints)
    }

    d3.json(citiesURL).then(
        (citiesData, error) => {
            if (error) {
                console.log("Error loading cities!")
                console.log(error)
            } else {
                console.log("Loaded cities")
                d3.json(cityTempURL).then(
                    (cityTempData, error) => {
                        if (error) {
                            console.log("Error loading city temps!")
                            console.log(error)
                        } else {
                            getBarlowFontface.then(function(barlow_fontface) {
                                console.log("Generating climate spiral wrapper")

                                var selectCity1 = () => {
                                    d3.select("#spiral-1").html("");
                                    cityId1 = parseInt(d3.select("#city1").node().value)
                                    monthlyTemps1 = extractCityTemps(cityId1, cityTempData)
                                    drawSpiral1Seg = ClimateSpiral (d3, "spiral-1", spiralWidth, monthlyTemps1, barlow_fontface)
                                    updateSpiral1 = drawSpiral1Seg.update
                                }

                                selectCity1()
                                d3.select("#city1").on("change", selectCity1)

                                var city2options = d3.select("#city2").selectAll('option').data(citiesData);

                                city2options.enter()
                                    .append('option')
                                    .attr('value', function(d) {
                                        return d.id;
                                    })
                                    .text(function(d) {
                                        return d.city + " (" + d.country + ")";
                                    })
                                    .call(d => {
                                        if (d.id == 2124) {
                                            this.selected = true;
                                        }
                                    });

                                d3.select("#city2").node().selectedIndex = 2165;
                                var selectCity2 = () => {
                                    d3.select("#spiral-2").html("");
                                    cityId2 = parseInt(d3.select("#city2").node().value)
                                    monthlyTemps2 = extractCityTemps(cityId2, cityTempData)
                                    drawSpiral2Seg = ClimateSpiral (d3, "spiral-2", spiralWidth, monthlyTemps2, barlow_fontface)
                                    updateSpiral2 = drawSpiral2Seg.update
                                }
                                selectCity2()
                                d3.select("#city2").on("change", selectCity2)

                                console.log("Loaded city temps")
                                setup(citiesData, cityTempData)
                            })
                        }
                    }
                )
            }
        }
    )

}(d3, L));