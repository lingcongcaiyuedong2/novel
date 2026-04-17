"""导出 API 路由 - TXT（流式）"""

from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.services.novel_service import get_novel
from app.services.chapter_service import get_chapters, get_chapter

router = APIRouter(prefix="/api/novels", tags=["export"])


@router.get("/{novel_id}/export")
async def export_novel(novel_id: str, format: str = Query("txt")):
    novel = await get_novel(novel_id)
    if not novel:
        raise HTTPException(404, "Novel not found")

    chapters = await get_chapters(novel_id)
    if not chapters:
        raise HTTPException(400, "No chapters to export")

    if format == "txt":
        return await _export_txt(novel, chapters)
    else:
        raise HTTPException(400, f"Unsupported format: {format}. Use 'txt'.")


async def _export_txt(novel, chapters) -> StreamingResponse:
    filename = f"{novel.title}.txt"
    encoded_filename = quote(filename)

    async def generate():
        yield f"《{novel.title}》\n"
        yield "=" * 40 + "\n\n"

        for ch in chapters:
            full_ch = await get_chapter(ch["id"])
            if not full_ch or not full_ch.get("content"):
                continue
            yield f"第{full_ch['chapterNumber']}章 {full_ch['title']}\n\n"
            yield full_ch["content"] + "\n\n"
            yield "-" * 30 + "\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=\"export.txt\"; filename*=UTF-8''{encoded_filename}"
        },
    )
