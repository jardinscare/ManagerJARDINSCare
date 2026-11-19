// =============================================
// INTELIGÊNCIA DE NEGÓCIO - managerJARDINSCare
// Painel, Equilíbrio, Simulador, Projeção, Risco
// Versão 3.4 - Barra de progresso padronizada
// =============================================

// =============================================
// ESTADO GLOBAL
// =============================================
managerApp._parametrosOperacionais = {
    despesasOperacionais: 20000,
    aliquotaImposto: 6,
    cacMedio: 500,
    mesesAmortizacaoCac: 12
};

managerApp._PATRONO_CLIENTE = 'JARDINS Prime Care';
managerApp._IGPM_12M = 5.0;
managerApp._DIAS_JANELA_BURNOUT = 90;

managerApp._MORTALIDADE_IBGE = {
    '0-4': 0.0015, '5-9': 0.0008, '10-14': 0.0010, '15-19': 0.0018,
    '20-24': 0.0025, '25-29': 0.0030, '30-34': 0.0035, '35-39': 0.0045,
    '40-44': 0.0060, '45-49': 0.0085, '50-54': 0.0120, '55-59': 0.0180,
    '60-64': 0.0250, '65-69': 0.0350, '70-74': 0.0500, '75-79': 0.0800,
    '80-84': 0.1300, '85+': 0.2000
};

managerApp._painelMargemCache = null;
managerApp._pontoEquilibrioCache = null;
managerApp._simulacaoAtual = null;
managerApp._simulacoesSalvas = [];
managerApp._projecaoAtual = null;
managerApp._analiseRiscoCache = null;
managerApp._cenarioProjecaoSelecionado = null;

managerApp._metasMargem = { aceitavel: 5, bom: 10, ideal: 15 };

// =============================================
// 🆕 BARRA DE PROGRESSO DA INTELIGÊNCIA (overlay modal)
// =============================================
managerApp._progressBarInteligencia = {
    container: null,
    barra: null,
    percentual: null,
    contador: null,
    label: null,
    subtitulo: null,
    statusEl: null,
    tempoEl: null,
    stepsEls: [],
    startTime: null,
    intervalId: null,
    timeoutHideId: null
};

managerApp._mostrarBarraProgressoInteligencia = function(titulo, subtitulo) {
    var self = this;

    // Remove instância anterior, se houver
    if (this._progressBarInteligencia.container) {
        try { this._progressBarInteligencia.container.remove(); } catch(e) {}
    }
    if (this._progressBarInteligencia.intervalId) {
        clearInterval(this._progressBarInteligencia.intervalId);
    }
    if (this._progressBarInteligencia.timeoutHideId) {
        clearTimeout(this._progressBarInteligencia.timeoutHideId);
    }

    var container = document.createElement('div');
    container.id = 'progressoInteligenciaOverlay';
    container.style.cssText = [
        'position: fixed',
        'top: 0',
        'left: 0',
        'width: 100%',
        'height: 100%',
        'background: rgba(0, 0, 0, 0.7)',
        'backdrop-filter: blur(4px)',
        '-webkit-backdrop-filter: blur(4px)',
        'display: flex',
        'justify-content: center',
        'align-items: center',
        'z-index: 9999',
        'flex-direction: column'
    ].join(';');

    container.innerHTML = [
        '<div style="background: white; border-radius: 16px; padding: 32px 40px; max-width: 520px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.35);">',
        '  <div style="text-align: center; margin-bottom: 20px;">',
        '    <div style="font-size: 28px; margin-bottom: 8px;">🧠</div>',
        '    <div style="font-size: 18px; font-weight: 700; color: #1f2937;">' + (titulo || 'Carregando...') + '</div>',
        '    <div style="font-size: 13px; color: #6b7280; margin-top: 4px;" id="progressoIntelSubtitulo">' + (subtitulo || '') + '</div>',
        '  </div>',
        '  <div style="display: flex; justify-content: space-between; gap: 6px; margin-bottom: 18px;">',
        '    <div class="progressoIntelStep" data-step="0" style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">',
        '      <div style="font-size: 20px; margin-bottom: 4px;">📡</div>',
        '      <div>Conectando</div>',
        '    </div>',
        '    <div class="progressoIntelStep" data-step="1" style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">',
        '      <div style="font-size: 20px; margin-bottom: 4px;">💼</div>',
        '      <div>Buscando Dados</div>',
        '    </div>',
        '    <div class="progressoIntelStep" data-step="2" style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">',
        '      <div style="font-size: 20px; margin-bottom: 4px;">📊</div>',
        '      <div>Calculando</div>',
        '    </div>',
        '    <div class="progressoIntelStep" data-step="3" style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">',
        '      <div style="font-size: 20px; margin-bottom: 4px;">✅</div>',
        '      <div>Finalizando</div>',
        '    </div>',
        '  </div>',
        '  <div style="margin-bottom: 12px;">',
        '    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">',
        '      <span style="font-size: 12px; color: #6b7280;" id="progressoIntelLabel">⏳ Iniciando...</span>',
        '      <span style="font-size: 12px; font-weight: 600; color: #0d9488;" id="progressoIntelContador">0 / 4</span>',
        '    </div>',
        '    <div style="position: relative; background: #e5e7eb; border-radius: 10px; height: 24px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">',
        '      <div id="progressoIntelBarra" style="width: 0%; height: 100%; background: linear-gradient(90deg, #0d9488, #0f766e); border-radius: 10px; transition: width 0.35s ease;"></div>',
        '      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #1f2937;" id="progressoIntelPercentual">0%</div>',
        '    </div>',
        '  </div>',
        '  <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;">',
        '    <span id="progressoIntelStatus">🔄 Preparando...</span>',
        '    <span id="progressoIntelTempo">⏱️ 0s</span>',
        '  </div>',
        '</div>'
    ].join('');

    document.body.appendChild(container);

    // Cache de elementos
    this._progressBarInteligencia.container = container;
    this._progressBarInteligencia.barra = document.getElementById('progressoIntelBarra');
    this._progressBarInteligencia.percentual = document.getElementById('progressoIntelPercentual');
    this._progressBarInteligencia.contador = document.getElementById('progressoIntelContador');
    this._progressBarInteligencia.label = document.getElementById('progressoIntelLabel');
    this._progressBarInteligencia.subtitulo = document.getElementById('progressoIntelSubtitulo');
    this._progressBarInteligencia.statusEl = document.getElementById('progressoIntelStatus');
    this._progressBarInteligencia.tempoEl = document.getElementById('progressoIntelTempo');
    this._progressBarInteligencia.stepsEls = container.querySelectorAll('.progressoIntelStep');
    this._progressBarInteligencia.startTime = Date.now();

    // Timer
    var self = this;
    this._progressBarInteligencia.intervalId = setInterval(function() {
        if (self._progressBarInteligencia.tempoEl && self._progressBarInteligencia.startTime) {
            var elapsed = Math.floor((Date.now() - self._progressBarInteligencia.startTime) / 1000);
            self._progressBarInteligencia.tempoEl.textContent = '⏱️ ' + elapsed + 's';
        }
    }, 1000);
};

managerApp._atualizarBarraProgressoInteligencia = function(step, percent, label, contador) {
    var pb = this._progressBarInteligencia;
    if (!pb.container) return;

    if (pb.barra) pb.barra.style.width = percent + '%';
    if (pb.percentual) pb.percentual.textContent = percent + '%';
    if (pb.label && label) pb.label.innerHTML = label;
    if (pb.contador && contador) pb.contador.textContent = contador;

    // Atualizar cores dos passos
    if (pb.stepsEls && pb.stepsEls.length > 0) {
        for (var i = 0; i < pb.stepsEls.length; i++) {
            var el = pb.stepsEls[i];
            if (i < step) {
                el.style.color = '#10b981';
            } else if (i === step) {
                el.style.color = '#8b5cf6';
            } else {
                el.style.color = '#9ca3af';
            }
        }
    }
};

managerApp._esconderBarraProgressoInteligencia = function(mensagem, tipo) {
    var pb = this._progressBarInteligencia;
    if (!pb.container) return;

    // Para o timer
    if (pb.intervalId) {
        clearInterval(pb.intervalId);
        pb.intervalId = null;
    }

    // Estado final
    if (pb.barra) pb.barra.style.width = '100%';
    if (pb.percentual) pb.percentual.textContent = '100%';
    if (pb.statusEl) {
        pb.statusEl.innerHTML = (tipo === 'error') ? '❌ ' + (mensagem || 'Erro') : '✅ ' + (mensagem || 'Finalizado!');
        pb.statusEl.style.color = (tipo === 'error') ? '#ef4444' : '#10b981';
    }
    if (pb.stepsEls && pb.stepsEls.length > 0) {
        for (var i = 0; i < pb.stepsEls.length; i++) {
            pb.stepsEls[i].style.color = (tipo === 'error') ? '#ef4444' : '#10b981';
        }
    }

    // Delay mínimo de 600ms antes de esconder
    var self = this;
    pb.timeoutHideId = setTimeout(function() {
        if (pb.container && pb.container.parentNode) {
            pb.container.parentNode.removeChild(pb.container);
        }
        self._progressBarInteligencia = {
            container: null, barra: null, percentual: null, contador: null,
            label: null, subtitulo: null, statusEl: null, tempoEl: null,
            stepsEls: [], startTime: null, intervalId: null, timeoutHideId: null
        };
    }, 600);
};

// =============================================
// CLASSIFICAR ASSISTIDO COMO CLIENTE OU PARCERIA
// =============================================
managerApp._isCliente = function(patrono) {
    if (!patrono || patrono.trim() === '') return true;
    var patronoNorm = String(patrono).trim().toLowerCase();
    var clienteNorm = String(this._PATRONO_CLIENTE).trim().toLowerCase();
    return patronoNorm === clienteNorm;
};

// =============================================
// INICIALIZAÇÃO
// =============================================
managerApp.initInteligenciaNegocio = function() {
    var self = this;
    
    if (this._inteligenciaInicializada) {
        console.log('ℹ️ Inteligência de Negócio já inicializada');
        return;
    }
    this._inteligenciaInicializada = true;
    
    this._configurarTabsInteligencia();
    
    var btnAtualizar = document.getElementById('btnAtualizarInteligencia');
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', function() {
            self.carregarInteligenciaNegocio(true);
        });
    }
    
    var btnConfig = document.getElementById('btnConfigurarParametrosOp');
    if (btnConfig) {
        btnConfig.addEventListener('click', function() {
            self.abrirModalParametrosOp();
        });
    }
    
    this._configurarModalParametrosOp();
    this._configurarSimuladorEventos();
    this._configurarProjecaoEventos();
    
    console.log('✅ Inteligência de Negócio v3.4 inicializada');
};

// =============================================
// CONFIGURAR TABS INTERNAS
// =============================================
managerApp._configurarTabsInteligencia = function() {
    var self = this;
    var tabs = document.querySelectorAll('[data-tab-inteligencia]');
    
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var target = this.getAttribute('data-tab-inteligencia');
            
            tabs.forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            
            var containers = ['inteligenciaTabPainel', 'inteligenciaTabEquilibrio', 
                              'inteligenciaTabSimulador', 'inteligenciaTabProjecao',
                              'inteligenciaTabRisco'];
            containers.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            
            var targetId = 'inteligenciaTab' + target.charAt(0).toUpperCase() + target.slice(1);
            var targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.style.display = 'block';
            
            if (target === 'painel' && !self._painelMargemCache) {
                self.carregarInteligenciaNegocio();
            } else if (target === 'equilibrio' && !self._pontoEquilibrioCache) {
                self.carregarInteligenciaNegocio();
            } else if (target === 'simulador') {
                self.carregarSimuladorContrato();
            } else if (target === 'projecao') {
                self.carregarProjecaoCenarios();
            } else if (target === 'risco') {
                self.carregarAnaliseRisco();
            }
        });
    });
};

managerApp._resetarAbaInteligencia = function() {
    var tabs = document.querySelectorAll('[data-tab-inteligencia]');
    tabs.forEach(function(t) {
        if (t.getAttribute('data-tab-inteligencia') === 'painel') {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });
    
    var containers = ['inteligenciaTabPainel', 'inteligenciaTabEquilibrio', 
                      'inteligenciaTabSimulador', 'inteligenciaTabProjecao',
                      'inteligenciaTabRisco'];
    containers.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.display = (id === 'inteligenciaTabPainel') ? 'block' : 'none';
        }
    });
};

// =============================================
// CARREGAMENTO PRINCIPAL (COM BARRA DE PROGRESSO)
// =============================================
managerApp.carregarInteligenciaNegocio = function(forceRefresh) {
    var self = this;
    
    if (forceRefresh) {
        this._painelMargemCache = null;
        this._pontoEquilibrioCache = null;
        this._analiseRiscoCache = null;
    }
    
    // 🔥 Mostrar barra de progresso
    this._mostrarBarraProgressoInteligencia(
        'Carregando Inteligência de Negócio',
        'Preparando análise de margem...'
    );
    this._atualizarBarraProgressoInteligencia(0, 10, '📡 Conectando...', '1 / 4');
    
    API.getParametrosOperacionais()
        .then(function(data) {
            if (data.result === 'success') {
                self._parametrosOperacionais = data.parametros;
            }
            
            // 🔥 Etapa 1 concluída → Etapa 2
            self._atualizarBarraProgressoInteligencia(1, 40, '💼 Buscando assistidos...', '2 / 4');
            
            return self._buscarAssistidosComMargem();
        })
        .then(function(assistidosComMargem) {
            // 🔥 Etapa 2 concluída → Etapa 3
            self._atualizarBarraProgressoInteligencia(2, 70, '📊 Calculando painel de margem...', '3 / 4');
            
            self._calcularPainelMargem(assistidosComMargem);
            self._calcularPontoEquilibrio(assistidosComMargem);
            
            // 🔥 Etapa 3 concluída → Etapa 4
            self._atualizarBarraProgressoInteligencia(3, 90, '✅ Renderizando...', '4 / 4');
            
            self._renderizarPainelMargem();
            self._renderizarPontoEquilibrio();
            
            // 🔥 Finalizar
            self._esconderBarraProgressoInteligencia('Inteligência carregada!', 'success');
            console.log('✅ Inteligência de Negócio carregada');
        })
        .catch(function(error) {
            console.error('❌ Erro ao carregar Inteligência de Negócio:', error);
            self._esconderBarraProgressoInteligencia('Erro ao carregar', 'error');
            Utils.showToast('Erro ao carregar: ' + error.message, 'error');
        });
};

// =============================================
// BUSCAR ASSISTIDOS COM MARGEM
// =============================================
managerApp._buscarAssistidosComMargem = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        API.getAssistidosCompleto()
            .then(function(data) {
                if (data.result !== 'success') {
                    reject(new Error('Erro ao buscar assistidos'));
                    return;
                }
                
                var assistidos = (data.assistidos || []).filter(function(a) {
                    return a.status === 'Ativo' && a.tipoContrato === 'MENSAL';
                });
                
                if (assistidos.length === 0) {
                    resolve([]);
                    return;
                }
                
                return API.getCustoPCRealPorAssistido()
                    .then(function(custoData) {
                        var custoPorAssistido = custoData.custoPorAssistido || {};
                        
                        var assistidosClientes = [];
                        var assistidosParcerias = [];
                        
                        for (var i = 0; i < assistidos.length; i++) {
                            var a = assistidos[i];
                            if (self._isCliente(a.patrono)) {
                                assistidosClientes.push(a);
                            } else {
                                assistidosParcerias.push(a);
                            }
                        }
                        
                        console.log('📊 Clientes:', assistidosClientes.length, '| Parcerias:', assistidosParcerias.length);
                        
                        var receitaTotalClientes = 0;
                        for (var i = 0; i < assistidosClientes.length; i++) {
                            receitaTotalClientes += parseFloat(assistidosClientes[i].vlrContrato) || 0;
                        }
                        
                        var despesasOp = self._parametrosOperacionais.despesasOperacionais || 20000;
                        var aliquotaImposto = (self._parametrosOperacionais.aliquotaImposto || 6) / 100;
                        
                        function calcularMargem(a, isParceria) {
                            var receita = parseFloat(a.vlrContrato) || 0;
                            
                            var custoPC = custoPorAssistido[a.nome];
                            var fonteCustoPC = 'real';
                            
                            if (!custoPC || custoPC === 0) {
                                var plantoesMes = parseFloat(a.totalHrsMes) || 0;
                                var vlrPlantao = parseFloat(a.vlrPlantao) || parseFloat(a.vlrPlantaoNumeric) || 0;
                                custoPC = plantoesMes * vlrPlantao;
                                fonteCustoPC = 'estimado';
                            }
                            
                            var impostos = receita * aliquotaImposto;
                            var margemContribuicao = receita - custoPC - impostos;
                            
                            var rateioOp = 0;
                            if (!isParceria && receitaTotalClientes > 0) {
                                rateioOp = (receita / receitaTotalClientes) * despesasOp;
                            }
                            
                            var margemLiquida = margemContribuicao - rateioOp;
                            var percMargemContribuicao = receita > 0 ? (margemContribuicao / receita) * 100 : 0;
                            var percMargemLiquida = receita > 0 ? (margemLiquida / receita) * 100 : 0;
                            
                            return {
                                nome: a.nome,
                                status: a.status,
                                regiao: a.regiao || 'Não informada',
                                tipoContrato: a.tipoContrato,
                                plantao: a.plantoes || a.plantao || 'Não informado',
                                patrono: a.patrono || '',
                                receita: receita,
                                custoPC: custoPC,
                                fonteCustoPC: fonteCustoPC,
                                impostos: impostos,
                                rateioOp: rateioOp,
                                margemContribuicao: margemContribuicao,
                                margemLiquida: margemLiquida,
                                percMargemContribuicao: percMargemContribuicao,
                                percMargemLiquida: percMargemLiquida,
                                isDeficitario: !isParceria && margemLiquida < 0,
                                isParceria: isParceria,
                                dataNasc: a.dataNasc,
                                diaVencimento: a.diaVencimento
                            };
                        }
                        
                        var resultado = [];
                        for (var i = 0; i < assistidosClientes.length; i++) {
                            resultado.push(calcularMargem(assistidosClientes[i], false));
                        }
                        for (var i = 0; i < assistidosParcerias.length; i++) {
                            resultado.push(calcularMargem(assistidosParcerias[i], true));
                        }
                        
                        resultado.sort(function(a, b) {
                            return b.margemLiquida - a.margemLiquida;
                        });
                        
                        resolve(resultado);
                    });
            })
            .catch(function(error) {
                reject(error);
            });
    });
};

// =============================================
// CALCULAR PAINEL DE MARGEM
// =============================================
managerApp._calcularPainelMargem = function(assistidosComMargem) {
    var totalAssistidos = assistidosComMargem.length;
    
    var somaReceitaGeral = 0, somaCustoPCGeral = 0, somaImpostosGeral = 0;
    var somaMargemContribuicaoGeral = 0, somaMargemLiquidaGeral = 0;
    
    var somaReceitaClientes = 0, somaCustoPCClientes = 0, somaImpostosClientes = 0;
    var somaMargemContribuicaoClientes = 0, somaMargemLiquidaClientes = 0;
    
    var clientes = [], parcerias = [], deficitarios = [], lucrativos = [];
    
    for (var i = 0; i < assistidosComMargem.length; i++) {
        var a = assistidosComMargem[i];
        
        somaReceitaGeral += a.receita;
        somaCustoPCGeral += a.custoPC;
        somaImpostosGeral += a.impostos;
        somaMargemContribuicaoGeral += a.margemContribuicao;
        somaMargemLiquidaGeral += a.margemLiquida;
        
        if (a.isParceria) {
            parcerias.push(a);
        } else {
            clientes.push(a);
            somaReceitaClientes += a.receita;
            somaCustoPCClientes += a.custoPC;
            somaImpostosClientes += a.impostos;
            somaMargemContribuicaoClientes += a.margemContribuicao;
            somaMargemLiquidaClientes += a.margemLiquida;
            
            if (a.isDeficitario) {
                deficitarios.push(a);
            } else {
                lucrativos.push(a);
            }
        }
    }
    
    var top5 = clientes.slice(0, Math.min(5, clientes.length));
    var receitaTop5 = top5.reduce(function(s, a) { return s + a.receita; }, 0);
    var concentracaoTop5 = somaReceitaClientes > 0 ? (receitaTop5 / somaReceitaClientes * 100) : 0;
    
    var totalClientes = clientes.length;
    var receitaMedia = totalClientes > 0 ? somaReceitaClientes / totalClientes : 0;
    var custoPCMedio = totalClientes > 0 ? somaCustoPCClientes / totalClientes : 0;
    var margemContribuicaoMedia = totalClientes > 0 ? somaMargemContribuicaoClientes / totalClientes : 0;
    var margemLiquidaMedia = totalClientes > 0 ? somaMargemLiquidaClientes / totalClientes : 0;
    var percMargemContribuicaoMedia = somaReceitaClientes > 0 ? (somaMargemContribuicaoClientes / somaReceitaClientes) * 100 : 0;
    var percMargemLiquidaMedia = somaReceitaClientes > 0 ? (somaMargemLiquidaClientes / somaReceitaClientes) * 100 : 0;
    
    this._painelMargemCache = {
        totalAssistidos: totalAssistidos,
        totalClientes: totalClientes,
        totalParcerias: parcerias.length,
        assistidos: assistidosComMargem,
        clientes: clientes,
        parcerias: parcerias,
        deficitarios: deficitarios,
        lucrativos: lucrativos,
        somaReceita: somaReceitaGeral,
        somaCustoPC: somaCustoPCGeral,
        somaImpostos: somaImpostosGeral,
        somaMargemContribuicao: somaMargemContribuicaoGeral,
        somaMargemLiquida: somaMargemLiquidaGeral,
        somaReceitaClientes: somaReceitaClientes,
        somaCustoPCClientes: somaCustoPCClientes,
        somaImpostosClientes: somaImpostosClientes,
        somaMargemContribuicaoClientes: somaMargemContribuicaoClientes,
        somaMargemLiquidaClientes: somaMargemLiquidaClientes,
        receitaMedia: receitaMedia,
        custoPCMedio: custoPCMedio,
        margemContribuicaoMedia: margemContribuicaoMedia,
        margemLiquidaMedia: margemLiquidaMedia,
        percMargemContribuicaoMedia: percMargemContribuicaoMedia,
        percMargemLiquidaMedia: percMargemLiquidaMedia,
        concentracaoTop5: concentracaoTop5,
        receitaTop5: receitaTop5,
        despesasOperacionais: this._parametrosOperacionais.despesasOperacionais,
        aliquotaImposto: this._parametrosOperacionais.aliquotaImposto
    };
    
    console.log('📊 Painel de Margem calculado:', {
        clientes: totalClientes,
        parcerias: parcerias.length,
        deficitarios: deficitarios.length,
        lucrativos: lucrativos.length
    });
};

// =============================================
// CALCULAR PONTO DE EQUILÍBRIO
// =============================================
managerApp._calcularPontoEquilibrio = function(assistidosComMargem) {
    var painel = this._painelMargemCache;
    if (!painel) return;
    
    var despesasOp = this._parametrosOperacionais.despesasOperacionais || 20000;
    var margemContribuicaoMedia = painel.margemContribuicaoMedia;
    
    var pontoEquilibrio = margemContribuicaoMedia > 0 
        ? Math.ceil(despesasOp / margemContribuicaoMedia) 
        : 0;
    
    var contratosAtuais = painel.totalClientes;
    var margemSeguranca = contratosAtuais > 0 
        ? ((contratosAtuais - pontoEquilibrio) / contratosAtuais) * 100 
        : 0;
    
    var status = 'CRITICO';
    var statusCor = '#dc2626';
    var statusIcone = '🔴';
    var statusTexto = 'CRÍTICO';
    
    if (margemSeguranca >= 30) {
        status = 'SAUDAVEL'; statusCor = '#10b981'; statusIcone = '🟢'; statusTexto = 'SAUDÁVEL';
    } else if (margemSeguranca >= 15) {
        status = 'ATENCAO'; statusCor = '#f59e0b'; statusIcone = '🟡'; statusTexto = 'ATENÇÃO';
    } else if (margemSeguranca > 0) {
        status = 'RISCO'; statusCor = '#ef4444'; statusIcone = '🟠'; statusTexto = 'RISCO';
    }
    
    var contratosPodePerder = Math.max(0, contratosAtuais - pontoEquilibrio);
    var receitaClientes = painel.somaReceitaClientes;
    var margemContribuicaoClientes = painel.somaMargemContribuicaoClientes;
    var lucroAtual = margemContribuicaoClientes - despesasOp;
    var pontoEquilibrioReceita = pontoEquilibrio * painel.receitaMedia;
    
    this._pontoEquilibrioCache = {
        pontoEquilibrio: pontoEquilibrio,
        pontoEquilibrioReceita: pontoEquilibrioReceita,
        contratosAtuais: contratosAtuais,
        margemSeguranca: margemSeguranca,
        status: status,
        statusCor: statusCor,
        statusIcone: statusIcone,
        statusTexto: statusTexto,
        contratosPodePerder: contratosPodePerder,
        despesasOperacionais: despesasOp,
        margemContribuicaoMedia: margemContribuicaoMedia,
        receitaAtual: receitaClientes,
        margemContribuicaoTotal: margemContribuicaoClientes,
        lucroAtual: lucroAtual
    };
    
    console.log('⚖️ Ponto de Equilíbrio calculado:', this._pontoEquilibrioCache);
};

// =============================================
// RENDERIZAR PAINEL DE MARGEM
// =============================================
managerApp._renderizarPainelMargem = function() {
    var container = document.getElementById('painelMargemContainer');
    if (!container) return;
    
    var painel = this._painelMargemCache;
    if (!painel) {
        container.innerHTML = '<div class="empty-state">Nenhum dado disponível</div>';
        return;
    }
    
    var html = '';
    
    if (painel.totalParcerias > 0) {
        html += '<div style="background: #ede9fe; border-left: 4px solid #8b5cf6; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">';
        html += '  <div style="display: flex; align-items: center; gap: 10px;">';
        html += '    <span style="font-size: 20px;">👑</span>';
        html += '    <div style="font-size: 13px; color: var(--gray-700);">';
        html += '      <strong>' + painel.totalParcerias + ' parceria(s) identificada(s)</strong> — ';
        html += '      assistidos cujo patrono é diferente de <strong>"' + this._PATRONO_CLIENTE + '"</strong>. ';
        html += '      Estas parcerias <strong>não entram</strong> no rateio operacional nem na análise de margem.';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }
    
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; font-weight: 700; color: #2563eb;">' + Utils.formatCurrency(painel.somaReceitaClientes) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">RECEITA TOTAL (CLIENTES)</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">' + painel.totalClientes + ' contratos ativos</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px;">';
    html += '  <div class="stat-icon red" style="width: 36px; height: 36px; font-size: 16px;">👥</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; font-weight: 700; color: #dc2626;">' + Utils.formatCurrency(painel.somaCustoPCClientes) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">CUSTO PC (VARIÁVEL)</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">' + (painel.somaReceitaClientes > 0 ? ((painel.somaCustoPCClientes / painel.somaReceitaClientes) * 100).toFixed(1) : 0) + '% da receita</div>';
    html += '  </div>';
    html += '</div>';
    
    var corMC = painel.percMargemContribuicaoMedia >= 15 ? '#10b981' : (painel.percMargemContribuicaoMedia >= 8 ? '#f59e0b' : '#dc2626');
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px; border-left: 3px solid ' + corMC + ';">';
    html += '  <div class="stat-icon green" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; font-weight: 700; color: ' + corMC + ';">' + Utils.formatCurrency(painel.somaMargemContribuicaoClientes) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">MARGEM CONTRIBUIÇÃO</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">' + painel.percMargemContribuicaoMedia.toFixed(1) + '% da receita</div>';
    html += '  </div>';
    html += '</div>';
    
    var corML = painel.somaMargemLiquidaClientes >= 0 ? '#10b981' : '#dc2626';
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px; border-left: 3px solid ' + corML + ';">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">🎯</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; font-weight: 700; color: ' + corML + ';">' + Utils.formatCurrency(painel.somaMargemLiquidaClientes) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">LUCRO OPERACIONAL</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">' + painel.percMargemLiquidaMedia.toFixed(1) + '% da receita</div>';
    html += '  </div>';
    html += '</div>';
    
    var qtdDeficit = painel.deficitarios.length;
    var corDef = qtdDeficit > 0 ? '#dc2626' : '#10b981';
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px; border-left: 3px solid ' + corDef + ';">';
    html += '  <div class="stat-icon ' + (qtdDeficit > 0 ? 'red' : 'green') + '" style="width: 36px; height: 36px; font-size: 16px;">' + (qtdDeficit > 0 ? '⚠️' : '✅') + '</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; font-weight: 700; color: ' + corDef + ';">' + qtdDeficit + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">CONTRATOS DEFICITÁRIOS</div>';
    if (qtdDeficit > 0) {
        var prejuizoTotal = painel.deficitarios.reduce(function(s, a) { return s + Math.abs(a.margemLiquida); }, 0);
        html += '    <div style="font-size: 10px; color: var(--gray-400);">Prejuízo: ' + Utils.formatCurrency(prejuizoTotal) + '/mês</div>';
    } else {
        html += '    <div style="font-size: 10px; color: var(--gray-400);">Todos lucrativos ✅</div>';
    }
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    if (painel.concentracaoTop5 > 60) {
        var corConc = painel.concentracaoTop5 > 80 ? '#dc2626' : '#f59e0b';
        html += '<div style="background: ' + corConc + '15; border-left: 4px solid ' + corConc + '; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">';
        html += '  <div style="font-weight: 700; font-size: 14px; color: ' + corConc + '; margin-bottom: 4px;">⚠️ ALERTA DE CONCENTRAÇÃO</div>';
        html += '  <div style="font-size: 13px; color: var(--gray-700);">';
        html += '    Seus 5 maiores contratos representam <strong>' + painel.concentracaoTop5.toFixed(1) + '%</strong> da receita total de clientes.';
        html += '  </div>';
        html += '</div>';
    }
    
    html += '<div class="card" style="margin-bottom: 20px;">';
    html += '  <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
    html += '    <span class="card-title">✅ Clientes (' + painel.totalClientes + ' contratos)</span>';
    html += '    <span style="font-size: 11px; color: var(--gray-500);">Rateio proporcional | Ordenado por margem líquida</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 16px;">';
    html += '    <div class="data-table-wrapper">';
    html += '      <table class="data-table" style="font-size: 12px;">';
    html += '        <thead>';
    html += '          <tr>';
    html += '            <th>Assistido</th>';
    html += '            <th>Plantão</th>';
    html += '            <th class="text-right">Receita</th>';
    html += '            <th class="text-right">Custo PC</th>';
    html += '            <th class="text-right">Impostos</th>';
    html += '            <th class="text-right">Margem Contrib.</th>';
    html += '            <th class="text-right">Rateio Op.</th>';
    html += '            <th class="text-right">Lucro Líquido</th>';
    html += '            <th class="text-right">%</th>';
    html += '            <th>Status</th>';
    html += '          </tr>';
    html += '        </thead>';
    html += '        <tbody>';
    
    for (var i = 0; i < painel.clientes.length; i++) {
        var a = painel.clientes[i];
        var rowBg = a.isDeficitario ? 'background: #fef2f2;' : '';
        var corML2 = a.margemLiquida >= 0 ? '#10b981' : '#dc2626';
        var statusBadge = a.isDeficitario 
            ? '<span class="badge badge-danger">🔴 Deficitário</span>' 
            : '<span class="badge badge-success">🟢 Lucrativo</span>';
        
        html += '<tr style="' + rowBg + '">';
        html += '  <td><strong>' + a.nome + '</strong></td>';
        html += '  <td>' + a.plantao + '</td>';
        html += '  <td class="text-right">' + Utils.formatCurrency(a.receita) + '</td>';
        html += '  <td class="text-right">' + Utils.formatCurrency(a.custoPC) + (a.fonteCustoPC === 'estimado' ? ' <span style="color: #f59e0b; font-size: 10px;" title="Custo estimado">*</span>' : '') + '</td>';
        html += '  <td class="text-right">' + Utils.formatCurrency(a.impostos) + '</td>';
        html += '  <td class="text-right" style="color: ' + (a.margemContribuicao >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(a.margemContribuicao) + '</td>';
        html += '  <td class="text-right">' + Utils.formatCurrency(a.rateioOp) + '</td>';
        html += '  <td class="text-right" style="font-weight: 700; color: ' + corML2 + ';">' + Utils.formatCurrency(a.margemLiquida) + '</td>';
        html += '  <td class="text-right" style="color: ' + corML2 + ';">' + a.percMargemLiquida.toFixed(1) + '%</td>';
        html += '  <td>' + statusBadge + '</td>';
        html += '</tr>';
    }
    
    html += '        </tbody>';
    html += '        <tfoot style="background: var(--gray-50); font-weight: 700; border-top: 2px solid var(--gray-200);">';
    html += '          <tr>';
    html += '            <td colspan="2">TOTAL (' + painel.totalClientes + ' clientes)</td>';
    html += '            <td class="text-right">' + Utils.formatCurrency(painel.somaReceitaClientes) + '</td>';
    html += '            <td class="text-right">' + Utils.formatCurrency(painel.somaCustoPCClientes) + '</td>';
    html += '            <td class="text-right">' + Utils.formatCurrency(painel.somaImpostosClientes) + '</td>';
    html += '            <td class="text-right" style="color: ' + (painel.somaMargemContribuicaoClientes >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(painel.somaMargemContribuicaoClientes) + '</td>';
    html += '            <td class="text-right">' + Utils.formatCurrency(painel.despesasOperacionais) + '</td>';
    html += '            <td class="text-right" style="color: ' + (painel.somaMargemLiquidaClientes >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(painel.somaMargemLiquidaClientes) + '</td>';
    html += '            <td class="text-right">' + painel.percMargemLiquidaMedia.toFixed(1) + '%</td>';
    html += '            <td></td>';
    html += '          </tr>';
    html += '        </tfoot>';
    html += '      </table>';
    html += '    </div>';
    
    if (painel.clientes.some(function(a) { return a.fonteCustoPC === 'estimado'; })) {
        html += '<div style="margin-top: 8px; font-size: 11px; color: var(--gray-400);">';
        html += '  * Custo PC estimado (plantões × valor por plantão — sem despesa real lançada no mês)';
        html += '</div>';
    }
    
    html += '  </div>';
    html += '</div>';
    
    if (painel.parcerias.length > 0) {
        html += '<div class="card" style="border-left: 4px solid #8b5cf6;">';
        html += '  <div class="card-header" style="background: #ede9fe;">';
        html += '    <span class="card-title">👑 Parcerias (' + painel.totalParcerias + ' contratos)</span>';
        html += '    <span style="font-size: 11px; color: #6d28d9;">Não avaliadas por margem | Sem rateio operacional</span>';
        html += '  </div>';
        html += '  <div class="card-body" style="padding: 12px 16px;">';
        html += '    <div class="data-table-wrapper">';
        html += '      <table class="data-table" style="font-size: 12px;">';
        html += '        <thead>';
        html += '          <tr>';
        html += '            <th>Assistido</th>';
        html += '            <th>Patrono</th>';
        html += '            <th>Plantão</th>';
        html += '            <th class="text-right">Receita</th>';
        html += '            <th class="text-right">Custo PC</th>';
        html += '            <th class="text-right">Impostos</th>';
        html += '            <th class="text-right">Margem Contrib.</th>';
        html += '            <th>Status</th>';
        html += '          </tr>';
        html += '        </thead>';
        html += '        <tbody>';
        
        for (var i = 0; i < painel.parcerias.length; i++) {
            var p = painel.parcerias[i];
            var corMC2 = p.margemContribuicao >= 0 ? '#10b981' : '#dc2626';
            
            html += '<tr style="background: #faf5ff;">';
            html += '  <td><strong>' + p.nome + '</strong></td>';
            html += '  <td><span class="badge" style="background: #8b5cf6; color: white;">' + (p.patrono || '(vazio)') + '</span></td>';
            html += '  <td>' + p.plantao + '</td>';
            html += '  <td class="text-right">' + Utils.formatCurrency(p.receita) + '</td>';
            html += '  <td class="text-right">' + Utils.formatCurrency(p.custoPC) + '</td>';
            html += '  <td class="text-right">' + Utils.formatCurrency(p.impostos) + '</td>';
            html += '  <td class="text-right" style="color: ' + corMC2 + '; font-weight: 600;">' + Utils.formatCurrency(p.margemContribuicao) + '</td>';
            html += '  <td><span class="badge" style="background: #ede9fe; color: #6d28d9;">👑 Parceria</span></td>';
            html += '</tr>';
        }
        
        html += '        </tbody>';
        html += '      </table>';
        html += '    </div>';
        html += '    <div style="margin-top: 8px; font-size: 11px; color: var(--gray-500);">';
        html += '      💡 Parcerias são contratos especiais que não seguem o modelo comercial padrão. ';
        html += '      Elas <strong>não distorcem a análise de margem</strong> dos clientes, mas ainda entram no caixa total.';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }
    
    container.innerHTML = html;
};

console.log('✅ Parte 1 de 6 carregada');
// =============================================
// RENDERIZAR PONTO DE EQUILÍBRIO
// =============================================
managerApp._renderizarPontoEquilibrio = function() {
    var container = document.getElementById('pontoEquilibrioContainer');
    if (!container) return;
    
    var eq = this._pontoEquilibrioCache;
    if (!eq) {
        container.innerHTML = '<div class="empty-state">Nenhum dado disponível</div>';
        return;
    }
    
    var html = '';
    
    html += '<div style="background: linear-gradient(135deg, ' + eq.statusCor + '15 0%, ' + eq.statusCor + '08 100%); border: 2px solid ' + eq.statusCor + '; border-radius: 16px; padding: 24px; margin-bottom: 20px;">';
    html += '  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">';
    html += '    <div style="font-size: 48px;">' + eq.statusIcone + '</div>';
    html += '    <div style="flex: 1; min-width: 250px;">';
    html += '      <div style="font-size: 12px; font-weight: 600; color: var(--gray-500); letter-spacing: 1px;">STATUS OPERACIONAL (CLIENTES)</div>';
    html += '      <div style="font-size: 28px; font-weight: 800; color: ' + eq.statusCor + '; margin: 4px 0;">' + eq.statusTexto + '</div>';
    html += '      <div style="font-size: 14px; color: var(--gray-600);">';
    html += '        Você tem <strong>' + eq.contratosAtuais + ' contratos ativos</strong> e precisa de <strong>' + eq.pontoEquilibrio + ' contratos</strong> para cobrir suas despesas operacionais.';
    html += '      </div>';
    html += '    </div>';
    html += '    <div style="background: white; border-radius: 12px; padding: 16px 20px; text-align: center; min-width: 180px;">';
    html += '      <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">MARGEM DE SEGURANÇA</div>';
    html += '      <div style="font-size: 32px; font-weight: 800; color: ' + eq.statusCor + ';">' + eq.margemSeguranca.toFixed(1) + '%</div>';
    html += '      <div style="font-size: 11px; color: var(--gray-400);">' + eq.contratosPodePerder + ' contratos de folga</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 12px;">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">🏢</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; font-weight: 700; color: #f59e0b;">' + Utils.formatCurrency(eq.despesasOperacionais) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">DESPESAS OPERACIONAIS</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Custo fixo mensal</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 12px;">';
    html += '  <div class="stat-icon green" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; font-weight: 700; color: #10b981;">' + Utils.formatCurrency(eq.margemContribuicaoMedia) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">MARGEM MÉDIA/CONTRATO</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Antes do rateio</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 12px; border-left: 3px solid ' + eq.statusCor + ';">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">⚖️</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 20px; font-weight: 800; color: ' + eq.statusCor + ';">' + eq.pontoEquilibrio + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">CONTRATOS MÍNIMOS</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Para cobrir despesas op.</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 12px;">';
    html += '  <div class="stat-icon teal" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 14px; font-weight: 700; color: #0d9488;">' + Utils.formatCurrency(eq.pontoEquilibrioReceita) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">RECEITA MÍNIMA</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Ponto de equilíbrio em R$</div>';
    html += '  </div>';
    html += '</div>';
    
    var corLucro = eq.lucroAtual >= 0 ? '#10b981' : '#dc2626';
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 12px;">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">🎯</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 16px; font-weight: 700; color: ' + corLucro + ';">' + Utils.formatCurrency(eq.lucroAtual) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">LUCRO MENSAL</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Após despesas op.</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    var percCobertura = eq.pontoEquilibrio > 0 ? Math.min((eq.contratosAtuais / eq.pontoEquilibrio) * 100, 200) : 0;
    var percExibicao = Math.min(percCobertura, 100);
    
    html += '<div class="card" style="margin-bottom: 20px;">';
    html += '  <div class="card-header">';
    html += '    <span class="card-title">📊 Cobertura das Despesas Operacionais</span>';
    html += '  </div>';
    html += '  <div class="card-body">';
    html += '    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">';
    html += '      <span style="font-size: 13px; color: var(--gray-600);">';
    html += '        Você está cobrindo <strong>' + percCobertura.toFixed(0) + '%</strong> das despesas operacionais';
    html += '      </span>';
    html += '      <span style="font-size: 13px; font-weight: 700; color: ' + eq.statusCor + ';">';
    html += '        ' + eq.contratosAtuais + ' de ' + eq.pontoEquilibrio + ' contratos necessários';
    html += '      </span>';
    html += '    </div>';
    html += '    <div style="background: #e5e7eb; border-radius: 12px; height: 40px; overflow: hidden; position: relative;">';
    html += '      <div style="width: ' + percExibicao + '%; height: 100%; background: linear-gradient(90deg, ' + eq.statusCor + ' 0%, ' + eq.statusCor + 'cc 100%); border-radius: 12px; transition: width 0.5s ease;"></div>';
    html += '      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--gray-800);">';
    html += '        ' + percCobertura.toFixed(0) + '%';
    html += '      </div>';
    html += '    </div>';
    html += '    <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--gray-500);">';
    html += '      <span>0 contratos</span>';
    html += '      <span style="font-weight: 700; color: ' + eq.statusCor + ';">Ponto de Equilíbrio: ' + eq.pontoEquilibrio + ' contratos</span>';
    html += '      <span>' + (eq.pontoEquilibrio * 2) + ' contratos</span>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="card">';
    html += '  <div class="card-header">';
    html += '    <span class="card-title">🧪 Simulações Rápidas</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 16px;">';
    html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">';
    
    var lucroPerder1 = eq.lucroAtual - eq.margemContribuicaoMedia;
    var cor1 = lucroPerder1 >= 0 ? '#f59e0b' : '#dc2626';
    html += '<div style="background: var(--gray-50); border-radius: 8px; padding: 12px; border-left: 3px solid ' + cor1 + ';">';
    html += '  <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">SE PERDER 1 CONTRATO</div>';
    html += '  <div style="font-size: 16px; font-weight: 700; color: ' + cor1 + '; margin: 4px 0;">' + Utils.formatCurrency(lucroPerder1) + '</div>';
    html += '  <div style="font-size: 11px; color: var(--gray-400);">Novo lucro mensal</div>';
    html += '</div>';
    
    var lucroPerder3 = eq.lucroAtual - (eq.margemContribuicaoMedia * 3);
    var cor3 = lucroPerder3 >= 0 ? '#f59e0b' : '#dc2626';
    html += '<div style="background: var(--gray-50); border-radius: 8px; padding: 12px; border-left: 3px solid ' + cor3 + ';">';
    html += '  <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">SE PERDER 3 CONTRATOS</div>';
    html += '  <div style="font-size: 16px; font-weight: 700; color: ' + cor3 + '; margin: 4px 0;">' + Utils.formatCurrency(lucroPerder3) + '</div>';
    html += '  <div style="font-size: 11px; color: var(--gray-400);">Novo lucro mensal</div>';
    html += '</div>';
    
    var lucroFechar2 = eq.lucroAtual + (eq.margemContribuicaoMedia * 2);
    html += '<div style="background: var(--gray-50); border-radius: 8px; padding: 12px; border-left: 3px solid #10b981;">';
    html += '  <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">SE FECHAR 2 CONTRATOS</div>';
    html += '  <div style="font-size: 16px; font-weight: 700; color: #10b981; margin: 4px 0;">' + Utils.formatCurrency(lucroFechar2) + '</div>';
    html += '  <div style="font-size: 11px; color: var(--gray-400);">Novo lucro mensal</div>';
    html += '</div>';
    
    var lucroFechar5 = eq.lucroAtual + (eq.margemContribuicaoMedia * 5);
    html += '<div style="background: var(--gray-50); border-radius: 8px; padding: 12px; border-left: 3px solid #10b981;">';
    html += '  <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">SE FECHAR 5 CONTRATOS</div>';
    html += '  <div style="font-size: 16px; font-weight: 700; color: #10b981; margin: 4px 0;">' + Utils.formatCurrency(lucroFechar5) + '</div>';
    html += '  <div style="font-size: 11px; color: var(--gray-400);">Novo lucro mensal</div>';
    html += '</div>';
    
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
};

// =============================================
// 🧪 FASE 2 - SIMULADOR DE CONTRATO
// =============================================

managerApp._configurarSimuladorEventos = function() {
    var self = this;
    
    if (this._simuladorConfigurado) return;
    this._simuladorConfigurado = true;
    
    var btnSimular = document.getElementById('btnSimularContrato');
    if (btnSimular) {
        btnSimular.addEventListener('click', function() {
            self.executarSimulacaoContrato();
        });
    }
    
    var btnLimpar = document.getElementById('btnLimparSimulacao');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            self.limparSimulacaoContrato();
        });
    }
    
    var btnSalvar = document.getElementById('btnSalvarSimulacao');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', function() {
            self.salvarSimulacaoContrato();
        });
    }
    
    var btnReverso = document.getElementById('btnCalcularPrecoIdeal');
    if (btnReverso) {
        btnReverso.addEventListener('click', function() {
            self.calcularPrecoIdeal();
        });
    }
};

managerApp.carregarSimuladorContrato = function() {
    var container = document.getElementById('simuladorContratoContainer');
    if (!container) return;
    
    if (container.querySelector('.simulador-contrato-form')) {
        this._atualizarValoresPadraoSimulador();
        return;
    }
    
    this._renderizarSimuladorContrato(container);
    this._atualizarValoresPadraoSimulador();
};

managerApp._atualizarValoresPadraoSimulador = function() {
    var elImposto = document.getElementById('simContratoImposto');
    if (elImposto && this._parametrosOperacionais) {
        elImposto.value = this._parametrosOperacionais.aliquotaImposto || 6;
    }
};

managerApp._renderizarSimuladorContrato = function(container) {
    var painel = this._painelMargemCache || {};
    
    var html = '';
    
    html += '<div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">';
    html += '  <div style="display: flex; align-items: center; gap: 12px;">';
    html += '    <span style="font-size: 32px;">🧪</span>';
    html += '    <div>';
    html += '      <div style="font-size: 16px; font-weight: 700; color: #6d28d9;">Simulador de Contrato</div>';
    html += '      <div style="font-size: 13px; color: var(--gray-600);">';
    html += '        Analise a viabilidade de um novo contrato antes de fechá-lo.';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="simulador-contrato-form">';
    html += '  <div class="card" style="margin-bottom: 20px;">';
    html += '    <div class="card-header">';
    html += '      <span class="card-title">📋 Dados do Contrato Proposto</span>';
    html += '    </div>';
    html += '    <div class="card-body" style="padding: 16px;">';
    
    html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px;">';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label>TIPO DE PLANTÃO</label>';
    html += '          <select class="form-select" id="simContratoPlantao" style="height: 40px;">';
    html += '            <option value="6 Horas">6 Horas</option>';
    html += '            <option value="8 Horas">8 Horas</option>';
    html += '            <option value="12 Horas" selected>12 Horas</option>';
    html += '            <option value="24 Horas">24 Horas</option>';
    html += '            <option value="Especial">Especial</option>';
    html += '          </select>';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label>RECEITA MENSAL (R$)</label>';
    html += '          <input type="text" class="form-input input-currency" id="simContratoReceita" placeholder="0,00" style="height: 40px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label>PLANTÕES POR MÊS</label>';
    html += '          <input type="number" class="form-input" id="simContratoPlantoesMes" value="30" min="1" max="62" style="height: 40px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label>VALOR POR PLANTÃO (R$)</label>';
    html += '          <input type="text" class="form-input input-currency" id="simContratoVlrPlantao" placeholder="0,00" style="height: 40px;">';
    html += '        </div>';
    
    html += '      </div>';
    
    html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label>IMPOSTO (%)</label>';
    html += '          <input type="number" class="form-input" id="simContratoImposto" value="6" step="0.1" min="0" max="30" style="height: 40px;">';
    html += '        </div>';
    
    var despesasOpAtual = painel.despesasOperacionais || 25000;
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label>DESPESAS OP. ATUAIS (R$)</label>';
    html += '          <input type="text" class="form-input" id="simContratoDespesasOp" value="' + Utils.formatCurrency(despesasOpAtual) + '" readonly style="height: 40px; background: var(--gray-100);">';
    html += '        </div>';
    
    var totalClientes = painel.totalClientes || 0;
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label>CONTRATOS ATUAIS</label>';
    html += '          <input type="number" class="form-input" id="simContratoContratosAtuais" value="' + totalClientes + '" readonly style="height: 40px; background: var(--gray-100);">';
    html += '        </div>';
    
    var receitaAtual = painel.somaReceitaClientes || 0;
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label>RECEITA ATUAL (R$)</label>';
    html += '          <input type="text" class="form-input" id="simContratoReceitaAtual" value="' + Utils.formatCurrency(receitaAtual) + '" readonly style="height: 40px; background: var(--gray-100);">';
    html += '        </div>';
    
    html += '      </div>';
    
    html += '      <div style="display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap;">';
    html += '        <button class="btn btn-primary" id="btnSimularContrato" style="flex: 1; min-width: 180px; height: 42px; font-weight: 700;">🧪 Simular Contrato</button>';
    html += '        <button class="btn btn-secondary" id="btnLimparSimulacao" style="flex: 0 0 auto; min-width: 120px; height: 42px;">🔄 Limpar</button>';
    html += '      </div>';
    
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div id="simulacaoResultadoContainer" style="display: none;"></div>';
    
    html += '<div class="card" style="margin-top: 20px; border-left: 4px solid #8b5cf6;">';
    html += '  <div class="card-header" style="background: #f5f3ff;">';
    html += '    <span class="card-title">💡 Calculadora Reversa — Qual preço ideal?</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">';
    html += '      <div class="form-group" style="margin-bottom: 0;">';
    html += '        <label>MARGEM DESEJADA (%)</label>';
    html += '        <input type="number" class="form-input" id="simReversoMargem" value="15" min="1" max="50" step="1" style="height: 40px;">';
    html += '      </div>';
    html += '      <div class="form-group" style="margin-bottom: 0; display: flex; align-items: flex-end;">';
    html += '        <button class="btn" id="btnCalcularPrecoIdeal" style="height: 40px; width: 100%; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; font-weight: 600;">🔄 Calcular Preço Ideal</button>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div id="precoIdealResultado" style="display: none; margin-top: 16px;"></div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
    
    Utils.applyCurrencyMask(document.getElementById('simContratoReceita'));
    Utils.applyCurrencyMask(document.getElementById('simContratoVlrPlantao'));
    
    this._simuladorConfigurado = false;
    this._configurarSimuladorEventos();
};

managerApp.executarSimulacaoContrato = function() {
    var plantao = document.getElementById('simContratoPlantao').value;
    var receita = Utils.parseCurrencyToNumber(document.getElementById('simContratoReceita').value);
    var plantoesMes = parseInt(document.getElementById('simContratoPlantoesMes').value) || 30;
    var vlrPlantao = Utils.parseCurrencyToNumber(document.getElementById('simContratoVlrPlantao').value);
    var aliquotaImposto = parseFloat(document.getElementById('simContratoImposto').value) || 6;
    var despesasOp = Utils.parseCurrencyToNumber(document.getElementById('simContratoDespesasOp').value) || 25000;
    var contratosAtuais = parseInt(document.getElementById('simContratoContratosAtuais').value) || 0;
    var receitaAtual = Utils.parseCurrencyToNumber(document.getElementById('simContratoReceitaAtual').value) || 0;
    
    if (!receita || receita <= 0) {
        Utils.showToast('⚠️ Informe a receita mensal do contrato', 'warning');
        return;
    }
    if (!vlrPlantao || vlrPlantao <= 0) {
        Utils.showToast('⚠️ Informe o valor por plantão', 'warning');
        return;
    }
    if (!plantoesMes || plantoesMes <= 0) {
        Utils.showToast('⚠️ Informe a quantidade de plantões por mês', 'warning');
        return;
    }
    
    var custoPC = plantoesMes * vlrPlantao;
    var impostos = receita * (aliquotaImposto / 100);
    var margemContribuicao = receita - custoPC - impostos;
    var percMargemContribuicao = receita > 0 ? (margemContribuicao / receita) * 100 : 0;
    
    var novaReceitaTotal = receitaAtual + receita;
    var rateioAtual = novaReceitaTotal > 0 ? (receita / novaReceitaTotal) * despesasOp : 0;
    
    var lucroLiquido = margemContribuicao - rateioAtual;
    var percLucroLiquido = receita > 0 ? (lucroLiquido / receita) * 100 : 0;
    
    var classificacao = '', classificacaoCor = '', classificacaoIcone = '', mensagem = '';
    
    if (percLucroLiquido >= 15) {
        classificacao = 'EXCELENTE'; classificacaoCor = '#10b981'; classificacaoIcone = '🟢';
        mensagem = 'Contrato com margem saudável! Recomendamos fechar.';
    } else if (percLucroLiquido >= 10) {
        classificacao = 'BOM'; classificacaoCor = '#10b981'; classificacaoIcone = '🟢';
        mensagem = 'Contrato com margem adequada. Pode fechar.';
    } else if (percLucroLiquido >= 5) {
        classificacao = 'ACEITÁVEL'; classificacaoCor = '#f59e0b'; classificacaoIcone = '🟡';
        mensagem = 'Margem apertada. Aceitável se houver outros benefícios.';
    } else if (percLucroLiquido >= 0) {
        classificacao = 'ATENÇÃO'; classificacaoCor = '#f59e0b'; classificacaoIcone = '🟠';
        mensagem = 'Margem muito baixa. Renegocie o preço ou as condições.';
    } else {
        classificacao = 'RECUSAR'; classificacaoCor = '#dc2626'; classificacaoIcone = '🔴';
        mensagem = 'CONTRATO DEFICITÁRIO! Não feche nestas condições.';
    }
    
    var picoInicialCaixa = receita;
    var fluxoRecorrente = receita - custoPC - impostos;
    
    var rateioAtualPorCliente = contratosAtuais > 0 ? despesasOp / contratosAtuais : 0;
    var novoRateioMedio = (contratosAtuais + 1) > 0 ? despesasOp / (contratosAtuais + 1) : 0;
    var economiaRateioOutros = (rateioAtualPorCliente - novoRateioMedio) * contratosAtuais;
    
    var painel = this._painelMargemCache || {};
    var margemMediaCarteira = painel.percMargemLiquidaMedia || 0;
    var comparacao = percLucroLiquido > margemMediaCarteira ? 'acima' : (percLucroLiquido < margemMediaCarteira ? 'abaixo' : 'igual');
    
    this._simulacaoAtual = {
        parametros: {
            plantao: plantao, receita: receita, plantoesMes: plantoesMes,
            vlrPlantao: vlrPlantao, aliquotaImposto: aliquotaImposto,
            despesasOp: despesasOp, contratosAtuais: contratosAtuais, receitaAtual: receitaAtual
        },
        calculos: {
            custoPC: custoPC, impostos: impostos, margemContribuicao: margemContribuicao,
            percMargemContribuicao: percMargemContribuicao, rateioAtual: rateioAtual,
            lucroLiquido: lucroLiquido, percLucroLiquido: percLucroLiquido,
            classificacao: classificacao, classificacaoCor: classificacaoCor,
            classificacaoIcone: classificacaoIcone, mensagem: mensagem,
            picoInicialCaixa: picoInicialCaixa, fluxoRecorrente: fluxoRecorrente,
            economiaRateioOutros: economiaRateioOutros, comparacaoCarteira: comparacao,
            margemMediaCarteira: margemMediaCarteira
        }
    };
    
    this._renderizarResultadoSimulacao();
};

managerApp._renderizarResultadoSimulacao = function() {
    var container = document.getElementById('simulacaoResultadoContainer');
    if (!container) return;
    
    var sim = this._simulacaoAtual;
    if (!sim) return;
    
    var p = sim.parametros;
    var c = sim.calculos;
    var painel = this._painelMargemCache || {};
    var totalClientesPainel = painel.totalClientes || 0;
    
    container.style.display = 'block';
    
    var html = '';
    
    html += '<div style="background: ' + c.classificacaoCor + '15; border: 2px solid ' + c.classificacaoCor + '; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px;">';
    html += '  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">';
    html += '    <div style="font-size: 48px;">' + c.classificacaoIcone + '</div>';
    html += '    <div style="flex: 1; min-width: 250px;">';
    html += '      <div style="font-size: 12px; font-weight: 600; color: var(--gray-500); letter-spacing: 1px;">VEREDICTO</div>';
    html += '      <div style="font-size: 26px; font-weight: 800; color: ' + c.classificacaoCor + '; margin: 4px 0;">' + c.classificacao + '</div>';
    html += '      <div style="font-size: 14px; color: var(--gray-700);">' + c.mensagem + '</div>';
    html += '    </div>';
    html += '    <div style="background: white; border-radius: 12px; padding: 16px 20px; text-align: center; min-width: 180px;">';
    html += '      <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">MARGEM LÍQUIDA</div>';
    html += '      <div style="font-size: 32px; font-weight: 800; color: ' + c.classificacaoCor + ';">' + c.percLucroLiquido.toFixed(1) + '%</div>';
    html += '      <div style="font-size: 11px; color: var(--gray-400);">' + Utils.formatCurrency(c.lucroLiquido) + '/mês</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="card" style="margin-bottom: 20px;">';
    html += '  <div class="card-header"><span class="card-title">💰 Detalhamento Financeiro Mensal</span></div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px;">';
    html += '      <div style="background: #eff6ff; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #3b82f6;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">💵 Receita</div>';
    html += '        <div style="font-size: 18px; font-weight: 700; color: #2563eb;">' + Utils.formatCurrency(p.receita) + '</div>';
    html += '      </div>';
    html += '      <div style="background: #fef2f2; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #dc2626;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">👥 Custo PC</div>';
    html += '        <div style="font-size: 18px; font-weight: 700; color: #dc2626;">' + Utils.formatCurrency(c.custoPC) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">' + p.plantoesMes + ' plantões × ' + Utils.formatCurrency(p.vlrPlantao) + '</div>';
    html += '      </div>';
    html += '      <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #f59e0b;">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">📊 Impostos</div>';
    html += '        <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">' + Utils.formatCurrency(c.impostos) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">' + p.aliquotaImposto + '%</div>';
    html += '      </div>';
    
    var corMC = c.percMargemContribuicao >= 20 ? '#10b981' : (c.percMargemContribuicao >= 10 ? '#f59e0b' : '#dc2626');
    html += '      <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ' + corMC + ';">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">📈 Margem Contrib.</div>';
    html += '        <div style="font-size: 18px; font-weight: 700; color: ' + corMC + ';">' + Utils.formatCurrency(c.margemContribuicao) + '</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">' + c.percMargemContribuicao.toFixed(1) + '%</div>';
    html += '      </div>';
    html += '    </div>';
    
    html += '    <div style="background: var(--gray-50); border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">';
    html += '      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
    html += '        <div style="font-size: 13px; color: var(--gray-600);">';
    html += '          <strong>Rateio Operacional</strong> — este contrato absorve <strong>' + ((c.rateioAtual / (p.despesasOp || 1)) * 100).toFixed(1) + '%</strong> das despesas operacionais';
    html += '        </div>';
    html += '        <div style="font-size: 16px; font-weight: 700; color: #dc2626;">-' + Utils.formatCurrency(c.rateioAtual) + '</div>';
    html += '      </div>';
    html += '    </div>';
    
    html += '    <div style="background: ' + c.classificacaoCor + '15; border-radius: 8px; padding: 16px; border-left: 4px solid ' + c.classificacaoCor + ';">';
    html += '      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
    html += '        <div style="font-size: 14px; font-weight: 700; color: var(--gray-700);">🎯 LUCRO LÍQUIDO MENSAL</div>';
    html += '        <div style="font-size: 22px; font-weight: 800; color: ' + c.classificacaoCor + ';">' + Utils.formatCurrency(c.lucroLiquido) + ' <span style="font-size: 14px;">(' + c.percLucroLiquido.toFixed(1) + '%)</span></div>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="card" style="margin-bottom: 20px; border-left: 4px solid #0ea5e9;">';
    html += '  <div class="card-header" style="background: #f0f9ff;">';
    html += '    <span class="card-title">💧 Impacto no Fluxo de Caixa</span>';
    html += '    <span style="font-size: 11px; color: var(--gray-500);">Considera lag de 30 dias no pagamento do PC</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">';
    html += '      <div style="background: #f0f9ff; border-radius: 8px; padding: 14px; border-left: 3px solid #0ea5e9;">';
    html += '        <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">🌅 PICO INICIAL (MÊS 1)</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #0ea5e9; margin: 4px 0;">+' + Utils.formatCurrency(c.picoInicialCaixa) + '</div>';
    html += '        <div style="font-size: 11px; color: var(--gray-500);">Você recebe antes de pagar o PC</div>';
    html += '      </div>';
    html += '      <div style="background: #f0fdf4; border-radius: 8px; padding: 14px; border-left: 3px solid #10b981;">';
    html += '        <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">🔄 FLUXO RECORRENTE (MÊS 2+)</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: #10b981; margin: 4px 0;">+' + Utils.formatCurrency(c.fluxoRecorrente) + '/mês</div>';
    html += '        <div style="font-size: 11px; color: var(--gray-500);">Receita - Custo PC - Impostos</div>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="card" style="margin-bottom: 20px; border-left: 4px solid #8b5cf6;">';
    html += '  <div class="card-header" style="background: #f5f3ff;">';
    html += '    <span class="card-title">📊 Comparação com a Carteira Atual</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    
    var comparacaoCor = c.comparacaoCarteira === 'acima' ? '#10b981' : (c.comparacaoCarteira === 'abaixo' ? '#dc2626' : '#f59e0b');
    var comparacaoIcone = c.comparacaoCarteira === 'acima' ? '✅' : (c.comparacaoCarteira === 'abaixo' ? '⚠️' : '➖');
    var comparacaoTexto = c.comparacaoCarteira === 'acima' ? 'ACIMA DA MÉDIA' : (c.comparacaoCarteira === 'abaixo' ? 'ABAIXO DA MÉDIA' : 'NA MÉDIA');
    
    html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">';
    html += '      <div style="text-align: center; padding: 12px;">';
    html += '        <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">MÉDIA DA CARTEIRA</div>';
    html += '        <div style="font-size: 24px; font-weight: 700; color: var(--gray-700); margin: 4px 0;">' + c.margemMediaCarteira.toFixed(1) + '%</div>';
    html += '        <div style="font-size: 11px; color: var(--gray-400);">' + totalClientesPainel + ' contratos ativos</div>';
    html += '      </div>';
    html += '      <div style="text-align: center; padding: 12px; background: ' + comparacaoCor + '15; border-radius: 8px;">';
    html += '        <div style="font-size: 11px; color: var(--gray-500); font-weight: 600;">ESTE CONTRATO</div>';
    html += '        <div style="font-size: 24px; font-weight: 700; color: ' + comparacaoCor + '; margin: 4px 0;">' + c.percLucroLiquido.toFixed(1) + '%</div>';
    html += '        <div style="font-size: 11px; color: ' + comparacaoCor + '; font-weight: 600;">' + comparacaoIcone + ' ' + comparacaoTexto + '</div>';
    html += '      </div>';
    html += '    </div>';
    
    if (c.economiaRateioOutros && c.economiaRateioOutros > 0) {
        html += '    <div style="margin-top: 12px; background: #f0fdf4; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #10b981;">';
        html += '      <div style="font-size: 13px; color: var(--gray-700);">';
        html += '        💡 <strong>Bônus de diluição:</strong> ao fechar este contrato, o rateio operacional dos outros ' + totalClientesPainel + ' contratos cai. ';
        html += '        Economia total: <strong>' + Utils.formatCurrency(c.economiaRateioOutros) + '/mês</strong>.';
        html += '      </div>';
        html += '    </div>';
    }
    
    html += '  </div>';
    html += '</div>';
    
    html += '<div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end;">';
    html += '  <button class="btn btn-secondary" id="btnSalvarSimulacao" style="height: 42px;">💾 Salvar Simulação</button>';
    html += '  <button class="btn btn-secondary" id="btnLimparSimulacao" style="height: 42px;">🔄 Nova Simulação</button>';
    html += '</div>';
    
    container.innerHTML = html;
    
    this._simuladorConfigurado = false;
    this._configurarSimuladorEventos();
    
    setTimeout(function() {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
};

managerApp.limparSimulacaoContrato = function() {
    var container = document.getElementById('simulacaoResultadoContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    
    var receitaEl = document.getElementById('simContratoReceita');
    if (receitaEl) receitaEl.value = '';
    
    var vlrEl = document.getElementById('simContratoVlrPlantao');
    if (vlrEl) vlrEl.value = '';
    
    var precoIdealEl = document.getElementById('precoIdealResultado');
    if (precoIdealEl) {
        precoIdealEl.style.display = 'none';
        precoIdealEl.innerHTML = '';
    }
    
    this._simulacaoAtual = null;
    Utils.showToast('🔄 Simulação limpa', 'info');
};

managerApp.salvarSimulacaoContrato = function() {
    if (!this._simulacaoAtual) {
        Utils.showToast('⚠️ Nenhuma simulação para salvar', 'warning');
        return;
    }
    
    var nome = prompt('Digite um nome para esta simulação:', 'Simulação ' + (this._simulacoesSalvas.length + 1));
    if (!nome) return;
    
    var sim = JSON.parse(JSON.stringify(this._simulacaoAtual));
    sim.nome = nome;
    sim.data = new Date().toISOString();
    
    this._simulacoesSalvas.push(sim);
    localStorage.setItem('manager_simulacoes_salvas', JSON.stringify(this._simulacoesSalvas));
    
    Utils.showToast('💾 Simulação "' + nome + '" salva localmente', 'success');
};

managerApp.calcularPrecoIdeal = function() {
    var plantoesMes = parseInt(document.getElementById('simContratoPlantoesMes').value) || 30;
    var vlrPlantao = Utils.parseCurrencyToNumber(document.getElementById('simContratoVlrPlantao').value);
    var aliquotaImposto = parseFloat(document.getElementById('simContratoImposto').value) || 6;
    var despesasOp = Utils.parseCurrencyToNumber(document.getElementById('simContratoDespesasOp').value) || 25000;
    var contratosAtuais = parseInt(document.getElementById('simContratoContratosAtuais').value) || 0;
    var receitaAtual = Utils.parseCurrencyToNumber(document.getElementById('simContratoReceitaAtual').value) || 0;
    var margemDesejada = parseFloat(document.getElementById('simReversoMargem').value) || 15;
    
    if (!vlrPlantao || vlrPlantao <= 0) {
        Utils.showToast('⚠️ Informe o valor por plantão primeiro', 'warning');
        return;
    }
    
    var custoPC = plantoesMes * vlrPlantao;
    var margemDecimal = margemDesejada / 100;
    
    var rateioEstimado = despesasOp / (contratosAtuais + 1);
    var receitaNecessaria = (custoPC + rateioEstimado) / (1 - margemDecimal - (aliquotaImposto / 100));
    
    for (var iter = 0; iter < 5; iter++) {
        var novaReceitaTotal = receitaAtual + receitaNecessaria;
        var rateioCorreto = novaReceitaTotal > 0 ? (receitaNecessaria / novaReceitaTotal) * despesasOp : 0;
        receitaNecessaria = (custoPC + rateioCorreto) / (1 - margemDecimal - (aliquotaImposto / 100));
    }
    
    receitaNecessaria = Math.ceil(receitaNecessaria / 10) * 10;
    
    if (isNaN(receitaNecessaria) || receitaNecessaria <= 0 || !isFinite(receitaNecessaria)) {
        Utils.showToast('⚠️ Não foi possível calcular. Verifique os dados.', 'warning');
        return;
    }
    
    var cenarios = [
        { nome: 'ACEITÁVEL (5%)', margem: 5, cor: '#f59e0b' },
        { nome: 'BOM (10%)', margem: 10, cor: '#10b981' },
        { nome: 'IDEAL (15%)', margem: 15, cor: '#10b981' },
        { nome: 'EXCELENTE (20%)', margem: 20, cor: '#0d9488' }
    ];
    
    var precosPorMargem = [];
    cenarios.forEach(function(cen) {
        var rateioEst = despesasOp / (contratosAtuais + 1);
        var rec = (custoPC + rateioEst) / (1 - (cen.margem / 100) - (aliquotaImposto / 100));
        
        for (var it = 0; it < 5; it++) {
            var recTotal = receitaAtual + rec;
            var rateioReal = recTotal > 0 ? (rec / recTotal) * despesasOp : 0;
            rec = (custoPC + rateioReal) / (1 - (cen.margem / 100) - (aliquotaImposto / 100));
        }
        
        rec = Math.ceil(rec / 10) * 10;
        
        if (isFinite(rec) && rec > 0) {
            precosPorMargem.push({
                nome: cen.nome, margem: cen.margem, cor: cen.cor, receita: rec
            });
        }
    });
    
    var container = document.getElementById('precoIdealResultado');
    if (!container) return;
    
    container.style.display = 'block';
    
    var html = '';
    
    html += '<div style="background: linear-gradient(135deg, #8b5cf6 15%, #ede9fe 100%); border: 2px solid #8b5cf6; border-radius: 16px; padding: 20px; margin-bottom: 16px;">';
    html += '  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">';
    html += '    <div>';
    html += '      <div style="font-size: 12px; color: #6d28d9; font-weight: 600; letter-spacing: 0.5px;">💡 RECEITA IDEAL PARA MARGEM DE ' + margemDesejada + '%</div>';
    html += '      <div style="font-size: 32px; font-weight: 800; color: #6d28d9; margin-top: 4px;">' + Utils.formatCurrency(receitaNecessaria) + '/mês</div>';
    html += '    </div>';
    html += '    <button class="btn btn-primary" onclick="document.getElementById(\'simContratoReceita\').value = \'' + Utils.formatCurrency(receitaNecessaria) + '\'; document.getElementById(\'btnSimularContrato\').click();" style="height: 42px; padding: 0 20px; background: #6d28d9; border: none;">📊 Simular com este valor</button>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div style="font-size: 13px; font-weight: 600; color: var(--gray-600); margin-bottom: 12px;">📊 Preços por nível de margem:</div>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">';
    
    precosPorMargem.forEach(function(preco) {
        html += '<div style="background: white; border: 2px solid ' + preco.cor + '; border-radius: 8px; padding: 12px 16px; text-align: center;">';
        html += '  <div style="font-size: 11px; color: ' + preco.cor + '; font-weight: 700;">' + preco.nome + '</div>';
        html += '  <div style="font-size: 20px; font-weight: 800; color: var(--gray-800); margin: 4px 0;">' + Utils.formatCurrency(preco.receita) + '</div>';
        html += '  <div style="font-size: 10px; color: var(--gray-500);">Receita mensal</div>';
        html += '</div>';
    });
    
    html += '</div>';
    
    container.innerHTML = html;
};

console.log('✅ Parte 2 de 6 carregada');
// =============================================
// 📈 FASE 3 - PROJEÇÃO DE CENÁRIOS (MOTOR)
// =============================================

managerApp._configurarProjecaoEventos = function() {
    var self = this;
    
    if (this._projecaoConfigurada) return;
    this._projecaoConfigurada = true;
    
    var btnProjetar = document.getElementById('btnProjetarCenario');
    if (btnProjetar) {
        btnProjetar.addEventListener('click', function() {
            self.executarProjecao();
        });
    }
    
    var btnLimpar = document.getElementById('btnLimparProjecao');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            self.limparProjecao();
        });
    }
    
    var botoesCenario = document.querySelectorAll('[data-cenario-projecao]');
    botoesCenario.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tipo = this.getAttribute('data-cenario-projecao');
            self.aplicarCenarioProjecao(tipo);
        });
    });
};

managerApp.carregarProjecaoCenarios = function() {
    var container = document.getElementById('projecaoCenariosContainer');
    if (!container) return;
    
    if (container.querySelector('.projecao-form')) {
        this._atualizarValoresPadraoProjecao();
        return;
    }
    
    this._renderizarFormularioProjecao(container);
    this._atualizarValoresPadraoProjecao();
};

managerApp._renderizarFormularioProjecao = function(container) {
    var painel = this._painelMargemCache || {};
    
    var baseAtual = painel.totalClientes || 0;
    var receitaAtual = painel.somaReceitaClientes || 0;
    var custoPCAtual = painel.somaCustoPCClientes || 0;
    var ticketMedioAtual = baseAtual > 0 ? receitaAtual / baseAtual : 0;
    var percCustoPC = receitaAtual > 0 ? (custoPCAtual / receitaAtual) * 100 : 0;
    var despesasOp = painel.despesasOperacionais || 25000;
    var aliquotaImposto = this._parametrosOperacionais.aliquotaImposto || 6;
    
    var html = '';
    
    html += '<div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">';
    html += '  <div style="display: flex; align-items: center; gap: 12px;">';
    html += '    <span style="font-size: 32px;">📈</span>';
    html += '    <div>';
    html += '      <div style="font-size: 16px; font-weight: 700; color: #1e40af;">Projeção de Cenários — 12 Meses</div>';
    html += '      <div style="font-size: 13px; color: var(--gray-600);">';
    html += '        Simule o futuro da sua carteira considerando churn, novos contratos e reajustes.';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="projecao-form">';
    html += '  <div class="card" style="margin-bottom: 20px;">';
    html += '    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
    html += '      <span class="card-title">⚙️ Premissas da Projeção</span>';
    html += '      <div style="display: flex; gap: 6px; flex-wrap: wrap;">';
    html += '        <button class="btn btn-sm" data-cenario-projecao="otimista" style="height: 28px; background: #10b981; color: white; font-size: 11px;">🟢 Otimista</button>';
    html += '        <button class="btn btn-sm" data-cenario-projecao="realista" style="height: 28px; background: #0d9488; color: white; font-size: 11px;">🟡 Realista</button>';
    html += '        <button class="btn btn-sm" data-cenario-projecao="pessimista" style="height: 28px; background: #f59e0b; color: white; font-size: 11px;">🔴 Pessimista</button>';
    html += '        <button class="btn btn-sm" data-cenario-projecao="extremo" style="height: 28px; background: #dc2626; color: white; font-size: 11px;">⚫ Extremo</button>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="card-body" style="padding: 16px;">';
    
    html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 12px;">';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">BASE ATUAL (CONTRATOS)</label>';
    html += '          <input type="number" class="form-input" id="projBaseAtual" value="' + baseAtual + '" readonly style="height: 36px; background: var(--gray-100); font-size: 13px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">CHURN MENSAL</label>';
    html += '          <input type="number" class="form-input" id="projChurn" value="0.3" step="0.1" min="0" max="5" style="height: 36px; font-size: 13px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">NOVOS CONTRATOS/MÊS</label>';
    html += '          <input type="number" class="form-input" id="projNovosContratos" value="1" step="0.5" min="0" max="10" style="height: 36px; font-size: 13px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">TICKET ATUAL (R$)</label>';
    html += '          <input type="text" class="form-input" id="projTicketAtual" value="' + Utils.formatCurrency(ticketMedioAtual) + '" readonly style="height: 36px; background: var(--gray-100); font-size: 13px;">';
    html += '        </div>';
    
    html += '      </div>';
    
    html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 12px;">';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">TICKET NOVOS (R$)</label>';
    html += '          <input type="text" class="form-input input-currency" id="projTicketNovos" style="height: 36px; font-size: 13px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">% CUSTO PC</label>';
    html += '          <input type="number" class="form-input" id="projPercCustoPC" value="' + percCustoPC.toFixed(1) + '" step="0.1" min="0" max="100" style="height: 36px; font-size: 13px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">DESPESAS OP. (R$)</label>';
    html += '          <input type="text" class="form-input input-currency" id="projDespesasOp" value="' + Utils.formatCurrency(despesasOp) + '" style="height: 36px; font-size: 13px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">IMPOSTO (%)</label>';
    html += '          <input type="number" class="form-input" id="projImposto" value="' + aliquotaImposto + '" step="0.1" min="0" max="30" style="height: 36px; font-size: 13px;">';
    html += '        </div>';
    
    html += '      </div>';
    
    html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">REAJUSTE ANUAL (%)</label>';
    html += '          <input type="number" class="form-input" id="projReajuste" value="7" step="0.5" min="0" max="30" style="height: 36px; font-size: 13px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">MÊS DO REAJUSTE</label>';
    html += '          <input type="number" class="form-input" id="projMesReajuste" value="12" min="1" max="12" style="height: 36px; font-size: 13px;">';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0;">';
    html += '          <label style="font-size: 10px;">HORIZONTE</label>';
    html += '          <select class="form-select" id="projHorizonte" style="height: 36px; font-size: 13px;">';
    html += '            <option value="6">6 meses</option>';
    html += '            <option value="12" selected>12 meses</option>';
    html += '            <option value="18">18 meses</option>';
    html += '            <option value="24">24 meses</option>';
    html += '          </select>';
    html += '        </div>';
    
    html += '        <div class="form-group" style="margin-bottom: 0; display: flex; align-items: flex-end;">';
    html += '          <button class="btn btn-primary" id="btnProjetarCenario" style="height: 36px; width: 100%; font-weight: 700; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);">📊 Projetar Cenário</button>';
    html += '        </div>';
    
    html += '      </div>';
    
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div id="projecaoResultadoContainer" style="display: none;"></div>';
    
    container.innerHTML = html;
    
    Utils.applyCurrencyMask(document.getElementById('projTicketNovos'));
    Utils.applyCurrencyMask(document.getElementById('projDespesasOp'));
    
    this._projecaoConfigurada = false;
    this._configurarProjecaoEventos();
    
    var self = this;
    var camposPremissas = ['projChurn', 'projNovosContratos', 'projTicketNovos', 'projReajuste', 'projMesReajuste', 'projHorizonte'];
    
    camposPremissas.forEach(function(campoId) {
        var el = document.getElementById(campoId);
        if (el) {
            el.addEventListener('input', function() {
                if (self._cenarioProjecaoSelecionado && self._cenarioProjecaoSelecionado !== 'personalizado') {
                    self._cenarioProjecaoSelecionado = 'personalizado';
                    localStorage.setItem('manager_projecao_cenario', 'personalizado');
                    self._atualizarBotoesCenario('personalizado');
                }
            });
        }
    });
    
    var cenarioSalvo = localStorage.getItem('manager_projecao_cenario');
    if (cenarioSalvo && cenarioSalvo !== 'personalizado') {
        setTimeout(function() {
            self._cenarioProjecaoSelecionado = cenarioSalvo;
            self._atualizarBotoesCenario(cenarioSalvo);
        }, 100);
    }
};

managerApp._atualizarValoresPadraoProjecao = function() {
    var painel = this._painelMargemCache || {};
    
    var elBase = document.getElementById('projBaseAtual');
    if (elBase) elBase.value = painel.totalClientes || 0;
    
    var elTicketAtual = document.getElementById('projTicketAtual');
    if (elTicketAtual) {
        var ticket = painel.totalClientes > 0 ? painel.somaReceitaClientes / painel.totalClientes : 0;
        elTicketAtual.value = Utils.formatCurrency(ticket);
    }
    
    var elPercCusto = document.getElementById('projPercCustoPC');
    if (elPercCusto) {
        var perc = painel.somaReceitaClientes > 0 
            ? (painel.somaCustoPCClientes / painel.somaReceitaClientes) * 100 
            : 0;
        elPercCusto.value = perc.toFixed(1);
    }
    
    var elDespesas = document.getElementById('projDespesasOp');
    if (elDespesas && this._parametrosOperacionais) {
        elDespesas.value = Utils.formatCurrency(this._parametrosOperacionais.despesasOperacionais || 25000);
    }
    
    var elImposto = document.getElementById('projImposto');
    if (elImposto && this._parametrosOperacionais) {
        elImposto.value = this._parametrosOperacionais.aliquotaImposto || 6;
    }
    
    var elTicketNovos = document.getElementById('projTicketNovos');
    if (elTicketNovos && !elTicketNovos.value) {
        elTicketNovos.value = Utils.formatCurrency(5500);
    }
};

managerApp.aplicarCenarioProjecao = function(tipo) {
    var self = this;
    
    var cenarios = {
        otimista: { churn: 0.2, novosContratos: 2, ticketNovos: 6000, reajuste: 8 },
        realista: { churn: 0.3, novosContratos: 1, ticketNovos: 5500, reajuste: 7 },
        pessimista: { churn: 0.5, novosContratos: 0.5, ticketNovos: 5000, reajuste: 5 },
        extremo: { churn: 1, novosContratos: 0, ticketNovos: 5000, reajuste: 0 }
    };
    
    var cen = cenarios[tipo];
    if (!cen) return;
    
    var elChurn = document.getElementById('projChurn');
    if (elChurn) elChurn.value = cen.churn;
    
    var elNovos = document.getElementById('projNovosContratos');
    if (elNovos) elNovos.value = cen.novosContratos;
    
    var elTicketNovos = document.getElementById('projTicketNovos');
    if (elTicketNovos) elTicketNovos.value = Utils.formatCurrency(cen.ticketNovos);
    
    var elReajuste = document.getElementById('projReajuste');
    if (elReajuste) elReajuste.value = cen.reajuste;
    
    this._cenarioProjecaoSelecionado = tipo;
    localStorage.setItem('manager_projecao_cenario', tipo);
    
    self._atualizarBotoesCenario(tipo);
    
    var nomes = {
        otimista: '🟢 Otimista',
        realista: '🟡 Realista',
        pessimista: '🔴 Pessimista',
        extremo: '⚫ Extremo'
    };
    
    Utils.showToast(nomes[tipo] + ' carregado', 'info');
};

managerApp._atualizarBotoesCenario = function(tipoSelecionado) {
    var botoes = document.querySelectorAll('[data-cenario-projecao]');
    
    var cores = {
        otimista: '#10b981',
        realista: '#0d9488',
        pessimista: '#f59e0b',
        extremo: '#dc2626'
    };
    
    botoes.forEach(function(btn) {
        var tipo = btn.getAttribute('data-cenario-projecao');
        
        if (tipo === tipoSelecionado) {
            btn.style.background = cores[tipo];
            btn.style.color = 'white';
            btn.style.border = '2px solid ' + cores[tipo];
            btn.style.boxShadow = '0 0 0 3px ' + cores[tipo] + '40';
            btn.style.fontWeight = '700';
            btn.style.transform = 'scale(1.05)';
            btn.style.opacity = '1';
            btn.innerHTML = btn.innerHTML.replace(' ✓', '') + ' ✓';
        } else {
            btn.style.background = 'white';
            btn.style.color = cores[tipo];
            btn.style.border = '1px solid ' + cores[tipo];
            btn.style.boxShadow = 'none';
            btn.style.fontWeight = '600';
            btn.style.transform = 'scale(1)';
            btn.style.opacity = '0.6';
            btn.innerHTML = btn.innerHTML.replace(' ✓', '');
        }
    });
};

managerApp.executarProjecao = function() {
    var baseAtual = parseInt(document.getElementById('projBaseAtual').value) || 0;
    var churn = parseFloat(document.getElementById('projChurn').value) || 0;
    var novosContratos = parseFloat(document.getElementById('projNovosContratos').value) || 0;
    var ticketAtual = Utils.parseCurrencyToNumber(document.getElementById('projTicketAtual').value) || 0;
    var ticketNovos = Utils.parseCurrencyToNumber(document.getElementById('projTicketNovos').value) || 0;
    var percCustoPC = parseFloat(document.getElementById('projPercCustoPC').value) || 0;
    var despesasOp = Utils.parseCurrencyToNumber(document.getElementById('projDespesasOp').value) || 0;
    var aliquotaImposto = parseFloat(document.getElementById('projImposto').value) || 0;
    var reajusteAnual = parseFloat(document.getElementById('projReajuste').value) || 0;
    var mesReajuste = parseInt(document.getElementById('projMesReajuste').value) || 12;
    var horizonte = parseInt(document.getElementById('projHorizonte').value) || 12;
    
    if (baseAtual <= 0) {
        Utils.showToast('⚠️ Base atual deve ser maior que zero', 'warning');
        return;
    }
    if (ticketAtual <= 0) {
        Utils.showToast('⚠️ Ticket atual deve ser maior que zero', 'warning');
        return;
    }
    if (ticketNovos <= 0) {
        Utils.showToast('⚠️ Ticket de novos contratos deve ser maior que zero', 'warning');
        return;
    }
    
    var projecao = [];
    var contratosAtual = baseAtual;
    var ticketMedioAtual = ticketAtual;
    var despesasOpAtual = despesasOp;
    var saldoAcumulado = 0;
    var inicio = new Date();
    
    for (var m = 1; m <= horizonte; m++) {
        var dataMes = new Date(inicio.getFullYear(), inicio.getMonth() + m, 1);
        var mes = dataMes.getMonth() + 1;
        var ano = dataMes.getFullYear();
        
        if (m === mesReajuste) {
            ticketMedioAtual = ticketMedioAtual * (1 + reajusteAnual / 100);
            console.log('💰 Reajuste aplicado no mês ' + m + ': novo ticket R$ ' + ticketMedioAtual.toFixed(2));
        }
        
        var contratosPerdidos = churn;
        var contratosGanhos = novosContratos;
        var contratosAnteriores = contratosAtual;
        
        contratosAtual = contratosAtual - contratosPerdidos + contratosGanhos;
        if (contratosAtual < 0) contratosAtual = 0;
        
        var receitaBase = contratosAnteriores * ticketMedioAtual;
        var receitaNovos = contratosGanhos * ticketNovos;
        var receita = receitaBase + receitaNovos;
        
        var custoPC = receita * (percCustoPC / 100);
        var impostos = receita * (aliquotaImposto / 100);
        var margemContribuicao = receita - custoPC - impostos;
        var resultado = margemContribuicao - despesasOpAtual;
        
        saldoAcumulado += resultado;
        
        var percMargem = receita > 0 ? (resultado / receita) * 100 : 0;
        
        projecao.push({
            mes: mes, ano: ano, mesNumero: m,
            contratos: contratosAtual,
            contratosPerdidos: contratosPerdidos,
            contratosGanhos: contratosGanhos,
            receita: receita, custoPC: custoPC, impostos: impostos,
            margemContribuicao: margemContribuicao,
            despesasOp: despesasOpAtual,
            resultado: resultado, saldoAcumulado: saldoAcumulado,
            percMargem: percMargem, ticketMedio: ticketMedioAtual
        });
    }
    
    var ultimoMes = projecao[projecao.length - 1];
    var somaReceita = projecao.reduce(function(s, p) { return s + p.receita; }, 0);
    var somaResultado = projecao.reduce(function(s, p) { return s + p.resultado; }, 0);
    var somaMargemContribuicao = projecao.reduce(function(s, p) { return s + p.margemContribuicao; }, 0);
    var margemMedia = somaReceita > 0 ? (somaResultado / somaReceita) * 100 : 0;
    
    var mesLucroPositivo = null;
    for (var i = 0; i < projecao.length; i++) {
        if (projecao[i].resultado >= 0 && mesLucroPositivo === null) {
            mesLucroPositivo = projecao[i].mesNumero;
        }
    }
    
    this._projecaoAtual = {
        premissas: {
            baseAtual: baseAtual, churn: churn, novosContratos: novosContratos,
            ticketAtual: ticketAtual, ticketNovos: ticketNovos,
            percCustoPC: percCustoPC, despesasOp: despesasOp,
            aliquotaImposto: aliquotaImposto, reajusteAnual: reajusteAnual,
            mesReajuste: mesReajuste, horizonte: horizonte
        },
        projecao: projecao,
        resumo: {
            contratosFinais: ultimoMes.contratos,
            contratosIniciais: baseAtual,
            variacaoContratos: ultimoMes.contratos - baseAtual,
            percVariacaoContratos: baseAtual > 0 ? ((ultimoMes.contratos - baseAtual) / baseAtual) * 100 : 0,
            somaReceita: somaReceita,
            somaResultado: somaResultado,
            somaMargemContribuicao: somaMargemContribuicao,
            margemMedia: margemMedia,
            saldoFinal: ultimoMes.saldoAcumulado,
            mesLucroPositivo: mesLucroPositivo
        }
    };
    
    this._renderizarResultadoProjecao();
};

managerApp._renderizarResultadoProjecao = function() {
    var self = this;
    
    var container = document.getElementById('projecaoResultadoContainer');
    if (!container) return;
    
    var dados = this._projecaoAtual;
    if (!dados) return;
    
    var p = dados.premissas;
    var resumo = dados.resumo;
    var projecao = dados.projecao;
    
    container.style.display = 'block';
    
    var html = '';
    
    var nomesCenario = {
        otimista: { label: '🟢 Otimista', cor: '#10b981', desc: 'Crescimento agressivo' },
        realista: { label: '🟡 Realista', cor: '#0d9488', desc: 'Cenário esperado' },
        pessimista: { label: '🔴 Pessimista', cor: '#f59e0b', desc: 'Cenário adverso' },
        extremo: { label: '⚫ Extremo', cor: '#dc2626', desc: 'Pior cenário' },
        personalizado: { label: '🎯 Personalizado', cor: '#8b5cf6', desc: 'Premissas ajustadas' }
    };
    
    var cenarioSelecionado = this._cenarioProjecaoSelecionado || 'personalizado';
    var infoCenario = nomesCenario[cenarioSelecionado] || nomesCenario.personalizado;
    
    html += '<div style="background: ' + infoCenario.cor + '15; border-left: 4px solid ' + infoCenario.cor + '; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
    html += '  <div style="display: flex; align-items: center; gap: 10px;">';
    html += '    <span style="font-size: 20px;">📊</span>';
    html += '    <div>';
    html += '      <div style="font-size: 14px; font-weight: 700; color: ' + infoCenario.cor + ';">Cenário: ' + infoCenario.label + '</div>';
    html += '      <div style="font-size: 12px; color: var(--gray-600);">' + infoCenario.desc + '</div>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div style="font-size: 11px; color: var(--gray-500);">';
    html += '    Churn: ' + p.churn + ' | Novos: ' + p.novosContratos + '/mês | Reajuste: ' + p.reajusteAnual + '%';
    html += '  </div>';
    html += '</div>';
    
    var corContratos = resumo.variacaoContratos >= 0 ? '#10b981' : '#dc2626';
    var corResultado = resumo.somaResultado >= 0 ? '#10b981' : '#dc2626';
    
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">👥</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 18px; font-weight: 700; color: #2563eb;">' + resumo.contratosFinais.toFixed(1) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">CONTRATOS FINAIS</div>';
    html += '    <div style="font-size: 10px; color: ' + corContratos + ';">' + (resumo.variacaoContratos >= 0 ? '📈 +' : '📉 ') + resumo.variacaoContratos.toFixed(1) + ' (' + resumo.percVariacaoContratos.toFixed(0) + '%)</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px;">';
    html += '  <div class="stat-icon green" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 14px; font-weight: 700; color: #10b981;">' + Utils.formatCurrency(resumo.somaReceita) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">RECEITA TOTAL ' + p.horizonte + 'M</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Soma dos meses</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px; border-left: 3px solid ' + corResultado + ';">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">🎯</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 14px; font-weight: 700; color: ' + corResultado + ';">' + Utils.formatCurrency(resumo.somaResultado) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">LUCRO TOTAL ' + p.horizonte + 'M</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Acumulado</div>';
    html += '  </div>';
    html += '</div>';
    
    var corMargem = resumo.margemMedia >= 10 ? '#10b981' : (resumo.margemMedia >= 5 ? '#f59e0b' : '#dc2626');
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px;">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 18px; font-weight: 700; color: ' + corMargem + ';">' + resumo.margemMedia.toFixed(1) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">MARGEM MÉDIA</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">No período</div>';
    html += '  </div>';
    html += '</div>';
    
    var corSaldo = resumo.saldoFinal >= 0 ? '#10b981' : '#dc2626';
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px;">';
    html += '  <div class="stat-icon teal" style="width: 36px; height: 36px; font-size: 16px;">💧</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 14px; font-weight: 700; color: ' + corSaldo + ';">' + Utils.formatCurrency(resumo.saldoFinal) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">SALDO FINAL</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Acumulado</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    html += '<div class="chart-card" style="margin-bottom: 20px;">';
    html += '  <div class="chart-header">';
    html += '    <h3>📈 Evolução da Projeção — Contratos, Lucro e Saldo</h3>';
    html += '  </div>';
    html += '  <div class="chart-body">';
    html += '    <div class="chart-canvas-wrapper" style="height: 340px;">';
    html += '      <canvas id="chartProjecaoCenarios"></canvas>';
    html += '    </div>';
    html += '    <div class="chart-legend">';
    html += '      <div class="chart-legend-item"><div class="chart-legend-color" style="background: #3b82f6;"></div><span>Contratos</span></div>';
    html += '      <div class="chart-legend-item"><div class="chart-legend-color" style="background: #10b981;"></div><span>Lucro Mensal</span></div>';
    html += '      <div class="chart-legend-item"><div class="chart-legend-color" style="background: #8b5cf6;"></div><span>Saldo Acumulado</span></div>';
    html += '      <div class="chart-legend-item"><div class="chart-legend-color" style="background: #f59e0b; border: 2px dashed #f59e0b;"></div><span>Linha do Zero</span></div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="card" style="margin-bottom: 20px;">';
    html += '  <div class="card-header">';
    html += '    <span class="card-title">📋 Projeção Detalhada Mês a Mês</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 16px;">';
    html += '    <div class="data-table-wrapper">';
    html += '      <table class="data-table" style="font-size: 12px;">';
    html += '        <thead>';
    html += '          <tr>';
    html += '            <th>Mês</th>';
    html += '            <th class="text-right">Contratos</th>';
    html += '            <th class="text-right">Receita</th>';
    html += '            <th class="text-right">Custo PC</th>';
    html += '            <th class="text-right">Impostos</th>';
    html += '            <th class="text-right">Desp. Op.</th>';
    html += '            <th class="text-right">Lucro</th>';
    html += '            <th class="text-right">Saldo Acum.</th>';
    html += '            <th class="text-right">%</th>';
    html += '          </tr>';
    html += '        </thead>';
    html += '        <tbody>';
    
    var mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (var i = 0; i < projecao.length; i++) {
        var proj = projecao[i];
        var label = mesesAbrev[proj.mes - 1] + '/' + String(proj.ano).slice(2);
        
        var isReajuste = proj.mesNumero === p.mesReajuste;
        var rowBg = isReajuste ? 'background: #fef3c7;' : (proj.resultado < 0 ? 'background: #fef2f2;' : '');
        
        var corLucro = proj.resultado >= 0 ? '#10b981' : '#dc2626';
        var corSaldo = proj.saldoAcumulado >= 0 ? '#10b981' : '#dc2626';
        var corMargem2 = proj.percMargem >= 10 ? '#10b981' : (proj.percMargem >= 5 ? '#f59e0b' : '#dc2626');
        
        html += '<tr style="' + rowBg + '">';
        html += '  <td><strong>' + label + '</strong>' + (isReajuste ? ' <span style="color: #f59e0b; font-size: 10px;">💰</span>' : '') + '</td>';
        html += '  <td class="text-right">' + proj.contratos.toFixed(1) + '</td>';
        html += '  <td class="text-right">' + Utils.formatCurrency(proj.receita) + '</td>';
        html += '  <td class="text-right" style="color: #dc2626;">' + Utils.formatCurrency(proj.custoPC) + '</td>';
        html += '  <td class="text-right" style="color: #f59e0b;">' + Utils.formatCurrency(proj.impostos) + '</td>';
        html += '  <td class="text-right" style="color: #f59e0b;">' + Utils.formatCurrency(proj.despesasOp) + '</td>';
        html += '  <td class="text-right" style="font-weight: 700; color: ' + corLucro + ';">' + Utils.formatCurrency(proj.resultado) + '</td>';
        html += '  <td class="text-right" style="color: ' + corSaldo + ';">' + Utils.formatCurrency(proj.saldoAcumulado) + '</td>';
        html += '  <td class="text-right" style="color: ' + corMargem2 + ';">' + proj.percMargem.toFixed(1) + '%</td>';
        html += '</tr>';
    }
    
    html += '        </tbody>';
    html += '        <tfoot style="background: var(--gray-50); font-weight: 700; border-top: 2px solid var(--gray-200);">';
    html += '          <tr>';
    html += '            <td colspan="2">TOTAL</td>';
    html += '            <td class="text-right">' + Utils.formatCurrency(resumo.somaReceita) + '</td>';
    html += '            <td class="text-right"></td>';
    html += '            <td class="text-right"></td>';
    html += '            <td class="text-right"></td>';
    html += '            <td class="text-right" style="color: ' + (resumo.somaResultado >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(resumo.somaResultado) + '</td>';
    html += '            <td class="text-right" style="color: ' + corSaldo + ';">' + Utils.formatCurrency(resumo.saldoFinal) + '</td>';
    html += '            <td class="text-right" style="color: ' + corMargem + ';">' + resumo.margemMedia.toFixed(1) + '%</td>';
    html += '          </tr>';
    html += '        </tfoot>';
    html += '      </table>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="card" style="border-left: 4px solid #3b82f6; margin-bottom: 20px;">';
    html += '  <div class="card-header" style="background: #eff6ff;">';
    html += '    <span class="card-title">💡 Insights Automáticos</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    
    var insights = self._gerarInsightsProjecao(dados);
    
    if (insights.length === 0) {
        html += '  <div style="font-size: 13px; color: var(--gray-500);">Nenhum insight relevante identificado.</div>';
    } else {
        html += '  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--gray-700); line-height: 1.8;">';
        insights.forEach(function(insight) {
            html += '    <li>' + insight + '</li>';
        });
        html += '  </ul>';
    }
    
    html += '  </div>';
    html += '</div>';
    
    html += '<div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end;">';
    html += '  <button class="btn btn-secondary" id="btnLimparProjecao" style="height: 42px;">🔄 Nova Projeção</button>';
    html += '</div>';
    
    container.innerHTML = html;
    
    this._renderizarGraficoProjecao(projecao);
    
    this._projecaoConfigurada = false;
    this._configurarProjecaoEventos();
    
    setTimeout(function() {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
};

managerApp._renderizarGraficoProjecao = function(projecao) {
    var ctx = document.getElementById('chartProjecaoCenarios');
    if (!ctx) return;
    
    if (this.chartProjecaoCenarios) {
        this.chartProjecaoCenarios.destroy();
        this.chartProjecaoCenarios = null;
    }
    
    var mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    var labels = projecao.map(function(p) {
        return mesesAbrev[p.mes - 1] + '/' + String(p.ano).slice(2);
    });
    
    var contratos = projecao.map(function(p) { return p.contratos; });
    var lucros = projecao.map(function(p) { return p.resultado; });
    var saldos = projecao.map(function(p) { return p.saldoAcumulado; });
    var linhaZero = Array(labels.length).fill(0);
    
    var ctx2d = ctx.getContext('2d');
    
    try {
        this.chartProjecaoCenarios = new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Contratos',
                        data: contratos,
                        type: 'line',
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#3b82f6',
                        yAxisID: 'y1',
                        order: 1
                    },
                    {
                        label: 'Lucro Mensal',
                        data: lucros,
                        backgroundColor: projecao.map(function(p) {
                            return p.resultado >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(220, 38, 38, 0.7)';
                        }),
                        borderColor: projecao.map(function(p) {
                            return p.resultado >= 0 ? '#10b981' : '#dc2626';
                        }),
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y',
                        order: 3
                    },
                    {
                        label: 'Saldo Acumulado',
                        data: saldos,
                        type: 'line',
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#8b5cf6',
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        label: 'Linha do Zero',
                        data: linhaZero,
                        type: 'line',
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        pointRadius: 0,
                        yAxisID: 'y',
                        order: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var label = context.dataset.label || '';
                                if (label === 'Contratos') {
                                    return label + ': ' + context.raw.toFixed(1);
                                }
                                return label + ': ' + Utils.formatCurrency(context.raw);
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: { font: { size: 11 }, boxWidth: 12, padding: 8 }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) { return Utils.formatCurrency(value); },
                            font: { size: 10 }
                        },
                        title: { display: true, text: 'R$ (Lucro / Saldo)', font: { size: 10 } }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        ticks: { font: { size: 10 }, stepSize: 1 },
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Contratos', font: { size: 10 } }
                    },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });
        console.log('✅ Gráfico de projeção renderizado');
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de projeção:', error);
    }
};

managerApp._gerarInsightsProjecao = function(dados) {
    var insights = [];
    var p = dados.premissas;
    var resumo = dados.resumo;
    var projecao = dados.projecao;
    
    if (resumo.variacaoContratos > 0) {
        insights.push('📈 A carteira <strong>cresce ' + resumo.variacaoContratos.toFixed(1) + ' contratos</strong> em ' + p.horizonte + ' meses (de ' + resumo.contratosIniciais + ' para ' + resumo.contratosFinais.toFixed(1) + ').');
    } else if (resumo.variacaoContratos < 0) {
        insights.push('📉 <strong>ALERTA:</strong> a carteira <strong>encolhe ' + Math.abs(resumo.variacaoContratos).toFixed(1) + ' contratos</strong> em ' + p.horizonte + ' meses.');
    } else {
        insights.push('➖ A carteira se mantém <strong>estável</strong> em ' + resumo.contratosIniciais + ' contratos no período.');
    }
    
    if (p.reajusteAnual > 0 && p.mesReajuste <= p.horizonte) {
        insights.push('💰 Reajuste de <strong>' + p.reajusteAnual + '%</strong> aplicado no mês <strong>' + p.mesReajuste + '</strong>.');
    }
    
    if (resumo.mesLucroPositivo === 1) {
        insights.push('✅ Lucro positivo desde o <strong>primeiro mês</strong> — situação saudável.');
    } else if (resumo.mesLucroPositivo && resumo.mesLucroPositivo <= p.horizonte) {
        insights.push('⏳ Lucro positivo a partir do <strong>mês ' + resumo.mesLucroPositivo + '</strong>.');
    } else {
        insights.push('🚨 <strong>Nenhum mês com lucro positivo</strong> no horizonte projetado!');
    }
    
    if (resumo.saldoFinal >= 0) {
        insights.push('💧 <strong>Saldo final acumulado positivo</strong> de ' + Utils.formatCurrency(resumo.saldoFinal) + '.');
    } else {
        insights.push('🔴 <strong>Saldo final negativo</strong> de ' + Utils.formatCurrency(resumo.saldoFinal) + ' — precisa de atenção.');
    }
    
    if (resumo.margemMedia >= 15) {
        insights.push('🟢 Margem média saudável de <strong>' + resumo.margemMedia.toFixed(1) + '%</strong>.');
    } else if (resumo.margemMedia >= 5) {
        insights.push('🟡 Margem média apertada de <strong>' + resumo.margemMedia.toFixed(1) + '%</strong>.');
    } else {
        insights.push('🔴 Margem média crítica de <strong>' + resumo.margemMedia.toFixed(1) + '%</strong>.');
    }
    
    if (p.churn >= p.novosContratos) {
        insights.push('⚠️ Churn (' + p.churn + ') é maior ou igual aos novos contratos (' + p.novosContratos + ') — <strong>a carteira não cresce</strong>.');
    } else {
        var crescimentoLiquido = p.novosContratos - p.churn;
        insights.push('📊 Crescimento líquido de <strong>' + crescimentoLiquido.toFixed(1) + ' contratos/mês</strong>.');
    }
    
    return insights;
};

managerApp.limparProjecao = function() {
    var container = document.getElementById('projecaoResultadoContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    
    if (this.chartProjecaoCenarios) {
        this.chartProjecaoCenarios.destroy();
        this.chartProjecaoCenarios = null;
    }
    
    this._projecaoAtual = null;
    Utils.showToast('🔄 Projeção limpa', 'info');
};

console.log('✅ Parte 3 de 6 carregada');
// =============================================
// 🚨 ANÁLISE DE RISCO — MOTOR DE CÁLCULO
// =============================================

/**
 * 🔥 Busca os PCs ativos (nome + status)
 */
managerApp._buscarPCsAtivos = function() {
    var url = CONFIG.SUPABASE_URL + '/personal_cares?status=eq.Ativo&select=nome';
    
    return fetch(url, {
        headers: {
            'apikey': CONFIG.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
        }
    })
    .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    })
    .then(function(pcs) {
        var nomes = pcs.map(function(pc) { return String(pc.nome).trim(); });
        console.log('✅ PCs ativos carregados:', nomes.length);
        return { result: 'success', nomes: nomes };
    })
    .catch(function(err) {
        console.warn('⚠️ Erro ao buscar PCs ativos:', err);
        return { result: 'error', nomes: [] };
    });
};

/**
 * 🔥 Busca as escalas dos últimos N dias
 * Faz queries em paralelo (uma por mês na janela)
 */
managerApp._buscarEscalasUltimos90Dias = function() {
    var hoje = new Date();
    var diasJanela = this._DIAS_JANELA_BURNOUT;
    var dataCorte = new Date(hoje);
    dataCorte.setDate(dataCorte.getDate() - diasJanela);
    
    var mesesNecessarios = [];
    var mesCursor = new Date(dataCorte.getFullYear(), dataCorte.getMonth(), 1);
    var mesFinal = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    while (mesCursor <= mesFinal) {
        mesesNecessarios.push({
            mes: mesCursor.getMonth() + 1,
            ano: mesCursor.getFullYear()
        });
        mesCursor.setMonth(mesCursor.getMonth() + 1);
    }
    
    console.log('📅 Buscando escalas dos últimos ' + diasJanela + ' dias');
    console.log('   Data de corte: ' + dataCorte.toLocaleDateString('pt-BR'));
    console.log('   Meses necessários:', mesesNecessarios.length);
    
    var promises = mesesNecessarios.map(function(m) {
        var url = CONFIG.SUPABASE_URL + '/escalas?mes=eq.' + m.mes + '&ano=eq.' + m.ano + '&select=*';
        return fetch(url, {
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
            }
        })
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .catch(function(err) {
            console.warn('⚠️ Erro ao buscar escalas de ' + m.mes + '/' + m.ano + ':', err);
            return [];
        });
    });
    
    return Promise.all(promises)
        .then(function(resultados) {
            var todasEscalas = [];
            resultados.forEach(function(arr) {
                if (Array.isArray(arr)) {
                    todasEscalas = todasEscalas.concat(arr);
                }
            });
            
            console.log('   Total de escalas brutas:', todasEscalas.length);
            
            var escalasFiltradas = todasEscalas.filter(function(e) {
                var dataEscala = new Date(e.ano, e.mes - 1, e.dia);
                return dataEscala >= dataCorte && dataEscala <= hoje;
            });
            
            console.log('   Escalas dentro dos ' + diasJanela + ' dias:', escalasFiltradas.length);
            
            return {
                result: 'success',
                escalas: escalasFiltradas,
                dataCorte: dataCorte,
                dataAtual: hoje
            };
        })
        .catch(function(err) {
            console.error('❌ Erro ao buscar escalas:', err);
            return { result: 'error', escalas: [], dataCorte: dataCorte, dataAtual: hoje };
        });
};

/**
 * 🔥 Carrega e renderiza a aba de Análise de Risco (COM BARRA DE PROGRESSO)
 */
managerApp.carregarAnaliseRisco = function() {
    var container = document.getElementById('analiseRiscoContainer');
    if (!container) return;
    
    if (this._analiseRiscoCache) {
        this._renderizarAnaliseRisco();
        return;
    }
    
    var self = this;
    
    // 🔥 Mostrar barra de progresso
    this._mostrarBarraProgressoInteligencia(
        'Analisando Riscos',
        'Preparando análise de risco...'
    );
    this._atualizarBarraProgressoInteligencia(0, 10, '📡 Conectando...', '1 / 4');
    
    Promise.all([
        API.getAssistidosCompleto(),
        API.getCustoPCRealPorAssistido(),
        self._buscarEscalasUltimos90Dias(),
        self._buscarPCsAtivos()
    ])
    .then(function(results) {
        // 🔥 Etapa 1 → Etapa 2
        self._atualizarBarraProgressoInteligencia(1, 45, '💼 Processando dados...', '2 / 4');
        
        var assistidosData = results[0];
        var custoData = results[1];
        var escalasData = results[2];
        var pcsAtivosData = results[3];
        
        if (assistidosData.result !== 'success') {
            throw new Error('Erro ao buscar assistidos');
        }
        
        var assistidos = (assistidosData.assistidos || []);
        var custoPorAssistido = custoData.custoPorAssistido || {};
        var escalas = escalasData.escalas || [];
        var pcsAtivos = pcsAtivosData.nomes || [];
        
        console.log('✅ Dados carregados para análise:');
        console.log('   Assistidos totais:', assistidos.length);
        console.log('   PCs ativos:', pcsAtivos.length);
        console.log('   Escalas (90d):', escalas.length);
        
        // 🔥 Etapa 2 → Etapa 3
        self._atualizarBarraProgressoInteligencia(2, 75, '📊 Calculando análise de risco...', '3 / 4');
        
        var analise = self._calcularAnaliseRisco(assistidos, custoPorAssistido, escalas, pcsAtivos);
        
        self._analiseRiscoCache = analise;
        
        // 🔥 Etapa 3 → Etapa 4
        self._atualizarBarraProgressoInteligencia(3, 95, '✅ Renderizando análise...', '4 / 4');
        
        self._renderizarAnaliseRisco();
        
        // 🔥 Finalizar
        self._esconderBarraProgressoInteligencia('Análise de risco concluída!', 'success');
    })
    .catch(function(error) {
        console.error('❌ Erro ao carregar Análise de Risco:', error);
        self._esconderBarraProgressoInteligencia('Erro na análise', 'error');
        Utils.showToast('Erro ao carregar análise: ' + error.message, 'error');
    });
};

/**
 * 🔥 Calcula todas as análises de risco.
 * 
 * @param {Array} assistidos - TODOS os assistidos (ativos + inativos)
 * @param {Object} custoPorAssistido - Custo PC real por assistido
 * @param {Array} escalas - Escalas dos últimos 90 dias
 * @param {Array} pcsAtivos - Nomes dos PCs ativos
 */
managerApp._calcularAnaliseRisco = function(assistidos, custoPorAssistido, escalas, pcsAtivos) {
    var self = this;
    
    escalas = escalas || [];
    pcsAtivos = pcsAtivos || [];
    custoPorAssistido = custoPorAssistido || {};
    
    var ativos = assistidos.filter(function(a) { return a.status === 'Ativo'; });
    var inativos = assistidos.filter(function(a) { return a.status === 'Inativo'; });
    
    function calcularIdade(dataNasc) {
        if (!dataNasc) return null;
        var data;
        if (typeof dataNasc === 'string') {
            if (dataNasc.includes('-')) {
                var parts = dataNasc.split('-');
                data = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else if (dataNasc.includes('/')) {
                var parts = dataNasc.split('/');
                data = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            } else {
                return null;
            }
        } else if (dataNasc instanceof Date) {
            data = dataNasc;
        } else {
            return null;
        }
        if (isNaN(data.getTime())) return null;
        var hoje = new Date();
        var anos = hoje.getFullYear() - data.getFullYear();
        var m = hoje.getMonth() - data.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < data.getDate())) anos--;
        return anos;
    }
    
    function getFaixaEtaria(idade) {
        if (idade < 5) return '0-4';
        if (idade < 10) return '5-9';
        if (idade < 15) return '10-14';
        if (idade < 20) return '15-19';
        if (idade < 25) return '20-24';
        if (idade < 30) return '25-29';
        if (idade < 35) return '30-34';
        if (idade < 40) return '35-39';
        if (idade < 45) return '40-44';
        if (idade < 50) return '45-49';
        if (idade < 55) return '50-54';
        if (idade < 60) return '55-59';
        if (idade < 65) return '60-64';
        if (idade < 70) return '65-69';
        if (idade < 75) return '70-74';
        if (idade < 80) return '75-79';
        if (idade < 85) return '80-84';
        return '85+';
    }
    
    // =============================================
    // 1. RISCO DE ÓBITO (80+ ANOS)
    // =============================================
    var assistidos80mais = [];
    var valorEmRiscoObito = 0;
    var perdaEsperadaAnual = 0;
    var totalReceita = 0;
    
    ativos.forEach(function(a) {
        var idadeNum = calcularIdade(a.dataNasc);
        var valor = parseFloat(a.vlrContrato) || 0;
        totalReceita += valor;
        
        if (idadeNum !== null && idadeNum >= 80) {
            var faixa = getFaixaEtaria(idadeNum);
            var prob = self._MORTALIDADE_IBGE[faixa] || 0;
            
            assistidos80mais.push({
                nome: a.nome,
                idade: idadeNum,
                dataNasc: a.dataNasc,
                receita: valor,
                faixa: faixa,
                probabilidade: prob,
                perdaEsperada: valor * prob
            });
            
            valorEmRiscoObito += valor;
            perdaEsperadaAnual += valor * prob;
        }
    });
    
    assistidos80mais.sort(function(a, b) { return b.idade - a.idade; });
    
    // =============================================
    // 2. CONTRATOS SEM REAJUSTE (>12 MESES)
    // =============================================
    var IGPM = self._IGPM_12M;
    var assistidosSemReajuste = [];
    var totalDefasagem = 0;
    var hoje = new Date();
    
    ativos.forEach(function(a) {
        if (!a.dataCriacao && !a.inicioContrato) return;
        
        var dataRef = a.dataCriacao || a.inicioContrato;
        var dataContrato = new Date(dataRef);
        if (isNaN(dataContrato.getTime())) return;
        
        var mesesDesdeInicio = Math.floor((hoje - dataContrato) / (1000 * 60 * 60 * 24 * 30.5));
        var valorAtual = parseFloat(a.vlrContrato) || 0;
        
        if (mesesDesdeInicio >= 12) {
            var anosSemReajuste = mesesDesdeInicio / 12;
            var fatorReajuste = Math.pow(1 + IGPM / 100, anosSemReajuste);
            var valorIdeal = valorAtual * fatorReajuste;
            var defasagemMensal = valorIdeal - valorAtual;
            
            assistidosSemReajuste.push({
                nome: a.nome,
                dataContrato: dataContrato,
                mesesDesdeInicio: mesesDesdeInicio,
                anosSemReajuste: anosSemReajuste,
                valorAtual: valorAtual,
                valorIdeal: valorIdeal,
                defasagemMensal: defasagemMensal,
                defasagemAnual: defasagemMensal * 12
            });
            
            totalDefasagem += defasagemMensal;
        }
    });
    
    assistidosSemReajuste.sort(function(a, b) { return b.defasagemMensal - a.defasagemMensal; });
    
    // =============================================
    // 3. CONCENTRAÇÃO DE RECEITA
    // =============================================
    var ativosOrdenados = ativos.slice().sort(function(a, b) {
        return (parseFloat(b.vlrContrato) || 0) - (parseFloat(a.vlrContrato) || 0);
    });
    
    var top3 = ativosOrdenados.slice(0, 3);
    var top5 = ativosOrdenados.slice(0, 5);
    var top10 = ativosOrdenados.slice(0, 10);
    
    var receitaTop3 = top3.reduce(function(s, a) { return s + (parseFloat(a.vlrContrato) || 0); }, 0);
    var receitaTop5 = top5.reduce(function(s, a) { return s + (parseFloat(a.vlrContrato) || 0); }, 0);
    var receitaTop10 = top10.reduce(function(s, a) { return s + (parseFloat(a.vlrContrato) || 0); }, 0);
    
    var concentracaoTop3 = totalReceita > 0 ? (receitaTop3 / totalReceita * 100) : 0;
    var concentracaoTop5 = totalReceita > 0 ? (receitaTop5 / totalReceita * 100) : 0;
    var concentracaoTop10 = totalReceita > 0 ? (receitaTop10 / totalReceita * 100) : 0;
    
    var maiorCliente = ativosOrdenados[0] || null;
    var maiorClienteValor = maiorCliente ? (parseFloat(maiorCliente.vlrContrato) || 0) : 0;
    var maiorClientePerc = totalReceita > 0 ? (maiorClienteValor / totalReceita * 100) : 0;
    var perdaMaiorCliente = maiorClienteValor;
    
    // =============================================
    // 4. PCs SOBRECARREGADOS (BURNOUT)
    // =============================================
    var pcsAtivosSet = new Set();
    pcsAtivos.forEach(function(nome) {
        pcsAtivosSet.add(String(nome).trim());
    });
    
    var tipoPlantaoPorAssistido = {};
    assistidos.forEach(function(a) {
        var tipo = a.plantoes || a.plantao || '';
        tipoPlantaoPorAssistido[a.id] = tipo;
    });
    
    function getHorasPorTurno(tipoPlantao) {
        if (!tipoPlantao) return 0;
        var t = String(tipoPlantao).toLowerCase();
        if (t.indexOf('24') !== -1) return 12;
        if (t.indexOf('12') !== -1) return 12;
        if (t.indexOf('8') !== -1) return 8;
        if (t.indexOf('6') !== -1) return 6;
        return 0;
    }
    
    function extrairNomePC(valor) {
        if (!valor) return '';
        var str = String(valor).trim();
        if (str === '') return '';
        var strLower = str.toLowerCase();
        if (strLower.indexOf('sem contratação') !== -1) return '';
        if (strLower.indexOf('sem contratacao') !== -1) return '';
        if (strLower.indexOf('plantão extra') !== -1) return '';
        if (strLower.indexOf('plantao extra') !== -1) return '';
        var nome = str.split(';')[0].trim();
        return nome;
    }
    
    function classificarPorHoras(horasMes) {
        if (horasMes === 0) return { nivel: 'SEM_CARGA', label: 'Sem Carga', cor: '#6b7280', icone: '⚪' };
        if (horasMes <= 180) return { nivel: 'SAUDAVEL', label: 'Saudável', cor: '#10b981', icone: '🟢' };
        if (horasMes <= 360) return { nivel: 'ACEITAVEL', label: 'Aceitável', cor: '#3b82f6', icone: '🔵' };
        if (horasMes <= 540) return { nivel: 'ATENCAO', label: 'Atenção', cor: '#f59e0b', icone: '🟠' };
        if (horasMes <= 720) return { nivel: 'ALERTA', label: 'Alerta', cor: '#ef4444', icone: '🔴' };
        return { nivel: 'CRITICO', label: 'Crítico', cor: '#dc2626', icone: '🚨' };
    }
    
    var matrizHoras = new Map();
    
    function acumularHoras(nomePC, horas, escala) {
        if (!nomePC) return;
        if (!pcsAtivosSet.has(nomePC)) return;
        
        if (!matrizHoras.has(nomePC)) {
            matrizHoras.set(nomePC, {
                horas: 0,
                turnos: 0,
                dias: new Set(),
                assistidos: new Set()
            });
        }
        
        var dados = matrizHoras.get(nomePC);
        dados.horas += horas;
        dados.turnos++;
        dados.dias.add(escala.mes + '-' + escala.dia);
        dados.assistidos.add(escala.assistido_id);
    }
    
    escalas.forEach(function(escala) {
        var assistidoId = escala.assistido_id;
        var tipoPlantao = tipoPlantaoPorAssistido[assistidoId] || '';
        var horasTurno = getHorasPorTurno(tipoPlantao);
        
        if (horasTurno === 0) return;
        
        var nomeDiurno = extrairNomePC(escala.diurno);
        var nomeNoturno = extrairNomePC(escala.noturno);
        
        acumularHoras(nomeDiurno, horasTurno, escala);
        acumularHoras(nomeNoturno, horasTurno, escala);
    });
    
    var pcsSobrecarregados = [];
    matrizHoras.forEach(function(dados, nomePC) {
        var horasMes = dados.horas / 3;
        var classe = classificarPorHoras(horasMes);
        
        pcsSobrecarregados.push({
            nome: nomePC,
            horasTotais: dados.horas,
            horasMes: horasMes,
            turnos: dados.turnos,
            diasTrabalhados: dados.dias.size,
            qtdAssistidos: dados.assistidos.size,
            qtdContratos: dados.assistidos.size,
            contratos: [],
            nivel: classe.nivel,
            label: classe.label,
            cor: classe.cor,
            icone: classe.icone
        });
    });
    
    pcsSobrecarregados.sort(function(a, b) { return b.horasMes - a.horasMes; });
    
    var pcsPorFaixa = {
        CRITICO: [], ALERTA: [], ATENCAO: [], ACEITAVEL: [], SAUDAVEL: [], SEM_CARGA: []
    };
    pcsSobrecarregados.forEach(function(pc) {
        if (pcsPorFaixa[pc.nivel]) pcsPorFaixa[pc.nivel].push(pc);
    });
    
    var totalPcsAvaliados = pcsSobrecarregados.length;
    var pcsCriticos = pcsPorFaixa.CRITICO.length + pcsPorFaixa.ALERTA.length;
    
    console.log('✅ Análise de burnout concluída:');
    console.log('   PCs ativos:', pcsAtivosSet.size);
    console.log('   PCs com carga:', totalPcsAvaliados);
    console.log('   🚨 Críticos:', pcsPorFaixa.CRITICO.length);
    console.log('   🔴 Alerta:', pcsPorFaixa.ALERTA.length);
    console.log('   🟠 Atenção:', pcsPorFaixa.ATENCAO.length);
    console.log('   🔵 Aceitável:', pcsPorFaixa.ACEITAVEL.length);
    console.log('   🟢 Saudável:', pcsPorFaixa.SAUDAVEL.length);
    
    // =============================================
    // 5. ANÁLISE DE CHURN HISTÓRICO
    // =============================================
    var motivos = {};
    inativos.forEach(function(a) {
        var motivo = a.motivoDesligamento || 'Não informado';
        
        if (motivo.toLowerCase().includes('óbito')) motivo = 'Óbito';
        else if (motivo.toLowerCase().includes('alta médica') || motivo.toLowerCase().includes('não necessita')) motivo = 'Alta médica';
        else if (motivo.toLowerCase().includes('insatisfação')) motivo = 'Insatisfação';
        else if (motivo.toLowerCase().includes('financeiro')) motivo = 'Problemas financeiros';
        else if (motivo.toLowerCase().includes('concorrência')) motivo = 'Concorrência';
        else if (motivo.toLowerCase().includes('transferência')) motivo = 'Transferência';
        else if (motivo.toLowerCase().includes('familiar')) motivo = 'Familiar cuida em casa';
        
        if (!motivos[motivo]) motivos[motivo] = { quantidade: 0, receita: 0, assistidos: [] };
        motivos[motivo].quantidade++;
        motivos[motivo].receita += parseFloat(a.vlrContrato) || 0;
        motivos[motivo].assistidos.push(a.nome);
    });
    
    var motivosArray = Object.keys(motivos).map(function(m) {
        return {
            motivo: m,
            quantidade: motivos[m].quantidade,
            receita: motivos[m].receita,
            perc: inativos.length > 0 ? (motivos[m].quantidade / inativos.length * 100) : 0
        };
    }).sort(function(a, b) { return b.quantidade - a.quantidade; });
    
    // =============================================
    // 6. RESUMO DE ALERTAS CRÍTICOS
    // =============================================
    var alertasCriticos = {
        obitos: assistidos80mais.length,
        semReajuste: assistidosSemReajuste.length,
        concentracaoTop3: concentracaoTop3 > 40 ? 1 : 0,
        pcsSobrecarregados: pcsCriticos
    };
    
    var totalAlertas = alertasCriticos.obitos + alertasCriticos.semReajuste + alertasCriticos.concentracaoTop3 + alertasCriticos.pcsSobrecarregados;
    
    return {
        totalAtivos: ativos.length,
        totalInativos: inativos.length,
        totalReceita: totalReceita,
        totalAssistidos: assistidos.length,
        totalPcsAtivos: pcsAtivosSet.size,
        
        assistidos80mais: assistidos80mais,
        qtdAssistidos80mais: assistidos80mais.length,
        valorEmRiscoObito: valorEmRiscoObito,
        perdaEsperadaAnual: perdaEsperadaAnual,
        percReceitaEmRiscoObito: totalReceita > 0 ? (valorEmRiscoObito / totalReceita * 100) : 0,
        
        assistidosSemReajuste: assistidosSemReajuste,
        qtdSemReajuste: assistidosSemReajuste.length,
        totalDefasagemMensal: totalDefasagem,
        totalDefasagemAnual: totalDefasagem * 12,
        IGPMReferencia: IGPM,
        
        top3: top3,
        top5: top5,
        top10: top10,
        receitaTop3: receitaTop3,
        receitaTop5: receitaTop5,
        receitaTop10: receitaTop10,
        concentracaoTop3: concentracaoTop3,
        concentracaoTop5: concentracaoTop5,
        concentracaoTop10: concentracaoTop10,
        maiorCliente: maiorCliente,
        maiorClienteValor: maiorClienteValor,
        maiorClientePerc: maiorClientePerc,
        perdaMaiorCliente: perdaMaiorCliente,
        
        pcsSobrecarregados: pcsSobrecarregados,
        qtdPcsSobrecarregados: pcsCriticos,
        pcsPorFaixa: pcsPorFaixa,
        totalPcsAvaliados: totalPcsAvaliados,
        janelaDias: self._DIAS_JANELA_BURNOUT,
        
        motivosChurn: motivosArray,
        qtdChurnMotivos: motivosArray.length,
        
        alertasCriticos: alertasCriticos,
        totalAlertas: totalAlertas,
        
        dataAnalise: new Date()
    };
};

console.log('✅ Parte 4 de 6 carregada');
// =============================================
// 🚨 ANÁLISE DE RISCO — RENDERIZAÇÃO
// =============================================

managerApp._renderizarAnaliseRisco = function() {
    var container = document.getElementById('analiseRiscoContainer');
    if (!container) return;
    
    var dados = this._analiseRiscoCache;
    if (!dados) {
        container.innerHTML = '<div class="empty-state">Nenhum dado disponível</div>';
        return;
    }
    
    var html = '';
    
    // =============================================
    // 1. CABEÇALHO
    // =============================================
    html += '<div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border: 2px solid #f59e0b; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px;">';
    html += '  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">';
    html += '    <div style="font-size: 48px;">🚨</div>';
    html += '    <div style="flex: 1; min-width: 250px;">';
    html += '      <div style="font-size: 12px; font-weight: 600; color: var(--gray-500); letter-spacing: 1px;">ANÁLISE DE RISCO</div>';
    html += '      <div style="font-size: 26px; font-weight: 800; color: #dc2626; margin: 4px 0;">' + dados.totalAlertas + ' Alertas Críticos</div>';
    html += '      <div style="font-size: 13px; color: var(--gray-700);">';
    html += '        Análise baseada em <strong>' + dados.totalAtivos + ' contratos ativos</strong> e ';
    html += '        <strong>' + dados.totalPcsAtivos + ' PCs ativos</strong> (últimos ' + dados.janelaDias + ' dias).';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    // =============================================
    // 2. CARDS DE ALERTA
    // =============================================
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">';
    
    var corObito = dados.qtdAssistidos80mais > 0 ? '#dc2626' : '#10b981';
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px; border-left: 3px solid ' + corObito + ';">';
    html += '  <div class="stat-icon ' + (dados.qtdAssistidos80mais > 0 ? 'red' : 'green') + '" style="width: 36px; height: 36px; font-size: 16px;">⚰️</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 20px; font-weight: 800; color: ' + corObito + ';">' + dados.qtdAssistidos80mais + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">RISCO DE ÓBITO</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Assistidos 80+ anos</div>';
    html += '  </div>';
    html += '</div>';
    
    var corReajuste = dados.qtdSemReajuste > 0 ? '#f59e0b' : '#10b981';
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px; border-left: 3px solid ' + corReajuste + ';">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 20px; font-weight: 800; color: ' + corReajuste + ';">' + dados.qtdSemReajuste + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">SEM REAJUSTE</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Há mais de 12 meses</div>';
    html += '  </div>';
    html += '</div>';
    
    var corConc = dados.concentracaoTop3 > 40 ? '#dc2626' : (dados.concentracaoTop3 > 25 ? '#f59e0b' : '#10b981');
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px; border-left: 3px solid ' + corConc + ';">';
    html += '  <div class="stat-icon ' + (dados.concentracaoTop3 > 40 ? 'red' : 'amber') + '" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 18px; font-weight: 700; color: ' + corConc + ';">' + dados.concentracaoTop3.toFixed(1) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">CONCENTRAÇÃO TOP 3</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Ideal &lt; 25%</div>';
    html += '  </div>';
    html += '</div>';
    
    var corPCs = dados.qtdPcsSobrecarregados > 0 ? '#dc2626' : '#10b981';
    html += '<div class="stat-card" style="flex: 1; min-width: 160px; padding: 14px; border-left: 3px solid ' + corPCs + ';">';
    html += '  <div class="stat-icon ' + (dados.qtdPcsSobrecarregados > 0 ? 'red' : 'green') + '" style="width: 36px; height: 36px; font-size: 16px;">👥</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 20px; font-weight: 800; color: ' + corPCs + ';">' + dados.qtdPcsSobrecarregados + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">PCs EM RISCO</div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400);">Críticos + Alerta</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    // =============================================
    // 3. RISCO DE ÓBITO (80+)
    // =============================================
    html += '<div class="card" style="margin-bottom: 20px; border-left: 4px solid ' + corObito + ';">';
    html += '  <div class="card-header" style="background: ' + corObito + '10;">';
    html += '    <span class="card-title">⚰️ Risco de Óbito — Assistidos 80+ Anos</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    
    if (dados.qtdAssistidos80mais === 0) {
        html += '    <div style="text-align: center; padding: 20px; color: var(--gray-500);">';
        html += '      <div style="font-size: 40px; margin-bottom: 8px;">✅</div>';
        html += '      <div style="font-weight: 600; color: #10b981;">Nenhum assistido com risco elevado de óbito</div>';
        html += '      <div style="font-size: 12px;">Todos os assistidos ativos têm menos de 80 anos.</div>';
        html += '    </div>';
    } else {
        html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">';
        
        html += '      <div style="background: #fef2f2; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #dc2626;">';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Valor em Risco</div>';
        html += '        <div style="font-size: 18px; font-weight: 700; color: #dc2626;">' + Utils.formatCurrency(dados.valorEmRiscoObito) + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-400);">' + dados.percReceitaEmRiscoObito.toFixed(1) + '% da receita total</div>';
        html += '      </div>';
        
        html += '      <div style="background: #fff7ed; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #f59e0b;">';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Perda Esperada (12M)</div>';
        html += '        <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">' + Utils.formatCurrency(dados.perdaEsperadaAnual) + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-400);">Baseado na tábua IBGE</div>';
        html += '      </div>';
        
        html += '    </div>';
        
        html += '    <div style="font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 8px;">📋 Assistidos com maior risco:</div>';
        html += '    <div class="data-table-wrapper">';
        html += '      <table class="data-table" style="font-size: 12px;">';
        html += '        <thead><tr><th>Assistido</th><th class="text-right">Idade</th><th class="text-right">Receita</th><th class="text-right">Prob. Óbito</th><th class="text-right">Perda Esperada</th></tr></thead>';
        html += '        <tbody>';
        
        for (var i = 0; i < dados.assistidos80mais.length; i++) {
            var a = dados.assistidos80mais[i];
            var corProb = a.probabilidade >= 0.15 ? '#dc2626' : (a.probabilidade >= 0.10 ? '#f59e0b' : '#6b7280');
            
            html += '<tr>';
            html += '  <td><strong>' + a.nome + '</strong></td>';
            html += '  <td class="text-right">' + a.idade + ' anos</td>';
            html += '  <td class="text-right">' + Utils.formatCurrency(a.receita) + '</td>';
            html += '  <td class="text-right" style="color: ' + corProb + '; font-weight: 600;">' + (a.probabilidade * 100).toFixed(1) + '%</td>';
            html += '  <td class="text-right" style="color: #dc2626; font-weight: 600;">' + Utils.formatCurrency(a.perdaEsperada) + '</td>';
            html += '</tr>';
        }
        
        html += '        </tbody>';
        html += '      </table>';
        html += '    </div>';
        
        html += '    <div style="margin-top: 12px; background: #fef2f2; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: var(--gray-700);">';
        html += '      💡 <strong>Ação sugerida:</strong> priorizar captação de novos clientes para compensar eventual perda. ';
        html += '      Estes ' + dados.qtdAssistidos80mais + ' contratos representam ' + dados.percReceitaEmRiscoObito.toFixed(1) + '% da receita total.';
        html += '    </div>';
    }
    
    html += '  </div>';
    html += '</div>';
    
    // =============================================
    // 4. CONTRATOS SEM REAJUSTE
    // =============================================
    html += '<div class="card" style="margin-bottom: 20px; border-left: 4px solid ' + corReajuste + ';">';
    html += '  <div class="card-header" style="background: ' + corReajuste + '10;">';
    html += '    <span class="card-title">💰 Contratos Sem Reajuste (>12 meses)</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    
    if (dados.qtdSemReajuste === 0) {
        html += '    <div style="text-align: center; padding: 20px; color: var(--gray-500);">';
        html += '      <div style="font-size: 40px; margin-bottom: 8px;">✅</div>';
        html += '      <div style="font-weight: 600; color: #10b981;">Todos os contratos foram reajustados nos últimos 12 meses</div>';
        html += '    </div>';
    } else {
        html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">';
        
        html += '      <div style="background: #fffbeb; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #f59e0b;">';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Defasagem Mensal</div>';
        html += '        <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">' + Utils.formatCurrency(dados.totalDefasagemMensal) + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-400);">Você deixa de faturar</div>';
        html += '      </div>';
        
        html += '      <div style="background: #fef2f2; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #dc2626;">';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Defasagem Anual</div>';
        html += '        <div style="font-size: 18px; font-weight: 700; color: #dc2626;">' + Utils.formatCurrency(dados.totalDefasagemAnual) + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-400);">Acumulado em 12 meses</div>';
        html += '      </div>';
        
        html += '      <div style="background: #eff6ff; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #3b82f6;">';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">IGP-M Referência</div>';
        html += '        <div style="font-size: 18px; font-weight: 700; color: #3b82f6;">' + dados.IGPMReferencia.toFixed(1) + '%</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-400);">Acumulado 12 meses</div>';
        html += '      </div>';
        
        html += '    </div>';
        
        html += '    <div style="font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 8px;">📋 Contratos defasados:</div>';
        html += '    <div class="data-table-wrapper">';
        html += '      <table class="data-table" style="font-size: 12px;">';
        html += '        <thead><tr><th>Assistido</th><th class="text-right">Meses s/ Reajuste</th><th class="text-right">Valor Atual</th><th class="text-right">Valor Ideal</th><th class="text-right">Defasagem/Mês</th></tr></thead>';
        html += '        <tbody>';
        
        for (var i = 0; i < dados.assistidosSemReajuste.length; i++) {
            var a = dados.assistidosSemReajuste[i];
            var corMeses = a.mesesDesdeInicio >= 24 ? '#dc2626' : (a.mesesDesdeInicio >= 18 ? '#f59e0b' : '#6b7280');
            
            html += '<tr>';
            html += '  <td><strong>' + a.nome + '</strong></td>';
            html += '  <td class="text-right" style="color: ' + corMeses + '; font-weight: 600;">' + a.mesesDesdeInicio + '</td>';
            html += '  <td class="text-right">' + Utils.formatCurrency(a.valorAtual) + '</td>';
            html += '  <td class="text-right" style="color: #10b981; font-weight: 600;">' + Utils.formatCurrency(a.valorIdeal) + '</td>';
            html += '  <td class="text-right" style="color: #dc2626; font-weight: 600;">-' + Utils.formatCurrency(a.defasagemMensal) + '</td>';
            html += '</tr>';
        }
        
        html += '        </tbody>';
        html += '      </table>';
        html += '    </div>';
        
        html += '    <div style="margin-top: 12px; background: #fffbeb; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: var(--gray-700);">';
        html += '      💡 <strong>Ação sugerida:</strong> aplicar reajuste de <strong>' + dados.IGPMReferencia.toFixed(1) + '%</strong> ';
        html += '      nos contratos listados acima. Potencial de ganho: <strong>' + Utils.formatCurrency(dados.totalDefasagemAnual) + '/ano</strong>.';
        html += '    </div>';
    }
    
    html += '  </div>';
    html += '</div>';
    
    // =============================================
    // 5. CONCENTRAÇÃO DE RECEITA
    // =============================================
    html += '<div class="card" style="margin-bottom: 20px; border-left: 4px solid ' + corConc + ';">';
    html += '  <div class="card-header" style="background: ' + corConc + '10;">';
    html += '    <span class="card-title">📊 Concentração de Receita</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    
    html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px;">';
    
    var corTop3 = dados.concentracaoTop3 > 40 ? '#dc2626' : (dados.concentracaoTop3 > 25 ? '#f59e0b' : '#10b981');
    html += '      <div style="background: white; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ' + corTop3 + ';">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Top 3</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: ' + corTop3 + ';">' + dados.concentracaoTop3.toFixed(1) + '%</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">' + Utils.formatCurrency(dados.receitaTop3) + '</div>';
    html += '      </div>';
    
    var corTop5 = dados.concentracaoTop5 > 60 ? '#dc2626' : (dados.concentracaoTop5 > 40 ? '#f59e0b' : '#10b981');
    html += '      <div style="background: white; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ' + corTop5 + ';">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Top 5</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: ' + corTop5 + ';">' + dados.concentracaoTop5.toFixed(1) + '%</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">' + Utils.formatCurrency(dados.receitaTop5) + '</div>';
    html += '      </div>';
    
    var corTop10 = dados.concentracaoTop10 > 80 ? '#dc2626' : (dados.concentracaoTop10 > 60 ? '#f59e0b' : '#10b981');
    html += '      <div style="background: white; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ' + corTop10 + ';">';
    html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Top 10</div>';
    html += '        <div style="font-size: 20px; font-weight: 700; color: ' + corTop10 + ';">' + dados.concentracaoTop10.toFixed(1) + '%</div>';
    html += '        <div style="font-size: 10px; color: var(--gray-400);">' + Utils.formatCurrency(dados.receitaTop10) + '</div>';
    html += '      </div>';
    
    html += '    </div>';
    
    html += '    <div style="font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 8px;">📋 Top 5 maiores clientes:</div>';
    html += '    <div class="data-table-wrapper">';
    html += '      <table class="data-table" style="font-size: 12px;">';
    html += '        <thead><tr><th>#</th><th>Cliente</th><th class="text-right">Receita</th><th class="text-right">% Total</th></tr></thead>';
    html += '        <tbody>';
    
    for (var i = 0; i < dados.top5.length; i++) {
        var t = dados.top5[i];
        var valor = parseFloat(t.vlrContrato) || 0;
        var perc = dados.totalReceita > 0 ? (valor / dados.totalReceita * 100) : 0;
        
        html += '<tr>';
        html += '  <td><strong>' + (i + 1) + 'º</strong></td>';
        html += '  <td>' + t.nome + '</td>';
        html += '  <td class="text-right">' + Utils.formatCurrency(valor) + '</td>';
        html += '  <td class="text-right" style="font-weight: 600;">' + perc.toFixed(1) + '%</td>';
        html += '</tr>';
    }
    
    html += '        </tbody>';
    html += '      </table>';
    html += '    </div>';
    
    if (dados.maiorCliente && dados.maiorClientePerc > 10) {
        html += '    <div style="margin-top: 12px; background: ' + (dados.maiorClientePerc > 15 ? '#fef2f2' : '#fffbeb') + '; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: var(--gray-700);">';
        html += '      ⚠️ <strong>Alerta:</strong> o maior cliente (' + dados.maiorCliente.nome + ') representa ';
        html += '      <strong>' + dados.maiorClientePerc.toFixed(1) + '%</strong> da receita total. ';
        html += '      Se perdê-lo, o impacto será de <strong>' + Utils.formatCurrency(dados.perdaMaiorCliente) + '/mês</strong>.';
        html += '    </div>';
    }
    
    html += '  </div>';
    html += '</div>';
    
    // =============================================
    // 6. PCs SOBRECARREGADOS — CARGA DE TRABALHO
    // =============================================
    html += '<div class="card" style="margin-bottom: 20px; border-left: 4px solid ' + corPCs + ';">';
    html += '  <div class="card-header" style="background: ' + corPCs + '10; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
    html += '    <span class="card-title">👥 Carga de Trabalho dos PCs</span>';
    html += '    <span style="font-size: 11px; color: var(--gray-500);">Últimos ' + dados.janelaDias + ' dias | ' + dados.totalPcsAvaliados + ' PCs com carga</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    
    if (dados.totalPcsAvaliados === 0) {
        html += '    <div style="text-align: center; padding: 20px; color: var(--gray-500);">';
        html += '      <div style="font-size: 40px; margin-bottom: 8px;">📊</div>';
        html += '      <div style="font-weight: 600;">Nenhum registro de trabalho encontrado</div>';
        html += '      <div style="font-size: 12px;">Não há escalas preenchidas nos últimos ' + dados.janelaDias + ' dias.</div>';
        html += '    </div>';
    } else {
        var faixas = dados.pcsPorFaixa;
        
        html += '    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px;">';
        
        html += '      <div style="background: #f0fdf4; border-radius: 8px; padding: 12px; border-left: 3px solid #10b981; text-align: center;">';
        html += '        <div style="font-size: 22px; font-weight: 800; color: #10b981;">' + faixas.SAUDAVEL.length + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">🟢 Saudável</div>';
        html += '        <div style="font-size: 9px; color: var(--gray-400);">até 180h/mês</div>';
        html += '      </div>';
        
        html += '      <div style="background: #eff6ff; border-radius: 8px; padding: 12px; border-left: 3px solid #3b82f6; text-align: center;">';
        html += '        <div style="font-size: 22px; font-weight: 800; color: #3b82f6;">' + faixas.ACEITAVEL.length + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">🔵 Aceitável</div>';
        html += '        <div style="font-size: 9px; color: var(--gray-400);">180-360h/mês</div>';
        html += '      </div>';
        
        html += '      <div style="background: #fffbeb; border-radius: 8px; padding: 12px; border-left: 3px solid #f59e0b; text-align: center;">';
        html += '        <div style="font-size: 22px; font-weight: 800; color: #f59e0b;">' + faixas.ATENCAO.length + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">🟠 Atenção</div>';
        html += '        <div style="font-size: 9px; color: var(--gray-400);">360-540h/mês</div>';
        html += '      </div>';
        
        html += '      <div style="background: #fef2f2; border-radius: 8px; padding: 12px; border-left: 3px solid #ef4444; text-align: center;">';
        html += '        <div style="font-size: 22px; font-weight: 800; color: #ef4444;">' + faixas.ALERTA.length + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">🔴 Alerta</div>';
        html += '        <div style="font-size: 9px; color: var(--gray-400);">540-720h/mês</div>';
        html += '      </div>';
        
        html += '      <div style="background: #fef2f2; border-radius: 8px; padding: 12px; border-left: 3px solid #dc2626; text-align: center;">';
        html += '        <div style="font-size: 22px; font-weight: 800; color: #dc2626;">' + faixas.CRITICO.length + '</div>';
        html += '        <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">🚨 Crítico</div>';
        html += '        <div style="font-size: 9px; color: var(--gray-400);">720h+/mês</div>';
        html += '      </div>';
        
        html += '    </div>';
        
        if (faixas.CRITICO.length > 0 || faixas.ALERTA.length > 0) {
            html += '    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">';
            html += '      <div style="font-weight: 700; font-size: 14px; color: #dc2626; margin-bottom: 4px;">🚨 ATENÇÃO — ' + (faixas.CRITICO.length + faixas.ALERTA.length) + ' PCs em risco crítico/alto</div>';
            html += '      <div style="font-size: 12px; color: var(--gray-700);">';
            html += '        ' + faixas.CRITICO.length + ' PCs em risco crítico (720h+/mês) e ';
            html += '        ' + faixas.ALERTA.length + ' PCs em alerta (540-720h/mês). ';
            html += '        Risco elevado de burnout, afastamento ou queda de qualidade.';
            html += '      </div>';
            html += '    </div>';
        }
        
        html += '    <div style="font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 8px;">📋 Top 10 PCs por carga de trabalho:</div>';
        html += '    <div class="data-table-wrapper">';
        html += '      <table class="data-table" style="font-size: 12px;">';
        html += '        <thead>';
        html += '          <tr>';
        html += '            <th>#</th>';
        html += '            <th>Personal Care</th>';
        html += '            <th class="text-right">Horas Totais</th>';
        html += '            <th class="text-right">Média Mensal</th>';
        html += '            <th class="text-right">Turnos</th>';
        html += '            <th class="text-right">Dias</th>';
        html += '            <th class="text-right">Assistidos</th>';
        html += '            <th>Classificação</th>';
        html += '          </tr>';
        html += '        </thead>';
        html += '        <tbody>';
        
        var topPCs = dados.pcsSobrecarregados.slice(0, 10);
        for (var i = 0; i < topPCs.length; i++) {
            var pc = topPCs[i];
            var corLinha = (pc.nivel === 'CRITICO' || pc.nivel === 'ALERTA') ? 'background: #fef2f2;' : '';
            
            html += '<tr style="' + corLinha + '">';
            html += '  <td><strong>' + (i + 1) + 'º</strong></td>';
            html += '  <td><strong>' + pc.nome + '</strong></td>';
            html += '  <td class="text-right">' + pc.horasTotais.toFixed(0) + 'h</td>';
            html += '  <td class="text-right" style="font-weight: 700; color: ' + pc.cor + ';">' + pc.horasMes.toFixed(0) + 'h</td>';
            html += '  <td class="text-right">' + pc.turnos + '</td>';
            html += '  <td class="text-right">' + pc.diasTrabalhados + '</td>';
            html += '  <td class="text-right">' + pc.qtdAssistidos + '</td>';
            html += '  <td><span class="badge" style="background: ' + pc.cor + '20; color: ' + pc.cor + ';">' + pc.icone + ' ' + pc.label + '</span></td>';
            html += '</tr>';
        }
        
        html += '        </tbody>';
        html += '      </table>';
        html += '    </div>';
        
        if (dados.pcsSobrecarregados.length > 10) {
            html += '    <div style="margin-top: 8px; font-size: 11px; color: var(--gray-400); text-align: right;">';
            html += '      Exibindo os 10 PCs com maior carga de ' + dados.totalPcsAvaliados + ' no total';
            html += '    </div>';
        }
        
        html += '    <div style="margin-top: 12px; background: #eff6ff; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: var(--gray-700);">';
        html += '      💡 <strong>Como interpretar:</strong> ';
        html += '      A média mensal é calculada dividindo as horas totais dos últimos ' + dados.janelaDias + ' dias por 3 (meses). ';
        html += '      PCs com média acima de <strong>540h/mês</strong> estão em risco. ';
        html += '      O ideal é manter todos abaixo de <strong>360h/mês</strong>.';
        html += '    </div>';
    }
    
    html += '  </div>';
    html += '</div>';
    
    // =============================================
    // 7. CHURN HISTÓRICO
    // =============================================
    html += '<div class="card" style="margin-bottom: 0; border-left: 4px solid #3b82f6;">';
    html += '  <div class="card-header" style="background: #eff6ff;">';
    html += '    <span class="card-title">📉 Análise de Churn Histórico</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 16px;">';
    
    if (dados.totalInativos === 0) {
        html += '    <div style="text-align: center; padding: 20px; color: var(--gray-500);">';
        html += '      <div style="font-size: 40px; margin-bottom: 8px;">📊</div>';
        html += '      <div style="font-weight: 600;">Nenhum contrato inativo registrado</div>';
        html += '      <div style="font-size: 12px;">Não há dados históricos para análise de churn.</div>';
        html += '    </div>';
    } else {
        html += '    <div style="background: #eff6ff; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">';
        html += '      <div style="font-size: 32px;">📉</div>';
        html += '      <div style="flex: 1;">';
        html += '        <div style="font-size: 14px; font-weight: 700; color: #1e40af;">' + dados.totalInativos + ' contratos encerrados</div>';
        html += '        <div style="font-size: 12px; color: var(--gray-600);">Motivos identificados no cadastro dos assistidos</div>';
        html += '      </div>';
        html += '    </div>';
        
        html += '    <div style="font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 8px;">📊 Motivos de Saída:</div>';
        html += '    <div class="data-table-wrapper">';
        html += '      <table class="data-table" style="font-size: 12px;">';
        html += '        <thead><tr><th>Motivo</th><th class="text-right">Quantidade</th><th class="text-right">% Total</th><th class="text-right">Receita Perdida</th></tr></thead>';
        html += '        <tbody>';
        
        for (var i = 0; i < dados.motivosChurn.length; i++) {
            var m = dados.motivosChurn[i];
            
            html += '<tr>';
            html += '  <td><strong>' + m.motivo + '</strong></td>';
            html += '  <td class="text-right">' + m.quantidade + '</td>';
            html += '  <td class="text-right" style="font-weight: 600;">' + m.perc.toFixed(1) + '%</td>';
            html += '  <td class="text-right" style="color: #dc2626;">' + Utils.formatCurrency(m.receita) + '</td>';
            html += '</tr>';
        }
        
        html += '        </tbody>';
        html += '      </table>';
        html += '    </div>';
        
        html += '    <div style="margin-top: 12px; background: #eff6ff; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: var(--gray-700);">';
        html += '      💡 <strong>Insight:</strong> com base no histórico, você perde em média ';
        html += '      <strong>' + (dados.totalInativos / Math.max(1, 12)).toFixed(2) + ' contratos/mês</strong>. ';
        html += '      Mantenha o ritmo de captação acima dessa média para crescer.';
        html += '    </div>';
    }
    
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
};

console.log('✅ Parte 5 de 6 carregada');
// =============================================
// CARREGAR PAINEL DE MARGEM (ABERTURA DE ABA)
// =============================================
managerApp.carregarPainelMargem = function() {
    if (!this._painelMargemCache) {
        this.carregarInteligenciaNegocio();
    } else {
        this._renderizarPainelMargem();
    }
};

// =============================================
// CARREGAR PONTO DE EQUILÍBRIO (ABERTURA DE ABA)
// =============================================
managerApp.carregarPontoEquilibrio = function() {
    if (!this._pontoEquilibrioCache) {
        this.carregarInteligenciaNegocio();
    } else {
        this._renderizarPontoEquilibrio();
    }
};

// =============================================
// MODAL DE PARÂMETROS OPERACIONAIS
// =============================================
managerApp.abrirModalParametrosOp = function() {
    var modal = document.getElementById('modalParametrosOperacionais');
    if (!modal) {
        console.warn('⚠️ Modal de parâmetros operacionais não encontrado no DOM');
        Utils.showToast('⚠️ Modal não encontrado. Verifique se o HTML foi atualizado.', 'warning');
        return;
    }
    
    var p = this._parametrosOperacionais;
    
    document.getElementById('paramDespesasOp').value = Utils.formatCurrency(p.despesasOperacionais);
    document.getElementById('paramAliquotaImposto').value = p.aliquotaImposto;
    document.getElementById('paramCacMedio').value = Utils.formatCurrency(p.cacMedio);
    document.getElementById('paramMesesAmortizacaoCac').value = p.mesesAmortizacaoCac;
    
    modal.style.display = 'flex';
    
    Utils.applyCurrencyMask(document.getElementById('paramDespesasOp'));
    Utils.applyCurrencyMask(document.getElementById('paramCacMedio'));
};

managerApp._configurarModalParametrosOp = function() {
    var self = this;
    
    if (this._modalParametrosConfigurado) return;
    this._modalParametrosConfigurado = true;
    
    var fechar = document.getElementById('fecharModalParametrosOp');
    if (fechar) {
        fechar.addEventListener('click', function() {
            document.getElementById('modalParametrosOperacionais').style.display = 'none';
        });
    }
    
    var cancelar = document.getElementById('cancelarParametrosOp');
    if (cancelar) {
        cancelar.addEventListener('click', function() {
            document.getElementById('modalParametrosOperacionais').style.display = 'none';
        });
    }
    
    var salvar = document.getElementById('salvarParametrosOp');
    if (salvar) {
        salvar.addEventListener('click', function() {
            self._salvarParametrosOp();
        });
    }
    
    var modalEl = document.getElementById('modalParametrosOperacionais');
    if (modalEl) {
        modalEl.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
};

managerApp._salvarParametrosOp = function() {
    var self = this;
    
    var params = {
        despesasOperacionais: Utils.parseCurrencyToNumber(document.getElementById('paramDespesasOp').value) || 20000,
        aliquotaImposto: parseFloat(document.getElementById('paramAliquotaImposto').value) || 6,
        cacMedio: Utils.parseCurrencyToNumber(document.getElementById('paramCacMedio').value) || 500,
        mesesAmortizacaoCac: parseInt(document.getElementById('paramMesesAmortizacaoCac').value) || 12
    };
    
    Utils.showLoading('Salvando parâmetros...');
    
    API.salvarParametrosOperacionais(params)
        .then(function(data) {
            Utils.hideLoading();
            
            if (data.result === 'success') {
                self._parametrosOperacionais = params;
                
                if (typeof managerApp.invalidarParametrosOpCache === 'function') {
                    managerApp.invalidarParametrosOpCache();
                }
                
                self._painelMargemCache = null;
                self._pontoEquilibrioCache = null;
                self._analiseRiscoCache = null;
                
                Utils.showToast('✅ Parâmetros salvos!', 'success');
                
                document.getElementById('modalParametrosOperacionais').style.display = 'none';
                
                self.carregarInteligenciaNegocio(true);
            } else {
                Utils.showToast('Erro ao salvar: ' + (data.error || 'Erro desconhecido'), 'error');
            }
        })
        .catch(function(error) {
            Utils.hideLoading();
            Utils.showToast('Erro ao salvar: ' + error.message, 'error');
        });
};

// =============================================
// CARREGAR SIMULAÇÕES SALVAS DO LOCALSTORAGE
// =============================================
(function carregarSimulacoesSalvas() {
    try {
        var salvas = localStorage.getItem('manager_simulacoes_salvas');
        if (salvas) {
            managerApp._simulacoesSalvas = JSON.parse(salvas) || [];
        }
    } catch (e) {
        managerApp._simulacoesSalvas = [];
    }
})();

// =============================================
// LISTENERS DE EVENTOS GLOBAIS
// =============================================

/**
 * Listener para mudança de mês.
 */
document.addEventListener('mesChanged', function(e) {
    var pageAtiva = document.getElementById('page-simulacao-cenarios');
    if (pageAtiva && pageAtiva.classList.contains('active')) {
        console.log('📅 Mês mudou — recarregando Inteligência de Negócio');
        
        if (managerApp._painelMargemCache) {
            managerApp._painelMargemCache = null;
            managerApp._pontoEquilibrioCache = null;
            managerApp._analiseRiscoCache = null;
            managerApp.carregarInteligenciaNegocio(true);
        }
    }
});

// =============================================
// ESTADO PARA DEBUGGING
// =============================================
managerApp.estadoInteligencia = function() {
    var painel = this._painelMargemCache;
    var eq = this._pontoEquilibrioCache;
    var sim = this._simulacaoAtual;
    var proj = this._projecaoAtual;
    var risco = this._analiseRiscoCache;
    
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('   ESTADO — INTELIGÊNCIA DE NEGÓCIO v3.4');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    
    console.log('🎯 Painel de Margem:');
    if (painel) {
        console.log('   Clientes:', painel.totalClientes);
        console.log('   Parcerias:', painel.totalParcerias);
        console.log('   Deficitários:', painel.deficitarios.length);
        console.log('   Lucrativos:', painel.lucrativos.length);
        console.log('   Receita (clientes):', Utils.formatCurrency(painel.somaReceitaClientes));
        console.log('   Lucro operacional:', Utils.formatCurrency(painel.somaMargemLiquidaClientes));
    } else {
        console.log('   ⏳ Não carregado');
    }
    console.log('');
    
    console.log('⚖️ Ponto de Equilíbrio:');
    if (eq) {
        console.log('   Status:', eq.statusIcone, eq.statusTexto);
        console.log('   Contratos mínimos:', eq.pontoEquilibrio);
        console.log('   Contratos atuais:', eq.contratosAtuais);
        console.log('   Margem de segurança:', eq.margemSeguranca.toFixed(1) + '%');
    } else {
        console.log('   ⏳ Não carregado');
    }
    console.log('');
    
    console.log('🧪 Simulação Atual:');
    if (sim) {
        console.log('   Receita:', Utils.formatCurrency(sim.parametros.receita));
        console.log('   Margem líquida:', sim.calculos.percLucroLiquido.toFixed(1) + '%');
        console.log('   Lucro mensal:', Utils.formatCurrency(sim.calculos.lucroLiquido));
        console.log('   Classificação:', sim.calculos.classificacaoIcone, sim.calculos.classificacao);
    } else {
        console.log('   Nenhuma simulação em andamento');
    }
    console.log('');
    
    console.log('📈 Projeção de Cenários:');
    if (proj) {
        console.log('   Horizonte:', proj.premissas.horizonte + ' meses');
        console.log('   Contratos finais:', proj.resumo.contratosFinais.toFixed(1));
        console.log('   Lucro total:', Utils.formatCurrency(proj.resumo.somaResultado));
        console.log('   Margem média:', proj.resumo.margemMedia.toFixed(1) + '%');
        console.log('   Saldo final:', Utils.formatCurrency(proj.resumo.saldoFinal));
    } else {
        console.log('   Nenhuma projeção calculada');
    }
    console.log('');
    
    console.log('🚨 Análise de Risco:');
    if (risco) {
        console.log('   Alertas críticos:', risco.totalAlertas);
        console.log('   Assistidos 80+:', risco.qtdAssistidos80mais);
        console.log('   Sem reajuste:', risco.qtdSemReajuste);
        console.log('   Concentração Top 3:', risco.concentracaoTop3.toFixed(1) + '%');
        console.log('   PCs ativos:', risco.totalPcsAtivos);
        console.log('   PCs com carga:', risco.totalPcsAvaliados);
        console.log('   PCs em risco (crítico+alerta):', risco.qtdPcsSobrecarregados);
        console.log('   Contratos inativos:', risco.totalInativos);
    } else {
        console.log('   ⏳ Não carregado');
    }
    console.log('');
    
    console.log('⚙️ Parâmetros Operacionais:');
    console.log('   Despesas Op.:', Utils.formatCurrency(this._parametrosOperacionais.despesasOperacionais));
    console.log('   Alíquota Imposto:', this._parametrosOperacionais.aliquotaImposto + '%');
    console.log('   CAC Médio:', Utils.formatCurrency(this._parametrosOperacionais.cacMedio));
    console.log('');
    
    console.log('═══════════════════════════════════════════════════');
};

// =============================================
// MENSAGEM DE CARREGAMENTO FINAL
// =============================================
console.log('');
console.log('╔═══════════════════════════════════════════════════╗');
console.log('║   ✅ INTELIGÊNCIA DE NEGÓCIO v3.4 CARREGADA      ║');
console.log('║   🆕 Barra de progresso padronizada              ║');
console.log('╚═══════════════════════════════════════════════════╝');
console.log('');
console.log('📦 Módulos disponíveis:');
console.log('   🎯 Painel de Margem');
console.log('   ⚖️  Ponto de Equilíbrio');
console.log('   🧪 Simulador de Contrato');
console.log('   💡 Calculadora Reversa');
console.log('   📈 Projeção de Cenários');
console.log('   🚨 Análise de Risco (com burnout real)');
console.log('   🆕 Barra de progresso com etapas coloridas');
console.log('');
console.log('💡 Para ver o estado: managerApp.estadoInteligencia()');
console.log('');
