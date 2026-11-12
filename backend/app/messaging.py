from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .auth_models import User
from .database import get_db
from .messaging_models import ChatMessage, Conversation
from .messaging_schemas import (
    ConversationCreate,
    ConversationRead,
    MessageCreate,
    MessageRead,
)
from .models import Listing


router = APIRouter(prefix="/messaging", tags=["Messagerie"])


def require_participant(conversation: Conversation, user: User) -> None:
    if user.id not in (conversation.buyer_id, conversation.seller_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu ne participes pas à cette conversation.",
        )


def make_conversation_read(
    conversation: Conversation,
    current_user: User,
    db: Session,
) -> ConversationRead:
    listing = db.get(Listing, conversation.listing_id)

    other_user_id = (
        conversation.seller_id
        if current_user.id == conversation.buyer_id
        else conversation.buyer_id
    )
    other_user = db.get(User, other_user_id)

    if other_user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    latest_message = db.scalar(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(1)
    )

    return ConversationRead(
        id=conversation.id,
        listing_id=conversation.listing_id,
        listing_title=listing.title if listing else "Annonce supprimée",
        listing_image_url=listing.image_url if listing else None,
        other_user_id=other_user.id,
        other_user_name=other_user.full_name,
        last_message=latest_message.body if latest_message else None,
        last_message_at=latest_message.created_at if latest_message else None,
        created_at=conversation.created_at,
    )


@router.post(
    "/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_201_CREATED,
)
def open_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationRead:
    listing = db.get(Listing, payload.listing_id)

    if listing is None:
        raise HTTPException(status_code=404, detail="Annonce introuvable.")

    if listing.owner_id is None:
        raise HTTPException(
            status_code=400,
            detail="Le vendeur de cette ancienne annonce n'est pas identifié.",
        )

    if listing.owner_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Tu ne peux pas démarrer une conversation avec toi-même.",
        )

    conversation = db.scalar(
        select(Conversation).where(
            Conversation.listing_id == listing.id,
            Conversation.buyer_id == current_user.id,
        )
    )

    if conversation is None:
        conversation = Conversation(
            listing_id=listing.id,
            buyer_id=current_user.id,
            seller_id=listing.owner_id,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    return make_conversation_read(conversation, current_user, db)


@router.get("/conversations", response_model=list[ConversationRead])
def get_my_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationRead]:
    conversations = db.scalars(
        select(Conversation)
        .where(
            (Conversation.buyer_id == current_user.id)
            | (Conversation.seller_id == current_user.id)
        )
        .order_by(Conversation.created_at.desc())
    ).all()

    return [
        make_conversation_read(conversation, current_user, db)
        for conversation in conversations
    ]


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageRead],
)
def get_messages(
    conversation_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageRead]:
    conversation = db.get(Conversation, conversation_id)

    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")

    require_participant(conversation, current_user)

    rows = db.execute(
        select(ChatMessage, User.full_name)
        .join(User, User.id == ChatMessage.sender_id)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    ).all()

    rows.reverse()

    return [
        MessageRead(
            id=message.id,
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            sender_name=sender_name,
            body=message.body,
            created_at=message.created_at,
        )
        for message, sender_name in rows
    ]


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageRead:
    conversation = db.get(Conversation, conversation_id)

    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")

    require_participant(conversation, current_user)

    body = payload.body.strip()
    if not body:
        raise HTTPException(
            status_code=422,
            detail="Le message ne peut pas être vide.",
        )

    message = ChatMessage(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        body=body,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return MessageRead(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        body=message.body,
        created_at=message.created_at,
    )