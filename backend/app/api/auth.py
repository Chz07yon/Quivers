"""
Authentication Verification API Router.
Exposes protected endpoints demonstrating Supabase JWT token verification,
rejection of unauthenticated requests, and secure user ID extraction.
"""

from fastapi import APIRouter, Depends
from app.core.auth import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.get(
    "/me",
    summary="Get verified user profile from Supabase JWT",
    description="Protected endpoint that verifies the Bearer JWT and extracts the caller's identity.",
)
async def get_my_profile(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns user profile strictly extracted from the cryptographic JWT payload.
    Never accepts or relies on user ID from request body or query params.
    """
    return {
        "authenticated": True,
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "message": "Authorization successful. JWT verified by FastAPI backend.",
    }
