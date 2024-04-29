import { Context, remove, Session } from 'koishi'
import { Config } from '.'
export const inject = {
    required: ['database'],
}

declare module 'koishi' {
    interface Tables {
        nnNickData: NNNickData
        nnGivenData: NNGivenData
        nnBlacklistData: NNBlacklistData
    }
}

export interface NNNickData {
    nickNameId: number
    ownerUid: string
    nickName: string
}

export interface NNGivenData {
    nickGivenId: number
    ownerUid: string
    giverUid: string
    cid: string
    nickGiven: string
}
//注意是Black"l"ist不是Black"L"ist
export interface NNBlacklistData {
    blacklistId: number
    fromUid: string
    toUid: string
    type: "given" | "dosth"
}

export const nickName = {
    initialize : async (ctx: Context, config: Config) => await nickName._ininitialize(ctx, config),
    getNick : async (session: Session): Promise<string> => await nickName._nick.get(session),
    getNickGiven : async (session: Session, uid: string | string[]): Promise<string | string[]> => await nickName._nickGiven.get(session, uid),
    checkBeBlacklist : async(session: Session, uid: string) => await nickName._blacklist.check(session, uid),

    _nick : {
        //根据输入的session返回session的发送者的自称
        //没有自称则会以群昵称>平台昵称>默认昵称的优先级向后获取
        get : async (session: Session): Promise<string> => {
            const ctx = session.app;
            const uid = session.uid;
            return '';
        },
        
        add: async (session: Session, nickName: string) => {
            const ctx = session.app;
            ctx.database.create('nnNickData', { ownerUid: session.uid, nickName: nickName });
        }

        remove: async (session: Session, nickName: string) => {
            const ctx = session.app;
            ctx.database.remove('nnNickData', { ownerUid: session.uid, nickName: nickName });
        }

    },

    _nickGiven : {
        //根据输入的session和uid返回对应的外号
        //优先从本session发送者为该成员起的外号里随机获取，如果空则从本群组该成员拥有的外号里随机获取
        //若本群组该成员无外号，则以自称>群昵称>平台昵称>默认昵称的优先级向后获取
        get: async (session: Session,uid:string | string[]): Promise<string | string[]> => {
            if (Array.isArray(uid)) 
                return Promise.all(uid.map(async uid => await nickName._nickGiven.get(session,uid) as string));
            const ctx = session.app;
            const platform = session.platform;
            return '';
        },

        add: async (session: Session, uid: string, nickGiven: string) => {
            const ctx = session.app;
            ctx.database.create('nnGivenData', { cid: session.cid, ownerUid: uid, giverUid: session.uid, nickGiven: nickGiven });
        },

        remove: async (session: Session, uid: string, nickGiven: string) => {
            const ctx = session.app;
            ctx.database.remove('nnGivenData', { cid: session.cid, ownerUid: uid, nickGiven: nickGiven });            
        },

        clean: async (session: Session, uid: string) => {
            const ctx = session.app;
            ctx.database.remove('nnGivenData', { cid: session.cid, ownerUid: uid });
        }

    },

    _blacklist : {
        add: async(session: Session, uid: string, type: "given" | "dosth") => {
            const ctx = session.app;
            ctx.database.create('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
        },
        //检测发送者是否被对方拉黑（注意与拉黑方向相反）
        check : async(session: Session, uid: string):Promise<boolean> => {
            return true;
        }
    },

    _ininitialize : async (ctx: Context, config : Config) => {
        if(config.globalEnableNickName) {
            ctx.model.extend('nnNickData', {
                nickNameId: { type: 'unsigned', nullable: false },
                ownerUid: { type: 'string', nullable: false },
                nickName: { type: 'string', nullable: false },
            },{
                primary: 'nickNameId',
                autoInc: true,
            })
        }
        else {
            try {
                ctx.database.drop('nnNickData');
            }
            catch(err) {
                if(!err.message.startsWith('no such table')) throw(err);
            }
        }

        if(config.globalEnableNickNameGiven) {
            //本数据表储存给人起的外号
            ctx.model.extend('nnGivenData', {
                nickGivenId: 'unsigned',
                cid: { type: 'string', nullable: false },
                ownerUid: { type: 'string', nullable: false },
                giverUid: { type: 'string', nullable: false },
                nickGiven: { type: 'string', nullable: false }
            },{
                primary: 'nickGivenId',
                autoInc: true,
                unique: [['cid','nickGiven']]
            })
        }
        else {
            try {
                ctx.database.drop('nnGivenData');
            }
            catch(err) {
                if(!err.message.startsWith('no such table')) throw(err);
            }
        }
        if(config.globalEnableBlacklist) {
            //本数据表储存全部黑名单信息
            //※ toUid 为 0 时表示禁止任何人对自己使用本功能
            ctx.model.extend('nnBlacklistData', {
                blacklistId: 'unsigned',
                fromUid: { type: 'string', nullable: false },   // 拉黑人的一方/不允许对方使用对应功能的一方  
                toUid: { type: 'string', nullable: false },     // 被拉黑的一方/无法对对方使用对应功能的一方  
                type: { type: 'string', nullable: false }      // "given" | "dosth"
            },{
                primary: 'blacklistId',
                autoInc: true,
                unique: [['fromUid', 'toUid','type']]
            })
        }
        else {
            try {
                ctx.database.drop('nnBlacklistData');
            }
            catch(err) {
                if(!err.message.startsWith('no such table')) throw(err);
            }
        }
    }
}