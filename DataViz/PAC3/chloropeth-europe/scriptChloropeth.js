(function (d3, L) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // let countryURL = 'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json'
    //let covidURL = 'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_covid.json'
    let countryURL = 'countriesData.json'
    let covidURL = 'covid_data.json'
    let mapURL = 'https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoibmlja255ciIsImEiOiJjajduNGptZWQxZml2MndvNjk4eGtwbDRkIn0.L0aWwfHlFJVGa-WOj7EHaA'

    // Generated with https://colorbrewer2.org/#type=sequential&scheme=OrRd&n=5
    let colorCodes = ["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"]
    let countryData
    let covidData
    var activeFeature

    let canvas = d3.select('#canvas')
    // Number of seconds we want the animation to take.
    // With this and the number of data points, we can calculate the number of updates per second
    let animationLength = 240
    var numDates
    var animationStepTime

    let pctDeathsThresholds = [0.0015, 0.0025, 0.0034, 0.0043]
    let totalDeathsThresholds = [40000, 100000, 200000, 300000]
    let totalCasesThresholds = [1000000, 2500000, 5000000, 10000000]
    let pctCasesThresholds = [0.01, 0.1, 0.3, 0.5]
    let metricThresholds = {
        "Cumulative_deaths": totalDeathsThresholds,
        "Cumulative_cases": totalCasesThresholds,
        "pct_deaths": pctDeathsThresholds,
        "pct_cases": pctCasesThresholds
    }
    // var activeMetricInput = d3.select('input[name="metric"]:checked').node()
    var activeMetric = d3.select('input[name="metric"]:checked').node().value
    let dateMessage = d3.select('#main-message')
    // let playFromDateButton = d3.select("#play-from-date")
    let playFullDatesButton = d3.select("#play-full-dates")

    var activeThresholds
    let datePicker = d3.select('#active-date')
    let activeDateInput = datePicker.node()
    console.log("Date picker")
    console.log(datePicker)
    console.log(dateMessage)

    var activeDate = activeDateInput.value
    var info
    let updateMetric = () => {
        // console.log("Active metric")
        // console.log(d3.select('input[name="metric"]:checked').node());
        activeMetric = d3.select('input[name="metric"]:checked').node().value
        activeThresholds = metricThresholds[activeMetric]
        activeDate = activeDateInput.value

        // console.log(activeMetric)
    }

    // Lat/Long for Prague
    var lat = 50.0755381;
    var long = 14.43780049999998;
    var geojson;

    function getColor(d) {
        return d >= activeThresholds[3] ? colorCodes[4] :
            d >= activeThresholds[2] ? colorCodes[3] :
            d >= activeThresholds[1] ? colorCodes[2] :
            d >= activeThresholds[0] ? colorCodes[1] :
            colorCodes[0]
    }

    /*function getColor(d) {
        return d > 1000000 ? '#005824' :
            d > 500000  ? '#238b45' :
            d > 200000  ? '#41ae76' :
            d > 100000  ? '#66c2a4' :
            d > 50000   ? '#99d8c9' :
            d > 20000   ? '#ccece6' :
            d > 15000   ? '#edf8fb':
                        'snow'
    }*/

    // Custom control
    function style(feature) {
        var metricValue = 0
        if (feature.properties.iso_a2 in covidData[activeDate]) {
            metricValue = covidData[activeDate][feature.properties.iso_a2][activeMetric]
        }

        return {
            fillColor: getColor(metricValue),
            weight: 1,
            opacity: 1,
            color: colorCodes[0],
            //dashArray: '2',
            fillOpacity: .7,
            stroke: true,
            weight: .7,
            fill: true,
            clickable: true
        };
    }

    var mymap = L.map('mapid').setView([lat, long], 13);
    L.tileLayer(
        mapURL,
        {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 4,
            minZoom: 3,
            id: 'mapbox.dark'
        }
    ).addTo(mymap);

    var info = L.control();

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    info.update = function (props) {
        if (typeof props !== 'undefined') {
            covidStats = covidData[activeDate][props.iso_a2]
        }

        this._div.innerHTML = '<h2>COVID statistics at ' + activeDate + '</h2>' +  (props ?
            '<h3>' + props.formal_en + '</h3>' + '<b>'
            +  'Total deaths: ' + '</b>' + covidStats.Cumulative_deaths + '<br />'
            +  'Total cases: ' + '</b>' + covidStats.Cumulative_cases + '<br />'
            +  '% of population deceased: ' + '</b>' + (covidStats.pct_deaths * 100).toFixed(4) + '<br />'
            +  '% of population infected: ' + '</b>' + (covidStats.pct_cases * 100).toFixed(2) + '<br />'
            + '<b>' + 'Population (Millions):' + '</b>' + '<br />' + (props.pop_est / 1000000).toFixed(3)
            : 'Hover over a European country');
    };

    info.addTo(mymap);
    var legend;

    let drawMap = () => {
        console.log("Drawing map!");
        updateMetric()
        // console.log("Selected metric: " + activeMetric);

        mymap.panTo(new L.LatLng(lat, long));

        // method that we will use to update the control based on feature properties passed
        info.update = function (props) {
            if (typeof props === 'undefined' || props === null) {
                console.log("No props...")
            } else {
                // console.log("Getting covid stats for country " + props.iso_a2 + " at date " + activeDate)
                covidStats = covidData[activeDate][props.iso_a2]
                // console.log(covidStats)
            }

            this._div.innerHTML = '<h2>COVID statistics at ' + activeDate + '</h2>' +  (props ?
                '<h3>' + props.formal_en + '</h3>'
                +  '<b>Total deaths: ' + '</b>' + covidStats.Cumulative_deaths + '<br />'
                +  '<b>Total cases: ' + '</b>' + covidStats.Cumulative_cases + '<br />'
                +  '<b>% of population deceased: ' + '</b>' + (covidStats.pct_deaths * 100).toFixed(4) + '<br />'
                +  '<b>% of population infected: ' + '</b>' + (covidStats.pct_cases * 100).toFixed(2) + '<br />'
                + '<b>' + 'Population (Millions):' + '</b>' + (props.pop_est / 1000000).toFixed(3)
                : 'Click on a European country');
        };

        // Happens on mouse hover
        function highlightFeature(e) {
            if (typeof activeFeature !== "undefined") {
                geojson.resetStyle(activeFeature.target);

                if (activeFeature.target === e.target) {
                    activeFeature = undefined;
                    geojson.resetStyle(e.target);
                    info.update();
                    return;
                }

            }
            var layer = e.target;

            layer.setStyle({
                weight: 2,
                color: '#ffd32a',
                dashArray: '',
                fillOpacity: 0.7
            });

            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }

            activeFeature = e;
            info.update(layer.feature.properties);
        }

        // Happens on mouse out
        function resetHighlight(e) {
            geojson.resetStyle(e.target);
            //info.update();
        }

        // Click listener that zooms to country
        function zoomToFeature(e) {
            mymap.fitBounds(e.target.getBounds());
        }

        function onEachFeature(feature, layer) {
            layer.on({
                //mouseover: highlightFeature,
                //mouseout: resetHighlight,
                click: highlightFeature
            });
            // layer.on({
            //     mouseover: highlightFeature,
            //     mouseout: resetHighlight,
            //     click: zoomToFeature
            // });
        }

        geojson = L.geoJson(countryData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(mymap);

        // Legend
        if (typeof legend !== "undefined") {
            mymap.removeControl(legend);
        }
        legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map) {
            // console.log("Adding legend")
            var div = L.DomUtil.create('div', 'info legend'),
                grades = activeThresholds,
                labels = [];
            // console.log("Active thresholds")
            // console.log(activeThresholds)
            // loop through our density intervals and generate a label with a colored square for each interval
            for (var i = 0; i < grades.length; i++) {
                var prevGrade
                var currentGrade
                if (i == 0) {
                    prevGrade = 0
                } else {
                    prevGrade = grades[i-1]
                }

                currentGrade = grades[i]
                div.innerHTML +=
                    '<i style="background:' + getColor(prevGrade) + '"></i> ' +
                    prevGrade + '&ndash;' + currentGrade + '<br>';
            }
            currentGrade = grades[grades.length - 1]
            div.innerHTML += '<i style="background:' + getColor(currentGrade) + '"></i> ' + currentGrade + '+';

            return div;
        };

        legend.addTo(mymap);

        if (typeof activeFeature !== "undefined") {
            info.update(activeFeature.target.feature.properties)
        }
        // console.log(countryData);
    }

    refreshMap = function() {
        // console.log("Date input changed...")
        updateMetric();
        // console.log("New date: " + activeDate)
        drawMap();
    }

    d3.selectAll('input[name="metric"]').each(
        function() {
            // console.log(this)
            this.onchange = function() {
                // console.log(this.id + " has changed")
                refreshMap()
            }
        }
    )

    activeDateInput.onchange = function(v) {
        dateMessage.text(this.value)
        refreshMap()
    }

    async function animateBetweenDates(fromDate, toDate) {
        var fromDateParts = fromDate.split("-")
        var toDateParts = toDate.split("-")
        var startDate = new Date(parseInt(fromDateParts[0]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[2]))
        var endDate = new Date(parseInt(toDateParts[0]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[2]))

        for (var d = startDate; d <= endDate; d.setDate(d.getDate() + 7)) {
            var day = ("0" + d.getDate()).slice(-2);
            var month = ("0" + (d.getMonth() + 1)).slice(-2);

            var today = d.getFullYear()+"-"+(month)+"-"+(day) ;
            datePicker.attr("value", today)
            dateMessage.text(today)
            refreshMap()
            await sleep(animationStepTime * 7);
        }
    }

    // playFromDateButton.on("click", function() {
    //     var toDate = d3.select('input[id="active-date"]').attr("max")
    //     animateBetweenDates(activeDate, toDate)
    // });
    playFullDatesButton.on("click", function() {
        var fromDate = d3.select('input[id="active-date"]').attr("min")
        var toDate = d3.select('input[id="active-date"]').attr("max")
        animateBetweenDates(fromDate, toDate)
    });


    d3.json(countryURL).then(
        (data, error) => {
            if(error){
                console.log("Error loading country data from " + countryURL)
                console.log(error)
            }else{
                countryData = data
                // console.log('Country Data has ' + countryData.features.length + " countries");
                // console.log(countryData);

                // d3.json(covidURL).then(
                d3.json(covidURL).then(
                    (data, error) => {
                        if(error){
                            console.log("Error loading covid data from " + covidURL)
                            console.log(error)
                        }
                        else{
                            covidData = data
                            numDates = Object.keys(covidData).length
                            animationStepTime = animationLength / numDates
                            // console.log('Covid Data')
                            // console.log(covidData)
                            drawMap()
                        }
                    }
                )

            }
        }
    )
}(d3, L));