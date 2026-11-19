// =============================================
// APP - managerJARDINSCare
// Ponto de entrada e núcleo da aplicação
// Versão 3.4 - Correção: re-renderização de cards ao trocar de aba de métricas
// =============================================

// =============================================
// VARIÁVEIS GLOBAIS DO MANAGER
// =============================================
var managerApp = {
    // Dados principais
    assistidosList: [],
    currentAssistido: null,
    dashboardCache: null,
    
    // 🔥 CONTROLE PARA EVITAR MÚLTIPLAS ATUALIZAÇÕES
    _atualizandoGrafico: false,
    _ultimoMesGrafico: null,
    
    // 🆕 CONTROLES DE ESTADO E CACHE
    mesReferenciaAtual: null,
    _ultimoMesDashboard: null,
    _cacheVersions: {
        assistidos: 0,
        leads: 0,
        receitas: 0,
        despesas: 0,
        dashboard: 0
    },
    _dashboardVersao: 0,
    _carregandoDashboard: false,
    _eventListenersConfigurados: false,
    _refreshEmAndamento: false,
    _carregamentoInicialConcluido: false,
    
    // 🔥 CONTROLE DE DEBOUNCE PARA ATUALIZAÇÃO FINANCEIRA
    _refreshFinanceiroTimeout: null,
    
    // 🆕 CACHE DE PARÂMETROS OPERACIONAIS (Fase 1)
    _parametrosOpCache: null,
    
    // 🆕 CONTROLE DE VERSÃO DAS MÉTRICAS COMERCIAIS (evita cache stale)
    _metricasComerciaisVersao: 0,
    _leadsBroadcastChannel: null,
    _invalidacaoVisibilidadeConfigurada: false,
    
    // 🆕 CACHE ISOLADO DE MÉTRICAS DE LEADS (evita sobrescrever metricasComerciais)
    _metricasLeadsCache: null,
    
    // 🛡️ FLAG DE CONTROLE DE NAVEGAÇÃO (evita bug de navegar durante o boot)
    _bootConcluido: false,
    
    // Dados financeiros
    categoriasDespesas: [],
    tiposReceitaAvulsa: [],
    formasPagamento: [],
    
    // Dados de leads
    leadsList: [],
    metadadosLeads: null,
    leadsFiltrados: [],
    metricasComerciais: null,
    
    // Dados de fluxo de caixa
    dadosFluxoCaixa: null,
    ultimoCenario: null,
    cenariosSalvos: {},
    
    // Dados de compartilhamento
    dadosAssistidoCompartilhar: null,
    gruposWhatsApp: [],
    
    // Cache
    cacheDiaVencimento: {},
    
    // Ordenações
    ordenacaoLeads: { coluna: 'nome', direcao: 'asc' },
    ordenacaoDespesas: { coluna: 'data', direcao: 'asc' },
    ordenacaoReceitas: { coluna: 'data', direcao: 'asc' },
    ordenacaoLeadsAtrasados: { coluna: 'lead', direcao: 'asc' },
    
    // Alertas
    alertasContratos: [],
    alertasContratosExpandido: false,
    
    // Últimas combinações da calculadora reversa
    _ultimasCombinacoes: [],
    
    // Gráficos
    chartEvolucao: null,
    chartPizza: null,
    chartMargem: null,
    chartFunil: null,
    chartResultadosEvolucao: null,
    chartLeadsOrigem: null,
    chartEvolucaoFaturamento: null,
    chartFluxoCaixa: null,
    chartFluxoCaixaSemanal: null,
    chartSimulacaoPage: null,
    chartEvolucaoLeads: null,
    chartEvolucaoMetricas: null,
    chartProjecaoCenarios: null,

    // =============================================
    // METAS
    // =============================================
    metas: {
        faturamento: 50000,
        margem: 25,
        leads: 30,
        conversao: 5,
        diasAlerta: 15,
        churnMensal: 0.33,
        ticketMedioNovoLead: 5000
    },

    // =============================================
    // CAMPOS OBRIGATÓRIOS
    // =============================================
    camposObrigatorios: [
        { id: 'campoNome', nome: 'NOME', aba: 'dados' },
        { id: 'campoDataNasc', nome: 'DATA NASCIMENTO', aba: 'dados' },
        { id: 'campoDadosAnag', nome: 'ENDEREÇO', aba: 'dados' },
        { id: 'campoResponsaveis', nome: 'FAMILIARES RESPONSÁVEIS', aba: 'dados' },
        { id: 'campoStatus', nome: 'STATUS', aba: 'dados' },
        { id: 'campoInicioContrato', nome: 'INÍCIO CONTRATO', aba: 'contrato' },
        { id: 'campoVctoContrato', nome: 'VENCIMENTO CONTRATO', aba: 'contrato' },
        { id: 'campoPeriodo', nome: 'PERÍODO CONTRATADO', aba: 'contrato' },
        { id: 'campoTipoContrato', nome: 'TIPO CONTRATO', aba: 'contrato' },
        { id: 'campoPlantao', nome: 'PLANTÃO', aba: 'contrato' },
        { id: 'campoVlrPlantao', nome: 'VALOR PLANTÃO', aba: 'contrato' },
        { id: 'campoDiariasMes', nome: 'DIÁRIAS MÊS', aba: 'contrato' },
        { id: 'campoHoraEntrada', nome: 'HORA ENTRADA', aba: 'contrato' },
        { id: 'campoHoraSaida', nome: 'HORA SAÍDA', aba: 'contrato' },
        { id: 'campoDiaVencimento', nome: 'DIA VENCIMENTO', aba: 'contrato' },
        { id: 'campoPatrono', nome: 'PATRONO', aba: 'contrato' }
    ],

    // =============================================
    // MÉTODOS DE CACHE E ESTADO
    // =============================================
    
    setMesReferencia: function(mes) {
        if (!mes) return;
        
        var mudou = this.mesReferenciaAtual !== mes;
        this.mesReferenciaAtual = mes;
        
        if (mudou) {
            console.log('📅 Mês de referência alterado para:', mes);
            
            document.dispatchEvent(new CustomEvent('mesChanged', { 
                detail: { mes: mes, anterior: this._ultimoMesDashboard }
            }));
        }
    },
    
    getMesReferencia: function() {
        if (!this.mesReferenciaAtual) {
            var hoje = new Date();
            this.mesReferenciaAtual = hoje.getFullYear() + '-' + 
                                     String(hoje.getMonth() + 1).padStart(2, '0');
        }
        return this.mesReferenciaAtual;
    },
    
    invalidarCache: function(tipo) {
        if (this._cacheVersions[tipo] !== undefined) {
            this._cacheVersions[tipo]++;
            console.log('🔄 Cache "' + tipo + '" invalidado (versão ' + this._cacheVersions[tipo] + ')');
            
            if (tipo === 'dashboard' || tipo === 'assistidos' || tipo === 'leads' || 
                tipo === 'receitas' || tipo === 'despesas') {
                this.dashboardCache = null;
                this._dashboardVersao = 0;
                console.log('🔄 Dashboard cache invalidado');
            }
            
            if (tipo === 'receitas' || tipo === 'despesas' || tipo === 'dashboard') {
                this.dadosFluxoCaixa = null;
                console.log('🔄 Fluxo de caixa cache invalidado');
            }
        }
    },

    // =============================================
    // 🆕 CACHE DE PARÂMETROS OPERACIONAIS (Fase 1)
    // =============================================
    getParametrosOpCache: function(forceRefresh) {
        var self = this;
        
        if (!forceRefresh && this._parametrosOpCache) {
            return Promise.resolve(this._parametrosOpCache);
        }
        
        return API.getParametrosOperacionais()
            .then(function(data) {
                if (data.result === 'success' && data.parametros) {
                    self._parametrosOpCache = data.parametros;
                    console.log('✅ Parâmetros operacionais em cache:', data.parametros);
                    return data.parametros;
                } else {
                    var fallback = {
                        despesasOperacionais: 20000,
                        aliquotaImposto: 6,
                        cacMedio: 500,
                        mesesAmortizacaoCac: 12
                    };
                    self._parametrosOpCache = fallback;
                    console.warn('⚠️ Usando fallback de parâmetros operacionais');
                    return fallback;
                }
            })
            .catch(function(error) {
                console.warn('⚠️ Erro ao buscar parâmetros operacionais, usando fallback:', error);
                var fallback = {
                    despesasOperacionais: 20000,
                    aliquotaImposto: 6,
                    cacMedio: 500,
                    mesesAmortizacaoCac: 12
                };
                self._parametrosOpCache = fallback;
                return fallback;
            });
    },
    
    invalidarParametrosOpCache: function() {
        this._parametrosOpCache = null;
        console.log('🔄 Cache de parâmetros operacionais invalidado');
    },

    // =============================================
    // 🆕 CONTROLE DE VERSÃO DAS MÉTRICAS COMERCIAIS
    // =============================================
    // Gera uma "impressão digital" dos leads atuais (quantidade + id:status).
    // Se a assinatura mudar, o cache de métricas comerciais é considerado stale.
    // 🔥 Retorna 'EMPTY' quando não há leads — marcador explícito para forçar recálculo.
    _calcularVersaoLeads: function() {
        var leads = this.leadsList || [];
        if (leads.length === 0) {
            return 'EMPTY';
        }
        return leads.length + '_' + leads.map(function(l) {
            return l.id + ':' + l.status;
        }).join('|');
    },

    // Invalida o cache de métricas quando a aba volta a ficar visível
    // e os leads mudaram (ex: usuário editou em outra janela/aba).
    _configurarInvalidacaoPorVisibilidade: function() {
        var self = this;
        
        if (this._invalidacaoVisibilidadeConfigurada) return;
        this._invalidacaoVisibilidadeConfigurada = true;
        
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                var pageMetricas = document.getElementById('page-metricas-comerciais');
                if (pageMetricas && pageMetricas.classList.contains('active')) {
                    var versaoAtual = self._calcularVersaoLeads();
                    if (versaoAtual !== self._metricasComerciaisVersao) {
                        console.log('🔄 Visibilidade retornou — invalidando cache de métricas');
                        self.metricasComerciais = null;
                        self.initMetricasComerciais();
                    }
                }
            }
        });
        
        console.log('✅ Invalidação por visibilidade configurada');
    },

    // Escuta broadcasts de outras abas para invalidar cache de leads/métricas
    _configurarBroadcastLeads: function() {
        var self = this;
        
        if (typeof BroadcastChannel === 'undefined') {
            console.warn('⚠️ BroadcastChannel não suportado');
            return;
        }
        
        if (this._leadsBroadcastChannel) {
            try { this._leadsBroadcastChannel.close(); } catch(e) {}
        }
        
        this._leadsBroadcastChannel = new BroadcastChannel('jardinscare_leads');
        
        this._leadsBroadcastChannel.onmessage = function(event) {
            if (event.data && event.data.type === 'leads_updated') {
                console.log('📡 Broadcast recebido: leads atualizados em outra aba');
                self.invalidarCache('leads');
                self.metricasComerciais = null;
                self._metricasComerciaisVersao = 0;
                
                var pageMetricas = document.getElementById('page-metricas-comerciais');
                if (pageMetricas && pageMetricas.classList.contains('active')) {
                    self.initMetricasComerciais();
                }
            }
        };
        
        console.log('✅ Broadcast de leads configurado');
    },

    // Notifica outras abas que os leads foram atualizados
    _notificarLeadsAtualizados: function() {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                if (!window._leadsNotifyChannel) {
                    window._leadsNotifyChannel = new BroadcastChannel('jardinscare_leads');
                }
                window._leadsNotifyChannel.postMessage({
                    type: 'leads_updated',
                    timestamp: Date.now()
                });
                console.log('📡 Broadcast enviado: leads atualizados');
            }
        } catch (e) {
            console.warn('⚠️ Erro ao enviar broadcast:', e);
        }
    },

    // =============================================
    // 🔥 RECONSTRUIR DASHBOARD CACHE (CORREÇÃO)
    // =============================================
    _reconstruirDashboardCache: function() {
        var self = this;
        
        console.log('🔨 Reconstruindo dashboardCache...');
        
        return API.getDashboardData()
            .then(function(dashboardData) {
                if (!dashboardData || dashboardData.result !== 'success') {
                    throw new Error('Erro ao buscar dados do dashboard');
                }
                
                var faturamentoTotal = 0;
                var custoDiretoTotal = 0;
                var assistidos = dashboardData.assistidos || [];
                
                var ativosMensais = assistidos.filter(function(a) {
                    return a.status === 'Ativo' && a.tipoContrato === 'MENSAL';
                });
                
                var promises = [];
                for (var i = 0; i < ativosMensais.length; i++) {
                    var assistido = ativosMensais[i];
                    var promise = API.getDadosAssistido(assistido.nome)
                        .then(function(detalhes) {
                            if (detalhes && detalhes.result === 'success') {
                                var vlrContrato = Utils.parseCurrencyToNumber(detalhes.vlrContrato);
                                var totalHrsMes = parseFloat(detalhes.totalHrsMes) || 0;
                                var vlrPlantao = Utils.parseCurrencyToNumber(detalhes.vlrPlantao);
                                faturamentoTotal += vlrContrato;
                                custoDiretoTotal += (totalHrsMes * vlrPlantao);
                            }
                        })
                        .catch(function(error) {
                            console.warn('Erro ao processar assistido:', assistido.nome, error.message);
                        });
                    promises.push(promise);
                }
                
                return Promise.all(promises).then(function() {
                    self.dashboardCache = {
                        assistidosAtivos: (dashboardData.resumo && dashboardData.resumo.ativos) || 0,
                        pcAtivos: (dashboardData.resumo && dashboardData.resumo.cuidadoresAtivos) || 0,
                        faturamento: faturamentoTotal,
                        custoDireto: custoDiretoTotal,
                        hasErrors: false,
                        assistidos: dashboardData.assistidos || []
                    };
                    
                    console.log('✅ dashboardCache reconstruído:', {
                        faturamento: Utils.formatCurrency(faturamentoTotal),
                        custoDireto: Utils.formatCurrency(custoDiretoTotal)
                    });
                });
            })
            .catch(function(error) {
                console.error('❌ Erro ao reconstruir dashboardCache:', error);
                throw error;
            });
    },

    // =============================================
    // 🔥 ATUALIZAÇÃO CENTRALIZADA APÓS OPERAÇÕES FINANCEIRAS
    // =============================================
    _atualizarTudoAposOperacaoFinanceira: function() {
        var self = this;
        
        if (this._refreshFinanceiroTimeout) {
            clearTimeout(this._refreshFinanceiroTimeout);
        }
        
        this._refreshFinanceiroTimeout = setTimeout(function() {
            var mesReferencia = self.getMesReferencia();
            console.log('🔄 Atualização centralizada - mês de referência:', mesReferencia);
            
            self.invalidarCache('receitas');
            self.invalidarCache('despesas');
            self.invalidarCache('dashboard');
            
            var precisaReconstruir = !self.dashboardCache || 
                                     self.dashboardCache.custoDireto === undefined ||
                                     self.dashboardCache.custoDireto === null;
            
            var reconstruirPromise = precisaReconstruir
                ? self._reconstruirDashboardCache()
                : Promise.resolve();
            
            reconstruirPromise
                .then(function() {
                    return self.carregarDadosFinanceirosPorMes(mesReferencia);
                })
                .then(function(data) {
                    self.renderizarDadosFinanceiros(data, mesReferencia);
                    self.carregarGraficosPorMes(mesReferencia);
                    
                    var fluxoPage = document.getElementById('page-fluxo-caixa');
                    if (fluxoPage && fluxoPage.classList.contains('active')) {
                        self.dadosFluxoCaixa = null;
                        self.carregarFluxoCaixa();
                    }
                    
                    console.log('✅ Dados financeiros atualizados com sucesso');
                })
                .catch(function(error) {
                    console.error('❌ Erro ao atualizar dados financeiros:', error);
                });
            
            self._refreshFinanceiroTimeout = null;
        }, 500);
    },

    // =============================================
    // INICIALIZAÇÃO
    // =============================================
    init: function() {
        console.log('🚀 Inicializando managerJARDINSCare v4.9 PWA...');
        console.log('✅ Versão 3.4 - Re-renderização de cards ao trocar de aba');
        console.log('✅ Usando Supabase como backend');
        
        var self = this;
        
        // 🛡️ BLOQUEAR NAVEGAÇÃO DURANTE O BOOT
        this._bootConcluido = false;
        
        // 🛡️ FORÇAR DASHBOARD ANTES DE QUALQUER COISA
        this._aplicarDashboardSilencioso();
        
        // Carregar estados salvos
        this.carregarEstadosOrdenacao();
        this.loadSidebarState();
        
        // Configurar evento de mudança de mês
        this.configurarEventoMesChanged();
        
        // 🆕 Configurar invalidação de cache por visibilidade e broadcast entre abas
        this._configurarInvalidacaoPorVisibilidade();
        this._configurarBroadcastLeads();
        
        // Configurar eventos (com segurança)
        this.setupEventListeners();
        
        // Configurar campos
        this.configurarCampos();
        
        // Inicializar módulos
        this.initDiasSemana();
        this.initPatologiaSelect();
        this.initMotivoDesligamento();
        this.initDespesas();
        this.initReceitasAvulsas();
        this.initLeads();
        this.initMetricasComerciais();
        this.configurarEventosOrdenacao();
        
        // 🔥 Inicializar Inteligência de Negócio
        if (typeof this.initInteligenciaNegocio === 'function') {
            this.initInteligenciaNegocio();
        }
        
        // Carregar listas auxiliares
        this.carregarListaAssistidos();
        this.carregarAssistidosParaFiltro();
        this.carregarMetadadosFinanceiros();
        
        // Carregar metas do Supabase
        this.carregarMetas();
        
        // Popular o dropdown de meses
        this.popularMesesReferencia();
        
        // Configurar botão WhatsApp
        this._configurarBotaoWhatsApp();
        
        // 🛡️ LIBERAR NAVEGAÇÃO APÓS 800ms
        setTimeout(function() {
            self._bootConcluido = true;
            console.log('🛡️ Boot concluído — navegação liberada');
            
            // Reforçar Dashboard após liberação
            self._aplicarDashboardSilencioso();
        }, 800);
        
        console.log('✅ managerJARDINSCare v4.9 PWA - Inicializado com sucesso!');
    },
    
    /**
     * 🛡️ Aplica o Dashboard de forma SILENCIOSA (sem flash visual)
     */
    _aplicarDashboardSilencioso: function() {
        var pages = document.querySelectorAll('.page');
        pages.forEach(function(p) { p.classList.remove('active'); });
        
        var dashPage = document.getElementById('page-dashboard');
        if (dashPage) dashPage.classList.add('active');
        
        var navItems = document.querySelectorAll('.sidebar-nav-item');
        navItems.forEach(function(n) { n.classList.remove('active'); });
        
        var dashNav = document.querySelector('.sidebar-nav-item[data-page="dashboard"]');
        if (dashNav) dashNav.classList.add('active');
        
        var titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = '📊 Dashboard Gerencial';
    },
    
    /**
     * Configura o evento global de mudança de mês
     */
    configurarEventoMesChanged: function() {
        if (this._eventListenersConfigurados) return;
        this._eventListenersConfigurados = true;
        
        var self = this;
        document.addEventListener('mesChanged', function(e) {
            var mes = e.detail.mes;
            console.log('📢 Evento mesChanged recebido:', mes);
            
            var dashboardPage = document.getElementById('page-dashboard');
            if (dashboardPage && dashboardPage.classList.contains('active')) {
                console.log('🔄 Dashboard ativo - recarregando dados para:', mes);
                self.atualizarPorMes(mes);
            }
            
            var fluxoPage = document.getElementById('page-fluxo-caixa');
            if (fluxoPage && fluxoPage.classList.contains('active')) {
                console.log('🔄 Fluxo de Caixa ativo - recarregando para:', mes);
                setTimeout(function() {
                    self.carregarFluxoCaixa();
                }, 100);
            }
        });
        
        console.log('✅ Evento mesChanged configurado');
    },

    // =============================================
    // 🔥 CONFIGURAR BOTÃO WHATSAPP
    // =============================================
    _configurarBotaoWhatsApp: function() {
        var self = this;
        var btnWhatsApp = document.getElementById('btnWhatsAppAssistido');
        
        if (btnWhatsApp) {
            var novoBtn = btnWhatsApp.cloneNode(true);
            btnWhatsApp.parentNode.replaceChild(novoBtn, btnWhatsApp);
            
            novoBtn.addEventListener('click', function() {
                self.abrirModalPersonalCare();
            });
            
            console.log('✅ Botão WhatsApp configurado');
        } else {
            console.warn('⚠️ Botão WhatsApp não encontrado no DOM');
        }
    },

    // =============================================
    // POPULAR MESES DE REFERÊNCIA
    // =============================================
    popularMesesReferencia: function() {
        var select = document.getElementById('mesReferenciaSelect');
        if (!select) {
            console.warn('⚠️ mesReferenciaSelect não encontrado, aguardando...');
            var self = this;
            setTimeout(function() {
                self.popularMesesReferencia();
            }, 500);
            return;
        }
        
        var hoje = new Date();
        var meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        var options = '';
        for (var i = 0; i < 12; i++) {
            var mes = hoje.getMonth() - i;
            var ano = hoje.getFullYear();
            if (mes < 0) {
                mes += 12;
                ano--;
            }
            var valor = ano + '-' + String(mes + 1).padStart(2, '0');
            var label = meses[mes] + '/' + ano;
            var selected = (i === 0) ? 'selected' : '';
            options += '<option value="' + valor + '" ' + selected + '>' + label + '</option>';
        }
        select.innerHTML = options;
        
        var self = this;
        
        select.removeEventListener('change', this._mesChangeHandler);
        
        this._mesChangeHandler = function() {
            var mesSelecionado = this.value;
            if (mesSelecionado) {
                self.setMesReferencia(mesSelecionado);
                if (self._carregamentoInicialConcluido) {
                    self.atualizarPorMes(mesSelecionado);
                } else {
                    self.carregarInicial(mesSelecionado);
                }
            }
        };
        
        select.addEventListener('change', this._mesChangeHandler);
        
        var mesInicial = select.value;
        if (mesInicial) {
            this.setMesReferencia(mesInicial);
            var self = this;
            setTimeout(function() {
                if (!self._carregamentoInicialConcluido) {
                    self.carregarInicial(mesInicial);
                }
            }, 300);
        }
    },

    // =============================================
    // NAVEGAÇÃO (OTIMIZADA E PROTEGIDA)
    // =============================================
    navigate: function(page) {
        if (!this._bootConcluido && !this._navegacaoManualAutorizada) {
            return;
        }
        
        console.log('📄 Navegando para página:', page);
        
        var navItems = document.querySelectorAll('.sidebar-nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].classList.remove('active');
        }
        var activeNav = document.querySelector('.sidebar-nav-item[data-page="' + page + '"]');
        if (activeNav) activeNav.classList.add('active');
        
        var pageElement = document.getElementById('page-' + page);
        if (pageElement && pageElement.classList.contains('active')) {
            console.log('ℹ️ Página já está ativa:', page);
            
            if (page === 'dashboard' && this.mesReferenciaAtual) {
                this.carregarGraficosPorMes(this.mesReferenciaAtual);
            }
            return;
        }
        
        var pages = document.querySelectorAll('.page');
        for (var j = 0; j < pages.length; j++) {
            pages[j].classList.remove('active');
        }
        if (pageElement) pageElement.classList.add('active');
        
        var titles = {
            dashboard: '📊 Dashboard Gerencial',
            assistidos: '🏥 Assistidos',
            leads: '⭐ Leads',
            'metricas-comerciais': '📈 Métricas Comerciais',
            despesas: '💰 Despesas',
            'receitas-avulsas': '📋 Receitas',
            resultados: '📈 Resultados',
            'fluxo-caixa': '💹 Fluxo de Caixa e Previsibilidade',
            'simulacao-cenarios': '🧠 Inteligência de Negócio'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;
        
        var self = this;
        
        if (page === 'dashboard') {
            if (this.mesReferenciaAtual) {
                console.log('📊 Recarregando dashboard para o mês:', this.mesReferenciaAtual);
                if (this._carregamentoInicialConcluido) {
                    this.atualizarPorMes(this.mesReferenciaAtual);
                } else {
                    this.carregarInicial(this.mesReferenciaAtual);
                }
            }
        } else if (page === 'leads') {
            if (this.leadsList.length > 0 && this.metricasComerciais) {
                console.log('📊 Usando dados de leads em cache');
                this.renderizarMetricasComerciais(this.metricasComerciais);
                this.renderLeads();
            } else {
                this.initLeads();
            }
        } else if (page === 'metricas-comerciais') {
            // 🔥 Invalidação robusta do cache
            var versaoAtual = this._calcularVersaoLeads();
            var versaoCache = this._metricasComerciaisVersao;
            
            if (versaoAtual === 'EMPTY' || versaoAtual !== versaoCache || !this.metricasComerciais) {
                console.log('🔄 Métricas Comerciais: cache stale, vazio ou inexistente. Recalculando...');
                console.log('   versaoAtual:', versaoAtual);
                console.log('   versaoCache:', versaoCache);
                this.metricasComerciais = null;
                this.initMetricasComerciais();
            } else {
                console.log('📊 Métricas Comerciais: cache válido, reutilizando');
                this.renderizarMetricasComerciais(this.metricasComerciais);
            }
        } else if (page === 'despesas') {
            this.renderDespesas();
        } else if (page === 'receitas-avulsas') {
            this.renderReceitasAvulsas();
        } else if (page === 'fluxo-caixa') {
            if (this.dadosFluxoCaixa) {
                this.renderizarFluxoCaixa(this.dadosFluxoCaixa);
            } else {
                this.showProgressBarFluxo();
                this.carregarFluxoCaixa();
            }
} else if (page === 'simulacao-cenarios') {
    if (typeof this.initInteligenciaNegocio === 'function') {
        this.initInteligenciaNegocio();
    }
    
    if (typeof this.carregarInteligenciaNegocio === 'function') {
        this.carregarInteligenciaNegocio();
    }
    
    if (typeof this._resetarAbaInteligencia === 'function') {
        this._resetarAbaInteligencia();
    }
}
    },
    
    /**
     * 🛡️ Reset da aba de Inteligência para "Painel"
     */
    _resetarAbaInteligencia: function() {
        var tabs = document.querySelectorAll('[data-tab-inteligencia]');
        tabs.forEach(function(t) {
            if (t.getAttribute('data-tab-inteligencia') === 'painel') {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        
        var containers = ['inteligenciaTabPainel', 'inteligenciaTabEquilibrio', 
                          'inteligenciaTabSimulador', 'inteligenciaTabProjecao'];
        containers.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.style.display = (id === 'inteligenciaTabPainel') ? 'block' : 'none';
            }
        });
    },

    // =============================================
    // CONFIGURAÇÃO DE CAMPOS
    // =============================================
    configurarCampos: function() {
        var timeOptions = Utils.generateTimeOptions();
        var campoHoraEntrada = document.getElementById('campoHoraEntrada');
        var campoHoraSaida = document.getElementById('campoHoraSaida');
        if (campoHoraEntrada) campoHoraEntrada.innerHTML = timeOptions;
        if (campoHoraSaida) campoHoraSaida.innerHTML = timeOptions;
        
        var currencyFields = ['campoVlrPlantao', 'campoVlrContrato'];
        for (var i = 0; i < currencyFields.length; i++) {
            var el = document.getElementById(currencyFields[i]);
            if (el) Utils.applyCurrencyMask(el);
        }
        
        var dateFields = [
            'campoDataNasc', 'campoInicioContrato', 'campoVctoContrato', 
            'campoVisitaENF', 'campoVisitaDIR', 'campoDataConsultas',
            'campoDataCriacao'
        ];
        for (var j = 0; j < dateFields.length; j++) {
            var elDate = document.getElementById(dateFields[j]);
            if (elDate) Utils.applyDateMask(elDate);
        }
        
        var metaResultadoInput = document.getElementById('simMetaResultadoReverso');
        if (metaResultadoInput) Utils.applyCurrencyMask(metaResultadoInput);
    },

    // =============================================
    // SIDEBAR
    // =============================================
    loadSidebarState: function() {
        var saved = localStorage.getItem('manager_sidebar_collapsed');
        if (saved === 'collapsed') {
            var sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.add('sidebar-collapsed');
        }
    },

    toggleSidebar: function() {
        var sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('sidebar-collapsed');
        var newState = sidebar.classList.contains('sidebar-collapsed') ? 'collapsed' : 'expanded';
        localStorage.setItem('manager_sidebar_collapsed', newState);
    },

    // =============================================
    // ESTADOS DE ORDENAÇÃO
    // =============================================
    carregarEstadosOrdenacao: function() {
        var savedLeads = localStorage.getItem('manager_ordenacao_leads');
        if (savedLeads) {
            try {
                this.ordenacaoLeads = JSON.parse(savedLeads);
            } catch(e) {}
        }
        
        var savedDespesas = localStorage.getItem('manager_ordenacao_despesas');
        if (savedDespesas) {
            try {
                this.ordenacaoDespesas = JSON.parse(savedDespesas);
            } catch(e) {}
        }
        
        var savedReceitas = localStorage.getItem('manager_ordenacao_receitas');
        if (savedReceitas) {
            try {
                this.ordenacaoReceitas = JSON.parse(savedReceitas);
            } catch(e) {}
        }
    },

    salvarEstadoOrdenacao: function(tipo, coluna, direcao) {
        var estado = { coluna: coluna, direcao: direcao };
        if (tipo === 'leads') {
            this.ordenacaoLeads = estado;
            localStorage.setItem('manager_ordenacao_leads', JSON.stringify(estado));
        } else if (tipo === 'despesas') {
            this.ordenacaoDespesas = estado;
            localStorage.setItem('manager_ordenacao_despesas', JSON.stringify(estado));
        } else if (tipo === 'receitas') {
            this.ordenacaoReceitas = estado;
            localStorage.setItem('manager_ordenacao_receitas', JSON.stringify(estado));
        }
    },
	    // =============================================
    // EVENT LISTENERS
    // =============================================
    setupEventListeners: function() {
        var self = this;
        
        function safeAddEventListener(elementId, event, handler) {
            var el = document.getElementById(elementId);
            if (el) {
                el.addEventListener(event, handler);
                return true;
            } else {
                console.warn('⚠️ Elemento não encontrado:', elementId);
                return false;
            }
        }
        
        // Sidebar toggle
        safeAddEventListener('sidebarToggleBtn', 'click', function() { 
            self.toggleSidebar(); 
        });
        
        // Refresh
        safeAddEventListener('refreshBtn', 'click', function() {
            if (self._refreshEmAndamento) {
                Utils.showToast('⏳ Refresh já em andamento...', 'info');
                return;
            }
            self._refreshEmAndamento = true;
            
            self._carregamentoInicialConcluido = false;
            self._progressBarFechada = false;
            self._progressCallbacks = [];
            
            self.invalidarCache('dashboard');
            self.invalidarCache('assistidos');
            self.invalidarCache('leads');
            self.invalidarCache('receitas');
            self.invalidarCache('despesas');
            self.invalidarParametrosOpCache();
            
            // 🔥 Invalidar cache de métricas comerciais
            self.metricasComerciais = null;
            self._metricasComerciaisVersao = 0;
            
            var mesAtual = self.getMesReferencia();
            if (mesAtual) {
                self.navigate('dashboard');
                self.carregarInicial(mesAtual);
            } else {
                self.navigate('dashboard');
                var hoje = new Date();
                mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
                self.carregarInicial(mesAtual);
            }
            
            self.carregarListaAssistidos();
            self.carregarAssistidosParaFiltro();
            self.initLeads();
            
            setTimeout(function() {
                self._refreshEmAndamento = false;
            }, 5000);
            
            Utils.showToast('✅ Dados atualizados!');
        });
        
        // Retry dashboard
        safeAddEventListener('retryDashboardBtn', 'click', function() {
            var mesAtual = self.getMesReferencia();
            if (mesAtual) {
                self.invalidarCache('dashboard');
                self.carregarInicial(mesAtual);
            }
        });
        
        // 🔥 Navegação da sidebar com autorização manual
        var navItems = document.querySelectorAll('.sidebar-nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].addEventListener('click', function() {
                self._navegacaoManualAutorizada = true;
                self.navigate(this.getAttribute('data-page'));
            });
            navItems[i].addEventListener('mouseenter', function(e) {
                var rect = this.getBoundingClientRect();
                this.style.setProperty('--mouse-y', (rect.top + rect.height / 2) + 'px');
            });
        }
        
        // Modais
        safeAddEventListener('modalCloseBtn', 'click', function() { 
            self.fecharModal(); 
        });
        
        var modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === this) { self.fecharModal(); }
            });
        }
        
        safeAddEventListener('fecharModalAniversariantesBtn', 'click', function() {
            document.getElementById('modalAniversariantes').style.display = 'none';
        });
        safeAddEventListener('fecharModalAniversariantesBtnFooter', 'click', function() {
            document.getElementById('modalAniversariantes').style.display = 'none';
        });
        safeAddEventListener('fecharModalAlertasBtn', 'click', function() {
            document.getElementById('modalAlertasContratos').style.display = 'none';
        });
        safeAddEventListener('fecharModalAlertasBtnFooter', 'click', function() {
            document.getElementById('modalAlertasContratos').style.display = 'none';
        });
        safeAddEventListener('fecharModalCartaoBtn', 'click', function() {
            document.getElementById('modalVisualizarCartao').style.display = 'none';
        });
        
        var modalAniversariantes = document.getElementById('modalAniversariantes');
        if (modalAniversariantes) {
            modalAniversariantes.addEventListener('click', function(e) {
                if (e.target === this) { this.style.display = 'none'; }
            });
        }
        var modalAlertas = document.getElementById('modalAlertasContratos');
        if (modalAlertas) {
            modalAlertas.addEventListener('click', function(e) {
                if (e.target === this) { this.style.display = 'none'; }
            });
        }
        var modalCartao = document.getElementById('modalVisualizarCartao');
        if (modalCartao) {
            modalCartao.addEventListener('click', function(e) {
                if (e.target === this) { this.style.display = 'none'; }
            });
        }
        
        safeAddEventListener('btnVerTodosContratos', 'click', function() {
            self.navigate('assistidos');
            document.getElementById('modalAlertasContratos').style.display = 'none';
        });
        
        // ===== ASSISTIDOS =====
        safeAddEventListener('btnSalvarAssistido', 'click', function() { 
            self.salvarAssistido(); 
        });
        safeAddEventListener('btnCancelarAssistido', 'click', function() { 
            self.cancelarFormulario(); 
        });
        safeAddEventListener('btnImportarQuestionario', 'click', function() { 
            self.abrirModalImportarQuestionario(); 
        });
        safeAddEventListener('btnExcluirAssistido', 'click', function() { 
            self.excluirAssistido(); 
        });
        
        var tabs = document.querySelectorAll('.tab-inline');
        for (var j = 0; j < tabs.length; j++) {
            tabs[j].addEventListener('click', function(e) {
                self.mudarAba(e.currentTarget.getAttribute('data-tab'));
            });
        }
        
        // ===== LEADS =====
        var tabsConversao = document.querySelectorAll('[data-tab-conversao]');
        for (var k = 0; k < tabsConversao.length; k++) {
            tabsConversao[k].addEventListener('click', function(e) {
                var tab = this.getAttribute('data-tab-conversao');
                var tabelaContainer = document.getElementById('conversaoTabelaContainer');
                var relatorioContainer = document.getElementById('conversaoRelatorioContainer');
                if (tabelaContainer) tabelaContainer.style.display = tab === 'tabela' ? 'block' : 'none';
                if (relatorioContainer) relatorioContainer.style.display = tab === 'relatorio' ? 'block' : 'none';
                document.querySelectorAll('[data-tab-conversao]').forEach(function(btn) { btn.classList.remove('active'); });
                this.classList.add('active');
            });
        }
        
        // ===== DESPESAS =====
        safeAddEventListener('btnNovaDespesa', 'click', function() { 
            self.abrirModalDespesa(); 
        });
        safeAddEventListener('btnFiltrarDespesa', 'click', function() { 
            self.renderDespesas(); 
        });
        
        var filtroMesDespesa = document.getElementById('filtroMesDespesa');
        if (filtroMesDespesa) filtroMesDespesa.value = new Date().toISOString().slice(0, 7);
        
        // ===== RECEITAS =====
        safeAddEventListener('btnNovaReceitaAvulsa', 'click', function() { 
            self.abrirModalReceitaAvulsa(); 
        });
        safeAddEventListener('btnGerarReceitasMensais', 'click', function() { 
            self.gerarReceitasMensais(); 
        });
        safeAddEventListener('btnFiltrarReceita', 'click', function() { 
            self.renderReceitasAvulsas(); 
        });
        
        var filtroMesReceita = document.getElementById('filtroMesReceita');
        if (filtroMesReceita) filtroMesReceita.value = new Date().toISOString().slice(0, 7);
        
        // ===== RESULTADOS =====
        safeAddEventListener('btnCalcularResultado', 'click', function() { 
            self.calcularResultados(); 
        });
        
        var resultadoMes = document.getElementById('resultadoMes');
        if (resultadoMes) resultadoMes.value = new Date().toISOString().slice(0, 7);
        
        // =============================================
        // ===== MÉTRICAS COMERCIAIS (ABAS) - CRÍTICO =====
        // =============================================
        var tabsMetrica = document.querySelectorAll('[data-tab-metrica]');
        for (var m = 0; m < tabsMetrica.length; m++) {
            tabsMetrica[m].addEventListener('click', function(e) {
                var tab = this.getAttribute('data-tab-metrica');
                
                document.querySelectorAll('[data-tab-metrica]').forEach(function(btn) {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
                
                // 🔥 Esconde TODOS os containers
                var allContainers = [
                    'metricasEvolucaoContainer', 
                    'metricasOrigemContainer', 
                    'metricasAnalisePerdaContainer', 
                    'metricasResponsavelContainer', 
                    'metricasGuruContainer'
                ];
                allContainers.forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
                
                // 🔥 SEMPRE re-renderizar os cards no topo, garantindo dados atualizados
                if (self.metricasComerciais && typeof self.renderizarCardsPerformance === 'function') {
                    self.renderizarCardsPerformance(self.metricasComerciais, self.mesMetricasAtual);
                    console.log('✅ [ABAS] Cards de performance re-renderizados');
                }
                
                if (tab === 'evolucao') {
                    var elEvolucao = document.getElementById('metricasEvolucaoContainer');
                    if (elEvolucao) elEvolucao.style.display = 'block';
                    if (self.metricasComerciais && typeof self.renderizarEvolucaoMensal === 'function') {
                        self.renderizarEvolucaoMensal(self.metricasComerciais);
                    }
                } else if (tab === 'origem') {
                    // 🔥 Mostrar AMBOS os containers da aba "Por Origem"
                    var elOrigem = document.getElementById('metricasOrigemContainer');
                    var elPerda = document.getElementById('metricasAnalisePerdaContainer');
                    if (elOrigem) elOrigem.style.display = 'block';
                    if (elPerda) elPerda.style.display = 'block';
                    
                    if (self.metricasComerciais) {
                        if (typeof self.renderizarPerformancePorSegmento === 'function') {
                            self.renderizarPerformancePorSegmento(self.metricasComerciais);
                        }
                        if (typeof self.renderizarAnalisePerda === 'function') {
                            self.renderizarAnalisePerda(self.metricasComerciais);
                        }
                    }
                } else if (tab === 'responsavel') {
                    var elResp = document.getElementById('metricasResponsavelContainer');
                    if (elResp) elResp.style.display = 'block';
                    if (self.metricasComerciais && typeof self.renderizarPerformanceResponsavel === 'function') {
                        self.renderizarPerformanceResponsavel(self.metricasComerciais);
                    }
                } else if (tab === 'guru') {
                    var elGuru = document.getElementById('metricasGuruContainer');
                    if (elGuru) elGuru.style.display = 'block';
                    if (typeof self._coletarDadosGuru === 'function' && typeof self.renderizarGuru === 'function') {
                        var dadosGuru = self._coletarDadosGuru();
                        self.renderizarGuru({ dadosGuru: dadosGuru }, self.mesMetricasAtual || '2026-09');
                    }
                }
            });
        }
        
        // ===== FLUXO DE CAIXA =====
        safeAddEventListener('btnAtualizarFluxoCaixa', 'click', function() {
            self.invalidarCache('receitas');
            self.invalidarCache('despesas');
            self.dadosFluxoCaixa = null;
            self.showProgressBarFluxo();
            self.updateProgressFluxo(0, 10);
            self.carregarFluxoCaixa();
            Utils.showToast('🔄 Dados atualizados!');
        });
        
        safeAddEventListener('btnSimularCenario', 'click', function() {
            self.abrirSimulacao();
        });
        
safeAddEventListener('btnSimularPerda', 'click', function() {
    if (typeof managerApp.executarSimulacaoPerda === 'function') {
        managerApp.executarSimulacaoPerda();
    } else if (typeof managerApp.simularPerdaContrato === 'function') {
        managerApp.simularPerdaContrato();
    } else {
        console.warn('⚠️ Função de simulação de perda não encontrada');
    }
});

safeAddEventListener('btnLimparSimulacaoPerda', 'click', function() {
    if (typeof managerApp.limparSimulacaoPerda === 'function') {
        managerApp.limparSimulacaoPerda();
    }
});

safeAddEventListener('btnSelecionarTodosPerda', 'click', function() {
    if (typeof managerApp.selecionarTodosAssistidosPerda === 'function') {
        managerApp.selecionarTodosAssistidosPerda();
    }
});
        
        var cardSaldoAtual = document.getElementById('cardSaldoAtual');
        if (cardSaldoAtual) {
            var btnSaldo = document.createElement('button');
            btnSaldo.className = 'btn btn-sm btn-secondary';
            btnSaldo.style.cssText = 'position: absolute; top: 8px; right: 8px; padding: 4px 8px; font-size: 10px; height: 24px;';
            btnSaldo.innerHTML = '✏️';
            btnSaldo.title = 'Definir Saldo Inicial';
            btnSaldo.addEventListener('click', function(e) {
                e.stopPropagation();
                self.salvarSaldoInicial();
            });
            cardSaldoAtual.style.position = 'relative';
            cardSaldoAtual.appendChild(btnSaldo);
        }
        
        safeAddEventListener('fluxoPeriodo', 'change', function() {
            self.showProgressBarFluxo();
            self.updateProgressFluxo(0, 10);
            self.carregarFluxoCaixa();
        });
        
        var tabsSim = document.querySelectorAll('.simulacao-tab');
        for (var t = 0; t < tabsSim.length; t++) {
            tabsSim[t].addEventListener('click', function() {
                var tab = this.getAttribute('data-tab-sim');
                document.querySelectorAll('.sim-tab-content').forEach(function(el) {
                    el.style.display = 'none';
                });
                var target = document.getElementById('simTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
                if (target) target.style.display = 'block';
                document.querySelectorAll('.simulacao-tab').forEach(function(btn) {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
            });
        }
    },

    // =============================================
    // CARREGAR METAS (SUPABASE + FALLBACK LOCAL)
    // =============================================
    carregarMetas: function() {
        var self = this;
        
        var metasLocais = localStorage.getItem('manager_metas');
        if (metasLocais) {
            try {
                var metas = JSON.parse(metasLocais);
                this.metas = { ...this.metas, ...metas };
                delete this.metas.despesasOperacionais;
                console.log('✅ Metas carregadas do localStorage (cache):', this.metas);
            } catch(e) {
                console.error('Erro ao carregar metas do localStorage:', e);
            }
        }
        
        if (typeof API !== 'undefined' && API.getMetas) {
            API.getMetas()
                .then(function(data) {
                    if (data && data.result === 'success' && data.metas) {
                        self.metas = { ...self.metas, ...data.metas };
                        delete self.metas.despesasOperacionais;
                        localStorage.setItem('manager_metas', JSON.stringify(self.metas));
                        
                        console.log('✅ Metas sincronizadas do Supabase:', self.metas);
                        
                        var dashboardPage = document.getElementById('page-dashboard');
                        if (dashboardPage && dashboardPage.classList.contains('active')) {
                            if (typeof self.carregarMetasPorMes === 'function') {
                                var mesRef = self.getMesReferencia();
                                self.carregarMetasPorMes(mesRef);
                            }
                        }
                    } else {
                        console.warn('⚠️ Supabase não retornou metas válidas. Usando localStorage.');
                    }
                })
                .catch(function(error) {
                    console.warn('⚠️ Erro ao buscar metas do Supabase. Usando localStorage:', error);
                });
        } else {
            console.warn('⚠️ API.getMetas não disponível. Usando apenas localStorage.');
        }
        
        if (typeof API !== 'undefined' && API.getCenariosSalvos) {
            API.getCenariosSalvos()
                .then(function(data) {
                    if (data && data.result === 'success' && data.cenarios) {
                        self.cenariosSalvos = data.cenarios;
                        localStorage.setItem('cenarios_salvos', JSON.stringify(data.cenarios));
                        console.log('✅ Cenários salvos carregados do Supabase:', Object.keys(data.cenarios).length);
                    }
                })
                .catch(function(error) {
                    console.warn('⚠️ Erro ao buscar cenários do Supabase. Usando localStorage:', error);
                    
                    var cenariosLocais = localStorage.getItem('cenarios_salvos');
                    if (cenariosLocais) {
                        try {
                            self.cenariosSalvos = JSON.parse(cenariosLocais);
                            console.log('📋 Cenários carregados do localStorage (fallback):', Object.keys(self.cenariosSalvos).length);
                        } catch(e) {}
                    }
                });
        } else {
            var cenariosSalvos = localStorage.getItem('cenarios_salvos');
            if (cenariosSalvos) {
                try {
                    this.cenariosSalvos = JSON.parse(cenariosSalvos);
                    console.log('✅ Cenários salvos carregados do localStorage:', Object.keys(this.cenariosSalvos).length);
                } catch(e) {
                    console.error('Erro ao carregar cenários:', e);
                }
            }
        }
    },

    // =============================================
    // FUNÇÕES LEGADAS (MANTIDAS PARA COMPATIBILIDADE)
    // =============================================
    
    iniciarCarregamentoPorMes: function(mesReferencia) {
        console.warn('⚠️ iniciarCarregamentoPorMes está deprecated. Use carregarInicial() para primeiro carregamento ou atualizarPorMes() para mudança de mês.');
        
        if (!this._carregamentoInicialConcluido) {
            this.carregarInicial(mesReferencia);
        } else {
            this.atualizarPorMes(mesReferencia);
        }
    },
    
    carregarDadosDashboard: function() {
        console.warn('⚠️ carregarDadosDashboard está deprecated. Use carregarInicial()');
        var hoje = new Date();
        var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
        this.carregarInicial(mesAtual);
    }
};

// =============================================
// INICIALIZAÇÃO
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    managerApp.init();
});

// Expor globalmente
window.managerApp = managerApp;
window.Utils = Utils;
window.UtilsFinance = UtilsFinance;
