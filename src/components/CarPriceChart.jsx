import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
// import { handleBarClick } from './Bar';
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

  }, [selectedMake, selectedModel, selectedVariant, selectedYear, selectedRegion]);



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
  const getFilteredData = useCallback(
    (() => {
      let cache = {};
      return (data) => {
        const cacheKey = `${filteredRegion}-${selectedRegion}`;
        if (cache[cacheKey] && cache[cacheKey].data === data) {
          return cache[cacheKey].result;
        }
        // Existing processing code
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
        cache[cacheKey] = { data, result: processedData };
      return processedData;
      };
    })(),
    [filteredRegion, selectedRegion, myCarData]
  );

  // Handle click on year bar to show detailed view
  const handleBarClick = useCallback((d) => {
    // Prevent event propagation
    event.stopPropagation();
    
    // Clean up any existing overlays/views
    document.querySelectorAll('#detail-overlay, #detailed-view, .detailed-tooltip').forEach(el => el.remove());
    
    console.log("Bar clicked for year:", d.year);
    
    // Set selected year
    setSelectedYear(d.year);
    
    // Get year's car data
    if (!carData || !carData[d.year]) {
      console.error(`No car data available for year ${d.year}`);
      return;
    }

    let yearCars = [];
    try {
      if (filteredRegion === 'All') {
        yearCars = [...(carData[d.year].cars || [])];
      } else {
        yearCars = [...((carData[d.year].cars || []).filter(car => car.region === selectedRegion) || [])];
      }

      // Add myCarData if it matches the year
      if (myCarData && myCarData.year === parseInt(d.year)) {
        yearCars.push(myCarData);
      }
      
      if (yearCars.length === 0) {
        console.log("No cars available for this year.");
        return;
      }
    } catch (error) {
      console.error("Error processing year cars:", error);
      return;
    }
   
    // Create overlay and detailed view
    const overlay = document.createElement('div');
    overlay.id = 'detail-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '999';
    document.body.appendChild(overlay);
    
    const detailedView = document.createElement('div');
    detailedView.id = 'detailed-view';
    detailedView.style.position = 'fixed';
    detailedView.style.top = '50%';
    detailedView.style.left = '50%';
    detailedView.style.transform = 'translate(-50%, -50%)';
    detailedView.style.backgroundColor = '#ffffff';
    detailedView.style.padding = '24px';
    detailedView.style.border = '1px solid #ddd';
    detailedView.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
    detailedView.style.width = '732px';
    detailedView.style.height = '413px';
    detailedView.style.maxWidth = '90vw';
    detailedView.style.maxHeight = '80vh';
    detailedView.style.overflow = 'auto';
    detailedView.style.zIndex = '1000';
    detailedView.style.borderRadius = '8px';
    detailedView.style.background = 'linear-gradient(to right, #EAFFFE, #FFFFFF)';
    document.body.appendChild(detailedView);
    
    // Add close button
    const closeButton = document.createElement('div');
    closeButton.textContent = 'All years';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '24px';
    closeButton.style.right = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.background = 'var(--Sys-Color-Primary-Container, #E0FFFA)';
    closeButton.style.color = '#8FF4EE';
    closeButton.style.padding = '5px 10px';
    closeButton.style.borderRadius = '8px';
    closeButton.style.boxShadow = '0px -2px 0px 0px #8FF4EE inset';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.zIndex = '1001';
    detailedView.appendChild(closeButton);
    
    // Add event listeners
    closeButton.addEventListener('click', () => {
      overlay.remove();
      detailedView.remove();
      document.querySelectorAll('.detailed-tooltip').forEach(el => el.remove());
    });
    
    overlay.addEventListener('click', () => {
      overlay.remove();
      detailedView.remove();
      document.querySelectorAll('.detailed-tooltip').forEach(el => el.remove());
    });
    
    detailedView.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Create detailed view content with D3
    const d3DetailedView = d3.select(detailedView);
    
    // Calculate dimensions
    const margin = { top: 80, right: 60, bottom: 80, left: 80 };
    const containerWidth = detailedView.clientWidth - margin.left - margin.right - 48;
    const width = containerWidth;
    const height = 196;
    
    // Create SVG container
    const detailedSvg = d3DetailedView.append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const detailedX = d3.scaleLinear()
      .domain([0, 150000])
      .range([0, width]);

    const detailedY = d3.scaleLinear()
      .domain([0, Math.max(...yearCars.map(car => car.price))])
      .range([height, 0]);

    // Add title
    detailedSvg.append('text')
      .attr('x', -50)
      .attr('y', -40)
      .attr('text-anchor', 'start')
      .attr('font-size', '20px')
      .attr('font-weight', '400')
      .attr('line-height', '26px')
      .style('font-family', 'Noto Sans, sans-serif')
      .text('Price Insights');
      
    // Add colored background
    detailedSvg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', barColors[yearlyData.findIndex(yd => yd.year === d.year) % barColors.length])
      .attr('opacity', 0.3);

    // Add gridlines
    detailedSvg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(detailedY)
        .tickSize(-width)
        .tickFormat(''))
      .style('stroke-opacity', '0.2');

    // Add Y axis
    const yAxis = detailedSvg.append('g')
      .call(d3.axisLeft(detailedY)
        .tickFormat(d => `${(d / 100000).toFixed(1)}L`))
      .style('color', '#4A4A4C');

    yAxis.select('.domain').remove();

    // Add Y axis label
    yAxis.append('text')
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
      .text(`${d.year} (Distance Travelled in km)`);
      
    // Create tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'detailed-tooltip')
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
      .style('min-width', '200px')
      .style('max-width', '250px')
      .style('transition', 'all 0.2s ease');
      
    // Add car icons
      const { carScale, hoverScale, translateOffset } = getResponsiveScales();

    yearCars.forEach(car => {
      const isMyCar = car === myCarData;

      const carIcon = detailedSvg.append('g')
        .attr('class', isMyCar ? 'my-car-icon' : 'car-icon')
        .attr('transform', `translate(${detailedX(Math.min(car.distance, 150000)) - translateOffset},${detailedY(car.price) - translateOffset})`)
        .style('cursor', 'pointer')
        .datum(car);

      if (isMyCar) {
        carIcon.append('circle')
          .attr('r', 27)
          .attr('fill', '#FFE566')
          .attr('cx', 20)
          .attr('cy', 20)
          .style('opacity', 0.8)
          .style('filter', 'drop-shadow(0 0 8px rgba(255, 229, 102, 0.8))');
      }

      carIcon.append('path')
        .attr('d', 'M499.99 176h-59.87l-16.64-41.6C406.38 91.63 365.57 64 319.5 64h-127c-46.06 0-86.88 27.63-103.99 70.4L71.87 176H12.01C4.2 176-1.53 183.34.37 190.91l6 24C7.7 220.25 12.5 224 18.01 224h20.07C24.65 235.73 16 252.78 16 272v48c0 16.12 6.16 30.67 16 41.93V416c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-32h256v32c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-54.07c9.84-11.25 16-25.8 16-41.93v-48c0-19.22-8.65-36.27-22.07-48H494c5.51 0 10.31-3.75 11.64-9.09l6-24c1.89-7.57-3.84-14.91-11.65-14.91zm-352.06-17.83c7.29-18.22 24.94-30.17 44.57-30.17h127c19.63 0 37.28 11.95 44.57 30.17L384 208H128l19.93-49.83zM96 319.8c-19.2 0-32-12.76-32-31.9S76.8 256 96 256s48 28.71 48 47.85-28.8 15.95-48 15.95zm320 0c-19.2 0-48 3.19-48-15.95S396.8 256 416 256s32 12.76 32 31.9-12.8 31.9-32 31.9z')
        .attr('fill', isMyCar ? 'none' : (car.Color || '#333'))
        .attr('stroke', isMyCar ? '#FFFFFF' : 'none')
        .attr('stroke-width', isMyCar ? '20' : '0')
        .attr('transform', `scale(${carScale})`)
        .style('filter', 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))');

      // Add hover effects
      carIcon
        .on('mouseover', function(e) {
          const carData = d3.select(this).datum();
          
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
            .style('left', `${e.pageX + 15}px`)
            .style('top', `${e.pageY - 100}px`)
            .html(`
                <div id="tooltip-container">
                  <div class="tooltip-content">
                    <div class="tooltip-header">${isMyCar ? 'My Car Details' : 'Car Details'}</div>
                    <div class="tooltip-row">
                      <span class="tooltip-label">Model:</span>
                    <span class="tooltip-value">${carData?.model || 'N/A'}</span>
                    </div>
                    <div class="tooltip-row">
                      <span class="tooltip-label">Distance:</span>
                    <span class="tooltip-value">${carData?.distance ? carData.distance.toLocaleString() : '0'} km</span>
                    </div>
                    <div class="tooltip-row">
                      <span class="tooltip-label">Price:</span>
                    <span class="tooltip-value">${carData?.price ? formatPriceInLakhs(carData.price) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              `);
        })
        .on('mouseout', function() {
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
  }, [yearlyData, screenWidth, getResponsiveScales, getTooltipPosition, selectedRegion, filteredData]);

  // Add this helper function to create the detailed view
  const createDetailedView = (svg, xScale, yScale, width, height, cars, year) => {
    // Add colored background rectangle
    svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', barColors[yearlyData.findIndex(yd => yd.year === year) % barColors.length])
      .attr('opacity', 0.3);

    // Add gridlines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat('')
      )
      .style('stroke-opacity', '0.2');

    // Add Y axis
    const yAxis = svg.append('g')
      .call(d3.axisLeft(yScale)
        .tickFormat(d => `${(d / 100000).toFixed(1)}L`))
      .style('color', '#4A4A4C');

    yAxis.select('.domain').remove();

    // Add Y axis label
    yAxis.append('text')
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

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
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
      .text(`${year} (Distance Travelled in km)`);

    // Create tooltip
    const tooltip = d3.select('#detailed-view')
      .append('div')
      .attr('class', 'detailed-tooltip')
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
  .style('min-width', '200px')
      .style('max-width', '250px')
  .style('transition', 'all 0.2s ease');

    // Add car icons
      const { carScale, hoverScale, translateOffset } = getResponsiveScales();

    cars.forEach(car => {
      // Check if this is myCarData
      const isMyCar = car === myCarData;

      const carIcon = svg.append('g')
        .attr('class', isMyCar ? 'my-car-icon' : 'car-icon')
        .attr('transform', `translate(${xScale(Math.min(car.distance, 150000)) - translateOffset},${yScale(car.price) - translateOffset})`)
        .style('cursor', 'pointer')
        .datum(car); // Store car data with the element

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
        .attr('fill', isMyCar ? 'none' : (car.Color || '#333'))
        .attr('stroke', isMyCar ? '#FFFFFF' : 'none')
        .attr('stroke-width', isMyCar ? '20' : '0')
        .attr('transform', `scale(${carScale})`)
        .style('filter', 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))');

      // Add hover effects
      carIcon
        .on('mouseover', function(e) {
          const carData = d3.select(this).datum();
          
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
            .style('left', `${e.pageX + 15}px`)
            .style('top', `${e.pageY - 100}px`)
            .html(`
                <div id="tooltip-container">
                  <div class="tooltip-content">
                    <div class="tooltip-header">${isMyCar ? 'My Car Details' : 'Car Details'}</div>
                    <div class="tooltip-row">
                      <span class="tooltip-label">Model:</span>
                    <span class="tooltip-value">${carData?.model || 'N/A'}</span>
                    </div>
                    <div class="tooltip-row">
                      <span class="tooltip-label">Distance:</span>
                    <span class="tooltip-value">${carData?.distance ? carData.distance.toLocaleString() : '0'} km</span>
                    </div>
                    <div class="tooltip-row">
                      <span class="tooltip-label">Price:</span>
                    <span class="tooltip-value">${carData?.price ? formatPriceInLakhs(carData.price) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              `);
        })
        .on('mouseout', function() {
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
  };

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

      // console.log("Fetched Data for:",` ${region}`, newData);

      // ✅ Update state without duplicate entries
      // setFilteredData(prevData => {
      //     if (region === "All") {
      //         return newData; // Replace all data
      //     } else {
      //         return [...newData]; // Append new data
      //     }
      // });
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
      //  setFilteredRegion("All");
      // handleToggleButton(filteredRegion === 'All' ? 'All' : 'Region');
      // setFilteredRegion("All");
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
      bottom: screenWidth <= 480 ? 40 : 60, 
      left: screenWidth <= 480 ? 40 : 60  
    };

    const width = containerWidth - margin.left - margin.right;
    const height = screenWidth <= 480 ? 250 :
      screenWidth <= 768 ? 350 :
        Math.min(window.innerHeight * 0.5, 400);

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
      
    // Add X axis
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("color", "#4A4A4C");
      
    // Add X axis label
    svg.append("text")
      .attr("y", height + margin.bottom - 5)
      .attr("x", width / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#585A5A")
      .text("Year");
      
    // Add Y axis
    const yAxis = svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y)
        .tickFormat(d => `${(d / 100000).toFixed(1)}L`))
      .style("color", "#4A4A4C");
      
    // Remove domain line
    yAxis.select(".domain").remove();
    
    // Add Y axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -(height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#585A5A")
      .text("Price (in ₹)");
    
    // Add gridlines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(""))
      .style("stroke-opacity", "0.1");
      
    // Add bars
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
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        // Prevent event propagation
        event.stopPropagation();
        
        // Clean up any existing overlays/views
        document.querySelectorAll('#detail-overlay, #detailed-view, .detailed-tooltip').forEach(el => el.remove());
        
        console.log("Bar clicked for year:", d.year);
        
        // Set selected year
        setSelectedYear(d.year);
        
        // Get year's car data
        if (!carData || !carData[d.year]) {
          console.error(`No car data available for year ${d.year}`);
          return;
        }
        
        let yearCars = [];
        try {
          if (filteredRegion === 'All') {
            yearCars = [...(carData[d.year].cars || [])];
          } else {
            yearCars = [...((carData[d.year].cars || []).filter(car => car.region === selectedRegion) || [])];
          }
          
          // Add myCarData if it matches the year
          if (myCarData && myCarData.year === parseInt(d.year)) {
            yearCars.push(myCarData);
          }
          
          if (yearCars.length === 0) {
            console.log("No cars available for this year.");
            return;
          }
        } catch (error) {
          console.error("Error processing year cars:", error);
          return;
        }
        
        // Create overlay and detailed view
        const overlay = document.createElement('div');
        overlay.id = 'detail-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999';
        document.body.appendChild(overlay);
        
        const detailedView = document.createElement('div');
        detailedView.id = 'detailed-view';
        detailedView.style.position = 'fixed';
        detailedView.style.top = '50%';
        detailedView.style.left = '50%';
        detailedView.style.transform = 'translate(-50%, -50%)';
        detailedView.style.backgroundColor = '#ffffff';
        detailedView.style.padding = '24px';
        detailedView.style.border = '1px solid #ddd';
        detailedView.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
        detailedView.style.width = '732px';
        detailedView.style.height = '413px';
        detailedView.style.maxWidth = '90vw';
        detailedView.style.maxHeight = '80vh';
        detailedView.style.overflow = 'auto';
        detailedView.style.zIndex = '1000';
        detailedView.style.borderRadius = '8px';
        detailedView.style.background = 'linear-gradient(to right, #EAFFFE, #FFFFFF)';
        document.body.appendChild(detailedView);
        
        // Add close button
        const closeButton = document.createElement('div');
        closeButton.textContent = 'All years';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '24px';
        closeButton.style.right = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.background = 'var(--Sys-Color-Primary-Container, #E0FFFA)';
        closeButton.style.color = '#8FF4EE';
        closeButton.style.padding = '5px 10px';
        closeButton.style.borderRadius = '8px';
        closeButton.style.boxShadow = '0px -2px 0px 0px #8FF4EE inset';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.zIndex = '1001';
        detailedView.appendChild(closeButton);
        
        // Add event listeners
        closeButton.addEventListener('click', () => {
          overlay.remove();
          detailedView.remove();
          document.querySelectorAll('.detailed-tooltip').forEach(el => el.remove());
        });
        
        overlay.addEventListener('click', () => {
          overlay.remove();
          detailedView.remove();
          document.querySelectorAll('.detailed-tooltip').forEach(el => el.remove());
        });
        
        detailedView.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        
        // Create detailed view content with D3
        const d3DetailedView = d3.select(detailedView);
        
        // Calculate dimensions
        const margin = { top: 80, right: 60, bottom: 80, left: 80 };
        const containerWidth = detailedView.clientWidth - margin.left - margin.right - 48;
        const width = containerWidth;
        const height = 196;
        
        // Create SVG container
        const detailedSvg = d3DetailedView.append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);
          
        // Create scales
        const detailedX = d3.scaleLinear()
          .domain([0, 150000])
          .range([0, width]);
          
        const detailedY = d3.scaleLinear()
          .domain([0, Math.max(...yearCars.map(car => car.price))])
          .range([height, 0]);
          
        // Add title
        detailedSvg.append('text')
          .attr('x', -50)
          .attr('y', -40)
          .attr('text-anchor', 'start')
          .attr('font-size', '20px')
          .attr('font-weight', '400')
          .attr('line-height', '26px')
          .style('font-family', 'Noto Sans, sans-serif')
          .text('Price Insights');
          
        // Add colored background
        detailedSvg.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', width)
          .attr('height', height)
          .attr('fill', barColors[yearlyData.findIndex(yd => yd.year === d.year) % barColors.length])
          .attr('opacity', 0.3);
          
        // Add gridlines
        detailedSvg.append('g')
      .attr('class', 'grid')
          .call(d3.axisLeft(detailedY)
        .tickSize(-width)
            .tickFormat(''))
      .style('stroke-opacity', '0.2');

        // Add Y axis
        const yAxis = detailedSvg.append('g')
          .call(d3.axisLeft(detailedY)
        .tickFormat(d => `${(d / 100000).toFixed(1)}L`))
      .style('color', '#4A4A4C');

        yAxis.select('.domain').remove();

        // Add Y axis label
    yAxis.append('text')
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
          .text(`${d.year} (Distance Travelled in km)`);
          
        // Create tooltip
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'detailed-tooltip')
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
      .style('min-width', '200px')
          .style('max-width', '250px')
      .style('transition', 'all 0.2s ease');

        // Add car icons
        const { carScale, hoverScale, translateOffset } = getResponsiveScales();
        
        yearCars.forEach(car => {
          const isMyCar = car === myCarData;
          
          const carIcon = detailedSvg.append('g')
            .attr('class', isMyCar ? 'my-car-icon' : 'car-icon')
            .attr('transform', `translate(${detailedX(Math.min(car.distance, 150000)) - translateOffset},${detailedY(car.price) - translateOffset})`)
        .style('cursor', 'pointer')
            .datum(car);
            
          if (isMyCar) {
      carIcon.append('circle')
        .attr('r', 27)
        .attr('fill', '#FFE566')
        .attr('cx', 20)
        .attr('cy', 20)
              .style('opacity', 0.8)
              .style('filter', 'drop-shadow(0 0 8px rgba(255, 229, 102, 0.8))');
          }

      carIcon.append('path')
        .attr('d', 'M499.99 176h-59.87l-16.64-41.6C406.38 91.63 365.57 64 319.5 64h-127c-46.06 0-86.88 27.63-103.99 70.4L71.87 176H12.01C4.2 176-1.53 183.34.37 190.91l6 24C7.7 220.25 12.5 224 18.01 224h20.07C24.65 235.73 16 252.78 16 272v48c0 16.12 6.16 30.67 16 41.93V416c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-32h256v32c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32v-54.07c9.84-11.25 16-25.8 16-41.93v-48c0-19.22-8.65-36.27-22.07-48H494c5.51 0 10.31-3.75 11.64-9.09l6-24c1.89-7.57-3.84-14.91-11.65-14.91zm-352.06-17.83c7.29-18.22 24.94-30.17 44.57-30.17h127c19.63 0 37.28 11.95 44.57 30.17L384 208H128l19.93-49.83zM96 319.8c-19.2 0-32-12.76-32-31.9S76.8 256 96 256s48 28.71 48 47.85-28.8 15.95-48 15.95zm320 0c-19.2 0-48 3.19-48-15.95S396.8 256 416 256s32 12.76 32 31.9-12.8 31.9-32 31.9z')
            .attr('fill', isMyCar ? 'none' : (car.Color || '#333'))
            .attr('stroke', isMyCar ? '#FFFFFF' : 'none')
            .attr('stroke-width', isMyCar ? '20' : '0')
        .attr('transform', `scale(${carScale})`)
        .style('filter', 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))');

          // Add hover effects
      carIcon
            .on('mouseover', function(e) {
              const carData = d3.select(this).datum();
              
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
                .style('left', `${e.pageX + 15}px`)
                .style('top', `${e.pageY - 100}px`)
            .html(`
                    <div id="tooltip-container">
                      <div class="tooltip-content">
                      <div class="tooltip-header">${isMyCar ? 'My Car Details' : 'Car Details'}</div>
                        <div class="tooltip-row">
                          <span class="tooltip-label">Model:</span>
                        <span class="tooltip-value">${carData?.model || 'N/A'}</span>
                        </div>
                        <div class="tooltip-row">
                          <span class="tooltip-label">Distance:</span>
                        <span class="tooltip-value">${carData?.distance ? carData.distance.toLocaleString() : '0'} km</span>
                        </div>
                        <div class="tooltip-row">
                          <span class="tooltip-label">Price:</span>
                        <span class="tooltip-value">${carData?.price ? formatPriceInLakhs(carData.price) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  `);
        })
            .on('mouseout', function() {
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
      });

    // Add data points to the bars
    // Create a container group for all data points
    const pointsContainer = svg.append('g')
      .attr('class', 'data-points-container');
    
    // Track points to prevent duplicates
    const addedPoints = new Set();
    
    // Process each year's data
    filteredYearlyData.forEach(yearData => {
      if (carData[yearData.year] && carData[yearData.year].cars && carData[yearData.year].cars.length > 0) {
        // Create a group for each bar's data points
        const pointGroup = pointsContainer.append('g')
          .attr('class', `data-points-group-${yearData.year}`);
          
        // Get unique cars for this year (avoid duplicates)
        const uniqueCars = carData[yearData.year].cars.filter(car => {
          // Create a unique key for each car
          const key = `${yearData.year}-${car.make}-${car.model}-${car.price}`;
          if (addedPoints.has(key)) return false;
          addedPoints.add(key);
          return true;
        });
          
        // Add points for each car in this year (max 15 points per bar to avoid overcrowding)
        const carsToShow = uniqueCars.slice(0, 15);
        
        // Create a deterministic distribution pattern
        carsToShow.forEach((car, i) => {
          // Skip if car price is invalid
          if (!car.price || isNaN(car.price)) return;
          
          // Calculate position - create an even distribution across the bar width
          const position = (i + 1) / (carsToShow.length + 1);
          const xPos = x(yearData.year) + position * x.bandwidth();
          const yPos = y(car.price);
          
          // Determine if this is the reference car (more robust check)
          const isReferenceCar = myCarData && 
            car.make === myCarData.make && 
            car.model === myCarData.model && 
            car.variant === myCarData.variant &&
            Math.abs(car.price - myCarData.price) < 1000; // Allow small price difference
          
          // Add the data point
          pointGroup.append('circle')
            .attr('class', `data-point ${isReferenceCar ? 'reference' : ''}`)
            .attr('cx', xPos)
            .attr('cy', yPos)
            .attr('r', isReferenceCar ? 5 : 3.5)
            .attr('fill', isReferenceCar ? '#FFE566' : (car.Color || '#41CFC7'))
            .attr('stroke', isReferenceCar ? '#41CFC7' : 'none')
            .attr('stroke-width', isReferenceCar ? 1.5 : 0)
            .attr('opacity', 0.8)
            .attr('data-year', yearData.year)
            .attr('data-price', car.price)
            .style('cursor', 'pointer')
            .style('filter', isReferenceCar ? 'drop-shadow(0 0 3px rgba(255, 229, 102, 0.7))' : 'none')
            .on('mouseover', function(e) {
              d3.select(this)
                .transition()
                .duration(200)
                // Don't change the radius to prevent movement
                .attr('stroke', isReferenceCar ? '#FFB700' : '#FFFFFF')
                .attr('stroke-width', isReferenceCar ? 2 : 1.5)
                .attr('opacity', 1)
                .style('filter', isReferenceCar ? 
                  'drop-shadow(0 0 6px rgba(255, 229, 102, 0.9))' : 
                  'drop-shadow(0 0 5px rgba(65, 207, 199, 0.8))');
                
              // Show tooltip
              d3.select(tooltipRef.current)
                .style('visibility', 'visible')
                .style('left', `${e.pageX + 15}px`)
                .style('top', `${e.pageY - 50}px`)
                .html(`
                  <div style="background: linear-gradient(145deg, #B8FFF2, #E0FFFA); padding: 15px 25px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); font-size: 13px; line-height: 1.5;">
                    <div style="font-weight: 600; margin-bottom: 5px;">${isReferenceCar ? 'My Car Details' : 'Car Details'}</div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                      <span style="color: #585A5A;">Model:</span>
                      <span style="font-weight: 500;">${car.make || ''} ${car.model || ''}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                      <span style="color: #585A5A;">Distance:</span>
                      <span style="font-weight: 500;">${car.distance ? car.distance.toLocaleString() : '0'} km</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #585A5A;">Price:</span>
                      <span style="font-weight: 500;">${formatPriceInLakhs(car.price)}</span>
                    </div>
                  </div>
                `);
            })
            .on('mouseout', function() {
              d3.select(this)
                .transition()
                .duration(200)
                // Don't change the radius to prevent movement
                .attr('stroke', isReferenceCar ? '#41CFC7' : 'none')
                .attr('stroke-width', isReferenceCar ? 1.5 : 0)
                .attr('opacity', 0.8)
                .style('filter', isReferenceCar ? 
                  'drop-shadow(0 0 3px rgba(255, 229, 102, 0.7))' : 
                  'none');
                
              d3.select(tooltipRef.current)
                .style('visibility', 'hidden');
            })
            .on('click', function(e) {
              // Prevent event propagation to avoid triggering the bar click handler
              e.stopPropagation();
              
              // Highlight this point
              svg.selectAll('.data-point').attr('stroke-width', 0);
              d3.select(this)
                .attr('stroke', '#41CFC7')
                .attr('stroke-width', 2)
                .style('filter', 'drop-shadow(0 0 5px rgba(65, 207, 199, 0.7))');
              
              // Get the data for the selected year and create the detailed view
              const yearClickEvent = new CustomEvent('barclick', { detail: { year: yearData.year } });
              
              // Find and click the corresponding bar
              svg.selectAll('.bar')
                .filter(d => d.year === yearData.year)
                .node()
                .dispatchEvent(new Event('click'));
            });
        });
      }
    });

    // Setup tooltip container if it doesn't exist
    d3.select(tooltipRef.current)
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'transparent')
      .style('pointer-events', 'none')
      .style('z-index', '99999')
      .style('transition', 'all 0.2s ease');
  }, [yearlyData, screenWidth, getResponsiveScales, getTooltipPosition, selectedRegion, filteredData]);

  // Pre-create the detailed view container once and reuse it
  useEffect(() => {
    if (!d3.select('#detailed-view-container').node()) {
      d3.select('body').append('div')
        .attr('id', 'detailed-view-container')
        .style('display', 'none');
    }
    return () => d3.select('#detailed-view-container').remove();
  }, []);

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
            cursor: loading ? 'wait' : 'pointer',
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
            cursor: loading ? 'wait' : 'pointer',
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

  // Use requestAnimationFrame for smooth transitions
  const applyTransition = (selection, props) => {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        selection
          .transition()
          .duration(200)
          .attr(props)
          .on('end', resolve);
      });
    });
  };

  // Load data in chunks
  const renderInBatches = (data, batchSize = 10) => {
    let index = 0;
    
    function renderBatch() {
      const batch = data.slice(index, index + batchSize);
      if (batch.length === 0) return;
      
      // Render batch
      batch.forEach(renderItem);
      
      index += batchSize;
      requestAnimationFrame(renderBatch);
    }
    
    requestAnimationFrame(renderBatch);
  };

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        position: 'relative',
        top:'20px',
       
        width: '100%',
        height: '100%',
        maxWidth: '100%',
       padding: '24px',
        overflowX: 'hidden',
        fontFamily: '"Noto Sans", sans-serif'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>

        {/* <select
          value={selectedMake}
          onChange={(e) => setSelectedMake(e.target.value)}
          style={{ padding: '8px', fontSize: '16px' }}>
          <option value="">Select Make</option>
          <option value="Maruti Suzuki">Maruti Suzuki</option>
          <option value="Hyundai">Hyundai</option>
        </select>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{ padding: '8px', fontSize: '16px' }}
        >
          <option value="">Select Model</option>

          <option value="Swift">Swift</option>
          <option value="Xcent">Xcent</option> */}
          {/* <option value ="Alto">Alto</option> */}

        {/* </select>

        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(e.target.value)}
          style={{ padding: '8px', fontSize: '16px' }}
        >
          <option value="">Select Variant</option>
          <option value="LXi">LXi</option>
          <option value="VXi">VXi</option>
          <option value="E">E</option>
        </select> */}

        <h2
          className="chart-title"
          style={{
            color: 'var(--Sys-Color-On-Surface, #4A4A4C)',
            fontFamily: '"Noto Sans"',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: '400',
            lineHeight: '28px',
          
          }}
        >
          Price Insights
        </h2>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <select
            onChange={(e) => handleRegionChange(e.target.value)}
            value={selectedRegion}
            style={{
              padding: '8px',
              fontSize: '14px'
            }}
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
              width: '104px',
              height: '32px'
            }}
          >
            <button
              onClick={() => handleToggleButton("All")}

              disabled={loading}
              style={{
                flex: 1,
                // padding: '10px 20px',
                fontSize: '14px',
                background: filteredRegion === 'All'
                  ? 'linear-gradient(94deg, #4AA09B 1.29%, #41CFC7 102.69%)'
                  : 'white',
                color: filteredRegion === 'All' ? 'white' : 'black',
                border: 'none',
                borderRadius: '20px',
                cursor: loading ? 'wait' : 'pointer',
                transition: '0.3s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && filteredRegion === 'All' ? '' : 'All'}
            </button>

            <button
              onClick={() => handleToggleButton("Region")}
              disabled={loading}
              style={{
                flex: 1,
                 padding: '2px 2px',
                // fontSize: '16px',
                fontSize: '13px',
                background: filteredRegion !== 'All'
                  ? 'linear-gradient(94deg, #4AA09B 1.29%, #41CFC7 102.69%)'
                  : 'white',
                color: filteredRegion !== 'All' ? 'white' : 'black',
                border: 'none',
                borderRadius: '20px',
                cursor: loading ? 'wait' : 'pointer',
                transition: '0.3s',
                opacity: loading ? 0.7 : 1,
                marginLeft: '3px',
              }}
            >
              {loading && filteredRegion !== 'All' ? 'Loading...' : 'Region'}
            </button>
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: screenWidth <= 768 ? '80vh' : '500px'
        }}
        preserveAspectRatio="xMidYMid meet"
      ></svg>
      <div ref={tooltipRef}></div>
      <style >{`
         .chart-container {
          background: linear-gradient(to right, #EAFFFE, #FFFFFF);
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .chart-title {
          text-align: left;
          color: #4A4A4C;
          margin-bottom: ${screenWidth <= 480 ? '10px' : '20px'};
          font-size: ${screenWidth <= 480 ? '20px' : '24px'};
          padding-top: ${screenWidth <= 480 ? '10px' : '20px'};
          font-family: "Noto Sans", sans-serif;
        }
        .instruction-text {
          margin: 15px 0;
          color: #4A4A4C;
          font-family: "Noto Sans", sans-serif;
        }
        .car-icon-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .car-icon {
          color: #FFFFFF;
          background: #FFE566;
          padding: 8px;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          transition: transform 0.2s ease;
        }
        .car-icon:hover {
          transform: scale(1.2);
        }
        .bar:hover {
          opacity: 0.8;
        }
        #detailed-view {
        background: linear-gradient(to right, #EAFFFE, #FFFFFF);
        border-radius: 8px;
          z-index: 1000;
          min-width: 732px;
          min-height: 413px;
          background-color: white;
        }
        .data-point {
          cursor: pointer;
          transition: all 0.3s ease;
          fill-opacity: 0.85;
          filter: drop-shadow(0 0 1px rgba(0,0,0,0.2));
        }
        .data-point:hover {
          fill-opacity: 1;
          filter: drop-shadow(0 0 4px rgba(65, 207, 199, 0.7));
          /* Remove transform scale effect that causes sideways movement */
        }
        .data-point.reference {
          fill: #FFE566;
          stroke: #41CFC7;
          stroke-width: 1.5;
          filter: drop-shadow(0 0 5px rgba(255, 229, 102, 0.6));
        }
        .data-point.reference:hover {
          filter: drop-shadow(0 0 8px rgba(255, 229, 102, 0.9));
        }
        .data-points-container {
          pointer-events: all;
          z-index: 10;
        }
        .data-points-group {
          pointer-events: all;
        }
        .bar-label {
          font-size: 12px;
        }
        .x-axis text, .y-axis text {
          font-family: "Noto Sans", sans-serif;
          font-size: 12px;
          color: #4A4A4C;
        }
        .x-axis path, .y-axis path {
          stroke: #D0D0D0;
        }
        .x-axis line, .y-axis line {
          stroke: #D0D0D0;
          stroke-opacity: 0.7;
        }
        .grid line {
          stroke: #E5E5E5;
          shape-rendering: crispEdges;
        }
        .grid path {
          stroke-width: 0;
        }
        @media (max-width: 480px) {
          .data-point {
            r: 3;
          }
          .data-point:hover {
            r: 4;
          }
          .chart-title {
            font-size: 18px;
            margin-bottom: 10px;
          }
          #detailed-view {
            min-width: unset !important;
            width: 95vw !important;
            min-height: unset !important;
            height: 90vh !important;
          }
          .x-axis text {
            font-size: 10px;
          }
          .y-axis text {
            font-size: 10px;
          }
        }
        @media (max-width: 768px) {
          .data-point {
            r: 4;
          }
          .data-point:hover {
            r: 5;
          }
          .chart-title {
            font-size: 20px;
          }
          #detailed-view {
            min-width: unset !important;
            width: 90vw !important;
          }
        }
        @keyframes glowing {
          0% {
            filter: drop-shadow(0 0 8px rgba(255, 228, 93, 0.9));
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(255, 229, 102, 1));
          }
          100% {
            filter: drop-shadow(0 0 8px rgba(255, 229, 102, 0.9));
          }
        }

        // Update hover effect for my car icon
        .my-car-icon:hover circle {
          filter: drop-shadow(0 0 15px rgba(255, 229, 102, 1));
          opacity: 0.8;
        }
      `}</style>
      {/* Added instruction text */}
      <div className="instruction-text">
        <div className="car-icon-legend" style={{
          color: "var(--Sys-Color-On-Surface-Secondary, #585A5A)",
          fontFamily: "Noto Sans",
          fontSize: "14px",
          fontStyle: "normal",
          fontWeight: "400",
          lineHeight: "20px",
          letterSpacing: "0.25px"
        }}>
          <FontAwesomeIcon icon={faCar} className="car-icon" /> Chosen car
        </div>
        <p style={{
          color: "var(--Sys-Color-On-Surface-Secondary, #585A5A)",
          fontFamily: "Noto Sans",
          fontSize: "14px",
          fontStyle: "normal",
          fontWeight: "400",
          lineHeight: "20px",
          letterSpacing: "0.25px"
        }}>
          Please <span style={{ color: "var(--Sys-Color-Light-Primary, #4AA09B)" }}>click on the bar</span> for which you want to view the pricing. <span style={{ color: "var(--Sys-Color-Light-Primary, #4AA09B)" }}>Hover over data points</span> to see individual car details.
        </p>
      </div>



    </div>

  );

};

export default CarPriceChart;





