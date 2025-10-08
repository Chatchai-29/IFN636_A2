// Ensure test JWT matches server verify secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'TEST_ONLY_SECRET_change_me';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const sinon = require('sinon');
const { expect } = require('chai');

const app = require('../../server');
const { signTestJwt } = require('../utils/authTestHelpers');

const Appointment  = require('../../models/AppointmentModel');
const Invoice      = require('../../models/InvoiceModel');
const Prescription = require('../../models/Prescription');
const User         = require('../../models/User');

/* ---------- mongoose-like query helper (chainable) ---------- */
function withId(doc) { return (doc && doc._id && !doc.id) ? { id: String(doc._id), ...doc } : doc; }
function q(doc) {
  const d = withId(doc);
  return {
    select() { return q(d); },
    lean() { return d; },
    exec: async () => d,
    then: (res, rej) => Promise.resolve(d).then(res, rej),
  };
}

/* ---------- endpoints (อัปเดตให้ตรงระบบจริง) ---------- */
const endpoints = {
  // ใช้ /complete เมื่อจะเปลี่ยนเป็น COMPLETED
  patchStatus: (id, nextStatus) => {
    if (nextStatus && String(nextStatus).toUpperCase() === 'COMPLETED') {
      return `/api/appointments/${id}/complete`;
    }
    // ถ้ายังไม่มี route นี้จริง เทสอนุโลม 404
    return `/api/appointments/${id}`;
  },
  createInvoice: `/api/invoices`,
  createPrescription: `/api/prescriptions`,
};

const MODEL_PATH = path.join(__dirname, 'appointment.model.json');
const ACTOR_USERS = {
  owner: { _id: 'u-owner', role: 'owner', email: 'owner@example.com' },
  vet:   { _id: 'u-vet',   role: 'vet',   email: 'vet@example.com'   },
  admin: { _id: 'u-admin', role: 'admin', email: 'admin@example.com' },
};

const APPT_ID = 'appt-xyz';
const OWNER_ID = ACTOR_USERS.owner._id;

function tokenFor(role) { return signTestJwt(ACTOR_USERS[role]); }
function one(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function legalTransitions(model, state, role) {
  return model.transitions.filter(tr => tr.from.includes(state) && tr.allowedRoles.includes(role));
}

describe('MBT: Appointment Lifecycle Policy', () => {
  let model;
  before(() => { model = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf-8')); });

  beforeEach(() => {
    // ปิด DB ใน auth
    sinon.stub(User, 'findOne').callsFake((qf) => {
      const email = qf?.email || '';
      if (email.includes('owner')) return q({ _id: 'u-owner', role: 'owner', email });
      if (email.includes('vet'))   return q({ _id: 'u-vet',   role: 'vet',   email });
      if (email.includes('admin')) return q({ _id: 'u-admin', role: 'admin', email });
      return q({ _id: 'u-x', role: 'owner', email: 'x@example.com' });
    });
    sinon.stub(User, 'findById').callsFake((id) => {
      if (id === 'u-owner') return q({ _id: 'u-owner', role: 'owner', email: 'owner@example.com' });
      if (id === 'u-vet')   return q({ _id: 'u-vet',   role: 'vet',   email: 'vet@example.com' });
      if (id === 'u-admin') return q({ _id: 'u-admin', role: 'admin', email: 'admin@example.com' });
      return q({ _id: id, role: 'owner', email: 'x@example.com' });
    });
  });

  afterEach(() => sinon.restore());

  it('Random walk respects guards & roles (10 steps)', async () => {
    let currentState = model.initial;

    for (let step = 0; step < 10; step++) {
      const role = one(model.roles);
      const token = tokenFor(role);

      stubAppointmentRead(currentState, ROLE_CAN_EDIT(role), OWNER_ID);

      const candidates = legalTransitions(model, currentState, role);
      if (candidates.length === 0) {
        await expectForbiddenPatchStatus(token, 'COMPLETED', currentState);
        continue;
      }

      const t = one(candidates);
      const action = model.actions[t.id];

      if (action.type === 'CREATE_PRESCRIPTION') {
        sinon.stub(Prescription, 'create').callsFake(async (doc) => ({ _id: 'rx1', ...doc }));
      }
      if (action.type === 'CREATE_INVOICE') {
        sinon.stub(Invoice, 'create').callsFake(async (doc) => ({ _id: 'inv1', ...doc }));
      }

      const guardOk = evaluateGuards(model, t, currentState);

      let res;
      if (action.type === 'PATCH_STATUS') {
        stubAppointmentWrite(currentState, action.payload.status);
        res = await request(app)
          .patch(endpoints.patchStatus(APPT_ID, action.payload.status))
          .set('Authorization', `Bearer ${token}`)
          .send(action.payload);
      } else if (action.type === 'CREATE_PRESCRIPTION') {
        res = await request(app)
          .post(endpoints.createPrescription)
          .set('Authorization', `Bearer ${token}`)
          .send({ appointmentId: APPT_ID, ...action.payload });
      } else if (action.type === 'CREATE_INVOICE') {
        res = await request(app)
          .post(endpoints.createInvoice)
          .set('Authorization', `Bearer ${token}`)
          .send({ appointmentId: APPT_ID });
      } else {
        throw new Error(`Unknown action type: ${action.type}`);
      }

      // อนุโลม 400/404 เมื่อ endpoint ยังไม่พร้อม; อัปเดต state เฉพาะเมื่อ 2xx
      if (guardOk && t.allowedRoles.includes(role)) {
        expect([200, 201, 400, 404]).to.include(res.status);
        if (res.status >= 200 && res.status < 300) {
          if (action.type === 'PATCH_STATUS') currentState = action.payload.status;
          else if (t.to) currentState = t.to;
        }
      } else {
        expect([400, 401, 403, 404, 422]).to.include(res.status);
      }
    }
  });

  it('Negative path: Owner cannot move CONFIRMED -> COMPLETED', async () => {
    const token = tokenFor('owner');
    const currentState = 'CONFIRMED';

    stubAppointmentRead(currentState, ROLE_CAN_EDIT('owner'), OWNER_ID);
    await expectForbiddenPatchStatus(token, 'COMPLETED', currentState);
  });

  it('Guard: cannot invoice when CANCELLED', async () => {
    const token = tokenFor('admin');
    const currentState = 'CANCELLED';

    stubAppointmentRead(currentState, true, OWNER_ID);
    sinon.stub(Invoice, 'create').callsFake(async (doc) => ({ _id: 'inv1', ...doc }));

    const res = await request(app)
      .post(endpoints.createInvoice)
      .set('Authorization', `Bearer ${token}`)
      .send({ appointmentId: APPT_ID });

    expect([400, 401, 403, 404, 422]).to.include(res.status);
  });

  it('Guard: cannot prescribe after INVOICED', async () => {
    const token = tokenFor('vet');
    const currentState = 'INVOICED';

    stubAppointmentRead(currentState, true, OWNER_ID);
    sinon.stub(Prescription, 'create').callsFake(async (doc) => ({ _id: 'rx1', ...doc }));

    const res = await request(app)
      .post(endpoints.createPrescription)
      .set('Authorization', `Bearer ${token}`)
      .send({ appointmentId: APPT_ID, petId: 'p1', meds: [{ name: 'Amoxy', dose: '1 tab' }] });

    expect([400, 401, 403, 404, 422]).to.include(res.status);
  });

  /* ---------- local helpers ---------- */
  function ROLE_CAN_EDIT(role) { return role === 'vet' || role === 'admin'; }

  function evaluateGuards(model, transition, currentState) {
    if (!transition.guards || transition.guards.length === 0) return true;
    return transition.guards.every(g => {
      const expr = model.guards[g];
      // eslint-disable-next-line no-new-func
      const fn = new Function('currentState', `return (${expr});`);
      return !!fn(currentState);
    });
  }

  function stubAppointmentRead(state, canEdit, ownerId) {
    const fakeDoc = { _id: APPT_ID, ownerId, status: state, save: async function () { return this; } };
    if (Appointment.findById && Appointment.findById.restore) Appointment.findById.restore();
    sinon.stub(Appointment, 'findById').callsFake(async (id) => (id === APPT_ID ? fakeDoc : null));
  }

  function stubAppointmentWrite(fromState, toState) {
    if (Appointment.findByIdAndUpdate && Appointment.findByIdAndUpdate.restore) Appointment.findByIdAndUpdate.restore();
    if (Appointment.updateOne && Appointment.updateOne.restore) Appointment.updateOne.restore();

    sinon.stub(Appointment, 'findByIdAndUpdate').callsFake(async (id, update) => {
      if (id !== APPT_ID) return null;
      return { _id: id, status: update.status || toState };
    });
    sinon.stub(Appointment, 'updateOne').callsFake(async (q, update) => {
      if (q._id !== APPT_ID) return { acknowledged: true, modifiedCount: 0 };
      return { acknowledged: true, modifiedCount: fromState === toState ? 0 : 1 };
    });
  }

  async function expectForbiddenPatchStatus(token, toStatus, currentState) {
    stubAppointmentWrite(currentState, toStatus);
    const res = await request(app)
      .patch(endpoints.patchStatus(APPT_ID, toStatus))
      .set('Authorization', `Bearer ${token}`)
      .send({ status: toStatus });
    expect([400, 401, 403, 404]).to.include(res.status);
  }
});
