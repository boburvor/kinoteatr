process.env.NODE_ENV = 'test';
const assert = require('assert');
const http = require('http');
const app = require('./src/index');
const db = require('./src/data/db');

let server;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- CineBook API Testlari Boshlanmoqda ---\n');

  // Serverni vaqtinchalik portda ishga tushirish
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Test server ishga tushdi: ${baseUrl}\n`);

  try {
    // 1. Root va Docs endpointlari
    const rootRes = await request('GET', '/');
    assert.strictEqual(rootRes.status, 200, "Root status 200 bo'lishi kerak");
    assert.strictEqual(rootRes.data.status, 'running');
    console.log('✅ GET / ishladi');

    // 2. Auth Testlari
    console.log('\n--- 1. Auth Testlari ---');
    // Register Ali
    const regAli = await request('POST', '/auth/register', {
      name: 'Ali Valiyev',
      email: 'ali@example.com',
      password: 'password123'
    });
    assert.strictEqual(regAli.status, 201, "Ali register 201 bo'lishi kerak");
    assert.strictEqual(regAli.data.user.email, 'ali@example.com');
    assert.strictEqual(regAli.data.user.password, undefined, "Parol qaytmasligi kerak");
    console.log('✅ Ali ro\'yxatdan o\'tdi (201)');

    // Duplicate email -> 409
    const regDup = await request('POST', '/auth/register', {
      name: 'Ali 2',
      email: 'ali@example.com',
      password: 'password123'
    });
    assert.strictEqual(regDup.status, 409, "Dublikat email 409 bo'lishi kerak");
    console.log('✅ Dublikat email 409 qaytardi');

    // Login Ali
    const loginAli = await request('POST', '/auth/login', {
      email: 'ali@example.com',
      password: 'password123'
    });
    assert.strictEqual(loginAli.status, 200, "Login 200 bo'lishi kerak");
    assert(loginAli.data.token, "Token qaytishi kerak");
    const aliToken = loginAli.data.token;
    console.log('✅ Ali login qildi (200, token olingan)');

    // Login xato parol -> 401
    const loginFail = await request('POST', '/auth/login', {
      email: 'ali@example.com',
      password: 'not_the_password'
    });
    assert.strictEqual(loginFail.status, 401, "Noto'g'ri parol 401 bo'lishi kerak");
    console.log('✅ Xato parol 401 qaytardi');

    // GET /auth/me Alining tokeni bilan
    const meAli = await request('GET', '/auth/me', null, aliToken);
    assert.strictEqual(meAli.status, 200);
    assert.strictEqual(meAli.data.email, 'ali@example.com');
    assert.strictEqual(meAli.data.password, undefined);
    console.log('✅ GET /auth/me Alining ma\'lumotlarini parolsiz qaytardi (200)');

    // GET /auth/me tokensiz -> 401
    const meNoToken = await request('GET', '/auth/me');
    assert.strictEqual(meNoToken.status, 401);
    console.log('✅ Tokensiz /auth/me 401 qaytardi');

    // 3. Filmlar va Seanslar Testlari
    console.log('\n--- 2. Filmlar va Seanslar Testlari ---');
    // GET /movies pagination & filter
    const moviesRes = await request('GET', '/movies?genre=action&page=1&limit=2');
    assert.strictEqual(moviesRes.status, 200);
    assert(Array.isArray(moviesRes.data.data));
    assert.strictEqual(moviesRes.data.page, 1);
    assert.strictEqual(moviesRes.data.limit, 2);
    assert(typeof moviesRes.data.total === 'number');
    assert(typeof moviesRes.data.totalPages === 'number');
    console.log('✅ GET /movies?genre=action&page=1&limit=2 to\'g\'ri pagination formatida qaytdi');

    // GET /movies/:id
    const movieRes = await request('GET', '/movies/2');
    assert.strictEqual(movieRes.status, 200);
    assert.strictEqual(movieRes.data.id, 2);
    assert(Array.isArray(movieRes.data.sessions));
    console.log('✅ GET /movies/2 film va uning seanslarini qaytardi (200)');

    // GET /movies/999 -> 404
    const movieNotFound = await request('GET', '/movies/999');
    assert.strictEqual(movieNotFound.status, 404);
    console.log('✅ Mavjud bo\'lmagan film 404 qaytardi');

    // GET /sessions/1/seats
    const seatsRes = await request('GET', '/sessions/1/seats');
    assert.strictEqual(seatsRes.status, 200);
    assert(Array.isArray(seatsRes.data.seats));
    console.log('✅ GET /sessions/1/seats joylar xaritasini qaytardi (200)');

    // 4. Asosiy Sinov Stsenariysi (Ali va Vali)
    console.log('\n--- 3. Sinov Stsenariysi (Ali & Vali) ---');
    // 1. Ali 1-seansda 3-qator 5-joyni band qiladi: 201
    const aliBooking = await request('POST', '/bookings', {
      sessionId: 1,
      row: 3,
      seat: 5
    }, aliToken);
    assert.strictEqual(aliBooking.status, 201, "Ali joyni band qilishi 201 bo'lishi kerak");
    const bookingId = aliBooking.data.booking.id;
    console.log('✅ 1. Ali 1-seansda 3-qator 5-joyni band qildi (201)');

    // 2. Vali ro'yxatdan o'tadi va login qiladi
    const regVali = await request('POST', '/auth/register', {
      name: 'Vali Aliyev',
      email: 'vali@example.com',
      password: 'password123'
    });
    assert.strictEqual(regVali.status, 201);
    const loginVali = await request('POST', '/auth/login', {
      email: 'vali@example.com',
      password: 'password123'
    });
    const valiToken = loginVali.data.token;
    console.log('✅ 2. Vali ro\'yxatdan o\'tdi va login qildi');

    // 3. Vali o'sha joyni band qilmoqchi bo'ladi: 409
    const valiBookingConflict = await request('POST', '/bookings', {
      sessionId: 1,
      row: 3,
      seat: 5
    }, valiToken);
    assert.strictEqual(valiBookingConflict.status, 409, "Band joyga 409 qaytishi kerak");
    assert.strictEqual(valiBookingConflict.data.error, "Bu joy band");
    console.log('✅ 3. Vali o\'sha joyni band qilmoqchi bo\'ldi -> 409 { "error": "Bu joy band" }');

    // 4. Vali Alining bandini o'chirmoqchi bo'ladi: 403
    const valiDeleteAli = await request('DELETE', `/bookings/${bookingId}`, null, valiToken);
    assert.strictEqual(valiDeleteAli.status, 403, "Birovning bandini o'chirish 403 bo'lishi kerak");
    console.log('✅ 4. Vali Alining bandini o\'chirmoqchi bo\'ldi -> 403');

    // 5. Ali o'z bandini o'chiradi, keyin Vali o'sha joyni band qiladi: 201
    const aliDeleteOwn = await request('DELETE', `/bookings/${bookingId}`, null, aliToken);
    assert.strictEqual(aliDeleteOwn.status, 200, "Ali o'z bandini o'chira olishi kerak (200)");
    console.log('✅ 5a. Ali o\'z bandini bekor qildi (200)');

    const valiBookingSuccess = await request('POST', '/bookings', {
      sessionId: 1,
      row: 3,
      seat: 5
    }, valiToken);
    assert.strictEqual(valiBookingSuccess.status, 201, "Vali endi bo'sh joyni band qilishi 201 bo'lishi kerak");
    console.log('✅ 5b. Vali bo\'shagan joyni muvaffaqiyatli band qildi (201)');

    // 6. /sessions/1/seats so'rovida o'sha joy taken: true bo'lib ko'rinadi
    const seatsCheck = await request('GET', '/sessions/1/seats');
    const targetSeat = seatsCheck.data.seats.find(s => s.row === 3 && s.seat === 5);
    assert(targetSeat, "3-qator 5-joy topilishi kerak");
    assert.strictEqual(targetSeat.taken, true, "Joy taken: true bo'lishi kerak");
    console.log('✅ 6. /sessions/1/seats da 3-qator 5-joy taken: true holatida ko\'rindi');

    // 5. Qoidalar va chegaralar testlari
    console.log('\n--- 4. Qoidalar va Chegaralar Testlari ---');
    // Zal chegarasidan tashqarida -> 400
    const outOfBounds = await request('POST', '/bookings', {
      sessionId: 1,
      row: 99,
      seat: 99
    }, valiToken);
    assert.strictEqual(outOfBounds.status, 400);
    console.log('✅ Zal chegarasidan tashqari o\'rindiq uchun 400 qaytdi');

    // Mavjud bo'lmagan seans -> 404
    const sessionNotFound = await request('POST', '/bookings', {
      sessionId: 9999,
      row: 1,
      seat: 1
    }, valiToken);
    assert.strictEqual(sessionNotFound.status, 404);
    console.log('✅ Mavjud bo\'lmagan seans uchun 404 qaytdi');

    // Bitta user bitta seansda 4 tadan ortiq joy band qila olmaydi, oshsa 400
    // Vali hozirda 1 ta joy band qilgan (row 3, seat 5)
    // 2-joy:
    await request('POST', '/bookings', { sessionId: 1, row: 1, seat: 1 }, valiToken);
    // 3-joy:
    await request('POST', '/bookings', { sessionId: 1, row: 1, seat: 2 }, valiToken);
    // 4-joy:
    await request('POST', '/bookings', { sessionId: 1, row: 1, seat: 3 }, valiToken);
    // 5-joy (oshdi) -> 400
    const limitExceeded = await request('POST', '/bookings', { sessionId: 1, row: 1, seat: 4 }, valiToken);
    assert.strictEqual(limitExceeded.status, 400);
    console.log('✅ 4 tadan ortiq joy band qilishga urinilganda 400 qaytdi');

    // GET /bookings/my
    const myBookings = await request('GET', '/bookings/my', null, valiToken);
    assert.strictEqual(myBookings.status, 200);
    assert.strictEqual(myBookings.data.length, 4);
    console.log('✅ GET /bookings/my faqat foydalanuvchining o\'ziga tegishli bandlarni qaytardi (4 ta)');

    console.log('\n🎉 BARCHA TESTLAR MUVAFFAQIYATLI O\'TDI! 🎉\n');
  } catch (err) {
    console.error('\n❌ Testda xatolik yuz berdi:', err);
    process.exit(1);
  } finally {
    server.close(() => {
      process.exit(0);
    });
  }
}

runTests();
