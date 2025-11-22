from sqlmodel import SQLModel, create_engine, Session
from .config import settings

# Use check_same_thread=False for SQLite with FastAPI
connect_args = {"check_same_thread": False}
engine = create_engine(
    settings.DATABASE_URL, 
    echo=True, 
    connect_args=connect_args,
    pool_size=20,
    max_overflow=10
)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
