from pydantic import BaseModel
from app.schemas.producto import ProductoSimple

class LineaPedidoCreate(BaseModel):
    productoId: int
    cantidad: int

class LineaPedidoOut(BaseModel):
    lineaPedidoId: int
    productoId: int
    cantidad: int
    precioUnitario: float
    subtotal: float
    producto: ProductoSimple

    class Config:
        from_attributes = True