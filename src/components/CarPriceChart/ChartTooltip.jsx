import React, { forwardRef } from 'react';

/**
 * Tooltip component for displaying car details
 * @param {Object} props - Component props
 * @param {React.Ref} ref - Forwarded ref
 * @returns {JSX.Element} ChartTooltip component
 */
const ChartTooltip = forwardRef((props, ref) => {
  return (
    <div 
      ref={ref} 
      id="tooltip-container"
      style={{
        position: 'absolute',
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: 99999
      }}
    />
  );
});

export default ChartTooltip;
