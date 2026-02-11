// @ts-ignore
import { NapCatPluginContext } from 'napcat-types';
import { currentConfig } from './config';
import { FriendInfo, GroupInfo } from './types';

// 定义全局键名，确保跨文件/跨重载周期都能访问
// 这是解决“无法停止”问题的关键
const GLOBAL_TIMER_KEY = Symbol.for('NAPCAT_AUTO_TASKS_REGISTRY');

interface InternalTask {
    slotIndex: number;
    enable: boolean;
    type: 'group' | 'private' | 'group_notice';
    target: string;
    time: string;
    interval: number;
    message: string;
    // 群公告专用
    image?: string;
    is_pinned?: boolean;
    is_confirm?: boolean;
}

export class TaskManager {
    private ctx: NapCatPluginContext;
    private lastExecutedTime: string = "";

    constructor(ctx: NapCatPluginContext) {
        this.ctx = ctx;
        // 确保全局注册表存在
        // @ts-ignore
        if (!global[GLOBAL_TIMER_KEY]) {
            // @ts-ignore
            global[GLOBAL_TIMER_KEY] = [];
        }
    }

    private async callOB11(action: string, params: any) {
        try {
            return await this.ctx.actions.call(action, params, this.ctx.adapterName, this.ctx.pluginManager.config);
        } catch (e: any) {
            // 忽略 "No data returned" 错误
            const errStr = String(e);
            if (errStr.includes('No data returned') || (e.message && e.message.includes('No data returned'))) {
                return;
            }
            this.ctx.logger.error(`[API] ${action} 失败:`, e);
        }
    }

    // --- 核心方法：注册定时器到全局 ---
    private register(timer: NodeJS.Timeout) {
        // @ts-ignore
        global[GLOBAL_TIMER_KEY].push(timer);
    }

    // --- 核心方法：强力停止所有任务 ---
    public stop() {
        // @ts-ignore
        const timers = global[GLOBAL_TIMER_KEY];

        if (timers && Array.isArray(timers) && timers.length > 0) {
            // 遍历并清除所有已知的定时器
            timers.forEach(t => clearInterval(t));
            this.ctx.logger.info(`🛑 已清理 ${timers.length} 个活跃定时器 (含残留进程)`);
        }

        // 清空注册表
        // @ts-ignore
        global[GLOBAL_TIMER_KEY] = [];
    }

    // --- 启动任务 ---
    public start() {
        // 1. 启动前先进行“焦土政策”，清除之前所有残留
        this.stop();

        this.ctx.logger.info('🚀 正在启动自动化任务...');

        const tasks: InternalTask[] = [];
        const count = Math.max(1, parseInt(String(currentConfig.taskCount), 10) || 1);

        for (let i = 1; i <= count; i++) {
            // @ts-ignore
            const enable = currentConfig[`customTask_${i}_enable`];
            // @ts-ignore
            const target = currentConfig[`customTask_${i}_target`];

            // 必须启用且有目标才加入队列
            if (enable && target) {
                // @ts-ignore
                const intervalStr = currentConfig[`customTask_${i}_interval`] || '0';
                tasks.push({
                    slotIndex: i,
                    enable: true,
                    // @ts-ignore
                    type: currentConfig[`customTask_${i}_type`] as any,
                    target: target,
                    // @ts-ignore
                    time: currentConfig[`customTask_${i}_time`],
                    interval: parseInt(intervalStr, 10) || 0,
                    // @ts-ignore
                    message: currentConfig[`customTask_${i}_message`],
                    // @ts-ignore
                    image: currentConfig[`customTask_${i}_image`],
                    // @ts-ignore
                    is_pinned: currentConfig[`customTask_${i}_is_pinned`],
                    // @ts-ignore
                    is_confirm: currentConfig[`customTask_${i}_is_confirm`]
                });
            }
        }
        this.ctx.logger.info(`已加载 ${tasks.length} 个有效任务 (总槽位: ${count})`);

        // 2. 启动主心跳 (注册到全局)
        const mainTicker = setInterval(() => {
            this.tick(tasks);
        }, 1000);
        this.register(mainTicker);

        // 3. 启动间隔循环任务 (注册到全局)
        tasks.forEach((task) => {
            // 群公告不支持循环发送，强制忽略 interval
            if (task.type === 'group_notice') return;

            if (task.interval > 0) {
                const ms = Math.max(task.interval * 1000, 5000);
                this.ctx.logger.info(`[任务${task.slotIndex}] ⏳ 循环启动: 目标 ${task.target}, 间隔 ${task.interval}s`);

                const timer = setInterval(() => {
                    // 独立 try-catch 保护循环任务
                    try {
                        this.executeInternalTask(task).catch(e => {
                            this.ctx.logger.error(`[任务${task.slotIndex}] 循环执行异常:`, e);
                        });
                    } catch (e) {
                        this.ctx.logger.error(`[任务${task.slotIndex}] 循环触发异常:`, e);
                    }
                }, ms);

                this.register(timer);
            }
        });
    }

    private async tick(tasks: InternalTask[]) {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        if (timeStr === this.lastExecutedTime) return;
        this.lastExecutedTime = timeStr;

        const allGroups = [];
        if (currentConfig.groupSign_targets.toLowerCase() === 'all' || currentConfig.groupSpark_targets.toLowerCase() === 'all') {
            allGroups.push(...(await this.callOB11('get_group_list', {})).data.map((group: GroupInfo) => group.group_id));
        }

        const allFriends = [];
        if (currentConfig.friendSpark_targets.toLowerCase() === 'all') {
            allFriends.push(...(await this.callOB11('get_friend_list', {})).data.map((friend: FriendInfo) => friend.user_id));
        }

        // 内置任务
        if (currentConfig.groupSign_enable && timeStr === currentConfig.groupSign_time) {
            this.executeBatch('群打卡', currentConfig.groupSign_targets.toLowerCase() == 'all' ? allGroups.join(',') : currentConfig.groupSign_targets, async (id) => { await this.callOB11('send_group_sign', { group_id: id }); });
        }
        if (currentConfig.groupSpark_enable && timeStr === currentConfig.groupSpark_time) {
            this.executeBatch('群火花', currentConfig.groupSpark_targets.toLowerCase() == 'all' ? allGroups.join(',') : currentConfig.groupSpark_targets, async (id) => { await this.callOB11('send_msg', { message_type: 'group', group_id: id, message: currentConfig.groupSpark_message }); });
        }
        if (currentConfig.friendSpark_enable && timeStr === currentConfig.friendSpark_time) {
            this.executeBatch('好友火花', currentConfig.friendSpark_targets.toLowerCase() == 'all' ? allFriends.join(',') : currentConfig.friendSpark_targets, async (id) => { await this.callOB11('send_msg', { message_type: 'private', user_id: id, message: currentConfig.friendSpark_message }); });
        }

        // 自定义任务 (每日定时)
        for (const task of tasks) {
            // 只有 interval <= 0 才走这个逻辑
            // 群公告强制走定时逻辑
            const isScheduleMode = task.interval <= 0 || task.type === 'group_notice';

            if (isScheduleMode && task.time === timeStr) {
                // 使用 try-catch 包裹单个任务执行，防止中断循环
                try {
                    this.executeInternalTask(task).catch(e => {
                        this.ctx.logger.error(`[任务${task.slotIndex}] 定时执行异步异常:`, e);
                    });
                } catch (e) {
                    this.ctx.logger.error(`[任务${task.slotIndex}] 定时触发异常:`, e);
                }
            }
        }
    }

    private async executeInternalTask(task: InternalTask) {
        try {
            this.ctx.logger.info(`[任务${task.slotIndex}] ▶️ 触发: ${task.target} (${task.type})`);
            await new Promise(r => setTimeout(r, Math.random() * 3000));

            if (task.type === 'group_notice') {
                const payload = {
                    group_id: task.target,
                    content: task.message,
                    image: task.image || undefined,
                    pinned: task.is_pinned ? 1 : 0,
                    type: 1,
                    confirm_required: task.is_confirm ? 1 : 0,
                    is_show_edit_card: 1,
                    tip_window_type: 0
                };
                await this.callOB11('_send_group_notice', payload);
            } else {
                const payload: any = { message_type: task.type, message: task.message };
                if (task.type === 'group') payload.group_id = task.target;
                else payload.user_id = task.target;
                await this.callOB11('send_msg', payload);
            }
        } catch (e) {
            this.ctx.logger.error(`[任务${task.slotIndex}] 执行失败:`, e);
        }
    }

    private async executeBatch(name: string, targetsStr: string, action: (id: string) => Promise<void>) {
        const targets = targetsStr.split(/[,，]/).map(t => t.trim()).filter(t => t);
        if (targets.length === 0) return;
        this.ctx.logger.info(`[内置任务] ${name} 触发`);
        for (const id of targets) {
            await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
            try { await action(id); } catch (e) { this.ctx.logger.error(`[${name}] 失败`, e); }
        }
    }
}
