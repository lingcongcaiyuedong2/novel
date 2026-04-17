import { FormField, TextArea } from '../../components/FormField'
import { SelectGroup } from '../../components/SelectGroup'
import { TagInput } from '../../components/TagInput'
import { useNovelStore } from '../../stores/novelStore'
import { PRESET_DATA, type CultivationSystem, type SystemType } from '../../types/novel'

export function WorldBuildingStep() {
  const { config, updateConfig } = useNovelStore()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">世界观设定</h2>
        <p className="mt-1 text-sm text-gray-500">构建你的修仙世界体系</p>
      </div>

      <FormField label="修炼体系" required description="选择核心的修炼方式">
        <SelectGroup<CultivationSystem>
          options={PRESET_DATA.cultivationSystems}
          value={config.cultivationSystem}
          onChange={(v) => updateConfig({ cultivationSystem: v })}
          columns={3}
        />
      </FormField>

      {config.genre !== 'traditional' && (
        <FormField label="系统类型" description="主角获得的系统类型（传统修仙可忽略）">
          <SelectGroup<SystemType>
            options={PRESET_DATA.systemTypes}
            value={config.systemType}
            onChange={(v) => updateConfig({ systemType: v })}
            columns={4}
          />
        </FormField>
      )}

      <FormField label="境界体系" required description="从低到高排列修炼境界，可拖拽排序">
        <TagInput
          tags={config.cultivationLevels}
          onChange={(tags) => updateConfig({ cultivationLevels: tags })}
          placeholder="输入境界名称后回车添加"
          presets={PRESET_DATA.defaultLevels}
        />
      </FormField>

      <FormField label="世界背景" description="描述故事发生的世界观设定（可选，AI 也会自动补全）">
        <TextArea
          value={config.worldBackground}
          onChange={(v) => updateConfig({ worldBackground: v })}
          placeholder="如：天玄大陆，万族林立，以修炼灵气为尊。大陆被五大帝级宗门所统治，无数散修和小门派在夹缝中求存..."
          rows={5}
        />
      </FormField>
    </div>
  )
}
