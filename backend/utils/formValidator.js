/**
 * Validate form submission answers against form field definitions
 */
class FormValidator {
  constructor(form, answers) {
    this.form = form;
    this.answers = answers;
    this.errors = [];
  }

  validate() {
    this.errors = [];

    for (const field of this.form.fields) {
      this.validateField(field);
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors
    };
  }

  validateField(field) {
    const value = this.answers[field.name];

    // Check required fields
    if (field.required && this.isEmpty(value)) {
      this.addError(field.name, `${field.label} is required`);
      return;
    }

    // Skip validation if field is empty and not required
    if (this.isEmpty(value)) {
      return;
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        this.validateEmail(field, value);
        break;
      case 'number':
        this.validateNumber(field, value);
        break;
      case 'text':
      case 'textarea':
        this.validateText(field, value);
        break;
      case 'date':
        this.validateDate(field, value);
        break;
      case 'checkbox':
        this.validateCheckbox(field, value);
        break;
      case 'radio':
      case 'select':
        this.validateOption(field, value);
        break;
      case 'file':
        this.validateFile(field, value);
        break;
    }
  }

  validateEmail(field, value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      this.addError(field.name, `${field.label} must be a valid email address`);
    }
  }

  validateNumber(field, value) {
    const num = Number(value);
    if (isNaN(num)) {
      this.addError(field.name, `${field.label} must be a valid number`);
      return;
    }

    if (field.validation) {
      if (field.validation.min !== undefined && num < field.validation.min) {
        this.addError(field.name, `${field.label} must be at least ${field.validation.min}`);
      }
      if (field.validation.max !== undefined && num > field.validation.max) {
        this.addError(field.name, `${field.label} must be at most ${field.validation.max}`);
      }
    }
  }

  validateText(field, value) {
    if (typeof value !== 'string') {
      this.addError(field.name, `${field.label} must be text`);
      return;
    }

    if (field.validation) {
      if (field.validation.minLength && value.length < field.validation.minLength) {
        this.addError(field.name, `${field.label} must be at least ${field.validation.minLength} characters`);
      }
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        this.addError(field.name, `${field.label} must be at most ${field.validation.maxLength} characters`);
      }
      if (field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          const message = field.validation.customMessage || `${field.label} format is invalid`;
          this.addError(field.name, message);
        }
      }
    }
  }

  validateDate(field, value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      this.addError(field.name, `${field.label} must be a valid date`);
      return;
    }

    if (field.validation && field.validation.minDate) {
      const min = new Date(field.validation.minDate);
      if (!isNaN(min.getTime()) && date < min) {
        this.addError(field.name, `${field.label} must be on or after ${min.toISOString().slice(0, 10)}`);
      }
    }
  }

  validateCheckbox(field, value) {
    if (!Array.isArray(value)) {
      this.addError(field.name, `${field.label} must be an array of values`);
      return;
    }

    if (field.options && field.options.length > 0) {
      const invalidOptions = value.filter(v => !field.options.includes(v));
      if (invalidOptions.length > 0) {
        this.addError(field.name, `${field.label} contains invalid options`);
      }
    }
  }

  validateOption(field, value) {
    if (field.options && field.options.length > 0) {
      if (!field.options.includes(value)) {
        this.addError(field.name, `${field.label} must be one of the provided options`);
      }
    }
  }

  validateFile(field, value) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        this.addError(field.name, `${field.label} must include at least one file`);
      }
      value.forEach((file) => this.validateFile(field, file));
      return;
    }

    if (typeof value !== 'object' || value === null) {
      this.addError(field.name, `${field.label} must be a file`);
      return;
    }

    if (!value.path || !value.originalName) {
      this.addError(field.name, `${field.label} file metadata is missing`);
    }
  }

  isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  addError(field, message) {
    this.errors.push({ field, message });
  }
}

module.exports = FormValidator;
