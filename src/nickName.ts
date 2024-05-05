import { Context, Session } from 'koishi'
import { Config } from '.'

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
    init : async (ctx: Context, config: Config): Promise<void> => await nickNameDo._ininitialize(ctx, config),
    getNick: async (session: Session, id?: string | string[]): Promise<string | string[]> => await nickNameDo._nick.get(session, (id?await nickNameDo._id2uid(session, id):undefined)),
    find : async (session: Session, nickGiven: string): Promise<string[]> => await nickNameDo._uid2id(await nickNameDo._find(session, nickGiven)),
    addNick : async (session: Session, nickName: string): Promise<boolean> => await nickNameDo._nick.add(session, nickName),
    removeNick : async (session: Session/*, nickName: string*/): Promise<boolean> => await nickNameDo._nick.remove(session/*, nickName*/),
    getNickGiven : async (session: Session, ownerId?: string | string[], giverId?: string): Promise<string | string[]> => await nickNameDo._nickGiven.get(session, (ownerId? await nickNameDo._id2uid(session, ownerId): undefined), (giverId? await nickNameDo._id2uid(session, giverId): undefined)),
    addNickGiven : async (session: Session, id: string, nickGiven: string): Promise<boolean> => await nickNameDo._nickGiven.add(session, await nickNameDo._id2uid(session, id), nickGiven),
    showNickGiven : async (session: Session, id: string, page?: number) => await nickNameDo._nickGiven.show(session, await nickNameDo._id2uid(session, id), page),
    showOwnNickGiven : async (session: Session, page?: number) => await nickNameDo._nickGiven.show(session, undefined, page),
    countNickGiven : async (session: Session, id?: string): Promise<number> => await nickNameDo._nickGiven.count(session, (id?await nickNameDo._id2uid(session, id):undefined)),
    removeNickGiven : async (session: Session, id: string, nickGiven: string): Promise<boolean> => await nickNameDo._nickGiven.remove(session,await nickNameDo._id2uid(session, id), nickGiven),
    allBlacklistGiven : async (session: Session): Promise<boolean> => await nickNameDo._blacklist.all(session, "given"),
    allBlacklistDosth : async (session: Session): Promise<boolean> => await nickNameDo._blacklist.all(session, "dosth"),
    switchBlacklistGiven : async (session: Session, id: string): Promise<boolean> => await nickNameDo._blacklist.switch(session, await nickNameDo._id2uid(session, id), "given"),
    switchBlacklistDosth : async (session: Session, id: string): Promise<boolean> => await nickNameDo._blacklist.switch(session, await nickNameDo._id2uid(session, id), "dosth"),
    checkBeBlacklistGiven : async (session: Session, id: string): Promise<boolean> => await nickNameDo._blacklist.check(session, await nickNameDo._id2uid(session, id), "given"),
    checkBeBlacklistDosth : async (session: Session, id: string) : Promise<boolean>=> await nickNameDo._blacklist.check(session, await nickNameDo._id2uid(session, id), "dosth"),

    _defaultNickName: '',

    _id2uid : async (session:Session, id: string | string[])=> {
        if (Array.isArray(id)) 
            return Promise.all(id.map(async uid => await nickNameDo._id2uid(session,uid) as string));
        return session.platform + ':' + id
    },

    _uid2id : async (uid: string | string[]) => {
        if (Array.isArray(uid)) 
            return await Promise.all(uid.map(async uid => await nickNameDo._uid2id(uid) as string));
        return uid.replace(/.*:/,'')
    },

    _nick : {
        //根据输入的session返回uid对应的自称，如果只输入session则获取发送者的自称
        //没有自称则会以群昵称>平台昵称>默认昵称的优先级向后获取
        get: async (session: Session, uid?:string | string[]) => {
            let uidBeInput = true;
            if(uid === undefined) {uid = session.uid; uidBeInput = false;}
            if (Array.isArray(uid)) 
                return Promise.all(uid.map(async uid => await nickNameDo._nick.get(session,uid) as string));
            const ctx = session.app;
            let nickName = (await ctx.database.get('nnNickData', { ownerUid: uid }))[0]?.nickName;
            if(nickName) return nickName;
            else try{
                if(session.event.channel.type){
                    const name = session.event.user.name;
                    if(name) return name;
                }
                else{
                    const member = await session.bot.getGuildMember(session.event.guild.id, uid.replace(/.*:/,''))
                    if(member.nick !== '') return member.nick;
                    else if(member.user.name) return member.user.name;
                }
            }
            catch(err){}
            return nickNameDo._defaultNickName;
        },
        add: async (session: Session, nickName: string) => {
            const ctx = session.app;
            await ctx.database.upsert('nnNickData', [{ ownerUid: session.uid, nickName: nickName }]);
            return true;
        },
        remove: async (session: Session/*, nickName: string*/) => {
            const ctx = session.app;
            await ctx.database.remove('nnNickData', { ownerUid: session.uid/*, nickName: nickName*/ });
            return true;
        },

    },

    _nickGiven : {
        //根据输入的session和ownerUid返回对应的外号
        //优先从本session发送者为该成员起的外号里随机获取，如果空则从本群组该成员拥有的外号里随机获取
        //若本群组该成员无外号，则以自称>群昵称>平台昵称>默认昵称的优先级向后获取
        //第三个参数是起外号的人
        get: async (session: Session, ownerUid?:string | string[], giverUid?: string): Promise<string | string[]> => {
            if(ownerUid === undefined) ownerUid = session.uid;
            if( giverUid === undefined ) giverUid = session.uid;
            if (Array.isArray(ownerUid)) 
                return Promise.all(ownerUid.map(async ownerUid => await nickNameDo._nickGiven.get(session,ownerUid) as string));
            const ctx = session.app;
            let nickGivenList = await ctx.database.get('nnGivenData', { cid: session.cid, ownerUid: ownerUid, giverUid: giverUid }); 
            if(nickGivenList.length) {
                return nickGivenList[Math.floor(Math.random() * nickGivenList.length)]['nickGiven'];
            }
            else {
                nickGivenList = await ctx.database.get('nnGivenData', { cid: session.cid, ownerUid: ownerUid })
                if(nickGivenList.length) {
                    return nickGivenList[Math.floor(Math.random() * nickGivenList.length)]['nickGiven'];
                }
            }
            return await nickNameDo._nick.get(session, ownerUid);
        },

        add: async (session: Session, uid: string, nickGiven: string) => {
            const ctx = session.app;
            if(await nickNameDo._blacklist.check(session, uid, "given")) return false;
            try {
                await ctx.database.create('nnGivenData', { cid: session.cid, ownerUid: uid, giverUid: session.uid, nickGiven: nickGiven });
            }
            catch(err) {
                return false;
            }
            return true;
        },
        //注意只有起外号的人和被起外号的人能移除对应的外号
        remove: async (session: Session, uid: string, nickGiven: string) => {
            const ctx = session.app;
            const data = (await ctx.database.get('nnGivenData', { cid: session.cid, ownerUid: uid, nickGiven: nickGiven }))[0];
            if(data.giverUid != session.uid && data.ownerUid != session.uid) return false;
            await ctx.database.remove('nnGivenData', { cid: session.cid, ownerUid: uid, nickGiven: nickGiven });
            return true;
        },

        show: async (session: Session, uid?: string, page?: number) => {
            const ctx = session.app;
            if(uid === undefined)
                uid = session.uid;
            return ctx.database.get('nnGivenData', { cid: session.cid, ownerUid: uid }, {limit : 10 , offset :page?10*(page-1):0})
        },

        count: async (session: Session, uid?: string) => {
            if(uid === undefined)
                uid = session.uid;
            const ctx = session.app;
            return (await ctx.database.get('nnGivenData', { cid: session.cid, ownerUid: uid })).length;
        },
    },

    _blacklist : {
        add: async(session: Session, uid: string, type: "given" | "dosth") => {
            const ctx = session.app;
            await ctx.database.create('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
        },

        remove: async(session: Session, uid: string, type: "given" | "dosth") => {
            const ctx = session.app;
            await ctx.database.remove('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
            if( type == "given" )
                await ctx.database.remove('nnGivenData', { cid: session.cid, ownerUid: session.uid, giverUid: uid });
        },
        //返回true表示拉黑成功
        switch: async(session: Session, uid: string, type: "given" | "dosth") => {
            const ctx = session.app;
            const blacklist = await ctx.database.get('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
            if( blacklist.length == 0 ) {
                await ctx.database.create('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
                return true;
            }
            else await ctx.database.remove('nnBlacklistData', { fromUid: session.uid, toUid: uid, type: type });
            return false;
        },
        //拉黑自己则表示禁止全部人对自己使用对应功能
        all: async(session: Session, type: "given" | "dosth") => {
            const ctx = session.app;
            if( type == "given" ) {
                await ctx.database.remove('nnGivenData', { cid: session.cid, ownerUid: session.uid });
            }
            return await nickNameDo._blacklist.switch(session, session.uid, type);
        },
        //检测发送者是否被对方拉黑（注意与拉黑方向相反）
        check : async(session: Session, uid: string, type: "given" | "dosth"):Promise<boolean> => {
            const ctx = session.app;
            if((await ctx.database.get('nnBlacklistData', { fromUid: uid, toUid: uid, type: type})).length) return true;
            if((await ctx.database.get('nnBlacklistData', { fromUid: uid, toUid: session.uid, type: type })).length) return true;
            return false;
        }
    },
    //根据外号查找对应的用户的uid，
    //优先级群聊内有对应称号的用户>群聊内有对应自称的用户>群聊内有对应群昵称的用户>对应账户名的用户
    _find : async (session: Session, nickGiven: string): Promise<string[]> => {
        const ctx = session.app;
        let ownerUid = [(await ctx.database.get('nnGivenData', { cid: session.cid, nickGiven: nickGiven }))[0]?.ownerUid];
        if(ownerUid[0] !== undefined) return ownerUid;
        else {
            const ownerUidAll = await ctx.database.get('nnNickData', { nickName: nickGiven });
            //对所有具有该称号的用户进行筛选
            ownerUid = await Promise.all(ownerUidAll.map(async data => {
                const ownerId = await nickNameDo._uid2id(data.ownerUid);
                try {
                    await session.bot.getGuildMember(session.event.guild.id, ownerId);
                    return data.ownerUid;
                }
                catch(err) {
                    return '';
                }
            }).filter(async uid => {await uid != ''}));
        }
        if(ownerUid[0] !== undefined) return ownerUid;
        //对群昵称进行筛选，失败则对账户名进行筛选
        else {
            const guildMemverList = (await session.bot.getGuildMemberList(session.event.guild.id)).data;
            ownerUid = guildMemverList.filter(member => member.nick == nickGiven).map(member => session.platform + ':' + member.user.id);
            if( ownerUid[0] !== undefined ) return ownerUid;
            else 
            ownerUid = guildMemverList.filter(member => member.user.name == nickGiven).map(member => session.platform + ':' + member.user.id);
        }
        return ownerUid;
    },
    _ininitialize : async (ctx: Context, config : Config) => {
        nickNameDo._defaultNickName = config.defaultNickName;
        if(config.globalEnableNickName) {
            ctx.model.extend('nnNickData', {
                nickNameId: { type: 'unsigned', nullable: false },
                ownerUid: { type: 'string', nullable: false },
                nickName: { type: 'string', nullable: false },
            },{
                primary: 'nickNameId',
                autoInc: true,
                unique: [['ownerUid','nickName']],
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