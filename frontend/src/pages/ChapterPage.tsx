import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Edit3, Save, Sparkles, Loader2, AlertTriangle, RotateCcw } from 'lucide-react'
import { getChapter, getChapters, updateChapter, generateChapterContent } from '../api/client'
import { StreamingText } from '../components/StreamingText'
import type { Chapter } from '../types/novel'

const GENERATE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function ChapterPage() {
  const { id: novelId, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [allChapters, setAllChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [genError, setGenError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    if (!novelId || !chapterId) return
    setLoading(true)
    try {
      const [ch, chs] = await Promise.all([
        getChapter(chapterId),
        getChapters(novelId),
      ])
      setChapter(ch)
      setAllChapters(chs)
    } catch {
      navigate(`/novel/${novelId}`)
    } finally {
      setLoading(false)
    }
  }, [novelId, chapterId, navigate])

  useEffect(() => {
    fetchData()
    return () => {
      eventSourceRef.current?.close()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [fetchData])

  const handleSave = async () => {
    if (!chapterId) return
    setSaving(true)
    try {
      const updated = await updateChapter(chapterId, { content: editContent })
      setChapter(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const cleanupGeneration = () => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }

  const handleGenerate = () => {
    if (!chapterId) return
    setGenerating(true)
    setStreamContent('')
    setGenError(null)

    const es = generateChapterContent(chapterId)
    eventSourceRef.current = es

    // 超时检测
    timeoutRef.current = setTimeout(() => {
      cleanupGeneration()
      setGenerating(false)
      setGenError('生成超时（超过5分钟），请检查网络后重试')
    }, GENERATE_TIMEOUT_MS)

    es.addEventListener('chunk', (e) => {
      const data = JSON.parse(e.data)
      setStreamContent((prev) => prev + data.text)
    })

    es.addEventListener('done', () => {
      cleanupGeneration()
      setGenerating(false)
      fetchData()
    })

    es.addEventListener('error', (e) => {
      cleanupGeneration()
      setGenerating(false)
      try {
        const data = JSON.parse((e as MessageEvent).data)
        setGenError(data.message || '生成失败，请重试')
      } catch {
        setGenError('生成连接中断，请重试')
      }
    })

    es.onerror = () => {
      cleanupGeneration()
      setGenerating(false)
      setGenError('与服务器的连接断开，请重试')
    }
  }

  const currentIndex = allChapters.findIndex((ch) => ch.id === chapterId)
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null
  const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null

  if (loading || !chapter) {
    return <div className="mx-auto max-w-4xl px-6 py-12 text-center text-gray-400">加载中...</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/novel/${novelId}`)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          返回小说详情
        </button>
      </div>

      {/* Chapter header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">
          第{chapter.chapterNumber}章：{chapter.title}
        </h1>
        {chapter.wordCount > 0 && (
          <p className="mt-1 text-sm text-gray-500">{chapter.wordCount} 字</p>
        )}
      </div>

      {/* Chapter outline */}
      {chapter.outline && (
        <div className="mb-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 mb-2">章节大纲</h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{chapter.outline}</div>
        </div>
      )}

      {/* Content area */}
      <div className="mb-8">
        {generating ? (
          /* Streaming generation */
          <div className="rounded-xl border border-indigo-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              <span className="text-sm font-medium text-indigo-600">正在生成正文...</span>
            </div>
            <StreamingText text={streamContent} className="max-h-[600px]" />
          </div>
        ) : editing ? (
          /* Edit mode */
          <div className="space-y-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={25}
              className="w-full rounded-xl border border-gray-300 p-4 text-sm text-gray-800 leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                保存
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        ) : chapter.content ? (
          /* Read mode */
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditContent(chapter.content)
                  setEditing(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Edit3 size={12} />
                编辑
              </button>
            </div>
            <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {chapter.content}
            </div>
          </div>
        ) : (
          /* No content - generate button */
          <div className="text-center py-16 rounded-xl border-2 border-dashed border-gray-200">
            {genError ? (
              <>
                <AlertTriangle size={32} className="mx-auto text-red-400 mb-4" />
                <h3 className="text-base font-medium text-red-600">生成失败</h3>
                <p className="mt-1 text-sm text-red-400">{genError}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <RotateCcw size={16} />
                  重试生成
                </button>
              </>
            ) : (
              <>
                <Sparkles size={32} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-base font-medium text-gray-600">本章还没有正文</h3>
                <p className="mt-1 text-sm text-gray-400">点击下方按钮让 AI 生成本章正文</p>
                <button
                  onClick={handleGenerate}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <Sparkles size={16} />
                  生成本章正文
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        {prevChapter ? (
          <button
            onClick={() => navigate(`/novel/${novelId}/chapter/${prevChapter.id}`)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            上一章：{prevChapter.title}
          </button>
        ) : (
          <div />
        )}
        {nextChapter ? (
          <button
            onClick={() => navigate(`/novel/${novelId}/chapter/${nextChapter.id}`)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            下一章：{nextChapter.title}
            <ArrowRight size={16} />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
