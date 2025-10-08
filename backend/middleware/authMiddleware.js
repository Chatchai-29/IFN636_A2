// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Access denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // รองรับทั้ง id, _id, sub จาก token
    let userQ = User.findById(decoded.id || decoded._id || decoded.sub);
    if (userQ && typeof userQ.select === 'function') userQ = userQ.select('_id id email role name');
    const user = userQ && typeof userQ.lean === 'function' ? await userQ.lean() : await userQ;

    if (!user) return res.status(401).json({ message: 'Access denied' });

    // ใส่ทั้ง _id และ id ให้คอนโทรลเลอร์ทุกรูปแบบใช้ได้
    req.user = {
      _id: user._id ?? user.id,
      id: (user.id ?? String(user._id)),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    console.log('[protect] User authenticated:', {
      id: req.user.id, email: req.user.email, role: req.user.role,
    });
    next();
  } catch (err) {
    console.log('[protect] Token verification failed:', err.message);
    return res.status(401).json({ message: 'Access denied' });
  }
};
