import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import { IconPlus, IconTrash } from '../components/icons'
import type { TaskConfig, BuiltinTasks } from '../types'

interface TasksData {
    builtinTasks: BuiltinTasks
    tasks: TaskConfig[]
}

const emptyTask: TaskConfig = {
    enable: false,
    type: 'group',
    target: '',
    time: '',
    interval: 0,
    message: '',
    image: '',
    is_pinned: false,
    is_confirm: false,
}

export default function TasksPage() {
    const [builtin, setBuiltin] = useState<BuiltinTasks>({
        groupSign: { enable: false, time: '08:00:00', targets: '' },
        groupSpark: { enable: false, time: '09:00:00', message: '自动续火花', targets: '' },
        friendSpark: { enable: false, time: '10:00:00', message: '✨', targets: '' },
    })
    const [tasks, setTasks] = useState<TaskConfig[]>([])
    const [saving, setSaving] = useState(false)

    const fetchTasks = useCallback(async () => {
        try {
            const res = await noAuthFetch<TasksData>('/tasks')
            if (res.code === 0 && res.data) {
                setBuiltin(res.data.builtinTasks)
                setTasks(res.data.tasks)
            }
        } catch (e) {
            showToast('加载任务失败', 'error')
        }
    }, [])

    useEffect(() => { fetchTasks() }, [fetchTasks])

    const saveTasks = async () => {
        setSaving(true)
        try {
            const res = await noAuthFetch('/tasks', {
                method: 'POST',
                body: JSON.stringify({ builtinTasks: builtin, tasks }),
            })
            if (res.code === 0) {
                showToast('保存成功，任务已重启', 'success')
            } else {
                showToast(res.message || '保存失败', 'error')
            }
        } catch (e) {
            showToast('保存失败', 'error')
        } finally {
            setSaving(false)
        }
    }

    const addTask = () => setTasks([...tasks, { ...emptyTask }])
    const removeTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i))
    const updateTask = (i: number, field: string, value: unknown) => {
        setTasks(tasks.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* 保存按钮 */}
            <div className="flex justify-end">
                <button
                    onClick={saveTasks}
                    disabled={saving}
                    className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
                >
                    {saving ? '保存中...' : '💾 保存配置'}
                </button>
            </div>

            {/* 内置任务 */}
            <div className="bg-white dark:bg-[#25262B] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">📅 内置任务</h2>
                </div>
                <div className="p-6 space-y-6">
                    {/* 群打卡 */}
                    <BuiltinTaskCard
                        title="群自动打卡"
                        emoji="📅"
                        enable={builtin.groupSign.enable}
                        onToggle={(v) => setBuiltin({ ...builtin, groupSign: { ...builtin.groupSign, enable: v } })}
                    >
                        <InputField label="执行时间" value={builtin.groupSign.time} onChange={(v) => setBuiltin({ ...builtin, groupSign: { ...builtin.groupSign, time: v } })} placeholder="HH:mm:ss" />
                        <InputField label="群号列表" value={builtin.groupSign.targets} onChange={(v) => setBuiltin({ ...builtin, groupSign: { ...builtin.groupSign, targets: v } })} placeholder="逗号分隔，或 all" />
                    </BuiltinTaskCard>

                    {/* 群续火花 */}
                    <BuiltinTaskCard
                        title="群自动续火花"
                        emoji="🔥"
                        enable={builtin.groupSpark.enable}
                        onToggle={(v) => setBuiltin({ ...builtin, groupSpark: { ...builtin.groupSpark, enable: v } })}
                    >
                        <InputField label="执行时间" value={builtin.groupSpark.time} onChange={(v) => setBuiltin({ ...builtin, groupSpark: { ...builtin.groupSpark, time: v } })} placeholder="HH:mm:ss" />
                        <InputField label="消息内容" value={builtin.groupSpark.message} onChange={(v) => setBuiltin({ ...builtin, groupSpark: { ...builtin.groupSpark, message: v } })} />
                        <InputField label="群号列表" value={builtin.groupSpark.targets} onChange={(v) => setBuiltin({ ...builtin, groupSpark: { ...builtin.groupSpark, targets: v } })} placeholder="逗号分隔，或 all" />
                    </BuiltinTaskCard>

                    {/* 好友续火花 */}
                    <BuiltinTaskCard
                        title="好友自动续火花"
                        emoji="✨"
                        enable={builtin.friendSpark.enable}
                        onToggle={(v) => setBuiltin({ ...builtin, friendSpark: { ...builtin.friendSpark, enable: v } })}
                    >
                        <InputField label="执行时间" value={builtin.friendSpark.time} onChange={(v) => setBuiltin({ ...builtin, friendSpark: { ...builtin.friendSpark, time: v } })} placeholder="HH:mm:ss" />
                        <InputField label="消息内容" value={builtin.friendSpark.message} onChange={(v) => setBuiltin({ ...builtin, friendSpark: { ...builtin.friendSpark, message: v } })} />
                        <InputField label="QQ号列表" value={builtin.friendSpark.targets} onChange={(v) => setBuiltin({ ...builtin, friendSpark: { ...builtin.friendSpark, targets: v } })} placeholder="逗号分隔，或 all" />
                    </BuiltinTaskCard>
                </div>
            </div>

            {/* 自定义任务 */}
            <div className="bg-white dark:bg-[#25262B] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">🤖 自定义任务</h2>
                    <button
                        onClick={addTask}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg text-sm font-medium hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                    >
                        <IconPlus size={14} />
                        添加任务
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {tasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                            <div className="text-4xl mb-2">📋</div>
                            <div>暂无自定义任务，点击上方按钮添加</div>
                        </div>
                    ) : (
                        tasks.map((task, i) => (
                            <CustomTaskCard
                                key={i}
                                index={i}
                                task={task}
                                onUpdate={(field, value) => updateTask(i, field, value)}
                                onRemove={() => removeTask(i)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

// ==================== 子组件 ====================

function BuiltinTaskCard({ title, emoji, enable, onToggle, children }: {
    title: string; emoji: string; enable: boolean; onToggle: (v: boolean) => void; children: React.ReactNode
}) {
    return (
        <div className={`rounded-lg border p-4 transition-all ${enable ? 'border-brand-200 dark:border-brand-500/30 bg-brand-50/30 dark:bg-brand-500/5' : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{title}</span>
                </div>
                <ToggleSwitch value={enable} onChange={onToggle} />
            </div>
            {enable && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">{children}</div>}
        </div>
    )
}

function CustomTaskCard({ index, task, onUpdate, onRemove }: {
    index: number; task: TaskConfig; onUpdate: (field: string, value: unknown) => void; onRemove: () => void
}) {
    return (
        <div className={`rounded-lg border p-4 transition-all ${task.enable ? 'border-brand-200 dark:border-brand-500/30 bg-brand-50/30 dark:bg-brand-500/5' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <ToggleSwitch value={task.enable} onChange={(v) => onUpdate('enable', v)} />
                    <span className="font-medium text-gray-800 dark:text-gray-200">任务 #{index + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {{ group: '群消息', private: '私聊', group_notice: '群公告' }[task.type]}
                    </span>
                </div>
                <button onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <IconTrash size={16} />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <SelectField label="类型" value={task.type} options={[
                    { value: 'group', label: '群消息' },
                    { value: 'private', label: '私聊消息' },
                    { value: 'group_notice', label: '群公告' },
                ]} onChange={(v) => onUpdate('type', v)} />
                <InputField label="目标号码" value={task.target} onChange={(v) => onUpdate('target', v)} placeholder="群号或QQ号" />
                <InputField label="定时时间" value={task.time} onChange={(v) => onUpdate('time', v)} placeholder="HH:mm:ss" />
                {task.type !== 'group_notice' && (
                    <InputField label="循环间隔(秒)" value={String(task.interval || '')} onChange={(v) => onUpdate('interval', parseInt(v) || 0)} placeholder="0=仅定时" />
                )}
                <InputField label="消息内容" value={task.message} onChange={(v) => onUpdate('message', v)} placeholder={task.type === 'group_notice' ? '公告内容' : '支持CQ码'} className="sm:col-span-2" />

                {task.type === 'group_notice' && (
                    <>
                        <InputField label="公告图片" value={task.image || ''} onChange={(v) => onUpdate('image', v)} placeholder="URL或本地路径(选填)" />
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={task.is_pinned || false} onChange={(e) => onUpdate('is_pinned', e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                                置顶
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={task.is_confirm || false} onChange={(e) => onUpdate('is_confirm', e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                                需确认
                            </label>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function InputField({ label, value, onChange, placeholder, className = '' }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
    return (
        <div className={className}>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1B1E] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
            />
        </div>
    )
}

function SelectField({ label, value, options, onChange }: {
    label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1B1E] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
            >
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    )
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!value)}
            className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${value ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            style={{ width: 40, height: 22 }}
        >
            <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
        </button>
    )
}
