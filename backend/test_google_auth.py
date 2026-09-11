"""Integration test for Google Authentication endpoints."""

import asyncio
from unittest.mock import AsyncMock, patch
import httpx
from httpx import ASGITransport, AsyncClient, Response
from main import app

async def run_google_auth_tests():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Config endpoint
        res = await ac.get("/auth/config")
        assert res.status_code == 200, f"Config failed: {res.text}"
        data = res.json()
        assert "google_client_id" in data
        assert "google_enabled" in data
        print("PASS: /auth/config returned:", data)

        # 2. Empty credential to /auth/google -> 400 or 422
        res = await ac.post("/auth/google", json={"credential": ""})
        assert res.status_code in (400, 422)
        print("PASS: /auth/google handles empty credential with status:", res.status_code)

        # 3. Valid Google token flow (mocked Google tokeninfo response)
        from config.settings import settings

        mock_google_profile = {
            "iss": "https://accounts.google.com",
            "sub": "google-user-9999",
            "aud": settings.google_client_id,
            "email": "google.testuser@example.com",
            "email_verified": "true",
            "name": "Google Test User",
            "picture": "https://example.com/photo.jpg",
        }

        # Target patch specifically on the router's httpx client
        with patch("auth.router.httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = Response(
                status_code=200,
                json=mock_google_profile,
            )
            res = await ac.post("/auth/google", json={"credential": "mock_id_token_12345"})

        assert res.status_code == 200, f"Mock google sign-in failed: {res.text}"
        res_data = res.json()
        assert res_data["user"]["email"] == "google.testuser@example.com"
        assert res_data["user"]["name"] == "Google Test User"
        assert "token" in res.cookies
        print("PASS: /auth/google authenticated user successfully:", res_data["user"])

        # 4. Verify authenticated session via /auth/me
        me_res = await ac.get("/auth/me")
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "google.testuser@example.com"
        print("PASS: /auth/me recognized Google user session:", me_res.json())

        # 5. Sign out
        signout_res = await ac.post("/auth/signout")
        assert signout_res.status_code == 200
        print("PASS: /auth/signout cleared Google user session")

        # 6. Verify session revoked
        after_me = await ac.get("/auth/me")
        assert after_me.status_code == 401
        print("PASS: /auth/me rejected unauthenticated request after signout (401)")

    print("\nALL GOOGLE AUTH TESTS PASSED SUCCESSFULLY! [OK]")

if __name__ == "__main__":
    asyncio.run(run_google_auth_tests())
