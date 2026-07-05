const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/quiz-miniapp';

mongoose.connect(uri).then(async () => {
  try {
    await mongoose.connection.db.collection('questions').drop();
    console.log('questions collection dropped successfully');
  } catch (err) {
    // collection might not exist
    console.log('note: questions collection did not exist or already dropped');
  }
  process.exit(0);
}).catch(err => {
  console.error('connection error:', err);
  process.exit(1);
});
