"""
多源素材爬取脚本 v3
支持从以下来源抓取修仙小说素材并导入知识库：

1. GitHub - hythl0day/random_chinese_fantasy_names (功法/丹药/法宝/门派名)
2. GitHub - fundgao/xiuxian (写作素材 markdown)
3. CSDN - 800条功法招式
4. 墨星写作网 - 玄幻素材分类页
5. GitHub - 修仙小说语料仓库 (多源)
6. GitHub - funNLP 中文NLP语料 (人名/古诗词)

用法:
    cd backend
    python -m scripts.scrape_materials --source github_names
    python -m scripts.scrape_materials --source github_xiuxian
    python -m scripts.scrape_materials --source csdn_techniques
    python -m scripts.scrape_materials --source moxing
    python -m scripts.scrape_materials --source github_zhxs
    python -m scripts.scrape_materials --source github_fantasy
    python -m scripts.scrape_materials --source all
"""

import asyncio
import json
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

import aiosqlite

DB_PATH = Path(__file__).parent.parent / "data" / "novels.db"
CACHE_DIR = Path(__file__).parent / "scraped_data"

sys.path.insert(0, str(Path(__file__).parent.parent))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_existing_titles(db: aiosqlite.Connection) -> set[str]:
    cursor = await db.execute("SELECT title FROM knowledge_items")
    return {row[0] for row in await cursor.fetchall()}


async def insert_items(db: aiosqlite.Connection, items: list[dict], existing: set[str]) -> int:
    now = _now()
    inserted = 0
    for item in items:
        if item["title"] in existing:
            continue
        await db.execute(
            """INSERT INTO knowledge_items
               (id, category, sub_type, title, content, tags, is_builtin, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)""",
            (
                str(uuid.uuid4()),
                item["category"],
                item.get("sub_type", ""),
                item["title"],
                item["content"],
                json.dumps(item.get("tags", []), ensure_ascii=False),
                now,
                now,
            ),
        )
        existing.add(item["title"])
        inserted += 1
    await db.commit()
    return inserted


def _save_cache(name: str, data: str):
    """将原始数据缓存到本地，避免重复请求"""
    CACHE_DIR.mkdir(exist_ok=True)
    (CACHE_DIR / name).write_text(data, encoding="utf-8")


def _load_cache(name: str) -> Optional[str]:
    path = CACHE_DIR / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return None


# ============================================================
# Source 1: GitHub random_chinese_fantasy_names
# ============================================================
async def scrape_github_names() -> list[dict]:
    """从 GitHub 仓库抓取修仙名称数据"""
    if not httpx:
        print("[SKIP] httpx not installed, run: pip install httpx")
        return []

    items = []
    base = "https://raw.githubusercontent.com/hythl0day/random_chinese_fantasy_names/master/src"
    categories_map = {
        "techniques.js": ("world", "功法名称库", "功法招式"),
        "pills.js": ("world", "丹药名称库", "丹药名录"),
        "treasures.js": ("world", "法宝名称库", "法宝名录"),
        "sects.js": ("world", "门派名称库", "门派宗门"),
        "creatures.js": ("world", "灵兽妖兽名称库", "灵兽妖兽"),
        "materials.js": ("world", "炼器材料名称库", "炼器材料"),
        "locations.js": ("world", "地名名称库", "修仙地名"),
        "names.js": ("character", "修仙人名库", "人物姓名"),
    }

    async with httpx.AsyncClient(timeout=30) as client:
        for filename, (category, title, sub_type) in categories_map.items():
            cache_key = f"github_names_{filename}.txt"
            cached = _load_cache(cache_key)
            try:
                if cached:
                    text = cached
                    print(f"  [CACHE] {title}")
                else:
                    resp = await client.get(f"{base}/{filename}")
                    resp.raise_for_status()
                    text = resp.text
                    _save_cache(cache_key, text)

                # 提取 JS 数组中的中文字符串
                names = re.findall(r"['\"]([^\x00-\x7F]{2,})['\"]", text)
                if not names:
                    continue

                # 取前80个作为展示
                sample = names[:80]
                content = f"## {title}\n\n以下为从开源数据库收集的{sub_type}名称素材（共{len(names)}个，展示前80个）：\n\n"
                for i in range(0, len(sample), 10):
                    content += "、".join(sample[i:i+10]) + "\n"
                content += f"\n*数据来源: github.com/hythl0day/random_chinese_fantasy_names*"

                items.append({
                    "category": category,
                    "sub_type": sub_type,
                    "title": title,
                    "content": content,
                    "tags": [sub_type, "名称", "素材库", "爬取"],
                })
                print(f"  [OK] {title}: {len(names)} 个名称")
            except Exception as e:
                print(f"  [FAIL] {filename}: {e}")

    return items


# ============================================================
# Source 2: GitHub fundgao/xiuxian 修仙素材库
# ============================================================
async def scrape_github_xiuxian() -> list[dict]:
    """从 GitHub fundgao/xiuxian 仓库抓取写作素材 markdown"""
    if not httpx:
        print("[SKIP] httpx not installed")
        return []

    items = []
    base = "https://raw.githubusercontent.com/fundgao/xiuxian/main"
    # 该仓库常见的 markdown 文件
    files_map = {
        "realm.md": ("world", "境界体系大全", "境界体系"),
        "weapon.md": ("world", "法宝灵器大全", "法宝灵器"),
        "pill.md": ("world", "丹药大全", "丹药"),
        "sect.md": ("world", "宗门势力大全", "宗门势力"),
        "race.md": ("world", "种族大全", "种族"),
        "skill.md": ("world", "功法大全", "功法"),
        "beast.md": ("world", "灵兽妖兽大全", "灵兽妖兽"),
        "plant.md": ("world", "灵草灵药大全", "灵草灵药"),
        "place.md": ("world", "地名大全", "地名"),
    }

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for filename, (category, title, sub_type) in files_map.items():
            cache_key = f"github_xiuxian_{filename}"
            cached = _load_cache(cache_key)
            try:
                if cached:
                    text = cached
                    print(f"  [CACHE] {title}")
                else:
                    resp = await client.get(f"{base}/{filename}")
                    if resp.status_code == 404:
                        print(f"  [SKIP] {filename}: not found")
                        continue
                    resp.raise_for_status()
                    text = resp.text
                    _save_cache(cache_key, text)

                if len(text) < 50:
                    continue

                # 截取前3000字
                content = text[:3000]
                if len(text) > 3000:
                    content += "\n\n...(内容截断，共{}字)".format(len(text))
                content += f"\n\n*数据来源: github.com/fundgao/xiuxian*"

                items.append({
                    "category": category,
                    "sub_type": sub_type,
                    "title": f"开源素材·{title}",
                    "content": content,
                    "tags": [sub_type, "素材库", "开源", "爬取"],
                })
                print(f"  [OK] {title}: {len(text)} 字")
            except Exception as e:
                print(f"  [FAIL] {filename}: {e}")

    return items


# ============================================================
# Source 3: CSDN 800 功法招式
# ============================================================
async def scrape_csdn_techniques() -> list[dict]:
    """从 CSDN 博文抓取功法招式数据"""
    if not httpx:
        print("[SKIP] httpx not installed")
        return []

    url = "https://blog.csdn.net/qq_30351747/article/details/131471056"
    cache_key = "csdn_techniques.html"
    try:
        cached = _load_cache(cache_key)
        if cached:
            html = cached
            print("  [CACHE] CSDN 功法招式")
        else:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                resp.raise_for_status()
                html = resp.text
                _save_cache(cache_key, html)

        # 提取文章正文中的功法名称和描述
        content_match = re.search(r'<div.*?id="article_content".*?>(.*?)</div>\s*</div>', html, re.DOTALL)
        if not content_match:
            # 尝试备用匹配模式
            content_match = re.search(r'<article.*?>(.*?)</article>', html, re.DOTALL)
        if not content_match:
            print("  [FAIL] 无法解析文章内容")
            return []

        raw = content_match.group(1)
        text = re.sub(r'<[^>]+>', '\n', raw)
        text = re.sub(r'\n{3,}', '\n\n', text).strip()

        techniques = []
        for line in text.split('\n'):
            line = line.strip()
            if not line or len(line) < 4:
                continue
            match = re.match(r'^[（(]?\d+[）)]?\s*[.、]?\s*(.{2,20})[：:—–-]\s*(.{10,})', line)
            if match:
                techniques.append({"name": match.group(1).strip(), "desc": match.group(2).strip()})

        if not techniques:
            print("  [FAIL] 未解析到功法数据")
            return []

        items = []
        batch_size = 50
        for i in range(0, len(techniques), batch_size):
            batch = techniques[i:i+batch_size]
            batch_num = i // batch_size + 1
            content = f"## 功法招式素材库·第{batch_num}辑\n\n"
            for t in batch:
                content += f"**{t['name']}**：{t['desc']}\n\n"
            content += f"*数据来源: CSDN 修仙功法800例*"

            items.append({
                "category": "world",
                "sub_type": "功法招式素材",
                "title": f"功法招式素材库·第{batch_num}辑（{len(batch)}条）",
                "content": content,
                "tags": ["功法", "招式", "名称", "爬取"],
            })

        print(f"  [OK] 解析到 {len(techniques)} 条功法，打包为 {len(items)} 个条目")
        return items

    except Exception as e:
        print(f"  [FAIL] CSDN: {e}")
        return []


# ============================================================
# Source 4: 墨星写作网玄幻素材
# ============================================================
async def scrape_moxing() -> list[dict]:
    """从墨星写作网抓取玄幻修仙素材"""
    if not httpx:
        print("[SKIP] httpx not installed")
        return []

    items = []
    base_url = "https://www.mx-xz.com/sc-zl/xuanhuan/"

    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(base_url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            html = resp.text

            links = re.findall(r'href="(/show_\d+\.html)"[^>]*>([^<]+)</a>', html)
            print(f"  找到 {len(links)} 篇素材文章")

            for href, title in links[:20]:
                try:
                    url = urljoin("https://www.mx-xz.com", href)
                    resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                    resp.raise_for_status()

                    content_match = re.search(r'<div class="content">(.*?)</div>', resp.text, re.DOTALL)
                    if not content_match:
                        continue

                    content = re.sub(r'<[^>]+>', '\n', content_match.group(1))
                    content = re.sub(r'\n{3,}', '\n\n', content).strip()

                    if len(content) < 100:
                        continue

                    if len(content) > 2000:
                        content = content[:2000] + "\n\n...(内容截断)"

                    content += f"\n\n*数据来源: 墨星写作网*"

                    items.append({
                        "category": "world",
                        "sub_type": "玄幻素材",
                        "title": f"墨星素材·{title.strip()[:30]}",
                        "content": content,
                        "tags": ["玄幻", "素材", "设定", "爬取"],
                    })
                    print(f"    [OK] {title.strip()[:30]}")

                    await asyncio.sleep(1)  # 礼貌延迟

                except Exception as e:
                    print(f"    [FAIL] {title}: {e}")

    except Exception as e:
        print(f"  [FAIL] 墨星: {e}")

    return items


# ============================================================
# Source 5: GitHub zxfancy/zhxs-generate 修仙小说语料
# ============================================================
async def scrape_github_zhxs() -> list[dict]:
    """从 GitHub 修仙小说相关语料仓库抓取素材"""
    if not httpx:
        print("[SKIP] httpx not installed")
        return []

    items = []
    # 尝试多个可能的修仙/玄幻相关仓库
    repos = [
        {
            "url": "https://raw.githubusercontent.com/zxfancy/zhxs-generate/master/data/names.txt",
            "cache": "github_zhxs_names.txt",
            "title": "开源语料·修仙人名库",
            "sub_type": "人名语料",
            "category": "character",
        },
        {
            "url": "https://raw.githubusercontent.com/zxfancy/zhxs-generate/master/data/skills.txt",
            "cache": "github_zhxs_skills.txt",
            "title": "开源语料·功法技能库",
            "sub_type": "功法语料",
            "category": "world",
        },
        {
            "url": "https://raw.githubusercontent.com/itorr/nern/main/zh-cn/names.txt",
            "cache": "github_nern_names.txt",
            "title": "开源语料·中文名字生成库",
            "sub_type": "人名语料",
            "category": "character",
        },
    ]

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        for repo in repos:
            cache_key = repo["cache"]
            cached = _load_cache(cache_key)
            try:
                if cached:
                    text = cached
                    print(f"  [CACHE] {repo['title']}")
                else:
                    resp = await client.get(repo["url"])
                    if resp.status_code == 404:
                        print(f"  [SKIP] {repo['title']}: 仓库不存在或文件不存在")
                        continue
                    resp.raise_for_status()
                    text = resp.text
                    _save_cache(cache_key, text)

                if len(text) < 50:
                    print(f"  [SKIP] {repo['title']}: 内容太少")
                    continue

                # 截取合理长度
                content = text[:3000]
                if len(text) > 3000:
                    content += f"\n\n...(内容截断，共{len(text)}字)"
                content += f"\n\n*数据来源: GitHub 开源仓库*"

                items.append({
                    "category": repo["category"],
                    "sub_type": repo["sub_type"],
                    "title": repo["title"],
                    "content": content,
                    "tags": [repo["sub_type"], "语料", "开源", "爬取"],
                })
                print(f"  [OK] {repo['title']}: {len(text)} 字")
            except Exception as e:
                print(f"  [SKIP] {repo['title']}: {e}")

    return items


# ============================================================
# Source 6: GitHub wyn-2020/fantasy-names 玄幻名称生成器
# ============================================================
async def scrape_github_fantasy_names() -> list[dict]:
    """从更多 GitHub 仓库抓取玄幻/修仙名称数据"""
    if not httpx:
        print("[SKIP] httpx not installed")
        return []

    items = []
    # 多个备选仓库，请求不到就跳过
    urls = [
        {
            "url": "https://raw.githubusercontent.com/fighting41love/funNLP/master/data/%E4%B8%AD%E6%96%87%E5%90%8D%E5%AD%97%E7%94%9F%E6%88%90/Chinese_Names_Corpus.txt",
            "cache": "github_chinese_names_corpus.txt",
            "title": "开源NLP·中文人名语料库",
            "sub_type": "人名语料",
            "category": "character",
        },
        {
            "url": "https://raw.githubusercontent.com/fighting41love/funNLP/master/data/%E5%8F%A4%E8%AF%97%E8%AF%8D/poetry.txt",
            "cache": "github_poetry_corpus.txt",
            "title": "开源NLP·古诗词语料库",
            "sub_type": "古风素材",
            "category": "writing_technique",
        },
    ]

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        for item in urls:
            cache_key = item["cache"]
            cached = _load_cache(cache_key)
            try:
                if cached:
                    text = cached
                    print(f"  [CACHE] {item['title']}")
                else:
                    resp = await client.get(item["url"])
                    if resp.status_code == 404:
                        print(f"  [SKIP] {item['title']}: 文件不存在")
                        continue
                    resp.raise_for_status()
                    text = resp.text
                    _save_cache(cache_key, text)

                if len(text) < 50:
                    print(f"  [SKIP] {item['title']}: 内容太少")
                    continue

                content = text[:3000]
                if len(text) > 3000:
                    content += f"\n\n...(内容截断，共{len(text)}字)"
                content += f"\n\n*数据来源: GitHub funNLP 开源项目*"

                items.append({
                    "category": item["category"],
                    "sub_type": item["sub_type"],
                    "title": item["title"],
                    "content": content,
                    "tags": [item["sub_type"], "语料", "NLP", "爬取"],
                })
                print(f"  [OK] {item['title']}: {len(text)} 字")
            except Exception as e:
                print(f"  [SKIP] {item['title']}: {e}")

    return items


# ============================================================
# 主入口
# ============================================================
async def main(source: str = "all"):
    DB_PATH.parent.mkdir(exist_ok=True)
    CACHE_DIR.mkdir(exist_ok=True)

    async with aiosqlite.connect(DB_PATH) as db:
        existing = await get_existing_titles(db)
        total = 0

        sources = {
            "github_names": ("GitHub 名称库", scrape_github_names),
            "github_xiuxian": ("GitHub 修仙素材库", scrape_github_xiuxian),
            "csdn_techniques": ("CSDN 功法招式", scrape_csdn_techniques),
            "moxing": ("墨星写作网", scrape_moxing),
            "github_zhxs": ("GitHub 修仙语料", scrape_github_zhxs),
            "github_fantasy": ("GitHub NLP语料", scrape_github_fantasy_names),
        }

        targets = sources.keys() if source == "all" else [source]

        for key in targets:
            if key not in sources:
                print(f"[ERROR] 未知来源: {key}")
                continue
            label, func = sources[key]
            print(f"\n=== 正在抓取: {label} ===")
            items = await func()
            if items:
                n = await insert_items(db, items, existing)
                total += n
                print(f"  入库: {n} 条 (跳过 {len(items) - n} 条已有)")
            else:
                print(f"  无数据")

        print(f"\n=== 完成: 共新增 {total} 条素材 ===")


if __name__ == "__main__":
    source = sys.argv[1].replace("--source=", "") if len(sys.argv) > 1 and "=" in sys.argv[1] else (
        sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "--source" else "all"
    )
    asyncio.run(main(source))
