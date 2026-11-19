// =============================================
// MÉTRICAS COMERCIAIS - managerJARDINSCare
// Versão 4.3 - Correção: recálculo pós-carga de leads + container "Por Origem"
// =============================================

// =============================================
// INICIALIZAR MÉTRICAS COMERCIAIS
// =============================================
managerApp.initMetricasComerciais = function() {
    var self = this;
    
    var hoje = new Date();
    var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    this.mesMetricasAtual = mesAtual;
    
    this.popularMesesMetricas();
    this._configurarAbaGuru();
    
    if (this.leadsList && this.leadsList.length > 0) {
        console.log('📋 [METRICAS] Usando leads já carregados:', this.leadsList.length);
        this._processarMetricasComDadosExistentes(mesAtual);
    } else {
        console.log('🔄 [METRICAS] Leads não carregados, aguardando...');
        var maxTentativas = 30;
        var tentativa = 0;
        
        function verificarLeads() {
            tentativa++;
            if (self.leadsList && self.leadsList.length > 0) {
                console.log('✅ [METRICAS] Leads carregados após', tentativa, 'tentativa(s):', self.leadsList.length);
                self._processarMetricasComDadosExistentes(mesAtual);
            } else if (tentativa < maxTentativas) {
                if (tentativa % 5 === 0) {
                    console.log('⏳ [METRICAS] Aguardando leads... tentativa', tentativa, 'de', maxTentativas);
                }
                setTimeout(verificarLeads, 300);
            } else {
                console.warn('⚠️ [METRICAS] Leads não disponíveis após', maxTentativas, 'tentativas. Carregando direto...');
                self.carregarLeadsDaAPI().then(function() {
                    if (self.leadsList && self.leadsList.length > 0) {
                        console.log('✅ [METRICAS] Leads carregados via API forçada:', self.leadsList.length);
                        self._processarMetricasComDadosExistentes(mesAtual);
                    } else {
                        console.error('❌ [METRICAS] Nenhum lead disponível mesmo após carga forçada');
                    }
                }).catch(function(err) {
                    console.error('❌ [METRICAS] Erro ao carregar leads:', err);
                });
            }
        }
        
        verificarLeads();
    }
};

// =============================================
// PROCESSAR MÉTRICAS COM DADOS EXISTENTES
// =============================================
managerApp._processarMetricasComDadosExistentes = function(mesReferencia) {
    console.log('📊 [METRICAS] Processando com dados existentes');
    console.log('📋 [METRICAS] Leads disponíveis:', this.leadsList ? this.leadsList.length : 0);
    
    // 🔥 Se leads ainda não chegaram, agenda recálculo
    if (!this.leadsList || this.leadsList.length === 0) {
        console.warn('⚠️ [METRICAS] LeadsList vazio. Agendando recálculo...');
        var self = this;
        var tentativas = 0;
        var intervalo = setInterval(function() {
            tentativas++;
            if (self.leadsList && self.leadsList.length > 0) {
                clearInterval(intervalo);
                console.log('✅ [METRICAS] Leads chegaram! Recalculando...');
                self.metricasComerciais = null;
                self._metricasComerciaisVersao = 0;
                self._processarMetricasComDadosExistentes(mesReferencia);
            } else if (tentativas > 20) {
                clearInterval(intervalo);
                console.warn('⚠️ [METRICAS] Timeout aguardando leads (20 tentativas).');
            }
        }, 300);
        return;
    }
    
    var leadsFiltrados = UtilsFinance.filtrarPorMes(this.leadsList, mesReferencia);
    console.log('📊 [METRICAS] Leads filtrados para', mesReferencia, ':', leadsFiltrados.length);
    
    var metricas = this.calcularMetricasAvancadas(this.leadsList, leadsFiltrados, mesReferencia);
    
    this.metricasComerciais = metricas;
    this._metricasComerciaisVersao = this._calcularVersaoLeads();
    
    console.log('✅ [METRICAS] Métricas calculadas:', {
        convertidos: metricas.convertidos,
        emNegociacao: metricas.emNegociacao,
        pipelineValue: metricas.pipelineValue,
        ticketMedio: metricas.ticketMedioConvertidos,
        leadsAtrasados: metricas.leadsAtrasados.length,
        responsaveis: metricas.responsaveis.length
    });
    
    this.renderizarCardsPerformance(metricas, mesReferencia);
    this.renderizarPerformanceResponsavel(metricas);
    this.renderizarAnalisePerda(metricas);
    this.renderizarEvolucaoMensal(metricas);
    this.renderizarPerformancePorSegmento(metricas);
    this.renderizarPrevisaoPipeline(metricas);
    this.renderizarRecomendacoesAvancadas(metricas);
    this.renderizarGuru(metricas, mesReferencia);
    
    // 🔥 Log de confirmação dos containers
    console.log('✅ [METRICAS] Todas as seções renderizadas. Containers preenchidos:');
    console.log('   - metricasOrigemContainer:', !!document.getElementById('metricasOrigemContainer')?.innerHTML);
    console.log('   - metricasAnalisePerdaContainer:', !!document.getElementById('metricasAnalisePerdaContainer')?.innerHTML);
    console.log('   - metricasResponsavelContainer:', !!document.getElementById('metricasResponsavelContainer')?.innerHTML);
};

// =============================================
// CONFIGURAR ABA GURU
// =============================================
managerApp._configurarAbaGuru = function() {
    var self = this;
    
    setTimeout(function() {
        var guruTab = document.querySelector('[data-tab-metrica="guru"]');
        if (!guruTab) {
            console.warn('⚠️ Aba Guru não encontrada');
            return;
        }
        
        var novoGuruTab = guruTab.cloneNode(true);
        guruTab.parentNode.replaceChild(novoGuruTab, guruTab);
        
        novoGuruTab.addEventListener('click', function(e) {
            e.stopPropagation();
            
            document.querySelectorAll('[data-tab-metrica]').forEach(function(btn) {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            var containers = ['metricasEvolucaoContainer', 'metricasOrigemContainer', 'metricasAnalisePerdaContainer', 'metricasResponsavelContainer', 'metricasGuruContainer'];
            containers.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            
            var guruContainer = document.getElementById('metricasGuruContainer');
            if (guruContainer) {
                guruContainer.style.display = 'block';
                guruContainer.innerHTML = '';
                var dadosGuru = self._coletarDadosGuru();
                self.renderizarGuru({ dadosGuru: dadosGuru }, self.mesMetricasAtual || '2026-09');
            }
        });
        
        console.log('✅ Aba Guru configurada permanentemente');
    }, 100);
};

// =============================================
// POPULAR MESES PARA MÉTRICAS COMERCIAIS
// =============================================
managerApp.popularMesesMetricas = function() {
    var select = document.getElementById('mesMetricasSelect');
    if (!select) {
        console.warn('⚠️ mesMetricasSelect não encontrado');
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
    
    if (this._mesMetricasChangeHandler) {
        select.removeEventListener('change', this._mesMetricasChangeHandler);
    }
    
    this._mesMetricasChangeHandler = function() {
        var mesSelecionado = this.value;
        if (mesSelecionado) {
            self.mesMetricasAtual = mesSelecionado;
            self.metricasComerciais = null;
            self._metricasComerciaisVersao = 0;
            self._processarMetricasComDadosExistentes(mesSelecionado);
        }
    };
    
    select.addEventListener('change', this._mesMetricasChangeHandler);
};

// =============================================
// FUNÇÃO LEGADA (MANTIDA PARA COMPATIBILIDADE)
// =============================================
managerApp.carregarMetricasComerciais = function(mesReferencia) {
    if (!mesReferencia) {
        var hoje = new Date();
        mesReferencia = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
        this.mesMetricasAtual = mesReferencia;
    }
    this._processarMetricasComDadosExistentes(mesReferencia);
};

// =============================================
// FUNÇÃO LEGADA (MANTIDA PARA COMPATIBILIDADE)
// =============================================
managerApp.renderizarMetricasComerciais = function(metricas, mesReferencia) {
    if (metricas) {
        this.metricasComerciais = metricas;
    }
    
    var dados = metricas || this.metricasComerciais;
    if (!dados) {
        console.warn('⚠️ Nenhuma métrica disponível para renderizar');
        return;
    }
    
    var mes = mesReferencia || this.mesMetricasAtual || this.getMesReferencia();
    
    this.renderizarCardsPerformance(dados, mes);
    this.renderizarPerformanceResponsavel(dados);
    this.renderizarAnalisePerda(dados);
    this.renderizarEvolucaoMensal(dados);
    this.renderizarPerformancePorSegmento(dados);
    this.renderizarPrevisaoPipeline(dados);
    this.renderizarRecomendacoesAvancadas(dados);
    this.renderizarGuru(dados, mes);
    
    // 🔥 GARANTIR que as seções "Por Origem" e "Análise de Perda" sejam renderizadas
    console.log('✅ [MÉTRICAS] Renderização via renderizarMetricasComerciais completa');
};

// =============================================
// CALCULAR MÊS ANTERIOR
// =============================================
managerApp.calcularMesAnterior = function(mesReferencia) {
    if (!mesReferencia) return '';
    var parts = mesReferencia.split('-');
    var ano = parseInt(parts[0]);
    var mes = parseInt(parts[1]);
    mes--;
    if (mes === 0) { mes = 12; ano--; }
    return ano + '-' + String(mes).padStart(2, '0');
};

// =============================================
// CALCULAR MÉTRICAS BÁSICAS (para comparação)
// =============================================
managerApp.calcularMetricasBasicas = function(todosLeads, leadsFiltrados) {
    var totalLeads = leadsFiltrados ? leadsFiltrados.length : 0;
    var convertidos = 0;
    var somaValores = 0;
    var tempos = [];
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (leadsFiltrados) {
        for (var i = 0; i < leadsFiltrados.length; i++) {
            var l = leadsFiltrados[i];
            if (!l) continue;
            if (l.status === '✅ Fechado (Contrato)') {
                convertidos++;
                somaValores += parseFloat(l.valorEstimado) || 0;
                
                var dataCadastro = l.dataCadastro || l.timestamp;
                if (dataCadastro) {
                    var dataLead = new Date(dataCadastro);
                    if (!isNaN(dataLead.getTime())) {
                        dataLead.setHours(0, 0, 0, 0);
                        var dias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                        if (dias > 0 && dias < 365) {
                            tempos.push(dias);
                        }
                    }
                }
            }
        }
    }
    
    var taxa = totalLeads > 0 ? (convertidos / totalLeads * 100) : 0;
    var ticket = convertidos > 0 ? somaValores / convertidos : 0;
    var tempoMedio = tempos.length > 0 ? 
        tempos.reduce(function(a, b) { return a + b; }, 0) / tempos.length : 0;
    
    return {
        totalLeads: totalLeads,
        convertidos: convertidos,
        taxaConversao: taxa,
        ticketMedio: ticket,
        tempoMedioConversao: tempoMedio
    };
};

// =============================================
// CALCULAR MÉTRICAS AVANÇADAS (CORRIGIDO)
// =============================================
managerApp.calcularMetricasAvancadas = function(todosLeads, leadsFiltrados, mesReferencia) {
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    var totalLeads = leadsFiltrados ? leadsFiltrados.length : 0;
    var convertidos = 0;
    var perdidos = 0;
    var naoQualificados = 0;
    var emNegociacao = 0;
    var comProposta = 0;
    var somaValoresConvertidos = 0;
    var somaValoresTodos = 0;
    var leadsComValor = 0;
    
    var temposConversao = [];
    var motivosPerda = {};
    var leadsPorOrigem = {};
    var leadsPorServico = {};
    var responsaveis = {};
    var leadsPorMes = {};
    var leadsQuentes = [];
    var leadsParados = [];
    var leadsAtrasados = [];
    
    if (leadsFiltrados) {
        for (var i = 0; i < leadsFiltrados.length; i++) {
            var l = leadsFiltrados[i];
            if (!l) continue;
            
            var status = l.status || '';
            var valor = parseFloat(l.valorEstimado) || 0;
            var origem = l.origem || 'Não informada';
            var servico = l.tipoServico || 'Não informado';
            var responsavel = l.responsavel || 'Não atribuído';
            
            somaValoresTodos += valor;
            if (valor > 0) leadsComValor++;
            
            if (status === '✅ Fechado (Contrato)') {
                convertidos++;
                somaValoresConvertidos += valor;
            } else if (status === '❌ Perdido') {
                perdidos++;
                var motivo = l.observacoes || 'Motivo não informado';
                if (!motivosPerda[motivo]) motivosPerda[motivo] = 0;
                motivosPerda[motivo]++;
            } else if (status === '🚫 Não qualificado') {
                naoQualificados++;
            } else if (status === '🔄 Em Negociação') {
                emNegociacao++;
            } else if (status === '📄 Proposta Enviada') {
                comProposta++;
            }
            
            if (!leadsPorOrigem[origem]) {
                leadsPorOrigem[origem] = { 
                    total: 0, 
                    convertidos: 0, 
                    somaValores: 0,
                    valorTotal: 0
                };
            }
            leadsPorOrigem[origem].total++;
            leadsPorOrigem[origem].somaValores += valor;
            if (status === '✅ Fechado (Contrato)') {
                leadsPorOrigem[origem].convertidos++;
                leadsPorOrigem[origem].valorTotal += valor;
            }
            
            if (!leadsPorServico[servico]) {
                leadsPorServico[servico] = { 
                    total: 0, 
                    convertidos: 0, 
                    somaValores: 0,
                    valorTotal: 0
                };
            }
            leadsPorServico[servico].total++;
            leadsPorServico[servico].somaValores += valor;
            if (status === '✅ Fechado (Contrato)') {
                leadsPorServico[servico].convertidos++;
                leadsPorServico[servico].valorTotal += valor;
            }
            
            if (!responsaveis[responsavel]) {
                responsaveis[responsavel] = { 
                    total: 0, 
                    convertidos: 0, 
                    somaValores: 0, 
                    tempos: [],
                    valorTotal: 0
                };
            }
            responsaveis[responsavel].total++;
            responsaveis[responsavel].somaValores += valor;
            if (status === '✅ Fechado (Contrato)') {
                responsaveis[responsavel].convertidos++;
                responsaveis[responsavel].valorTotal += valor;
            }
            
            if (status === '✅ Fechado (Contrato)') {
                var dataCadastro = l.dataCadastro || l.timestamp;
                if (dataCadastro) {
                    var dataLead = new Date(dataCadastro);
                    if (!isNaN(dataLead.getTime())) {
                        dataLead.setHours(0, 0, 0, 0);
                        var dias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                        if (dias > 0 && dias < 365) {
                            temposConversao.push(dias);
                            if (responsaveis[responsavel]) {
                                responsaveis[responsavel].tempos.push(dias);
                            }
                        }
                    }
                }
            }
            
            if (status === '🔄 Em Negociação' || status === '📄 Proposta Enviada') {
                var dataRef = l.dataProximaAcao || l.dataCadastro || l.timestamp;
                if (dataRef) {
                    var dataLead = new Date(dataRef);
                    if (!isNaN(dataLead.getTime())) {
                        dataLead.setHours(0, 0, 0, 0);
                        var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                        if (diffDias <= 7) {
                            leadsQuentes.push({ nome: l.nomeCompleto || 'Lead', valor: valor, status: status });
                        } else if (diffDias > 15) {
                            leadsParados.push({ nome: l.nomeCompleto || 'Lead', dias: diffDias, status: status });
                        }
                    }
                }
            }
            
            if (l.dataProximaAcao) {
                var dataAcao = new Date(l.dataProximaAcao);
                if (!isNaN(dataAcao.getTime()) && dataAcao < hoje) {
                    var diasAtraso = Math.floor((hoje - dataAcao) / (1000 * 60 * 60 * 24));
                    if (diasAtraso > 0 && status !== '✅ Fechado (Contrato)' && status !== '❌ Perdido') {
                        leadsAtrasados.push({ nome: l.nomeCompleto || 'Lead', dias: diasAtraso });
                    }
                }
            }
        }
    }
    
    if (todosLeads) {
        for (var i = 0; i < todosLeads.length; i++) {
            var l = todosLeads[i];
            if (!l) continue;
            var dataCadastro = l.dataCadastro || l.timestamp;
            if (dataCadastro) {
                var data = new Date(dataCadastro);
                if (!isNaN(data.getTime())) {
                    var mesAno = data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
                    if (!leadsPorMes[mesAno]) leadsPorMes[mesAno] = { total: 0, convertidos: 0, somaValores: 0 };
                    leadsPorMes[mesAno].total++;
                    
                    if (l.status === '✅ Fechado (Contrato)') {
                        leadsPorMes[mesAno].convertidos++;
                        leadsPorMes[mesAno].somaValores += parseFloat(l.valorEstimado) || 0;
                    }
                }
            }
        }
    }
    
    var tempoMedioConversao = temposConversao.length > 0 ? 
        temposConversao.reduce(function(a, b) { return a + b; }, 0) / temposConversao.length : 0;
    
    var ticketMedioConvertidos = convertidos > 0 ? somaValoresConvertidos / convertidos : 0;
    var ticketMedioGeral = leadsComValor > 0 ? somaValoresTodos / leadsComValor : 0;
    var taxaConversao = totalLeads > 0 ? (convertidos / totalLeads * 100) : 0;
    
    var pipelineValue = 0;
    if (leadsFiltrados) {
        for (var i = 0; i < leadsFiltrados.length; i++) {
            var l = leadsFiltrados[i];
            if (!l) continue;
            var status = l.status || '';
            var valor = parseFloat(l.valorEstimado) || 0;
            if (status === '🔄 Em Negociação') {
                pipelineValue += valor * 0.7;
            } else if (status === '📄 Proposta Enviada') {
                pipelineValue += valor * 0.5;
            }
        }
    }
    
    var origens = [];
    for (var origem in leadsPorOrigem) {
        var d = leadsPorOrigem[origem];
        var ticket = d.convertidos > 0 ? (d.valorTotal || d.somaValores) / d.convertidos : 0;
        origens.push({ 
            origem: origem, 
            total: d.total, 
            convertidos: d.convertidos, 
            taxa: d.total > 0 ? (d.convertidos / d.total * 100) : 0,
            ticket: ticket,
            somaValores: d.somaValores
        });
    }
    origens.sort(function(a, b) { return b.taxa - a.taxa; });
    
    var servicos = [];
    for (var servico in leadsPorServico) {
        var d = leadsPorServico[servico];
        var ticket = d.convertidos > 0 ? (d.valorTotal || d.somaValores) / d.convertidos : 0;
        servicos.push({ 
            servico: servico, 
            total: d.total, 
            convertidos: d.convertidos, 
            taxa: d.total > 0 ? (d.convertidos / d.total * 100) : 0,
            ticket: ticket,
            somaValores: d.somaValores
        });
    }
    servicos.sort(function(a, b) { return b.taxa - a.taxa; });
    
    var responsaveisList = [];
    for (var resp in responsaveis) {
        var d = responsaveis[resp];
        var ticket = d.convertidos > 0 ? (d.valorTotal || d.somaValores) / d.convertidos : 0;
        var tempoMedioResp = d.tempos && d.tempos.length > 0 ? 
            d.tempos.reduce(function(a, b) { return a + b; }, 0) / d.tempos.length : 0;
        responsaveisList.push({ 
            responsavel: resp, 
            total: d.total, 
            convertidos: d.convertidos, 
            taxa: d.total > 0 ? (d.convertidos / d.total * 100) : 0,
            ticket: ticket,
            tempoMedio: tempoMedioResp
        });
    }
    responsaveisList.sort(function(a, b) { return b.taxa - a.taxa; });
    
    var motivosPerdaList = Object.keys(motivosPerda).map(function(k) {
        return { motivo: k, quantidade: motivosPerda[k] };
    }).sort(function(a, b) { return b.quantidade - a.quantidade; });
    
    var mesAnterior = this.calcularMesAnterior(mesReferencia);
    var leadsAnterior = UtilsFinance.filtrarPorMes(todosLeads, mesAnterior);
    var metricasAnterior = this.calcularMetricasBasicas(todosLeads, leadsAnterior);
    
    var dadosGuru = this._coletarDadosGuru();
    
    console.log('✅ [METRICAS] responsaveisList gerado:', responsaveisList.length, 'itens');
    
    return {
        mesReferencia: mesReferencia,
        totalLeads: totalLeads,
        convertidos: convertidos,
        perdidos: perdidos,
        naoQualificados: naoQualificados,
        emNegociacao: emNegociacao,
        comProposta: comProposta,
        taxaConversao: taxaConversao,
        ticketMedioConvertidos: ticketMedioConvertidos,
        ticketMedioGeral: ticketMedioGeral,
        tempoMedioConversao: tempoMedioConversao,
        pipelineValue: pipelineValue,
        taxaPerda: totalLeads > 0 ? (perdidos / totalLeads * 100) : 0,
        eficienciaPipeline: (emNegociacao + comProposta) > 0 ? 
            (convertidos / (emNegociacao + comProposta) * 100) : 0,
        mesAnterior: mesAnterior,
        metricasAnterior: metricasAnterior,
        motivosPerda: motivosPerdaList,
        leadsPorOrigem: origens,
        leadsPorServico: servicos,
        responsaveis: responsaveisList,
        leadsPorMes: leadsPorMes,
        leadsQuentes: leadsQuentes,
        leadsParados: leadsParados,
        leadsAtrasados: leadsAtrasados,
        dadosGuru: dadosGuru
    };
};

// =============================================
// COLETAR DADOS PARA O GURU
// =============================================
managerApp._coletarDadosGuru = function() {
    var dashboard = this.dashboardCache || {};
    
    var dados = {
        assistidosAtivos: (dashboard.assistidosAtivos !== undefined && dashboard.assistidosAtivos !== null) ? dashboard.assistidosAtivos : 0,
        faturamento: (dashboard.faturamento !== undefined && dashboard.faturamento !== null) ? dashboard.faturamento : 0,
        custoDireto: (dashboard.custoDireto !== undefined && dashboard.custoDireto !== null) ? dashboard.custoDireto : 0,
        resultadoBruto: 0,
        metas: this.metas || { faturamento: 50000 },
        alertasContratos: Array.isArray(this.alertasContratos) ? this.alertasContratos : [],
        leadsQuentes: 0,
        leadsParados: 0
    };
    
    dados.resultadoBruto = (dados.faturamento || 0) - (dados.custoDireto || 0);
    
    var mesAtual = this.mesMetricasAtual || this.getMesReferencia() || '2026-09';
    var leadsFiltrados = UtilsFinance.filtrarPorMes(this.leadsList || [], mesAtual);
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (Array.isArray(leadsFiltrados)) {
        for (var i = 0; i < leadsFiltrados.length; i++) {
            var l = leadsFiltrados[i];
            if (!l) continue;
            var status = l.status || '';
            if (status === '🔄 Em Negociação' || status === '📄 Proposta Enviada') {
                var dataRef = l.dataProximaAcao || l.dataCadastro || l.timestamp;
                if (dataRef) {
                    var dataLead = new Date(dataRef);
                    if (!isNaN(dataLead.getTime())) {
                        dataLead.setHours(0, 0, 0, 0);
                        var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                        if (diffDias <= 7) {
                            dados.leadsQuentes++;
                        } else if (diffDias > 15) {
                            dados.leadsParados++;
                        }
                    }
                }
            }
        }
    }
    
    return dados;
};
// =============================================
// RENDERIZAR CARDS DE PERFORMANCE (VERSÃO SUGESTÃO 1)
// =============================================
managerApp.renderizarCardsPerformance = function(metricas, mesReferencia) {
    var container = document.getElementById('metricasComerciaisContainer');
    if (!container) {
        console.warn('⚠️ Container metricasComerciaisContainer não encontrado');
        return;
    }
    
    if (!metricas) {
        container.innerHTML = '<div class="empty-state">Carregando métricas...</div>';
        return;
    }
    
    var meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var parts = mesReferencia ? mesReferencia.split('-') : ['', ''];
    var mesExibicao = meses[parseInt(parts[1]) - 1] || '' + '/' + (parts[0] || '');
    
    var ant = metricas.metricasAnterior || { totalLeads: 0, convertidos: 0, taxaConversao: 0, ticketMedio: 0, tempoMedioConversao: 0 };
    
    function formatVariacao(atual, anterior, prefix, invert) {
        atual = atual || 0;
        anterior = anterior || 0;
        var diff = atual - anterior;
        if (anterior === 0 && atual === 0) return '➖ 0';
        if (anterior === 0) return '📈 +' + atual.toFixed(1) + (prefix || '');
        var pct = (diff / anterior) * 100;
        if (Math.abs(pct) < 0.1) return '➖ 0';
        var sinal = pct > 0 ? '📈 +' : '📉 ';
        var cor = pct > 0 ? (invert ? '#ef4444' : '#10b981') : (invert ? '#10b981' : '#ef4444');
        return { texto: sinal + Math.abs(pct).toFixed(1) + '%', cor: cor };
    }
    
    var vLeads = formatVariacao(metricas.totalLeads, ant.totalLeads);
    var vConv = formatVariacao(metricas.convertidos, ant.convertidos);
    var vTaxa = formatVariacao(metricas.taxaConversao, ant.taxaConversao);
    var vTicket = formatVariacao(metricas.ticketMedioConvertidos, ant.ticketMedio);
    var vCiclo = formatVariacao(metricas.tempoMedioConversao, ant.tempoMedioConversao, ' dias', true);
    var vTaxaPerda = formatVariacao(metricas.taxaPerda || 0, ant.taxaPerda || 0);
    
    var html = '';
    html += '<div style="font-size: 12px; color: var(--gray-500); margin-bottom: 16px;">📅 Mês de referência: <strong>' + mesExibicao + '</strong></div>';
    
    // =============================================
    // LINHA 1 - Volume e Conversão (4 cards)
    // =============================================
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">';
    
    // Card 1: Total de Leads
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 18px; font-weight: 800;">' + (metricas.totalLeads || 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TOTAL DE LEADS</div>';
    html += '    <div style="font-size: 9px; color: ' + (vLeads.cor || '#6b7280') + ';">' + (vLeads.texto || '➖ 0') + '</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 2: Conversões
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon green" style="width: 36px; height: 36px; font-size: 16px;">✅</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 18px; font-weight: 800;">' + (metricas.convertidos || 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">CONVERSÕES</div>';
    html += '    <div style="font-size: 9px; color: ' + (vConv.cor || '#6b7280') + ';">' + (vConv.texto || '➖ 0') + '</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 3: Taxa de Conversão
    var corTaxa = (metricas.taxaConversao || 0) >= 20 ? '#10b981' : ((metricas.taxaConversao || 0) >= 10 ? '#f59e0b' : '#ef4444');
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">📈</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value percent" style="font-size: 16px; font-weight: 700; color: ' + corTaxa + ';">' + (metricas.taxaConversao || 0).toFixed(1) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TAXA CONVERSÃO</div>';
    html += '    <div style="font-size: 9px; color: ' + (vTaxa.cor || '#6b7280') + ';">' + (vTaxa.texto || '➖ 0') + '</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 4: Taxa de Perda
    var corPerda = (metricas.taxaPerda || 0) <= 20 ? '#10b981' : ((metricas.taxaPerda || 0) <= 40 ? '#f59e0b' : '#ef4444');
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon red" style="width: 36px; height: 36px; font-size: 16px;">📉</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value percent" style="font-size: 16px; font-weight: 700; color: ' + corPerda + ';">' + (metricas.taxaPerda || 0).toFixed(1) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TAXA DE PERDA</div>';
    html += '    <div style="font-size: 9px; color: ' + (vTaxaPerda.cor || '#6b7280') + ';">' + (vTaxaPerda.texto || '➖ 0') + '</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    // =============================================
    // LINHA 2 - Valores Financeiros (3 cards)
    // =============================================
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">';
    
    // Card 5: Ticket Médio
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px;">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 16px; font-weight: 700; color: #2563eb;">' + Utils.formatCurrency(metricas.ticketMedioConvertidos || 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TICKET MÉDIO</div>';
    html += '    <div style="font-size: 9px; color: ' + (vTicket.cor || '#6b7280') + ';">' + (vTicket.texto || '➖ 0') + '</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 6: Pipeline Value (DESTAQUE - 2x)
    html += '<div class="stat-card" style="flex: 2; min-width: 160px; padding: 12px 10px; border-left: 3px solid #8b5cf6; background: #f5f3ff;">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px; background: #ede9fe; color: #8b5cf6;">📋</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value pipeline" style="font-size: 20px; font-weight: 800; color: #8b5cf6;">' + Utils.formatCurrency(metricas.pipelineValue || 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">PIPELINE VALUE</div>';
    html += '    <div style="font-size: 9px; color: var(--gray-500);">' + (metricas.emNegociacao || 0) + ' em negociação | ' + (metricas.comProposta || 0) + ' com proposta</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 7: Ciclo Médio de Vendas
    var corCiclo = (metricas.tempoMedioConversao || 0) <= 20 ? '#10b981' : ((metricas.tempoMedioConversao || 0) <= 30 ? '#f59e0b' : '#ef4444');
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon teal" style="width: 36px; height: 36px; font-size: 16px;">⏱️</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 16px; font-weight: 700; color: ' + corCiclo + ';">' + (metricas.tempoMedioConversao || 0).toFixed(0) + ' dias</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">CICLO MÉDIO</div>';
    html += '    <div style="font-size: 9px; color: ' + (vCiclo.cor || '#6b7280') + ';">' + (vCiclo.texto || '➖ 0') + '</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    // =============================================
    // LINHA 3 - Pipeline e Qualidade (4 cards)
    // =============================================
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 0;">';
    
    // Card 8: Leads Quentes
    html += '<div class="stat-card" style="flex: 1; min-width: 100px; padding: 12px 10px;">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">🔥</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 18px; font-weight: 800; color: #f59e0b;">' + (Array.isArray(metricas.leadsQuentes) ? metricas.leadsQuentes.length : 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">LEADS QUENTES</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">≤ 7 dias</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 9: Leads Parados
    var leadsParadosCount = Array.isArray(metricas.leadsParados) ? metricas.leadsParados.length : 0;
    html += '<div class="stat-card" style="flex: 1; min-width: 100px; padding: 12px 10px;">';
    html += '  <div class="stat-icon red" style="width: 36px; height: 36px; font-size: 16px;">⏳</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 18px; font-weight: 800; color: ' + (leadsParadosCount > 0 ? '#ef4444' : '#10b981') + ';">' + leadsParadosCount + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">LEADS PARADOS</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">> 15 dias</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 10: Leads com Ação Atrasada
    var leadsAtrasadosCount = Array.isArray(metricas.leadsAtrasados) ? metricas.leadsAtrasados.length : 0;
    html += '<div class="stat-card" style="flex: 1; min-width: 100px; padding: 12px 10px;">';
    html += '  <div class="stat-icon red" style="width: 36px; height: 36px; font-size: 16px;">🚨</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 18px; font-weight: 800; color: ' + (leadsAtrasadosCount > 0 ? '#dc2626' : '#10b981') + ';">' + leadsAtrasadosCount + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">AÇÃO ATRASADA</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">data vencida</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card 11: Eficiência do Pipeline
    var corEficiencia = (metricas.eficienciaPipeline || 0) >= 30 ? '#10b981' : '#f59e0b';
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value percent" style="font-size: 16px; font-weight: 700; color: ' + corEficiencia + ';">' + (metricas.eficienciaPipeline || 0).toFixed(1) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">EFICIÊNCIA PIPELINE</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">conversão / negociação</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    container.innerHTML = html;
    console.log('✅ [METRICAS] Cards de Performance renderizados');
};

// =============================================
// RENDERIZAR ANÁLISE DE PERDA (container próprio)
// =============================================
managerApp.renderizarAnalisePerda = function(metricas) {
    var container = document.getElementById('metricasAnalisePerdaContainer');
    if (!container) {
        console.warn('⚠️ [ANALISE PERDA] Container metricasAnalisePerdaContainer não encontrado');
        return;
    }
    
    if (!metricas || !metricas.motivosPerda || metricas.motivosPerda.length === 0) {
        container.innerHTML = '<div class="card"><div class="card-header"><span class="card-title">📉 Análise de Perda - Motivos</span></div><div class="card-body"><div class="empty-state">Nenhum lead perdido no período</div></div></div>';
        return;
    }
    
    var html = '<div class="card"><div class="card-header"><span class="card-title">📉 Análise de Perda - Motivos</span></div><div class="card-body">';
    html += '<div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Motivo</th><th>Quantidade</th><th>% do Total</th></tr></thead><tbody>';
    
    var totalPerdas = metricas.motivosPerda.reduce(function(s, m) { return s + m.quantidade; }, 0);
    for (var i = 0; i < Math.min(metricas.motivosPerda.length, 10); i++) {
        var m = metricas.motivosPerda[i];
        var percentual = totalPerdas > 0 ? (m.quantidade / totalPerdas * 100) : 0;
        var cor = percentual >= 30 ? '#ef4444' : (percentual >= 15 ? '#f59e0b' : '#6b7280');
        html += '<tr>' +
            '<td>' + m.motivo + '</td>' +
            '<td>' + m.quantidade + '</td>' +
            '<td><span style="color: ' + cor + '; font-weight: 600;">' + percentual.toFixed(1) + '%</span></td>' +
            '</tr>';
    }
    
    html += '</tbody></table></div>';
    if (metricas.motivosPerda.length > 10) {
        html += '<div style="margin-top: 8px; font-size: 12px; color: var(--gray-500);">Exibindo os 10 principais motivos</div>';
    }
    html += '</div></div>';
    
    container.innerHTML = html;
    console.log('✅ [ANALISE PERDA] Renderizada com', metricas.motivosPerda.length, 'motivo(s)');
};

// =============================================
// RENDERIZAR PERFORMANCE POR RESPONSÁVEL
// =============================================
managerApp.renderizarPerformanceResponsavel = function(metricas) {
    var container = document.getElementById('metricasResponsavelContainer');
    if (!container) {
        console.warn('⚠️ Container metricasResponsavelContainer não encontrado');
        return;
    }
    
    if (!metricas) {
        container.innerHTML = '<div class="empty-state">Sem dados disponíveis</div>';
        return;
    }
    
    var responsaveis = metricas.responsaveis || [];
    
    if (!Array.isArray(responsaveis) || responsaveis.length === 0) {
        container.innerHTML = '<div class="card"><div class="card-header"><span class="card-title">👥 Performance por Responsável</span></div><div class="card-body"><div class="empty-state">Nenhum responsável com leads no período</div></div></div>';
        return;
    }
    
    var html = '<div class="card"><div class="card-header"><span class="card-title">👥 Performance por Responsável</span></div><div class="card-body">';
    html += '<div class="data-table-wrapper"><table class="data-table"><thead><tr>' +
        '<th>Responsável</th>' +
        '<th>Leads</th>' +
        '<th>Conversões</th>' +
        '<th>Taxa</th>' +
        '<th>Ticket Médio</th>' +
        '<th>Ciclo Médio</th>' +
        '<th>Status</th>' +
        '</tr></thead><tbody>';
    
    for (var i = 0; i < responsaveis.length; i++) {
        var r = responsaveis[i];
        var taxa = r.taxa || 0;
        var statusClass = taxa >= 25 ? 'badge-success' : (taxa >= 15 ? 'badge-info' : 'badge-warning');
        var statusText = taxa >= 25 ? '⭐ Excelente' : (taxa >= 15 ? '👍 Bom' : '⚠️ Atenção');
        
        html += '<tr>' +
            '<td><strong>' + (r.responsavel || 'Não atribuído') + '</strong></td>' +
            '<td>' + (r.total || 0) + '</td>' +
            '<td>' + (r.convertidos || 0) + '</td>' +
            '<td>' + taxa.toFixed(1) + '%</td>' +
            '<td>' + Utils.formatCurrency(r.ticket || 0) + '</td>' +
            '<td>' + ((r.tempoMedio || 0) > 0 ? (r.tempoMedio || 0).toFixed(0) + ' dias' : '—') + '</td>' +
            '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
            '</tr>';
    }
    
    html += '</tbody></table></div></div></div>';
    
    container.innerHTML = html;
    console.log('✅ [RESPONSAVEL] Renderizada com', responsaveis.length, 'item(ns)');
};

// =============================================
// RENDERIZAR EVOLUÇÃO MENSAL
// =============================================
managerApp.renderizarEvolucaoMensal = function(metricas) {
    var container = document.getElementById('metricasEvolucaoContainer');
    if (!container) return;
    
    if (!metricas || !metricas.leadsPorMes || Object.keys(metricas.leadsPorMes).length === 0) {
        container.innerHTML = '<div class="empty-state">Sem dados de evolução mensal</div>';
        return;
    }
    
    var hoje = new Date();
    var meses = [];
    var totais = [];
    var convertidos = [];
    var taxas = [];
    var tickets = [];
    var mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (var i = 11; i >= 0; i--) {
        var mes = hoje.getMonth() - i;
        var ano = hoje.getFullYear();
        if (mes < 0) { mes += 12; ano--; }
        var mesAno = ano + '-' + String(mes + 1).padStart(2, '0');
        var dados = metricas.leadsPorMes[mesAno] || { total: 0, convertidos: 0, somaValores: 0 };
        meses.push(mesAno);
        totais.push(dados.total || 0);
        convertidos.push(dados.convertidos || 0);
        var taxa = dados.total > 0 ? (dados.convertidos / dados.total * 100) : 0;
        taxas.push(taxa);
        var ticket = dados.convertidos > 0 ? dados.somaValores / dados.convertidos : 0;
        tickets.push(ticket);
    }
    
    var labels = meses.map(function(m) {
        var parts = m.split('-');
        return mesesNomes[parseInt(parts[1]) - 1] + '/' + parts[0];
    });
    
    var canvasId = 'chartEvolucaoMetricas';
    var existingCanvas = document.getElementById(canvasId);
    if (existingCanvas) {
        container.innerHTML = '';
    }
    
    var html = '<div class="chart-card" style="margin-bottom: 0;">';
    html += '  <div class="chart-header">';
    html += '    <span class="card-title">📈 Evolução Mensal (12 meses)</span>';
    html += '  </div>';
    html += '  <div class="chart-body">';
    html += '    <div class="chart-canvas-wrapper" style="height: 300px;">';
    html += '      <canvas id="' + canvasId + '" width="400" height="300"></canvas>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
    
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    var ctx2d = ctx.getContext('2d');
    
    if (this.chartEvolucaoMetricas) {
        this.chartEvolucaoMetricas.destroy();
        this.chartEvolucaoMetricas = null;
    }
    
    if (typeof Chart === 'undefined') return;
    
    try {
        this.chartEvolucaoMetricas = new Chart(ctx2d, {
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
                    },
                    {
                        label: 'Ticket Médio (R$)',
                        data: tickets,
                        type: 'line',
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#f59e0b',
                        order: 0,
                        yAxisID: 'y2',
                        borderDash: [5, 3]
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
                                    return context.dataset.label + ': ' + (context.raw || 0).toFixed(1) + '%';
                                }
                                if (context.dataset.label === 'Ticket Médio (R$)') {
                                    return context.dataset.label + ': ' + Utils.formatCurrency(context.raw || 0);
                                }
                                return context.dataset.label + ': ' + (context.raw || 0);
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
                        ticks: { font: { size: 10 }, callback: function(value) { return (value || 0).toFixed(1) + '%'; } },
                        grid: { drawOnChartArea: false }
                    },
                    y2: {
                        beginAtZero: true,
                        position: 'right',
                        ticks: { font: { size: 10 }, callback: function(value) { return Utils.formatCurrency(value || 0); } },
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de evolução:', error);
    }
};

// =============================================
// RENDERIZAR PERFORMANCE POR SEGMENTO (CORRIGIDO - container métricasOrigem)
// =============================================
managerApp.renderizarPerformancePorSegmento = function(metricas) {
    // 🔥 CORRIGIDO: Renderizar no container da aba "Por Origem"
    var container = document.getElementById('metricasOrigemContainer');
    if (!container) {
        console.error('❌ [POR ORIGEM] Container metricasOrigemContainer não encontrado');
        return;
    }
    
    // Limpa para evitar duplicação
    container.innerHTML = '';
    
    if (!metricas) {
        container.innerHTML = '<div class="empty-state">Sem dados disponíveis</div>';
        return;
    }
    
    var origens = metricas.leadsPorOrigem || [];
    if (!Array.isArray(origens) && typeof origens === 'object') {
        origens = Object.keys(origens).map(function(key) {
            return {
                origem: key,
                total: origens[key] || 0,
                convertidos: 0,
                taxa: 0,
                ticket: 0
            };
        });
    }
    
    var html = '';
    
    // =============================================
    // CARD: PERFORMANCE POR ORIGEM
    // =============================================
    html += '<div class="card" style="margin-bottom: 20px;">';
    html += '  <div class="card-header"><span class="card-title">📊 Performance por Origem</span></div>';
    html += '  <div class="card-body">';
    html += '    <div class="data-table-wrapper">';
    html += '      <table class="data-table">';
    html += '        <thead><tr><th style="text-align: center;">Origem</th><th style="text-align: center;">Leads</th><th style="text-align: center;">Conversões</th><th style="text-align: center;">Taxa</th><th style="text-align: right;">Ticket Médio</th><th style="text-align: center;">Status</th></tr></thead>';
    html += '        <tbody>';
    
    if (origens.length === 0) {
        html += '          <tr><td colspan="6" class="empty-state" style="text-align: center;">Nenhum dado disponível</td></tr>';
    } else {
        for (var i = 0; i < origens.length; i++) {
            var o = origens[i];
            var total = o.total || 0;
            var convertidos = o.convertidos || 0;
            var taxa = total > 0 ? (convertidos / total * 100) : 0;
            var ticket = convertidos > 0 ? (o.somaValores || 0) / convertidos : 0;
            var status = taxa >= 25 ? '🟢 Excelente' : (taxa >= 15 ? '🟡 Bom' : (taxa >= 5 ? '🟠 Atenção' : '🔴 Crítico'));
            var statusClass = taxa >= 25 ? 'badge-success' : (taxa >= 15 ? 'badge-info' : (taxa >= 5 ? 'badge-warning' : 'badge-danger'));
            
            html += '<tr>' +
                '<td style="text-align: left;"><strong>' + (o.origem || 'Não informada') + '</strong></td>' +
                '<td style="text-align: center;">' + total + '</td>' +
                '<td style="text-align: center;">' + convertidos + '</td>' +
                '<td style="text-align: center;"><div style="display: flex; align-items: center; gap: 8px; justify-content: center;"><div style="flex:1; background: #e5e7eb; border-radius: 10px; height: 8px; max-width: 100px;"><div style="width: ' + taxa + '%; background: ' + (taxa >= 25 ? '#10b981' : (taxa >= 15 ? '#f59e0b' : '#ef4444')) + '; height: 8px; border-radius: 10px;"></div></div><span style="min-width: 45px; font-weight: 600;">' + taxa.toFixed(1) + '%</span></div></td>' +
                '<td style="text-align: right; font-weight: 600;">' + Utils.formatCurrency(ticket) + '</td>' +
                '<td style="text-align: center;"><span class="badge ' + statusClass + '">' + status + '</span></td>' +
                '</tr>';
        }
    }
    
    html += '        </tbody>';
    html += '      </table>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    // =============================================
    // CARD: PERFORMANCE POR TIPO DE SERVIÇO
    // =============================================
    var servicos = metricas.leadsPorServico || [];
    if (!Array.isArray(servicos) && typeof servicos === 'object') {
        servicos = Object.keys(servicos).map(function(key) {
            return {
                servico: key,
                total: servicos[key] || 0,
                convertidos: 0,
                taxa: 0,
                ticket: 0
            };
        });
    }
    
    html += '<div class="card" style="margin-bottom: 0;">';
    html += '  <div class="card-header"><span class="card-title">📊 Performance por Tipo de Serviço</span></div>';
    html += '  <div class="card-body">';
    html += '    <div class="data-table-wrapper">';
    html += '      <table class="data-table">';
    html += '        <thead><tr><th style="text-align: center;">Serviço</th><th style="text-align: center;">Leads</th><th style="text-align: center;">Conversões</th><th style="text-align: center;">Taxa</th><th style="text-align: right;">Ticket Médio</th><th style="text-align: center;">Status</th></tr></thead>';
    html += '        <tbody>';
    
    if (servicos.length === 0) {
        html += '          <tr><td colspan="6" class="empty-state" style="text-align: center;">Nenhum dado disponível</td></tr>';
    } else {
        for (var i = 0; i < servicos.length; i++) {
            var s = servicos[i];
            var total = s.total || 0;
            var convertidos = s.convertidos || 0;
            var taxa = total > 0 ? (convertidos / total * 100) : 0;
            var ticket = convertidos > 0 ? (s.somaValores || 0) / convertidos : 0;
            var status = taxa >= 25 ? '🟢 Excelente' : (taxa >= 15 ? '🟡 Bom' : (taxa >= 5 ? '🟠 Atenção' : '🔴 Crítico'));
            var statusClass = taxa >= 25 ? 'badge-success' : (taxa >= 15 ? 'badge-info' : (taxa >= 5 ? 'badge-warning' : 'badge-danger'));
            
            html += '<tr>' +
                '<td style="text-align: left;"><strong>' + (s.servico || 'Não informado') + '</strong></td>' +
                '<td style="text-align: center;">' + total + '</td>' +
                '<td style="text-align: center;">' + convertidos + '</td>' +
                '<td style="text-align: center;"><div style="display: flex; align-items: center; gap: 8px; justify-content: center;"><div style="flex:1; background: #e5e7eb; border-radius: 10px; height: 8px; max-width: 100px;"><div style="width: ' + taxa + '%; background: ' + (taxa >= 25 ? '#10b981' : (taxa >= 15 ? '#f59e0b' : '#ef4444')) + '; height: 8px; border-radius: 10px;"></div></div><span style="min-width: 45px; font-weight: 600;">' + taxa.toFixed(1) + '%</span></div></td>' +
                '<td style="text-align: right; font-weight: 600;">' + Utils.formatCurrency(ticket) + '</td>' +
                '<td style="text-align: center;"><span class="badge ' + statusClass + '">' + status + '</span></td>' +
                '</tr>';
        }
    }
    
    html += '        </tbody>';
    html += '      </table>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
    console.log('✅ [POR ORIGEM] Renderizado com', origens.length, 'origem(ns) e', servicos.length, 'serviço(s)');
};

// =============================================
// RENDERIZAR PREVISÃO PIPELINE
// =============================================
managerApp.renderizarPrevisaoPipeline = function(metricas) {
    var container = document.getElementById('funilEstatisticas');
    if (!container) return;
    
    if (!metricas || (metricas.pipelineValue || 0) === 0) {
        container.innerHTML = '<div class="empty-state">Sem leads no pipeline para projeção</div>';
        return;
    }
    
    var taxaHistorica = (metricas.taxaConversao || 0) / 100;
    var pipeline = metricas.pipelineValue || 0;
    var valorProjetado30 = pipeline * taxaHistorica * 0.8;
    var valorProjetado60 = pipeline * taxaHistorica * 1.2;
    var valorProjetado90 = pipeline * taxaHistorica * 1.5;
    
    var mediaLeads = 0;
    var mesesKeys = Object.keys(metricas.leadsPorMes || {}).sort();
    var ultimosMeses = mesesKeys.slice(-3);
    for (var i = 0; i < ultimosMeses.length; i++) {
        mediaLeads += metricas.leadsPorMes[ultimosMeses[i]].total || 0;
    }
    mediaLeads = ultimosMeses.length > 0 ? mediaLeads / ultimosMeses.length : (metricas.totalLeads || 0);
    
    var projecaoLeads = Math.round((mediaLeads || 0) * 1.05);
    var projecaoConversao = Math.round(projecaoLeads * ((metricas.taxaConversao || 0) / 100));
    var projecaoTicket = (metricas.ticketMedioConvertidos || 0) * 1.02;
    var projecaoFaturamento = projecaoConversao * projecaoTicket;
    
    var html = '';
    
    html += '<div class="card" style="margin-top: 20px; border-left: 4px solid #8b5cf6; width: 100%;">';
    html += '  <div class="card-header" style="background: #f5f3ff;">';
    html += '    <span class="card-title">🔮 Previsão e Projeções</span>';
    html += '  </div>';
    html += '  <div class="card-body">';
    
    html += '    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; width: 100%;">';
    
    html += '      <div style="flex: 1 1 calc(25% - 10px); max-width: calc(25% - 10px); min-width: 140px; background: var(--gray-50); padding: 12px 16px; border-radius: 8px; text-align: center; box-sizing: border-box;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Pipeline Atual</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">' + Utils.formatCurrency(pipeline) + '</div>';
    html += '        <div style="font-size: 11px; color: var(--gray-500);">' + ((metricas.emNegociacao || 0) + (metricas.comProposta || 0)) + ' leads no pipeline</div>';
    html += '      </div>';
    
    html += '      <div style="flex: 1 1 calc(25% - 10px); max-width: calc(25% - 10px); min-width: 140px; background: var(--gray-50); padding: 12px 16px; border-radius: 8px; text-align: center; box-sizing: border-box;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Projeção 30 Dias</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #10b981;">' + Utils.formatCurrency(valorProjetado30) + '</div>';
    html += '        <div style="font-size: 11px; color: var(--gray-500);">Taxa histórica</div>';
    html += '      </div>';
    
    html += '      <div style="flex: 1 1 calc(25% - 10px); max-width: calc(25% - 10px); min-width: 140px; background: var(--gray-50); padding: 12px 16px; border-radius: 8px; text-align: center; box-sizing: border-box;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Projeção 60 Dias</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #0d9488;">' + Utils.formatCurrency(valorProjetado60) + '</div>';
    html += '        <div style="font-size: 11px; color: var(--gray-500);">Cenário otimista</div>';
    html += '      </div>';
    
    html += '      <div style="flex: 1 1 calc(25% - 10px); max-width: calc(25% - 10px); min-width: 140px; background: var(--gray-50); padding: 12px 16px; border-radius: 8px; text-align: center; box-sizing: border-box;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Projeção 90 Dias</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #0d9488;">' + Utils.formatCurrency(valorProjetado90) + '</div>';
    html += '        <div style="font-size: 11px; color: var(--gray-500);">Cenário expansivo</div>';
    html += '      </div>';
    
    html += '    </div>';
    
    html += '    <div style="border-top: 1px solid var(--gray-200); padding-top: 16px;">';
    html += '      <div style="display: flex; flex-wrap: wrap; gap: 12px; width: 100%;">';
    
    html += '        <div style="flex: 1 1 calc(25% - 10px); max-width: calc(25% - 10px); min-width: 120px; box-sizing: border-box;"><span style="font-size: 11px; color: var(--gray-500);">📊 Leads Próximo Mês</span><br><strong>' + projecaoLeads + '</strong></div>';
    html += '        <div style="flex: 1 1 calc(25% - 10px); max-width: calc(25% - 10px); min-width: 120px; box-sizing: border-box;"><span style="font-size: 11px; color: var(--gray-500);">✅ Conversões</span><br><strong>' + projecaoConversao + '</strong></div>';
    html += '        <div style="flex: 1 1 calc(25% - 10px); max-width: calc(25% - 10px); min-width: 120px; box-sizing: border-box;"><span style="font-size: 11px; color: var(--gray-500);">💰 Ticket Médio</span><br><strong>' + Utils.formatCurrency(projecaoTicket) + '</strong></div>';
    html += '        <div style="flex: 1 1 calc(25% - 10px); max-width: calc(25% - 10px); min-width: 120px; box-sizing: border-box;"><span style="font-size: 11px; color: var(--gray-500);">📈 Faturamento</span><br><strong style="color: #2563eb;">' + Utils.formatCurrency(projecaoFaturamento) + '</strong></div>';
    
    html += '      </div>';
    html += '    </div>';
    
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
};

// =============================================
// RENDERIZAR RECOMENDAÇÕES AVANÇADAS
// =============================================
managerApp.renderizarRecomendacoesAvancadas = function(metricas) {
    var container = document.getElementById('leadsRecomendacoesContainer');
    if (!container) return;
    
    var recomendacoes = this.gerarRecomendacoesAvancadas(metricas);
    
    if (!recomendacoes || recomendacoes.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    var html = '<div class="card" style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border: 1px solid #0d9488; margin-top: 20px;">';
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
// GERAR RECOMENDAÇÕES AVANÇADAS
// =============================================
managerApp.gerarRecomendacoesAvancadas = function(metricas) {
    var recomendacoes = [];
    
    if (!metricas) return recomendacoes;
    
    if ((metricas.taxaConversao || 0) < 10 && (metricas.totalLeads || 0) > 5) {
        recomendacoes.push({
            tipo: 'alerta',
            titulo: '📉 Taxa de Conversão Baixa (' + (metricas.taxaConversao || 0).toFixed(1) + '%)',
            descricao: 'Apenas ' + (metricas.convertidos || 0) + ' de ' + (metricas.totalLeads || 0) + ' leads foram convertidos.',
            acao: 'Revisar processo de vendas e qualificação de leads'
        });
    }
    
    if ((metricas.tempoMedioConversao || 0) > 30 && (metricas.convertidos || 0) > 0) {
        recomendacoes.push({
            tipo: 'alerta',
            titulo: '⏱️ Ciclo de Vendas Longo (' + (metricas.tempoMedioConversao || 0).toFixed(0) + ' dias)',
            descricao: 'Leads levam em média ' + (metricas.tempoMedioConversao || 0).toFixed(0) + ' dias para converter.',
            acao: 'Acelerar follow-up e reduzir tempo de resposta'
        });
    }
    
    if (metricas.leadsPorOrigem && Array.isArray(metricas.leadsPorOrigem)) {
        var melhoresOrigens = metricas.leadsPorOrigem.filter(function(o) { return (o.total || 0) >= 3; });
        if (melhoresOrigens.length > 0) {
            var melhor = melhoresOrigens.reduce(function(a, b) { return (a.taxa || 0) > (b.taxa || 0) ? a : b; });
            if ((melhor.taxa || 0) > 0) {
                recomendacoes.push({
                    tipo: 'positivo',
                    titulo: '🏆 Melhor Origem: ' + (melhor.origem || 'N/A'),
                    descricao: 'Taxa de conversão de ' + (melhor.taxa || 0).toFixed(1) + '% com ' + (melhor.total || 0) + ' leads.',
                    acao: 'Aumentar investimento em ' + (melhor.origem || 'N/A')
                });
            }
        }
    }
    
    if (metricas.leadsPorServico && Array.isArray(metricas.leadsPorServico)) {
        var melhoresServicos = metricas.leadsPorServico.filter(function(s) { return (s.total || 0) >= 3; });
        if (melhoresServicos.length > 0) {
            var melhorS = melhoresServicos.reduce(function(a, b) { return (a.taxa || 0) > (b.taxa || 0) ? a : b; });
            if ((melhorS.taxa || 0) > 0) {
                recomendacoes.push({
                    tipo: 'positivo',
                    titulo: '🏆 Melhor Serviço: ' + (melhorS.servico || 'N/A'),
                    descricao: 'Taxa de conversão de ' + (melhorS.taxa || 0).toFixed(1) + '% com ' + (melhorS.total || 0) + ' leads.',
                    acao: 'Focar em vendas de ' + (melhorS.servico || 'N/A')
                });
            }
        }
    }
    
    var leadsParadosCount = (Array.isArray(metricas.leadsParados) ? metricas.leadsParados.length : 0);
    if (leadsParadosCount > 3) {
        recomendacoes.push({
            tipo: 'alerta',
            titulo: '⏳ ' + leadsParadosCount + ' leads parados',
            descricao: 'Leads sem atualização há mais de 15 dias.',
            acao: 'Priorizar contato com leads parados'
        });
    }
    
    if ((metricas.taxaPerda || 0) > 30) {
        recomendacoes.push({
            tipo: 'alerta',
            titulo: '📉 Taxa de Perda Alta (' + (metricas.taxaPerda || 0).toFixed(1) + '%)',
            descricao: 'Muitos leads estão sendo perdidos. Analisar motivos.',
            acao: 'Revisar abordagem e identificação de objeções'
        });
    }
    
    if ((metricas.pipelineValue || 0) < ((metricas.ticketMedioConvertidos || 5000) * 2) && (metricas.totalLeads || 0) > 5) {
        recomendacoes.push({
            tipo: 'alerta',
            titulo: '📋 Pipeline abaixo do esperado',
            descricao: 'Valor do pipeline é baixo em relação ao ticket médio.',
            acao: 'Aumentar volume de leads em negociação'
        });
    }
    
    if ((metricas.taxaConversao || 0) > 20 && (metricas.totalLeads || 0) > 10) {
        recomendacoes.push({
            tipo: 'positivo',
            titulo: '🚀 Performance Excelente!',
            descricao: 'Taxa de conversão de ' + (metricas.taxaConversao || 0).toFixed(1) + '% com ' + (metricas.totalLeads || 0) + ' leads.',
            acao: 'Manter estratégia atual e documentar práticas'
        });
    }
    
    return recomendacoes.slice(0, 6);
};
// =============================================
// RENDERIZAR GURU DE GESTÃO (COM TEXTOS DISCURSIVOS)
// =============================================
managerApp.renderizarGuru = function(metricas, mesReferencia) {
    var container = document.getElementById('metricasGuruContainer');
    if (!container) return;
    
    var dados = (metricas && metricas.dadosGuru) ? metricas.dadosGuru : this._coletarDadosGuru();
    
    if (!dados.faturamento) dados.faturamento = 0;
    if (!dados.custoDireto) dados.custoDireto = 0;
    if (!dados.resultadoBruto) dados.resultadoBruto = dados.faturamento - dados.custoDireto;
    if (!dados.metas) dados.metas = { faturamento: 50000 };
    if (!Array.isArray(dados.alertasContratos)) dados.alertasContratos = [];
    if (!dados.leadsQuentes) dados.leadsQuentes = 0;
    if (!dados.leadsParados) dados.leadsParados = 0;
    
    var mesExibicao = '';
    if (mesReferencia) {
        var parts = mesReferencia.split('-');
        var meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        mesExibicao = meses[parseInt(parts[1]) - 1] + '/' + parts[0];
    }
    
    var html = '';
    
    html += '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">';
    
    var faturamento = dados.faturamento || 1;
    var margem = dados.resultadoBruto || 0;
    var margemPercentual = (margem / faturamento) * 100;
    
    var alertaMargem = margemPercentual < 0 ? '🔴' : (margemPercentual < 10 ? '🟡' : '🟢');
    var textoMargem = margemPercentual < 0 ? 'Margem Negativa!' : (margemPercentual < 10 ? 'Margem Baixa' : 'Margem Saudável');
    html += '<div class="stat-card" style="border-left: 4px solid ' + (margemPercentual < 0 ? '#dc2626' : (margemPercentual < 10 ? '#f59e0b' : '#10b981')) + ';">';
    html += '  <div class="stat-icon ' + (margemPercentual < 0 ? 'red' : (margemPercentual < 10 ? 'amber' : 'green')) + '">' + alertaMargem + '</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; color: ' + (margemPercentual < 0 ? '#dc2626' : (margemPercentual < 10 ? '#f59e0b' : '#10b981')) + ';">' + textoMargem + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">Margem: ' + (margemPercentual || 0).toFixed(1) + '% | Resultado: ' + Utils.formatCurrency(margem || 0) + '</div>';
    html += '  </div>';
    html += '</div>';
    
    var contratosAlerta = dados.alertasContratos || [];
    var qtdCriticos = 0;
    for (var i = 0; i < contratosAlerta.length; i++) {
        if (contratosAlerta[i] && contratosAlerta[i].tipo === 'critico') qtdCriticos++;
    }
    var alertaContrato = qtdCriticos > 0 ? '🔴' : (contratosAlerta.length > 0 ? '🟡' : '🟢');
    var textoContrato = qtdCriticos > 0 ? 'Contratos Críticos!' : (contratosAlerta.length > 0 ? 'Contratos em Atenção' : 'Sem Alertas');
    html += '<div class="stat-card" style="border-left: 4px solid ' + (qtdCriticos > 0 ? '#dc2626' : (contratosAlerta.length > 0 ? '#f59e0b' : '#10b981')) + ';">';
    html += '  <div class="stat-icon ' + (qtdCriticos > 0 ? 'red' : (contratosAlerta.length > 0 ? 'amber' : 'green')) + '">' + alertaContrato + '</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; color: ' + (qtdCriticos > 0 ? '#dc2626' : (contratosAlerta.length > 0 ? '#f59e0b' : '#10b981')) + ';">' + textoContrato + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">' + contratosAlerta.length + ' contratos em alerta (' + qtdCriticos + ' críticos)</div>';
    html += '  </div>';
    html += '</div>';
    
    var leadsQuentes = dados.leadsQuentes || 0;
    var leadsParados = dados.leadsParados || 0;
    var alertaLeads = leadsParados > 3 ? '🔴' : (leadsQuentes > 0 ? '🟢' : '🟡');
    var textoLeads = leadsParados > 3 ? 'Leads Parados!' : (leadsQuentes > 0 ? leadsQuentes + ' Leads Quentes' : 'Sem Leads Ativos');
    html += '<div class="stat-card" style="border-left: 4px solid ' + (leadsParados > 3 ? '#dc2626' : (leadsQuentes > 0 ? '#10b981' : '#f59e0b')) + ';">';
    html += '  <div class="stat-icon ' + (leadsParados > 3 ? 'red' : (leadsQuentes > 0 ? 'green' : 'amber')) + '">' + alertaLeads + '</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; color: ' + (leadsParados > 3 ? '#dc2626' : (leadsQuentes > 0 ? '#10b981' : '#f59e0b')) + ';">' + textoLeads + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">' + leadsQuentes + ' quentes | ' + leadsParados + ' parados</div>';
    html += '  </div>';
    html += '</div>';
    
    var metaFaturamento = (dados.metas && dados.metas.faturamento) ? dados.metas.faturamento : 50000;
    var pctMeta = (faturamento / metaFaturamento) * 100;
    var alertaMeta = pctMeta >= 100 ? '🟢' : (pctMeta >= 70 ? '🟡' : '🔴');
    var textoMeta = pctMeta >= 100 ? 'Meta Atingida!' : (pctMeta >= 70 ? 'Próximo da Meta' : 'Abaixo da Meta');
    html += '<div class="stat-card" style="border-left: 4px solid ' + (pctMeta >= 100 ? '#10b981' : (pctMeta >= 70 ? '#f59e0b' : '#dc2626')) + ';">';
    html += '  <div class="stat-icon ' + (pctMeta >= 100 ? 'green' : (pctMeta >= 70 ? 'amber' : 'red')) + '">' + alertaMeta + '</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; color: ' + (pctMeta >= 100 ? '#10b981' : (pctMeta >= 70 ? '#f59e0b' : '#dc2626')) + ';">' + textoMeta + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">' + Utils.formatCurrency(faturamento || 0) + ' / ' + Utils.formatCurrency(metaFaturamento) + ' (' + (pctMeta || 0).toFixed(0) + '%)</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    var projecao = this._calcularProjecaoGuru(metricas, dados);
    
    html += '<div class="card" style="border-left: 4px solid #2563eb; margin-bottom: 20px;">';
    html += '  <div class="card-header" style="background: #eff6ff;">';
    html += '    <span class="card-title">🔮 Projeções para os Próximos 60 Dias</span>';
    html += '  </div>';
    html += '  <div class="card-body">';
    html += '    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">';
    
    html += '      <div style="background: var(--gray-50); padding: 12px 16px; border-radius: 8px; text-align: center;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Faturamento</div>';
    html += '        <div style="font-size: 18px; font-weight: 700; color: ' + ((projecao.faturamento || 0) >= 0 ? '#2563eb' : '#dc2626') + ';">' + Utils.formatCurrency(projecao.faturamento || 0) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">Base: média últimos 3 meses</div>';
    html += '      </div>';
    
    html += '      <div style="background: var(--gray-50); padding: 12px 16px; border-radius: 8px; text-align: center;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Margem Projetada</div>';
    html += '        <div style="font-size: 18px; font-weight: 700; color: ' + ((projecao.margem || 0) >= 15 ? '#10b981' : ((projecao.margem || 0) >= 5 ? '#f59e0b' : '#dc2626')) + ';">' + (projecao.margem || 0).toFixed(1) + '%</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">' + ((projecao.margem || 0) >= 15 ? '✅ Saudável' : ((projecao.margem || 0) >= 5 ? '⚠️ Atenção' : '🔴 Crítico')) + '</div>';
    html += '      </div>';
    
    html += '      <div style="background: var(--gray-50); padding: 12px 16px; border-radius: 8px; text-align: center;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Saldo Projetado</div>';
    html += '        <div style="font-size: 18px; font-weight: 700; color: ' + ((projecao.saldo || 0) >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(projecao.saldo || 0) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">' + ((projecao.saldo || 0) >= 0 ? '💰 Positivo' : '🔴 Negativo') + '</div>';
    html += '      </div>';
    
    html += '      <div style="background: var(--gray-50); padding: 12px 16px; border-radius: 8px; text-align: center;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); text-transform: uppercase;">Risco de Caixa</div>';
    html += '        <div style="font-size: 18px; font-weight: 700; color: ' + (projecao.risco === 'Baixo' ? '#10b981' : (projecao.risco === 'Médio' ? '#f59e0b' : '#dc2626')) + ';">' + (projecao.risco || 'Indeterminado') + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">Dias de cobertura: ' + (projecao.diasCobertura || 0) + ' dias</div>';
    html += '      </div>';
    
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    var diagnostico = this._gerarDiagnosticoGeral(dados, metricas, mesExibicao);
    if (diagnostico) {
        html += '<div class="card" style="margin-bottom: 20px; border-left: 4px solid #0d9488;">';
        html += '  <div class="card-header" style="background: #f0fdfa;">';
        html += '    <span class="card-title">📊 Diagnóstico Geral</span>';
        html += '  </div>';
        html += '  <div class="card-body" style="padding: 16px 20px; font-size: 14px; line-height: 1.7; color: var(--gray-700);">';
        html += '    <p style="margin-bottom: 0;">' + diagnostico + '</p>';
        html += '  </div>';
        html += '</div>';
    }
    
    var alertasTexto = this._gerarAlertasTexto(dados, metricas);
    if (alertasTexto) {
        html += '<div class="card" style="margin-bottom: 20px; border-left: 4px solid #f59e0b;">';
        html += '  <div class="card-header" style="background: #fef3c7;">';
        html += '    <span class="card-title">⚠️ Alertas e Oportunidades</span>';
        html += '  </div>';
        html += '  <div class="card-body" style="padding: 16px 20px; font-size: 14px; line-height: 1.7; color: var(--gray-700);">';
        html += '    <div style="display: flex; flex-direction: column; gap: 12px;">';
        html += alertasTexto;
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }
    
    var recomendacoesTexto = this._gerarRecomendacoesTexto(dados, metricas);
    if (recomendacoesTexto) {
        html += '<div class="card" style="border-left: 4px solid #8b5cf6;">';
        html += '  <div class="card-header" style="background: #f5f3ff;">';
        html += '    <span class="card-title">🎯 Recomendações Estratégicas</span>';
        html += '  </div>';
        html += '  <div class="card-body" style="padding: 16px 20px; font-size: 14px; line-height: 1.7; color: var(--gray-700);">';
        html += '    <div style="display: flex; flex-direction: column; gap: 12px;">';
        html += recomendacoesTexto;
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }
    
    container.innerHTML = html;
    console.log('✅ [GURU] Renderizado');
};

// =============================================
// GERAR DIAGNÓSTICO GERAL (TEXTO DISCURSIVO)
// =============================================
managerApp._gerarDiagnosticoGeral = function(dados, metricas, mesExibicao) {
    var faturamento = dados.faturamento || 0;
    var custoDireto = dados.custoDireto || 0;
    var resultado = dados.resultadoBruto || 0;
    var margem = faturamento > 0 ? (resultado / faturamento * 100) : 0;
    var totalLeads = metricas ? metricas.totalLeads || 0 : 0;
    var convertidos = metricas ? metricas.convertidos || 0 : 0;
    var taxaConv = metricas ? metricas.taxaConversao || 0 : 0;
    
    var texto = '';
    
    if (resultado > 0 && margem > 20) {
        texto += '✅ <strong>Saúde financeira boa.</strong> ';
    } else if (resultado > 0 && margem > 10) {
        texto += '🟡 <strong>Saúde financeira razoável.</strong> ';
    } else if (resultado > 0 && margem > 0) {
        texto += '🟠 <strong>Saúde financeira frágil.</strong> ';
    } else {
        texto += '🔴 <strong>Saúde financeira crítica!</strong> ';
    }
    
    texto += 'Com base na análise de ' + mesExibicao + ', sua empresa apresenta um faturamento de <strong>' + 
             Utils.formatCurrency(faturamento) + '</strong> e um custo direto de <strong>' + 
             Utils.formatCurrency(custoDireto) + '</strong>, resultando em um resultado bruto de <strong>' + 
             Utils.formatCurrency(resultado) + '</strong> (margem de ' + margem.toFixed(1) + '%). ';
    
    if (totalLeads > 0) {
        texto += 'No pipeline comercial, você possui <strong>' + totalLeads + ' leads</strong> no mês, com <strong>' + 
                 convertidos + ' conversões</strong> (taxa de ' + taxaConv.toFixed(1) + '%). ';
        
        if (taxaConv > 20) {
            texto += 'A taxa de conversão está excelente! 🚀 ';
        } else if (taxaConv > 10) {
            texto += 'A taxa de conversão está dentro do esperado. ';
        } else {
            texto += 'A taxa de conversão está abaixo do ideal. ';
        }
    }
    
    if (custoDireto > 0 && faturamento > 0) {
        var percentualCusto = (custoDireto / faturamento) * 100;
        if (percentualCusto > 80) {
            texto += '⚠️ <strong>Atenção:</strong> O custo direto representa ' + percentualCusto.toFixed(1) + '% da receita, o que é elevado. ';
        } else if (percentualCusto > 70) {
            texto += 'O custo direto representa ' + percentualCusto.toFixed(1) + '% da receita, dentro do esperado. ';
        } else {
            texto += 'O custo direto representa ' + percentualCusto.toFixed(1) + '% da receita, indicando boa eficiência operacional. ';
        }
    }
    
    return texto;
};

// =============================================
// GERAR ALERTAS E OPORTUNIDADES (TEXTO DISCURSIVO)
// =============================================
managerApp._gerarAlertasTexto = function(dados, metricas) {
    var alertas = [];
    var dashboard = this.dashboardCache || {};
    var assistidos = dashboard.assistidos || [];
    
    var contratosAlerta = dados.alertasContratos || [];
    var criticos = contratosAlerta.filter(function(a) { return a && a.tipo === 'critico'; });
    var atencao = contratosAlerta.filter(function(a) { return a && a.tipo === 'atencao'; });
    
    if (criticos.length > 0) {
        var nomesCriticos = criticos.slice(0, 3).map(function(a) { return a && a.nome ? a.nome : 'N/A'; }).join(', ');
        alertas.push('🔴 <strong>Contratos com vencimento crítico:</strong> ' + criticos.length + ' contrato(s) vencem nos próximos dias. São eles: ' + 
                    nomesCriticos + (criticos.length > 3 ? ' e +' + (criticos.length - 3) + ' outros' : '') + 
                    '. Recomendo entrar em contato com as famílias para iniciar a negociação de renovação imediatamente.');
    }
    
    if (atencao.length > 0) {
        var nomesAtencao = atencao.slice(0, 3).map(function(a) { return a && a.nome ? a.nome : 'N/A'; }).join(', ');
        alertas.push('🟡 <strong>Contratos em atenção:</strong> ' + atencao.length + ' contrato(s) vencem nos próximos dias. São eles: ' + 
                    nomesAtencao + (atencao.length > 3 ? ' e +' + (atencao.length - 3) + ' outros' : '') + 
                    '. Agenda uma visita ou contato para alinhar a renovação.');
    }
    
    var leadsParados = dados.leadsParados || 0;
    if (leadsParados > 3) {
        alertas.push('⏳ <strong>Leads parados:</strong> ' + leadsParados + ' leads estão há mais de 15 dias sem atualização. ' +
                    'Leads parados tendem a esfriar e podem ser perdidos. Sugiro redistribuí-los entre os vendedores para reativação imediata.');
    }
    
    if (assistidos && assistidos.length > 0) {
        var upsellCandidates = assistidos.filter(function(a) {
            return a && a.status === 'Ativo' && a.tipoContrato === 'MENSAL' && a.plantoes === '6 Horas';
        });
        if (upsellCandidates.length > 2) {
            var nomesUpsell = upsellCandidates.slice(0, 3).map(function(a) { return a && a.nome ? a.nome : 'N/A'; }).join(', ');
            alertas.push('📈 <strong>Oportunidade de upsell:</strong> ' + upsellCandidates.length + ' assistidos com contrato de 6 horas podem migrar para 8 ou 12 horas. ' +
                        'Destaque para: ' + nomesUpsell + (upsellCandidates.length > 3 ? ' e +' + (upsellCandidates.length - 3) + ' outros' : '') + 
                        '. Isso pode aumentar o faturamento mensal significativamente.');
        }
    }
    
    if (metricas && metricas.taxaPerda > 30) {
        alertas.push('📉 <strong>Taxa de perda elevada:</strong> ' + metricas.taxaPerda.toFixed(1) + '% dos leads estão sendo perdidos. ' +
                    'Isso indica que a abordagem comercial precisa ser revisada. Analise os principais motivos de perda e ajuste a estratégia.');
    }
    
    if (assistidos && assistidos.length > 0) {
        var scoreBaixo = assistidos.filter(function(a) {
            return a && a.status === 'Ativo' && a.tipoContrato === 'MENSAL' && a.scoreSatisfacao && parseInt(a.scoreSatisfacao) < 70;
        });
        if (scoreBaixo.length > 0) {
            var nomesScore = scoreBaixo.slice(0, 3).map(function(a) { return a && a.nome ? a.nome : 'N/A'; }).join(', ');
            alertas.push('⚠️ <strong>Score de satisfação baixo:</strong> ' + scoreBaixo.length + ' assistido(s) com score abaixo de 70. ' +
                        'São eles: ' + nomesScore + (scoreBaixo.length > 3 ? ' e +' + (scoreBaixo.length - 3) + ' outros' : '') + 
                        '. Recomendo agendar uma reunião com as famílias para alinhar expectativas e evitar desligamentos.');
        }
    }
    
    return alertas.length > 0 ? alertas.map(function(a) { return '<p style="margin: 0; padding: 8px 12px; background: var(--gray-50); border-radius: 8px;">' + a + '</p>'; }).join('') : 
           '<p style="margin: 0; color: var(--gray-500);">Nenhum alerta ou oportunidade identificada neste momento. Continue com o bom trabalho! 🎉</p>';
};

// =============================================
// GERAR RECOMENDAÇÕES ESTRATÉGICAS (TEXTO DISCURSIVO)
// =============================================
managerApp._gerarRecomendacoesTexto = function(dados, metricas) {
    var recomendacoes = [];
    var dashboard = this.dashboardCache || {};
    var assistidos = dashboard.assistidos || [];
    
    var faturamento = dados.faturamento || 0;
    var custoDireto = dados.custoDireto || 0;
    var resultado = dados.resultadoBruto || 0;
    var margem = faturamento > 0 ? (resultado / faturamento * 100) : 0;
    
    if (margem < 10 && faturamento > 0) {
        recomendacoes.push('💰 <strong>Revisão de custos:</strong> Sua margem está abaixo de 10%. Recomendo revisar os contratos com custo superior à receita e negociar redução de horas ou reajuste de preços.');
    } else if (margem > 25) {
        recomendacoes.push('✅ <strong>Manter estratégia:</strong> Sua margem está saudável (>25%). Continue monitorando os custos e mantenha a qualidade do serviço.');
    } else {
        recomendacoes.push('📊 <strong>Acompanhamento de margem:</strong> Sua margem está em ' + margem.toFixed(1) + '%. Continue acompanhando de perto para garantir a sustentabilidade do negócio.');
    }
    
    if (metricas) {
        var totalLeads = metricas.totalLeads || 0;
        var taxaConv = metricas.taxaConversao || 0;
        var pipeline = metricas.pipelineValue || 0;
        
        if (totalLeads < 10) {
            recomendacoes.push('📊 <strong>Aumentar prospecção:</strong> O volume de leads está baixo (' + totalLeads + ' no mês). Invista em marketing para aumentar a entrada de novos leads.');
        }
        
        if (taxaConv < 10 && totalLeads > 5) {
            recomendacoes.push('🎯 <strong>Melhorar conversão:</strong> A taxa de conversão está baixa (' + taxaConv.toFixed(1) + '%). Revise o processo de vendas, qualificação de leads e abordagem comercial.');
        }
        
        if (pipeline < 5000 && totalLeads > 5) {
            recomendacoes.push('📋 <strong>Fortalecer pipeline:</strong> O valor do pipeline está baixo. Aumente o volume de leads em negociação para garantir receita futura.');
        }
    }
    
    var contratosAlerta = dados.alertasContratos || [];
    if (contratosAlerta.length > 0) {
        recomendacoes.push('📅 <strong>Priorizar renovações:</strong> ' + contratosAlerta.length + ' contratos estão em alerta. Crie uma agenda de contato para as famílias e evite perda de receita.');
    }
    
    var leadsParados = dados.leadsParados || 0;
    if (leadsParados > 3) {
        recomendacoes.push('🔄 <strong>Reativar leads:</strong> ' + leadsParados + ' leads estão parados. Distribua-os entre os vendedores para follow-up imediato.');
    }
    
    if (assistidos && assistidos.length > 0) {
        var upsellCandidates = assistidos.filter(function(a) {
            return a && a.status === 'Ativo' && a.tipoContrato === 'MENSAL' && a.plantoes === '6 Horas';
        });
        if (upsellCandidates.length > 2) {
            var potencial = upsellCandidates.length * 2000;
            recomendacoes.push('📈 <strong>Oportunidade de upsell:</strong> ' + upsellCandidates.length + ' assistidos podem migrar para 8 ou 12 horas. Potencial de aumento de faturamento: ~' + 
                              Utils.formatCurrency(potencial) + '/mês.');
        }
    }
    
    if (assistidos && assistidos.length > 0) {
        var scoreBaixo = assistidos.filter(function(a) {
            return a && a.status === 'Ativo' && a.tipoContrato === 'MENSAL' && a.scoreSatisfacao && parseInt(a.scoreSatisfacao) < 70;
        });
        if (scoreBaixo.length > 0) {
            recomendacoes.push('👥 <strong>Atenção aos assistidos:</strong> ' + scoreBaixo.length + ' assistidos com score baixo. Agende visitas ou reuniões para entender as insatisfações.');
        }
    }
    
    return recomendacoes.length > 0 ? recomendacoes.map(function(r) { 
        return '<p style="margin: 0; padding: 8px 12px; background: var(--gray-50); border-radius: 8px;">' + r + '</p>'; 
    }).join('') : 
    '<p style="margin: 0; color: var(--gray-500);">Não há recomendações específicas neste momento. Continue com as boas práticas!</p>';
};

// =============================================
// CALCULAR PROJEÇÕES DO GURU
// =============================================
managerApp._calcularProjecaoGuru = function(metricas, dados) {
    var hoje = new Date();
    
    var mesesKeys = Object.keys(metricas.leadsPorMes || {}).sort();
    var ultimosMeses = mesesKeys.slice(-3);
    var faturamentoMedio = 0;
    for (var i = 0; i < ultimosMeses.length; i++) {
        faturamentoMedio += metricas.leadsPorMes[ultimosMeses[i]].somaValores || 0;
    }
    faturamentoMedio = ultimosMeses.length > 0 ? faturamentoMedio / ultimosMeses.length : 0;
    
    var projFaturamento = (faturamentoMedio || 0) * 1.05;
    
    var faturamentoAtual = dados.faturamento || 0;
    var custoDireto = dados.custoDireto || 0;
    var margemAtual = faturamentoAtual > 0 ? ((faturamentoAtual - custoDireto) / faturamentoAtual * 100) : 0;
    var projMargem = (margemAtual || 0) * 1.02;
    
    var saldoAtual = this.dadosFluxoCaixa ? this.dadosFluxoCaixa.saldoInicial || 0 : 0;
    var resultadoMensal = (faturamentoAtual - custoDireto) || 0;
    var projSaldo = (saldoAtual || 0) + ((resultadoMensal || 0) * 2);
    
    var despesaMensal = this.dadosFluxoCaixa ? (this.dadosFluxoCaixa.projecao || [])[0]?.despesa || 0 : 0;
    var despesaDiaria = despesaMensal > 0 ? despesaMensal / 30 : 0;
    var diasCobertura = despesaDiaria > 0 ? Math.round((saldoAtual || 0) / despesaDiaria) : 0;
    
    var risco = 'Baixo';
    if (diasCobertura < 15) risco = 'Alto';
    else if (diasCobertura < 30) risco = 'Médio';
    
    return {
        faturamento: projFaturamento,
        margem: projMargem,
        saldo: projSaldo,
        risco: risco,
        diasCobertura: diasCobertura
    };
};
