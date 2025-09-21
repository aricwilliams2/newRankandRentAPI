const Joi = require('joi');

/**
 * Validation schemas for SEO API endpoints
 */

// Grid sizes that are supported
const SUPPORTED_GRID_SIZES = [
  '0.7x0.7', '1.75x1.75', '3.5x3.5', '5.25x5.25', 
  '7x7', '14x14', '21x21'
];

// Removed individual validation schemas - only need the main analysis validation

/**
 * Validation schema for SEO analysis endpoint
 */
const analysisSchema = Joi.object({
  business_address: Joi.string()
    .min(5)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Business address is required',
      'string.min': 'Business address must be at least 5 characters long',
      'string.max': 'Business address must not exceed 500 characters',
      'any.required': 'Business address is required'
    }),
  keyword: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Keyword is required',
      'string.min': 'Keyword must be at least 2 characters long',
      'string.max': 'Keyword must not exceed 100 characters',
      'any.required': 'Keyword is required'
    }),
  target_business_name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Target business name is required',
      'string.min': 'Target business name must be at least 2 characters long',
      'string.max': 'Target business name must not exceed 200 characters',
      'any.required': 'Target business name is required'
    }),
  grid_size: Joi.string()
    .valid(...SUPPORTED_GRID_SIZES)
    .required()
    .messages({
      'any.only': `Grid size must be one of: ${SUPPORTED_GRID_SIZES.join(', ')}`,
      'any.required': 'Grid size is required'
    })
});

// Removed individual validation middleware - only need the main analysis validation

/**
 * Middleware to validate SEO analysis request
 */
const validateAnalysis = (req, res, next) => {
  const { error, value } = analysisSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  req.body = value;
  next();
};

/**
 * Middleware to validate coordinates
 */
const validateCoordinates = (req, res, next) => {
  const { lat, lng } = req.body.coordinates || {};

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Coordinates must contain valid lat and lng numbers'
    });
  }

  if (lat < -90 || lat > 90) {
    return res.status(400).json({
      success: false,
      error: 'Latitude must be between -90 and 90 degrees'
    });
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json({
      success: false,
      error: 'Longitude must be between -180 and 180 degrees'
    });
  }

  next();
};

module.exports = {
  validateAnalysis,
  validateCoordinates,
  SUPPORTED_GRID_SIZES
};
