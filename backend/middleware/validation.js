const { body, param, query, validationResult } = require('express-validator');

// Middleware to check validation results
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Form validation rules
exports.createFormRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('fields')
    .optional()
    .isArray().withMessage('Fields must be an array'),
];

exports.updateFormRules = [
  param('id').trim().notEmpty().withMessage('Invalid form ID'),
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 200 }).withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Invalid status. Must be draft, active, or archived'),
  body('fields')
    .optional()
    .isArray().withMessage('Fields must be an array'),
];

// Field validation rules
exports.createFieldRules = [
  param('id').trim().notEmpty().withMessage('Invalid form ID'),
  body('label')
    .trim()
    .notEmpty().withMessage('Field label is required')
    .isLength({ max: 200 }).withMessage('Label must be less than 200 characters'),
  body('type')
    .notEmpty().withMessage('Field type is required')
    .isIn(['text', 'textarea', 'number', 'email', 'date', 'checkbox', 'radio', 'select', 'file'])
    .withMessage('Invalid field type'),
  body('name')
    .trim()
    .notEmpty().withMessage('Field name is required')
    .matches(/^[a-z0-9_]+$/).withMessage('Field name can only contain lowercase letters, numbers, and underscores'),
  body('required')
    .optional()
    .isBoolean().withMessage('Required must be a boolean'),
  body('options')
    .optional()
    .isArray().withMessage('Options must be an array'),
];

// Submission validation
exports.submitFormRules = [
  param('id').trim().notEmpty().withMessage('Invalid form ID'),
  body('answers')
    .notEmpty().withMessage('Answers are required')
    .isObject().withMessage('Answers must be an object'),
];

// Query validation
exports.listFormsRules = [
  query('status')
    .optional()
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

exports.listSubmissionsRules = [
  param('formId').trim().notEmpty().withMessage('Invalid form ID'),
  query('status')
    .optional()
    .isIn(['pending', 'reviewed', 'archived'])
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
