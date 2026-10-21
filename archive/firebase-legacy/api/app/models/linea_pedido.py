from sqlalchemy import Column, Integer, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

class LineaPedido(Base):
    __tablename__ = "linea_pedido"

    lineaPedidoId = Column("linea_pedido_id", Integer, primary_key=True, index=True)
    pedidoId = Column("pedido_id", Integer, ForeignKey("pedido.pedido_id"), nullable=False)
    productoId = Column("producto_id", Integer, ForeignKey("producto.producto_id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precioUnitario = Column("precio_unitario", Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    pedido = relationship("Pedido", back_populates="lineasPedido")
    producto = relationship("Producto", back_populates="lineasPedido")