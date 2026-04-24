import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FormField, TextInput } from '../../components/FormField'
import { SelectGroup } from '../../components/SelectGroup'
import { useNovelStore } from '../../stores/novelStore'
import { PRESET_DATA, type Genre, type WritingStyle } from '../../types/novel'
import { listStyles, type StyleProfile } from '../../api/styles'
import { Sparkles, X } from 'lucide-react'

export function BasicSettingsStep() {
  const { config, updateConfig } = useNovelStore()
  const [styles, setStyles] = useState<StyleProfile[]>([])

  useEffect(() => {
    listStyles()
      .then(data => setStyles(data.filter(s => s.status === 'ready')))
      .catch(() => setStyles([]))
  }, [])

  const selectedStyle = styles.find(s => s.id === config.customStyleId)
  const hasCustomStyle = !!config.customStyleId

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

      <FormField label="写作风格" required description={hasCustomStyle ? '已被自定义风格覆盖' : '决定小说的整体叙事风格'}>
        <div className={hasCustomStyle ? 'opacity-40 pointer-events-none' : ''}>
          <SelectGroup<WritingStyle>
            options={PRESET_DATA.writingStyles}
            value={config.writingStyle}
            onChange={(v) => updateConfig({ writingStyle: v })}
            columns={3}
          />
        </div>
      </FormField>

      {/* 自定义风格选择 */}
      <FormField
        label="自定义风格"
        description={
          styles.length > 0
            ? '选中后将覆盖上方内置风格。在"风格库"页面上传样本创建新风格。'
            : '暂无自定义风格。前往"风格库"页面上传小说样本创建。'
        }
      >
        {styles.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {styles.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateConfig({ customStyleId: config.customStyleId === s.id ? undefined : s.id })}
                  className={`text-left rounded-lg border-2 px-3 py-2.5 transition-all ${
                    config.customStyleId === s.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className={config.customStyleId === s.id ? 'text-indigo-600' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${config.customStyleId === s.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {s.name}
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.description}</p>
                  )}
                </button>
              ))}
            </div>
            {selectedStyle && (
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 flex items-start justify-between gap-2">
                <div className="text-xs text-indigo-700 min-w-0">
                  <span className="font-medium">已选：{selectedStyle.name}</span>
                  <span className="text-indigo-500 ml-1">· 样本 {selectedStyle.sampleWordCount.toLocaleString()} 字</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig({ customStyleId: undefined })}
                  className="text-indigo-400 hover:text-indigo-600 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/styles"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700"
          >
            <Sparkles size={14} /> 前往风格库创建
          </Link>
        )}
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
