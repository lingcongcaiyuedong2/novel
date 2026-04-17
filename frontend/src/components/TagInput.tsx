import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X, GripVertical } from 'lucide-react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  presets?: string[]
}

export function TagInput({ tags, onChange, placeholder = '输入后回车添加', presets }: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const moveTag = (from: number, to: number) => {
    if (to < 0 || to >= tags.length) return
    const newTags = [...tags]
    const [removed] = newTags.splice(from, 1)
    newTags.splice(to, 0, removed)
    onChange(newTags)
  }

  const loadPresets = () => {
    if (presets) {
      onChange([...presets])
    }
  }

  return (
    <div className="space-y-2">
      {/* Tag list */}
      <div className="flex flex-wrap gap-2 min-h-[40px] rounded-lg border border-gray-300 p-2">
        {tags.map((tag, index) => (
          <div
            key={`${tag}-${index}`}
            className="flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-sm text-indigo-700"
          >
            <button
              type="button"
              onClick={() => index > 0 && moveTag(index, index - 1)}
              className="text-indigo-400 hover:text-indigo-600 cursor-grab"
            >
              <GripVertical size={12} />
            </button>
            <span className="text-xs text-gray-400 mr-1">{index + 1}.</span>
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 text-indigo-400 hover:text-indigo-600"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : '继续添加...'}
          className="flex-1 min-w-[120px] border-none outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
        />
      </div>

      {/* Preset button */}
      {presets && (
        <button
          type="button"
          onClick={loadPresets}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          使用默认境界体系
        </button>
      )}
    </div>
  )
}
