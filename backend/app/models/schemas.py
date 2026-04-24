from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Genre(str, Enum):
    system = "system"
    traditional = "traditional"
    urban = "urban"
    apocalypse = "apocalypse"
    primordial = "primordial"
    multiverse = "multiverse"


class WritingStyle(str, Enum):
    cool = "cool"
    passionate = "passionate"
    deep = "deep"
    humorous = "humorous"
    ensemble = "ensemble"


class CultivationSystem(str, Enum):
    qi = "qi"
    body = "body"
    soul = "soul"
    dual = "dual"
    custom = "custom"


class SystemType(str, Enum):
    sign_in = "sign_in"
    mall = "mall"
    task = "task"
    lottery = "lottery"
    attribute = "attribute"
    appraisal = "appraisal"
    none = "none"


class Gender(str, Enum):
    male = "male"
    female = "female"
    unknown = "unknown"


class ForeshadowingDensity(str, Enum):
    light = "light"
    medium = "medium"
    heavy = "heavy"


class StoryRhythm(str, Enum):
    fast = "fast"
    balanced = "balanced"
    slow = "slow"


class NovelStatus(str, Enum):
    draft = "draft"
    generating = "generating"
    outline_done = "outline_done"
    writing = "writing"
    completed = "completed"
    error = "error"


class CharacterConfig(BaseModel):
    name: str = ""
    gender: Gender = Gender.male
    initialLevel: str = ""
    background: str = ""
    personality: str = ""
    specialAbility: str = ""
    motivation: str = ""


class NovelConfigData(BaseModel):
    title: str
    genre: Genre = Genre.system
    writingStyle: WritingStyle = WritingStyle.cool
    targetWordCount: int = 500000

    cultivationSystem: CultivationSystem = CultivationSystem.qi
    systemType: SystemType = SystemType.sign_in
    cultivationLevels: list[str] = Field(
        default_factory=lambda: ["练气", "筑基", "金丹", "元婴", "化神", "合体", "大乘", "渡劫", "真仙"]
    )
    worldBackground: str = ""

    protagonist: CharacterConfig = Field(default_factory=CharacterConfig)
    supportingCharacters: list[CharacterConfig] = Field(default_factory=list)
    antagonist: CharacterConfig = Field(default_factory=CharacterConfig)

    mainConflict: str = ""
    plotPoints: list[str] = Field(default_factory=list)
    foreshadowingDensity: ForeshadowingDensity = ForeshadowingDensity.medium
    storyRhythm: StoryRhythm = StoryRhythm.balanced

    customStyleId: Optional[str] = None


# Request/Response schemas
class CreateNovelRequest(BaseModel):
    config: NovelConfigData


class NovelSummaryResponse(BaseModel):
    id: str
    title: str
    genre: Genre
    targetWordCount: int
    status: NovelStatus
    chapterCount: int
    createdAt: str
    updatedAt: str


class NovelDetailResponse(NovelSummaryResponse):
    config: NovelConfigData
    outline: Optional[str] = None
    worldBuilding: Optional[str] = None
    charactersDoc: Optional[str] = None
    volumeOutline: Optional[str] = None


class UpdateNovelRequest(BaseModel):
    config: Optional[NovelConfigData] = None
    status: Optional[NovelStatus] = None
