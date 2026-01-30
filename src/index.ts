// @ts-ignore
import { NapCatPluginContext } from 'napcat-types';
import { loadConfig, saveConfig, buildConfigUI, currentConfig } from './config';
import { onMessage, onEvent } from './handlers';
import { TaskManager } from './taskManager';

// 导出 UI (NapCat 读取)
export let plugin_config_ui: any = [];

// 全局实例
export let taskManager: TaskManager | null = null;

// 插件初始化
export async function plugin_init(ctx: NapCatPluginContext) {
    ctx.logger.info('🛠️ 正在加载 Auto Tasks 插件...');

    // 1. 加载配置
    loadConfig(ctx);

    // 2. 初始化 UI
    plugin_config_ui = buildConfigUI(ctx);

    // 3. 启动任务管理器
    // 注意：TaskManager 内部构造函数会自动连接全局注册表
    taskManager = new TaskManager(ctx);

    // 强制调用 start，内部会先 stop 清除所有旧进程
    taskManager.start();

    ctx.logger.info('✅ 插件加载完成');
}

// 配置变更监听
export function plugin_on_config_change(ctx: NapCatPluginContext, _: any, key: string, value: any) {
    ctx.logger.info(`⚙️ 配置变更: ${key} = ${value}`);

    // 1. 保存配置
    saveConfig(ctx, { [key]: value });

    // 2. 重启任务 (应用新配置)
    if (taskManager) {
        ctx.logger.info('🔄 应用新配置，重启任务...');
        taskManager.start();
    }
}

export const plugin_onmessage = onMessage;
export const plugin_onevent = onEvent;