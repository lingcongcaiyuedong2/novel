"""生成 + 章节管理 API 路由"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.models.schemas import NovelConfigData
from app.services.novel_service import get_novel
from app.services.chapter_service import (
    get_chapters,
    get_chapter,
    update_chapter,
    save_novel_field,
)
from app.pipeline.generator import run_outline_pipeline, run_chapter_generation, sse_event

router = APIRouter(prefix="/api", tags=["generate"])


# ---------- 生成流水线 ----------

@router.post("/novels/{novel_id}/generate")
async def trigger_generation(novel_id: str):
    """触发大纲生成流水线"""
    novel = await get_novel(novel_id)
    if not novel:
        raise HTTPException(404, "Novel not found")
    if novel.status not in ("draft", "error"):
        raise HTTPException(400, f"Cannot generate in status: {novel.status}")

    await save_novel_field(novel_id, "status", "generating")
    return {"message": "Generation started", "novelId": novel_id}


@router.get("/novels/{novel_id}/generate/stream")
async def stream_generation(novel_id: str):
    """SSE 流式输出大纲生成进度"""
    novel = await get_novel(novel_id)
    if not novel:
        raise HTTPException(404, "Novel not found")

    config = novel.config

    async def event_stream():
        try:
            async for event in run_outline_pipeline(novel_id, config):
                yield event
        except Exception as e:
            import json
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
            await save_novel_field(novel_id, "status", "error")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------- 章节管理 ----------

@router.get("/novels/{novel_id}/chapters")
async def list_chapters(novel_id: str):
    """获取小说的章节列表"""
    chapters = await get_chapters(novel_id)
    return chapters


@router.get("/chapters/{chapter_id}")
async def get_chapter_detail(chapter_id: str):
    """获取章节详情（含正文）"""
    chapter = await get_chapter(chapter_id)
    if not chapter:
        raise HTTPException(404, "Chapter not found")
    return chapter


class UpdateChapterRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    outline: Optional[str] = None


@router.put("/chapters/{chapter_id}")
async def update_chapter_endpoint(chapter_id: str, req: UpdateChapterRequest):
    """编辑章节"""
    chapter = await update_chapter(chapter_id, title=req.title, content=req.content, outline=req.outline)
    if not chapter:
        raise HTTPException(404, "Chapter not found")
    return chapter


@router.get("/chapters/{chapter_id}/generate")
async def generate_chapter_content(chapter_id: str):
    """SSE 流式生成单章正文"""
    chapter = await get_chapter(chapter_id)
    if not chapter:
        raise HTTPException(404, "Chapter not found")

    novel_id = chapter["novelId"]

    async def event_stream():
        try:
            async for event in run_chapter_generation(novel_id, chapter_id):
                yield event
        except Exception as e:
            import json
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------- 批量章节生成 ----------

@router.get("/novels/{novel_id}/generate/chapters")
async def batch_generate_chapters(novel_id: str):
    """SSE 流式批量生成所有空章节正文"""
    novel = await get_novel(novel_id)
    if not novel:
        raise HTTPException(404, "Novel not found")

    chapters = await get_chapters(novel_id)
    pending = [ch for ch in chapters if ch["status"] == "pending"]
    if not pending:
        raise HTTPException(400, "No pending chapters to generate")

    async def batch_stream():
        import json as _json
        total = len(pending)
        yield sse_event("batch_start", {"total": total})
        for i, ch in enumerate(pending):
            yield sse_event("chapter_start", {
                "index": i + 1, "total": total,
                "chapterId": ch["id"], "title": ch["title"],
                "number": ch["chapterNumber"],
            })
            try:
                async for event in run_chapter_generation(novel_id, ch["id"]):
                    yield event
            except Exception as e:
                yield f"event: error\ndata: {_json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
        await save_novel_field(novel_id, "status", "completed")
        yield sse_event("batch_done", {"total": total, "message": f"全部 {total} 章正文生成完成"})

    return StreamingResponse(
        batch_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
