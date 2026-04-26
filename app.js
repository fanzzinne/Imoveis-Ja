const CONFIG = {
    // 1. CONFIGURAÇÕES VISUAIS (Ajuste aqui diretamente no código)
    SITE_NAME: 'Imóveis Já',
    PRIMARY_COLOR: '#f59e0b',
    WHATSAPP: '5521988137667',
    LOGO_URL: 'logo.png',
    SLOGAN: 'Sua nova história começa aqui',

    // 2. INTEGRAÇÃO (Cole sua URL do Apps Script aqui)
    API_URL: 'https://script.google.com/macros/s/AKfycbz2fap1lcKlO8deqlc4JzTQ0hm1G2tsvWqRZcYB-IdSyODtH0dDZzBw9vmW1i9e-uu5Eg/exec'
};

const app = {
    properties: [],
    favorites: JSON.parse(localStorage.getItem('imoveis_favs') || '[]'),
    carouselIndex: 0,
    filters: { type: 'BUY', category: 'Casa', query: '' },
    deferredPrompt: null,

    init: async function() {
        this.registerServiceWorker();
        this.setupInstallTrigger();
        this.applyTheme();
        await this.fetchProperties();
        this.showHome();
        this.startCarousel();
    },

    registerServiceWorker: function() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(reg => {
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showToast('Atualizando para nova versão...');
                            setTimeout(() => window.location.reload(), 2000);
                        }
                    };
                };
            });
        }
    },

    setupInstallTrigger: function() {
        console.log('PWA: Monitorando gatilho de instalação...');

        // Verifica se já está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('PWA: Já está instalado.');
            return;
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('PWA: Evento capturado!');

            // Exibe o banner após interação ou tempo
            setTimeout(() => {
                if (this.deferredPrompt) this.showInstallBanner();
            }, 2000);
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            const banner = document.getElementById('install-banner');
            if (banner) banner.remove();
        });
    },

    showInstallBanner: function() {
        if (document.getElementById('install-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'install-banner';
        banner.style = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: var(--primary); color: black; padding: 1rem 2rem;
            border-radius: 50px; font-weight: 800; z-index: 10000;
            display: flex; align-items: center; gap: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            cursor: pointer; animation: fadeIn 0.5s ease-out;
        `;
        banner.innerHTML = `<i class="fas fa-download"></i> INSTALAR APP`;
        banner.onclick = () => {
            banner.remove();
            this.deferredPrompt.prompt();
            this.deferredPrompt = null;
        };
        document.body.appendChild(banner);
    },

    applyTheme: function() {
        document.documentElement.style.setProperty('--primary', CONFIG.PRIMARY_COLOR);
    },

    fetchProperties: async function() {
        const grid = document.getElementById('property-grid');
        if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;"><div class="loader"></div><p>Conectando à planilha...</p></div>';

        try {
            const response = await fetch(`${CONFIG.API_URL}?action=informacoes`);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const data = await response.json();
            if (Array.isArray(data)) {
                this.properties = data;
            } else {
                throw new Error('O Google Script não retornou uma lista válida.');
            }
        } catch (error) {
            console.error('Erro na integration:', error);
            this.properties = this.getMockData();
        }
    },

    getMockData: function() {
        return [
            {
                id: 1, title: 'Exemplo: Mansão Poniten', propertyType: 'Casa', type: 'BUY',
                featured: true, price: 4500000, iptu: 1200, financing: 'Sim',
                area: 450, beds: 5, suites: 4, baths: 6, kitchens: 1, floors: 2,
                leisure: 'Piscina, Sauna', address: 'Barra da Tijuca, RJ',
                docs: 'RGI Ok', images: ['https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg']
            }
        ];
    },

    startCarousel: function() {
        setInterval(() => {
            const slides = document.querySelectorAll('.carousel-slide');
            if (slides.length <= 1) return;
            slides[this.carouselIndex].classList.remove('active');
            this.carouselIndex = (this.carouselIndex + 1) % slides.length;
            slides[this.carouselIndex].classList.add('active');
        }, 5000);
    },

    toggleFavorite: function(e, id) {
        if(e) e.stopPropagation();
        const index = this.favorites.indexOf(id);
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.showToast('Removido dos favoritos');
        } else {
            this.favorites.push(id);
            this.showToast('Adicionado aos favoritos');
        }
        localStorage.setItem('imoveis_favs', JSON.stringify(this.favorites));

        // Atualiza visualmente o botão se estiver no card ou detalhe
        const btns = document.querySelectorAll(`.fav-btn-${id}`);
        btns.forEach(btn => btn.classList.toggle('active'));
    },

    showHome: function() {
        const content = document.getElementById('app-content');
        const featured = this.properties.filter(p => p.featured);

        content.innerHTML = `
            <div class="carousel-container animate">
                ${featured.length > 0 ? featured.map((p, i) => `
                    <div class="carousel-slide ${i === 0 ? 'active' : ''}" style="background-image: url('${p.images[0]}')" onclick="app.showDetail(${p.id})">
                        <div class="carousel-caption">
                            <h3>${p.title}</h3>
                            <p>R$ ${p.price.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                `).join('') : '<div class="carousel-slide active" style="background-color:#333; display:flex; justify-content:center; align-items:center"><p>Sem destaques no momento</p></div>'}
            </div>

            <section class="hero" style="background:none; height:auto; padding-top:0">
                <div class="search-box">
                    <input type="text" placeholder="Bairro, cidade ou tipo..." oninput="app.handleSearch(event)">
                    <button><i class="fas fa-search"></i></button>
                </div>
            </section>

            <div class="container">
                <div class="categories animate">
                    <button class="cat-btn ${this.filters.category === 'Casa' ? 'active' : ''}" onclick="app.setFilter('category', 'Casa')">Casa</button>
                    <button class="cat-btn ${this.filters.category === 'Apartamento' ? 'active' : ''}" onclick="app.setFilter('category', 'Apartamento')">Apartamentos</button>
                    <button class="cat-btn ${this.filters.category === 'Sitio' ? 'active' : ''}" onclick="app.setFilter('category', 'Sitio')">Sítios</button>
                    <button class="cat-btn ${this.filters.category === 'Terreno' ? 'active' : ''}" onclick="app.setFilter('category', 'Terreno')">Terrenos</button>
                    <button class="cat-btn ${this.filters.category === 'Galpão' ? 'active' : ''}" onclick="app.setFilter('category', 'Galpão')">Galpões</button>
                    <button class="cat-btn ${this.filters.category === 'Loja' ? 'active' : ''}" onclick="app.setFilter('category', 'Loja')">Lojas</button>
                    <button class="cat-btn ${this.filters.category === 'Kitnet' ? 'active' : ''}" onclick="app.setFilter('category', 'Kitnet')">Kitnets</button>
                </div>
                <div class="property-grid animate" id="property-grid"></div>
            </div>
        `;
        this.renderGrid();
        this.updateActiveBtn(0);
    },

    renderGrid: function(targetProps = null) {
        const grid = document.getElementById('property-grid');
        if (!grid) return;

        const list = targetProps || this.properties.filter(p => {
            const type = String(p.type || '').toUpperCase();
            const filterType = String(this.filters.type || '').toUpperCase();
            const matchesType = type === filterType;

            const pCat = String(p.category || p.propertyType || '').trim().toUpperCase();
            const fCat = String(this.filters.category || '').trim().toUpperCase();
            const matchesCat = (fCat === 'TODOS' || pCat === fCat);

            const q = (this.filters.query || '').toLowerCase();
            const title = String(p.title || '').toLowerCase();
            const address = String(p.address || '').toLowerCase();
            const matchesQuery = title.includes(q) || address.includes(q);

            return matchesType && matchesCat && matchesQuery;
        });

        if (list.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p>Nenhum imóvel encontrado.</p>
                <button class="cat-btn" style="margin-top:1rem" onclick="app.setFilter('category', 'Casa')">Ver Casas</button>
            </div>`;
            return;
        }

        grid.innerHTML = list.map(p => `
            <div class="property-card" onclick="app.showDetail(${p.id})">
                <button class="fav-btn-card fav-btn-${p.id} ${this.favorites.includes(p.id) ? 'active' : ''}" onclick="app.toggleFavorite(event, ${p.id})">
                    <i class="fas fa-heart"></i>
                </button>
                <div class="card-badge">${p.propertyType || p.category || 'Imóvel'}</div>
                <img src="${(p.images && p.images[0]) ? p.images[0] : 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'}" class="card-img" alt="${p.title}" onerror="this.src='https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'">
                <div class="card-content">
                    <div class="card-price">R$ ${p.price ? p.price.toLocaleString('pt-BR') : 'Consulte'}</div>
                    <div class="card-title">${p.title || 'Sem título'}</div>
                    <div class="card-meta">
                        <span><i class="fas fa-bed"></i> ${p.beds || 0}</span>
                        <span><i class="fas fa-bath"></i> ${p.baths || 0}</span>
                        <span><i class="fas fa-expand"></i> ${p.area || 0}m²</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    showDetail: function(id) {
        const p = this.properties.find(item => item.id === id);
        const content = document.getElementById('app-content');
        window.scrollTo(0,0);

        content.innerHTML = `
            <div class="container detail-view animate">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                    <button class="cat-btn" onclick="app.showHome()"><i class="fas fa-arrow-left"></i> Voltar</button>
                    <button class="cat-btn fav-btn-${p.id} ${this.favorites.includes(p.id) ? 'active' : ''}" onclick="app.toggleFavorite(event, ${p.id})">
                        <i class="fas fa-heart"></i> Favorito
                    </button>
                </div>

                <div class="detail-gallery">
                    <div class="main-img-container"><img id="main-photo" src="${p.images[0]}"></div>
                    ${p.images.length > 1 ? `<div class="thumb-grid">${p.images.map((img, idx) => `
                        <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="app.changePhoto(this, '${img}')">
                            <img src="${img}">
                        </div>`).join('')}</div>` : ''}
                </div>

                <div class="detail-header">
                    <h1>${p.title}</h1>
                    <span class="card-price" style="font-size: 2rem">R$ ${p.price.toLocaleString('pt-BR')}</span>
                    <p style="color:var(--text-dim)">${p.address}</p>
                </div>

                <div class="info-grid">
                    <div class="info-item"><label class="info-label">Tipo</label><div class="info-value">${p.propertyType || p.category}</div></div>
                    <div class="info-item"><label class="info-label">Área</label><div class="info-value">${p.area} m²</div></div>
                </div>

                <div style="margin-top:2rem; display:flex; gap:1rem">
                    <button class="btn-main" style="flex:2" onclick="window.open('https://wa.me/${CONFIG.WHATSAPP}?text=Interesse: ${p.title}')">Tenho Interesse</button>
                    <button class="btn-main" style="flex:1; background:#333; color:white" onclick="app.openMap('${p.address}')">GPS</button>
                </div>
            </div>
        `;
    },

    showFavorites: function() {
        const content = document.getElementById('app-content');
        const favProps = this.properties.filter(p => this.favorites.includes(p.id));

        content.innerHTML = `
            <div class="container animate" style="padding-top:2rem">
                <h2 style="margin-bottom:2rem">Meus Favoritos</h2>
                <div class="property-grid" id="property-grid"></div>
            </div>
        `;
        this.renderGrid(favProps);
        this.updateActiveBtn(2);
    },

    changePhoto: function(el, src) {
        document.getElementById('main-photo').src = src;
        document.querySelectorAll('.thumb-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
    },

    openMap: (addr) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`),
    setFilter: function(k, v) { this.filters[k] = v; this.showHome(); },
    handleSearch: function(e) { this.filters.query = e.target.value.toLowerCase(); this.renderGrid(); },

    showAbout: function() {
        const content = document.getElementById('app-content');
        content.innerHTML = `<div class="container animate"><div class="form-card" style="text-align:center">
            <img src="${CONFIG.LOGO_URL}" style="height:80px; margin-bottom:1.5rem">
            <h2>Sobre a ${CONFIG.SITE_NAME}</h2>
            <p style="color:var(--text-dim); margin-top:1rem; line-height:1.8">Sua imobiliária digital de confiança.</p>
            <button class="btn-main" style="background:#333; margin-top:2rem" onclick="app.openMap('Rio de Janeiro')">Localização</button>
        </div></div>`;
        this.updateActiveBtn(1);
    },

    showSell: function() {
        const content = document.getElementById('app-content');
        content.innerHTML = `<div class="container animate"><div class="form-card" style="text-align:center">
            <h2>Vender seu Imóvel</h2>
            <p style="color:var(--text-dim); margin-bottom:2rem">Atendimento personalizado via WhatsApp.</p>
            <button class="btn-main" style="background:#25d366" onclick="window.open('https://wa.me/${CONFIG.WHATSAPP}')">Chamar no WhatsApp</button>
        </div></div>`;
    },

    showContact: function() {
        window.open(`https://wa.me/${CONFIG.WHATSAPP}`);
        this.updateActiveBtn(3);
    },

    updateActiveBtn: (idx) => document.querySelectorAll('.float-btn').forEach((btn, i) => btn.classList.toggle('active', i === idx)),

    showToast: function(msg) {
        const toast = document.getElementById('toast');
        toast.innerText = msg; toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

app.init();
