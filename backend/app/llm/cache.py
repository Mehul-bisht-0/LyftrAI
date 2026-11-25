from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Optional

_store: dict[str, CachedAnswer] = {}


@dataclass
class CachedAnswer:
    content: str
    model: str
    input_tokens: int
    output_tokens: int


def _cache_key(model: str, messages: list[dict]) -> str:
    payload = json.dumps(
        [1, model, messages],
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


async def find_answer(
    cache, model: str, messages: list[dict]
) -> Optional[CachedAnswer]:
    return _store.get(_cache_key(model, messages))


async def store_answer(
    cache, model: str, messages: list[dict], answer: CachedAnswer
) -> None:
    _store[_cache_key(model, messages)] = answer
