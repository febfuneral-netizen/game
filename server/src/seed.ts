import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question';
import seedData from '../data/seed_full.json';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quiz-miniapp';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 连接成功');

    // 检查是否已有数据
    const count = await Question.countDocuments();
    if (count > 0) {
      console.log(`⚠️  题库已有 ${count} 题，跳过 seed`);
      console.log('💡 如需重置，先执行: db.questions.drop()');
      process.exit(0);
    }

    // 导入 seed 数据
    const result = await Question.insertMany(seedData);
    console.log(`✅ 成功导入 ${result.length} 题初始题库`);

    // 按学科统计
    const stats = await Question.aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 } } }
    ]);
    stats.forEach((s: any) => {
      console.log(`   ${s._id}: ${s.count} 题`);
    });

    console.log('🏁 Seed 完成!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed 失败:', err);
    process.exit(1);
  }
}

seed();
