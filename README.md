# 修仙小说生成器

基于 Claude AI 的修仙小说自动生成平台。通过网页界面配置小说参数（题材、人物、剧情、字数等），系统调用 Claude API 分 6 层递进生成完整小说。

> 完整的日常运行、开发、部署与排障流程见 [RUNNING.md](./RUNNING.md)。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand |
| 后端 | Python 3.10+ FastAPI + SQLite (aiosqlite) |
| AI   | Claude API (Anthropic SDK)，支持 Prompt Caching + SSE 流式输出 |

## 功能特性

- **5 步创建向导** — 题材、世界观、角色、情节、确认，逐步配置小说参数
- **角色预设标签** — 性格、能力、动机、背景均提供可选标签（按性别/角色类型筛选），支持自定义
- **6 阶段生成流水线** — 世界观 → 总大纲 → 人物档案 → 分卷大纲 → 章节大纲 → 章节正文
- **SSE 实时流式输出** — 生成过程实时展示，可切换查看各阶段内容
- **知识库系统** — 内置 7 大类 100+ 条修仙素材，AI 生成时自动匹配注入
- **风格库系统** — 上传参考文本提取写作风格，生成时可选用自定义风格
- **批量章节生成** — 一键生成所有章节正文，SSE 流式追踪进度
- **章节编辑** — 支持手动修改标题、大纲、正文
- **TXT 导出** — 完成后导出为 TXT 文件
- **第三方 API 支持** — 通过 `.env` 配置 `ANTHROPIC_BASE_URL` 对接第三方代理
- **一键部署** — 提供安装脚本和启动脚本，clone 后即可快速搭建

## 项目结构

```
novel/
├── frontend/                          # React 前端
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts             # 小说/章节/生成 API
│   │   │   └── knowledge.ts          # 知识库 + 角色预设 API
│   │   ├── components/
│   │   │   ├── StepWizard.tsx        # 步骤向导容器
│   │   │   ├── FormField.tsx         # 表单字段组件
│   │   │   ├── SelectGroup.tsx       # 卡片式选项选择器
│   │   │   ├── ChipSelect.tsx        # 标签选择器（多选/单选 + 自定义）
│   │   │   ├── TagInput.tsx          # 标签输入（境界、情节点）
│   │   │   ├── CharacterCard.tsx     # 角色配置卡片（含预设标签）
│   │   │   ├── GenerationProgress.tsx # SSE 生成进度组件
│   │   │   ├── StreamingText.tsx     # 实时文本流显示
│   │   │   ├── ChapterList.tsx       # 章节列表
│   │   │   └── KnowledgePicker.tsx   # 知识库选择弹窗
│   │   ├── pages/
│   │   │   ├── HomePage.tsx          # 首页（小说列表）
│   │   │   ├── NovelDetailPage.tsx   # 小说详情 + 生成入口
│   │   │   ├── ChapterPage.tsx       # 章节阅读/编辑
│   │   │   ├── KnowledgePage.tsx     # 知识库管理
│   │   │   ├── EditNovelPage.tsx     # 编辑小说配置
│   │   │   └── CreateNovel/          # 5 步配置向导
│   │   ├── stores/novelStore.ts      # Zustand 状态管理
│   │   └── types/novel.ts            # 类型定义 + 预设数据
│   └── package.json
│
├── backend/                           # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py                   # FastAPI 入口（dotenv、CORS、路由）
│   │   ├── api/
│   │   │   ├── novels.py            # 小说 CRUD
│   │   │   ├── generate.py          # 生成 + 章节管理
│   │   │   ├── knowledge.py         # 知识库 + 角色预设
│   │   │   ├── styles.py            # 风格库管理
│   │   │   └── export.py            # TXT 导出
│   │   ├── models/schemas.py        # Pydantic 数据模型
│   │   ├── database/db.py           # SQLite 初始化 + 知识库种子
│   │   ├── services/                # 业务逻辑层
│   │   ├── pipeline/
│   │   │   ├── claude_client.py     # Claude API 客户端（流式/非流式 + 重试）
│   │   │   └── generator.py         # 6 阶段生成编排器
│   │   ├── prompts/novel_prompts.py # Prompt 模板（463 行）
│   │   └── data/
│   │       ├── knowledge_seeds.py   # 内置知识库素材
│   │       ├── scraped_seeds.py     # 抓取补充素材
│   │       └── character_presets.py # 角色预设选项数据
│   ├── .env                          # 环境变量（API Key、Base URL）
│   ├── requirements.txt
│   ├── scripts/
│   │   ├── dump_db.py               # 导出数据库为 SQL
│   │   └── restore_db.py            # 从 SQL dump 恢复数据库
│   └── data/
│       ├── novels.db                # SQLite 数据库（自动创建，gitignore）
│       └── novels_dump.sql          # 数据库 SQL 备份
│
├── setup.bat / setup.sh              # 一键安装脚本
├── start.bat / start.sh / start.ps1  # 一键启动脚本
└── README.md
```

## 快速启动

### 前提条件

- Git
- Node.js >= 20
- Python >= 3.10
- Anthropic API Key（或第三方代理）

### 方式一：一键安装（推荐）

```bash
git clone https://github.com/lingcongcaiyuedong2/novel.git
cd novel

# Windows（双击或 CMD）:
setup.bat

# macOS / Linux / Git Bash:
chmod +x setup.sh && ./setup.sh
```

安装完成后编辑 `backend/.env` 填入 API Key，然后：

```bash
# Windows:
start.bat

# macOS / Linux / Git Bash:
./start.sh
```

浏览器访问 `http://localhost:5173` 即可使用。

### 方式二：手动安装

### 1. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入你的 API Key 和 Base URL
```

### 2. 启动后端

```bash
cd backend
python -m venv venv

# Windows:
./venv/Scripts/activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

后端运行在 `http://localhost:8000`，API 文档: `http://localhost:8000/docs`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，已配置代理转发 `/api` 到后端。

## 环境变量

在 `backend/.env` 中配置：

```env
# Anthropic API Key（必填）
ANTHROPIC_API_KEY=your-api-key

# 第三方代理地址（可选，不填则直连 Anthropic）
ANTHROPIC_BASE_URL=https://your-proxy.com/
```

## API 端点

### 小说管理

| 方法   | 路径                              | 说明           |
|--------|-----------------------------------|----------------|
| POST   | `/api/novels`                     | 创建小说配置   |
| GET    | `/api/novels`                     | 获取小说列表   |
| GET    | `/api/novels/{id}`                | 获取小说详情   |
| PUT    | `/api/novels/{id}`                | 更新小说配置   |
| DELETE | `/api/novels/{id}`                | 删除小说       |

### AI 生成

| 方法 | 路径                                  | 说明                   |
|------|---------------------------------------|------------------------|
| POST | `/api/novels/{id}/generate`           | 触发大纲生成           |
| GET  | `/api/novels/{id}/generate/stream`    | SSE 流式接收生成进度   |
| GET  | `/api/novels/{id}/generate/chapters`  | SSE 批量生成章节正文   |
| GET  | `/api/chapters/{id}/generate`         | SSE 生成单章正文       |

### 章节管理

| 方法 | 路径                           | 说明               |
|------|--------------------------------|--------------------|
| GET  | `/api/novels/{id}/chapters`    | 获取章节列表       |
| GET  | `/api/chapters/{id}`           | 获取章节详情       |
| PUT  | `/api/chapters/{id}`           | 编辑章节           |

### 知识库

| 方法   | 路径                              | 说明               |
|--------|-----------------------------------|--------------------|
| GET    | `/api/knowledge`                  | 知识库列表         |
| POST   | `/api/knowledge`                  | 新建素材           |
| GET    | `/api/knowledge/presets/{type}`   | 角色预设选项       |
| DELETE | `/api/knowledge/{id}`             | 删除自定义素材     |

### 风格库

| 方法   | 路径                    | 说明                         |
|--------|-------------------------|------------------------------|
| GET    | `/api/styles`           | 风格列表                     |
| GET    | `/api/styles/{id}`      | 风格详情                     |
| POST   | `/api/styles`           | 上传 .txt 文件创建风格档案   |
| DELETE | `/api/styles/{id}`      | 删除风格                     |

### 导出

| 方法 | 路径                         | 说明         |
|------|------------------------------|--------------|
| GET  | `/api/novels/{id}/export`    | 导出 TXT     |

## 配置选项

### 题材

系统流 | 传统修仙 | 都市修仙 | 末世修仙 | 洪荒流 | 诸天万界

### 写作风格

爽文 | 热血 | 深沉 | 幽默 | 群像

### 修炼体系

气修 | 体修 | 魂修 | 双修 | 自定义

### 默认境界

练气 → 筑基 → 金丹 → 元婴 → 化神 → 合体 → 大乘 → 渡劫 → 真仙（可自定义）

### 角色预设

| 类别     | 内容                                                   |
|----------|--------------------------------------------------------|
| 性格标签 | 男性 30 项、女性 30 项、反派 20 项（按角色类型自动筛选）|
| 特殊能力 | 特殊体质 20 + 天赋能力 20 + 灵根类型 20 + 金手指 20    |
| 目标动机 | 正面动机 15 + 复仇/野心动机 15                         |
| 出身背景 | 低微出身 15 + 显赫出身 15 + 特殊出身 15                |

## AI 生成流水线

```
1. 世界观生成  →  完整的修仙世界设定文档
       ↓
2. 总大纲      →  全书故事弧（起承转合）
       ↓
3. 人物档案    →  主要角色完整档案与关系网
       ↓
4. 分卷大纲    →  按卷划分的故事线
       ↓
5. 章节大纲    →  每章 200-300 字梗概
       ↓
6. 章节正文    →  每章 2000-3000 字正文
```

### 质量保障

- **Prompt Caching** — 系统 Prompt 使用 Claude ephemeral cache，减少重复 Token 消耗
- **知识库注入** — 按章节关键词自动匹配相关素材（最多 2 条），作为写作参考
- **人物一致性** — 每次生成注入人物档案，确保性格言行一致
- **上下文管理** — 章节生成时注入前章摘要 + 后章大纲，保持连贯性和伏笔
- **自动重试** — API 调用失败自动指数退避重试（2s → 5s → 10s，最多 3 次）

## 知识库

内置 7 大类 100+ 条修仙素材，首次启动自动导入。

| 分类     | 说明           | 示例                                 |
|----------|----------------|--------------------------------------|
| 情节题材 | 常见情节模板   | 宗门大比、秘境探险、复仇线、拍卖会   |
| 人物原型 | 角色类型模板   | 废柴逆袭、天才型、重生型、反派模板   |
| 世界设定 | 修仙世界体系   | 九境体系、宗门架构、天材地宝         |
| 爽点模板 | 爽文写作参考   | 打脸套路、突破场景、系统奖励描写     |
| 伏笔套路 | 伏笔埋设回收   | 身世之谜、关键道具、人物关系         |
| 章节模板 | 章节结构参考   | 战斗章、修炼章、剧情推进章           |
| 写作技巧 | 写作手法参考   | 对话技巧、描写手法、视角切换         |

## License

MIT
