import axios from 'axios'
import type { NovelConfig, NovelSummary, NovelDetail, Chapter } from '../types/novel'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export async function createNovel(config: NovelConfig): Promise<NovelDetail> {
  const { data } = await api.post('/novels', { config })
  return data
}

export async function listNovels(): Promise<NovelSummary[]> {
  const { data } = await api.get('/novels')
  return data
}

export async function getNovel(id: string): Promise<NovelDetail> {
  const { data } = await api.get(`/novels/${id}`)
  return data
}

export async function updateNovel(
  id: string,
  updates: { config?: NovelConfig; status?: string },
): Promise<NovelDetail> {
  const { data } = await api.put(`/novels/${id}`, updates)
  return data
}

export async function deleteNovel(id: string): Promise<void> {
  await api.delete(`/novels/${id}`)
}

// ========== 生成相关 ==========

export async function triggerGeneration(novelId: string): Promise<void> {
  await api.post(`/novels/${novelId}/generate`)
}

export function connectGenerationStream(novelId: string): EventSource {
  return new EventSource(`/api/novels/${novelId}/generate/stream`)
}

// ========== 章节相关 ==========

export async function getChapters(novelId: string): Promise<Chapter[]> {
  const { data } = await api.get(`/novels/${novelId}/chapters`)
  return data
}

export async function getChapter(chapterId: string): Promise<Chapter> {
  const { data } = await api.get(`/chapters/${chapterId}`)
  return data
}

export async function updateChapter(
  chapterId: string,
  updates: { title?: string; content?: string; outline?: string },
): Promise<Chapter> {
  const { data } = await api.put(`/chapters/${chapterId}`, updates)
  return data
}

export function generateChapterContent(chapterId: string): EventSource {
  return new EventSource(`/api/chapters/${chapterId}/generate`)
}

// ========== 批量生成 ==========

export function batchGenerateChapters(novelId: string): EventSource {
  return new EventSource(`/api/novels/${novelId}/generate/chapters`)
}

// ========== 导出 ==========

export function getExportUrl(novelId: string, format: string = 'txt'): string {
  return `/api/novels/${novelId}/export?format=${format}`
}
