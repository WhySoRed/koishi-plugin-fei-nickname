import { Context, Schema, h, Session } from 'koishi'
import { nickNameDo } from './nickName';

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

interface nickNameDo {
    init : (ctx: Context, config: Config) => void
    getNick: (session: Session, id?: string | string[]) => Promise <string | string[]>
    getNickGiven: (session: Session,uid?: string | string[]) => string | string[]
}

export function apply(ctx: Context, config: Config) {
    nickNameDo.init(ctx, config);

    ctx.command('外号测试').action(async ({ args, session }) => {
        console.log(h.select(args[0],'at'))
        if(args[0])
            return await nickNameDo.getNickGiven(session, h.select(args[0],'at')[0].attrs.id);
        console.log(await ctx.database.get('nnGivenData',{}))
        return await nickNameDo.getNick(session);
    })

    if(config.globalEnableNickName) {
        ctx.command('自称').action(({ session }) => {
            return session.event.user.name;
        })

        ctx.command('自称.设定').action(({ session }) => {

        })

        ctx.command('自称.取消').action(({ session }) => {

        })
    }

    if(config.globalEnableNickNameGiven) {

        ctx.command('外号').action(({ session }) => {
            return session.event.user.name;
        })

        ctx.command('外号.设定').alias('起外号')
        .action(async ({ args, session }) => {
            if(args[0] && args[1]) {
                if(await nickNameDo.addNickGiven(session, h.select(args[0],'at')[0].attrs.id, args[1]))
                    return '起了起了';
                else return '起不了起不了';
            }
        })

        ctx.command('外号.取消').alias('取消外号')
        .action(({ session }) => {
            return session.event.user.name;
        })

        //外号.给 @... 起外号 ...
        //外号.给 @... 取消外号 ...
        ctx.command('外号.给').action(({ args, session }) => {
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

        ctx.command('呼唤.找').action(({ session }) => {
            
        })
        
        if(config.globalEnableBlacklist) {
            ctx.command('呼唤.拉黑').action(({ session }) => {
                return session.event.user.name;
            })
        }
    }
}
