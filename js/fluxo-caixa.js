// =============================================
// FLUXO DE CAIXA - managerJARDINSCare
// Versão 8.3 - Ciclo 5.5 (correções de Atrasados + Linha diária real)
// Data: 02/11/2026
// =============================================
// ⚠️ ESTE ARQUIVO É ENTREGUE EM 4 PARTES.
// COLE AS PARTES 1→2→3→4 EM SEQUÊNCIA.
// =============================================

// =============================================
// CONFIGURAÇÕES DO FLUXO DE CAIXA
// =============================================
var CONFIG_FLUXO = {
    META_SALDO_MINIMO: 20000,
    DIAS_ALERTA_FURO: 7,
    PERCENTUAL_ALERTA_MARGEM: 10,
    MESES_HISTORICO_AVULSOS: 3
};

// =============================================
// 🆕 v7.0 — Camada 1: Saldo Inicial (Auto/Manual)
// =============================================

/**
 * 🆕 v7.0 — Camada 1
 * Determina o modo do saldo (auto ou manual).
 * Lê do Supabase (coluna saldo_modo) e usa localStorage como fallback.
 * @returns {Promise<string>} 'auto' ou 'manual'
 */
managerApp._determinarModoSaldo = function() {
    return new Promise(function(resolve) {
        API.getSaldoAtual()
            .then(function(data) {
                if (data.result === 'success' && data.saldoModo) {
                    console.log('✅ Modo do saldo lido do Supabase:', data.saldoModo);
                    localStorage.setItem('fluxoCaixa_saldoModo', data.saldoModo);
                    resolve(data.saldoModo);
                } else {
                    var modoLocal = localStorage.getItem('fluxoCaixa_saldoModo') || 'auto';
                    console.log('⚠️ Modo do saldo via localStorage (fallback):', modoLocal);
                    resolve(modoLocal);
                }
            })
            .catch(function(error) {
                console.error('❌ Erro ao buscar modo do saldo, usando localStorage:', error);
                var modoLocal = localStorage.getItem('fluxoCaixa_saldoModo') || 'auto';
                resolve(modoLocal);
            });
    });
};

/**
 * 🆕 v7.0 — Camada 1
 * Calcula o saldo inicial automático.
 * Fórmula: saldo_manual_base + Σ(receitas "Recebido" do mês) - Σ(despesas "Pago" do mês)
 * @param {Array} receitas - Array de todas as receitas
 * @param {Array} despesas - Array de todas as despesas
 * @param {string} mesRef - Mês de referência 'YYYY-MM'
 * @returns {Promise<Object>} { saldoCaixa, saldoAplicacoes, saldoTotal, detalhes }
 */
managerApp._calcularSaldoAutomatico = function(receitas, despesas, mesRef) {
    return new Promise(function(resolve) {
        API.getSaldoAtual()
            .then(function(saldoData) {
                if (saldoData.result !== 'success') {
                    throw new Error('Não foi possível obter o saldo manual base.');
                }

                var saldoManualBase = saldoData.saldoConsolidado || 0;

                var receitasMes = UtilsFinance.filtrarPorMes(receitas, mesRef);
                var despesasMes = UtilsFinance.filtrarPorMes(despesas, mesRef);

                var totalRecebido = receitasMes
                    .filter(function(r) { return r.status === 'Recebido'; })
                    .reduce(function(sum, r) { return sum + (parseFloat(r.valor) || 0); }, 0);

                var totalPago = despesasMes
                    .filter(function(d) { return d.status === 'Pago'; })
                    .reduce(function(sum, d) { return sum + (parseFloat(d.valor) || 0); }, 0);

                var saldoCalculado = saldoManualBase + totalRecebido - totalPago;

                var proporcaoCaixa = saldoManualBase > 0
                    ? (saldoData.saldoCaixa / saldoManualBase) : 1;
                var proporcaoAplicacoes = saldoManualBase > 0
                    ? (saldoData.saldoAplicacoes / saldoManualBase) : 0;

                var saldoCaixaAuto = saldoCalculado * proporcaoCaixa;
                var saldoAplicacoesAuto = saldoCalculado * proporcaoAplicacoes;

                if (saldoManualBase === 0) {
                    saldoCaixaAuto = saldoCalculado;
                    saldoAplicacoesAuto = 0;
                }

                console.log('🤖 Saldo automático calculado:', {
                    base: saldoManualBase,
                    recebido: totalRecebido,
                    pago: totalPago,
                    saldo: saldoCalculado
                });

                resolve({
                    saldoCaixa: saldoCaixaAuto,
                    saldoAplicacoes: saldoAplicacoesAuto,
                    saldoTotal: saldoCalculado,
                    detalhes: {
                        base: saldoManualBase,
                        recebido: totalRecebido,
                        pago: totalPago
                    }
                });
            })
            .catch(function(error) {
                console.error('❌ Erro ao calcular saldo automático:', error);
                Utils.showToast('Erro no saldo automático. Usando saldo manual.', 'error');
                API.getSaldoAtual().then(function(data) {
                    resolve({
                        saldoCaixa: data.saldoCaixa || 0,
                        saldoAplicacoes: data.saldoAplicacoes || 0,
                        saldoTotal: data.saldoConsolidado || 0,
                        detalhes: {
                            base: data.saldoConsolidado || 0,
                            recebido: 0,
                            pago: 0
                        }
                    });
                });
            });
    });
};

// =============================================
// 🆕 v7.8 — Camada 2: Estimativa de Avulsos via Histórico (MEDIANA)
// =============================================
managerApp._calcularMediaAvulsos = function(receitas) {
    if (!receitas || receitas.length === 0) return 0;

    var mesesParaConsiderar = CONFIG_FLUXO.MESES_HISTORICO_AVULSOS;
    var hoje = new Date();
    var amostras = [];

    for (var i = 1; i <= mesesParaConsiderar; i++) {
        var dataRef = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        var mesRef = dataRef.getFullYear() + '-' +
                     String(dataRef.getMonth() + 1).padStart(2, '0');

        var totalAvulsosMes = receitas
            .filter(function(r) {
                if (r.status !== 'Recebido') return false;
                var tipo = r.tipoAvulso || r.tipo || '';
                if (tipo === 'Contrato Mensal') return false;

                var dataStr = r.data;
                if (!dataStr) return false;
                if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];
                return dataStr.startsWith(mesRef);
            })
            .reduce(function(sum, r) {
                return sum + (parseFloat(r.valor) || 0);
            }, 0);

        amostras.push(totalAvulsosMes);
    }

    if (amostras.length === 0) return 0;

    // 🆕 v7.8 — MEDIANA (não média) para evitar distorção
    amostras.sort(function(a, b) { return a - b; });
    var meio = Math.floor(amostras.length / 2);
    var mediana = (amostras.length % 2 === 0)
        ? (amostras[meio - 1] + amostras[meio]) / 2
        : amostras[meio];

    var resultado = mediana > 0 ? mediana : 0;

    console.log('📊 Mediana de Avulsos (v7.8):', {
        amostrasMensais: amostras,
        mediana: resultado
    });

    return resultado;
};

// =============================================
// 🆕 v7.8 — Camada 2: Estimativa de Despesas Extras (0)
// =============================================
managerApp._calcularMediaDespesasExtras = function(despesas) {
    // 🆕 v7.8 — Decisão do Ciclo 5.5: despesas extras estimadas = 0
    // Motivo: a média histórica infla o valor (R$ 67.166 visto no handoff).
    // O fluxo diário já modela os Plantões Extras reais quando existem.
    console.log('📊 Despesas Extras estimadas = 0 (v7.8 — decisão Ciclo 5.5)');
    return 0;
};

// =============================================
// 🆕 v7.0 — Camada 3: Projeção do Mês Corrente
// =============================================

/**
 * 🆕 v7.0 — Camada 3
 * Verifica se existe receita "Recebido" para o assistido no mês de referência.
 * @param {Array} receitas
 * @param {string} assistido
 * @param {string} mesRef
 * @returns {boolean}
 */
managerApp._verificarReceitaRecebida = function(receitas, assistido, mesRef) {
    if (!receitas || !assistido || !mesRef) return false;

    for (var i = 0; i < receitas.length; i++) {
        var r = receitas[i];
        if (r.assistido !== assistido) continue;
        if (r.status !== 'Recebido') continue;

        var dataStr = r.data;
        if (!dataStr) continue;
        if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];

        if (dataStr.startsWith(mesRef)) {
            return true;
        }
    }
    return false;
};
// =============================================
// CARREGAR FLUXO DE CAIXA (FUNÇÃO PRINCIPAL)
// v8.4 — Inclui pré-cálculo do mapa de folhas ANTES do mensal
// =============================================
managerApp.carregarFluxoCaixa = function() {
    var self = this;
    var periodo = document.getElementById('fluxoPeriodo')
        ? document.getElementById('fluxoPeriodo').value : '6';
    var incluirLeads = document.getElementById('incluirLeadsProjecao')
        ? document.getElementById('incluirLeadsProjecao').checked : false;

    this.updateProgressFluxo(0, 10);

    this._determinarModoSaldo()
        .then(function(modoSaldo) {
            console.log('💰 Modo do saldo:', modoSaldo);

            return Promise.all([
                API.listarReceitas(),
                API.listarDespesas(),
                API.getSaldoAtual(),
                API.getMetas(),
                API.listarLeads(),
                API.getAssistidosCompleto(),
                API.getParametrosOperacionais().catch(function() {
                    return { result: 'error', parametros: {} };
                }),
                Promise.resolve(modoSaldo)
            ]);
        })
        .then(function(results) {
            self.updateProgressFluxo(1, 40);

            var receitas = results[0].receitas || [];
            var despesas = results[1].despesas || [];
            var saldoData = results[2];
            var metasData = results[3];
            var leads = results[4].leads || [];
            var assistidos = results[5].assistidos || [];
            var paramsData = results[6];
            var modoSaldo = results[7];

            if (metasData.result === 'success' && metasData.metas) {
                self.metas = { ...self.metas, ...metasData.metas };
            }

            var parametrosOperacionais = (paramsData.result === 'success' && paramsData.parametros)
                ? paramsData.parametros
                : { despesasOperacionais: 20000, aliquotaImposto: 6 };

            var saldoPromise;
            if (modoSaldo === 'auto') {
                self.updateProgressFluxo(1, 50, 'Calculando saldo automático...');
                saldoPromise = self._calcularSaldoAutomatico(
                    receitas, despesas, self.getMesReferencia()
                );
            } else {
                saldoPromise = Promise.resolve({
                    saldoCaixa: saldoData.saldoCaixa || 0,
                    saldoAplicacoes: saldoData.saldoAplicacoes || 0,
                    saldoTotal: saldoData.saldoConsolidado || 0,
                    detalhes: {
                        base: saldoData.saldoConsolidado || 0,
                        recebido: 0,
                        pago: 0
                    }
                });
            }

            return saldoPromise.then(function(saldoInfo) {
                self.updateProgressFluxo(2, 70, 'Projetando fluxo...');

                var mediaAvulsos = self._calcularMediaAvulsos(receitas);
                var mediaDespesasExtras = self._calcularMediaDespesasExtras(despesas);

                var dadosFluxo = {
                    saldoInicial: saldoInfo.saldoTotal,
                    saldoCaixa: saldoInfo.saldoCaixa,
                    saldoAplicacoes: saldoInfo.saldoAplicacoes,
                    saldoModo: modoSaldo,
                    saldoDetalhes: saldoInfo.detalhes,
                    receitas: receitas,
                    despesas: despesas,
                    leads: leads,
                    assistidos: assistidos,
                    mediaAvulsos: mediaAvulsos,
                    mediaDespesasExtras: mediaDespesasExtras,
                    parametrosOperacionais: parametrosOperacionais,
                    incluirLeads: incluirLeads
                };

                // 🆕 v8.4 — Pré-calcular mapa de folhas ANTES de projetar o mensal
                var hojeMapa = new Date();
                var dataFimMapa = new Date(hojeMapa);
                dataFimMapa.setDate(dataFimMapa.getDate() + 180);

                var mesesNecessariosMapa = [];
                var cursorMapa = new Date(hojeMapa.getFullYear(), hojeMapa.getMonth() - 1, 1);
                var cursorFimMapa = new Date(dataFimMapa.getFullYear(), dataFimMapa.getMonth(), 1);
                while (cursorMapa <= cursorFimMapa) {
                    mesesNecessariosMapa.push({ mes: cursorMapa.getMonth() + 1, ano: cursorMapa.getFullYear() });
                    cursorMapa.setMonth(cursorMapa.getMonth() + 1);
                }

                var promisesFolhasMapa = mesesNecessariosMapa.map(function(m) {
                    return self._calcularFolhaDoMes(dadosFluxo, m.mes, m.ano)
                        .then(function(r) {
                            return { chave: m.ano + '-' + String(m.mes).padStart(2, '0'), total: r.total };
                        })
                        .catch(function() {
                            return { chave: m.ano + '-' + String(m.mes).padStart(2, '0'), total: 0 };
                        });
                });

                return Promise.all(promisesFolhasMapa).then(function(resultadosFolhasMapa) {
                    var mapaFolhasMapa = {};
                    for (var iMapa = 0; iMapa < resultadosFolhasMapa.length; iMapa++) {
                        mapaFolhasMapa[resultadosFolhasMapa[iMapa].chave] = resultadosFolhasMapa[iMapa].total;
                    }
                    console.log('✅ Mapa de folhas (mensal v8.4):', mapaFolhasMapa);
                    dadosFluxo._mapaFolhas = mapaFolhasMapa;
                    return self._projetarFluxoCaixa(dadosFluxo, parseInt(periodo));
                });
            });
        })
        .then(function(projecao) {
            self.updateProgressFluxo(3, 90, 'Renderizando...');
            self.dadosFluxoCaixa = projecao;
            self.renderizarFluxoCaixa(projecao);
            self.updateProgressFluxo(4, 100);

            // 🆕 v8.0 — Pré-calcular diário em background para alimentar os cards
            setTimeout(function() {
                try {
                    if (!managerApp._projecaoDiariaCache) {
                        managerApp._renderizarFluxoDiario(managerApp.dadosFluxoCaixa);
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao pré-calcular diário (não bloqueante):', e);
                }
            }, 50);

            setTimeout(function() {
                self.hideProgressBarFluxo();
            }, 300);
        })
        .catch(function(error) {
            console.error('❌ Erro ao carregar fluxo de caixa:', error);
            Utils.showToast('Erro ao carregar fluxo de caixa: ' + error.message, 'error');
            self.hideProgressBarFluxo();
        });
};

// =============================================
// PROJETAR FLUXO DE CAIXA (MENSAL)
// v7.8 — Usa mapa de folhas pré-calculado + despesas reais no mês atual
// =============================================
managerApp._projetarFluxoCaixa = function(dados, periodoMeses) {
    var self = this;
    return new Promise(function(resolve) {
        var hoje = new Date();
        var projecaoMensal = [];
        var saldoAcumulado = dados.saldoInicial;

        // 🆕 v7.8 — Mapa de folhas do mês anterior ao primeiro mês da projeção
        var mapaFolhas = {};
        if (dados._mapaFolhas) {
            mapaFolhas = dados._mapaFolhas;
        }

        for (var i = 0; i < periodoMeses; i++) {
            var dataRef = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
            var ano = dataRef.getFullYear();
            var mes = dataRef.getMonth() + 1;
            var mesRef = ano + '-' + String(mes).padStart(2, '0');
            var isMesAtual = (i === 0);

            var receitasMes = UtilsFinance.filtrarPorMes(dados.receitas, mesRef);
            var despesasMes = UtilsFinance.filtrarPorMes(dados.despesas, mesRef);

            var receitaProjetada = self._projetarReceitas(receitasMes, dados, mesRef, isMesAtual);
            var despesaProjetada = self._projetarDespesas(despesasMes, dados, mesRef, isMesAtual);

            // 🆕 v7.8 — Se _projetarDespesas pediu folha pendente, resolver agora
            if (despesaProjetada._pendenteFolha) {
                var chaveFolha = despesaProjetada._pendenteFolha.ano + '-' +
                                String(despesaProjetada._pendenteFolha.mes).padStart(2, '0');
                var custoPC = mapaFolhas[chaveFolha] || 0;
                if (custoPC > 0) {
                    despesaProjetada.total += custoPC;
                    despesaProjetada.fixas += custoPC;
                }
                delete despesaProjetada._pendenteFolha;
            }

            var perdaContratos = self._calcularPerdaContratos(dados.assistidos, mesRef);
            var resultado = receitaProjetada.total - despesaProjetada.total - perdaContratos;

            saldoAcumulado += resultado;

            projecaoMensal.push({
                mes: mes,
                ano: ano,
                mesRef: mesRef,
                isMesAtual: isMesAtual,
                receita: receitaProjetada.total,
                receitaContratos: receitaProjetada.contratos,
                receitaAvulsos: receitaProjetada.avulsos,
                receitaAvulsosEstimados: receitaProjetada.avulsosEstimados,
                despesa: despesaProjetada.total,
                despesaFixa: despesaProjetada.fixas,
                despesaVariavel: despesaProjetada.variaveis,
                despesaExtrasEstimadas: despesaProjetada.extrasEstimadas,
                perdaContratos: perdaContratos,
                resultado: resultado,
                saldoAcumulado: saldoAcumulado
            });
        }

resolve({
    saldoInicial: dados.saldoInicial,
    saldoCaixa: dados.saldoCaixa,
    saldoAplicacoes: dados.saldoAplicacoes,
    saldoModo: dados.saldoModo,
    saldoDetalhes: dados.saldoDetalhes,
    _mapaFolhas: dados._mapaFolhas || {},   // 🆕 v8.5 — preserva o mapa no retorno
    projecao: projecaoMensal,
    mediaAvulsos: dados.mediaAvulsos,
    mediaDespesasExtras: dados.mediaDespesasExtras,
    receitas: dados.receitas,
    despesas: dados.despesas,
    assistidos: dados.assistidos
});
    });
};

// =============================================
// PROJETAR RECEITAS PARA UM MÊS
// v8.8 — Ciclo 5.5: avulsos futuros = 0 (decisão do usuário)
// =============================================
managerApp._projetarReceitas = function(receitasMes, dados, mesRef, isMesAtual) {
    var totalContratos = 0;
    var totalAvulsos = 0;
    var totalAvulsosEstimados = 0;

    if (isMesAtual) {
        // ─────────────────────────────────────────────────────
        // MÊS ATUAL: usa receitas lançadas; projeta só o que NÃO foi gerado
        // ─────────────────────────────────────────────────────
        var assistidosMensais = dados.assistidos.filter(function(a) {
            return a.status === 'Ativo' && a.tipoContrato === 'MENSAL';
        });

        for (var i = 0; i < assistidosMensais.length; i++) {
            var assistido = assistidosMensais[i];

            // Verifica se JÁ EXISTE receita de contrato mensal gerada no mês
            var receitaMensalGerada = dados.receitas.some(function(r) {
                if (r.assistido !== assistido.nome) return false;
                var tipo = r.tipoAvulso || r.tipo || '';
                if (tipo !== 'Contrato Mensal') return false;
                var dataStr = r.data;
                if (!dataStr) return false;
                if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];
                return dataStr.startsWith(mesRef);
            });

            if (receitaMensalGerada) {
                // Já foi gerada → soma o valor lançado (independente do status)
                var lancamentos = dados.receitas.filter(function(r) {
                    if (r.assistido !== assistido.nome) return false;
                    var tipo = r.tipoAvulso || r.tipo || '';
                    if (tipo !== 'Contrato Mensal') return false;
                    var dataStr = r.data;
                    if (!dataStr) return false;
                    if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];
                    return dataStr.startsWith(mesRef);
                });
                totalContratos += lancamentos.reduce(function(s, r) {
                    return s + (parseFloat(r.valor) || 0);
                }, 0);
            } else {
                // Não foi gerada → projeta o cadastro (na data de vencimento)
                totalContratos += parseFloat(assistido.vlrContrato) || 0;
            }
        }

        // Avulsos lançados (qualquer status)
        var assistidosAvulsos = dados.assistidos.filter(function(a) {
            return a.status === 'Ativo' && a.tipoContrato !== 'MENSAL';
        });
        for (var j = 0; j < assistidosAvulsos.length; j++) {
            var avulso = assistidosAvulsos[j];
            var lancamentosAvulso = dados.receitas.filter(function(r) {
                if (r.assistido !== avulso.nome) return false;
                var tipo = r.tipoAvulso || r.tipo || '';
                if (tipo === 'Contrato Mensal') return false;
                var dataStr = r.data;
                if (!dataStr) return false;
                if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];
                return dataStr.startsWith(mesRef);
            });
            totalAvulsos += lancamentosAvulso.reduce(function(s, r) {
                return s + (parseFloat(r.valor) || 0);
            }, 0);
        }

        // Avulsos de assistidos MENSAIS (ex: 2ª parte do Lucinei, Anirleide)
        for (var k = 0; k < assistidosMensais.length; k++) {
            var a = assistidosMensais[k];
            var lancamentosAvulsoMensal = dados.receitas.filter(function(r) {
                if (r.assistido !== a.nome) return false;
                var tipo = r.tipoAvulso || r.tipo || '';
                if (tipo === 'Contrato Mensal') return false;
                var dataStr = r.data;
                if (!dataStr) return false;
                if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];
                return dataStr.startsWith(mesRef);
            });
            totalAvulsos += lancamentosAvulsoMensal.reduce(function(s, r) {
                return s + (parseFloat(r.valor) || 0);
            }, 0);
        }
    } else {
        // ─────────────────────────────────────────────────────
        // MESES FUTUROS: contratos ativos apenas
        // v8.8 — Avulsos estimados = 0 (decisão do Ciclo 5.5)
        // ─────────────────────────────────────────────────────
        for (var m = 0; m < dados.assistidos.length; m++) {
            var ass = dados.assistidos[m];
            if (ass.status === 'Ativo' && ass.tipoContrato === 'MENSAL') {
                totalContratos += parseFloat(ass.vlrContrato) || 0;
            }
        }
        // totalAvulsosEstimados permanece 0 (não projeta avulsos futuros)
        totalAvulsosEstimados = 0;
    }

    return {
        total: totalContratos + totalAvulsos + totalAvulsosEstimados,
        contratos: totalContratos,
        avulsos: totalAvulsos,
        avulsosEstimados: totalAvulsosEstimados
    };
};

// =============================================
// PROJETAR DESPESAS PARA UM MÊS
// v8.7 — Mês atual: limiar 70% | Futuro: folha do MÊS ANTERIOR
// =============================================
managerApp._projetarDespesas = function(despesasMes, dados, mesRef, isMesAtual) {
    var totalFixas = 0;
    var totalVariaveis = 0;
    var totalExtrasEstimadas = 0;

    var CATEGORIAS_FIXAS = [
        'Custo Personal Care', 'Custo Enfermagem', 'Pró Labore',
        'Impostos', 'Aluguel', 'Contador', 'Telefone/Internet'
    ];

    if (isMesAtual) {
        // ─────────────────────────────────────────────────────
        // MÊS ATUAL: soma despesas lançadas + folha do mês anterior (se não "paga")
        // ─────────────────────────────────────────────────────
        for (var i = 0; i < despesasMes.length; i++) {
            var d = despesasMes[i];
            if (d.status === 'Cancelado') continue;
            var valor = parseFloat(d.valor) || 0;
            if (CATEGORIAS_FIXAS.indexOf(d.categoria) !== -1) {
                totalFixas += valor;
            } else {
                totalVariaveis += valor;
            }
        }

        // v8.5 — Só bloqueia projeção se Custo PC lançado for ≥ 70% da folha esperada
        var totalCustoPCNoMes = 0;
        for (var cpc = 0; cpc < despesasMes.length; cpc++) {
            if (despesasMes[cpc].categoria === 'Custo Personal Care' && despesasMes[cpc].status !== 'Cancelado') {
                totalCustoPCNoMes += parseFloat(despesasMes[cpc].valor) || 0;
            }
        }

        var hoje = new Date();
        var mesAnterior = hoje.getMonth() === 0 ? 12 : hoje.getMonth();
        var anoAnterior = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
        var chaveFolhaAnt = anoAnterior + '-' + String(mesAnterior).padStart(2, '0');
        var folhaEsperada = (dados._mapaFolhas && dados._mapaFolhas[chaveFolhaAnt]) || 50000;
        var temFolhaCompletaNoMes = (totalCustoPCNoMes >= folhaEsperada * 0.7);

        console.log('🔎 [Mês Atual ' + mesRef + '] Custo PC lançado:', Utils.formatCurrency(totalCustoPCNoMes),
                    '| Folha esperada (' + chaveFolhaAnt + '):', Utils.formatCurrency(folhaEsperada),
                    '| Bloqueia projeção?', temFolhaCompletaNoMes);

        if (!temFolhaCompletaNoMes) {
            return {
                total: totalFixas + totalVariaveis,
                fixas: totalFixas,
                variaveis: totalVariaveis,
                extrasEstimadas: 0,
                _pendenteFolha: { mes: mesAnterior, ano: anoAnterior }
            };
        }
    } else {
        // ─────────────────────────────────────────────────────
        // MESES FUTUROS: folha do MÊS ANTERIOR (Dez/26 paga Nov/26, etc.)
        // ─────────────────────────────────────────────────────
        var partes = mesRef.split('-');
        var anoFut = parseInt(partes[0]);
        var mesFut = parseInt(partes[1]);

        // 🆕 v8.7 — Folha do MÊS ANTERIOR (não do próprio mês)
        var mesFolha = mesFut - 1;
        var anoFolha = anoFut;
        if (mesFolha === 0) { mesFolha = 12; anoFolha = anoFut - 1; }
        var chaveFolha = anoFolha + '-' + String(mesFolha).padStart(2, '0');
        var folhaDoMes = (dados._mapaFolhas && dados._mapaFolhas[chaveFolha]) || 0;

        console.log('🔎 [Futuro ' + mesRef + '] Buscando folha em ' + chaveFolha +
                    ' → ' + Utils.formatCurrency(folhaDoMes));

        // Fallback: se mapa vazio, usa cadastro
        if (folhaDoMes === 0) {
            console.warn('⚠️ [Futuro ' + mesRef + '] Folha não encontrada em ' + chaveFolha + ' — usando cadastro');
            for (var k = 0; k < dados.assistidos.length; k++) {
                var a = dados.assistidos[k];
                if (a.status === 'Ativo' && a.tipoContrato === 'MENSAL') {
                    folhaDoMes += (parseFloat(a.totalHrsMes) || 0) * (parseFloat(a.vlrPlantao) || 0);
                }
            }
        }

        totalFixas += folhaDoMes;

        // Despesas operacionais via parâmetro
        var despesasOpParam = (dados.parametrosOperacionais &&
                              dados.parametrosOperacionais.despesasOperacionais) || 20000;
        totalFixas += despesasOpParam;

        totalExtrasEstimadas = dados.mediaDespesasExtras || 0;
    }

    return {
        total: totalFixas + totalVariaveis + totalExtrasEstimadas,
        fixas: totalFixas,
        variaveis: totalVariaveis,
        extrasEstimadas: totalExtrasEstimadas
    };
};

// =============================================
// CALCULAR PERDA DE CONTRATOS
// =============================================
managerApp._calcularPerdaContratos = function(assistidos, mesRef) {
    return 0;
};

// =============================================
// RENDERIZAR FLUXO DE CAIXA (FUNÇÃO PRINCIPAL)
// =============================================
managerApp.renderizarFluxoCaixa = function(dados) {
    if (!dados) return;

    this._renderizarCardsFluxo(dados);
    this._renderizarGraficoFluxo(dados);
    this._renderizarTabelaFluxo(dados);
    this._renderizarAlertasFluxo(dados);
    this._renderizarAnaliseObito(dados);
    this._renderizarAlertaFuro(dados);

    // 🆕 v7.1: Card "Próximo Pagamento de Folha" (2 linhas, híbrido)
    this._renderizarCardProximoPagamentoFolha({
        assistidos: dados.assistidos || [],
        despesas: dados.despesas || [],
        receitas: dados.receitas || []
    });

    console.log('✅ Fluxo de caixa renderizado (v8.3)');
};

// =============================================
// RENDERIZAR CARDS (COM BADGE AUTO/MANUAL)
// v8.0 — Aguarda _projecaoDiariaCache e re-renderiza quando disponível
// =============================================
managerApp._renderizarCardsFluxo = function(dados) {
    if (!dados) return;

    var projecao = dados.projecao;
    if (!projecao || projecao.length === 0) return;

    var primeiro = projecao[0];
    var ultimo = projecao[projecao.length - 1];
    var saldoAtual = dados.saldoInicial;

    var diario = managerApp._projecaoDiariaCache;
    var usaDiario = !!(diario && diario.resumo && diario.dias);

    // 🆕 v8.0 — Se o diário ainda não existe, AGENDAR re-render quando existir
    if (!usaDiario) {
        console.log('⏳ [CARDS v8.0] Diário ainda vazio — agendando re-render...');
        if (!managerApp._aguardandoDiarioParaCards) {
            managerApp._aguardandoDiarioParaCards = true;
            var tentativas = 0;
            var intervalo = setInterval(function() {
                tentativas++;
                var d = managerApp._projecaoDiariaCache;
                if (d && d.resumo && d.dias) {
                    clearInterval(intervalo);
                    managerApp._aguardandoDiarioParaCards = false;
                    console.log('✅ [CARDS v8.0] Diário pronto! Re-renderizando cards...');
                    managerApp._renderizarCardsFluxo(managerApp.dadosFluxoCaixa);
                } else if (tentativas > 100) {
                    clearInterval(intervalo);
                    managerApp._aguardandoDiarioParaCards = false;
                    console.warn('⚠️ [CARDS v8.0] Timeout aguardando diário (50s).');
                }
            }, 500);
        }
        return; // sai — não renderiza valores falsos
    }

    // A partir daqui, diário existe → renderiza com paridade 100%
    var resumo = diario.resumo;
    var saldoProjetado = resumo.saldoFinal;
    var margemSeguranca = resumo.totalEntradas > 0
        ? (resumo.resultadoPeriodo / resumo.totalEntradas * 100) : 0;
    var mediaSaidaDia = diario.dias.length > 0
        ? (resumo.totalSaidas / diario.dias.length) : 0;
    var diasCobertura = mediaSaidaDia > 0
        ? Math.round(saldoAtual / mediaSaidaDia) : 0;

    var risco = 'BAIXO', riscoClass = 'positive', riscoDetalhe = 'Fluxo saudável';
    if (saldoProjetado < 0) {
        risco = 'CRÍTICO'; riscoClass = 'negative'; riscoDetalhe = 'Saldo projetado negativo';
    } else if (saldoProjetado < CONFIG_FLUXO.META_SALDO_MINIMO || margemSeguranca < 5) {
        risco = 'ALTO'; riscoClass = 'negative'; riscoDetalhe = 'Abaixo da meta de saldo mínimo';
    } else if (margemSeguranca < CONFIG_FLUXO.PERCENTUAL_ALERTA_MARGEM) {
        risco = 'MÉDIO'; riscoClass = 'negative'; riscoDetalhe = 'Margem abaixo de ' + CONFIG_FLUXO.PERCENTUAL_ALERTA_MARGEM + '%';
    }

    // ---- Card: Saldo Atual ----
    var elSaldoAtual = document.getElementById('fluxoSaldoAtual');
    if (elSaldoAtual) {
        elSaldoAtual.textContent = Utils.formatCurrency(saldoAtual);
        Utils.applyColorToValue(elSaldoAtual, saldoAtual);
    }

    var elSaldoDetalhe = document.getElementById('fluxoSaldoAtualDetalhe');
    if (elSaldoDetalhe) {
        var badgeLabel = dados.saldoModo === 'auto' ? '🤖 Auto' : '✏️ Manual';
        var badgeBg = dados.saldoModo === 'auto' ? '#dcfce7' : '#fef3c7';
        var badgeColor = dados.saldoModo === 'auto' ? '#166534' : '#92400e';
        var detalheComposicao = '💵 ' + Utils.formatCurrency(dados.saldoCaixa) +
                                ' + 🏦 ' + Utils.formatCurrency(dados.saldoAplicacoes);
        var composicaoTooltip = '';
        if (dados.saldoModo === 'auto' && dados.saldoDetalhes) {
            composicaoTooltip = 'Base ' + Utils.formatCurrency(dados.saldoDetalhes.base) +
                                ' + Recebido ' + Utils.formatCurrency(dados.saldoDetalhes.recebido) +
                                ' - Pago ' + Utils.formatCurrency(dados.saldoDetalhes.pago);
        }
        elSaldoDetalhe.innerHTML = detalheComposicao +
            ' <span style="display: inline-block; margin-left: 6px; font-size: 8px; ' +
            'padding: 2px 6px; border-radius: 4px; background: ' + badgeBg + '; ' +
            'color: ' + badgeColor + '; font-weight: 700;" ' +
            'title="' + composicaoTooltip + '">' + badgeLabel + '</span>';
    }

    // ---- Card: Saldo Projetado ----
    var elSaldoProj = document.getElementById('fluxoSaldoProjetado');
    if (elSaldoProj) {
        elSaldoProj.textContent = Utils.formatCurrency(saldoProjetado);
        Utils.applyColorToValue(elSaldoProj, saldoProjetado);
    }

    // ---- Card: Margem de Segurança ----
    var elMargem = document.getElementById('fluxoMargemSeguranca');
    if (elMargem) {
        elMargem.textContent = margemSeguranca.toFixed(1) + '%';
        elMargem.className = 'stat-value ' +
            (margemSeguranca >= CONFIG_FLUXO.PERCENTUAL_ALERTA_MARGEM ? 'positive' : 'negative');
    }

    // ---- Card: Risco de Caixa ----
    var elRisco = document.getElementById('fluxoRiscoCaixa');
    if (elRisco) { elRisco.textContent = risco; elRisco.className = 'stat-value ' + riscoClass; }
    var elRiscoDet = document.getElementById('fluxoRiscoCaixaDetalhe');
    if (elRiscoDet) elRiscoDet.textContent = riscoDetalhe;

    // ---- Card: Dias de Cobertura ----
    var elDias = document.getElementById('fluxoDiasCobertura');
    if (elDias) {
        elDias.textContent = diasCobertura + ' dias';
        elDias.className = 'stat-value ' + (diasCobertura >= 30 ? 'positive' : 'negative');
    }

    console.log('✅ [CARDS v8.0] Renderizado com FLUXO DIÁRIO:', {
        saldoProjetado: Utils.formatCurrency(saldoProjetado),
        margem: margemSeguranca.toFixed(1) + '%',
        dias: diasCobertura,
        risco: risco
    });
};

// =============================================
// GRÁFICO DE FLUXO (LINHAS TRACEJADAS DE ESTIMATIVA)
// =============================================
managerApp._renderizarGraficoFluxo = function(dados) {
    var ctx = document.getElementById('chartFluxoCaixa');
    if (!ctx) return;

    var projecao = dados.projecao;
    if (!projecao || projecao.length === 0) return;

    if (this.chartFluxoCaixa) {
        this.chartFluxoCaixa.destroy();
        this.chartFluxoCaixa = null;
    }

    var mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    var labels = [];
    var receitaBruta = [];
    var despesaTotal = [];
    var perdaContratos = [];
    var resultadoLiq = [];
    var saldoAcumulado = [];
    var receitaAvulsosEstimados = [];
    var despesaExtrasEstimadas = [];

    for (var i = 0; i < projecao.length; i++) {
        var p = projecao[i];
        labels.push(mesesNomes[p.mes - 1] + '/' + String(p.ano).slice(2));
        receitaBruta.push(p.receita);
        despesaTotal.push(p.despesa);
        perdaContratos.push(p.perdaContratos);
        resultadoLiq.push(p.resultado);
        saldoAcumulado.push(p.saldoAcumulado);
        receitaAvulsosEstimados.push(p.receitaAvulsosEstimados || null);
        despesaExtrasEstimadas.push(p.despesaExtrasEstimadas || null);
    }

    var metaSaldo = Array(labels.length).fill(CONFIG_FLUXO.META_SALDO_MINIMO);
    var ctx2d = ctx.getContext('2d');

    try {
        this.chartFluxoCaixa = new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Receita Bruta',
                        data: receitaBruta,
                        backgroundColor: 'rgba(13, 148, 136, 0.7)',
                        borderColor: '#0d9488',
                        borderWidth: 2,
                        borderRadius: 4,
                        order: 3
                    },
                    {
                        label: 'Despesa Total',
                        data: despesaTotal,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        borderRadius: 4,
                        order: 3
                    },
                    {
                        label: 'Perda de Contratos',
                        data: perdaContratos,
                        backgroundColor: 'rgba(249, 115, 22, 0.6)',
                        borderColor: '#f97316',
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 3
                    },
                    {
                        label: 'Resultado Líquido',
                        data: resultadoLiq,
                        type: 'line',
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#8b5cf6',
                        order: 2
                    },
                    {
                        label: 'Saldo Acumulado',
                        data: saldoAcumulado,
                        type: 'line',
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 5,
                        pointBackgroundColor: '#0ea5e9',
                        order: 1
                    },
                    {
                        label: 'Meta Saldo Mínimo',
                        data: metaSaldo,
                        type: 'line',
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        fill: false,
                        pointRadius: 0,
                        order: 0
                    },
                    {
                        label: '📊 Estimativa Avulsos (Receita)',
                        data: receitaAvulsosEstimados,
                        type: 'line',
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.05)',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        pointRadius: 3,
                        pointBackgroundColor: '#8b5cf6',
                        spanGaps: true,
                        order: 1,
                        hidden: false
                    },
                    {
                        label: '📊 Estimativa Extras (Despesa)',
                        data: despesaExtrasEstimadas,
                        type: 'line',
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.05)',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        pointRadius: 3,
                        pointBackgroundColor: '#f97316',
                        spanGaps: true,
                        order: 1,
                        hidden: false
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
                                return label + ': ' + Utils.formatCurrency(context.raw || 0);
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 10 },
                            boxWidth: 14,
                            padding: 8,
                            usePointStyle: true
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) { return Utils.formatCurrency(value); },
                            font: { size: 10 }
                        }
                    },
                    x: {
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });

        console.log('✅ Gráfico de fluxo de caixa v8.3 renderizado');
    } catch (error) {
        console.error('❌ Erro ao criar gráfico de fluxo de caixa:', error);
    }
};

// =============================================
// TABELA DE FLUXO
// =============================================
managerApp._renderizarTabelaFluxo = function(dados) {
    var container = document.getElementById('fluxoTabelaContainer');
    if (!container) return;

    var projecao = dados.projecao;
    if (!projecao || projecao.length === 0) {
        container.innerHTML = '<div class="empty-state">Sem dados para exibir</div>';
        return;
    }

    var mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    var html = '<div class="card">';
    html += '<div class="card-header"><span class="card-title">📋 Projeção Mês a Mês</span></div>';
    html += '<div class="card-body" style="padding: 12px 16px;">';
    html += '<div class="data-table-wrapper">';
    html += '<table class="data-table" style="font-size: 12px;">';
    html += '<thead><tr>';
    html += '<th>Mês</th>';
    html += '<th class="text-right">Receita</th>';
    html += '<th class="text-right">Despesa</th>';
    html += '<th class="text-right">Resultado</th>';
    html += '<th class="text-right">Saldo</th>';
    html += '</tr></thead><tbody>';

    for (var i = 0; i < projecao.length; i++) {
        var p = projecao[i];
        var label = mesesNomes[p.mes - 1] + '/' + String(p.ano).slice(2);
        var corResult = p.resultado >= 0 ? '#10b981' : '#dc2626';
        var corSaldo = p.saldoAcumulado >= 0 ? '#10b981' : '#dc2626';
        var badgeEst = '';
        if (p.receitaAvulsosEstimados > 0 || p.despesaExtrasEstimadas > 0) {
            badgeEst = ' <span style="font-size: 9px; padding: 1px 5px; background: #ede9fe; color: #7c3aed; border-radius: 4px;">📊 Estimativa</span>';
        }
        html += '<tr>';
        html += '<td><strong>' + label + '</strong>' + badgeEst + '</td>';
        html += '<td class="text-right">' + Utils.formatCurrency(p.receita) + '</td>';
        html += '<td class="text-right">' + Utils.formatCurrency(p.despesa) + '</td>';
        html += '<td class="text-right" style="color:' + corResult + ';font-weight:600;">' + Utils.formatCurrency(p.resultado) + '</td>';
        html += '<td class="text-right" style="color:' + corSaldo + ';">' + Utils.formatCurrency(p.saldoAcumulado) + '</td>';
        html += '</tr>';
    }

    html += '</tbody></table></div></div></div>';
    container.innerHTML = html;
};

// =============================================
// MODAL SALVAR SALDO INICIAL (AUTO/MANUAL)
// =============================================
managerApp.salvarSaldoInicial = function() {
    var self = this;

    Utils.showLoading('Carregando saldo...');

    Promise.all([
        API.getSaldoAtual(),
        self._determinarModoSaldo(),
        API.listarReceitas(),
        API.listarDespesas()
    ]).then(function(results) {
        Utils.hideLoading();

        var saldoData = results[0];
        var modoAtual = results[1];
        var receitas = results[2].receitas || [];
        var despesas = results[3].despesas || [];

        var mesRef = self.getMesReferencia();
        var saldoCaixaAtual = saldoData.saldoCaixa || 0;
        var saldoAplicacoesAtual = saldoData.saldoAplicacoes || 0;

        self._calcularSaldoAutomatico(receitas, despesas, mesRef)
            .then(function(saldoAuto) {
                self._renderizarModalSaldo({
                    modoAtual: modoAtual,
                    saldoCaixaManual: saldoCaixaAtual,
                    saldoAplicacoesManual: saldoAplicacoesAtual,
                    saldoCaixaAuto: saldoAuto.saldoCaixa,
                    saldoAplicacoesAuto: saldoAuto.saldoAplicacoes,
                    saldoDetalhes: saldoAuto.detalhes
                });
            })
            .catch(function(error) {
                console.error('❌ Erro ao calcular saldo automático:', error);
                self._renderizarModalSaldo({
                    modoAtual: modoAtual,
                    saldoCaixaManual: saldoCaixaAtual,
                    saldoAplicacoesManual: saldoAplicacoesAtual,
                    saldoCaixaAuto: saldoCaixaAtual,
                    saldoAplicacoesAuto: saldoAplicacoesAtual,
                    saldoDetalhes: { base: saldoCaixaAtual + saldoAplicacoesAtual, recebido: 0, pago: 0 }
                });
            });
    }).catch(function(error) {
        Utils.hideLoading();
        Utils.showToast('Erro ao carregar saldo: ' + error.message, 'error');
    });
};

managerApp._renderizarModalSaldo = function(dados) {
    var self = this;
    var modal = document.getElementById('modalOverlay');

    document.getElementById('modalTitle').innerHTML = '⚙️ Ajustar Saldo Manualmente';

    var isAuto = dados.modoAtual === 'auto';
    var readonlyAttr = isAuto ? 'readonly' : '';

    var html = '';
    html += '<div class="saldo-modal-container">';

    html += '  <div style="display: flex; gap: 8px; background: var(--gray-100); padding: 6px; border-radius: 12px; margin-bottom: 8px;">';
    html += '    <button type="button" id="btnModoAuto" style="flex: 1; padding: 10px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; ' +
            (isAuto
                ? 'background: white; color: var(--primary-700); box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
                : 'background: transparent; color: var(--gray-500);') +
            '">🤖 Auto</button>';
    html += '    <button type="button" id="btnModoManual" style="flex: 1; padding: 10px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; ' +
            (!isAuto
                ? 'background: white; color: var(--primary-700); box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
                : 'background: transparent; color: var(--gray-500);') +
            '">✏️ Manual</button>';
    html += '  </div>';

    html += '  <div id="saldoModoDescricao" style="font-size: 11px; color: var(--gray-500); text-align: center; margin-bottom: 12px; min-height: 16px;">' +
            (isAuto
                ? '🤖 Modo Auto: saldo calculado a partir do manual + receitas recebidas - despesas pagas'
                : '✏️ Modo Manual: você define os valores de caixa e aplicações') +
            '</div>';

    html += '  <div class="saldo-modal-campo">';
    html += '    <div class="campo-label">💵 Saldo em Caixa</div>';
    html += '    <input type="text" class="campo-input input-currency" id="modalSaldoCaixa" ' +
            'value="' + Utils.formatCurrency(isAuto ? dados.saldoCaixaAuto : dados.saldoCaixaManual) + '" ' +
            readonlyAttr + '>';
    html += '  </div>';

    html += '  <div class="saldo-modal-campo aplicacoes">';
    html += '    <div class="campo-label">🏦 Saldo em Aplicações</div>';
    html += '    <input type="text" class="campo-input input-currency" id="modalSaldoAplicacoes" ' +
            'value="' + Utils.formatCurrency(isAuto ? dados.saldoAplicacoesAuto : dados.saldoAplicacoesManual) + '" ' +
            readonlyAttr + '>';
    html += '  </div>';

    var totalExibir = isAuto
        ? (dados.saldoCaixaAuto + dados.saldoAplicacoesAuto)
        : (dados.saldoCaixaManual + dados.saldoAplicacoesManual);

    html += '  <div class="saldo-modal-total">';
    html += '    <span class="label">Total</span>';
    html += '    <span class="valor" id="modalSaldoTotal">' + Utils.formatCurrency(totalExibir) + '</span>';
    html += '  </div>';

    if (isAuto) {
        html += '  <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 10px 14px; font-size: 11px; color: #065f46; line-height: 1.6;">';
        html += '    <strong>📊 Composição:</strong> Base ' + Utils.formatCurrency(dados.saldoDetalhes.base) +
                ' + Recebido ' + Utils.formatCurrency(dados.saldoDetalhes.recebido) +
                ' - Pago ' + Utils.formatCurrency(dados.saldoDetalhes.pago);
        html += '  </div>';
    }

    html += '  <button type="button" class="btn btn-secondary" id="btnCalcularAuto" style="width: 100%; height: 40px; font-size: 13px;">🤖 Calcular automaticamente</button>';

    html += '</div>';

    document.getElementById('modalBody').innerHTML = html;

    document.getElementById('modalFooter').innerHTML =
        '<div style="display: flex; gap: 12px; width: 100%;">' +
        '  <button class="btn btn-secondary" id="modalSaldoCancelar" style="flex: 1;">Cancelar</button>' +
        '  <button class="btn btn-success" id="modalSaldoSalvar" style="flex: 1;">Salvar</button>' +
        '</div>';

    modal.style.display = 'flex';

    var inputCaixa = document.getElementById('modalSaldoCaixa');
    var inputAplic = document.getElementById('modalSaldoAplicacoes');
    if (!isAuto) {
        if (inputCaixa) Utils.applyCurrencyMask(inputCaixa);
        if (inputAplic) Utils.applyCurrencyMask(inputAplic);
    }

    var modoSelecionado = dados.modoAtual;

    document.getElementById('btnModoAuto').onclick = function() {
        modoSelecionado = 'auto';
        if (inputCaixa) { inputCaixa.value = Utils.formatCurrency(dados.saldoCaixaAuto); inputCaixa.setAttribute('readonly', 'readonly'); }
        if (inputAplic) { inputAplic.value = Utils.formatCurrency(dados.saldoAplicacoesAuto); inputAplic.setAttribute('readonly', 'readonly'); }
        document.getElementById('modalSaldoTotal').textContent = Utils.formatCurrency(dados.saldoCaixaAuto + dados.saldoAplicacoesAuto);
        this.style.background = 'white'; this.style.color = 'var(--primary-700)'; this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        var btnM = document.getElementById('btnModoManual');
        btnM.style.background = 'transparent'; btnM.style.color = 'var(--gray-500)'; btnM.style.boxShadow = 'none';
        document.getElementById('saldoModoDescricao').textContent = '🤖 Modo Auto: saldo calculado a partir do manual + receitas recebidas - despesas pagas';
    };

    document.getElementById('btnModoManual').onclick = function() {
        modoSelecionado = 'manual';
        if (inputCaixa) { inputCaixa.value = Utils.formatCurrency(dados.saldoCaixaManual); inputCaixa.removeAttribute('readonly'); Utils.applyCurrencyMask(inputCaixa); }
        if (inputAplic) { inputAplic.value = Utils.formatCurrency(dados.saldoAplicacoesManual); inputAplic.removeAttribute('readonly'); Utils.applyCurrencyMask(inputAplic); }
        document.getElementById('modalSaldoTotal').textContent = Utils.formatCurrency(dados.saldoCaixaManual + dados.saldoAplicacoesManual);
        this.style.background = 'white'; this.style.color = 'var(--primary-700)'; this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        var btnA = document.getElementById('btnModoAuto');
        btnA.style.background = 'transparent'; btnA.style.color = 'var(--gray-500)'; btnA.style.boxShadow = 'none';
        document.getElementById('saldoModoDescricao').textContent = '✏️ Modo Manual: você define os valores de caixa e aplicações';
    };

    document.getElementById('btnCalcularAuto').onclick = function() {
        modoSelecionado = 'auto';
        if (inputCaixa) { inputCaixa.value = Utils.formatCurrency(dados.saldoCaixaAuto); inputCaixa.setAttribute('readonly', 'readonly'); }
        if (inputAplic) { inputAplic.value = Utils.formatCurrency(dados.saldoAplicacoesAuto); inputAplic.setAttribute('readonly', 'readonly'); }
        document.getElementById('modalSaldoTotal').textContent = Utils.formatCurrency(dados.saldoCaixaAuto + dados.saldoAplicacoesAuto);
        var btnA = document.getElementById('btnModoAuto');
        btnA.style.background = 'white'; btnA.style.color = 'var(--primary-700)'; btnA.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        var btnM = document.getElementById('btnModoManual');
        btnM.style.background = 'transparent'; btnM.style.color = 'var(--gray-500)'; btnM.style.boxShadow = 'none';
        document.getElementById('saldoModoDescricao').textContent = '🤖 Valores calculados automaticamente';
        Utils.showToast('🤖 Valores calculados automaticamente', 'info');
    };

    document.getElementById('modalSaldoCancelar').onclick = function() {
        self.fecharModal();
    };

    document.getElementById('modalSaldoSalvar').onclick = function() {
        var caixa = Utils.parseCurrencyToNumber(document.getElementById('modalSaldoCaixa').value);
        var aplicacoes = Utils.parseCurrencyToNumber(document.getElementById('modalSaldoAplicacoes').value);

        if (modoSelecionado === 'auto') {
            caixa = dados.saldoCaixaAuto;
            aplicacoes = dados.saldoAplicacoesAuto;
        }

        Utils.showLoading('Salvando saldo...');

        Promise.all([
            API.salvarSaldoAtual(caixa, aplicacoes),
            self._salvarModoSaldo(modoSelecionado)
        ]).then(function(results) {
            Utils.hideLoading();
            if (results[0].result === 'success') {
                Utils.showToast('✅ Saldo salvo com sucesso!');
                self.fecharModal();
                self.dadosFluxoCaixa = null;
                self.carregarFluxoCaixa();
            } else {
                Utils.showToast('Erro ao salvar saldo: ' + (results[0].error || 'desconhecido'), 'error');
            }
        }).catch(function(error) {
            Utils.hideLoading();
            Utils.showToast('Erro ao salvar: ' + error.message, 'error');
        });
    };
};

managerApp._salvarModoSaldo = function(modo) {
    localStorage.setItem('fluxoCaixa_saldoModo', modo);
    console.log('💾 Modo do saldo salvo localmente:', modo);

    return fetch(CONFIG.SUPABASE_URL + '/saldo_fluxo_caixa?select=id&limit=1', {
        headers: {
            'apikey': CONFIG.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
        }
    })
    .then(function(r) { return r.json(); })
    .then(function(rows) {
        if (rows && rows.length > 0) {
            return fetch(CONFIG.SUPABASE_URL + '/saldo_fluxo_caixa?id=eq.' + rows[0].id, {
                method: 'PATCH',
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ saldo_modo: modo })
            }).then(function() {
                console.log('✅ Modo do saldo salvo no Supabase:', modo);
                return { result: 'success' };
            });
        } else {
            return fetch(CONFIG.SUPABASE_URL + '/saldo_fluxo_caixa', {
                method: 'POST',
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ saldo_modo: modo })
            }).then(function() {
                console.log('✅ Modo do saldo criado no Supabase:', modo);
                return { result: 'success' };
            });
        }
    })
    .catch(function(error) {
        console.warn('⚠️ Erro ao salvar modo no Supabase (localStorage mantido):', error);
        return { result: 'success', fallback: true };
    });
};
// =============================================
// ALERTAS DE FLUXO
// =============================================
managerApp._renderizarAlertasFluxo = function(dados) {
    var container = document.getElementById('fluxoAlertasContainer');
    if (!container) return;

    var projecao = dados.projecao;
    if (!projecao || projecao.length === 0) { container.innerHTML = ''; return; }

    var alertas = [];
    for (var i = 0; i < projecao.length; i++) {
        var p = projecao[i];
        var label = p.mes + '/' + p.ano;

        if (p.saldoAcumulado < 0) {
            alertas.push({
                tipo: 'critico',
                icone: '🔴',
                texto: 'Saldo negativo em <strong>' + label + '</strong>: ' +
                       Utils.formatCurrency(p.saldoAcumulado)
            });
        } else if (p.saldoAcumulado < CONFIG_FLUXO.META_SALDO_MINIMO) {
            alertas.push({
                tipo: 'atencao',
                icone: '🟡',
                texto: 'Saldo abaixo da meta em <strong>' + label + '</strong>: ' +
                       Utils.formatCurrency(p.saldoAcumulado)
            });
        }
    }

    if (alertas.length === 0) { container.innerHTML = ''; return; }

    var html = '<div class="alerta-furo atencao">';
    html += '<div class="alerta-furo-icon">⚠️</div>';
    html += '<div class="alerta-furo-conteudo">';
    html += '<div class="alerta-furo-titulo">Alertas de Fluxo de Caixa</div>';
    html += '<div class="alerta-furo-mensagem">';
    for (var j = 0; j < alertas.length; j++) {
        html += '<div style="padding: 4px 0;">' + alertas[j].icone + ' ' + alertas[j].texto + '</div>';
    }
    html += '</div></div></div>';
    container.innerHTML = html;
};

// =============================================
// ANÁLISE DE ÓBITO
// =============================================
managerApp._renderizarAnaliseObito = function(dados) {
    var container = document.getElementById('fluxoObitoContainer');
    if (!container) return;

    var assistidos = dados.assistidos || [];
    var risco = [];

    for (var i = 0; i < assistidos.length; i++) {
        var a = assistidos[i];
        if (a.status !== 'Ativo') continue;
        var idade = Utils.calcularIdade(a.dataNasc);
        if (idade !== null && idade >= 80) {
            risco.push({ nome: a.nome, idade: idade, valor: parseFloat(a.vlrContrato) || 0 });
        }
    }

    if (risco.length === 0) { container.innerHTML = ''; return; }

    risco.sort(function(a, b) { return b.idade - a.idade; });
    var valorTotal = risco.reduce(function(s, r) { return s + r.valor; }, 0);

    var html = '<div class="card" style="border-left: 4px solid #dc2626;">';
    html += '<div class="card-header" style="background: #fef2f2;">';
    html += '<span class="card-title">⚰️ Análise de Risco de Óbito (80+ anos)</span>';
    html += '</div><div class="card-body" style="padding: 12px 16px;">';
    html += '<div style="margin-bottom: 8px; font-size: 13px; color: var(--gray-600);">';
    html += risco.length + ' assistido(s) com 80+ anos. Receita em risco: <strong>' +
            Utils.formatCurrency(valorTotal) + '/mês</strong>.';
    html += '</div>';
    html += '<div class="data-table-wrapper"><table class="data-table" style="font-size: 12px;">';
    html += '<thead><tr><th>Assistido</th><th class="text-right">Idade</th><th class="text-right">Receita</th></tr></thead><tbody>';
    for (var k = 0; k < risco.length; k++) {
        html += '<tr><td>' + risco[k].nome + '</td><td class="text-right">' + risco[k].idade + '</td><td class="text-right">' + Utils.formatCurrency(risco[k].valor) + '</td></tr>';
    }
    html += '</tbody></table></div></div></div>';
    container.innerHTML = html;
};

// =============================================
// ALERTA DE FURO
// =============================================
managerApp._renderizarAlertaFuro = function(dados) {
    var container = document.getElementById('fluxoAlertaFuroContainer');
    if (!container) return;

    var projecao = dados.projecao;
    if (!projecao || projecao.length === 0) { container.innerHTML = ''; return; }

    var furos = [];
    for (var i = 0; i < projecao.length; i++) {
        var p = projecao[i];
        if (p.saldoAcumulado < 0) {
            furos.push({
                mes: p.mes + '/' + p.ano,
                saldo: p.saldoAcumulado,
                resultado: p.resultado
            });
        }
    }

    if (furos.length === 0) { container.innerHTML = ''; return; }

    var html = '<div class="alerta-furo critico">';
    html += '<div class="alerta-furo-icon">🚨</div>';
    html += '<div class="alerta-furo-conteudo">';
    html += '<div class="alerta-furo-titulo">' + furos.length + ' mês(es) com saldo negativo projetado</div>';
    html += '<div class="alerta-furo-mensagem">';
    html += 'O fluxo de caixa ficará negativo em: ';
    html += furos.map(function(f) { return '<strong>' + f.mes + '</strong>'; }).join(', ');
    html += '</div></div></div>';
    container.innerHTML = html;
};

// =============================================
// 🆕 v7.1 — Cálculo do 5º Dia Útil com Feriados
// Feriados fixos + móveis (Carnaval, Páscoa, Corpus Christi)
// =============================================

managerApp._calcularPascoa = function(ano) {
    var a = ano % 19;
    var b = Math.floor(ano / 100);
    var c = ano % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mes = Math.floor((h + l - 7 * m + 114) / 31);
    var dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(ano, mes - 1, dia);
};

managerApp._isFeriado = function(data) {
    var dia = data.getDate();
    var mes = data.getMonth() + 1;
    var ano = data.getFullYear();

    var feriadosFixos = [
        '1-1', '21-4', '1-5', '7-9', '12-10', '2-11', '15-11', '25-12'
    ];
    if (feriadosFixos.indexOf(dia + '-' + mes) !== -1) return true;

    var pascoa = this._calcularPascoa(ano);
    var pascoaMs = pascoa.getTime();
    var umDia = 24 * 60 * 60 * 1000;

    var carnavalSegunda = new Date(pascoaMs - 48 * umDia);
    var carnavalTerca = new Date(pascoaMs - 47 * umDia);
    var sextaSanta = new Date(pascoaMs - 2 * umDia);
    var corpusChristi = new Date(pascoaMs + 60 * umDia);

    var dataSemHora = new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();

    if (dataSemHora === carnavalSegunda.getTime()) return true;
    if (dataSemHora === carnavalTerca.getTime()) return true;
    if (dataSemHora === sextaSanta.getTime()) return true;
    if (dataSemHora === corpusChristi.getTime()) return true;

    return false;
};

managerApp._calcular5oDiaUtil = function(mes, ano) {
    var uteis = 0;
    var data = new Date(ano, mes - 1, 1);

    while (uteis < 5) {
        var diaSemana = data.getDay();
        var isFimDeSemana = (diaSemana === 0 || diaSemana === 6);
        var isFeriado = managerApp._isFeriado(data);

        if (!isFimDeSemana && !isFeriado) {
            uteis++;
            if (uteis === 5) break;
        }
        data.setDate(data.getDate() + 1);
    }

    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
};

// =============================================
// 🆕 v7.1 — Cálculo da Folha de um Mês (Híbrido)
// =============================================
managerApp._calcularFolhaDoMes = function(dados, mesTrabalhado, anoTrabalhado) {
    var mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var nomeMesTrabalhado = mesesNomes[mesTrabalhado - 1];

    var buscaCompetencia = 'competência ' + nomeMesTrabalhado.toLowerCase() + '/' + anoTrabalhado;

    var despesasRelatorio = (dados.despesas || []).filter(function(d) {
        if (d.status !== 'Pendente') return false;
        if (d.categoria !== 'Custo Personal Care' && d.categoria !== 'Custo Enfermagem') return false;
        var desc = (d.descricao || '').toLowerCase();
        return desc.indexOf(buscaCompetencia) !== -1;
    });

    if (despesasRelatorio.length > 0) {
        var custoPC = 0;
        var custoEnf = 0;
        for (var i = 0; i < despesasRelatorio.length; i++) {
            var d = despesasRelatorio[i];
            var valor = parseFloat(d.valor) || 0;
            if (d.categoria === 'Custo Personal Care') custoPC += valor;
            else custoEnf += valor;
        }
        return Promise.resolve({
            custoPC: custoPC,
            custoEnf: custoEnf,
            total: custoPC + custoEnf,
            fonte: 'despesas_pendentes'
        });
    }

    var self = this;
    return this._calcularFolhaViaEscala(mesTrabalhado, anoTrabalhado)
        .then(function(resultado) {
            if (resultado.total > 0) {
                return resultado;
            }
            var custoPCFallback = 0;
            var assistidos = dados.assistidos || [];
            for (var k = 0; k < assistidos.length; k++) {
                var a = assistidos[k];
                if (a.status === 'Ativo' && a.tipoContrato === 'MENSAL') {
                    custoPCFallback += (parseFloat(a.totalHrsMes) || 0) * (parseFloat(a.vlrPlantao) || 0);
                }
            }
            return {
                custoPC: custoPCFallback,
                custoEnf: 0,
                total: custoPCFallback,
                fonte: 'cadastro'
            };
        });
};

managerApp._calcularFolhaViaEscala = function(mesTrabalhado, anoTrabalhado) {
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return new Promise(function(resolve) {
        var urlEscalas = CONFIG.SUPABASE_URL + '/escalas?mes=eq.' + mesTrabalhado +
                         '&ano=eq.' + anoTrabalhado + '&select=*';

        fetch(urlEscalas, {
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
            }
        })
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(escalas) {
            if (!escalas || escalas.length === 0) {
                resolve({ custoPC: 0, custoEnf: 0, total: 0, fonte: 'escalas_vazia' });
                return;
            }

            var urlAssistidos = CONFIG.SUPABASE_URL + '/assistidos?select=id,nome,vlr_plantao,registrar_prontuario';
            return fetch(urlAssistidos, {
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
                }
            })
            .then(function(r) { return r.ok ? r.json() : []; })
            .then(function(assistidosList) {
                var infoPorId = {};
                for (var a = 0; a < assistidosList.length; a++) {
                    var vp = 0;
                    if (assistidosList[a].vlr_plantao) {
                        var s = String(assistidosList[a].vlr_plantao).replace(/[^0-9,.]/g, '').replace(',', '.');
                        vp = parseFloat(s) || 0;
                    }
                    var obrigatorio = (assistidosList[a].registrar_prontuario || 'Obrigatório')
                        .toString().trim().toLowerCase() === 'obrigatório';
                    infoPorId[assistidosList[a].id] = {
                        nome: assistidosList[a].nome,
                        valorPlantao: vp,
                        prontuarioObrigatorio: obrigatorio
                    };
                }

                var ignorados = ['SEM CONTRATAÇÃO', 'NÃO REALIZADO', 'PLANTÃO EXTRA', 'SEM CONTRATACAO', 'NAO REALIZADO', 'PLANTAO EXTRA'];
                var custoBruto = 0;

                for (var e = 0; e < escalas.length; e++) {
                    var escala = escalas[e];
                    var info = infoPorId[escala.assistido_id];
                    if (!info || info.valorPlantao === 0) continue;

                    var turnos = [
                        { chave: 'diurno', valor: escala.diurno || '', pago: escala.diurno_pago === true },
                        { chave: 'noturno', valor: escala.noturno || '', pago: escala.noturno_pago === true }
                    ];

                    for (var t = 0; t < turnos.length; t++) {
                        var turno = turnos[t];
                        var v = String(turno.valor).trim();
                        if (!v) continue;

                        if (turno.pago) continue;

                        var nome = v.replace(';PG', '').trim();

                        var isIgnorado = false;
                        for (var ig = 0; ig < ignorados.length; ig++) {
                            if (nome.toUpperCase().indexOf(ignorados[ig]) !== -1) {
                                isIgnorado = true;
                                break;
                            }
                        }
                        if (isIgnorado) continue;

                        if (info.prontuarioObrigatorio) {
                            var isentoNoDia = escala.prontuario_obrigatorio === false;
                            var entregue = turno.chave === 'diurno'
                                ? escala.prontuario_diurno_entregue === true
                                : escala.prontuario_noturno_entregue === true;
                            var dataPlantao = new Date(anoTrabalhado, mesTrabalhado - 1, escala.dia);
                            dataPlantao.setHours(0, 0, 0, 0);
                            var diffDias = Math.floor((hoje - dataPlantao) / (1000 * 60 * 60 * 24));

                            if (!isentoNoDia && !entregue && diffDias > 7) {
                                continue;
                            }
                        }

                        custoBruto += info.valorPlantao;
                    }
                }

                resolve({
                    custoPC: custoBruto,
                    custoEnf: 0,
                    total: custoBruto,
                    fonte: 'escalas_bruto'
                });
            });
        })
        .catch(function(error) {
            console.error('❌ Erro ao calcular folha via escalas:', error);
            resolve({ custoPC: 0, custoEnf: 0, total: 0, fonte: 'erro' });
        });
    });
};

// =============================================
// 🆕 v7.1 — Card "Próximo Pagamento de Folha"
// =============================================
managerApp._renderizarCardProximoPagamentoFolha = function(dados) {
    var self = this;

    var cardExistente = document.getElementById('cardProximoPagamentoFolha');
    if (cardExistente) cardExistente.remove();

    var container = document.getElementById('fluxoAlertaFuroContainer');
    if (!container || !container.parentNode) {
        var fallback = document.querySelector('#page-fluxo-caixa .card-body');
        if (!fallback) return;
        container = fallback;
    }

    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    var mesAtual = hoje.getMonth() + 1;
    var anoAtual = hoje.getFullYear();
    var data5oAtual = this._calcular5oDiaUtil(mesAtual, anoAtual);

    var proximoPagamento, mesTrabalhado, anoTrabalhado;

    if (hoje > data5oAtual) {
        var proxMes = mesAtual + 1;
        var proxAno = anoAtual;
        if (proxMes > 12) { proxMes = 1; proxAno++; }
        proximoPagamento = this._calcular5oDiaUtil(proxMes, proxAno);
        mesTrabalhado = (proxMes === 1) ? 12 : proxMes - 1;
        anoTrabalhado = (proxMes === 1) ? proxAno - 1 : proxAno;
    } else {
        proximoPagamento = data5oAtual;
        mesTrabalhado = (mesAtual === 1) ? 12 : mesAtual - 1;
        anoTrabalhado = (mesAtual === 1) ? anoAtual - 1 : anoAtual;
    }

    this._calcularFolhaDoMes(dados, mesTrabalhado, anoTrabalhado)
        .then(function(folhaProxima) {
            var proxMes2, proxAno2;
            if (mesTrabalhado === 12) { proxMes2 = 1; proxAno2 = anoTrabalhado + 1; }
            else { proxMes2 = mesTrabalhado + 1; proxAno2 = anoTrabalhado; }

            return self._calcularFolhaDoMes(dados, proxMes2, proxAno2)
                .then(function(folhaProjecao) {
                    var mProj = proximoPagamento.getMonth() + 2;
                    var aProj = proximoPagamento.getFullYear();
                    if (mProj > 12) { mProj = 1; aProj++; }
                    var projecaoData = self._calcular5oDiaUtil(mProj, aProj);

                    self._renderizarCardFolha({
                        proximoPagamento: proximoPagamento,
                        mesTrabalhado: mesTrabalhado,
                        anoTrabalhado: anoTrabalhado,
                        folhaProxima: folhaProxima,
                        projecaoData: projecaoData,
                        mesProjecao: proxMes2,
                        anoProjecao: proxAno2,
                        folhaProjecao: folhaProjecao,
                        container: container
                    });
                });
        })
        .catch(function(error) {
            console.error('❌ Erro ao calcular folha:', error);
        });
};

managerApp._renderizarCardFolha = function(opts) {
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    var diasRestantes = Math.ceil((opts.proximoPagamento - hoje) / (1000 * 60 * 60 * 24));

    var mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    function formatarData(d) {
        return String(d.getDate()).padStart(2, '0') + '/' +
               String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    }

    var corBorda, corTexto, icone, mensagem;
    if (diasRestantes <= 3) {
        corBorda = '#dc2626'; corTexto = '#991b1b'; icone = '🚨';
        mensagem = 'PAGAMENTO CRÍTICO — ' + diasRestantes + ' dia(s)';
    } else if (diasRestantes <= 7) {
        corBorda = '#f59e0b'; corTexto = '#92400e'; icone = '⚠️';
        mensagem = 'Pagamento próximo — ' + diasRestantes + ' dias';
    } else {
        corBorda = '#0d9488'; corTexto = '#0f766e'; icone = '📅';
        mensagem = 'Próximo em ' + diasRestantes + ' dias';
    }

    function labelFonte(fonte) {
        if (fonte === 'despesas_pendentes') return '✅ valor real (relatório)';
        if (fonte === 'escalas_bruto') return '📊 valor bruto (escalas)';
        if (fonte === 'cadastro') return '🔮 estimativa (cadastro)';
        return '';
    }

    var labelMesTrab = mesesNomes[opts.mesTrabalhado - 1] + '/' + opts.anoTrabalhado;
    var labelMesProj = mesesNomes[opts.mesProjecao - 1] + '/' + opts.anoProjecao;

    var card = document.createElement('div');
    card.id = 'cardProximoPagamentoFolha';
    card.style.cssText = [
        'background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        'border: 2px solid ' + corBorda,
        'border-left: 5px solid ' + corBorda,
        'border-radius: 12px',
        'padding: 16px 20px',
        'margin-bottom: 16px',
        'box-shadow: 0 2px 8px rgba(0,0,0,0.05)'
    ].join(';');

    var html = '';

    html += '<div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-bottom: 12px;">';
    html += '  <div style="font-size: 36px; line-height: 1; flex-shrink: 0;">' + icone + '</div>';
    html += '  <div style="flex: 1; min-width: 200px;">';
    html += '    <div style="font-size: 11px; font-weight: 700; color: ' + corTexto + '; text-transform: uppercase; letter-spacing: 0.5px;">';
    html += '      💰 Próximo Pagamento de Folha';
    html += '    </div>';
    html += '    <div style="font-size: 22px; font-weight: 800; color: ' + corTexto + '; margin: 4px 0;">';
    html += '      ' + Utils.formatCurrency(opts.folhaProxima.total);
    html += '    </div>';
    html += '    <div style="font-size: 12px; color: var(--gray-600);">';
    html += '      <strong>(' + labelMesTrab + ')</strong> &nbsp;|&nbsp; ';
    html += '      📅 <strong>' + formatarData(opts.proximoPagamento) + '</strong> (5º dia útil) &nbsp;|&nbsp; ';
    html += '      ⏱️ ' + diasRestantes + ' dias';
    html += '    </div>';
    html += '  </div>';
    html += '  <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--gray-500); min-width: 160px; text-align: right;">';
    html += '    <div>👥 Custo PC: <strong>' + Utils.formatCurrency(opts.folhaProxima.custoPC) + '</strong></div>';
    html += '    <div>🏥 Custo Enfermagem: <strong>' + Utils.formatCurrency(opts.folhaProxima.custoEnf) + '</strong></div>';
    html += '    <div style="font-size: 10px; color: var(--gray-400); margin-top: 2px;">' + labelFonte(opts.folhaProxima.fonte) + '</div>';
    html += '  </div>';
    html += '</div>';

    html += '<div style="border-top: 1px dashed var(--gray-300); margin: 8px 0;"></div>';

    html += '<div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-top: 8px; opacity: 0.85;">';
    html += '  <div style="font-size: 24px; line-height: 1; flex-shrink: 0;">🔮</div>';
    html += '  <div style="flex: 1; min-width: 200px;">';
    html += '    <div style="font-size: 10px; font-weight: 700; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.5px;">';
    html += '      Próxima Projeção (fallback)';
    html += '    </div>';
    html += '    <div style="font-size: 16px; font-weight: 700; color: #6d28d9; margin: 2px 0;">';
    html += '      ' + Utils.formatCurrency(opts.folhaProjecao.total);
    html += '    </div>';
    html += '    <div style="font-size: 11px; color: var(--gray-600);">';
    html += '      <strong>(' + labelMesProj + ')</strong> &nbsp;|&nbsp; ';
    html += '      📅 ' + formatarData(opts.projecaoData) + ' &nbsp;|&nbsp; ';
    html += '      ' + labelFonte(opts.folhaProjecao.fonte);
    html += '    </div>';
    html += '  </div>';
    html += '  <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: var(--gray-500); min-width: 160px; text-align: right;">';
    html += '    <div>👥 Custo PC: <strong>' + Utils.formatCurrency(opts.folhaProjecao.custoPC) + '</strong></div>';
    html += '    <div>🏥 Custo Enfermagem: <strong>' + Utils.formatCurrency(opts.folhaProjecao.custoEnf) + '</strong></div>';
    html += '  </div>';
    html += '</div>';

    card.innerHTML = html;

    if (opts.container.id === 'fluxoAlertaFuroContainer') {
        opts.container.parentNode.insertBefore(card, opts.container);
    } else {
        opts.container.insertBefore(card, opts.container.firstChild);
    }

    console.log('✅ Card "Próximo Pagamento de Folha":', {
        proximo: { mes: opts.mesTrabalhado, valor: opts.folhaProxima.total, fonte: opts.folhaProxima.fonte },
        projecao: { mes: opts.mesProjecao, valor: opts.folhaProjecao.total, fonte: opts.folhaProjecao.fonte }
    });
};

// =============================================
// 🆕 v8.3 — PROJETAR FLUXO DIÁRIO (90 DIAS)
// Separa: Pendentes vencidos → Atrasados | Efetivados antes de hoje → linha do dia
// =============================================
managerApp._projetarFluxoDiario = function(dados) {
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    var inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    var dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + 90);

    var saldoInicial = dados.saldoInicial || 0;
    var mapaFolhas = dados._mapaFolhas || {};

    // =============================================
    // PARTE 1 — Iterar dias ATRASADOS (antes de hoje)
    // v8.3 — Duas passadas: Atrasados (só Pendentes) + Efetivados (linha do dia)
    // =============================================
    var receitasAtrasadas = { total: 0, detalhes: [] };
    var despesasAtrasadas = { total: 0, detalhes: [] };
    var diasAtrasados = 0;

    // 🆕 v8.3 — Dias com movimentação efetivada (Recebido/Pago) viram linhas diárias
    var diasAntesDeHoje = [];

    var cursorAtrasado = new Date(inicioMes);
    while (cursorAtrasado < hoje) {
        var anoA = cursorAtrasado.getFullYear();
        var mesA = cursorAtrasado.getMonth() + 1;
        var diaA = cursorAtrasado.getDate();
        var mesRefA = anoA + '-' + String(mesA).padStart(2, '0');
        var diaRefA = mesRefA + '-' + String(diaA).padStart(2, '0');
        var isMesAtualA = (anoA === hoje.getFullYear() && mesA === hoje.getMonth() + 1);

        var dadosComMapaA = {
            saldoInicial: saldoInicial,
            receitas: (dados.receitas && dados.receitas.length > 0) ? dados.receitas : (managerApp.dadosFluxoCaixa.receitas || []),
            despesas: (dados.despesas && dados.despesas.length > 0) ? dados.despesas : (managerApp.dadosFluxoCaixa.despesas || []),
            assistidos: (dados.assistidos && dados.assistidos.length > 0) ? dados.assistidos : (managerApp.dadosFluxoCaixa.assistidos || []),
            mediaAvulsos: dados.mediaAvulsos || 0,
            mediaDespesasExtras: dados.mediaDespesasExtras || 0,
            _mapaFolhas: mapaFolhas
        };

        // Passada 1: Pendentes (vão para Atrasados)
        var receitasPendentesDia = this._projetarReceitasDiarias(dadosComMapaA, diaRefA, mesRefA, isMesAtualA, cursorAtrasado, true);
        var despesasPendentesDia = this._projetarDespesasDiarias(dadosComMapaA, diaRefA, mesRefA, isMesAtualA, cursorAtrasado, true);

        if (receitasPendentesDia.total > 0) {
            receitasAtrasadas.total += receitasPendentesDia.total;
            receitasAtrasadas.detalhes = receitasAtrasadas.detalhes.concat(receitasPendentesDia.detalhes);
            diasAtrasados++;
        }
        if (despesasPendentesDia.total > 0) {
            despesasAtrasadas.total += despesasPendentesDia.total;
            despesasAtrasadas.detalhes = despesasAtrasadas.detalhes.concat(despesasPendentesDia.detalhes);
            diasAtrasados++;
        }

        // Passada 2: Efetivados (Recebido/Pago) viram linha do dia
        var receitasEfetivadasDia = this._projetarReceitasDiarias(dadosComMapaA, diaRefA, mesRefA, isMesAtualA, cursorAtrasado, false);
        var despesasEfetivadasDia = this._projetarDespesasDiarias(dadosComMapaA, diaRefA, mesRefA, isMesAtualA, cursorAtrasado, false);

        var receitasEfetivadas = (receitasEfetivadasDia.detalhes || []).filter(function(x) {
            return x.status === 'Recebido';
        });
        var despesasEfetivadas = (despesasEfetivadasDia.detalhes || []).filter(function(x) {
            return x.status === 'Pago';
        });

        if (receitasEfetivadas.length > 0 || despesasEfetivadas.length > 0) {
            var totalRecEf = receitasEfetivadas.reduce(function(s, x) { return s + (x.valor || 0); }, 0);
            var totalDespEf = despesasEfetivadas.reduce(function(s, x) { return s + (x.valor || 0); }, 0);

            diasAntesDeHoje.push({
                data: new Date(cursorAtrasado),
                dataFormatada: String(diaA).padStart(2, '0') + '/' +
                               String(mesA).padStart(2, '0') + '/' + anoA,
                diaSemana: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][cursorAtrasado.getDay()],
                mesRef: mesRefA,
                receitas: { total: totalRecEf, detalhes: receitasEfetivadas },
                despesas: { total: totalDespEf, detalhes: despesasEfetivadas },
                totalReceitas: totalRecEf,
                totalDespesas: totalDespEf,
                resultado: totalRecEf - totalDespEf,
                isMesAtual: isMesAtualA,
                isAntesDeHoje: true
            });
        }

        cursorAtrasado.setDate(cursorAtrasado.getDate() + 1);
    }

    // =============================================
    // PARTE 2 — Saldo após Atrasados
    // v8.3 — saldoInicial + Σ(efetivados antes de hoje) + receitasAtrasadas − despesasAtrasadas
    // =============================================
    var resultadoEfetivadoAntesDeHoje = 0;
    for (var e = 0; e < diasAntesDeHoje.length; e++) {
        resultadoEfetivadoAntesDeHoje += diasAntesDeHoje[e].resultado;
    }

    var saldoAposEfetivados = saldoInicial + resultadoEfetivadoAntesDeHoje;
    var saldoAposAtrasados = saldoAposEfetivados + receitasAtrasadas.total - despesasAtrasadas.total;

    // =============================================
    // PARTE 3 — Iterar dias FUTUROS (hoje em diante)
    // =============================================
    var saldoAcumulado = saldoAposAtrasados;
    var dias = [];
    var diasComMovimento = 0;
    var totalEntradas = 0;
    var totalSaidas = 0;

    var cursor = new Date(hoje);
    while (cursor <= dataFim) {
        var ano = cursor.getFullYear();
        var mes = cursor.getMonth() + 1;
        var dia = cursor.getDate();
        var mesRef = ano + '-' + String(mes).padStart(2, '0');
        var diaRef = mesRef + '-' + String(dia).padStart(2, '0');
        var isMesAtual = (ano === hoje.getFullYear() && mes === hoje.getMonth() + 1);

        var dadosComMapa = {
            saldoInicial: saldoAposAtrasados,
            receitas: (dados.receitas && dados.receitas.length > 0) ? dados.receitas : (managerApp.dadosFluxoCaixa.receitas || []),
            despesas: (dados.despesas && dados.despesas.length > 0) ? dados.despesas : (managerApp.dadosFluxoCaixa.despesas || []),
            assistidos: (dados.assistidos && dados.assistidos.length > 0) ? dados.assistidos : (managerApp.dadosFluxoCaixa.assistidos || []),
            mediaAvulsos: dados.mediaAvulsos || 0,
            mediaDespesasExtras: dados.mediaDespesasExtras || 0,
            _mapaFolhas: mapaFolhas
        };

        var receitasDia = this._projetarReceitasDiarias(dadosComMapa, diaRef, mesRef, isMesAtual, cursor, false);
        var despesasDia = this._projetarDespesasDiarias(dadosComMapa, diaRef, mesRef, isMesAtual, cursor, false);

        var totalReceitasDia = receitasDia.total;
        var totalDespesasDia = despesasDia.total;
        var resultadoDia = totalReceitasDia - totalDespesasDia;
        saldoAcumulado += resultadoDia;

        if (totalReceitasDia > 0 || totalDespesasDia > 0) {
            diasComMovimento++;
            totalEntradas += totalReceitasDia;
            totalSaidas += totalDespesasDia;

            dias.push({
                data: new Date(cursor),
                dataFormatada: String(dia).padStart(2, '0') + '/' +
                               String(mes).padStart(2, '0') + '/' + ano,
                diaSemana: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][cursor.getDay()],
                mesRef: mesRef,
                receitas: receitasDia,
                despesas: despesasDia,
                totalReceitas: totalReceitasDia,
                totalDespesas: totalDespesasDia,
                resultado: resultadoDia,
                saldoAcumulado: saldoAcumulado,
                isMesAtual: isMesAtual
            });
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    // =============================================
    // PARTE 4 — Menor saldo e dias com furo
    // =============================================
    var menorSaldo = saldoAposAtrasados;
    var dataMenorSaldo = 'Atrasados';
    var diasComFuro = 0;
    if (saldoAposAtrasados < 0) diasComFuro++;

    for (var j = 0; j < dias.length; j++) {
        if (dias[j].saldoAcumulado < menorSaldo) {
            menorSaldo = dias[j].saldoAcumulado;
            dataMenorSaldo = dias[j].dataFormatada;
        }
        if (dias[j].saldoAcumulado < 0) diasComFuro++;
    }

    // =============================================
    // PARTE 5 — Retorno
    // =============================================
    return {
        saldoInicial: saldoInicial,
        _mapaFolhas: mapaFolhas,
        receitasAtrasadas: receitasAtrasadas,
        despesasAtrasadas: despesasAtrasadas,
        saldoAposEfetivados: saldoAposEfetivados,
        resultadoEfetivadoAntesDeHoje: resultadoEfetivadoAntesDeHoje,
        diasAntesDeHoje: diasAntesDeHoje,
        saldoAposAtrasados: saldoAposAtrasados,
        diasAtrasados: diasAtrasados,
        dias: dias,
        resumo: {
            saldoInicial: saldoInicial,
            saldoAposEfetivados: saldoAposEfetivados,
            resultadoEfetivadoAntesDeHoje: resultadoEfetivadoAntesDeHoje,
            saldoAposAtrasados: saldoAposAtrasados,
            diasComMovimento: diasComMovimento,
            totalEntradas: totalEntradas + receitasAtrasadas.total + 
                          (diasAntesDeHoje.reduce(function(s, d) { return s + d.totalReceitas; }, 0)),
            totalSaidas: totalSaidas + despesasAtrasadas.total + 
                        (diasAntesDeHoje.reduce(function(s, d) { return s + d.totalDespesas; }, 0)),
            resultadoPeriodo: (totalEntradas + receitasAtrasadas.total + 
                              (diasAntesDeHoje.reduce(function(s, d) { return s + d.totalReceitas; }, 0))) -
                             (totalSaidas + despesasAtrasadas.total + 
                              (diasAntesDeHoje.reduce(function(s, d) { return s + d.totalDespesas; }, 0))),
            saldoFinal: saldoAcumulado,
            menorSaldo: menorSaldo,
            dataMenorSaldo: dataMenorSaldo,
            diasComFuro: diasComFuro,
            periodoInicio: hoje.toLocaleDateString('pt-BR'),
            periodoFim: dataFim.toLocaleDateString('pt-BR')
        }
    };
};

// =============================================
// 🆕 v8.3 — PROJETAR RECEITAS DIÁRIAS
// Parâmetro isAtrasado:
//   true  → só Pendentes (vão para Atrasados)
//   false → Recebido + Pendente (linha do dia)
// Sempre exclui Cancelado. Inclui status no detalhe.
// =============================================
managerApp._projetarReceitasDiarias = function(dados, diaRef, mesRef, isMesAtual, dataCursor, isAtrasado) {
    var detalhes = [];
    var total = 0;

    if (isMesAtual) {
        var receitasMes = UtilsFinance.filtrarPorMes(dados.receitas, mesRef);
        for (var i = 0; i < receitasMes.length; i++) {
            var r = receitasMes[i];
            if (r.status === 'Cancelado') continue;

            if (isAtrasado) {
                // Atrasados: SÓ Pendentes
                if (r.status !== 'Pendente') continue;
            } else {
                // Linha do dia: Recebido + Pendente
                if (r.status !== 'Recebido' && r.status !== 'Pendente') continue;
            }

            var dataR = r.data;
            if (!dataR) continue;
            if (dataR.includes('T')) dataR = dataR.split('T')[0];

            if (dataR === diaRef) {
                var valor = parseFloat(r.valor) || 0;
                detalhes.push({
                    tipo: 'receita',
                    descricao: r.descricao || 'Receita',
                    assistido: r.assistido || '',
                    valor: valor,
                    categoria: (r.tipoAvulso || r.tipo || 'Contrato Mensal'),
                    status: r.status
                });
                total += valor;
            }
        }

        // Projeção de contratos mensais ainda não gerados
        for (var k = 0; k < dados.assistidos.length; k++) {
            var a = dados.assistidos[k];
            if (a.status !== 'Ativo' || a.tipoContrato !== 'MENSAL') continue;

            var temReceitaNoMes = dados.receitas.some(function(rec) {
                if (rec.assistido !== a.nome) return false;
                var dataStr = rec.data;
                if (!dataStr) return false;
                if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];
                return dataStr.startsWith(mesRef);
            });
            if (temReceitaNoMes) continue;

            // Projeção só entra em "Pendente" (não é efetivada ainda)
            if (!isAtrasado) {
                // No fluxo futuro, projeta no dia de vencimento
                var diaVenc = parseInt(a.diaVencimento) || 1;
                if (diaVenc === dataCursor.getDate()) {
                    var valorContrato = parseFloat(a.vlrContrato) || 0;
                    detalhes.push({
                        tipo: 'receita',
                        descricao: 'Contrato Mensal (previsto)',
                        assistido: a.nome,
                        valor: valorContrato,
                        categoria: 'Contrato Mensal',
                        status: 'Pendente'
                    });
                    total += valorContrato;
                }
            }
        }
    } else {
        // Meses futuros: só projeta contratos + estimativas (no futuro)
        if (!isAtrasado) {
            for (var j = 0; j < dados.assistidos.length; j++) {
                var ass = dados.assistidos[j];
                if (ass.status !== 'Ativo' || ass.tipoContrato !== 'MENSAL') continue;

                var diaV = parseInt(ass.diaVencimento) || 1;
                if (diaV === dataCursor.getDate()) {
                    var valorC = parseFloat(ass.vlrContrato) || 0;
                    detalhes.push({
                        tipo: 'receita',
                        descricao: 'Contrato Mensal',
                        assistido: ass.nome,
                        valor: valorC,
                        categoria: 'Contrato Mensal',
                        status: 'Pendente'
                    });
                    total += valorC;
                }
            }

            if (dados.mediaAvulsos > 0) {
                var diasNoMes = new Date(dataCursor.getFullYear(), dataCursor.getMonth() + 1, 0).getDate();
                var valorDiario = dados.mediaAvulsos / diasNoMes;
                var diaAtual = dataCursor.getDate();
                if (diaAtual === 5 || diaAtual === 15 || diaAtual === 25) {
                    detalhes.push({
                        tipo: 'receita_estimada',
                        descricao: '📊 Estimativa de Avulsos',
                        assistido: '',
                        valor: valorDiario * 3,
                        categoria: 'Avulso (estimado)',
                        status: 'Estimado'
                    });
                    total += valorDiario * 3;
                }
            }
        }
    }

    return { total: total, detalhes: detalhes };
};

// =============================================
// 🆕 v8.3 — PROJETAR DESPESAS DIÁRIAS
// Parâmetro isAtrasado:
//   true  → só Pendentes (vão para Atrasados)
//   false → Pago + Pendente (linha do dia)
// =============================================
managerApp._projetarDespesasDiarias = function(dados, diaRef, mesRef, isMesAtual, dataCursor, isAtrasado) {
    var detalhes = [];
    var total = 0;

    if (isMesAtual) {
        var despesasMes = UtilsFinance.filtrarPorMes(dados.despesas, mesRef);
        for (var i = 0; i < despesasMes.length; i++) {
            var d = despesasMes[i];
            if (d.status === 'Cancelado') continue;

            if (isAtrasado) {
                // Atrasados: SÓ Pendentes
                if (d.status !== 'Pendente') continue;
            } else {
                // Linha do dia: Pago + Pendente
                if (d.status !== 'Pago' && d.status !== 'Pendente') continue;
            }

            var dataD = d.data;
            if (!dataD) continue;
            if (dataD.includes('T')) dataD = dataD.split('T')[0];

            if (dataD === diaRef) {
                var valor = parseFloat(d.valor) || 0;
                detalhes.push({
                    tipo: 'despesa',
                    descricao: d.descricao || 'Despesa',
                    categoria: d.categoria || 'Outros',
                    fornecedor: d.fornecedor || '',
                    valor: valor,
                    status: d.status
                });
                total += valor;
            }
        }

        // Folha do mês anterior (via mapa) — só entra no loop futuro (não é pendente)
        if (!isAtrasado) {
            var data5oUtil = this._calcular5oDiaUtil(dataCursor.getMonth() + 1, dataCursor.getFullYear());
            if (dataCursor.getDate() === data5oUtil.getDate()) {
                var folhaPaga = dados.despesas.some(function(desp) {
                    if (desp.categoria !== 'Custo Personal Care') return false;
                    if (desp.status !== 'Pago') return false;
                    var dataStr = desp.data;
                    if (!dataStr) return false;
                    if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];
                    return dataStr.startsWith(mesRef);
                });

                if (!folhaPaga) {
                    var mesAnteriorCursor = dataCursor.getMonth() === 0 ? 12 : dataCursor.getMonth();
                    var anoAnteriorCursor = dataCursor.getMonth() === 0 ? dataCursor.getFullYear() - 1 : dataCursor.getFullYear();
                    var chaveFolha = anoAnteriorCursor + '-' + String(mesAnteriorCursor).padStart(2, '0');

                    var custoPC = (dados._mapaFolhas && dados._mapaFolhas[chaveFolha]) || 0;
                    if (custoPC > 0) {
                        detalhes.push({
                            tipo: 'despesa_folha',
                            descricao: '💰 Folha de Pagamento (Custo PC)',
                            categoria: 'Custo Personal Care',
                            fornecedor: 'Folha mensal',
                            valor: custoPC,
                            status: 'Pendente'
                        });
                        total += custoPC;
                    }
                }
            }
        }
    } else {
        // Meses futuros
        if (!isAtrasado) {
            var data5oFuturo = this._calcular5oDiaUtil(dataCursor.getMonth() + 1, dataCursor.getFullYear());
            if (dataCursor.getDate() === data5oFuturo.getDate()) {
                var mesAnteriorCursorF = dataCursor.getMonth() === 0 ? 12 : dataCursor.getMonth();
                var anoAnteriorCursorF = dataCursor.getMonth() === 0 ? dataCursor.getFullYear() - 1 : dataCursor.getFullYear();
                var chaveFolhaF = anoAnteriorCursorF + '-' + String(mesAnteriorCursorF).padStart(2, '0');

                var custoPCFuturo = (dados._mapaFolhas && dados._mapaFolhas[chaveFolhaF]) || 0;
                if (custoPCFuturo > 0) {
                    detalhes.push({
                        tipo: 'despesa_folha',
                        descricao: '💰 Folha de Pagamento (prevista)',
                        categoria: 'Custo Personal Care',
                        fornecedor: 'Folha mensal',
                        valor: custoPCFuturo,
                        status: 'Pendente'
                    });
                    total += custoPCFuturo;
                }
            }

            if (dados.mediaDespesasExtras > 0) {
                var diasNoMes = new Date(dataCursor.getFullYear(), dataCursor.getMonth() + 1, 0).getDate();
                var valorDiario = dados.mediaDespesasExtras / diasNoMes;
                var diaAtual = dataCursor.getDate();
                if (diaAtual === 10 || diaAtual === 20 || diaAtual === 30) {
                    detalhes.push({
                        tipo: 'despesa_estimada',
                        descricao: '📊 Estimativa de Plantões Extras',
                        categoria: 'Plantões Extras (estimado)',
                        fornecedor: '',
                        valor: valorDiario * 3,
                        status: 'Estimado'
                    });
                    total += valorDiario * 3;
                }
            }
        }
    }

    return { total: total, detalhes: detalhes };
};

// =============================================
// RENDERIZAR VISÃO DIÁRIA (90 dias)
// v8.3 — Pré-calcula folhas + renderiza dias efetivados + atrasados
// =============================================
managerApp._renderizarFluxoDiario = function(dados) {
    var self = this;
    var container = document.getElementById('fluxoDiarioContainer');
    if (!container) {
        console.warn('⚠️ #fluxoDiarioContainer não encontrado');
        return;
    }

    var saldoInicial = dados.saldoInicial;
    if (saldoInicial === undefined || saldoInicial === null || isNaN(saldoInicial)) {
        saldoInicial = (this.dadosFluxoCaixa && this.dadosFluxoCaixa.saldoInicial) || 0;
    }

    var hoje = new Date();
    var dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + 90);

    var mesesNecessarios = [];
    var cursor = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    var cursorFim = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);

    while (cursor <= cursorFim) {
        mesesNecessarios.push({
            mes: cursor.getMonth() + 1,
            ano: cursor.getFullYear()
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    console.log('🔄 Pré-calculando folhas para', mesesNecessarios.length, 'meses:', mesesNecessarios.map(function(m) { return m.mes + '/' + m.ano; }).join(', '));

    var promises = mesesNecessarios.map(function(m) {
        return self._calcularFolhaDoMes(dados, m.mes, m.ano)
            .then(function(resultado) {
                return { chave: m.ano + '-' + String(m.mes).padStart(2, '0'), total: resultado.total };
            })
            .catch(function() {
                return { chave: m.ano + '-' + String(m.mes).padStart(2, '0'), total: 0 };
            });
    });

    Promise.all(promises).then(function(resultados) {
        var mapaFolhas = {};
        for (var i = 0; i < resultados.length; i++) {
            mapaFolhas[resultados[i].chave] = resultados[i].total;
        }

        console.log('✅ Mapa de folhas pré-calculadas:', mapaFolhas);

        self._projecaoDiariaCache = self._projetarFluxoDiario({
            saldoInicial: saldoInicial,
            receitas: dados.receitas || [],
            despesas: dados.despesas || [],
            assistidos: dados.assistidos || [],
            mediaAvulsos: dados.mediaAvulsos || 0,
            mediaDespesasExtras: dados.mediaDespesasExtras || 0,
            _mapaFolhas: mapaFolhas
        });

        self._renderizarHtmlFluxoDiario(self._projecaoDiariaCache, container);
    }).catch(function(error) {
        console.error('❌ Erro ao pré-calcular folhas:', error);
        self._projecaoDiariaCache = self._projetarFluxoDiario({
            saldoInicial: saldoInicial,
            receitas: dados.receitas || [],
            despesas: dados.despesas || [],
            assistidos: dados.assistidos || [],
            mediaAvulsos: dados.mediaAvulsos || 0,
            mediaDespesasExtras: dados.mediaDespesasExtras || 0,
            _mapaFolhas: {}
        });
        self._renderizarHtmlFluxoDiario(self._projecaoDiariaCache, container);
    });
};

// =============================================
// RENDERIZAR HTML DO FLUXO DIÁRIO
// v8.3 — Inclui linhas diárias de efetivados antes do Atrasados
// =============================================
managerApp._renderizarHtmlFluxoDiario = function(projecaoDiaria, container) {
    var resumo = projecaoDiaria.resumo;
    var dias = projecaoDiaria.dias;
    var diasAntesDeHoje = projecaoDiaria.diasAntesDeHoje || [];

    console.log('📊 Projeção diária: saldo inicial usado =', Utils.formatCurrency(resumo.saldoInicial));
    console.log('📊 Efetivados antes de hoje:', diasAntesDeHoje.length, 'dia(s) — Σ', Utils.formatCurrency(resumo.resultadoEfetivadoAntesDeHoje));
    console.log('📊 Atrasados: receitas =', Utils.formatCurrency(projecaoDiaria.receitasAtrasadas.total), '| despesas =', Utils.formatCurrency(projecaoDiaria.despesasAtrasadas.total));
    console.log('📊 Saldo após atrasados =', Utils.formatCurrency(projecaoDiaria.saldoAposAtrasados));

    var html = '';

    // Cards de resumo
    html += '<div class="stats-row" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">';

    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px;">';
    html += '  <div class="stat-icon blue" style="width: 36px; height: 36px; font-size: 16px;">📅</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value" style="font-size: 14px; font-weight: 700; color: #2563eb;">' + resumo.diasComMovimento + ' dias</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">DIAS COM MOVIMENTO</div>';
    html += '    <div style="font-size: 9px; color: var(--gray-400);">' + resumo.periodoInicio + ' → ' + resumo.periodoFim + '</div>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px;">';
    html += '  <div class="stat-icon green" style="width: 36px; height: 36px; font-size: 16px;">📥</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 14px; font-weight: 700; color: #10b981;">' + Utils.formatCurrency(resumo.totalEntradas) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">ENTRADAS PREVISTAS</div>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px;">';
    html += '  <div class="stat-icon red" style="width: 36px; height: 36px; font-size: 16px;">📤</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 14px; font-weight: 700; color: #dc2626;">' + Utils.formatCurrency(resumo.totalSaidas) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">SAÍDAS PREVISTAS</div>';
    html += '  </div>';
    html += '</div>';

    var corSaldoFinal = resumo.saldoFinal >= 0 ? '#10b981' : '#dc2626';
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px; border-left: 3px solid ' + corSaldoFinal + ';">';
    html += '  <div class="stat-icon teal" style="width: 36px; height: 36px; font-size: 16px;">💧</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 14px; font-weight: 700; color: ' + corSaldoFinal + ';">' + Utils.formatCurrency(resumo.saldoFinal) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">SALDO PROJETADO 90D</div>';
    html += '  </div>';
    html += '</div>';

    var corMenor = resumo.menorSaldo >= 0 ? '#10b981' : '#dc2626';
    html += '<div class="stat-card" style="flex: 1; min-width: 140px; padding: 12px 10px; border-left: 3px solid ' + corMenor + ';">';
    html += '  <div class="stat-icon ' + (resumo.menorSaldo < 0 ? 'red' : 'green') + '" style="width: 36px; height: 36px; font-size: 16px;">' + (resumo.menorSaldo < 0 ? '🚨' : '🛡️') + '</div>';
    html += '  <div class="stat-info">';
    html += '    <div class="stat-value currency" style="font-size: 14px; font-weight: 700; color: ' + corMenor + ';">' + Utils.formatCurrency(resumo.menorSaldo) + '</div>';
    html += '    <div class="stat-label" style="font-size: 9px;">MENOR SALDO</div>';
    html += '    <div style="font-size: 9px; color: var(--gray-400);">' + (resumo.dataMenorSaldo || '—') + '</div>';
    html += '  </div>';
    html += '</div>';

    html += '</div>';

    if (resumo.diasComFuro > 0) {
        html += '<div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: #991b1b;">';
        html += '  🚨 <strong>' + resumo.diasComFuro + ' dia(s) com saldo negativo</strong> no período. ';
        html += '  Pior saldo: <strong>' + Utils.formatCurrency(resumo.menorSaldo) + '</strong> em ' + resumo.dataMenorSaldo + '.';
        html += '</div>';
    }

    html += '<div class="card" style="margin-bottom: 0;">';
    html += '  <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">';
    html += '    <span class="card-title">📋 Fluxo Diário — Próximos 90 Dias</span>';
    html += '    <span style="font-size: 11px; color: var(--gray-500);">' + (dias.length + diasAntesDeHoje.length) + ' dia(s) com movimentação</span>';
    html += '  </div>';
    html += '  <div class="card-body" style="padding: 12px 16px;">';
    html += '    <div class="data-table-wrapper" style="max-height: 500px; overflow-y: auto;">';
    html += '    <table class="data-table" style="font-size: 12px;">';
    html += '    <thead style="position: sticky; top: 0; background: white; z-index: 1;">';
    html += '      <tr>';
    html += '        <th>Data</th>';
    html += '        <th>Dia</th>';
    html += '        <th class="text-right">Entradas</th>';
    html += '        <th class="text-right">Saídas</th>';
    html += '        <th class="text-right">Resultado</th>';
    html += '        <th class="text-right">Saldo</th>';
    html += '        <th>Detalhes</th>';
    html += '      </tr>';
    html += '    </thead><tbody>';

    // Linha de Saldo Inicial
    var saldoInicialCor = resumo.saldoInicial >= 0 ? '#0ea5e9' : '#dc2626';
    html += '<tr style="background: #f0f9ff; border-bottom: 2px solid #0ea5e9;">';
    html += '  <td style="font-weight: 700; color: #0c4a6e;">Saldo Inicial</td>';
    html += '  <td>—</td>';
    html += '  <td class="text-right" style="color: var(--gray-400);">—</td>';
    html += '  <td class="text-right" style="color: var(--gray-400);">—</td>';
    html += '  <td class="text-right" style="color: var(--gray-400);">—</td>';
    html += '  <td class="text-right" style="color: ' + saldoInicialCor + '; font-weight: 800; font-size: 13px;">' + Utils.formatCurrency(resumo.saldoInicial) + '</td>';
    html += '  <td style="font-size: 10px; color: var(--gray-500); font-style: italic;">Ponto de partida do período</td>';
    html += '</tr>';

    // 🆕 v8.3 — Linhas diárias de efetivados ANTES de hoje (Recebido/Pago)
    for (var da = 0; da < diasAntesDeHoje.length; da++) {
        var dAntes = diasAntesDeHoje[da];
        var corResultAntes = dAntes.resultado >= 0 ? '#10b981' : '#dc2626';

        var detalhesAntes = [];
        for (var ra = 0; ra < dAntes.receitas.detalhes.length; ra++) {
            var detR = dAntes.receitas.detalhes[ra];
            detalhesAntes.push('📥 ' + (detR.assistido || detR.descricao) + ' (' + Utils.formatCurrency(detR.valor) + ')');
        }
        for (var da2 = 0; da2 < dAntes.despesas.detalhes.length; da2++) {
            var detD = dAntes.despesas.detalhes[da2];
            detalhesAntes.push('📤 ' + detD.descricao + ' (' + Utils.formatCurrency(detD.valor) + ')');
        }

        html += '<tr style="background: #f0fdf4;">';
        html += '  <td><strong>' + dAntes.dataFormatada + '</strong></td>';
        html += '  <td>' + dAntes.diaSemana + '</td>';
        html += '  <td class="text-right" style="color: #10b981; font-weight: 600;">' + (dAntes.totalReceitas > 0 ? '+' + Utils.formatCurrency(dAntes.totalReceitas) : '—') + '</td>';
        html += '  <td class="text-right" style="color: #dc2626; font-weight: 600;">' + (dAntes.totalDespesas > 0 ? '-' + Utils.formatCurrency(dAntes.totalDespesas) : '—') + '</td>';
        html += '  <td class="text-right" style="color: ' + corResultAntes + '; font-weight: 700;">' + Utils.formatCurrency(dAntes.resultado) + '</td>';
        html += '  <td class="text-right" style="color: var(--gray-400);">—</td>';
        html += '  <td style="font-size: 10px; color: var(--gray-500); max-width: 300px;">' + detalhesAntes.join(' · ') + '</td>';
        html += '</tr>';
    }

    // Linha de Atrasados (só Pendentes vencidos)
    var temAtrasados = (projecaoDiaria.receitasAtrasadas.total > 0 || projecaoDiaria.despesasAtrasadas.total > 0);
    if (temAtrasados) {
        var corAtrasado = projecaoDiaria.saldoAposAtrasados >= 0 ? '#10b981' : '#dc2626';
        var detalhesAtrasados = [];
        for (var ra2 = 0; ra2 < projecaoDiaria.receitasAtrasadas.detalhes.length; ra2++) {
            var rd = projecaoDiaria.receitasAtrasadas.detalhes[ra2];
            detalhesAtrasados.push('📥 ' + (rd.assistido || rd.descricao) + ' (' + Utils.formatCurrency(rd.valor) + ')');
        }
        for (var da3 = 0; da3 < projecaoDiaria.despesasAtrasadas.detalhes.length; da3++) {
            var dd = projecaoDiaria.despesasAtrasadas.detalhes[da3];
            detalhesAtrasados.push('📤 ' + dd.descricao + ' (' + Utils.formatCurrency(dd.valor) + ')');
        }

        html += '<tr style="background: #fef3c7; border-bottom: 2px solid #f59e0b;">';
        html += '  <td style="font-weight: 700; color: #92400e;">⚠️ Atrasados</td>';
        html += '  <td>—</td>';
        html += '  <td class="text-right" style="color: #10b981; font-weight: 600;">' + (projecaoDiaria.receitasAtrasadas.total > 0 ? '+' + Utils.formatCurrency(projecaoDiaria.receitasAtrasadas.total) : '—') + '</td>';
        html += '  <td class="text-right" style="color: #dc2626; font-weight: 600;">' + (projecaoDiaria.despesasAtrasadas.total > 0 ? '-' + Utils.formatCurrency(projecaoDiaria.despesasAtrasadas.total) : '—') + '</td>';
        html += '  <td class="text-right" style="font-weight: 700;">' + Utils.formatCurrency(projecaoDiaria.receitasAtrasadas.total - projecaoDiaria.despesasAtrasadas.total) + '</td>';
        html += '  <td class="text-right" style="color: ' + corAtrasado + '; font-weight: 800;">' + Utils.formatCurrency(projecaoDiaria.saldoAposAtrasados) + '</td>';
        html += '  <td style="font-size: 10px; color: var(--gray-500); max-width: 400px;">' + detalhesAtrasados.join(' · ') + '</td>';
        html += '</tr>';
    }

    // Loop dos dias futuros
    if (dias.length === 0) {
        html += '<tr><td colspan="7" class="empty-state" style="text-align:center;">Nenhuma movimentação prevista nos próximos 90 dias</td></tr>';
    } else {
        for (var i = 0; i < dias.length; i++) {
            var d = dias[i];
            var corResult = d.resultado >= 0 ? '#10b981' : '#dc2626';
            var corSaldo = d.saldoAcumulado >= 0 ? '#10b981' : '#dc2626';
            var rowStyle = d.saldoAcumulado < 0 ? 'background: #fef2f2;' : '';
            var ehFolha = d.despesas.detalhes.some(function(x) { return x.tipo === 'despesa_folha'; });
            var rowStyleFinal = rowStyle + (ehFolha ? 'border-left: 3px solid #dc2626;' : '');

            var detalhesTxt = [];
            for (var a = 0; a < d.receitas.detalhes.length; a++) {
                var det = d.receitas.detalhes[a];
                var icone = det.tipo === 'receita_estimada' ? '📊' : '📥';
                detalhesTxt.push(icone + ' ' + (det.assistido || det.descricao) + ' (' + Utils.formatCurrency(det.valor) + ')');
            }
            for (var b = 0; b < d.despesas.detalhes.length; b++) {
                var det2 = d.despesas.detalhes[b];
                var icone2 = det2.tipo === 'despesa_estimada' ? '📊' : (det2.tipo === 'despesa_folha' ? '💰' : '📤');
                detalhesTxt.push(icone2 + ' ' + det2.descricao + ' (' + Utils.formatCurrency(det2.valor) + ')');
            }

            html += '<tr style="' + rowStyleFinal + '">';
            html += '  <td><strong>' + d.dataFormatada + '</strong></td>';
            html += '  <td>' + d.diaSemana + '</td>';
            html += '  <td class="text-right" style="color: #10b981; font-weight: 600;">' + (d.totalReceitas > 0 ? '+' + Utils.formatCurrency(d.totalReceitas) : '—') + '</td>';
            html += '  <td class="text-right" style="color: #dc2626; font-weight: 600;">' + (d.totalDespesas > 0 ? '-' + Utils.formatCurrency(d.totalDespesas) : '—') + '</td>';
            html += '  <td class="text-right" style="color: ' + corResult + '; font-weight: 700;">' + Utils.formatCurrency(d.resultado) + '</td>';
            html += '  <td class="text-right" style="color: ' + corSaldo + '; font-weight: 700;">' + Utils.formatCurrency(d.saldoAcumulado) + '</td>';
            html += '  <td style="font-size: 10px; color: var(--gray-500); max-width: 300px;">' + detalhesTxt.join(' · ') + '</td>';
            html += '</tr>';
        }
    }

    html += '</tbody></table></div></div></div>';

    container.innerHTML = html;

    this._renderizarGraficoDiario(projecaoDiaria);

    console.log('✅ Visão diária renderizada:', (dias.length + diasAntesDeHoje.length), 'dias +', projecaoDiaria.diasAtrasados, 'atrasados');
};

managerApp._renderizarGraficoDiario = function(projecaoDiaria) {
    var ctx = document.getElementById('chartFluxoDiario');
    if (!ctx) {
        var container = document.getElementById('fluxoDiarioContainer');
        if (!container) return;
        var chartDiv = document.createElement('div');
        chartDiv.className = 'chart-card';
        chartDiv.style.marginTop = '16px';
        chartDiv.innerHTML =
            '<div class="chart-header"><h3>📈 Evolução Diária do Saldo</h3></div>' +
            '<div class="chart-body">' +
            '  <div class="chart-canvas-wrapper" style="height: 300px;">' +
            '    <canvas id="chartFluxoDiario"></canvas>' +
            '  </div>' +
            '</div>';
        container.appendChild(chartDiv);
        ctx = document.getElementById('chartFluxoDiario');
    }

    if (!ctx) return;

    if (this.chartFluxoDiario) {
        this.chartFluxoDiario.destroy();
        this.chartFluxoDiario = null;
    }

    var dias = projecaoDiaria.dias;
    var labels = [];
    var saldos = [];
    var entradas = [];
    var saidas = [];

    for (var i = 0; i < dias.length; i++) {
        labels.push(dias[i].dataFormatada.slice(0, 5));
        saldos.push(dias[i].saldoAcumulado);
        entradas.push(dias[i].totalReceitas);
        saidas.push(-dias[i].totalDespesas);
    }

    var ctx2d = ctx.getContext('2d');

    try {
        this.chartFluxoDiario = new Chart(ctx2d, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Saldo Acumulado',
                        data: saldos,
                        type: 'line',
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#0ea5e9',
                        order: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Entradas',
                        data: entradas,
                        backgroundColor: 'rgba(16, 185, 129, 0.6)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderRadius: 3,
                        order: 2,
                        yAxisID: 'y2'
                    },
                    {
                        label: 'Saídas',
                        data: saidas,
                        backgroundColor: 'rgba(220, 38, 38, 0.6)',
                        borderColor: '#dc2626',
                        borderWidth: 1,
                        borderRadius: 3,
                        order: 2,
                        yAxisID: 'y2'
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
                                return context.dataset.label + ': ' + Utils.formatCurrency(context.raw);
                            }
                        }
                    },
                    legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            callback: function(value) { return Utils.formatCurrency(value); },
                            font: { size: 9 }
                        },
                        title: { display: true, text: 'Saldo Acumulado', font: { size: 10 } }
                    },
                    y2: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            callback: function(value) { return Utils.formatCurrency(value); },
                            font: { size: 9 }
                        },
                        title: { display: true, text: 'Entradas / Saídas', font: { size: 10 } }
                    },
                    x: { ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 } }
                }
            }
        });
        console.log('✅ Gráfico diário renderizado');
    } catch (error) {
        console.error('❌ Erro ao criar gráfico diário:', error);
    }
};

// =============================================
// CONFIGURAR ABA DIÁRIA (TOGGLE)
// =============================================
managerApp._configurarAbaDiaria = function() {
    var self = this;
    var btnMensal = document.getElementById('btnVisaoMensal');
    var btnSemanal = document.getElementById('btnVisaoSemanal');
    var btnDiaria = document.getElementById('btnVisaoDiaria');

    if (!btnDiaria) {
        console.warn('⚠️ #btnVisaoDiaria não encontrado no HTML');
        return;
    }

    function ativarVisao(visao) {
        [btnMensal, btnSemanal, btnDiaria].forEach(function(b) {
            if (!b) return;
            b.classList.remove('ativo', 'inativo');
            b.classList.add('inativo');
        });
        var alvo = visao === 'mensal' ? btnMensal : (visao === 'semanal' ? btnSemanal : btnDiaria);
        if (alvo) {
            alvo.classList.remove('inativo');
            alvo.classList.add('ativo');
        }

        var divMensal = document.getElementById('fluxoVisaoMensal');
        var divSemanal = document.getElementById('fluxoVisaoSemanal');
        var divDiaria = document.getElementById('fluxoVisaoDiaria');
        if (divMensal) divMensal.style.display = visao === 'mensal' ? 'block' : 'none';
        if (divSemanal) divSemanal.style.display = visao === 'semanal' ? 'block' : 'none';
        if (divDiaria) divDiaria.style.display = visao === 'diaria' ? 'block' : 'none';

        if (visao === 'diaria' && self.dadosFluxoCaixa) {
            self._renderizarFluxoDiario(self.dadosFluxoCaixa);
        } else if (visao === 'semanal' && self.dadosFluxoCaixa) {
            // 🆕 v9.9 — Renderizar visão semanal
            if (self._projecaoDiariaCache) {
                self._renderizarFluxoSemanal(self.dadosFluxoCaixa);
            } else {
                // Se o diário ainda não foi calculado, calcular primeiro
                self._renderizarFluxoDiario(self.dadosFluxoCaixa);
                setTimeout(function() {
                    if (self._projecaoDiariaCache) {
                        self._renderizarFluxoSemanal(self.dadosFluxoCaixa);
                    }
                }, 500);
            }
        }
    }

    btnMensal.addEventListener('click', function() { ativarVisao('mensal'); });
    btnSemanal.addEventListener('click', function() { ativarVisao('semanal'); });
    btnDiaria.addEventListener('click', function() { ativarVisao('diaria'); });

    console.log('✅ Aba "Diário (90 dias)" configurada');
};
// =============================================
// 🆕 Ciclo 5 / Entrega C: Priorização P1/P2/P3
// =============================================

managerApp._PRIORIDADES_DESPESAS = {
    'Custo Personal Care': { nivel: 'P1', label: 'Inadiável', cor: '#dc2626', bg: '#fef2f2', icone: '🔴' },
    'Impostos':            { nivel: 'P1', label: 'Inadiável', cor: '#dc2626', bg: '#fef2f2', icone: '🔴' },
    'Pró Labore':          { nivel: 'P1', label: 'Inadiável', cor: '#dc2626', bg: '#fef2f2', icone: '🔴' },
    'Custo Enfermagem':    { nivel: 'P2', label: 'Importante', cor: '#f59e0b', bg: '#fffbeb', icone: '🟡' },
    'Plantões Extras':     { nivel: 'P2', label: 'Importante', cor: '#f59e0b', bg: '#fffbeb', icone: '🟡' },
    'Cartão Crédito':      { nivel: 'P2', label: 'Importante', cor: '#f59e0b', bg: '#fffbeb', icone: '🟡' },
    'Aluguel':             { nivel: 'P2', label: 'Importante', cor: '#f59e0b', bg: '#fffbeb', icone: '🟡' },
    'Administrativo':      { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' },
    'Marketing':           { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' },
    'Telefone/Internet':   { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' },
    'Equipamentos':        { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' },
    'Transporte':          { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' },
    'Treinamentos':        { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' },
    'Contador':            { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' },
    'Outros':              { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' },
    'Plantões N/Realizados': { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' }
};

managerApp._classificarPrioridade = function(despesa) {
    if (!despesa) {
        return { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢', isEncontroContas: false };
    }
    var categoria = despesa.categoria || 'Outros';
    var prio = this._PRIORIDADES_DESPESAS[categoria];
    if (!prio) {
        prio = { nivel: 'P3', label: 'Flexível', cor: '#10b981', bg: '#f0fdf4', icone: '🟢' };
    }
    var isEncontroContas = (categoria === 'Aluguel' || categoria === 'Telefone/Internet');
    return {
        nivel: prio.nivel, label: prio.label, cor: prio.cor, bg: prio.bg,
        icone: prio.icone, isEncontroContas: isEncontroContas
    };
};

managerApp._renderizarBadgePrioridade = function(despesa, compacto) {
    var prio = this._classificarPrioridade(despesa);
    var fontSize = compacto ? '9px' : '10px';
    var padding = compacto ? '1px 5px' : '2px 8px';
    var html = '<span style="display: inline-block; font-size: ' + fontSize + '; ' +
               'padding: ' + padding + '; border-radius: 4px; ' +
               'background: ' + prio.bg + '; color: ' + prio.cor + '; ' +
               'font-weight: 700; white-space: nowrap;" ' +
               'title="' + prio.label + '">' + prio.icone + ' ' + prio.nivel + '</span>';
    if (prio.isEncontroContas) {
        html += ' <span style="display: inline-block; font-size: 8px; ' +
                'padding: 1px 4px; border-radius: 3px; background: #ede9fe; ' +
                'color: #6d28d9; font-weight: 600;" ' +
                'title="Encontro de contas com PIÙ VITA">PIÙ VITA</span>';
    }
    return html;
};

managerApp._agruparPorPrioridade = function(despesas) {
    var resultado = {
        P1: { total: 0, items: [] },
        P2: { total: 0, items: [] },
        P3: { total: 0, items: [] },
        encontroContas: { total: 0, items: [] }
    };
    if (!despesas || despesas.length === 0) return resultado;
    for (var i = 0; i < despesas.length; i++) {
        var d = despesas[i];
        var prio = this._classificarPrioridade(d);
        var valor = parseFloat(d.valor) || 0;
        if (prio.isEncontroContas) {
            resultado.encontroContas.total += valor;
            resultado.encontroContas.items.push(d);
        } else {
            resultado[prio.nivel].total += valor;
            resultado[prio.nivel].items.push(d);
        }
    }
    return resultado;
};

// =============================================
// SIMULADOR DE ADIAMENTO (estado)
// =============================================
managerApp._simuladorAdiamento = {
    despesasSelecionadas: [],
    diasAdiamento: 30,
    resultado: null
};

managerApp._coletarDespesasAdiaveis = function(dados) {
    var despesasAdiaveis = [];
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    var dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + 90);

    var despesasReais = dados.despesas || [];
    for (var i = 0; i < despesasReais.length; i++) {
        var d = despesasReais[i];
        if (d.status !== 'Pendente') continue;
        var dataStr = d.data;
        if (!dataStr) continue;
        if (dataStr.includes('T')) dataStr = dataStr.split('T')[0];
        var dataD = new Date(dataStr + 'T00:00:00');
        if (isNaN(dataD.getTime())) continue;
        if (dataD < hoje || dataD > dataFim) continue;
        var prio = this._classificarPrioridade(d);
        if (prio.nivel === 'P1') continue;
        if (prio.isEncontroContas) continue;
        despesasAdiaveis.push({
            id: 'real_' + (d.id || i),
            origem: 'real',
            despesaId: d.id,
            data: dataStr,
            dataObj: dataD,
            descricao: d.descricao || '(sem descrição)',
            categoria: d.categoria || 'Outros',
            fornecedor: d.fornecedor || '',
            valor: parseFloat(d.valor) || 0,
            prioridade: prio
        });
    }

    for (var j = 0; j < (dados.projecao || []).length; j++) {
        var p = dados.projecao[j];
        if (p.isMesAtual) continue;
        if (p.despesaExtrasEstimadas > 0) {
            despesasAdiaveis.push({
                id: 'est_extras_' + j,
                origem: 'estimada',
                data: p.mesRef + '-15',
                dataObj: new Date(p.ano, p.mes - 1, 15),
                descricao: '📊 Estimativa de Plantões Extras (' + p.mes + '/' + p.ano + ')',
                categoria: 'Plantões Extras',
                fornecedor: '',
                valor: p.despesaExtrasEstimadas,
                prioridade: {
                    nivel: 'P2', label: 'Importante', cor: '#f59e0b',
                    bg: '#fffbeb', icone: '🟡', isEncontroContas: false
                }
            });
        }
    }

    despesasAdiaveis.sort(function(a, b) { return a.dataObj - b.dataObj; });
    return despesasAdiaveis;
};

managerApp._abrirModalSimuladorAdiamento = function(dados) {
    if (!dados || !dados.projecao || dados.projecao.length === 0) {
        Utils.showToast('⚠️ Carregue o fluxo de caixa primeiro', 'warning');
        return;
    }
    var despesasAdiaveis = this._coletarDespesasAdiaveis(dados);
    if (despesasAdiaveis.length === 0) {
        Utils.showToast('ℹ️ Nenhuma despesa P2 ou P3 encontrada para adiar', 'info');
        return;
    }
    this._simuladorAdiamento.despesasSelecionadas = [];
    this._simuladorAdiamento.diasAdiamento = 30;
    this._simuladorAdiamento.resultado = null;
    this._renderizarModalSimulador(dados, despesasAdiaveis);
};

managerApp._renderizarModalSimulador = function(dados, despesasAdiaveis) {
    var self = this;
    var modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').innerHTML = '🔮 Simulador de Adiamento';

    var p2 = despesasAdiaveis.filter(function(d) { return d.prioridade.nivel === 'P2'; });
    var p3 = despesasAdiaveis.filter(function(d) { return d.prioridade.nivel === 'P3'; });

    var html = '';
    html += '<div style="margin-bottom: 12px; font-size: 12px; color: var(--gray-600);">';
    html += 'Selecione as despesas <strong>P2 (importantes)</strong> ou <strong>P3 (flexíveis)</strong> que quer adiar.';
    html += '</div>';

    html += '<div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">';
    html += '  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">';
    html += '    <label style="font-size: 12px; font-weight: 600; color: #065f46;">⏱️ Adiar por quantos dias?</label>';
    html += '    <span id="simAdiamentoDiasLabel" style="font-size: 16px; font-weight: 800; color: #10b981;">30 dias</span>';
    html += '  </div>';
    html += '  <input type="range" id="simAdiamentoDias" min="1" max="90" value="30" style="width: 100%; accent-color: #10b981;">';
    html += '</div>';

    html += '<div id="simAdiamentoContador" style="background: var(--gray-50); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 12px; color: var(--gray-600);">';
    html += '  <strong>0</strong> despesa(s) selecionada(s) — Total: <strong>' + Utils.formatCurrency(0) + '</strong>';
    html += '</div>';

    html += '<div style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">';
    html += '  <button type="button" class="btn btn-sm btn-secondary" id="simSelP3" style="font-size: 11px;">🟢 Selecionar todos P3</button>';
    html += '  <button type="button" class="btn btn-sm btn-secondary" id="simSelP2P3" style="font-size: 11px;">🟡🟢 Selecionar P2 + P3</button>';
    html += '  <button type="button" class="btn btn-sm btn-secondary" id="simSelLimpar" style="font-size: 11px;">✖️ Limpar</button>';
    html += '</div>';

    html += '<div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: 8px; padding: 8px; background: var(--white);">';
    if (p2.length > 0) {
        html += '<div style="font-size: 11px; font-weight: 700; color: #f59e0b; margin: 6px 4px 4px 4px; text-transform: uppercase;">🟡 P2 — Importantes</div>';
        for (var i = 0; i < p2.length; i++) html += self._renderizarItemDespesaAdiavel(p2[i]);
    }
    if (p3.length > 0) {
        html += '<div style="font-size: 11px; font-weight: 700; color: #10b981; margin: 10px 4px 4px 4px; text-transform: uppercase;">🟢 P3 — Flexíveis</div>';
        for (var k = 0; k < p3.length; k++) html += self._renderizarItemDespesaAdiavel(p3[k]);
    }
    html += '</div>';
    html += '<div id="simAdiamentoResultadoContainer" style="display: none; margin-top: 16px;"></div>';

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML =
        '<div style="display: flex; gap: 12px; width: 100%;">' +
        '  <button class="btn btn-secondary" id="simAdiamentoCancelar" style="flex: 1;">Fechar</button>' +
        '  <button class="btn btn-primary" id="simAdiamentoExecutar" style="flex: 1;">🔮 Simular Adiamento</button>' +
        '</div>';

    modal.style.display = 'flex';
    self._configurarEventosSimulador(dados, despesasAdiaveis);
};

managerApp._renderizarItemDespesaAdiavel = function(d) {
    var prio = d.prioridade;
    var dataFormatada = d.dataObj.getDate().toString().padStart(2, '0') + '/' +
                        (d.dataObj.getMonth() + 1).toString().padStart(2, '0');
    return '<label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; cursor: pointer;">' +
           '  <input type="checkbox" class="simAdiamentoCheck" data-id="' + d.id + '" data-valor="' + d.valor + '" style="width: 16px; height: 16px; accent-color: ' + prio.cor + '; cursor: pointer;">' +
           '  <span style="font-size: 11px; padding: 1px 5px; border-radius: 3px; background: ' + prio.bg + '; color: ' + prio.cor + '; font-weight: 700;">' + prio.icone + ' ' + prio.nivel + '</span>' +
           '  <span style="flex: 1; font-size: 12px; color: var(--gray-700); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + d.descricao + '</span>' +
           '  <span style="font-size: 11px; color: var(--gray-400);">' + dataFormatada + '</span>' +
           '  <span style="font-size: 12px; font-weight: 700; color: #dc2626; min-width: 80px; text-align: right;">' + Utils.formatCurrency(d.valor) + '</span>' +
           '</label>';
};

// =============================================
// SIMULADOR DE ADIAMENTO (eventos e cálculo)
// =============================================
managerApp._configurarEventosSimulador = function(dados, despesasAdiaveis) {
    var self = this;
    var slider = document.getElementById('simAdiamentoDias');
    var sliderLabel = document.getElementById('simAdiamentoDiasLabel');

    if (slider) {
        slider.addEventListener('input', function() {
            var valor = parseInt(this.value);
            self._simuladorAdiamento.diasAdiamento = valor;
            sliderLabel.textContent = valor + ' dia' + (valor !== 1 ? 's' : '');
        });
    }

    function atualizarContador() {
        var checkboxes = document.querySelectorAll('.simAdiamentoCheck:checked');
        var total = 0;
        var ids = [];
        for (var i = 0; i < checkboxes.length; i++) {
            total += parseFloat(checkboxes[i].getAttribute('data-valor')) || 0;
            ids.push(checkboxes[i].getAttribute('data-id'));
        }
        self._simuladorAdiamento.despesasSelecionadas = ids;
        var contador = document.getElementById('simAdiamentoContador');
        if (contador) {
            contador.innerHTML = '<strong>' + checkboxes.length + '</strong> despesa(s) selecionada(s) — Total: <strong>' + Utils.formatCurrency(total) + '</strong>';
        }
    }

    var checks = document.querySelectorAll('.simAdiamentoCheck');
    for (var i = 0; i < checks.length; i++) {
        checks[i].addEventListener('change', atualizarContador);
    }

    document.getElementById('simSelP3').addEventListener('click', function() {
        var checks = document.querySelectorAll('.simAdiamentoCheck');
        for (var i = 0; i < checks.length; i++) {
            var id = checks[i].getAttribute('data-id');
            var desp = despesasAdiaveis.find(function(d) { return d.id === id; });
            checks[i].checked = desp && desp.prioridade.nivel === 'P3';
        }
        atualizarContador();
    });

    document.getElementById('simSelP2P3').addEventListener('click', function() {
        var checks = document.querySelectorAll('.simAdiamentoCheck');
        for (var i = 0; i < checks.length; i++) { checks[i].checked = true; }
        atualizarContador();
    });

    document.getElementById('simSelLimpar').addEventListener('click', function() {
        var checks = document.querySelectorAll('.simAdiamentoCheck');
        for (var i = 0; i < checks.length; i++) { checks[i].checked = false; }
        atualizarContador();
    });

    document.getElementById('simAdiamentoCancelar').addEventListener('click', function() {
        self.fecharModal();
    });

    document.getElementById('simAdiamentoExecutar').addEventListener('click', function() {
        if (self._simuladorAdiamento.despesasSelecionadas.length === 0) {
            Utils.showToast('⚠️ Selecione ao menos uma despesa para adiar', 'warning');
            return;
        }
        self._executarSimulacaoAdiamento(dados, despesasAdiaveis);
    });
};

managerApp._executarSimulacaoAdiamento = function(dados, despesasAdiaveis) {
    var self = this;
    var selecionadas = despesasAdiaveis.filter(function(d) {
        return self._simuladorAdiamento.despesasSelecionadas.indexOf(d.id) !== -1;
    });
    var dias = self._simuladorAdiamento.diasAdiamento;

    Utils.showLoading('Calculando simulação...');

    setTimeout(function() {
        var projOriginal = dados.projecao;
        var projAdiada = self._projetarComAdiamento(dados, selecionadas, dias);
        var comparacao = self._compararProjecoes(projOriginal, projAdiada, selecionadas, dias);

        self._simuladorAdiamento.resultado = comparacao;
        Utils.hideLoading();

        self._renderizarResultadoSimulacao(dados, comparacao, selecionadas, dias);

        var container = document.getElementById('simAdiamentoResultadoContainer');
        if (container) {
            container.style.display = 'block';
            setTimeout(function() {
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, 300);
};

managerApp._projetarComAdiamento = function(dados, despesasSelecionadas, dias) {
    var projecao = JSON.parse(JSON.stringify(dados.projecao));

    for (var i = 0; i < despesasSelecionadas.length; i++) {
        var d = despesasSelecionadas[i];
        var valor = d.valor;
        var dataOriginal = d.dataObj;
        var novaData = new Date(dataOriginal);
        novaData.setDate(novaData.getDate() + dias);

        var mesOriginalRef = dataOriginal.getFullYear() + '-' + String(dataOriginal.getMonth() + 1).padStart(2, '0');
        var mesNovoRef = novaData.getFullYear() + '-' + String(novaData.getMonth() + 1).padStart(2, '0');

        var idxOriginal = -1;
        var idxNovo = -1;
        for (var k = 0; k < projecao.length; k++) {
            if (projecao[k].mesRef === mesOriginalRef) idxOriginal = k;
            if (projecao[k].mesRef === mesNovoRef) idxNovo = k;
        }

        if (idxOriginal !== -1 && idxNovo !== -1 && idxOriginal !== idxNovo) {
            projecao[idxOriginal].despesa -= valor;
            projecao[idxNovo].despesa += valor;
        } else if (idxOriginal !== -1 && idxNovo === -1) {
            projecao[idxOriginal].despesa -= valor;
        }
    }

    var saldoAcumulado = dados.saldoInicial;
    for (var m = 0; m < projecao.length; m++) {
        projecao[m].resultado = projecao[m].receita - projecao[m].despesa - (projecao[m].perdaContratos || 0);
        saldoAcumulado += projecao[m].resultado;
        projecao[m].saldoAcumulado = saldoAcumulado;
    }

    return projecao;
};

managerApp._compararProjecoes = function(original, adiada, despesasSelecionadas, dias) {
    var totalAdiado = despesasSelecionadas.reduce(function(s, d) { return s + d.valor; }, 0);
    var menorOriginal = Infinity;
    var dataMenorOriginal = '';
    var menorAdiado = Infinity;
    var dataMenorAdiado = '';
    var mesesComFuroOriginal = 0;
    var mesesComFuroAdiado = 0;

    for (var i = 0; i < original.length; i++) {
        if (original[i].saldoAcumulado < menorOriginal) {
            menorOriginal = original[i].saldoAcumulado;
            dataMenorOriginal = original[i].mes + '/' + original[i].ano;
        }
        if (original[i].saldoAcumulado < 0) mesesComFuroOriginal++;

        if (adiada[i].saldoAcumulado < menorAdiado) {
            menorAdiado = adiada[i].saldoAcumulado;
            dataMenorAdiado = adiada[i].mes + '/' + adiada[i].ano;
        }
        if (adiada[i].saldoAcumulado < 0) mesesComFuroAdiado++;
    }

    var saldoFinalOriginal = original[original.length - 1].saldoAcumulado;
    var saldoFinalAdiado = adiada[adiada.length - 1].saldoAcumulado;

    return {
        projecaoAdiada: adiada,
        totalAdiado: totalAdiado,
        diasAdiamento: dias,
        qtdDespesas: despesasSelecionadas.length,
        menorOriginal: menorOriginal,
        dataMenorOriginal: dataMenorOriginal,
        menorAdiado: menorAdiado,
        dataMenorAdiado: dataMenorAdiado,
        melhoraMenorSaldo: menorAdiado - menorOriginal,
        mesesComFuroOriginal: mesesComFuroOriginal,
        mesesComFuroAdiado: mesesComFuroAdiado,
        saldoFinalOriginal: saldoFinalOriginal,
        saldoFinalAdiado: saldoFinalAdiado,
        diferencaFinal: saldoFinalAdiado - saldoFinalOriginal
    };
};

managerApp._renderizarResultadoSimulacao = function(dados, comparacao, despesasSelecionadas, dias) {
    var container = document.getElementById('simAdiamentoResultadoContainer');
    if (!container) return;

    var corDiferenca = comparacao.diferencaFinal >= 0 ? '#10b981' : '#dc2626';
    var corMenorSaldo = comparacao.melhoraMenorSaldo >= 0 ? '#10b981' : '#dc2626';
    var sinalDiferenca = comparacao.diferencaFinal >= 0 ? '+' : '';

    var vereditoCor = comparacao.melhoraMenorSaldo > 0 ? '#10b981' : (comparacao.melhoraMenorSaldo === 0 ? '#6b7280' : '#dc2626');
    var vereditoIcone = comparacao.melhoraMenorSaldo > 0 ? '✅' : (comparacao.melhoraMenorSaldo === 0 ? '➖' : '⚠️');
    var vereditoTexto = comparacao.melhoraMenorSaldo > 0 ? 'ADIAMENTO FAVORÁVEL' :
                        (comparacao.melhoraMenorSaldo === 0 ? 'SEM IMPACTO NO MENOR SALDO' : 'ADIAMENTO DESFAVORÁVEL');

    var html = '';
    html += '<div style="background: ' + vereditoCor + '15; border: 2px solid ' + vereditoCor + '; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;">';
    html += '  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">';
    html += '    <div style="font-size: 36px;">' + vereditoIcone + '</div>';
    html += '    <div style="flex: 1; min-width: 200px;">';
    html += '      <div style="font-size: 11px; font-weight: 700; color: ' + vereditoCor + '; text-transform: uppercase;">Veredito</div>';
    html += '      <div style="font-size: 18px; font-weight: 800; color: ' + vereditoCor + '; margin: 2px 0;">' + vereditoTexto + '</div>';
    html += '      <div style="font-size: 12px; color: var(--gray-600);">';
    html += '        ' + comparacao.qtdDespesas + ' despesa(s) adiada(s) em ' + dias + ' dias — Total: <strong>' + Utils.formatCurrency(comparacao.totalAdiado) + '</strong>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">';

    html += '<div style="background: var(--gray-50); border-radius: 8px; padding: 12px 14px; border-left: 3px solid ' + vereditoCor + ';">';
    html += '  <div style="font-size: 10px; font-weight: 700; color: var(--gray-500); text-transform: uppercase;">Menor Saldo Projetado</div>';
    html += '  <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px;">';
    html += '    <div><span style="color: var(--gray-500);">Original:</span><br><strong style="color: ' + (comparacao.menorOriginal >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(comparacao.menorOriginal) + '</strong></div>';
    html += '    <div style="text-align: right;"><span style="color: var(--gray-500);">Adiado:</span><br><strong style="color: ' + (comparacao.menorAdiado >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(comparacao.menorAdiado) + '</strong></div>';
    html += '  </div>';
    html += '  <div style="margin-top: 6px; font-size: 11px; color: ' + corMenorSaldo + '; font-weight: 700;">';
    html += '    ' + (comparacao.melhoraMenorSaldo >= 0 ? '📈 Melhora de ' : '📉 Piora de ') + Utils.formatCurrency(Math.abs(comparacao.melhoraMenorSaldo));
    html += '  </div>';
    html += '</div>';

    html += '<div style="background: var(--gray-50); border-radius: 8px; padding: 12px 14px; border-left: 3px solid ' + corDiferenca + ';">';
    html += '  <div style="font-size: 10px; font-weight: 700; color: var(--gray-500); text-transform: uppercase;">Saldo Final (6 meses)</div>';
    html += '  <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px;">';
    html += '    <div><span style="color: var(--gray-500);">Original:</span><br><strong style="color: ' + (comparacao.saldoFinalOriginal >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(comparacao.saldoFinalOriginal) + '</strong></div>';
    html += '    <div style="text-align: right;"><span style="color: var(--gray-500);">Adiado:</span><br><strong style="color: ' + (comparacao.saldoFinalAdiado >= 0 ? '#10b981' : '#dc2626') + ';">' + Utils.formatCurrency(comparacao.saldoFinalAdiado) + '</strong></div>';
    html += '  </div>';
    html += '  <div style="margin-top: 6px; font-size: 11px; color: ' + corDiferenca + '; font-weight: 700;">';
    html += '    ' + sinalDiferenca + Utils.formatCurrency(comparacao.diferencaFinal);
    html += '  </div>';
    html += '</div>';
    html += '</div>';

    var corFuro = comparacao.mesesComFuroAdiado < comparacao.mesesComFuroOriginal ? '#10b981' :
                  (comparacao.mesesComFuroAdiado === comparacao.mesesComFuroOriginal ? '#6b7280' : '#dc2626');
    html += '<div style="background: ' + corFuro + '10; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; font-size: 13px;">';
    html += '  <div style="font-size: 24px;">' + (comparacao.mesesComFuroAdiado === 0 ? '🛡️' : '🚨') + '</div>';
    html += '  <div style="flex: 1;">';
    html += '    <div style="font-weight: 700; color: ' + corFuro + ';">Meses com Saldo Negativo</div>';
    html += '    <div style="color: var(--gray-600); font-size: 12px;">';
    html += '      Original: <strong>' + comparacao.mesesComFuroOriginal + '</strong> &nbsp;→&nbsp; ';
    html += '      Adiado: <strong style="color: ' + corFuro + ';">' + comparacao.mesesComFuroAdiado + '</strong>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="chart-card" style="margin-bottom: 0;">';
    html += '  <div class="chart-header">';
    html += '    <h3 style="font-size: 13px;">📊 Comparativo: Saldo Original vs. Adiado</h3>';
    html += '  </div>';
    html += '  <div class="chart-body" style="padding: 12px;">';
    html += '    <div class="chart-canvas-wrapper" style="height: 260px;">';
    html += '      <canvas id="chartComparativoAdiamento"></canvas>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    container.innerHTML = html;
    this._renderizarGraficoComparativo(dados.projecao, comparacao.projecaoAdiada);
};

managerApp._renderizarGraficoComparativo = function(projOriginal, projAdiada) {
    var ctx = document.getElementById('chartComparativoAdiamento');
    if (!ctx) return;

    if (this.chartComparativoAdiamento) {
        this.chartComparativoAdiamento.destroy();
        this.chartComparativoAdiamento = null;
    }

    var mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    var labels = [];
    var saldoOriginal = [];
    var saldoAdiado = [];

    for (var i = 0; i < projOriginal.length; i++) {
        labels.push(mesesNomes[projOriginal[i].mes - 1] + '/' + String(projOriginal[i].ano).slice(2));
        saldoOriginal.push(projOriginal[i].saldoAcumulado);
        saldoAdiado.push(projAdiada[i].saldoAcumulado);
    }

    var linhaZero = Array(labels.length).fill(0);
    var ctx2d = ctx.getContext('2d');

    try {
        this.chartComparativoAdiamento = new Chart(ctx2d, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Saldo Original',
                        data: saldoOriginal,
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.08)',
                        borderWidth: 2,
                        borderDash: [5, 3],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#0ea5e9',
                        order: 2
                    },
                    {
                        label: 'Saldo Adiado',
                        data: saldoAdiado,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 5,
                        pointBackgroundColor: '#10b981',
                        order: 1
                    },
                    {
                        label: 'Linha do Zero',
                        data: linhaZero,
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: false,
                        pointRadius: 0,
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
                                return context.dataset.label + ': ' + Utils.formatCurrency(context.raw);
                            }
                        }
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) { return Utils.formatCurrency(value); },
                            font: { size: 9 }
                        }
                    },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar gráfico comparativo:', error);
    }
};

// =============================================
// BOTÃO "SIMULAR ADIAMENTO" NO HEADER
// =============================================
managerApp._configurarBotaoSimuladorAdiamento = function() {
    var self = this;

    if (document.getElementById('btnSimularAdiamento')) return;

    var btnSimularCenario = document.getElementById('btnSimularCenario');
    if (!btnSimularCenario) {
        console.warn('⚠️ #btnSimularCenario não encontrado');
        return;
    }

    var btn = document.createElement('button');
    btn.id = 'btnSimularAdiamento';
    btn.className = 'btn btn-secondary btn-sm';
    btn.style.height = '32px';
    btn.innerHTML = '🔮 Simular Adiamento';
    btn.title = 'Simular impacto de adiar despesas P2/P3';

    btnSimularCenario.parentNode.insertBefore(btn, btnSimularCenario.nextSibling);

    btn.addEventListener('click', function() {
        if (!self.dadosFluxoCaixa) {
            Utils.showToast('⚠️ Carregue o fluxo de caixa primeiro', 'warning');
            return;
        }
        self._abrirModalSimuladorAdiamento(self.dadosFluxoCaixa);
    });

    console.log('✅ Botão "Simular Adiamento" configurado');
};

// =============================================
// PRESERVADAS — Funções legadas mantidas
// =============================================
managerApp.atualizarCardsFluxo = function() {
    if (managerApp.dadosFluxoCaixa) {
        managerApp._renderizarCardsFluxo(managerApp.dadosFluxoCaixa);
    }
};

// =============================================
// PROGRESSO DO FLUXO
// =============================================
managerApp.showProgressBarFluxo = function() {
    var el = document.getElementById('progressBarFluxo');
    if (el) el.style.display = 'block';
};

managerApp.hideProgressBarFluxo = function() {
    var el = document.getElementById('progressBarFluxo');
    if (el) el.style.display = 'none';
};

managerApp.updateProgressFluxo = function(step, percent) {
    var fill = document.getElementById('progressFillFluxo');
    var pct = document.getElementById('progressPercentFluxo');
    if (fill) fill.style.width = percent + '%';
    if (pct) pct.textContent = percent + '%';
    var steps = document.querySelectorAll('#progressInlineStepsFluxo .progress-inline-step');
    if (steps && steps.length > 0) {
        for (var i = 0; i < steps.length; i++) {
            steps[i].style.color = (i < step) ? '#10b981' : (i === step ? '#0d9488' : '#9ca3af');
        }
    }
};

// =============================================
// LISTENER DE MUDANÇA DE MÊS
// =============================================
document.addEventListener('mesChanged', function(e) {
    var fluxoPage = document.getElementById('page-fluxo-caixa');
    if (fluxoPage && fluxoPage.classList.contains('active')) {
        console.log('📅 Mês mudou — recarregando Fluxo de Caixa');
        if (typeof managerApp.carregarFluxoCaixa === 'function') {
            managerApp.dadosFluxoCaixa = null;
            managerApp._projecaoDiariaCache = null;
            managerApp._aguardandoDiarioParaCards = false;
            managerApp.showProgressBarFluxo();
            managerApp.updateProgressFluxo(0, 10);
            managerApp.carregarFluxoCaixa();
        }
    }
});

// =============================================
// ATIVAÇÃO FINAL — após DOMContentLoaded
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof managerApp._configurarAbaDiaria === 'function') {
            managerApp._configurarAbaDiaria();
        }
    }, 1500);

    setTimeout(function() {
        if (typeof managerApp._configurarBotaoSimuladorAdiamento === 'function') {
            managerApp._configurarBotaoSimuladorAdiamento();
        }
    }, 2000);
});

// =============================================
// 🆕 v8.9 — SIMULAÇÃO DE PERDA DE CONTRATOS (restaurado)
// =============================================

managerApp._simularPerdaContrato = function() {
    var container = document.getElementById('simulacaoListaAssistidos');
    if (!container) return;

    var dados = managerApp.dadosFluxoCaixa;
    if (!dados || !dados.assistidos) {
        container.innerHTML = '<div class="empty-state" style="padding: 12px;">Nenhum assistido carregado</div>';
        return;
    }

    var assistidosAtivos = dados.assistidos.filter(function(a) {
        return a.status === 'Ativo' && a.tipoContrato === 'MENSAL';
    });

    if (assistidosAtivos.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 12px;">Nenhum assistido com contrato mensal ativo</div>';
        return;
    }

    assistidosAtivos.sort(function(a, b) {
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });

    var html = '';
    for (var i = 0; i < assistidosAtivos.length; i++) {
        var a = assistidosAtivos[i];
        var valor = parseFloat(a.vlrContrato) || 0;
        html += '<label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; cursor: pointer; border-bottom: 1px solid var(--gray-100);">';
        html += '  <input type="checkbox" class="simPerdaCheck" data-assistido="' + (a.nome || '').replace(/"/g, '&quot;') + '" data-valor="' + valor + '" style="width: 16px; height: 16px; accent-color: #dc2626; cursor: pointer;">';
        html += '  <span style="flex: 1; font-size: 13px; color: var(--gray-700);">' + (a.nome || '') + '</span>';
        html += '  <span style="font-size: 12px; font-weight: 600; color: #dc2626;">' + Utils.formatCurrency(valor) + '/mês</span>';
        html += '</label>';
    }

    container.innerHTML = html;
    console.log('✅ Simulação de perda: ' + assistidosAtivos.length + ' assistidos carregados');
};

managerApp.limparSimulacaoPerda = function() {
    var resultado = document.getElementById('simulacaoResultado');
    if (resultado) resultado.style.display = 'none';

    var checks = document.querySelectorAll('.simPerdaCheck');
    for (var i = 0; i < checks.length; i++) {
        checks[i].checked = false;
    }

    Utils.showToast('🔄 Simulação limpa', 'info');
};

managerApp.selecionarTodosAssistidosPerda = function() {
    var checks = document.querySelectorAll('.simPerdaCheck');
    var todosMarcados = true;

    for (var i = 0; i < checks.length; i++) {
        if (!checks[i].checked) {
            todosMarcados = false;
            break;
        }
    }

    for (var i = 0; i < checks.length; i++) {
        checks[i].checked = !todosMarcados;
    }

    Utils.showToast(todosMarcados ? '☑️ Todos desmarcados' : '☑️ Todos marcados', 'info');
};

// =============================================
// 🆕 v9.8 — SIMULAÇÃO DE PERDA (Card 2: contratos full-width + 2 mini-cards de impacto abaixo)
// =============================================
managerApp.executarSimulacaoPerda = function() {
    var checks = document.querySelectorAll('.simPerdaCheck:checked');
    if (checks.length === 0) {
        Utils.showToast('⚠️ Selecione ao menos um assistido', 'warning');
        return;
    }

    var dados = managerApp.dadosFluxoCaixa;
    if (!dados || !dados.projecao) {
        Utils.showToast('⚠️ Carregue o fluxo de caixa primeiro', 'warning');
        return;
    }

    var nomes = [];
    for (var i = 0; i < checks.length; i++) {
        nomes.push(checks[i].getAttribute('data-assistido'));
    }

    var assistidosMensaisAtivosOriginal = (dados.assistidos || []).filter(function(a) {
        return a.status === 'Ativo' && a.tipoContrato === 'MENSAL';
    });

    var receitaTotalOriginal = 0;
    for (var r = 0; r < assistidosMensaisAtivosOriginal.length; r++) {
        receitaTotalOriginal += parseFloat(assistidosMensaisAtivosOriginal[r].vlrContrato) || 0;
    }

    var paramOperacional = (dados.parametrosOperacionais && dados.parametrosOperacionais.despesasOperacionais) || 25000;
    var aliquotaImposto = ((dados.parametrosOperacionais && dados.parametrosOperacionais.aliquotaImposto) || 6) / 100;

    var contratosRemovidos = [];
    var totalReceitaRemovida = 0;
    var totalCustoPCEconomizado = 0;
    var totalImpostosEconomizados = 0;
    var totalRateioRemovido = 0;
    var qtdContributivos = 0;
    var qtdDeficitarios = 0;

    for (var i = 0; i < nomes.length; i++) {
        var nome = nomes[i];
        var assistido = null;
        for (var j = 0; j < dados.assistidos.length; j++) {
            if (dados.assistidos[j].nome === nome) {
                assistido = dados.assistidos[j];
                break;
            }
        }
        if (!assistido) continue;

        var receita = parseFloat(assistido.vlrContrato) || 0;
        var custoPC = (parseFloat(assistido.totalHrsMes) || 0) * (parseFloat(assistido.vlrPlantao) || 0);
        var impostos = receita * aliquotaImposto;
        var margemContrib = receita - custoPC - impostos;
        var rateio = receitaTotalOriginal > 0 ? (receita / receitaTotalOriginal) * paramOperacional : 0;
        var margemLiquida = margemContrib - rateio;
        var isDeficitario = margemLiquida < 0;

        if (isDeficitario) qtdDeficitarios++;
        else qtdContributivos++;

        contratosRemovidos.push({
            nome: nome,
            receita: receita,
            custoPC: custoPC,
            impostos: impostos,
            margemContrib: margemContrib,
            rateio: rateio,
            margemLiquida: margemLiquida,
            isDeficitario: isDeficitario
        });

        totalReceitaRemovida += receita;
        totalCustoPCEconomizado += custoPC;
        totalImpostosEconomizados += impostos;
        totalRateioRemovido += rateio;
    }

    var impactoCaixa = -totalReceitaRemovida + totalCustoPCEconomizado + totalImpostosEconomizados;
    var impactoResultado = impactoCaixa + totalRateioRemovido;

    // Recomendação
    var recomendacaoIcone, recomendacaoCor, recomendacaoTitulo, recomendacaoTexto;
    if (impactoCaixa >= 0 && impactoResultado >= 0) {
        recomendacaoIcone = '✅'; recomendacaoCor = '#10b981';
        recomendacaoTitulo = 'DESLIGAR (benéfico)';
        recomendacaoTexto = 'A perda melhora o caixa e o resultado operacional.';
    } else if (impactoCaixa < 0 && impactoResultado < 0) {
        recomendacaoIcone = '🚨'; recomendacaoCor = '#dc2626';
        recomendacaoTitulo = 'MANTER (prejudicial)';
        recomendacaoTexto = 'A perda piora o caixa e o resultado. Os contratos são lucrativos.';
    } else if (impactoCaixa < 0 && impactoResultado >= 0) {
        recomendacaoIcone = '⚠️'; recomendacaoCor = '#f59e0b';
        recomendacaoTitulo = 'AVALIAR';
        recomendacaoTexto = 'A perda melhora o resultado operacional, mas piora o caixa imediato. Considere renegociar ou desligar se o caixa permitir.';
    } else {
        recomendacaoIcone = '💡'; recomendacaoCor = '#3b82f6';
        recomendacaoTitulo = 'AVALIAR (estratégico)';
        recomendacaoTexto = 'A perda melhora o caixa, mas piora o resultado. Verifique se há impacto estratégico.';
    }

    // Recalcular projeção sem os contratos (Card 3)
    var assistidosRestantes = (dados.assistidos || []).filter(function(a) {
        return nomes.indexOf(a.nome) === -1;
    });

    var projecaoSemPerda = [];
    var saldoAcumulado = dados.saldoInicial;
    var mesesNegativos = 0;
    var menorSaldo = dados.saldoInicial;
    var dataMenorSaldo = 'Início';

    for (var i = 0; i < dados.projecao.length; i++) {
        var p = dados.projecao[i];
        var mesRef = p.mesRef;
        var novaReceita = 0;
        var assistidosMensaisAtivos = assistidosRestantes.filter(function(a) {
            return a.status === 'Ativo' && a.tipoContrato === 'MENSAL';
        });
        for (var j = 0; j < assistidosMensaisAtivos.length; j++) {
            novaReceita += parseFloat(assistidosMensaisAtivos[j].vlrContrato) || 0;
        }
        var receitasMes = UtilsFinance.filtrarPorMes(dados.receitas, mesRef);
        for (var k = 0; k < receitasMes.length; k++) {
            var tipo = receitasMes[k].tipoAvulso || receitasMes[k].tipo || '';
            if (tipo !== 'Contrato Mensal' && nomes.indexOf(receitasMes[k].assistido) === -1) {
                novaReceita += parseFloat(receitasMes[k].valor) || 0;
            }
        }
        var despesaAjustada = p.despesa - totalCustoPCEconomizado;
        var resultado = novaReceita - despesaAjustada;
        saldoAcumulado += resultado;
        if (saldoAcumulado < 0) mesesNegativos++;
        if (saldoAcumulado < menorSaldo) {
            menorSaldo = saldoAcumulado;
            dataMenorSaldo = p.mes + '/' + p.ano;
        }
        projecaoSemPerda.push({
            mes: p.mes, ano: p.ano, mesRef: mesRef,
            receita: novaReceita, despesa: despesaAjustada,
            resultado: resultado, saldoAcumulado: saldoAcumulado
        });
    }

    var receitaOriginal = dados.projecao[0].receita;
    var receitaSemPerda = projecaoSemPerda[0].receita;
    var percReceitaPerdida = receitaOriginal > 0 ? (totalReceitaRemovida / receitaOriginal * 100) : 0;
    var corCaixa = impactoCaixa >= 0 ? '#10b981' : '#dc2626';
    var sinalImpacto = impactoCaixa >= 0 ? '+' : '';
    var corResultado = impactoResultado >= 0 ? '#10b981' : '#dc2626';
    var sinalResultado = impactoResultado >= 0 ? '+' : '';

    var resultadoContainer = document.getElementById('simulacaoResultado');
    var resultadoConteudo = document.getElementById('simulacaoResultadoConteudo');
    if (!resultadoContainer || !resultadoConteudo) return;
    resultadoContainer.style.display = 'block';

    var html = '';

    // ─────────────────────────────────────────────
    // Título geral
    // ─────────────────────────────────────────────
    html += '<div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--gray-200);">';
    html += '  <div style="font-size: 14px; font-weight: 700; color: var(--gray-800);">📉 Simulação de Perda — ' + checks.length + ' contrato(s)</div>';
    html += '  <div style="font-size: 12px; color: var(--gray-500); margin-top: 2px;">';
    html += '    ' + nomes.join(', ') + ' — <strong style="color: #dc2626;">−' + Utils.formatCurrency(totalReceitaRemovida) + '/mês de receita</strong>';
    html += '  </div>';
    html += '</div>';

    // ─────────────────────────────────────────────
    // Grid dos 3 mini-cards
    // ─────────────────────────────────────────────
    html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">';

    // CARD 1 — Impacto na Receita
    html += '<div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #3b82f6; border-radius: 12px; padding: 14px; display: flex; flex-direction: column;">';
    html += '  <div style="font-size: 10px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">📊 Impacto na Receita</div>';
    html += '  <div style="flex: 1; min-height: 100px; position: relative;"><canvas id="chartSimImpactoReceita"></canvas></div>';
    html += '  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #93c5fd;">';
    html += '    <div style="font-size: 20px; font-weight: 800; color: #dc2626; line-height: 1;">−' + Utils.formatCurrency(totalReceitaRemovida) + '</div>';
    html += '    <div style="font-size: 11px; color: #1e40af; margin-top: 2px;">por mês <strong>(−' + percReceitaPerdida.toFixed(1) + '%)</strong></div>';
    html += '  </div>';
    html += '</div>';

    // ─────────────────────────────────────────────
    // CARD 2 — Impacto no Caixa (contratos full-width + 2 mini-cards abaixo)
    // ─────────────────────────────────────────────
    html += '<div style="background: linear-gradient(135deg, #fafafa 0%, #f3f4f6 100%); border: 1px solid #6b7280; border-radius: 12px; padding: 14px;">';
    html += '  <div style="font-size: 10px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">💰 Impacto no Caixa</div>';

    // LISTA DE CONTRATOS (100% largura)
    html += '  <div style="font-size: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px dashed #d1d5db;">';
    html += '    <div style="font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 6px;">Contratos</div>';
    for (var c = 0; c < contratosRemovidos.length; c++) {
        var cr = contratosRemovidos[c];
        var iconStatus = cr.isDeficitario ? '🚨' : '✅';
        var corStatus = cr.isDeficitario ? '#dc2626' : '#10b981';
        var sinalML = cr.margemLiquida >= 0 ? '+' : '';
        html += '    <div style="padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">';
        html += '      <div style="font-weight: 700; color: var(--gray-800); font-size: 11px; margin-bottom: 3px;">' + iconStatus + ' ' + cr.nome + '</div>';
        html += '      <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--gray-500); line-height: 1.5;">';
        html += '        <span>Margem de Contribuição:</span>';
        html += '        <strong style="color: #10b981;">+' + Utils.formatCurrency(cr.margemContrib) + '</strong>';
        html += '      </div>';
        html += '      <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--gray-500); line-height: 1.5;">';
        html += '        <span>Margem Líquida:</span>';
        html += '        <strong style="color: ' + corStatus + ';">' + sinalML + Utils.formatCurrency(cr.margemLiquida) + '</strong>';
        html += '      </div>';
        html += '    </div>';
    }
    html += '  </div>';

    // 2 MINI-CARDS DE IMPACTO (50% cada)
    html += '  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';

    // Impacto no Caixa Imediato
    html += '    <div style="background: white; border-radius: 6px; padding: 8px 10px; border-left: 3px solid ' + corCaixa + ';">';
    html += '      <div style="font-size: 8px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Caixa Imediato</div>';
    html += '      <div style="font-size: 14px; font-weight: 800; color: ' + corCaixa + '; line-height: 1.2; margin: 2px 0;">' + sinalImpacto + Utils.formatCurrency(impactoCaixa) + '</div>';
    html += '      <div style="font-size: 9px; color: #9ca3af;">custo fixo (param) não muda</div>';
    html += '    </div>';

    // Impacto no Resultado Operacional
    html += '    <div style="background: white; border-radius: 6px; padding: 8px 10px; border-left: 3px solid ' + corResultado + ';">';
    html += '      <div style="font-size: 8px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Resultado Operacional</div>';
    html += '      <div style="font-size: 14px; font-weight: 800; color: ' + corResultado + '; line-height: 1.2; margin: 2px 0;">' + sinalResultado + Utils.formatCurrency(impactoResultado) + '</div>';
    html += '      <div style="font-size: 9px; color: #9ca3af;">inclui rateio de ' + Utils.formatCurrency(totalRateioRemovido) + '</div>';
    html += '    </div>';

    html += '  </div>';
    html += '</div>';

    // CARD 3 — Risco de Caixa
    var corRisco = menorSaldo < 0 ? '#dc2626' : (menorSaldo < 20000 ? '#f59e0b' : '#10b981');
    html += '<div style="background: linear-gradient(135deg, ' + (menorSaldo < 0 ? '#fef2f2 0%, #fee2e2' : (menorSaldo < 20000 ? '#fffbeb 0%, #fef3c7' : '#f0fdf4 0%, #dcfce7')) + ' 100%); border: 1px solid ' + corRisco + '; border-radius: 12px; padding: 14px; display: flex; flex-direction: column;">';
    html += '  <div style="font-size: 10px; font-weight: 700; color: ' + corRisco + '; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">⚠️ Risco de Caixa</div>';
    html += '  <div style="flex: 1; min-height: 100px; position: relative;"><canvas id="chartSimRiscoCaixa"></canvas></div>';
    html += '  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed ' + corRisco + '60;">';
    html += '    <div style="font-size: 20px; font-weight: 800; color: ' + corRisco + '; line-height: 1;">';
    if (menorSaldo < 0) html += '🚨 ' + Utils.formatCurrency(menorSaldo);
    else if (menorSaldo < 20000) html += '⚠️ ' + Utils.formatCurrency(menorSaldo);
    else html += '✅ ' + Utils.formatCurrency(menorSaldo);
    html += '    </div>';
    html += '    <div style="font-size: 11px; color: ' + corRisco + '; margin-top: 2px;">Menor saldo em ' + dataMenorSaldo + ' — ' + mesesNegativos + ' mês(es) negativo(s)</div>';
    html += '  </div>';
    html += '</div>';

    html += '</div>'; // fecha grid dos 3 cards

    // ─────────────────────────────────────────────
    // RECOMENDAÇÃO FULL-WIDTH
    // ─────────────────────────────────────────────
    html += '<div style="margin-top: 12px; background: ' + recomendacaoCor + '15; border: 2px solid ' + recomendacaoCor + '; border-radius: 12px; padding: 16px 20px; display: flex; align-items: flex-start; gap: 14px;">';
    html += '  <div style="font-size: 32px; line-height: 1; flex-shrink: 0;">' + recomendacaoIcone + '</div>';
    html += '  <div style="flex: 1; min-width: 0;">';
    html += '    <div style="font-size: 16px; font-weight: 800; color: ' + recomendacaoCor + '; margin-bottom: 4px;">' + recomendacaoTitulo + '</div>';
    html += '    <div style="font-size: 13px; color: var(--gray-700); line-height: 1.5;">' + recomendacaoTexto + '</div>';
    html += '  </div>';
    html += '</div>';

    resultadoConteudo.innerHTML = html;

    // ─────────────────────────────────────────────
    // Gráficos
    // ─────────────────────────────────────────────
    setTimeout(function() {
        var ctx1 = document.getElementById('chartSimImpactoReceita');
        if (ctx1) {
            if (managerApp._chartSimReceita) managerApp._chartSimReceita.destroy();
            managerApp._chartSimReceita = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['Original', 'Sem Perda'],
                    datasets: [{ data: [receitaOriginal, receitaSemPerda], backgroundColor: ['#3b82f6', '#dc2626'], borderRadius: 6, borderWidth: 0 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return Utils.formatCurrency(ctx.raw); } } } },
                    scales: {
                        y: { beginAtZero: true, ticks: { callback: function(v) { return 'R$ ' + (v/1000).toFixed(0) + 'k'; }, font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { ticks: { font: { size: 10, weight: '600' } }, grid: { display: false } }
                    }
                }
            });
        }

        var ctx3 = document.getElementById('chartSimRiscoCaixa');
        if (ctx3) {
            if (managerApp._chartSimRisco) managerApp._chartSimRisco.destroy();
            var labels = dados.projecao.map(function(p) {
                var mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                return mesesNomes[p.mes-1] + '/' + String(p.ano).slice(2);
            });
            var saldoOriginal = dados.projecao.map(function(p) { return p.saldoAcumulado; });
            var saldoSemPerda = projecaoSemPerda.map(function(p) { return p.saldoAcumulado; });
            managerApp._chartSimRisco = new Chart(ctx3, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Original', data: saldoOriginal, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderWidth: 2, borderDash: [5, 3], fill: false, tension: 0.3, pointRadius: 2, pointBackgroundColor: '#3b82f6' },
                        { label: 'Sem Perda', data: saldoSemPerda, borderColor: '#dc2626', backgroundColor: 'rgba(220, 38, 38, 0.1)', borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#dc2626' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10, padding: 4 } }, tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + Utils.formatCurrency(ctx.raw); } } } },
                    scales: {
                        y: { ticks: { callback: function(v) { return 'R$ ' + (v/1000).toFixed(0) + 'k'; }, font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { ticks: { font: { size: 9 } }, grid: { display: false } }
                    }
                }
            });
        }
    }, 50);

    Utils.showToast('📊 Simulação calculada: ' + recomendacaoTitulo, recomendacaoCor === '#10b981' ? 'success' : 'warning');
};

// =============================================
// 🆕 v8.9 — SIMULAÇÃO DE CENÁRIO (botão 🔮 Simular Cenário)
// =============================================
managerApp.abrirSimulacao = function() {
    Utils.showToast('🔮 Funcionalidade em desenvolvimento. Use o "Simular Adiamento" ou "Simular Perda" por enquanto.', 'info');
};

managerApp.salvarCenario = function(nome, dados) {
    if (!nome) {
        Utils.showToast('⚠️ Informe um nome para o cenário', 'warning');
        return;
    }
    if (!managerApp.cenariosSalvos) managerApp.cenariosSalvos = {};
    managerApp.cenariosSalvos[nome] = dados || {};
    try {
        localStorage.setItem('cenarios_salvos', JSON.stringify(managerApp.cenariosSalvos));
        Utils.showToast('💾 Cenário "' + nome + '" salvo localmente', 'success');
    } catch (e) {
        Utils.showToast('❌ Erro ao salvar cenário: ' + e.message, 'error');
    }
};

// =============================================
// 🆕 v9.6 — Popular lista de assistidos (sem duplicar listeners)
// Os botões já têm onclick no HTML — não precisa de addEventListener
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (managerApp.dadosFluxoCaixa) {
            managerApp._simularPerdaContrato();
        }
    }, 2500);
});

// Popular a lista sempre que renderizar o fluxo
var _originalRenderizarFluxo_v89 = managerApp.renderizarFluxoCaixa;
managerApp.renderizarFluxoCaixa = function(dados) {
    _originalRenderizarFluxo_v89.call(this, dados);
    setTimeout(function() {
        managerApp._simularPerdaContrato();
    }, 100);
};

console.log('✅ v8.9 — Simulação de perda/cenário restaurada');

// =============================================
// 🆕 v9.9 — RENDERIZAR VISÃO SEMANAL
// Agrupa os 90 dias do diário em semanas (seg-dom)
// =============================================
managerApp._renderizarFluxoSemanal = function(dados) {
    var container = document.getElementById('fluxoSemanalContainer');
    if (!container) {
        console.warn('⚠️ #fluxoSemanalContainer não encontrado');
        return;
    }

    var projecao = managerApp._projecaoDiariaCache;
    if (!projecao || !projecao.dias) {
        container.innerHTML = '<div class="empty-state">Carregue o diário primeiro para gerar a visão semanal</div>';
        return;
    }

    var dias = projecao.dias;
    var diasAntesDeHoje = projecao.diasAntesDeHoje || [];

    // ─────────────────────────────────────────────
    // Agrupar os dias em semanas (seg-dom)
    // ─────────────────────────────────────────────
    var semanas = {};

    function adicionarAoDia(d, tipo) {
        var data = d.data;
        // Calcular a segunda-feira da semana
        var diaSemana = data.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
        var diasParaSegunda = (diaSemana === 0) ? 6 : (diaSemana - 1);
        var segunda = new Date(data);
        segunda.setDate(segunda.getDate() - diasParaSegunda);
        segunda.setHours(0, 0, 0, 0);

        var chaveSemana = segunda.getFullYear() + '-' +
                          String(segunda.getMonth() + 1).padStart(2, '0') + '-' +
                          String(segunda.getDate()).padStart(2, '0');

        if (!semanas[chaveSemana]) {
            var domingo = new Date(segunda);
            domingo.setDate(domingo.getDate() + 6);
            semanas[chaveSemana] = {
                segunda: segunda,
                domingo: domingo,
                totalReceitas: 0,
                totalDespesas: 0,
                temMovimento: false,
                diasDetalhes: []
            };
        }

        semanas[chaveSemana].totalReceitas += d.totalReceitas || 0;
        semanas[chaveSemana].totalDespesas += d.totalDespesas || 0;
        semanas[chaveSemana].temMovimento = true;
        semanas[chaveSemana].diasDetalhes.push(d);
    }

    // Adicionar dias efetivados antes de hoje (se houver)
    for (var i = 0; i < diasAntesDeHoje.length; i++) {
        adicionarAoDia(diasAntesDeHoje[i]);
    }

    // Adicionar dias do horizonte
    for (var i = 0; i < dias.length; i++) {
        adicionarAoDia(dias[i]);
    }

    // Ordenar semanas por data
    var semanasKeys = Object.keys(semanas).sort();

    if (semanasKeys.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma movimentação prevista no período</div>';
        return;
    }

    // ─────────────────────────────────────────────
    // Calcular saldo acumulado semana a semana
    // ─────────────────────────────────────────────
    var saldoInicial = projecao.resumo.saldoInicial || 0;

    // Adicionar Atrasados ao saldo inicial
    var receitasAtrasadas = projecao.receitasAtrasadas ? projecao.receitasAtrasadas.total : 0;
    var despesasAtrasadas = projecao.despesasAtrasadas ? projecao.despesasAtrasadas.total : 0;
    var saldoCorrente = saldoInicial + receitasAtrasadas - despesasAtrasadas;

    // ─────────────────────────────────────────────
    // Renderizar
    // ─────────────────────────────────────────────
    var html = '';

    // Cabeçalho
    html += '<div class="card" style="margin-bottom: 16px;">';
    html += '  <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">';
    html += '    <span class="card-title">📅 Fluxo Semanal — Próximas ' + semanasKeys.length + ' Semanas</span>';
    html += '    <span style="font-size: 11px; color: var(--gray-500);">' + projecao.resumo.periodoInicio + ' → ' + projecao.resumo.periodoFim + '</span>';
    html += '  </div>';
    html += '</div>';

    // Cards das semanas
    for (var s = 0; s < semanasKeys.length; s++) {
        var chave = semanasKeys[s];
        var sem = semanas[chave];
        var resultado = sem.totalReceitas - sem.totalDespesas;
        saldoCorrente += resultado;

        var statusClass, statusLabel;
        if (saldoCorrente < 0) {
            statusClass = 'critica';
            statusLabel = '🚨 Crítica';
        } else if (saldoCorrente < 20000) {
            statusClass = 'atencao';
            statusLabel = '⚠️ Atenção';
        } else {
            statusClass = 'saudavel';
            statusLabel = '✅ Saudável';
        }

        var corResultado = resultado >= 0 ? '#10b981' : '#dc2626';
        var corSaldo = saldoCorrente >= 0 ? '#10b981' : '#dc2626';

        function formatarData(d) {
            return String(d.getDate()).padStart(2, '0') + '/' +
                   String(d.getMonth() + 1).padStart(2, '0');
        }

        html += '<div class="semana-card semana-' + statusClass + '" style="margin-bottom: 10px;">';
        html += '  <div class="semana-card-header">';
        html += '    <span class="semana-card-titulo">Semana ' + (s + 1) + ' (' + formatarData(sem.segunda) + ' a ' + formatarData(sem.domingo) + ')</span>';
        html += '    <span class="semana-card-status ' + statusClass + '">' + statusLabel + '</span>';
        html += '  </div>';

        html += '  <div class="semana-card-linha">';
        html += '    <span class="label">Entradas:</span>';
        html += '    <span class="valor positivo">+' + Utils.formatCurrency(sem.totalReceitas) + '</span>';
        html += '  </div>';

        html += '  <div class="semana-card-linha">';
        html += '    <span class="label">Saídas:</span>';
        html += '    <span class="valor negativo">-' + Utils.formatCurrency(sem.totalDespesas) + '</span>';
        html += '  </div>';

        html += '  <div class="semana-card-linha">';
        html += '    <span class="label">Resultado:</span>';
        html += '    <span class="valor" style="color: ' + corResultado + ';">' + Utils.formatCurrency(resultado) + '</span>';
        html += '  </div>';

        html += '  <div class="semana-card-saldo">';
        html += '    <span class="label">Saldo ao final:</span>';
        html += '    <span class="valor" style="color: ' + corSaldo + ';">' + Utils.formatCurrency(saldoCorrente) + '</span>';
        html += '  </div>';

        // Detalhes dos dias (colapsável)
        if (sem.diasDetalhes.length > 0) {
            html += '  <details style="margin-top: 8px; font-size: 11px; color: var(--gray-500);">';
            html += '    <summary style="cursor: pointer; font-weight: 600; color: var(--gray-600);">Ver ' + sem.diasDetalhes.length + ' dia(s) com movimento</summary>';
            html += '    <div style="margin-top: 6px; padding: 6px 0; border-top: 1px dashed var(--gray-200);">';
            for (var d = 0; d < sem.diasDetalhes.length; d++) {
                var dia = sem.diasDetalhes[d];
                var corRes = dia.resultado >= 0 ? '#10b981' : '#dc2626';
                html += '      <div style="display: flex; justify-content: space-between; padding: 2px 0;">';
                html += '        <span>' + dia.dataFormatada + ' (' + dia.diaSemana + ')</span>';
                html += '        <span style="color: ' + corRes + '; font-weight: 600;">' + Utils.formatCurrency(dia.resultado) + '</span>';
                html += '      </div>';
            }
            html += '    </div>';
            html += '  </details>';
        }

        html += '</div>';
    }

    container.innerHTML = html;
    console.log('✅ Visão semanal renderizada:', semanasKeys.length, 'semanas');
};

// =============================================
// CHANGELOG — v8.3 (Ciclo 5.5)
// =============================================
// 🆕 v8.3 — Correções do Fluxo Diário:
//   - `_projetarReceitasDiarias` e `_projetarDespesasDiarias` agora recebem
//     um 6º parâmetro `isAtrasado`:
//       * isAtrasado=true  → só Pendentes (vão para a linha "⚠️ Atrasados")
//       * isAtrasado=false → Recebidos/Pagos + Pendentes (linha do dia real)
//   - Detalhes agora incluem `status` (necessário para filtrar depois).
//   - `_projetarFluxoDiario` faz DUAS passadas por dia antes de hoje:
//       * Passada 1 (isAtrasado=true)  → Atrasados (só Pendentes vencidos)
//       * Passada 2 (isAtrasado=false) → `diasAntesDeHoje[]` (Recebido/Pago)
//   - Novo campo no retorno: `diasAntesDeHoje`, `saldoAposEfetivados`,
//     `resultadoEfetivadoAntesDeHoje`.
//   - `saldoAposAtrasados` = saldoInicial + Σ(efetivados antes de hoje)
//     + receitasAtrasadas − despesasAtrasadas.
//   - `_renderizarHtmlFluxoDiario` renderiza as linhas de `diasAntesDeHoje`
//     ANTES da linha "⚠️ Atrasados" (saldo em branco nessas linhas — o
//     saldo oficial aparece só após Atrasados).
//   - No invalidar de mês (`mesChanged`), limpa também `_projecaoDiariaCache`.
//
// 🔒 PRESERVADO 100%:
//   - Saldo Auto/Manual
//   - Card "Próximo Pagamento de Folha"
//   - Simulador de Adiamento
//   - Priorização P1/P2/P3
//   - Cálculo do 5º dia útil + feriados
//   - Barra de progresso
//   - Gráficos (mensal + diário)
//   - Cards do topo (Saldo Atual, Saldo Projetado, Margem, Risco, Dias)
// =============================================

console.log('✅ fluxo-caixa.js v8.3 (Ciclo 5.5 — Atrasados + linha do dia real) carregado');
console.log('   🔧 Atrasados = só Pendentes vencidos');
console.log('   📅 Recebido/Pago antes de hoje = linha do dia real');
console.log('   🔄 Loop futuro aceita Recebido/Pago/Pendente');
