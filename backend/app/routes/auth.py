"""
Authentication Routes

Handles user signup, login, token refresh, and profile retrieval.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
)
from app.services.profile_enrichment import profile_enrichment


router = APIRouter(prefix="/auth", tags=["Authentication"])


async def enrich_user_profile_background(db: AsyncSession, user_id: str):
    """Background task to enrich user profile with GitHub data."""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user and user.github_username:
            await profile_enrichment.enrich_user_profile(db, user)
            await db.commit()
    except Exception as e:
        # Log error but don't fail the request
        print(f"Error enriching profile for user {user_id}: {e}")


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user.
    
    - Validates email uniqueness
    - Hashes password with bcrypt
    - Creates user in database
    - Returns JWT tokens
    """
    # Check if email already exists
    existing = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Check if GitHub username already exists
    if user_data.github_username:
        existing_github = await db.execute(
            select(User).where(User.github_username == user_data.github_username)
        )
        if existing_github.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub username already registered",
            )
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        github_username=user_data.github_username,
        linkedin_username=user_data.linkedin_username,
        twitter_username=user_data.twitter_username,
        stackoverflow_user_id=user_data.stackoverflow_user_id,
        devto_username=user_data.devto_username,
        hashnode_username=user_data.hashnode_username,
        website=user_data.website,
        location=user_data.location,
        bio=user_data.bio,
    )
    
    db.add(user)
    await db.flush()
    await db.refresh(user)
    
    # Enrich profile with multi-platform data if programmer
    if user.role == UserRole.PROGRAMMER:
        try:
            await profile_enrichment.enrich_user_profile(db, user)
        except Exception as e:
            # Log but don't fail signup
            print(f"Error enriching profile during signup: {e}")
    
    # Generate tokens
    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user and return JWT tokens.
    
    - Validates credentials
    - Returns access and refresh tokens
    """
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Refresh profile with multi-platform data if programmer
    if user.role == UserRole.PROGRAMMER:
        try:
            await profile_enrichment.enrich_user_profile(db, user)
        except Exception as e:
            # Log but don't fail login
            print(f"Error enriching profile during login: {e}")
    
    # Generate tokens
    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/refresh", response_model=TokenResponse)
async def refresh_token(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token using a valid refresh token.
    """
    payload = decode_token(token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    
    user_id = payload.get("sub")
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Generate new tokens
    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)
