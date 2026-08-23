/**
 * Centralized utility to calculate product prices based on payment methods.
 * Ensures strict consistency between the API, Checkout, and Order Creation.
 */

/**
 * Calculates the exact price a customer should pay for a product.
 * @param {Object} product - The product object from the database.
 * @param {string} paymentMethod - 'COD' or 'ONLINE' (or 'UPI', 'CARD', etc.)
 * @returns {number} The final calculated price for the product.
 */
export const calculateProductPrice = (product, paymentMethod) => {
  if (!product) return 0;

  const isCOD = String(paymentMethod).toUpperCase() === 'COD';

  if (isCOD) {
    // Return COD price if it exists, otherwise fallback to the base price
    return product.codPrice !== null && product.codPrice !== undefined 
      ? product.codPrice 
      : product.price;
  } else {
    // Return Online price if it exists, otherwise fallback to the base price
    return product.onlinePrice !== null && product.onlinePrice !== undefined 
      ? product.onlinePrice 
      : product.price;
  }
};

/**
 * Gets the MRP (Maximum Retail Price) for a product.
 * @param {Object} product - The product object from the database.
 * @returns {number} The MRP for the product.
 */
export const getProductMRP = (product) => {
  if (!product) return 0;
  return product.originalPrice !== null && product.originalPrice !== undefined 
    ? product.originalPrice 
    : product.price;
};
