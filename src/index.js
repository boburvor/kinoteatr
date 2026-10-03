require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const { setupSwagger } = require('./swagger');
const authRouter = require('./routes/auth');
const { moviesRouter, sessionsRouter } = require('./routes/movies');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');

const app = express();

// MongoDB ga ulanish
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger hujjatlari (faqat /api-docs manzilida ochiladi)
setupSwagger(app);

// Static fayllar (Frontend CSS, JS, rasmlar)
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Asosiy sahifa - Landing page (Frontend interfeysi)
app.get('/', (req, res) => {
  // Testlar yoki format=json yoki faqat JSON so'ralganda API ma'lumotlari qaytadi
  if (
    process.env.NODE_ENV === 'test' ||
    req.query.format === 'json' ||
    (req.headers.accept && req.headers.accept === 'application/json')
  ) {
    return res.json({
      name: 'CineBook API',
      description: "Kinoteatr joy band qilish tizimi backend'i",
      status: 'running',
      docs: '/api-docs',
      endpoints: {
        auth: ['POST /auth/register', 'POST /auth/login', 'GET /auth/me'],
        movies: ['GET /movies', 'GET /movies/:id', 'POST /movies (admin)'],
        sessions: ['GET /sessions/:id/seats'],
        bookings: ['POST /bookings', 'GET /bookings/my', 'DELETE /bookings/:id']
      }
    });
  }

  // Barcha brauzerlar va foydalanuvchilar uchun haqiqiy Landing Page ochiladi
  return res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Frontend to'g'ridan-to'g'ri marshrutlari
app.get(['/app', '/web'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Marshrutlar (Routes)
app.use('/auth', authRouter);
app.use('/movies', moviesRouter);
app.use('/sessions', sessionsRouter);
app.use('/bookings', bookingsRouter);
app.use('/admin', adminRouter);

// Mavjud bo'lmagan marshrutlar uchun 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint topilmadi. Hujjatlar bilan tanishish uchun /api-docs ga kiring." });
});

// Umumiy xatoliklarni ushlab qoluvchi middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: "Yaroqsiz JSON formati" });
  }
  console.error('Server xatosi:', err);
  res.status(500).json({ error: "Kutilmagan server xatosi yuz berdi" });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🎬 CineBook tizimi muvaffaqiyatli ishga tushdi!`);
    console.log(`🌐 Landing Page (Asosiy sahifa): http://localhost:${PORT}`);
    console.log(`📖 Swagger API Hujjatlari: http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
