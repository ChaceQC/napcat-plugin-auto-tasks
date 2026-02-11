// @ts-ignore
import { NapCatPluginContext } from 'napcat-types';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG, PluginConfig } from './types';

export let currentConfig: PluginConfig = { ...DEFAULT_CONFIG };

export function loadConfig(ctx: NapCatPluginContext) {
    const configFilePath = ctx.configPath;
    try {
        if (fs.existsSync(configFilePath)) {
            const raw = fs.readFileSync(configFilePath, 'utf-8');
            const loaded = JSON.parse(raw);
            currentConfig = { ...DEFAULT_CONFIG, ...loaded };
            ctx.logger.info('配置已加载');
        } else {
            saveConfig(ctx, DEFAULT_CONFIG);
        }
    } catch (e) {
        ctx.logger.error('加载配置失败', e);
        currentConfig = { ...DEFAULT_CONFIG };
    }
}

export function saveConfig(ctx: NapCatPluginContext, newConfig: Partial<PluginConfig>) {
    const configFilePath = ctx.configPath;
    try {
        // 深度合并配置
        currentConfig = { ...currentConfig, ...newConfig };

        // 确保 taskCount 是数字
        if (typeof currentConfig.taskCount === 'string') {
            currentConfig.taskCount = parseInt(currentConfig.taskCount, 10) || 1;
        }

        const dir = path.dirname(configFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(configFilePath, JSON.stringify(currentConfig, null, 2), 'utf-8');
        ctx.logger.info('配置已保存');
    } catch (e) {
        ctx.logger.error('保存配置失败', e);
    }
}

export function buildConfigUI(ctx: NapCatPluginContext) {
    const { NapCatConfig } = ctx;

    const configItems = [
        NapCatConfig.html('<div style="padding:10px; border-bottom:1px solid #ccc;"><h3>⏰ 自动定时任务 Pro</h3></div>'),

        // --- 基础功能 ---
        NapCatConfig.html('<div style="margin-top:10px; background:#f0f9eb; padding:8px; border-radius:4px;"><b>📅 群自动打卡</b></div>'),
        NapCatConfig.boolean('groupSign_enable', '启用', currentConfig.groupSign_enable),
        NapCatConfig.text('groupSign_time', '执行时间', currentConfig.groupSign_time),
        NapCatConfig.text('groupSign_targets', '群号列表 (使用 `all` 为所有群)', currentConfig.groupSign_targets),

        NapCatConfig.html('<div style="margin-top:10px; background:#ecf5ff; padding:8px; border-radius:4px;"><b>🔥 群自动续火花</b></div>'),
        NapCatConfig.boolean('groupSpark_enable', '启用', currentConfig.groupSpark_enable),
        NapCatConfig.text('groupSpark_time', '执行时间', currentConfig.groupSpark_time),
        NapCatConfig.text('groupSpark_message', '内容', currentConfig.groupSpark_message),
        NapCatConfig.text('groupSpark_targets', '群号列表 (使用 `all` 为所有群)', currentConfig.groupSpark_targets),

        NapCatConfig.html('<div style="margin-top:10px; background:#fdf6ec; padding:8px; border-radius:4px;"><b>✨ 好友自动续火花</b></div>'),
        NapCatConfig.boolean('friendSpark_enable', '启用', currentConfig.friendSpark_enable),
        NapCatConfig.text('friendSpark_time', '执行时间', currentConfig.friendSpark_time),
        NapCatConfig.text('friendSpark_message', '内容', currentConfig.friendSpark_message),
        NapCatConfig.text('friendSpark_targets', 'QQ号列表 (使用 `all` 为所有好友)', currentConfig.friendSpark_targets),

        // --- 动态任务控制区 ---
        NapCatConfig.html('<div style="margin-top:20px; border-top:2px solid #eee; padding-top:15px;"><h3>🤖 自定义任务管理</h3></div>'),

        // 核心：控制任务数量的输入框
        // 使用 text 类型兼容性最好，逻辑里会转 int
        NapCatConfig.text('taskCount', '当前任务数量', String(currentConfig.taskCount || 3), '修改此数字并保存，界面将自动刷新出对应数量的任务槽'),

        NapCatConfig.html('<div style="font-size:12px; color:#f56c6c; margin-bottom:10px;">提示：修改上方数字 -> 点击保存 -> 界面会自动重新渲染，增加或减少任务槽。</div>')
    ];

    // 动态生成：根据 currentConfig.taskCount 循环生成 UI
    const count = Math.max(1, parseInt(String(currentConfig.taskCount), 10) || 1);

    for (let i = 1; i <= count; i++) {
        configItems.push(
            NapCatConfig.html(`
                <div style="margin-top:15px; padding:8px; background:#f8f9fa; border-left:4px solid #409EFF; border-radius:2px;">
                    <b>任务 #${i}</b>
                </div>
            `),
            // 读取 currentConfig[`customTask_${i}_...`]，如果不存在则为空字符串（保证不报错）
            NapCatConfig.boolean(`customTask_${i}_enable`, `启用任务 ${i}`, currentConfig[`customTask_${i}_enable`] || false, '开关'),
            NapCatConfig.select(`customTask_${i}_type`, '目标类型', [
                { label: '群消息', value: 'group' },
                { label: '私聊消息', value: 'private' },
                { label: '群公告', value: 'group_notice' }
            ], currentConfig[`customTask_${i}_type`] || 'group', ''),
            NapCatConfig.text(`customTask_${i}_target`, '目标号码', currentConfig[`customTask_${i}_target`] || '', '群号或QQ号'),
            NapCatConfig.text(`customTask_${i}_time`, '每日时间', currentConfig[`customTask_${i}_time`] || '', 'HH:mm:ss'),
            NapCatConfig.text(`customTask_${i}_interval`, '或 循环间隔(秒)', currentConfig[`customTask_${i}_interval`] || '', '优先级高(群公告无效)'),
            NapCatConfig.text(`customTask_${i}_message`, '消息内容', currentConfig[`customTask_${i}_message`] || '', '支持CQ码 (群公告为内容)'),
            // 群公告专属参数
            NapCatConfig.text(`customTask_${i}_image`, '公告图片(选填)', currentConfig[`customTask_${i}_image`] || '', '网络URL或本地路径'),
            NapCatConfig.boolean(`customTask_${i}_is_pinned`, '公告置顶', currentConfig[`customTask_${i}_is_pinned`] || false, '是否置顶'),
            NapCatConfig.boolean(`customTask_${i}_is_confirm`, '公告需确认', currentConfig[`customTask_${i}_is_confirm`] || false, '是否需确认')
        );
    }

    return NapCatConfig.combine(...configItems);
}
