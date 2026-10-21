from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
import psycopg2
import os

from app.database import get_db
from app.models import Usuario, Pedido, Producto, LineaPedido
from app.schemas.usuario import UsuarioCreate, UsuarioOut
from app.schemas.producto import ProductoCreate, ProductoOut
from app.schemas.pedido import PedidoCreate, PedidoOut
from app.schemas.views import UsuarioConPedidos

app = FastAPI(title="API Usuarios, Productos y Pedidos")


@app.get("/")
def root():
    return {"mensaje": "API funcionando"}


# -------------------------
# USUARIOS
# -------------------------

class UsuarioAuth(BaseModel):
    firebaseUid: str
    email: str

@app.post("/usuarios-auth")
def crear_usuario(usuario: UsuarioAuth):
    conn = psycopg2.connect(
        host=os.getenv("PG_HOST"),
        database=os.getenv("PG_DATABASE"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        port=os.getenv("PG_PORT")
    )

    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO usuario (firebase_uid, email)
        VALUES (%s, %s)
        ON CONFLICT (firebase_uid) DO NOTHING
    """, (usuario.firebaseUid, usuario.email))

    conn.commit()
    cursor.close()
    conn.close()

    return {"ok": True}

@app.get("/usuarios", response_model=list[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).all()


@app.get("/usuarios/{usuarioId}", response_model=UsuarioOut)
def obtener_usuario(usuarioId: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuarioId == usuarioId).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@app.get("/usuarios/{usuarioId}/pedidos", response_model=UsuarioConPedidos)
def obtener_usuario_con_pedidos(usuarioId: int, db: Session = Depends(get_db)):
    usuario = (
        db.query(Usuario)
        .options(joinedload(Usuario.pedidos))
        .filter(Usuario.usuarioId == usuarioId)
        .first()
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@app.post("/usuarios", response_model=UsuarioOut)
def crear_usuario(datos: UsuarioCreate, db: Session = Depends(get_db)):
    try:
        usuario = Usuario(
            nombre=datos.nombre,
            apellido=datos.apellido,
            email=datos.email
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        return usuario
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/usuarios/{usuarioId}", response_model=UsuarioOut)
def actualizar_usuario(usuarioId: int, datos: UsuarioCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuarioId == usuarioId).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.nombre = datos.nombre
    usuario.apellido = datos.apellido
    usuario.email = datos.email

    db.commit()
    db.refresh(usuario)
    return usuario


@app.delete("/usuarios/{usuarioId}")
def eliminar_usuario(usuarioId: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuarioId == usuarioId).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.delete(usuario)
    db.commit()
    return {"mensaje": "Usuario eliminado"}


# -------------------------
# PRODUCTOS
# -------------------------

@app.get("/productos", response_model=list[ProductoOut])
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).all()


@app.get("/productos/{productoId}", response_model=ProductoOut)
def obtener_producto(productoId: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.productoId == productoId).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@app.post("/productos", response_model=ProductoOut)
def crear_producto(datos: ProductoCreate, db: Session = Depends(get_db)):
    try:
        producto = Producto(
            nombre=datos.nombre,
            precio=datos.precio
        )
        db.add(producto)
        db.commit()
        db.refresh(producto)
        return producto
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/productos/{productoId}", response_model=ProductoOut)
def actualizar_producto(productoId: int, datos: ProductoCreate, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.productoId == productoId).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.nombre = datos.nombre
    producto.precio = datos.precio

    db.commit()
    db.refresh(producto)
    return producto


@app.delete("/productos/{productoId}")
def eliminar_producto(productoId: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.productoId == productoId).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db.delete(producto)
    db.commit()
    return {"mensaje": "Producto eliminado"}


# -------------------------
# PEDIDOS
# -------------------------

@app.post("/pedidos", response_model=PedidoOut)
def crear_pedido(datos: PedidoCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuarioId == datos.usuarioId).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="El usuario asociado no existe")

    if not datos.lineas:
        raise HTTPException(status_code=400, detail="El pedido debe tener al menos una línea")

    pedido = Pedido(
        descripcion=datos.descripcion,
        usuarioId=datos.usuarioId,
        total=0
    )
    db.add(pedido)
    db.flush()

    total_pedido = 0

    for linea in datos.lineas:
        producto = db.query(Producto).filter(Producto.productoId == linea.productoId).first()
        if not producto:
            db.rollback()
            raise HTTPException(
                status_code=404,
                detail=f"El producto con id {linea.productoId} no existe"
            )

        subtotal = linea.cantidad * producto.precio
        total_pedido += subtotal

        nueva_linea = LineaPedido(
            pedidoId=pedido.pedidoId,
            productoId=linea.productoId,
            cantidad=linea.cantidad,
            precioUnitario=producto.precio,
            subtotal=subtotal
        )
        db.add(nueva_linea)

    pedido.total = total_pedido
    db.commit()

    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.usuario),
            joinedload(Pedido.lineasPedido).joinedload(LineaPedido.producto)
        )
        .filter(Pedido.pedidoId == pedido.pedidoId)
        .first()
    )

    return pedido

@app.get("/pedidos", response_model=list[PedidoOut])
def listar_pedidos(db: Session = Depends(get_db)):
    pedidos = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.usuario),
            joinedload(Pedido.lineasPedido).joinedload(LineaPedido.producto)
        )
        .all()
    )
    return pedidos

@app.get("/pedidos/{pedidoId}", response_model=PedidoOut)
def obtener_pedido(pedidoId: int, db: Session = Depends(get_db)):
    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.usuario),
            joinedload(Pedido.producto)
        )
        .filter(Pedido.pedidoId == pedidoId)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido


@app.post("/pedidos", response_model=PedidoOut)
def crear_pedido(datos: PedidoCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.usuarioId == datos.usuarioId).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="El usuario asociado no existe")

    producto = db.query(Producto).filter(Producto.productoId == datos.productoId).first()
    if not producto:
        raise HTTPException(status_code=404, detail="El producto asociado no existe")

    try:
        pedido = Pedido(
            descripcion=datos.descripcion,
            usuarioId=datos.usuarioId,
            productoId=datos.productoId
        )
        db.add(pedido)
        db.commit()
        db.refresh(pedido)

        pedido = (
            db.query(Pedido)
            .options(
                joinedload(Pedido.usuario),
                joinedload(Pedido.producto)
            )
            .filter(Pedido.pedidoId == pedido.pedidoId)
            .first()
        )
        return pedido

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/pedidos/{pedidoId}", response_model=PedidoOut)
def actualizar_pedido(pedidoId: int, datos: PedidoCreate, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.pedidoId == pedidoId).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    usuario = db.query(Usuario).filter(Usuario.usuarioId == datos.usuarioId).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="El usuario asociado no existe")

    producto = db.query(Producto).filter(Producto.productoId == datos.productoId).first()
    if not producto:
        raise HTTPException(status_code=404, detail="El producto asociado no existe")

    pedido.descripcion = datos.descripcion
    pedido.usuarioId = datos.usuarioId
    pedido.productoId = datos.productoId

    db.commit()
    db.refresh(pedido)

    pedido = (
        db.query(Pedido)
        .options(
            joinedload(Pedido.usuario),
            joinedload(Pedido.producto)
        )
        .filter(Pedido.pedidoId == pedido.pedidoId)
        .first()
    )
    return pedido


@app.delete("/pedidos/{pedidoId}")
def eliminar_pedido(pedidoId: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.pedidoId == pedidoId).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    db.delete(pedido)
    db.commit()
    return {"mensaje": "Pedido eliminado"}
