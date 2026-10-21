from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Pedido(Base):
    __tablename__ = "pedido"

    pedidoId = Column("pedido_id", Integer, primary_key=True, index=True)
    descripcion = Column(String, nullable=False)
    usuarioId = Column("usuario_id", Integer, ForeignKey("usuario.usuario_id"), nullable=False)
    total = Column(Float, nullable=False, default=0)

    usuario = relationship("Usuario", back_populates="pedidos")
    lineasPedido = relationship("LineaPedido", back_populates="pedido", cascade="all, delete-orphan")