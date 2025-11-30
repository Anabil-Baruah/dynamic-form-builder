const { sanitizeObject } = require('../utils/sanitize');
const store = require('../utils/fileStore');

// @desc    Get all forms
// @route   GET /api/forms
// @access  Admin
exports.getAllForms = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const { data, pagination } = await store.listForms({ status, page: Number(page), limit: Number(limit) });
    // Ensure fields sorted
    data.forEach((form) => {
      if (form.fields?.length) form.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    res.status(200).json({ success: true, data, pagination });
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

    const { data, pagination } = await store.listForms({ status: 'active', page: Number(page), limit: Number(limit) });
    data.forEach((form) => {
      if (form.fields?.length) form.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    res.status(200).json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single form by ID
// @route   GET /api/forms/:id
// @access  Public (for rendering)
exports.getFormById = async (req, res, next) => {
  try {
    const form = await store.getForm(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

  // Only return active forms for public access
  // Admin authentication removed: return form regardless of status

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
    const form = await store.createForm(sanitizedData);

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
    let form = await store.getForm(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Versioning disabled: proceed with update directly

  // Update form
    const sanitizedData = sanitizeObject(req.body);
    form = await store.updateForm(req.params.id, sanitizedData);

  // Sort fields by order after update
  if (form.fields && form.fields.length > 0) {
    form.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`form-${form._id}`).emit('form-updated', {
        formId: form._id.toString(),
        status: form.status,
        title: form.title
      });
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
    const form = await store.getForm(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    await store.deleteForm(req.params.id);

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
    const form = await store.getForm(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    const sanitizedField = sanitizeObject(req.body);
    const nextFields = [...(form.fields || [])];
    nextFields.push({ ...sanitizedField, _id: sanitizedField._id || `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`, order: nextFields.length });
    const updated = await store.updateForm(req.params.id, { fields: nextFields });

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
    const form = await store.getForm(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    const field = (form.fields || []).find(f => String(f._id) === String(req.params.fieldId));
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    const sanitizedData = sanitizeObject(req.body);
    const updatedFields = (form.fields || []).map(f => (String(f._id) === String(req.params.fieldId) ? { ...f, ...sanitizedData } : f));
    const updated = await store.updateForm(req.params.id, { fields: updatedFields });

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
    const form = await store.getForm(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    const updatedFields = (form.fields || []).filter(f => String(f._id) !== String(req.params.fieldId));
    const updated = await store.updateForm(req.params.id, { fields: updatedFields });

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
    const form = await store.getForm(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    const { fieldOrders } = req.body;
    const updated = await store.reorderFields(req.params.id, fieldOrders || {});
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
