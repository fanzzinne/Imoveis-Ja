const CONFIG = {
    SITE_NAME: 'IMÓVEIS JÁ',
    PRIMARY_COLOR: '#f59e0b',
    WHATSAPP: '5521988137667',
    API_URL: 'https://script.google.com/macros/s/AKfycbwUCZbHHe9ku_aKkCmaQ_8E2lpZlzr7pqZ3aBCnp-PgA0Yqb2FHHSNM7TE8d9k7GTueRQ/exec',
    CAIXA_LINK: 'https://autocompra.caixaconsorcio.com.br/consorcio/produtos?mtm_campaign=ampliva-google-search-Institucional&mtm_kwd=cpa&mtm_source=google&mtm_medium=search&mtm_content=na_search_na&gad_source=1&gad_campaignid=21978395693&gbraid=0AAAAAD4YKGAcbCo4HBmlisB-r1pHJLYD_&gclid=Cj0KCQjwkrzPBhCqARIsAJN460me3qZ76MjcpqRFAdU61v7Q4HeBfkHBiE8Gouk6c56TaiBkK2W-U00aAsXaEALw_wcB'
};

const app = {
    properties: [],
    favorites: JSON.parse(localStorage.getItem('imoveis_favs') || '[]'),
    carouselIndex: 0,
    // Alterado para vazio para mostrar tudo ao carregar
    filters: { type: '', category: '', query: '' },

    init: async function() {
        try {
            this.registerSW();
            this.handleInstallPrompt();
            await this.fetchProperties();
        } catch (error) {
            console.error('Erro na inicialização:', error);
        } finally {
            this.showHome();
            this.startCarousel();
            this.updateHeaderNav();
        }
    },

    registerSW: function() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js', { scope: './' }).then(reg => {
                    console.log('SW registrado');
                });
            });
        }
    },

    handleInstallPrompt: function() {
        this.deferredPrompt = null;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            const btn = document.getElementById('btn-install-android');
            if (btn) btn.classList.remove('hidden');
        });
    },

    installPWA: async function() {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
    },

    fetchProperties: async function() {
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=informacoes`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
            const data = await response.json();

            if (Array.isArray(data)) {
                this.properties = data.map((p, index) => {
                    // Função auxiliar para achar valores em colunas com nomes variados
                    const findVal = (p, terms) => {
                        const key = Object.keys(p).find(k => terms.some(t => k.toLowerCase().includes(t.toLowerCase())));
                        return key ? p[key] : null;
                    };

                    // Tenta encontrar as imagens em várias colunas possíveis
                    let rawImages = findVal(p, ["Imagens", "Link", "Fotos"]) || "";

                    // Se não achou pelo nome, tenta procurar um valor que comece com http (comum em planilhas)
                    if (!rawImages) {
                        for (let key in p) {
                            if (p[key] && p[key].toString().includes('http')) {
                                rawImages = p[key];
                                break;
                            }
                        }
                    }

                    // Converte a string de links em um Array limpo
                    let imageList = [];
                    if (Array.isArray(rawImages)) {
                        imageList = rawImages;
                    } else if (rawImages) {
                        // Divide por vírgula OU espaço OU quebra de linha e remove espaços inúteis
                        imageList = rawImages.toString().split(/[, \n]+/).map(img => img.trim()).filter(img => img.startsWith('http'));
                    }

                    // Se ainda estiver vazio, usa o logo
                    if (imageList.length === 0) imageList = ['logo.png'];

                    // Extrai apenas os números da área para evitar "0 m²" ou "108m² m²"
                    const rawArea = findVal(p, ["Área", "Area"]) || "0";
                    const areaValue = rawArea.toString().replace(/[^\d]/g, '') || "0";

                    return {
                        id: index + 1,
                        title: findVal(p, ["Título", "Titulo"]) || "Sem título",
                        category: findVal(p, ["Categoria"]) || "Outros",
                        type: findVal(p, ["Finalidade"]) || "COMPRAR",
                        featured: ["SIM", "Sim", "true", true].includes(findVal(p, ["Destaque"])),
                        price: p["Valor R$"] ? parseFloat(p["Valor R$"].toString().replace(/[^\d,]/g, '').replace(',', '.')) : 0,
                        iptu: findVal(p, ["IPTU"]) || 0,
                        financing: findVal(p, ["Financiamento"]) || "Consulte",
                        area: areaValue,
                        beds: findVal(p, ["Quartos"]) || 0,
                        suites: findVal(p, ["Suítes", "Suites"]) || 0,
                        baths: findVal(p, ["Banheiros"]) || 0,
                        kitchens: findVal(p, ["Cozinha"]) || 0,
                        floors: findVal(p, ["Andares"]) || 1,
                        leisure: findVal(p, ["Lazer"]) || "",
                        address: findVal(p, ["Endereço", "Endereco"]) || "",
                        docs: findVal(p, ["Documentação", "Documentacao"]) || "",
                        images: imageList
                    };
                });
                console.log('Imóveis carregados com sucesso!');
            }
        } catch (error) {
            console.error('Erro API:', error);
            this.showToast('Erro ao carregar imagens da planilha.');
        }
    },

    showHome: function() {
        const content = document.getElementById('app-content');
        let featured = this.properties.filter(p => p.featured);
        if (featured.length === 0) featured = this.properties.slice(0, 3);
        this.updateHeaderNav();

        content.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 md:px-6">
                <!-- Carrossel -->
                <div class="relative w-full h-64 md:h-[450px] rounded-[2.5rem] overflow-hidden mb-8 shadow-2xl bg-zinc-900">
                    ${featured.length > 0 ? featured.map((p, i) => `
                    <div class="carousel-slide absolute inset-0 opacity-0 transition-opacity duration-1000 ${i === 0 ? 'opacity-100' : ''}"
                         style="background-image: url('${p.images[0]}'); background-size: cover; background-position: center;"
                         onclick="app.showDetail(${p.id})">
                        <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-6 md:p-12">
                            <h3 class="text-xl md:text-3xl font-bold text-white">${p.title}</h3>
                            <p class="text-primary font-black text-lg md:text-2xl">R$ ${p.price.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>`).join('') : ''}
                </div>

                <!-- Busca -->
                <div class="max-w-2xl mx-auto mb-10">
                    <div class="bg-darkCard border border-white/10 rounded-2xl flex items-center px-4 hover:border-primary/50 transition-colors">
                        <i class="fas fa-search text-zinc-500"></i>
                        <input type="text" placeholder="Bairro ou tipo..." class="bg-transparent border-none focus:ring-0 text-white w-full p-4 outline-none" oninput="app.handleSearch(event)">
                    </div>
                </div>

                <!-- Categorias -->
                <div class="flex gap-3 overflow-x-auto pb-6 no-scrollbar md:justify-center mb-4">
                    ${['Casa','Apartamento','Kitnet','Terreno','Galpão','Loja','Sítio'].map(c => `
                    <button onclick="app.setFilter('category', '${c}')" class="px-6 py-2.5 rounded-xl border ${this.filters.category === c ? 'bg-primary border-primary text-black font-bold' : 'border-white/10 text-zinc-400'} whitespace-nowrap transition-all text-sm">
                        ${c}
                    </button>`).join('')}
                    <button onclick="app.setFilter('category', '')" class="px-6 py-2.5 rounded-xl border ${!this.filters.category ? 'bg-primary border-primary text-black font-bold' : 'border-white/10 text-zinc-400'} whitespace-nowrap text-sm">
                        Todos
                    </button>
                </div>

                <div id="property-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"></div>
            </div>
        `;
        this.renderGrid();
    },

    renderGrid: function(list = null) {
        const grid = document.getElementById('property-grid');
        if (!grid) return;

        const filtered = list || this.properties.filter(p => {
            const matchesType = !this.filters.type || p.type === this.filters.type;
            const matchesCat = !this.filters.category || p.category === this.filters.category;
            const q = (this.filters.query || '').toLowerCase();
            const matchesQuery = !q || p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
            return matchesType && matchesCat && matchesQuery;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-10 text-zinc-500">Nenhum imóvel encontrado.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(p => `
            <div class="bg-darkCard rounded-3xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all cursor-pointer relative" onclick="app.showDetail(${p.id})">
                <button onclick="app.toggleFavorite(event, ${p.id})" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center z-10 hover:scale-110 transition-transform">
                    <i class="fas fa-heart ${this.favorites.includes(p.id) ? 'text-red-500' : 'text-white'}"></i>
                </button>
                <img src="${p.images[0]}" class="w-full h-36 md:h-48 object-cover">
                <div class="p-4">
                    <span class="text-[9px] uppercase tracking-widest text-primary font-bold bg-primary/10 px-2 py-1 rounded-lg">${p.category}</span>
                    <h3 class="mt-2 text-sm font-bold truncate">${p.title}</h3>
                    <p class="text-zinc-500 text-[10px] mt-1 truncate"><i class="fas fa-map-marker-alt text-primary/70"></i> ${p.address}</p>
                    <div class="flex justify-between items-center mt-4">
                        <span class="text-base font-black text-primary">R$ ${p.price.toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            </div>`).join('');
    },

    showDetail: function(id) {
        this.updateHeaderNav('clear');
        const p = this.properties.find(x => x.id == id);
        const content = document.getElementById('app-content');
        window.scrollTo(0, 0);

        content.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-6">
                <button onclick="app.showHome()" class="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>

                <div class="rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <img id="main-photo" src="${p.images[0]}" class="w-full h-[300px] md:h-[500px] object-cover">
                </div>

                <div class="grid grid-cols-4 md:grid-cols-6 gap-3">
                    ${p.images.map(img => `<img src="${img}" class="h-20 w-full object-cover rounded-2xl cursor-pointer hover:opacity-80 transition-opacity" onclick="document.getElementById('main-photo').src='${img}'">`).join('')}
                </div>

                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex-1">
                        <h1 class="text-3xl font-black">${p.title}</h1>
                        <div class="flex flex-wrap items-center gap-3 mt-1">
                            <p class="text-zinc-400"><i class="fas fa-map-marker-alt text-primary"></i> ${p.address}</p>
                            <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}')" class="text-[10px] bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-bold hover:bg-primary hover:text-black transition-all">
                                <i class="fas fa-external-link-alt mr-1"></i> VER NO MAPA
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <button onclick="app.toggleFavorite(event, ${p.id})" class="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <i class="fas fa-heart text-xl ${this.favorites.includes(p.id) ? 'text-red-500' : 'text-zinc-400'}"></i>
                        </button>
                        <span class="text-4xl font-black text-primary whitespace-nowrap">R$ ${p.price.toLocaleString('pt-BR')}</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-darkCard p-6 rounded-3xl border border-white/5">
                        <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Área</p>
                        <p class="text-xl font-bold mt-1">${p.area} m²</p>
                    </div>
                    <div class="bg-darkCard p-6 rounded-3xl border border-white/5">
                        <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">IPTU</p>
                        <p class="text-xl font-bold mt-1">R$ ${p.iptu}</p>
                    </div>
                    <div class="bg-darkCard p-6 rounded-3xl border border-white/5 col-span-2">
                        <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Financiamento</p>
                        <p class="text-xl font-bold mt-1">${p.financing}</p>
                    </div>
                </div>

                <div class="bg-darkCard p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                    <div>
                        <h3 class="text-xl font-bold mb-4">Caracteristicas do Imóvel</h3>
                        <p class="text-zinc-400 leading-relaxed">${p.leisure ? p.leisure.replace(/,/g, ' • ') : 'Não informado.'}</p>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/5">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-bed text-primary text-xl"></i>
                            <div>
                                <p class="text-[10px] text-zinc-500 uppercase font-bold">Quartos</p>
                                <p class="font-bold">${p.beds}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <i class="fas fa-bath text-primary text-xl"></i>
                            <div>
                                <p class="text-[10px] text-zinc-500 uppercase font-bold">Banheiros</p>
                                <p class="font-bold">${p.baths}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <i class="fas fa-shower text-primary text-xl"></i>
                            <div>
                                <p class="text-[10px] text-zinc-500 uppercase font-bold">Suítes</p>
                                <p class="font-bold">${p.suites}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <i class="fas fa-utensils text-primary text-xl"></i>
                            <div>
                                <p class="text-[10px] text-zinc-500 uppercase font-bold">Cozinhas</p>
                                <p class="font-bold">${p.kitchens}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <i class="fas fa-layer-group text-primary text-xl"></i>
                            <div>
                                <p class="text-[10px] text-zinc-500 uppercase font-bold">Andares</p>
                                <p class="font-bold">${p.floors}</p>
                            </div>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-white/5">
                        <h3 class="text-lg font-bold mb-2">Documentação</h3>
                        <p class="text-zinc-400">${p.docs || 'Consulte o corretor.'}</p>
                    </div>
                </div>

                ${p.type === 'COMPRAR' && p.financing.includes('Caixa Econômica Federal') ? `
                <button onclick="window.open('${CONFIG.CAIXA_LINK}')" class="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
                    <img src="caixa.png" class="h-8 w-auto grayscale group-hover:grayscale-0 transition-all">
                    <span class="text-sm font-bold text-zinc-300">Simular Financiamento</span>
                    <i class="fas fa-external-link-alt text-[10px] text-zinc-500"></i>
                </button>` : ''}

                <button class="w-full bg-primary text-black font-black py-5 rounded-3xl hover:brightness-110 transition-all shadow-lg shadow-primary/20" onclick="window.open('https://wa.me/${CONFIG.WHATSAPP}?text=Interesse: ${p.title}')">
                    TENHO INTERESSE
                </button>
            </div>
        `;
    },

    showFavorites: function() {
        this.updateHeaderNav('clear');
        const content = document.getElementById('app-content');
        const favs = this.properties.filter(p => this.favorites.includes(p.id));
        content.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 md:px-6">
                <h1 class="text-3xl font-black mb-8 uppercase tracking-tighter">Meus Favoritos</h1>
                <div id="property-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"></div>
            </div>
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

        // Se estiver na tela de favoritos, re-renderiza para remover o card
        const isFavPage = document.querySelector('h1')?.innerText === 'MEUS FAVORITOS';
        if (isFavPage) {
            this.showFavorites();
        } else {
            this.renderGrid();
            // Se estiver na tela de detalhes, atualiza o ícone do coração
            const heartIcon = e.currentTarget.querySelector('i');
            if (heartIcon) {
                heartIcon.className = `fas fa-heart ${this.favorites.includes(id) ? 'text-red-500' : 'text-zinc-400'}`;
            }
        }
    },

    showAbout: function() {
        this.updateHeaderNav('clear');
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="max-w-2xl mx-auto text-center space-y-8 py-10">
                <div class="relative w-32 h-32 mx-auto bg-primary/20 rounded-full flex items-center justify-center border-4 border-primary shadow-2xl shadow-primary/30">
                    <img src="logo.png" class="w-24 h-auto">
                </div>
                <div>
                    <h1 class="text-4xl font-black mb-4 uppercase tracking-tighter">${CONFIG.SITE_NAME}</h1>
                    <p class="text-zinc-400 text-lg leading-relaxed font-medium">Sua parceira ideal na busca pelo lar dos seus sonhos. Atuamos com transparência, agilidade e foco total em resultados exclusivos.</p>
                </div>
            </div>
        `;
    },

    showSell: function() {
        this.updateHeaderNav('vender');
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div class="max-w-2xl mx-auto py-10 px-4">
                <div class="text-center mb-10">
                    <h1 class="text-4xl font-black mb-2">QUER VENDER?</h1>
                    <p class="text-zinc-500 font-medium">Preencha os campos para atendimento prioritário via WhatsApp.</p>
                </div>
                <div class="bg-darkCard p-10 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
                    <div>
                        <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Seu Nome</label>
                        <input type="text" id="v-nome" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 focus:border-primary outline-none transition-all">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">WhatsApp</label>
                        <input type="text" id="v-contato" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 focus:border-primary outline-none transition-all" placeholder="(XX) 99999-9999">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Sobre o Imóvel</label>
                        <textarea id="v-msg" rows="4" class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 focus:border-primary outline-none transition-all" placeholder="Bairro, quartos, valor..."></textarea>
                    </div>
                    <button onclick="app.abrirWhatsappVenda()" class="w-full bg-primary text-black font-black py-5 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20">
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

    resetHome: function() {
        this.filters = { type: '', category: '', query: '' };
        this.showHome();
    },

    showContact: () => window.open(`https://wa.me/${CONFIG.WHATSAPP}`),

    setFilter: function(k, v) {
        this.filters[k] = v;
        this.showHome();
        this.updateHeaderNav();
    },
    updateHeaderNav: function(forcedPage = null) {
        const navs = {
            'comprar': document.getElementById('nav-comprar'),
            'alugar': document.getElementById('nav-alugar'),
            'vender': document.getElementById('nav-vender')
        };

        // Reset
        Object.values(navs).forEach(el => {
            if (el) {
                el.classList.remove('text-primary', 'font-black');
                el.classList.add('text-zinc-400');
            }
        });

        // Highlight
        if (forcedPage && navs[forcedPage]) {
            navs[forcedPage].classList.add('text-primary', 'font-black');
            navs[forcedPage].classList.remove('text-zinc-400');
        } else if (this.filters.type === 'COMPRAR') {
            navs['comprar'].classList.add('text-primary', 'font-black');
            navs['comprar'].classList.remove('text-zinc-400');
        } else if (this.filters.type === 'ALUGAR') {
            navs['alugar'].classList.add('text-primary', 'font-black');
            navs['alugar'].classList.remove('text-zinc-400');
        }
    },

    handleSearch: function(e) { this.filters.query = e.target.value; this.renderGrid(); },
    startCarousel: function() {
        setInterval(() => {
            const slides = document.querySelectorAll('.carousel-slide');
            if(slides.length <= 1) return;
            slides[this.carouselIndex].style.opacity = '0';
            this.carouselIndex = (this.carouselIndex + 1) % slides.length;
            slides[this.carouselIndex].style.opacity = '1';
        }, 5000);
    },
    showToast: function(msg) {
        const t = document.getElementById('toast');
        if(t) {
            t.innerText = msg;
            t.style.display = 'block'; t.style.opacity = '1';
            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.style.display = 'none', 500); }, 3000);
        }
    }
};

app.init();
