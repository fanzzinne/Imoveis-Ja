const CONFIG = {
    SITE_NAME: 'IMÓVEIS JÁ',
    PRIMARY_COLOR: '#f59e0b',
    WHATSAPP: '5521988137667',
    API_URL: 'https://script.google.com/macros/s/AKfycbwUCZbHHe9ku_aKkCmaQ_8E2lpZlzr7pqZ3aBCnp-PgA0Yqb2FHHSNM7TE8d9k7GTueRQ/exec'
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
                    // Tenta encontrar as imagens em várias colunas possíveis
                    let rawImages = p["Imagens"] || p["Imagens "] || p["Link"] || p["Fotos"] || "";

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

                    return {
                        id: index + 1,
                        title: p["Título"] || p["Titulo"] || "Sem título",
                        category: p["Categoria"] || "Outros",
                        type: p["Finalidade"] || "COMPRAR",
                        featured: p["Destaque?"] === "SIM" || p["Destaque?"] === true || p["Destaque?"] === "Sim",
                        price: parseFloat(p["Valor R$"].toString().replace(/[^\d]/g, '')) || 0,
                        iptu: p["IPTU"] || 0,
                        financing: p["Financiamento?"] || "Consulte",
                        area: p["Área m²"] || p["Area m2"] || 0,
                        beds: p["Quartos"] || 0,
                        suites: p["Suítes"] || p["Suites"] || 0,
                        baths: p["Banheiros"] || 0,
                        kitchens: p["Cozinha"] || 0,
                        floors: p["Andares"] || 1,
                        leisure: p["Lazer"] || "",
                        address: p["Endereço"] || p["Endereco"] || "",
                        docs: p["Documentação"] || "",
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
                    ${['Casa','Apartamento','Kitnet','Terreno'].map(c => `
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
        const p = this.properties.find(x => x.id == id);
        const content = document.getElementById('app-content');
        window.scrollTo(0, 0);

        content.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-6">
                <button onclick="app.showHome()" class="flex items-center gap-2 text-zinc-400">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
                <img id="main-photo" src="${p.images[0]}" class="w-full h-[300px] md:h-[500px] object-cover rounded-[2.5rem]">
                <div class="grid grid-cols-4 gap-3">
                    ${p.images.map(img => `<img src="${img}" class="h-20 w-full object-cover rounded-2xl cursor-pointer" onclick="document.getElementById('main-photo').src='${img}'">`).join('')}
                </div>
                <h1 class="text-3xl font-black">${p.title}</h1>
                <p class="text-primary text-4xl font-black">R$ ${p.price.toLocaleString('pt-BR')}</p>
                <div class="bg-darkCard p-8 rounded-[2.5rem] border border-white/5">
                    <h3 class="text-xl font-bold mb-4">Detalhes</h3>
                    <p class="text-zinc-400">${p.leisure}</p>
                    <div class="grid grid-cols-2 gap-4 mt-6">
                        <div class="bg-white/5 p-4 rounded-2xl">Área: ${p.area}m²</div>
                        <div class="bg-white/5 p-4 rounded-2xl">Quartos: ${p.beds}</div>
                    </div>
                </div>
                <button class="w-full bg-primary text-black font-black py-5 rounded-3xl" onclick="window.open('https://wa.me/${CONFIG.WHATSAPP}?text=Interesse: ${p.title}')">
                    TENHO INTERESSE
                </button>
            </div>
        `;
    },

    setFilter: function(k, v) { this.filters[k] = v; this.showHome(); },
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
