const bcrypt = require('bcryptjs');

// Seed ma'lumotlari
const initialAdminPasswordHash = bcrypt.hashSync('Admin123!', 10);

const initialUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@cinebook.uz',
    password: initialAdminPasswordHash,
    role: 'admin',
    createdAt: new Date().toISOString()
  }
];

const initialMovies = [
  {
    id: 1,
    title: 'Inception',
    genre: 'sci-fi',
    duration: 148,
    description: "Dominic Cobb tushlar orqali odamlarning maxfiy sirlarini o'g'irlaydigan mohir o'g'ri."
  },
  {
    id: 2,
    title: 'The Dark Knight',
    genre: 'action',
    duration: 152,
    description: "Betmen Gotem shahrini dahshatga solayotgan Jokerga qarshi kurashadi."
  },
  {
    id: 3,
    title: 'Interstellar',
    genre: 'sci-fi',
    duration: 169,
    description: "Insoniyatni saqlab qolish uchun koinot bo'ylab yangi sayyora qidiruvi."
  },
  {
    id: 4,
    title: 'Gladiator II',
    genre: 'action',
    duration: 148,
    description: "Rim imperiyasidagi shon-sharaf, qasos va janglar haqidagi afsonaviy davom."
  }
];

const initialSessions = [
  {
    id: 1,
    movieId: 2,
    time: '2026-10-01T18:00',
    hall: 'A',
    rows: 5,
    seatsPerRow: 8
  },
  {
    id: 2,
    movieId: 2,
    time: '2026-10-01T21:00',
    hall: 'A',
    rows: 5,
    seatsPerRow: 8
  },
  {
    id: 3,
    movieId: 1,
    time: '2026-10-02T17:00',
    hall: 'B',
    rows: 6,
    seatsPerRow: 10
  },
  {
    id: 4,
    movieId: 3,
    time: '2026-10-02T20:30',
    hall: 'IMAX',
    rows: 8,
    seatsPerRow: 12
  },
  {
    id: 5,
    movieId: 4,
    time: '2026-10-03T19:30',
    hall: 'C',
    rows: 5,
    seatsPerRow: 8
  }
];

let users = JSON.parse(JSON.stringify(initialUsers));
let movies = JSON.parse(JSON.stringify(initialMovies));
let sessions = JSON.parse(JSON.stringify(initialSessions));
let bookings = [];

let nextUserId = 2;
let nextMovieId = 5;
let nextSessionId = 6;
let nextBookingId = 1;

function resetDb() {
  users.length = 0;
  users.push(...JSON.parse(JSON.stringify(initialUsers)));
  movies.length = 0;
  movies.push(...JSON.parse(JSON.stringify(initialMovies)));
  sessions.length = 0;
  sessions.push(...JSON.parse(JSON.stringify(initialSessions)));
  bookings.length = 0;
  nextUserId = 2;
  nextMovieId = 5;
  nextSessionId = 6;
  nextBookingId = 1;
}

module.exports = {
  users,
  movies,
  sessions,
  bookings,
  getNextUserId: () => nextUserId++,
  getNextMovieId: () => nextMovieId++,
  getNextSessionId: () => nextSessionId++,
  getNextBookingId: () => nextBookingId++,
  resetDb
};
