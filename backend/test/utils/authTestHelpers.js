// backend/test/utils/authTestHelpers.js
const jwt = require('jsonwebtoken');
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'TEST_ONLY_SECRET_change_me';

function signTestJwt(payload = {}, options = {}) {
  const {
    _id = payload.sub || 'test-user-id',
    role = 'owner',
    email = `${role}@example.com`,
    name = `${role.toUpperCase()} Tester`,
    ...rest
  } = payload;

  // 🔧 สำคัญ: ใส่ทั้ง id และ _id ให้ตรงกับที่ middleware ใช้
  const claims = {
    id: _id,          // <— เพิ่มบรรทัดนี้
    _id,              // เผื่อโค้ดส่วนอื่นใช้ _id
    sub: _id,
    role,
    email,
    name,
    ...rest,
  };

  const signOpts = {
    algorithm: 'HS256',
    expiresIn: options.expiresIn || '1h',
    issuer: options.issuer || 'pet-clinic-tests',
    audience: options.audience || 'pet-clinic-api',
  };

  return jwt.sign(claims, TEST_JWT_SECRET, signOpts);
}

function authHeader(token) { return { Authorization: `Bearer ${token}` }; }
function issueForRole(role = 'owner', override = {}, options = {}) {
  const _id = override._id || `u-${role}`;
  return signTestJwt({ _id, role, email: `${role}@example.com`, ...override }, options);
}
function verifyTestJwt(token) {
  return jwt.verify(token, TEST_JWT_SECRET, { algorithms: ['HS256'], issuer: 'pet-clinic-tests', audience: 'pet-clinic-api' });
}
module.exports = { signTestJwt, authHeader, issueForRole, verifyTestJwt };
