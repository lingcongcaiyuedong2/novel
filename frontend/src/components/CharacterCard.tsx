import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Trash2, UserCircle } from 'lucide-react'
import { PRESET_DATA } from '../types/novel'
import type { CharacterConfig, Gender } from '../types/novel'
import { FormField, TextInput } from './FormField'
import { ChipSelect } from './ChipSelect'
import { getCharacterPresets, type PresetGroup } from '../api/knowledge'

interface CharacterCardProps {
  character: CharacterConfig
  onChange: (character: CharacterConfig) => void
  title: string
  color?: 'blue' | 'green' | 'red' | 'gray'
  role?: 'protagonist' | 'antagonist' | 'supporting'
  cultivationLevels?: string[]
  onDelete?: () => void
  defaultExpanded?: boolean
}

const colorMap = {
  blue: 'border-blue-200 bg-blue-50',
  green: 'border-green-200 bg-green-50',
  red: 'border-red-200 bg-red-50',
  gray: 'border-gray-200 bg-gray-50',
}

const titleColorMap = {
  blue: 'text-blue-700',
  green: 'text-green-700',
  red: 'text-red-700',
  gray: 'text-gray-700',
}

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' },
]

// Cache presets across all CharacterCard instances
const presetsCache: Record<string, PresetGroup[]> = {}

async function loadPresets(subType: string): Promise<PresetGroup[]> {
  if (presetsCache[subType]) return presetsCache[subType]
  try {
    const data = await getCharacterPresets(subType)
    presetsCache[subType] = data
    return data
  } catch {
    return []
  }
}

export function CharacterCard({
  character,
  onChange,
  title,
  color = 'gray',
  role = 'supporting',
  cultivationLevels,
  onDelete,
  defaultExpanded = false,
}: CharacterCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [personalityPresets, setPersonalityPresets] = useState<PresetGroup[]>([])
  const [abilityPresets, setAbilityPresets] = useState<PresetGroup[]>([])
  const [motivationPresets, setMotivationPresets] = useState<PresetGroup[]>([])
  const [backgroundPresets, setBackgroundPresets] = useState<PresetGroup[]>([])

  const levels = cultivationLevels?.length ? cultivationLevels : PRESET_DATA.defaultLevels

  // Load presets on first expand
  useEffect(() => {
    if (!expanded) return
    loadPresets('special_ability').then(setAbilityPresets)
    loadPresets('motivation').then(setMotivationPresets)
    loadPresets('background').then(setBackgroundPresets)
    loadPresets('personality').then((groups) => {
      // Filter personality groups by role and gender
      const filtered = groups.filter((g) => {
        if (role === 'antagonist') return g.title.includes('反派')
        if (character.gender === 'female') return g.title.includes('女性')
        if (character.gender === 'male') return g.title.includes('男性')
        // unknown gender: show male + female
        return g.title.includes('男性') || g.title.includes('女性')
      })
      setPersonalityPresets(filtered.length ? filtered : groups)
    })
  }, [expanded, role, character.gender])

  const update = (field: keyof CharacterConfig, value: string) => {
    onChange({ ...character, [field]: value })
  }

  return (
    <div className={`rounded-xl border-2 ${colorMap[color]} overflow-hidden`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <UserCircle size={20} className={titleColorMap[color]} />
          <div>
            <span className={`text-sm font-semibold ${titleColorMap[color]}`}>{title}</span>
            {character.name && (
              <span className="ml-2 text-sm text-gray-600">· {character.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
            >
              <Trash2 size={16} />
            </button>
          )}
          {expanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="姓名" required>
              <TextInput
                value={character.name}
                onChange={(v) => update('name', v)}
                placeholder="请输入姓名"
              />
            </FormField>

            <FormField label="性别">
              <div className="flex gap-2">
                {genderOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('gender', opt.value)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      character.gender === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </FormField>
          </div>

          <FormField label="初始境界" description="角色登场时所处的修炼境界">
            <select
              value={character.initialLevel}
              onChange={(e) => update('initialLevel', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">请选择境界</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="出身背景" description="家族、门派、成长经历等">
            <ChipSelect
              groups={backgroundPresets}
              value={character.background}
              onChange={(v) => update('background', v)}
              multi={false}
              placeholder="自定义出身背景..."
            />
          </FormField>

          <FormField label="性格特点" description="选择2-4个性格标签">
            <ChipSelect
              groups={personalityPresets}
              value={character.personality}
              onChange={(v) => update('personality', v)}
              multi
              maxSelect={4}
              placeholder="自定义性格..."
            />
          </FormField>

          <FormField label="特殊能力/天赋" description="体质、灵根、天赋或金手指">
            <ChipSelect
              groups={abilityPresets}
              value={character.specialAbility}
              onChange={(v) => update('specialAbility', v)}
              multi
              maxSelect={3}
              placeholder="自定义能力..."
            />
          </FormField>

          <FormField label="目标/动机" description="角色的核心追求">
            <ChipSelect
              groups={motivationPresets}
              value={character.motivation}
              onChange={(v) => update('motivation', v)}
              multi
              maxSelect={2}
              placeholder="自定义动机..."
            />
          </FormField>
        </div>
      )}
    </div>
  )
}
