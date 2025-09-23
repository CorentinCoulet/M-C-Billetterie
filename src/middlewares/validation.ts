import { NextApiRequest, NextApiResponse } from 'next';
import { Schema, ValidationError } from 'joi';

// Define NextHandler type since we removed next-connect
type NextHandler = (error?: any) => void;

/**
 * Middleware for validating incoming request data
 * Uses Joi for schema validation
 */

interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
}

/**
 * Validate request body against a Joi schema
 */
export function validateBody(schema: Schema, options: ValidationOptions = { abortEarly: false, stripUnknown: true }) {
  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    }

    const { error, value } = schema.validate(req.body, options);
    
    if (error) {
      const errorDetails = formatJoiError(error);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errorDetails 
      });
    }

    // Replace request body with validated value
    req.body = value;
    return next();
  };
}

/**
 * Validate request query parameters against a Joi schema
 */
export function validateQuery(schema: Schema, options: ValidationOptions = { abortEarly: false, stripUnknown: true }) {
  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    const { error, value } = schema.validate(req.query, options);
    
    if (error) {
      const errorDetails = formatJoiError(error);
      return res.status(400).json({ 
        message: 'Validation error in query parameters', 
        errors: errorDetails 
      });
    }

    // Replace request query with validated value
    req.query = value;
    return next();
  };
}

/**
 * Validate request params against a Joi schema
 */
export function validateParams(schema: Schema, options: ValidationOptions = { abortEarly: false, stripUnknown: true }) {
  return (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    // In Next.js, params are typically part of the query object
    // Extract only the dynamic route parameters
    const params = req.query;
    
    const { error, value } = schema.validate(params, options);
    
    if (error) {
      const errorDetails = formatJoiError(error);
      return res.status(400).json({ 
        message: 'Validation error in route parameters', 
        errors: errorDetails 
      });
    }

    // Update the params in the query object
    Object.assign(req.query, value);
    return next();
  };
}

/**
 * Format Joi validation errors into a more user-friendly structure
 */
function formatJoiError(error: ValidationError) {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type
  }));
}

/**
 * Validate multiple parts of the request at once
 */
export function validate({
  body,
  query,
  params
}: {
  body?: Schema,
  query?: Schema,
  params?: Schema
}, options: ValidationOptions = { abortEarly: false, stripUnknown: true }) {
  return async (req: NextApiRequest, res: NextApiResponse, next: NextHandler) => {
    try {
      // Create a middleware chain
      const middlewares = [];
      
      if (body) middlewares.push(validateBody(body, options));
      if (query) middlewares.push(validateQuery(query, options));
      if (params) middlewares.push(validateParams(params, options));
      
      // Execute middlewares in sequence
      for (const middleware of middlewares) {
        await new Promise<void>((resolve, reject) => {
          middleware(req, res, (err?: Error) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      return next();
    } catch (error) {
      // This will catch any errors thrown by the middleware chain
      console.error('Validation error:', error);
      return res.status(400).json({ message: 'Validation failed' });
    }
  };
}