# 🎬 CineBook API (Kinoteatr joy band qilish backend'i)

CineBook — kinoteatrlar uchun o'rindiqlarni band qilish, filmlar va seanslar jadvalini ko'rish imkonini beruvchi RESTful backend API.

---

## 🚀 Texnologiyalar
- **Node.js** & **Express.js**
- **JWT (jsonwebtoken)** — xavfsiz autentifikatsiya
- **bcryptjs** — parollarni xesh qilish
- **Swagger UI (`swagger-ui-express`)** — interaktiv API hujjatlari
- **express-rate-limit** — rate limiting (login urinishlarini cheklash)

---

## 📁 Loyiha Tuzilmasi

```text
kinoteatr/
├── src/
│   ├── data/
│   │   └── db.js            # In-memory ma'lumotlar va seed data
│   ├── middleware/
│   │   └── auth.js          # JWT middleware va admin tekshiruvi
│   ├── routes/
│   │   ├── auth.js          # /auth/register, /auth/login, /auth/me
│   │   ├── movies.js        # /movies, /movies/:id, /sessions/:id/seats
│   │   └── bookings.js      # /bookings, /bookings/my, /bookings/:id
│   ├── index.js             # Express app & server sozlamalari
│   └── swagger.js           # OpenAPI 3.0 hujjatlari & bearerAuth
├── .env                     # Muhit o'zgaruvchilari (maxfiy)
├── .env.example             # Muhit o'zgaruvchilari namunasi
├── package.json             # Loyiha sozlamalari va skriptlar
├── test.js                  # Avtomatik integratsiya testlari
└── README.md                # Loyiha qo'llanmasi
```

---

## ⚙️ O'rnatish va Ishga Tushirish

### 1. Bog'liqliklarni o'rnatish:
```bash
npm install
```

### 2. Muhit o'zgaruvchilarini sozlash:
`.env.example` faylidan nusxa olib `.env` yarating:
```env
PORT=5000
JWT_SECRET=super_secret_cinebook_jwt_key_2026_top_secure
```

### 3. Serverni ishga tushirish:
```bash
npm start
```
Server `http://localhost:5000` manzilida ishga tushadi.

### 4. Testlarni ishga tushirish:
```bash
npm test
```

---

## 🎨 Web Frontend (Foydalanuvchi Interfeysi)

Server ishga tushgach, brauzerda to'g'ridan-to'g'ri quyidagi manzilga kiring:
👉 **[http://localhost:5000](http://localhost:5000)** (yoki `http://localhost:5000/app`)

### ✨ Frontend Xususiyatlari:
1. **🎬 Filmlar katalogi & qidiruv**:
   - Janr bo'yicha tezkor filterlar (*Barchasi*, *Action*, *Sci-Fi*) va real-vaqtda qidiruv qatori.
   - Har bir film uchun davomiyligi, janri, seanslari va qisqacha tavsifi ko'rsatiladi.
2. **🪑 Jonli zal xaritasi & joy tanlash**:
   - Kinoteatr ekrani vizualizatsiyasi va zaldagi o'rindiqlar to'ri.
   - Bo'sh (yashil/ko'k nur), band qilingan (qizil/yopiq) va tanlangan (sariq nur) holatlar.
   - Bitta seans uchun 4 ta joy cheklovini avtomatik nazorat qilish.
3. **🎟️ "Mening Chiptalarim" bo'limi**:
   - Haqiqiy kinoteatr chiptasi dizaynidagi kartochkalar (perforatsiya, shtrix-kod, zal, seans va qator/o'rindiq ko'rinishi).
   - Chiptani 1 ta tugma bilan bekor qilish va joyni darhol bo'shatish.
4. **⚡ Tezkor Test rejimi (1-bosishda kirish)**:
   - Header'dagi **"⚡ Tezkor Test"** tugmasi orqali **Ali**, **Vali** yoki **Admin** hisobiga parol yozmasdan 1 bosishda kirish mumkin.
5. **🛡️ Admin Paneli**:
   - Admin sifatida kirilganda yangi film qo'shish (Title, Genre, Duration, Description) oynasi ochiladi va `POST /movies` orqali film qo'shiladi.

---

## 📖 API Hujjatlari (Swagger)

Server ishga tushgach, brauzerda quyidagi manzilga kiring:
👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**

Swagger interfeysida:
- Har bir endpoint to'liq tavsiflangan va so'rov/javob namunalari keltirilgan.
- **Authorize** tugmasi orqali `Bearer <token>` kiritib, barcha himoyalangan (`🔒`) endpointlarni sinab ko'rish mumkin.
- 400, 401, 403, 404, 409 xatolik javoblari namoyish etilgan.

---

## 📋 API Endpointlari

### 1️⃣ Auth (Autentifikatsiya)
| Method | URL | Tavsif | Kirish |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Yangi user ro'yxatdan o'tishi (`{ name, email, password }`), parol bcrypt bilan xeshlanadi (email band bo'lsa 409) | Ochiq |
| `POST` | `/auth/login` | Tizimga kirish (`{ email, password }` -> `{ token, user }`), noto'g'ri bo'lsa 401 | Ochiq |
| `GET` | `/auth/me` | Joriy user ma'lumotlari (parolsiz qaytadi) | 🔒 Bearer token |

### 2️⃣ Filmlar va Seanslar
| Method | URL | Tavsif | Kirish |
| :--- | :--- | :--- | :--- |
| `GET` | `/movies?genre=action&page=1&limit=2` | Janr bo'yicha filter va pagination (`{ data, page, limit, total, totalPages }`) | Ochiq |
| `GET` | `/movies/:id` | Film tafsilotlari va uning barcha seanslari (topilmasa 404) | Ochiq |
| `POST` | `/movies` | Yangi film qo'shish (Bonus: faqat `admin` roli uchun, boshqalarga 403) | 🔒 Admin |
| `GET` | `/sessions/:id/seats` | Zal o'rindiqlari xaritasi (`taken: true/false`, shuningdek `asciiMap`) | Ochiq |

### 3️⃣ Joy band qilish (Bookings)
| Method | URL | Tavsif | Kirish |
| :--- | :--- | :--- | :--- |
| `POST` | `/bookings` | Joy band qilish (`{ sessionId, row, seat }`) | 🔒 Bearer token |
| `GET` | `/bookings/my` | Faqat o'zimning band qilgan joylarim | 🔒 Bearer token |
| `DELETE` | `/bookings/:id` | Band qilingan joyni bekor qilish | 🔒 Bearer token |

#### 🔥 Qoidalar va cheklovlar:
- `row` yoki `seat` zal chegarasidan tashqarida bo'lsa -> **400**
- Joy allaqachon band bo'lsa -> **409** `{ "error": "Bu joy band" }`
- Seans topilmasa -> **404**
- Birovning bandini o'chirmoqchi bo'lsa -> **403** (faqat o'zining bandini yoki admin o'chira oladi)
- Bitta user bitta seansda 4 tadan ortiq joy band qila olmaydi, oshsa -> **400**

---

## ✅ Sinov Stsenariysi (Ali & Vali)

Quyidagi qadamlar `npm test` buyrug'i orqali to'liq avtomatik tekshiriladi:
1. **Ali ro'yxatdan o'tadi va login qiladi** -> Token oladi.
2. **Ali 1-seansda 3-qator 5-joyni band qiladi** -> **201 Created**.
3. **Vali ro'yxatdan o'tadi va o'sha joyni band qilmoqchi bo'ladi** -> **409 Conflict** (`"Bu joy band"`).
4. **Vali Alining bandini o'chirmoqchi bo'ladi** -> **403 Forbidden**.
5. **Ali o'z bandini o'chiradi (200), keyin Vali o'sha joyni band qiladi** -> **201 Created**.
6. **`/sessions/1/seats` so'rovida 3-qator 5-joy `taken: true` bo'lib ko'rinadi**.

---

## 🌐 Render'ga Deploy Qilish Qadamlari

1. GitHub'da yangi repozitoriy oching (masalan, `cinebook-api`).
2. Loyihani GitHub'ga yuboring:
   ```bash
   git init
   git add .
   git commit -m "feat: CineBook API initial release"
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
3. [Render.com](https://render.com) ga kiring va **New Web Service** tugmasini bosing.
4. GitHub repozitoriyangizni ulang.
5. Sozlamalarni kiriting:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. **Environment Variables** bo'limiga qo'shing:
   - `JWT_SECRET`: `sizning_kuchli_jwt_maxfiy_kodingiz`
   - `PORT`: `5000` (yoki Render avtomatik bergan port)
7. **Deploy Web Service** tugmasini bosing.
8. Deploy tugagach, berilgan havolaning `/api-docs` sahifasiga kirib API ni sinab ko'ring!
