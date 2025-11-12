const jwt = require('jsonwebtoken');

// Basic admin authentication middleware
exports.authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      });
    }

    // Support both Bearer token and simple token
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    // Simple token validation (replace with JWT or proper auth system)
    if (token === process.env.ADMIN_TOKEN) {
      req.user = { role: 'admin' };
      return next();
    }

    // JWT validation (optional, more secure approach)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional: Generate JWT token for admin
exports.generateToken = (userId, role = 'admin') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};
