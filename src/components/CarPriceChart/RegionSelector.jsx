import React from 'react';
import '../../styles/RegionSelector.css';

/**
 * RegionSelector component for filtering by region
 * @param {Object} props - Component props
 * @param {string} props.selectedRegion - Currently selected region
 * @param {string} props.filteredRegion - Filter applied region
 * @param {Array} props.regions - Available regions
 * @param {Function} props.handleRegionChange - Handle region change
 * @param {Function} props.handleToggleButton - Handle toggle button click
 * @param {boolean} props.loading - Loading state
 * @returns {JSX.Element} RegionSelector component
 */
const RegionSelector = ({ 
  selectedRegion, 
  filteredRegion, 
  regions, 
  handleRegionChange, 
  handleToggleButton,
  loading 
}) => {
  return (
    <div className="region-controls">
      <select
        onChange={(e) => handleRegionChange(e.target.value)}
        value={selectedRegion}
        className="region-select"
      >
        {regions.map(region => (
          <option key={region} value={region}>{region}</option>
        ))}
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
  );
};

export default RegionSelector;
