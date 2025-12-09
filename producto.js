// --------------------------------------------------------
// DETALLE DE PRODUCTO
// --------------------------------------------------------

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

let currentProduct = null;

if (!productId) {
    const cont = document.getElementById("product-details");
    if (cont) {
        cont.innerHTML = "<p>Error: ID del producto no encontrado en la URL.</p>";
    }
}

// Carga el producto específico desde Firestore
async function cargarProducto() {
    if (!productId || !db) return;

    const cont = document.getElementById("product-details");
    if (cont) {
        cont.innerHTML = "<p>Cargando producto...</p>";
    }

    try {
        const docRef = db
            .collection("artefactos")
            .doc("euforia")
            .collection("pag")
            .doc("mmmm")
            .collection("productos")
            .doc(productId);

        const snap = await docRef.get();

        if (!snap.exists) {
            if (cont) {
                cont.innerHTML = "<p>El producto no existe o fue eliminado.</p>";
            }
            return;
        }

        const data = snap.data();

        currentProduct = {
            id: snap.id,
            name: data.name,
            price: data.price || 0,
            imageUrl: normalizarImageUrl(data.imageUrl), // misma función de app.js
            description: data.description || ""
        };

        renderProducto(currentProduct);
    } catch (error) {
        console.error("Error cargando producto:", error);
        if (cont) {
            cont.innerHTML = "<p>Error al cargar el producto. Revisa la consola.</p>";
        }
    }
}

function renderProducto(producto) {
    const cont = document.getElementById("product-details");
    if (!cont) return;

    const priceFormatted = `$${producto.price.toLocaleString("es-CO")}`;

    const html = `
        <div class="product-page-container">
            <div class="product-image-large-wrapper">
                <img src="${producto.imageUrl}" alt="${producto.name}" class="product-image-large-tag" />
            </div>

            <div class="product-info-panel">
                <h1>${producto.name}</h1>

                <p class="product-price-big">
                    ${priceFormatted}
                </p>

                <p class="product-description">
                    ${producto.description || "Sin descripción disponible."}
                </p>

                <label for="cantidad">Cantidad:</label>
                <input type="number" id="cantidad" value="1" min="1" />

                <button class="add-to-cart-btn" onclick="agregarProductoDetalle()">
                    AGREGAR AL CARRITO
                </button>

                <button class="cta-button" onclick="comprarAhora()">
                    COMPRAR AHORA
                </button>

                <br><br>
                <a href="productos.html" class="cta-button" style="background-color:#444; display:inline-block; text-align:center;">
                    ← Volver a la tienda
                </a>
            </div>
        </div>
    `;

    cont.innerHTML = html;
}

// Agregar al carrito desde la página de detalle
window.agregarProductoDetalle = function () {
    if (!currentProduct) return;

    let cantidad = parseInt(document.getElementById("cantidad").value, 10);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;

    const existente = carrito.find((item) => item.id === currentProduct.id);
    if (existente) {
        existente.cantidad += cantidad;
    } else {
        carrito.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            cantidad
        });
    }

    guardarCarrito();
    alert(`${currentProduct.name} agregado al carrito.`);
};

// Comprar ahora: agrega al carrito y abre WhatsApp con el pedido
window.comprarAhora = function () {
    if (!currentProduct) return;

    let cantidad = parseInt(document.getElementById("cantidad").value, 10);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;

    const existente = carrito.find((item) => item.id === currentProduct.id);
    if (existente) {
        existente.cantidad += cantidad;
    } else {
        carrito.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            cantidad
        });
    }

    guardarCarrito();

    if (typeof enviarPedidoWhatsApp === "function") {
        enviarPedidoWhatsApp();
    } else {
        alert("Producto agregado. Luego podrás enviar el pedido por WhatsApp desde el carrito.");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    cargarProducto();
});
