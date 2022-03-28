function HoaxyTimeline(settings){
	var updateDateRangeCallback = settings.updateDateRangeCallback;
	var graphAnimation = settings.graphAnimation;

	var returnObj = {};
	var chart = null;
	var lastData = null;
	var chartData = [];
	var chartDataWithTweetRates = {};

	chart = nv.models.lineWithFocusChart()
		.showLegend(false)
		.useInteractiveGuideline(true);

	// Including interactive tooltips that contain the time period date
  // Along with the new claims and fact checks for that period
	chart.interactiveLayer.tooltip.contentGenerator(function(chartData) {
			var currentTimeStepIndex;
			// Date comes from Hoaxy as MM/DD/YYYY in this timeline as local time zone
			// Now the date comes in as MM/DD/YYYY HH:MM:SS, so we need to remove the HH:MM:SS part
			// for the tooltip to work
			var chartDataValueArr = chartData.value.split(' ')
			var chartLocalValue = chartDataValueArr[0]
			var currDateLocal = new Date(chartLocalValue);

			// var currDateLocal = new Date(chartData.value);
			var currentTimeStepDate = currDateLocal.getTime();

			// Finding the date match from the chartDataWithTweetRates object
			// We tried to directly use indexes before but indexes get changed
			// Due to the way D3js handles tooltips/charts
			for (dateRateIx in chartDataWithTweetRates[0].values) {
				var dateRateMatch =
					new Date(chartDataWithTweetRates[0].values[dateRateIx].x).getTime();
				if (currentTimeStepDate === dateRateMatch) {
					currentTimeStepIndex = dateRateIx;
				}
			}

			// Returning formatted and styled tooltip
			return "<div><b>" + String(chartLocalValue)
												+ "</b></div>"
												+ "<div style='display:flex;\
																			 justify-content:left;\
																			 align-items:center;'>\
													  <div style='display:inline-block;\
                                        margin:5px;\
                                        width:10px;\
                                        height:10px;\
                                        background-color:"
                                        + String(colors.edge_colors.claim)
                                        + ";'>\
                            </div>\
                            <div>New Claims: "
                            + String(chartDataWithTweetRates[0].values[currentTimeStepIndex].y)
                            + "</div>\
						  						</div>"
                        + "<div style='display:flex;\
                                        justify-content:left;\
                                        align-items:center;'>\
                            <div style='display:inline-block;\
                                        margin:5px;\
                                        width:10px;\
                                        height:10px;\
                                        background-color:"
                                        + String(colors.edge_colors.fact_checking)
                                        + ";'>\
                            </div>\
                            <div>New Fact-Checks: "
                            + String(chartDataWithTweetRates[1].values[currentTimeStepIndex].y)
                            + "</div>\
                          </div>";
	});

	chart.margin({right: 50, bottom: 75});

	chart.xAxis
		.tickFormat(dateFormatter);
	chart.x2Axis
		.tickFormat(dateFormatter);
	chart.forceY([0])
	chart.yAxis.axisLabel("Cumulative Tweets");

	chart.color([colors.edge_colors.claim, colors.edge_colors.fact_checking, "#00ff00"]); //color match with those of nodes


	// var insertLinebreaks = function (d) {
	// 	var el = d3.select(this);
	// 	var words = d.split(' ');
	// 	el.text('');
	
	// 	for (var i = 0; i < words.length; i++) {
	// 		var tspan = el.append('tspan').text(words[i]);
	// 		if (i > 0)
	// 			tspan.attr('x', 0).attr('dy', '15');
	// 	}
	// };
	
	// svg.selectAll('g.x.axis g text').each(insertLinebreaks);

  /**
   * Redraw the timeline
   */
	function redraw(){
		if(chart)
		{
			chart.dispatch.on("brush", null);
			d3.select('#chart svg')
			.call(chart);
			chart.dispatch.on("brush", updateDateRange);

			d3.select('#chart svg .nvd3 > g')
			.attr("transform", "translate(0, -10)");
		}
  }
  /**
   * Initialize the timeline
   */
	function removeUpdateDateRangeCallback(){
		chart.dispatch.on("brush", null);
	}

  /**
   * Formats the date using d3.time
   * @param  {String} d The date to be formatted
   * @return {String} The formatted time
   */
	function dateFormatter(d) {
		var date = new Date(d);
		var formattedDate = d3.time.format('%x %H:%M')(date);
		return formattedDate;
	}

  /**
   * Shows how many new tweets of a particular type occurred at a point in time
   * @param  {Object} chartData The data that the timeline was drawn with
   */
	function calculateTweetRates(chartData) {
		// Deep copy of the chart data as any shallow copy will mess up
		// The timeline itself, we only use this new copy for the
		// Computed tooltips
		chartDataWithTweetRates = JSON.parse(JSON.stringify(chartData));

		var previousTimestepClaims = 0;
		var previousTimestepFactChecks = 0;
		var numTimeIncrements = chartDataWithTweetRates[0].values.length;

		// Calculating rates
		for (var i = 0; i < numTimeIncrements; i++) {
			// Converting the chartDataWithTweetRates from UTC to local time zone
			// And truncating the hours/days/minutes as in chartData
			var oldDate = new Date(chartDataWithTweetRates[0].values[i].x);
			var year = oldDate.getFullYear();
			var month = oldDate.getMonth();
			var day = oldDate.getDate();
			var newDate = new Date(year, month, day);
			chartDataWithTweetRates[0].values[i].x = newDate;
			chartDataWithTweetRates[1].values[i].x = newDate;

			// Calculating New Claims for time stsep
			var currentClaims = chartDataWithTweetRates[0].values[i].y;
		    chartDataWithTweetRates[0].values[i].y =
				currentClaims - previousTimestepClaims;
			previousTimestepClaims = currentClaims;

			// Calculating New Fact Checks for time step
			var currentFactChecks = chartDataWithTweetRates[1].values[i].y;
			chartDataWithTweetRates[1].values[i].y =
				currentFactChecks - previousTimestepFactChecks;
			previousTimestepFactChecks = currentFactChecks;
		}
	}

	var debounce_timer = 0;
	var updateDateRange = function(extent){
		clearTimeout(debounce_timer);
		debounce_timer = setTimeout(function(){
			_updateDateRange(extent);
		}, 200);
	};

  /**
   * Updates the date range if the user selected a different one
   * @param  {Object} extent The timeframe selection by the user
   */
	function _updateDateRange(extent){
		if(document.getElementById("extent-0"))
		  document.getElementById("extent-0").innerHTML = extent.extent[0];
		if(document.getElementById("extent-1"))
		  document.getElementById("extent-1").innerHTML = extent.extent[1];

		if(document.getElementById("extent-00"))
		  document.getElementById("extent-00").innerHTML = new Date(extent.extent[0]).toISOString();
		if(document.getElementById("extent-11"))
		  document.getElementById("extent-11").innerHTML = new Date(extent.extent[1]).toISOString();

		var starting_time = extent.extent[0],
		ending_time = extent.extent[1];

		try
		{
			updateDateRangeCallback(starting_time, ending_time);
		}
		catch(e)
		{
			if(e === "Tried to make graph, but there is no data.")
			{
				console.info(e, "This is not an error.");
			}
			else
			{
				console.warn(e);
			}

			setTimeout(function(){
				updateDateRange(extent);
			}, 500);
		}
	}

  var max = 0;
  
  /**
   * Updates the timeline with new data
   * @param  {Object} data The data to update the timeline with
   * @return {Boolean} Will only return false if there's no data
   */
	var Update = function(data){
		max = 0;
		lastData = data;
		var max_time = 0;
		if(!data)
		{
			return {"time": null, "factChecking_values": [], "fake_values": []};
		}
		time = data.claim.timestamp,
		volume_factchecking = data.fact_checking.volume, volume_fake = data.claim.volume,
		factChecking_values = [], fake_values = [];

		for (var i in volume_fake)
		{
			var ts = new Date(time[i]).getTime();
			if(volume_factchecking[i] > max)
			{
				max = volume_factchecking[i];
			}
			if(volume_fake[i] > max)
			{
				max = volume_fake[i];
			}
			if(ts > max_time)
			{
				max_time = ts;
			}

			factChecking_values.push({x: new Date(time[i]), y: volume_factchecking[i]});
			fake_values.push({x: new Date(time[i]), y: volume_fake[i]});
		}

    chartData.length = 0;
		if(!!chart.update){
			chart.update();
		}

		var factChecking_series = {
			key: 'Fact-checks',
			values: factChecking_values,
			c: colors.edge_colors.fact_checking
		};
		var fake_series = {
			key: 'Claims',
			values: fake_values,
			c:colors.edge_colors.claim
		};

		chartData.push(fake_series);
		chartData.push(factChecking_series);
		calculateTweetRates(chartData);

		// This adds an event handler to the focus chart
		try {
			d3.select('#chart svg')
			.datum(chartData)
			.call(chart);
		}
		catch(e){
			console.debug(e);
		}
	}

  /**
   * Update timestamp based on the graph's timestamp
   */
	function UpdateTimestamp(){
		if(graphAnimation.current_timestamp)
		{
			chartData[2] = {
				key: 'Time',
				values: [
					{ x: new Date(graphAnimation.current_timestamp), y: 0},
					{ x: new Date(graphAnimation.current_timestamp), y: max}
				],
				disableTooltip: true
			};
		}
		else
		{
			delete chartData[2];
		}

		chart.dispatch.on("brush", null);
		d3.select('#chart svg')
		.datum(chartData)
		.call(chart);
		chart.dispatch.on("brush", updateDateRange);
	}

	returnObj.removeUpdateDateRangeCallback = removeUpdateDateRangeCallback;
	returnObj.update = Update;
	returnObj.chart = chart;
	returnObj.redraw = redraw;
	returnObj.updateTimestamp = UpdateTimestamp;
	return returnObj;
}
