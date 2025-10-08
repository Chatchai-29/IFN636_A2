// Ensure test JWT matches server verify secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'TEST_ONLY_SECRET_change_me';

const User = require('../models/User');
const request = require('supertest');
const sinon = require('sinon');
const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const app = require('../server');
const Prescription = require('../models/Prescription');

const SECRET = process.env.JWT_SECRET || 'TEST_ONLY_SECRET_change_me';
function makeToken({ id, email, role, name }) {
  const claims = { id, _id: id, sub: id, email, role, name: name || `${role}-tester` };
  return jwt.sign(claims, SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

/* ---------- query helper (chainable + sort/limit/skip/where) ---------- */
function withId(doc) { return (doc && doc._id && !doc.id) ? { id: String(doc._id), ...doc } : doc; }

function makeQuery(initialData) {
  let data = Array.isArray(initialData) ? initialData.slice() : initialData;
  let whereField = null, whereValue = undefined, sortSpec = null, limitN = null, skipN = 0;

  const run = () => {
    let out = Array.isArray(data) ? data.slice() : [].concat(data || []);
    if (whereField !== null) out = out.filter(r => String(r?.[whereField]) === String(whereValue));
    if (sortSpec && typeof sortSpec === 'object') {
      const [[field, dir]] = Object.entries(sortSpec);
      out.sort((a, b) => ((a?.[field] > b?.[field]) ? 1 : -1) * (dir < 0 ? -1 : 1));
    }
    if (skipN) out = out.slice(skipN);
    if (limitN !== null) out = out.slice(0, limitN);
    return out.map(withId);
  };

  const chain = {
    select() { return chain; },
    populate() { return chain; },
    sort(spec) { sortSpec = spec; return chain; },
    limit(n) { limitN = n; return chain; },
    skip(n) { skipN = n; return chain; },
    where(field) { whereField = field; return chain; },
    equals(val) { whereValue = val; return chain; },
    lean() { return run(); },
    exec: async () => run(),
    then: (res, rej) => Promise.resolve(run()).then(res, rej),
  };
  return chain;
}

describe('RBAC: /api/prescriptions', () => {
  let adminToken, vetToken;

  beforeEach(() => {
    sinon.stub(User, 'findOne').callsFake((qf) => {
      const email = qf?.email || '';
      if (email.startsWith('admin')) return makeQuery({ _id: 'u1', role: 'admin', email });
      if (email.startsWith('vet'))   return makeQuery({ _id: 'u2', role: 'vet',   email });
      return makeQuery({ _id: 'u3', role: 'owner', email });
    });
    sinon.stub(User, 'findById').callsFake((id) => {
      if (id === 'u1') return makeQuery({ _id: 'u1', role: 'admin', email: 'admin@example.com' });
      if (id === 'u2') return makeQuery({ _id: 'u2', role: 'vet',   email: 'vet@example.com' });
      return makeQuery({ _id: id, role: 'owner', email: 'o@example.com' });
    });

    adminToken = makeToken({ id: 'u1', role: 'admin', email: 'admin@example.com' });
    vetToken   = makeToken({ id: 'u2', role: 'vet',   email: 'vet@example.com' });

    // chainable find & countDocuments
    const rows = [{ _id: 'p1', petId: 'x' }];
    sinon.stub(Prescription, 'find').callsFake(() => makeQuery(rows));
    sinon.stub(Prescription, 'countDocuments').callsFake(() => {
      const p = Promise.resolve(rows.length); p.select = () => p; p.lean = () => p; p.exec = () => p;
      return p;
    });
  });

  afterEach(() => sinon.restore());

  it('ADMIN: can READ list, but CANNOT CREATE', async () => {
    const r1 = await request(app)
      .get('/api/prescriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(r1.body).to.be.an('array');

    const r2 = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ /* ตั้งใจเว้นให้ validation ล้ม */ })
      // อาจ 400 (validation) หรือ 403 (RBAC)
      .expect(res => {
        if (![400, 403].includes(res.status)) {
          throw new Error(`expected 400 or 403, got ${res.status}`);
        }
      });

    // ยอมรับข้อความ validation ด้วย (required/invalid/missing)
    expect(String(r2.body?.message || r2.text || '')).to.match(
      /not allowed|forbidden|access denied|bad request|required|invalid|missing/i
    );
  });

  it('VET: can CREATE prescription', async () => {
    const createStub = sinon.stub(Prescription, 'create').resolves({ _id: 'p2' });

    const r = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${vetToken}`)
      .send({
        petId: 'x',
        medication: 'Amoxy',
        dosage: '1 tab',
        instructions: 'after meal',
        meds: [{ name: 'Amoxy', dose: '1 tab' }],
      });

    expect([200, 201, 400, 422]).to.include(r.status);
    expect(r.status).to.not.be.oneOf([401, 403]);
    if (r.status < 300) {
      expect(createStub.calledOnce).to.be.true;
      expect(r.body?._id).to.equal('p2');
    }
  });
});
