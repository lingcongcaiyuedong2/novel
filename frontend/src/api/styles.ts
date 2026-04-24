import axios from 'axios'

const api = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } })

export interface StyleProfile {
  id: string
  name: string
  description: string
  sampleWordCount: number
  sourceFilenames: string[]
  profileText: string
  status: 'extracting' | 'ready' | 'failed'
  errorMessage: string
  createdAt: string
  updatedAt: string
}

export async function listStyles(): Promise<StyleProfile[]> {
  const { data } = await api.get('/styles')
  return data
}

export async function getStyle(id: string): Promise<StyleProfile> {
  const { data } = await api.get(`/styles/${id}`)
  return data
}

export async function createStyle(formData: FormData): Promise<StyleProfile> {
  const { data } = await api.post('/styles', formData, {
    timeout: 120_000,
  })
  return data
}

export async function deleteStyle(id: string): Promise<void> {
  await api.delete(`/styles/${id}`)
}
