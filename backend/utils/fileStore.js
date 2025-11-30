const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'forms');

const ensureDir = async (dir) => {
  await fsp.mkdir(dir, { recursive: true });
};

const readJson = async (filePath) => {
  try {
    const data = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
};

const writeJson = async (filePath, data) => {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const removeDirRecursive = async (dir) => {
  await fsp.rm(dir, { recursive: true, force: true });
};

const generateId = () => `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

// Forms API
const formsRoot = uploadsRoot; // each form: uploads/forms/<formId>/form.json

async function listForms({ status, page = 1, limit = 10 } = {}) {
  await ensureDir(formsRoot);
  const items = await fsp.readdir(formsRoot, { withFileTypes: true });
  const forms = [];
  for (const dirent of items) {
    if (dirent.isDirectory()) {
      const formPath = path.join(formsRoot, dirent.name, 'form.json');
      const form = await readJson(formPath);
      if (form) forms.push(form);
    }
  }
  const filtered = status ? forms.filter(f => f.status === status) : forms;
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  return { data: filtered.slice(start, end), pagination: { total, page, pages: Math.ceil(total / limit) } };
}

async function getForm(id) {
  const form = await readJson(path.join(formsRoot, id, 'form.json'));
  return form;
}

async function createForm(payload) {
  const id = generateId();
  const now = new Date().toISOString();
  const form = {
    _id: id,
    title: payload.title,
    description: payload.description || '',
    fields: (payload.fields || []).map((f, idx) => ({
      _id: f._id || generateId(),
      label: f.label,
      type: f.type,
      name: f.name,
      required: !!f.required,
      options: f.options || [],
      validation: f.validation || {},
      order: typeof f.order === 'number' ? f.order : idx,
      conditionalFields: f.conditionalFields || [],
      showWhen: f.showWhen || undefined,
    })),
    status: payload.status || 'active',
    version: 1,
    settings: payload.settings || { submitButtonText: 'Submit', successMessage: 'Thank you for your submission!', allowMultipleSubmissions: true },
    createdBy: 'admin',
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(path.join(formsRoot, id, 'form.json'), form);
  return form;
}

async function updateForm(id, updates) {
  const existing = await getForm(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  // Merge fields: ensure _id on incoming fields
  const merged = { ...existing, ...updates, updatedAt: now };
  if (updates.fields) {
    merged.fields = updates.fields.map((f, idx) => ({
      _id: f._id || generateId(),
      label: f.label,
      type: f.type,
      name: f.name,
      required: !!f.required,
      options: f.options || [],
      validation: f.validation || {},
      order: typeof f.order === 'number' ? f.order : idx,
      conditionalFields: f.conditionalFields || [],
      showWhen: f.showWhen || undefined,
    }));
  }
  await writeJson(path.join(formsRoot, id, 'form.json'), merged);
  return merged;
}

async function deleteForm(id) {
  await removeDirRecursive(path.join(formsRoot, id));
}

async function reorderFields(id, fieldOrders) {
  const form = await getForm(id);
  if (!form) return null;
  form.fields.forEach((field) => {
    if (fieldOrders[field._id]) field.order = fieldOrders[field._id];
  });
  form.fields.sort((a, b) => a.order - b.order);
  form.updatedAt = new Date().toISOString();
  await writeJson(path.join(formsRoot, id, 'form.json'), form);
  return form;
}

// Submissions API
async function submissionsDir(formId) {
  const dir = path.join(formsRoot, formId, 'submissions');
  await ensureDir(dir);
  return dir;
}

async function createSubmission(formId, submission) {
  const id = generateId();
  const now = new Date().toISOString();
  const sub = {
    _id: id,
    formId,
    status: 'pending',
    answers: submission.answers,
    metadata: submission.metadata || { submittedAt: now },
    createdAt: now,
    updatedAt: now,
    formVersion: 1,
  };
  const dir = await submissionsDir(formId);
  await writeJson(path.join(dir, `${id}.json`), sub);
  return sub;
}

async function listSubmissions(formId, { status, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = {}) {
  const dir = await submissionsDir(formId);
  const files = await fsp.readdir(dir).catch(() => []);
  const rows = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const item = await readJson(path.join(dir, file));
    if (item) rows.push(item);
  }
  const filtered = status ? rows.filter(r => r.status === status) : rows;
  const sorted = filtered.sort((a, b) => {
    const va = new Date(a[sortBy] || a.metadata?.submittedAt || a.createdAt).getTime();
    const vb = new Date(b[sortBy] || b.metadata?.submittedAt || b.createdAt).getTime();
    return order === 'desc' ? vb - va : va - vb;
  });
  const total = sorted.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  return { data: sorted.slice(start, end), pagination: { total, page, pages: Math.ceil(total / limit) } };
}

async function getSubmission(formId, submissionId) {
  const dir = path.join(formsRoot, formId, 'submissions');
  const sub = await readJson(path.join(dir, `${submissionId}.json`));
  return sub;
}

async function updateSubmission(formId, submissionId, updates) {
  const sub = await getSubmission(formId, submissionId);
  if (!sub) return null;
  const merged = { ...sub, ...updates, updatedAt: new Date().toISOString() };
  const dir = await submissionsDir(formId);
  await writeJson(path.join(dir, `${submissionId}.json`), merged);
  return merged;
}

async function deleteSubmission(formId, submissionId) {
  const dir = path.join(formsRoot, formId, 'submissions');
  await fsp.rm(path.join(dir, `${submissionId}.json`), { force: true });
}

module.exports = {
  listForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  reorderFields,
  createSubmission,
  listSubmissions,
  getSubmission,
  updateSubmission,
  deleteSubmission,
  uploadsRoot,
};

