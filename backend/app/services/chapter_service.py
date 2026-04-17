"""章节 CRUD 服务"""

import uuid
from datetime import datetime, timezone
import aiosqlite

from app.database.db import DB_PATH


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _db():
    DB_PATH.parent.mkdir(exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


def _row_to_dict(row) -> dict:
    return dict(zip(row.keys(), tuple(row)))


async def create_chapters_batch(novel_id: str, chapters: list[dict]) -> list[dict]:
    """批量创建章节（仅大纲，无正文）"""
    db = await _db()
    try:
        result = []
        for ch in chapters:
            cid = str(uuid.uuid4())
            now = _now()
            await db.execute(
                """INSERT INTO chapters (id, novel_id, chapter_number, title, outline, content, word_count, status, created_at)
                VALUES (?, ?, ?, ?, ?, '', 0, 'pending', ?)""",
                (cid, novel_id, ch["number"], ch["title"], ch["outline"], now),
            )
            result.append({"id": cid, "novelId": novel_id, "chapterNumber": ch["number"], "title": ch["title"], "outline": ch["outline"]})
        # update chapter_count on novel
        await db.execute(
            "UPDATE novels SET chapter_count = (SELECT COUNT(*) FROM chapters WHERE novel_id = ?) WHERE id = ?",
            (novel_id, novel_id),
        )
        await db.commit()
        return result
    finally:
        await db.close()


async def get_chapters(novel_id: str) -> list[dict]:
    db = await _db()
    try:
        cursor = await db.execute(
            "SELECT id, novel_id, chapter_number, title, outline, word_count, status, created_at FROM chapters WHERE novel_id = ? ORDER BY chapter_number",
            (novel_id,),
        )
        rows = await cursor.fetchall()
        return [
            {
                "id": row["id"],
                "novelId": row["novel_id"],
                "chapterNumber": row["chapter_number"],
                "title": row["title"],
                "outline": row["outline"],
                "wordCount": row["word_count"],
                "status": row["status"],
                "createdAt": row["created_at"],
            }
            for row in rows
        ]
    finally:
        await db.close()


async def get_chapter(chapter_id: str) -> dict | None:
    db = await _db()
    try:
        cursor = await db.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "novelId": row["novel_id"],
            "chapterNumber": row["chapter_number"],
            "title": row["title"],
            "outline": row["outline"],
            "content": row["content"],
            "wordCount": row["word_count"],
            "status": row["status"],
            "createdAt": row["created_at"],
        }
    finally:
        await db.close()


async def update_chapter_content(chapter_id: str, content: str) -> None:
    db = await _db()
    try:
        word_count = len(content.replace("\n", "").replace(" ", ""))
        await db.execute(
            "UPDATE chapters SET content = ?, word_count = ?, status = 'done' WHERE id = ?",
            (content, word_count, chapter_id),
        )
        await db.commit()
    finally:
        await db.close()


async def update_chapter(chapter_id: str, title: str | None = None, content: str | None = None, outline: str | None = None) -> dict | None:
    db = await _db()
    try:
        sets = []
        vals = []
        if title is not None:
            sets.append("title = ?"); vals.append(title)
        if content is not None:
            sets.append("content = ?"); vals.append(content)
            word_count = len(content.replace("\n", "").replace(" ", ""))
            sets.append("word_count = ?"); vals.append(word_count)
            sets.append("status = 'done'")
        if outline is not None:
            sets.append("outline = ?"); vals.append(outline)
        if not sets:
            return await get_chapter(chapter_id)
        vals.append(chapter_id)
        await db.execute(f"UPDATE chapters SET {', '.join(sets)} WHERE id = ?", vals)
        await db.commit()
        return await get_chapter(chapter_id)
    finally:
        await db.close()


async def get_novel_docs(novel_id: str) -> dict:
    """获取小说的各类文档（世界观、大纲、人物、分卷大纲）"""
    db = await _db()
    try:
        cursor = await db.execute(
            "SELECT config_json, world_building, outline, characters_doc, volume_outline FROM novels WHERE id = ?",
            (novel_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return {}
        return {
            "config_json": row["config_json"],
            "world_building": row["world_building"] or "",
            "outline": row["outline"] or "",
            "characters_doc": row["characters_doc"] or "",
            "volume_outline": row["volume_outline"] or "",
        }
    finally:
        await db.close()


async def save_novel_field(novel_id: str, field: str, value: str) -> None:
    """保存小说字段"""
    db = await _db()
    try:
        allowed = {"world_building", "outline", "characters_doc", "volume_outline", "status"}
        if field not in allowed:
            raise ValueError(f"Field {field} not allowed")
        await db.execute(f"UPDATE novels SET {field} = ?, updated_at = ? WHERE id = ?", (value, _now(), novel_id))
        await db.commit()
    finally:
        await db.close()
