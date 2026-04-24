"""知识库 CRUD + 搜索服务"""

import json
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
    d = dict(zip(row.keys(), tuple(row)))
    d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
    d["isBuiltin"] = bool(d.pop("is_builtin", 0))
    d["subType"] = d.pop("sub_type", "")
    d["createdAt"] = d.pop("created_at", "")
    d["updatedAt"] = d.pop("updated_at", "")
    return d


async def list_knowledge(category: str | None = None, sub_type: str | None = None, search: str | None = None) -> list[dict]:
    db = await _db()
    try:
        sql = "SELECT * FROM knowledge_items WHERE 1=1"
        params: list = []
        if category:
            sql += " AND category = ?"
            params.append(category)
        if sub_type:
            sql += " AND sub_type = ?"
            params.append(sub_type)
        if search:
            sql += " AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)"
            q = f"%{search}%"
            params.extend([q, q, q])
        sql += " ORDER BY is_builtin DESC, created_at ASC"
        cursor = await db.execute(sql, params)
        rows = await cursor.fetchall()
        return [_row_to_dict(row) for row in rows]
    finally:
        await db.close()


async def get_knowledge(item_id: str) -> dict | None:
    db = await _db()
    try:
        cursor = await db.execute("SELECT * FROM knowledge_items WHERE id = ?", (item_id,))
        row = await cursor.fetchone()
        return _row_to_dict(row) if row else None
    finally:
        await db.close()


async def create_knowledge(data: dict) -> dict:
    db = await _db()
    try:
        item_id = str(uuid.uuid4())
        now = _now()
        await db.execute(
            """INSERT INTO knowledge_items (id, category, sub_type, title, content, tags, is_builtin, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)""",
            (
                item_id,
                data["category"],
                data.get("subType", ""),
                data["title"],
                data["content"],
                json.dumps(data.get("tags", []), ensure_ascii=False),
                now,
                now,
            ),
        )
        await db.commit()
        return await get_knowledge(item_id)  # type: ignore
    finally:
        await db.close()


async def update_knowledge(item_id: str, data: dict) -> dict | None:
    db = await _db()
    try:
        # Only allow editing user-created items
        cursor = await db.execute("SELECT is_builtin FROM knowledge_items WHERE id = ?", (item_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        now = _now()
        sets = []
        vals = []
        for field, col in [("title", "title"), ("content", "content"), ("subType", "sub_type"), ("category", "category")]:
            if field in data:
                sets.append(f"{col} = ?")
                vals.append(data[field])
        if "tags" in data:
            sets.append("tags = ?")
            vals.append(json.dumps(data["tags"], ensure_ascii=False))
        if not sets:
            return await get_knowledge(item_id)
        sets.append("updated_at = ?")
        vals.append(now)
        vals.append(item_id)
        await db.execute(f"UPDATE knowledge_items SET {', '.join(sets)} WHERE id = ?", vals)
        await db.commit()
        return await get_knowledge(item_id)
    finally:
        await db.close()


async def delete_knowledge(item_id: str) -> bool:
    db = await _db()
    try:
        # Only allow deleting user-created items
        cursor = await db.execute("DELETE FROM knowledge_items WHERE id = ? AND is_builtin = 0", (item_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def search_knowledge_for_prompt(keywords: list[str], limit: int = 3) -> list[str]:
    """根据关键词搜索知识库，按相关性排序返回内容片段供 Prompt 注入"""
    if not keywords:
        return []
    db = await _db()
    try:
        # 构建带相关性评分的查询: title 命中权重最高, tags 次之, content 最低
        conditions = []
        params: list = []
        for kw in keywords:
            q = f"%{kw}%"
            conditions.append(
                "(CASE WHEN title LIKE ? THEN 3 ELSE 0 END"
                " + CASE WHEN tags LIKE ? THEN 2 ELSE 0 END"
                " + CASE WHEN content LIKE ? THEN 1 ELSE 0 END)"
            )
            params.extend([q, q, q])

        score_expr = " + ".join(conditions)
        # 用子查询让 score_expr 只绑定一次参数，避免 WHERE 里重复占位
        sql = f"""
            SELECT title, content, relevance FROM (
                SELECT title, content, ({score_expr}) AS relevance
                FROM knowledge_items
            ) AS scored
            WHERE relevance > 0
            ORDER BY relevance DESC
            LIMIT ?
        """
        params.append(limit)

        cursor = await db.execute(sql, params)
        rows = await cursor.fetchall()

        seen_titles: set[str] = set()
        results: list[str] = []
        for row in rows:
            title = row[0]
            if title in seen_titles:
                continue
            seen_titles.add(title)
            results.append(f"【{title}】\n{row[1][:500]}")
        return results
    finally:
        await db.close()
