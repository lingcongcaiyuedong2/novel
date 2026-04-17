import { Plus } from 'lucide-react'
import { CharacterCard } from '../../components/CharacterCard'
import { useNovelStore } from '../../stores/novelStore'
import { defaultCharacter, type CharacterConfig } from '../../types/novel'

export function CharacterStep() {
  const { config, updateConfig } = useNovelStore()

  const addSupporting = () => {
    updateConfig({
      supportingCharacters: [...config.supportingCharacters, { ...defaultCharacter }],
    })
  }

  const updateSupporting = (index: number, char: CharacterConfig) => {
    const updated = [...config.supportingCharacters]
    updated[index] = char
    updateConfig({ supportingCharacters: updated })
  }

  const removeSupporting = (index: number) => {
    updateConfig({
      supportingCharacters: config.supportingCharacters.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">人物设定</h2>
        <p className="mt-1 text-sm text-gray-500">设定故事中的关键人物（姓名必填，其他可留空由 AI 自动生成）</p>
      </div>

      {/* Protagonist */}
      <CharacterCard
        title="主角"
        color="blue"
        role="protagonist"
        cultivationLevels={config.cultivationLevels}
        character={config.protagonist}
        onChange={(c) => updateConfig({ protagonist: c })}
        defaultExpanded
      />

      {/* Antagonist */}
      <CharacterCard
        title="反派"
        color="red"
        role="antagonist"
        cultivationLevels={config.cultivationLevels}
        character={config.antagonist}
        onChange={(c) => updateConfig({ antagonist: c })}
      />

      {/* Supporting Characters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">配角</h3>
          <button
            type="button"
            onClick={addSupporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus size={14} />
            添加配角
          </button>
        </div>

        {config.supportingCharacters.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-400">还没有配角，点击上方按钮添加</p>
            <p className="text-xs text-gray-400 mt-1">也可以留空，由 AI 自动生成</p>
          </div>
        ) : (
          config.supportingCharacters.map((char, index) => (
            <CharacterCard
              key={index}
              title={`配角 ${index + 1}`}
              color="green"
              role="supporting"
              cultivationLevels={config.cultivationLevels}
              character={char}
              onChange={(c) => updateSupporting(index, c)}
              onDelete={() => removeSupporting(index)}
            />
          ))
        )}
      </div>
    </div>
  )
}
