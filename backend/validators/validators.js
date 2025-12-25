const Joi = require('joi');

// User registration validation
const registerSchema = Joi.object({
    username: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username cannot exceed 50 characters',
            'any.required': 'Username is required'
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email',
            'any.required': 'Email is required'
        }),
    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters',
            'any.required': 'Password is required'
        })
});

// User login validation
const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email',
            'any.required': 'Email is required'
        }),
    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

// Event validation
const eventSchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.min': 'Event name must be at least 3 characters',
            'string.max': 'Event name cannot exceed 200 characters',
            'any.required': 'Event name is required'
        }),
    type: Joi.string()
        .valid('conference', 'concert', 'workshop', 'meetup')
        .required()
        .messages({
            'any.only': 'Type must be one of: conference, concert, workshop, meetup',
            'any.required': 'Event type is required'
        }),
    description: Joi.string()
        .max(2000)
        .allow('')
        .optional(),
    date: Joi.date()
        .required()
        .messages({
            'any.required': 'Event date is required'
        }),
    end_date: Joi.date()
        .greater(Joi.ref('date'))
        .allow(null)
        .optional()
        .messages({
            'date.greater': 'End date must be after start date'
        }),
    location: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.min': 'Location must be at least 3 characters',
            'any.required': 'Location is required'
        }),
    capacity: Joi.number()
        .integer()
        .min(1)
        .max(100000)
        .default(100),
    price: Joi.number()
        .min(0)
        .max(99999.99)
        .default(0),
    status: Joi.string()
        .valid('upcoming', 'completed', 'cancelled')
        .default('upcoming'),
    image: Joi.string()
        .uri()
        .allow('')
        .optional()
});

// Event update validation (all fields optional)
const eventUpdateSchema = Joi.object({
    name: Joi.string().min(3).max(200).optional(),
    type: Joi.string().valid('conference', 'concert', 'workshop', 'meetup').optional(),
    description: Joi.string().max(2000).allow('').optional(),
    date: Joi.date().optional(),
    end_date: Joi.date().allow(null).optional(),
    location: Joi.string().min(3).max(200).optional(),
    capacity: Joi.number().integer().min(1).max(100000).optional(),
    price: Joi.number().min(0).max(99999.99).optional(),
    status: Joi.string().valid('upcoming', 'completed', 'cancelled').optional(),
    image: Joi.string().uri().allow('').optional()
});

// Scraping trigger validation
const scrapingSchema = Joi.object({
    city: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'any.required': 'City is required for scraping'
        }),
    keyword: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'any.required': 'Keyword is required for scraping'
        })
});

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        req.validatedBody = value;
        next();
    };
};

module.exports = {
    registerSchema,
    loginSchema,
    eventSchema,
    eventUpdateSchema,
    scrapingSchema,
    validate
};
