from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ListingCreate(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=5)
    price_xof: int = Field(gt=0)
    category: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=2, max_length=80)
    image_url: str | None = Field(default=None, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class ListingUpdate(ListingCreate):
    pass


class ListingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    price_xof: int
    category: str
    city: str
    image_url: str | None
    owner_id: int | None
    created_at: datetime


class ListingDetailRead(ListingRead):
    seller_name: str
    seller_phone: str
    seller_email: EmailStr