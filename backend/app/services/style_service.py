"""写作风格 CRUD + Claude 风格提取"""

import json
import uuid
from datetime import datetime, timezone
import aiosqlite

from app.database.db import DB_PATH
from app.pipeline.claude_client import claude_generate
from app.prompts.style_prompts import build_style_extraction_prompt


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _db():
    DB_PATH.parent.mkdir(exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


def _row_to_dict(row) -> dict:
    d = dict(zip(row.keys(), tuple(row)))
    d["sourceFilenames"] = json.loads(d.pop("source_filenames", "[]"))
    d["sampleWordCount"] = d.pop("sample_word_count", 0)
    d["profileText"] = d.pop("profile_text", "")
    d["errorMessage"] = d.pop("error_message", "")
    d["createdAt"] = d.pop("created_at", "")
    d["updatedAt"] = d.pop("updated_at", "")
    return d


async def list_styles() -> list[dict]:
    db = await _db()
    try:
        cursor = await db.execute(
            "SELECT * FROM style_profiles ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        return [_row_to_dict(row) for row in rows]
    finally:
        await db.close()


async def get_style(style_id: str) -> dict | None:
    db = await _db()
    try:
        cursor = await db.execute(
            "SELECT * FROM style_profiles WHERE id = ?", (style_id,)
        )
        row = await cursor.fetchone()
        return _row_to_dict(row) if row else None
    finally:
        await db.close()


async def get_style_profile_text(style_id: str) -> str | None:
    """生成流水线内部快速取 profile_text；仅在 status='ready' 时返回。"""
    db = await _db()
    try:
        cursor = await db.execute(
            "SELECT profile_text, status FROM style_profiles WHERE id = ?",
            (style_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        if row["status"] != "ready":
            return None
        text = row["profile_text"] or ""
        return text or None
    finally:
        await db.close()


async def delete_style(style_id: str) -> bool:
    db = await _db()
    try:
        cursor = await db.execute(
            "DELETE FROM style_profiles WHERE id = ?", (style_id,)
        )
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


# ---------- 样本处理 ----------

MAX_SAMPLE_CHARS = 80_000  # 喂给 Claude 的样本上限（约 4 万 token）


def _truncate_samples(samples_text: str) -> str:
    """超长样本取首尾（开头 15k + 结尾 15k），保留叙事开场与收束手法。"""
    if len(samples_text) <= MAX_SAMPLE_CHARS:
        return samples_text
    half = MAX_SAMPLE_CHARS // 2
    head = samples_text[:half]
    tail = samples_text[-half:]
    return head + "\n\n……（中段略）……\n\n" + tail


def _count_chars(text: str) -> int:
    """粗略统计正文字数（排除空白）"""
    return len(text.replace("\n", "").replace(" ", "").replace("\r", "").replace("\t", ""))


# ---------- 提取主流程 ----------

async def create_style_profile(
    name: str,
    description: str,
    files: list[tuple[str, str]],
) -> dict:
    """
    files: [(filename, text_content), ...]
    同步阻塞：插入 extracting 记录 → 调 Claude → 更新为 ready/failed → 返回最终记录
    """
    style_id = str(uuid.uuid4())
    now = _now()

    merged = "\n\n---\n\n".join(text for _, text in files if text.strip())
    valid_filenames = [fn for fn, text in files if text.strip()]
    word_count = _count_chars(merged)
    filenames_json = json.dumps(valid_filenames, ensure_ascii=False)

    # 插入初始记录
    db = await _db()
    try:
        await db.execute(
            """INSERT INTO style_profiles
               (id, name, description, sample_word_count, source_filenames,
                profile_text, status, error_message, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, '', 'extracting', '', ?, ?)""",
            (style_id, name, description, word_count, filenames_json, now, now),
        )
        await db.commit()
    finally:
        await db.close()

    # 校验样本
    if word_count < 500:
        await _mark_failed(style_id, f"样本字数过少（{word_count} 字），请提供至少 500 字有效文本")
        return await _safe_get(style_id)

    # 调 Claude 提取
    try:
        samples_for_prompt = _truncate_samples(merged)
        prompt = build_style_extraction_prompt(samples_for_prompt)
        profile_text = await claude_generate(prompt, max_tokens=2048)
        profile_text = (profile_text or "").strip()
        if not profile_text:
            raise RuntimeError("Claude 返回空内容")

        await _mark_ready(style_id, profile_text)
    except Exception as e:
        await _mark_failed(style_id, str(e)[:500])

    return await _safe_get(style_id)


async def _mark_ready(style_id: str, profile_text: str) -> None:
    db = await _db()
    try:
        await db.execute(
            """UPDATE style_profiles
               SET profile_text = ?, status = 'ready', error_message = '', updated_at = ?
               WHERE id = ?""",
            (profile_text, _now(), style_id),
        )
        await db.commit()
    finally:
        await db.close()


async def _mark_failed(style_id: str, error_message: str) -> None:
    db = await _db()
    try:
        await db.execute(
            """UPDATE style_profiles
               SET status = 'failed', error_message = ?, updated_at = ?
               WHERE id = ?""",
            (error_message, _now(), style_id),
        )
        await db.commit()
    finally:
        await db.close()


async def _safe_get(style_id: str) -> dict:
    """get_style 的安全包装，保证返回 dict（极端情况下返回最小占位）。"""
    result = await get_style(style_id)
    if result is None:
        return {"id": style_id, "status": "failed", "errorMessage": "记录丢失"}
    return result
