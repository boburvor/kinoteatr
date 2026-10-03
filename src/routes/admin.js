const express = require('express');
const db = require('../data/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Barcha admin marshrutlari autentifikatsiya va admin rolini talab qiladi
router.use(authMiddleware, requireAdmin);

/**
 * GET /admin/stats
 * Kinoteatr bo'yicha umumiy statistik ko'rsatkichlar
 */
router.get('/stats', (req, res) => {
  try {
    const totalMovies = db.movies.length;
    const totalSessions = db.sessions.length;
    const totalBookings = db.bookings.length;
    const totalUsers = db.users.length;
    
    // 1 ta chipta narxi 50 000 so'm
    const ticketPrice = 50000;
    const totalRevenue = totalBookings * ticketPrice;

    // Zallardagi jami joylar sig'imi
    const totalCapacity = db.sessions.reduce((acc, s) => acc + (s.rows * s.seatsPerRow), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;

    return res.json({
      totalMovies,
      totalSessions,
      totalBookings,
      totalUsers,
      totalRevenue,
      totalCapacity,
      occupancyRate
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * GET /admin/bookings
 * Kinoteatrdagi barcha band qilingan chiptalar (to'liq foydalanuvchi va seans ma'lumotlari bilan)
 */
router.get('/bookings', (req, res) => {
  try {
    const enriched = db.bookings.map(b => {
      const user = db.users.find(u => u.id === b.userId);
      const session = db.sessions.find(s => s.id === b.sessionId);
      const movie = session ? db.movies.find(m => m.id === session.movieId) : null;

      return {
        id: b.id,
        row: b.row,
        seat: b.seat,
        createdAt: b.createdAt,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        } : null,
        session: session ? {
          id: session.id,
          time: session.time,
          hall: session.hall,
          rows: session.rows,
          seatsPerRow: session.seatsPerRow
        } : null,
        movie: movie ? {
          id: movie.id,
          title: movie.title,
          genre: movie.genre
        } : null
      };
    });

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * GET /admin/users
 * Barcha ro'yxatdan o'tgan foydalanuvchilar (parolsiz)
 */
router.get('/users', (req, res) => {
  try {
    const usersWithStats = db.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      bookingsCount: db.bookings.filter(b => b.userId === u.id).length
    }));

    return res.json(usersWithStats);
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * POST /admin/reset
 * Sinovlar uchun ma'lumotlar bazasini boshlang'ich holatga qaytarish
 */
router.post('/reset', (req, res) => {
  try {
    db.resetDb();
    return res.json({
      message: "Ma'lumotlar bazasi muvaffaqiyatli boshlang'ich holatga qaytarildi"
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

module.exports = router;
