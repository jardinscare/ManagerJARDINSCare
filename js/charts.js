// =============================================
// CHARTS - managerJARDINSCare
// Configuração e gerenciamento de gráficos
// Versão 2.0 - Com suporte a Mês de Referência
// =============================================

// =============================================
// CARREGAR GRÁFICOS DO DASHBOARD
// =============================================
managerApp.carregarGraficos = function() {
    console.warn('⚠️ carregarGraficos() está deprecated. Use carregarGraficosPorMes()');
    var hoje = new Date();
    var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    this.carregarGraficosPorMes(mesAtual);
};

// =============================================
// CARREGAR GRÁFICOS POR MÊS
// =============================================
managerApp.carregarGraficosPorMes = function(mesReferencia) {
    if (!mesReferencia) {
        var hoje = new Date();
        mesReferencia = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    }
    
    console.log('📊 Carregando gráficos para o mês:', mesReferencia);
    
    if (this._ultimoMesGrafico === mesReferencia && this.chartPizza) {
        console.log('🔄 Gráfico já está no mês:', mesReferencia, 'atualizando apenas dados');
        this._atualizarGraficoTopDespesas(null, mesReferencia);
        return;
    }
    
    var self = this;
    
    Promise.all([
        API.listarReceitas(),
        API.listarDespesas()
    ]).then(function(results) {
        var receitas = results[0].receitas || [];
        var despesas = results[1].despesas || [];
        
        var despesasFiltradas = UtilsFinance.filtrarPorMes(despesas, mesReferencia);
        
        self._atualizarGraficoTopDespesas(despesasFiltradas, mesReferencia);
        self.atualizarGraficoEvolucaoPorMes(mesReferencia);
        self.atualizarGraficoMargemPorMes(mesReferencia);
        self.atualizarGraficoEvolucaoFaturamento(mesReferencia);
        
        console.log('✅ Gráficos atualizados para o mês:', mesReferencia);
    }).catch(function(error) {
        console.error('❌ Erro ao carregar gráficos por mês:', error);
    });
};

// =============================================
// CARREGAR TOP CATEGORIAS (PIZZA)
// =============================================
managerApp.carregarTopCategorias = function() {
    var self = this;
    var hoje = new Date();
    var mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    
    API.listarDespesas()
        .then(function(data) {
            if (data.despesas) {
                var despesas = data.despesas;
                var despesasFiltradas = UtilsFinance.filtrarPorMes(despesas, mesAtual);
                var categorias = UtilsFinance.agruparDespesasPorCategoria(despesasFiltradas, 5);
                
                if (categorias.length === 0 || (categorias.length === 1 && categorias[0].categoria === 'Sem dados no mês')) {
                    categorias = [{ categoria: 'Sem dados no mês', valor: 1 }];
                }
                self.atualizarGraficoPizza(categorias);
            }
        })
        .catch(function(error) {
            console.error('Erro ao carregar categorias:', error);
        });
};

// =============================================
// ATUALIZAR GRÁFICO DE PIZZA (CATEGORIAS)
// =============================================
managerApp.atualizarGraficoPizza = function(categorias) {
    var ctx = document.getElementById('chartPizzaCategorias');
    if (!ctx) return;
    
    var ctx2d = ctx.getContext('2d');
    if (this.chartPizza) {
        this.chartPizza.destroy();
        this.chartPizza = null;
    }
    
    var labels = [];
    var valores = [];
    var cores = ['#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
    
    for (var i = 0; i < categorias.length; i++) {
        labels.push(categorias[i].categoria);
        valores.push(categorias[i].valor);
    }
    
    if (labels.length === 1 && labels[0] === 'Sem dados no mês') {
        cores = ['#d1d5db'];
    }
    
    try {
        this.chartPizza = new Chart(ctx2d, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: valores,
                    backgroundColor: cores.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var label = context.label || '';
                                var value = context.raw;
                                var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                                var percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                if (label === 'Sem dados no mês') {
                                    return 'Nenhuma despesa paga no período';
                                }
                                return label + ': ' + Utils.formatCurrency(value) + ' (' + percent + '%)';
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { 
                            font: { size: 11 },
                            padding: 12
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao criar gráfico de pizza:', error);
    }
};

// =============================================
// ATUALIZAR DADOS DO GRÁFICO DE PIZZA (SEM RECRIAR)
// =============================================
managerApp._atualizarDadosGraficoPizza = function(categorias) {
    var ctx = document.getElementById('chartPizzaCategorias');
    if (!ctx) return;
    
    if (!this.chartPizza) {
        this.atualizarGraficoPizza(categorias);
        return;
    }
    
    var labels = [];
    var valores = [];
    var cores = ['#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
    
    for (var i = 0; i < categorias.length; i++) {
        labels.push(categorias[i].categoria);
        valores.push(categorias[i].valor);
    }
    
    if (labels.length === 1 && labels[0] === 'Sem dados no mês') {
        cores = ['#d1d5db'];
    }
    
    this.chartPizza.data.labels = labels;
    this.chartPizza.data.datasets[0].data = valores;
    this.chartPizza.data.datasets[0].backgroundColor = cores.slice(0, labels.length);
    this.chartPizza.update();
    
    console.log('✅ Gráfico de pizza atualizado com', labels.length, 'categorias');
};

// =============================================
// ATUALIZAR GRÁFICO TOP DESPESAS (VERSÃO ESTABILIZADA)
// =============================================
managerApp._atualizarGraficoTopDespesas = function(despesasFiltradas, mesReferencia) {
    if (this._atualizandoGrafico) {
        console.log('🔄 Gráfico já está sendo atualizado, resetando flag e continuando...');
        this._atualizandoGrafico = false;
    }
    
    this._atualizandoGrafico = true;
    
    try {
        if (!despesasFiltradas) {
            console.log('🔄 Buscando despesas da API para o gráfico...');
            var self = this;
            API.listarDespesas()
                .then(function(data) {
                    var despesas = data.despesas || [];
                    var filtradas = UtilsFinance.filtrarPorMes(despesas, mesReferencia);
                    self._processarGraficoTopDespesas(filtradas, mesReferencia);
                })
                .catch(function(error) {
                    console.error('❌ Erro ao buscar despesas para o gráfico:', error);
                    self._mostrarGraficoSemDados();
                    self._atualizandoGrafico = false;
                });
            return;
        }
        
        this._processarGraficoTopDespesas(despesasFiltradas, mesReferencia);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar gráfico de top despesas:', error);
        this._mostrarGraficoSemDados();
        this._atualizandoGrafico = false;
    }
};

// =============================================
// PROCESSAR GRÁFICO TOP DESPESAS (CORRIGIDO)
// =============================================
managerApp._processarGraficoTopDespesas = function(despesasFiltradas, mesReferencia) {
    var self = this;
    
    // 🔥 CORREÇÃO: Verificar se a página de dashboard está ativa
    var dashboardPage = document.getElementById('page-dashboard');
    if (!dashboardPage || !dashboardPage.classList.contains('active')) {
        console.log('📊 Dashboard não está visível, ignorando atualização do gráfico');
        this._atualizandoGrafico = false;
        return;
    }
    
    var despesasPagas = despesasFiltradas.filter(function(d) {
        return d.status === 'Pago';
    });
    
    console.log('📊 Despesas filtradas (total):', despesasFiltradas.length);
    console.log('📊 Despesas PAGAS:', despesasPagas.length);
    
    if (despesasPagas.length === 0) {
        console.log('📊 Nenhuma despesa PAGA no mês, exibindo fallback');
        this._mostrarGraficoSemDados();
        this._atualizandoGrafico = false;
        return;
    }
    
    var categorias = UtilsFinance.agruparDespesasPorCategoria(despesasPagas, 5);
    
    if (!categorias || categorias.length === 0 || (categorias.length === 1 && categorias[0].categoria === 'Sem dados no mês')) {
        console.log('📊 Nenhuma categoria encontrada, exibindo fallback');
        this._mostrarGraficoSemDados();
        this._atualizandoGrafico = false;
        return;
    }
    
    console.log('📊 Categorias encontradas:', categorias.length);
    console.log('📊 Categorias:', JSON.stringify(categorias));
    
    if (this.chartPizza) {
        var currentLabels = this.chartPizza.data.labels || [];
        var newLabels = categorias.map(function(item) { return item.categoria; });
        
        if (JSON.stringify(currentLabels) !== JSON.stringify(newLabels)) {
            console.log('🔄 Labels mudaram, recriando gráfico');
            this._recriarGraficoPizza(categorias, mesReferencia);
        } else {
            this._atualizarDadosGraficoPizza(categorias);
        }
    } else {
        this._recriarGraficoPizza(categorias, mesReferencia);
    }
    
    this._ultimoMesGrafico = mesReferencia;
    this._atualizandoGrafico = false;
};

// =============================================
// RECRIAR GRÁFICO DE PIZZA (CORRIGIDO - SEM LOOP)
// =============================================
managerApp._recriarGraficoPizza = function(categorias, mesReferencia) {
    var ctx = document.getElementById('chartPizzaCategorias');
    if (!ctx) {
        console.warn('⚠️ Canvas chartPizzaCategorias não encontrado');
        this._atualizandoGrafico = false;
        return;
    }
    
    // 🔥 CORREÇÃO: Verificar se a página de dashboard está ativa
    var dashboardPage = document.getElementById('page-dashboard');
    if (!dashboardPage || !dashboardPage.classList.contains('active')) {
        console.log('📊 Dashboard não está visível, ignorando renderização do gráfico');
        this._atualizandoGrafico = false;
        return;
    }
    
    // 🔥 CORREÇÃO: Verificar se o canvas está visível - APENAS UMA VEZ, SEM LOOP
    var rect = ctx.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        console.warn('⚠️ Canvas não está visível, ignorando renderização');
        this._atualizandoGrafico = false;
        return;
    }
    
    var ctx2d = ctx.getContext('2d');
    if (!ctx2d) {
        console.error('❌ Não foi possível obter o contexto 2D do canvas');
        this._atualizandoGrafico = false;
        return;
    }
    
    if (this.chartPizza) {
        try {
            this.chartPizza.destroy();
        } catch (e) {
            console.warn('⚠️ Erro ao destruir gráfico existente:', e.message);
        }
        this.chartPizza = null;
    }
    
    var labels = categorias.map(function(item) { return item.categoria; });
    var valores = categorias.map(function(item) { return item.valor; });
    var cores = ['#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
    
    if (categorias.length === 1 && categorias[0].categoria === 'Sem dados no mês') {
        cores = ['#d1d5db'];
    }
    
    try {
        this.chartPizza = new Chart(ctx2d, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: valores,
                    backgroundColor: cores.slice(0, labels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var label = context.label || '';
                                var value = context.raw;
                                var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                                var percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                if (label === 'Sem dados no mês') {
                                    return 'Nenhuma despesa paga no período';
                                }
                                return label + ': ' + Utils.formatCurrency(value) + ' (' + percent + '%)';
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { 
                            font: { size: 10 },
                            padding: 12
                        }
                    }
                }
            }
        });
        
        this._ultimoMesGrafico = mesReferencia;
        console.log('✅ Gráfico de pizza criado para o mês:', mesReferencia);
        
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de top despesas:', error);
        this._mostrarGraficoSemDados();
    }
    
    this._atualizandoGrafico = false;
};

// =============================================
// MOSTRAR GRÁFICO SEM DADOS (FALLBACK - CORRIGIDO)
// =============================================
managerApp._mostrarGraficoSemDados = function() {
    var ctx = document.getElementById('chartPizzaCategorias');
    if (!ctx) {
        this._atualizandoGrafico = false;
        return;
    }
    
    // 🔥 CORREÇÃO: Verificar se a página de dashboard está ativa
    var dashboardPage = document.getElementById('page-dashboard');
    if (!dashboardPage || !dashboardPage.classList.contains('active')) {
        console.log('📊 Dashboard não está visível, ignorando fallback');
        this._atualizandoGrafico = false;
        return;
    }
    
    // 🔥 CORREÇÃO: Verificar se o canvas está visível - APENAS UMA VEZ, SEM LOOP
    var rect = ctx.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        console.warn('⚠️ Canvas não está visível para fallback');
        this._atualizandoGrafico = false;
        return;
    }
    
    var ctx2d = ctx.getContext('2d');
    if (!ctx2d) {
        console.error('❌ Não foi possível obter o contexto 2D do canvas para fallback');
        this._atualizandoGrafico = false;
        return;
    }
    
    if (this.chartPizza) {
        try {
            this.chartPizza.destroy();
        } catch (e) {
            console.warn('⚠️ Erro ao destruir gráfico existente:', e.message);
        }
        this.chartPizza = null;
    }
    
    try {
        this.chartPizza = new Chart(ctx2d, {
            type: 'pie',
            data: {
                labels: ['Sem dados'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#d1d5db'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function() {
                                return 'Nenhuma despesa no período';
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 10 }, padding: 12 }
                    }
                }
            }
        });
        this._ultimoMesGrafico = null;
        console.log('✅ Gráfico de fallback criado');
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de fallback:', error);
    }
    
    this._atualizandoGrafico = false;
};

// =============================================
// ORDENAÇÃO DE ARRAY POR COLUNA
// =============================================
managerApp.ordenarArrayPorColuna = function(array, coluna, direcao, tipo) {
    if (!array || array.length === 0) return array;
    
    var self = this;
    var sorted = [...array];
    
    sorted.sort(function(a, b) {
        var valA, valB;
        
        switch(coluna) {
            case 'nome':
                valA = (a.nomeCompleto || '').toLowerCase();
                valB = (b.nomeCompleto || '').toLowerCase();
                break;
            case 'contato':
                valA = (a.telefone || '').toLowerCase();
                valB = (b.telefone || '').toLowerCase();
                break;
            case 'data':
                if (tipo === 'leads') {
                    valA = a.dataCadastro || a.timestamp || '';
                    valB = b.dataCadastro || b.timestamp || '';
                } else {
                    valA = a.data || '';
                    valB = b.data || '';
                }
                var dateA = new Date(valA);
                var dateB = new Date(valB);
                if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                    return direcao === 'asc' ? dateA - dateB : dateB - dateA;
                }
                valA = String(valA);
                valB = String(valB);
                break;
            case 'proximaAcao':
                valA = (a.proximaAcao || '').toLowerCase();
                valB = (b.proximaAcao || '').toLowerCase();
                break;
            case 'descricao':
                valA = (a.descricao || '').toLowerCase();
                valB = (b.descricao || '').toLowerCase();
                break;
            case 'fornecedor':
                valA = (a.fornecedor || '').toLowerCase();
                valB = (b.fornecedor || '').toLowerCase();
                break;
            case 'categoria':
                valA = (a.categoria || '').toLowerCase();
                valB = (b.categoria || '').toLowerCase();
                break;
            case 'status':
                valA = (a.status || '').toLowerCase();
                valB = (b.status || '').toLowerCase();
                break;
            case 'assistido':
                valA = (a.assistido || '').toLowerCase();
                valB = (b.assistido || '').toLowerCase();
                break;
            case 'tipo':
                valA = (a.tipo || '').toLowerCase();
                valB = (b.tipo || '').toLowerCase();
                break;
            default:
                return 0;
        }
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            if (direcao === 'asc') {
                return valA.localeCompare(valB, 'pt-BR');
            } else {
                return valB.localeCompare(valA, 'pt-BR');
            }
        }
        
        if (direcao === 'asc') {
            return valA > valB ? 1 : (valA < valB ? -1 : 0);
        } else {
            return valA < valB ? 1 : (valA > valB ? -1 : 0);
        }
    });
    
    return sorted;
};

// =============================================
// INDICADORES DE ORDENAÇÃO
// =============================================
managerApp.atualizarIndicadoresOrdenacao = function(tabelaId, colunaAtiva) {
    var ths = document.querySelectorAll('#' + tabelaId + ' th.sortable');
    for (var i = 0; i < ths.length; i++) {
        var th = ths[i];
        var coluna = th.getAttribute('data-sort-col');
        th.classList.remove('sort-asc', 'sort-desc');
        if (coluna === colunaAtiva) {
            th.classList.add(this.ordenacaoLeads.direcao === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }
};

managerApp.atualizarIndicadoresOrdenacaoDespesas = function(colunaAtiva) {
    var ths = document.querySelectorAll('#tabelaDespesas th.sortable');
    for (var i = 0; i < ths.length; i++) {
        var th = ths[i];
        var coluna = th.getAttribute('data-sort-col');
        th.classList.remove('sort-asc', 'sort-desc');
        if (coluna === colunaAtiva) {
            th.classList.add(this.ordenacaoDespesas.direcao === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }
};

managerApp.atualizarIndicadoresOrdenacaoReceitas = function(colunaAtiva) {
    var ths = document.querySelectorAll('#tabelaReceitas th.sortable');
    for (var i = 0; i < ths.length; i++) {
        var th = ths[i];
        var coluna = th.getAttribute('data-sort-col');
        th.classList.remove('sort-asc', 'sort-desc');
        if (coluna === colunaAtiva) {
            th.classList.add(this.ordenacaoReceitas.direcao === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }
};

// =============================================
// CONFIGURAR EVENTOS DE ORDENAÇÃO
// =============================================
managerApp.configurarEventosOrdenacao = function() {
    var self = this;
    
    var thsLeads = document.querySelectorAll('#tabelaLeads th.sortable');
    for (var i = 0; i < thsLeads.length; i++) {
        thsLeads[i].addEventListener('click', function(e) {
            var coluna = this.getAttribute('data-sort-col');
            var novaDirecao = 'asc';
            if (self.ordenacaoLeads.coluna === coluna && self.ordenacaoLeads.direcao === 'asc') {
                novaDirecao = 'desc';
            }
            self.ordenacaoLeads = { coluna: coluna, direcao: novaDirecao };
            localStorage.setItem('manager_ordenacao_leads', JSON.stringify(self.ordenacaoLeads));
            self.renderLeadsFiltrados();
        });
    }
    
    var thsDespesas = document.querySelectorAll('#tabelaDespesas th.sortable');
    for (var i = 0; i < thsDespesas.length; i++) {
        thsDespesas[i].addEventListener('click', function(e) {
            var coluna = this.getAttribute('data-sort-col');
            var novaDirecao = 'asc';
            if (self.ordenacaoDespesas.coluna === coluna && self.ordenacaoDespesas.direcao === 'asc') {
                novaDirecao = 'desc';
            }
            self.ordenacaoDespesas = { coluna: coluna, direcao: novaDirecao };
            localStorage.setItem('manager_ordenacao_despesas', JSON.stringify(self.ordenacaoDespesas));
            self.renderDespesas();
        });
    }
    
    var thsReceitas = document.querySelectorAll('#tabelaReceitas th.sortable');
    for (var i = 0; i < thsReceitas.length; i++) {
        thsReceitas[i].addEventListener('click', function(e) {
            var coluna = this.getAttribute('data-sort-col');
            var novaDirecao = 'asc';
            if (self.ordenacaoReceitas.coluna === coluna && self.ordenacaoReceitas.direcao === 'asc') {
                novaDirecao = 'desc';
            }
            self.ordenacaoReceitas = { coluna: coluna, direcao: novaDirecao };
            localStorage.setItem('manager_ordenacao_receitas', JSON.stringify(self.ordenacaoReceitas));
            self.renderReceitasAvulsas();
        });
    }
};

// =============================================
// ATUALIZAR GRÁFICO DE EVOLUÇÃO DO FATURAMENTO
// =============================================
managerApp.atualizarGraficoEvolucaoFaturamento = function(mesReferencia) {
    var ctx = document.getElementById('chartEvolucaoFaturamento');
    if (!ctx) return;
    
    console.log('📊 Atualizando gráfico de evolução do faturamento para o mês:', mesReferencia);
    
    var self = this;
    var hoje = new Date();
    var meses = [];
    var faturamentoData = [];
    
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
        faturamentoData.push(0);
    }
    
    API.listarReceitas()
        .then(function(data) {
            var receitas = data.receitas || [];
            
            for (var i = 0; i < receitas.length; i++) {
                var r = receitas[i];
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
                            faturamentoData[index] += parseFloat(r.valor) || 0;
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
            
            var metaFaturamento = self.metas.faturamento || 50000;
            var metaLinha = Array(labels.length).fill(metaFaturamento);
            
            if (self.chartEvolucaoFaturamento) {
                self.chartEvolucaoFaturamento.destroy();
                self.chartEvolucaoFaturamento = null;
            }
            
            try {
                self.chartEvolucaoFaturamento = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Faturamento Mensal',
                                data: faturamentoData,
                                backgroundColor: 'rgba(13, 148, 136, 0.7)',
                                borderColor: '#0d9488',
                                borderWidth: 2,
                                borderRadius: 4
                            },
                            {
                                label: 'Meta',
                                data: metaLinha,
                                type: 'line',
                                borderColor: '#f59e0b',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                fill: false,
                                pointRadius: 0,
                                tension: 0
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
                
                console.log('✅ Gráfico de evolução do faturamento criado para o mês:', mesReferencia);
                
            } catch (error) {
                console.error('❌ Erro ao criar gráfico de evolução do faturamento:', error);
            }
        })
        .catch(function(error) {
            console.error('❌ Erro ao buscar dados para o gráfico:', error);
        });
};

// =============================================
// FUNÇÃO LEGADA (MANTIDA PARA COMPATIBILIDADE)
// =============================================
managerApp.atualizarGraficoTopDespesasPorMes = function(mesReferencia, despesasFiltradas) {
    console.warn('⚠️ atualizarGraficoTopDespesasPorMes está deprecated. Use _atualizarGraficoTopDespesas()');
    this._atualizarGraficoTopDespesas(despesasFiltradas, mesReferencia);
};

// =============================================
// ATUALIZAR GRÁFICO DE MARGEM
// =============================================
managerApp.atualizarGraficoMargemPorMes = function(mesReferencia) {
    var ctx = document.getElementById('chartMargem');
    if (!ctx) return;
    
    var self = this;
    var hoje = new Date();
    var meses = [];
    var margemData = [];
    
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
        margemData.push(0);
    }
    
    Promise.all([
        API.listarReceitas(),
        API.listarDespesas()
    ]).then(function(results) {
        var receitas = results[0].receitas || [];
        var despesas = results[1].despesas || [];
        
        var receitasPorMes = {};
        var despesasPorMes = {};
        
        for (var i = 0; i < receitas.length; i++) {
            var r = receitas[i];
            if (r.data && r.status === 'Recebido') {
                var dataStr = r.data;
                if (dataStr.includes('T')) {
                    dataStr = dataStr.split('T')[0];
                }
                var dataParts = dataStr.split('-');
                if (dataParts.length === 3) {
                    var periodo = dataParts[0] + '-' + dataParts[1];
                    if (meses.indexOf(periodo) !== -1) {
                        if (!receitasPorMes[periodo]) receitasPorMes[periodo] = 0;
                        receitasPorMes[periodo] += parseFloat(r.valor) || 0;
                    }
                }
            }
        }
        
        for (var i = 0; i < despesas.length; i++) {
            var d = despesas[i];
            if (d.data && d.status === 'Pago') {
                var dataStr = d.data;
                if (dataStr.includes('T')) {
                    dataStr = dataStr.split('T')[0];
                }
                var dataParts = dataStr.split('-');
                if (dataParts.length === 3) {
                    var periodo = dataParts[0] + '-' + dataParts[1];
                    if (meses.indexOf(periodo) !== -1) {
                        if (!despesasPorMes[periodo]) despesasPorMes[periodo] = 0;
                        despesasPorMes[periodo] += parseFloat(d.valor) || 0;
                    }
                }
            }
        }
        
        for (var i = 0; i < meses.length; i++) {
            var periodo = meses[i];
            var rec = receitasPorMes[periodo] || 0;
            var desp = despesasPorMes[periodo] || 0;
            if (rec > 0) {
                margemData[i] = ((rec - desp) / rec) * 100;
            } else {
                margemData[i] = 0;
            }
        }
        
        var mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        var labels = [];
        for (var i = 0; i < meses.length; i++) {
            var partsLabel = meses[i].split('-');
            var mesNum = parseInt(partsLabel[1]);
            labels.push(mesesNomes[mesNum - 1] + '/' + partsLabel[0]);
        }
        
        var metaMargem = self.metas.margem || 25;
        
        if (self.chartMargem) {
            self.chartMargem.destroy();
            self.chartMargem = null;
        }
        
        try {
            self.chartMargem = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Margem Líquida (%)',
                            data: margemData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
                                return periodo === mesReferencia ? '#10b981' : '#10b981';
                            },
                            pointBorderWidth: function(context) {
                                var index = context.dataIndex;
                                var periodo = meses[index];
                                return periodo === mesReferencia ? 4 : 2;
                            }
                        },
                        {
                            label: 'Meta (' + metaMargem + '%)',
                            data: Array(labels.length).fill(metaMargem),
                            borderColor: '#f59e0b',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            fill: false,
                            pointRadius: 0,
                            tension: 0
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
                                    return context.dataset.label + ': ' + context.raw.toFixed(1) + '%';
                                }
                            }
                        },
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de margem:', error);
        }
    });
};
