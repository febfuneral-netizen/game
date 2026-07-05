const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/quiz-miniapp';

async function main() {
  await mongoose.connect(uri);
  console.log('connected');
  
  // Drop old data
  const Question = mongoose.model('Question', new mongoose.Schema({
    subject: String
  }));
  await mongoose.connection.db.collection('questions').drop();
  console.log('old questions dropped');
  
  // eslint-disable-next-line no-undef
  const data = require('./data/seed_full.json');
  await Question.insertMany(data);
  console.log('inserted:', data.length, 'questions');
  
  const count = await mongoose.connection.db.collection('questions').countDocuments();
  console.log('total questions:', count);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
