// Google Sheets CSV URL
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3K2ex1oeC0KDfjB7OCwOytbSb4Q5tqH2I8edje8Xm8Qf_P3NUhIXQkGPUJ6Acl7RXfzUCiTaUhNG5/pub?output=csv';

// State
let products = [];
let cart = JSON.parse(localStorage.getItem('evim_ceyiz_cart')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    injectCartModal();
    updateCartBadge();
    
    products = await fetchProducts();
    
    // Render based on current page
    const path = window.location.pathname;
    if (path.includes('urun.html')) {
        renderProducts(products, 'all-products');
    } else if (path.includes('kampanyalar.html')) {
        const campaignProducts = products.filter(p => p.kampanya === true);
        renderProducts(campaignProducts, 'campaign-products');
    } else {
        // Index page - show a mix or first 8 products
        renderProducts(products.slice(0, 8), 'featured-products');
    }
});

// Fetch and Parse CSV
async function fetchProducts() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error("Ürünler yüklenirken hata oluştu:", error);
        return [];
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];
    
    // Assuming headers: id, urunAdi, fiyat, kampanya, resimUrl, stok
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    for(let i = 1; i < lines.length; i++) {
        if(!lines[i].trim()) continue;
        
        // Regex to handle commas inside quotes
        let currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let obj = {};
        
        for(let j = 0; j < headers.length; j++) {
            let val = currentline[j] ? currentline[j].trim().replace(/(^"|"$)/g, '') : '';
            obj[headers[j]] = val;
        }
        
        // Format data
        obj.kampanya = obj.kampanya && obj.kampanya.toUpperCase() === 'TRUE';
        obj.stok = parseInt(obj.stok) || 0;
        obj.fiyat = parseFloat(obj.fiyat) || 0;
        
        result.push(obj);
    }
    return result;
}

// Render Products
function renderProducts(productsToRender, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (productsToRender.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Şu an gösterilecek ürün bulunmamaktadır.</p>';
        return;
    }

    productsToRender.forEach(product => {
        // Handle multiple images separated by comma
        const images = product.resimUrl ? product.resimUrl.split(',') : ['https://via.placeholder.com/250'];
        const mainImage = images[0].trim();
        
        const isOutOfStock = product.stok <= 0;
        const btnText = isOutOfStock ? 'Tükendi' : 'Sepete Ekle';
        const campaignBadge = product.kampanya ? '<div class="campaign-badge">Kampanya</div>' : '';
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            ${campaignBadge}
            <img src="${mainImage}" alt="${product.urunAdi}" class="product-img" onerror="this.src='https://via.placeholder.com/250'">
            <div class="product-info">
                <h3 class="product-title">${product.urunAdi}</h3>
                <div class="product-price">${product.fiyat.toFixed(2)} TL</div>
                <button class="btn-add-cart" onclick="addToCart('${product.id}')" ${isOutOfStock ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Cart Logic
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stok <= 0) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        // Optional: Check stock limit here if needed
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartBadge();
    openCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartBadge();
    renderCartItems();
}

function saveCart() {
    localStorage.setItem('evim_ceyiz_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// Cart UI
function injectCartModal() {
    const modalHTML = `
    <div class="cart-overlay" id="cart-overlay" onclick="if(event.target === this) closeCart()">
        <div id="cart-modal" class="cart-modal">
            <div class="cart-header">
                <h2>Sepetim</h2>
                <span class="close-cart" onclick="closeCart()">&times;</span>
            </div>
            <div class="cart-body">
                <div class="cart-items-section">
                    <div class="cart-items" id="cart-items-container">
                        <!-- Items will be injected here -->
                    </div>
                    <div class="cart-total" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                        <span>Ara Toplam:</span>
                        <span id="cart-total-price">0.00 TL</span>
                    </div>
                    <button onclick="closeCart()" class="continue-btn" style="margin-top: 1rem;">
                        🛍️ Alışverişe Devam Et
                    </button>
                </div>
                <div class="cart-checkout-section">
                    <div class="checkout-form">
                        <h3>Teslimat Bilgileri</h3>
                        <input type="text" id="ad" placeholder="Adınız" required>
                        <input type="text" id="soyad" placeholder="Soyadınız" required>
                        <input type="tel" id="tel" placeholder="Telefon Numaranız" required>
                        <textarea id="adres" placeholder="Açık Adresiniz (Mahalle, Sokak, No, İlçe/İl)" required></textarea>
                        
                        <h3 style="margin-top: 1rem;">Ödeme Yöntemi</h3>
                        <div class="payment-options">
                            <label class="payment-option" id="label-iban">
                                <input type="radio" name="odeme" value="iban" onchange="selectPayment('iban')">
                                <span class="payment-title">IBAN ile Ödeme</span>
                                <span class="payment-desc">Sipariş sonrası IBAN bilgilerimiz WhatsApp üzerinden iletilecektir. Ek ücret yoktur.</span>
                            </label>
                            <label class="payment-option" id="label-kapida">
                                <input type="radio" name="odeme" value="kapida" onchange="selectPayment('kapida')">
                                <span class="payment-title">Kapıda Ödeme</span>
                                <span class="payment-desc">Teslimat sırasında nakit veya kart ile ödeme yapabilirsiniz. <strong>+100 TL</strong> hizmet bedeli yansıtılır.</span>
                            </label>
                        </div>

                        <div class="cart-total" style="margin-top: 15px; border-top: 2px solid var(--border); padding-top: 15px; font-size: 1.4rem;">
                            <span>Genel Toplam:</span>
                            <span id="cart-final-price" style="color: var(--primary);">0.00 TL</span>
                        </div>
                        <button onclick="sendWhatsAppOrder()" class="wa-btn">
                            💬 WhatsApp ile Sipariş Ver
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function selectPayment(method) {
    document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));
    document.getElementById('label-' + method).classList.add('selected');
    updateTotal();
}

function openCart() {
    document.getElementById('cart-overlay').classList.add('open');
    renderCartItems();
}

function closeCart() {
    document.getElementById('cart-overlay').classList.remove('open');
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">Sepetiniz boş.</p>';
        updateTotal();
        return;
    }

    cart.forEach(item => {
        const images = item.resimUrl ? item.resimUrl.split(',') : ['https://via.placeholder.com/60'];
        const mainImage = images[0].trim();
        
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${mainImage}" alt="${item.urunAdi}" onerror="this.src='https://via.placeholder.com/60'">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.urunAdi} (x${item.quantity})</div>
                <div class="cart-item-price">${(item.fiyat * item.quantity).toFixed(2)} TL</div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Kaldır</button>
            </div>
        `;
        container.appendChild(itemEl);
    });

    updateTotal();
}

function updateTotal() {
    const subtotal = cart.reduce((sum, item) => sum + (item.fiyat * item.quantity), 0);
    const odemeRadio = document.querySelector('input[name="odeme"]:checked');
    const odemeYontemi = odemeRadio ? odemeRadio.value : null;
    
    let finalTotal = subtotal;
    if (odemeYontemi === 'kapida' && subtotal > 0) {
        finalTotal += 100;
    }

    const subtotalEl = document.getElementById('cart-total-price');
    const finalTotalEl = document.getElementById('cart-final-price');
    
    if(subtotalEl) subtotalEl.textContent = subtotal.toFixed(2) + ' TL';
    if(finalTotalEl) finalTotalEl.textContent = finalTotal.toFixed(2) + ' TL';
}

// WhatsApp Checkout
function sendWhatsAppOrder() {
    const ad = document.getElementById('ad').value.trim();
    const soyad = document.getElementById('soyad').value.trim();
    const tel = document.getElementById('tel').value.trim();
    const adres = document.getElementById('adres').value.trim();
    const odemeRadio = document.querySelector('input[name="odeme"]:checked');

    if (!ad || !soyad || !tel || !adres) {
        alert('Lütfen sipariş verebilmek için tüm bilgileri (Ad, Soyad, Telefon, Adres) doldurunuz.');
        return;
    }

    if (!odemeRadio) {
        alert('Lütfen bir ödeme yöntemi seçiniz.');
        return;
    }

    const odeme = odemeRadio.value;

    if (cart.length === 0) {
        alert('Sepetiniz boş. Lütfen önce ürün ekleyin.');
        return;
    }

    let subtotal = 0;
    let itemsText = '';
    
    cart.forEach(item => {
        let itemTotal = item.fiyat * item.quantity;
        subtotal += itemTotal;
        itemsText += `▪ ${item.urunAdi} (Adet: ${item.quantity}) - ${itemTotal.toFixed(2)} TL\n`;
    });

    let finalTotal = subtotal;
    let odemeText = odeme === 'kapida' ? 'Kapıda Ödeme (+100 TL Hizmet Bedeli)' : 'IBAN ile Ödeme (Havale/EFT)';
    
    if (odeme === 'kapida') {
        finalTotal += 100;
    }

    let message = `Merhaba Evim Çeyiz,\nWeb siteniz üzerinden yeni bir sipariş oluşturmak istiyorum. Sipariş detaylarım ve teslimat bilgilerim aşağıdadır:\n\n`;
    
    message += `🛍️ *SİPARİŞ DETAYLARI*\n`;
    message += `-----------------------------------\n`;
    message += `${itemsText}\n`;
    
    message += `💳 *ÖDEME BİLGİLERİ*\n`;
    message += `-----------------------------------\n`;
    message += `Ara Toplam: ${subtotal.toFixed(2)} TL\n`;
    message += `Ödeme Yöntemi: ${odemeText}\n`;
    message += `*Genel Toplam: ${finalTotal.toFixed(2)} TL*\n\n`;
    
    message += `👤 *TESLİMAT BİLGİLERİ*\n`;
    message += `-----------------------------------\n`;
    message += `Ad Soyad: ${ad} ${soyad}\n`;
    message += `Telefon: ${tel}\n`;
    message += `Adres: ${adres}\n\n`;
    
    message += `Siparişimin işleme alınmasını rica ederim. İyi çalışmalar.`;

    const waNumber = '905050377276';
    // api.whatsapp.com is generally more reliable for cross-device compatibility
    const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(message)}`;
    
    // Try to open in a new tab. If blocked by popup blocker, fallback to current window.
    const newWindow = window.open(waUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        window.location.href = waUrl;
    }
}
