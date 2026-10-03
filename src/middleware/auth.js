const jwt = require('jsonwebtoken');
const db = require('../data/db');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Token taqdim etilmadi yoki formati noto'g'ri (Authorization: Bearer <token>)" });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'cinebook_default_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    const user = db.users.find(u => u.id === decoded.id || u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
    }

    // Parolsiz user ma'lumotlarini req.user ga biriktiramiz
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user'
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Yaroqsiz yoki muddati o'tgan token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: "Faqat adminlar uchun ruxsat berilgan" });
  }
  next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireAdmin = requireAdmin;
