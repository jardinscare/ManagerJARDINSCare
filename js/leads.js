// =============================================
// LEADS - managerJARDINSCare
// Gestão de Leads
// Versão 2.8 - Padronização de modais (botões 100% da largura)
// =============================================

// =============================================
// INICIALIZAR LEADS
// =============================================
managerApp.initLeads = function() {
    var self = this;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            self._initLeadsInternal();
        });
    } else {
        self._initLeadsInternal();
    }
};

managerApp._initLeadsInternal = function() {
    var self = this;
    
    this.verificarElementosLeads();
    this.configurarEventosLeads();
    this.popularMesesLeads();
    
    this._gridSecundarioAtivo = false;
    this._gridSecundarioTipo = null;
    this._leadsGridSecundario = [];
    
    this.carregarMetadadosLeads().then(function() {
        self.carregarLeadsDaAPI().then(function() {
            var selectMes = document.getElementById('mesReferenciaLeads');
            var mesAtual = selectMes ? selectMes.value : self.getMesReferencia();
            
            self.mesLeadsAtual = mesAtual;
            self.atualizarLeadsPorMes(mesAtual);
            
            var leadsFiltrados = self.leadsFiltradosPorMes || self.leadsList;
            // 🔥 Usar chave diferente para não conflitar com o módulo Métricas Comerciais
            self._metricasLeadsCache = self.calcularMetricasComerciais(leadsFiltrados);
            self.renderizarFunilVendas(self._metricasLeadsCache);
            self.renderizarGraficoLeadsPorOrigem(leadsFiltrados);
            self.renderizarRelatorioConversao(self._metricasLeadsCache);
            self.renderLeads();
            self.popularFiltrosLeads();
            self.atualizarIndicadoresOrdenacao('tabelaLeads', self.ordenacaoLeads.coluna);
            
            self.renderizarRecomendacoes(leadsFiltrados);
            self.renderizarGraficoEvolucaoLeads(leadsFiltrados);
            self.renderizarPainelNotificacoes(leadsFiltrados);
            self.renderizarFunilDetalhado(leadsFiltrados);
            
            if (typeof self.renderizarLeadsAltaProbabilidade === 'function') {
                self.renderizarLeadsAltaProbabilidade();
                self._atualizarContadorLeadsQuentes();
            }
        }).catch(function(error) {
            console.error('Erro ao carregar leads:', error);
            self.renderLeads();
        });
    }).catch(function(error) {
        console.error('Erro ao carregar metadados:', error);
        self.carregarLeadsDaAPI().then(function() {
            var selectMes = document.getElementById('mesReferenciaLeads');
            var mesAtual = selectMes ? selectMes.value : self.getMesReferencia();
            self.mesLeadsAtual = mesAtual;
            self.atualizarLeadsPorMes(mesAtual);
            var leadsFiltrados = self.leadsFiltradosPorMes || self.leadsList;
            // 🔥 Usar chave diferente
            self._metricasLeadsCache = self.calcularMetricasComerciais(leadsFiltrados);
            self.renderizarFunilVendas(self._metricasLeadsCache);
            self.renderizarGraficoLeadsPorOrigem(leadsFiltrados);
            self.renderizarRelatorioConversao(self._metricasLeadsCache);
            self.renderLeads();
            self.popularFiltrosLeads();
            self.atualizarIndicadoresOrdenacao('tabelaLeads', self.ordenacaoLeads.coluna);
            
            self.renderizarRecomendacoes(leadsFiltrados);
            self.renderizarGraficoEvolucaoLeads(leadsFiltrados);
            self.renderizarPainelNotificacoes(leadsFiltrados);
            self.renderizarFunilDetalhado(leadsFiltrados);
            
            if (typeof self.renderizarLeadsAltaProbabilidade === 'function') {
                self.renderizarLeadsAltaProbabilidade();
                self._atualizarContadorLeadsQuentes();
            }
        }).catch(function(err) {
            console.error('Erro ao carregar leads:', err);
            self.renderLeads();
        });
    });
};

// =============================================
// CONFIGURAR EVENTOS LEADS
// =============================================
managerApp.configurarEventosLeads = function() {
    var btnNovoLeadHeader = document.getElementById('btnNovoLeadHeader');
    if (btnNovoLeadHeader) {
        var novoBtn = btnNovoLeadHeader.cloneNode(true);
        btnNovoLeadHeader.parentNode.replaceChild(novoBtn, btnNovoLeadHeader);
        novoBtn.addEventListener('click', function() {
            managerApp.abrirModalLead();
        });
        console.log('✅ Evento btnNovoLeadHeader configurado');
    } else {
        console.warn('⚠️ btnNovoLeadHeader não encontrado');
    }
    
    var btnNovoLead = document.getElementById('btnNovoLead');
    if (btnNovoLead) {
        var novoBtnOld = btnNovoLead.cloneNode(true);
        btnNovoLead.parentNode.replaceChild(novoBtnOld, btnNovoLead);
        novoBtnOld.addEventListener('click', function() {
            managerApp.abrirModalLead();
        });
        console.log('✅ Evento btnNovoLead (fallback) configurado');
    }
};

// =============================================
// VERIFICAR ELEMENTOS LEADS
// =============================================
managerApp.verificarElementosLeads = function() {
    var elementos = [
        'mesReferenciaLeads',
        'leadsNotificacoesContainer',
        'leadsGridSecundarioContainer',
        'leadsResumoMensal',
        'leadsRecomendacoesContainer',
        'leadsGraficoEvolucaoContainer',
        'leadsFunilDetalhadoContainer',
        'tabelaLeads',
        'btnNovoLeadHeader'
    ];
    
    for (var i = 0; i < elementos.length; i++) {
        var el = document.getElementById(elementos[i]);
        if (!el) {
            console.warn('⚠️ Elemento não encontrado:', elementos[i]);
        }
    }
};

// =============================================
// POPULAR MESES LEADS
// =============================================
managerApp.popularMesesLeads = function() {
    var select = document.getElementById('mesReferenciaLeads');
    if (!select) {
        console.error('❌ Seletor de mês não encontrado');
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
    
    if (this._mesLeadsChangeHandler) {
        select.removeEventListener('change', this._mesLeadsChangeHandler);
    }
    
    this._mesLeadsChangeHandler = function() {
        var mesSelecionado = this.value;
        if (mesSelecionado) {
            self.mesLeadsAtual = mesSelecionado;
            self.atualizarLeadsPorMes(mesSelecionado);
        }
    };
    
    select.addEventListener('change', this._mesLeadsChangeHandler);
    
    var mesInicial = select.value;
    if (mesInicial) {
        this.mesLeadsAtual = mesInicial;
        setTimeout(function() {
            self.atualizarLeadsPorMes(mesInicial);
        }, 100);
    }
};

// =============================================
// ATUALIZAR LEADS POR MÊS
// =============================================
managerApp.atualizarLeadsPorMes = function(mesReferencia) {
    if (!mesReferencia) return;
    
    console.log('📊 Atualizando Leads para o mês:', mesReferencia);
    
    var leadsFiltrados = UtilsFinance.filtrarPorMes(this.leadsList, mesReferencia);
    this.leadsFiltradosPorMes = leadsFiltrados;
    
    this.leadsFiltrados = [...leadsFiltrados];
    
    if (this._gridSecundarioAtivo && this._leadsGridSecundario.length > 0) {
        // Mantém os leads do grid secundário
    }
    
    this.renderizarCardsResumoLeads(leadsFiltrados, mesReferencia);
    this.renderLeadsFiltrados();
    this.renderizarGridSecundario();
    
    var metricas = this.calcularMetricasComerciais(leadsFiltrados);
    this._metricasLeadsCache = metricas;  // 🔥 Guardar em cache próprio (não sobrescreve metricasComerciais)
    this.renderizarFunilVendas(metricas);
    this.renderizarGraficoLeadsPorOrigem(leadsFiltrados);
    this.renderizarRelatorioConversao(metricas);
    
    this.renderizarRecomendacoes(leadsFiltrados);
    this.renderizarGraficoEvolucaoLeads(leadsFiltrados);
    this.renderizarPainelNotificacoes(leadsFiltrados);
    this.renderizarFunilDetalhado(leadsFiltrados);
    
    if (typeof this.renderizarLeadsAltaProbabilidade === 'function') {
        this.renderizarLeadsAltaProbabilidade();
        this._atualizarContadorLeadsQuentes();
    }
};

// =============================================
// ATUALIZAR CONTADOR LEADS QUENTES
// =============================================
managerApp._atualizarContadorLeadsQuentes = function() {
    var countEl = document.getElementById('dashLeadsAltaProbabilidadeCount');
    if (!countEl) return;
    
    var mesReferencia = this.mesReferenciaAtual || this.getMesReferencia();
    var leadsFiltrados = UtilsFinance.filtrarPorMes(this.leadsList, mesReferencia);
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    var quentes = 0;
    
    for (var i = 0; i < leadsFiltrados.length; i++) {
        var l = leadsFiltrados[i];
        var status = l.status || '';
        if (status === '🔄 Em Negociação' || status === '📄 Proposta Enviada') {
            var dataRef = l.dataProximaAcao || l.dataCadastro || l.timestamp;
            if (dataRef) {
                var dataLead = new Date(dataRef);
                if (!isNaN(dataLead.getTime())) {
                    dataLead.setHours(0, 0, 0, 0);
                    var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                    if (diffDias <= 7) {
                        quentes++;
                    }
                }
            }
        }
    }
    
    countEl.textContent = quentes;
    console.log('🔥 Contador LEADS QUENTES atualizado:', quentes);
};

// =============================================
// RENDERIZAR CARDS DE RESUMO LEADS
// =============================================
managerApp.renderizarCardsResumoLeads = function(leads, mesReferencia) {
    var container = document.getElementById('leadsResumoMensal');
    if (!container) return;
    
    if (!leads) leads = this.leadsFiltradosPorMes || [];
    
    var totalLeads = leads.length;
    var convertidos = 0;
    var somaValores = 0;
    var somaValoresTodos = 0;
    var valorNegociacao = 0;
    var valorProposta = 0;
    var leadsComValor = 0;
    var ticketMedio = 0;
    var ticketMedioGeral = 0;
    
    for (var i = 0; i < leads.length; i++) {
        var valor = parseFloat(leads[i].valorEstimado) || 0;
        var status = leads[i].status || '';
        
        somaValoresTodos += valor;
        if (valor > 0) leadsComValor++;
        
        if (status === '✅ Fechado (Contrato)') {
            convertidos++;
            somaValores += valor;
        }
        
        if (status === '🔄 Em Negociação') {
            valorNegociacao += valor;
        }
        
        if (status === '📄 Proposta Enviada') {
            valorProposta += valor;
        }
    }
    
    if (convertidos > 0) ticketMedio = somaValores / convertidos;
    if (leadsComValor > 0) ticketMedioGeral = somaValoresTodos / leadsComValor;
    
    var taxaConversao = totalLeads > 0 ? (convertidos / totalLeads * 100) : 0;
    var variacao = this.calcularVariacaoMensal(leads, mesReferencia);
    
    var statusCount = {};
    for (var i = 0; i < leads.length; i++) {
        var status = leads[i].status || '📞 Novo Lead';
        if (!statusCount[status]) statusCount[status] = 0;
        statusCount[status]++;
    }
    
    var html = '';
    
    html += '<div class="card" style="margin-bottom: 0px; width: 100%;">';
    html += '  <div class="card-header">';
    html += '    <span class="card-title">📊 Resumo Mensal de Leads</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px 16px 8px 16px;">';
    
    html += '<div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; width: 100%;">';
    
    // Card 1: Total de Leads
    html += '<div class="stat-card" style="flex: 1 1 calc(20% - 12px); min-width: 120px; max-width: calc(20% - 12px);">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 18px; font-weight: 800;">' + totalLeads + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TOTAL DE LEADS</div>';
    html += '    <div style="font-size: 9px; color: ' + (variacao.total >= 0 ? '#10b981' : '#ef4444') + ';">' + (variacao.total >= 0 ? '📈 +' : '📉 ') + Math.abs(variacao.total) + ' vs mês anterior</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 2: Leads Convertidos
    html += '<div class="stat-card" style="flex: 1 1 calc(20% - 12px); min-width: 120px; max-width: calc(20% - 12px);">';
    html += '  <div class="stat-icon green" style="width: 36px; height: 36px; font-size: 16px;">✅</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 18px; font-weight: 800;">' + convertidos + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">LEADS CONVERTIDOS</div>';
    html += '    <div style="font-size: 9px; color: ' + (variacao.convertidos >= 0 ? '#10b981' : '#ef4444') + ';">' + (variacao.convertidos >= 0 ? '📈 +' : '📉 ') + Math.abs(variacao.convertidos) + ' vs mês anterior</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 3: Taxa de Conversão
    var corTaxa = taxaConversao >= 20 ? '#10b981' : (taxaConversao >= 10 ? '#f59e0b' : '#ef4444');
    html += '<div class="stat-card" style="flex: 1 1 calc(20% - 12px); min-width: 120px; max-width: calc(20% - 12px);">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">📈</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 18px; font-weight: 700; color: ' + corTaxa + ';">' + taxaConversao.toFixed(1) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TAXA CONVERSÃO</div>';
    html += '    <div style="font-size: 9px; color: ' + (variacao.taxa >= 0 ? '#10b981' : '#ef4444') + ';">' + (variacao.taxa >= 0 ? '📈 +' : '📉 ') + Math.abs(variacao.taxa).toFixed(1) + '% vs mês anterior</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 4: Ticket Médio
    html += '<div class="stat-card" style="flex: 1 1 calc(20% - 12px); min-width: 120px; max-width: calc(20% - 12px);">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="white-space: normal !important; overflow: visible !important; text-overflow: clip !important; word-break: break-word !important;">' + Utils.formatCurrency(ticketMedio) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TICKET MÉDIO</div>';
    html += '    <div style="font-size: 9px; color: ' + (variacao.ticket >= 0 ? '#10b981' : '#ef4444') + ';">' + (variacao.ticket >= 0 ? '📈 +' : '📉 ') + Utils.formatCurrency(Math.abs(variacao.ticket)) + ' vs mês anterior</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 5: Valor Total Estimado
    html += '<div class="stat-card" style="flex: 1 1 calc(20% - 12px); min-width: 120px; max-width: calc(20% - 12px);">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="white-space: normal !important; overflow: visible !important; text-overflow: clip !important; word-break: break-word !important;">' + Utils.formatCurrency(somaValoresTodos) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">VALOR TOTAL ESTIMADO</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    html += '<div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 0; width: 100%;">';
    
    // Card 6: Em Negociação
    html += '<div class="stat-card" style="flex: 1 1 calc(20% - 12px); min-width: 120px; max-width: calc(20% - 12px);">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">🔄</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="white-space: normal !important; overflow: visible !important; text-overflow: clip !important; word-break: break-word !important;">' + Utils.formatCurrency(valorNegociacao) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">EM NEGOCIAÇÃO</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 7: Com Proposta
    html += '<div class="stat-card" style="flex: 1 1 calc(20% - 12px); min-width: 120px; max-width: calc(20% - 12px);">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">📄</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="white-space: normal !important; overflow: visible !important; text-overflow: clip !important; word-break: break-word !important;">' + Utils.formatCurrency(valorProposta) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">COM PROPOSTA</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 8: Ticket Médio Geral
    html += '<div class="stat-card" style="flex: 1 1 calc(20% - 12px); min-width: 120px; max-width: calc(20% - 12px);">';
    html += '  <div class="stat-icon teal" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="white-space: normal !important; overflow: visible !important; text-overflow: clip !important; word-break: break-word !important;">' + Utils.formatCurrency(ticketMedioGeral) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TICKET MÉDIO GERAL</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 9: Distribuição por Status
    var statusResumo = Object.keys(statusCount).map(function(k) {
        var label = k;
        if (label === '📞 Novo Lead') label = '📞 Novo';
        else if (label === '✅ Fechado (Contrato)') label = '✅ Fechado';
        else if (label === '🔄 Em Negociação') label = '🔄 Negociando';
        else if (label === '📄 Proposta Enviada') label = '📄 Proposta';
        return label + ': ' + statusCount[k];
    }).join(' | ');
    
    html += '<div class="stat-card" style="flex: 1 1 calc(40% - 12px); min-width: 180px; max-width: calc(40% - 12px);">';
    html += '  <div class="stat-icon info" style="width: 36px; height: 36px; font-size: 16px;">📋</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="white-space: normal !important; overflow: visible !important; text-overflow: clip !important;">' + Object.keys(statusCount).length + ' status</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">DISTRIBUIÇÃO</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-500); word-break: break-all; white-space: normal;">' + statusResumo + '</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
};

// =============================================
// CALCULAR VARIAÇÃO MENSAL
// =============================================
managerApp.calcularVariacaoMensal = function(leads, mesReferencia) {
    var parts = mesReferencia.split('-');
    var ano = parseInt(parts[0]);
    var mes = parseInt(parts[1]);
    
    mes--;
    if (mes === 0) { mes = 12; ano--; }
    var mesAnterior = ano + '-' + String(mes).padStart(2, '0');
    var leadsAnterior = UtilsFinance.filtrarPorMes(this.leadsList, mesAnterior);
    
    var totalAtual = leads.length;
    var totalAnterior = leadsAnterior.length;
    
    var convertidosAtual = 0, convertidosAnterior = 0;
    var somaAtual = 0, somaAnterior = 0;
    
    for (var i = 0; i < leads.length; i++) {
        if (leads[i].status === '✅ Fechado (Contrato)') {
            convertidosAtual++;
            somaAtual += parseFloat(leads[i].valorEstimado) || 0;
        }
    }
    for (var i = 0; i < leadsAnterior.length; i++) {
        if (leadsAnterior[i].status === '✅ Fechado (Contrato)') {
            convertidosAnterior++;
            somaAnterior += parseFloat(leadsAnterior[i].valorEstimado) || 0;
        }
    }
    
    var taxaAtual = totalAtual > 0 ? (convertidosAtual / totalAtual * 100) : 0;
    var taxaAnterior = totalAnterior > 0 ? (convertidosAnterior / totalAnterior * 100) : 0;
    var ticketAtual = convertidosAtual > 0 ? (somaAtual / convertidosAtual) : 0;
    var ticketAnterior = convertidosAnterior > 0 ? (somaAnterior / convertidosAnterior) : 0;
    
    return {
        total: totalAtual - totalAnterior,
        convertidos: convertidosAtual - convertidosAnterior,
        taxa: taxaAtual - taxaAnterior,
        ticket: ticketAtual - ticketAnterior
    };
};

// =============================================
// CARREGAR LEADS DA API
// =============================================
managerApp.carregarLeadsDaAPI = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        API.listarLeads()
            .then(function(data) {
                if (data.result === 'success') {
                    self.leadsList = data.leads || [];
                    self.leadsFiltrados = [...self.leadsList];
                    resolve(self.leadsList);
                } else {
                    reject(new Error(data.error || 'Erro ao carregar leads'));
                }
            })
            .catch(function(error) {
                reject(error);
            });
    });
};

// =============================================
// CARREGAR METADADOS LEADS (COM CONFIG COMO FONTE PRIMÁRIA)
// =============================================
managerApp.carregarMetadadosLeads = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        var metadados = {
            origens: CONFIG.ORIGENS_LEAD.slice(),
            regioes: CONFIG.REGIOES_LEAD.slice(),
            tiposServico: CONFIG.TIPOS_SERVICO_LEAD.slice(),
            periodosContratacao: CONFIG.PERIODOS_CONTRATACAO_LEAD.slice(),
            turnos: CONFIG.TURNOS_LEAD.slice(),
            statusLead: CONFIG.STATUS_LEAD.slice(),
            responsaveis: CONFIG.RESPONSAVEIS_LEAD.slice()
        };
        
        console.log('📊 Metadados iniciados com CONFIG:', {
            origens: metadados.origens.length,
            statusLead: metadados.statusLead.length,
            responsaveis: metadados.responsaveis.length
        });
        
        API.getMetadadosLeads()
            .then(function(data) {
                console.log('📥 Resposta da API (para enriquecimento):', data);
                
                if (data.result === 'success') {
                    if (data.origens && data.origens.length > 0) {
                        var origensSet = new Set(metadados.origens);
                        data.origens.forEach(function(item) {
                            if (item && item.trim() !== '') {
                                origensSet.add(item);
                            }
                        });
                        metadados.origens = Array.from(origensSet);
                    }
                    
                    if (data.statusLead && data.statusLead.length > 0) {
                        var statusSet = new Set(metadados.statusLead);
                        data.statusLead.forEach(function(item) {
                            if (item && item.trim() !== '') {
                                statusSet.add(item);
                            }
                        });
                        metadados.statusLead = Array.from(statusSet);
                    }
                    
                    if (data.regioes && data.regioes.length > 0) {
                        var regioesSet = new Set(metadados.regioes);
                        data.regioes.forEach(function(item) {
                            if (item && item.trim() !== '') {
                                regioesSet.add(item);
                            }
                        });
                        metadados.regioes = Array.from(regioesSet);
                    }
                    
                    if (data.tiposServico && data.tiposServico.length > 0) {
                        var tiposSet = new Set(metadados.tiposServico);
                        data.tiposServico.forEach(function(item) {
                            if (item && item.trim() !== '') {
                                tiposSet.add(item);
                            }
                        });
                        metadados.tiposServico = Array.from(tiposSet);
                    }
                    
                    if (data.responsaveis && data.responsaveis.length > 0) {
                        var respSet = new Set(metadados.responsaveis);
                        data.responsaveis.forEach(function(item) {
                            if (item && item.trim() !== '') {
                                respSet.add(item);
                            }
                        });
                        metadados.responsaveis = Array.from(respSet);
                    }
                }
                
                metadados.origens.sort();
                metadados.regioes.sort();
                metadados.tiposServico.sort();
                metadados.periodosContratacao.sort();
                metadados.turnos.sort();
                metadados.statusLead.sort();
                metadados.responsaveis.sort();
                
                self.metadadosLeads = metadados;
                
                console.log('✅ Metadados finais:', {
                    origens: metadados.origens.length,
                    statusLead: metadados.statusLead.length,
                    responsaveis: metadados.responsaveis.length
                });
                
                resolve(self.metadadosLeads);
            })
            .catch(function(error) {
                console.error('❌ Erro ao enriquecer metadados:', error);
                self.metadadosLeads = metadados;
                resolve(self.metadadosLeads);
            });
    });
};
// =============================================
// ABRIR MODAL LEAD
// =============================================
managerApp.abrirModalLead = function(lead) {
    var self = this;
    var isEdicao = lead && lead.id;
    
    if (!this.metadadosLeads) {
        Utils.showLoading('Carregando opções...');
        this.carregarMetadadosLeads().then(function() {
            Utils.hideLoading();
            self.abrirModalLead(lead);
        }).catch(function() {
            Utils.hideLoading();
            self.abrirModalLead(lead);
        });
        return;
    }
    
    var modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').innerHTML = isEdicao ? '✏️ Editar Lead' : '➕ Novo Lead';
    
    var nomeValue = lead ? (lead.nomeCompleto || '') : '';
    var telefoneValue = lead ? (lead.telefone || '') : '';
    var emailValue = lead ? (lead.email || '') : '';
    var origemValue = lead ? (lead.origem || 'Indicação') : 'Indicação';
    var regiaoValue = lead ? (lead.regiaoAtendimento || '') : '';
    var tipoServicoValue = lead ? (lead.tipoServico || '') : '';
    var dataNecessidadeValue = lead ? (lead.dataNecessidade || '') : '';
    var periodoContratacaoValue = lead ? (lead.periodoContratacao || '') : '';
    var turnoValue = lead ? (lead.turnoPreferencia || '') : '';
    var statusValue = lead ? (lead.status || '📞 Novo Lead') : '📞 Novo Lead';
    var proximaAcaoValue = lead ? (lead.proximaAcao || '') : '';
    var dataProximaAcaoValue = lead ? (lead.dataProximaAcao || '') : '';
    var responsavelValue = lead ? (lead.responsavel || 'Francisco Diniz') : 'Francisco Diniz';
    var valorEstimadoValue = lead ? (lead.valorEstimado || '') : '';
    var observacoesValue = lead ? (lead.observacoes || '') : '';
    
    var origensOptions = '';
    for (var i = 0; i < this.metadadosLeads.origens.length; i++) {
        var selected = (origemValue === this.metadadosLeads.origens[i]) ? 'selected' : '';
        origensOptions += '<option value="' + this.metadadosLeads.origens[i] + '" ' + selected + '>' + this.metadadosLeads.origens[i] + '</option>';
    }
    
    var regioesOptions = '<option value="">Selecione</option>';
    for (var i = 0; i < this.metadadosLeads.regioes.length; i++) {
        var selected = (regiaoValue === this.metadadosLeads.regioes[i]) ? 'selected' : '';
        regioesOptions += '<option value="' + this.metadadosLeads.regioes[i] + '" ' + selected + '>' + this.metadadosLeads.regioes[i] + '</option>';
    }
    
    var tiposServicoOptions = '<option value="">Selecione</option>';
    for (var i = 0; i < this.metadadosLeads.tiposServico.length; i++) {
        var selected = (tipoServicoValue === this.metadadosLeads.tiposServico[i]) ? 'selected' : '';
        tiposServicoOptions += '<option value="' + this.metadadosLeads.tiposServico[i] + '" ' + selected + '>' + this.metadadosLeads.tiposServico[i] + '</option>';
    }
    
    var periodosOptions = '<option value="">Selecione</option>';
    for (var i = 0; i < this.metadadosLeads.periodosContratacao.length; i++) {
        var selected = (periodoContratacaoValue === this.metadadosLeads.periodosContratacao[i]) ? 'selected' : '';
        periodosOptions += '<option value="' + this.metadadosLeads.periodosContratacao[i] + '" ' + selected + '>' + this.metadadosLeads.periodosContratacao[i] + '</option>';
    }
    
    var turnosOptions = '<option value="">Selecione</option>';
    var turnosOrdenados = ['Diurno', 'Noturno', 'Diurno e Noturno', 'Final Semana', 'A definir'];
    for (var i = 0; i < turnosOrdenados.length; i++) {
        var selected = (turnoValue === turnosOrdenados[i]) ? 'selected' : '';
        turnosOptions += '<option value="' + turnosOrdenados[i] + '" ' + selected + '>' + turnosOrdenados[i] + '</option>';
    }
    
    var statusOptions = '';
    for (var i = 0; i < this.metadadosLeads.statusLead.length; i++) {
        var selected = (statusValue === this.metadadosLeads.statusLead[i]) ? 'selected' : '';
        statusOptions += '<option value="' + this.metadadosLeads.statusLead[i] + '" ' + selected + '>' + this.metadadosLeads.statusLead[i] + '</option>';
    }
    
    var responsaveisOptions = '';
    for (var i = 0; i < this.metadadosLeads.responsaveis.length; i++) {
        var selected = (responsavelValue === this.metadadosLeads.responsaveis[i]) ? 'selected' : '';
        responsaveisOptions += '<option value="' + this.metadadosLeads.responsaveis[i] + '" ' + selected + '>' + this.metadadosLeads.responsaveis[i] + '</option>';
    }
    
    document.getElementById('modalBody').innerHTML = 
        '<div class="form-row">' +
        '<div class="form-group" style="flex:2;"><label>NOME COMPLETO *</label><input class="form-input" id="modalLeadNome" value="' + nomeValue.replace(/"/g, '&quot;') + '"></div>' +
        '<div class="form-group" style="flex:1;"><label>TELEFONE *</label><input class="form-input" id="modalLeadTelefone" value="' + telefoneValue.replace(/"/g, '&quot;') + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group" style="flex:1;"><label>EMAIL</label><input class="form-input" id="modalLeadEmail" value="' + emailValue.replace(/"/g, '&quot;') + '"></div>' +
        '<div class="form-group" style="flex:1;"><label>ORIGEM</label><select class="form-select" id="modalLeadOrigem">' + origensOptions + '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>REGIÃO ATENDIMENTO</label><select class="form-select" id="modalLeadRegiao">' + regioesOptions + '</select></div>' +
        '<div class="form-group"><label>TIPO SERVIÇO</label><select class="form-select" id="modalLeadTipoServico">' + tiposServicoOptions + '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>DATA NECESSIDADE</label><input type="date" class="form-input" id="modalLeadDataNecessidade" value="' + dataNecessidadeValue + '"></div>' +
        '<div class="form-group"><label>PERÍODO CONTRATAÇÃO</label><select class="form-select" id="modalLeadPeriodoContratacao">' + periodosOptions + '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>TURNO PREFERÊNCIA</label><select class="form-select" id="modalLeadTurno">' + turnosOptions + '</select></div>' +
        '<div class="form-group"><label>STATUS</label><select class="form-select" id="modalLeadStatus">' + statusOptions + '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>PRÓXIMA AÇÃO</label><input class="form-input" id="modalLeadProximaAcao" value="' + proximaAcaoValue.replace(/"/g, '&quot;') + '"></div>' +
        '<div class="form-group"><label>DATA PRÓXIMA AÇÃO</label><input type="date" class="form-input" id="modalLeadDataProximaAcao" value="' + dataProximaAcaoValue + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>RESPONSÁVEL</label><select class="form-select" id="modalLeadResponsavel">' + responsaveisOptions + '</select></div>' +
        '<div class="form-group"><label>VALOR ESTIMADO (R$)</label><input class="form-input input-currency" id="modalLeadValorEstimado" value="' + (valorEstimadoValue ? Utils.formatCurrency(valorEstimadoValue) : '') + '"></div>' +
        '</div>' +
        '<div class="form-group"><label>OBSERVAÇÕES</label><textarea class="form-textarea" id="modalLeadObservacoes" rows="3">' + (observacoesValue || '').replace(/"/g, '&quot;') + '</textarea></div>';
    
    // 🔥 PADRONIZADO: botões com flex: 1 (50% cada)
    document.getElementById('modalFooter').innerHTML = 
        '<div style="display: flex; gap: 12px; width: 100%;">' +
        '  <button class="btn btn-secondary" onclick="managerApp.fecharModal()" style="flex: 1;">Cancelar</button>' +
        '  <button class="btn btn-success" id="modalSalvarLead" style="flex: 1;">Salvar</button>' +
        '</div>';
    
    modal.style.display = 'flex';
    
    var currencyInput = document.getElementById('modalLeadValorEstimado');
    if (currencyInput) Utils.applyCurrencyMask(currencyInput);
    
    var phoneInput = document.getElementById('modalLeadTelefone');
    if (phoneInput) Utils.applyPhoneMask(phoneInput);
    
    document.getElementById('modalSalvarLead').onclick = function() {
        var statusAntigo = isEdicao ? lead.status : '';
        var novoStatus = document.getElementById('modalLeadStatus').value;
        
        var novoLead = {
            nome: document.getElementById('modalLeadNome').value,
            contato: document.getElementById('modalLeadTelefone').value,
            email: document.getElementById('modalLeadEmail').value,
            origem: document.getElementById('modalLeadOrigem').value,
            regiaoAtendimento: document.getElementById('modalLeadRegiao').value,
            tipoServico: document.getElementById('modalLeadTipoServico').value,
            dataNecessidade: document.getElementById('modalLeadDataNecessidade').value,
            periodoContratacao: document.getElementById('modalLeadPeriodoContratacao').value,
            turnoPreferencia: document.getElementById('modalLeadTurno').value,
            status: novoStatus,
            proximaAcao: document.getElementById('modalLeadProximaAcao').value,
            dataProximaAcao: document.getElementById('modalLeadDataProximaAcao').value,
            responsavel: document.getElementById('modalLeadResponsavel').value,
            valorEstimado: Utils.parseCurrencyToNumber(document.getElementById('modalLeadValorEstimado').value),
            observacoes: document.getElementById('modalLeadObservacoes').value
        };
        
        if (!novoLead.nome || !novoLead.contato) {
            Utils.showToast('Nome e telefone são obrigatórios', 'warning');
            return;
        }
        
        Utils.showLoading(isEdicao ? 'Atualizando...' : 'Salvando...');
        
        var savePromise = isEdicao ? 
            API.atualizarLead(lead.id, novoLead) :
            API.criarLead(novoLead);
        
        savePromise
            .then(function(response) {
                Utils.hideLoading();
                Utils.showToast(isEdicao ? 'Lead atualizado com sucesso!' : 'Lead criado com sucesso!');
                
                // 🔥 Notificar outras abas que os leads mudaram
                if (typeof managerApp._notificarLeadsAtualizados === 'function') {
                    managerApp._notificarLeadsAtualizados();
                }
                
                // 🔥 Invalidação de cache de métricas comerciais
                managerApp.metricasComerciais = null;
                managerApp._metricasComerciaisVersao = 0;
                
                if (isEdicao && statusAntigo !== novoStatus) {
                    var leadAtualizado = { ...lead, ...novoLead, id: lead.id };
                    setTimeout(function() {
                        managerApp.abrirModalSugestaoAbordagem(leadAtualizado, statusAntigo, novoStatus);
                    }, 500);
                }
                
                self.carregarLeadsDaAPI()
                    .then(function() {
                        var selectMes = document.getElementById('mesReferenciaLeads');
                        var mesAtual = selectMes ? selectMes.value : self.getMesReferencia();
                        self.mesLeadsAtual = mesAtual;
                        self.atualizarLeadsPorMes(mesAtual);
                        self.renderLeads();
                        self.fecharModal();
                    })
                    .catch(function(error) {
                        console.error('❌ Erro ao recarregar leads:', error);
                        var selectMes = document.getElementById('mesReferenciaLeads');
                        var mesAtual = selectMes ? selectMes.value : self.getMesReferencia();
                        self.atualizarLeadsPorMes(mesAtual);
                        self.renderLeads();
                        self.fecharModal();
                    });
            })
            .catch(function(error) {
                Utils.hideLoading();
                Utils.showToast('Erro ao salvar: ' + error.message, 'error');
            });
    };
};

// =============================================
// CALCULAR MÉTRICAS COMERCIAIS (MÓDULO LEADS - formato próprio)
// =============================================
managerApp.calcularMetricasComerciais = function(leads) {
    if (!leads) leads = this.leadsFiltradosPorMes || this.leadsList;
    
    if (!leads || leads.length === 0) {
        return {
            totalLeads: 0,
            leadsConvertidos: 0,
            taxaConversaoGeral: 0,
            ticketMedioConvertidos: 0,
            tempoMedioConversaoDias: 0,
            leadsPorStatus: {},
            leadsPorOrigem: {},
            conversaoPorOrigem: [],
            leadsPorResponsavel: {},
            conversaoPorResponsavel: [],
            leadsPorMes: {},
            leadsAtrasados: [],
            totalAtrasados: 0,
            origemMaiorROI: { origem: '', taxa: 0, quantidade: 0 },
            responsavelMaiorConversao: { responsavel: '', taxa: 0, quantidade: 0 }
        };
    }
    
    var leadsConvertidos = 0;
    var somaValoresConvertidos = 0;
    var somaDiasConversao = 0;
    var leadsPorStatus = {};
    var leadsPorOrigem = {};
    var leadsConvertidosPorOrigem = {};
    var leadsPorResponsavel = {};
    var leadsConvertidosPorResponsavel = {};
    var leadsPorMes = {};
    var leadsAtrasados = [];
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        var status = lead.status || '📞 Novo Lead';
        var origem = lead.origem || 'Não informada';
        var responsavel = lead.responsavel || 'Não atribuído';
        
        if (!leadsPorStatus[status]) leadsPorStatus[status] = 0;
        leadsPorStatus[status]++;
        
        if (!leadsPorOrigem[origem]) leadsPorOrigem[origem] = 0;
        leadsPorOrigem[origem]++;
        
        if (!leadsPorResponsavel[responsavel]) leadsPorResponsavel[responsavel] = 0;
        leadsPorResponsavel[responsavel]++;
        
        var isConvertido = (status === '✅ Fechado (Contrato)');
        if (isConvertido) {
            leadsConvertidos++;
            
            var valorEstimado = parseFloat(lead.valorEstimado) || 0;
            if (valorEstimado > 0) somaValoresConvertidos += valorEstimado;
            
            if (!leadsConvertidosPorOrigem[origem]) leadsConvertidosPorOrigem[origem] = 0;
            leadsConvertidosPorOrigem[origem]++;
            
            if (!leadsConvertidosPorResponsavel[responsavel]) leadsConvertidosPorResponsavel[responsavel] = 0;
            leadsConvertidosPorResponsavel[responsavel]++;
            
            var dataCadastro = lead.dataCadastro || lead.timestamp;
            if (dataCadastro) {
                var dataCadastroDate = new Date(dataCadastro);
                if (!isNaN(dataCadastroDate.getTime())) {
                    var diasDiferenca = Math.floor((hoje - dataCadastroDate) / (1000 * 60 * 60 * 24));
                    if (diasDiferenca > 0 && diasDiferenca < 365) somaDiasConversao += diasDiferenca;
                }
            }
        }
        
        var dataCadastroMes = lead.dataCadastro || lead.timestamp;
        if (dataCadastroMes) {
            var dataMes = new Date(dataCadastroMes);
            if (!isNaN(dataMes.getTime())) {
                var mesAno = dataMes.getFullYear() + '-' + String(dataMes.getMonth() + 1).padStart(2, '0');
                if (!leadsPorMes[mesAno]) leadsPorMes[mesAno] = { total: 0, convertidos: 0 };
                leadsPorMes[mesAno].total++;
                if (isConvertido) leadsPorMes[mesAno].convertidos++;
            }
        }
        
        var dataProximaAcao = lead.dataProximaAcao;
        if (dataProximaAcao && status !== '✅ Fechado (Contrato)' && status !== '❌ Perdido' && status !== '🚫 Não qualificado') {
            var dataAcao = new Date(dataProximaAcao);
            if (!isNaN(dataAcao.getTime()) && dataAcao < hoje) {
                leadsAtrasados.push({
                    id: lead.id,
                    nomeCompleto: lead.nomeCompleto || 'Nome não informado',
                    telefone: lead.telefone || '',
                    proximaAcao: lead.proximaAcao || 'Sem ação definida',
                    dataProximaAcao: dataProximaAcao,
                    status: status,
                    responsavel: responsavel,
                    diasAtraso: Math.floor((hoje - dataAcao) / (1000 * 60 * 60 * 24))
                });
            }
        }
    }
    
    var conversaoPorOrigem = [];
    for (var origem in leadsPorOrigem) {
        if (leadsPorOrigem.hasOwnProperty(origem)) {
            var total = leadsPorOrigem[origem];
            var convertidos = leadsConvertidosPorOrigem[origem] || 0;
            var taxa = total > 0 ? (convertidos / total * 100) : 0;
            conversaoPorOrigem.push({ origem: origem, total: total, convertidos: convertidos, taxa: taxa });
        }
    }
    conversaoPorOrigem.sort(function(a, b) { return b.taxa - a.taxa; });
    
    var conversaoPorResponsavel = [];
    for (var responsavel in leadsPorResponsavel) {
        if (leadsPorResponsavel.hasOwnProperty(responsavel)) {
            var total = leadsPorResponsavel[responsavel];
            var convertidos = leadsConvertidosPorResponsavel[responsavel] || 0;
            var taxa = total > 0 ? (convertidos / total * 100) : 0;
            conversaoPorResponsavel.push({ responsavel: responsavel, total: total, convertidos: convertidos, taxa: taxa });
        }
    }
    conversaoPorResponsavel.sort(function(a, b) { return b.taxa - a.taxa; });
    
    var totalLeads = leads.length;
    var taxaConversaoGeral = totalLeads > 0 ? (leadsConvertidos / totalLeads * 100) : 0;
    var ticketMedioConvertidos = leadsConvertidos > 0 ? (somaValoresConvertidos / leadsConvertidos) : 0;
    var tempoMedioConversaoDias = leadsConvertidos > 0 ? (somaDiasConversao / leadsConvertidos) : 0;
    
    var origemMaiorROI = { origem: '', taxa: 0, quantidade: 0 };
    for (var i = 0; i < conversaoPorOrigem.length; i++) {
        var item = conversaoPorOrigem[i];
        if (item.total >= 3 && item.taxa > origemMaiorROI.taxa) {
            origemMaiorROI = { origem: item.origem, taxa: item.taxa, quantidade: item.total };
        }
    }
    
    var responsavelMaiorConversao = { responsavel: '', taxa: 0, quantidade: 0 };
    for (var i = 0; i < conversaoPorResponsavel.length; i++) {
        var item = conversaoPorResponsavel[i];
        if (item.total >= 3 && item.taxa > responsavelMaiorConversao.taxa) {
            responsavelMaiorConversao = { responsavel: item.responsavel, taxa: item.taxa, quantidade: item.total };
        }
    }
    
    return {
        totalLeads: totalLeads,
        leadsConvertidos: leadsConvertidos,
        taxaConversaoGeral: taxaConversaoGeral,
        ticketMedioConvertidos: ticketMedioConvertidos,
        tempoMedioConversaoDias: tempoMedioConversaoDias,
        leadsPorStatus: leadsPorStatus,
        leadsPorOrigem: leadsPorOrigem,
        conversaoPorOrigem: conversaoPorOrigem,
        leadsPorResponsavel: leadsPorResponsavel,
        conversaoPorResponsavel: conversaoPorResponsavel,
        leadsPorMes: leadsPorMes,
        leadsAtrasados: leadsAtrasados,
        totalAtrasados: leadsAtrasados.length,
        origemMaiorROI: origemMaiorROI,
        responsavelMaiorConversao: responsavelMaiorConversao
    };
};

// =============================================
// RENDERIZAR FUNIL DE VENDAS
// =============================================
managerApp.renderizarFunilVendas = function(metricas) {
    var ctx = document.getElementById('chartFunilVendas');
    if (!ctx) return;
    
    var ctx2d = ctx.getContext('2d');
    if (this.chartFunil) { this.chartFunil.destroy(); this.chartFunil = null; }
    
    var etapas = ['📞 Novo Lead', '🔄 Em Negociação', '📄 Proposta Enviada', '✅ Fechado (Contrato)'];
    var quantidades = [];
    for (var i = 0; i < etapas.length; i++) {
        quantidades.push(metricas.leadsPorStatus[etapas[i]] || 0);
    }
    
    if (typeof Chart === 'undefined') return;
    
    try {
        this.chartFunil = new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: etapas,
                datasets: [{
                    label: 'Quantidade de Leads',
                    data: quantidades,
                    backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(16, 185, 129, 0.7)'],
                    borderColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var label = context.dataset.label || '';
                                var value = context.raw;
                                var total = metricas.totalLeads;
                                var percent = total > 0 ? (value / total * 100).toFixed(1) : 0;
                                return label + ': ' + value + ' leads (' + percent + '% do total)';
                            }
                        }
                    },
                    legend: { position: 'top', labels: { font: { size: 11 } } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Quantidade de Leads', font: { size: 12 } }, ticks: { stepSize: 1 } },
                    x: { title: { display: true, text: 'Etapas do Funil', font: { size: 12 } } }
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de funil:', error);
    }
    
    var funilInfo = document.getElementById('funilEstatisticas');
    if (funilInfo) {
        var taxaConversaoNovoParaFechado = metricas.totalLeads > 0 ? ((metricas.leadsPorStatus['✅ Fechado (Contrato)'] || 0) / metricas.totalLeads * 100).toFixed(1) : 0;
        var perdidos = (metricas.leadsPorStatus['❌ Perdido'] || 0) + (metricas.leadsPorStatus['🚫 Não qualificado'] || 0);
        var taxaPerdidos = metricas.totalLeads > 0 ? (perdidos / metricas.totalLeads * 100).toFixed(1) : 0;
        
        funilInfo.innerHTML = '<div class="stats-row-5" style="margin-top: 16px;">' +
            '<div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">' + taxaConversaoNovoParaFechado + '%</div><div class="stat-label">Taxa de Conversão</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon red">❌</div><div class="stat-info"><div class="stat-value">' + taxaPerdidos + '%</div><div class="stat-label">Taxa de Perda</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple">📊</div><div class="stat-info"><div class="stat-value">' + (metricas.leadsPorStatus['🔄 Em Negociação'] || 0) + '</div><div class="stat-label">Em Negociação</div></div></div>' +
            '</div>';
    }
};

// =============================================
// RENDERIZAR GRÁFICO LEADS POR ORIGEM
// =============================================
managerApp.renderizarGraficoLeadsPorOrigem = function(leads) {
    var ctx = document.getElementById('chartLeadsOrigem');
    if (!ctx) return;
    if (!leads) leads = this.leadsFiltradosPorMes || this.leadsList;
    
    var origens = {};
    for (var i = 0; i < leads.length; i++) {
        var origem = leads[i].origem || 'Não informada';
        if (!origens[origem]) origens[origem] = 0;
        origens[origem]++;
    }
    
    var labels = Object.keys(origens);
    var dados = Object.values(origens);
    var cores = ['#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#ec489a', '#f97316', '#6366f1'];
    if (labels.length === 0) { labels = ['Sem dados']; dados = [1]; }
    
    if (this.chartLeadsOrigem) { this.chartLeadsOrigem.destroy(); this.chartLeadsOrigem = null; }
    if (typeof Chart === 'undefined') return;
    
    try {
        this.chartLeadsOrigem = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: dados,
                    backgroundColor: cores.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, padding: 10, usePointStyle: true, pointStyle: 'circle', boxWidth: 12 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var label = context.label || '';
                                var value = context.raw;
                                var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                                var percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return label + ': ' + value + ' leads (' + percent + '%)';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de leads por origem:', error);
    }
};

// =============================================
// RENDERIZAR RELATÓRIO DE CONVERSÃO
// =============================================
managerApp.renderizarRelatorioConversao = function(metricas) {
    var container = document.getElementById('relatorioConversaoContainer');
    if (!container) return;
    
    var htmlOrigem = '<div class="card" style="margin-bottom: 20px;"><div class="card-header"><span class="card-title">📊 Conversão por Origem</span></div><div class="card-body"><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Origem</th><th>Total Leads</th><th>Convertidos</th><th>Taxa Conversão</th><th>Tendência</th></tr></thead><tbody>';
    
    for (var i = 0; i < metricas.conversaoPorOrigem.length; i++) {
        var item = metricas.conversaoPorOrigem[i];
        var barraPercentual = item.taxa;
        var corBarra = barraPercentual >= 30 ? '#10b981' : (barraPercentual >= 15 ? '#f59e0b' : '#ef4444');
        var tendencia = barraPercentual >= 30 ? '🚀 Alta' : (barraPercentual >= 15 ? '📈 Média' : '📉 Baixa');
        
        htmlOrigem += '<tr>' +
            '<td><strong>' + (item.origem || 'Não informada') + '</strong></td>' +
            '<td>' + item.total + '</td>' +
            '<td>' + item.convertidos + '</td>' +
            '<td><div style="display: flex; align-items: center; gap: 8px;"><div style="flex:1; background: #e5e7eb; border-radius: 10px; height: 8px;"><div style="width: ' + barraPercentual + '%; background: ' + corBarra + '; height: 8px; border-radius: 10px;"></div></div><span style="min-width: 45px; font-weight: 600;">' + item.taxa.toFixed(1) + '%</span></div></td>' +
            '<td><span class="badge ' + (barraPercentual >= 30 ? 'badge-success' : (barraPercentual >= 15 ? 'badge-warning' : 'badge-danger')) + '">' + tendencia + '</span></td>' +
            '</tr>';
    }
    htmlOrigem += '</tbody></table></div></div></div>';
    
    var htmlResponsavel = '<div class="card"><div class="card-header"><span class="card-title">👥 Conversão por Responsável</span></div><div class="card-body"><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Responsável</th><th>Total Leads</th><th>Convertidos</th><th>Taxa Conversão</th><th>Performance</th></tr></thead><tbody>';
    
    for (var i = 0; i < metricas.conversaoPorResponsavel.length; i++) {
        var item = metricas.conversaoPorResponsavel[i];
        var barraPercentual = item.taxa;
        var performance = barraPercentual >= 30 ? '⭐ Excelente' : (barraPercentual >= 15 ? '👍 Bom' : '⚠️ Atenção');
        var corPerformance = barraPercentual >= 30 ? 'badge-success' : (barraPercentual >= 15 ? 'badge-info' : 'badge-warning');
        
        htmlResponsavel += '<tr>' +
            '<td><strong>' + (item.responsavel || 'Não atribuído') + '</strong></td>' +
            '<td>' + item.total + '</td>' +
            '<td>' + item.convertidos + '</td>' +
            '<td><div style="display: flex; align-items: center; gap: 8px;"><div style="flex:1; background: #e5e7eb; border-radius: 10px; height: 8px;"><div style="width: ' + barraPercentual + '%; background: #0d9488; height: 8px; border-radius: 10px;"></div></div><span style="min-width: 45px; font-weight: 600;">' + item.taxa.toFixed(1) + '%</span></div></td>' +
            '<td><span class="badge ' + corPerformance + '">' + performance + '</span></td>' +
            '</tr>';
    }
    htmlResponsavel += '</tbody></table></div></div></div>';
    
    container.innerHTML = htmlOrigem + htmlResponsavel;
};

// =============================================
// RENDER GRID PRINCIPAL
// =============================================
managerApp.renderLeads = function() {
    this.leadsFiltrados = this.leadsFiltradosPorMes ? [...this.leadsFiltradosPorMes] : [...this.leadsList];
    this.renderLeadsFiltrados();
};

managerApp.renderLeadsFiltrados = function() {
    var leadsOrdenados = this.ordenarArrayPorColuna(this.leadsFiltrados, this.ordenacaoLeads.coluna, this.ordenacaoLeads.direcao, 'leads');
    this.atualizarIndicadoresOrdenacao('tabelaLeads', this.ordenacaoLeads.coluna);
    
    var tbody = document.querySelector('#tabelaLeads tbody');
    var leads = leadsOrdenados;
    
    var totalCountEl = document.getElementById('totalLeadsCount');
    if (totalCountEl) totalCountEl.innerHTML = leads.length;
    
    if (!leads || leads.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhum lead encontrado para o mês selecionado</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < leads.length; i++) {
        var l = leads[i];
        var statusClass = '';
        if (l.status && l.status.includes('Fechado')) statusClass = 'badge-success';
        else if (l.status && (l.status.includes('Perdido') || l.status.includes('Não qualificado'))) statusClass = 'badge-danger';
        else if (l.status && l.status.includes('Proposta')) statusClass = 'badge-info';
        else if (l.status && l.status.includes('Aguardando')) statusClass = 'badge-warning';
        else statusClass = 'badge-warning';
        
        var dataFormatada = Utils.formatarDataLeadParaBR(l.dataCadastro || '');
        var dataProximaAcaoFormatada = l.dataProximaAcao ? Utils.formatarDataLeadParaBR(l.dataProximaAcao) : '';
        
        html += '<tr data-lead-id="' + (l.id || '') + '">';
        html += '<td>' + (l.nomeCompleto || '') + '</td>';
        html += '<td>' + (l.telefone || '') + (l.email ? '<br><small>' + l.email + '</small>' : '') + '</td>';
        html += '<td>' + (l.origem || '') + '</td>';
        html += '<td>' + (l.regiaoAtendimento || '') + '</td>';
        html += '<td>' + (l.tipoServico || '') + '</td>';
        html += '<td><span class="badge ' + statusClass + '">' + (l.status || '📞 Novo Lead') + '</span></td>';
        html += '<td>' + dataFormatada + '</td>';
        html += '<td>' + (l.proximaAcao || '') + (dataProximaAcaoFormatada ? ' (' + dataProximaAcaoFormatada + ')' : '') + '</td>';
        html += '<td><button class="btn btn-sm btn-secondary" onclick="managerApp.editarLead(\'' + l.id + '\')">✏️</button> <button class="btn btn-sm btn-danger" onclick="managerApp.excluirLead(\'' + l.id + '\')">🗑️</button></td>';
        html += '</tr>';
    }
    if (tbody) tbody.innerHTML = html;
};

// =============================================
// FILTROS
// =============================================
managerApp.popularFiltrosLeads = function() {
    if (!this.metadadosLeads) return;
    
    var statusSelect = document.getElementById('filtroStatusLead');
    var origemSelect = document.getElementById('filtroOrigemLead');
    var responsavelSelect = document.getElementById('filtroResponsavelLead');
    
    if (statusSelect) {
        var statusHtml = '<option value="">Todos</option>';
        for (var i = 0; i < this.metadadosLeads.statusLead.length; i++) {
            statusHtml += '<option value="' + this.metadadosLeads.statusLead[i] + '">' + this.metadadosLeads.statusLead[i] + '</option>';
        }
        statusSelect.innerHTML = statusHtml;
    }
    
    if (origemSelect) {
        var origemHtml = '<option value="">Todas</option>';
        for (var i = 0; i < this.metadadosLeads.origens.length; i++) {
            origemHtml += '<option value="' + this.metadadosLeads.origens[i] + '">' + this.metadadosLeads.origens[i] + '</option>';
        }
        origemSelect.innerHTML = origemHtml;
    }
    
    if (responsavelSelect) {
        var respHtml = '<option value="">Todos</option>';
        for (var i = 0; i < this.metadadosLeads.responsaveis.length; i++) {
            respHtml += '<option value="' + this.metadadosLeads.responsaveis[i] + '">' + this.metadadosLeads.responsaveis[i] + '</option>';
        }
        responsavelSelect.innerHTML = respHtml;
    }
};

managerApp.filtrarLeads = function() {
    var status = document.getElementById('filtroStatusLead').value;
    var origem = document.getElementById('filtroOrigemLead').value;
    var responsavel = document.getElementById('filtroResponsavelLead').value;
    
    this.leadsFiltrados = this.leadsFiltradosPorMes ? [...this.leadsFiltradosPorMes] : [...this.leadsList];
    this.leadsFiltrados = this.leadsFiltrados.filter(function(lead) {
        if (status && lead.status !== status) return false;
        if (origem && lead.origem !== origem) return false;
        if (responsavel && lead.responsavel !== responsavel) return false;
        return true;
    });
    this.renderLeadsFiltrados();
};

managerApp.limparFiltrosLeads = function() {
    document.getElementById('filtroStatusLead').value = '';
    document.getElementById('filtroOrigemLead').value = '';
    document.getElementById('filtroResponsavelLead').value = '';
    this.leadsFiltrados = this.leadsFiltradosPorMes ? [...this.leadsFiltradosPorMes] : [...this.leadsList];
    this.renderLeadsFiltrados();
};

// =============================================
// EDITAR LEAD
// =============================================
managerApp.editarLead = function(leadId) {
    var self = this;
    var lead = null;
    for (var i = 0; i < this.leadsList.length; i++) {
        if (this.leadsList[i].id == leadId) {
            lead = this.leadsList[i];
            break;
        }
    }
    if (lead) { this.abrirModalLead(lead); } else { Utils.showToast('Lead não encontrado', 'error'); }
};

// =============================================
// EXCLUIR LEAD (COM INVALIDAÇÃO DE CACHE DE MÉTRICAS)
// =============================================
managerApp.excluirLead = function(leadId) {
    var self = this;
    var lead = null;
    for (var i = 0; i < this.leadsList.length; i++) {
        if (this.leadsList[i].id == leadId) {
            lead = this.leadsList[i];
            break;
        }
    }
    if (!lead) { Utils.showToast('Lead não encontrado', 'error'); return; }
    
    this.confirmarExclusao(
        'Deseja realmente excluir o lead <strong>"' + (lead.nomeCompleto || '') + '"</strong>?',
        '🗑️ Excluir Lead',
        function(confirmado) {
            if (confirmado) {
                Utils.showLoading('Excluindo...');
                API.excluirLead(lead.id)
                    .then(function() {
                        Utils.hideLoading();
                        Utils.showToast('Lead excluído com sucesso!');
                        managerApp.invalidarCache('leads');
                        managerApp.invalidarCache('dashboard');
                        
                        // 🔥 Invalidar cache de métricas comerciais
                        managerApp.metricasComerciais = null;
                        managerApp._metricasComerciaisVersao = 0;
                        
                        // 🔥 Notificar outras abas
                        if (typeof managerApp._notificarLeadsAtualizados === 'function') {
                            managerApp._notificarLeadsAtualizados();
                        }
                        
                        return managerApp.carregarLeadsDaAPI();
                    })
                    .then(function() {
                        var selectMes = document.getElementById('mesReferenciaLeads');
                        var mesAtual = selectMes ? selectMes.value : self.getMesReferencia();
                        self.mesLeadsAtual = mesAtual;
                        
                        self.atualizarLeadsPorMes(mesAtual);
                        
                        var leadsFiltrados = self.leadsFiltradosPorMes || self.leadsList;
                        // 🔥 Usar chave diferente (não sobrescrever metricasComerciais)
                        self._metricasLeadsCache = self.calcularMetricasComerciais(leadsFiltrados);
                        self.renderizarRelatorioConversao(self._metricasLeadsCache);
                        
                        self.renderLeads();
                        
                        if (self._gridSecundarioAtivo) {
                            self.renderizarGridSecundario();
                        }
                        
                        self.renderizarCardsResumoLeads(leadsFiltrados, mesAtual);
                        self.renderizarPainelNotificacoes(leadsFiltrados);
                        self.renderizarRecomendacoes(leadsFiltrados);
                        self.renderizarFunilDetalhado(leadsFiltrados);
                        self.renderizarGraficoLeadsPorOrigem(leadsFiltrados);
                        self.renderizarGraficoEvolucaoLeads(leadsFiltrados);
                        
                        if (typeof self.renderizarLeadsAltaProbabilidade === 'function') {
                            self.renderizarLeadsAltaProbabilidade();
                            self._atualizarContadorLeadsQuentes();
                        }
                        
                        console.log('✅ Todos os grids e cards atualizados após exclusão');
                    })
                    .catch(function(error) {
                        Utils.hideLoading();
                        Utils.showToast('Erro ao excluir: ' + error.message, 'error');
                    });
            }
        }
    );
};

// =============================================
// FASE 2: RENDERIZAR RECOMENDAÇÕES
// =============================================
managerApp.renderizarRecomendacoes = function(leads) {
    var container = document.getElementById('leadsRecomendacoesContainer');
    if (!container) return;
    
    if (!leads) leads = this.leadsFiltradosPorMes || this.leadsList;
    
    if (leads.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    var metricas = this.calcularMetricasComerciais(leads);
    var recomendacoes = this.gerarRecomendacoes(metricas, leads);
    
    if (recomendacoes.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    var html = '<div class="card" style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border: 1px solid #0d9488;">';
    html += '  <div class="card-header" style="background: transparent;">';
    html += '    <span class="card-title">💡 Recomendações Estratégicas</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 20px;">';
    html += '    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">';
    
    for (var i = 0; i < recomendacoes.length; i++) {
        var rec = recomendacoes[i];
        var cor = rec.tipo === 'positivo' ? '#10b981' : (rec.tipo === 'alerta' ? '#ef4444' : '#f59e0b');
        var icone = rec.tipo === 'positivo' ? '✅' : (rec.tipo === 'alerta' ? '⚠️' : '💡');
        
        html += '    <div style="background: white; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ' + cor + ';">';
        html += '      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">';
        html += '        <span style="font-size: 18px;">' + icone + '</span>';
        html += '        <span style="font-weight: 600; font-size: 13px; color: ' + cor + ';">' + rec.titulo + '</span>';
        html += '      </div>';
        html += '      <div style="font-size: 13px; color: var(--gray-600);">' + rec.descricao + '</div>';
        if (rec.acao) {
            html += '      <div style="margin-top: 6px;">';
            html += '        <span style="font-size: 12px; background: var(--gray-100); padding: 2px 10px; border-radius: 12px; color: var(--gray-600);">' + rec.acao + '</span>';
            html += '      </div>';
        }
        html += '    </div>';
    }
    
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
};

// =============================================
// FASE 2: GERAR RECOMENDAÇÕES
// =============================================
managerApp.gerarRecomendacoes = function(metricas, leads) {
    var recomendacoes = [];
    
    if (metricas.origemMaiorROI.origem && metricas.origemMaiorROI.quantidade >= 3) {
        recomendacoes.push({
            tipo: 'positivo',
            titulo: '🏆 Melhor Origem: ' + metricas.origemMaiorROI.origem,
            descricao: 'Esta origem tem ' + metricas.origemMaiorROI.taxa.toFixed(1) + '% de conversão com ' + metricas.origemMaiorROI.quantidade + ' leads. Invista mais nela!',
            acao: 'Aumentar investimento em ' + metricas.origemMaiorROI.origem
        });
    }
    
    if (metricas.responsavelMaiorConversao.responsavel && metricas.responsavelMaiorConversao.quantidade >= 3) {
        recomendacoes.push({
            tipo: 'positivo',
            titulo: '👤 Melhor Performance: ' + metricas.responsavelMaiorConversao.responsavel,
            descricao: 'Este responsável tem ' + metricas.responsavelMaiorConversao.taxa.toFixed(1) + '% de conversão com ' + metricas.responsavelMaiorConversao.quantidade + ' leads.',
            acao: 'Analisar e replicar abordagem de ' + metricas.responsavelMaiorConversao.responsavel
        });
    }
    
    if (metricas.taxaConversaoGeral < 10 && metricas.totalLeads > 5) {
        recomendacoes.push({
            tipo: 'alerta',
            titulo: '📉 Taxa de Conversão Baixa (' + metricas.taxaConversaoGeral.toFixed(1) + '%)',
            descricao: 'Apenas ' + metricas.leadsConvertidos + ' de ' + metricas.totalLeads + ' leads foram convertidos. Revisar processo de vendas.',
            acao: 'Revisar funil de vendas e abordagem comercial'
        });
    }
    
    var leadsParados = 0;
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    for (var i = 0; i < leads.length; i++) {
        var status = leads[i].status || '';
        if (status === '📞 Novo Lead' || status === '🔄 Em Negociação') {
            var dataRef = leads[i].dataProximaAcao || leads[i].dataCadastro || leads[i].timestamp;
            if (dataRef) {
                var dataLead = new Date(dataRef);
                if (!isNaN(dataLead.getTime())) {
                    dataLead.setHours(0, 0, 0, 0);
                    var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                    if (diffDias > 7) leadsParados++;
                }
            }
        }
    }
    if (leadsParados > 3) {
        recomendacoes.push({
            tipo: 'alerta',
            titulo: '⏳ Leads Parados (' + leadsParados + ' leads)',
            descricao: leadsParados + ' leads estão parados há mais de 7 dias sem atualização.',
            acao: 'Priorizar contato com leads parados'
        });
    }
    
    if (metricas.ticketMedioConvertidos > 0) {
        var metaTicket = this.metas.ticketMedioNovoLead || 5000;
        if (metricas.ticketMedioConvertidos < metaTicket * 0.7) {
            recomendacoes.push({
                tipo: 'alerta',
                titulo: '💰 Ticket Médio Abaixo da Meta (' + Utils.formatCurrency(metricas.ticketMedioConvertidos) + ')',
                descricao: 'Ticket médio está ' + ((1 - metricas.ticketMedioConvertidos / metaTicket) * 100).toFixed(0) + '% abaixo da meta de ' + Utils.formatCurrency(metaTicket),
                acao: 'Revisar estratégia de precificação e upsell'
            });
        } else if (metricas.ticketMedioConvertidos > metaTicket * 1.2) {
            recomendacoes.push({
                tipo: 'positivo',
                titulo: '💰 Ticket Médio Acima da Meta (' + Utils.formatCurrency(metricas.ticketMedioConvertidos) + ')',
                descricao: 'Ticket médio está ' + ((metricas.ticketMedioConvertidos / metaTicket - 1) * 100).toFixed(0) + '% acima da meta de ' + Utils.formatCurrency(metaTicket),
                acao: 'Manter estratégia atual'
            });
        }
    }
    
    var regioes = {};
    for (var i = 0; i < leads.length; i++) {
        var regiao = leads[i].regiaoAtendimento || 'Não informada';
        if (!regioes[regiao]) regioes[regiao] = 0;
        regioes[regiao]++;
    }
    var regioesOrdenadas = Object.keys(regioes).sort(function(a, b) { return regioes[b] - regioes[a]; });
    if (regioesOrdenadas.length > 0 && regioesOrdenadas[0] !== 'Não informada') {
        recomendacoes.push({
            tipo: 'positivo',
            titulo: '📍 Região com mais leads: ' + regioesOrdenadas[0],
            descricao: regioesOrdenadas[0] + ' tem ' + regioes[regioesOrdenadas[0]] + ' leads, ' + (regioes[regioesOrdenadas[0]] / leads.length * 100).toFixed(0) + '% do total.',
            acao: 'Focar ações de marketing em ' + regioesOrdenadas[0]
        });
    }
    
    if (metricas.tempoMedioConversaoDias > 0 && metricas.leadsConvertidos > 0) {
        if (metricas.tempoMedioConversaoDias > 30) {
            recomendacoes.push({
                tipo: 'alerta',
                titulo: '⏱️ Tempo Médio de Conversão Elevado (' + metricas.tempoMedioConversaoDias.toFixed(0) + ' dias)',
                descricao: 'Leads levam em média ' + metricas.tempoMedioConversaoDias.toFixed(0) + ' dias para converter. Ideal é reduzir para 15-20 dias.',
                acao: 'Acelerar processo de follow-up'
            });
        } else if (metricas.tempoMedioConversaoDias < 15 && metricas.leadsConvertidos > 3) {
            recomendacoes.push({
                tipo: 'positivo',
                titulo: '⚡ Tempo Médio de Conversão Rápido (' + metricas.tempoMedioConversaoDias.toFixed(0) + ' dias)',
                descricao: 'Leads convertem em média em ' + metricas.tempoMedioConversaoDias.toFixed(0) + ' dias, abaixo da média do mercado.',
                acao: 'Manter processo de vendas ágil'
            });
        }
    }
    
    return recomendacoes.slice(0, 6);
};

// =============================================
// FASE 2: RENDERIZAR GRÁFICO DE EVOLUÇÃO
// =============================================
managerApp.renderizarGraficoEvolucaoLeads = function(leads) {
    var container = document.getElementById('leadsGraficoEvolucaoContainer');
    if (!container) return;
    
    if (!leads) leads = this.leadsFiltradosPorMes || this.leadsList;
    
    var dadosPorMes = {};
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        var dataCadastro = lead.dataCadastro || lead.timestamp;
        if (dataCadastro) {
            var data = new Date(dataCadastro);
            if (!isNaN(data.getTime())) {
                var mesAno = data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
                if (!dadosPorMes[mesAno]) {
                    dadosPorMes[mesAno] = { total: 0, convertidos: 0, somaValores: 0 };
                }
                dadosPorMes[mesAno].total++;
                if (lead.status === '✅ Fechado (Contrato)') {
                    dadosPorMes[mesAno].convertidos++;
                    dadosPorMes[mesAno].somaValores += parseFloat(lead.valorEstimado) || 0;
                }
            }
        }
    }
    
    var meses = Object.keys(dadosPorMes).sort();
    if (meses.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    var labels = [];
    var totais = [];
    var convertidos = [];
    var taxas = [];
    var tickets = [];
    
    var mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (var i = 0; i < meses.length; i++) {
        var parts = meses[i].split('-');
        var mesNum = parseInt(parts[1]);
        labels.push(mesesNomes[mesNum - 1] + '/' + parts[0]);
        var dados = dadosPorMes[meses[i]];
        totais.push(dados.total);
        convertidos.push(dados.convertidos);
        var taxa = dados.total > 0 ? (dados.convertidos / dados.total * 100) : 0;
        taxas.push(Math.round(taxa * 10) / 10);
        var ticket = dados.convertidos > 0 ? Math.round(dados.somaValores / dados.convertidos) : 0;
        tickets.push(ticket);
    }
    
    var canvasId = 'chartEvolucaoLeads';
    var existingCanvas = document.getElementById(canvasId);
    if (existingCanvas) {
        container.innerHTML = '';
    }
    
    var html = '<div class="chart-card" style="margin-bottom: 0;">';
    html += '  <div class="chart-header">';
    html += '    <span class="card-title">📈 Evolução Mensal de Leads</span>';
    html += '  </div>';
    html += '  <div class="chart-body">';
    html += '    <div class="chart-canvas-wrapper" style="height: 250px;">';
    html += '      <canvas id="' + canvasId + '" width="400" height="250"></canvas>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
    
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    var ctx2d = ctx.getContext('2d');
    
    if (this.chartEvolucaoLeads) {
        this.chartEvolucaoLeads.destroy();
        this.chartEvolucaoLeads = null;
    }
    
    if (typeof Chart === 'undefined') return;
    
    try {
        this.chartEvolucaoLeads = new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Leads',
                        data: totais,
                        backgroundColor: 'rgba(13, 148, 136, 0.7)',
                        borderColor: '#0d9488',
                        borderWidth: 2,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'Leads Convertidos',
                        data: convertidos,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: '#10b981',
                        borderWidth: 2,
                        borderRadius: 4,
                        order: 3
                    },
                    {
                        label: 'Taxa Conversão (%)',
                        data: taxas,
                        type: 'line',
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#8b5cf6',
                        order: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.label === 'Taxa Conversão (%)') {
                                    return context.dataset.label + ': ' + context.raw + '%';
                                }
                                return context.dataset.label + ': ' + context.raw;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: { font: { size: 10 }, boxWidth: 12, padding: 8 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        ticks: { font: { size: 10 }, stepSize: 1 }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        ticks: { font: { size: 10 }, callback: function(value) { return value + '%'; } },
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de evolução de leads:', error);
    }
};

// =============================================
// FASE 2: RENDERIZAR PAINEL DE NOTIFICAÇÕES
// =============================================
managerApp.renderizarPainelNotificacoes = function(leads) {
    var container = document.getElementById('leadsNotificacoesContainer');
    if (!container) return;
    
    if (!leads) leads = this.leadsFiltradosPorMes || this.leadsList;
    
    var notificacoes = this.gerarNotificacoes(leads);
    
    if (notificacoes.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    var html = '<div class="card" style="border-left: 4px solid #f59e0b;">';
    html += '  <div class="card-header" style="background: #fef3c7;">';
    html += '    <span class="card-title">🔔 Centro de Notificações</span>';
    html += '    <span class="badge badge-warning">' + notificacoes.length + ' alertas</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 16px;">';
    
    var prioridades = { 'CRITICO': 0, 'ALTO': 1, 'MEDIO': 2, 'BAIXO': 3 };
    notificacoes.sort(function(a, b) {
        return (prioridades[a.prioridade] || 99) - (prioridades[b.prioridade] || 99);
    });
    
    for (var i = 0; i < notificacoes.length; i++) {
        var n = notificacoes[i];
        var cores = {
            'CRITICO': { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', icon: '🚨' },
            'ALTO': { bg: '#fef3c7', border: '#f59e0b', text: '#f59e0b', icon: '⚠️' },
            'MEDIO': { bg: '#eff6ff', border: '#3b82f6', text: '#3b82f6', icon: 'ℹ️' },
            'BAIXO': { bg: '#f3f4f6', border: '#6b7280', text: '#6b7280', icon: '📌' }
        };
        var cor = cores[n.prioridade] || cores['BAIXO'];
        
        var isAtivo = false;
        if (n.tipo === 'semContato' && this._gridSecundarioAtivo && this._gridSecundarioTipo === 'semContato') {
            isAtivo = true;
        } else if (n.tipo === 'atrasoCritico' && this._gridSecundarioAtivo && this._gridSecundarioTipo === 'atrasoCritico') {
            isAtivo = true;
        }
        var botaoTexto = isAtivo ? 'Fechar Leads' : 'Ver Leads';
        
        html += '    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 6px; background: ' + cor.bg + '; border-radius: 6px; border-left: 3px solid ' + cor.border + ';">';
        html += '      <div style="display: flex; align-items: center; gap: 10px; flex: 1;">';
        html += '        <span style="font-size: 16px;">' + cor.icon + '</span>';
        html += '        <div style="flex: 1;">';
        html += '          <div style="font-size: 13px; font-weight: 600; color: ' + cor.text + ';">' + n.titulo + '</div>';
        html += '          <div style="font-size: 12px; color: var(--gray-600);">' + n.descricao + '</div>';
        html += '        </div>';
        html += '      </div>';
        html += '      <div style="display: flex; gap: 6px; flex-shrink: 0; align-items: center;">';
        if (n.tipo === 'semContato' || n.tipo === 'atrasoCritico') {
            html += '        <button class="btn btn-sm btn-primary" onclick="managerApp.toggleGridSecundario(\'' + n.tipo + '\')" style="height: 26px; font-size: 10px; padding: 2px 8px;">' + botaoTexto + '</button>';
        }
        html += '        <button class="btn btn-sm btn-secondary" onclick="managerApp.fecharNotificacao(\'' + n.id + '\')" style="height: 26px; font-size: 10px; padding: 2px 6px;">✕</button>';
        html += '      </div>';
        html += '    </div>';
    }
    
    html += '    <div style="margin-top: 8px; font-size: 11px; color: var(--gray-400); text-align: right;">Clique em ✕ para fechar a notificação</div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
};

// =============================================
// FASE 2: GERAR NOTIFICAÇÕES
// =============================================
managerApp.gerarNotificacoes = function(leads) {
    var notificacoes = [];
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // 1. Leads com ação atrasada (CRITICO)
    var leadsAtrasados = [];
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        var status = lead.status || '';
        if (status === '✅ Fechado (Contrato)' || status === '❌ Perdido' || status === '🚫 Não qualificado') continue;
        var dataProximaAcao = lead.dataProximaAcao;
        if (dataProximaAcao) {
            var dataAcao = new Date(dataProximaAcao);
            if (!isNaN(dataAcao.getTime()) && dataAcao < hoje) {
                var dias = Math.floor((hoje - dataAcao) / (1000 * 60 * 60 * 24));
                if (dias > 15) {
                    leadsAtrasados.push({ nome: lead.nomeCompleto || 'Lead', dias: dias, id: lead.id });
                }
            }
        }
    }
    if (leadsAtrasados.length > 0) {
        var nomes = leadsAtrasados.slice(0, 5).map(function(l) { return l.nome; }).join(', ');
        var resto = leadsAtrasados.length > 5 ? ' e +' + (leadsAtrasados.length - 5) + ' outros' : '';
        notificacoes.push({
            id: 'atrasado_' + Date.now(),
            prioridade: 'CRITICO',
            tipo: 'atrasoCritico',
            titulo: '🔴 ' + leadsAtrasados.length + ' lead(s) com atraso crítico',
            descricao: 'Leads: ' + nomes + resto + ' - Atraso de ' + leadsAtrasados[0].dias + ' dias ou mais'
        });
    }
    
    // 2. Leads sem contato (ALTO)
    var leadsSemContato = [];
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        var status = lead.status || '';
        if (status === '✅ Fechado (Contrato)' || status === '❌ Perdido' || status === '🚫 Não qualificado') continue;
        var dataRef = lead.dataProximaAcao || lead.dataCadastro || lead.timestamp;
        if (dataRef) {
            var dataLead = new Date(dataRef);
            if (!isNaN(dataLead.getTime())) {
                dataLead.setHours(0, 0, 0, 0);
                var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                if (diffDias > 7) {
                    leadsSemContato.push(lead.nomeCompleto || 'Lead');
                }
            }
        }
    }
    if (leadsSemContato.length > 0) {
        var nomesSC = leadsSemContato.slice(0, 3).join(', ');
        var restoSC = leadsSemContato.length > 3 ? ' e +' + (leadsSemContato.length - 3) + ' outros' : '';
        notificacoes.push({
            id: 'semcontato_' + Date.now(),
            prioridade: 'ALTO',
            tipo: 'semContato',
            titulo: '⚠️ ' + leadsSemContato.length + ' lead(s) sem contato',
            descricao: 'Leads: ' + nomesSC + restoSC + ' - Sem interação há mais de 7 dias'
        });
    }
    
    // 3. Leads com alta probabilidade (MEDIO)
    var leadsQuentes = [];
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        var status = lead.status || '';
        if (status === '🔄 Em Negociação' || status === '📄 Proposta Enviada') {
            var dataRef = lead.dataProximaAcao || lead.dataCadastro || lead.timestamp;
            if (dataRef) {
                var dataLead = new Date(dataRef);
                if (!isNaN(dataLead.getTime())) {
                    dataLead.setHours(0, 0, 0, 0);
                    var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                    if (diffDias <= 7) {
                        leadsQuentes.push(lead.nomeCompleto || 'Lead');
                    }
                }
            }
        }
    }
    if (leadsQuentes.length > 0) {
        var nomesQ = leadsQuentes.slice(0, 3).join(', ');
        var restoQ = leadsQuentes.length > 3 ? ' e +' + (leadsQuentes.length - 3) + ' outros' : '';
        notificacoes.push({
            id: 'quente_' + Date.now(),
            prioridade: 'MEDIO',
            tipo: 'quente',
            titulo: '🔥 ' + leadsQuentes.length + ' lead(s) quente(s)',
            descricao: 'Leads: ' + nomesQ + restoQ + ' - Em negociação ativa nos últimos 7 dias'
        });
    }
    
    // 4. Novos leads (BAIXO)
    var novosLeads = [];
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        if (lead.status === '📞 Novo Lead') {
            var dataRef = lead.dataCadastro || lead.timestamp;
            if (dataRef) {
                var dataLead = new Date(dataRef);
                if (!isNaN(dataLead.getTime())) {
                    dataLead.setHours(0, 0, 0, 0);
                    var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                    if (diffDias <= 3) {
                        novosLeads.push(lead.nomeCompleto || 'Lead');
                    }
                }
            }
        }
    }
    if (novosLeads.length > 0) {
        var nomesN = novosLeads.slice(0, 3).join(', ');
        var restoN = novosLeads.length > 3 ? ' e +' + (novosLeads.length - 3) + ' outros' : '';
        notificacoes.push({
            id: 'novo_' + Date.now(),
            prioridade: 'BAIXO',
            tipo: 'novo',
            titulo: '✨ ' + novosLeads.length + ' novo(s) lead(s)',
            descricao: 'Leads: ' + nomesN + restoN + ' - Cadastrados nos últimos 3 dias'
        });
    }
    
    return notificacoes.slice(0, 6);
};

// =============================================
// FASE 2: TOGGLE DO GRID SECUNDÁRIO
// =============================================
managerApp.toggleGridSecundario = function(tipo) {
    var container = document.getElementById('leadsGridSecundarioContainer');
    if (!container) return;
    
    if (this._gridSecundarioAtivo && this._gridSecundarioTipo === tipo) {
        this._gridSecundarioAtivo = false;
        this._gridSecundarioTipo = null;
        this._leadsGridSecundario = [];
        container.style.display = 'none';
        var leads = this.leadsFiltradosPorMes || this.leadsList;
        this.renderizarPainelNotificacoes(leads);
        Utils.showToast('📋 Grid secundário fechado', 'info');
        return;
    }
    
    this._gridSecundarioAtivo = true;
    this._gridSecundarioTipo = tipo;
    
    var leads = this.leadsFiltradosPorMes || this.leadsList;
    
    if (tipo === 'semContato') {
        this._leadsGridSecundario = this.filtrarLeadsSemContatoLista(leads);
        Utils.showToast('🔍 Exibindo ' + this._leadsGridSecundario.length + ' leads sem contato', 'info');
    } else if (tipo === 'atrasoCritico') {
        this._leadsGridSecundario = this.filtrarLeadsAtrasoCriticoLista(leads);
        Utils.showToast('🔍 Exibindo ' + this._leadsGridSecundario.length + ' leads com atraso crítico', 'info');
    }
    
    this.renderizarGridSecundario();
    container.style.display = 'block';
    
    this.renderizarPainelNotificacoes(leads);
};

// =============================================
// RENDERIZAR GRID SECUNDÁRIO
// =============================================
managerApp.renderizarGridSecundario = function() {
    var container = document.getElementById('leadsGridSecundarioContainer');
    if (!container) return;
    
    if (!this._gridSecundarioAtivo || this._leadsGridSecundario.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    var titulo = this._gridSecundarioTipo === 'semContato' ? '⚠️ Leads sem Contato' : '🔴 Leads com Atraso Crítico';
    
    var html = '<div class="card" style="border-left: 4px solid #f59e0b;">';
    html += '  <div class="card-header" style="background: #fef3c7; display: flex; justify-content: space-between; align-items: center;">';
    html += '    <span class="card-title">' + titulo + ' (' + this._leadsGridSecundario.length + ' leads)</span>';
    html += '    <button class="btn btn-sm btn-secondary" onclick="managerApp.fecharGridSecundario()" style="height: 28px;">✕ Fechar</button>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 16px;">';
    html += '    <div class="data-table-wrapper">';
    html += '      <table class="data-table" id="tabelaLeadsSecundario">';
    html += '        <thead>';
    html += '          <tr>';
    html += '            <th class="sortable" data-sort-col="nome">Nome</th>';
    html += '            <th class="sortable" data-sort-col="contato">Contato</th>';
    html += '            <th class="sortable" data-sort-col="origem">Origem</th>';
    html += '            <th>Região</th>';
    html += '            <th>Tipo Serviço</th>';
    html += '            <th class="sortable" data-sort-col="status">Status</th>';
    html += '            <th class="sortable" data-sort-col="data">Data</th>';
    html += '            <th class="sortable" data-sort-col="proximaAcao">Próxima Ação</th>';
    html += '            <th>Ações</th>';
    html += '          </tr>';
    html += '        </thead>';
    html += '        <tbody>';
    
    var leadsOrdenados = this.ordenarArrayPorColuna(this._leadsGridSecundario, this.ordenacaoLeads.coluna, this.ordenacaoLeads.direcao, 'leads');
    
    for (var i = 0; i < leadsOrdenados.length; i++) {
        var l = leadsOrdenados[i];
        var statusClass = '';
        if (l.status && l.status.includes('Fechado')) statusClass = 'badge-success';
        else if (l.status && (l.status.includes('Perdido') || l.status.includes('Não qualificado'))) statusClass = 'badge-danger';
        else if (l.status && l.status.includes('Proposta')) statusClass = 'badge-info';
        else if (l.status && l.status.includes('Aguardando')) statusClass = 'badge-warning';
        else statusClass = 'badge-warning';
        
        var dataFormatada = Utils.formatarDataLeadParaBR(l.dataCadastro || '');
        var dataProximaAcaoFormatada = l.dataProximaAcao ? Utils.formatarDataLeadParaBR(l.dataProximaAcao) : '';
        
        html += '<tr data-lead-id="' + (l.id || '') + '">';
        html += '  <td>' + (l.nomeCompleto || 'Nome não informado') + '</td>';
        html += '  <td>' + (l.telefone || '-') + (l.email ? '<br><small>' + l.email + '</small>' : '') + '</td>';
        html += '  <td>' + (l.origem || '') + '</td>';
        html += '  <td>' + (l.regiaoAtendimento || '') + '</td>';
        html += '  <td>' + (l.tipoServico || '') + '</td>';
        html += '  <td><span class="badge ' + statusClass + '">' + (l.status || '📞 Novo Lead') + '</span></td>';
        html += '  <td>' + dataFormatada + '</td>';
        html += '  <td>' + (l.proximaAcao || '') + (dataProximaAcaoFormatada ? ' (' + dataProximaAcaoFormatada + ')' : '') + '</td>';
        html += '  <td><button class="btn btn-sm btn-primary" onclick="managerApp.registrarContatoLeadSecundario(\'' + l.id + '\')">📞 Registrar Contato</button></td>';
        html += '</tr>';
    }
    
    html += '        </tbody>';
    html += '      </table>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
    container.style.display = 'block';
    
    this.atualizarIndicadoresOrdenacao('tabelaLeadsSecundario', this.ordenacaoLeads.coluna);
};

// =============================================
// FECHAR GRID SECUNDÁRIO
// =============================================
managerApp.fecharGridSecundario = function() {
    this._gridSecundarioAtivo = false;
    this._gridSecundarioTipo = null;
    this._leadsGridSecundario = [];
    
    var container = document.getElementById('leadsGridSecundarioContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    
    var leads = this.leadsFiltradosPorMes || this.leadsList;
    this.renderizarPainelNotificacoes(leads);
    Utils.showToast('📋 Grid secundário fechado', 'info');
};

// =============================================
// FILTRAR LEADS SEM CONTATO (LISTA)
// =============================================
managerApp.filtrarLeadsSemContatoLista = function(leads) {
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    var resultado = [];
    
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        var status = lead.status || '';
        if (status === '✅ Fechado (Contrato)' || status === '❌ Perdido' || status === '🚫 Não qualificado') continue;
        var dataRef = lead.dataProximaAcao || lead.dataCadastro || lead.timestamp;
        if (dataRef) {
            var dataLead = new Date(dataRef);
            if (!isNaN(dataLead.getTime())) {
                dataLead.setHours(0, 0, 0, 0);
                var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                if (diffDias > 7) resultado.push(lead);
            }
        }
    }
    return resultado;
};

// =============================================
// FILTRAR LEADS COM ATRASO CRÍTICO (LISTA)
// =============================================
managerApp.filtrarLeadsAtrasoCriticoLista = function(leads) {
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    var resultado = [];
    
    for (var i = 0; i < leads.length; i++) {
        var lead = leads[i];
        var status = lead.status || '';
        if (status === '✅ Fechado (Contrato)' || status === '❌ Perdido' || status === '🚫 Não qualificado') continue;
        var dataProximaAcao = lead.dataProximaAcao;
        if (dataProximaAcao) {
            var dataAcao = new Date(dataProximaAcao);
            if (!isNaN(dataAcao.getTime()) && dataAcao < hoje) {
                var dias = Math.floor((hoje - dataAcao) / (1000 * 60 * 60 * 24));
                if (dias > 15) resultado.push(lead);
            }
        }
    }
    return resultado;
};

// =============================================
// REGISTRAR CONTATO LEAD (GRID SECUNDÁRIO)
// =============================================
managerApp.registrarContatoLeadSecundario = function(leadId) {
    var self = this;
    var lead = null;
    
    for (var i = 0; i < this._leadsGridSecundario.length; i++) {
        if (this._leadsGridSecundario[i].id == leadId) {
            lead = this._leadsGridSecundario[i];
            break;
        }
    }
    
    if (!lead) {
        for (var i = 0; i < this.leadsList.length; i++) {
            if (this.leadsList[i].id == leadId) {
                lead = this.leadsList[i];
                break;
            }
        }
    }
    
    if (!lead) { Utils.showToast('Lead não encontrado', 'error'); return; }
    
    var modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').innerHTML = '📞 Registrar Contato - ' + (lead.nomeCompleto || '');
    var hojeISO = new Date().toISOString().slice(0, 10);
    var sugestaoProximaAcao = lead.proximaAcao || 'Entrar em contato novamente';
    
    document.getElementById('modalBody').innerHTML = 
        '<div class="form-group">' +
        '<label>Ações Rápidas</label>' +
        '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 6px;">' +
        '<button class="btn btn-sm btn-secondary" onclick="managerApp.aplicarAcaoRapida(\'Enviar WhatsAPP.\', 1)" style="font-size: 11px; padding: 6px 4px; height: auto; min-height: 32px; width: 100%;">📱 Enviar WhatsAPP.</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="managerApp.aplicarAcaoRapida(\'Enviar Valores.\', 0)" style="font-size: 11px; padding: 6px 4px; height: auto; min-height: 32px; width: 100%;">📄 Enviar Valores.</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="managerApp.aplicarAcaoRapida(\'Formalizar Proposta.\', 0)" style="font-size: 11px; padding: 6px 4px; height: auto; min-height: 32px; width: 100%;">💰 Formalizar Proposta.</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="managerApp.aplicarAcaoRapida(\'Enviar Contrato.\', 0)" style="font-size: 11px; padding: 6px 4px; height: auto; min-height: 32px; width: 100%;">📝 Enviar Contrato.</button>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;">' +
        '<button class="btn btn-sm btn-secondary" onclick="managerApp.aplicarAcaoRapida(\'Marcar Reunião.\', 5)" style="font-size: 11px; padding: 6px 4px; height: auto; min-height: 32px; width: 100%;">📅 Marcar Reunião.</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="managerApp.aplicarAcaoRapida(\'Ligar em 3 Dias.\', 3)" style="font-size: 11px; padding: 6px 4px; height: auto; min-height: 32px; width: 100%;">📞 Ligar em 3 Dias.</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="managerApp.aplicarAcaoRapida(\'Outros\', 0, false, true)" style="font-size: 11px; padding: 6px 4px; height: auto; min-height: 32px; width: 100%;">🔄 Outros</button>' +
        '<div style="width: 100%;"></div>' +
        '</div>' +
        '</div>' +
        '<div class="form-row" style="margin-bottom: 12px;">' +
        '<div class="form-group" style="flex: 1; min-width: 0;">' +
        '<label>Próxima Ação</label>' +
        '<input class="form-input" id="modalContatoProximaAcao" value="' + sugestaoProximaAcao.replace(/"/g, '&quot;') + '">' +
        '</div>' +
        '<div class="form-group" style="flex: 1; min-width: 0;">' +
        '<label>Data da Próxima Ação</label>' +
        '<input type="date" class="form-input" id="modalContatoDataProxima" value="' + hojeISO + '">' +
        '</div>' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Registro do Contato</label>' +
        '<textarea class="form-textarea" id="modalContatoRegistro" rows="3" placeholder="Descreva o que foi conversado..."></textarea>' +
        '</div>';
    
    // 🔥 PADRONIZADO: botões com flex: 1 (50% cada)
    document.getElementById('modalFooter').innerHTML = 
        '<div style="display: flex; gap: 12px; width: 100%;">' +
        '  <button class="btn btn-secondary" onclick="managerApp.fecharModal()" style="flex: 1;">Cancelar</button>' +
        '  <button class="btn btn-success" id="modalSalvarContatoSecundario" style="flex: 1;">Salvar e Atualizar</button>' +
        '</div>';
    
    modal.style.display = 'flex';
    
    document.getElementById('modalSalvarContatoSecundario').onclick = function() {
        var novaProximaAcao = document.getElementById('modalContatoProximaAcao').value;
        var novaDataProxima = document.getElementById('modalContatoDataProxima').value;
        var registro = document.getElementById('modalContatoRegistro').value;
        var novoStatus = document.getElementById('modalLeadStatus') ? document.getElementById('modalLeadStatus').value : lead.status;
        
        if (!novaProximaAcao) { Utils.showToast('Informe a próxima ação', 'warning'); return; }
        
        Utils.showLoading('Atualizando lead...');
        var leadData = {
            nome: lead.nomeCompleto || '',
            contato: lead.telefone || '',
            email: lead.email || '',
            origem: lead.origem || '',
            regiaoAtendimento: lead.regiaoAtendimento || '',
            tipoServico: lead.tipoServico || '',
            dataNecessidade: lead.dataNecessidade || '',
            periodoContratacao: lead.periodoContratacao || '',
            turnoPreferencia: lead.turnoPreferencia || '',
            status: novoStatus || lead.status || '',
            proximaAcao: novaProximaAcao,
            dataProximaAcao: novaDataProxima,
            responsavel: lead.responsavel || '',
            valorEstimado: lead.valorEstimado || 0,
            observacoes: (lead.observacoes || '') + '\n' + registro
        };
        
        API.atualizarLead(lead.id, leadData)
            .then(function() {
                Utils.hideLoading();
                Utils.showToast('Contato registrado e lead atualizado!');
                managerApp.invalidarCache('leads');
                managerApp.invalidarCache('dashboard');
                
                // 🔥 Invalidar cache de métricas comerciais
                managerApp.metricasComerciais = null;
                managerApp._metricasComerciaisVersao = 0;
                
                // 🔥 Notificar outras abas
                if (typeof managerApp._notificarLeadsAtualizados === 'function') {
                    managerApp._notificarLeadsAtualizados();
                }
                
                self.carregarLeadsDaAPI().then(function() {
                    var selectMes = document.getElementById('mesReferenciaLeads');
                    var mesAtual = selectMes ? selectMes.value : self.getMesReferencia();
                    self.atualizarLeadsPorMes(mesAtual);
                });
                self.fecharModal();
            })
            .catch(function(error) {
                Utils.hideLoading();
                Utils.showToast('Erro ao atualizar: ' + error.message, 'error');
            });
    };
};

// =============================================
// FECHAR NOTIFICAÇÃO
// =============================================
managerApp.fecharNotificacao = function(id) {
    var container = document.getElementById('leadsNotificacoesContainer');
    if (container) {
        var leads = this.leadsFiltradosPorMes || this.leadsList;
        var notificacoes = this.gerarNotificacoes(leads);
        notificacoes = notificacoes.filter(function(n) { return n.id !== id; });
        
        if (id.includes('semcontato') && this._gridSecundarioTipo === 'semContato') {
            this.fecharGridSecundario();
        } else if (id.includes('atrasado') && this._gridSecundarioTipo === 'atrasoCritico') {
            this.fecharGridSecundario();
        }
        
        if (notificacoes.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        var html = '<div class="card" style="border-left: 4px solid #f59e0b;">';
        html += '  <div class="card-header" style="background: #fef3c7;">';
        html += '    <span class="card-title">🔔 Centro de Notificações</span>';
        html += '    <span class="badge badge-warning">' + notificacoes.length + ' alertas</span>';
        html += '  </div>';
        html += '  <div class="card-body" style="padding: 12px 16px;">';
        
        var prioridades = { 'CRITICO': 0, 'ALTO': 1, 'MEDIO': 2, 'BAIXO': 3 };
        notificacoes.sort(function(a, b) {
            return (prioridades[a.prioridade] || 99) - (prioridades[b.prioridade] || 99);
        });
        
        for (var i = 0; i < notificacoes.length; i++) {
            var n = notificacoes[i];
            var cores = {
                'CRITICO': { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', icon: '🚨' },
                'ALTO': { bg: '#fef3c7', border: '#f59e0b', text: '#f59e0b', icon: '⚠️' },
                'MEDIO': { bg: '#eff6ff', border: '#3b82f6', text: '#3b82f6', icon: 'ℹ️' },
                'BAIXO': { bg: '#f3f4f6', border: '#6b7280', text: '#6b7280', icon: '📌' }
            };
            var cor = cores[n.prioridade] || cores['BAIXO'];
            
            var isAtivo = false;
            if (n.tipo === 'semContato' && this._gridSecundarioAtivo && this._gridSecundarioTipo === 'semContato') {
                isAtivo = true;
            } else if (n.tipo === 'atrasoCritico' && this._gridSecundarioAtivo && this._gridSecundarioTipo === 'atrasoCritico') {
                isAtivo = true;
            }
            var botaoTexto = isAtivo ? 'Fechar Leads' : 'Ver Leads';
            
            html += '    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin-bottom: 6px; background: ' + cor.bg + '; border-radius: 6px; border-left: 3px solid ' + cor.border + ';">';
            html += '      <div style="display: flex; align-items: center; gap: 10px; flex: 1;">';
            html += '        <span style="font-size: 16px;">' + cor.icon + '</span>';
            html += '        <div style="flex: 1;">';
            html += '          <div style="font-size: 13px; font-weight: 600; color: ' + cor.text + ';">' + n.titulo + '</div>';
            html += '          <div style="font-size: 12px; color: var(--gray-600);">' + n.descricao + '</div>';
            html += '        </div>';
            html += '      </div>';
            html += '      <div style="display: flex; gap: 6px; flex-shrink: 0; align-items: center;">';
            if (n.tipo === 'semContato' || n.tipo === 'atrasoCritico') {
                html += '        <button class="btn btn-sm btn-primary" onclick="managerApp.toggleGridSecundario(\'' + n.tipo + '\')" style="height: 26px; font-size: 10px; padding: 2px 8px;">' + botaoTexto + '</button>';
            }
            html += '        <button class="btn btn-sm btn-secondary" onclick="managerApp.fecharNotificacao(\'' + n.id + '\')" style="height: 26px; font-size: 10px; padding: 2px 6px;">✕</button>';
            html += '      </div>';
            html += '    </div>';
        }
        
        html += '    <div style="margin-top: 8px; font-size: 11px; color: var(--gray-400); text-align: right;">Clique em ✕ para fechar a notificação</div>';
        html += '  </div>';
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    Utils.showToast('Notificação fechada', 'info');
};

// =============================================
// APLICAR AÇÃO RÁPIDA
// =============================================
managerApp.aplicarAcaoRapida = function(acao, diasAdicionar, fecharContrato, isOutros) {
    var hoje = new Date();
    var dataFutura = new Date(hoje);
    dataFutura.setDate(dataFutura.getDate() + diasAdicionar);
    var dataISO = dataFutura.toISOString().slice(0, 10);
    
    if (isOutros) {
        var horaAtual = hoje.getHours().toString().padStart(2, '0') + ':' + 
                       hoje.getMinutes().toString().padStart(2, '0');
        document.getElementById('modalContatoProximaAcao').value = 'Outros - ' + hoje.toLocaleDateString() + ' ' + horaAtual;
        document.getElementById('modalContatoDataProxima').value = dataISO;
        
        var registroAtual = document.getElementById('modalContatoRegistro').value;
        var template = '[' + new Date().toLocaleString() + '] Outros - Aguardando definição';
        if (!registroAtual || registroAtual.trim() === '') {
            document.getElementById('modalContatoRegistro').value = template;
        } else {
            document.getElementById('modalContatoRegistro').value = registroAtual + '\n' + template;
        }
        Utils.showToast('📝 Defina a ação no campo "Próxima Ação"', 'info');
        return;
    }
    
    document.getElementById('modalContatoProximaAcao').value = acao;
    document.getElementById('modalContatoDataProxima').value = dataISO;
    
    if (fecharContrato) {
        document.getElementById('modalContatoProximaAcao').value = 'Contrato Fechado';
        document.getElementById('modalContatoDataProxima').value = hoje.toISOString().slice(0, 10);
        Utils.showToast('✅ Lead será marcado como "Fechado (Contrato)"', 'success');
    }
    
    var registroAtual = document.getElementById('modalContatoRegistro').value;
    var template = '[' + new Date().toLocaleString() + '] ' + acao + (fecharContrato ? ' - Contrato fechado com sucesso!' : '');
    if (!registroAtual || registroAtual.trim() === '') {
        document.getElementById('modalContatoRegistro').value = template;
    } else {
        document.getElementById('modalContatoRegistro').value = registroAtual + '\n' + template;
    }
    
    if (fecharContrato) {
        var statusSelect = document.getElementById('modalLeadStatus');
        if (statusSelect) {
            statusSelect.value = '✅ Fechado (Contrato)';
        }
    }
};

// =============================================
// FASE 3: RENDERIZAR FUNIL DETALHADO
// =============================================
managerApp.renderizarFunilDetalhado = function(leads) {
    var container = document.getElementById('leadsFunilDetalhadoContainer');
    if (!container) return;
    
    if (!leads) leads = this.leadsFiltradosPorMes || this.leadsList;
    
    if (leads.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    var etapas = [
        { id: '📞 Novo Lead', label: 'Novo Lead', cor: '#3b82f6' },
        { id: '🔄 Em Negociação', label: 'Em Negociação', cor: '#f59e0b' },
        { id: '📄 Proposta Enviada', label: 'Proposta Enviada', cor: '#8b5cf6' },
        { id: '✅ Fechado (Contrato)', label: 'Fechado', cor: '#10b981' }
    ];
    
    var contagem = {};
    var leadsPorEtapa = {};
    for (var i = 0; i < etapas.length; i++) {
        contagem[etapas[i].id] = 0;
        leadsPorEtapa[etapas[i].id] = [];
    }
    
    for (var i = 0; i < leads.length; i++) {
        var status = leads[i].status || '📞 Novo Lead';
        if (contagem[status] !== undefined) {
            contagem[status]++;
            leadsPorEtapa[status].push(leads[i]);
        }
    }
    
    var total = leads.length;
    var maximo = 0;
    for (var i = 0; i < etapas.length; i++) {
        if (contagem[etapas[i].id] > maximo) maximo = contagem[etapas[i].id];
    }
    if (maximo === 0) maximo = 1;
    
    var taxasConversao = [];
    for (var i = 1; i < etapas.length; i++) {
        var anterior = contagem[etapas[i-1].id] || 1;
        var atual = contagem[etapas[i].id] || 0;
        var taxa = anterior > 0 ? (atual / anterior * 100) : 0;
        taxasConversao.push({
            de: etapas[i-1].id,
            para: etapas[i].id,
            taxa: taxa,
            perdidos: anterior - atual
        });
    }
    
    var gargalos = [];
    for (var i = 0; i < taxasConversao.length; i++) {
        if (taxasConversao[i].taxa < 40 && taxasConversao[i].perdidos > 3) {
            gargalos.push({
                etapa: etapas[i].id,
                taxa: taxasConversao[i].taxa,
                perdidos: taxasConversao[i].perdidos,
                mensagem: 'Apenas ' + taxasConversao[i].taxa.toFixed(0) + '% dos leads avançam de "' + 
                    etapas[i].label + '" para "' + etapas[i+1].label + '"'
            });
        }
    }
    
    var html = '<div class="card" style="border-left: 4px solid #8b5cf6;">';
    html += '  <div class="card-header" style="background: #f5f3ff;">';
    html += '    <span class="card-title">📊 Análise Detalhada do Funil</span>';
    html += '    <span style="font-size: 12px; color: var(--gray-500);">' + total + ' leads no mês</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px 20px;">';
    
    html += '    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">';
    for (var i = 0; i < etapas.length; i++) {
        var etapa = etapas[i];
        var qtd = contagem[etapa.id] || 0;
        var percentual = total > 0 ? (qtd / total * 100) : 0;
        var largura = maximo > 0 ? (qtd / maximo * 100) : 0;
        if (largura < 5 && qtd > 0) largura = 5;
        
        var cor = etapa.cor;
        var label = etapa.label;
        
        html += '      <div style="display: flex; align-items: center; gap: 12px;">';
        html += '        <div style="min-width: 140px; font-size: 13px; font-weight: 600; color: var(--gray-700);">' + label + '</div>';
        html += '        <div style="flex: 1; background: var(--gray-100); border-radius: 6px; height: 28px; overflow: hidden; position: relative;">';
        html += '          <div style="width: ' + largura + '%; height: 100%; background: ' + cor + '; border-radius: 6px; transition: width 0.5s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;">';
        html += '            <span style="font-size: 12px; font-weight: 700; color: ' + (largura > 30 ? 'white' : cor) + ';">' + qtd + '</span>';
        html += '          </div>';
        html += '        </div>';
        html += '        <div style="min-width: 60px; font-size: 12px; color: var(--gray-500); text-align: right;">' + percentual.toFixed(1) + '%</div>';
        html += '      </div>';
        
        if (i < etapas.length - 1) {
            var proxQtd = contagem[etapas[i+1].id] || 0;
            var taxaConversao = qtd > 0 ? (proxQtd / qtd * 100) : 0;
            var corSeta = taxaConversao >= 50 ? '#10b981' : (taxaConversao >= 30 ? '#f59e0b' : '#ef4444');
            html += '      <div style="padding-left: 152px; font-size: 11px; color: ' + corSeta + '; margin: -4px 0;">';
            html += '        ↓ ' + taxaConversao.toFixed(0) + '% convertem (' + proxQtd + ' leads)';
            if (qtd - proxQtd > 0) {
                html += ' | ' + (qtd - proxQtd) + ' leads perdidos';
            }
            html += '      </div>';
        }
    }
    html += '    </div>';
    
    if (gargalos.length > 0) {
        html += '    <div style="margin-top: 12px; padding: 12px 16px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">';
        html += '      <div style="font-weight: 700; font-size: 13px; color: #dc2626; margin-bottom: 4px;">🚨 Gargalos Identificados</div>';
        for (var i = 0; i < gargalos.length; i++) {
            html += '      <div style="font-size: 13px; color: var(--gray-600);">• ' + gargalos[i].mensagem + '</div>';
        }
        html += '      <div style="font-size: 12px; color: var(--gray-500); margin-top: 4px;">💡 Recomendação: Revise o processo de abordagem para estas etapas.</div>';
        html += '    </div>';
    } else {
        html += '    <div style="margin-top: 12px; padding: 12px 16px; background: #d1fae5; border-radius: 8px; border-left: 4px solid #10b981;">';
        html += '      <div style="font-weight: 700; font-size: 13px; color: #065f46;">✅ Funil Saudável</div>';
        html += '      <div style="font-size: 13px; color: var(--gray-600);">As taxas de conversão entre as etapas estão boas. Continue assim!</div>';
        html += '    </div>';
    }
    
    html += '    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">';
    html += '      <div style="background: var(--gray-50); padding: 10px 12px; border-radius: 8px; text-align: center;">';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">' + (contagem['📞 Novo Lead'] || 0) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-500);">Novos Leads</div>';
    html += '      </div>';
    html += '      <div style="background: var(--gray-50); padding: 10px 12px; border-radius: 8px; text-align: center;">';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">' + (contagem['🔄 Em Negociação'] || 0) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-500);">Em Negociação</div>';
    html += '      </div>';
    html += '      <div style="background: var(--gray-50); padding: 10px 12px; border-radius: 8px; text-align: center;">';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">' + (contagem['📄 Proposta Enviada'] || 0) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-500);">Propostas Enviadas</div>';
    html += '      </div>';
    html += '      <div style="background: var(--gray-50); padding: 10px 12px; border-radius: 8px; text-align: center;">';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #10b981;">' + (contagem['✅ Fechado (Contrato)'] || 0) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-500);">Fechados</div>';
    html += '      </div>';
    html += '    </div>';
    
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
};

// =============================================
// MODAL DE SUGESTÃO DE ABORDAGEM
// =============================================
managerApp.abrirModalSugestaoAbordagem = function(lead, statusAntigo, statusNovo) {
    var modal = document.getElementById('modalSugestaoAbordagem');
    var conteudo = document.getElementById('conteudoSugestaoAbordagem');
    if (!modal || !conteudo) { console.error('❌ Modal de sugestão não encontrado'); return; }
    
    var texto = this.obterTextoAbordagem(lead, statusAntigo, statusNovo);
    
    var html = '';
    html += '<div style="margin-bottom: 16px;">';
    html += '  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">';
    html += '    <div><strong>Lead:</strong> ' + (lead.nomeCompleto || 'Nome não informado') + '</div>';
    html += '    <div><strong>Telefone:</strong> ' + (lead.telefone || 'Não informado') + '</div>';
    html += '    <div><strong>Status Anterior:</strong> ' + (statusAntigo || 'Novo') + '</div>';
    html += '    <div><strong>Novo Status:</strong> ' + (statusNovo || 'Atualizado') + '</div>';
    html += '    <div><strong>Responsável:</strong> ' + (lead.responsavel || 'Não atribuído') + '</div>';
    html += '    <div><strong>Valor Estimado:</strong> ' + (lead.valorEstimado ? Utils.formatCurrency(lead.valorEstimado) : 'Não informado') + '</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div style="background: var(--gray-50); border-radius: 8px; padding: 16px; border-left: 4px solid var(--primary);">';
    html += '  <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">📋 Texto sugerido para WhatsApp:</div>';
    html += '  <textarea id="textoSugestaoAbordagem" style="width: 100%; min-height: 200px; padding: 12px; border: 1px solid var(--gray-200); border-radius: 8px; font-family: inherit; font-size: 13px; line-height: 1.6; resize: vertical;">' + texto + '</textarea>';
    html += '</div>';
    
    conteudo.innerHTML = html;
    modal.style.display = 'flex';
    
    var btnFechar1 = document.getElementById('fecharModalSugestaoBtn');
    var btnFechar2 = document.getElementById('fecharModalSugestaoBtnFooter');
    if (btnFechar1) btnFechar1.onclick = function() { modal.style.display = 'none'; };
    if (btnFechar2) btnFechar2.onclick = function() { modal.style.display = 'none'; };
    
    var btnWhatsApp = document.getElementById('btnAbrirWhatsAppSugestao');
    if (btnWhatsApp) {
        var novoWhatsApp = btnWhatsApp.cloneNode(true);
        btnWhatsApp.parentNode.replaceChild(novoWhatsApp, btnWhatsApp);
        novoWhatsApp.addEventListener('click', function() {
            var textoFinal = document.getElementById('textoSugestaoAbordagem').value;
            var numero = lead.telefone || '';
            var mensagemCodificada = encodeURIComponent(textoFinal);
            if (numero && numero.length >= 10) {
                var numeroLimpo = numero.replace(/\D/g, '');
                if (numeroLimpo.length >= 10) {
                    var numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;
                    var link = 'https://wa.me/' + numeroCompleto + '?text=' + mensagemCodificada;
                    window.open(link, '_blank');
                    Utils.showToast('📱 Abrindo WhatsApp para ' + (lead.nomeCompleto || 'lead'));
                    return;
                }
            }
            var link = 'https://wa.me/?text=' + mensagemCodificada;
            window.open(link, '_blank');
            Utils.showToast('📋 Mensagem pronta! Cole no WhatsApp do lead.');
        });
    }
    
    var btnCopiar = document.getElementById('btnCopiarTextoSugestao');
    if (btnCopiar) {
        var novoCopiar = btnCopiar.cloneNode(true);
        btnCopiar.parentNode.replaceChild(novoCopiar, btnCopiar);
        novoCopiar.addEventListener('click', function() {
            var textoFinal = document.getElementById('textoSugestaoAbordagem').value;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textoFinal).then(function() {
                    Utils.showToast('✅ Texto copiado para área de transferência!', 'success');
                }).catch(function() {
                    Utils.showToast('⚠️ Não foi possível copiar automaticamente. Selecione o texto e copie.', 'warning');
                });
            } else {
                Utils.showToast('⚠️ Selecione o texto e copie (Ctrl+C / Cmd+C)', 'warning');
            }
        });
    }
    
    var btnConfirmar = document.getElementById('btnConfirmarMudancaSugestao');
    if (btnConfirmar) {
        var novoConfirmar = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(novoConfirmar, btnConfirmar);
        novoConfirmar.addEventListener('click', function() {
            modal.style.display = 'none';
            Utils.showToast('✅ Mudança de status confirmada!', 'success');
        });
    }
};

// =============================================
// OBTER TEXTO DE ABORDAGEM PARA CADA TRANSIÇÃO
// =============================================
managerApp.obterTextoAbordagem = function(lead, statusAntigo, statusNovo) {
    var nome = lead.nomeCompleto || 'Cliente';
    var assistido = lead.nomeCompleto || 'seu familiar';
    var valor = lead.valorEstimado ? Utils.formatCurrency(lead.valorEstimado) : 'a partir de R$ XXX,XX';
    
    var transicao = statusAntigo + ' → ' + statusNovo;
    
    var textos = {
        '📞 Novo Lead → 🔄 Em Negociação': 
            '📋 ' + nome + ', agradecemos seu contato!\n\n' +
            'Na JARDINSCare, oferecemos cuidados humanizados em residências, hospitais e clínicas com profissionais qualificados.\n\n' +
            'Nossos serviços incluem:\n' +
            '✅ Assistência 24h ou parcial\n' +
            '✅ Profissionais capacitados (enfermeiros, técnicos, cuidadores)\n' +
            '✅ Atendimento personalizado\n\n' +
            'Para entender melhor sua necessidade, podemos conversar rapidamente?\n\n' +
            'Equipe JARDINSCare 🌿',
        
        '📞 Novo Lead → 📄 Proposta Enviada':
            '📄 ' + nome + ', conforme seu interesse nos serviços da JARDINSCare, já preparamos uma proposta personalizada para os cuidados do(a) ' + assistido + '.\n\n' +
            '🗓️ Valores: ' + valor + ' (detalhado na proposta)\n' +
            '📌 Início: a partir da data de sua necessidade\n' +
            '⏰ Carga horária: flexível conforme sua necessidade\n\n' +
            'Fique à vontade para analisar com a família. Estamos disponíveis para esclarecer dúvidas.\n\n' +
            'Atenciosamente,\n' +
            'Equipe JARDINSCare 🌿',
        
        '🔄 Em Negociação → 📄 Proposta Enviada':
            '📄 ' + nome + ', conforme nossa conversa e alinhamento das necessidades, segue nossa proposta para os cuidados do(a) ' + assistido + '.\n\n' +
            '🗓️ Valores: ' + valor + ' (detalhado na proposta)\n' +
            '📌 Início: a partir da data de sua necessidade\n' +
            '⏰ Carga horária: flexível conforme sua necessidade\n\n' +
            'Fique à vontade para analisar com a família. Estamos disponíveis para esclarecer dúvidas.\n\n' +
            'Atenciosamente,\n' +
            'Equipe JARDINSCare 🌿',
        
        '📄 Proposta Enviada → ✅ Fechado (Contrato)':
            '🎉 CONTRATO OFICIALIZADO!\n\n' +
            'Prezado(a) ' + nome + ',\n\n' +
            'É com enorme satisfação que confirmamos o início dos cuidados com o(a) ' + assistido + ' pela JARDINSCare.\n\n' +
            '📋 Próximos passos:\n' +
            '1. Em breve nossa enfermeira entrará em contato para visita inicial\n' +
            '2. Sua equipe de cuidadores será apresentada\n' +
            '3. Alinharemos todos os detalhes do plano de cuidados\n\n' +
            'Seja bem-vindo(a) à nossa família! 🌿\n\n' +
            'Com carinho,\n' +
            'Equipe JARDINSCare',
        
        '📄 Proposta Enviada → ❌ Perdido':
            '📌 ' + nome + ', entendemos sua decisão.\n\n' +
            'Sabemos que o investimento em cuidados de qualidade é significativo, e respeitamos sua análise.\n\n' +
            'Nosso compromisso é com a excelência e segurança do seu familiar, e por isso nossos valores refletem a qualidade do serviço oferecido.\n\n' +
            'Caso futuramente deseje rever essa decisão ou precise de orientações, estaremos à disposição.\n\n' +
            'Atenciosamente,\n' +
            'Equipe JARDINSCare 🌿',
        
        '🔄 Em Negociação → ❌ Perdido':
            '📌 ' + nome + ', agradecemos seu contato!\n\n' +
            'Entendemos que o valor é um fator importante na decisão. Nossos preços refletem o cuidado diferenciado e a qualidade dos profissionais que oferecemos.\n\n' +
            'Caso mude de ideia ou queira explorar opções de carga horária mais flexíveis, estaremos aqui para ajudar.\n\n' +
            'Desejamos tudo de melhor para sua família.\n\n' +
            'Abraço,\n' +
            'Equipe JARDINSCare 🌿',
        
        '📞 Novo Lead → 🚫 Não qualificado':
            '📌 ' + nome + ', agradecemos seu contato!\n\n' +
            'Após análise, identificamos que o perfil de cuidado necessário não se enquadra nos serviços que oferecemos neste momento.\n\n' +
            'Desejamos sucesso na sua busca!\n\n' +
            'Abraço,\n' +
            'Equipe JARDINSCare 🌿',
        
        '🔄 Em Negociação → 🚫 Não qualificado':
            '📌 ' + nome + ', agradecemos seu contato!\n\n' +
            'Após análise, identificamos que o perfil de cuidado necessário não se enquadra nos serviços que oferecemos neste momento.\n\n' +
            'Desejamos sucesso na sua busca!\n\n' +
            'Abraço,\n' +
            'Equipe JARDINSCare 🌿',
        
        '✅ Fechado (Contrato) → ❌ Perdido':
            '📌 ' + nome + ', recebemos sua solicitação de desligamento.\n\n' +
            'Lamentamos muito sua saída. Agradecemos pela confiança depositada durante o período em que cuidamos do(a) ' + assistido + '.\n\n' +
            'Se precisar de recomendações ou retornar futuramente, estaremos sempre de portas abertas.\n\n' +
            'Que tudo corra bem com a nova fase!\n\n' +
            'Com carinho,\n' +
            'Equipe JARDINSCare 🌿',
        
        '📄 Proposta Enviada → 🔄 Aguardando Retorno':
            '📌 ' + nome + ', enviamos nossas informações sobre os cuidados para o(a) ' + assistido + '.\n\n' +
            'Sabemos que a decisão envolve a família e leva tempo.\n\n' +
            'Ficamos à disposição para qualquer dúvida e aguardamos seu retorno quando estiverem prontos.\n\n' +
            'Atenciosamente,\n' +
            'Equipe JARDINSCare 🌿',
        
        '🔄 Em Negociação → 🔄 Aguardando Retorno':
            '📌 ' + nome + ', enviamos nossas informações sobre os cuidados para o(a) ' + assistido + '.\n\n' +
            'Sabemos que a decisão envolve a família e leva tempo.\n\n' +
            'Ficamos à disposição para qualquer dúvida e aguardamos seu retorno quando estiverem prontos.\n\n' +
            'Atenciosamente,\n' +
            'Equipe JARDINSCare 🌿'
    };
    
    if (textos[transicao]) return textos[transicao];
    
    return '📌 ' + nome + ',\n\n' +
        'Estamos atualizando o status do seu processo na JARDINSCare.\n\n' +
        'Seu status atual: ' + statusNovo + '\n\n' +
        'Estamos à disposição para qualquer esclarecimento.\n\n' +
        'Atenciosamente,\n' +
        'Equipe JARDINSCare 🌿';
};
