const express = require('express');
const db = require('../data/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Barcha booking yo'nalishlari autentifikatsiyani talab qiladi
router.use(authMiddleware);

/**
 * POST /bookings
 * 🔒 { sessionId, row, seat }
 * Qoidalar:
 * - row yoki seat zal chegarasidan tashqarida bo'lsa 400
 * - Joy allaqachon band bo'lsa 409 { "error": "Bu joy band" }
 * - Seans topilmasa 404
 * - Bitta user bitta seansda 4 tadan ortiq joy band qila olmaydi, oshsa 400
 */
router.post('/', (req, res) => {
  try {
    const { sessionId, row, seat } = req.body;

    const sId = parseInt(sessionId);
    const r = parseInt(row);
    const s = parseInt(seat);

    if (isNaN(sId) || isNaN(r) || isNaN(s)) {
      return res.status(400).json({ error: "sessionId, row va seat raqam ko'rinishida kiritilishi shart" });
    }

    // 1. Seans topilmasa 404
    const session = db.sessions.find(item => item.id === sId);
    if (!session) {
      return res.status(404).json({ error: "Seans topilmadi" });
    }

    // 2. Zal chegarasi tekshiruvi: row yoki seat chegaradan tashqarida bo'lsa 400
    if (r < 1 || r > session.rows || s < 1 || s > session.seatsPerRow) {
      return res.status(400).json({
        error: `Qator yoki o'rindiq zal chegarasidan tashqarida. Zal o'lchami: ${session.rows} qator, har bir qatorda ${session.seatsPerRow} ta o'rindiq`
      });
    }

    // 3. Bitta user bitta seansda 4 tadan ortiq joy band qila olmaydi, oshsa 400
    const userBookingsInSession = db.bookings.filter(b => b.sessionId === sId && b.userId === req.user.id);
    if (userBookingsInSession.length >= 4) {
      return res.status(400).json({
        error: "Bitta user bitta seansda 4 tadan ortiq joy band qila olmaydi"
      });
    }

    // 4. Joy allaqachon band bo'lsa 409 { "error": "Bu joy band" }
    const alreadyBooked = db.bookings.find(b => b.sessionId === sId && b.row === r && b.seat === s);
    if (alreadyBooked) {
      return res.status(409).json({ error: "Bu joy band" });
    }

    // Joyni band qilish
    const newBooking = {
      id: db.getNextBookingId(),
      userId: req.user.id,
      sessionId: sId,
      row: r,
      seat: s,
      createdAt: new Date().toISOString()
    };

    db.bookings.push(newBooking);

    return res.status(201).json({
      message: "Joy muvaffaqiyatli band qilindi",
      booking: newBooking
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * GET /bookings/my
 * 🔒 faqat o'zimning bandlarim
 */
router.get('/my', (req, res) => {
  try {
    const myBookings = db.bookings.filter(b => b.userId === req.user.id);

    // Seans va film ma'lumotlari bilan boyitish
    const enriched = myBookings.map(b => {
      const session = db.sessions.find(s => s.id === b.sessionId);
      const movie = session ? db.movies.find(m => m.id === session.movieId) : null;
      return {
        ...b,
        session: session ? {
          id: session.id,
          time: session.time,
          hall: session.hall,
          movie: movie ? { id: movie.id, title: movie.title, genre: movie.genre } : null
        } : null
      };
    });

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * DELETE /bookings/:id
 * 🔒 bandni bekor qilish
 * Qoidalar:
 * - Seans/band topilmasa 404
 * - Birovning bandini o'chirmoqchi bo'lsa 403
 */
router.delete('/:id', (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Yaroqsiz band ID si" });
    }

    const bookingIndex = db.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) {
      return res.status(404).json({ error: "Band topilmadi" });
    }

    const booking = db.bookings[bookingIndex];

    // Birovning bandini o'chirmoqchi bo'lsa 403 (faqat o'zining bandini yoki admin o'chira oladi)
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Birovning bandini o'chirish taqiqlangan" });
    }

    db.bookings.splice(bookingIndex, 1);

    return res.json({
      message: "Band muvaffaqiyatli bekor qilindi",
      cancelledBookingId: bookingId
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

module.exports = router;
