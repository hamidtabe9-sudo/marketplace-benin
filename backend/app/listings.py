from math import atan2, cos, radians, sin, sqrt
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .auth_models import User
from .database import get_db
from .models import Listing
from .schemas import ListingCreate, ListingDetailRead, ListingRead, ListingUpdate

router = APIRouter(prefix="/listings", tags=["Annonces"])

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
MAX_IMAGE_SIZE = 5 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def distance_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    earth_radius_km = 6371.0

    lat_a = radians(latitude_a)
    lat_b = radians(latitude_b)
    lat_delta = radians(latitude_b - latitude_a)
    lon_delta = radians(longitude_b - longitude_a)

    value = (
        sin(lat_delta / 2) ** 2
        + cos(lat_a) * cos(lat_b) * sin(lon_delta / 2) ** 2
    )
    value = min(1.0, max(0.0, value))

    return earth_radius_km * 2 * atan2(sqrt(value), sqrt(1.0 - value))


def get_owned_listing(
    listing_id: int,
    current_user: User,
    db: Session,
) -> Listing:
    listing = db.get(Listing, listing_id)

    if listing is None:
        raise HTTPException(status_code=404, detail="Annonce introuvable.")

    if listing.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Tu ne peux gérer que tes propres annonces.",
        )

    return listing


@router.post("/images", status_code=201)
async def upload_listing_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")

    if extension is None:
        raise HTTPException(
            status_code=400,
            detail="Format accepté : JPG, PNG ou WEBP.",
        )

    contents = await file.read(MAX_IMAGE_SIZE + 1)

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="L’image ne doit pas dépasser 5 Mo.",
        )

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    (UPLOADS_DIR / filename).write_bytes(contents)

    return {"image_url": f"/uploads/{filename}"}


@router.post("", response_model=ListingRead, status_code=201)
def create_listing(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Listing:
    if (payload.latitude is None) != (payload.longitude is None):
        raise HTTPException(
            status_code=400,
            detail="La latitude et la longitude doivent être fournies ensemble.",
        )

    listing = Listing(
        **payload.model_dump(),
        owner_id=current_user.id,
    )

    db.add(listing)
    db.commit()
    db.refresh(listing)

    return listing


@router.get("", response_model=list[ListingRead])
def get_listings(
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    db: Session = Depends(get_db),
) -> list[Listing]:
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=400,
            detail="La latitude et la longitude doivent être fournies ensemble.",
        )

    statement = select(Listing).order_by(Listing.created_at.desc())
    listings = list(db.scalars(statement).all())

    if latitude is not None and longitude is not None:
        listings.sort(
            key=lambda listing: (
                distance_km(
                    latitude,
                    longitude,
                    listing.latitude,
                    listing.longitude,
                )
                if listing.latitude is not None
                and listing.longitude is not None
                else float("inf")
            )
        )

    return listings


@router.get("/mine", response_model=list[ListingRead])
def get_my_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Listing]:
    statement = (
        select(Listing)
        .where(Listing.owner_id == current_user.id)
        .order_by(Listing.created_at.desc())
    )
    return list(db.scalars(statement).all())


@router.get("/{listing_id}", response_model=ListingDetailRead)
def get_listing_detail(
    listing_id: int,
    db: Session = Depends(get_db),
) -> dict:
    listing = db.get(Listing, listing_id)

    if listing is None:
        raise HTTPException(status_code=404, detail="Annonce introuvable.")

    seller = (
        db.get(User, listing.owner_id)
        if listing.owner_id is not None
        else None
    )

    if seller is None:
        raise HTTPException(
            status_code=404,
            detail="Les coordonnées du vendeur ne sont pas disponibles.",
        )

    result = ListingRead.model_validate(listing).model_dump()
    result.update(
        {
            "seller_name": seller.full_name,
            "seller_phone": seller.phone,
            "seller_email": seller.email,
        }
    )

    return result


@router.put("/{listing_id}", response_model=ListingRead)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Listing:
    listing = get_owned_listing(listing_id, current_user, db)
    changes = payload.model_dump(exclude_unset=True)

    has_latitude = "latitude" in changes
    has_longitude = "longitude" in changes

    if has_latitude != has_longitude:
        raise HTTPException(
            status_code=400,
            detail="La latitude et la longitude doivent être fournies ensemble.",
        )

    for field, value in changes.items():
        setattr(listing, field, value)

    db.commit()
    db.refresh(listing)

    return listing


@router.delete("/{listing_id}", status_code=204)
def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    listing = get_owned_listing(listing_id, current_user, db)

    db.delete(listing)
    db.commit()

    return Response(status_code=204)