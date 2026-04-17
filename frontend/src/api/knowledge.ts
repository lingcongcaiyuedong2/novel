import axios from 'axios'

const api = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } })

export interface KnowledgeItem {
  id: string
  category: string
  subType: string
  title: string
  content: string
  tags: string[]
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
}

export const CATEGORIES = [
  { value: 'plot', label: '情节题材', desc: '宗门大比、秘境探险、复仇等' },
  { value: 'character', label: '人物原型', desc: '废柴逆袭、天才型、反派模板' },
  { value: 'world', label: '世界设定', desc: '修炼体系、宗门、天材地宝' },
  { value: 'satisfying', label: '爽点模板', desc: '打脸套路、突破场景、系统奖励' },
  { value: 'foreshadow', label: '伏笔套路', desc: '伏笔类型、回收方式' },
  { value: 'chapter_template', label: '章节模板', desc: '战斗章、修炼章、剧情章' },
  { value: 'writing_technique', label: '写作技巧', desc: '对话、描写、视角、节奏' },
]

export async function listKnowledge(category?: string, search?: string): Promise<KnowledgeItem[]> {
  const params: Record<string, string> = {}
  if (category) params.category = category
  if (search) params.search = search
  const { data } = await api.get('/knowledge', { params })
  return data
}

export async function getKnowledge(id: string): Promise<KnowledgeItem> {
  const { data } = await api.get(`/knowledge/${id}`)
  return data
}

export async function createKnowledge(item: {
  category: string; subType?: string; title: string; content: string; tags?: string[]
}): Promise<KnowledgeItem> {
  const { data } = await api.post('/knowledge', item)
  return data
}

export async function updateKnowledge(id: string, item: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
  const { data } = await api.put(`/knowledge/${id}`, item)
  return data
}

export async function deleteKnowledge(id: string): Promise<void> {
  await api.delete(`/knowledge/${id}`)
}

// ===== 角色预设选项 =====

export interface PresetGroup {
  title: string
  options: string[]
}

export async function getCharacterPresets(subType: string): Promise<PresetGroup[]> {
  const { data } = await api.get(`/knowledge/presets/${subType}`)
  return data
}
