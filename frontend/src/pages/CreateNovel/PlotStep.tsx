import { FormField, TextArea } from '../../components/FormField'
import { SelectGroup } from '../../components/SelectGroup'
import { TagInput } from '../../components/TagInput'
import { useNovelStore } from '../../stores/novelStore'
import type { ForeshadowingDensity, StoryRhythm } from '../../types/novel'

const foreshadowingOptions = [
  { value: 'light' as ForeshadowingDensity, label: '轻度', desc: '少量伏笔，情节直白' },
  { value: 'medium' as ForeshadowingDensity, label: '中度', desc: '适量伏笔，前后呼应' },
  { value: 'heavy' as ForeshadowingDensity, label: '重度', desc: '大量伏笔，层层嵌套' },
]

const rhythmOptions = [
  { value: 'fast' as StoryRhythm, label: '快节奏', desc: '事件密集，爽点不断' },
  { value: 'balanced' as StoryRhythm, label: '均衡', desc: '张弛有度，起伏合理' },
  { value: 'slow' as StoryRhythm, label: '慢节奏', desc: '细腻描写，深度展开' },
]

export function PlotStep() {
  const { config, updateConfig } = useNovelStore()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">剧情设定</h2>
        <p className="mt-1 text-sm text-gray-500">设定故事的核心冲突和节奏（可留空由 AI 自动生成）</p>
      </div>

      <FormField label="主线冲突" description="故事的核心矛盾和驱动力">
        <TextArea
          value={config.mainConflict}
          onChange={(v) => updateConfig({ mainConflict: v })}
          placeholder="如：主角意外获得远古神帝的签到系统，在宗门大比中崭露头角，逐渐揭开上古大战的秘密，对抗即将复苏的域外天魔..."
          rows={4}
        />
      </FormField>

      <FormField label="关键情节点" description="故事中的重要事件节点，按时间线排列">
        <TagInput
          tags={config.plotPoints}
          onChange={(tags) => updateConfig({ plotPoints: tags })}
          placeholder="如：宗门大比夺冠、进入秘境探险..."
        />
      </FormField>

      <FormField label="伏笔密度" description="影响故事的伏笔铺设密度和回收频率">
        <SelectGroup<ForeshadowingDensity>
          options={foreshadowingOptions}
          value={config.foreshadowingDensity}
          onChange={(v) => updateConfig({ foreshadowingDensity: v })}
          columns={3}
        />
      </FormField>

      <FormField label="故事节奏" description="整体叙事的快慢节奏">
        <SelectGroup<StoryRhythm>
          options={rhythmOptions}
          value={config.storyRhythm}
          onChange={(v) => updateConfig({ storyRhythm: v })}
          columns={3}
        />
      </FormField>
    </div>
  )
}
