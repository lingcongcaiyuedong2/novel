import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { getNovel, updateNovel } from '../api/client'
import { useNovelStore } from '../stores/novelStore'
import { StepWizard } from '../components/StepWizard'
import { BasicSettingsStep } from './CreateNovel/BasicSettingsStep'
import { WorldBuildingStep } from './CreateNovel/WorldBuildingStep'
import { CharacterStep } from './CreateNovel/CharacterStep'
import { PlotStep } from './CreateNovel/PlotStep'
import { PRESET_DATA } from '../types/novel'
import type { NovelConfig, NovelDetail } from '../types/novel'

const steps = [
  { label: '基础设置', description: '名称、题材、风格' },
  { label: '世界观', description: '修炼体系、境界' },
  { label: '人物设定', description: '主角、配角、反派' },
  { label: '剧情设定', description: '冲突、伏笔、节奏' },
]

const stepComponents = [BasicSettingsStep, WorldBuildingStep, CharacterStep, PlotStep]

/** 配置预览面板 */
function ConfigPreview({ config }: { config: NovelConfig }) {
  const genre = PRESET_DATA.genres.find(g => g.value === config.genre)
  const style = PRESET_DATA.writingStyles.find(s => s.value === config.writingStyle)
  const sys = PRESET_DATA.systemTypes.find(s => s.value === config.systemType)
  const wc = PRESET_DATA.wordCountOptions.find(w => w.value === config.targetWordCount)

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-semibold text-gray-700 mb-1">基础信息</h4>
        <dl className="space-y-1 text-gray-600">
          <div className="flex justify-between"><dt>书名</dt><dd className="font-medium text-gray-800">{config.title || '未设置'}</dd></div>
          <div className="flex justify-between"><dt>题材</dt><dd>{genre?.label || config.genre}</dd></div>
          <div className="flex justify-between"><dt>风格</dt><dd>{style?.label || config.writingStyle}</dd></div>
          <div className="flex justify-between"><dt>目标字数</dt><dd>{wc?.label || `${config.targetWordCount / 10000}万`}</dd></div>
        </dl>
      </div>
      <hr className="border-gray-100" />
      <div>
        <h4 className="font-semibold text-gray-700 mb-1">世界观</h4>
        <dl className="space-y-1 text-gray-600">
          <div className="flex justify-between"><dt>系统类型</dt><dd>{sys?.label || '无'}</dd></div>
          <div><dt className="mb-0.5">境界体系</dt><dd className="text-xs text-gray-500">{config.cultivationLevels.join(' → ')}</dd></div>
        </dl>
      </div>
      <hr className="border-gray-100" />
      <div>
        <h4 className="font-semibold text-gray-700 mb-1">人物</h4>
        <dl className="space-y-1 text-gray-600">
          <div className="flex justify-between"><dt>主角</dt><dd>{config.protagonist.name || '未设置'}</dd></div>
          <div className="flex justify-between"><dt>反派</dt><dd>{config.antagonist.name || '未设置'}</dd></div>
          <div className="flex justify-between"><dt>配角数</dt><dd>{config.supportingCharacters.filter(c => c.name).length} 人</dd></div>
        </dl>
      </div>
      <hr className="border-gray-100" />
      <div>
        <h4 className="font-semibold text-gray-700 mb-1">剧情</h4>
        <dl className="space-y-1 text-gray-600">
          <div><dt className="mb-0.5">主线冲突</dt><dd className="text-xs text-gray-500 line-clamp-2">{config.mainConflict || '未设置'}</dd></div>
          <div className="flex justify-between"><dt>情节点</dt><dd>{config.plotPoints.length} 个</dd></div>
        </dl>
      </div>
    </div>
  )
}

export function EditNovelPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const { config, updateConfig, currentStep, setStep, nextStep, prevStep } = useNovelStore()
  const originalConfig = useRef<NovelConfig | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const novel: NovelDetail = await getNovel(id)
      // Populate store with existing config
      updateConfig(novel.config)
      originalConfig.current = { ...novel.config }
      setStep(0)
      setLoading(false)
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    await updateNovel(id, { config })
    setSaving(false)
    navigate(`/novel/${id}`)
  }

  const handleReset = () => {
    if (originalConfig.current) {
      updateConfig(originalConfig.current)
    }
  }

  const StepComponent = stepComponents[currentStep]

  if (loading) {
    return <div className="mx-auto max-w-5xl px-6 py-12 text-center text-gray-400">加载中...</div>
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button onClick={() => navigate(`/novel/${id}`)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={16} /> 返回详情
          </button>
          <h1 className="mt-3 text-xl font-bold text-gray-900">编辑小说配置</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(!showPreview)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />} {showPreview ? '隐藏预览' : '配置预览'}
          </button>
          <button onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            <RotateCcw size={14} /> 重置
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className={showPreview ? 'flex-1 min-w-0' : 'w-full'}>
          <StepWizard steps={steps} currentStep={currentStep} onStepClick={setStep}>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <StepComponent />
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一步
              </button>
              <div className="flex gap-3">
                {currentStep < 3 && (
                  <button onClick={nextStep} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                    下一步
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !config.title}
                  className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                >
                  {saving ? '保存中...' : '保存配置'}
                </button>
              </div>
            </div>
          </StepWizard>
        </div>

        {showPreview && (
          <div className="w-64 shrink-0">
            <div className="sticky top-8 rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">配置概览</h3>
              <ConfigPreview config={config} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
