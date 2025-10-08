process.env.JWT_SECRET = process.env.JWT_SECRET || 'TEST_ONLY_SECRET_change_me';

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const app = require('../server');
const User = require('../models/User');
const { signTestJwt } = require('./utils/authTestHelpers');

const vet = signTestJwt({ _id: 'v1', role: 'vet', email: 'vet@example.com' });
const garbage = [
  '',
  'a'.repeat(10240),
  '<script>alert(1)</script>',
  JSON.stringify({ x: 1 }),
  '\u0000\u0001\u0002',
  '😀'.repeat(500)
];

describe('Fuzz: reason/diagnosis input', () => {
  beforeEach(() => {
    // Stub user lookups in auth middleware
    sinon.stub(User, 'findOne').callsFake(async () => ({ _id: 'v1', role: 'vet', email: 'vet@example.com' }));
    sinon.stub(User, 'findById').callsFake(async () => ({ _id: 'v1', role: 'vet', email: 'vet@example.com' }));
  });

  afterEach(() => sinon.restore());

  it('should not 500 on weird inputs', async () => {
    for (const reason of garbage) {
      const r = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${vet}`)
        .send({ petId: 'p1', date: '2025-10-10', time: '10:00', reason });

      expect([200, 201, 400, 401, 403, 404, 422]).to.include(r.status);
      expect((r.text || '').toLowerCase()).to.not.match(/stack|trace|sql/i);
    }
  });
});
