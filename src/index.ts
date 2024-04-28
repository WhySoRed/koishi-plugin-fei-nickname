import { Context, Schema, h, Session } from 'koishi'
import {} from '@koishijs/plugin-help';
import { platform } from 'os';
export const inject = {
    required: ['database'],
    optional: ['callme']
}

export const name = 'fei-nickname'

export interface Config {
    defaultNickName:string
    globalNickNameGiven: string
    globalEnableDoSomeThing:boolean
}

export const Config: Schema<Config> = Schema.object({
    defaultNickName: Schema.string().default('那个谁').description('获取用户名失败时的默认名称'),
    globalNickNameGiven: Schema.boolean().default(true).description('开启“外号”功能'),
    globalEnableDoSomeThing: Schema.boolean().default(true).description('开启“动手动脚”功能'),
})

export const nickName = {
    //根据输入的session返回session的发送者的自称
    //没有自称则会以群昵称>平台昵称>默认昵称的优先级向后获取
    getName : async (session: Session) => {
        const ctx = session.app;
        const platform = session.platform;
        const userId = session.event.user.id;
    },
    //根据输入的session和id返回一个外号
    //没有外号则以自称>群昵称>平台昵称>默认昵称的优先级向后获取
    getNick : async (session: Session, callerUserId: string, receiverUserId: string) => {
        const ctx = session.app;
        const platform = session.platform;
    },
    //根据输入的session和source，获取source中包含的at消息元素的id
    //返回一个这些id转换为外号的数组
    //没有外号则以自称>群昵称>平台昵称>默认昵称的优先级向后获取
    getNickNameGivenInText : async (session: Session, source: string) => {
        const ctx = session.app;
        const idList = h.select(source,'at').map((element) => element.attrs.id);
        
    }
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
    mainNickNameGivenId: number
    enableNickNameGiven: boolean
    enableDoSomeThing: boolean
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
    typeIsNickGiven: boolean
    blacklistFrom: number
    blacklistTo: number
}

export function apply(ctx: Context, config: Config) {

    ctx.model.extend('nnUserData', {
        id: 'unsigned',
        userId: { type: 'string',nullable: false },
        platform: { type: 'string',nullable: false },
        mainNickNameId: { type: 'unsigned', initial: 0 },
        mainNickNameGivenId: { type: 'unsigned', initial: 0 },
        enableNickNameGiven: { type: 'boolean', initial: true },
        enableDoSomeThing: { type: 'boolean', initial: true },
    },{
        primary: 'id',
        autoInc: true,
        unique: [['userId','platform']]
    })
     
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

    //本插件提供的用户间功能只有取外号与行为两种，并储存在同一个数据表中
    //因此使用布尔值来区分blacklist的类型
    ctx.model.extend('nnBlacklistData', {
        blacklistId: 'unsigned',
        typeIsNickGiven: { type: 'boolean', nullable: false },  // 为true时表示是起外号功能的黑名单，为false表示是动手动脚功能的黑名单
        blacklistFrom: { type: 'unsigned', nullable: false },   // 拉黑人的一方/不允许对方使用对应功能的一方  
        blacklistTo: { type: 'unsigned', nullable: false }      // 被拉黑的一方/无法对对方使用对应功能的一方
    },{
        primary: 'blacklistId',
        autoInc: true,
        foreign: {
            blacklistFrom: ['nnUserData', 'id'],
            blacklistTo: ['nnUserData', 'id']
        },
        unique:[['typeIsNickGiven', 'blacklistFrom', 'blacklistTo']]
    })


    ctx.command('外号测试').action(async ({ session }) => {
        return (session.username);
    })


    ctx.command('外号').action(({ session }) => {
        return session.event.user.name;
    })

    ctx.command('自称').action(({ session }) => {
        return session.event.user.name;
    })

    ctx.command('动手动脚').action(({ session }) => {
        return session.event.user.name;
    })
    


}
