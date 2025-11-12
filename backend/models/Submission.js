const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
    index: true
  },
  formVersion: {
    type: Number,
    required: true,
    default: 1
  },
  answers: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'archived'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for filtering and sorting
submissionSchema.index({ formId: 1, createdAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ 'metadata.submittedAt': -1 });

module.exports = mongoose.model('Submission', submissionSchema);
