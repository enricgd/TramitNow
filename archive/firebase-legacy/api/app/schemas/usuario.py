from pydantic import BaseModel, EmailStr


class UsuarioCreate(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr


class UsuarioOut(BaseModel):
    usuarioId: int
    nombre: str
    apellido: str
    email: EmailStr

    class Config:
        from_attributes = True


class UsuarioSimple(BaseModel):
    usuarioId: int
    nombre: str
    apellido: str

    class Config:
        from_attributes = True