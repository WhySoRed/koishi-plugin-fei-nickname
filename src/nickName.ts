import { Context, Session } from 'koishi'
import { Config } from '.'
export const inject = {
    required: ['database'],
}

declare module 'koishi' {
    interface Tables {
        nnUserData: NNUserData
        nnNickData: NNNickData
        nnGivenData: NNGivenData
        nnBlacklistData: NNBlacklistData
    }
}

export interface NNUserData {
    id: number
    userId: string
    platform: string
    mainNickNameId: number
}

export interface NNNickData {
    nickNameId: number
    ownerId: number
    nickName: string
}

export interface NNGivenData {
    givenNameId: number
    ownerId: number
    giverId: number
    guildId: string
    nickNameGiven: string
}
//注意是Black"l"ist不是Black"L"ist
export interface NNBlacklistData {
    blacklistId: number
    blacklistFrom: number
    blacklistTo: number
    blacklistType: "given" | "dosth"
}

export const nickName = {
    initialize : async (ctx: Context, config: Config) => await nickName._ininitialize(ctx, config),
    getNick : async (session: Session):Promise<string> => await nickName._nick.get(session),
    getNickGiven : async (session: Session, userId: string | string[]): Promise<string | string[]> => await nickName._nickGiven.get(session, userId),
    checkBeBlacklist : async(session: Session, userId: string) => await nickName._blacklist.check(session, userId),

    _nick : {
        //根据输入的session返回session的发送者的自称
        //没有自称则会以群昵称>平台昵称>默认昵称的优先级向后获取
        get : async (session: Session):Promise<string> => {
            const ctx = session.app;
            const platform = session.platform;
            const userId = session.event.user.id;
            return '';
        },
    },

    _nickGiven : {
        //根据输入的session和userId返回对应的外号
        //优先从本session发送者为该成员起的外号里随机获取，如果空则从本群组该成员拥有的外号里随机获取
        //若本群组该成员无外号，则以自称>群昵称>平台昵称>默认昵称的优先级向后获取
        get: async (session: Session, userId:string | string[]): Promise<string | string[]> => {
            if (Array.isArray(userId)) 
                return Promise.all(userId.map(async userId => await nickName._nickGiven.get(session, userId) as string));
            const ctx = session.app;
            const platform = session.platform;
            return '';
        },
    },

    _blacklist : {
        add: async() => {

        },
        //检测发送者是否被对方拉黑（注意与拉黑方向相反）
        check : async(session: Session, userId: string):Promise<boolean> => {
            return true;
        }
    },

    _ininitialize : async (ctx: Context, config : Config) => {
        ctx.model.extend('nnUserData', {
            id: 'unsigned',
            userId: { type: 'string',nullable: false },
            platform: { type: 'string',nullable: false },
            mainNickNameId: { type: 'unsigned', initial: 0 },       //此数据为0时表示无自称
        },{
            primary: 'id',
            autoInc: true,
            unique: [['userId','platform']]
        })
        
        if(config.globalEnableNickName) {
            ctx.model.extend('nnNickData', {
                nickNameId: { type: 'unsigned', nullable: false },
                ownerId: { type: 'unsigned', nullable: false },
                nickName: { type: 'string', nullable: false },
            },{
                primary: 'nickNameId',
                autoInc: true,
                foreign:{
                    ownerId: ['nnUserData', 'id']
                }
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
            //本数据表储存
            ctx.model.extend('nnGivenData', {
                givenNameId: 'unsigned',
                guildId: { type: 'string', nullable: false },
                ownerId: { type: 'unsigned', nullable: false },
                giverId: { type: 'unsigned', nullable: false },
                nickNameGiven: { type: 'string', nullable: false }
            },{
                primary: 'givenNameId',
                autoInc: true,
                foreign: {
                    ownerId: ['nnUserData', 'id'],
                    giverId: ['nnUserData', 'id']
                },
                unique: [['guildId','nickNameGiven']]
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
            //※ blacklistTo 为 0 时表示禁止任何人对自己使用本功能
            ctx.model.extend('nnBlacklistData', {
                blacklistId: 'unsigned',
                blacklistFrom: { type: 'unsigned', nullable: false },   // 拉黑人的一方/不允许对方使用对应功能的一方  
                blacklistTo: { type: 'unsigned', nullable: false },     // 被拉黑的一方/无法对对方使用对应功能的一方  
                blacklistType: { type: 'string', nullable: false }      // "given" | "dosth"
            },{
                primary: 'blacklistId',
                autoInc: true,
                foreign: {
                    blacklistFrom: ['nnUserData', 'id'],
                    blacklistTo: ['nnUserData', 'id']
                },
                unique: [['blacklistFrom', 'blacklistTo','blacklistType']]
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