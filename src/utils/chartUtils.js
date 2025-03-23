/**
 * Process fetched data into a format suitable for chart rendering
 * @param {Array} apiData - Raw API response data
 * @returns {Object} Processed data object
 */
export const processFetchedData = (apiData) => {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    console.warn("No data to process");
    return {};
  }
  const processedData = {};
  apiData.forEach((response) => {
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
        region: City || '', // Use City instead of region
        year: String(Year),
        distance: Number(Distance_numeric) || 0,
        Color: Color || "#000000"
      });

      // Update maxPrice safely
      processedData[yearKey].maxPrice = Math.max(processedData[yearKey].maxPrice, parsedPrice);
    });
  });
  return processedData;
};

/**
 * Get filtered data based on selected region
 * @param {Object} data - Car data 
 * @param {string} filteredRegion - Selected region filter
 * @param {string} selectedRegion - Currently selected region
 * @param {Object} myCarData - Reference car data
 * @returns {Object} Filtered data
 */
export const getFilteredData = (data, filteredRegion, selectedRegion, myCarData) => {
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
  
    return processedData;

  } catch (error) {
    console.error('Error in getFilteredData:', error);
    return {};
  }
};

// Bar colors array
export const barColors = ['#D2E8FF', '#EAF3FF', '#EAF7FF', '#DDEDFF', '#E9EBFF'];

// Region colors
export const regionColors = {
  "delhi": '#FF8B56',
  "mumbai": '#DE3730',
  "bangalore": '#379B56',
  "Faridabad": '#FAD5A5'
};
