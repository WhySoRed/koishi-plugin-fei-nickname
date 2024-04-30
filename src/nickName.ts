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

export const nickNameDo = {
    defaultNickName: '',
    initialize : async (ctx: Context, config: Config) => await nickNameDo._ininitialize(ctx, config),
    getNick : async (session: Session): Promise<string> => await nickNameDo._nick.get(session),
    getNickByUid : async (session: Session, uid: string | string[]): Promise<string | string[]> => await nickNameDo._nick.getByUid(session, uid),
    getNickGiven : async (session: Session, uid: string | string[]): Promise<string | string[]> => await nickNameDo._nickGiven.get(session, uid),
    addNick : async (session: Session, nickName: string) => await nickNameDo._nick.add(session, nickName),
    addNickGiven : async (session: Session, uid: string, nickGiven: string) => await nickNameDo._nickGiven.add(session, uid, nickGiven),
    removeNick : async (session: Session, nickName: string) => await nickNameDo._nick.remove(session, nickName),
    removeNickGiven : async (session: Session, uid: string, nickGiven: string) => await nickNameDo._nickGiven.remove(session, uid, nickGiven),
    switchBlacklistGiven : async (session: Session, uid: string) => await nickNameDo._blacklist.switch(session, uid, "given"),
    switchBlacklistDosth : async (session: Session, uid: string) => await nickNameDo._blacklist.switch(session, uid, "dosth"),
    allBlacklistGiven : async (session: Session) => await nickNameDo._blacklist.all(session, "given"),
    allBlacklistDosth : async (session: Session) => await nickNameDo._blacklist.all(session, "dosth"),
    checkBeBlacklist : async(session: Session, uid: string) => await nickNameDo._blacklist.check(session, uid),

    id2uid : (session:Session, id: string) => session.platform + ':' + id,

    _nick : {
        //根据输入的session返回session的发送者的自称
        //没有自称则会以群昵称>平台昵称>默认昵称的优先级向后获取
        get : async (session: Session): Promise<string> => {
            const ctx = session.app;
            const uid = session.uid;
            let nickName = (await ctx.database.get('nnNickData', { ownerUid: uid }))[0]?.nickName;
            if(nickName) return nickName;
            else if(session.event.member.nick) return session.event.member.nick;
            else if(session.event.user.name) return session.event.user.name;
            else return nickNameDo.defaultNickName;
        },
        //同上，但是根据uid
        getByUid: async (session: Session, uid:string | string[]) => {
            if (Array.isArray(uid)) 
                return Promise.all(uid.map(async uid => await nickNameDo._nick.getByUid(session,uid) as string));
            const ctx = session.app;
            let nickName = (await ctx.database.get('nnNickData', { ownerUid: uid }))[0]?.nickName;
            if(nickName) return nickName;
            else {
                try{
                    const member = await session.bot.getGuildMember(session.event.guild.id, uid.replace(/.*:/,''))
                    if(member.nick) return member.nick;
                    else if(member.user.name) return member.user.name;
                    else return nickNameDo.defaultNickName;
                }
                catch(err){
                return nickNameDo.defaultNickName;
                }
            }
        },

        add: async (session: Session, nickName: string) => {
            const ctx = session.app;
            ctx.database.upsert('nnNickData', [{ ownerUid: session.uid, nickName: nickName }]);
        },

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
                return Promise.all(uid.map(async uid => await nickNameDo._nickGiven.get(session,uid) as string));
            const ctx = session.app;
            let nickGiven = (await ctx.database.get('nnGivenData', { cid: session.cid, ownerUid: uid, giverUid: session.uid }))[0]?.nickGiven; 
            if(nickGiven) return nickGiven;
            else return await nickNameDo._nick.getByUid(session, uid);
        },

        add: async (session: Session, uid: string, nickGiven: string) => {
            const ctx = session.app;
            if(await nickNameDo._blacklist.check(session, uid)) return false;
            ctx.database.create('nnGivenData', { cid: session.cid, ownerUid: uid, giverUid: session.uid, nickGiven: nickGiven });
            return true;
        },
        //注意只有起外号的人和被起外号的人能移除对应的外号
        remove: async (session: Session, uid: string, nickGiven: string) => {
            const ctx = session.app;
            ctx.database.remove('nnGivenData', { cid: session.cid, ownerUid: uid, nickGiven: nickGiven });            
        },

        show: async (session: Session, uid: string, page?: number) => {
            const ctx = session.app;
            return ctx.database.select('nnGivenData', { cid: session.cid, ownerUid: uid })
                    .limit(10).offset(page?10*(page-1):0).orderBy('nickGivenId');
        }


    },

    _blacklist : {
        add: async(session: Session, uid: string, type: "given" | "dosth") => {
            const ctx = session.app;
            await ctx.database.create('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
        },

        remove: async(session: Session, uid: string, type: "given" | "dosth") => {
            const ctx = session.app;
            await ctx.database.remove('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
        },

        switch: async(session: Session, uid: string, type: "given" | "dosth") => {
            const ctx = session.app;
            const blacklist = await ctx.database.get('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
            if( blacklist.length == 0 ) await ctx.database.create('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
            else await ctx.database.remove('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
        },
        //拉黑自己则表示禁止全部人对自己使用对应功能
        all: async(session: Session, type: "given" | "dosth") => {
            return await nickNameDo._blacklist.switch(session, session.uid, type);
        },
        //检测发送者是否被对方拉黑（注意与拉黑方向相反）
        check : async(session: Session, uid: string):Promise<boolean> => {
            const ctx = session.app;
            if(await ctx.database.get('nnBlacklistData', { fromUid: uid, toUid: uid })) return true;
            if(await ctx.database.get('nnBlacklistData', { fromUid: uid, toUid: session.uid })) return true;
            return true;
        }
    },

    _ininitialize : async (ctx: Context, config : Config) => {
        nickNameDo.defaultNickName = config.defaultNickName;
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
            //※ toUid 为自己 时表示禁止任何人对自己使用本功能
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