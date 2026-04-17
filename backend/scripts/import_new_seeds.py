"""
增量导入脚本：将 knowledge_seeds.py 中的新素材灌入数据库
只插入数据库中尚不存在（按 title 去重）的条目，已有条目跳过。

用法:
    cd backend
    python -m scripts.import_new_seeds          # 增量导入
    python -m scripts.import_new_seeds --force   # 清空内置后全量重导
"""

import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

# 定位数据库
DB_PATH = Path(__file__).parent.parent / "data" / "novels.db"

# 确保可以 import app 包
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.data.knowledge_seeds import SEEDS
from app.data.scraped_seeds import SCRAPED_SEEDS

ALL_SEEDS = SEEDS + SCRAPED_SEEDS


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_existing_titles(db: aiosqlite.Connection) -> set[str]:
    cursor = await db.execute("SELECT title FROM knowledge_items WHERE is_builtin = 1")
    rows = await cursor.fetchall()
    return {row[0] for row in rows}


async def import_seeds(force: bool = False):
    DB_PATH.parent.mkdir(exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        if force:
            deleted = await db.execute("DELETE FROM knowledge_items WHERE is_builtin = 1")
            print(f"[FORCE] 已清空 {deleted.rowcount} 条内置素材")
            await db.commit()

        existing = await get_existing_titles(db)
        now = _now()
        inserted = 0
        skipped = 0

        for item in ALL_SEEDS:
            title = item["title"]
            if title in existing:
                skipped += 1
                continue

            await db.execute(
                """INSERT INTO knowledge_items
                   (id, category, sub_type, title, content, tags, is_builtin, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)""",
                (
                    str(uuid.uuid4()),
                    item["category"],
                    item.get("sub_type", ""),
                    title,
                    item["content"],
                    json.dumps(item.get("tags", []), ensure_ascii=False),
                    now,
                    now,
                ),
            )
            inserted += 1
            existing.add(title)

        await db.commit()
        print(f"导入完成: 新增 {inserted} 条, 跳过已有 {skipped} 条, 总计 SEEDS {len(SEEDS)} 条")


if __name__ == "__main__":
    force = "--force" in sys.argv
    asyncio.run(import_seeds(force))
