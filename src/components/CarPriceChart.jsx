import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
// import { handleBarClick } from './Bar';
import './CarPriceChart.css';
const CarPriceChart = () => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [filteredRegion, setFilteredRegion] = useState('All');
  const [carData, setCarData] = useState([]);
  const [fetchedData, setFetchedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableCars, setAvailableCars] = useState([]);
  const [referenceCar, setReferenceCar] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  // const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState({ vehicle_id: "2344" }); // ✅ Set a default valid ID

  const [error, setError] = useState(null);

  const regions = ['All', 'delhi', 'bangalore', 'mumbai', 'Faridabad'];
  const years = selectedYear
    ? [selectedYear]
    : Array.from({ length: 2024 - 2015 + 1 }, (_, i) => 2015 + i);
  // Add resize listener
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive scales
  const getResponsiveScales = useCallback(() => {
    if (screenWidth <= 480) { // Mobile
      return {
        carScale: 0.08,
        hoverScale: 1.2,
        translateOffset: 20
      };
    } else if (screenWidth <= 768) { // Tablet
      return {
        carScale: 0.08,
        hoverScale: 1.2,
        translateOffset: 20
      };
    } else { // Desktop
      return {
        carScale: 0.08,
        hoverScale: 1.2,
        translateOffset: 20
      };
    }
  }, [screenWidth]);

  // Get tooltip position based on screen size
  const getTooltipPosition = useCallback((event) => {
    if (screenWidth <= 480) {
      return {
        x: event.pageX - 100,
        y: event.pageY - 200
      };
    }
    return {
      x: event.pageX + 15,
      y: event.pageY - 100
    };
  }, [screenWidth]);

  // Add region colors (add this near the top of the component)
  const regionColors = {
    "delhi": '#FF8B56',
    "mumbai": '#DE3730',
    "bangalore": '#379B56',
    "Faridabad": '	#FAD5A5'
  };
  useEffect(() => {
    const fetchAvailableCars = async () => {
      if (!selectedVehicleId) {
        console.warn("❌ API call skipped: No selectedVehicleId");
        return;
      }
      console.log("✅ Fetching available cars for vehicle_id:", selectedVehicleId);
      try {
        setLoading(true);
        const response = await axios.post("https://crm-dev.nxcar.in/api/listcar-individual",
          { vehicle_id: selectedVehicleId.vehicle_id }, // ✅ Ensure correct payload format
          {
            headers: {
              "Content-Type": "application/json", // ✅ Ensure correct content type
            },
          });

        if (response?.data) {
          console.log("Available Cars:", response.data);
          handleCarClick(response?.data?.individual);
          setAvailableCars(response?.data?.individual);
        } else {
          console.warn("Empty response from API, 00");
          setAvailableCars([]);
        }
      } catch (err) {
        console.error("Error fetching available cars:", err);
        setError("Failed to fetch available cars.");
      } finally {
        setLoading(false);
      }
    };
    fetchAvailableCars();

  }, [JSON.stringify(selectedVehicleId)]); // ✅ Runs when `selectedVehicleId` updates

  const fetchCarData = async () => {
    setLoading(true);
    try {
      // console.log('MAKEEEE',referenceCar,referenceCar.make,referenceCar.kilometers);
      setLoading(true);
      // const makeName = await fetchMakeName(referenceCar.make_id);
      if (!referenceCar || !referenceCar.make || !referenceCar.model || !referenceCar.variant) {
        console.warn("❌ Missing referenceCar data. Cannot fetch car data.");
        setCarData([]); // Set to empty array if referenceCar is not valid
        return;
      }
      const makeName = referenceCar.make;
      const modelName = referenceCar.model;
      const variantName = referenceCar.variant;

      const payload = {
        make: makeName,
        model: modelName,
        variant: variantName,
        distance: referenceCar.kilometers,
        ...(selectedRegion !== 'All' && { city: selectedRegion }),

        // Year: year // Ensure this is a number, not a string
      };

      // console.log("📤 Final API Payload:", JSON.stringify(payload, null, 2));
      const requests = years.map(year =>
        axios.post('https://dev-ai.nxcar.in/fetch-car-data',
          {
            make: makeName,  // Use resolved names
            model: modelName,
            variant: variantName,
            // ...(selectedRegion !== 'All' && { city: selectedRegion }),
            //  Year: year
          }
        )
      );

      // Wait for all requests to complete
      const responses = await Promise.all(requests);

      // Extract data from each response
      const fetchedData = responses.map(res => res.data);

      //  console.log("Fetched API Data:", fetchedData);
      if (fetchedData.length > 0) {
        const processedData = processFetchedData(fetchedData);
        // console.log("Processed Data:", processedData);
        setCarData(processedData);
      } else {
        setCarData([]); // Set empty array if no data
      }

    }
    catch (error) {
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
      setCarData([]);
    }
    finally {
      setLoading(false);
    }
  };
  const handleCarClick = (car) => {
    // console.log('ok car' ,car, car.make,car.model,car.carscope.kilometers);
    if (!car.vehicle_id) {
      console.warn("Vehicle ID is missing in selected car:", car);
      return;
    }

    // setSelectedVehicleId({ vehicle_id: car.vehicle_id }); // ✅ Always keep it in object format

    // setSelectedVehicleId(car.vehicle_id); // ✅ Update vehicle ID
    setSelectedVehicleId({ vehicle_id: "2344" });
    setSelectedMake(car.make);
    setSelectedModel(car.model);
    setSelectedVariant(car.variant);
    setReferenceCar({
      make: car.make,
      model: car.model,
      variant: car.variant,
      region: selectedRegion,
      kilometers: car.carscope.kilometers,
      price: car.price,
      year: car.year,
    });
  };
  useEffect(() => {
    if (!referenceCar?.make_id || !referenceCar?.model_id || !referenceCar?.variant_id) return;

    const updateReferenceCar = async () => {
      setLoading(true);
      try {
        setReferenceCar(prevCar => ({
          ...prevCar,
          make: referenceCar.make,
          model: referenceCar.model,
          variant: referenceCar.variant,
          kilometers: referenceCar.carscope.kilometers
        }));
        console.log("abcd", referenceCar);
      } catch (error) {
        console.error("Error updating referenceCar:", error);
      } finally {
        setLoading(false);
      }
    };

    updateReferenceCar();
  }, [referenceCar?.make_id, referenceCar?.model_id, referenceCar?.variant_id]);


  useEffect(() => {
    if (carData && Object.keys(carData).length > 0) {
      // console.log("Final Processed Car Data:", carData);
    }
  }, [carData]);  // Runs when fetchedData updates

  // useEffect(() => {
  //   fetchCarData();
  // }, [selectedMake, selectedModel, selectedVariant, selectedYear]);


  useEffect(() => {

    fetchCarData();

  }, [selectedMake, selectedModel, selectedVariant]);



  const processFetchedData = (apiData) => {
    if (!Array.isArray(apiData) || apiData.length === 0) {
      console.warn("No data to process");
      return {};
    }
    const processedData = {};
    apiData.forEach((response) => {
      // ✅ Extract actual car data from the API response
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.warn("Skipping invalid API response:", response);
        return;
      }


      response.data.forEach((car) => {
        const { Year, Make, Model, Variant, City, Distance_numeric, Price_numeric, Color } = car;
        const yearKey = Year ? Year.toString() : "Unknown";
        const parsedPrice = Price_numeric !== undefined && Price_numeric !== null ? Number(Price_numeric) : null;

        if (parsedPrice === null || isNaN(parsedPrice) || parsedPrice <= 0) {
          console.warn("Skipping invalid car data:", car);
          return; // Skip this entry if price is invalid
        }

        if (!processedData[yearKey]) {
          processedData[yearKey] = { cars: [], maxPrice: 0 };
        }

        processedData[yearKey].cars.push({
          price: parsedPrice,
          make: Make || '',
          model: Model || '',
          variant: Variant || '',
          region: City || selectedRegion, // Use City instead of region
          year: String(Year),
          distance: Number(Distance_numeric) || 0,
          Color: Color || "#000000"
        });

        // ✅ Update maxPrice safely
        processedData[yearKey].maxPrice = Math.max(processedData[yearKey].maxPrice, parsedPrice);
      });
    });
    // console.log("Processed Data Structure:", processedData);
    return processedData;
  }


  // Update myCarData to include region
  const myCarData = referenceCar ? {
    price: referenceCar.price,
    distance: referenceCar.kilometers,
    make: referenceCar.make,
    model: referenceCar.model,
    variant: referenceCar.variant,
    year: referenceCar.year,
    region: referenceCar.region,
  } : null;

  const yearlyData = useMemo(() => {
    if (!carData || Object.keys(carData).length === 0) {
      console.log("No car data available");
      return [];
    }

    const data = Object.entries(carData)
      .map(([year, yearData]) => {
        let maxPriceFromData = yearData.maxPrice || Math.max(...yearData.cars.map(car => car.price), 0);

        // ✅ Include myCarData price if it matches the year
        if (myCarData && myCarData.year.toString() === year) {
          maxPriceFromData = Math.max(maxPriceFromData, myCarData.price);
        }

        return {
          year,
          maxPrice: maxPriceFromData > 0 ? maxPriceFromData : 0,
        };
      })
      .filter(item => item.maxPrice > 0) // Remove entries with 0 price
      .sort((a, b) => a.year.localeCompare(b.year));

    // console.log("Yearly Data:", data);
    return data;
  }, [carData, myCarData]); // ✅ Depend on myCarData to recalculate



  // Helper function for price formatting (add this near the top of the component)
  const formatPriceInLakhs = (price) => {
    const inLakhs = price / 100000;
    return `₹ ${inLakhs.toFixed(2)} Lakhs`;
  };

  // Define the color pattern array (move this outside the useEffect)
  const barColors = ['#D2E8FF', '#EAF3FF', '#EAF7FF', '#DDEDFF', '#E9EBFF']

  useEffect(() => {
    console.log("filteredRegion Updated :", filteredRegion);
  }, [filteredRegion])
  // First, make sure myCarData has the correct region
  // Update the getFilteredData function
  const getFilteredData = useCallback((data) => {
    if (!data) return {};
    try {
      const processedData = {};

      Object.entries(data).forEach(([year, yearData]) => {
        let filteredCars = filteredRegion === 'All'
            ? yearData.cars
            : yearData.cars.filter(car => car.region === selectedRegion);
    
        // Ensure myCarData is added if it matches the year
        if (myCarData && myCarData.year === parseInt(year)) {
            filteredCars = [...filteredCars, myCarData];
        }
    
        processedData[year] = {
            ...yearData,
            cars: [...new Set(filteredCars)] // Avoid duplicates
        };
    });
    
      // console.log('Processed Data:', processedData);
      return processedData;

    } catch (error) {
      console.error('Error in getFilteredData:', error);
      return {};
    }
  }, [filteredRegion, selectedRegion, myCarData]);

  const handleBarClick = useCallback((event, d) => {
    d3.selectAll("#detail-modal, .detailed-tooltip, #detail-overlay, #detailed-view, .tooltip").remove();
    setSelectedYear(d.year);
    // let yearCars = [];
  
    // if (filteredRegion === 'All') {
    //   yearCars = carData[d.year]?.cars || [];
    // } else {
    //   yearCars = (carData[d.year]?.cars || []).filter(car => car.region === selectedRegion);
    // }
    const yearCars = filteredRegion === 'All'
    ? carData[d.year]?.cars || []
    : (carData[d.year]?.cars || []).filter(car => car.region === selectedRegion);

if (myCarData && myCarData.year === d.year ) {
  yearCars.push(myCarData);
}
if(yearCars.length ===0){
  console.log("No cars available for this year.");
  return;
}
const overlay = d3.select('body')
    .append('div')
    .attr('id', 'detail-overlay')
    .style('position', 'fixed')
    .style('top', '0')
    .style('left', '0')
    .style('width', '100%')
    .style('height', '100%')
    .style('background-color', 'rgba(0, 0, 0, 0.5)')
    .style('z-index', '9998');
 
    const modal = d3.select('body')
    .append('div')
    .attr('id', 'detail-modal')
    .style('position', 'fixed')
    .style('left', '20px')
    .style('top', '20px')
    
    //  .style('transform', 'translate(20px, 20px)')
    .style('background-color', '#ffffff')
    .style('padding-top', '24px')
    .style('width', '732px')
    .style('height', '413px')
    .style('border-radius', '8px')
    .style('box-shadow', '0 4px 32px rgba(0, 0, 0, 0.15)')
    .style('z-index', '9999')  // Higher z-index than overlay
    // .style('animation', 'fadeIn 0.3s ease-in-out');

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


const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, -48%); }
      to { opacity: 1; transform: translate(-50%, -50%); }
    }
    #detail-modal {
      backdrop-filter: blur(4px);
    }
  `;
  document.head.appendChild(styleSheet);

    // Create detailed view container with white background
     
    const detailedView = d3.select('body')
      .append('div')
      .attr('id', 'detailed-view')
      .style('position', 'absolute')
      .style('top', '20px')
      .style('left', '20px')
      .style('transform', 'translate(20px, 20px)')
      .style('background-color', '#ffffff')
      .style('padding', screenWidth <= 480 ? '10px' : '24px')
      .style('border', '1px solid #ddd')
      .style('box-shadow', '0 0 10px rgba(0,0,0,0.2)')
         .style('width','732px')
        .style('height','413px')
      .style('max-width', '1400px')
      .style('max-height', '900px')
      .style('overflow', 'auto')
      .style('z-index', '100')
      .style('border-radius', '8px')
      console.log("Handle BAr  click2")
    // Add close button that removes both overlay and detailed view
    const closeButton = modal.append('div')
    .style('position', 'absolute')
    .style('top', '24px')
    .style('right', '24px')
    .style('cursor', 'pointer')
    .style('background', 'var(--Sys-Color-Primary-Container, #E0FFFA)')
    .style('color', '#8FF4EE')
    .style('padding', '5px 10px')
    .style('border-radius', '8px')
    .style('box-shadow', '0px -2px 0px 0px #8FF4EE inset')
    .style('font-weight', 'bold')
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
        console.log("DetailedViewww")
        event.stopPropagation(); // 'event' is now passed explicitly in D3 v6+
      });
      
    const margin = { top: 80, right: 60, bottom: 80, left: 80 };

    // Calculate responsive width based on screen size
    // const containerWidth = screenWidth <= 480 ? screenWidth * 0.95 :
    //   screenWidth <= 768 ? screenWidth * 0.85 :
    //     Math.min(1200, screenWidth * 0.75); // Reduce width for larger screens

    // const width = containerWidth - margin.left - margin.right;
    // const height = Math.min(window.innerHeight * 0.7, 600) - margin.top - margin.bottom;


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

    // Update the data filtering logic for the detailed view
   
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
      )
      .style('stroke-opacity', '0.2');

    // Add Y axis
    const detailedYAxis = detailedSvg.append('g')
      .call(d3.axisLeft(detailedY)
        .tickFormat(d => `${(d / 100000).toFixed(1)}L`))
      .style('color', '#4A4A4C');

    detailedYAxis.select('.domain').remove();

    // Add Y axis label
    detailedYAxis.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -60)
      .attr('x', -(height / 2))
      .attr('fill', '#585A5A')
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('line-height', '11.246px')
      .attr('letter-spacing', '0.234px')
      .attr('font-weight', '400')
      .text('Price (in ₹)');
    //above is for detailed page

    // Add X axis
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
      .attr('x', width / 2)
      .attr('y', 35)
      .attr('fill', '#585A5A')
      .attr('text-anchor', 'middle')
      .attr('font-size', '15.205px')
      .attr('letter-spacing', '0.475px')
      .attr('font-weight', '400')
      // .text('Distance Traveled (km) ${d.year}');
      .text(` ${d.year} (Distance Travelled(in km))`);

    <div className="header-container"
      // style={{
      //   display: 'flex',
      //   width: '564px',
      //   height: '28px',
      //   padding: '16px',
      //   flexDirection: 'column',
      //   justifyContent: 'center',
      //   alignItems: 'flex-end',
      //   gap: '16px',
      // }}
    >
      <svg id="detailedSvg" width="500" height="500">
        {/* Your SVG content goes here */}
      </svg>
      <h2 className="chart-title">Price Insights</h2>
      {/* You can add more elements like the graph, chart, etc. */}
    </div>


    // Add title
    detailedSvg.append('text')
      .attr('x', -50) // Aligns text to the left
      .attr('y', -65)
      .attr('text-anchor', 'start') // Ensures text starts from the left
      .attr('font-size', '20px')
      .attr('font-weight', '400')
      .attr('line-height', '26px')
      .style('font-family', 'Noto Sans, sans-serif')
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
          .attr('r', 27)
          .attr('fill', '#FFE566')
          .attr('cx', 20)
          .attr('cy', 20)
          .style('opacity', 0.8)
          .style('filter', 'drop-shadow(0 0 8px rgba(255, 229, 102, 0.8))')
          .style('animation', 'glowing 5s infinite');
      }

      carIcon.append('path')
        .attr('d', 'M499.99 176h-59.87l-16.64-41.6C406.38 91.63 365.57 64 319.5 64h-127c-46.06 0-86.88 27.63-103.99 70.4L71.87 176H12.01C4.2 176-1.53 183.34.37 190.91l6 24C7.7 220.25 12.5 224 18.01 224h20.07C24.65 235.73 16 252.78 16 272v48c0 16.12 6.16 30.67 16 41.93V416c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-32h256v32c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-54.07c9.84-11.25 16-25.8 16-41.93v-48c0-19.22-8.65-36.27-22.07-48H494c5.51 0 10.31-3.75 11.64-9.09l6-24c1.89-7.57-3.84-14.91-11.65-14.91zm-352.06-17.83c7.29-18.22 24.94-30.17 44.57-30.17h127c19.63 0 37.28 11.95 44.57 30.17L384 208H128l19.93-49.83zM96 319.8c-19.2 0-32-12.76-32-31.9S76.8 256 96 256s48 28.71 48 47.85-28.8 15.95-48 15.95zm320 0c-19.2 0-48 3.19-48-15.95S396.8 256 416 256s32 12.76 32 31.9-12.8 31.9-32 31.9z')
        // .attr('fill', isMyCar ? 'none' : regionColors[car.region])
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
              .style('opacity', 0.8);
          }

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
              .style('opacity', 0.6);
          }

          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('transform', `scale(${carScale})`);

          tooltip.style('visibility', 'hidden');
        });
    });


    const tooltip = d3.select(tooltipRef.current)
      .attr('id', 'tooltip-container')
      .style('position', 'absolute')
  .style('visibility', 'hidden')
  .style('background', 'linear-gradient(145deg, #B8FFF2, #E0FFFA)')
  .style('padding', '15px 25px')
  .style('border-radius', '30px')
  .style('pointer-events', 'none')
  .style('box-shadow', '0 4px 15px rgba(0,0,0,0.1)')
  .style('z-index', '99999')
  .style('font-size', '13px')
  .style('line-height', '1.5')
  .style('white-space', 'nowrap')  // Prevents line breaks & unexpected resizing
  .style('min-width', '200px')
  .style('max-width', '250px')  // Controls max expansion
  .style('transition', 'all 0.2s ease');

    // Update the tooltip CSS for the pointer
//     const tooltipStyle = document.createElement('style');
//     tooltipStyle.textContent = `
//   #tooltip-container {
//     position: relative;
//     background: linear-gradient(145deg, #B8FFF2, #E0FFFA);
//     border-radius: 30px;
//     padding: 15px 25px;
//   }

//   #tooltip-container::before {
//     content: '';
//     position: absolute;
//     left: -10px;
//     top: 50%;
//     transform: translateY(-50%);
//     width: 0;
//     height: 0;
//     border-top: 10px solid transparent;
//     border-bottom: 10px solid transparent;
//     border-right: 15px solid #B8FFF2;  // Match the gradient start color
//   }

//   .tooltip-content {
//     display: grid;
//     gap: 8px;
//   }

//   .tooltip-header {
//     font-weight: bold;
//     color: #2C3E50;
//     margin-bottom: 8px;
//     font-size: 14px;
//   }

//   .tooltip-row {
//     display: flex;
//     justify-content: space-between;
//     align-items: center;
//   }

//   .tooltip-label {
//     color: #34495E;
//     font-weight: 500;
//   }

//   .tooltip-value {
//     color: #2C3E50;
//     font-weight: 600;
//   }
// `;
    // document.head.appendChild(tooltipStyle);

    const uniqueRegions = {}; // To store unique regions with their colors

    Object.values(carData).forEach(yearData => {
      yearData.cars.forEach(car => {
        if (car.region && car.Color) {
          uniqueRegions[car.region] = car.Color; // ✅ Ensure API colors are used
        }
      });
    });

    console.log("Extracted Region Colors:", uniqueRegions); // Debugging
    const detailedLegend = detailedSvg.append('g')
      .attr('class', 'legend')
      .attr("transform", `translate(${width / 2 - 400}, ${height + 50})`); // Position from left

    return () => {
      d3.select('#detailed-view').remove();
      d3.select('.detailed-tooltip').remove();
    };
  }, [filteredRegion, selectedRegion, carData, myCarData]);


  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    if (region !== 'All') {
      setFilteredRegion(region);
      handleToggleButton('Region');
    }
    else {
      setFilteredRegion('All');
      handleToggleButton('All');
    }
  };


  const handleToggleButton = async (type) => {
    try {
      setLoading(true);
      console.log('Toggle clicked:', type);

      if (type === "All") {
        setFilteredRegion("All");
        // Fetch data for all regions
        const requests = years.map(year =>
          axios.post('https://dev-ai.nxcar.in/fetch-car-data', {
            make: selectedMake,
            model: selectedModel,
            variant: selectedVariant,
            year: year
            // No city parameter for all regions
          })
        );

        const responses = await Promise.all(requests);
        const fetchedData = responses.map(res => res.data);

        if (fetchedData.length > 0) {
          const processedData = processFetchedData(fetchedData);
          setCarData(processedData);
        }
      } else {
        // For Region toggle
        setFilteredRegion(selectedRegion);
        const requests = years.map(year =>
          axios.post('https://dev-ai.nxcar.in/fetch-car-data', {
            make: selectedMake || "Maruti Suzuki",
            model: selectedModel || "Swift",
            variant: selectedVariant || "LXi",
            city: selectedRegion,
            year: year
          })
        );

        const responses = await Promise.all(requests);
        const fetchedData = responses.map(res => res.data);

        if (fetchedData.length > 0) {
          let processedData = processFetchedData(fetchedData);

          // ✅ Ensure myCarData is included in all cases
          if (myCarData) {
            const myCarYearKey = myCarData.year ? myCarData.year.toString() : "Unknown";

            if (!processedData[myCarYearKey]) {
              processedData[myCarYearKey] = { cars: [], maxPrice: 0 };
            }

            processedData[myCarYearKey].cars.push({
              price: myCarData.price,
              make: myCarData.make,
              model: myCarData.model,
              variant: myCarData.variant,
              region: myCarData.region || selectedRegion,
              year: String(myCarData.year),
              distance: Number(myCarData.distance) || 0,
              Color: myCarData.Color || "#000000"
            });

            // ✅ Update maxPrice safely
            processedData[myCarYearKey].maxPrice = Math.max(
              processedData[myCarYearKey].maxPrice,
              myCarData.price
            );
          }

          setCarData(processedData);
          // const processedData = processFetchedData(fetchedData);
          // setCarData(processedData);
        }
      }
    } catch (error) {
      // console.error("Error in handleToggleButton:", error);
      setCarData({});
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (region = "All") => {
    try {
      const requests = years.map(year =>
        axios.post("https://dev-ai.nxcar.in/fetch-car-data", {
          make: selectedMake || "Maruti Suzuki",
          model: selectedModel || "Swift",
          variant: selectedVariant || "LXi",
          ...(region !== "All" && { city: region }),
          year: year
        })
      );

      const responses = await Promise.all(requests);
      const newData = responses.map(res => res.data).flat(); // Flatten array if nested

      setFilteredData(region === "All" ? newData : [...newData]);
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  };
  useEffect(() => {
    console.log("Graph Data Updated:", filteredData);
  }, [filteredData]);

  // Call fetchData when filteredRegion changes
  useEffect(() => {
    if (selectedMake || selectedModel || selectedVariant || selectedYear) {
  ;
      handleToggleButton("All");
    }
  }, [selectedMake, selectedModel, selectedVariant, selectedRegion]);


  useEffect(() => {
    if (!svgRef.current || !tooltipRef.current) return;
 
    const filteredCarData = getFilteredData(carData);
    const filteredYearlyData = Object.entries(filteredCarData).map(([year, data]) => {
      let maxPriceFromData = Math.max(...data.cars.map(car => car.price), 0);

      // ✅ Include myCarData price if it matches the year
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

    d3.select(svgRef.current).selectAll("*").remove();

    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const margin = {
      top: screenWidth <= 480 ? 20 : 40,   
      right: screenWidth <= 480 ? 20 : 40, 
      bottom: screenWidth <= 480 ? 40 : 45, 
      left: screenWidth <= 480 ? 40 : 60  
    };

    // const width = containerWidth - margin.left - margin.right;
    // const height = screenWidth <= 480 ? 250 :
    //   screenWidth <= 768 ? 350 :
    //     Math.min(window.innerHeight * 0.5, 400);

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

    yAxis.select('.domain')      
      .remove();            

    yAxis.append('text')
      .attr('transform', 'rotate(-90)')
      // .attr('y', -60)
      .attr('y', -margin.left + 13)
      .attr('x', -(height / 2) + 5)
      .attr('fill', '#585A5A')
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', '400')
      .style('font-family', 'Noto Sans, sans-serif')

      .attr('letter-spacing', '0.475px')
      .text('Price ( in ₹ )');  // Updated label


    // X axis with updated label
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .style('color', '#4A4A4C')
      // Increased tick font size
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

    // Create tooltip with fixed positioning and higher z-index
   
    const tooltip = d3.select(tooltipRef.current)
      .attr("id", "tooltip-contain"); // Apply styles using the CSS file
    
   
    // const tooltip = d3.select(tooltipRef.current)
    //   .style('position', 'absolute')
    //   .style('visibility', 'hidden')
    //   .style('background', 'linear-gradient(145deg, #B8FFF2, #E0FFFA)')  // Gradient background
    //   .style('padding', '15px 25px')  // Increased horizontal padding for oval shape
    //   .style('border-radius', '30px')  // Increased border radius for oval shape
    //   .style('pointer-events', 'none')
    //   .style('box-shadow', '0 4px 15px rgba(0,0,0,0.1)')
    //   .style('z-index', '99999')
    //   .style('font-size', '13px')
    //   .style('line-height', '1.5')
    //   .style('min-width', '200px')
    //   .style('transform', 'translateX(20px)')  // Offset for pointer
    //   .style('transition', 'all 0.2s ease');

    // Update the tooltip CSS for the pointer
    const tooltipStyle = document.createElement('style');
    // tooltipStyle.textContent = `
    //   #tooltip-container {
    //     position: relative;
    //     background: linear-gradient(145deg, #B8FFF2, #E0FFFA);
    //     border-radius: 30px;
    //     padding: 15px 25px;
    //   }

    //   #tooltip-container::before {
    //     content: '';
    //     position: absolute;
    //     left: -10px;
    //     top: 50%;
    //     transform: translateY(-50%);
    //     width: 0;
    //     height: 0;
    //     border-top: 10px solid transparent;
    //     border-bottom: 10px solid transparent;
    //     border-right: 15px solid #B8FFF2;  // Match the gradient start color
    //   }

    //   .tooltip-content {
    //     display: grid;
    //     gap: 8px;
    //   }

    //   .tooltip-header {
    //     font-weight: bold;
    //     color: #2C3E50;
    //     margin-bottom: 8px;
    //     font-size: 14px;
    //   }

    //   .tooltip-row {
    //     display: flex;
    //     justify-content: space-between;
    //     align-items: center;
    //   }

    //   .tooltip-label {
    //     color: #34495E;
    //     font-weight: 500;
    //   }

    //   .tooltip-value {
    //     color: #2C3E50;
    //     font-weight: 600;
    //   }
    // `;
    // document.head.appendChild(tooltipStyle);
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
                <span class="tooltip-value">${formatPriceInLakhs(d.price)}</span>
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
    // After adding all other data points, add your specific car point with icon
    // if (myCarData && (filteredRegion === 'All' ||  selectedRegion === myCarData.region)) {
    // if (myCarData && (filteredRegion === 'All' ||  selectedRegion )) {
    if (myCarData) {// Always show myCarData, regardless of city
      const { carScale, hoverScale, translateOffset } = getResponsiveScales();
      const xPos = myCarData.year && !isNaN(x(myCarData.year))
        ? x(myCarData.year) + distanceScale(Math.min(myCarData.distance || 0, 150000)) - translateOffset
        : 0; // Default to 0 if invalid

      const yPos = myCarData.price && !isNaN(y(myCarData.price))
        ? y(myCarData.price) - translateOffset
        : height; // Default to bottom if invalid
      //   console.log("myCarData Debug:", myCarData);
      // console.log("Computed xPos:", xPos, "Computed yPos:", yPos);

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
                          <span class="tooltip-value">${formatPriceInLakhs(myCarData.price)}</span>
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
    // Update legend position and styling
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(20, ${height + 50})`);  // Changed from (width - 150) to 20 to start from left

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
  }, [yearlyData, screenWidth, getResponsiveScales, getTooltipPosition, selectedRegion, filteredData]);


  const RegionSelector = () => (
    <div>
      {/* Region Selection Dropdown */}
      <select
        onChange={(e) => handleRegionChange(e.target.value)}
        value={selectedRegion}
        style={{ padding: '8px', fontSize: '16px', marginBottom: '10px' }}
      >
        <option value="All">All</option>
        <option value="delhi">delhi</option>
        <option value="bangalore">bangalore</option>
        <option value="mumbai">mumbai</option>
        <option value="Faridabad">Faridabad</option>
      </select>

      <div
        style={{
          display: 'flex',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#f0f0f0',
          padding: '3px',
          cursor: 'pointer',
          width: '170px',
        }}
      >
        {/* "All" Part of the Button */}
        <button
          onClick={() => handleToggleButton("All")}
          style={{
            flex: 1,
            padding: '10px 20px',
            fontSize: '16px',
            background: filteredRegion === 'All'
              ? 'linear-gradient(94deg, #4AA09B 1.29%, #41CFC7 102.69%)'
              : 'white',
            color: filteredRegion === 'All' ? 'white' : 'black',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: '0.3s',
            textAlign: 'center',
            boxShadow: filteredRegion === 'All'
              ? '1px 1px 4px 0px #00F3DB inset, -1px -1px 4px 0px #009283 inset'
              : 'none',
          }}
        >
          All
        </button>

        {/* "Region" Part of the Button */}
        <button
          onClick={() => handleToggleButton("Region")}
          style={{
            flex: 1,
            padding: '10px 20px',
            fontSize: '16px',
            background: filteredRegion !== 'All'
              ? 'linear-gradient(94deg, #4AA09B 1.29%, #41CFC7 102.69%)'
              : 'white',
            color: filteredRegion !== 'All' ? 'white' : 'black',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: '0.3s',
            textAlign: 'center',
            boxShadow: filteredRegion !== 'All'
              ? '1px 1px 4px 0px #00F3DB inset, -1px -1px 4px 0px #009283 inset'
              : 'none',
            marginLeft: '3px',
          }}
        >
          Region
        </button>
      </div>

    </div>
  );



  return (
    <div
      ref={containerRef}
      className="chart-container"
    >
      <div className="chart-header">
        <h2 className="chart-title">
          Price Insights
        </h2>

        <div className="region-controls">
          <select
            onChange={(e) => handleRegionChange(e.target.value)}
            value={selectedRegion}
            className="region-select"
          >
            <option value="All">All</option>
            <option value="delhi">delhi</option>
            <option value="bangalore">bangalore</option>
            <option value="mumbai">mumbai</option>
            <option value="Faridabad">Faridabad</option>
          </select>

          <div className="toggle-container">
            <button
              onClick={() => handleToggleButton("All")}
              disabled={loading}
              className={`toggle-button ${filteredRegion === 'All' ? 'toggle-button-all' : ''}`}
            >
              {loading && filteredRegion === 'All' ? '' : 'All'}
            </button>

            <button
              onClick={() => handleToggleButton("Region")}
              disabled={loading}
              className={`toggle-button ${filteredRegion !== 'All' ? 'toggle-button-all' : 'toggle-button-region'}`}
            >
              {loading && filteredRegion !== 'All' ? 'Loading...' : 'Region'}
            </button>
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="chart-svg"
        preserveAspectRatio="xMidYMid meet"
      ></svg>
      <div ref={tooltipRef}></div>
      
      {/* Added instruction text */}
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





