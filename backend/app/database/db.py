import aiosqlite
import json
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "novels.db"


async def get_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS novels (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                genre TEXT NOT NULL,
                target_word_count INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                chapter_count INTEGER NOT NULL DEFAULT 0,
                config_json TEXT NOT NULL,
                outline TEXT,
                world_building TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS chapters (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                chapter_number INTEGER NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                outline TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                word_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            )
        """)
        await db.commit()

        # Migrate: add columns if missing (idempotent)
        existing = set()
        async with db.execute("PRAGMA table_info(novels)") as cursor:
            async for row in cursor:
                existing.add(row[1])  # column name

        migrations = {
            "characters_doc": "ALTER TABLE novels ADD COLUMN characters_doc TEXT",
            "volume_outline": "ALTER TABLE novels ADD COLUMN volume_outline TEXT",
        }
        for col, sql in migrations.items():
            if col not in existing:
                await db.execute(sql)
        await db.commit()

        # Knowledge base table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_items (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                sub_type TEXT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT,
                is_builtin INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.commit()

        # Seed built-in knowledge data (incremental: skip already-existing titles)
        await _seed_knowledge(db)


async def _seed_knowledge(db):
    import uuid
    from datetime import datetime, timezone
    from app.data.knowledge_seeds import SEEDS
    from app.data.scraped_seeds import SCRAPED_SEEDS
    from app.data.character_presets import CHARACTER_PRESETS

    # 获取已有的内置素材标题
    cursor = await db.execute("SELECT title FROM knowledge_items WHERE is_builtin = 1")
    existing_titles = {row[0] for row in await cursor.fetchall()}

    all_seeds = SEEDS + SCRAPED_SEEDS + CHARACTER_PRESETS
    now = datetime.now(timezone.utc).isoformat()
    inserted = 0
    for item in all_seeds:
        if item["title"] in existing_titles:
            continue
        await db.execute(
            """INSERT INTO knowledge_items (id, category, sub_type, title, content, tags, is_builtin, created_at, updated_at)
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
        existing_titles.add(item["title"])
        inserted += 1
    if inserted:
        await db.commit()
        print(f"[seed] 增量导入 {inserted} 条内置素材")
