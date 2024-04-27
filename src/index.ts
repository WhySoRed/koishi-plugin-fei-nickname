import { Context, Schema } from 'koishi'
import {} from '@koishijs/plugin-help';
import { Session } from 'inspector';
import { platform } from 'os';
export const inject = {
    required: ['database']
}

export const name = 'fei-nickname'

export interface Config {
    defaultNickName:string
    globalEnableDoSomeThing:boolean
}

export const Config: Schema<Config> = Schema.object({
    defaultNickName: Schema.string().default('那个谁').description('获取用户名失败时的默认名称'),
    globalEnableDoSomeThing: Schema.boolean().default(true).description('开启动手动脚功能'),
})

export const nickName = {
    //根据输入的session返回session的发送者的自称
    //没有自称则会以群昵称>平台昵称>默认昵称的优先级向后获取
    getSelfName : async (session:any) => {
        const ctx = session.app;
        const platform = session.platform;
        const userId = session.event.user.id;
        const userData = (await ctx.database.get('nickNameUserData',{ platform, userId }))[0]
        if(userData.nameBeSet)
            return userData.nickName;
        else if(session.event.member.nick)
            return session.event.member.nick;
        else if(session.event.user.name)
            return session.event.user.name;
        else
            return userData.nickName;
    },
    //根据输入的session和text，获取text中包含的<at id="(平台id)">的id
    //返回一个这些id转换为名字的数组
    //优先级是session发送者给对方的外号>自称>群昵称>平台昵称>默认昵称
    getNickNameGivenFromText : async (session: any, text: string) => {
        const ctx = session.app;
        const match = Array.from(text.matchAll(/<at id="(\d+)"\/>/g));
        if (match.length === 0) return [];
        const platform = session.platform;
        return match.map((element) => element[1]).map(async (userId) => {
            const callerUserId = session.event.user.id;
            const receiverUserId = userId;
            const nickNameGiven = (await ctx.database.get('nickNameGivenData',{ platform, callerUserId, receiverUserId}))[0]?.nickNameGiven;
            if(nickNameGiven)
                return nickNameGiven;
            else {
                const userId = receiverUserId;
                const userData = (await ctx.database.get('nickNameUserData',{ platform, userId }))[0]
                if(!session.event.channel.type) {
                    const member = await session.bot.getGuildMember(session.guildId, userId);
                    if(member)
                        return member.nick? member.nick: member.user.name;
                }
                return userData.nickName;
            }
        })
    }
}

declare module 'koishi' {
    interface Tables {
        nickNameUserData: NickNameUserData
        nickNameGivenData: NickNameGivenData
    }
}

export interface NickNameUserData {
    id: number
    userId: string
    platform: string
    nickName: string
    nameBeSet: boolean
    enableNickNamed: boolean
    enableDoSomeThing: boolean
    nickNamedBlacklist: string[]
    doSomeThingBlacklist: string[]
}

export interface NickNameGivenData {
    platform: string
    callerUserId: string
    receiverUserId: string
    nickNameGiven: string
}

export function apply(ctx: Context, config: Config) {

    ctx.model.extend('nickNameUserData', {
        id: 'unsigned',
        userId: { type: 'string',nullable: false },
        platform: { type: 'string',nullable: false },
        nickName: { type: 'string', initial: config.defaultNickName },
        nickNameBeSet: { type: 'boolean', initial: false },
        enableNickNameGiven: { type: 'boolean', initial: true },
        enableDoSomeThing: { type: 'boolean', initial: true },
        nickNamedGivenBlacklist: 'list',
        doSomeThingBlacklist: 'list'
    },{
        primary: 'id',
        autoInc: true,
        unique: [['platform','userId']]     // 用键值对的唯一性保证单一平台的单一用户的自称
    })

    // 该数据表用于储存caller对receiver的nickName关系
    ctx.model.extend('nickNameGivenData', {
        platform: 'string',
        callerUserId: 'string',
        receiverUserId: 'string',
        nickNameGiven: 'string',
    },{
        primary: ['platform','callerUserId','receiverUserId'],           // ※ 确保这一关系的唯一性 ※
    })

    ctx.command('外号测试').action(async (_) => {
        console.log(_.session.user);
        console.log(_.session.event.message.content);
    })


    ctx.command('外号').action((_) => {
        return '';
    })

    ctx.command('外号.设定自称').action(() => {
        return '';
    })

    ctx.command('外号.取消自称').action(() => {
        return '';
    })

    ctx.command('外号.我被别人取的外号').action(({ session }) => {
        return '';
    })

    ctx.command('外号.我给别人取的外号').action(() => {
        return '';
    })

    ctx.command('外号.给 @对方 起外号 xxx/取消外号').action(async (_) => {
        
        if( _.session.event.channel.type ) return '这个只能在群里玩哦';
        //用户输入 给 @xx 起外号 xx
        if(  _.args[1] === '起外号' ) {
            if (_.args.length != 3) return '要起什么呀...我不太明白' 
            const match = _.args[0].match(/<at id="(\d+)"\/>/)
            if (match) {
                try {
                    const member = await _.session.bot.getGuildMember(_.session.guildId, match[1]);
                    return (member.nick? member.nick: member.user.name) + '是' + _.args[2] + '呀';
                }
                catch {
                    return '这里有这个人吗...？'
                }
            }
            else
                return '没艾特到啊';
        }
        //用户输入 给 @xx 取消外号
        else if( _.args[1] === '取消外号' ) {
            
        }
        else return '指令格式太不对，空格记得分开哦' 
    })

    //禁止起外号并清空外号
    ctx.command('外号.不许给我取外号').action(() => {

        return '';
    })
    
    ctx.command('外号.允许给我起外号').action(() => {
        return '';
    })

    ctx.command('外号.我要 <做的事情> @对方/外号',).action(async (_) => {
        if (!config.globalEnableDoSomeThing) return '本功能未开放~'
        const match = _.args[1].match(/<at id="(\d+)"\/>/)
        if (match) {
            try {
                const member = await _.session.bot.getGuildMember(_.session.guildId, match[1]);
                return _.session.username + _.args[0] + '了一下' +  (member.nick? member.nick: member.user.name) + '~';
            }
            catch {
                return '这里有这个人吗...？'
            }
        }
        else
            return '没艾特到啊';
    })

    ctx.command('外号.不许对我动手动脚').action(() => {
        return '';
    })
    ctx.command('外号.允许对我动手动脚').action(() => {
        return '';
    })

}