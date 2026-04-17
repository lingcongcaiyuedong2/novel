import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { StepWizard } from '../../components/StepWizard'
import { useNovelStore } from '../../stores/novelStore'
import { BasicSettingsStep } from './BasicSettingsStep'
import { WorldBuildingStep } from './WorldBuildingStep'
import { CharacterStep } from './CharacterStep'
import { PlotStep } from './PlotStep'
import { ConfirmStep } from './ConfirmStep'

const steps = [
  { label: '基础设置', description: '名称、题材、风格' },
  { label: '世界观', description: '修炼体系、境界' },
  { label: '人物设定', description: '主角、配角、反派' },
  { label: '剧情设定', description: '冲突、伏笔、节奏' },
  { label: '确认创建', description: '预览并提交' },
]

const stepComponents = [
  BasicSettingsStep,
  WorldBuildingStep,
  CharacterStep,
  PlotStep,
  ConfirmStep,
]

export function CreateNovelPage() {
  const navigate = useNavigate()
  const { currentStep, setStep, nextStep, prevStep, config } = useNovelStore()
  const StepComponent = stepComponents[currentStep]

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return config.title.trim().length > 0
      default:
        return true
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          返回首页
        </button>
        <h1 className="mt-3 text-xl font-bold text-gray-900">创建新小说</h1>
      </div>

      {/* Wizard */}
      <StepWizard steps={steps} currentStep={currentStep} onStepClick={setStep}>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <StepComponent />
        </div>

        {/* Navigation buttons */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={16} />
              上一步
            </button>
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              下一步
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </StepWizard>
    </div>
  )
}
