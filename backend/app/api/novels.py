from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    CreateNovelRequest,
    UpdateNovelRequest,
    NovelSummaryResponse,
    NovelDetailResponse,
)
from app.services import novel_service

router = APIRouter(prefix="/api/novels", tags=["novels"])


@router.post("", response_model=NovelDetailResponse, status_code=201)
async def create_novel(req: CreateNovelRequest):
    return await novel_service.create_novel(req)


@router.get("", response_model=list[NovelSummaryResponse])
async def list_novels():
    return await novel_service.get_novels()


@router.get("/{novel_id}", response_model=NovelDetailResponse)
async def get_novel(novel_id: str):
    novel = await novel_service.get_novel(novel_id)
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    return novel


@router.put("/{novel_id}", response_model=NovelDetailResponse)
async def update_novel(novel_id: str, req: UpdateNovelRequest):
    novel = await novel_service.update_novel(novel_id, req)
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    return novel


@router.delete("/{novel_id}", status_code=204)
async def delete_novel(novel_id: str):
    deleted = await novel_service.delete_novel(novel_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Novel not found")
