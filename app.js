// --------------------------------------------------------
// A. CONFIGURACIÓN E INICIALIZACIÓN
// --------------------------------------------------------

// Tu configuración de Firebase - ¡DEBE SER EXACTA!
const firebaseConfig = {
    apiKey: "AIzaSyD2nCryUttIjg3HaY9-r44rIZsDP1mLB5w",
    authDomain: "euforia-inv.firebaseapp.com",
    projectId: "euforia-inv",
    storageBucket: "euforia-inv.firebasestorage.app",
    messagingSenderId: "687723551803",
    appId: "1:687723551803:web:a2a7b50fd78083883e501e",
    measurementId: "G-CSMDCL57X6"
};

// Variables globales
let db;
let allProducts = [];
let carrito = [];
const miNumeroWhatsApp = "573222393223"; // 👈 CAMBIA POR TU NÚMERO REAL (con indicativo)

// Inicialización de Firebase
if (typeof firebase !== "undefined") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("🔥 Firebase inicializado correctamente.");
} else {
    console.error("⛔ ERROR: Firebase SDK no cargado. Revisa que esté incluido en tu HTML.");
}

// --------------------------------------------------------
// A.1 NORMALIZACIÓN DE URLS DE IMAGEN (Drive, etc.)
// --------------------------------------------------------
/**
 * Convierte URLs de Google Drive tipo:
 *  https://drive.google.com/file/d/ID/view?usp=...
 * a:
 *  https://drive.google.com/uc?export=view&id=ID
 */
function normalizarImageUrl(rawUrl) {
    if (!rawUrl) return "";

    if (rawUrl.includes("drive.google.com/file/d/")) {
        const match = rawUrl.match(/\/file\/d\/([^/]+)\//);
        if (match && match[1]) {
            const fileId = match[1];
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }

    return rawUrl;
}

// --------------------------------------------------------
// B. GESTIÓN DEL CARRITO PERSISTENTE
// --------------------------------------------------------

function cargarCarrito() {
    const carritoGuardado = localStorage.getItem("lulaCarrito");
    if (carritoGuardado) {
        try {
            carrito = JSON.parse(carritoGuardado);
        } catch (e) {
            console.error("Error al cargar el carrito:", e);
            carrito = [];
        }
    }
    actualizarInterfazCarrito();
}

function guardarCarrito() {
    localStorage.setItem("lulaCarrito", JSON.stringify(carrito));
    actualizarInterfazCarrito();
}

function actualizarInterfazCarrito() {
    const count = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const cartCountElement = document.getElementById("cart-count");
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }

    const cartList = document.getElementById("cart-items-list");
    if (cartList) {
        cartList.innerHTML = "";
        let total = 0;

        if (carrito.length === 0) {
            cartList.innerHTML = '<p style="text-align: center; color: #888;">El carrito está vacío.</p>';
        } else {
            carrito.forEach((item) => {
                const subtotal = item.price * item.cantidad;
                total += subtotal;

                const itemDiv = document.createElement("div");
                itemDiv.classList.add("cart-item");
                itemDiv.innerHTML = `
                    <p><strong>${item.name}</strong> (x${item.cantidad})</p>
                    <p>$${subtotal.toLocaleString("es-CO")}</p>
                    <button onclick="eliminarDelCarrito('${item.id}')">Eliminar</button>
                `;
                cartList.appendChild(itemDiv);
            });
        }
        const totalEl = document.getElementById("cart-total");
        if (totalEl) {
            totalEl.textContent = `$${total.toLocaleString("es-CO")}`;
        }
    }
}

// Agregar desde las cards (productos.html)
window.agregarAlCarrito = function (productoId) {
    const producto = allProducts.find((p) => p.id === productoId);

    if (producto) {
        const itemExistente = carrito.find((item) => item.id === producto.id);

        if (itemExistente) {
            itemExistente.cantidad += 1;
        } else {
            carrito.push({
                id: producto.id,
                name: producto.name,
                price: producto.price,
                cantidad: 1
            });
        }

        guardarCarrito();
        alert(`${producto.name} agregado al carrito.`);
    }
};

window.eliminarDelCarrito = function (productoId) {
    const itemIndex = carrito.findIndex((item) => item.id === productoId);

    if (itemIndex > -1) {
        if (carrito[itemIndex].cantidad > 1) {
            carrito[itemIndex].cantidad -= 1;
        } else {
            carrito.splice(itemIndex, 1);
        }
        guardarCarrito();
    }
};

// --------------------------------------------------------
// C. CONEXIÓN A FIREBASE Y RENDERIZADO DE LISTADO
// --------------------------------------------------------

async function loadProducts(initialArea) {
    const productsGrid = document.getElementById("product-grid-dynamic");
    if (!productsGrid || !db) {
        if (productsGrid) {
            productsGrid.innerHTML =
                '<p class="error-message">Sistema de Base de Datos no disponible.</p>';
        }
        return;
    }

    productsGrid.innerHTML = '<p id="loading-message">Cargando productos...</p>';

    try {
        // Ruta: artefactos > euforia > pag > mmmm > productos
        const snapshot = await db
            .collection("artefactos")
            .doc("euforia")
            .collection("pag")
            .doc("mmmm")
            .collection("productos")
            .get();

        allProducts = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                price: data.price || 0,
                imageUrl: normalizarImageUrl(data.imageUrl),
                area: data.area || "Otros",
                description: data.description || "",
                // si no existe "published", se asume true
                published: typeof data.published === "boolean" ? data.published : true
            };
        });

        console.log(
            "✅ TOTAL Productos cargados (sin filtrar):",
            allProducts.length,
            "documentos."
        );
        console.table(
            allProducts.map(p => ({
                id: p.id,
                name: p.name,
                area: p.area,
                published: p.published
            }))
        );

        if (allProducts.length === 0) {
            productsGrid.innerHTML =
                '<p class="error-message">Error: 0 Productos encontrados. (Verifica reglas y datos)</p>';
        } else {
            filterAndRenderProducts(initialArea);
        }
    } catch (error) {
        console.error("⛔ Error en loadProducts:", error);
        productsGrid.innerHTML =
            '<p class="error-message">Error grave: revisa la consola (permisos, reglas, etc.).</p>';
    }
}

// pequeña ayuda para normalizar áreas
function normalizarArea(valor) {
    return (valor || "").toString().trim().toLowerCase();
}

function filterAndRenderProducts(area) {
    const productsGrid = document.getElementById("product-grid-dynamic");
    const titleElement = document.getElementById("section-title-area");

    if (!productsGrid) return;

    productsGrid.innerHTML = "";

    // siempre filtramos por published
    let filteredProducts = allProducts.filter((p) => p.published);

    let title = "TODOS LOS PRODUCTOS";

    const targetArea = normalizarArea(area);

    if (area && area !== "Todos") {
        filteredProducts = filteredProducts.filter(
            (p) => normalizarArea(p.area) === targetArea
        );
        title = area.toUpperCase();
    }

    console.log(
        `🎯 Filtrando por área="${area}" (normalizada="${targetArea}"). Coincidencias:`,
        filteredProducts.length
    );

    if (titleElement) {
        titleElement.textContent = title;
    }

    // Actualiza la clase activa en el menú
    const catLinks = document.querySelectorAll(".categories-nav a");
    catLinks.forEach((a) => a.classList.remove("active-category"));
    const activeLink = document.querySelector(`.categories-nav a[data-area="${area}"]`);
    if (activeLink) {
        activeLink.classList.add("active-category");
    }

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML =
            '<p class="info-message">No hay productos en esta categoría.</p>';
        return;
    }

    filteredProducts.forEach((product) => {
        const productCard = document.createElement("div");
        productCard.classList.add("product-card");

        const priceFormatted = `$${product.price.toLocaleString("es-CO")}`;

        productCard.innerHTML = `
            <a href="producto.html?id=${product.id}" class="product-link">
                <div class="product-image-wrapper">
                    <img src="${product.imageUrl}" alt="${product.name}" class="product-image-tag" />
                </div>
            </a>
            <div class="product-info">
                <p class="product-name">${product.name}</p>
                <p class="product-price">${priceFormatted}</p>
                <button class="add-to-cart-btn" onclick="agregarAlCarrito('${product.id}')">
                    + Añadir al Carrito
                </button>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

// --------------------------------------------------------
// D. WHATSAPP Y EVENTOS GLOBALES
// --------------------------------------------------------

function enviarPedidoWhatsApp() {
    if (carrito.length === 0) {
        alert("El carrito está vacío. ¡Agrega productos!");
        return;
    }

    let mensaje = "¡Hola Euforia! Quisiera hacer un pedido de los siguientes productos:\n\n";
    let total = 0;

    carrito.forEach((item) => {
        const subtotal = item.price * item.cantidad;
        total += subtotal;
        mensaje += `- ${item.name} (x${item.cantidad}) - Subtotal: $${subtotal.toLocaleString(
            "es-CO"
        )}\n`;
    });

    mensaje += "\n----------------------------------\n";
    mensaje += `*TOTAL ESTIMADO: $${total.toLocaleString("es-CO")}*\n`;
    mensaje += "----------------------------------\n";

    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${miNumeroWhatsApp}?text=${mensajeCodificado}`;

    window.open(urlWhatsApp, "_blank");
}

document.addEventListener("DOMContentLoaded", () => {
    // Siempre cargamos el carrito (index, productos, producto)
    cargarCarrito();

    // Solo lógica de listado en productos.html
    if (document.getElementById("product-grid-dynamic")) {
        const urlParams = new URLSearchParams(window.location.search);
        // 👉 ahora, por defecto, mostramos "Rostro"
        const initialArea = urlParams.get("area") || "Rostro";

        loadProducts(initialArea);

        // Filtro de categorías
        document.querySelectorAll(".categories-nav a").forEach((link) => {
            link.addEventListener("click", (e) => {
                const area = e.target.getAttribute("data-area");

                // si es el link de Inicio, dejamos que navegue
                if (e.target.getAttribute("href") === "index.html") {
                    return;
                }

                if (area) {
                    e.preventDefault();
                    filterAndRenderProducts(area);
                }
            });
        });

        // Sidebar carrito
        const cartIcon = document.getElementById("cart-icon");
        const cartSidebar = document.getElementById("cart-sidebar");
        const closeCartBtn = document.getElementById("close-cart-btn");
        const whatsappBtn = document.getElementById("whatsapp-order-btn");

        if (cartIcon && cartSidebar && closeCartBtn && whatsappBtn) {
            cartIcon.addEventListener("click", (e) => {
                e.preventDefault();
                cartSidebar.classList.add("open");
            });

            closeCartBtn.addEventListener("click", () => {
                cartSidebar.classList.remove("open");
            });

            whatsappBtn.addEventListener("click", enviarPedidoWhatsApp);
        }
    }
});
