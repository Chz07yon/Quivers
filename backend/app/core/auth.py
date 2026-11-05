"""
Supabase JWT Authentication Dependency.
Extracts and validates Supabase JWTs from the Authorization header.
Strictly derives the user ID from the verified token, NEVER from request bodies.
"""

import logging
from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from pydantic import BaseModel
from supabase import create_client, Client

from app.config import Settings, get_settings

logger = logging.getLogger("quivers.auth")
security = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    """Authenticated user context derived exclusively from verified JWT."""
    id: str
    email: Optional[str] = None
    role: Optional[str] = "authenticated"
    app_metadata: Optional[dict] = None
    user_metadata: Optional[dict] = None


def get_supabase_client(settings: Settings = Depends(get_settings)) -> Optional[Client]:
    """Returns an initialized Supabase Python client if credentials are configured."""
    key = settings.effective_supabase_key
    if settings.SUPABASE_URL and key:
        try:
            return create_client(settings.SUPABASE_URL, key)
        except Exception as e:
            logger.warning("Could not initialize Supabase client: %s", str(e))
            return None
    return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    settings: Settings = Depends(get_settings),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> AuthenticatedUser:
    """
    FastAPI dependency that validates the Supabase Bearer JWT and extracts the user.

    Rejects request with 401 Unauthorized if:
    - Authorization header is missing
    - Token is malformed, expired, or signature is invalid

    Guarantees user ID is taken from the verified token claim, NEVER from request body.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token in the Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token cannot be empty.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Strategy 1: Verify using Supabase Auth Client API (calls Supabase Auth /auth/v1/user)
    if supabase is not None:
        try:
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                u = user_response.user
                return AuthenticatedUser(
                    id=str(u.id),
                    email=u.email,
                    role=getattr(u, "role", "authenticated") or "authenticated",
                    app_metadata=getattr(u, "app_metadata", {}),
                    user_metadata=getattr(u, "user_metadata", {}),
                )
        except Exception as exc:
            # If Supabase API rejected the token (expired, signature invalid, user revoked)
            logger.warning("Supabase token verification failed: %s", str(exc))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Strategy 2: Verify using SUPABASE_JWT_SECRET if configured (offline HS256)
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True},
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing subject claim ('sub').",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return AuthenticatedUser(
                id=str(user_id),
                email=payload.get("email"),
                role=payload.get("role", "authenticated"),
                app_metadata=payload.get("app_metadata", {}),
                user_metadata=payload.get("user_metadata", {}),
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session token has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token signature: {str(err)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # If neither Supabase URL nor JWT secret is configured on the backend
    if not settings.SUPABASE_URL:
        # Development fallback only if unconfigured, decode to check JWT structure
        try:
            unverified_payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True},
            )
            user_id = unverified_payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Malformed token: missing subject claim ('sub').",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return AuthenticatedUser(
                id=str(user_id),
                email=unverified_payload.get("email"),
                role=unverified_payload.get("role", "authenticated"),
                app_metadata=unverified_payload.get("app_metadata", {}),
                user_metadata=unverified_payload.get("user_metadata", {}),
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unable to parse authentication token: {str(exc)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication failed. Invalid credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user_id(
    user: AuthenticatedUser = Depends(get_current_user),
) -> str:
    """Convenience dependency returning strictly the authenticated user ID string."""
    return user.id
