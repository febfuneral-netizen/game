import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getBackpack, verifyRedemption } from '../../services/api';
import './index.scss';

interface BackpackRecord {
  _id: string;
  itemSnapshot: {
    name: string;
    emoji: string;
    description: string;
    pointCost: number;
  };
  purchasedAt: string;
}

interface GroupedItem {
  key: string;
  name: string;
  emoji: string;
  description: string;
  pointCost: number;
  count: number;
  ids: string[];
  equipped: boolean;
}

interface CardItem {
  id: string;
  name: string;
  subject: string;
  rarity: 'SSR' | 'SR' | 'R' | 'N';
  emoji: string;
  gradient: string;
  count: number;
}

const PROP_BG_COLORS = ['#60A5FA', '#FBBF24', '#A78BFA', '#34D399', '#FB7185', '#818CF8'];

const MOCK_CARDS: CardItem[] = [
  { id: '1', name: '宇宙奥秘', subject: '科学', rarity: 'SSR', emoji: '🌌', gradient: 'linear-gradient(135deg, #10B981, #06B6D4)', count: 1 },
  { id: '2', name: '诗仙李白', subject: '语文', rarity: 'SSR', emoji: '📜', gradient: 'linear-gradient(135deg, #F59E0B, #F97316)', count: 1 },
  { id: '3', name: '英语精通', subject: '英语', rarity: 'SR', emoji: '🌍', gradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)', count: 2 },
  { id: '4', name: '数学大师', subject: '数学', rarity: 'SR', emoji: '🔢', gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)', count: 1 },
  { id: '5', name: '科学先锋', subject: '科学', rarity: 'R', emoji: '🔬', gradient: 'linear-gradient(135deg, #10B981, #34D399)', count: 3 },
  { id: '6', name: '逻辑达人', subject: '数学', rarity: 'R', emoji: '🧩', gradient: 'linear-gradient(135deg, #06B6D4, #3B82F6)', count: 2 },
  { id: '7', name: '历史通', subject: '历史', rarity: 'N', emoji: '🏛️', gradient: 'linear-gradient(135deg, #22C55E, #10B981)', count: 5 },
  { id: '8', name: '地理迷', subject: '地理', rarity: 'N', emoji: '🗺️', gradient: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', count: 4 },
];

const RARITY_FILTERS = ['全部', 'SSR', 'SR', 'R', 'N'];

export default function BackpackPage() {
  const [activeTab, setActiveTab] = useState<'props' | 'cards'>('props');
  const [records, setRecords] = useState<BackpackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState('全部');

  const loadBackpack = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBackpack();
      setRecords(data || []);
    } catch {
      Taro.showToast({ title: '加载背包失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackpack();
  }, [loadBackpack]);

  const groupedItems = useMemo<GroupedItem[]>(() => {
    const map = new Map<string, GroupedItem>();
    records.forEach((record, index) => {
      const key = record.itemSnapshot.name;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.ids.push(record._id);
      } else {
        map.set(key, {
          key,
          name: record.itemSnapshot.name,
          emoji: record.itemSnapshot.emoji,
          description: record.itemSnapshot.description,
          pointCost: record.itemSnapshot.pointCost,
          count: 1,
          ids: [record._id],
          equipped: index < 2, // 前两个模拟已装备
        });
      }
    });
    return Array.from(map.values());
  }, [records]);

  const filteredCards = useMemo(() => {
    if (rarityFilter === '全部') return MOCK_CARDS;
    return MOCK_CARDS.filter((card) => card.rarity === rarityFilter);
  }, [rarityFilter]);

  const propsCount = groupedItems.reduce((sum, item) => sum + item.count, 0);
  const cardsCount = MOCK_CARDS.reduce((sum, card) => sum + card.count, 0);

  const handleVerify = async (item: GroupedItem) => {
    const confirmed = await Taro.showModal({
      title: '确认核销',
      content: `确定要使用「${item.emoji} ${item.name}」吗？\n\n使用后请找爸爸妈妈兑现哦～`,
      confirmText: '确认使用',
      cancelText: '再想想',
      confirmColor: '#FF6B6B',
    });

    if (!confirmed.confirm) return;

    const targetId = item.ids[0];
    setVerifying(targetId);
    try {
      await verifyRedemption(targetId);
      Taro.showToast({
        title: `「${item.name}」已使用！快去找爸妈吧~`,
        icon: 'success',
        duration: 2500,
      });
      setRecords((prev) => prev.filter((r) => r._id !== targetId));
    } catch (err: any) {
      Taro.showToast({ title: err.message || '核销失败', icon: 'none', duration: 2000 });
    } finally {
      setVerifying(null);
    }
  };

  const goShop = () => {
    Taro.navigateTo({ url: '/pages/shop/index' });
  };

  return (
    <View className='backpack-page'>
      {/* 顶部导航 */}
      <View className='backpack-page__header'>
        <View className='backpack-page__header-left'>
          <View className='backpack-page__back' onClick={() => Taro.navigateBack()}>
            <Text className='backpack-page__back-icon'>‹</Text>
          </View>
          <View className='backpack-page__header-title'>
            <Text className='backpack-page__title'>背包</Text>
            <Text className='backpack-page__subtitle'>
              {propsCount > 0 || cardsCount > 0 ? `${propsCount} 件道具 · ${cardsCount} 张卡牌` : '还没有物品哦'}
            </Text>
          </View>
        </View>
        <View className='backpack-page__go-shop' onClick={goShop}>
          <Text className='backpack-page__go-shop-icon'>🛒</Text>
          <Text className='backpack-page__go-shop-text'>去商店</Text>
        </View>
      </View>

      {/* 标签切换 */}
      <View className='backpack-page__tabs'>
        <View
          className={`backpack-page__tab ${activeTab === 'props' ? 'backpack-page__tab--active' : ''}`}
          onClick={() => setActiveTab('props')}
        >
          <Text className='backpack-page__tab-text'>道具</Text>
          <View className='backpack-page__tab-badge'>
            <Text className='backpack-page__tab-badge-text'>{propsCount}</Text>
          </View>
        </View>
        <View
          className={`backpack-page__tab ${activeTab === 'cards' ? 'backpack-page__tab--active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          <Text className='backpack-page__tab-text'>卡牌</Text>
          <View className='backpack-page__tab-badge'>
            <Text className='backpack-page__tab-badge-text'>{cardsCount}</Text>
          </View>
        </View>
      </View>

      {/* 内容区 */}
      <ScrollView className='backpack-page__content' scrollY>
        {activeTab === 'props' ? (
          <View className='backpack-page__props'>
            {loading ? (
              <View className='backpack-page__loading'>
                <Text className='backpack-page__loading-text'>加载中...</Text>
              </View>
            ) : groupedItems.length > 0 ? (
              <View className='backpack-page__grid'>
                {groupedItems.map((item, index) => {
                  const isVerifying = verifying === item.ids[0];
                  const bgColor = PROP_BG_COLORS[index % PROP_BG_COLORS.length];

                  return (
                    <View
                      key={item.key}
                      className='backpack-page__card'
                      onClick={() => !isVerifying && handleVerify(item)}
                    >
                      <View className='backpack-page__card-top'>
                        <View className='backpack-page__card-icon' style={{ backgroundColor: bgColor }}>
                          <Text className='backpack-page__card-icon-text'>{item.emoji}</Text>
                        </View>
                        {item.equipped && (
                          <View className='backpack-page__card-equipped'>
                            <Text className='backpack-page__card-equipped-text'>已装备</Text>
                          </View>
                        )}
                      </View>
                      <Text className='backpack-page__card-name'>{item.name}</Text>
                      <Text className='backpack-page__card-desc'>{item.description}</Text>
                      <View className='backpack-page__card-bottom'>
                        <Text className='backpack-page__card-count'>持有 ×{item.count}</Text>
                        <View
                          className={`backpack-page__card-btn ${isVerifying ? 'backpack-page__card-btn--loading' : ''}`}
                        >
                          <Text className='backpack-page__card-btn-text'>
                            {isVerifying ? '核销中' : '使用'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className='backpack-page__empty'>
                <Text className='backpack-page__empty-emoji'>🎒</Text>
                <Text className='backpack-page__empty-text'>背包空空如也</Text>
                <Text className='backpack-page__empty-hint'>去积分商城兑换你的奖励吧！</Text>
                <View className='backpack-page__empty-btn' onClick={goShop}>
                  <Text className='backpack-page__empty-btn-text'>去商城逛逛</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View className='backpack-page__cards'>
            {/* 稀有度筛选 */}
            <ScrollView className='backpack-page__filters' scrollX showScrollbar={false}>
              <View className='backpack-page__filters-inner'>
                {RARITY_FILTERS.map((filter) => (
                  <View
                    key={filter}
                    className={`backpack-page__filter ${rarityFilter === filter ? 'backpack-page__filter--active' : ''}`}
                    onClick={() => setRarityFilter(filter)}
                  >
                    <Text className='backpack-page__filter-text'>{filter}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* 卡牌网格 */}
            <View className='backpack-page__card-grid'>
              {filteredCards.map((card) => (
                <View
                  key={card.id}
                  className='backpack-page__card-item'
                  style={{ background: card.gradient }}
                >
                  {card.count > 1 && (
                    <View className='backpack-page__card-count-badge'>
                      <Text className='backpack-page__card-count-badge-text'>×{card.count}</Text>
                    </View>
                  )}
                  <View className='backpack-page__card-content'>
                    <Text className='backpack-page__card-emoji'>{card.emoji}</Text>
                    <View className='backpack-page__card-rarity-badge'>
                      <Text className='backpack-page__card-rarity-text'>{card.rarity}</Text>
                    </View>
                  </View>
                  <View className='backpack-page__card-footer'>
                    <Text className='backpack-page__card-item-name'>{card.name}</Text>
                    <Text className='backpack-page__card-item-subject'>{card.subject}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View className='backpack-page__tip'>
              <Text className='backpack-page__tip-text'>📌 卡牌系统正在开发中，当前为预览数据</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
