const Joi = require('joi');

const seoValidationSchema = {
  urlMetrics: Joi.object({
    url: Joi.string().uri().required().messages({
      'string.uri': 'Please provide a valid URL',
      'any.required': 'URL parameter is required'
    })
  }),
  
  keywordMetrics: Joi.object({
    keyword: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Keyword must be at least 1 character long',
      'string.max': 'Keyword must be less than 100 characters',
      'any.required': 'Keyword parameter is required'
    }),
    country: Joi.string().length(2).default('us').messages({
      'string.length': 'Country must be a 2-letter country code'
    })
  }),
  
  keywordGenerator: Joi.object({
    keyword: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Keyword must be at least 1 character long',
      'string.max': 'Keyword must be less than 100 characters',
      'any.required': 'Keyword parameter is required'
    }),
    country: Joi.string().length(2).default('us').messages({
      'string.length': 'Country must be a 2-letter country code'
    })
  }),
  
  googleRankCheck: Joi.object({
    keyword: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Keyword must be at least 1 character long',
      'string.max': 'Keyword must be less than 100 characters',
      'any.required': 'Keyword parameter is required'
    }),
    url: Joi.string().uri().required().messages({
      'string.uri': 'Please provide a valid URL',
      'any.required': 'URL parameter is required'
    }),
    country: Joi.string().length(2).default('us').messages({
      'string.length': 'Country must be a 2-letter country code'
    }),
    id: Joi.string().default('google-serp').messages({
      'string.base': 'ID must be a string'
    })
  })
};

const backlinkValidationSchema = {
  domainBacklinks: Joi.object({
    domain: Joi.string().domain().required().messages({
      'string.domain': 'Please provide a valid domain name',
      'any.required': 'Domain parameter is required'
    })
  }),
  
  domainKeywords: Joi.object({
    domain: Joi.string().domain().required().messages({
      'string.domain': 'Please provide a valid domain name',
      'any.required': 'Domain parameter is required'
    })
  })
};

const leadValidationSchema = {
  store: Joi.object({
    name: Joi.string().max(255).required(),
    email: Joi.string().email().max(255).allow(null, ''),
    phone: Joi.string().max(20).required(),
    company: Joi.string().max(255).allow(null, ''),
    status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Converted', 'Lost').default('New'),
    notes: Joi.string().allow(null, ''),
    reviews: Joi.number().integer().allow(null),
    website: Joi.string().uri().max(255).allow(null, ''),
    contacted: Joi.boolean().default(false),
    city: Joi.string().max(255).allow(null, '')
  }),
  
  update: Joi.object({
    name: Joi.string().max(255),
    email: Joi.string().email().max(255).allow(null, ''),
    phone: Joi.string().max(20),
    company: Joi.string().max(255).allow(null, ''),
    status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Converted', 'Lost'),
    notes: Joi.string().allow(null, ''),
    reviews: Joi.number().integer().allow(null),
    website: Joi.string().uri().max(255).allow(null, ''),
    contacted: Joi.boolean(),
    city: Joi.string().max(255).allow(null, '')
  })
};

const clientValidationSchema = {
  store: Joi.object({
    website: Joi.string().uri().max(255).required(),
    phone: Joi.string().max(20).allow(null, ''),
    email: Joi.string().email().max(255).required(),
    status: Joi.string().valid('new', 'active', 'inactive', 'suspended').default('new'),
    revenue: Joi.number().min(0).default(0),
    history: Joi.string().allow(null, ''),
    note: Joi.string().allow(null, '')
  }),
  
  update: Joi.object({
    website: Joi.string().uri().max(255),
    phone: Joi.string().max(20).allow(null, ''),
    email: Joi.string().email().max(255),
    status: Joi.string().valid('new', 'active', 'inactive', 'suspended'),
    revenue: Joi.number().min(0),
    history: Joi.string().allow(null, ''),
    note: Joi.string().allow(null, '')
  })
};

const validateLead = (type) => {
  return (req, res, next) => {
    const schema = leadValidationSchema[type];
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});
      
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: errors
      });
    }
    
    req.validatedData = value;
    next();
  };
};

const validateClient = (type) => {
  return (req, res, next) => {
    const schema = clientValidationSchema[type];
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});
      
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: errors
      });
    }
    
    req.validatedData = value;
    next();
  };
};

const validateSeoRequest = (type) => {
  return (req, res, next) => {
    const schema = seoValidationSchema[type];
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});
      
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: errors
      });
    }
    
    req.validatedQuery = value;
    next();
  };
};

const validateBacklinkRequest = (type) => {
  return (req, res, next) => {
    const schema = backlinkValidationSchema[type];
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});
      
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: errors
      });
    }
    
    req.validatedBody = value;
    next();
  };
};

module.exports = {
  validateLead,
  validateClient,
  validateSeoRequest,
  validateBacklinkRequest
};