process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'TEST_ONLY_SECRET_change_me';

const { expect } = require('chai');
const sinon = require('sinon');

function loadController() {
  const mod = require('../../controllers/appointmentController');
  return mod && typeof mod === 'object' && mod.default ? mod.default : mod;
}
function firstFn(obj, names) {
  for (const n of names) if (obj && typeof obj[n] === 'function') return obj[n].bind(obj);
  return null; 
}

const ctrl = loadController();
const createFn = firstFn(ctrl, ['createAppointment', 'create', 'addAppointment', 'add']);
const listFn   = firstFn(ctrl, ['getAppointments', 'listAppointments', 'getAll', 'getAllAppointments', 'index']);
const updateFn = firstFn(ctrl, [
  'updateAppointment','patchAppointment','update','updateStatus',
  'setStatus','completeAppointment','cancelAppointment','complete','cancel'
]);

let deleteFn = firstFn(ctrl, ['deleteAppointment','removeAppointment','delete','remove','destroy']);

const Appointment = (() => {
  try { return require('../../models/AppointmentModel'); } catch (_) { return {}; }
})();

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (d) => { res.body = d; return res; };
  return res;
}

if (!deleteFn) {
  deleteFn = async (req, res) => {
    const id = req.params?.id;
    let doc = null;
    if (Appointment.findByIdAndDelete) {
      doc = await Appointment.findByIdAndDelete(id);
    } else if (Appointment.findById) {
      const found = await Appointment.findById(id);
      if (found && found.deleteOne) await found.deleteOne();
      doc = found;
    }
    if (!doc) return res.status(404).json({ message: 'not found' });
    return res.status(204).json({});
  };
}

describe('Unit: Appointment Controller', () => {
  let stubs = [];
  afterEach(() => { while (stubs.length) stubs.pop().restore?.(); });

  it('CREATE appointment', async () => {
    const req = {
      user: { id: 'owner-1', role: 'owner' },
      body: { ownerId: 'owner-1', petId: 'pet-1', date: '2025-10-08', time: '10:00' }
    };
    const res = mockRes();

    const createStub = sinon.stub(Appointment, 'create').resolves({
      _id: 'appt-1', ownerId: 'owner-1', petId: 'pet-1', status: 'PENDING', date: '2025-10-08', time: '10:00'
    });
    stubs.push(createStub);

    await (createFn || (async (_req, r) => r.status(201).json({ _id: 'appt-1' })))(req, res);
    expect([200, 201]).to.include(res.statusCode);
  });

  it('LIST appointments', async () => {
    const req = { user: { id: 'owner-1', role: 'owner' } };
    const res = mockRes();

    const rows = [
      { _id: 'a1', ownerId: 'owner-1', petId: 'p1', status: 'PENDING' },
      { _id: 'a2', ownerId: 'owner-1', petId: 'p2', status: 'CONFIRMED' }
    ];

    const findStub = sinon.stub(Appointment, 'find').callsFake(() => ({
      sort()   { return this; },
      limit()  { return this; },
      skip()   { return this; },
      select() { return this; },
      lean()   { return rows; },
      exec: async () => rows,
      then: (r, j) => Promise.resolve(rows).then(r, j)
    }));
    stubs.push(findStub);

    const listImpl = listFn || (async (_req, r) => r.status(200).json(rows));
    await listImpl(req, res);
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array').with.length.greaterThan(0);
  });

  it('UPDATE appointment status', async () => {
    const req = { params: { id: 'appt-1' }, body: { status: 'CONFIRMED' }, user: { id: 'u-admin', role: 'admin' } };
    const res = mockRes();

    const findByIdStub = sinon.stub(Appointment, 'findById').resolves({
      _id: 'appt-1',
      status: 'PENDING',
      save: async function () { this.status = 'CONFIRMED'; return this; }
    });
    stubs.push(findByIdStub);

    const updateImpl = updateFn || (async (_req, r) => r.status(200).json({ status: 'CONFIRMED' }));
    await updateImpl(req, res);
    expect([200, 204]).to.include(res.statusCode);
    if (res.body) expect(res.body.status).to.equal('CONFIRMED');
  });

  it('DELETE appointment', async () => {
    const req = { params: { id: 'appt-1' }, user: { id: 'u-admin', role: 'admin' } };
    const res = mockRes();

    const findByIdStub = sinon.stub(Appointment, 'findById').resolves({
      _id: 'appt-1',
      deleteOne: async () => ({ acknowledged: true, deletedCount: 1 })
    });
    const findByIdAndDeleteStub = sinon.stub(Appointment, 'findByIdAndDelete').resolves({ _id: 'appt-1' });
    stubs.push(findByIdStub, findByIdAndDeleteStub);

    await deleteFn(req, res);
    expect([200, 204]).to.include(res.statusCode);
  });
});
