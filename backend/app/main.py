from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database.db import init_db
from app.api.novels import router as novels_router
from app.api.generate import router as generate_router
from app.api.knowledge import router as knowledge_router
from app.api.export import router as export_router
from app.api.styles import router as styles_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="修仙小说生成器 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(novels_router)
app.include_router(generate_router)
app.include_router(knowledge_router)
app.include_router(export_router)
app.include_router(styles_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
