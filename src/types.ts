// 插件总配置
export interface PluginConfig {
    // --- 1. 群自动打卡 ---
    groupSign_enable: boolean;
    groupSign_time: string;
    groupSign_targets: string;

    // --- 2. 群自动续火花 ---
    groupSpark_enable: boolean;
    groupSpark_time: string;
    groupSpark_message: string;
    groupSpark_targets: string;

    // --- 3. 好友自动续火花 ---
    friendSpark_enable: boolean;
    friendSpark_time: string;
    friendSpark_message: string;
    friendSpark_targets: string;

    // --- 4. 自定义任务设置 ---
    taskCount: number; // 核心字段：控制生成的任务槽数量

    // 使用索引签名存储 customTask_1, customTask_2...
    [key: string]: any;
}

// 默认配置
export const DEFAULT_CONFIG: PluginConfig = {
    groupSign_enable: false,
    groupSign_time: "08:00:00",
    groupSign_targets: "",

    groupSpark_enable: false,
    groupSpark_time: "09:00:00",
    groupSpark_message: "自动续火花",
    groupSpark_targets: "",

    friendSpark_enable: false,
    friendSpark_time: "10:00:00",
    friendSpark_message: "✨",
    friendSpark_targets: "",

    // 默认显示 3 个任务槽
    taskCount: 3,

    // 初始化前3个槽位的默认值 (防止 undefined)
    customTask_1_enable: false, customTask_1_type: 'group', customTask_1_target: '', customTask_1_time: '', customTask_1_interval: '', customTask_1_message: '',
    customTask_2_enable: false, customTask_2_type: 'group', customTask_2_target: '', customTask_2_time: '', customTask_2_interval: '', customTask_2_message: '',
    customTask_3_enable: false, customTask_3_type: 'group', customTask_3_target: '', customTask_3_time: '', customTask_3_interval: '', customTask_3_message: '',
};

export interface GroupInfo {
    group_id: number,
}

export interface FriendInfo {
    user_id: number,
}
