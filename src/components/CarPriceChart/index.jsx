import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar } from '@fortawesome/free-solid-svg-icons';

// Import hooks
import useCarData from '../../hooks/useCarData';
import useChartDimensions from '../../hooks/useChartDimensions';

// Import components
import RegionSelector from './RegionSelector';
import ChartTooltip from './ChartTooltip';
import DetailedView from './DetailedView';

// Import utils
import { getFilteredData, barColors } from '../../utils/chartUtils';

// Import styles
import '../CarPriceChart.css';

/**
 * Car Price Chart Component
 * Displays car price data in a chart format
 * @returns {JSX.Element} CarPriceChart component
 */
const CarPriceChart = () => {
  // Refs
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);

  // Custom hooks
  const {
    selectedRegion,
    filteredRegion,
    regions,
    carData,
    loading,
    myCarData,
    yearlyData,
    setSelectedYear,
    handleRegionChange,
    handleToggleButton
  } = useCarData();

  const {
    screenWidth,
    getResponsiveScales,
    getTooltipPosition,
    getMargins
  } = useChartDimensions();

  // Get detailed view handler
  const { handleBarClick } = DetailedView({
    getResponsiveScales,
    carData,
    filteredRegion,
    selectedRegion,
    myCarData,
    yearlyData,
    tooltipRef,
    barColors,
    setSelectedYear
  });

  // Draw main chart
  useEffect(() => {
    if (!svgRef.current || !tooltipRef.current) return;
 
    const filteredCarData = getFilteredData(carData, filteredRegion, selectedRegion, myCarData);
    const filteredYearlyData = Object.entries(filteredCarData).map(([year, data]) => {
      let maxPriceFromData = Math.max(...data.cars.map(car => car.price), 0);

      // Include myCarData price if it matches the year
      if (myCarData && myCarData.year.toString() === year) {
        maxPriceFromData = Math.max(maxPriceFromData, myCarData.price);
      }

      return {
        year,
        maxPrice: maxPriceFromData,
        cars: data.cars.map(car => ({
          price: car.price,
          color: car.Color || "#000000" 
        }))
      };
    });

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const margin = getMargins();

    const width = 682;
    const height = 245;

    // Create responsive SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height + margin.top + margin.bottom)
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales for main chart
    const x = d3.scaleBand()
      .range([0, width])
      .padding(0.1)
      .domain(filteredYearlyData.map(d => d.year));

    const y = d3.scaleLinear()
      .range([height, 0])
      .domain([0, d3.max(filteredYearlyData, d => d.maxPrice)]);

    const distanceScale = d3.scaleLinear()
      .domain([0, 150000])  
      .range([0, x.bandwidth()]); 

    // Draw bars
    const bars = svg.selectAll('.bar')
      .data(filteredYearlyData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.year))
      .attr('width', x.bandwidth())
      .attr('y', d => y(d.maxPrice))
      .attr('height', d => height - y(d.maxPrice))
      .style('fill', (d, i) => barColors[i % barColors.length])  
      .style('cursor', 'pointer');

    // Add gridlines for y axis
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
      )
      .style('stroke-opacity', '0.2');

    // Y axis with label 
    const yAxis = svg.append('g')
      .call(d3.axisLeft(y)
        .tickFormat(d => `${(d / 100000).toFixed(1)}L`))
      .style('color', '#4A4A4C');

    yAxis.select('.domain').remove();            

    yAxis.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 13)
      .attr('x', -(height / 2) + 5)
      .attr('fill', '#585A5A')
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', '400')
      .style('font-family', 'Noto Sans, sans-serif')
      .attr('letter-spacing', '0.475px')
      .text('Price ( in ₹ )'); 

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .style('color', '#4A4A4C')
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('font-size', '15.205px')
      .attr('font-weight', '400')
      .style('font-family', 'Noto Sans, sans-serif')
      .attr('fill', '#585A5A')
      .attr('text-anchor', 'middle')
      .attr('letter-spacing', '0.475px')
      .text('Year(with distance spread(0-150K km))');

    // Create tooltip with fixed positioning
    const tooltip = d3.select(tooltipRef.current)
      .attr("id", "tooltip-contain");
    
    // Update data points with clear positioning
    Object.entries(filteredCarData).forEach(([year, yearData]) => {
      svg.selectAll(`.data-point-${year}`)
        .data(yearData.cars)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => {
          const barX = x(d.year);
          if (barX === undefined) return 0;
          const barWidth = x.bandwidth();
          const distance = Math.min(Math.max(d.distance || 0, 0), 150000);
          return barX + (barWidth * (distance / 150000));
        })
        .attr('cy', d => y(d.price))
        .attr('r', screenWidth <= 480 ? 3 :
          screenWidth <= 768 ? 4 : 5)
        .attr('fill', d => d.Color || '#999')
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this)
            .attr('r', screenWidth <= 480 ? 5 : screenWidth <= 768 ? 6 : 7)
            .style('opacity', 0.8);
          tooltip
            .style('visibility', 'visible')
            .style('top', `${event.pageY - 60}px`)
            .style('left', `${event.pageX + 20}px`)
            .html(`
              <div id="tooltip-container">
                <div class="tooltip-content">
                  <div class="tooltip-header">Car Details</div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Model:</span>
                    <span class="tooltip-value">${d.model}</span>
                  </div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Distance:</span>
                    <span class="tooltip-value">${d.distance.toLocaleString()} km</span>
                  </div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Region:</span>
                    <span class="tooltip-value">${d.region}</span>
                  </div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Price:</span>
                    <span class="tooltip-value">${(d.price / 100000).toFixed(2)} Lakhs</span>
                  </div>
                </div>
              </div>
            `);
        })
        .on('mouseout', function () {
          d3.select(this).attr('r', 5);
          tooltip.style('visibility', 'hidden');
        })
        .on('mousemove', function (event) {
          tooltip
            .style('top', `${event.pageY - 60}px`)
            .style('left', `${event.pageX + 20}px`);
        });
    });

    // Add my car icon if it exists
    if (myCarData) {
      const { carScale, hoverScale, translateOffset } = getResponsiveScales();
      
      const carIcon = svg.append('g')
        .attr('class', 'my-car-icon')
        .attr('transform', `translate(${x(myCarData.year) + distanceScale(Math.min(myCarData.distance, 150000)) - translateOffset},${y(myCarData.price) - translateOffset})`)
        .style('cursor', 'pointer');

      // Add yellow highlight circle behind the icon
      carIcon.append('circle')
        .attr('r', 27)
        .attr('fill', '#FFE566')
        .attr('cx', 20)
        .attr('cy', 20)
        .style('opacity', 0.6)
        .style('filter', 'drop-shadow(0 0 8px rgba(255, 229, 102, 0.8))')
        .style('animation', 'glowing 2s infinite');

      carIcon.append('path')
        .attr('d', 'M499.99 176h-59.87l-16.64-41.6C406.38 91.63 365.57 64 319.5 64h-127c-46.06 0-86.88 27.63-103.99 70.4L71.87 176H12.01C4.2 176-1.53 183.34.37 190.91l6 24C7.7 220.25 12.5 224 18.01 224h20.07C24.65 235.73 16 252.78 16 272v48c0 16.12 6.16 30.67 16 41.93V416c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-32h256v32c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-54.07c9.84-11.25 16-25.8 16-41.93v-48c0-19.22-8.65-36.27-22.07-48H494c5.51 0 10.31-3.75 11.64-9.09l6-24c1.89-7.57-3.84-14.91-11.65-14.91zm-352.06-17.83c7.29-18.22 24.94-30.17 44.57-30.17h127c19.63 0 37.28 11.95 44.57 30.17L384 208H128l19.93-49.83zM96 319.8c-19.2 0-32-12.76-32-31.9S76.8 256 96 256s48 28.71 48 47.85-28.8 15.95-48 15.95zm320 0c-19.2 0-48 3.19-48-15.95S396.8 256 416 256s32 12.76 32 31.9-12.8 31.9-32 31.9z')
        .attr('fill', 'none')  // Remove fill
        .attr('stroke', '#FFFFFF')  // White outline
        .attr('stroke-width', '20')  // Thicker outline
        .attr('transform', `scale(${carScale})`)
        .style('filter', 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))');

      carIcon
        .on('mouseover', function (event) {
          d3.select(this).select('circle')
            .attr('r', 30)
            .style('opacity', 0.8);

          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('transform', `scale(${carScale * hoverScale})`);

          tooltip
            .style('visibility', 'visible')
            .style('left', `${event.pageX + 15}px`)
            .style('top', `${event.pageY - 100}px`)
            .html(`
              <div id="tooltip-container">
                <div class="tooltip-content">
                  <div class="tooltip-header">My Car Details</div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Model:</span>
                    <span class="tooltip-value">${myCarData.model}</span>
                  </div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Distance:</span>
                    <span class="tooltip-value">${myCarData.distance.toLocaleString()} km</span>
                  </div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Price:</span>
                    <span class="tooltip-value">₹ ${(myCarData.price / 100000).toFixed(2)} Lakhs</span>
                  </div>
                </div>
              </div>
            `);
        })
        .on('mouseout', function () {
          d3.select(this).select('circle')
            .attr('r', 27)
            .style('opacity', 0.6);

          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('transform', `scale(${carScale})`);

          tooltip.style('visibility', 'hidden');
        });
    }

    // Add bar click handler
    bars.on('click', (event, d) => handleBarClick(event, d));

    // Update font sizes based on screen size
    const fontSize = screenWidth <= 480 ? '10px' :
      screenWidth <= 768 ? '12px' : '14px';

    // Update axis styling
    yAxis.selectAll('text')
      .style('font-size', fontSize);

    svg.select('.x-axis')
      .selectAll('text')
      .style('font-size', fontSize)
      .style('text-anchor', screenWidth <= 480 ? 'end' : 'middle')
      .attr('transform', screenWidth <= 480 ? 'rotate(-45)' : 'rotate(0)');

    // Add cleanup function
    return () => {
      // Clean up event listeners and remove elements
      d3.select(svgRef.current).selectAll("*").remove();
      d3.select('#detailed-view').remove();
    };
  }, [yearlyData, screenWidth, getResponsiveScales, getTooltipPosition, selectedRegion, filteredRegion, carData, myCarData, handleBarClick]);

  return (
    <div
      ref={containerRef}
      className="chart-container"
    >
      <div className="chart-header">
        <h2 className="chart-title">
          Price Insights
        </h2>

        <RegionSelector
          selectedRegion={selectedRegion}
          filteredRegion={filteredRegion}
          regions={regions}
          handleRegionChange={handleRegionChange}
          handleToggleButton={handleToggleButton}
          loading={loading}
        />
      </div>

      <svg
        ref={svgRef}
        className="chart-svg"
        preserveAspectRatio="xMidYMid meet"
      ></svg>
      
      <ChartTooltip ref={tooltipRef} />
      
      <div className="instruction-container">
        <p className="instruction-text">
          Please <span className="instruction-highlight">click on the bar</span> for which you want to view the pricing.
        </p>

        <div className="car-icon-legend">
          <FontAwesomeIcon icon={faCar} className="car-icon" />
          Chosen car
        </div>
      </div>
    </div>
  );
};

export default CarPriceChart;
