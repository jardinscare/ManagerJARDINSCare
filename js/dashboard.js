// =============================================
// DASHBOARD - managerJARDINSCare
// Versão 3.0 - Barra de progresso padronizada (inline)
// =============================================

// 🔥 CONTROLE GLOBAL DA BARRA DE PROGRESSO
managerApp._progressBarActive = false;
managerApp._progressBarTimeout = null;
managerApp._carregandoInicial = false;

// =============================================
// 🆕 BARRA DE PROGRESSO INLINE — DASHBOARD
// =============================================
managerApp._progressoInlineDash = {
    container: null,
    fill: null,
    percent: null,
    subtitle: null,
    stepsEls: [],
    timeoutHideId: null
};

managerApp._mostrarProgressoInline = function(titulo, subtitulo) {
    var pb = this._progressoInlineDash;
    
    if (pb.timeoutHideId) {
        clearTimeout(pb.timeoutHideId);
        pb.timeoutHideId = null;
    }
    
    var container = document.getElementById('progressBarContainer');
    if (!container) {
        console.warn('⚠️ #progressBarContainer não encontrado');
        return;
    }
    
    container.style.display = 'block';
    this._progressBarActive = true;
    
pb.container = container;
pb.fill = document.getElementById('progressFill');
pb.percent = document.getElementById('progressPercent');
pb.subtitle = document.getElementById('progressInlineSubtitle');
pb.stepsEls = container.querySelectorAll('.progress-inline-step');
    
    var titleEl = document.getElementById('progressInlineTitle');
    if (titleEl && titulo) titleEl.textContent = titulo;
    if (pb.subtitle) pb.subtitle.textContent = subtitulo || 'Preparando...';
    
    if (pb.fill) pb.fill.style.width = '0%';
    if (pb.percent) pb.percent.textContent = '0%';
    
    if (pb.stepsEls) {
        for (var i = 0; i < pb.stepsEls.length; i++) {
            pb.stepsEls[i].style.color = '#9ca3af';
        }
    }
};

managerApp._atualizarProgressoInline = function(step, percent) {
    var pb = this._progressoInlineDash;
    if (!pb.container) return;
    
    if (pb.fill) pb.fill.style.width = percent + '%';
    if (pb.percent) pb.percent.textContent = percent + '%';
    
    if (pb.stepsEls && pb.stepsEls.length > 0) {
        // ...
    }
};

managerApp._esconderProgressoInline = function(mensagem, tipo) {
    var pb = this._progressoInlineDash;
    if (!pb.container) return;
    
    if (pb.fill) pb.fill.style.width = '100%';
    if (pb.percent) pb.percent.textContent = '100%';
    if (pb.stepsEls) {
        for (var i = 0; i < pb.stepsEls.length; i++) {
            pb.stepsEls[i].style.color = (tipo === 'error') ? '#ef4444' : '#10b981';
        }
    }
    
    var self = this;
    pb.timeoutHideId = setTimeout(function() {
        if (pb.container) {
            pb.container.style.display = 'none';
        }
        self._progressBarActive = false;
        pb.timeoutHideId = null;
    }, 600);
};

// Aliases para compatibilidade (código legado)
managerApp.showProgressBar = function() { this._mostrarProgressoInline('Carregando Dashboard', 'Preparando...'); };
managerApp.updateProgress = function(step, percent) { this._atualizarProgressoInline(step, percent); };
managerApp.hideProgressBar = function() { this._esconderProgressoInline('Carregado!', 'success'); };

// =============================================
// POPULAR MESES DE REFERÊNCIA
// =============================================
managerApp.popularMesesReferencia = function() {
    var select = document.getElementById('mesReferenciaSelect');
    if (!select) return;
    
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
};

// =============================================
// CARREGAR INICIAL (COM BARRA INLINE PADRONIZADA)
// =============================================
managerApp.carregarInicial = function(mesReferencia) {
    if (this._carregandoInicial) {
        console.log('⚠️ Carregamento inicial já em andamento, ignorando...');
        return;
    }
    
    this._carregandoInicial = true;
    
    if (!mesReferencia) {
        var hoje = new Date();
        mesReferencia = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    }
    
    console.log('🚀 Carregamento INICIAL do dashboard...');
    
    var partesMes = mesReferencia.split('-');
    var mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var mesFormatado = mesesNomes[parseInt(partesMes[1]) - 1] + '/' + partesMes[0];
    
    this._mostrarProgressoInline('Carregando Dashboard', mesFormatado);
    this._atualizarProgressoInline(0, 5, '📡 Conectando...');
    
    var self = this;
    
    API.getDashboardData()
        .then(function(dashboardData) {
            self._atualizarProgressoInline(1, 25, '📊 Buscando dados...');
            
            if (!dashboardData || dashboardData.result !== 'success') {
                throw new Error(dashboardData?.error || 'Erro ao carregar dados do dashboard');
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
                    assistidosAtivos: dashboardData.resumo?.ativos || 0,
                    pcAtivos: dashboardData.resumo?.cuidadoresAtivos || 0,
                    faturamento: faturamentoTotal,
                    custoDireto: custoDiretoTotal,
                    hasErrors: false,
                    assistidos: dashboardData.assistidos || []
                };
                
                self.renderDashboard(self.dashboardCache);
                self.leadsList = dashboardData.leads || [];
                
                self._atualizarProgressoInline(2, 40, '💰 Processando financeiro...');
                
                return self.carregarDadosFinanceirosPorMes(mesReferencia);
            });
        })
        .then(function(financeiroData) {
            self.renderizarDadosFinanceiros(financeiroData, mesReferencia);
            self._atualizarProgressoInline(3, 60, '📈 Calculando métricas...');
            self.carregarGraficosPorMes(mesReferencia);
            return self.carregarMetasPorMes(mesReferencia);
        })
        .then(function() {
            self._atualizarProgressoInline(4, 80, '🔍 Verificando contratos...');
            return self.verificarContratosVencimento();
        })
        .then(function() {
            self._atualizarProgressoInline(5, 95, '🎂 Verificando aniversariantes...');
            self.verificarAniversariantes();
            self._atualizarProgressoInline(6, 100, '✅ Finalizando...');
            
            self._esconderProgressoInline('Dashboard carregado!', 'success');
            self._carregamentoInicialConcluido = true;
            self._carregandoInicial = false;
            console.log('✅ Dashboard carregado para:', mesReferencia);
            console.log('💰 Faturamento Total:', Utils.formatCurrency(self.dashboardCache.faturamento));
            console.log('💰 Custo Direto Total:', Utils.formatCurrency(self.dashboardCache.custoDireto));
        })
        .catch(function(error) {
            console.error('❌ Erro ao carregar dashboard:', error);
            self._esconderProgressoInline('Erro ao carregar', 'error');
            Utils.showToast('Erro ao carregar dados: ' + error.message, 'error');
            self._carregandoInicial = false;
        });
};

// =============================================
// ATUALIZAR POR MÊS (COM BARRA INLINE PADRONIZADA)
// =============================================
managerApp.atualizarPorMes = function(mesReferencia) {
    if (!this._carregamentoInicialConcluido) {
        console.log('⚠️ Carregamento inicial ainda não concluído, ignorando atualização por mês...');
        return;
    }
    
    if (!mesReferencia) return;
    
    console.log('📅 Atualizando dados para o mês:', mesReferencia);
    
    var partesMes = mesReferencia.split('-');
    var mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var mesFormatado = mesesNomes[parseInt(partesMes[1]) - 1] + '/' + partesMes[0];
    
    this._progressBarActive = false;
    this._mostrarProgressoInline('Atualizando Dashboard', mesFormatado);
    this._atualizarProgressoInline(0, 10, '📡 Conectando...');
    
    var self = this;
    
    this.carregarDadosFinanceirosPorMes(mesReferencia)
        .then(function(financeiroData) {
            self._atualizarProgressoInline(1, 40, '📊 Processando financeiro...');
            self.renderizarDadosFinanceiros(financeiroData, mesReferencia);
            self.carregarGraficosPorMes(mesReferencia);
            self._atualizarProgressoInline(2, 70, '📈 Atualizando metas...');
            return self.carregarMetasPorMes(mesReferencia);
        })
        .then(function() {
            self._atualizarProgressoInline(3, 100, '✅ Finalizando...');
            self._esconderProgressoInline('Dashboard atualizado!', 'success');
            console.log('✅ Dados atualizados para o mês:', mesReferencia);
        })
        .catch(function(error) {
            console.error('❌ Erro ao atualizar dados:', error);
            self._esconderProgressoInline('Erro ao atualizar', 'error');
            Utils.showToast('Erro ao atualizar dados: ' + error.message, 'error');
        });
};

// =============================================
// CARREGAR DADOS FINANCEIROS POR MÊS
// =============================================
managerApp.carregarDadosFinanceirosPorMes = function(mesReferencia) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        Promise.all([
            API.listarReceitas(),
            API.listarDespesas()
        ])
        .then(function(results) {
            var receitas = results[0].receitas || [];
            var despesas = results[1].despesas || [];
            
            var totais = UtilsFinance.calcularTotais(receitas, despesas, mesReferencia);
            
            self._receitasCache = receitas;
            self._despesasCache = despesas;
            self._totaisCache = totais;
            
            resolve({
                receitas: receitas,
                despesas: despesas,
                totais: totais,
                mesReferencia: mesReferencia
            });
        })
        .catch(function(error) {
            reject(error);
        });
    });
};

// =============================================
// RENDERIZAR DADOS FINANCEIROS
// =============================================
managerApp.renderizarDadosFinanceiros = function(data, mesReferencia) {
    var totais = data.totais;
    
    this.atualizarCardsResumoMes(
        totais.totalReceitasContratos,
        totais.totalReceitasAvulsas,
        totais.totalDespesasPagas,
        totais.resultadoLiquido
    );
    
    this.atualizarCardLeads();
};

// =============================================
// ATUALIZAR CARDS DE RESUMO DO MÊS
// =============================================
managerApp.atualizarCardsResumoMes = function(totalContratos, totalAvulsas, totalDespesas, resultado) {
    var elContratos = document.getElementById('resumoReceitasContratos');
    var elAvulsas = document.getElementById('resumoReceitasAvulsas');
    var elDespesas = document.getElementById('resumoDespesas');
    var elResultado = document.getElementById('resumoResultadoMes');
    
    if (elContratos) {
        elContratos.textContent = Utils.formatCurrency(totalContratos);
        elContratos.className = 'stat-value positive';
        elContratos.style.fontSize = '16px';
    }
    if (elAvulsas) {
        elAvulsas.textContent = Utils.formatCurrency(totalAvulsas);
        elAvulsas.className = 'stat-value positive';
        elAvulsas.style.fontSize = '16px';
    }
    if (elDespesas) {
        elDespesas.textContent = Utils.formatCurrency(totalDespesas);
        elDespesas.className = 'stat-value negative';
        elDespesas.style.fontSize = '16px';
    }
    if (elResultado) {
        elResultado.textContent = Utils.formatCurrency(resultado);
        elResultado.style.fontSize = '16px';
        Utils.applyColorToValue(elResultado, resultado);
    }
};

// =============================================
// ATUALIZAR CARD LEADS (CENTRALIZADO)
// =============================================
managerApp.atualizarCardLeads = function() {
    var mesReferencia = this.mesReferenciaAtual || this.getMesReferencia();
    var leadsFiltrados = UtilsFinance.filtrarPorMes(this.leadsList, mesReferencia);
    var leadsEl = document.getElementById('dashLeadsCount');
    if (leadsEl) {
        leadsEl.innerHTML = leadsFiltrados.length || '--';
        leadsEl.classList.add('lead');
    }
    console.log('📊 Card LEADS atualizado para o mês:', mesReferencia, 'Total:', leadsFiltrados.length);
};

// =============================================
// FASE 3: LEADS COM ALTA PROBABILIDADE (LEADS QUENTES)
// =============================================
managerApp.renderizarLeadsAltaProbabilidade = function() {
    var container = document.getElementById('dashLeadsAltaProbabilidade');
    if (!container) return;
    
    var countEl = document.getElementById('dashLeadsAltaProbabilidadeCount');
    var count = countEl ? parseInt(countEl.textContent) || 0 : 0;
    
    if (count === 0) {
        container.innerHTML = '';
    } else {
        container.innerHTML = '';
    }
};

// =============================================
// CARREGAR METAS POR MÊS
// =============================================
managerApp.carregarMetasPorMes = function(mesReferencia) {
    var self = this;
    
    console.log('📊 Carregando metas para o mês:', mesReferencia);
    
    return new Promise(function(resolve) {
        API.listarLeads()
            .then(function(leadsData) {
                var leads = leadsData.leads || [];
                console.log('📊 Total de leads carregados da API:', leads.length);
                
                var leadsFiltrados = UtilsFinance.filtrarPorMes(leads, mesReferencia);
                console.log('📊 Leads filtrados para', mesReferencia, ':', leadsFiltrados.length);
                
                self.leadsList = leads;
                
                var totalLeads = leadsFiltrados.length;
                var convertidos = 0;
                
                for (var i = 0; i < leadsFiltrados.length; i++) {
                    if (leadsFiltrados[i].status === '✅ Fechado (Contrato)') {
                        convertidos++;
                    }
                }
                
                var taxaConversao = totalLeads > 0 ? (convertidos / totalLeads * 100) : 0;
                
                console.log('📊 RESULTADO:');
                console.log('  - Total leads no mês:', totalLeads);
                console.log('  - Convertidos no mês:', convertidos);
                console.log('  - Taxa de conversão:', taxaConversao.toFixed(1) + '%');
                
                var faturamento = UtilsFinance.calcularMetaFaturamento(
                    self._receitasCache || [], 
                    mesReferencia
                );
                
                var margem = UtilsFinance.calcularMetaMargem(
                    self._receitasCache || [], 
                    self._despesasCache || [], 
                    mesReferencia
                );
                
                self.atualizarCardsMetasComDados(
                    faturamento,
                    margem,
                    totalLeads,
                    { total: totalLeads, convertidos: convertidos, taxaConversao: taxaConversao },
                    mesReferencia
                );
                
                resolve();
            })
            .catch(function(error) {
                console.error('❌ Erro ao carregar metas:', error);
                resolve();
            });
    });
};

// =============================================
// ATUALIZAR CARDS DE METAS COM DADOS
// =============================================
managerApp.atualizarCardsMetasComDados = function(faturamento, margem, totalLeads, conversao, mesReferencia) {
    var metaFaturamento = this.metas.faturamento || 50000;
    var metaMargem = this.metas.margem || 25;
    var metaLeads = this.metas.leads || 30;
    var metaConversao = this.metas.conversao || 5;
    
    console.log('📊 ATUALIZANDO CARDS COM METAS:', {
        metaFaturamento: metaFaturamento,
        metaMargem: metaMargem,
        metaLeads: metaLeads,
        metaConversao: metaConversao,
        totalLeads: totalLeads,
        convertidos: conversao.convertidos,
        mesReferencia: mesReferencia
    });
    
    // 1. META DE FATURAMENTO
    var percFaturamento = metaFaturamento > 0 ? (faturamento / metaFaturamento * 100) : 0;
    if (percFaturamento > 100) percFaturamento = 100;
    
    var elFaturamentoValor = document.getElementById('metaFaturamentoValor');
    var elFaturamentoProgress = document.getElementById('metaFaturamentoProgress');
    var elFaturamentoStatus = document.getElementById('metaFaturamentoStatus');
    
    if (elFaturamentoValor) elFaturamentoValor.innerHTML = Utils.formatCurrency(metaFaturamento);
    if (elFaturamentoProgress) elFaturamentoProgress.style.width = percFaturamento + '%';
    if (elFaturamentoStatus) {
        elFaturamentoStatus.innerHTML = 'Realizado: ' + Utils.formatCurrency(faturamento) + ' (' + percFaturamento.toFixed(0) + '% da meta)';
        elFaturamentoStatus.className = percFaturamento >= 100 ? 'meta-achieved positive' : (percFaturamento >= 70 ? 'meta-achieved warning' : 'meta-achieved danger');
    }
    
    // 2. META DE MARGEM
    var percMargem = metaMargem > 0 ? (margem / metaMargem * 100) : 0;
    if (percMargem > 100) percMargem = 100;
    
    var elMargemValor = document.getElementById('metaMargemValor');
    var elMargemProgress = document.getElementById('metaMargemProgress');
    var elMargemStatus = document.getElementById('metaMargemStatus');
    
    if (elMargemValor) elMargemValor.innerHTML = metaMargem + '%';
    if (elMargemProgress) elMargemProgress.style.width = percMargem + '%';
    if (elMargemStatus) {
        elMargemStatus.innerHTML = 'Realizado: ' + margem.toFixed(1) + '% (' + percMargem.toFixed(0) + '% da meta)';
        elMargemStatus.className = margem >= metaMargem ? 'meta-achieved positive' : (margem >= metaMargem * 0.7 ? 'meta-achieved warning' : 'meta-achieved danger');
    }
    
    // 3. META DE LEADS
    var percLeads = metaLeads > 0 ? (totalLeads / metaLeads * 100) : 0;
    if (percLeads > 100) percLeads = 100;
    
    var elLeadsValor = document.getElementById('metaLeadsValor');
    var elLeadsProgress = document.getElementById('metaLeadsProgress');
    var elLeadsStatus = document.getElementById('metaLeadsStatus');
    
    if (elLeadsValor) elLeadsValor.innerHTML = metaLeads;
    if (elLeadsProgress) elLeadsProgress.style.width = percLeads + '%';
    if (elLeadsStatus) {
        elLeadsStatus.innerHTML = 'Realizado: ' + totalLeads + ' (' + percLeads.toFixed(0) + '% da meta)';
        elLeadsStatus.className = totalLeads >= metaLeads ? 'meta-achieved positive' : (totalLeads >= metaLeads * 0.7 ? 'meta-achieved warning' : 'meta-achieved danger');
    }
    
    // 4. META DE CONVERSÃO
    var percConversao = metaConversao > 0 ? (conversao.taxaConversao / metaConversao * 100) : 0;
    if (percConversao > 100) percConversao = 100;
    
    var elConversaoValor = document.getElementById('metaConversaoValor');
    var elConversaoProgress = document.getElementById('metaConversaoProgress');
    var elConversaoStatus = document.getElementById('metaConversaoStatus');
    
    if (elConversaoValor) elConversaoValor.innerHTML = metaConversao + '%';
    if (elConversaoProgress) elConversaoProgress.style.width = percConversao + '%';
    if (elConversaoStatus) {
        elConversaoStatus.innerHTML = totalLeads + ' leads, ' + 
            conversao.convertidos + ' conversões (' + conversao.taxaConversao.toFixed(1) + '%) - ' +
            percConversao.toFixed(0) + '%';
        elConversaoStatus.className = conversao.taxaConversao >= metaConversao ? 'meta-achieved positive' : (conversao.taxaConversao >= metaConversao * 0.7 ? 'meta-achieved warning' : 'meta-achieved danger');
    }
    
    console.log('✅ Cards de metas atualizados com sucesso!');
};

// =============================================
// RENDERIZAR DASHBOARD (CARDS DA 1ª LINHA)
// =============================================
managerApp.renderDashboard = function(data) {
    document.getElementById('dashAssistidosAtivos').innerHTML = data.assistidosAtivos || '--';
    document.getElementById('dashPersonalAtivos').innerHTML = data.pcAtivos || '--';
    
    var faturamentoEl = document.getElementById('dashFaturamentoEstimado');
    faturamentoEl.innerHTML = Utils.formatCurrency(data.faturamento || 0);
    faturamentoEl.classList.add('positive');
    
    var custoDiretoEl = document.getElementById('dashCustoDireto');
    custoDiretoEl.innerHTML = Utils.formatCurrency(data.custoDireto || 0);
    custoDiretoEl.classList.add('negative');
    
    var resultadoBruto = (data.faturamento || 0) - (data.custoDireto || 0);
    var resultadoBrutoEl = document.getElementById('dashResultadoBruto');
    resultadoBrutoEl.innerHTML = Utils.formatCurrency(resultadoBruto);
    Utils.applyColorToValue(resultadoBrutoEl, resultadoBruto);
    
    this.atualizarCardLeads();
    this.renderizarLeadsAltaProbabilidade();
    
    var leadsQuentesCount = document.getElementById('dashLeadsAltaProbabilidadeCount');
    if (leadsQuentesCount) {
        var mesReferencia = this.mesReferenciaAtual || this.getMesReferencia();
        var leadsFiltrados = UtilsFinance.filtrarPorMes(this.leadsList, mesReferencia);
        var count = 0;
        var hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        for (var i = 0; i < leadsFiltrados.length; i++) {
            var status = leadsFiltrados[i].status || '';
            if (status === '🔄 Em Negociação' || status === '📄 Proposta Enviada') {
                var dataRef = leadsFiltrados[i].dataProximaAcao || leadsFiltrados[i].dataCadastro || leadsFiltrados[i].timestamp;
                if (dataRef) {
                    var dataLead = new Date(dataRef);
                    if (!isNaN(dataLead.getTime())) {
                        dataLead.setHours(0, 0, 0, 0);
                        var diffDias = Math.floor((hoje - dataLead) / (1000 * 60 * 60 * 24));
                        if (diffDias <= 7) count++;
                    }
                }
            }
        }
        leadsQuentesCount.textContent = count;
    }
    
    document.getElementById('retryBanner').style.display = data.hasErrors ? 'flex' : 'none';
};

// =============================================
// ATUALIZAR GRÁFICO RECEITAS x DESPESAS
// =============================================
managerApp.atualizarGraficoEvolucaoPorMes = function(mesReferencia) {
    var ctx = document.getElementById('chartEvolucao');
    if (!ctx) return;
    
    console.log('📊 Atualizando gráfico de evolução para o mês:', mesReferencia);
    
    var self = this;
    var hoje = new Date();
    var meses = [];
    var receitasData = [];
    var despesasData = [];
    
    var parts = mesReferencia.split('-');
    var anoRef = parseInt(parts[0]);
    var mesRef = parseInt(parts[1]);
    
    for (var i = 11; i >= 0; i--) {
        var mes = mesRef - i;
        var ano = anoRef;
        if (mes <= 0) {
            mes += 12;
            ano--;
        }
        var mesStr = String(mes).padStart(2, '0');
        meses.push(ano + '-' + mesStr);
        receitasData.push(0);
        despesasData.push(0);
    }
    
    Promise.all([
        API.listarReceitas(),
        API.listarDespesas()
    ]).then(function(results) {
        var todasReceitas = results[0].receitas || [];
        var todasDespesas = results[1].despesas || [];
        
        for (var i = 0; i < todasReceitas.length; i++) {
            var r = todasReceitas[i];
            if (r.data && r.status === 'Recebido') {
                var dataStr = r.data;
                if (dataStr.includes('T')) {
                    dataStr = dataStr.split('T')[0];
                }
                var dataParts = dataStr.split('-');
                if (dataParts.length === 3) {
                    var periodo = dataParts[0] + '-' + dataParts[1];
                    var index = meses.indexOf(periodo);
                    if (index !== -1) {
                        receitasData[index] += parseFloat(r.valor) || 0;
                    }
                }
            }
        }
        
        for (var i = 0; i < todasDespesas.length; i++) {
            var d = todasDespesas[i];
            if (d.data && d.status === 'Pago') {
                var dataStr = d.data;
                if (dataStr.includes('T')) {
                    dataStr = dataStr.split('T')[0];
                }
                var dataParts = dataStr.split('-');
                if (dataParts.length === 3) {
                    var periodo = dataParts[0] + '-' + dataParts[1];
                    var index = meses.indexOf(periodo);
                    if (index !== -1) {
                        despesasData[index] += parseFloat(d.valor) || 0;
                    }
                }
            }
        }
        
        var mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        var labels = [];
        for (var i = 0; i < meses.length; i++) {
            var partsLabel = meses[i].split('-');
            var mesNum = parseInt(partsLabel[1]);
            labels.push(mesesNomes[mesNum - 1] + '/' + partsLabel[0]);
        }
        
        if (self.chartEvolucao) {
            self.chartEvolucao.destroy();
            self.chartEvolucao = null;
        }
        
        try {
            self.chartEvolucao = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Receitas Totais',
                            data: receitasData,
                            borderColor: '#0d9488',
                            backgroundColor: 'rgba(13, 148, 136, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: function(context) {
                                var index = context.dataIndex;
                                var periodo = meses[index];
                                return periodo === mesReferencia ? 8 : 4;
                            },
                            pointBackgroundColor: function(context) {
                                var index = context.dataIndex;
                                var periodo = meses[index];
                                return periodo === mesReferencia ? '#0d9488' : '#0d9488';
                            },
                            pointBorderWidth: function(context) {
                                var index = context.dataIndex;
                                var periodo = meses[index];
                                return periodo === mesReferencia ? 4 : 2;
                            }
                        },
                        {
                            label: 'Despesas Totais',
                            data: despesasData,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: function(context) {
                                var index = context.dataIndex;
                                var periodo = meses[index];
                                return periodo === mesReferencia ? 8 : 4;
                            },
                            pointBackgroundColor: function(context) {
                                var index = context.dataIndex;
                                var periodo = meses[index];
                                return periodo === mesReferencia ? '#ef4444' : '#ef4444';
                            },
                            pointBorderWidth: function(context) {
                                var index = context.dataIndex;
                                var periodo = meses[index];
                                return periodo === mesReferencia ? 4 : 2;
                            }
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
                                    return context.dataset.label + ': ' + Utils.formatCurrency(context.raw);
                                }
                            }
                        },
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return Utils.formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });
            
            self._ultimoMesGrafico = mesReferencia;
            console.log('✅ Gráfico de evolução recriado para o mês:', mesReferencia);
            
        } catch (error) {
            console.error('❌ Erro ao criar gráfico de evolução:', error);
        }
    }).catch(function(error) {
        console.error('❌ Erro ao buscar dados para o gráfico:', error);
    });
};

// =============================================
// VERIFICAR CONTRATOS
// =============================================
managerApp.verificarContratosVencimento = function() {
    var self = this;
    var diasAlerta = this.metas.diasAlerta || 15;
    console.log('🔍 Verificando contratos com prazo de ' + diasAlerta + ' dias...');
    
    return new Promise(function(resolve, reject) {
        API.getAssistidosComStatus()
            .then(function(assistidosData) {
                if (assistidosData.result !== 'success' || !assistidosData.assistidos) {
                    throw new Error('Não foi possível obter lista de assistidos');
                }
                
                var assistidosMap = {};
                assistidosData.assistidos.forEach(function(a) {
                    if (a.tipoContrato === "MENSAL" && a.status === "Ativo") {
                        assistidosMap[a.nome] = a;
                    }
                });
                
                var assistidosAtivos = Object.values(assistidosMap);
                console.log('📋 Assistidos ativos (MENSAL):', assistidosAtivos.length);
                
                if (assistidosAtivos.length === 0) {
                    self.alertasContratos = [];
                    self.renderizarAlertasContratos();
                    resolve([]);
                    return;
                }
                
                var alertas = [];
                var hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                var promises = [];
                
                for (var i = 0; i < assistidosAtivos.length; i++) {
                    var assistido = assistidosAtivos[i];
                    var promise = API.getDadosAssistido(assistido.nome)
                        .then(function(detalhes) {
                            if (detalhes.result === 'success' && detalhes.vctoContrato) {
                                var dataVctoStr = detalhes.vctoContrato;
                                var dataVcto = null;
                                
                                if (dataVctoStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    var parts = dataVctoStr.split('-');
                                    dataVcto = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                } else if (dataVctoStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                                    var parts = dataVctoStr.split('/');
                                    dataVcto = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                }
                                
                                if (dataVcto && !isNaN(dataVcto.getTime())) {
                                    dataVcto.setHours(0, 0, 0, 0);
                                    var diffTime = dataVcto - hoje;
                                    var diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    if (diffDias <= diasAlerta && diffDias > -7) {
                                        var tipo = diffDias <= 0 ? 'critico' : (diffDias <= 7 ? 'critico' : 'atencao');
                                        var mensagem = diffDias < 0 ? 'VENCEU há ' + Math.abs(diffDias) + ' dias' : 
                                                      (diffDias === 0 ? 'VENCE HOJE!' : 'Vence em ' + diffDias + ' dias');
                                        
                                        var dadosFamiliar = Utils.extrairDadosFamiliar(detalhes.responsaveis || '');
                                        
                                        var jaExiste = alertas.some(function(a) { 
                                            return a.nome === (detalhes.assistido || assistido.nome); 
                                        });
                                        
                                        if (!jaExiste) {
                                            alertas.push({
                                                nome: detalhes.assistido || assistido.nome,
                                                dataVencimento: Utils.formatDate(dataVctoStr),
                                                diasRestantes: diffDias,
                                                tipo: tipo,
                                                mensagem: mensagem,
                                                telefoneFamiliar: dadosFamiliar.telefone || '',
                                                nomeFamiliar: dadosFamiliar.nome || 'Familiar'
                                            });
                                            console.log('⚠️ Alerta para:', assistido.nome, 'Dias:', diffDias);
                                        }
                                    }
                                }
                            }
                        })
                        .catch(function(error) {
                            console.warn('Erro ao verificar contrato de assistido:', error);
                        });
                    promises.push(promise);
                }
                
                Promise.all(promises).then(function() {
                    alertas.sort(function(a, b) {
                        if (a.tipo === 'critico' && b.tipo !== 'critico') return -1;
                        if (a.tipo !== 'critico' && b.tipo === 'critico') return 1;
                        return a.diasRestantes - b.diasRestantes;
                    });
                    
                    self.alertasContratos = alertas;
                    console.log('🔍 Encontrados ' + alertas.length + ' contratos com vencimento próximo');
                    self.renderizarAlertasContratos();
                    resolve(alertas);
                });
            })
            .catch(function(error) {
                console.error('Erro ao verificar contratos:', error);
                reject(error);
            });
    });
};

// =============================================
// RENDERIZAR ALERTAS DE CONTRATOS
// =============================================
managerApp.renderizarAlertasContratos = function() {
    var container = document.getElementById('contratosAlertasContainer');
    var headerRow = document.getElementById('dashboardHeaderRow');
    var mesCard = document.getElementById('mesReferenciaCard');
    
    if (!container || !headerRow || !mesCard) return;
    
    var alertas = this.alertasContratos;
    
    if (!alertas || alertas.length === 0) { 
        container.innerHTML = '';
        container.style.display = 'none';
        headerRow.style.gridTemplateColumns = '1fr';
        mesCard.style.display = 'block';
        mesCard.style.width = '100%';
        return; 
    }
    
    var temCritico = alertas.some(function(a) { return a.tipo === 'critico'; });
    var alertaClass = temCritico ? 'contratos-alerta-banner critico' : 'contratos-alerta-banner';
    var icon = temCritico ? '🔴' : '🟡';
    var titulo = temCritico ? 'Contratos com vencimento crítico!' : 'Contratos próximos do vencimento';
    
    var html = '<div class="' + alertaClass + '" onclick="managerApp.mostrarPopupAlertasContratos(managerApp.alertasContratos)" style="margin-bottom: 0; cursor: pointer; height: 100%;">' +
        '<div class="contratos-alerta-header">' +
        '<div class="contratos-alerta-title"><span class="icon">' + icon + '</span><span>' + titulo + '</span><span class="contratos-alerta-count">' + alertas.length + '</span></div>' +
        '<div class="contratos-alerta-toggle">🔍 Clique para detalhar</div>' +
        '</div></div>';
    
    container.innerHTML = html;
    container.style.display = 'block';
    headerRow.style.gridTemplateColumns = '1fr 1fr';
    mesCard.style.display = 'block';
    mesCard.style.width = '100%';
};

// =============================================
// MOSTRAR POPUP DE ALERTAS DE CONTRATOS
// =============================================
managerApp.mostrarPopupAlertasContratos = function(alertas) {
    if (!alertas || alertas.length === 0) {
        Utils.showToast('✅ Nenhum contrato em alerta', 'success');
        return;
    }
    
    var modal = document.getElementById('modalAlertasContratos');
    var conteudo = document.getElementById('conteudoAlertasContratos');
    var titulo = document.getElementById('modalAlertasTitulo');
    var header = document.getElementById('modalAlertasHeader');
    
    var temCritico = alertas.some(function(a) { return a.tipo === 'critico'; });
    
    if (temCritico) {
        header.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
        titulo.innerHTML = '🚨 ' + alertas.length + ' Contratos em Situação Crítica!';
    } else {
        header.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        titulo.innerHTML = '⚠️ ' + alertas.length + ' Contratos Próximos do Vencimento';
    }
    
    var html = '';
    for (var i = 0; i < alertas.length; i++) {
        var a = alertas[i];
        var isCritico = a.tipo === 'critico';
        var badge = isCritico ? 'badge-danger' : 'badge-warning';
        var mensagem = a.mensagem || (a.diasRestantes <= 0 ? 'VENCIDO!' : 'Vence em ' + a.diasRestantes + ' dias');
        
        html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--gray-100);">';
        html += '  <div style="flex: 1;">';
        html += '    <div style="font-weight: 600; font-size: 14px;">' + a.nome + '</div>';
        html += '    <div style="font-size: 12px; color: var(--gray-500);">';
        html += '      📅 Vencimento: ' + (a.dataVencimento || 'Não informado');
        html += '      ' + (a.telefoneFamiliar ? ' | 📱 ' + a.telefoneFamiliar : '');
        html += '    </div>';
        html += '    <div style="font-size: 12px; color: ' + (isCritico ? '#dc2626' : '#f59e0b') + '; font-weight: 600;">';
        html += '      ⏰ ' + mensagem;
        html += '    </div>';
        html += '  </div>';
        html += '  <div style="display: flex; gap: 8px; align-items: center;">';
        html += '    <span class="badge ' + badge + '">' + (isCritico ? '🔴 CRÍTICO' : '🟡 ATENÇÃO') + '</span>';
        html += '    <button class="btn btn-sm btn-primary" onclick="managerApp.irParaAssistido(\'' + a.nome.replace(/'/g, "\\'") + '\')">📋</button>';
        html += '  </div>';
        html += '</div>';
    }
    
    conteudo.innerHTML = html;
    modal.style.display = 'flex';
};

// =============================================
// VERIFICAR ANIVERSARIANTES
// =============================================
managerApp.verificarAniversariantes = function() {
    console.log('🎂 Verificando aniversariantes...');
    var self = this;
    var hoje = new Date();
    var diaHoje = hoje.getDate();
    var mesHoje = hoje.getMonth() + 1;
    var aniversariantes = [];
    var promises = [];
    
    function extrairData(valor) {
        if (!valor) return null;
        if (typeof valor === 'string') {
            var dataStr = valor.trim();
            var matchYYYYMMDD = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (matchYYYYMMDD) {
                return new Date(parseInt(matchYYYYMMDD[1]), parseInt(matchYYYYMMDD[2]) - 1, parseInt(matchYYYYMMDD[3]));
            }
            var matchDDMMYYYY = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (matchDDMMYYYY) {
                return new Date(parseInt(matchDDMMYYYY[3]), parseInt(matchDDMMYYYY[2]) - 1, parseInt(matchDDMMYYYY[1]));
            }
            var data = new Date(dataStr);
            if (!isNaN(data.getTime())) return data;
        }
        if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
        return null;
    }
    
    API.getAssistidosCompleto()
        .then(function(data) {
            if (data.result === 'success') {
                var assistidos = data.assistidos || [];
                console.log('📋 Total de assistidos:', assistidos.length);
                
                if (assistidos.length === 0) {
                    console.log('🎂 Nenhum assistido cadastrado');
                    return;
                }
                
                for (var i = 0; i < assistidos.length; i++) {
                    var a = assistidos[i];
                    var nomeAssistido = a.nome || a.assistido || '';
                    
                    if (!nomeAssistido) continue;
                    
                    var promise = API.getDadosAssistido(nomeAssistido)
                        .then(function(detalhes) {
                            if (detalhes.result === 'success') {
                                var dataNasc = detalhes.dataNasc || '';
                                var responsaveis = detalhes.responsaveis || '';
                                var nome = detalhes.nome || detalhes.assistido || nomeAssistido;
                                var sexoAssistido = detalhes.sexo || '';
                                
                                var data = extrairData(dataNasc);
                                if (data && data.getDate() === diaHoje && (data.getMonth() + 1) === mesHoje) {
                                    var dadosFamiliar = Utils.extrairDadosFamiliar(responsaveis);
                                    aniversariantes.push({
                                        nome: nome,
                                        idade: Utils.calcularIdade(dataNasc) || '?',
                                        tipo: 'assistido',
                                        telefone: dadosFamiliar.telefone || '',
                                        nomeFamiliar: dadosFamiliar.nome || 'Familiar',
                                        sexoAssistido: sexoAssistido
                                    });
                                    console.log('✅ Aniversariante assistido encontrado:', nome);
                                }
                                
                                var dadosFamiliar = Utils.extrairDadosFamiliar(responsaveis);
                                if (dadosFamiliar.dataNasc) {
                                    var dataFam = extrairData(dadosFamiliar.dataNasc);
                                    if (dataFam && dataFam.getDate() === diaHoje && (dataFam.getMonth() + 1) === mesHoje) {
                                        aniversariantes.push({
                                            nome: dadosFamiliar.nome || 'Familiar',
                                            idade: Utils.calcularIdade(dadosFamiliar.dataNasc) || '?',
                                            tipo: 'familiar',
                                            telefone: dadosFamiliar.telefone || '',
                                            nomeAssistido: nome,
                                            responsaveis: responsaveis,
                                            sexoAssistido: sexoAssistido
                                        });
                                        console.log('✅ Aniversariante familiar encontrado:', dadosFamiliar.nome);
                                    }
                                }
                            }
                        })
                        .catch(function(error) {
                            console.warn('⚠️ Erro ao buscar dados de:', nomeAssistido);
                        });
                    promises.push(promise);
                }
                
                Promise.all(promises).then(function() {
                    console.log('🎂 Encontrados ' + aniversariantes.length + ' aniversariantes hoje');
                    if (aniversariantes.length > 0) {
                        setTimeout(function() {
                            if (typeof self.mostrarPopupAniversariantes === 'function') {
                                self.mostrarPopupAniversariantes(aniversariantes);
                            } else {
                                console.warn('⚠️ Função mostrarPopupAniversariantes não definida');
                            }
                        }, 200);
                    }
                });
            }
        })
        .catch(function(error) {
            console.error('❌ Erro ao buscar assistidos:', error);
        });
};

// =============================================
// FUNÇÕES LEGADAS (MANTIDAS PARA COMPATIBILIDADE)
// =============================================
managerApp.carregarDashboardComProgresso = function() {
    console.warn('⚠️ carregarDashboardComProgresso está deprecated. Use carregarInicial()');
    var hoje = new Date();
    var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    this.carregarInicial(mesAtual);
};

managerApp.atualizarCardsMetas = function() {
    console.warn('⚠️ atualizarCardsMetas está deprecated. Use carregarMetasPorMes()');
    var hoje = new Date();
    var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    this.carregarMetasPorMes(mesAtual);
};

managerApp.carregarResumoFinanceiro = function() {
    console.warn('⚠️ carregarResumoFinanceiro está deprecated. Use carregarDadosFinanceirosPorMes()');
    var hoje = new Date();
    var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    this.carregarDadosFinanceirosPorMes(mesAtual)
        .then(function(data) {
            managerApp.renderizarDadosFinanceiros(data, mesAtual);
        });
};

managerApp.carregarDadosDashboard = function() {
    console.warn('⚠️ carregarDadosDashboard está deprecated. Use carregarInicial()');
    var hoje = new Date();
    var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    this.carregarInicial(mesAtual);
};

managerApp.iniciarCarregamentoPorMes = function(mesReferencia) {
    console.warn('⚠️ iniciarCarregamentoPorMes está deprecated. Use carregarInicial() ou atualizarPorMes()');
    if (!this._carregamentoInicialConcluido) {
        this.carregarInicial(mesReferencia);
    } else {
        this.atualizarPorMes(mesReferencia);
    }
};
