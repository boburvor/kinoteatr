const mongoose = require('mongoose');
const dns = require('dns');

// Windows / ISP larda SRV DNS xatoligini (querySrv ECONNREFUSED) oldini olish
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // E'tiborsiz qoldirish
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('⚠️ MONGODB_URI .env faylida topilmadi.');
    return;
  }

  if (uri.includes('<db_password>')) {
    console.log('⚠️ Diqqat: .env faylidagi MONGODB_URI da "<db_password>" turibdi.');
    console.log('   Iltimos, uni MongoDB Atlas dagi haqiqiy parolingiz bilan almashtiring.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB muvaffaqiyatli ulandi: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB ga ulanishda xatolik: ${error.message}`);
    if (error.message.includes('IP that isn\'t whitelisted') || error.message.includes('Could not connect to any servers')) {
      console.log('💡 Eslatma: MongoDB Atlas -> "Network Access" bo\'limiga o\'ting va "Add IP Address" orqali "Allow Access from Anywhere" (0.0.0.0/0) ni qo\'shing.');
    }
  }
};

module.exports = connectDB;
