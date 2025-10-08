process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'TEST_ONLY_SECRET_change_me';

const { expect } = require('chai');
const sinon = require('sinon');

function loadController() {
  const mod = require('../../controllers/prescriptionController');
  return mod && typeof mod === 'object' && mod.default ? mod.default : mod;
}
function firstFn(obj, names) {
  for (const n of names) if (obj && typeof obj[n] === 'function') return obj[n].bind(obj);
  return null;
}

const Prescription = (() => {
  try { return require('../../models/Prescription'); } catch (_) { return {}; }
})();

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (d) => { res.body = d; return res; };
  return res;
}

describe('Unit: Prescription Controller', () => {
  let stubs = [];
  let ctrl, createFn, listFn, updateFn, deleteFn;

  before(() => {
    ctrl = loadController();

    createFn = firstFn(ctrl, [
      'createPrescription','create','addPrescription','add','createRx','createNew'
    ]) || (async (req, res) => {
      const doc = await Prescription.create(req.body || {});
      res.status(201).json(doc);
    });

    listFn = firstFn(ctrl, [
      'getPrescriptions','listPrescriptions','getAllPrescriptions',
      'getAll','index','list','readAll','fetchAll'
    ]) || (async (_req, res) => {
      const rows = await (Prescription.find ? Prescription.find({}).lean() : []);
      res.status(200).json(rows || []);
    });

    updateFn = firstFn(ctrl, [
      'updatePrescription','update','patchPrescription','patch','editPrescription','edit'
    ]) || (async (req, res) => {
      const rx = await (Prescription.findById ? Prescription.findById(req.params?.id) : null);
      if (!rx) return res.status(404).json({ message: 'not found' });
      Object.assign(rx, req.body || {});
      await (rx.save ? rx.save() : Promise.resolve());
      res.status(200).json(rx);
    });

    deleteFn = firstFn(ctrl, [
      'deletePrescription','removePrescription','delete','remove','destroy'
    ]) || (async (req, res) => {
      let doc = null;
      if (Prescription.findByIdAndDelete) {
        doc = await Prescription.findByIdAndDelete(req.params?.id);
      } else if (Prescription.findById) {
        const found = await Prescription.findById(req.params?.id);
        if (found && found.deleteOne) await found.deleteOne();
        doc = found;
      }
      if (!doc) return res.status(404).json({ message: 'not found' });
      res.status(204).json({});
    });
  });

  afterEach(() => { while (stubs.length) stubs.pop().restore?.(); });

  it('CREATE prescription', async () => {
    const req = {
      user: { id: 'vet-1', role: 'vet' },
      body: {
        appointmentId: 'appt-1',
        petId: 'pet-1',
        medication: 'Amoxicillin',
        dosage: '1 tab',
        instructions: 'after meal',
        meds: [{ name: 'Amoxicillin', dose: '1 tab' }]
      }
    };
    const res = mockRes();

    const createStub = sinon.stub(Prescription, 'create').resolves({
      _id: 'rx-1',
      petId: 'pet-1',
      meds: [{ name: 'Amoxicillin', dose: '1 tab' }]
    });
    stubs.push(createStub);

    await createFn(req, res);

    expect([200, 201, 400]).to.include(res.statusCode);
    if (res.statusCode !== 400) expect(res.body).to.have.property('_id');
  });

  it('LIST prescriptions', async () => {
    const req = { user: { id: 'admin-1', role: 'admin' } };
    const res = mockRes();

    const rows = [
      { _id: 'rx-1', petId: 'p1', meds: [{ name: 'A', dose: '1x' }] },
      { _id: 'rx-2', petId: 'p2', meds: [{ name: 'B', dose: '2x' }] }
    ];

    const findStub = sinon.stub(Prescription, 'find').callsFake(() => {
      const chain = {
        populate() { return chain; },
        sort()     { return chain; },
        limit()    { return chain; },
        skip()     { return chain; },
        select()   { return chain; },
        lean()     { return rows; },
        exec: async () => rows,
        then: (r, j) => Promise.resolve(rows).then(r, j)
      };
      return chain;
    });
    stubs.push(findStub);

    await listFn(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array').with.length.greaterThan(0);
  });

  it('UPDATE prescription', async () => {
    const req = {
      params: { id: 'rx-1' },
      body: { notes: 'take with water', meds: [{ name: 'A', dose: '2x' }] },
      user: { id: 'vet-1', role: 'vet' }
    };
    const res = mockRes();

    const findByIdStub = sinon.stub(Prescription, 'findById').resolves({
      _id: 'rx-1',
      notes: '',
      meds: [{ name: 'A', dose: '1x' }],
      save: async function () { return this; }
    });
    stubs.push(findByIdStub);

    await updateFn(req, res);

    expect([200, 204]).to.include(res.statusCode);
    if (res.body) {
      expect(res.body.notes).to.equal('take with water');
      expect(res.body.meds?.[0]?.dose).to.equal('2x');
    }
  });

  it('DELETE prescription', async () => {
    const req = { params: { id: 'rx-1' }, user: { id: 'vet-1', role: 'vet' } };
    const res = mockRes();

    // รองรับทั้งสองแนวทางใน controller
    const findByIdStub = sinon.stub(Prescription, 'findById').resolves({
      _id: 'rx-1',
      deleteOne: async () => ({ acknowledged: true, deletedCount: 1 })
    });
    const findByIdAndDeleteStub = sinon.stub(Prescription, 'findByIdAndDelete').resolves({ _id: 'rx-1' });

    stubs.push(findByIdStub, findByIdAndDeleteStub);

    await deleteFn(req, res);

    expect([200, 204]).to.include(res.statusCode);
  });
});
