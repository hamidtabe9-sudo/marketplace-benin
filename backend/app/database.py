from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DATABASE_URL = "sqlite:///./marketplace.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    # Crée les tables manquantes à partir des modèles SQLAlchemy.
    Base.metadata.create_all(bind=engine)

    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)

    if inspector.has_table("listings"):
        listing_columns = {
            column["name"]
            for column in inspector.get_columns("listings")
        }

        with engine.begin() as connection:
            if "image_url" not in listing_columns:
                connection.execute(
                    text(
                        "ALTER TABLE listings "
                        "ADD COLUMN image_url VARCHAR(500)"
                    )
                )

            if "owner_id" not in listing_columns:
                connection.execute(
                    text(
                        "ALTER TABLE listings "
                        "ADD COLUMN owner_id INTEGER"
                    )
                )

    if inspector.has_table("users"):
        user_columns = {
            column["name"]
            for column in inspector.get_columns("users")
        }

        with engine.begin() as connection:
            if "email_verified" not in user_columns:
                connection.execute(
                    text(
                        "ALTER TABLE users "
                        "ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0"
                    )
                )

            if "token_version" not in user_columns:
                connection.execute(
                    text(
                        "ALTER TABLE users "
                        "ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"
                    )
                )


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()