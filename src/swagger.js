const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'CineBook API - Kinoteatr joy band qilish tizimi',
    version: '1.0.0',
    description: "CineBook - filmlar, seanslar va kinoteatr zallaridagi o'rindiqlarni band qilish uchun qulay RESTful API.\n\n" +
      "### Asosiy xususiyatlar:\n" +
      "- **JWT Autentifikatsiya**: Ro'yxatdan o'tish, login va joriy foydalanuvchini olish.\n" +
      "- **Filmlar & Seanslar**: Janr bo'yicha filter, sahifalash (pagination) va zal joylari xaritasi.\n" +
      "- **Joy band qilish**: Bir vaqtning o'zida bir joyni ikki kishi band qila olmasligi (409), qator/o'rindiq chegaralari (400), bitta foydalanuvchi uchun seansga 4 ta joy limiti (400), birovning bandini o'chirish taqiqlanishi (403).\n" +
      "- **Xavfsizlik**: Swagger'dagi **Authorize** tugmasi orqali Bearer tokenni kiritib himoyalangan endpointlarni to'g'ridan-to'g'ri sinab ko'rishingiz mumkin."
  },
  servers: [
    {
      url: '/',
      description: 'Current Environment Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: "JWT tokeningizni kiriting. Masalan: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Ali Valiyev' },
          email: { type: 'string', format: 'email', example: 'ali@example.com' },
          password: { type: 'string', format: 'password', example: 'Parol123!' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ali@example.com' },
          password: { type: 'string', format: 'password', example: 'Parol123!' }
        }
      },
      BookingRequest: {
        type: 'object',
        required: ['sessionId', 'row', 'seat'],
        properties: {
          sessionId: { type: 'integer', example: 1 },
          row: { type: 'integer', example: 3 },
          seat: { type: 'integer', example: 5 }
        }
      },
      CreateMovieRequest: {
        type: 'object',
        required: ['title', 'genre', 'duration'],
        properties: {
          title: { type: 'string', example: 'Avatar 3' },
          genre: { type: 'string', example: 'sci-fi' },
          duration: { type: 'integer', example: 190 },
          description: { type: 'string', example: 'Pandora sayyorasidagi yangi sarguzashtlar' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['1. Auth'],
        summary: "Yangi foydalanuvchini ro'yxatdan o'tkazish",
        description: "Foydalanuvchi ism, email va parol kiritadi. Parol bcrypt bilan xeshlanadi.",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: "Muvaffaqiyatli ro'yxatdan o'tildi",
            content: {
              'application/json': {
                example: {
                  message: "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi",
                  user: { id: 2, name: 'Ali Valiyev', email: 'ali@example.com', role: 'user' }
                }
              }
            }
          },
          '400': {
            description: "Ma'lumotlar to'liq emas yoki noto'g'ri",
            content: {
              'application/json': {
                example: { error: 'Ism, email va parol kiritilishi shart' }
              }
            }
          },
          '409': {
            description: "Email allaqachon band",
            content: {
              'application/json': {
                example: { error: "Email allaqachon ro'yxatdan o'tgan" }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['1. Auth'],
        summary: 'Tizimga kirish (Login)',
        description: 'Email va parol tekshiriladi, to\'g\'ri bo\'lsa JWT token qaytariladi.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: "Muvaffaqiyatli kirildi, token qaytadi",
            content: {
              'application/json': {
                example: {
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  user: { id: 2, name: 'Ali Valiyev', email: 'ali@example.com', role: 'user' }
                }
              }
            }
          },
          '400': {
            description: "Email yoki parol kiritilmagan",
            content: {
              'application/json': {
                example: { error: 'Email va parol kiritilishi shart' }
              }
            }
          },
          '401': {
            description: "Login yoki parol noto'g'ri",
            content: {
              'application/json': {
                example: { error: "Email yoki parol noto'g'ri" }
              }
            }
          }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['1. Auth'],
        summary: 'Joriy foydalanuvchi ma\'lumotlarini olish',
        description: "🔒 JWT token talab qilinadi. Joriy foydalanuvchi ma'lumotlari parolsiz qaytadi.",
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: "Foydalanuvchi ma'lumotlari",
            content: {
              'application/json': {
                example: { id: 2, name: 'Ali Valiyev', email: 'ali@example.com', role: 'user' }
              }
            }
          },
          '401': {
            description: "Token taqdim etilmagan yoki yaroqsiz",
            content: {
              'application/json': {
                example: { error: "Token taqdim etilmadi yoki formati noto'g'ri (Authorization: Bearer <token>)" }
              }
            }
          }
        }
      }
    },
    '/movies': {
      get: {
        tags: ['2. Filmlar va Seanslar'],
        summary: 'Filmlar ro\'yxatini olish (Filter va Pagination)',
        description: 'Janr bo\'yicha saralash va sahifalash imkoniyati bilan barcha filmlar.',
        parameters: [
          {
            name: 'genre',
            in: 'query',
            description: 'Film janri (masalan: action, sci-fi)',
            required: false,
            schema: { type: 'string', example: 'action' }
          },
          {
            name: 'page',
            in: 'query',
            description: 'Sahifa raqami (boshlang\'ich: 1)',
            required: false,
            schema: { type: 'integer', default: 1, example: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Bir sahifadagi elementlar soni (boshlang\'ich: 10)',
            required: false,
            schema: { type: 'integer', default: 10, example: 2 }
          }
        ],
        responses: {
          '200': {
            description: "Pagination formati bo'yicha filmlar ro'yxati",
            content: {
              'application/json': {
                example: {
                  data: [
                    { id: 2, title: 'The Dark Knight', genre: 'action', duration: 152, description: '...' },
                    { id: 4, title: 'Gladiator II', genre: 'action', duration: 148, description: '...' }
                  ],
                  page: 1,
                  limit: 2,
                  total: 2,
                  totalPages: 1
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['2. Filmlar va Seanslar'],
        summary: 'Yangi film qo\'shish (Bonus: Admin)',
        description: '🔒 Faqat `role: admin` bo\'lgan foydalanuvchilar film qo\'sha oladi.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMovieRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: "Film muvaffaqiyatli qo'shildi",
            content: {
              'application/json': {
                example: {
                  message: "Film muvaffaqiyatli qo'shildi",
                  movie: { id: 5, title: 'Avatar 3', genre: 'sci-fi', duration: 190, description: '...' }
                }
              }
            }
          },
          '401': {
            description: 'Avtorizatsiyadan o\'tilmagan',
            content: { 'application/json': { example: { error: 'Token taqdim etilmadi' } } }
          },
          '403': {
            description: 'Faqat adminlar uchun ruxsat berilgan',
            content: { 'application/json': { example: { error: 'Faqat adminlar uchun ruxsat berilgan' } } }
          }
        }
      }
    },
    '/movies/{id}': {
      get: {
        tags: ['2. Filmlar va Seanslar'],
        summary: 'Film ma\'lumoti va uning seanslari',
        description: 'Film ID si bo\'yicha film tafsilotlari va unga tegishli barcha seanslar qaytariladi.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Film ID si',
            schema: { type: 'integer', example: 1 }
          }
        ],
        responses: {
          '200': {
            description: "Film va uning seanslari",
            content: {
              'application/json': {
                example: {
                  id: 1,
                  title: 'Inception',
                  genre: 'sci-fi',
                  duration: 148,
                  description: "Dominic Cobb tushlar orqali odamlarning maxfiy sirlarini o'g'irlaydigan mohir o'g'ri.",
                  sessions: [
                    { id: 3, movieId: 1, time: '2026-10-02T17:00', hall: 'B', rows: 6, seatsPerRow: 10 }
                  ]
                }
              }
            }
          },
          '404': {
            description: 'Film topilmadi',
            content: {
              'application/json': {
                example: { error: 'Film topilmadi' }
              }
            }
          }
        }
      }
    },
    '/sessions/{id}/seats': {
      get: {
        tags: ['2. Filmlar va Seanslar'],
        summary: 'Seansdagi joylar xaritasi',
        description: 'Berilgan seansdagi barcha o\'rindiqlarning taken: true/false holati. format=map bilan ASCII xaritani ham olish mumkin.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Seans ID si',
            schema: { type: 'integer', example: 1 }
          },
          {
            name: 'format',
            in: 'query',
            required: false,
            description: 'format=map bo\'lsa matnli ASCII xaritani qaytaradi',
            schema: { type: 'string', example: 'map' }
          }
        ],
        responses: {
          '200': {
            description: "Joylar xaritasi",
            content: {
              'application/json': {
                example: {
                  sessionId: 1,
                  hall: 'A',
                  rows: 5,
                  seatsPerRow: 8,
                  totalSeats: 40,
                  bookedCount: 1,
                  availableCount: 39,
                  asciiMap: "========== [EKRAN] ==========\nQator  1: [ ][ ][ ][ ][ ][ ][ ][ ]\n...",
                  seats: [
                    { row: 1, seat: 1, taken: false },
                    { row: 3, seat: 5, taken: true }
                  ]
                }
              }
            }
          },
          '404': {
            description: 'Seans topilmadi',
            content: {
              'application/json': {
                example: { error: 'Seans topilmadi' }
              }
            }
          }
        }
      }
    },
    '/bookings': {
      post: {
        tags: ['3. Band qilish (Bookings)'],
        summary: 'Joy band qilish',
        description: "🔒 Foydalanuvchi ko'rsatilgan seansda qator va o'rindiqni band qiladi.\n\n" +
          "**Qoidalar**:\n" +
          "- `row` yoki `seat` zal chegarasidan tashqarida bo'lsa -> **400**\n" +
          "- Joy allaqachon band bo'lsa -> **409** `{ error: \"Bu joy band\" }`\n" +
          "- Seans topilmasa -> **404**\n" +
          "- Bitta user bitta seansda 4 tadan ortiq joy band qila olmaydi -> **400**",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Joy muvaffaqiyatli band qilindi',
            content: {
              'application/json': {
                example: {
                  message: 'Joy muvaffaqiyatli band qilindi',
                  booking: {
                    id: 1,
                    userId: 2,
                    sessionId: 1,
                    row: 3,
                    seat: 5,
                    createdAt: '2026-09-29T17:00:00.000Z'
                  }
                }
              }
            }
          },
          '400': {
            description: "Zal chegarasidan tashqarida yoki 4 ta joy limiti oshgan",
            content: {
              'application/json': {
                examples: {
                  zalChegarasi: {
                    summary: 'Zal chegarasidan tashqarida',
                    value: { error: "Qator yoki o'rindiq zal chegarasidan tashqarida. Zal o'lchami: 5 qator, har bir qatorda 8 ta o'rindiq" }
                  },
                  limitOshdi: {
                    summary: '4 ta joy limiti oshdi',
                    value: { error: 'Bitta user bitta seansda 4 tadan ortiq joy band qila olmaydi' }
                  }
                }
              }
            }
          },
          '401': {
            description: "Token taqdim etilmadi yoki yaroqsiz",
            content: {
              'application/json': {
                example: { error: 'Token taqdim etilmadi yoki formati noto\'g\'ri' }
              }
            }
          },
          '404': {
            description: "Seans topilmadi",
            content: {
              'application/json': {
                example: { error: 'Seans topilmadi' }
              }
            }
          },
          '409': {
            description: "Joy allaqachon band",
            content: {
              'application/json': {
                example: { error: 'Bu joy band' }
              }
            }
          }
        }
      }
    },
    '/bookings/my': {
      get: {
        tags: ['3. Band qilish (Bookings)'],
        summary: 'Mening band qilgan joylarim',
        description: '🔒 Faqat joriy tizimga kirgan foydalanuvchining band qilgan o\'rindiqlari ro\'yxati.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: "Foydalanuvchining barcha bandlari",
            content: {
              'application/json': {
                example: [
                  {
                    id: 1,
                    userId: 2,
                    sessionId: 1,
                    row: 3,
                    seat: 5,
                    createdAt: '2026-09-29T17:00:00.000Z',
                    session: {
                      id: 1,
                      time: '2026-10-01T18:00',
                      hall: 'A',
                      movie: { id: 2, title: 'The Dark Knight', genre: 'action' }
                    }
                  }
                ]
              }
            }
          },
          '401': {
            description: 'Avtorizatsiyadan o\'tilmagan',
            content: {
              'application/json': {
                example: { error: 'Token taqdim etilmadi' }
              }
            }
          }
        }
      }
    },
    '/bookings/{id}': {
      delete: {
        tags: ['3. Band qilish (Bookings)'],
        summary: 'Band qilishni bekor qilish',
        description: "🔒 Band qilingan joyni bekor qilish. Faqat uni qilgan odam bekor qila oladi, boshqalar o'chirmoqchi bo'lsa 403.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Band ID si',
            schema: { type: 'integer', example: 1 }
          }
        ],
        responses: {
          '200': {
            description: 'Band muvaffaqiyatli bekor qilindi',
            content: {
              'application/json': {
                example: {
                  message: 'Band muvaffaqiyatli bekor qilindi',
                  cancelledBookingId: 1
                }
              }
            }
          },
          '401': {
            description: 'Avtorizatsiyadan o\'tilmagan',
            content: { 'application/json': { example: { error: 'Token taqdim etilmadi' } } }
          },
          '403': {
            description: 'Birovning bandini o\'chirish taqiqlangan',
            content: {
              'application/json': {
                example: { error: "Birovning bandini o'chirish taqiqlangan" }
              }
            }
          },
          '404': {
            description: 'Band topilmadi',
            content: {
              'application/json': {
                example: { error: 'Band topilmadi' }
              }
            }
          }
        }
      }
    }
  }
};

const setupSwagger = (app) => {
  const customOptions = {
    customSiteTitle: 'CineBook API Documentation',
    customCss: '.swagger-ui .topbar { display: none }'
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, customOptions));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
};

module.exports = {
  swaggerDocument,
  setupSwagger
};
