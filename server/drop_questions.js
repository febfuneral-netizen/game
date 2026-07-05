require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('❌ 请在 .env 文件中设置 MONGO_URI');
  process.exit(1);
}

mongoose.connect(uri).then(async () => {
  try {
    await mongoose.connection.db.collection('questions').drop();
    console.log('questions collection dropped successfully');
  } catch (err) {
    console.log('note: questions collection did not exist or already dropped');
  }
  process.exit(0);
}).catch(err => {
  console.error('connection error:', err);
  process.exit(1);
});
