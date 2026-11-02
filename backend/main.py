"""
Quivers Backend Entrypoint
Run with:
    uvicorn main:app --reload --port 8000
Or:
    python main.py
"""

from app.main import app
from app.config import get_settings

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
