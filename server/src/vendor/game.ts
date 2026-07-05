/**
 * weapp-demo-websocket 项目 server/game/game.ts
 * 来源: https://github.com/CFETeam/weapp-demo-websocket
 * 用途: Phase 2 1v1对战判定逻辑
 */

export enum GameChoice {
    Scissors = 1,
    Rock = 2,
    Paper = 3
}

export interface GameData {
    choice: GameChoice;
    roundScore: number;
    totalScore: number;
    winStreak: number;
}

export function judge(choice1: GameChoice, choice2: GameChoice) {
    if (choice1 == choice2) return 0;
    if (!choice1) return 1;
    if (!choice2) return -1;
    return (choice1 - choice2 + 3) % 3 == 1 ? -1 : 1;
}
