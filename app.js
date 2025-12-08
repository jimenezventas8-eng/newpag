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
const miNumeroWhatsApp = "573001234567"; // 👈 ¡REEMPLAZA ESTO CON TU NÚMERO REAL!

// Inicialización de Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore(); 
    console.log("🔥 Firebase inicializado correctamente.");
} else {
    console.error("⛔ ERROR: Firebase SDK no cargado. Revisa que esté incluido en tu HTML.");
}


// --------------------------------------------------------
// B. GESTIÓN DEL CARRITO PERSISTENTE
// --------------------------------------------------------

function cargarCarrito() {
    const carritoGuardado = localStorage.getItem('lulaCarrito');
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
    localStorage.setItem('lulaCarrito', JSON.stringify(carrito));
    actualizarInterfazCarrito();
}

function actualizarInterfazCarrito() {
    const count = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
    
    const cartList = document.getElementById('cart-items-list');
    if (cartList) {
        cartList.innerHTML = '';
        let total = 0;

        if (carrito.length === 0) {
            cartList.innerHTML = '<p style="text-align: center; color: #888;">El carrito está vacío.</p>';
        } else {
            carrito.forEach(item => {
                const subtotal = item.price * item.cantidad;
                total += subtotal;
                
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('cart-item');
                itemDiv.innerHTML = `
                    <p><strong>${item.name}</strong> (x${item.cantidad})</p>
                    <p>$${subtotal.toLocaleString('es-CO')}</p>
                    <button onclick="eliminarDelCarrito('${item.id}')">Eliminar</button>
                `;
                cartList.appendChild(itemDiv);
            });
        }
        document.getElementById('cart-total').textContent = `$${total.toLocaleString('es-CO')}`;
    }
}

window.agregarAlCarrito = function(productoId) {
    const producto = allProducts.find(p => p.id === productoId);
    
    if (producto) {
        const itemExistente = carrito.find(item => item.id === producto.id);
        
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
}

window.eliminarDelCarrito = function(productoId) {
    const itemIndex = carrito.findIndex(item => item.id === productoId);

    if (itemIndex > -1) {
        if (carrito[itemIndex].cantidad > 1) {
            carrito[itemIndex].cantidad -= 1; 
        } else {
            carrito.splice(itemIndex, 1); 
        }
        guardarCarrito();
    }
}


// --------------------------------------------------------
// C. CONEXIÓN A FIREBASE Y RENDERIZADO (RUTA CORREGIDA)
// --------------------------------------------------------

async function loadProducts(initialArea) {
    const productsGrid = document.getElementById('product-grid-dynamic');
    if (!productsGrid || !db) {
        if(productsGrid) productsGrid.innerHTML = '<p class="error-message">Sistema de Base de Datos no disponible.</p>';
        return; 
    }
    
    productsGrid.innerHTML = '<p id="loading-message">Cargando productos...</p>';

    try {
        const snapshot = await db
            .collection("artefactos").doc("euforia")
            .collection("pag").doc("mmmm")
            .collection("productos")
            .get();
        
        allProducts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                price: data.price || 0,
                imageUrl: data.imageUrl,
                area: data.area || 'Otros'
            };
        });

        console.log("Productos cargados:", allProducts);

        if (allProducts.length === 0) {
            productsGrid.innerHTML = '<p class="error-message">Error: 0 Productos encontrados. (Verifica Reglas y datos)</p>';
        } else {
            filterAndRenderProducts(initialArea);
        }

    } catch (error) {
        console.error("⛔ Error CRÍTICO en loadProducts:", error);
        productsGrid.innerHTML = '<p class="error-message">Error grave: Revisa la consola para ver si el problema es de permisos.</p>';
    }
}


function filterAndRenderProducts(area) {
    const productsGrid = document.getElementById('product-grid-dynamic');
    const titleElement = document.getElementById('section-title-area');
    
    if (!productsGrid) return;

    productsGrid.innerHTML = '';
    
    let filteredProducts = allProducts;
    let title = "TODOS LOS PRODUCTOS";

    if (area && area !== "Todos") {
        filteredProducts = allProducts.filter(p => p.area === area);
        title = area.toUpperCase();
    }

    titleElement.textContent = title;

    // Actualiza la clase activa en el menú
    document.querySelectorAll('.categories-nav a').forEach(a => a.classList.remove('active-category'));
    const activeLink = document.querySelector(`.categories-nav a[data-area="${area}"]`);
    if (activeLink) {
        activeLink.classList.add('active-category');
    }

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p class="info-message">No hay productos en esta categoría.</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        
        const priceFormatted = `$${product.price.toLocaleString('es-CO')}`;
        
        productCard.innerHTML = `
            <div class="product-image" style="background-image: url('${product.imageUrl}');"></div>
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
// D. LÓGICA DE WHATSAPP Y EVENTOS
// --------------------------------------------------------

function enviarPedidoWhatsApp() {
    if (carrito.length === 0) {
        alert("El carrito está vacío. ¡Agrega productos!");
        return;
    }

    let mensaje = "¡Hola Lula! Quisiera hacer un pedido de los siguientes productos:\n\n";
    let total = 0;

    carrito.forEach(item => {
        const subtotal = item.price * item.cantidad;
        total += subtotal;
        mensaje += `- ${item.name} (x${item.cantidad}) - Subtotal: $${subtotal.toLocaleString('es-CO')}\n`;
    });

    mensaje += "\n----------------------------------\n";
    mensaje += `*TOTAL ESTIMADO: $${total.toLocaleString('es-CO')}*\n`;
    mensaje += "----------------------------------\n";
    
    const mensajeCodificado = encodeURIComponent(mensaje);

    const urlWhatsApp = `https://wa.me/${miNumeroWhatsApp}?text=${mensajeCodificado}`;

    window.open(urlWhatsApp, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    cargarCarrito();

    if (document.getElementById('product-grid-dynamic')) {
        const urlParams = new URLSearchParams(window.location.search);
        // Usamos 'Skincare' como valor por defecto, ya que tienes un producto en esa categoría en la nueva BD
        const initialArea = urlParams.get('area') || 'Skincare'; 
        
        loadProducts(initialArea);

        // Evento para los enlaces de categoría en productos.html
        document.querySelectorAll('.categories-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                const area = e.target.getAttribute('data-area');
                
                if (e.target.getAttribute('href') === 'index.html') {
                    return; 
                }

                e.preventDefault();
                filterAndRenderProducts(area);
            });
        });

        // Eventos del Sidebar del Carrito
        document.getElementById('cart-icon').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('cart-sidebar').classList.add('open');
        });

        document.getElementById('close-cart-btn').addEventListener('click', () => {
            document.getElementById('cart-sidebar').classList.remove('open');
        });
        
        document.getElementById('whatsapp-order-btn').addEventListener('click', enviarPedidoWhatsApp);
    }
});
