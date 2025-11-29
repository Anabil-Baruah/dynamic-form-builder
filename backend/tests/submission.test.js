const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Form = require('../models/Form');
const Submission = require('../models/Submission');

describe('Submission API Tests', () => {
  let testFormId;
  // Admin authentication removed; tests now run without tokens

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/formbuilder-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    const formPayload = {
      title: 'Contact Form',
      status: 'active',
      fields: [
        {
          label: 'Full Name',
          type: 'text',
          name: 'full_name',
          required: true,
          order: 0,
          validation: {
            minLength: 2,
            maxLength: 100
          }
        },
        {
          label: 'Email',
          type: 'email',
          name: 'email',
          required: true,
          order: 1
        },
        {
          label: 'Age',
          type: 'number',
          name: 'age',
          required: false,
          order: 2,
          validation: {
            min: 18,
            max: 100
          }
        }
      ]
    };

    const res = await request(app)
      .post('/api/forms')
      .send(formPayload)
      .expect(201);
    testFormId = res.body.data._id;
  });

  afterEach(async () => {
    await Form.deleteMany({});
    await Submission.deleteMany({});
  });

  describe('POST /api/submissions/:id/submit', () => {
    it('should submit valid form data', async () => {
      const submissionData = {
        answers: {
          full_name: 'John Doe',
          email: 'john@example.com',
          age: 25
        }
      };

      const response = await request(app)
        .post(`/api/submissions/${testFormId}/submit`)
        .send(submissionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submissionId).toBeDefined();
    });

    it('should reject submission with missing required fields', async () => {
      const submissionData = {
        answers: {
          age: 25
        }
      };

      const response = await request(app)
        .post(`/api/submissions/${testFormId}/submit`)
        .send(submissionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const submissionData = {
        answers: {
          full_name: 'John Doe',
          email: 'invalid-email'
        }
      };

      const response = await request(app)
        .post(`/api/submissions/${testFormId}/submit`)
        .send(submissionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject number outside validation range', async () => {
      const submissionData = {
        answers: {
          full_name: 'John Doe',
          email: 'john@example.com',
          age: 150
        }
      };

      const response = await request(app)
        .post(`/api/submissions/${testFormId}/submit`)
        .send(submissionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject text shorter than minLength', async () => {
      const submissionData = {
        answers: {
          full_name: 'J',
          email: 'john@example.com'
        }
      };

      const response = await request(app)
        .post(`/api/submissions/${testFormId}/submit`)
        .send(submissionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/submissions/:formId', () => {
    it('should get all submissions for admin', async () => {
      // Create test submissions
      await Submission.create([
        {
          formId: testFormId,
          formVersion: 1,
          answers: { full_name: 'User 1', email: 'user1@test.com' }
        },
        {
          formId: testFormId,
          formVersion: 1,
          answers: { full_name: 'User 2', email: 'user2@test.com' }
        }
      ]);

      const response = await request(app)
        .get(`/api/submissions/${testFormId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should list submissions without authentication', async () => {
      const response = await request(app)
        .get(`/api/submissions/${testFormId}`)
        .expect(200);
      expect(response.body.success).toBe(true);
    });
  });
});
