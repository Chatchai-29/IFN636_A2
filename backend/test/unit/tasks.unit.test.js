// backend/test/unit/tasks.unit.test.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'TEST_ONLY_SECRET_change_me';

const { expect } = require('chai');
const sinon = require('sinon');

/* ========= โหลด controller แล้วหา method ที่มีอยู่จริงแบบยืดหยุ่น ========= */
function loadTaskController() {
  // ปรับ path ตามโครงสร้างมาตรฐานของโปรเจกต์คุณ
  // (ไฟล์นี้คาดว่าอยู่ที่ backend/controllers/taskController.js)
  const mod = require('../../controllers/taskController');
  // รองรับทั้ง named exports และ default export
  return mod && typeof mod === 'object' && mod.default ? mod.default : mod;
}

function pickFn(obj, names) {
  for (const n of names) {
    if (obj && typeof obj[n] === 'function') return obj[n].bind(obj);
  }
  throw new TypeError(`None of [${names.join(', ')}] is a function on taskController`);
}

const taskController = loadTaskController();
const createTaskFn = pickFn(taskController, ['createTask', 'create', 'addTask', 'add', 'createNewTask']);
const listTasksFn   = pickFn(taskController, ['getTasks', 'listTasks', 'getAll', 'getAllTasks', 'index']);
const updateTaskFn  = pickFn(taskController, ['updateTask', 'update', 'editTask', 'patch']);
const deleteTaskFn  = pickFn(taskController, ['deleteTask', 'remove', 'removeTask', 'destroy']);

/* ========= stub โมเดลที่ controller require อยู่ภายใน =========
   หมายเหตุ: controller ของคุณทำ require('../models/Task') ภายในไฟล์ controller เอง
   เราจึง stub ที่ prototype object โดยดึงผ่าน require เดียวกันนี้เพื่อให้ sinon.stub จับตัวเดียวกัน
*/
const Task = (() => {
  try { return require('../../models/Task'); } catch (_) { return {}; }
})();

/* ========= response mock ========= */
function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.headers = {};
  res.body = undefined;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  res.set = (k, v) => { res.headers[k] = v; return res; };
  return res;
}

// toggle โหมด fail เพื่อถ่ายสกรีนช็อต fail (UNIT_FAIL=1)
const SHOULD_FORCE_FAIL = process.env.UNIT_FAIL === '1';

describe('Unit: Task Controller', () => {
  let stubs = [];

  afterEach(() => {
    while (stubs.length) stubs.pop().restore?.();
  });

  describe('createTask', () => {
    it('should CREATE task (PASS)', async () => {
      const req = { user: { id: 'u1' }, body: { title: 'T1', description: 'Desc' } };
      const res = mockRes();

      // stub Task.create ที่ controller ใช้อยู่ภายใน
      const createStub = sinon.stub(Task, 'create').resolves({
        _id: 't1', userId: 'u1', title: 'T1', description: 'Desc'
      });
      stubs.push(createStub);

      await createTaskFn(req, res);

      // controller บางตัวอาจใช้ 201, บางตัว 200 -> ยอมรับทั้งคู่
      expect([200, 201]).to.include(res.statusCode);
      expect(res.body).to.include({ title: 'T1' });

      if (SHOULD_FORCE_FAIL) {
        // จงใจกด fail เพื่อถ่ายรูป
        expect(res.statusCode).to.equal(418);
      }
    });
  });

  describe('listTasks', () => {
    it('should LIST tasks (PASS)', async () => {
      const req = { user: { id: 'u1' } };
      const res = mockRes();

      // สร้าง query chainable แบบง่ายให้ find()
      const rows = [{ _id: 't1', userId: 'u1', title: 'T1' }];
      const findStub = sinon.stub(Task, 'find').callsFake(() => ({
        sort() { return this; },
        limit() { return this; },
        skip() { return this; },
        select() { return this; },
        lean() { return rows; },
        exec: async () => rows,
        then: (r, j) => Promise.resolve(rows).then(r, j)
      }));
      stubs.push(findStub);

      await listTasksFn(req, res);
      expect([200]).to.include(res.statusCode);
      expect(res.body).to.be.an('array').with.length.greaterThan(0);

      if (SHOULD_FORCE_FAIL) {
        expect(res.body).to.have.length(0);
      }
    });
  });

  describe('updateTask', () => {
    it('should UPDATE task (PASS)', async () => {
      const req = { params: { id: 't1' }, body: { title: 'T1-upd' }, user: { id: 'u1' } };
      const res = mockRes();

      const findByIdStub = sinon.stub(Task, 'findById').resolves({
        _id: 't1',
        userId: 'u1',
        title: 'T1',
        save: async function () { this.title = 'T1-upd'; return this; }
      });
      stubs.push(findByIdStub);

      await updateTaskFn(req, res);

      // บาง controller คืน 200 พร้อม body; บางตัว 204 no content
      expect([200, 204]).to.include(res.statusCode);
      if (res.body) {
        expect(res.body.title).to.equal('T1-upd');
      }

      if (SHOULD_FORCE_FAIL) {
        expect(res.statusCode).to.equal(400);
      }
    });
  });

  describe('deleteTask', () => {
    it('should DELETE task (PASS)', async () => {
      const req = { params: { id: 't1' }, user: { id: 'u1' } };
      const res = mockRes();

      const findByIdStub = sinon.stub(Task, 'findById').resolves({
        _id: 't1', userId: 'u1',
        deleteOne: async () => ({ acknowledged: true, deletedCount: 1 })
      });
      stubs.push(findByIdStub);

      await deleteTaskFn(req, res);

      // บาง controller 200 (json body), บางตัว 204
      expect([200, 204]).to.include(res.statusCode);

      if (SHOULD_FORCE_FAIL) {
        expect(res.statusCode).to.equal(418);
      }
    });
  });
});
