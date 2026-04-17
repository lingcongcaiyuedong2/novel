import { useState, useEffect, useCallback, useRef } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { StreamingText } from './StreamingText'
import { connectGenerationStream, triggerGeneration } from '../api/client'

interface StageInfo {
  key: string
  label: string
  content: string
  wordCount?: number
  done: boolean
}

interface ChapterOutlineItem {
  chapterId: string
  number: number
  title: string
}

interface GenerationProgressProps {
  novelId: string
  onComplete: () => void
}

const STAGE_ORDER = ['world', 'outline', 'characters', 'volumes', 'chapter_outlines']

export function GenerationProgress({ novelId, onComplete }: GenerationProgressProps) {
  const [stages, setStages] = useState<StageInfo[]>([])
  const [activeStage, setActiveStage] = useState<string>('')
  const [viewingStage, setViewingStage] = useState<string>('')
  const [chapterOutlines, setChapterOutlines] = useState<ChapterOutlineItem[]>([])
  const [error, setError] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)
  const [started, setStarted] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const handleStart = useCallback(async () => {
    setStarted(true)
    setError('')

    try {
      await triggerGeneration(novelId)
    } catch {
      setError('Failed to start generation')
      setStarted(false)
      return
    }

    const es = connectGenerationStream(novelId)
    eventSourceRef.current = es

    es.addEventListener('stage_start', (e) => {
      const data = JSON.parse(e.data)
      setStages((prev) => {
        const exists = prev.find((s) => s.key === data.stage)
        if (exists) return prev
        return [...prev, { key: data.stage, label: data.label, content: '', done: false }]
      })
      setActiveStage(data.stage)
      setViewingStage(data.stage)
    })

    es.addEventListener('chunk', (e) => {
      const data = JSON.parse(e.data)
      setStages((prev) =>
        prev.map((s) =>
          s.key === data.stage ? { ...s, content: s.content + data.text } : s,
        ),
      )
    })

    es.addEventListener('stage_done', (e) => {
      const data = JSON.parse(e.data)
      setStages((prev) =>
        prev.map((s) =>
          s.key === data.stage ? { ...s, done: true, wordCount: data.wordCount } : s,
        ),
      )
    })

    es.addEventListener('chapter_outline', (e) => {
      const data = JSON.parse(e.data)
      setChapterOutlines((prev) => [...prev, data])
    })

    es.addEventListener('done', () => {
      setIsComplete(true)
      es.close()
    })

    es.addEventListener('error', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        setError(data.message || 'Generation failed')
      } catch {
        setError('Connection lost')
      }
      es.close()
    })

    es.onerror = () => {
      if (!isComplete) {
        es.close()
      }
    }
  }, [novelId, isComplete])

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (isComplete) {
      onComplete()
    }
  }, [isComplete, onComplete])

  const currentStageIndex = STAGE_ORDER.indexOf(activeStage)
  const totalStages = 5
  const progressPercent = isComplete ? 100 : Math.round(((currentStageIndex + 1) / totalStages) * 100)

  const currentContent = stages.find((s) => s.key === viewingStage)?.content || ''

  if (!started) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 mb-6">
          <Loader2 size={32} className="text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">准备生成</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          点击下方按钮开始生成小说大纲。系统将依次生成世界观、总大纲、人物档案、分卷大纲和章节大纲。
        </p>
        <button
          onClick={handleStart}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          开始生成大纲
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {isComplete ? '生成完成' : `正在生成：${stages.find((s) => s.key === activeStage)?.label || '...'}`}
          </span>
          <span className="text-sm text-gray-500">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Stage tabs */}
      <div className="flex gap-2 flex-wrap">
        {stages.map((stage) => (
          <button
            key={stage.key}
            onClick={() => setViewingStage(stage.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              viewingStage === stage.key
                ? 'bg-indigo-600 text-white'
                : stage.done
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {stage.done ? (
              <Check size={12} />
            ) : stage.key === activeStage ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            {stage.label}
            {stage.wordCount && <span className="opacity-60">({stage.wordCount}字)</span>}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {viewingStage === 'chapter_outlines' && chapterOutlines.length > 0 ? (
          <div className="p-4 max-h-[500px] overflow-y-auto">
            <div className="space-y-2">
              {chapterOutlines.map((ch) => (
                <div key={ch.chapterId} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
                  <span className="text-xs text-gray-400 w-12 shrink-0">第{ch.number}章</span>
                  <span className="text-sm text-gray-700">{ch.title}</span>
                </div>
              ))}
            </div>
            {/* Also show raw text if content exists */}
            {currentContent && (
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">查看原始输出</summary>
                <StreamingText text={currentContent} className="mt-2 max-h-[300px] p-3 bg-gray-50 rounded-lg" />
              </details>
            )}
          </div>
        ) : currentContent ? (
          <StreamingText text={currentContent} className="p-4 max-h-[500px]" />
        ) : (
          <div className="p-8 text-center text-sm text-gray-400">等待生成...</div>
        )}
      </div>

      {/* Done message */}
      {isComplete && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
          <Check size={24} className="mx-auto text-green-600 mb-2" />
          <p className="text-sm font-medium text-green-800">大纲生成完成！共 {chapterOutlines.length} 章</p>
          <p className="text-xs text-green-600 mt-1">现在可以查看大纲内容，或开始生成章节正文</p>
        </div>
      )}
    </div>
  )
}
