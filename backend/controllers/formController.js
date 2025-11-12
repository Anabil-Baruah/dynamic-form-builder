const Form = require('../models/Form');
const { sanitizeObject } = require('../utils/sanitize');

// @desc    Get all forms
// @route   GET /api/forms
// @access  Admin
exports.getAllForms = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const forms = await Form.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Sort fields by order for each form
    forms.forEach(form => {
      if (form.fields && form.fields.length > 0) {
        form.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    });

    const total = await Form.countDocuments(query);

    res.status(200).json({
      success: true,
      data: forms,
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

// @desc    Get all active forms (public)
// @route   GET /api/forms/public
// @access  Public
exports.getPublicForms = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const query = { status: 'active' };

    const forms = await Form.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Sort fields by order for each form
    forms.forEach(form => {
      if (form.fields && form.fields.length > 0) {
        form.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    });

    const total = await Form.countDocuments(query);

    res.status(200).json({
      success: true,
      data: forms,
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

// @desc    Get single form by ID
// @route   GET /api/forms/:id
// @access  Public (for rendering)
exports.getFormById = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id).select('-__v');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Only return active forms for public access
    if (form.status !== 'active' && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'Form is not available'
      });
    }

    // Sort fields by order before returning
    if (form.fields && form.fields.length > 0) {
      form.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    res.status(200).json({
      success: true,
      data: form
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new form
// @route   POST /api/forms
// @access  Admin
exports.createForm = async (req, res, next) => {
  try {
    const sanitizedData = sanitizeObject(req.body);
    const form = await Form.create(sanitizedData);

    res.status(201).json({
      success: true,
      data: form
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update form
// @route   PUT /api/forms/:id
// @access  Admin
exports.updateForm = async (req, res, next) => {
  try {
    let form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Only create version if fields or structure are being changed
    // Skip versioning for status-only updates
    const isStatusOnlyUpdate = Object.keys(req.body).length === 1 && req.body.status;
    if (!isStatusOnlyUpdate) {
      try {
        await form.createVersion();
      } catch (versionError) {
        // If versioning fails, log but don't block the update
        console.warn('Failed to create form version:', versionError.message);
      }
    }

    // Update form
    const sanitizedData = sanitizeObject(req.body);
    form = await Form.findByIdAndUpdate(
      req.params.id,
      sanitizedData,
      { new: true, runValidators: true }
    );

    // Sort fields by order after update
    if (form.fields && form.fields.length > 0) {
      form.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Check if this is a status-only update
      const isStatusOnlyUpdate = Object.keys(req.body).length === 1 && req.body.status;
      
      if (isStatusOnlyUpdate) {
        // Status update
        io.to(`form-${form._id}`).emit('form-status-updated', {
          formId: form._id.toString(),
          status: form.status,
          title: form.title
        });
      } else {
        // Full form update (including field order changes)
        io.to(`form-${form._id}`).emit('form-updated', {
          formId: form._id.toString(),
          status: form.status,
          title: form.title
        });
      }
      
      // Also emit to all clients for form list updates
      io.emit('form-updated', {
        formId: form._id.toString(),
        status: form.status,
        title: form.title
      });
    }

    res.status(200).json({
      success: true,
      data: form
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete form
// @route   DELETE /api/forms/:id
// @access  Admin
exports.deleteForm = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    await form.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add field to form
// @route   POST /api/forms/:id/fields
// @access  Admin
exports.addField = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    const sanitizedField = sanitizeObject(req.body);
    form.fields.push(sanitizedField);
    await form.save();

    res.status(201).json({
      success: true,
      data: form
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update field in form
// @route   PUT /api/forms/:id/fields/:fieldId
// @access  Admin
exports.updateField = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    const field = form.fields.id(req.params.fieldId);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    const sanitizedData = sanitizeObject(req.body);
    Object.assign(field, sanitizedData);
    await form.save();

    res.status(200).json({
      success: true,
      data: form
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete field from form
// @route   DELETE /api/forms/:id/fields/:fieldId
// @access  Admin
exports.deleteField = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    form.fields.pull(req.params.fieldId);
    await form.save();

    res.status(200).json({
      success: true,
      data: form
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder form fields
// @route   PUT /api/forms/:id/reorder
// @access  Admin
exports.reorderFields = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    const { fieldOrders } = req.body; // { fieldId: newOrder }

    form.fields.forEach(field => {
      if (fieldOrders[field._id]) {
        field.order = fieldOrders[field._id];
      }
    });

    // Sort fields by order
    form.fields.sort((a, b) => a.order - b.order);
    await form.save();

    res.status(200).json({
      success: true,
      data: form
    });
  } catch (error) {
    next(error);
  }
};
