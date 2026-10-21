from pydantic import BaseModel


class ProductoCreate(BaseModel):
    nombre: str
    precio: float


class ProductoOut(BaseModel):
    productoId: int
    nombre: str
    precio: float

    class Config:
        from_attributes = True


class ProductoSimple(BaseModel):
    productoId: int
    nombre: str
    precio: float

    class Config:
        from_attributes = True