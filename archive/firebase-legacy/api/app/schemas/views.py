from pydantic import BaseModel, EmailStr

from app.schemas.pedido import PedidoSimple


class UsuarioConPedidos(BaseModel):
    usuarioId: int
    nombre: str
    apellido: str
    email: EmailStr
    pedidos: list[PedidoSimple] = []

    class Config:
        from_attributes = True