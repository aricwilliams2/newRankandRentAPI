const Joi = require("joi");

const seoValidationSchema = {
  urlMetrics: Joi.object({
    url: Joi.string().uri().required().messages({
      "string.uri": "Please provide a valid URL",
      "any.required": "URL parameter is required",
    }),
  }),

  keywordMetrics: Joi.object({
    keyword: Joi.string().min(1).max(100).required().messages({
      "string.min": "Keyword must be at least 1 character long",
      "string.max": "Keyword must be less than 100 characters",
      "any.required": "Keyword parameter is required",
    }),
    country: Joi.string().length(2).default("us").messages({
      "string.length": "Country must be a 2-letter country code",
    }),
  }),

  keywordGenerator: Joi.object({
    keyword: Joi.string().min(1).max(100).required().messages({
      "string.min": "Keyword must be at least 1 character long",
      "string.max": "Keyword must be less than 100 characters",
      "any.required": "Keyword parameter is required",
    }),
    country: Joi.string().length(2).default("us").messages({
      "string.length": "Country must be a 2-letter country code",
    }),
  }),

  googleRankCheck: Joi.object({
    keyword: Joi.string().min(1).max(100).required().messages({
      "string.min": "Keyword must be at least 1 character long",
      "string.max": "Keyword must be less than 100 characters",
      "any.required": "Keyword parameter is required",
    }),
    url: Joi.string().uri().required().messages({
      "string.uri": "Please provide a valid URL",
      "any.required": "URL parameter is required",
    }),
    country: Joi.string().length(2).default("us").messages({
      "string.length": "Country must be a 2-letter country code",
    }),
    id: Joi.string().default("google-serp").messages({
      "string.base": "ID must be a string",
    }),
  }),
};

const backlinkValidationSchema = {
  domainBacklinks: Joi.object({
    domain: Joi.string().domain().required().messages({
      "string.domain": "Please provide a valid domain name",
      "any.required": "Domain parameter is required",
    }),
  }),

  domainKeywords: Joi.object({
    domain: Joi.string().domain().required().messages({
      "string.domain": "Please provide a valid domain name",
      "any.required": "Domain parameter is required",
    }),
  }),
};

const leadValidationSchema = {
  store: Joi.object({
    name: Joi.string().max(255).allow("", null).optional(),
    email: Joi.string().email().max(255).allow(null, ""),
    phone: Joi.string().max(20).allow("", null).optional(),
    company: Joi.string().max(255).allow(null, ""),
    status: Joi.string().valid("New", "Contacted", "Qualified", "Converted", "Lost").default("New"),
    notes: Joi.string().allow(null, ""),
    reviews: Joi.number().integer().allow(null),
    website: Joi.string().uri().max(255).allow(null, ""),
    contacted: Joi.boolean().default(false),
    city: Joi.string().max(255).allow(null, ""),
  }),

  update: Joi.object({
    name: Joi.string().max(255),
    email: Joi.string().email().max(255).allow(null, ""),
    phone: Joi.string().max(20),
    company: Joi.string().max(255).allow(null, ""),
    status: Joi.string().valid("New", "Contacted", "Qualified", "Converted", "Lost"),
    notes: Joi.string().allow(null, ""),
    reviews: Joi.number().allow(null),
    website: Joi.string().uri().max(255).allow(null, ""),
    contacted: Joi.boolean(),
    city: Joi.string().max(255).allow(null, ""),
  }),
};

const clientValidationSchema = {
  store: Joi.object({
    name: Joi.string().max(255).required(),
    email: Joi.string().email().max(255).allow("", null),
    phone: Joi.string().max(20).allow(null, ""),
    website: Joi.string().uri().max(255).required(),
    city: Joi.string().max(255).allow(null, ""),
    reviews: Joi.number().allow(null),
    contacted: Joi.boolean().default(false),
    follow_up_at: Joi.date().allow(null),
    notes: Joi.string().allow(null, ""),
    user_id: Joi.number().integer().required(),
  }),

  update: Joi.object({
    name: Joi.string().max(255),
    email: Joi.string().email().max(255).allow(null, ""),
    phone: Joi.string().max(20).allow(null, ""),
    website: Joi.string().uri().max(255),
    city: Joi.string().max(255).allow(null, ""),
    reviews: Joi.number().allow(null),
    contacted: Joi.boolean(),
    follow_up_at: Joi.date().allow(null),
    notes: Joi.string().allow(null, ""),
    user_id: Joi.number().integer().required(),
  }),
};

const validateLead = (type) => {
  return (req, res, next) => {
    const schema = leadValidationSchema[type];
    const { error, value } = schema.validate(req.body, { stripUnknown: true });

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});

      return res.status(422).json({
        message: "The given data was invalid.",
        errors: errors,
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
        message: "The given data was invalid.",
        errors: errors,
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
        message: "The given data was invalid.",
        errors: errors,
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
        message: "The given data was invalid.",
        errors: errors,
      });
    }

    req.validatedBody = value;
    next();
  };
};

const validateGoogleSearchRequest = (type) => {
  return (req, res, next) => {
    const schema = googleSearchValidationSchema[type];
    const { error, value } = schema.validate(req.body);

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});

      return res.status(422).json({
        message: "The given data was invalid.",
        errors: errors,
      });
    }

    req.validatedBody = value;
    next();
  };
};

const websiteValidationSchema = {
  store: Joi.object({
    domain: Joi.string().domain().max(255).required(),
    niche: Joi.string().max(100).allow(null, ""),
    status: Joi.string().valid("active", "inactive", "suspended").default("active"),
    monthly_revenue: Joi.number().min(0).default(0),
    domain_authority: Joi.number().integer().min(0).max(100).default(0),
    backlinks: Joi.number().integer().min(0).default(0),
    organic_keywords: Joi.number().integer().min(0).default(0),
    organic_traffic: Joi.number().integer().min(0).default(0),
    top_keywords: Joi.array().items(Joi.string()).allow(null),
    competitors: Joi.array().items(Joi.string()).allow(null),
    seo_last_updated: Joi.date().allow(null),
  }),

  update: Joi.object({
    domain: Joi.string().domain().max(255),
    niche: Joi.string().max(100).allow(null, ""),
    status: Joi.string().valid("active", "inactive", "suspended"),
    monthly_revenue: Joi.number().min(0),
    domain_authority: Joi.number().integer().min(0).max(100),
    backlinks: Joi.number().integer().min(0),
    organic_keywords: Joi.number().integer().min(0),
    organic_traffic: Joi.number().integer().min(0),
    top_keywords: Joi.array().items(Joi.string()).allow(null),
    competitors: Joi.array().items(Joi.string()).allow(null),
    seo_last_updated: Joi.date().allow(null),
  }),
};

const taskValidationSchema = {
  store: Joi.object({
    website_id: Joi.string().max(36).allow(null, ""),
    title: Joi.string().max(255).required(),
    description: Joi.string().allow(null, ""),
    status: Joi.string().valid("todo", "in_progress", "completed").default("todo"),
    priority: Joi.string().valid("low", "medium", "high").default("medium"),
    assignee: Joi.string().max(255).allow(null, ""),
    due_date: Joi.date().allow(null),
  }),

  update: Joi.object({
    website_id: Joi.string().max(36).allow(null, ""),
    title: Joi.string().max(255),
    description: Joi.string().allow(null, ""),
    status: Joi.string().valid("todo", "in_progress", "completed"),
    priority: Joi.string().valid("low", "medium", "high"),
    assignee: Joi.string().max(255).allow(null, ""),
    due_date: Joi.date().allow(null),
  }),
};

const validateWebsite = (type) => {
  return (req, res, next) => {
    const schema = websiteValidationSchema[type];
    const { error, value } = schema.validate(req.body);

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});

      return res.status(422).json({
        message: "The given data was invalid.",
        errors: errors,
      });
    }

    req.validatedData = value;
    next();
  };
};

const validateTask = (type) => {
  return (req, res, next) => {
    const schema = taskValidationSchema[type];
    const { error, value } = schema.validate(req.body);

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});

      return res.status(422).json({
        message: "The given data was invalid.",
        errors: errors,
      });
    }

    req.validatedData = value;
    next();
  };
};
const authValidationSchema = {
  register: Joi.object({
    name: Joi.string().max(255).required().messages({
      "any.required": "Name is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters long",
      "any.required": "Password is required",
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),
};

const validateAuth = (type) => {
  return (req, res, next) => {
    const schema = authValidationSchema[type];
    const { error, value } = schema.validate(req.body);

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        acc[detail.context.key] = [detail.message];
        return acc;
      }, {});

      return res.status(422).json({
        message: "The given data was invalid.",
        errors: errors,
      });
    }

    req.validatedData = value;
    next();
  };
};

module.exports = {
  validateLead,
  validateClient,
  validateSeoRequest,
  validateBacklinkRequest,
  validateGoogleSearchRequest,
  validateWebsite,
  validateTask,
  validateAuth,
};
