import { FormField, TextInput } from '../../components/FormField'
import { SelectGroup } from '../../components/SelectGroup'
import { useNovelStore } from '../../stores/novelStore'
import { PRESET_DATA, type Genre, type WritingStyle } from '../../types/novel'

export function BasicSettingsStep() {
  const { config, updateConfig } = useNovelStore()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">基础设置</h2>
        <p className="mt-1 text-sm text-gray-500">设定小说的基本信息和风格方向</p>
      </div>

      <FormField label="小说名称" required description="给你的小说取个响亮的名字">
        <TextInput
          value={config.title}
          onChange={(v) => updateConfig({ title: v })}
          placeholder="如：万古第一神帝"
          maxLength={50}
        />
      </FormField>

      <FormField label="题材方向" required description="选择小说的核心题材类型">
        <SelectGroup<Genre>
          options={PRESET_DATA.genres}
          value={config.genre}
          onChange={(v) => updateConfig({ genre: v })}
          columns={3}
        />
      </FormField>

      <FormField label="写作风格" required description="决定小说的整体叙事风格">
        <SelectGroup<WritingStyle>
          options={PRESET_DATA.writingStyles}
          value={config.writingStyle}
          onChange={(v) => updateConfig({ writingStyle: v })}
          columns={3}
        />
      </FormField>

      <FormField label="目标字数" description="小说的预估总字数">
        <div className="grid grid-cols-3 gap-3">
          {PRESET_DATA.wordCountOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateConfig({ targetWordCount: opt.value })}
              className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                config.targetWordCount === opt.value
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  config.targetWordCount === opt.value ? 'text-indigo-700' : 'text-gray-700'
                }`}
              >
                {opt.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </FormField>
    </div>
  )
}
