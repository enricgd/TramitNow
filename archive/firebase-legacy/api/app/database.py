import os

from google.cloud.sql.connector import Connector
import sqlalchemy
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import (
    DB_USER,
    DB_PASS,
    DB_NAME,
    INSTANCE_CONNECTION_NAME,
    GOOGLE_APPLICATION_CREDENTIALS,
)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

connector = Connector()

def getconn():
    conn = connector.connect(
        INSTANCE_CONNECTION_NAME,
        "pg8000",
        user=DB_USER,
        password=DB_PASS,
        db=DB_NAME,
    )
    return conn

engine = sqlalchemy.create_engine(
    "postgresql+pg8000://",
    creator=getconn,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()