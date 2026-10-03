const express = require('express');
const db = require('../data/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const moviesRouter = express.Router();
const sessionsRouter = express.Router();

/**
 * GET /movies?genre=action&page=1&limit=2
 * Filter va pagination qo'llanadi
 * Pagination javobi: { "data": [...], "page": 1, "limit": 2, "total": 3, "totalPages": 2 }
 */
moviesRouter.get('/', (req, res) => {
  try {
    let { genre, page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    let filtered = db.movies;

    if (genre && typeof genre === 'string') {
      const cleanGenre = genre.trim().toLowerCase();
      filtered = filtered.filter(m => m.genre && m.genre.toLowerCase() === cleanGenre);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit);

    return res.json({
      data,
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * GET /movies/:id
 * Film ma'lumoti va uning seanslari, film topilmasa 404
 */
moviesRouter.get('/:id', (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    if (isNaN(movieId)) {
      return res.status(400).json({ error: "Yaroqsiz film ID si" });
    }

    const movie = db.movies.find(m => m.id === movieId);
    if (!movie) {
      return res.status(404).json({ error: "Film topilmadi" });
    }

    const movieSessions = db.sessions.filter(s => s.movieId === movie.id);

    return res.json({
      ...movie,
      sessions: movieSessions
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * POST /movies (Bonus: Admin roli)
 * Faqat role: "admin" bo'lgan userga ochiq, boshqalarga 403
 */
moviesRouter.post('/', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { title, genre, duration, description } = req.body;

    if (!title || !genre || !duration) {
      return res.status(400).json({ error: "Film nomi (title), janri (genre) va davomiyligi (duration) kiritilishi shart" });
    }

    const newMovie = {
      id: db.getNextMovieId(),
      title: String(title).trim(),
      genre: String(genre).trim().toLowerCase(),
      duration: parseInt(duration),
      description: description ? String(description).trim() : ''
    };

    db.movies.push(newMovie);

    return res.status(201).json({
      message: "Film muvaffaqiyatli qo'shildi",
      movie: newMovie
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * DELETE /movies/:id (Admin roli)
 * Filmni va unga tegishli barcha seanslar hamda bandlarni o'chirish
 */
moviesRouter.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    if (isNaN(movieId)) {
      return res.status(400).json({ error: "Yaroqsiz film ID si" });
    }

    const movieIndex = db.movies.findIndex(m => m.id === movieId);
    if (movieIndex === -1) {
      return res.status(404).json({ error: "Film topilmadi" });
    }

    const movie = db.movies[movieIndex];

    // Ushbu filmga tegishli barcha seanslar ID larini aniqlash
    const movieSessionIds = db.sessions.filter(s => s.movieId === movieId).map(s => s.id);

    // Seanslarga tegishli bandlarni o'chirish
    for (let i = db.bookings.length - 1; i >= 0; i--) {
      if (movieSessionIds.includes(db.bookings[i].sessionId)) {
        db.bookings.splice(i, 1);
      }
    }

    // Seanslarni o'chirish
    for (let i = db.sessions.length - 1; i >= 0; i--) {
      if (db.sessions[i].movieId === movieId) {
        db.sessions.splice(i, 1);
      }
    }

    // Filmni o'chirish
    db.movies.splice(movieIndex, 1);

    return res.json({
      message: `"${movie.title}" filmi va uning barcha seanslari muvaffaqiyatli o'chirildi`,
      deletedMovieId: movieId
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * GET /sessions
 * Barcha seanslar ro'yxati (filmi va bandlik holati bilan)
 */
sessionsRouter.get('/', (req, res) => {
  try {
    const list = db.sessions.map(s => {
      const movie = db.movies.find(m => m.id === s.movieId);
      const bookedCount = db.bookings.filter(b => b.sessionId === s.id).length;
      const totalSeats = s.rows * s.seatsPerRow;
      return {
        ...s,
        movieTitle: movie ? movie.title : 'Noma\'lum film',
        movieGenre: movie ? movie.genre : '',
        totalSeats,
        bookedCount,
        availableCount: totalSeats - bookedCount
      };
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * POST /sessions (Admin roli)
 * Yangi seans qo'shish
 */
sessionsRouter.post('/', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { movieId, time, hall, rows, seatsPerRow } = req.body;

    const mId = parseInt(movieId);
    const r = parseInt(rows) || 5;
    const s = parseInt(seatsPerRow) || 8;

    if (isNaN(mId) || !time || !hall) {
      return res.status(400).json({ error: "movieId, time va hall kiritilishi shart" });
    }

    const movie = db.movies.find(m => m.id === mId);
    if (!movie) {
      return res.status(404).json({ error: "Film topilmadi" });
    }

    const newSession = {
      id: db.getNextSessionId(),
      movieId: mId,
      time: String(time).trim(),
      hall: String(hall).trim().toUpperCase(),
      rows: r,
      seatsPerRow: s
    };

    db.sessions.push(newSession);

    return res.status(201).json({
      message: "Seans muvaffaqiyatli qo'shildi",
      session: {
        ...newSession,
        movieTitle: movie.title
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * DELETE /sessions/:id (Admin roli)
 * Seansni va uning band qilingan joylarini o'chirish
 */
sessionsRouter.delete('/:id', authMiddleware, requireAdmin, (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: "Yaroqsiz seans ID si" });
    }

    const sessionIndex = db.sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Seans topilmadi" });
    }

    // Seansdagi bandlarni o'chirish
    for (let i = db.bookings.length - 1; i >= 0; i--) {
      if (db.bookings[i].sessionId === sessionId) {
        db.bookings.splice(i, 1);
      }
    }

    db.sessions.splice(sessionIndex, 1);

    return res.json({
      message: "Seans va unga tegishli barcha bandlar muvaffaqiyatli o'chirildi",
      deletedSessionId: sessionId
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
});

/**
 * GET /sessions/:id/seats
 * Joylar xaritasi: har bir joyning taken: true/false holati
 * Bonus: ?format=map parametri bo'lsa ASCII xaritani ham qaytaradi
 */
const getSeatsHandler = (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: "Yaroqsiz seans ID si" });
    }

    const session = db.sessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ error: "Seans topilmadi" });
    }

    const sessionBookings = db.bookings.filter(b => b.sessionId === session.id);

    const seats = [];
    let bookedCount = 0;

    for (let r = 1; r <= session.rows; r++) {
      for (let s = 1; s <= session.seatsPerRow; s++) {
        const booking = sessionBookings.find(b => b.row === r && b.seat === s);
        const taken = !!booking;
        if (taken) bookedCount++;

        const seatObj = { row: r, seat: s, taken };
        if (taken && booking) {
          const user = db.users.find(u => u.id === booking.userId);
          seatObj.bookingId = booking.id;
          seatObj.bookedByName = user ? user.name : 'Noma\'lum';
          seatObj.bookedByEmail = user ? user.email : '';
        }

        seats.push(seatObj);
      }
    }

    // ASCII xarita yaratish (Bonus)
    let asciiMap = "========== [EKRAN] ==========\n";
    for (let r = 1; r <= session.rows; r++) {
      let rowStr = `Qator ${r.toString().padStart(2, ' ')}: `;
      for (let s = 1; s <= session.seatsPerRow; s++) {
        const isTaken = sessionBookings.some(b => b.row === r && b.seat === s);
        rowStr += isTaken ? '[X]' : '[ ]';
      }
      asciiMap += rowStr + "\n";
    }
    asciiMap += "Izoh: [ ] = bo'sh joy, [X] = band qilingan joy\n";

    if (req.query.format === 'map' && req.headers.accept && req.headers.accept.includes('text/plain')) {
      return res.type('text/plain').send(asciiMap);
    }

    return res.json({
      sessionId: session.id,
      movieId: session.movieId,
      time: session.time,
      hall: session.hall,
      rows: session.rows,
      seatsPerRow: session.seatsPerRow,
      totalSeats: session.rows * session.seatsPerRow,
      bookedCount,
      availableCount: (session.rows * session.seatsPerRow) - bookedCount,
      asciiMap,
      seats
    });
  } catch (error) {
    return res.status(500).json({ error: "Server xatosi: " + error.message });
  }
};

sessionsRouter.get('/:id/seats', getSeatsHandler);

module.exports = moviesRouter;
module.exports.moviesRouter = moviesRouter;
module.exports.sessionsRouter = sessionsRouter;
module.exports.getSeatsHandler = getSeatsHandler;
