import { Context, Schema, h, Session, Command } from 'koishi'
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

export const usage = `本插件提供了一些外号与自称相关的一些功能，以及“呼唤”这个功能来使用他们

（同时给作者自己提供了
nickNameDo.getNick(session, id?) -优先获取自称
nickNameDo.getNickGiven(session, Ownerid?, GiverId?) -优先获取外号
这两个方法，以便在其他插件中使用...`

interface nickNameDo {
    init : (ctx: Context, config: Config) => void
    getNick: (session: Session, id?: string | string[]) => Promise <string | string[]>
    getNickGiven: (session: Session,uid?: string | string[]) => string | string[]
}

export function apply(ctx: Context, config: Config) {
    nickNameDo.init(ctx, config);
    //开启自称
    if(config.globalEnableNickName) {

        ctx.command('自称').action(async ({ session }) => {
            return `你当前的自称是${await nickNameDo.getNick(session)}
指令格式：
自称.设定 [自称]”来更改自称
自称.取消”来恢复默认`
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
你现在在本群有${await nickNameDo.countNickGiven(session)}个外号
指令格式：
外号.设定 [@对方] [外号] 来给别人起外号
外号.取消 [@对方] [外号] 来取消别人的外号
外号.给 [@对方] 起外号 [外号] 来给别人起外号
外号.给 [@对方] 取消外号 [外号] 来取消别人的外号
外号.查看 [@对方] 来查看别人的外号
外号.查看 来查看自己的外号
外号.拉黑 [@对方] 来禁止对方给你起外号（并清除对方给你的外号）
外号.拉黑 来禁止所有人给你起外号（并清除你的全部外号）`;
        })

        ctx.command('外号.设定').alias('.起外号', '起外号')
        .action(async ({ args, session }) => {
            if(h.select(args[0],'at').length != 1) return '请确定是否正确艾特了对方';
            if(args[1] === undefined) return '请提供外号';
            if(args.length > 2) return '外号不能有空格';
            if(await nickNameDo.checkBeBlacklistGiven(session, h.select(args[0],'at')[0].attrs.id)) return '你被对方拉黑了，不能给ta起外号';
            if(await nickNameDo.addNickGiven(session, h.select(args[0],'at')[0].attrs.id, args[1]))
                return `你给 ${await nickNameDo.getNick(session,h.select(args[0],'at')[0].attrs.id)} 起了外号 ${args[1]} `;
            else return `同一个群不可以有重复的外号哦`;
        })

        ctx.command('外号.取消').alias('取消外号')
        .action(async ({ args, session }) => {
            if(h.select(args[0],'at').length != 1) return '请确定是否正确艾特了对方';
            if(args[1] === undefined) return '请提供外号';
            if(await nickNameDo.removeNickGiven(session, h.select(args[0],'at')[0].attrs.id, args[1]))
                return `已经取消了${args[1]}这个外号`;
            else return '取消失败，只有起这个外号的人和被起外号的人可以取消，或者你要取消的外号不存在';
        })

        ctx.command('外号.给').alias('外号给')
        .action(({ args, session }) => {
            if(args[0] === undefined) return `
指令格式：
外号.给 [@对方] 起外号 [外号]
外号.给 [@对方] 取消外号 [外号]`; 
            if( h.select(args[0],'at').length != 1) return '请确定是否正确艾特了对方';
            if(args[1] === '起外号' || args[1] === '起') {
                session.execute( `外号.设定 ${args[0]} ${args[2]}`)
            }
            else if(args[1] === '取消外号' || args[1] === '取消') {
                session.execute( `外号.取消 ${args[0]} ${args[2]}`)
            }
            else return '指令不太对劲呀';
        })

        ctx.command('外号.查看').alias('外号查看')
        .action(async ({ args, session }) => {
            let nickNameData = [], nickNameCount = 0, page:number;
            //查看自己的外号
            if(h.select(args[0],'at').length === 0) {
                if(args[0] === undefined) {
                    nickNameData = await nickNameDo.showOwnNickGiven(session);
                    if(nickNameData.length === 0) return '你在这个群还没有外号';
                }
                else if(Number.isNaN(+args[0])) return '页数有误';
                else {
                    page = +args[0];
                    nickNameData = await nickNameDo.showOwnNickGiven(session, page);
                    if(nickNameData.length === 0) return '这一页没有外号';
                }
                nickNameCount = await nickNameDo.countNickGiven(session);
            }
            //查看别人的外号
            else if(h.select(args[0],'at').length === 1) {
                if(args[1] === undefined) {
                    nickNameData = await nickNameDo.showNickGiven(session, h.select(args[0],'at')[0].attrs.id);
                    if(nickNameData.length === 0) return `${await nickNameDo.getNick(session,h.select(args[0],'at')[0].attrs.id)} 在这个群还没有外号呀`;
                }
                else if(Number.isNaN(+args[1])) return '页数有误';
                else {
                    page = +args[1];
                    nickNameData = await nickNameDo.showNickGiven(session, h.select(args[0],'at')[0].attrs.id, page);
                    if(nickNameData.length === 0) return '这一页没有外号';
                }
                nickNameCount = await nickNameDo.countNickGiven(session, h.select(args[0],'at')[0].attrs.id);
            }
            else return '指令不太对劲呀';

            let nickNameString = '外号列表如下：\n' + (page === undefined?'':`第${page}页：\n`);
            for(let i = 0; i < nickNameData.length; i++) {
                nickNameString += `${nickNameData[i].nickGiven} 是 ${await nickNameDo.getNick(session, nickNameData[i].from)} 起的\n`;
            }
            return nickNameString + `共有${nickNameCount}个外号${nickNameCount > 10?'，剩余外号可以输入对应的页数来查看':''}`;
        })

        if(config.globalEnableBlacklist) {
            ctx.command('外号.拉黑').alias('外号拉黑')
            .action(async({ args,session }) => {
                if( args[0] === undefined) {
                    if(await nickNameDo.allBlacklistGiven(session))
                        return `已禁止任何人给你起外号，你的外号也清空啦，要再发送本指令才会允许~`;
                    else 
                        return `现在可以被起外号了~`;
                }
                else if(session.event.user.id === h.select(args[1],'at')[0].attrs.id){
                    return '你在干嘛...';
                }
                else if(h.select(args[1],'at').length === 1){
                    if(await nickNameDo.switchBlacklistGiven(session, h.select(args[1],'at')[0].attrs.id))
                        return `已禁止${await nickNameDo.getNick(session,h.select(args[1],'at')[0].attrs.id)}给你起外号，ta给你起的外号也清空啦，要再发送本指令才会允许~`;
                    else
                        return `已取消禁止，现在可以被${await nickNameDo.getNick(session,h.select(args[1],'at')[0].attrs.id)}起外号了`;
                }
                return '指令不太对劲呀';
            })
        }
    
    }

    if(config.globalEnableDoSomeThing) {

        ctx.command('呼唤').action(({ session }) => {
            return `
指令格式：
呼唤.找 [对方的外号] 来找人
呼唤.我要 [动作] [对方的外号/@对方] 来做一些事情
呼唤.拉黑 [@对方] 来禁止对方对你使用这个指令
呼唤.拉黑 来禁止所有人对你使用这个指令`
        })

        ctx.command('呼唤.找').alias('呼唤找')
        .action(async ({ args, session }, message) => {
            const findId = await nickNameDo.find(session, message);
            if(findId.length === 0) return '没有找到这个人呀';
            if(findId.length === 1) {
                if(findId[0] === session.selfId) return '你在找我吗？';
                if(findId[0] === session.event.user.id) return '你在找自己吗？';
                if(await nickNameDo.checkBeBlacklistDosth(session, findId[0]))
                    return await nickNameDo.getNick(session, findId[0]) + '把你拉黑了，不能找ta~';
                const senderNick = await nickNameDo.getNickGiven(session, session.event.user.id , findId[0]);
                return '喂？喂~ ' + h.at(findId[0]) + ' ' +(message.length < 4?`${message}${message}`:message) + '，' + (senderNick === config.defaultNickName? '有人': senderNick) +'找你呀';
            }
            if(findId.length > 1) {
                if(args[1] === undefined){
                    let findString = '找到了好几个人呀，你要找的是：\n';
                    for(let i = 0; i < findId.length; i++) {
                        findString += `${i+1}. ${await nickNameDo.getNick(session, findId[i])} 账号：${findId[i]}\n`;
                    }
                    findString += '里面的谁呀？在后面带上序号再发送一次指令就可以了';
                }
                else if(Number.isNaN(+args[1]) || +args[1] > findId.length) return '序号有误';
                else {
                    if(findId[+args[1]-1] === session.selfId) return '你在找我吗？';
                    if(findId[+args[1]-1] === session.event.user.id) return '你在找自己吗？';
                    if(await nickNameDo.checkBeBlacklistDosth(session, findId[+args[1]-1]))
                        return await nickNameDo.getNick(session, findId[+args[1]-1]) + '把你拉黑了，不能找ta~';
                    const senderNick = await nickNameDo.getNickGiven(session, session.event.user.id , findId[+args[1]-1]);
                    return '喂？喂~ ' + h.at(findId[+args[1]-1]) + ' ' +(message.length < 4?`${message}${message}`:message) + '，' + (senderNick === config.defaultNickName? '有人': senderNick) +'找你呀';
                }
            }
        })

        ctx.command('呼唤.我要').alias('呼唤我要')
        .action(async ({ args, session }) => {
            if(args[0] === undefined) return '你要干啥呀？';
            if(args[1] === undefined) return '谁呀？';
            if(h.select(args[1],'at').length === 1 ) {
                if(await nickNameDo.checkBeBlacklistDosth(session, h.select(args[1],'at')[0].attrs.id))
                    return await nickNameDo.getNick(session, h.select(args[1],'at')[0].attrs.id) + '把你拉黑了，不能对ta动手动脚~';
                return await nickNameDo.getNick(session) + args[0] + '了一下' + await nickNameDo.getNickGiven(session, h.select(args[1],'at')[0].attrs.id);
            }
            if(h.select(args[1],'at').length > 1) return '只能一个人哦~';
            else {
                const findId = await nickNameDo.find(session, args[1]);
                if(findId.length === 0) return '没有找到这个人呀';
                if(findId.length === 1) {
                    if(findId[0] === session.event.user.id) return await nickNameDo.getNick(session) + args[0] + '了一下自己';
                    if(await nickNameDo.checkBeBlacklistDosth(session, findId[0]))
                        return await nickNameDo.getNick(session, findId[0]) + '把你拉黑了，不能对ta动手动脚~';
                    return await nickNameDo.getNick(session) + args[0] + '了一下 ' + h.at(findId[0]);
                }
                if(findId.length > 1) {
                    if(args[2] === undefined){
                        let findString = '找到了好几个人呀，你要找的是：\n';
                        for(let i = 0; i < findId.length; i++) {
                            findString += `${i+1}. ${await nickNameDo.getNick(session, findId[i])} 账号：${findId[i]}\n`;
                        }
                        findString += '里面的谁呀？在后面带上序号再发送一次指令就可以了';
                    }
                    else if(Number.isNaN(+args[2]) || +args[2] > findId.length) return '序号有误';
                    else if(await nickNameDo.checkBeBlacklistDosth(session, findId[+args[1]-1]))
                        return await nickNameDo.getNick(session, findId[+args[1]-1]) + '把你拉黑了，不能对ta动手动脚~';
                    else return await nickNameDo.getNick(session) + args[0] + '了一下 ' + h.at(findId[+args[1]-1]);

                }
            }
        })
        
        if(config.globalEnableBlacklist) {
            ctx.command('呼唤.拉黑').alias('呼唤拉黑')
            .action(async ({ args, session }) => {
                if( args[0] === undefined) {
                    if(await nickNameDo.allBlacklistDosth(session))
                        return `已禁止任何人对你动手动脚，要再发送本指令才会允许~`;
                    else 
                        return `已取消禁止，现在可以被做一些事情了`;
                }
                else if(session.event.user.id === h.select(args[1],'at')[0].attrs.id){
                    return '你在干嘛...';
                }
                else if(h.select(args[1],'at').length === 1){
                    if(await nickNameDo.switchBlacklistDosth(session, h.select(args[1],'at')[0].attrs.id))
                        return `已禁止${args[1]}对你动手动脚，要再发送本指令才会允许~`;
                    else
                        return `已取消禁止，现在可以被${args[1]}做什么了`;
                }
                return '指令不太对劲呀';
            })
        }
    }
}
