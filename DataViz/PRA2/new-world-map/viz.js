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
    var currentYear;
    var currentMonth;

    // Functions
    var drawCircle;
    var addMarker;
    var setup;
    var drawTimePoint;
    var createPopupContent;

    // End prototypes

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const radiusScale = 100000
    // Time to animate a circle in ms
    const animateCircleDuration = 1000
    const circleOpacity = 0.5
    // let mapURL = 'https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoibmlja255ciIsImEiOiJjajduNGptZWQxZml2MndvNjk4eGtwbDRkIn0.L0aWwfHlFJVGa-WOj7EHaA'
    let mapURL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    let citiesURL = "./data/cities.csv"
    let cityTempURL = "./data/cityTemps.csv"

    var getAnomalyColor = d3.scaleLinear()
        .domain(d3.ticks(-2, 2, 9))
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

    // color: 'red', fillColor: '#f03', opacity: 0.5, radius: 500
    drawCircle = (cityTemp) => {
        city = cities[cityTemp.id]

        if (cityTemp.id in circles) {
            circle = circles[cityTemp.id]
            let newRadius = Math.abs(cityTemp.anomaly) * radiusScale;
            let startRadius = circle.getRadius()

            let targetReached = (currentRadius) => {
                if (newRadius > startRadius) {
                    return currentRadius >= newRadius
                } else {
                    return currentRadius <= newRadius
                }
            }

            let delta = newRadius - startRadius;
            let step = delta / animateCircleDuration;

            let interval = setInterval(function() {
                let currentRadius = circle.getRadius();
                let newColor = getAnomalyColor(currentRadius / radiusScale)
                if (!targetReached(currentRadius)) {
                    currentRadius = currentRadius + step;
                    circle.setRadius(currentRadius);
                    circle.setStyle({color: newColor, fillColor: newColor})
                } else {
                    clearInterval(interval);
                }
            }, 1);

            circle.setPopupContent(createPopupContent(city, cityTemp))
        } else {
            let color = getAnomalyColor(cityTemp.anomaly)
            let circle = L
                .circle([city.lat, city.lon], {
                    color: color,
                    fillColor: color,
                    fillOpacity: circleOpacity,
                    radius: Math.abs(cityTemp.anomaly) * radiusScale
                })
                .bindPopup(createPopupContent(city, cityTemp))
                .addTo(map);

            circle.on("mouseover", function(ev) {
                ev.target.openPopup()
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
            year = cityTemp.year
            if (year < minYear) {
                minYear = year;
            }
            month = cityTemp.month
            if (!(year in cityTemps)) {
                cityTemps[year] = {}
            }

            if (!(month in cityTemps[year])) {
                timePoints.push({"year": year, "month": month});
                cityTemps[year][month] = {}
            }

            cityTemps[year][month][cityTemp.id] = cityTemp
        })

        if (minYear in cityTemps) {
            currentMonth = 1
            currentYear = minYear
            console.log("Drawing year: " + minYear);
            drawTimePoint(currentYear, currentMonth);
        } else {
            console.log("ERROR: minYear " + minYear + " is not loaded in the yearly temps!")
        }
    }

    drawTimePoint = (year, month) => {
        if (!(year in cityTemps && month in cityTemps[year])) {
            console.log("ERROR drawing year: " + year + " is not loaded in the city yearly temps!")
            return
        }

        let timePointTemps = cityTemps[year][month]
        let first = true
        for (const [cityId, cityTemp] of Object.entries(timePointTemps)) {
            if (first) {
                console.log("Drawing circle for city temp at " + year + "-" + month)
                console.log(cityTemp)
                first = false
            }
            drawCircle(cityTemp)
        }
    }

    d3.csv(citiesURL).then(
        (citiesData, error) => {
            if (error) {
                console.log("Error loading cities!")
                console.log(error)
            } else {
                console.log("Loaded cities")
                d3.csv(cityTempURL).then(
                    (cityTempData, error) => {
                        if (error) {
                            console.log("Error loading city temps!")
                            console.log(error)
                        } else {
                            console.log("Loaded city temps")
                            setup(citiesData, cityTempData)
                        }
                    }
                )
            }
        }
    )




    // let drawCountries = () => {
    //     for (const [cityId, city] of Object.entries(cities)) {
    //         console.log(key, value);
    //     }
    // }
    // drawCircle(lat, lon * 2, 2, "red", "#f03", 0.5)

    // addMarker(
    //     {
    //         "lat": lat,
    //         "lon": lon,
    //         "city": "Prague",
    //         "country": "Czech Republic"
    //     },
    //     false
    // )

}(d3, L));