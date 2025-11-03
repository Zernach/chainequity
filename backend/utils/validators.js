/**
 * Input validation functions for ChainEquity backend
 */

const { PublicKey } = require('@solana/web3.js');

/**
 * Validate Solana public key
 */
function isValidPublicKey(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate positive number
 */
function isPositiveNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Validate token amount (must be positive and within bounds)
 */
function isValidTokenAmount(amount, decimals = 9) {
  if (!isPositiveNumber(amount)) {
    return false;
  }

  const num = Number(amount);
  const maxAmount = Number.MAX_SAFE_INTEGER / Math.pow(10, decimals);
  
  return num <= maxAmount;
}

/**
 * Validate token symbol (3-10 uppercase letters)
 */
function isValidSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return false;
  }

  return /^[A-Z]{3,10}$/.test(symbol);
}

/**
 * Validate token name (2-50 characters)
 */
function isValidTokenName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }

  return name.length >= 2 && name.length <= 50;
}

/**
 * Validate split ratio (must be positive integer)
 */
function isValidSplitRatio(ratio) {
  const num = Number(ratio);
  return Number.isInteger(num) && num > 0 && num <= 1000;
}

/**
 * Validate decimals (0-9)
 */
function isValidDecimals(decimals) {
  const num = Number(decimals);
  return Number.isInteger(num) && num >= 0 && num <= 9;
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
function sanitizeString(input, maxLength = 255) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
}

/**
 * Validate request body has required fields
 */
function validateRequiredFields(body, fields) {
  const missing = [];
  
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

module.exports = {
  isValidPublicKey,
  isPositiveNumber,
  isValidTokenAmount,
  isValidSymbol,
  isValidTokenName,
  isValidSplitRatio,
  isValidDecimals,
  sanitizeString,
  validateRequiredFields,
};

