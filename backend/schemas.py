from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ListingCreate(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=5)
    price_xof: int = Field(gt=0)
    category: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=2, max_length=80)


class ListingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    price_xof: int
    category: str
    city: str
    created_at: datetime