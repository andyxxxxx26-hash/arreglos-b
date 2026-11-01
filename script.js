// Actualiza este número cuando tengas el WhatsApp real del negocio, con código de país y sin el signo +.
const WHATSAPP_NUMBER = "51958169631";

const whatsappUrl = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

function setOrderLink(link, product) {
  link.href = whatsappUrl(`Hola, me interesa el arreglo «${product}». ¿Me comparten disponibilidad y detalles?`);
  link.target = "_blank";
  link.rel = "noopener";
}

document.querySelectorAll("[data-product]").forEach((link) => setOrderLink(link, link.dataset.product));

document.querySelectorAll(".whatsapp-link").forEach((link) => {
  link.href = whatsappUrl("Hola, quisiera consultar sobre sus arreglos florales.");
});

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
  price.textContent = `S/ ${Number(product.price || 0).toFixed(2)}`;
  const order = document.createElement("a");
  order.className = "order-link";
  order.textContent = "Pedir ";
  const arrow = document.createElement("span");
  arrow.textContent = "↗";
  order.append(arrow);
  setOrderLink(order, product.name);
  bottom.append(price, order);
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
