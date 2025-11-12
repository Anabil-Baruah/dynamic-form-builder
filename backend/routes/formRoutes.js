const express = require('express');
const router = express.Router();
const {
  getAllForms,
  getFormById,
  getPublicForms,
  createForm,
  updateForm,
  deleteForm,
  addField,
  updateField,
  deleteField,
  reorderFields
} = require('../controllers/formController');
const { authenticateAdmin } = require('../middleware/auth');
const {
  createFormRules,
  updateFormRules,
  createFieldRules,
  listFormsRules,
  validate
} = require('../middleware/validation');

// Public routes (no auth required)
router.get('/public', getPublicForms); // List active forms publicly
router.get('/:id', getFormById); // Get form for rendering

// Admin routes (authentication required)
router.get('/', authenticateAdmin, listFormsRules, validate, getAllForms);
router.post('/', authenticateAdmin, createFormRules, validate, createForm);
router.put('/:id', authenticateAdmin, updateFormRules, validate, updateForm);
router.delete('/:id', authenticateAdmin, deleteForm);

// Field management routes
router.post('/:id/fields', authenticateAdmin, createFieldRules, validate, addField);
router.put('/:id/fields/:fieldId', authenticateAdmin, updateField);
router.delete('/:id/fields/:fieldId', authenticateAdmin, deleteField);
router.put('/:id/reorder', authenticateAdmin, reorderFields);

module.exports = router;
