import React, { forwardRef, useEffect } from 'react';
import '../../styles/ChartTooltip.css';

/**
 * Tooltip component for displaying car details
 * @param {Object} props - Component props
 * @param {React.Ref} ref - Forwarded ref
 * @returns {JSX.Element} ChartTooltip component
 */
const ChartTooltip = forwardRef((props, ref) => {
  // Handle cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Remove any existing tooltips on unmount
      const tooltips = document.querySelectorAll('.tooltip-container');
      tooltips.forEach(tooltip => tooltip.remove());
    };
  }, []);

  return (
    <div 
      ref={ref}
      className="tooltip-container"
    />
  );
});

export default ChartTooltip;
