const mongoose = require('mongoose');

// Import FormVersion to ensure it's registered before use
// This ensures the model is registered when Form model is loaded
const FormVersionModel = require('./FormVersion');

const fieldSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Field label is required'],
    trim: true,
    maxlength: [200, 'Label cannot exceed 200 characters']
  },
  type: {
    type: String,
    required: [true, 'Field type is required'],
    enum: ['text', 'textarea', 'number', 'email', 'date', 'checkbox', 'radio', 'select', 'file'],
    lowercase: true
  },
  name: {
    type: String,
    required: [true, 'Field name is required'],
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_]+$/, 'Field name can only contain lowercase letters, numbers, and underscores']
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    type: String,
    trim: true
  }],
  validation: {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String,
    customMessage: String
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  conditionalFields: [this], // Recursive reference for nested conditional fields
  showWhen: {
    parentFieldName: String,
    parentFieldValue: String
  }
}, { _id: true });

const formSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Form title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  fields: [fieldSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'active'
  },
  version: {
    type: Number,
    default: 1
  },
  settings: {
    submitButtonText: {
      type: String,
      default: 'Submit'
    },
    successMessage: {
      type: String,
      default: 'Thank you for your submission!'
    },
    allowMultipleSubmissions: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
});

// Index for faster queries
formSchema.index({ status: 1, createdAt: -1 });
formSchema.index({ 'fields.name': 1 });

// Validate unique field names within a form
formSchema.pre('save', function(next) {
  const fieldNames = this.fields.map(f => f.name);
  const uniqueNames = new Set(fieldNames);
  
  if (fieldNames.length !== uniqueNames.size) {
    return next(new Error('Field names must be unique within a form'));
  }
  
  next();
});

// Validate options for select/radio/checkbox fields
formSchema.pre('save', function(next) {
  for (const field of this.fields) {
    if (['select', 'radio', 'checkbox'].includes(field.type)) {
      if (!field.options || field.options.length === 0) {
        return next(new Error(`Field "${field.label}" requires at least one option`));
      }
    }
  }
  next();
});

// Method to create new version
formSchema.methods.createVersion = async function() {
  try {
    // Use the FormVersion model that was required at the top
    // If that doesn't work, try to get it from mongoose
    let FormVersion = FormVersionModel;
    if (!FormVersion) {
      try {
        FormVersion = mongoose.model('FormVersion');
      } catch (err) {
        // Last resort: require it again
        FormVersion = require('./FormVersion');
      }
    }
    
    await FormVersion.create({
      formId: this._id,
      version: this.version,
      title: this.title,
      description: this.description,
      fields: this.fields,
      settings: this.settings
    });
    this.version += 1;
    return this.save();
  } catch (error) {
    // If versioning fails, log but don't throw - allow form update to proceed
    console.warn('Form versioning error:', error.message);
    // Still increment version to avoid conflicts
    this.version += 1;
    return this.save();
  }
};

module.exports = mongoose.model('Form', formSchema);
