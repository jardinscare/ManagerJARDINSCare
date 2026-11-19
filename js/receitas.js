// =============================================
// RECEITAS - managerJARDINSCare
// Gestão de Receitas Avulsas
// Versão 3.0 - Padronização de modais (botões 100% da largura)
// =============================================

// =============================================
// INICIALIZAR RECEITAS AVULSAS
// =============================================
managerApp.initReceitasAvulsas = function() {
    var self = this;
    
    document.getElementById('btnNovaReceitaAvulsa').addEventListener('click', function() { 
        managerApp.abrirModalReceitaAvulsa(); 
    });
    
    document.getElementById('btnGerarReceitasMensais').addEventListener('click', function() { 
        managerApp.gerarReceitasMensais(); 
    });
    
    document.getElementById('btnFiltrarReceita').addEventListener('click', function() { 
        managerApp.renderReceitasAvulsas(); 
    });
    
    document.getElementById('filtroMesReceita').value = new Date().toISOString().slice(0, 7);
    
    this._receitasCache = null;
    
    this.carregarFiltrosReceitas();
    this.carregarAssistidosParaFiltro();
    this.renderReceitasAvulsas();
};

// =============================================
// CARREGAR FILTROS DE RECEITAS
// =============================================
managerApp.carregarFiltrosReceitas = function() {
    var self = this;
    
    API.listarReceitas()
        .then(function(data) {
            var receitas = data.receitas || [];
            
            var tiposMap = {};
            receitas.forEach(function(r) {
                if (r.tipo && r.tipo.trim() !== '') {
                    tiposMap[r.tipo] = true;
                }
            });
            
            var tiposPadrao = ['Contrato Mensal', 'Contrato Avulso', 'Plantão Extra', 'Diária Avulsa', 'Consulta', 'Outro'];
            
            var tiposFinais = Object.keys(tiposMap);
            if (tiposFinais.length === 0) {
                tiposFinais = tiposPadrao;
            }
            
            tiposFinais.sort();
            
            console.log('📊 Tipos de receita encontrados:', tiposFinais);
            
            var selectTipo = document.getElementById('filtroTipoReceita');
            if (selectTipo) {
                var htmlTipo = '<option value="">Todos</option>';
                tiposFinais.forEach(function(t) {
                    htmlTipo += '<option value="' + t + '">' + t + '</option>';
                });
                selectTipo.innerHTML = htmlTipo;
            }
            
            self._tiposReceitaCache = tiposFinais;
        })
        .catch(function(error) {
            console.error('❌ Erro ao carregar filtros de receitas:', error);
            self._carregarFiltrosReceitasFallback();
        });
};

// =============================================
// CARREGAR FILTROS DE RECEITAS (FALLBACK)
// =============================================
managerApp._carregarFiltrosReceitasFallback = function() {
    var tiposPadrao = ['Contrato Mensal', 'Contrato Avulso', 'Plantão Extra', 'Diária Avulsa', 'Consulta', 'Outro'];
    
    var selectTipo = document.getElementById('filtroTipoReceita');
    if (selectTipo) {
        var htmlTipo = '<option value="">Todos</option>';
        tiposPadrao.forEach(function(t) {
            htmlTipo += '<option value="' + t + '">' + t + '</option>';
        });
        selectTipo.innerHTML = htmlTipo;
    }
};

// =============================================
// RENDERIZAR RECEITAS AVULSAS
// =============================================
managerApp.renderReceitasAvulsas = function() {
    var self = this;
    var mes = document.getElementById('filtroMesReceita').value;
    var tipo = document.getElementById('filtroTipoReceita').value;
    var assistido = document.getElementById('filtroAssistidoReceita').value;
    var statusFiltro = document.getElementById('filtroStatusReceita').value;
    
    API.listarReceitas()
        .then(function(data) {
            if (data.receitas) {
                self._receitasCache = data.receitas;
                
                var receitas = data.receitas;
                
                var receitasFiltradas = receitas.filter(function(r) {
                    var incluir = true;
                    
                    if (mes && r.data) {
                        var dataStr = r.data;
                        if (dataStr.includes('T')) {
                            dataStr = dataStr.split('T')[0];
                        }
                        var dataParts = dataStr.split('-');
                        if (dataParts.length === 3) {
                            var anoMes = dataParts[0] + '-' + dataParts[1];
                            if (anoMes !== mes) incluir = false;
                        } else {
                            var dataBR = dataStr.split('/');
                            if (dataBR.length === 3) {
                                var anoMesBR = dataBR[2] + '-' + dataBR[1];
                                if (anoMesBR !== mes) incluir = false;
                            }
                        }
                    }
                    
                    if (tipo && r.tipo !== tipo) incluir = false;
                    if (assistido && r.assistido !== assistido) incluir = false;
                    if (statusFiltro && r.status !== statusFiltro) incluir = false;
                    
                    return incluir;
                });
                
                var receitasOrdenadas = self.ordenarArrayPorColuna(
                    receitasFiltradas, 
                    self.ordenacaoReceitas.coluna, 
                    self.ordenacaoReceitas.direcao, 
                    'receitas'
                );
                
                self.atualizarIndicadoresOrdenacaoReceitas(self.ordenacaoReceitas.coluna);
                
                var total = 0;
                for (var i = 0; i < receitasOrdenadas.length; i++) {
                    total += parseFloat(receitasOrdenadas[i].valor) || 0;
                }
                document.getElementById('totalReceitasPeriodo').innerHTML = Utils.formatCurrency(total);
                
                var tbody = document.querySelector('#tabelaReceitas tbody');
                if (!receitasOrdenadas.length) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma receita encontrada para o período selecionado</td></tr>';
                    return;
                }
                
                var html = '';
                for (var i = 0; i < receitasOrdenadas.length; i++) {
                    var r = receitasOrdenadas[i];
                    var statusClass = r.status === 'Recebido' ? 'badge-success' : (r.status === 'Cancelado' ? 'badge-danger' : 'badge-warning');
                    
                    var dataFormatada = '';
                    if (r.data) {
                        var dataStr = r.data;
                        if (dataStr.includes('T')) {
                            dataStr = dataStr.split('T')[0];
                        }
                        var dataParts = dataStr.split('-');
                        if (dataParts.length === 3) {
                            dataFormatada = dataParts[2] + '/' + dataParts[1] + '/' + dataParts[0];
                        } else {
                            var dataBR = dataStr.split('/');
                            if (dataBR.length === 3) {
                                dataFormatada = dataStr;
                            } else {
                                dataFormatada = dataStr;
                            }
                        }
                    }
                    
                    var descricao = r.descricao || '';
                    var tipoExibicao = r.tipo || '';
                    
                    if (r.tipo === 'Contrato Mensal') {
                        var mesAno = '';
                        if (r.competencia && r.competencia !== '') {
                            var compParts = r.competencia.split('-');
                            if (compParts.length === 2 && !isNaN(compParts[0]) && !isNaN(compParts[1])) {
                                mesAno = compParts[1] + '/' + compParts[0];
                            }
                        }
                        if (!mesAno && r.data) {
                            var dataStr = r.data;
                            if (dataStr.includes('T')) {
                                dataStr = dataStr.split('T')[0];
                            }
                            var dataCompParts = dataStr.split('-');
                            if (dataCompParts.length === 3) {
                                mesAno = dataCompParts[1] + '/' + dataCompParts[0];
                            }
                        }
                        if (!mesAno && descricao) {
                            var regex = /(\d{4})-(\d{2})-\d{2}/;
                            var match = descricao.match(regex);
                            if (match) {
                                mesAno = match[2] + '/' + match[1];
                            }
                        }
                        
                        descricao = 'Contrato Mensal - ' + mesAno;
                        
                        var nomeAssistido = r.assistido;
                        if (nomeAssistido && self.cacheDiaVencimento[nomeAssistido]) {
                            var diaVct = self.cacheDiaVencimento[nomeAssistido];
                            descricao += ' (Dia Vct: ' + diaVct + ')';
                        }
                    }
                    
                    html += '<tr>';
                    html += '<td>' + dataFormatada + '</td>';
                    html += '<td>' + descricao + '</td>';
                    html += '<td>' + (r.assistido || '') + '</td>';
                    html += '<td>' + tipoExibicao + '</td>';
                    html += '<td class="text-right">' + Utils.formatCurrency(r.valor) + '</td>';
                    html += '<td><span class="badge ' + statusClass + '">' + (r.status || 'Pendente') + '</span></td>';
                    html += '<td><button class="btn btn-sm btn-secondary" onclick="managerApp.editarReceitaAvulsa(\'' + r.id + '\')">✏️</button> <button class="btn btn-sm btn-danger" onclick="managerApp.excluirReceitaAvulsa(\'' + r.id + '\')">🗑️</button></td>';
                    html += '</tr>';
                }
                tbody.innerHTML = html;
            }
        })
        .catch(function(error) {
            console.error('Erro ao carregar receitas:', error);
            Utils.showToast('Erro ao carregar receitas', 'error');
            
            var mesAtual = self.getMesReferencia();
            self.carregarDadosFinanceirosPorMes(mesAtual)
                .then(function(data) {
                    self.renderizarDadosFinanceiros(data, mesAtual);
                    self.carregarGraficosPorMes(mesAtual);
                })
                .catch(function(err) {
                    console.error('❌ Erro ao carregar dados financeiros:', err);
                });
        });
};

// =============================================
// GERAR RECEITAS MENSAIS
// =============================================
managerApp.gerarReceitasMensais = function() {
    var self = this;
    var hoje = new Date();
    var mes = hoje.getMonth() + 1;
    var ano = hoje.getFullYear();
    var mesStr = String(mes).padStart(2, '0');
    var competencia = ano + '-' + mesStr;
    
    this.confirmarGeracao(
        'Deseja gerar as receitas de contratos mensais para o mês ' + mes + '/' + ano + '?\n\n' +
        '📌 As receitas serão criadas com a data de vencimento de cada assistido.',
        '⚙️ Gerar Receitas do Mês',
        function(confirmado) {
            if (confirmado) {
                self._gerarReceitasComBarraProgresso(mes, ano, competencia);
            }
        }
    );
};

// =============================================
// 🆕 BARRA DE PROGRESSO — GERAR RECEITAS (padrão unificado)
// =============================================
managerApp._progressBarReceitas = {
    container: null, barra: null, percentual: null, contador: null,
    label: null, subtitulo: null, statusEl: null, tempoEl: null,
    stepsEls: [], startTime: null, intervalId: null, timeoutHideId: null
};

managerApp._mostrarBarraProgressoReceitas = function(titulo, subtitulo) {
    var self = this;
    
    if (this._progressBarReceitas.container) {
        try { this._progressBarReceitas.container.remove(); } catch(e) {}
    }
    if (this._progressBarReceitas.intervalId) {
        clearInterval(this._progressBarReceitas.intervalId);
    }
    if (this._progressBarReceitas.timeoutHideId) {
        clearTimeout(this._progressBarReceitas.timeoutHideId);
    }
    
    var container = document.createElement('div');
    container.id = 'progressoReceitasOverlay';
    container.style.cssText = [
        'position: fixed', 'top: 0', 'left: 0', 'width: 100%', 'height: 100%',
        'background: rgba(0, 0, 0, 0.7)', 'backdrop-filter: blur(4px)',
        '-webkit-backdrop-filter: blur(4px)', 'display: flex', 'justify-content: center',
        'align-items: center', 'z-index: 9999', 'flex-direction: column'
    ].join(';');
    
    container.innerHTML = [
        '<div style="background: white; border-radius: 16px; padding: 32px 40px; max-width: 520px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.35);">',
        '  <div style="text-align: center; margin-bottom: 20px;">',
        '    <div style="font-size: 28px; margin-bottom: 8px;">💰</div>',
        '    <div style="font-size: 18px; font-weight: 700; color: #1f2937;">' + (titulo || 'Processando...') + '</div>',
        '    <div style="font-size: 13px; color: #6b7280; margin-top: 4px;" id="progressoRecSubtitulo">' + (subtitulo || '') + '</div>',
        '  </div>',
        '  <div style="display: flex; justify-content: space-between; gap: 6px; margin-bottom: 18px;">',
        '    <div class="progressoRecStep" data-step="0" style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">',
        '      <div style="font-size: 20px; margin-bottom: 4px;">📡</div>',
        '      <div>Conectando</div>',
        '    </div>',
        '    <div class="progressoRecStep" data-step="1" style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">',
        '      <div style="font-size: 20px; margin-bottom: 4px;">📊</div>',
        '      <div>Gerando</div>',
        '    </div>',
        '    <div class="progressoRecStep" data-step="2" style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">',
        '      <div style="font-size: 20px; margin-bottom: 4px;">🧮</div>',
        '      <div>Atualizando</div>',
        '    </div>',
        '    <div class="progressoRecStep" data-step="3" style="flex: 1; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">',
        '      <div style="font-size: 20px; margin-bottom: 4px;">✅</div>',
        '      <div>Finalizando</div>',
        '    </div>',
        '  </div>',
        '  <div style="margin-bottom: 12px;">',
        '    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">',
        '      <span style="font-size: 12px; color: #6b7280;" id="progressoRecLabel">⏳ Iniciando...</span>',
        '      <span style="font-size: 12px; font-weight: 600; color: #0d9488;" id="progressoRecContador">0 / 4</span>',
        '    </div>',
        '    <div style="position: relative; background: #e5e7eb; border-radius: 10px; height: 24px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">',
        '      <div id="progressoRecBarra" style="width: 0%; height: 100%; background: linear-gradient(90deg, #0d9488, #0f766e); border-radius: 10px; transition: width 0.35s ease;"></div>',
        '      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #1f2937;" id="progressoRecPercentual">0%</div>',
        '    </div>',
        '  </div>',
        '  <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;">',
        '    <span id="progressoRecStatus">🔄 Preparando...</span>',
        '    <span id="progressoRecTempo">⏱️ 0s</span>',
        '  </div>',
        '</div>'
    ].join('');
    
    document.body.appendChild(container);
    
    this._progressBarReceitas.container = container;
    this._progressBarReceitas.barra = document.getElementById('progressoRecBarra');
    this._progressBarReceitas.percentual = document.getElementById('progressoRecPercentual');
    this._progressBarReceitas.contador = document.getElementById('progressoRecContador');
    this._progressBarReceitas.label = document.getElementById('progressoRecLabel');
    this._progressBarReceitas.subtitulo = document.getElementById('progressoRecSubtitulo');
    this._progressBarReceitas.statusEl = document.getElementById('progressoRecStatus');
    this._progressBarReceitas.tempoEl = document.getElementById('progressoRecTempo');
    this._progressBarReceitas.stepsEls = container.querySelectorAll('.progressoRecStep');
    this._progressBarReceitas.startTime = Date.now();
    
    this._progressBarReceitas.intervalId = setInterval(function() {
        if (self._progressBarReceitas.tempoEl && self._progressBarReceitas.startTime) {
            var elapsed = Math.floor((Date.now() - self._progressBarReceitas.startTime) / 1000);
            self._progressBarReceitas.tempoEl.textContent = '⏱️ ' + elapsed + 's';
        }
    }, 1000);
};

managerApp._atualizarBarraProgressoReceitas = function(step, percent, label, contador) {
    var pb = this._progressBarReceitas;
    if (!pb.container) return;
    
    if (pb.barra) pb.barra.style.width = percent + '%';
    if (pb.percentual) pb.percentual.textContent = percent + '%';
    if (pb.label && label) pb.label.innerHTML = label;
    if (pb.contador && contador) pb.contador.textContent = contador;
    
    if (pb.stepsEls && pb.stepsEls.length > 0) {
        for (var i = 0; i < pb.stepsEls.length; i++) {
            var el = pb.stepsEls[i];
            if (i < step) {
                el.style.color = '#10b981';
            } else if (i === step) {
                el.style.color = '#0d9488';
            } else {
                el.style.color = '#9ca3af';
            }
        }
    }
};

managerApp._esconderBarraProgressoReceitas = function(mensagem, tipo) {
    var pb = this._progressBarReceitas;
    if (!pb.container) return;
    
    if (pb.intervalId) {
        clearInterval(pb.intervalId);
        pb.intervalId = null;
    }
    
    if (pb.barra) pb.barra.style.width = '100%';
    if (pb.percentual) pb.percentual.textContent = '100%';
    if (pb.statusEl) {
        pb.statusEl.innerHTML = (tipo === 'error' || tipo === 'warning') ? '⚠️ ' + (mensagem || 'Finalizado') : '✅ ' + (mensagem || 'Finalizado!');
        pb.statusEl.style.color = (tipo === 'error') ? '#ef4444' : (tipo === 'warning') ? '#f59e0b' : '#10b981';
    }
    if (pb.stepsEls && pb.stepsEls.length > 0) {
        for (var i = 0; i < pb.stepsEls.length; i++) {
            pb.stepsEls[i].style.color = (tipo === 'error') ? '#ef4444' : '#10b981';
        }
    }
    
    var self = this;
    pb.timeoutHideId = setTimeout(function() {
        if (pb.container && pb.container.parentNode) {
            pb.container.parentNode.removeChild(pb.container);
        }
        self._progressBarReceitas = {
            container: null, barra: null, percentual: null, contador: null,
            label: null, subtitulo: null, statusEl: null, tempoEl: null,
            stepsEls: [], startTime: null, intervalId: null, timeoutHideId: null
        };
    }, 600);
};

// =============================================
// GERAR RECEITAS COM BARRA DE PROGRESSO (PADRONIZADA)
// =============================================
managerApp._gerarReceitasComBarraProgresso = function(mes, ano, competencia) {
    var self = this;
    var mesStr = String(mes).padStart(2, '0');
    
    console.log('📊 Gerando receitas para:', competencia);
    
    // 🔥 Mostrar barra
    this._mostrarBarraProgressoReceitas('Gerando Receitas Mensais', competencia);
    this._atualizarBarraProgressoReceitas(0, 10, '📡 Conectando à API...', '1 / 4');
    
    // Função finalizadora
    function finalizar(mensagem, tipo) {
        self._esconderBarraProgressoReceitas(mensagem, tipo);
        
        setTimeout(function() {
            Utils.showToast(mensagem, tipo || 'success');
            managerApp.invalidarCache('receitas');
            managerApp.invalidarCache('dashboard');
            
            self.renderReceitasAvulsas();
            
            var mesAtual = self.getMesReferencia();
            self.carregarDadosFinanceirosPorMes(mesAtual)
                .then(function(data) {
                    self.renderizarDadosFinanceiros(data, mesAtual);
                    self.carregarGraficosPorMes(mesAtual);
                })
                .catch(function(error) {
                    console.error('❌ Erro ao carregar dados financeiros:', error);
                });
            
            console.log('✅ Tela atualizada!');
        }, 650);
    }
    
    API.gerarReceitas(mes, ano)
        .then(function(data) {
            console.log('📊 Resposta da API:', data);
            
            if (!data.success) {
                throw new Error(data.erro || 'Erro ao gerar receitas');
            }
            
            var totalCriadas = data.criados || 0;
            var totalIgnorados = data.ignorados || 0;
            var totalErros = data.erros || 0;
            
            console.log('📊 Receitas criadas:', totalCriadas);
            console.log('📊 Ignorados:', totalIgnorados);
            console.log('📊 Erros:', totalErros);
            
            if (data.detalhes && data.detalhes.length > 0) {
                console.table(data.detalhes);
            }
            
            // 🔥 Etapa 1 → Etapa 2
            self._atualizarBarraProgressoReceitas(1, 40, '📊 Buscando receitas geradas...', '2 / 4');
            
            return API.listarReceitas()
                .then(function(receitasData) {
                    var receitas = receitasData.receitas || [];
                    self._receitasCache = receitas;
                    
                    var dataInicio = ano + '-' + mesStr + '-01';
                    var dataFim = ano + '-' + mesStr + '-31';
                    
                    var receitasMes = receitas.filter(function(r) {
                        if (!r.data) return false;
                        var dataStr = r.data;
                        if (dataStr.includes('T')) {
                            dataStr = dataStr.split('T')[0];
                        }
                        var tipoReceita = r.tipoAvulso || r.tipo || '';
                        return dataStr >= dataInicio && dataStr <= dataFim && 
                               tipoReceita === 'Contrato Mensal';
                    });
                    
                    console.log('📊 Receitas do mês encontradas:', receitasMes.length);
                    
                    var mensagemFinal = '';
                    var tipoFinal = 'success';
                    
                    if (receitasMes.length === 0 && totalCriadas === 0) {
                        mensagemFinal = 'Nenhuma receita foi gerada. ';
                        if (totalIgnorados > 0) {
                            mensagemFinal += totalIgnorados + ' assistidos ignorados. ';
                        }
                        if (totalErros > 0) {
                            mensagemFinal += totalErros + ' erros ocorreram. ';
                        }
                        if (!mensagemFinal.includes('assistidos') && !mensagemFinal.includes('erros')) {
                            mensagemFinal += 'Nenhum assistido ativo com contrato mensal encontrado.';
                        }
                        tipoFinal = 'warning';
                        finalizar(mensagemFinal, tipoFinal);
                        return;
                    }
                    
                    if (receitasMes.length > 0) {
                        var total = receitasMes.length;
                        var processados = 0;
                        var atualizados = 0;
                        var erros = 0;
                        
                        self._atualizarBarraProgressoReceitas(2, 60, '🧮 Atualizando datas...', '3 / 4');
                        
                        (async function() {
                            for (var i = 0; i < receitasMes.length; i++) {
                                var r = receitasMes[i];
                                var nomeAssistido = r.assistido;
                                
                                try {
                                    var detalhes = await API.getDadosAssistido(nomeAssistido);
                                    
                                    if (detalhes.result === 'success') {
                                        var diaVencimento = detalhes.diaVencimento || '';
                                        var dia = parseInt(diaVencimento) || 1;
                                        if (dia < 1) dia = 1;
                                        if (dia > 31) dia = 31;
                                        var diaStr = String(dia).padStart(2, '0');
                                        var dataCorreta = ano + '-' + mesStr + '-' + diaStr;
                                        
                                        var dataAtual = r.data;
                                        if (dataAtual.includes('T')) {
                                            dataAtual = dataAtual.split('T')[0];
                                        }
                                        
                                        if (dataAtual !== dataCorreta) {
                                            console.log('📝 Atualizando', r.assistido, 'de', dataAtual, 'para', dataCorreta);
                                            
                                            var response = await API.atualizarReceitaAvulsa({
                                                id: r.id,
                                                data: dataCorreta,
                                                descricao: r.descricao,
                                                assistido: r.assistido,
                                                valor: r.valor,
                                                tipoAvulso: r.tipoAvulso || r.tipo || 'Contrato Mensal',
                                                status: r.status
                                            });
                                            
                                            if (response.result === 'success') {
                                                atualizados++;
                                                console.log('✅ Data atualizada para', r.assistido, '→', dataCorreta);
                                            } else {
                                                erros++;
                                                console.warn('❌ Erro ao atualizar data de', r.assistido, response.error);
                                            }
                                        }
                                    } else {
                                        erros++;
                                        console.warn('❌ Erro ao buscar dados de', r.assistido);
                                    }
                                } catch (error) {
                                    erros++;
                                    console.warn('❌ Erro ao processar', r.assistido, error);
                                }
                                
                                processados++;
                                
                                // Percentual dinâmico de 60 a 90%
                                var pctLoop = 60 + Math.round((processados / total) * 30);
                                self._atualizarBarraProgressoReceitas(2, pctLoop, '🧮 ' + r.assistido, processados + ' / ' + total);
                            }
                            
                            if (totalCriadas > 0) {
                                mensagemFinal = totalCriadas + ' receita(s) gerada(s)!';
                            } else if (atualizados > 0) {
                                mensagemFinal = atualizados + ' receita(s) atualizada(s)!';
                            } else if (receitasMes.length > 0) {
                                mensagemFinal = receitasMes.length + ' receita(s) já existentes para este mês.';
                            } else {
                                mensagemFinal = 'Nenhuma receita encontrada para este mês.';
                            }
                            
                            if (erros > 0) {
                                mensagemFinal += ' (' + erros + ' erro(s))';
                                tipoFinal = 'warning';
                            }
                            
                            self._atualizarBarraProgressoReceitas(3, 95, '✅ Finalizando...', '4 / 4');
                            
                            finalizar(mensagemFinal, tipoFinal);
                        })();
                    } else {
                        finalizar('Nenhuma receita encontrada para este mês.', 'warning');
                    }
                });
        })
        .catch(function(error) {
            console.error('❌ Erro ao gerar receitas:', error);
            self._esconderBarraProgressoReceitas('Erro: ' + error.message, 'error');
            setTimeout(function() {
                Utils.showToast('Erro ao gerar receitas: ' + error.message, 'error');
            }, 650);
        });
};

// =============================================
// CONFIRMAR GERAÇÃO (PADRONIZADO)
// =============================================
managerApp.confirmarGeracao = function(mensagem, titulo, callback) {
    var modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').innerHTML = titulo || '⚠️ Confirmação';
    document.getElementById('modalBody').innerHTML =
        '<div class="modal-confirm-icon" style="background: var(--primary-100); color: var(--primary-600);">⚙️</div>' +
        '<div class="modal-confirm-title">' + (titulo || 'Confirmar Geração') + '</div>' +
        '<div class="modal-confirm-message">' + mensagem + '</div>' +
        '<div class="modal-confirm-warning" style="background: var(--primary-100); color: var(--primary-700);">Os registros serão criados com status "Pendente".</div>';
    
    // 🔥 PADRONIZADO: botões com flex: 1 (50% cada)
    document.getElementById('modalFooter').innerHTML =
        '<div style="display: flex; gap: 12px; width: 100%;">' +
        '  <button class="btn btn-secondary" id="modalConfirmCancelBtn" style="flex: 1;">Cancelar</button>' +
        '  <button class="btn btn-primary" id="modalConfirmOkBtn" style="flex: 1;">Confirmar Geração</button>' +
        '</div>';
    
    modal.style.display = 'flex';
    
    document.getElementById('modalConfirmCancelBtn').onclick = function() {
        modal.style.display = 'none';
        if (callback && typeof callback === 'function') callback(false);
    };
    document.getElementById('modalConfirmOkBtn').onclick = function() {
        modal.style.display = 'none';
        if (callback && typeof callback === 'function') callback(true);
    };
};

// =============================================
// ABRIR MODAL RECEITA AVULSA (COM ORDENAÇÃO ALFABÉTICA)
// =============================================
managerApp.abrirModalReceitaAvulsa = function(receita, id) {
    var self = this;
    var isEdicao = receita && receita.id;
    var modal = document.getElementById('modalOverlay');
    
    function carregarTipos() {
        return new Promise(function(resolve) {
            if (self._tiposReceitaCache && self._tiposReceitaCache.length > 0) {
                resolve(self._tiposReceitaCache);
                return;
            }
            
            API.listarReceitas()
                .then(function(data) {
                    var receitas = data.receitas || [];
                    var tiposMap = {};
                    receitas.forEach(function(r) {
                        if (r.tipo && r.tipo.trim() !== '') {
                            tiposMap[r.tipo] = true;
                        }
                    });
                    
                    var tiposPadrao = ['Contrato Mensal', 'Contrato Avulso', 'Plantão Extra', 'Diária Avulsa', 'Consulta', 'Outro'];
                    var tiposFinais = Object.keys(tiposMap);
                    if (tiposFinais.length === 0) {
                        tiposFinais = tiposPadrao;
                    }
                    tiposFinais.sort();
                    
                    self._tiposReceitaCache = tiposFinais;
                    resolve(tiposFinais);
                })
                .catch(function(error) {
                    console.error('❌ Erro ao carregar tipos:', error);
                    var tiposFallback = ['Contrato Mensal', 'Contrato Avulso', 'Plantão Extra', 'Diária Avulsa', 'Consulta', 'Outro'];
                    self._tiposReceitaCache = tiposFallback;
                    resolve(tiposFallback);
                });
        });
    }
    
    function carregarAssistidosAtivos() {
        return new Promise(function(resolve) {
            var assistidosAtivos = [];
            var dashboard = self.dashboardCache || {};
            
            if (dashboard.assistidos && Array.isArray(dashboard.assistidos)) {
                assistidosAtivos = dashboard.assistidos
                    .filter(function(a) { return a.status === 'Ativo'; })
                    .map(function(a) { return a.nome; })
                    .sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
                console.log('📊 Assistidos ativos do dashboardCache:', assistidosAtivos.length);
                if (assistidosAtivos.length > 0) {
                    resolve(assistidosAtivos);
                    return;
                }
            }
            
            if (self.assistidosList && self.assistidosList.length > 0) {
                assistidosAtivos = self.assistidosList.slice()
                    .sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
                console.log('📊 Assistidos do assistidosList:', assistidosAtivos.length);
                resolve(assistidosAtivos);
                return;
            }
            
            console.log('🔄 Buscando assistidos ativos da API...');
            API.getAssistidosComStatus()
                .then(function(data) {
                    if (data.result === 'success' && data.assistidos) {
                        assistidosAtivos = data.assistidos
                            .filter(function(a) { return a.status === 'Ativo'; })
                            .map(function(a) { return a.nome; })
                            .sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
                        self.assistidosList = assistidosAtivos;
                        console.log('✅ Assistidos carregados da API:', assistidosAtivos.length);
                        resolve(assistidosAtivos);
                    } else {
                        console.warn('⚠️ Nenhum assistido encontrado na API');
                        resolve([]);
                    }
                })
                .catch(function(error) {
                    console.error('❌ Erro ao carregar assistidos:', error);
                    resolve([]);
                });
        });
    }
    
    function renderizarModal(tipos, assistidosAtivos) {
        document.getElementById('modalTitle').innerHTML = isEdicao ? '✏️ Editar Receita Avulsa' : '➕ Nova Receita Avulsa';
        
        var dataValue = isEdicao ? (receita.data ? receita.data.split('T')[0] : new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
        var descValue = isEdicao ? (receita.descricao || '') : '';
        var assistidoValue = isEdicao ? (receita.assistido || '') : '';
        var valorValue = isEdicao ? (receita.valor || '') : '';
        var tipoValue = isEdicao ? (receita.tipo || '') : '';
        var statusValue = isEdicao ? (receita.status || 'Pendente') : 'Pendente';
        
        var assistidosOptions = '<option value="">Selecione um assistido</option>';
        if (assistidosAtivos && assistidosAtivos.length > 0) {
            for (var i = 0; i < assistidosAtivos.length; i++) {
                var selected = (assistidoValue === assistidosAtivos[i]) ? 'selected' : '';
                assistidosOptions += '<option value="' + assistidosAtivos[i] + '" ' + selected + '>' + assistidosAtivos[i] + '</option>';
            }
        } else {
            assistidosOptions += '<option value="" disabled>⚠️ Nenhum assistido ativo disponível</option>';
        }
        
        var tiposOptions = '';
        if (tipos && tipos.length > 0) {
            for (var j = 0; j < tipos.length; j++) {
                var selectedTipo = (tipoValue === tipos[j]) ? 'selected' : '';
                tiposOptions += '<option value="' + tipos[j] + '" ' + selectedTipo + '>' + tipos[j] + '</option>';
            }
        } else {
            tiposOptions = '<option value="Outro" selected>Outro</option>';
        }
        
        var statusOptions = '<option value="Pendente" ' + (statusValue === 'Pendente' ? 'selected' : '') + '>Pendente</option>';
        statusOptions += '<option value="Recebido" ' + (statusValue === 'Recebido' ? 'selected' : '') + '>Recebido</option>';
        statusOptions += '<option value="Cancelado" ' + (statusValue === 'Cancelado' ? 'selected' : '') + '>Cancelado</option>';
        
        document.getElementById('modalBody').innerHTML = 
            '<div class="form-row">' +
            '<div class="form-group"><label>Data</label><input type="date" class="form-input" id="modalReceitaData" value="' + dataValue + '"></div>' +
            '<div class="form-group"><label>Tipo</label><select class="form-select" id="modalReceitaTipo">' + tiposOptions + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>Descrição</label><input class="form-input" id="modalReceitaDesc" value="' + descValue.replace(/"/g, '&quot;') + '"></div>' +
            '<div class="form-group"><label>Assistido</label><select class="form-select" id="modalReceitaAssistido">' + assistidosOptions + '</select></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>Valor (R$)</label><input class="form-input input-currency" id="modalReceitaValor" value="' + (valorValue ? Utils.formatCurrency(valorValue) : '') + '"></div>' +
            '<div class="form-group"><label>Status</label><select class="form-select" id="modalReceitaStatus">' + statusOptions + '</select></div>' +
            '</div>';
        
        // 🔥 PADRONIZADO: botões com flex: 1 (50% cada)
        document.getElementById('modalFooter').innerHTML = 
            '<div style="display: flex; gap: 12px; width: 100%;">' +
            '  <button class="btn btn-secondary" onclick="managerApp.fecharModal()" style="flex: 1;">Cancelar</button>' +
            '  <button class="btn btn-success" id="modalSalvarReceita" style="flex: 1;">Salvar</button>' +
            '</div>';
        
        modal.style.display = 'flex';
        
        var currencyInput = document.getElementById('modalReceitaValor');
        if (currencyInput) Utils.applyCurrencyMask(currencyInput);
        
        document.getElementById('modalSalvarReceita').onclick = function() {
            var val = Utils.parseCurrencyToNumber(document.getElementById('modalReceitaValor').value);
            var data = {
                data: document.getElementById('modalReceitaData').value,
                descricao: document.getElementById('modalReceitaDesc').value,
                assistido: document.getElementById('modalReceitaAssistido').value,
                valor: val,
                tipoAvulso: document.getElementById('modalReceitaTipo').value,
                status: document.getElementById('modalReceitaStatus').value
            };
            
            if (!data.assistido) {
                Utils.showToast('Selecione um assistido', 'warning');
                return;
            }
            
            Utils.showLoading(isEdicao ? 'Atualizando...' : 'Salvando...');
            
            if (isEdicao) {
                data.id = receita.id;
                API.atualizarReceitaAvulsa(data)
                    .then(function(response) {
                        Utils.hideLoading();
                        if (response.result === 'success') {
                            Utils.showToast('Receita atualizada com sucesso!');
                            self._receitasCache = null;
                            self.renderReceitasAvulsas();
                            self.fecharModal();
                            managerApp._atualizarTudoAposOperacaoFinanceira();
                        } else {
                            Utils.showToast('Erro ao salvar: ' + (response.error || 'Erro desconhecido'), 'error');
                        }
                    })
                    .catch(function(error) { 
                        Utils.hideLoading();
                        Utils.showToast('Erro ao salvar: ' + error.message, 'error'); 
                    });
            } else {
                API.criarReceitaAvulsa(data)
                    .then(function(response) {
                        Utils.hideLoading();
                        if (response.result === 'success') {
                            Utils.showToast('Receita criada com sucesso!');
                            self._receitasCache = null;
                            self.renderReceitasAvulsas();
                            self.fecharModal();
                            managerApp._atualizarTudoAposOperacaoFinanceira();
                        } else {
                            Utils.showToast('Erro ao salvar: ' + (response.error || 'Erro desconhecido'), 'error');
                        }
                    })
                    .catch(function(error) { 
                        Utils.hideLoading();
                        Utils.showToast('Erro ao salvar: ' + error.message, 'error'); 
                    });
            }
        };
        
        console.log('✅ Modal de receita exibido em ', performance.now(), 'ms');
    }
    
    Utils.showLoading('Carregando dados...');
    
    Promise.all([carregarTipos(), carregarAssistidosAtivos()])
    .then(function(resultados) {
        Utils.hideLoading();
        renderizarModal(resultados[0], resultados[1]);
    })
    .catch(function(error) {
        Utils.hideLoading();
        console.error('❌ Erro ao carregar dados:', error);
        var tiposFallback = ['Contrato Mensal', 'Contrato Avulso', 'Plantão Extra', 'Diária Avulsa', 'Consulta', 'Outro'];
        renderizarModal(tiposFallback, []);
    });
};

// =============================================
// EDITAR RECEITA AVULSA
// =============================================
managerApp.editarReceitaAvulsa = function(id) {
    var self = this;
    
    if (this._receitasCache && this._receitasCache.length > 0) {
        var receita = this._receitasCache.find(function(r) { 
            return String(r.id) === String(id); 
        });
        if (receita) {
            self.abrirModalReceitaAvulsa(receita, id);
            return;
        }
    }
    
    Utils.showLoading('Carregando receita...');
    
    API.listarReceitas()
        .then(function(data) {
            Utils.hideLoading();
            
            if (data.receitas) {
                self._receitasCache = data.receitas;
                
                var receita = data.receitas.find(function(r) { 
                    return String(r.id) === String(id); 
                });
                
                if (receita) {
                    self.abrirModalReceitaAvulsa(receita, id);
                } else {
                    console.warn('⚠️ Receita com ID', id, 'não encontrada na listagem. IDs disponíveis:', 
                        data.receitas.map(function(r) { return r.id; }));
                    Utils.showToast('Receita não encontrada. Tente atualizar a página.', 'error');
                }
            }
        })
        .catch(function(error) { 
            Utils.hideLoading();
            Utils.showToast('Erro ao carregar: ' + error.message, 'error'); 
        });
};

// =============================================
// EXCLUIR RECEITA AVULSA
// =============================================
managerApp.excluirReceitaAvulsa = function(id) {
    var self = this;
    this.confirmarExclusao(
        'Deseja realmente excluir esta receita avulsa?',
        '🗑️ Excluir Receita Avulsa',
        function(confirmado) {
            if (confirmado) {
                Utils.showLoading('Excluindo...');
                API.excluirReceitaAvulsa(id)
                    .then(function(data) {
                        Utils.hideLoading();
                        if (data.result === 'success') {
                            Utils.showToast('Receita excluída com sucesso!');
                            self._receitasCache = null;
                            self.renderReceitasAvulsas();
                            managerApp._atualizarTudoAposOperacaoFinanceira();
                        } else {
                            Utils.showToast('Erro ao excluir: ' + (data.error || 'Erro desconhecido'), 'error');
                        }
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
// CARREGAR ASSISTIDOS PARA FILTRO
// =============================================
managerApp.carregarAssistidosParaFiltro = function() {
    API.getSheets()
        .then(function(data) {
            if (data.result === 'success') {
                var abas = data.sheets.filter(function(s) {
                    return !['Página Inicial', 'Dashboard', 'Configurações'].includes(s);
                });
                var selectAssistido = document.getElementById('filtroAssistidoReceita');
                var options = '<option value="">Todos</option>';
                for (var i = 0; i < abas.length; i++) {
                    options += '<option value="' + abas[i] + '">' + abas[i] + '</option>';
                }
                selectAssistido.innerHTML = options;
            }
        })
        .catch(function(error) { 
            console.error('Erro ao carregar assistidos:', error); 
        });
};
