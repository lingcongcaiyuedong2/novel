"""AI 生成流水线 - 6阶段递进生成"""

import json
import re
from typing import AsyncGenerator

from app.models.schemas import NovelConfigData
from app.pipeline.claude_client import claude_stream
from app.prompts.novel_prompts import (
    build_world_prompt,
    build_outline_prompt,
    build_characters_prompt,
    build_volume_outline_prompt,
    build_chapter_outlines_prompt,
    build_chapter_content_prompt,
)
from app.services.chapter_service import (
    create_chapters_batch,
    save_novel_field,
    get_chapters,
    get_chapter,
    update_chapter_content,
    get_novel_docs,
)
from app.services.knowledge_service import search_knowledge_for_prompt
from app.services.style_service import get_style_profile_text


def sse_event(event: str, data: dict) -> str:
    """格式化 SSE 事件"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _parse_chapter_outlines(text: str, batch_start: int, batch_end: int) -> list[dict]:
    """从 AI 输出中解析章节大纲"""
    chapters = []
    # Match patterns like: ### 第X章：标题 or ### 第X章 标题
    pattern = r"###\s*第(\d+)章[：:\s]+(.+?)(?=\n)"
    splits = re.split(r"(?=###\s*第\d+章)", text)

    for block in splits:
        match = re.match(pattern, block.strip())
        if match:
            num = int(match.group(1))
            title = match.group(2).strip()
            # The rest is the outline content
            outline = block[match.end():].strip()
            chapters.append({"number": num, "title": title, "outline": outline})

    # If parsing failed, create simple numbered chapters
    if not chapters:
        lines = text.strip().split("\n\n")
        for i, block in enumerate(lines):
            num = batch_start + i
            if num > batch_end:
                break
            chapters.append({"number": num, "title": f"第{num}章", "outline": block.strip()})

    return chapters


async def run_outline_pipeline(
    novel_id: str, config: NovelConfigData
) -> AsyncGenerator[str, None]:
    """运行大纲生成流水线（Stage 1-5），yield SSE 事件字符串"""

    total_stages = 5
    chapter_count = max(30, config.targetWordCount // 2500)

    # 解析自定义风格（一次查库，后续所有 prompt builder 共用）
    style_override: str | None = None
    if config.customStyleId:
        style_override = await get_style_profile_text(config.customStyleId)

    # ========== Stage 1: 世界观 ==========
    yield sse_event("stage_start", {"stage": "world", "label": "世界观生成", "index": 1, "total": total_stages})

    world = ""
    async for chunk in claude_stream(build_world_prompt(config, style_override=style_override)):
        world += chunk
        yield sse_event("chunk", {"stage": "world", "text": chunk})

    await save_novel_field(novel_id, "world_building", world)
    yield sse_event("stage_done", {"stage": "world", "wordCount": len(world)})

    # ========== Stage 2: 总大纲 ==========
    yield sse_event("stage_start", {"stage": "outline", "label": "总大纲生成", "index": 2, "total": total_stages})

    outline = ""
    async for chunk in claude_stream(build_outline_prompt(config, world, style_override=style_override), max_tokens=8192):
        outline += chunk
        yield sse_event("chunk", {"stage": "outline", "text": chunk})

    await save_novel_field(novel_id, "outline", outline)
    yield sse_event("stage_done", {"stage": "outline", "wordCount": len(outline)})

    # ========== Stage 3: 人物档案 ==========
    yield sse_event("stage_start", {"stage": "characters", "label": "人物档案生成", "index": 3, "total": total_stages})

    characters = ""
    async for chunk in claude_stream(build_characters_prompt(config, world, outline, style_override=style_override)):
        characters += chunk
        yield sse_event("chunk", {"stage": "characters", "text": chunk})

    await save_novel_field(novel_id, "characters_doc", characters)
    yield sse_event("stage_done", {"stage": "characters", "wordCount": len(characters)})

    # ========== Stage 4: 分卷大纲 ==========
    yield sse_event("stage_start", {"stage": "volumes", "label": "分卷大纲生成", "index": 4, "total": total_stages})

    volume_outline = ""
    async for chunk in claude_stream(build_volume_outline_prompt(config, world, outline, characters, style_override=style_override), max_tokens=8192):
        volume_outline += chunk
        yield sse_event("chunk", {"stage": "volumes", "text": chunk})

    await save_novel_field(novel_id, "volume_outline", volume_outline)
    yield sse_event("stage_done", {"stage": "volumes", "wordCount": len(volume_outline)})

    # ========== Stage 5: 批量章节大纲 ==========
    yield sse_event("stage_start", {"stage": "chapter_outlines", "label": f"章节大纲生成（共{chapter_count}章）", "index": 5, "total": total_stages})

    batch_size = 20
    all_outlines_text = ""

    for batch_start in range(1, chapter_count + 1, batch_size):
        batch_end = min(batch_start + batch_size - 1, chapter_count)

        yield sse_event("chunk", {"stage": "chapter_outlines", "text": f"\n\n--- 正在生成第 {batch_start}-{batch_end} 章大纲 ---\n\n"})

        # Build previous outlines context (last 10 chapters)
        prev_text = ""
        if all_outlines_text:
            lines = all_outlines_text.strip().split("\n")
            prev_text = "\n".join(lines[-60:])  # last ~10 chapters

        batch_text = ""
        prompt = build_chapter_outlines_prompt(
            config, world, outline, characters, volume_outline,
            batch_start, batch_end, prev_text,
            style_override=style_override,
        )
        async for chunk in claude_stream(prompt, max_tokens=8192):
            batch_text += chunk
            yield sse_event("chunk", {"stage": "chapter_outlines", "text": chunk})

        all_outlines_text += "\n" + batch_text

        # Parse and save chapters
        chapters = _parse_chapter_outlines(batch_text, batch_start, batch_end)
        saved = await create_chapters_batch(novel_id, chapters)

        for ch in saved:
            yield sse_event("chapter_outline", {
                "chapterId": ch["id"],
                "number": ch["chapterNumber"],
                "title": ch["title"],
            })

    yield sse_event("stage_done", {"stage": "chapter_outlines", "totalChapters": chapter_count})

    # ========== Done ==========
    await save_novel_field(novel_id, "status", "outline_done")
    yield sse_event("done", {"totalChapters": chapter_count, "message": "大纲生成完成"})


async def run_chapter_generation(
    novel_id: str, chapter_id: str
) -> AsyncGenerator[str, None]:
    """生成单章正文，yield SSE 事件"""

    # Load context
    docs = await get_novel_docs(novel_id)
    chapter = await get_chapter(chapter_id)
    if not chapter or not docs:
        yield sse_event("error", {"message": "章节或小说不存在"})
        return

    config = NovelConfigData.model_validate_json(docs["config_json"])

    # 解析自定义风格
    style_override: str | None = None
    if config.customStyleId:
        style_override = await get_style_profile_text(config.customStyleId)

    # Get previous chapter summary (last 2 chapters) - use structured summary
    chapters = await get_chapters(novel_id)
    prev_summary = ""
    for ch in chapters:
        if ch["chapterNumber"] < chapter["chapterNumber"] and ch["chapterNumber"] >= chapter["chapterNumber"] - 2:
            prev_ch = await get_chapter(ch["id"])
            if prev_ch and prev_ch["content"]:
                content = prev_ch["content"]
                # 取开头200字（场景）+ 结尾300字（进展和悬念），比纯取尾部更有上下文
                intro = content[:200]
                outro = content[-300:] if len(content) > 500 else content[200:]
                prev_summary += f"\n第{prev_ch['chapterNumber']}章《{prev_ch['title']}》：\n开头：{intro}\n结尾：{outro}\n"

    # Get next chapter outline for foreshadowing
    next_outline = ""
    for ch in chapters:
        if ch["chapterNumber"] == chapter["chapterNumber"] + 1:
            next_outline = ch["outline"]
            break

    # Search knowledge base for relevant snippets
    keywords = []
    outline_text = chapter["outline"] or ""
    for kw in ["战斗", "突破", "打脸", "签到", "秘境", "拍卖", "宗门", "修炼", "日常", "转折", "伏笔"]:
        if kw in outline_text or kw in (chapter["title"] or ""):
            keywords.append(kw)
    knowledge_snippets = await search_knowledge_for_prompt(keywords, limit=2) if keywords else []

    prompt = build_chapter_content_prompt(
        config=config,
        world=docs["world_building"],
        characters=docs["characters_doc"],
        chapter_outline=chapter["outline"],
        chapter_number=chapter["chapterNumber"],
        chapter_title=chapter["title"],
        prev_summary=prev_summary,
        next_outline=next_outline,
        knowledge_snippets=knowledge_snippets,
        style_override=style_override,
    )

    yield sse_event("stage_start", {"stage": "content", "label": f"第{chapter['chapterNumber']}章正文生成"})

    content = ""
    async for chunk in claude_stream(prompt, max_tokens=8192):
        content += chunk
        yield sse_event("chunk", {"stage": "content", "text": chunk})

    await update_chapter_content(chapter_id, content)
    yield sse_event("stage_done", {"stage": "content", "wordCount": len(content)})
    yield sse_event("done", {"message": "章节正文生成完成"})
