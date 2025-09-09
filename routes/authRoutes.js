const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validation');

// Enhanced validation schemas
const schemas = {
  signup: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\d{10}$/).required(),
    password: Joi.string().min(6).required(),
    location: Joi.string().required(),
    role: Joi.string().valid('user', 'worker').default('user'),
    // Worker-specific fields (only validated when role=worker)
    profession: Joi.when('role', {
      is: 'worker',
      then: Joi.string().valid('driver', 'painter', 'plumber', 'electrician', 'carpenter', 'cleaner', 'other').required(),
      otherwise: Joi.forbidden()
    }),
    skills: Joi.when('role', {
      is: 'worker',
      then: Joi.array().items(Joi.string()).min(1).required(),
      otherwise: Joi.forbidden()
    })
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  verification: Joi.object({
    userId: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
    code: Joi.string().length(6).required()
  }),
  resendVerification: Joi.object({
    userId: Joi.string().pattern(/^[a-f\d]{24}$/i).required(),
    type: Joi.string().valid('email', 'phone').required()
  })
};

// Authentication Routes
router.post('/signup', validate(schemas.signup), authController.signup);
router.post('/login', validate(schemas.login), authController.login);

// Verification Routes
router.get('/check-verification', authController.checkVerification);
router.post('/verify-email', validate(schemas.verification), authController.verifyEmail);
router.post('/verify-phone', validate(schemas.verification), authController.verifyPhone);
router.post('/resend-verification', validate(schemas.resendVerification), authController.resendVerification);

module.exports = router;