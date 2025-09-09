// middlewares/validation.js
const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details.map(d => d.message) 
      });
    }
    next();
  };
};

// In middlewares/validation.js
// const validate = (schema) => {
//     return (req, res, next) => {
//       try {
//         const { error, value } = schema.validate(req.body, { abortEarly: false });
//         if (error) {
//           const errors = error.details.map(detail => ({
//             field: detail.context.key,
//             message: detail.message
//           }));
//           return res.status(400).json({ 
//             error: 'Validation failed',
//             details: errors 
//           });
//         }
//         req.body = value; // Use the validated and possibly converted values
//         next();
//       } catch (err) {
//         console.error('Validation error:', err);
//         res.status(500).json({ error: 'Internal server error during validation' });
//       }
//     };
//   };

module.exports = validate;