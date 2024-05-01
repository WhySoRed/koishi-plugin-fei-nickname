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

    ctx.command('外号测试 <message:text>').action(async ({ session }, message) => {
        console.log(message);
        // if(args[0])
        //     return await nickNameDo.getNickGiven(session, h.select(args[0],'at')[0].attrs.id);
    })
    //开启自称
    if(config.globalEnableNickName) {

        ctx.command('自称').action(async ({ session }) => {
            return `你当前的自称是${await nickNameDo.getNick(session)}
使用“自称.设定 [自称]”来更改自称
使用“自称.取消”来恢复默认`
        })

        ctx.command('自称.设定').alias('设定自称')
        .action(async ({ session }, message) => {
            if(!message) return '请提供自称';
            await nickNameDo.addNick(session, message);
            return `自称已经更改为${message}`
        })

        ctx.command('自称.取消').alias('取消自称')
        .action(async ({ session }) => {
            await nickNameDo.removeNick(session);
            return '设定的自称已取消'
        })
    }

    if(config.globalEnableNickNameGiven) {

        ctx.command('外号').action(async ({ session }) => {
            return `
你现在在本群有${await nickNameDo.countNickGiven(session)}个外号`;
        })

        ctx.command('外号.设定').alias('起外号')
        .action(async ({ args, session }) => {
            if(h.select(args[0],'at').length != 1) return '请确定是否正确艾特了对方';
            if(args[1] === undefined) return '请提供外号';
            if(args.length > 2) return '外号不能有空格';
            if(await nickNameDo.addNickGiven(session, h.select(args[0],'at')[0].attrs.id, args[1]))
                return '起了起了';
            else return '你没办法给这个人起外号耶';
        })

        ctx.command('外号.取消').alias('取消外号')
        .action(async ({ args, session }) => {
            if(h.select(args[0],'at').length != 1) return '请确定是否正确艾特了对方';
            if(args[1] === undefined) return '请提供外号';
            if(await nickNameDo.removeNickGiven(session, h.select(args[0],'at')[0].attrs.id, args[1]))
                return `已经取消了${args[1]}这个外号`;
            else return '取消失败，只有起这个外号的人和被起外号的人可以取消，或者你要取消的外号不存在';
        })

        //外号.给 @... 起外号 ...
        //外号.给 @... 取消外号 ...
        ctx.command('外号.给').alias('外号给')
        .action(({ args, session }) => {
            if(args[0] === undefined) return `
指令格式
外号.给 [@你要起外号的人] 起外号 [外号]
外号.给 [@你要取消外号的人] 取消外号`; 
            return session.event.user.name;
        })

        ctx.command('外号.列表').alias('外号列表')
        .action(async ({ args, session }) => {
            if(h.select(args[0],'at').length !== 1 && args[0] !== undefined) return '指令格式有误' 
            const nickGivenList = (args[0] === undefined)? await nickNameDo.showOwnNickGiven( session ) : await nickNameDo.showNickGiven( session, h.select(args[0],'at')[0].attrs.id );
            if(nickGivenList.length === 0) return '还没有外号呀';
        })

        if(config.globalEnableBlacklist) {
            ctx.command('外号.拉黑').alias('外号拉黑')
            .action(async({ args,session }) => {
                if( args[0] === undefined) {
                    if(await nickNameDo.allBlacklistGiven(session))
                        return `已禁止任何人给你起外号，再发送本指令可以取消`;
                    else 
                        return `已取消禁止，现在可以被起外号了`;
                }
                else if(session.event.user.id === h.select(args[1],'at')[0].attrs.id){
                    return '你在干嘛...';
                }
                else if(h.select(args[1],'at').length === 1){
                    if(await nickNameDo.switchBlacklistGiven(session, h.select(args[1],'at')[0].attrs.id))
                        return `已禁止${args[1]}给你起外号，再发送本指令可以取消`;
                    else
                        return `已取消禁止，现在可以被${args[1]}起外号了`;
                }
                return '指令不太对劲呀';
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
