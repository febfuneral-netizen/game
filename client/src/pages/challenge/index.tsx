// 对战中心 — 创建房间 / 等待对手 / 加入房间
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import './index.scss';

type BattleView = 'center' | 'waiting' | 'join';

const Challenge: React.FC = () => {
  const { state, doLogin } = useGame();
  const { user } = state;
  const [view, setView] = useState<BattleView>('center');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [toast, setToast] = useState('');
  const [navHeight, setNavHeight] = useState(44);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    const info = Taro.getSystemInfoSync();
    setNavHeight((info.statusBarHeight || 0) + 44);
  }, []);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = async () => {
    if (!user) {
      await doLogin();
    }
    setRoomCode(generateRoomCode());
    setView('waiting');
  };

  const handleJoinRoom = () => {
    setJoinCode('');
    setView('join');
  };

  const handleCopyRoomCode = () => {
    Taro.setClipboardData({
      data: roomCode,
      success: () => showToast('房间码已复制'),
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleJoinCodeChange = (e: any) => {
    const val = e.detail.value?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || '';
    setJoinCode(val);
  };

  const handleJoinSubmit = () => {
    if (joinCode.length !== 6) {
      showToast('请输入6位房间码');
      return;
    }
    // TODO: 对接后端加入房间
    showToast('加入房间：' + joinCode);
  };

  const handleBack = () => {
    if (view === 'center') {
      Taro.switchTab({ url: '/pages/index/index' });
    } else {
      setView('center');
      setJoinCode('');
    }
  };

  const titleText = view === 'center' ? '对战中心' : view === 'waiting' ? '等待对手' : '加入房间';

  return (
    <View className='challenge-page'>
      {/* 自定义导航栏 */}
      <View className='challenge-page__nav' style={{ paddingTop: (navHeight - 44) + 'px', height: navHeight + 'px' }}>
        <View className='challenge-page__nav-back' onClick={handleBack}>
          <Text className='challenge-page__nav-back-icon'>←</Text>
        </View>
        <Text className='challenge-page__nav-title'>{titleText}</Text>
      </View>

      {/* 内容区 */}
      <View className='challenge-page__content'>
        {/* 对战中心 */}
        {view === 'center' && (
          <View className='challenge-page__center'>
            <View className='challenge-page__center-icon-wrap'>
              <View className='challenge-page__center-icon'>
                <Text className='challenge-page__center-icon-text'>⚔️</Text>
              </View>
            </View>
            <Text className='challenge-page__center-title'>实时对战</Text>
            <Text className='challenge-page__center-subtitle'>邀请好友同台竞技，看谁答得又快又准</Text>

            <View className='challenge-page__btn challenge-page__btn--primary' onClick={handleCreateRoom}>
              <Text className='challenge-page__btn-icon'>⚔️</Text>
              <Text className='challenge-page__btn-text'>创建房间</Text>
            </View>

            <View className='challenge-page__btn challenge-page__btn--outline' onClick={handleJoinRoom}>
              <Text className='challenge-page__btn-icon'>👥</Text>
              <Text className='challenge-page__btn-text'>加入房间</Text>
            </View>
          </View>
        )}

        {/* 等待对手 */}
        {view === 'waiting' && (
          <View className='challenge-page__waiting'>
            <View className='challenge-page__room-card'>
              <Text className='challenge-page__room-label'>房间码</Text>
              <View className='challenge-page__room-code-row'>
                <Text className='challenge-page__room-code'>{roomCode}</Text>
                <View className='challenge-page__copy-btn' onClick={handleCopyRoomCode}>
                  <Text className='challenge-page__copy-icon'>📋</Text>
                </View>
              </View>
            </View>

            <View className='challenge-page__vs'>
              <View className='challenge-page__player'>
                <View className='challenge-page__player-avatar challenge-page__player-avatar--host'>
                  <Text className='challenge-page__player-avatar-text'>
                    {user?.nickname?.charAt(0) || '?'}
                  </Text>
                  <View className='challenge-page__player-badge'>
                    <Text className='challenge-page__player-badge-text'>我</Text>
                  </View>
                </View>
                <Text className='challenge-page__player-name'>你</Text>
              </View>

              <Text className='challenge-page__vs-text'>VS</Text>

              <View className='challenge-page__player'>
                <View className='challenge-page__player-avatar challenge-page__player-avatar--empty'>
                  <Text className='challenge-page__player-avatar-text'>?</Text>
                </View>
                <Text className='challenge-page__player-name'>等待中...</Text>
              </View>
            </View>

            <Text className='challenge-page__waiting-tip'>分享房间码，等待对手加入</Text>
          </View>
        )}

        {/* 加入房间 */}
        {view === 'join' && (
          <View className='challenge-page__join'>
            <View className='challenge-page__join-icon-wrap'>
              <View className='challenge-page__join-icon'>
                <Text className='challenge-page__join-icon-text'>📶</Text>
              </View>
            </View>
            <Text className='challenge-page__join-title'>输入房间码</Text>
            <Text className='challenge-page__join-subtitle'>请输入好友分享的6位房间码</Text>

            <View className='challenge-page__code-input' onClick={() => inputRef.current?.focus?.()}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  className={`challenge-page__code-cell ${i === joinCode.length ? 'challenge-page__code-cell--focus' : ''}`}
                >
                  <Text className='challenge-page__code-char'>{joinCode[i] || ''}</Text>
                </View>
              ))}
              <Input
                ref={inputRef}
                className='challenge-page__code-hidden'
                type='text'
                maxlength={6}
                value={joinCode}
                onInput={handleJoinCodeChange}
                focus={view === 'join'}
              />
            </View>

            <View
              className={`challenge-page__btn challenge-page__btn--primary ${joinCode.length !== 6 ? 'challenge-page__btn--disabled' : ''}`}
              onClick={handleJoinSubmit}
            >
              <Text className='challenge-page__btn-text'>加入对战</Text>
            </View>
          </View>
        )}
      </View>

      {/* Toast */}
      {toast && (
        <View className='challenge-page__toast'>
          <Text className='challenge-page__toast-text'>{toast}</Text>
        </View>
      )}
    </View>
  );
};

export default Challenge;
