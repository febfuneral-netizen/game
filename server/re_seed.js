require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri);
  console.log('connected to MongoDB');
  
  const col = mongoose.connection.db.collection('questions');
  
  // Drop existing questions
  try { await col.drop(); } catch {}
  console.log('old questions dropped');
  
  const data = require('./data/seed_full.json');
  
  // Bypass Mongoose schema — directly insert via native driver
  // to preserve all fields (chapter, text, options, correctId, explanation)
  await col.insertMany(data);
  console.log('inserted:', data.length, 'questions');
  
  const count = await col.countDocuments();
  console.log('total questions:', count);
  
  // Verify first document has all fields
  const sample = await col.findOne();
  console.log('sample fields:', Object.keys(sample).join(', '));
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
