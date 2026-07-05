import mongoose, { Schema, Document } from 'mongoose';

export interface IItemSnapshot {
  name: string;
  emoji: string;
  description: string;
  pointCost: number;
}

export interface IRedemption extends Document {
  userId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  itemSnapshot: IItemSnapshot;
  status: 'active' | 'verified';
  purchasedAt: Date;
  verifiedAt?: Date;
}

const RedemptionSchema = new Schema<IRedemption>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'ShopItem', required: true },
    itemSnapshot: {
      name: { type: String, required: true },
      emoji: { type: String, default: '🎁' },
      description: { type: String, default: '' },
      pointCost: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['active', 'verified'],
      default: 'active',
    },
    purchasedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IRedemption>('Redemption', RedemptionSchema);
