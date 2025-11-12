const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Form = require('../models/Form');
const FormValidator = require('../utils/formValidator');
const { sanitizeObject } = require('../utils/sanitize');
const { Parser } = require('json2csv');

const removeUploadedFiles = (files = []) => {
  if (!Array.isArray(files)) return;
  files.forEach((file) => {
    if (file?.path) {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.warn('Failed to clean up uploaded file:', file.path, err.message);
        }
      });
    }
  });
};

// @desc    Submit form response
// @route   POST /api/submissions/:id/submit
// @access  Public
exports.submitForm = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    if (form.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Form is not accepting submissions'
      });
    }

    if (!req.body.answers || typeof req.body.answers !== 'object') {
      removeUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Answers are required'
      });
    }

    // Sanitize answers
    const sanitizedAnswers = sanitizeObject(req.body.answers);

    // Attach file metadata to answers
    if (Array.isArray(req.files) && req.files.length > 0) {
      const baseUploadsPath = path.join('uploads', 'forms', form._id.toString());
      const fileMap = req.files.reduce((acc, file) => {
        const fieldName = file.fieldname;
        const fileInfo = {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: path.join(baseUploadsPath, file.filename).replace(/\\/g, '/'),
          url: `${req.protocol}://${req.get('host')}/${path.join(baseUploadsPath, file.filename).replace(/\\/g, '/')}`
        };

        if (acc[fieldName]) {
          if (Array.isArray(acc[fieldName])) {
            acc[fieldName].push(fileInfo);
          } else {
            acc[fieldName] = [acc[fieldName], fileInfo];
          }
        } else {
          acc[fieldName] = fileInfo;
        }
        return acc;
      }, {});

      Object.assign(sanitizedAnswers, fileMap);
    }

    // Validate submission
    const validator = new FormValidator(form, sanitizedAnswers);
    const validation = validator.validate();

    if (!validation.isValid) {
      removeUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Create submission
    const submission = await Submission.create({
      formId: form._id,
      formVersion: form.version,
      answers: sanitizedAnswers,
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        submittedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: form.settings.successMessage || 'Thank you for your submission!',
      data: {
        submissionId: submission._id
      }
    });
  } catch (error) {
    removeUploadedFiles(req.files);
    next(error);
  }
};

// @desc    Get all submissions for a form
// @route   GET /api/submissions/:formId
// @access  Admin
exports.getSubmissions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    const query = { formId: req.params.formId };
    if (status) query.status = status;

    const sortOrder = order === 'desc' ? -1 : 1;

    const submissions = await Submission.find(query)
      .select('-__v')
      .sort({ [sortBy]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Submission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single submission
// @route   GET /api/submissions/:formId/:submissionId
// @access  Admin
exports.getSubmissionById = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.submissionId,
      formId: req.params.formId
    }).populate('formId', 'title fields');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update submission status
// @route   PATCH /api/submissions/:formId/:submissionId
// @access  Admin
exports.updateSubmissionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['pending', 'reviewed', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const submission = await Submission.findOneAndUpdate(
      {
        _id: req.params.submissionId,
        formId: req.params.formId
      },
      { status },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete submission
// @route   DELETE /api/submissions/:formId/:submissionId
// @access  Admin
exports.deleteSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findOneAndDelete({
      _id: req.params.submissionId,
      formId: req.params.formId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export submissions to CSV
// @route   GET /api/submissions/:formId/export
// @access  Admin
exports.exportSubmissions = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    const submissions = await Submission.find({ formId: req.params.formId })
      .sort({ createdAt: -1 });

    if (submissions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No submissions found'
      });
    }

    // Prepare data for CSV
    const csvData = submissions.map(sub => {
      const row = {
        'Submission ID': sub._id,
        'Submitted At': sub.metadata.submittedAt,
        'Status': sub.status
      };

      // Add all answer fields
      form.fields.forEach(field => {
        const value = sub.answers[field.name];

        if (Array.isArray(value)) {
          const normalized = value.map((item) => {
            if (item && typeof item === 'object') {
              return item.url || item.path || item.originalName || '[file]';
            }
            return item ?? '';
          });
          row[field.label] = normalized.join(', ');
        } else if (value && typeof value === 'object') {
          row[field.label] = value.url || value.path || value.originalName || '[file]';
        } else {
          row[field.label] = value ?? '';
        }
      });

      return row;
    });

    // Convert to CSV
    const parser = new Parser();
    const csv = parser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${form.title}-submissions.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Get submission statistics
// @route   GET /api/submissions/:formId/stats
// @access  Admin
exports.getSubmissionStats = async (req, res, next) => {
  try {
    const formId = req.params.formId;

    const stats = await Submission.aggregate([
      { $match: { formId: mongoose.Types.ObjectId(formId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          reviewed: {
            $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] }
          },
          archived: {
            $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || { total: 0, pending: 0, reviewed: 0, archived: 0 }
    });
  } catch (error) {
    next(error);
  }
};
