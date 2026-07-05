import mongoose, { Schema, Document } from 'mongoose';

export interface IShopItem extends Document {
  name: string;
  emoji: string;
  description: string;
  category: '零食' | '娱乐' | '学习' | '户外' | '玩具' | '其他';
  pointCost: number;
  isActive: boolean;
  sortOrder: number;
}

const ShopItemSchema = new Schema<IShopItem>(
  {
    name: { type: String, required: true },
    emoji: { type: String, default: '🎁' },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['零食', '娱乐', '学习', '户外', '玩具', '其他'],
      default: '其他',
    },
    pointCost: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IShopItem>('ShopItem', ShopItemSchema);
