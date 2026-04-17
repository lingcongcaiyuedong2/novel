import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

interface Step {
  label: string
  description?: string
}

interface StepWizardProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
  children: ReactNode
}

export function StepWizard({ steps, currentStep, onStepClick, children }: StepWizardProps) {
  return (
    <div className="flex min-h-[600px] gap-8">
      {/* Left sidebar - step navigation */}
      <div className="w-64 shrink-0">
        <nav className="sticky top-8">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            return (
              <button
                key={index}
                onClick={() => onStepClick?.(index)}
                disabled={index > currentStep}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors rounded-lg mb-1 ${
                  isCurrent
                    ? 'bg-indigo-50 text-indigo-700'
                    : isCompleted
                    ? 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check size={14} /> : index + 1}
                </div>
                <div>
                  <div className="text-sm font-medium">{step.label}</div>
                  {step.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
                  )}
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Right content area */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
