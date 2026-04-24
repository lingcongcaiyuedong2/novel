import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Sparkles } from 'lucide-react'
import { useNovelStore } from '../stores/novelStore'
import type { NovelSummary } from '../types/novel'
import { PRESET_DATA } from '../types/novel'

const statusLabels: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'bg-gray-100 text-gray-700' },
  generating: { text: '生成中', color: 'bg-yellow-100 text-yellow-700' },
  outline_done: { text: '大纲完成', color: 'bg-blue-100 text-blue-700' },
  writing: { text: '写作中', color: 'bg-purple-100 text-purple-700' },
  completed: { text: '已完成', color: 'bg-green-100 text-green-700' },
  error: { text: '出错', color: 'bg-red-100 text-red-700' },
}

function NovelCard({ novel, onDelete }: { novel: NovelSummary; onDelete: () => void }) {
  const navigate = useNavigate()
  const genre = PRESET_DATA.genres.find((g) => g.value === novel.genre)
  const status = statusLabels[novel.status] || statusLabels.draft

  return (
    <div
      onClick={() => navigate(`/novel/${novel.id}`)}
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{novel.title || '未命名小说'}</h3>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${status.color}`}>
              {status.text}
            </span>
            {genre && (
              <span className="text-xs text-gray-500">{genre.label}</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span>目标 {(novel.targetWordCount / 10000).toFixed(0)} 万字</span>
            <span>{novel.chapterCount} 章</span>
            <span>{new Date(novel.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 rounded-lg transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const { novels, isLoading, fetchNovels, removeNovel, resetConfig } = useNovelStore()

  useEffect(() => {
    fetchNovels()
  }, [fetchNovels])

  const handleCreate = () => {
    resetConfig()
    navigate('/create')
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">修仙小说生成器</h1>
          <p className="mt-1 text-sm text-gray-500">配置参数，AI 自动生成高质量修仙系统流小说</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/knowledge')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <BookOpen size={16} />
            知识库
          </button>
          <button
            onClick={() => navigate('/styles')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Sparkles size={16} />
            风格库
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            新建小说
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-gray-100 rounded w-12" />
                <div className="h-5 bg-gray-100 rounded w-16" />
              </div>
              <div className="flex gap-4">
                <div className="h-4 bg-gray-100 rounded w-20" />
                <div className="h-4 bg-gray-100 rounded w-10" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : novels.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20">
          <BookOpen size={48} className="mx-auto text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-600">还没有创建任何小说</h3>
          <p className="mt-2 text-sm text-gray-400">点击上方「新建小说」开始创作你的修仙世界</p>
          <button
            onClick={handleCreate}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            创建第一本小说
          </button>
        </div>
      ) : (
        /* Novel grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {novels.map((novel) => (
            <NovelCard
              key={novel.id}
              novel={novel}
              onDelete={() => removeNovel(novel.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
