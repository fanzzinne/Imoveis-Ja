const CONFIG = {
    SITE_NAME: 'IMÓVEIS JÁ',
    PRIMARY_COLOR: '#f59e0b',
    WHATSAPP: '5521988137667',
    API_URL: 'https://script.google.com/macros/s/AKfycbz2fap1lcKlO8deqlc4JzTQ0hm1G2tsvWqRZcYB-IdSyODtH0dDZzBw9vmW1i9e-uu5Eg/exec'
};

const app = {
    properties: [],
    favorites: JSON.parse(localStorage.getItem('imoveis_favs') || '[]'),
    carouselIndex: 0,
    filters: { type: 'BUY', category: 'Casa', query: '' },

    init: async function() {
        this.registerSW();
        this.handleInstallPrompt();
        await this.fetchProperties();
        this.showHome();
        this.startCarousel();
    },

    registerSW: function() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then(reg => {
                    reg.onupdatefound = () => {
                        const installingWorker = reg.installing;
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    // Nova versão disponível, recarrega para aplicar
                                    this.showToast('Atualizando para nova versão...');
                                    setTimeout(() => window.location.reload(), 2000);
                                }
                            }
                        };
                    };
                });
            });
        }
    },

    handleInstallPrompt: function() {
        this.deferredPrompt = null;
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;

            if (isAndroid && !isStandalone) {
                // Versão Android: Mostra o botão no cabeçalho
                const btn = document.getElementById('btn-install-android');
                if (btn) btn.classList.remove('hidden');
            }
        });

        // Versão Desktop: Sugere favoritos se não for mobile
        if (!isAndroid && !isStandalone && !localStorage.getItem('fav_suggested')) {
            setTimeout(() => {
                this.showToast('Gostou? Pressione Ctrl+D para salvar nos favoritos! ⭐');
                localStorage.setItem('fav_suggested', 'true');
            }, 10000);
        }

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            const btn = document.getElementById('btn-install-android');
            if (btn) btn.classList.add('hidden');
            this.showToast('App instalado com sucesso!');
        });
    },

    installPWA: async function() {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            this.deferredPrompt = null;
            const btn = document.getElementById('btn-install-android');
            if (btn) btn.classList.add('hidden');
        }
    },

    fetchProperties: async function() {
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=informacoes`);
            this.properties = await response.json();
            console.log('Dados carregados:', this.properties);
        } catch (error) {
            console.error('Erro:', error);
            this.properties = this.getMockData();
        }
    },

    getMockData: function() {
        return [
            {
                id: 1, title: 'Mansão Contemporânea Poniten', propertyType: 'Casa', type: 'BUY',
                featured: true, price: 4500000, iptu: 1200, financing: 'Aceita CEF',
                area: 450, beds: 5, suites: 4, baths: 6, kitchens: 1, floors: 2,
                leisure: 'Piscina, Gourmet', address: 'Barra da Tijuca, RJ',
                docs: 'Escritura Ok', images: ['https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg']
            },
            {
                id: 2, title: 'Apartamento Vista Mar', propertyType: 'Apartamento', type: 'BUY',
                featured: true, price: 1200000, iptu: 450, financing: 'Todos os bancos',
                area: 120, beds: 3, suites: 1, baths: 2, kitchens: 1, floors: 1,
                leisure: 'Academia', address: 'Ipanema, RJ',
                docs: 'RGI Ok', images: ['https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg']
            }
        ];
    },

    showHome: function() {
        const content = document.getElementById('app-content');
        const featured = this.properties.filter(p => p.featured);

        content.innerHTML = `
            <!-- Carrossel (Totalmente revisado para remover bordas vazadas) -->
            <div class="relative w-full max-w-4xl mx-auto h-64 md:h-96 rounded-3xl overflow-hidden mb-8 shadow-2xl bg-black">
                ${featured.map((p, i) => `
                <div class="carousel-slide absolute inset-0 opacity-0 transition-opacity duration-1000 ${i === 0 ? 'opacity-100' : ''}"
                     style="background-image: url('${p.images[0]}'); background-size: cover; background-position: center;"
                     onclick="app.showDetail(${p.id})">
                    <!-- Gradiente apenas na parte inferior -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-6">
                        <h3 class="text-xl font-bold text-white">${p.title}</h3>
                        <p class="text-primary font-black text-lg">R$ ${p.price.toLocaleString('pt-BR')}</p>
                    </div>
                </div>`).join('')}
            </div>

            <!-- Busca -->
            <div class="max-w-xl mx-auto mb-10 flex gap-2">
                <div class="flex-1 bg-darkCard border border-white/10 rounded-2xl flex items-center px-4">
                    <i class="fas fa-search text-zinc-500"></i>
                    <input type="text" placeholder="Bairro ou tipo..." class="bg-transparent border-none focus:ring-0 text-white w-full p-4 outline-none" oninput="app.handleSearch(event)">
                </div>
            </div>

            <!-- Categorias -->
            <div class="flex gap-3 overflow-x-auto pb-4 no-scrollbar justify-center mb-6">
                ${['Casa','Apartamento','Sitio','Terreno','Galpão','Loja','Kitnet'].map(c => `
                <button onclick="app.setFilter('category', '${c}')" class="px-6 py-2 rounded-full border ${this.filters.category === c ? 'bg-primary border-primary text-black font-bold' : 'border-white/10 text-zinc-400'} whitespace-nowrap transition-all hover:scale-105">
                    ${c}
                </button>`).join('')}
            </div>

            <!-- Grid de Imóveis -->
            <div id="property-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500"></div>
        `;
        this.renderGrid();
    },

    renderGrid: function(list = null) {
        const grid = document.getElementById('property-grid');
        if (!grid) return;

        const filtered = list || this.properties.filter(p => {
            const matchesType = p.type === this.filters.type;
            const matchesCat = p.propertyType === this.filters.category || p.category === this.filters.category;
            const q = this.filters.query.toLowerCase();
            const matchesQuery = p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
            return matchesType && matchesCat && matchesQuery;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-10 text-zinc-500">Nenhum imóvel encontrado.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(p => `
            <div class="bg-darkCard rounded-[2rem] overflow-hidden border border-white/5 hover:border-primary/30 transition-all hover:-translate-y-2 cursor-pointer relative group" onclick="app.showDetail(${p.id})">
                <button onclick="app.toggleFavorite(event, ${p.id})" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center z-10 hover:scale-110 transition-transform">
                    <i class="fas fa-heart ${this.favorites.includes(p.id) ? 'text-red-500' : 'text-white'}"></i>
                </button>
                <img src="${p.images[0]}" class="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500" alt="${p.title}">
                <div class="p-6">
                    <span class="text-[10px] uppercase tracking-widest text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">${p.propertyType || p.category}</span>
                    <h3 class="mt-3 text-lg font-bold truncate">${p.title}</h3>
                    <p class="text-zinc-400 text-xs mt-1"><i class="fas fa-map-marker-alt"></i> ${p.address}</p>
                    <div class="flex justify-between items-center mt-6">
                        <span class="text-xl font-black text-primary">R$ ${p.price.toLocaleString('pt-BR')}</span>
                        <div class="flex gap-4 text-zinc-500 text-xs font-bold">
                            <span><i class="fas fa-bed"></i> ${p.beds || 0}</span>
                            <span><i class="fas fa-bath"></i> ${p.baths || 0}</span>
                        </div>
                    </div>
                </div>
            </div>`).join('');
    },

    showDetail: function(id) {
        const p = this.properties.find(x => x.id == id);
        const content = document.getElementById('app-content');
        window.scrollTo(0, 0);

        content.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-6">
                <button onclick="app.showHome()" class="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>

                <div class="rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
                    <img id="main-photo" src="${p.images[0]}" class="w-full h-[300px] md:h-[500px] object-cover">
                </div>

                <div class="grid grid-cols-4 md:grid-cols-6 gap-3">
                    ${p.images.map((img, i) => `<img src="${img}" class="h-20 w-full object-cover rounded-2xl cursor-pointer hover:opacity-80 transition-opacity border-2 ${i === 0 ? 'border-primary' : 'border-transparent'}" onclick="app.changePhoto(this, '${img}')">`).join('')}
                </div>

                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-black">${p.title}</h1>
                        <p class="text-zinc-400 mt-1"><i class="fas fa-map-marker-alt text-primary"></i> ${p.address}</p>
                    </div>
                    <span class="text-4xl font-black text-primary whitespace-nowrap">R$ ${p.price.toLocaleString('pt-BR')}</span>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-darkCard p-6 rounded-3xl border border-white/5">
                        <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Área Total</p>
                        <p class="text-xl font-bold mt-2">${p.area} m²</p>
                    </div>
                    <div class="bg-darkCard p-6 rounded-3xl border border-white/5">
                        <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">IPTU Anual</p>
                        <p class="text-xl font-bold mt-2">R$ ${p.iptu}</p>
                    </div>
                    <div class="bg-darkCard p-6 rounded-3xl border border-white/5 col-span-2">
                        <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Financiamento</p>
                        <p class="text-xl font-bold mt-2">${p.financing}</p>
                    </div>
                </div>

                <div class="bg-darkCard p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                    <h3 class="text-xl font-bold">Ficha Técnica</h3>
                    <div class="flex flex-wrap gap-4 text-sm font-semibold">
                        <span class="bg-white/5 px-4 py-2 rounded-full"><i class="fas fa-bed text-primary mr-2"></i> ${p.beds} Quartos</span>
                        <span class="bg-white/5 px-4 py-2 rounded-full"><i class="fas fa-shower text-primary mr-2"></i> ${p.suites} Suítes</span>
                        <span class="bg-white/5 px-4 py-2 rounded-full"><i class="fas fa-bath text-primary mr-2"></i> ${p.baths} Banheiros</span>
                        <span class="bg-white/5 px-4 py-2 rounded-full"><i class="fas fa-layer-group text-primary mr-2"></i> ${p.floors} Andares</span>
                    </div>
                    <p class="text-zinc-400 leading-relaxed pt-4 border-t border-white/5">${p.leisure}</p>
                </div>

                <div class="flex gap-4 sticky bottom-0 pt-4 bg-darkBg/95 backdrop-blur-md pb-4 z-40">
                    <button class="flex-[2] bg-primary text-black font-black py-5 rounded-3xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20" onclick="window.open('https://wa.me/${CONFIG.WHATSAPP}?text=Gostaria de informações sobre: ${p.title}')">
                        <i class="fab fa-whatsapp mr-2"></i> TENHO INTERESSE
                    </button>
                    <button class="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-5 rounded-3xl transition-all" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}')">
                        <i class="fas fa-location-arrow mr-2 text-primary"></i> GPS
                    </button>
                </div>
            </div>
        `;
    },

    showAbout: function() {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="max-w-2xl mx-auto text-center space-y-8 py-10 animate-in zoom-in duration-500">
                <div class="relative w-32 h-32 mx-auto bg-primary/20 rounded-full flex items-center justify-center border-4 border-primary shadow-2xl shadow-primary/30">
                    <img src="https://api.clau.ai/v1/files/input_file_0.png" class="w-24 h-auto">
                </div>
                <div>
                    <h1 class="text-4xl font-black mb-4 uppercase tracking-tighter">${CONFIG.SITE_NAME}</h1>
                    <p class="text-zinc-400 text-lg leading-relaxed font-medium">Sua parceira ideal na busca pelo lar dos seus sonhos. Atuamos com transparência, agilidade e foco total em resultados exclusivos.</p>
                </div>
                <div class="bg-darkCard p-8 rounded-[2.5rem] border border-white/5">
                    <h3 class="text-primary font-black uppercase tracking-widest text-sm mb-4">Sede Administrativa</h3>
                    <p class="text-xl font-bold mb-6">Rio de Janeiro, Brasil</p>
                    <button class="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl border border-white/10 transition-all" onclick="window.open('https://www.google.com/maps/search/?api=1&query=Rio+de+Janeiro')">
                        ABRIR LOCALIZAÇÃO NO GPS
                    </button>
                </div>
            </div>
        `;
    },

    showSell: function() {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="max-w-2xl mx-auto py-10 animate-in slide-in-from-bottom duration-500">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-black mb-2">QUER VENDER?</h1>
                    <p class="text-zinc-500 font-medium">Preencha os campos para atendimento prioritário via WhatsApp.</p>
                </div>
                <div class="bg-darkCard p-10 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
                    <div><label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Seu Nome</label>
                    <input type="text" id="v-nome" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 focus:border-primary outline-none transition-all"></div>
                    <div><label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">WhatsApp</label>
                    <input type="text" id="v-contato" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 focus:border-primary outline-none transition-all" placeholder="(XX) 99999-9999"></div>
                    <div><label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Sobre o Imóvel</label>
                    <textarea id="v-msg" rows="4" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 focus:border-primary outline-none transition-all" placeholder="Bairro, quartos, valor..."></textarea></div>
                    <button onclick="app.abrirWhatsappVenda()" class="btn-main w-full bg-primary text-black font-black py-5 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20">
                        ENVIAR VIA WHATSAPP
                    </button>
                </div>
            </div>
        `;
    },

    abrirWhatsappVenda: function() {
        const n = document.getElementById('v-nome').value;
        const c = document.getElementById('v-contato').value;
        const m = document.getElementById('v-msg').value;
        if(!n || !c) return this.showToast('Preencha os campos!');
        const text = `Olá! Meu nome é ${n}.%0AContato: ${c}%0AGostaria de vender meu imóvel.%0ADetalhes: ${m}`;
        window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${text}`);
    },

    showFavorites: function() {
        const content = document.getElementById('app-content');
        const favs = this.properties.filter(p => this.favorites.includes(p.id));
        content.innerHTML = `
            <h1 class="text-3xl font-black mb-8">MEUS FAVORITOS</h1>
            <div id="property-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        `;
        this.renderGrid(favs);
    },

    toggleFavorite: function(e, id) {
        e.stopPropagation();
        const index = this.favorites.indexOf(id);
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.showToast('Removido dos favoritos');
        } else {
            this.favorites.push(id);
            this.showToast('Adicionado aos favoritos');
        }
        localStorage.setItem('imoveis_favs', JSON.stringify(this.favorites));
        this.renderGrid();
    },

    showContact: () => window.open(`https://wa.me/${CONFIG.WHATSAPP}`),
    setFilter: function(k, v) { this.filters[k] = v; this.showHome(); },
    handleSearch: function(e) { this.filters.query = e.target.value; this.renderGrid(); },
    startCarousel: function() {
        setInterval(() => {
            const slides = document.querySelectorAll('.carousel-slide');
            if(slides.length <= 1) return;

            // Remove a opacidade do slide atual
            slides[this.carouselIndex].style.opacity = '0';

            // Incrementa o índice
            this.carouselIndex = (this.carouselIndex + 1) % slides.length;

            // Adiciona a opacidade ao novo slide
            slides[this.carouselIndex].style.opacity = '1';
        }, 5000);
    },
    showToast: function(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.style.display = 'block';
        setTimeout(() => t.style.opacity = '1', 10);
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.style.display = 'none', 500);
        }, 3000);
    },
    changePhoto: function(el, src) {
        document.getElementById('main-photo').src = src;
        document.querySelectorAll('.rounded-2xl').forEach(i => i.classList.remove('border-primary'));
        el.classList.add('border-primary');
    }
};

app.init();
