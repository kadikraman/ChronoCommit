(function() {

	'use strict';

	/* Directives */

	/**
	 * This directive exists to hold the large world map
	 * visualisation. This creates its own containing div
	 * and fills itself using the DataMap library.
	 *
	 * Additionally some scope watching occurs, and a
	 * redraw happens if the data service changes.
	 */
	angular.module('chronoCommit.directives', [])
		.directive('worldMap', ['colorService', 'utilities',
			function(colorService, utilities) {
				function link(scope, element, attrs) {
					// Values stored so that the background can be restored after resizing.
					var gradient, backgrounds, currentHour, previousHour;

					// Set defaults for the hour
					currentHour = 0;
					previousHour = 0;

					element[0].style.position = 'absolute';
					element[0].style.display = 'block';
					element[0].style.width = '100%';
					element[0].style.height = '100%';

					var testMap = new Datamap({
						element: element[0],
						defaultFill: 'hsl(206,0%,50%)',
						fills: colorService.getColorPalette(339),
						projection: 'mercator',
						redrawOnResize: true,
						data: {},
						geographyConfig: {
							popupTemplate: function(geo, data) {
								var hoverinfo = ['<div class="hoverinfo"><strong>' + geo.properties.name + '</strong><br/>'];
								if (data === null) {
									hoverinfo.push('No data');
								} else {
									hoverinfo.push(data.numberOfThings + ' commits');
								}

								hoverinfo.push('</div>');
								return hoverinfo.join('');

							}
						},
						// handles what happens when you click on a country
						done: function(datamap) {
							var svg = datamap.svg;
							svg.selectAll('.datamaps-subunit').on('click', function(d) {
								var countryId = d.id;
								scope.$apply(function() {
									scope.countryClicked = countryId;
								});
							})
						}
					});

					var backgroundClass = "sunlight-background";

					// Define the linear gradient used for the background in here.
					function addGradient() {
						var gradient = testMap.svg.append("defs")
							.append("linearGradient")
							.attr("id", "sun")
							.attr("x1", "0%")
							.attr("y1", "0%")
							.attr("x2", "100%")
							.attr("y2", "0%")
							.attr("spreadMethod", "pad");

						var firstBound = gradient.append("svg:stop")
							.attr("offset", "20%")
							.attr("stop-color", "#0083B9")
							.attr("stop-opacity", 0.5);

						var secondBound = gradient.append("svg:stop")
							.attr("offset", "35%")
							.attr("stop-color", "midnightblue")
							.attr("stop-opacity", 1);

						var thirdBound = gradient.append("svg:stop")
							.attr("offset", "65%")
							.attr("stop-color", "midnightblue")
							.attr("stop-opacity", 1);

						var lastBound = gradient.append("svg:stop")
							.attr("offset", "80%")
							.attr("stop-color", "#0083B9")
							.attr("stop-opacity", 0.5);

						return gradient;
					}

					// Takes on a D3 selection, and returns the width of the corresponding SVG element.
					function getWidthOfElementFromD3Selection(selection) {
						return selection[0][0].getBBox().width;
					}

					// Updates the backgrounds based on the current time.
					// This assumes that the change between hours is continuous.
					function updateBackgrounds(hour, previousHour, bgrounds) {
						if (!utilities.isUndefinedOrNull(hour)) {
							// Translate all of the things.
							// Current location is left, right or center
							angular.forEach(bgrounds, function(background, currentLocation) {
								var width = getWidthOfElementFromD3Selection(background);
								var widthPerHour = width / 24;

								// Initial offset to line it up correctly.
								var xOffset = -(hour - 15.75) * widthPerHour;

								background
									.attr("transform", "translate(" + xOffset + ",0)")
									.attr("width", "100%")
									.attr("height", "100%");
							});
						}
					}

					// Collect the items used as the background image.
					// Adds the background image to SVG, and returns the D3 selection
					function addBackground(position) {
						var background = testMap.svg.insert("rect", "g")
							.attr("class", backgroundClass)
							.attr("width", "100%")
							.attr("height", "100%")
							.attr("fill", "url(#sun)");

						var width = getWidthOfElementFromD3Selection(background);
						var positionForBackground = {
							"left": -width,
							"middle": 0,
							"right": width
						};

						background.attr("x", positionForBackground[position]);
						return background;
					}

					// Draws a default background, with 3 images (2 off canvas, one either side).
					// Returns the d3 background items in an object.
					function drawDefaultBackground() {
						var backgrounds = {};

						backgrounds.left = addBackground("left");
						backgrounds.middle = addBackground("middle");
						backgrounds.right = addBackground("right");

						return backgrounds;
					}

					// Deals with resizing
					// The map will redraw, overwriting the existing SVG.
					// Will first need the linear gradient. Then add backgrounds. Finally update the position of the backgrounds.
					function drawBackground() {
						gradient = addGradient();
						backgrounds = drawDefaultBackground();
						updateBackgrounds(currentHour, previousHour, backgrounds);
					}

					// Initialise the background.
					drawBackground();

					// Register the onresize function. Ensure we don't override any existing onresize functionality.
					if (window.onresize !== null) {
						var existingOnResize = window.onresize;

						window.onresize = function() {
							existingOnResize();
							drawBackground();
						};
					} else {
						window.onresize = function() {
							drawBackground();
						};
					}

					/**
					 * Watch the countries value (data bound to
					 * the controller) and if it does, update the
					 * map drawing.
					 * @param  {} newValue - Value the object changed to
					 * @param  {} oldValue - Value the object changed from
					 */
					scope.$watchCollection('countries', function(newValue, oldValue) {
						if (!utilities.isUndefinedOrNull(newValue)) {
							testMap.updateChoropleth(newValue);
						}
					});

					/**
					 * Watch the currentHour value (data bound to
					 * the controller) and if it does, update the
					 * background of the map.
					 * @param  {} newValue - Value the object changed to
					 * @param  {} oldValue - Value the object changed from
					 */
					scope.$watch('currentHour', function(newValue, oldValue) {
						if (!utilities.isUndefinedOrNull(newValue)) {
							// Move the static SVG images.
							// There is a duplicate image off canvas to the left to simulate scrolling.
							updateBackgrounds(newValue, oldValue, backgrounds);

							// Set these values so that they can be referenced if the page is resized.
							currentHour = newValue;
							previousHour = oldValue;
						}
					});
				}

				return {
					restrict: ' E ',
					scope: {
						countries: ' = ',
						countryClicked: ' = ',
						currentHour: ' = '
					},
					link: link
				};
			}
		])
		.directive('timeSlider', function() {

			function link(scope, element, attrs) {
				var margin = {
						top: 0,
						right: 10,
						bottom: 0,
						left: 10
					},
					width = 500 - margin.left - margin.right,
					height = 40 - margin.bottom - margin.top;

				var xMax = 167;
				var x = d3.scale.linear()
					.domain([0, xMax])
					.range([0, width])
					.clamp(true);

				var brush = d3.svg.brush()
					.x(x)
					.extent([0, 0])
					.on("brush", brushed);

				var svg = d3.select(element[0]).append("svg")
					.attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
					.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				svg.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height / 2 + ")")
					.call(d3.svg.axis()
						.scale(x)
						.orient("bottom")
						.tickFormat(function(d, i) {
							var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
							return days[i];
						})
						.tickValues([0, 24, 48, 72, 96, 120, 144])
						.tickSize(0)
						.tickPadding(12))
					.select(".domain")
					.select(function() {
						return this.parentNode.appendChild(this.cloneNode(true));
					})
					.attr("class", "halo");

				var slider = svg.append("g")
					.attr("class", "slider")
					.call(brush);

				slider.selectAll(".extent,.resize")
					.remove();

				slider.select(".background")
					.attr("height", height);

				var handle = slider.append("circle")
					.attr("class", "handle")
					.attr("transform", "translate(0," + height / 2 + ")")
					.attr("r", 9);

				slider
					.call(brush.event)
					.transition() // gratuitous intro!
				.duration(750)
					.call(brush.extent([scope.sliderPosition, scope.sliderPosition]))
					.call(brush.event);

				// Move the slider to the next value
				function autonext() {
					var value = scope.sliderPosition;

					var newValue = value + 1;
					if (newValue > xMax) {
						newValue = 0;
					}

					scope.$apply(function() {
						scope.sliderPosition = newValue;
					});

					// Animate slider
					slider
						.call(brush.event)
						.transition()
						.duration(250)
						.ease("linear")
						.call(brush.extent([scope.sliderPosition, scope.sliderPosition]))
						.call(brush.event);
				}

				var autonextHook = setInterval(autonext, 250);

				function brushed() {
					var value = brush.extent()[0];

					if (d3.event.sourceEvent) { // not a programmatic event
						// As soon as we get a mouse event, kill autonext()
						clearInterval(autonextHook);

						value = x.invert(d3.mouse(this)[0]);
						scope.$apply(function() {
							scope.sliderPosition = value;
						});
						brush.extent([value, value]);
					}

					handle.attr("cx", x(value));
				}
			}

			return {
				restrict: ' E ',
				scope: {
					sliderPosition: ' = '
				},
				link: link
			};

		})
		.directive('projectOverview', function() {
			return {
				restrict: 'E',
				templateUrl: 'partials/project-overview.html'
			};
		})
		.directive('projectDescription', function() {
			return {
				restrict: 'E',
				templateUrl: 'partials/project-description.html'
			};
		})
		.directive('javascriptInits', function() {
			return {
				restrict: 'E',
				templateUrl: 'partials/javascript-inits.html'
			};
		})
		.directive('countryGraph', function() {

			function link(scope, element, attrs) {

				// breaking the global variable rules. sorry. improvements welcome
				var countryData = scope.country;

				/*These lines are all chart setup.  Pick and choose which chart features you want to utilize. */
				nv.addGraph(function() {
					var chart = nv.models.lineChart()
						.margin({
							left: 100,
							right: 100,
							top: 100,
							bottom: 150
						}) //Adjust chart margins to give the x-axis some breathing room.
						.useInteractiveGuideline(true) //We want nice looking tooltips and a guideline!
						.transitionDuration(350) //how fast do you want the lines to transition?
						.showLegend(true) //Show the legend, allowing users to turn on/off line series.
						.showYAxis(true) //Show the y-axis
						.showXAxis(true) //Show the x-axis
					;

					chart.xAxis //Chart x-axis settings
					.axisLabel('Day/hour')
						.tickFormat(d3.format(',r'));

					chart.yAxis //Chart y-axis settings
					.axisLabel('Commits')
						.tickFormat(d3.format(',r'));

					/* Done setting the chart up? Time to render it!*/
					var myData = getCountryData(countryData); //You need data...

					var svg = d3.select(element[0]).append("svg")
						.attr("width", "90%")
						.attr("height", "70%")
						.attr("id", "countrySvg")
						.datum(myData) //Populate the <svg> element with chart data...
						.call(chart); //Finally, render the chart!

					//Update the chart when window resizes.
					nv.utils.windowResize(function() {
						chart.update()
					});
					return chart;
				});

				function getCountryData(countryData) {
					var countryCommitArray = getCountryCommitArray(countryData)
					return [{
						values: countryCommitArray,
						key: 'Commits per hour',
						color: '#2ca02c'
					}]
				}

				function getCountryCommitArray(unsortedArray) {
					var sortedArray = getSortedCountryData(unsortedArray);
					var countryCommitArray = [];

					for (var i = 0; i < sortedArray.length; i++) {
						countryCommitArray.push({
							x: i + 1,
							y: sortedArray[i].commits
						});
					}
					return countryCommitArray
				}

				function getSortedCountryData(unsortedArray) {
					return unsortedArray.sort(function(a, b) {
						if (a.day < b.day)
							return -1
						else if (a.day > b.day)
							return 1
						else if (a.hour < b.hour)
							return -1
						else
							return 1
					})
				}
			};

			return {
				restrict: ' E ',
				scope: {
					country: ' = '
				},
				link: link
			};
		});
})();