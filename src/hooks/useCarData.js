import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { processFetchedData } from '../utils/chartUtils';

/**
 * Hook to manage car data fetching and state
 * @returns {Object} Car data states and handler functions
 */
const useCarData = () => {
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [filteredRegion, setFilteredRegion] = useState('All');
  const [carData, setCarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableCars, setAvailableCars] = useState([]);
  const [referenceCar, setReferenceCar] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState({ vehicle_id: "2344" });
  const [error, setError] = useState(null);

  const regions = ['All', 'delhi', 'bangalore', 'mumbai', 'Faridabad'];
  const years = selectedYear
    ? [selectedYear]
    : Array.from({ length: 2024 - 2015 + 1 }, (_, i) => 2015 + i);

  // Define myCarData based on referenceCar
  const myCarData = referenceCar ? {
    price: referenceCar.price,
    distance: referenceCar.kilometers,
    make: referenceCar.make,
    model: referenceCar.model,
    variant: referenceCar.variant,
    year: referenceCar.year,
    region: referenceCar.region,
  } : null;

  // Process data into yearly format for the chart
  const yearlyData = useMemo(() => {
    if (!carData || Object.keys(carData).length === 0) {
      console.log("No car data available");
      return [];
    }

    const data = Object.entries(carData)
      .map(([year, yearData]) => {
        let maxPriceFromData = yearData.maxPrice || Math.max(...yearData.cars.map(car => car.price), 0);

        // Include myCarData price if it matches the year
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

    return data;
  }, [carData, myCarData]);

  // Fetch available cars when selectedVehicleId changes
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
          { vehicle_id: selectedVehicleId.vehicle_id },
          {
            headers: {
              "Content-Type": "application/json",
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
  }, [JSON.stringify(selectedVehicleId)]);

  // Fetch car data based on reference car
  const fetchCarData = async () => {
    setLoading(true);
    try {
      if (!referenceCar || !referenceCar.make || !referenceCar.model || !referenceCar.variant) {
        console.warn("❌ Missing referenceCar data. Cannot fetch car data.");
        setCarData([]); // Set to empty array if referenceCar is not valid
        return;
      }
      const makeName = referenceCar.make;
      const modelName = referenceCar.model;
      const variantName = referenceCar.variant;

      const requests = years.map(year =>
        axios.post('https://dev-ai.nxcar.in/fetch-car-data',
          {
            make: makeName,
            model: modelName,
            variant: variantName,
          }
        )
      );

      // Wait for all requests to complete
      const responses = await Promise.all(requests);

      // Extract data from each response
      const fetchedData = responses.map(res => res.data);

      if (fetchedData.length > 0) {
        const processedData = processFetchedData(fetchedData);
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

  // Handle car selection
  const handleCarClick = (car) => {
    if (!car.vehicle_id) {
      console.warn("Vehicle ID is missing in selected car:", car);
      return;
    }

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

  // Update reference car when make/model/variant IDs change
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

  // Fetch car data when selection changes
  useEffect(() => {
    fetchCarData();
  }, [selectedMake, selectedModel, selectedVariant]);

  // Toggle between All and Region view
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

          // Ensure myCarData is included in all cases
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

            // Update maxPrice safely
            processedData[myCarYearKey].maxPrice = Math.max(
              processedData[myCarYearKey].maxPrice,
              myCarData.price
            );
          }

          setCarData(processedData);
        }
      }
    } catch (error) {
      setCarData({});
    } finally {
      setLoading(false);
    }
  };

  // Handle region change
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

  // Fetch data filtered by region
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

  // Update data when region selection changes
  useEffect(() => {
    if (selectedMake || selectedModel || selectedVariant || selectedYear) {
      handleToggleButton("All");
    }
  }, [selectedMake, selectedModel, selectedVariant, selectedRegion]);

  return {
    selectedRegion,
    filteredRegion,
    regions,
    carData,
    loading,
    availableCars,
    referenceCar,
    selectedYear,
    selectedMake,
    selectedModel,
    selectedVariant,
    filteredData,
    selectedVehicleId,
    error,
    years,
    myCarData,
    yearlyData,
    setSelectedYear,
    handleCarClick,
    handleRegionChange,
    handleToggleButton,
    fetchData,
    fetchCarData
  };
};

export default useCarData;
