import os
import sys

# Ensure backend is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.core.auth import get_current_user
from app.config import get_settings

def test():
    s = get_settings()
    print("1. Testing None credentials...")
    try:
        get_current_user(credentials=None, settings=s, supabase=None)
        assert False, "Should have raised 401"
    except HTTPException as e:
        print(f"   [PASS] Status: {e.status_code}, Detail: {e.detail}")

    print("2. Testing empty credentials...")
    try:
        c = HTTPAuthorizationCredentials(scheme="Bearer", credentials="")
        get_current_user(credentials=c, settings=s, supabase=None)
        assert False, "Should have raised 401"
    except HTTPException as e:
        print(f"   [PASS] Status: {e.status_code}, Detail: {e.detail}")

    print("3. Testing bad JWT token...")
    try:
        c = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.structure")
        get_current_user(credentials=c, settings=s, supabase=None)
        assert False, "Should have raised 401"
    except HTTPException as e:
        print(f"   [PASS] Status: {e.status_code}, Detail: {e.detail}")

    print("\nALL BACKEND AUTH TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test()
