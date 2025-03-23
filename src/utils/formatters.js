/**
 * Format price in lakhs
 * @param {number} price - Price in rupees
 * @returns {string} Formatted price string
 */
export const formatPriceInLakhs = (price) => {
  const inLakhs = price / 100000;
  return `₹ ${inLakhs.toFixed(2)} Lakhs`;
};
