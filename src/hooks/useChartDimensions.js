import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage responsive chart dimensions
 * @returns {Object} The responsive dimensions and scales
 */
export const useChartDimensions = () => {
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  
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

  // Get responsive margins
  const getMargins = useCallback(() => {
    return {
      top: screenWidth <= 480 ? 20 : 40,   
      right: screenWidth <= 480 ? 20 : 40, 
      bottom: screenWidth <= 480 ? 40 : 45, 
      left: screenWidth <= 480 ? 40 : 60  
    };
  }, [screenWidth]);

  return {
    screenWidth,
    getResponsiveScales,
    getTooltipPosition,
    getMargins
  };
};

export default useChartDimensions;
