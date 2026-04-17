import json
import uuid
from datetime import datetime, timezone
import aiosqlite

from app.models.schemas import (
    CreateNovelRequest,
    UpdateNovelRequest,
    NovelSummaryResponse,
    NovelDetailResponse,
    NovelConfigData,
)
from app.database.db import DB_PATH


async def _get_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_novel(req: CreateNovelRequest) -> NovelDetailResponse:
    db = await _get_db()
    try:
        novel_id = str(uuid.uuid4())
        now = _now()
        config_json = req.config.model_dump_json()

        await db.execute(
            """INSERT INTO novels (id, title, genre, target_word_count, status, chapter_count, config_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'draft', 0, ?, ?, ?)""",
            (novel_id, req.config.title, req.config.genre.value, req.config.targetWordCount, config_json, now, now),
        )
        await db.commit()

        return NovelDetailResponse(
            id=novel_id,
            title=req.config.title,
            genre=req.config.genre,
            targetWordCount=req.config.targetWordCount,
            status="draft",
            chapterCount=0,
            config=req.config,
            createdAt=now,
            updatedAt=now,
        )
    finally:
        await db.close()


async def get_novels() -> list[NovelSummaryResponse]:
    db = await _get_db()
    try:
        cursor = await db.execute(
            "SELECT id, title, genre, target_word_count, status, chapter_count, created_at, updated_at FROM novels ORDER BY updated_at DESC"
        )
        rows = await cursor.fetchall()
        return [
            NovelSummaryResponse(
                id=row["id"],
                title=row["title"],
                genre=row["genre"],
                targetWordCount=row["target_word_count"],
                status=row["status"],
                chapterCount=row["chapter_count"],
                createdAt=row["created_at"],
                updatedAt=row["updated_at"],
            )
            for row in rows
        ]
    finally:
        await db.close()


async def get_novel(novel_id: str) -> NovelDetailResponse | None:
    db = await _get_db()
    try:
        cursor = await db.execute("SELECT * FROM novels WHERE id = ?", (novel_id,))
        row = await cursor.fetchone()
        if not row:
            return None

        config = NovelConfigData.model_validate_json(row["config_json"])
        return NovelDetailResponse(
            id=row["id"],
            title=row["title"],
            genre=row["genre"],
            targetWordCount=row["target_word_count"],
            status=row["status"],
            chapterCount=row["chapter_count"],
            config=config,
            outline=row["outline"],
            worldBuilding=row["world_building"],
            charactersDoc=row["characters_doc"] if "characters_doc" in row.keys() else None,
            volumeOutline=row["volume_outline"] if "volume_outline" in row.keys() else None,
            createdAt=row["created_at"],
            updatedAt=row["updated_at"],
        )
    finally:
        await db.close()


async def update_novel(novel_id: str, req: UpdateNovelRequest) -> NovelDetailResponse | None:
    db = await _get_db()
    try:
        existing = await get_novel(novel_id)
        if not existing:
            return None

        now = _now()
        if req.config:
            await db.execute(
                """UPDATE novels SET title=?, genre=?, target_word_count=?, config_json=?, updated_at=? WHERE id=?""",
                (req.config.title, req.config.genre.value, req.config.targetWordCount, req.config.model_dump_json(), now, novel_id),
            )
        if req.status:
            await db.execute("UPDATE novels SET status=?, updated_at=? WHERE id=?", (req.status.value, now, novel_id))
        await db.commit()

        return await get_novel(novel_id)
    finally:
        await db.close()


async def delete_novel(novel_id: str) -> bool:
    db = await _get_db()
    try:
        cursor = await db.execute("DELETE FROM novels WHERE id = ?", (novel_id,))
        await db.execute("DELETE FROM chapters WHERE novel_id = ?", (novel_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()
