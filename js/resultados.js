// =============================================
// RESULTADOS - managerJARDINSCare
// Demonstrativo de Resultados
// Versão 5.1 - Regime de Caixa + Projeção Média Móvel
// =============================================

// =============================================
// CALCULAR RESULTADOS (REGIME DE CAIXA)
// =============================================
managerApp.calcularResultados = function() {
    var self = this;
    var mes = document.getElementById('resultadoMes').value;
    if (!mes) return;
    
    var parts = mes.split('-');
    var ano = parts[0];
    var mesNum = parts[1];
    var mesStr = String(parseInt(mesNum)).padStart(2, '0');
    
    var graficoEvolucaoDiv = document.getElementById('graficoEvolucaoResultados');
    if (graficoEvolucaoDiv) graficoEvolucaoDiv.style.display = 'none';
    
    var resultadoContainer = document.getElementById('resultadoContent');
    
    var progressoHtml = '<div id="resultadoProgressoWrapper" style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 20px;">' +
        '<div style="margin-bottom: 16px;">' +
        '<span id="resultadoProgressoLabel" style="font-weight: 600;">Buscando receitas...</span>' +
        '<span id="resultadoProgressoPercent" style="float: right;">25%</span>' +
        '</div>' +
        '<div style="background: #e5e7eb; border-radius: 10px; height: 8px; overflow: hidden;">' +
        '<div id="resultadoProgressoBar" style="width: 25%; background: linear-gradient(90deg, #0d9488, #0f766e); height: 100%; border-radius: 10px; transition: width 0.3s;"></div>' +
        '</div>' +
        '<div style="margin-top: 12px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">' +
        '<div id="resultadoStep1" style="font-size: 11px; color: #0d9488;">📊 Receitas</div>' +
        '<div>→</div>' +
        '<div id="resultadoStep2" style="font-size: 11px; color: #9ca3af;">💰 Despesas</div>' +
        '<div>→</div>' +
        '<div id="resultadoStep3" style="font-size: 11px; color: #9ca3af;">📈 Métricas</div>' +
        '<div>→</div>' +
        '<div id="resultadoStep4" style="font-size: 11px; color: #9ca3af;">🎨 Renderizar</div>' +
        '</div>' +
        '</div>';
    
    resultadoContainer.innerHTML = progressoHtml;
    
    function atualizarProgresso(percent, label, stepAtivo) {
        var bar = document.getElementById('resultadoProgressoBar');
        var percentSpan = document.getElementById('resultadoProgressoPercent');
        var labelSpan = document.getElementById('resultadoProgressoLabel');
        if (bar) bar.style.width = percent + '%';
        if (percentSpan) percentSpan.textContent = percent + '%';
        if (labelSpan) labelSpan.textContent = label;
        
        for (var i = 1; i <= 4; i++) {
            var stepEl = document.getElementById('resultadoStep' + i);
            if (stepEl) {
                if (i === stepAtivo) {
                    stepEl.style.color = '#0d9488';
                    stepEl.style.fontWeight = '600';
                } else if (i < stepAtivo) {
                    stepEl.style.color = '#10b981';
                    stepEl.style.fontWeight = '500';
                } else {
                    stepEl.style.color = '#9ca3af';
                    stepEl.style.fontWeight = '400';
                }
            }
        }
    }
    
    atualizarProgresso(25, 'Buscando receitas...', 1);
    
    // =============================================
    // PREPARAR ÚLTIMOS 12 MESES (para gráfico de evolução)
    // =============================================
    var mesesLabels = [];
    var receitasMensais = [];
    var despesasMensais = [];
    
    for (var i = 11; i >= 0; i--) {
        var data = new Date(parseInt(ano), parseInt(mesNum) - 1 - i, 1);
        var anoData = data.getFullYear();
        var mesData = data.getMonth() + 1;
        var mesDataStr = String(mesData).padStart(2, '0');
        mesesLabels.push(anoData + '-' + mesDataStr);
        receitasMensais.push(0);
        despesasMensais.push(0);
    }
    
    // =============================================
    // PASSO 1: BUSCAR ASSISTIDOS (para mapa de região e custo cadastro)
    // =============================================
    var mapaAssistidos = {};
    
    API.getAssistidosCompleto()
        .then(function(assistidosData) {
            if (assistidosData.result === 'success' && assistidosData.assistidos) {
                for (var i = 0; i < assistidosData.assistidos.length; i++) {
                    var a = assistidosData.assistidos[i];
                    mapaAssistidos[a.nome] = {
                        totalHrsMes: parseFloat(a.totalHrsMes) || 0,
                        vlrPlantao: Utils.parseCurrencyToNumber(a.vlrPlantao) || 0,
                        regiao: a.regiao || 'Não informada'
                    };
                }
                console.log('📋 Mapa de assistidos carregado:', Object.keys(mapaAssistidos).length);
            }
            return API.listarReceitas();
        })
        .then(function(data) {
            atualizarProgresso(50, 'Buscando despesas...', 2);
            
            // =============================================
            // PROCESSAR RECEITAS
            // =============================================
            var receitasRealizadasMes = [];
            var receitasContratos = 0;
            var receitasAvulsas = 0;
            
            if (data.receitas) {
                for (var i = 0; i < data.receitas.length; i++) {
                    var r = data.receitas[i];
                    if (!r.data || r.status !== 'Recebido') continue;
                    
                    var dataStr = r.data.split('T')[0];
                    var dataParts = dataStr.split('-');
                    var periodo = dataParts[0] + '-' + dataParts[1];
                    
                    // Acumular para gráfico de 12 meses
                    var indexMes = mesesLabels.indexOf(periodo);
                    if (indexMes !== -1) {
                        var valor = parseFloat(r.valor) || 0;
                        receitasMensais[indexMes] += valor;
                    }
                    
                    // Se for do mês de referência, entra na lista realizada
                    if (dataParts[0] == ano && dataParts[1] == mesStr) {
                        var valorMes = parseFloat(r.valor) || 0;
                        var tipoReceita = r.tipoAvulso || r.tipo || '';
                        
                        receitasRealizadasMes.push(r);
                        
                        if (tipoReceita === 'Contrato Mensal') {
                            receitasContratos += valorMes;
                        } else {
                            receitasAvulsas += valorMes;
                        }
                    }
                }
            }
            
            return API.listarDespesas()
                .then(function(despData) {
                    atualizarProgresso(75, 'Calculando métricas...', 3);
                    
                    // =============================================
                    // PROCESSAR DESPESAS
                    // =============================================
                    var despesasRealizadasMes = [];
                    
                    if (despData.despesas) {
                        for (var i = 0; i < despData.despesas.length; i++) {
                            var d = despData.despesas[i];
                            if (!d.data || d.status !== 'Pago') continue;
                            
                            var dataStr = d.data.split('T')[0];
                            var dataParts = dataStr.split('-');
                            var periodo = dataParts[0] + '-' + dataParts[1];
                            
                            // Acumular para gráfico de 12 meses
                            var indexMes = mesesLabels.indexOf(periodo);
                            if (indexMes !== -1) {
                                var valor = parseFloat(d.valor) || 0;
                                despesasMensais[indexMes] += valor;
                            }
                            
                            // Se for do mês de referência, entra na lista realizada
                            if (dataParts[0] == ano && dataParts[1] == mesStr) {
                                despesasRealizadasMes.push(d);
                            }
                        }
                    }
                    
                    // =============================================
                    // TOTAIS
                    // =============================================
                    var totalReceitas = receitasContratos + receitasAvulsas;
                    var totalDespesas = 0;
                    for (var i = 0; i < despesasRealizadasMes.length; i++) {
                        totalDespesas += parseFloat(despesasRealizadasMes[i].valor) || 0;
                    }
                    
                    var lucroBruto = totalReceitas - totalDespesas;
                    var lucroLiquido = lucroBruto;
                    var margemBruta = totalReceitas > 0 ? (lucroBruto / totalReceitas * 100) : 0;
                    var margemLiquida = margemBruta;
                    
                    // =============================================
                    // SEPARAR DESPESAS OPERACIONAIS vs CUSTO PC
                    // =============================================
                    var despesasOperacionaisReais = 0;
                    var despesasCustoPCReais = 0;
                    var despesasPorCategoria = {};
                    var despesasPorFornecedor = {};
                    
                    for (var i = 0; i < despesasRealizadasMes.length; i++) {
                        var d = despesasRealizadasMes[i];
                        var valor = parseFloat(d.valor) || 0;
                        var cat = d.categoria || 'Outros';
                        
                        if (cat === 'Custo Personal Care') {
                            despesasCustoPCReais += valor;
                        } else {
                            despesasOperacionaisReais += valor;
                        }
                        
                        if (!despesasPorCategoria[cat]) despesasPorCategoria[cat] = 0;
                        despesasPorCategoria[cat] += valor;
                        
                        var forn = d.fornecedor || 'Não informado';
                        if (!despesasPorFornecedor[forn]) despesasPorFornecedor[forn] = 0;
                        despesasPorFornecedor[forn] += valor;
                    }
                    
                    // =============================================
                    // AGRUPAR RECEITAS POR ASSISTIDO
                    // =============================================
                    var porAssistido = {};
                    var receitaTotalRecebida = 0;
                    
                    for (var i = 0; i < receitasRealizadasMes.length; i++) {
                        var r = receitasRealizadasMes[i];
                        var nomeAssistido = r.assistido || '';
                        if (!nomeAssistido) continue;
                        
                        var valor = parseFloat(r.valor) || 0;
                        if (valor === 0) continue;
                        
                        if (!porAssistido[nomeAssistido]) {
                            porAssistido[nomeAssistido] = {
                                nome: nomeAssistido,
                                receitaRecebida: 0,
                                custoPCcadastro: 0,
                                regiao: 'Não informada',
                                rateioOp: 0,
                                resultado: 0,
                                isDeficitario: false
                            };
                        }
                        
                        porAssistido[nomeAssistido].receitaRecebida += valor;
                        receitaTotalRecebida += valor;
                    }
                    
                    // =============================================
                    // PREENCHER CUSTO PC DO CADASTRO + REGIÃO
                    // =============================================
                    for (var nome in porAssistido) {
                        if (!porAssistido.hasOwnProperty(nome)) continue;
                        
                        var dados = mapaAssistidos[nome];
                        if (dados) {
                            porAssistido[nome].custoPCcadastro = 
                                (dados.totalHrsMes || 0) * (dados.vlrPlantao || 0);
                            porAssistido[nome].regiao = dados.regiao || 'Não informada';
                        }
                        // Se não achar no cadastro, custo = 0 (conforme decisão)
                    }
                    
                    // =============================================
                    // RATEIO OPERACIONAL REAL (proporcional à receita recebida)
                    // =============================================
                    for (var nome in porAssistido) {
                        if (!porAssistido.hasOwnProperty(nome)) continue;
                        
                        var a = porAssistido[nome];
                        a.rateioOp = receitaTotalRecebida > 0 
                            ? (a.receitaRecebida / receitaTotalRecebida) * despesasOperacionaisReais 
                            : 0;
                        a.resultado = a.receitaRecebida - a.custoPCcadastro - a.rateioOp;
                        a.isDeficitario = a.resultado < 0;
                    }
                    
                    // =============================================
                    // LISTA ORDENADA E DERIVADOS
                    // =============================================
                    var listaPorAssistido = [];
                    for (var nome in porAssistido) {
                        if (porAssistido.hasOwnProperty(nome)) {
                            listaPorAssistido.push(porAssistido[nome]);
                        }
                    }
                    listaPorAssistido.sort(function(a, b) { return b.resultado - a.resultado; });
                    
                    var totalAssistidos = listaPorAssistido.length;
                    var lucrativos = listaPorAssistido.filter(function(a) { return !a.isDeficitario; });
                    var deficitarios = listaPorAssistido.filter(function(a) { return a.isDeficitario; });
                    
                    // =============================================
                    // CONCENTRAÇÃO TOP 5 (sobre receita recebida)
                    // =============================================
                    var receitasOrdenadas = listaPorAssistido
                        .map(function(a) { return a.receitaRecebida; })
                        .sort(function(a, b) { return b - a; });
                    
                    var top5Receita = 0;
                    for (var i = 0; i < Math.min(5, receitasOrdenadas.length); i++) {
                        top5Receita += receitasOrdenadas[i];
                    }
                    var concentracaoTop5 = receitaTotalRecebida > 0 
                        ? (top5Receita / receitaTotalRecebida * 100) 
                        : 0;
                    var indiceDiversificacao = 1 - (concentracaoTop5 / 100);
                    
                    // =============================================
                    // VARIAÇÃO MENSAL (SEM MES_CORTE)
                    // =============================================
                    var mesAnterior = self.calcularMesAnterior(mes);
                    var indexMesAnterior = mesesLabels.indexOf(mesAnterior);
                    var receitasAnterior = indexMesAnterior !== -1 ? receitasMensais[indexMesAnterior] : 0;
                    var despesasAnterior = indexMesAnterior !== -1 ? despesasMensais[indexMesAnterior] : 0;
                    
                    var temBaseAnterior = receitasAnterior > 0;
                    var variacaoReceita = temBaseAnterior 
                        ? ((totalReceitas - receitasAnterior) / receitasAnterior * 100) 
                        : 0;
                    
                    var variacaoDespesa = despesasAnterior > 0 
                        ? ((totalDespesas - despesasAnterior) / despesasAnterior * 100) 
                        : 0;
                    
                    // =============================================
                    // PROJEÇÃO PRÓXIMO MÊS (média móvel dos últimos 3 meses + 5%)
                    // =============================================
                    // Coletar os últimos 3 meses que tenham dado (receita ou despesa > 0)
                    var ultimos3MesesProjecao = [];
                    for (var i = mesesLabels.length - 1; i >= 0 && ultimos3MesesProjecao.length < 3; i--) {
                        var receitaM = receitasMensais[i] || 0;
                        var despesaM = despesasMensais[i] || 0;
                        if (receitaM > 0 || despesaM > 0) {
                            ultimos3MesesProjecao.push({
                                mes: mesesLabels[i],
                                receita: receitaM,
                                despesa: despesaM
                            });
                        }
                    }
                    
                    var mediaReceitas3M = 0;
                    var mediaDespesas3M = 0;
                    if (ultimos3MesesProjecao.length > 0) {
                        var somaRecProj = 0;
                        var somaDespProj = 0;
                        for (var i = 0; i < ultimos3MesesProjecao.length; i++) {
                            somaRecProj += ultimos3MesesProjecao[i].receita;
                            somaDespProj += ultimos3MesesProjecao[i].despesa;
                        }
                        mediaReceitas3M = somaRecProj / ultimos3MesesProjecao.length;
                        mediaDespesas3M = somaDespProj / ultimos3MesesProjecao.length;
                    }
                    
                    var receitaProjetada = mediaReceitas3M * 1.05;
                    var despesaProjetada = mediaDespesas3M;
                    var projecaoResultado = receitaProjetada - despesaProjetada;
                    
                    console.log('📊 Projeção (média móvel dos últimos ' + ultimos3MesesProjecao.length + ' meses + 5%):');
                    console.log('   Meses considerados:', ultimos3MesesProjecao.map(function(m) { return m.mes; }).join(', '));
                    console.log('   Média Receita:', Utils.formatCurrency(mediaReceitas3M));
                    console.log('   Média Despesa:', Utils.formatCurrency(mediaDespesas3M));
                    console.log('   Receita Projetada (+5%):', Utils.formatCurrency(receitaProjetada));
                    console.log('   Despesa Projetada:', Utils.formatCurrency(despesaProjetada));
                    console.log('   Resultado Projetado:', Utils.formatCurrency(projecaoResultado));
                    
                    // =============================================
                    // EFICIÊNCIA OPERACIONAL
                    // =============================================
                    var custoPorAssistido = totalAssistidos > 0 ? totalDespesas / totalAssistidos : 0;
                    var receitaPorAssistido = totalAssistidos > 0 ? receitaTotalRecebida / totalAssistidos : 0;
                    var relacaoCustoReceita = receitaTotalRecebida > 0 
                        ? (totalDespesas / receitaTotalRecebida * 100) 
                        : 0;
                    
                    // =============================================
                    // PERFORMANCE POR REGIÃO
                    // =============================================
                    var regioes = {};
                    for (var i = 0; i < listaPorAssistido.length; i++) {
                        var a = listaPorAssistido[i];
                        var reg = a.regiao || 'Não informada';
                        
                        if (!regioes[reg]) {
                            regioes[reg] = { 
                                receita: 0, 
                                custoPC: 0, 
                                custoOp: 0, 
                                resultado: 0, 
                                count: 0 
                            };
                        }
                        
                        regioes[reg].receita += a.receitaRecebida;
                        regioes[reg].custoPC += a.custoPCcadastro;
                        regioes[reg].custoOp += a.rateioOp;
                        regioes[reg].resultado += a.resultado;
                        regioes[reg].count++;
                    }
                    
                    var regioesList = [];
                    for (var reg in regioes) {
                        if (!regioes.hasOwnProperty(reg)) continue;
                        var d = regioes[reg];
                        regioesList.push({
                            regiao: reg,
                            receita: d.receita,
                            custoProfissional: d.custoPC,
                            custoOp: d.custoOp,
                            resultado: d.resultado,
                            margem: d.receita > 0 ? (d.resultado / d.receita * 100) : 0,
                            count: d.count
                        });
                    }
                    regioesList.sort(function(a, b) { return b.margem - a.margem; });
                    
                    // =============================================
                    // RENDERIZAR
                    // =============================================
                    atualizarProgresso(100, 'Renderizando resultados...', 4);
                    
                    setTimeout(function() {
                        if (graficoEvolucaoDiv) graficoEvolucaoDiv.style.display = 'block';
                        self.renderizarGraficoResultados(mesesLabels, receitasMensais, despesasMensais);
                        
                        self.renderizarResultadosCompletos({
                            // Totais
                            totalReceitas: totalReceitas,
                            receitasContratos: receitasContratos,
                            receitasAvulsas: receitasAvulsas,
                            totalDespesas: totalDespesas,
                            lucroBruto: lucroBruto,
                            lucroLiquido: lucroLiquido,
                            margemBruta: margemBruta,
                            margemLiquida: margemLiquida,
                            
                            // Detalhamentos
                            listaReceitas: receitasRealizadasMes,
                            despesas: despesasRealizadasMes,
                            despesasPorCategoria: despesasPorCategoria,
                            despesasPorFornecedor: despesasPorFornecedor,
                            
                            // Rentabilidade por assistido (nova base)
                            listaPorAssistido: listaPorAssistido,
                            lucrativos: lucrativos,
                            deficitarios: deficitarios,
                            totalAssistidos: totalAssistidos,
                            
                            // Concentração
                            concentracaoTop5: concentracaoTop5,
                            indiceDiversificacao: indiceDiversificacao,
                            
                            // Variação
                            variacaoReceita: variacaoReceita,
                            temBaseAnterior: temBaseAnterior,
                            variacaoDespesa: variacaoDespesa,
                            
                            // Projeção (média móvel dos últimos 3 meses + 5%)
                            projecaoResultado: projecaoResultado,
                            receitaProjetada: receitaProjetada,
                            despesaProjetada: despesaProjetada,
                            mediaReceitas3M: mediaReceitas3M,
                            mediaDespesas3M: mediaDespesas3M,
                            mesesConsideradosProjecao: ultimos3MesesProjecao.length,
                            
                            // Eficiência
                            custoPorAssistido: custoPorAssistido,
                            receitaPorAssistido: receitaPorAssistido,
                            relacaoCustoReceita: relacaoCustoReceita,
                            
                            // Regiões
                            regioes: regioesList,
                            
                            // Despesas op. reais (substitui a meta)
                            despesasOperacionais: despesasOperacionaisReais,
                            
                            mesReferencia: mes
                        });
                    }, 300);
                });
        })
        .catch(function(error) {
            resultadoContainer.innerHTML = '<div class="empty-state">❌ Erro ao carregar resultados: ' + error.message + '</div>';
            Utils.showToast('Erro ao calcular resultados: ' + error.message, 'error');
        });
};

// =============================================
// CALCULAR MÊS ANTERIOR (FUNÇÃO AUXILIAR)
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
// RENDERIZAR RESULTADOS COMPLETOS
// =============================================
managerApp.renderizarResultadosCompletos = function(dados) {
    var container = document.getElementById('resultadoContent');
    if (!container) return;
    
    var mesExibicao = '';
    if (dados.mesReferencia) {
        var parts = dados.mesReferencia.split('-');
        var meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        mesExibicao = meses[parseInt(parts[1]) - 1] + '/' + parts[0];
    }
    
    var corLucroLiquido = dados.lucroLiquido >= 0 ? '#2563eb' : '#dc2626';
    var corMargemLiquida = dados.margemLiquida >= 15 ? '#10b981' : (dados.margemLiquida >= 5 ? '#f59e0b' : '#dc2626');
    
    // =============================================
    // CARDS DE RESUMO (LINHA 1)
    // =============================================
    var html = '';
    html += '<div style="font-size: 12px; color: var(--gray-500); margin-bottom: 16px;">📅 Mês de referência: <strong>' + mesExibicao + '</strong></div>';
    
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 16px; font-weight: 700; color: #2563eb;">' + Utils.formatCurrency(dados.totalReceitas) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">RECEITA TOTAL</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">📋</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 15px; font-weight: 700; color: #2563eb;">' + Utils.formatCurrency(dados.receitasAvulsas) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">RECEITAS AVULSAS</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 15px; font-weight: 700; color: #2563eb;">' + Utils.formatCurrency(dados.receitasContratos) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">CONTRATOS MENSAIS</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon red" style="width: 36px; height: 36px; font-size: 16px;">📉</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 15px; font-weight: 700; color: #dc2626;">' + Utils.formatCurrency(dados.totalDespesas) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">DESPESAS TOTAIS</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">🎯</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 16px; font-weight: 700; color: ' + corLucroLiquido + ';">' + Utils.formatCurrency(dados.lucroLiquido) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">RESULTADO LÍQUIDO</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    // =============================================
    // LINHA 2 - MARGENS
    // =============================================
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px; border-left: 3px solid ' + corMargemLiquida + ';">';
    html += '  <div class="stat-icon green" style="width: 36px; height: 36px; font-size: 16px;">📈</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value percent" style="font-size: 18px; font-weight: 700; color: ' + corMargemLiquida + ';">' + (dados.margemLiquida || 0).toFixed(1) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">MARGEM LÍQUIDA</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">(Receita - Despesas) / Receita</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card: Custo / Receita
    var corCustoReceita = dados.relacaoCustoReceita <= 70 ? '#10b981' : (dados.relacaoCustoReceita <= 85 ? '#f59e0b' : '#dc2626');
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px;">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">⚖️</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value percent" style="font-size: 16px; font-weight: 700; color: ' + corCustoReceita + ';">' + (dados.relacaoCustoReceita || 0).toFixed(1) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">CUSTO / RECEITA</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">Ideal < 70%</div>';
    html += '  </div>';
    html += '</div>';
    
    // Card: Custo por Assistido
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">👥</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 15px; font-weight: 700; color: #2563eb;">' + Utils.formatCurrency(dados.custoPorAssistido || 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">CUSTO POR ASSISTIDO</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">Despesas totais / assistidos com receita</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    // =============================================
    // LINHA 3 - RENTABILIDADE
    // =============================================
    var totalAssistidos = dados.totalAssistidos || 0;
    var lucrativosCount = dados.lucrativos ? dados.lucrativos.length : 0;
    var deficitariosCount = dados.deficitarios ? dados.deficitarios.length : 0;
    var pctLucrativos = totalAssistidos > 0 ? (lucrativosCount / totalAssistidos * 100) : 0;
    var pctDeficitarios = totalAssistidos > 0 ? (deficitariosCount / totalAssistidos * 100) : 0;
    
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px; border-left: 3px solid #10b981;">';
    html += '  <div class="stat-icon green" style="width: 36px; height: 36px; font-size: 16px;">🟢</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 18px; font-weight: 800; color: #10b981;">' + lucrativosCount + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">CONTRATOS LUCRATIVOS</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">' + pctLucrativos.toFixed(0) + '% do total</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px; border-left: 3px solid #dc2626;">';
    html += '  <div class="stat-icon red" style="width: 36px; height: 36px; font-size: 16px;">🔴</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 18px; font-weight: 800; color: ' + (deficitariosCount > 0 ? '#dc2626' : '#10b981') + ';">' + deficitariosCount + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">CONTRATOS DEFICITÁRIOS</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">' + pctDeficitarios.toFixed(0) + '% do total</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">👥</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 18px; font-weight: 800; color: #2563eb;">' + totalAssistidos + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TOTAL ASSISTIDOS</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">Com receita recebida no mês</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px;">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">📊</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value percent" style="font-size: 16px; font-weight: 700; color: ' + (pctLucrativos >= 80 ? '#10b981' : '#f59e0b') + ';">' + pctLucrativos.toFixed(0) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">TAXA DE LUCRATIVIDADE</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">Ideal > 80%</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    // =============================================
    // LINHA 4 - ANÁLISE DE CONCENTRAÇÃO E SAZONALIDADE
    // =============================================
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">';
    
    var corConcentracao = dados.concentracaoTop5 <= 60 ? '#10b981' : (dados.concentracaoTop5 <= 80 ? '#f59e0b' : '#dc2626');
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">📋</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value percent" style="font-size: 16px; font-weight: 700; color: ' + corConcentracao + ';">' + (dados.concentracaoTop5 || 0).toFixed(0) + '%</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">CONCENTRAÇÃO TOP 5</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">Ideal < 60%</div>';
    html += '  </div>';
    html += '</div>';
    
    var corDiversificacao = dados.indiceDiversificacao >= 0.4 ? '#10b981' : (dados.indiceDiversificacao >= 0.2 ? '#f59e0b' : '#dc2626');
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon teal" style="width: 36px; height: 36px; font-size: 16px;">🔄</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value number" style="font-size: 16px; font-weight: 700; color: ' + corDiversificacao + ';">' + (dados.indiceDiversificacao || 0).toFixed(2) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">ÍNDICE DE DIVERSIFICAÇÃO</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">0 = concentrado | 1 = diversificado</div>';
    html += '  </div>';
    html += '</div>';
    
    // Variação Receita
    if (dados.temBaseAnterior) {
        var corVariacao = dados.variacaoReceita >= 0 ? '#10b981' : '#dc2626';
        html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
        html += '  <div class="stat-icon ' + (dados.variacaoReceita >= 0 ? 'green' : 'red') + '" style="width: 36px; height: 36px; font-size: 16px;">📅</div>';
        html += '  <div class="stat-info">';
        html += '    <div class="stat-value percent" style="font-size: 16px; font-weight: 700; color: ' + corVariacao + ';">' + (dados.variacaoReceita || 0).toFixed(1) + '%</div>';
        html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">VARIAÇÃO RECEITA</div>';
        html += '    <div style="font-size: 8px; color: var(--gray-400);">vs mês anterior</div>';
        html += '  </div>';
        html += '</div>';
    } else {
        html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px; opacity: 0.6;">';
        html += '  <div class="stat-icon" style="width: 36px; height: 36px; font-size: 16px; background: #f3f4f6;">📅</div>';
        html += '  <div class="stat-info">';
        html += '    <div class="stat-value percent" style="font-size: 16px; font-weight: 700; color: #9ca3af;">N/D</div>';
        html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">VARIAÇÃO RECEITA</div>';
        html += '    <div style="font-size: 8px; color: var(--gray-400);">Sem base anterior</div>';
        html += '  </div>';
        html += '</div>';
    }
    
    // Projeção Próximo Mês (média móvel dos últimos 3 meses + 5%)
    var corProjecao = dados.projecaoResultado >= 0 ? '#10b981' : '#dc2626';
    var tooltipProjecao = 
        '📊 Base do cálculo:\n' +
        'Meses considerados: ' + (dados.mesesConsideradosProjecao || 0) + '\n' +
        'Média Receita: ' + Utils.formatCurrency(dados.mediaReceitas3M || 0) + '\n' +
        'Média Despesa: ' + Utils.formatCurrency(dados.mediaDespesas3M || 0) + '\n' +
        'Receita Projetada (+5%): ' + Utils.formatCurrency(dados.receitaProjetada || 0) + '\n' +
        'Despesa Projetada: ' + Utils.formatCurrency(dados.despesaProjetada || 0);

    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px; border-left: 3px solid #8b5cf6;" title="' + tooltipProjecao + '">';
    html += '  <div class="stat-icon purple" style="width: 36px; height: 36px; font-size: 16px;">🔮</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 15px; font-weight: 700; color: ' + corProjecao + ';">' + Utils.formatCurrency(dados.projecaoResultado || 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">PROJEÇÃO PRÓXIMO MÊS</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">Receita: ' + Utils.formatCurrency(dados.receitaProjetada || 0) + ' | Desp: ' + Utils.formatCurrency(dados.despesaProjetada || 0) + '</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    // =============================================
    // LINHA 5 - EFICIÊNCIA OPERACIONAL
    // =============================================
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">💰</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 15px; font-weight: 700; color: #10b981;">' + Utils.formatCurrency(dados.receitaPorAssistido || 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">RECEITA POR ASSISTIDO</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">Receita recebida / assistidos</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="stat-card" style="flex: 1; min-width: 120px; padding: 12px 10px;">';
    html += '  <div class="stat-icon amber" style="width: 36px; height: 36px; font-size: 16px;">📦</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 15px; font-weight: 700; color: #f59e0b;">' + Utils.formatCurrency(dados.despesasOperacionais || 0) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px; letter-spacing: 0.2px;">DESPESAS OPERACIONAIS</div>';
    html += '    <div style="font-size: 8px; color: var(--gray-400);">Pagas no mês (exceto Custo PC)</div>';
    html += '  </div>';
    html += '</div>';
    
    html += '</div>';
    
    // =============================================
    // TABELA: PERFORMANCE POR REGIÃO
    // =============================================
    var regioes = dados.regioes || [];
    if (regioes.length > 0) {
        html += '<div class="card" style="margin-bottom: 16px;">';
        html += '  <div class="card-header">';
        html += '    <span class="card-title">📍 Performance por Região</span>';
        html += '    <span style="font-size: 11px; color: var(--gray-500);">Ordenado pela margem</span>';
        html += '  </div>';
        html += '  <div class="card-body" style="padding: 12px 16px;">';
        html += '    <div class="data-table-wrapper">';
        html += '      <table class="data-table">';
        html += '        <thead>';
        html += '          <tr>';
        html += '            <th>Região</th>';
        html += '            <th class="text-right">Receita</th>';
        html += '            <th class="text-right">Custo Total</th>';
        html += '            <th class="text-right">Resultado</th>';
        html += '            <th class="text-right">Margem</th>';
        html += '            <th>Assistidos</th>';
        html += '          </tr>';
        html += '        </thead>';
        html += '        <tbody>';
        
        for (var i = 0; i < regioes.length; i++) {
            var r = regioes[i];
            var custoTotal = r.custoProfissional + r.custoOp;
            var corMargem = r.margem >= 20 ? '#10b981' : (r.margem >= 10 ? '#f59e0b' : '#dc2626');
            
            html += '<tr>';
            html += '  <td><strong>' + (r.regiao || 'Não informada') + '</strong></td>';
            html += '  <td class="text-right">' + Utils.formatCurrency(r.receita) + '</td>';
            html += '  <td class="text-right">' + Utils.formatCurrency(custoTotal) + '</td>';
            html += '  <td class="text-right ' + (r.resultado >= 0 ? 'positive' : 'negative') + '">' + Utils.formatCurrency(r.resultado) + '</td>';
            html += '  <td class="text-right" style="color: ' + corMargem + '; font-weight: 600;">' + r.margem.toFixed(1) + '%</td>';
            html += '  <td>' + r.count + '</td>';
            html += '</tr>';
        }
        
        html += '        </tbody>';
        html += '      </table>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }
    
    // =============================================
    // TABELA: RECEITAS DETALHADAS
    // =============================================
    var listaReceitas = dados.listaReceitas || [];
    var receitasHtml = '';
    if (listaReceitas.length) {
        for (var i = 0; i < listaReceitas.length; i++) {
            var rec = listaReceitas[i];
            var dataReceitaFormatada = rec.data ? Utils.formatDateBR(rec.data) : '';
            receitasHtml += '<tr>';
            receitasHtml += '<td>' + dataReceitaFormatada + '</td>';
            receitasHtml += '<td>' + (rec.descricao || '') + '</td>';
            receitasHtml += '<td>' + (rec.assistido || '') + '</td>';
            receitasHtml += '<td>' + (rec.tipo || '') + '</td>';
            receitasHtml += '<td class="text-right">' + Utils.formatCurrency(rec.valor) + '</td>';
            receitasHtml += '<td>' + (rec.status || '') + '</td>';
            receitasHtml += '</tr>';
        }
    } else {
        receitasHtml = '<tr><td colspan="6" class="empty-state">Nenhuma receita no período</td></tr>';
    }
    
    html += '<div class="card" style="margin-bottom: 16px;">';
    html += '  <div class="card-header">';
    html += '    <span class="card-title">💰 Detalhamento Receitas</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 16px;">';
    html += '    <div class="data-table-wrapper">';
    html += '      <table class="data-table">';
    html += '        <thead><tr><th>Data</th><th>Descrição</th><th>Assistido</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead>';
    html += '        <tbody>' + receitasHtml + '</tbody>';
    html += '      </table>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    // =============================================
    // TABELA: DESPESAS DETALHADAS
    // =============================================
    var despesas = dados.despesas || [];
    var despesasHtml = '';
    if (despesas.length) {
        for (var i = 0; i < despesas.length; i++) {
            var desp = despesas[i];
            var dataDespesaFormatada = desp.data ? Utils.formatDateBR(desp.data) : '';
            despesasHtml += '<tr>';
            despesasHtml += '<td>' + dataDespesaFormatada + '</td>';
            despesasHtml += '<td>' + (desp.descricao || '') + '</td>';
            despesasHtml += '<td>' + (desp.categoria || '') + '</td>';
            despesasHtml += '<td>' + (desp.fornecedor || '') + '</td>';
            despesasHtml += '<td class="text-right">' + Utils.formatCurrency(desp.valor) + '</td>';
            despesasHtml += '</tr>';
        }
    } else {
        despesasHtml = '<tr><td colspan="5" class="empty-state">Nenhuma despesa no período</td></tr>';
    }
    
    html += '<div class="card" style="margin-bottom: 0;">';
    html += '  <div class="card-header">';
    html += '    <span class="card-title">📉 Detalhamento Despesas</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 16px;">';
    html += '    <div class="data-table-wrapper">';
    html += '      <table class="data-table">';
    html += '        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Fornecedor</th><th>Valor</th></tr></thead>';
    html += '        <tbody>' + despesasHtml + '</tbody>';
    html += '      </table>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
    console.log('✅ Resultados completos renderizados (regime de caixa)!');
};

// =============================================
// RENDERIZAR GRÁFICO DE RESULTADOS
// =============================================
managerApp.renderizarGraficoResultados = function(mesesLabels, receitasData, despesasData) {
    var ctx = document.getElementById('chartResultadosEvolucao');
    if (!ctx) return;
    
    var ctx2d = ctx.getContext('2d');
    
    if (this.chartResultadosEvolucao) {
        this.chartResultadosEvolucao.destroy();
    }
    
    this.chartResultadosEvolucao = new Chart(ctx2d, {
        type: 'bar',
        data: {
            labels: mesesLabels,
            datasets: [
                {
                    label: 'Receitas',
                    data: receitasData,
                    backgroundColor: '#0d9488',
                    borderColor: '#0d9488',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Despesas',
                    data: despesasData,
                    backgroundColor: '#ef4444',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 4
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
                legend: {
                    position: 'top'
                }
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
};
