const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Form = require('../models/Form');

describe('Form API Tests', () => {
  const adminToken = process.env.ADMIN_TOKEN || 'test-admin-token';

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/formbuilder-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up test data
    await Form.deleteMany({});
  });

  describe('POST /api/forms', () => {
    it('should create a new form with valid data', async () => {
      const formData = {
        title: 'Test Form',
        description: 'A test form',
        fields: [
          {
            label: 'Name',
            type: 'text',
            name: 'name',
            required: true,
            order: 0
          }
        ]
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(formData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Form');
      expect(response.body.data.fields).toHaveLength(1);
    });

    it('should reject form without title', async () => {
      const formData = {
        description: 'No title form'
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(formData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unauthorized requests', async () => {
      const formData = {
        title: 'Test Form'
      };

      await request(app)
        .post('/api/forms')
        .send(formData)
        .expect(401);
    });
  });

  describe('GET /api/forms/:id', () => {
    it('should get form by id', async () => {
      const form = await Form.create({
        title: 'Test Form',
        fields: [
          {
            label: 'Email',
            type: 'email',
            name: 'email',
            required: true,
            order: 0
          }
        ]
      });

      const response = await request(app)
        .get(`/api/forms/${form._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Form');
    });

    it('should return 404 for non-existent form', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/forms/${fakeId}`)
        .expect(404);
    });
  });

  describe('PUT /api/forms/:id', () => {
    it('should update form', async () => {
      const form = await Form.create({
        title: 'Original Title',
        fields: []
      });

      const response = await request(app)
        .put(`/api/forms/${form._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.data.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/forms/:id', () => {
    it('should delete form', async () => {
      const form = await Form.create({
        title: 'To Delete',
        fields: []
      });

      await request(app)
        .delete(`/api/forms/${form._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deletedForm = await Form.findById(form._id);
      expect(deletedForm).toBeNull();
    });
  });
});
