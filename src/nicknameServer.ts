import { Context, Session, Service } from 'koishi'
import { nickNameDo, NNNickData, NNGivenData, NNBlacklistData } from './nickName';

declare module 'koishi' {
    interface Context {
        nickname: Nickname
    }

    interface Tables {
        nnNickData: NNNickData
        nnGivenData: NNGivenData
        nnBlacklistData: NNBlacklistData
    }
}

export class Nickname extends Service {
    public inject = ['database']
    public name = 'nickname'

    constructor(ctx: Context) {super(ctx, 'nickname', true)};
    
    async getNick(session: Session, id?: string | string[]) {
        return await nickNameDo.getNick(session, id);
    }
    async getNickGiven(session: Session, ownerId?: string | string[], giverId?: string) {
        return await nickNameDo.getNickGiven(session, ownerId, giverId);
    }
    async find(session: Session, name: string) {
        return await nickNameDo.find(session, name);
    }
}
