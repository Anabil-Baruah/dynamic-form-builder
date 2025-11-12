const mongoose = require('mongoose');

// Store historical versions of forms
const formVersionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true
  },
  title: String,
  description: String,
  fields: mongoose.Schema.Types.Mixed,
  settings: mongoose.Schema.Types.Mixed,
  archivedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

formVersionSchema.index({ formId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('FormVersion', formVersionSchema);
