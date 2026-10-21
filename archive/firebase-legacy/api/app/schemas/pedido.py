from pydantic import BaseModel
from app.schemas.usuario import UsuarioSimple
from app.schemas.linea_pedido import LineaPedidoOut, LineaPedidoCreate

class PedidoCreate(BaseModel):
    descripcion: str
    usuarioId: int
    lineas: list[LineaPedidoCreate]

class PedidoOut(BaseModel):
    pedidoId: int
    descripcion: str
    usuarioId: int
    total: float
    usuario: UsuarioSimple
    lineasPedido: list[LineaPedidoOut]

    class Config:
        from_attributes = True

class PedidoSimple(BaseModel):
    pedidoId: int
    descripcion: str

    class Config:
        from_attributes = True