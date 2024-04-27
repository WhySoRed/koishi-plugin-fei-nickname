import { Context, Schema } from 'koishi'
import {} from '@koishijs/plugin-help';
import { Session } from 'inspector';
import { platform } from 'os';
export const inject = {
    required: ['database']
}

export const name = 'fei-nickname'

export interface Config {
    isQQofficalBot:boolean
    defaultNickName:string
    globalEnableDoSomeThing:boolean
}

export const Config: Schema<Config> = Schema.object({
    isQQofficalBot: Schema.boolean().default(false).description('是否是qq官方机器人(无法获取用户名)'),
    defaultNickName: Schema.string().default('那个谁').description('获取用户名失败时的默认名称'),
    globalEnableDoSomeThing: Schema.boolean().default(true).description('开启动手动脚功能'),
})

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
    enableNickNamedBlacklist: string[]
    enableDoSomeThingBlacklist: string[]
}

export interface NickNameGivenData {
    callerUserId: number
    receiverUserId: number
    nickName: string
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
        unique: [['platform','userId']]
    })

    //这个数据表用于储存caller对receiver起了nickName这个外号这一关系
    ctx.model.extend('nickNameGivenData', {
        nickNameGiven: {type :'string'},
        callerUserId: 'unsigned',
        receiverUserId: 'unsigned',
    },{
        primary: ['callerUserId','receiverUserId'],           //※ 用[Aid,Bid]作为主键来确保这一关系的唯一性 ※
        foreign: {'callerUserId': ['nickNameUserData', 'id'],
                  'receiverUserId': ['nickNameUserData', 'id']}
    })

    ctx.command('外号测试',).action(async (_) => {
        return JSON.stringify(_.session.event.platform);
    })


    ctx.command('外号',).action((_) => {
        return '';
    })

    ctx.command('外号.我叫',).action(() => {
        return '';
    })

    ctx.command('外号.取消自称',).action(() => {
        return '';
    })

    ctx.command('外号.我被别人取的外号',).action(() => {
        return '';
    })

    ctx.command('外号.我给别人取的外号',).action(() => {
        return '';
    })

    ctx.command('外号.给 @对方 起外号 xxx/取消外号',).action(async (_) => {
        
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

    //禁止起外号并清空外号
    ctx.command('外号.不许给我取外号',).action(() => {

        return '';
    })
    
    ctx.command('外号.允许给我起外号',).action(() => {
        return '';
    })

    ctx.command('外号.不许对我动手动脚',).action(() => {
        return '';
    })
    ctx.command('外号.允许对我动手动脚',).action(() => {
        return '';
    })
}
