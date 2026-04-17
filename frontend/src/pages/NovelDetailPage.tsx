import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, FileText, Users, BookOpen, List, Download, Edit3 } from 'lucide-react'
import { getNovel, getChapters, getExportUrl } from '../api/client'
import { GenerationProgress } from '../components/GenerationProgress'
import { ChapterList } from '../components/ChapterList'
import type { NovelDetail, Chapter } from '../types/novel'

type TabKey = 'world' | 'outline' | 'characters' | 'volumes' | 'chapters'

const tabs: { key: TabKey; label: string; icon: typeof Globe }[] = [
  { key: 'world', label: '世界观', icon: Globe },
  { key: 'outline', label: '总大纲', icon: FileText },
  { key: 'characters', label: '人物档案', icon: Users },
  { key: 'volumes', label: '分卷大纲', icon: BookOpen },
  { key: 'chapters', label: '章节列表', icon: List },
]

const statusLabels: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'bg-gray-100 text-gray-700' },
  generating: { text: '生成中', color: 'bg-yellow-100 text-yellow-700' },
  outline_done: { text: '大纲完成', color: 'bg-blue-100 text-blue-700' },
  writing: { text: '写作中', color: 'bg-purple-100 text-purple-700' },
  completed: { text: '已完成', color: 'bg-green-100 text-green-700' },
  error: { text: '出错', color: 'bg-red-100 text-red-700' },
}

export function NovelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [novel, setNovel] = useState<NovelDetail | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('world')
  const [loading, setLoading] = useState(true)
  const [showGeneration, setShowGeneration] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [novelData, chaptersData] = await Promise.all([
        getNovel(id),
        getChapters(id).catch(() => []),
      ])
      setNovel(novelData)
      setChapters(chaptersData)

      if (novelData.status === 'draft' || novelData.status === 'generating') {
        setShowGeneration(true)
      }
    } catch {
      // Don't redirect on error - show the page with empty state
      setNovel(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerationComplete = useCallback(() => {
    setShowGeneration(false)
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 text-center text-gray-400">
        加载中...
      </div>
    )
  }

  if (!novel) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 text-center">
        <p className="text-gray-400">小说不存在或加载失败</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-700"
        >
          返回首页
        </button>
      </div>
    )
  }

  const status = statusLabels[novel.status] || statusLabels.draft

  const tabContent: Record<TabKey, string> = {
    world: novel.worldBuilding || '',
    outline: novel.outline || '',
    characters: novel.charactersDoc || '',
    volumes: novel.volumeOutline || '',
    chapters: '',
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          返回首页
        </button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{novel.title}</h1>
            <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            目标 {(novel.targetWordCount / 10000).toFixed(0)} 万字 / {novel.chapterCount} 章
          </p>
        </div>

        {(novel.status === 'draft' || novel.status === 'error') && !showGeneration && (
          <button
            onClick={() => setShowGeneration(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            开始生成大纲
          </button>
        )}

        {novel.status !== 'draft' && novel.status !== 'generating' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/novel/${id}/edit`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit3 size={14} /> 编辑配置
            </button>
            {chapters.some(ch => ch.status === 'done') && (
              <a
                href={getExportUrl(id!, 'txt')}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Download size={14} /> 导出 TXT
              </a>
            )}
          </div>
        )}
      </div>

      {/* Generation progress or content */}
      {showGeneration ? (
        <GenerationProgress novelId={id!} onComplete={handleGenerationComplete} />
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const hasContent = tab.key === 'chapters' ? chapters.length > 0 : !!tabContent[tab.key]
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-indigo-600 text-indigo-600'
                      : hasContent
                      ? 'border-transparent text-gray-600 hover:text-gray-900'
                      : 'border-transparent text-gray-400 cursor-default'
                  }`}
                  disabled={!hasContent && tab.key !== 'chapters'}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === 'chapters' ? (
              chapters.length > 0 ? (
                <ChapterList novelId={id!} chapters={chapters} />
              ) : (
                <div className="text-center py-16 text-sm text-gray-400">
                  还没有生成章节大纲
                </div>
              )
            ) : tabContent[activeTab] ? (
              <div className="prose prose-sm max-w-none rounded-xl border border-gray-200 bg-white p-6">
                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {tabContent[activeTab]}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-sm text-gray-400">
                该内容尚未生成
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
