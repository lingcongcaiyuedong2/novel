"""知识库 API 路由"""

import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.services import knowledge_service

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class KnowledgeCreateRequest(BaseModel):
    category: str
    subType: Optional[str] = ""
    title: str
    content: str
    tags: Optional[list[str]] = []


class KnowledgeUpdateRequest(BaseModel):
    category: Optional[str] = None
    subType: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None


@router.get("")
async def list_knowledge(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sub_type: Optional[str] = Query(None),
):
    return await knowledge_service.list_knowledge(category=category, sub_type=sub_type, search=search)


@router.get("/presets/{sub_type}")
async def get_character_presets(sub_type: str):
    """返回角色预设选项，按标题分组，content 为 JSON 数组"""
    items = await knowledge_service.list_knowledge(
        category="character_preset", sub_type=sub_type
    )
    result = []
    for item in items:
        try:
            options = json.loads(item["content"])
        except (json.JSONDecodeError, TypeError):
            options = []
        result.append({"title": item["title"], "options": options})
    return result


@router.get("/{item_id}")
async def get_knowledge(item_id: str):
    item = await knowledge_service.get_knowledge(item_id)
    if not item:
        raise HTTPException(404, "Knowledge item not found")
    return item


@router.post("", status_code=201)
async def create_knowledge(req: KnowledgeCreateRequest):
    return await knowledge_service.create_knowledge(req.model_dump())


@router.put("/{item_id}")
async def update_knowledge(item_id: str, req: KnowledgeUpdateRequest):
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    item = await knowledge_service.update_knowledge(item_id, data)
    if not item:
        raise HTTPException(404, "Knowledge item not found")
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_knowledge(item_id: str):
    deleted = await knowledge_service.delete_knowledge(item_id)
    if not deleted:
        raise HTTPException(404, "Item not found or is built-in")
