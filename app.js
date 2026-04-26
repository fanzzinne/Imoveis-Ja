const CONFIG = {
    // 1. CONFIGURAÇÕES VISUAIS (Ajuste aqui diretamente no código)
    SITE_NAME: 'Imóveis Já',
    PRIMARY_COLOR: '#f59e0b',
    WHATSAPP: '5521988137667',
    LOGO_URL: 'favicon.ico',
    SLOGAN: 'Sua nova história começa aqui',

    // 2. INTEGRAÇÃO (Cole sua URL do Apps Script aqui)
    API_URL: 'https://script.google.com/macros/s/AKfycbz2fap1lcKlO8deqlc4JzTQ0hm1G2tsvWqRZcYB-IdSyODtH0dDZzBw9vmW1i9e-uu5Eg/exec'
};

const app = {
    properties: [],
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
                // Detecta atualização automática
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('PWA: Nova versão detectada! Atualizando...');
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
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('PWA: Gatilho capturado com sucesso!');

            // Força a exibição do banner após 3 segundos
            setTimeout(() => {
                if (this.deferredPrompt) {
                    this.showInstallBanner();
                }
            }, 3000);
        });

        // Caso o navegador já tenha o app instalado ou não suporte,
        // tentamos capturar a mudança de estado
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
            this.deferredPrompt.userChoice.then(choice => {
                if (choice.outcome === 'accepted') console.log('Usuário aceitou a instalação');
                this.deferredPrompt = null;
            });
        };

        document.body.appendChild(banner);
    },

    applyTheme: function() {
        // A logo agora é gerida via CSS para Android/Desktop
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
            console.error('Erro na integração:', error);
            if (grid) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #ff4444;"><p>Falha ao carregar imóveis. Exibindo demonstração...</p></div>';
            }
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
    },

    renderGrid: function() {
        const grid = document.getElementById('property-grid');
        if (!grid) return;

        const filtered = this.properties.filter(p => {
            const matchesType = String(p.type).toUpperCase() === String(this.filters.type).toUpperCase();
            const pCat = String(p.category || p.propertyType || '').trim().toUpperCase();
            const fCat = String(this.filters.category).trim().toUpperCase();
            const matchesCat = (fCat === 'TODOS' || pCat === fCat);
            const q = this.filters.query.toLowerCase();
            const matchesQuery = String(p.title).toLowerCase().includes(q) || String(p.address).toLowerCase().includes(q);
            return matchesType && matchesCat && matchesQuery;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">Nenhum imóvel encontrado nesta categoria.</div>';
            return;
        }

        grid.innerHTML = filtered.map(p => `
            <div class="property-card" onclick="app.showDetail(${p.id})">
                <div class="card-badge">${p.propertyType || p.category}</div>
                <img src="${p.images[0]}" class="card-img" alt="${p.title}">
                <div class="card-content">
                    <div class="card-price">R$ ${p.price.toLocaleString('pt-BR')}</div>
                    <div class="card-title">${p.title}</div>
                    <div class="card-meta">
                        <span><i class="fas fa-bed"></i> ${p.beds}</span>
                        <span><i class="fas fa-bath"></i> ${p.baths}</span>
                        <span><i class="fas fa-expand"></i> ${p.area}m²</span>
                    </div>
                    <div class="card-loc" style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-dim)">
                        <i class="fas fa-map-marker-alt" style="color:var(--primary)"></i> ${p.address}
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
                <button class="cat-btn" onclick="app.showHome()" style="margin-bottom:1rem">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>

                <div class="detail-gallery">
                    <div class="main-img-container">
                        <img id="main-photo" src="${p.images[0]}" alt="${p.title}">
                    </div>
                    ${p.images.length > 1 ? `
                    <div class="thumb-grid">
                        ${p.images.map((img, idx) => `
                            <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="app.changePhoto(this, '${img}')">
                                <img src="${img}" alt="Miniatura ${idx + 1}">
                            </div>
                        `).join('')}
                    </div>` : ''}
                </div>

                <div class="detail-header">
                    <h1>${p.title}</h1>
                    <div style="display:flex; align-items:center; gap:1rem">
                        <span class="card-price" style="font-size: 2rem">R$ ${p.price.toLocaleString('pt-BR')}</span>
                        <span style="color:var(--text-dim)">| ${p.address}</span>
                    </div>
                </div>
                <div class="info-grid">
                    <div class="info-item"><div class="info-label">Tipo</div><div class="info-value">${p.propertyType || p.category}</div></div>
                    <div class="info-item"><div class="info-label">Área</div><div class="info-value">${p.area} m²</div></div>
                    <div class="info-item"><div class="info-label">Financiamento</div><div class="info-value">${p.financing}</div></div>
                    <div class="info-item"><div class="info-label">IPTU Anual</div><div class="info-value">R$ ${p.iptu}</div></div>
                </div>
                <h3 style="margin-bottom:1rem">Configuração</h3>
                <div class="features-list">
                    <div class="feature-tag"><i class="fas fa-bed"></i> ${p.beds} Quartos</div>
                    <div class="feature-tag"><i class="fas fa-shower"></i> ${p.suites} Suítes</div>
                    <div class="feature-tag"><i class="fas fa-bath"></i> ${p.baths} Banheiros</div>
                    <div class="feature-tag"><i class="fas fa-layer-group"></i> ${p.floors} Andar(es)</div>
                </div>
                <div class="info-item" style="background:var(--card); margin-top:2rem">
                    <h3 style="margin-bottom:0.5rem">Lazer & Extras</h3><p>${p.leisure}</p>
                </div>
                <div style="margin-top:2rem; display:flex; gap:1rem">
                    <button class="btn-main" style="flex:2" onclick="window.open('https://wa.me/${CONFIG.WHATSAPP}?text=Olá! Tenho interesse no imóvel: ${p.title}')">Tenho Interesse</button>
                    <button class="btn-main" style="flex:1; background:#333; color:white" onclick="app.openMap('${p.address}')"><i class="fas fa-location-arrow"></i> GPS</button>
                </div>
            </div>
        `;
    },

    changePhoto: function(element, src) {
        document.getElementById('main-photo').src = src;
        document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    },

    openMap: function(address) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    },

    setFilter: function(key, value) {
        this.filters[key] = value;
        this.showHome();
    },

    handleSearch: function(e) {
        this.filters.query = e.target.value.toLowerCase();
        this.renderGrid();
    },

    showAbout: function() {
        document.getElementById('app-content').innerHTML = `<div class="container animate"><div class="form-card"><h2>Sobre Nós</h2><p>${CONFIG.SITE_NAME} é sua plataforma digital de imóveis.</p></div></div>`;
    },

    showSell: function() {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="container animate">
                <div class="form-card" style="text-align:center">
                    <h2 style="margin-bottom:1rem">Quer vender seu imóvel?</h2>
                    <p style="color:var(--text-dim); margin-bottom:2rem">Preencha os campos abaixo para iniciar seu atendimento via WhatsApp.</p>

                    <div style="padding-top:1rem; text-align: left;">
                        <form id="form-venda-whatsapp">
                            <div class="form-group">
                                <label style="font-size: 0.85rem; color: var(--text-dim)">Seu Nome Completo</label>
                                <input type="text" id="v-nome" placeholder="Digite seu nome..." required>
                            </div>
                            <div class="form-group">
                                <label style="font-size: 0.85rem; color: var(--text-dim)">Seu WhatsApp/Contato</label>
                                <input type="text" id="v-contato" placeholder="(XX) 99999-9999" required>
                            </div>
                            <div class="form-group">
                                <label style="font-size: 0.85rem; color: var(--text-dim)">Breve descrição do imóvel</label>
                                <textarea id="v-msg" rows="3" placeholder="Ex: Casa 2 quartos no Bairro X..."></textarea>
                            </div>

                            <!-- Botão WhatsApp integrado ao formulário -->
                            <button type="button" onclick="app.abrirWhatsappVenda()" class="btn-main" style="background:#25d366; margin-top:1rem; display:flex; align-items:center; justify-content:center; gap:10px">
                                <i class="fab fa-whatsapp" style="font-size:1.5rem"></i> Enviar Mensagem
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    abrirWhatsappVenda: function() {
        const nome = document.getElementById('v-nome').value;
        const contato = document.getElementById('v-contato').value;
        const mensagem = document.getElementById('v-msg').value;

        if (!nome || !contato) {
            this.showToast('Por favor, preencha seu nome e contato.');
            return;
        }

        const texto = `Olá! Meu nome é ${nome}.%0A` +
                      `Contato: ${contato}%0A` +
                      `Gostaria de cadastrar meu imóvel para venda.%0A` +
                      `Descrição: ${mensagem}`;

        window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${texto}`);
    },

    showContact: function() {
        window.open(`https://wa.me/${CONFIG.WHATSAPP}`);
    },

    showToast: function(msg) {
        const toast = document.getElementById('toast');
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

app.init();
