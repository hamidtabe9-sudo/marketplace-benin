import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth_models import AuthCode, LoginAttempt, User
from .auth_schemas import (
    AuthResponse,
    EmailCodeRequest,
    EmailRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirmRequest,
    RegisterRequest,
    UserPublic,
)
from .database import get_db
from .email_service import EmailDeliveryError, send_auth_code

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("La variable JWT_SECRET_KEY manque dans le fichier .env.")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60
CODE_MINUTES = 10
CODE_RESEND_SECONDS = 60
MAX_CODES_PER_HOUR = 5
MAX_CODE_ATTEMPTS = 5
LOGIN_FAILURE_LIMIT = 5
LOGIN_WINDOW_MINUTES = 15
LOGIN_LOCK_MINUTES = 15
password_hasher = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hasher.hash(secrets.token_urlsafe(32))
bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["Authentification"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def create_access_token(user: User) -> str:
    expires_at = utc_now() + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {"sub": str(user.id), "ver": user.token_version, "exp": expires_at}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_auth_response(user: User) -> AuthResponse:
    return AuthResponse(access_token=create_access_token(user), user=UserPublic.model_validate(user))


def normalize_phone(value: str) -> str:
    return re.sub(r"[\s()-]", "", value.strip())


def code_digest(code: str) -> str:
    return hmac.new(SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def issue_code(db: Session, user: User, purpose: str) -> str:
    now = utc_now()
    recent = list(db.scalars(select(AuthCode).where(
        AuthCode.user_id == user.id,
        AuthCode.purpose == purpose,
        AuthCode.created_at >= now - timedelta(hours=1),
    ).order_by(AuthCode.created_at.desc())).all())
    if recent and now - as_utc(recent[0].created_at) < timedelta(seconds=CODE_RESEND_SECONDS):
        raise HTTPException(status_code=429, detail="Attends une minute avant de demander un nouveau code.")
    if len(recent) >= MAX_CODES_PER_HOUR:
        raise HTTPException(status_code=429, detail="Trop de demandes. Réessaie dans une heure.")
    active = db.scalars(select(AuthCode).where(
        AuthCode.user_id == user.id,
        AuthCode.purpose == purpose,
        AuthCode.consumed_at.is_(None),
    )).all()
    for item in active:
        item.consumed_at = now
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(AuthCode(
        user_id=user.id,
        purpose=purpose,
        code_hash=code_digest(code),
        created_at=now,
        expires_at=now + timedelta(minutes=CODE_MINUTES),
    ))
    db.commit()
    try:
        send_auth_code(email=user.email, code=code, purpose=purpose)
    except EmailDeliveryError as exc:
        latest = db.scalar(select(AuthCode).where(
            AuthCode.user_id == user.id,
            AuthCode.purpose == purpose,
            AuthCode.code_hash == code_digest(code),
        ))
        if latest:
            latest.consumed_at = utc_now()
            db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return code

def consume_code(db: Session, user: User, purpose: str, code: str) -> AuthCode:
    now = utc_now()
    item = db.scalar(select(AuthCode).where(
        AuthCode.user_id == user.id,
        AuthCode.purpose == purpose,
        AuthCode.consumed_at.is_(None),
    ).order_by(AuthCode.created_at.desc()))
    if item is None or as_utc(item.expires_at) <= now or item.attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré. Demande un nouveau code.")
    item.attempts += 1
    if not hmac.compare_digest(item.code_hash, code_digest(code)):
        if item.attempts >= MAX_CODE_ATTEMPTS:
            item.consumed_at = now
        db.commit()
        raise HTTPException(status_code=400, detail="Code invalide ou expiré. Demande un nouveau code.")
    item.consumed_at = now
    db.commit()
    return item


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> MessageResponse:
    email = str(payload.email).strip().lower()
    phone = normalize_phone(payload.phone)
    existing = db.scalar(select(User).where(or_(User.email == email, User.phone == phone)))
    if existing:
        raise HTTPException(status_code=409, detail="Impossible de créer le compte avec ces informations. Vérifie-les ou connecte-toi si tu as déjà un compte.")
    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        phone=phone,
        password_hash=password_hasher.hash(payload.password),
        email_verified=False,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Impossible de créer le compte avec ces informations. Vérifie-les ou connecte-toi si tu as déjà un compte.") from exc
    db.refresh(user)
    issue_code(db, user, "verify_email")
    return MessageResponse(message="Compte créé. Saisis le code envoyé à ton adresse e-mail pour l’activer.")


@router.post("/verification/request", response_model=MessageResponse)
def request_email_verification(payload: EmailRequest, db: Session = Depends(get_db)) -> MessageResponse:
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user and not user.email_verified:
        try:
            issue_code(db, user, "verify_email")
        except HTTPException as exc:
            if exc.status_code not in (429, 503):
                raise
    return MessageResponse(message="Si ce compte existe et doit être vérifié, un code sera envoyé à son adresse e-mail.")


@router.post("/verification/confirm", response_model=AuthResponse)
def confirm_email(payload: EmailCodeRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré. Demande un nouveau code.")
    consume_code(db, user, "verify_email", payload.code)
    user.email_verified = True
    db.commit()
    db.refresh(user)
    return create_auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    identifier = payload.identifier.strip()
    normalized_identifier = identifier.lower() if "@" in identifier else normalize_phone(identifier)
    attempt_key = hmac.new(SECRET_KEY.encode(), normalized_identifier.encode(), hashlib.sha256).hexdigest()
    now = utc_now()
    attempt = db.get(LoginAttempt, attempt_key)
    if attempt and attempt.blocked_until and as_utc(attempt.blocked_until) > now:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Réessaie dans 15 minutes.")

    user = db.scalar(select(User).where(or_(User.email == identifier.lower(), User.phone == normalize_phone(identifier))))
    stored_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    password_is_valid = password_hasher.verify(payload.password, stored_hash)
    if user is None or not user.is_active or not password_is_valid:
        if attempt is None:
            attempt = LoginAttempt(identifier_hash=attempt_key, failed_attempts=0, window_started_at=now)
            db.add(attempt)
        if now - as_utc(attempt.window_started_at) >= timedelta(minutes=LOGIN_WINDOW_MINUTES):
            attempt.failed_attempts = 0
            attempt.window_started_at = now
            attempt.blocked_until = None
        attempt.failed_attempts += 1
        if attempt.failed_attempts >= LOGIN_FAILURE_LIMIT:
            attempt.blocked_until = now + timedelta(minutes=LOGIN_LOCK_MINUTES)
        db.commit()
        raise HTTPException(status_code=401, detail="Identifiants incorrects ou compte non vérifié. Vérifie ton adresse e-mail et réessaie.")

    if not user.email_verified:
        raise HTTPException(status_code=401, detail="Identifiants incorrects ou compte non vérifié. Vérifie ton adresse e-mail et réessaie.")
    if attempt:
        db.delete(attempt)
        db.commit()
    return create_auth_response(user)

@router.post("/password-reset/request", response_model=MessageResponse)
def request_password_reset(payload: EmailRequest, db: Session = Depends(get_db)) -> MessageResponse:
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if user and user.email_verified:
        try:
            issue_code(db, user, "password_reset")
        except HTTPException as exc:
            if exc.status_code not in (429, 503):
                raise
    return MessageResponse(message="Si cette adresse correspond à un compte actif, un code de réinitialisation sera envoyé.")


@router.post("/password-reset/confirm", response_model=MessageResponse)
def confirm_password_reset(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db)) -> MessageResponse:
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if user is None:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré. Demande une nouvelle réinitialisation.")
    consume_code(db, user, "password_reset", payload.code)
    user.password_hash = password_hasher.hash(payload.new_password)
    user.token_version += 1
    for item in db.scalars(select(AuthCode).where(AuthCode.user_id == user.id, AuthCode.consumed_at.is_(None))).all():
        item.consumed_at = utc_now()
    db.commit()
    return MessageResponse(message="Mot de passe modifié. Tu peux te connecter avec ton nouveau mot de passe.")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentification requise.", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
        token_version = int(payload["ver"])
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Session invalide ou expirée.", headers={"WWW-Authenticate": "Bearer"})
    user = db.get(User, user_id)
    if user is None or not user.is_active or not user.email_verified or user.token_version != token_version:
        raise HTTPException(status_code=401, detail="Session invalide ou expirée.", headers={"WWW-Authenticate": "Bearer"})
    return user


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MessageResponse:
    current_user.token_version += 1
    db.commit()
    return MessageResponse(message="Session fermée.")
