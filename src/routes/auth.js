const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../data/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Bonus: Rate limit login uchun daqiqasiga 5 ta urinish
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 5,
  message: { error: "Juda ko'p urinish amalga oshirildi. Iltimos 1 daqiqadan so'ng qayta urinib ko'ring." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * POST /auth/register
 * { name, email, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Ism, email va parol kiritilishi shart" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();

    // Email formatini tekshirish
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Email formati noto'g'ri" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    }

    // Email bandligini tekshirish (409)
    const existingUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: "Email allaqachon ro'yxatdan o'tgan" });
    }

    // Parolni bcrypt bilan hash qilish
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: db.getNextUserId(),
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);

    return res.status(201).json({
      message: "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * POST /auth/login
 * { email, password }
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email va parol kiritilishi shart" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
    }

    const secret = process.env.JWT_SECRET || 'cinebook_default_jwt_secret_key_2026';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * GET /auth/me
 * 🔒 token talab qilinadi, joriy user qaytadi (parolsiz!)
 */
router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  });
});

module.exports = router;
