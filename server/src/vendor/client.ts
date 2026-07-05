/**
 * weapp-demo-websocket 项目 server/game/client.ts
 * 来源: https://github.com/CFETeam/weapp-demo-websocket
 * 用途: Phase 2 1v1对战客户端管理
 */
export class Client {
    id!: string;
    user: any;
    gameData: any;
    emit!: (event: string, data: any) => void;
    // ... 完整实现在 Phase 2 时补充
}

export type ClientType = Client;
