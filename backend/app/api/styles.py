"""写作风格库 API 路由"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from app.services.style_service import (
    list_styles,
    get_style,
    create_style_profile,
    delete_style,
)

router = APIRouter(prefix="/api", tags=["styles"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB per file
MAX_FILES = 50
MAX_NAME_LEN = 100


@router.get("/styles")
async def list_styles_endpoint():
    return await list_styles()


@router.get("/styles/{style_id}")
async def get_style_endpoint(style_id: str):
    style = await get_style(style_id)
    if not style:
        raise HTTPException(404, "Style not found")
    return style


@router.post("/styles")
async def create_style_endpoint(
    name: str = Form(...),
    description: str = Form(""),
    files: list[UploadFile] = File(...),
):
    if not files:
        raise HTTPException(400, "至少上传一个 .txt 文件")
    if len(files) > MAX_FILES:
        raise HTTPException(400, f"最多上传 {MAX_FILES} 个文件")
    if len(name) > MAX_NAME_LEN:
        raise HTTPException(400, f"风格名称不能超过 {MAX_NAME_LEN} 字")

    file_contents: list[tuple[str, str]] = []
    for f in files:
        if not f.filename or not f.filename.endswith(".txt"):
            raise HTTPException(400, f"仅支持 .txt 文件，收到: {f.filename}")
        raw = await f.read()
        if len(raw) > MAX_FILE_SIZE:
            raise HTTPException(400, f"文件 {f.filename} 超过 50MB 限制")
        if len(raw) == 0:
            continue
        for encoding in ("utf-8", "gbk", "gb18030", "big5"):
            try:
                text = raw.decode(encoding)
                break
            except (UnicodeDecodeError, LookupError):
                continue
        else:
            raise HTTPException(400, f"无法解码文件 {f.filename}，请使用 UTF-8 或 GBK 编码")
        file_contents.append((f.filename, text))

    result = await create_style_profile(name, description, file_contents)
    return result


@router.delete("/styles/{style_id}")
async def delete_style_endpoint(style_id: str):
    ok = await delete_style(style_id)
    if not ok:
        raise HTTPException(404, "Style not found")
    return {"message": "Deleted"}
