const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const {
  submitForm,
  getSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  deleteSubmission,
  exportSubmissions,
  getSubmissionStats
} = require('../controllers/submissionController');
const { authenticateAdmin } = require('../middleware/auth');
const {
  submitFormRules,
  listSubmissionsRules,
  validate
} = require('../middleware/validation');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'forms');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const formId = req.params.id;
    const uploadPath = path.join(uploadsRoot, formId);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 10
  }
});

const parseSubmission = (req, res, next) => {
  if (req.body && typeof req.body.answers === 'string') {
    try {
      req.body.answers = JSON.parse(req.body.answers);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answers payload. Expected valid JSON.'
      });
    }
  }
  next();
};

// Public routes
router.post('/:id/submit', upload.any(), parseSubmission, submitFormRules, validate, submitForm);

// Admin routes
router.get('/:formId', authenticateAdmin, listSubmissionsRules, validate, getSubmissions);
router.get('/:formId/stats', authenticateAdmin, getSubmissionStats);
router.get('/:formId/export', authenticateAdmin, exportSubmissions);
router.get('/:formId/:submissionId', authenticateAdmin, getSubmissionById);
router.patch('/:formId/:submissionId', authenticateAdmin, updateSubmissionStatus);
router.delete('/:formId/:submissionId', authenticateAdmin, deleteSubmission);

module.exports = router;
