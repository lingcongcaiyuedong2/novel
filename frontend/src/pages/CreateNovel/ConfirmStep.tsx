import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useNovelStore } from '../../stores/novelStore'
import { PRESET_DATA } from '../../types/novel'

export function ConfirmStep() {
  const navigate = useNavigate()
  const { config, isSubmitting, submitConfig } = useNovelStore()

  const genre = PRESET_DATA.genres.find((g) => g.value === config.genre)
  const style = PRESET_DATA.writingStyles.find((s) => s.value === config.writingStyle)
  const system = PRESET_DATA.systemTypes.find((s) => s.value === config.systemType)
  const cultivation = PRESET_DATA.cultivationSystems.find((c) => c.value === config.cultivationSystem)

  const handleSubmit = async () => {
    const id = await submitConfig()
    if (id) {
      navigate(`/novel/${id}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">确认配置</h2>
        <p className="mt-1 text-sm text-gray-500">请确认以下设定，提交后即可开始生成</p>
      </div>

      {/* Summary sections */}
      <div className="space-y-4">
        {/* Basic info */}
        <Section title="基础信息">
          <Row label="小说名称" value={config.title || '未命名'} />
          <Row label="题材方向" value={genre?.label || config.genre} />
          <Row label="写作风格" value={style?.label || config.writingStyle} />
          <Row label="目标字数" value={`${(config.targetWordCount / 10000).toFixed(0)} 万字`} />
        </Section>

        {/* World building */}
        <Section title="世界观">
          <Row label="修炼体系" value={cultivation?.label || config.cultivationSystem} />
          {config.systemType !== 'none' && (
            <Row label="系统类型" value={system?.label || config.systemType} />
          )}
          <Row label="境界体系" value={config.cultivationLevels.join(' → ') || '默认'} />
          {config.worldBackground && (
            <Row label="世界背景" value={config.worldBackground} multiline />
          )}
        </Section>

        {/* Characters */}
        <Section title="人物设定">
          <Row
            label="主角"
            value={config.protagonist.name || '由 AI 生成'}
            sub={config.protagonist.personality || undefined}
          />
          <Row
            label="反派"
            value={config.antagonist.name || '由 AI 生成'}
            sub={config.antagonist.personality || undefined}
          />
          <Row
            label="配角"
            value={
              config.supportingCharacters.length > 0
                ? config.supportingCharacters.map((c) => c.name || '未命名').join('、')
                : '由 AI 生成'
            }
          />
        </Section>

        {/* Plot */}
        <Section title="剧情设定">
          {config.mainConflict && (
            <Row label="主线冲突" value={config.mainConflict} multiline />
          )}
          {config.plotPoints.length > 0 && (
            <Row label="情节点" value={config.plotPoints.join(' → ')} />
          )}
          <Row
            label="伏笔密度"
            value={{ light: '轻度', medium: '中度', heavy: '重度' }[config.foreshadowingDensity]}
          />
          <Row
            label="故事节奏"
            value={{ fast: '快节奏', balanced: '均衡', slow: '慢节奏' }[config.storyRhythm]}
          />
        </Section>
      </div>

      {/* Submit button */}
      <div className="pt-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !config.title}
          className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              创建中...
            </>
          ) : (
            '确认创建小说'
          )}
        </button>
        {!config.title && (
          <p className="mt-2 text-xs text-red-500 text-center">请先填写小说名称</p>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  sub,
  multiline,
}: {
  label: string
  value: string
  sub?: string
  multiline?: boolean
}) {
  return (
    <div className="flex px-4 py-3 gap-4">
      <div className="w-20 shrink-0 text-xs font-medium text-gray-500 pt-0.5">{label}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm text-gray-900 ${multiline ? '' : 'truncate'}`}>{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}
