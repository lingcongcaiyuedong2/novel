# 运行流程（Operating Guide）

本文档面向本项目的**日常运行、开发与维护**。适用于 Windows（bash/PowerShell/CMD 均可）与 macOS/Linux。
快速概览见 `README.md`，本文档为完整操作手册。

---

## 0. 目录

1. [环境要求](#1-环境要求)
2. [首次安装（仅一次）](#2-首次安装仅一次)
3. [日常启动](#3-日常启动)
4. [日常停止与重启](#4-日常停止与重启)
5. [开发流程](#5-开发流程)
6. [生成一本小说的完整业务流程](#6-生成一本小说的完整业务流程)
7. [数据管理](#7-数据管理)
8. [生产构建与部署](#8-生产构建与部署)
9. [常见问题排查](#9-常见问题排查)
10. [更新依赖](#10-更新依赖)

---

## 1. 环境要求

| 组件        | 版本              | 说明                          |
|-------------|-------------------|-------------------------------|
| Node.js     | >= 20             | 前端构建 / 开发服务           |
| npm         | 随 Node 安装      | 或使用 pnpm / yarn            |
| Python      | >= 3.10           | 后端运行                      |
| Git         | 任意              | 版本控制                      |
| API Key     | Anthropic 或代理  | 生成功能必需                  |

端口占用：
- 后端：`8000`
- 前端：`5173`（Vite dev server）

---

## 2. 首次安装（仅一次）

### 快速方式：一键安装脚本

新电脑上装好 Git、Python 3.10+、Node.js 20+ 后：

```bash
git clone https://github.com/lingcongcaiyuedong2/novel.git
cd novel

# Windows（双击或 CMD）:
setup.bat

# macOS / Linux / Git Bash:
chmod +x setup.sh && ./setup.sh
```

脚本会自动完成以下全部步骤：创建 venv、安装 pip 依赖、安装 npm 依赖、从 SQL dump 恢复数据库。
完成后只需编辑 `backend/.env` 填入 API Key，然后 `start.bat` / `./start.sh` 启动。

### 手动方式

### 2.1 克隆与进入项目

```bash
git clone https://github.com/lingcongcaiyuedong2/novel.git
cd novel
```

### 2.2 配置后端环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `backend/.env`：

```env
ANTHROPIC_API_KEY=sk-xxxxxxxx          # 必填
# ANTHROPIC_BASE_URL=https://proxy.xx/  # 第三方代理才填
```

> `.env` 已被 `.gitignore` 忽略，不会误提交。

### 2.3 安装后端依赖

```bash
# 在 backend/ 目录下
python -m venv venv

# Windows（Git Bash）:
source venv/Scripts/activate
# Windows（PowerShell）:
./venv/Scripts/Activate.ps1
# Windows（CMD）:
venv\Scripts\activate.bat
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
pip install python-dotenv      # main.py 使用 load_dotenv，需单独安装
```

> 首次启动时，`app/database/db.py` 会自动在 `backend/data/novels.db` 建表并导入内置知识库种子。

### 2.4 安装前端依赖

```bash
cd ../frontend
npm install
```

### 2.5 恢复数据库（可选）

如果仓库中有 `backend/data/novels_dump.sql`，可恢复之前的小说数据：

```bash
python backend/scripts/restore_db.py
```

---

## 3. 日常启动

需要**两个终端**分别运行前后端。

### 终端 A：后端

```bash
cd backend
# 激活虚拟环境（按你的 shell 选一条）
source venv/Scripts/activate        # Git Bash
./venv/Scripts/Activate.ps1         # PowerShell
venv\Scripts\activate.bat           # CMD
source venv/bin/activate            # macOS / Linux

uvicorn app.main:app --reload --port 8000
```

- 服务地址：`http://localhost:8000`
- Swagger 文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/health` → `{"status":"ok"}`
- `--reload`：代码改动自动重启

### 终端 B：前端

```bash
cd frontend
npm run dev
```

- 页面地址：`http://localhost:5173`
- Vite 已配置将 `/api/*` 代理到 `http://localhost:8000`（见 `vite.config.ts`）
- 浏览器访问 `http://localhost:5173` 即可使用

### 启动顺序

建议 **先后端、后前端**。若前端先启，接口请求会返回连接错误直到后端就绪。

---

## 4. 日常停止与重启

- **停止**：在各自终端按 `Ctrl+C`。
- **重启后端**：`--reload` 模式下修改代码会自动重载；手动重启再次执行 `uvicorn` 命令即可。
- **重启前端**：Vite 支持热更新（HMR），通常无需重启；如需重启按 `Ctrl+C` 后重跑 `npm run dev`。
- **强制释放端口**（端口占用时）：

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS / Linux
lsof -i :8000
kill -9 <PID>
```

---

## 5. 开发流程

### 5.1 目录边界

| 修改类型                    | 文件位置                                     |
|-----------------------------|----------------------------------------------|
| API 路由                    | `backend/app/api/*.py`                       |
| 数据模型（Pydantic）        | `backend/app/models/schemas.py`              |
| 数据库结构                  | `backend/app/database/db.py`                 |
| Prompt 模板                 | `backend/app/prompts/novel_prompts.py`       |
| 生成流水线编排              | `backend/app/pipeline/generator.py`          |
| Claude 客户端/重试策略      | `backend/app/pipeline/claude_client.py`      |
| 知识库种子数据              | `backend/app/data/*.py`                      |
| 前端页面                    | `frontend/src/pages/*.tsx`                   |
| 前端组件                    | `frontend/src/components/*.tsx`              |
| 前端 API 调用               | `frontend/src/api/*.ts`                      |
| 类型定义 / 预设             | `frontend/src/types/novel.ts`                |
| 全局状态                    | `frontend/src/stores/novelStore.ts`          |

### 5.2 常用命令

后端（在 `backend/` + 已激活 venv）：
```bash
uvicorn app.main:app --reload --port 8000     # 启动
python scripts/import_new_seeds.py            # 导入新增素材（按需）
python scripts/scrape_materials.py            # 抓取素材（按需）
```

前端（在 `frontend/`）：
```bash
npm run dev        # 开发
npm run lint       # 代码检查
npm run build      # 生产构建（tsc -b && vite build）
npm run preview    # 预览构建产物
```

### 5.3 修改 Schema 的注意事项

- 新增字段同时要改：`schemas.py`（Pydantic）、`db.py`（SQLite 建表/迁移）、前端 `types/novel.ts`。
- SQLite 目前无自动迁移，如需改表结构：删除 `backend/data/novels.db` 后重启后端会重建（**会丢失现有小说数据**，先备份）。

---

## 6. 生成一本小说的完整业务流程

从用户视角的标准操作路径：

1. 打开 `http://localhost:5173`，进入首页。
2. 点击**新建小说**，进入 5 步向导：题材 → 世界观 → 角色 → 情节 → 确认。
3. 保存后进入**小说详情页**。
4. 点击**开始生成**：后端触发 6 阶段流水线，SSE 实时回传：
   世界观 → 总大纲 → 人物档案 → 分卷大纲 → 章节大纲 → 章节正文。
5. 前 5 阶段完成后，章节列表出现。点击**批量生成章节正文**或单章**生成**。
6. 章节页可手动编辑标题 / 大纲 / 正文。
7. 全书完成后，在详情页点击**导出 TXT**。

SSE 接口：`GET /api/novels/{id}/generate/stream`。关闭浏览器会断开，生成会中止；再次打开需重新触发。

---

## 7. 数据管理

### 7.1 数据库位置

`backend/data/novels.db`（SQLite，已在 `.gitignore` 中）。

### 7.2 备份

```bash
# 停止后端后复制
cp backend/data/novels.db backend/data/novels.db.$(date +%Y%m%d).bak
```

### 7.3 重置数据库

```bash
# 停止后端
rm backend/data/novels.db
# 重新启动后端会自动重建并导入知识库种子
```

### 7.4 补充知识库素材

```bash
cd backend
source venv/Scripts/activate
python scripts/import_new_seeds.py        # 批量导入 scraped_seeds 等
python scripts/import_manual_batch.py     # 手工批次导入
```

---

## 8. 生产构建与部署

### 8.1 前端构建

```bash
cd frontend
npm run build        # 产物输出到 frontend/dist/
npm run preview      # 本地预览（端口 4173）
```

`dist/` 可直接由任意静态服务器托管（nginx、Caddy、Vercel 等）。生产环境需把 `/api` 反代到后端实例。

### 8.2 后端部署

```bash
# 生产不要用 --reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

注意事项：
- 生产环境务必在 `backend/.env` 中设真实 `ANTHROPIC_API_KEY`。
- `app/main.py` 的 CORS 白名单当前写死 `localhost:5173/3000`，部署到线上需追加生产域名。
- SQLite 适合单机低并发。多实例请先迁移到 PostgreSQL（改 `db.py` 与依赖）。

---

## 9. 常见问题排查

| 现象                                          | 排查方向                                                                 |
|-----------------------------------------------|--------------------------------------------------------------------------|
| 启动后端报 `ModuleNotFoundError: dotenv`      | `pip install python-dotenv`                                              |
| 启动后端报 `anthropic.AuthenticationError`    | 检查 `.env` 的 `ANTHROPIC_API_KEY`；若用代理确认 `ANTHROPIC_BASE_URL`    |
| 前端请求 404 / CORS 错误                      | 确认后端在 8000；Vite 代理未改动；或 CORS 白名单缺失域名                 |
| SSE 无数据 / 长时间无响应                     | 查后端日志是否在重试；确认代理/网关不缓冲 `text/event-stream`            |
| 启动后端报端口占用                            | 见 §4 的释放端口命令                                                     |
| 生成中途卡住                                  | 查 Claude API 限流；`claude_client.py` 会指数退避最多 3 次后抛错         |
| 数据库字段缺失 / 报 `no such column`          | Schema 改过但未迁移。备份后删除 `novels.db` 重启                         |
| Windows PowerShell 激活脚本被禁止             | 以管理员运行：`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`      |
| `npm install` 报 peer deps 冲突               | 尝试 `npm install --legacy-peer-deps`                                    |

查看日志：后端直接看 uvicorn 终端输出；前端看浏览器控制台 + Vite 终端。

---

## 10. 更新依赖

### 后端

```bash
cd backend
source venv/Scripts/activate
pip install -U -r requirements.txt
pip freeze > requirements.lock.txt     # 可选：锁定版本
```

### 前端

```bash
cd frontend
npm outdated             # 查看待更新
npm update               # 小版本更新
npm install <pkg>@latest # 升级单个到最新
```

升级 Anthropic SDK（`anthropic` 或 `@anthropic-ai/sdk`）后，务必回归一次**小说生成全流程**，确认流式接口与 `claude_client.py` 调用仍兼容。

---

## 附：一键启动

项目根目录已提供三个脚本，任选其一，**首次安装（§2）完成后**即可使用：

| 脚本         | 适用环境                                | 用法                     |
|--------------|-----------------------------------------|--------------------------|
| `start.bat`  | Windows（双击 或 CMD）                  | 双击，或 `start.bat`     |
| `start.ps1`  | Windows PowerShell                      | `./start.ps1`            |
| `start.sh`   | Git Bash / macOS / Linux                | `./start.sh`             |

脚本会：
1. 校验 `backend/venv`、`backend/.env`、`frontend/node_modules` 是否就绪，未就绪时给出提示并退出；
2. 分别启动后端（`uvicorn --reload`，8000）和前端（`npm run dev`，5173）。

停止：
- `start.bat` / `start.ps1`：关闭弹出的两个窗口即可；
- `start.sh`：在当前终端按 `Ctrl+C`，会同时终止前后端子进程。

> 首次运行 `start.ps1` 若提示执行策略受限：
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
