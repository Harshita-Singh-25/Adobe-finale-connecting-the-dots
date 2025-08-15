# backend/services/cache_manager.py
import json
import pickle
import hashlib
from pathlib import Path
from typing import Any, Optional, Dict
from datetime import datetime, timedelta
import asyncio
import aiofiles

from backend.core.config import settings

class CacheManager:
    """Manages caching for processed documents and search results"""
    
    def __init__(self):
        self.cache_dir = settings.CACHE_DIR
        self.ttl = settings.CACHE_TTL
        self.memory_cache = {}  # In-memory cache for fast access
        self._cleanup_task = None
    
    async def get_cached_document(self, doc_hash: str) -> Optional[Dict[str, Any]]:
        """Get cached document structure"""
        # Check memory cache first
        if doc_hash in self.memory_cache:
            cached = self.memory_cache[doc_hash]
            if self._is_valid(cached['timestamp']):
                return cached['data']
        
        # Check disk cache
        cache_file = self.cache_dir / f"doc_{doc_hash}.json"
        if cache_file.exists():
            try:
                async with aiofiles.open(cache_file, 'r') as f:
                    content = await f.read()
                    cached = json.loads(content)
                    
                    if self._is_valid(cached['timestamp']):
                        # Update memory cache
                        self.memory_cache[doc_hash] = cached
                        return cached['data']
            except Exception as e:
                print(f"Cache read error: {e}")
        
        return None
    
    async def cache_document(self, doc_hash: str, doc_data: Dict[str, Any]):
        """Cache processed document structure"""
        cached = {
            'data': doc_data,
            'timestamp': datetime.now().isoformat()
        }
        
        # Update memory cache
        self.memory_cache[doc_hash] = cached
        
        # Save to disk
        cache_file = self.cache_dir / f"doc_{doc_hash}.json"
        try:
            async with aiofiles.open(cache_file, 'w') as f:
                await f.write(json.dumps(cached, indent=2))
        except Exception as e:
            print(f"Cache write error: {e}")
    
    async def get_cached_search(self, query_hash: str) -> Optional[list]:
        """Get cached search results"""
        cache_file = self.cache_dir / f"search_{query_hash}.pkl"
        
        if cache_file.exists():
            try:
                async with aiofiles.open(cache_file, 'rb') as f:
                    content = await f.read()
                    cached = pickle.loads(content)
                    
                    if self._is_valid(cached['timestamp']):
                        return cached['results']
            except Exception as e:
                print(f"Search cache read error: {e}")
        
        return None
    
    async def cache_search(self, query_hash: str, results: list):
        """Cache search results"""
        cached = {
            'results': results,
            'timestamp': datetime.now().isoformat()
        }
        
        cache_file = self.cache_dir / f"search_{query_hash}.pkl"
        try:
            async with aiofiles.open(cache_file, 'wb') as f:
                await f.write(pickle.dumps(cached))
        except Exception as e:
            print(f"Search cache write error: {e}")
    
    def get_query_hash(self, query: str, doc_id: Optional[str] = None) -> str:
        """Generate hash for search query"""
        key = f"{query}_{doc_id}" if doc_id else query
        return hashlib.md5(key.encode()).hexdigest()
    
    def _is_valid(self, timestamp_str: str) -> bool:
        """Check if cached item is still valid"""
        try:
            timestamp = datetime.fromisoformat(timestamp_str)
            age = datetime.now() - timestamp
            return age.total_seconds() < self.ttl
        except:
            return False
    
    async def cleanup_expired(self):
        """Remove expired cache entries"""
        # Clean memory cache
        expired_keys = []
        for key, cached in self.memory_cache.items():
            if not self._is_valid(cached['timestamp']):
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.memory_cache[key]
        
        # Clean disk cache
        for cache_file in self.cache_dir.glob("*.json"):
            try:
                async with aiofiles.open(cache_file, 'r') as f:
                    content = await f.read()
                    cached = json.loads(content)
                    
                    if not self._is_valid(cached['timestamp']):
                        cache_file.unlink()
            except:
                pass
        
        for cache_file in self.cache_dir.glob("*.pkl"):
            try:
                async with aiofiles.open(cache_file, 'rb') as f:
                    content = await f.read()
                    cached = pickle.loads(content)
                    
                    if not self._is_valid(cached['timestamp']):
                        cache_file.unlink()
            except:
                pass
    
    async def start_cleanup_task(self):
        """Start background cleanup task"""
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
    
    async def _periodic_cleanup(self):
        """Periodically clean expired cache"""
        while True:
            await asyncio.sleep(3600)  # Run every hour
            await self.cleanup_expired()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get cache statistics"""
        doc_cache_files = list(self.cache_dir.glob("doc_*.json"))
        search_cache_files = list(self.cache_dir.glob("search_*.pkl"))
        
        return {
            'memory_cache_size': len(self.memory_cache),
            'disk_doc_cache_size': len(doc_cache_files),
            'disk_search_cache_size': len(search_cache_files),
            'ttl_seconds': self.ttl
        }