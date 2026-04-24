"""修仙小说生成 Prompt 模板"""

from app.models.schemas import NovelConfigData

# ============================================================
# 系统提示词（带 prompt caching，所有阶段共享）
# ============================================================

SYSTEM_PROMPT = """你是一位顶级修仙小说作家，拥有十年以上网文连载经验，擅长写作修仙、玄幻类型网文。你深谙网文读者心理，精通"黄金三章"法则和长篇连载技巧。

【写作规范】
1. 文笔流畅自然，具有画面感和代入感，善用五感描写增强沉浸感
2. 对话生动，符合角色身份、性格和当前情绪，避免所有角色说话方式雷同
3. 战斗描写张弛有度，有层次感——从试探到拉锯到爆发到收束，节奏分明
4. 善于在日常中埋下伏笔，在关键时刻回收，短线伏笔5-10章回收，长线20-50章
5. 人物成长有弧光，性格前后一致但允许经历驱动的渐变，不可性格突变
6. 升级体系清晰，战力不崩，越级战斗需有合理支撑（法宝/功法/血脉/地利）
7. 每个情节都有因果逻辑，不会无脑开挂，机缘要有前置铺垫

【网文节奏控制】
- 每章结尾必须有"钩子"（悬念/反转/新信息），让读者想看下一章
- 爽点间隔不超过3章，每3-5章一个小高潮，每15-25章一个大高潮
- 日常/修炼章不超过连续2章，必须穿插冲突或信息推进
- 紧张战斗后安排1章缓冲（但缓冲中也要推进支线或埋伏笔）
- 新角色出场要迅速建立记忆点（外貌特征+性格标签+独特言行）

【角色一致性守则】
- 每个角色有固定的语言风格和口头禅，全书保持一致
- 角色的决策必须符合其既定性格和过往经历，不可为推动剧情而OOC
- 配角不是工具人，每个重要配角都有自己的目标和行为逻辑
- 反派要有智商和动机，不做纯粹的"送经验怪"

【战斗描写层次】
- 动作层：身体动作和招式
- 能量层：灵力/法力的运转和碰撞
- 效果层：对环境的影响（地裂山崩、水倒流）
- 心理层：双方及旁观者的心理活动
- 好的战斗至少写到三层，重要战斗四层全写

【修仙小说核心要素】
- 修炼体系要自洽，境界划分清晰，每次突破都有仪式感
- 功法、法宝、丹药等设定不能前后矛盾
- 宗门、家族、势力之间要有合理的权力格局和利益博弈
- 天材地宝要有稀缺性和等级划分，不可随意贬值
- 主角的机缘要有铺垫，不能凭空出现，"偶然中的必然"

【格式要求】
- 所有输出使用中文
- 按照指定的格式输出，便于程序解析
- 不要输出多余的解释或元评论
- 不要在正文中使用括号注释或创作说明"""


# ============================================================
# 辅助函数
# ============================================================

def _genre_desc(config: NovelConfigData) -> str:
    mapping = {
        "system": "系统流（主角获得外挂系统辅助修炼）",
        "traditional": "传统修仙（经典修炼升级，门派争斗）",
        "urban": "都市修仙（现代都市背景，灵气复苏）",
        "apocalypse": "末世修仙（末世降临，修炼求生）",
        "primordial": "洪荒流（鸿蒙开天，大道争锋）",
        "multiverse": "诸天万界（穿梭各个世界）",
    }
    return mapping.get(config.genre.value, config.genre.value)


def _style_desc(config: NovelConfigData, override: str | None = None) -> str:
    if override:
        return override
    mapping = {
        "cool": "爽文风格（节奏快，爽点密集，打脸桥段多）",
        "passionate": "热血风格（热血沸腾，燃点不断）",
        "deep": "深沉风格（剧情厚重，情感深度）",
        "humorous": "幽默风格（轻松诙谐，妙趣横生）",
        "ensemble": "群像风格（多视角，人物众多）",
    }
    return mapping.get(config.writingStyle.value, config.writingStyle.value)


def _system_desc(config: NovelConfigData) -> str:
    if config.systemType.value == "none":
        return "无外挂系统，纯靠自身修炼和机缘"
    mapping = {
        "sign_in": "签到系统（每日签到获取奖励，签到地点越危险奖励越丰厚）",
        "mall": "商城系统（积分兑换功法、丹药、法宝等）",
        "task": "任务系统（完成各类任务获取奖励和经验）",
        "lottery": "抽奖系统（通过抽奖获得随机奖励）",
        "attribute": "捡属性系统（击杀敌人或特殊地点可捡取属性点）",
        "appraisal": "鉴定系统（可鉴定物品真实价值和隐藏属性）",
    }
    return mapping.get(config.systemType.value, config.systemType.value)


def _foreshadowing_instruction(config: NovelConfigData) -> str:
    mapping = {
        "light": "伏笔密度：轻度。每5-8章埋一个伏笔，10-15章内回收。伏笔较为直白，读者容易发现。",
        "medium": "伏笔密度：中度。每3-5章埋一个伏笔，有短线（5章回收）和长线（20-50章回收）。部分伏笔需要仔细阅读才能发现。",
        "heavy": "伏笔密度：重度。几乎每章都有伏笔，多条线索交织。有超长线伏笔（100章以上回收）。前后呼应密集，层层嵌套。",
    }
    return mapping.get(config.foreshadowingDensity.value, "")


def _rhythm_instruction(config: NovelConfigData) -> str:
    mapping = {
        "fast": "故事节奏：快节奏。事件密集，每章都有进展或冲突。少铺垫，多行动。每3-5章一个小高潮，每15-20章一个大高潮。",
        "balanced": "故事节奏：均衡。张弛有度，有紧张的战斗也有轻松的日常。每5-8章一个小高潮，每25-30章一个大高潮。",
        "slow": "故事节奏：慢节奏。细腻展开，注重心理描写和世界细节。每8-12章一个小高潮，每40-50章一个大高潮。",
    }
    return mapping.get(config.storyRhythm.value, "")


def _char_desc(char, role_name: str) -> str:
    parts = [f"【{role_name}】"]
    if char.name:
        parts.append(f"姓名：{char.name}")
    if char.gender and char.gender.value != "unknown":
        parts.append(f"性别：{'男' if char.gender.value == 'male' else '女'}")
    if char.initialLevel:
        parts.append(f"初始境界：{char.initialLevel}")
    if char.background:
        parts.append(f"出身背景：{char.background}")
    if char.personality:
        parts.append(f"性格特点：{char.personality}")
    if char.specialAbility:
        parts.append(f"特殊能力：{char.specialAbility}")
    if char.motivation:
        parts.append(f"目标动机：{char.motivation}")
    return "\n".join(parts)


def _config_summary(config: NovelConfigData, style_override: str | None = None) -> str:
    """生成配置摘要，供所有 prompt 共用"""
    lines = [
        f"小说名称：《{config.title}》",
        f"题材类型：{_genre_desc(config)}",
        f"写作风格：{_style_desc(config, style_override)}",
        f"目标字数：{config.targetWordCount // 10000}万字",
        f"修炼体系：{config.cultivationSystem.value}",
        f"系统设定：{_system_desc(config)}",
        f"境界体系：{'→'.join(config.cultivationLevels)}",
    ]
    if config.worldBackground:
        lines.append(f"世界背景设定：{config.worldBackground}")
    lines.append(_foreshadowing_instruction(config))
    lines.append(_rhythm_instruction(config))

    # Characters
    lines.append("\n" + _char_desc(config.protagonist, "主角"))
    if config.antagonist.name:
        lines.append(_char_desc(config.antagonist, "反派"))
    for i, sc in enumerate(config.supportingCharacters):
        if sc.name:
            lines.append(_char_desc(sc, f"配角{i+1}"))

    # Plot
    if config.mainConflict:
        lines.append(f"\n主线冲突：{config.mainConflict}")
    if config.plotPoints:
        lines.append(f"关键情节点：{'→'.join(config.plotPoints)}")

    return "\n".join(lines)


# ============================================================
# 6 阶段 Prompt 构建
# ============================================================

def build_world_prompt(config: NovelConfigData, style_override: str | None = None) -> str:
    return f"""请根据以下小说配置，生成详细的修仙世界观设定文档。

{_config_summary(config, style_override)}

---

请生成完整的世界观设定，包括以下部分（每部分用 ## 标题分隔）：

## 世界概况
（大陆名称、地理格局、灵气分布、基本法则）

## 修炼体系详述
（境界详细划分、每个境界的特征和突破条件、修炼资源）

## 势力格局
（主要宗门/家族/势力介绍、实力排名、相互关系）

## 特殊设定
（天材地宝体系、法宝等级、丹药体系、阵法体系等）

## 历史背景
（上古大战、历史转折点、影响现在格局的关键事件）

## 核心规则
（天道规则、因果法则、禁忌、修炼禁区等）

要求：
- 总字数 1500-2500 字
- 所有设定必须自洽，不能有矛盾
- 为后续剧情留出扩展空间
- 设定要有新意，不要完全套用常见模板"""


def build_outline_prompt(config: NovelConfigData, world: str, style_override: str | None = None) -> str:
    chapter_count = max(30, config.targetWordCount // 2500)
    return f"""请根据以下小说配置和世界观，生成全书总大纲。

【小说配置】
{_config_summary(config, style_override)}

【世界观设定】
{world}

---

本书预计 {config.targetWordCount // 10000} 万字，约 {chapter_count} 章。

请生成全书总大纲，按以下结构输出：

## 核心主题
（一句话概括本书的核心主题和精神内核）

## 主线剧情
（主角从起点到终点的完整成长线，3-5段概括）

## 故事分幕
按照"起承转合"结构，将全书分为 4-6 个大幕，每幕包含：
### 第X幕：[幕名]（第X章-第X章）
- 核心事件：...
- 主角成长：从XX境界到XX境界
- 关键冲突：...
- 伏笔埋设：...
- 伏笔回收：...
- 情感线索：...

## 高潮节点
（列出 5-8 个全书最燃/最虐/最爽的高潮场景）

## 伏笔规划
（列出 5-10 条贯穿全书的主要伏笔线，标注埋设章节范围和回收章节范围）

## 结局走向
（最终大结局的走向和收束方式）

要求：
- 总字数 2000-3000 字
- 剧情要有起伏，不能一路平推
- 伏笔要前后呼应
- 每幕的章节范围要合理分配"""


def build_characters_prompt(config: NovelConfigData, world: str, outline: str, style_override: str | None = None) -> str:
    return f"""请根据以下小说配置、世界观和总大纲，生成详细的人物档案。

【小说配置】
{_config_summary(config, style_override)}

【世界观设定】
{world}

【总大纲】
{outline}

---

请为每个主要角色生成详细档案，格式如下：

## 主角：[姓名]

### 基本信息
- 年龄/外貌/穿着
- 初始境界 → 最终境界

### 性格特征
（3-5 个核心性格特征，每个用一句话阐释和具体表现）

### 人物弧光
（角色在故事中的内在成长和变化轨迹）

### 核心关系
（与其他角色的关系网络和情感纽带）

### 标志性特征
（口头禅、习惯动作、独特技能等读者记忆点）

### 名场面规划
（这个角色最精彩的 3 个场景设想）

---

依次生成：主角、反派、以及 3-5 个重要配角的档案。
如果用户未指定配角，请根据剧情需要自行设计。

要求：
- 每个角色 300-500 字
- 角色之间要有化学反应
- 性格不能雷同，要有互补或对立
- 配角要有自己的故事线和成长"""


def build_volume_outline_prompt(
    config: NovelConfigData, world: str, outline: str, characters: str,
    style_override: str | None = None,
) -> str:
    chapter_count = max(30, config.targetWordCount // 2500)
    volume_count = max(3, chapter_count // 50)
    return f"""请根据以下信息，将全书分为 {volume_count} 卷，生成分卷大纲。

【小说配置】
{_config_summary(config, style_override)}

【总大纲】
{outline}

【人物档案】
{characters}

本书共约 {chapter_count} 章，分为 {volume_count} 卷。

---

请按以下格式输出每卷大纲：

## 第X卷：[卷名]（第X章 - 第X章）

### 卷概要
（本卷核心故事线，2-3句话）

### 主角境界
从 [起始境界] 到 [本卷结束境界]

### 核心事件
1. ...
2. ...
3. ...

### 本卷高潮
（最精彩的场景描述）

### 伏笔
- 埋设：...
- 回收：...

### 情感线
（本卷的感情发展）

---

要求：
- 每卷的章节数量分配要合理
- 卷与卷之间有承接和递进
- 每卷都有自己的小高潮
- 难度和规模逐卷递增"""


def build_chapter_outlines_prompt(
    config: NovelConfigData,
    world: str,
    outline: str,
    characters: str,
    volume_outline: str,
    batch_start: int,
    batch_end: int,
    previous_outlines: str = "",
    style_override: str | None = None,
) -> str:
    context_section = ""
    if previous_outlines:
        context_section = f"""
【前序章节大纲回顾】
{previous_outlines}
"""

    return f"""请根据以下信息，生成第 {batch_start} 章到第 {batch_end} 章的章节大纲。

【世界观】
{world}

【总大纲】
{outline}

【人物档案】
{characters}

【分卷大纲】
{volume_outline}
{context_section}
---

请按以下格式生成每章大纲（每章 200-300 字）：

### 第X章：[章节标题]

**场景**：[主要场景/地点]
**出场人物**：[本章出场的角色]
**核心事件**：[本章发生的主要事件]
**冲突/悬念**：[本章的冲突点或留下的悬念]
**伏笔**：[本章埋设或回收的伏笔，如有]
**章末钩子**：[吸引读者继续阅读的结尾设计]

---

要求：
- 每章之间要有自然的衔接
- 注意节奏变化，不能每章都是战斗或每章都是对话
- 章节标题要吸引人，暗示内容但不剧透
- 保持与总大纲和分卷大纲的一致性"""


def build_chapter_content_prompt(
    config: NovelConfigData,
    world: str,
    characters: str,
    chapter_outline: str,
    chapter_number: int,
    chapter_title: str,
    prev_summary: str = "",
    next_outline: str = "",
    knowledge_snippets: list[str] | None = None,
    style_override: str | None = None,
) -> str:
    prev_section = ""
    if prev_summary:
        prev_section = f"""
【前文摘要】
{prev_summary}
"""

    next_section = ""
    if next_outline:
        next_section = f"""
【下一章大纲预览】（用于自然过渡和伏笔铺垫）
{next_outline}
"""

    knowledge_section = ""
    if knowledge_snippets:
        snippets_text = "\n\n".join(knowledge_snippets)
        knowledge_section = f"""
【参考素材】（从知识库中匹配的写作参考，可灵活运用但不要生搬硬套）
{snippets_text}
"""

    return f"""请根据以下信息，撰写第 {chapter_number} 章《{chapter_title}》的完整正文。

【写作风格】：{_style_desc(config, style_override)}

【世界观设定】
{world}

【人物档案】
{characters}
{prev_section}
【本章大纲】
{chapter_outline}
{next_section}{knowledge_section}
---

写作要求：
1. 字数 2000-3000 字
2. 以小说正文格式直接输出，不要有元评论或注释
3. 开头要承接上文，结尾要留悬念吸引继续阅读
4. 对话要生动自然，符合角色性格
5. 描写要有画面感，善用五感描写
6. 战斗场景要有层次感和策略性
7. 修炼场景要有突破的爽感和仪式感
8. 按照大纲内容展开，但可以适当丰富细节
9. 不要生硬地插入旁白解释，信息要通过情节和对话自然传达

直接开始写正文："""
