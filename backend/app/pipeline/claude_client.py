"""Claude API 流式调用客户端"""

import asyncio
import os
from pathlib import Path
from typing import AsyncGenerator
import anthropic
from app.prompts.novel_prompts import SYSTEM_PROMPT

MODEL = "claude-sonnet-4-6"
MAX_RETRIES = 3
RETRY_DELAYS = [2, 5, 10]  # seconds

_client: anthropic.AsyncAnthropic | None = None

# Ensure .env is loaded with override
_env_file = Path(__file__).parent.parent.parent / ".env"
if _env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_file, override=True)


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        base_url = os.environ.get("ANTHROPIC_BASE_URL")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")
        _client = anthropic.AsyncAnthropic(api_key=api_key, base_url=base_url)
    return _client


async def claude_stream(
    prompt: str,
    system: str = SYSTEM_PROMPT,
    max_tokens: int = 4096,
) -> AsyncGenerator[str, None]:
    """流式调用 Claude，带 prompt caching 和自动重试"""
    client = get_client()
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            async with client.messages.stream(
                model=MODEL,
                max_tokens=max_tokens,
                system=[
                    {
                        "type": "text",
                        "text": system,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                async for text in stream.text_stream:
                    yield text
            return  # success
        except (anthropic.APIConnectionError, anthropic.RateLimitError, anthropic.InternalServerError) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAYS[attempt])
            continue

    if last_error:
        raise last_error


async def claude_generate(
    prompt: str,
    system: str = SYSTEM_PROMPT,
    max_tokens: int = 4096,
) -> str:
    """非流式调用 Claude，带自动重试"""
    client = get_client()
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            message = await client.messages.create(
                model=MODEL,
                max_tokens=max_tokens,
                system=[
                    {
                        "type": "text",
                        "text": system,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except (anthropic.APIConnectionError, anthropic.RateLimitError, anthropic.InternalServerError) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAYS[attempt])
            continue

    raise last_error  # type: ignore
