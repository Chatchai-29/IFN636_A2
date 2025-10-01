const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect middleware: verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user to request (excluding password)
      // ⚠️ CRITICAL: Must include 'role' field for authorization
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Debug log to verify role is present
      console.log('[protect] User authenticated:', { 
        id: req.user._id, 
        email: req.user.email, 
        role: req.user.role 
      });
      
      next();
    } catch (error) {
      console.error('[protect] Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Role-based access control
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        console.log('[checkRole] Access denied:', {
          user: req.user.email,
          userRole: req.user.role,
          allowedRoles
        });
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      next();
    } catch (e) {
      next(e);
    }
  };
};

module.exports = { protect, checkRole };