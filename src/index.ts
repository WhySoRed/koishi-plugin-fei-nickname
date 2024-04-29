import { Context, Schema, h, Session } from 'koishi'
import { nickName } from './nickName';

export const name = 'fei-nickname'

export interface Config {
    defaultNickName:string
    globalEnableNickName: boolean
    globalEnableNickNameGiven: boolean
    globalEnableDoSomeThing: boolean
    globalEnableBlacklist: boolean
}

export const Config: Schema<Config> = Schema.object({
    defaultNickName: Schema.string().default('那个谁').description('获取用户名失败时的默认名称'),
    globalEnableNickName: Schema.boolean().default(true).description('开启“自称”功能，关闭会清空自称数据'),
    globalEnableNickNameGiven: Schema.boolean().default(true).description('开启“外号”功能，关闭会清空外号数据'),
    globalEnableDoSomeThing: Schema.boolean().default(true).description('开启“呼唤”功能，关闭也不会清空什么数据'),
    globalEnableBlacklist: Schema.boolean().default(true).description('开启“拉黑”子功能，关闭会清空黑名单数据'),
})

interface nickName {
    initialize : (ctx: Context, config: Config) => {}
    getNick: (session: Session)=> string
    getNickGiven: (session: Session,userId: string | string[]) => string | string[]
}

export function apply(ctx: Context, config: Config) {
    nickName.initialize(ctx, config);

    ctx.command('外号测试').action(async ({ session }) => {
        return (session.username);
    })

    if(config.globalEnableNickName) {
        ctx.command('自称').action(({ session }) => {
            return session.event.user.name;
        })
    }

    if(config.globalEnableNickNameGiven) {

        ctx.command('外号').action(({ session }) => {
            return session.event.user.name;
        })

        ctx.command('外号.起外号').action(({ session }) => {
            return session.event.user.name;
        })

        ctx.command('外号.取消外号').action(({ session }) => {
            return session.event.user.name;
        })

        ctx.command('外号.取消全部外号').action(({ session }) => {
            return session.event.user.name;
        })

        //外号.给 @... 起外号 ...
        //外号.给 @... 取消外号 ...
        //外号.给 @... 取消全部外号
        ctx.command('外号.给').action(({ session }) => {
            return session.event.user.name;
        })

        if(config.globalEnableBlacklist) {
            ctx.command('外号.拉黑').action(({ session }) => {
                return session.event.user.name;
            })
        }
    
    }

    if(config.globalEnableDoSomeThing) {

        ctx.command('呼唤').action(({ session }) => {
            return session.event.user.name;
        })
        ctx.command('呼唤.测试').action(({ session }) => {
            return '我的命运啊，我听到了，那是你在唱歌吗？'
        })
        if(config.globalEnableBlacklist) {
            ctx.command('呼唤.拉黑').action(({ session }) => {
                return session.event.user.name;
            })
        }
    }
}
