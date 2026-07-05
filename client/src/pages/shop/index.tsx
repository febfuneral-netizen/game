import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getShopItems, redeemItem, getBackpackCount, getProfile } from '../../services/api';
import './index.scss';

interface ShopItem {
  _id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  pointCost: number;
}

interface CardPool {
  tag: string;
  name: string;
  description: string;
  rates: { rarity: string; rate: number; color: string }[];
}

const PROP_BG_COLORS = ['#60A5FA', '#FBBF24', '#A78BFA', '#34D399', '#FB7185', '#818CF8'];
const PROP_TAG_COLORS = ['#FF6B6B', '#F59E0B', '#10B981', '#8B5CF6', '#3B82F6'];
const PROP_TAGS = ['热门', '推荐', '限定', '热门', '推荐', '限定'];

const MOCK_CARD_POOL: CardPool = {
  tag: '限时卡池',
  name: '学霸传说',
  description: 'SSR「宇宙奥秘」概率提升 ×3',
  rates: [
    { rarity: 'SSR', rate: 3, color: '#F59E0B' },
    { rarity: 'SR', rate: 10, color: '#A855F7' },
    { rarity: 'R', rate: 30, color: '#3B82F6' },
    { rarity: 'N', rate: 57, color: '#6B7280' },
  ],
};

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState<'props' | 'cards'>('props');
  const [items, setItems] = useState<ShopItem[]>([]);
  const [score, setScore] = useState(0);
  const [backpackCount, setBackpackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [shopItems, profile, countData] = await Promise.all([
        getShopItems(),
        getProfile().catch(() => null),
        getBackpackCount().catch(() => ({ count: 0 })),
      ]);
      setItems(shopItems || []);
      setScore(profile?.totalScore || 0);
      setBackpackCount(countData?.count || 0);
    } catch {
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRedeem = async (item: ShopItem) => {
    if (score < item.pointCost) {
      Taro.showToast({ title: `积分不足！需要 ${item.pointCost} 分`, icon: 'none', duration: 2000 });
      return;
    }

    const confirmed = await Taro.showModal({
      title: '确认兑换',
      content: `确定要用 ${item.pointCost} 分兑换「${item.emoji} ${item.name}」吗？\n\n${item.description}`,
      confirmText: '兑换',
      cancelText: '再看看',
    });

    if (!confirmed.confirm) return;

    setRedeeming(item._id);
    try {
      await redeemItem(item._id);
      Taro.showToast({ title: `成功兑换「${item.name}」！`, icon: 'success', duration: 2000 });
      await loadData();
    } catch (err: any) {
      Taro.showToast({ title: err.message || '兑换失败', icon: 'none', duration: 2000 });
    } finally {
      setRedeeming(null);
    }
  };

  const handleDraw = () => {
    Taro.showModal({
      title: '即将开放',
      content: '抽卡池功能正在开发中，敬请期待！',
      showCancel: false,
    });
  };

  const goBackpack = () => {
    Taro.navigateTo({ url: '/pages/backpack/index' });
  };

  return (
    <View className='shop-page'>
      {/* 顶部导航 */}
      <View className='shop-page__header'>
        <View className='shop-page__header-left'>
          <View className='shop-page__back' onClick={() => Taro.navigateBack()}>
            <Text className='shop-page__back-icon'>‹</Text>
          </View>
          <View className='shop-page__header-title'>
            <Text className='shop-page__title'>商店</Text>
            <Text className='shop-page__subtitle'>用积分兑换道具与卡牌</Text>
          </View>
        </View>
        <View className='shop-page__header-right'>
          <View className='shop-page__score'>
            <Text className='shop-page__score-icon'>💎</Text>
            <Text className='shop-page__score-value'>{score}</Text>
          </View>
          <View className='shop-page__backpack' onClick={goBackpack}>
            <Text className='shop-page__backpack-icon'>🎒</Text>
            {backpackCount > 0 && (
              <View className='shop-page__backpack-badge'>
                <Text className='shop-page__backpack-badge-text'>{backpackCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 标签切换 */}
      <View className='shop-page__tabs'>
        <View
          className={`shop-page__tab ${activeTab === 'props' ? 'shop-page__tab--active' : ''}`}
          onClick={() => setActiveTab('props')}
        >
          <Text className='shop-page__tab-icon'>🛒</Text>
          <Text className='shop-page__tab-text'>道具商店</Text>
        </View>
        <View
          className={`shop-page__tab ${activeTab === 'cards' ? 'shop-page__tab--active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          <Text className='shop-page__tab-icon'>✨</Text>
          <Text className='shop-page__tab-text'>抽卡池</Text>
        </View>
      </View>

      {/* 内容区 */}
      <ScrollView className='shop-page__content' scrollY>
        {activeTab === 'props' ? (
          <View className='shop-page__props'>
            {loading ? (
              <View className='shop-page__loading'>
                <Text className='shop-page__loading-text'>加载中...</Text>
              </View>
            ) : (
              <View className='shop-page__grid'>
                {items.map((item, index) => {
                  const canAfford = score >= item.pointCost;
                  const isRedeeming = redeeming === item._id;
                  const bgColor = PROP_BG_COLORS[index % PROP_BG_COLORS.length];
                  const tag = PROP_TAGS[index % PROP_TAGS.length];
                  const tagColor = PROP_TAG_COLORS[index % PROP_TAG_COLORS.length];

                  return (
                    <View
                      key={item._id}
                      className={`shop-page__card ${!canAfford ? 'shop-page__card--locked' : ''}`}
                      onClick={() => canAfford && !isRedeeming && handleRedeem(item)}
                    >
                      <View className='shop-page__card-top'>
                        <View className='shop-page__card-icon' style={{ backgroundColor: bgColor }}>
                          <Text className='shop-page__card-icon-text'>{item.emoji}</Text>
                        </View>
                        <View
                          className='shop-page__card-tag'
                          style={{ backgroundColor: `${tagColor}20`, color: tagColor }}
                        >
                          <Text className='shop-page__card-tag-text'>{tag}</Text>
                        </View>
                      </View>
                      <Text className='shop-page__card-name'>{item.name}</Text>
                      <Text className='shop-page__card-desc'>{item.description}</Text>
                      <View className='shop-page__card-bottom'>
                        <View className='shop-page__card-price'>
                          <Text className='shop-page__card-price-icon'>💎</Text>
                          <Text className='shop-page__card-price-value'>{item.pointCost}</Text>
                        </View>
                        <View
                          className={`shop-page__card-btn ${canAfford ? 'shop-page__card-btn--active' : ''} ${isRedeeming ? 'shop-page__card-btn--loading' : ''}`}
                        >
                          <Text className='shop-page__card-btn-text'>
                            {isRedeeming ? '兑换中' : canAfford ? '兑换' : '不足'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {!loading && items.length === 0 && (
              <View className='shop-page__empty'>
                <Text className='shop-page__empty-emoji'>🛒</Text>
                <Text className='shop-page__empty-text'>暂无商品</Text>
              </View>
            )}

            <View className='shop-page__tip'>
              <Text className='shop-page__tip-text'>💡 兑换后可在背包中使用，由家长确认兑现</Text>
            </View>
          </View>
        ) : (
          <View className='shop-page__cards'>
            {/* 卡池 banner */}
            <View className='shop-page__pool-banner'>
              <View className='shop-page__pool-info'>
                <Text className='shop-page__pool-tag'>{MOCK_CARD_POOL.tag}</Text>
                <Text className='shop-page__pool-name'>{MOCK_CARD_POOL.name}</Text>
                <Text className='shop-page__pool-desc'>{MOCK_CARD_POOL.description}</Text>
                <View className='shop-page__pool-rates'>
                  {MOCK_CARD_POOL.rates.map((rate) => (
                    <View key={rate.rarity} className='shop-page__pool-rate'>
                      <View className='shop-page__pool-rate-badge' style={{ backgroundColor: rate.color }}>
                        <Text className='shop-page__pool-rate-rarity'>{rate.rarity}</Text>
                      </View>
                      <Text className='shop-page__pool-rate-value'>{rate.rate}%</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className='shop-page__pool-illustration'>
                <Text className='shop-page__pool-illustration-text'>🃏</Text>
              </View>
            </View>

            {/* 抽卡按钮 */}
            <View className='shop-page__draw-btns'>
              <View className='shop-page__draw-btn shop-page__draw-btn--single' onClick={handleDraw}>
                <Text className='shop-page__draw-btn-title'>单抽</Text>
                <View className='shop-page__draw-btn-price'>
                  <Text className='shop-page__draw-btn-icon'>💎</Text>
                  <Text className='shop-page__draw-btn-value'>50</Text>
                </View>
                <Text className='shop-page__draw-btn-sub'>单次随机</Text>
              </View>
              <View className='shop-page__draw-btn shop-page__draw-btn--ten' onClick={handleDraw}>
                <View className='shop-page__draw-btn-recommend'>推荐</View>
                <Text className='shop-page__draw-btn-title'>十连抽</Text>
                <View className='shop-page__draw-btn-price'>
                  <Text className='shop-page__draw-btn-icon'>💎</Text>
                  <Text className='shop-page__draw-btn-value'>450</Text>
                </View>
                <Text className='shop-page__draw-btn-sub'>省50积分</Text>
              </View>
            </View>

            {/* 关于卡牌 */}
            <View className='shop-page__about-cards'>
              <Text className='shop-page__about-title'>📌 关于卡牌</Text>
              <Text className='shop-page__about-text'>
                卡牌可在背包中查看，装备后可在答题时获得额外加成效果。重复卡牌将自动转化为积分碎片。
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
