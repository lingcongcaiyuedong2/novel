// 题材类型
export type Genre =
  | 'system'         // 系统流
  | 'traditional'    // 传统修仙
  | 'urban'          // 都市修仙
  | 'apocalypse'     // 末世修仙
  | 'primordial'     // 洪荒流
  | 'multiverse'     // 诸天万界

// 写作风格
export type WritingStyle =
  | 'cool'           // 爽文
  | 'passionate'     // 热血
  | 'deep'           // 深沉
  | 'humorous'       // 幽默
  | 'ensemble'       // 群像

// 修炼体系
export type CultivationSystem =
  | 'qi'             // 气修
  | 'body'           // 体修
  | 'soul'           // 魂修
  | 'dual'           // 双修
  | 'custom'         // 自定义

// 系统类型
export type SystemType =
  | 'sign_in'        // 签到系统
  | 'mall'           // 商城系统
  | 'task'           // 任务系统
  | 'lottery'        // 抽奖系统
  | 'attribute'      // 捡属性系统
  | 'appraisal'      // 鉴定系统
  | 'none'           // 无系统

// 伏笔密度
export type ForeshadowingDensity = 'light' | 'medium' | 'heavy'

// 故事节奏
export type StoryRhythm = 'fast' | 'balanced' | 'slow'

// 性别
export type Gender = 'male' | 'female' | 'unknown'

// 人物配置
export interface CharacterConfig {
  name: string
  gender: Gender
  initialLevel: string      // 初始境界
  background: string        // 出身背景
  personality: string       // 性格特点
  specialAbility: string    // 特殊能力/天赋
  motivation: string        // 目标/动机
}

// 小说配置（多步表单完整数据）
export interface NovelConfig {
  // Step 1: 基础设置
  title: string
  genre: Genre
  writingStyle: WritingStyle
  targetWordCount: number

  // Step 2: 世界观
  cultivationSystem: CultivationSystem
  systemType: SystemType
  cultivationLevels: string[]   // 境界体系列表
  worldBackground: string       // 世界背景描述

  // Step 3: 人物
  protagonist: CharacterConfig
  supportingCharacters: CharacterConfig[]
  antagonist: CharacterConfig

  // Step 4: 剧情
  mainConflict: string
  plotPoints: string[]
  foreshadowingDensity: ForeshadowingDensity
  storyRhythm: StoryRhythm
}

// 小说状态
export type NovelStatus =
  | 'draft'          // 草稿（已配置，未生成）
  | 'generating'     // 生成中
  | 'outline_done'   // 大纲已完成
  | 'writing'        // 章节生成中
  | 'completed'      // 已完成
  | 'error'          // 生成出错

// 小说列表项（后端返回的简要信息）
export interface NovelSummary {
  id: string
  title: string
  genre: Genre
  targetWordCount: number
  status: NovelStatus
  chapterCount: number
  createdAt: string
  updatedAt: string
}

// 小说详情（包含完整配置）
export interface NovelDetail extends NovelSummary {
  config: NovelConfig
  outline?: string          // 总大纲
  worldBuilding?: string    // 世界观文档
  charactersDoc?: string    // 人物档案
  volumeOutline?: string    // 分卷大纲
}

// 章节
export interface Chapter {
  id: string
  novelId: string
  chapterNumber: number
  title: string
  outline: string       // 章节大纲
  content: string       // 正文
  wordCount: number
  status: 'pending' | 'generating' | 'done'
  createdAt: string
}

// 默认人物配置
export const defaultCharacter: CharacterConfig = {
  name: '',
  gender: 'male',
  initialLevel: '',
  background: '',
  personality: '',
  specialAbility: '',
  motivation: '',
}

// 默认小说配置
export const defaultNovelConfig: NovelConfig = {
  title: '',
  genre: 'system',
  writingStyle: 'cool',
  targetWordCount: 500000,

  cultivationSystem: 'qi',
  systemType: 'sign_in',
  cultivationLevels: ['练气', '筑基', '金丹', '元婴', '化神', '合体', '大乘', '渡劫', '真仙'],
  worldBackground: '',

  protagonist: { ...defaultCharacter },
  supportingCharacters: [],
  antagonist: { ...defaultCharacter },

  mainConflict: '',
  plotPoints: [],
  foreshadowingDensity: 'medium',
  storyRhythm: 'balanced',
}

// 预置数据
export const PRESET_DATA = {
  genres: [
    { value: 'system' as Genre, label: '系统流', desc: '主角获得各类外挂系统，签到/商城/任务' },
    { value: 'traditional' as Genre, label: '传统修仙', desc: '经典修炼升级，门派争斗，寻仙问道' },
    { value: 'urban' as Genre, label: '都市修仙', desc: '现代都市背景，修仙与现代生活交融' },
    { value: 'apocalypse' as Genre, label: '末世修仙', desc: '末世降临，灵气复苏，修炼求生' },
    { value: 'primordial' as Genre, label: '洪荒流', desc: '鸿蒙开天，大道争锋，神话格局' },
    { value: 'multiverse' as Genre, label: '诸天万界', desc: '穿梭各个世界，收集资源，无限流' },
  ],
  writingStyles: [
    { value: 'cool' as WritingStyle, label: '爽文', desc: '节奏快，打脸多，爽点密集' },
    { value: 'passionate' as WritingStyle, label: '热血', desc: '热血沸腾，燃点不断，战斗激烈' },
    { value: 'deep' as WritingStyle, label: '深沉', desc: '剧情厚重，伏笔多，情感深度' },
    { value: 'humorous' as WritingStyle, label: '幽默', desc: '轻松诙谐，妙趣横生' },
    { value: 'ensemble' as WritingStyle, label: '群像', desc: '多主角视角，人物众多，格局宏大' },
  ],
  systemTypes: [
    { value: 'sign_in' as SystemType, label: '签到系统' },
    { value: 'mall' as SystemType, label: '商城系统' },
    { value: 'task' as SystemType, label: '任务系统' },
    { value: 'lottery' as SystemType, label: '抽奖系统' },
    { value: 'attribute' as SystemType, label: '捡属性系统' },
    { value: 'appraisal' as SystemType, label: '鉴定系统' },
    { value: 'none' as SystemType, label: '无系统' },
  ],
  cultivationSystems: [
    { value: 'qi' as CultivationSystem, label: '气修体系', desc: '修炼灵气，内丹外丹' },
    { value: 'body' as CultivationSystem, label: '体修体系', desc: '淬炼肉身，力量为尊' },
    { value: 'soul' as CultivationSystem, label: '魂修体系', desc: '修炼神魂，精神力量' },
    { value: 'dual' as CultivationSystem, label: '双修体系', desc: '气体双修，兼修多道' },
    { value: 'custom' as CultivationSystem, label: '自定义', desc: '完全自定义体系' },
  ],
  defaultLevels: ['练气', '筑基', '金丹', '元婴', '化神', '合体', '大乘', '渡劫', '真仙'],
  wordCountOptions: [
    { value: 100000, label: '10万字', desc: '短篇' },
    { value: 300000, label: '30万字', desc: '中短篇' },
    { value: 500000, label: '50万字', desc: '中篇' },
    { value: 1000000, label: '100万字', desc: '长篇' },
    { value: 2000000, label: '200万字', desc: '超长篇' },
    { value: 5000000, label: '500万字', desc: '史诗级' },
  ],
}
