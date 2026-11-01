document.addEventListener('DOMContentLoaded', () => {
  const WHATSAPP_NUMBER = "51958169631";

  // Estado del Carrito y persistencia con localStorage
  let cart = JSON.parse(localStorage.getItem('bella_cart')) || [];

  // Elementos DOM del Carrito
  const cartTrigger = document.getElementById('cart-trigger');
  const cartClose = document.getElementById('cart-close');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartCount = document.getElementById('cart-count');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartTotalPrice = document.getElementById('cart-total-price');
  const sendWhatsappBtn = document.getElementById('send-whatsapp-btn');

  const toggleCart = (open) => {
    cartDrawer.classList.toggle('active', open);
    cartOverlay.classList.toggle('active', open);
    cartDrawer.setAttribute('aria-hidden', !open);
  };

  cartTrigger?.addEventListener('click', () => toggleCart(true));
  cartClose?.addEventListener('click', () => toggleCart(false));
  cartOverlay?.addEventListener('click', () => toggleCart(false));

  const updateCart = () => {
    localStorage.setItem('bella_cart', JSON.stringify(cart));
    renderCart();
  };

  const renderCart = () => {
    const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalQty;

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p class="cart-empty-text">Tu carrito está vacío ✿</p>';
      if (cartTotalPrice) cartTotalPrice.textContent = 'S/ 0.00';
      return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
      const itemSubtotal = item.price * item.quantity;
      total += itemSubtotal;

      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <div>
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">S/ ${item.price.toFixed(2)} c/u</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn minus-btn" data-index="${index}">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn plus-btn" data-index="${index}">+</button>
          <button class="delete-item-btn" data-index="${index}" title="Eliminar">&times;</button>
        </div>
      `;
      cartItemsContainer.appendChild(itemEl);
    });

    if (cartTotalPrice) cartTotalPrice.textContent = `S/ ${total.toFixed(2)}`;
  };

  const addToCart = (name, price) => {
    const existingIndex = cart.findIndex(item => item.name === name);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ name, price: parseFloat(price), quantity: 1 });
    }
    updateCart();
    toggleCart(true);
  };

  // Delegación de eventos para capturar cualquier botón "Agregar +"
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      const name = addBtn.dataset.name;
      const price = addBtn.dataset.price;
      if (name && price) {
        addToCart(name, price);
      }
    }
  });

  // Controles del drawer (+, -, eliminar)
  cartItemsContainer?.addEventListener('click', (e) => {
    const index = e.target.getAttribute('data-index');
    if (index === null) return;

    if (e.target.classList.contains('plus-btn')) {
      cart[index].quantity += 1;
    } else if (e.target.classList.contains('minus-btn')) {
      if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
      } else {
        cart.splice(index, 1);
      }
    } else if (e.target.classList.contains('delete-item-btn')) {
      cart.splice(index, 1);
    }
    updateCart();
  });

  // Envío del pedido completo a WhatsApp
  sendWhatsappBtn?.addEventListener('click', () => {
    if (cart.length === 0) {
      alert("Tu carrito está vacío. Agrega algún arreglo para realizar tu pedido.");
      return;
    }

    let text = "¡Hola Arreglos Bella! ✿ Deseo realizar el siguiente pedido:\n\n";
    let total = 0;

    cart.forEach(item => {
      const subtotal = item.price * item.quantity;
      total += subtotal;
      text += `• *${item.name}* x${item.quantity} - S/ ${subtotal.toFixed(2)}\n`;
    });

    text += `\n*Total estimado:* S/ ${total.toFixed(2)}\n\n¿Tienen disponibilidad para coordinar la entrega?`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`, '_blank');
  });

  const whatsappUrl = (message) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  document.querySelectorAll(".whatsapp-link").forEach((link) => {
    link.href = whatsappUrl("Hola, quisiera consultar sobre sus arreglos florales.");
  });

  // Renderizado dinámico de productos para Supabase
  function makeProductCard(product) {
    const article = document.createElement("article");
    article.className = "product-card";
    
    const imageWrap = document.createElement("div");
    imageWrap.className = "product-image";
    
    const image = document.createElement("img");
    image.src = /^https:\/\//i.test(product.image_url || "") ? product.image_url : "";
    image.alt = product.name || "Arreglo floral";
    image.loading = "lazy";
    imageWrap.append(image);
    
    if (product.badge) {
      const badge = document.createElement("span");
      badge.className = "product-tag";
      badge.textContent = product.badge;
      imageWrap.append(badge);
    }
    
    const info = document.createElement("div");
    info.className = "product-info";
    
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = product.name;
    const description = document.createElement("p");
    description.textContent = product.description || "Consulta los detalles por WhatsApp.";
    copy.append(title, description);
    
    const bottom = document.createElement("div");
    bottom.className = "product-bottom";
    
    const price = document.createElement("strong");
    const numericPrice = Number(product.price || 0);
    price.textContent = `S/ ${numericPrice.toFixed(2)}`;
    
    const orderBtn = document.createElement("button");
    orderBtn.className = "add-to-cart-btn";
    orderBtn.innerHTML = `Agregar <span style="color: var(--rose); margin-left: 2px;">↗</span>`;
    orderBtn.dataset.name = product.name;
    orderBtn.dataset.price = numericPrice;
    
    bottom.append(price, orderBtn);
    info.append(copy, bottom);
    article.append(imageWrap, info);
    
    return article;
  }

  async function loadPublicProducts() {
    const config = window.SUPABASE_CONFIG;
    if (!window.supabase || !config?.url || !config?.anonKey || config.url.includes("YOUR_") || config.anonKey.includes("YOUR_")) return;
    
    const client = window.supabase.createClient(config.url, config.anonKey);
    const { data, error } = await client.from("products").select("id,name,description,price,image_url,badge,sort_order").eq("active", true).order("sort_order");
    
    if (error || !data?.length) {
      if (error) console.error("No se pudo cargar el catálogo de Supabase:", error.message);
      return;
    }
    
    const grid = document.querySelector(".product-grid");
    if (!grid) return;
    grid.replaceChildren(...data.map(makeProductCard));
  }

  loadPublicProducts();

  // Menú móvil
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
    nav?.classList.toggle("is-open", !isOpen);
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle?.setAttribute("aria-expanded", "false");
      menuToggle?.setAttribute("aria-label", "Abrir menú");
      nav.classList.remove("is-open");
    });
  });

  // Render inicial del carrito guardado en localStorage
  renderCart();

  // Registrar visita diaria única por sesión de usuario
  async function trackPageVisitor() {
    const config = window.SUPABASE_CONFIG;
    if (!window.supabase || !config?.url || !config?.anonKey || config.url.includes("YOUR_")) return;

    const hasVisitedToday = sessionStorage.getItem('bella_visited_today');
    if (hasVisitedToday) return;

    const client = window.supabase.createClient(config.url, config.anonKey);
    
    const { error } = await client.from('page_views').insert([{}]);
    
    if (!error) {
      sessionStorage.setItem('bella_visited_today', 'true');
    }
  }

  trackPageVisitor();
});