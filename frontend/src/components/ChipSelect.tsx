import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { PresetGroup } from '../api/knowledge'

interface ChipSelectProps {
  groups: PresetGroup[]
  value: string
  onChange: (value: string) => void
  multi?: boolean
  maxSelect?: number
  placeholder?: string
}

const SEPARATOR = '、'

export function ChipSelect({
  groups,
  value,
  onChange,
  multi = true,
  maxSelect,
  placeholder = '选择或自定义...',
}: ChipSelectProps) {
  const [customInput, setCustomInput] = useState('')

  const selected = value ? value.split(SEPARATOR).filter(Boolean) : []

  const setSelected = (next: string[]) => {
    onChange(next.join(SEPARATOR))
  }

  const toggle = (option: string) => {
    if (!multi) {
      // single select: toggle off if already selected, otherwise replace
      setSelected(selected.includes(option) ? [] : [option])
      return
    }
    if (selected.includes(option)) {
      setSelected(selected.filter((s) => s !== option))
    } else {
      if (maxSelect && selected.length >= maxSelect) return
      setSelected([...selected, option])
    }
  }

  const addCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed || selected.includes(trimmed)) return
    if (!multi) {
      setSelected([trimmed])
    } else {
      if (maxSelect && selected.length >= maxSelect) return
      setSelected([...selected, trimmed])
    }
    setCustomInput('')
  }

  const isAtLimit = multi && maxSelect ? selected.length >= maxSelect : false

  return (
    <div className="space-y-3">
      {/* Selected tags display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => toggle(tag)}
                className="ml-0.5 text-indigo-400 hover:text-indigo-600"
              >
                &times;
              </button>
            </span>
          ))}
          {multi && maxSelect && (
            <span className="self-center text-xs text-gray-400">
              {selected.length}/{maxSelect}
            </span>
          )}
        </div>
      )}

      {/* Option groups */}
      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="mb-1 text-xs font-medium text-gray-500">{group.title}</div>
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((option) => {
                const isSelected = selected.includes(option)
                const isDisabled = !isSelected && isAtLimit
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggle(option)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : isDisabled
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-300 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder={placeholder}
          disabled={isAtLimit}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={isAtLimit || !customInput.trim()}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={12} />
          自定义
        </button>
      </div>
    </div>
  )
}
