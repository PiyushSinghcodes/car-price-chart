import React, { useCallback } from 'react';
import * as d3 from 'd3';
import { formatPriceInLakhs } from '../../utils/formatters';
import '../../styles/DetailedView.css';

/**
 * Create detailed view when a year bar is clicked
 * @param {Object} props - Component props
 * @param {function} props.getResponsiveScales - Function to get responsive scales
 * @param {Object} props.carData - Car data
 * @param {string} props.filteredRegion - Current filtered region
 * @param {string} props.selectedRegion - Selected region
 * @param {Object} props.myCarData - Reference car data
 * @param {Array} props.yearlyData - Yearly data array
 * @param {Object} props.tooltipRef - Tooltip reference
 * @param {Array} props.barColors - Bar colors array
 * @param {Function} props.setSelectedYear - Function to set selected year
 * @returns {Function} handleBarClick function
 */
const DetailedView = ({ 
  getResponsiveScales,
  carData, 
  filteredRegion, 
  selectedRegion, 
  myCarData, 
  yearlyData,
  tooltipRef,
  barColors,
  setSelectedYear
}) => {
  
  const handleBarClick = useCallback((event, d) => {
    d3.selectAll("#detail-modal, .detailed-tooltip, #detail-overlay, #detailed-view, .tooltip").remove();
    setSelectedYear(d.year);
  
    const yearCars = filteredRegion === 'All'
      ? carData[d.year]?.cars || []
      : (carData[d.year]?.cars || []).filter(car => car.region === selectedRegion);
  
    if (myCarData && myCarData.year === d.year) {
      yearCars.push(myCarData);
    }
    
    if (yearCars.length === 0) {
      console.log("No cars available for this year.");
      return;
    }
    
    const overlay = d3.select('body')
      .append('div')
      .attr('id', 'detail-overlay');
   
    const modal = d3.select('body')
      .append('div')
      .attr('id', 'detail-modal');
  
    // Add click handlers
    overlay.on('click', () => {
      d3.selectAll("#detail-modal, .detailed-tooltip, #detail-overlay, #detailed-view, .tooltip")
        .transition()
        .duration(200)
        .style('opacity', 0)
        .remove();
    });
  
    modal.on('click', (event) => {
      event.stopPropagation();
    });
    
    const detailedView = d3.select('body')
      .append('div')
      .attr('id', 'detailed-view');
    
    // Add close button that removes both overlay and detailed view
    const closeButton = modal.append('div')
      .attr('class', 'close-button')
      .text('All years')
      .on('click', () => {
        d3.selectAll("#detail-modal, .detailed-tooltip, #detail-overlay, #detailed-view, .tooltip")
          .style('opacity', 0)
          .remove();
  
        overlay.style('opacity', '0.5')
          .transition()
          .duration(200)
          .remove();
        modal.style('opacity', '0')
          .style('transform', 'translate(-50%, -48%)')
          .transition()
          .duration(200)
          .remove();
      });
  
    detailedView.on('click', function (event) {
      event.stopPropagation();
    });
      
    const margin = { top: 80, right: 60, bottom: 80, left: 80 };
    const width = 620;
    const height = 196;
  
    // Create SVG container for the detailed view
    const detailedSvg = modal.append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('max-width', '100%')
      .style('height', 'auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  
    // Create scales for the detailed view
    const detailedX = d3.scaleLinear()
      .domain([0, 150000])
      .range([0, width]);
  
    const detailedY = d3.scaleLinear()
      .domain([0, Math.max(...yearCars.map(car => car.price))])  // Use max price from all cars including myCarData
      .range([height, 0]);
  
    // Add colored background rectangle
    detailedSvg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', '620px')
      .attr('height', '196px')
      .attr('fill', barColors[yearlyData.findIndex(yd => yd.year === d.year) % barColors.length])
      .attr('opacity', 0.3);
  
    // Add gridlines
    detailedSvg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(detailedY)
        .tickSize(-width)
        .tickFormat('')
      );
  
    // Add Y axis
    const detailedYAxis = detailedSvg.append('g')
      .call(d3.axisLeft(detailedY)
        .tickFormat(d => `${(d / 100000).toFixed(1)}L`))
      .style('color', '#4A4A4C');
  
    detailedYAxis.select('.domain').remove();
  
    // Add Y axis label
    detailedYAxis.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', -60)
      .attr('x', -(height / 2))
      .text('Price (in ₹)');
  
    // Add X axis
    detailedSvg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(detailedX)
        .tickFormat(d => {
          if (d >= 1000) {
            return `${d / 1000}K`;
          }
          return d;
        }))
      .style('color', '#4A4A4C')
      .style('font-size', '12px')
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', width / 2)
      .attr('y', 35)
      .text(` ${d.year} (Distance Travelled(in km))`);
  
    // Add title
    detailedSvg.append('text')
      .attr('class', 'chart-title')
      .attr('x', -50)
      .attr('y', -65)
      .text(`Price Insights`);
  
    // Replace the data points section with car icons
    yearCars.forEach(car => {
      const { carScale, hoverScale, translateOffset } = getResponsiveScales();
  
      // Check if this is myCarData to apply special styling
      const isMyCar = car === myCarData;
  
      const carIcon = detailedSvg.append('g')
        .attr('class', isMyCar ? 'my-car-icon' : 'car-icon')
        .attr('transform', `translate(${detailedX(Math.min(car.distance, 150000)) - translateOffset},${detailedY(car.price) - translateOffset})`)
        .style('cursor', 'pointer');
  
      if (isMyCar) {
        // Add yellow highlight circle for mycar
        carIcon.append('circle')
          .attr('class', 'my-car-highlight')
          .attr('r', 27)
          .attr('cx', 20)
          .attr('cy', 20)
          .style('opacity', 0.8)
          .style('filter', 'drop-shadow(0 0 8px rgba(255, 229, 102, 0.8))');
      }
  
      carIcon.append('path')
        .attr('class', 'car-path')
        .attr('d', 'M499.99 176h-59.87l-16.64-41.6C406.38 91.63 365.57 64 319.5 64h-127c-46.06 0-86.88 27.63-103.99 70.4L71.87 176H12.01C4.2 176-1.53 183.34.37 190.91l6 24C7.7 220.25 12.5 224 18.01 224h20.07C24.65 235.73 16 252.78 16 272v48c0 16.12 6.16 30.67 16 41.93V416c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-32h256v32c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-54.07c9.84-11.25 16-25.8 16-41.93v-48c0-19.22-8.65-36.27-22.07-48H494c5.51 0 10.31-3.75 11.64-9.09l6-24c1.89-7.57-3.84-14.91-11.65-14.91zm-352.06-17.83c7.29-18.22 24.94-30.17 44.57-30.17h127c19.63 0 37.28 11.95 44.57 30.17L384 208H128l19.93-49.83zM96 319.8c-19.2 0-32-12.76-32-31.9S76.8 256 96 256s48 28.71 48 47.85-28.8 15.95-48 15.95zm320 0c-19.2 0-48 3.19-48-15.95S396.8 256 416 256s32 12.76 32 31.9-12.8 31.9-32 31.9z')
        .attr('fill', isMyCar ? 'none' : car.Color)
        .attr('stroke', isMyCar ? '#FFFFFF' : 'none')
        .attr('stroke-width', isMyCar ? '20' : '0')
        .attr('transform', `scale(${carScale})`)
        .style('filter', 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))');
  
      // Update hover effects
      carIcon
        .on('mouseover', function (event) {
          if (isMyCar) {
            d3.select(this).select('circle')
              .attr('r', 30)
              .style('opacity', 0.8)
              .style('filter', 'drop-shadow(0 0 15px rgba(255, 229, 102, 1))');
          }
  
          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('transform', `scale(${carScale * hoverScale})`)
            .style('filter', 'drop-shadow(3px 3px 4px rgba(0,0,0,0.4))');
  
          const tooltip = d3.select(tooltipRef.current);
          
          // Make sure the tooltip is visible
          tooltip
            .style('visibility', 'visible')
            .style('opacity', '1')
            .classed('visible', true)
            .style('left', `${event.pageX + 15}px`)
            .style('top', `${event.pageY - 100}px`)
            .html(`
              <div class="tooltip-inner">
                <div class="tooltip-content">
                  <div class="tooltip-header">${isMyCar ? 'My Car Details' : 'Car Details'}</div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Model:</span>
                    <span class="tooltip-value">${car.model}</span>
                  </div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Distance:</span>
                    <span class="tooltip-value">${car.distance.toLocaleString()} km</span>
                  </div>
                  <div class="tooltip-row">
                    <span class="tooltip-label">Price:</span>
                    <span class="tooltip-value">${formatPriceInLakhs(car.price)}</span>
                  </div>
                </div>
              </div>
            `);
        })
        .on('mouseout', function () {
          if (isMyCar) {
            d3.select(this).select('circle')
              .attr('r', 27)
              .style('opacity', 0.6)
              .style('filter', 'drop-shadow(0 0 8px rgba(255, 229, 102, 0.8))');
          }
  
          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('transform', `scale(${carScale})`)
            .style('filter', 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))');
  
          // Hide the tooltip
          d3.select(tooltipRef.current)
            .style('visibility', 'hidden')
            .style('opacity', '0')
            .classed('visible', false);
        });
    });
  
    // Extract unique regions
    const uniqueRegions = {};
    Object.values(carData).forEach(yearData => {
      yearData.cars.forEach(car => {
        if (car.region && car.Color) {
          uniqueRegions[car.region] = car.Color;
        }
      });
    });
  
    // Add legend
    const detailedLegend = detailedSvg.append('g')
      .attr('class', 'legend')
      .attr("transform", `translate(${width / 2 - 400}, ${height + 50})`);
  
    return () => {
      d3.select('#detailed-view').remove();
      d3.select('.detailed-tooltip').remove();
    };
  }, [carData, filteredRegion, selectedRegion, myCarData, tooltipRef, yearlyData, barColors]);

  return { handleBarClick };
};

export default DetailedView;
