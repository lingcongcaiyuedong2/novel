import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Sparkles, Check, Loader2 } from 'lucide-react'
import { batchGenerateChapters } from '../api/client'
import type { Chapter } from '../types/novel'

interface ChapterListProps {
  novelId: string
  chapters: Chapter[]
  onRefresh?: () => void
}

export function ChapterList({ novelId, chapters, onRefresh }: ChapterListProps) {
  const navigate = useNavigate()
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState('')
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => () => { esRef.current?.close() }, [])

  const doneCount = chapters.filter((ch) => ch.status === 'done').length
  const pendingCount = chapters.filter((ch) => ch.status === 'pending').length

  const handleBatchGenerate = () => {
    setBatchGenerating(true)
    setBatchProgress('准备中...')
    const es = batchGenerateChapters(novelId)
    esRef.current = es

    es.addEventListener('chapter_start', (e) => {
      const d = JSON.parse(e.data)
      setBatchProgress(`正在生成第 ${d.number} 章 (${d.index}/${d.total})...`)
    })
    es.addEventListener('batch_done', () => {
      setBatchGenerating(false)
      setBatchProgress('')
      es.close()
      onRefresh?.()
    })
    es.addEventListener('error', () => { setBatchGenerating(false); es.close() })
    es.onerror = () => { setBatchGenerating(false); es.close() }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          共 {chapters.length} 章 / 已生成正文 {doneCount} 章
        </div>
        {pendingCount > 0 && !batchGenerating && (
          <button
            onClick={handleBatchGenerate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Sparkles size={14} /> 批量生成正文 ({pendingCount}章)
          </button>
        )}
        {batchGenerating && (
          <div className="inline-flex items-center gap-1.5 text-xs text-indigo-600">
            <Loader2 size={14} className="animate-spin" /> {batchProgress}
          </div>
        )}
      </div>

      {/* Chapter list */}
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            onClick={() => navigate(`/novel/${novelId}/chapter/${chapter.id}`)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <span className="text-xs text-gray-400 w-12 shrink-0 text-right">
              第{chapter.chapterNumber}章
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800 truncate">{chapter.title}</div>
              {chapter.outline && (
                <div className="text-xs text-gray-400 truncate mt-0.5">{chapter.outline.slice(0, 80)}...</div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {chapter.wordCount > 0 && (
                <span className="text-xs text-gray-400">{chapter.wordCount}字</span>
              )}
              {chapter.status === 'done' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700">
                  <Check size={10} />
                  已完成
                </span>
              ) : chapter.status === 'generating' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700">
                  <Sparkles size={10} />
                  生成中
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  <FileText size={10} />
                  仅大纲
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
