import { create } from 'zustand'
import type { NovelConfig, NovelSummary } from '../types/novel'
import { defaultNovelConfig } from '../types/novel'
import * as api from '../api/client'

interface NovelStore {
  // Wizard state
  config: NovelConfig
  currentStep: number
  isSubmitting: boolean

  // Novel list
  novels: NovelSummary[]
  isLoading: boolean

  // Wizard actions
  updateConfig: (partial: Partial<NovelConfig>) => void
  resetConfig: () => void
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void

  // API actions
  submitConfig: () => Promise<string | null>
  fetchNovels: () => Promise<void>
  removeNovel: (id: string) => Promise<void>
}

export const useNovelStore = create<NovelStore>((set, get) => ({
  config: { ...defaultNovelConfig },
  currentStep: 0,
  isSubmitting: false,
  novels: [],
  isLoading: false,

  updateConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  resetConfig: () =>
    set({ config: { ...defaultNovelConfig }, currentStep: 0 }),

  setStep: (step) => set({ currentStep: step }),

  nextStep: () =>
    set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),

  prevStep: () =>
    set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),

  submitConfig: async () => {
    set({ isSubmitting: true })
    try {
      const { config } = get()
      const novel = await api.createNovel(config)
      set({ isSubmitting: false })
      return novel.id
    } catch (err) {
      console.error('Failed to create novel:', err)
      set({ isSubmitting: false })
      return null
    }
  },

  fetchNovels: async () => {
    set({ isLoading: true })
    try {
      const novels = await api.listNovels()
      set({ novels, isLoading: false })
    } catch (err) {
      console.error('Failed to fetch novels:', err)
      set({ isLoading: false })
    }
  },

  removeNovel: async (id: string) => {
    try {
      await api.deleteNovel(id)
      set((state) => ({ novels: state.novels.filter((n) => n.id !== id) }))
    } catch (err) {
      console.error('Failed to delete novel:', err)
    }
  },
}))
