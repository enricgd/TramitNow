from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Producto(Base):
    __tablename__ = "producto"

    productoId = Column("producto_id", Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio = Column(Float, nullable=False)

    lineasPedido = relationship("LineaPedido", back_populates="producto", cascade="all, delete-orphan")