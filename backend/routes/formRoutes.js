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

// Management routes (now public)
router.get('/', listFormsRules, validate, getAllForms);
router.post('/', createFormRules, validate, createForm);
router.put('/:id', updateFormRules, validate, updateForm);
router.delete('/:id', deleteForm);

// Field management routes (public)
router.post('/:id/fields', createFieldRules, validate, addField);
router.put('/:id/fields/:fieldId', updateField);
router.delete('/:id/fields/:fieldId', deleteField);
router.put('/:id/reorder', reorderFields);

module.exports = router;
