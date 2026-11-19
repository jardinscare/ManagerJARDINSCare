// =============================================
// UTILITÁRIOS FINANCEIROS - managerJARDINSCare
// Módulo centralizado para cálculos financeiros
// Versão 2.3 - CORREÇÃO DEFINITIVA para filtro de leads
// =============================================

const UtilsFinance = {
    /**
     * Filtra um array de dados por mês de referência
     * SUPORTA: dataCadastro, timestamp, data, Data_Registro, Data_Criacao
     * @param {Array} dados - Array de objetos com campos de data
     * @param {string} mesReferencia - Mês no formato 'YYYY-MM'
     * @returns {Array} - Array filtrado
     */
    filtrarPorMes: function(dados, mesReferencia) {
        if (!dados || !Array.isArray(dados)) return [];
        if (!mesReferencia) return dados;
        
        var parts = mesReferencia.split('-');
        if (parts.length !== 2) return dados;
        
        var ano = parseInt(parts[0]);
        var mes = parseInt(parts[1]);
        var mesStr = String(mes).padStart(2, '0');
        
        return dados.filter(function(item) {
            if (!item) return false;
            
            // 🔥 LISTA DE CAMPOS DE DATA PARA VERIFICAR
var camposData = [
    item.dataCadastro,
    item.data_cadastro,
    item.timestamp,
    item.data,
    item.Data_Registro,
    item.Data_Criacao,
    item.dataCriacao,
    item.Data_Visita,
    item.Data_Plantao
];
            
            var dataStr = '';
            
            // Encontrar o primeiro campo com valor
            for (var i = 0; i < camposData.length; i++) {
                if (camposData[i]) {
                    dataStr = String(camposData[i]).trim();
                    if (dataStr) break;
                }
            }
            
            if (!dataStr) return false;
            
            // 🔥 CASO 1: ISO completo com T e Z (ex: "2026-06-10T23:38:21.157Z")
            if (dataStr.includes('T')) {
                var isoParts = dataStr.split('T')[0].split('-');
                if (isoParts.length === 3 && !isNaN(isoParts[0]) && !isNaN(isoParts[1])) {
                    return isoParts[0] == ano && isoParts[1] == mesStr;
                }
            }
            
            // 🔥 CASO 2: Data no formato ISO sem T (ex: "2026-06-10")
            if (dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                var isoParts = dataStr.split('-');
                if (isoParts.length >= 2 && !isNaN(isoParts[0]) && !isNaN(isoParts[1])) {
                    return isoParts[0] == ano && isoParts[1] == mesStr;
                }
            }
            
            // 🔥 CASO 3: Data no formato BR (ex: "10/06/2026")
            if (dataStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                var brParts = dataStr.split('/');
                if (brParts.length >= 3 && !isNaN(brParts[2]) && !isNaN(brParts[1])) {
                    var anoStr = brParts[2];
                    if (anoStr.length === 2) {
                        anoStr = '20' + anoStr;
                    }
                    return anoStr == ano && brParts[1] == mesStr;
                }
            }
            
            // 🔥 CASO 4: Tentar converter para Date (fallback)
            try {
                var dataObj = new Date(dataStr);
                if (!isNaN(dataObj.getTime())) {
                    return dataObj.getFullYear() == ano && (dataObj.getMonth() + 1) == mes;
                }
            } catch(e) {
                // Ignorar
            }
            
            return false;
        });
    },

    /**
     * Calcula totais de receitas e despesas por mês
     * @param {Array} receitas - Array de receitas
     * @param {Array} despesas - Array de despesas
     * @param {string} mesReferencia - Mês no formato 'YYYY-MM'
     * @returns {Object} - Objeto com totais calculados
     */
    calcularTotais: function(receitas, despesas, mesReferencia) {
        var receitasFiltradas = this.filtrarPorMes(receitas, mesReferencia);
        var despesasFiltradas = this.filtrarPorMes(despesas, mesReferencia);
        
        var totalReceitas = 0;
        var totalReceitasContratos = 0;
        var totalReceitasAvulsas = 0;
        var totalReceitasPendentes = 0;
        var totalReceitasRecebidas = 0;
        
        receitasFiltradas.forEach(function(r) {
            var valor = parseFloat(r.valor) || 0;
            totalReceitas += valor;
            
            if (r.status === 'Recebido') {
                totalReceitasRecebidas += valor;
                if (r.tipo === 'Contrato Mensal') {
                    totalReceitasContratos += valor;
                } else {
                    totalReceitasAvulsas += valor;
                }
            } else if (r.status === 'Pendente') {
                totalReceitasPendentes += valor;
            }
        });
        
        var totalDespesas = 0;
        var totalDespesasPagas = 0;
        var totalDespesasPendentes = 0;
        var despesasPorCategoria = {};
        
        despesasFiltradas.forEach(function(d) {
            var valor = parseFloat(d.valor) || 0;
            totalDespesas += valor;
            
            if (d.status === 'Pago') {
                totalDespesasPagas += valor;
            } else if (d.status === 'Pendente') {
                totalDespesasPendentes += valor;
            }
            
            var categoria = d.categoria || 'Outros';
            if (!despesasPorCategoria[categoria]) {
                despesasPorCategoria[categoria] = { total: 0, pago: 0, pendente: 0 };
            }
            despesasPorCategoria[categoria].total += valor;
            if (d.status === 'Pago') {
                despesasPorCategoria[categoria].pago += valor;
            } else if (d.status === 'Pendente') {
                despesasPorCategoria[categoria].pendente += valor;
            }
        });
        
        var resultadoLiquido = totalReceitasRecebidas - totalDespesasPagas;
        var margem = totalReceitasRecebidas > 0 ? 
            (resultadoLiquido / totalReceitasRecebidas * 100) : 0;
        
        return {
            totalReceitas: totalReceitas,
            totalReceitasContratos: totalReceitasContratos,
            totalReceitasAvulsas: totalReceitasAvulsas,
            totalReceitasPendentes: totalReceitasPendentes,
            totalReceitasRecebidas: totalReceitasRecebidas,
            totalDespesas: totalDespesas,
            totalDespesasPagas: totalDespesasPagas,
            totalDespesasPendentes: totalDespesasPendentes,
            resultadoLiquido: resultadoLiquido,
            margem: margem,
            receitasFiltradas: receitasFiltradas,
            despesasFiltradas: despesasFiltradas,
            despesasPorCategoria: despesasPorCategoria,
            countReceitas: receitasFiltradas.length,
            countDespesas: despesasFiltradas.length,
            countReceitasRecebidas: receitasFiltradas.filter(function(r) { 
                return r.status === 'Recebido'; 
            }).length,
            countDespesasPagas: despesasFiltradas.filter(function(d) { 
                return d.status === 'Pago'; 
            }).length
        };
    },

    /**
     * Calcula o resumo financeiro do mês (cards da 2ª linha)
     * @param {Array} receitas - Array de receitas
     * @param {Array} despesas - Array de despesas
     * @param {string} mesReferencia - Mês no formato 'YYYY-MM'
     * @returns {Object} - Resumo financeiro
     */
    calcularResumoFinanceiro: function(receitas, despesas, mesReferencia) {
        var totais = this.calcularTotais(receitas, despesas, mesReferencia);
        
        return {
            totalReceitasContratos: totais.totalReceitasContratos,
            totalReceitasAvulsas: totais.totalReceitasAvulsas,
            totalDespesasPagas: totais.totalDespesasPagas,
            resultadoLiquido: totais.resultadoLiquido,
            margem: totais.margem,
            totalReceitasRecebidas: totais.totalReceitasRecebidas,
            countReceitas: totais.countReceitas,
            countDespesas: totais.countDespesas
        };
    },

    /**
     * Calcula a meta de faturamento para um mês específico
     * @param {Array} receitas - Array de receitas
     * @param {string} mesReferencia - Mês no formato 'YYYY-MM'
     * @returns {number} - Total de receitas recebidas no mês
     */
    calcularMetaFaturamento: function(receitas, mesReferencia) {
        if (!receitas || !Array.isArray(receitas)) return 0;
        if (!mesReferencia) return 0;
        
        var receitasFiltradas = this.filtrarPorMes(receitas, mesReferencia);
        var total = 0;
        
        for (var i = 0; i < receitasFiltradas.length; i++) {
            var r = receitasFiltradas[i];
            if (r.status === 'Recebido') {
                total += parseFloat(r.valor) || 0;
            }
        }
        
        return total;
    },

    /**
     * Calcula a margem líquida para um mês específico
     * @param {Array} receitas - Array de receitas
     * @param {Array} despesas - Array de despesas
     * @param {string} mesReferencia - Mês no formato 'YYYY-MM'
     * @returns {number} - Margem líquida em porcentagem
     */
    calcularMetaMargem: function(receitas, despesas, mesReferencia) {
        if (!receitas || !Array.isArray(receitas)) return 0;
        if (!despesas || !Array.isArray(despesas)) return 0;
        if (!mesReferencia) return 0;
        
        var receitasFiltradas = this.filtrarPorMes(receitas, mesReferencia);
        var despesasFiltradas = this.filtrarPorMes(despesas, mesReferencia);
        
        var totalReceitas = 0;
        var totalDespesas = 0;
        
        for (var i = 0; i < receitasFiltradas.length; i++) {
            var r = receitasFiltradas[i];
            if (r.status === 'Recebido') {
                totalReceitas += parseFloat(r.valor) || 0;
            }
        }
        
        for (var i = 0; i < despesasFiltradas.length; i++) {
            var d = despesasFiltradas[i];
            if (d.status === 'Pago') {
                totalDespesas += parseFloat(d.valor) || 0;
            }
        }
        
        if (totalReceitas === 0) return 0;
        return ((totalReceitas - totalDespesas) / totalReceitas) * 100;
    },

    /**
     * Calcula o total de leads para um mês específico
     * @param {Array} leads - Array de leads
     * @param {string} mesReferencia - Mês no formato 'YYYY-MM'
     * @returns {number} - Total de leads no mês
     */
    calcularMetaLeads: function(leads, mesReferencia) {
        if (!leads || !Array.isArray(leads)) return 0;
        if (!mesReferencia) return 0;
        
        var leadsFiltrados = this.filtrarPorMes(leads, mesReferencia);
        return leadsFiltrados.length;
    },

    /**
     * Calcula a taxa de conversão para um mês específico
     * @param {Array} leads - Array de leads
     * @param {string} mesReferencia - Mês no formato 'YYYY-MM'
     * @returns {Object} - { total, convertidos, taxaConversao }
     */
    calcularMetaConversao: function(leads, mesReferencia) {
        if (!leads || !Array.isArray(leads)) {
            return { total: 0, convertidos: 0, taxaConversao: 0 };
        }
        if (!mesReferencia) {
            return { total: 0, convertidos: 0, taxaConversao: 0 };
        }
        
        var leadsFiltrados = this.filtrarPorMes(leads, mesReferencia);
        var total = leadsFiltrados.length;
        var convertidos = 0;
        
        for (var i = 0; i < leadsFiltrados.length; i++) {
            if (leadsFiltrados[i].status === '✅ Fechado (Contrato)') {
                convertidos++;
            }
        }
        
        var taxaConversao = total > 0 ? (convertidos / total * 100) : 0;
        
        return {
            total: total,
            convertidos: convertidos,
            taxaConversao: taxaConversao
        };
    },

    /**
     * Agrupa despesas por categoria e ordena por valor
     * @param {Array} despesas - Array de despesas
     * @param {number} limite - Número máximo de categorias (default: 5)
     * @returns {Array} - Array de categorias com totais
     */
    agruparDespesasPorCategoria: function(despesas, limite) {
        limite = limite || 5;
        
        if (!despesas || !Array.isArray(despesas) || despesas.length === 0) {
            return [{ categoria: 'Sem dados no mês', valor: 1 }];
        }
        
        var categorias = {};
        var totalGeral = 0;
        
        despesas.forEach(function(d) {
            if (d.status === 'Pago') {
                var cat = d.categoria || 'Outros';
                if (!categorias[cat]) categorias[cat] = 0;
                var valor = parseFloat(d.valor) || 0;
                categorias[cat] += valor;
                totalGeral += valor;
            }
        });
        
        if (totalGeral === 0) {
            return [{ categoria: 'Sem dados no mês', valor: 1 }];
        }
        
        var sorted = Object.keys(categorias).map(function(k) {
            return { categoria: k, valor: categorias[k] };
        }).sort(function(a, b) { 
            return b.valor - a.valor; 
        });
        
        var top = sorted.slice(0, limite);
        var resto = sorted.slice(limite);
        
        if (resto.length > 0) {
            var totalResto = resto.reduce(function(s, item) { return s + item.valor; }, 0);
            top.push({ categoria: 'Outros', valor: totalResto });
        }
        
        return top;
    },

    /**
     * Calcula indicadores de fluxo de caixa
     * @param {Object} dados - Dados do fluxo de caixa
     * @returns {Object} - Indicadores calculados
     */
    calcularIndicadoresFluxo: function(dados) {
        if (!dados || !dados.projecao || dados.projecao.length === 0) {
            return {
                saldoAtual: 0,
                saldoProjetado: 0,
                margemSeguranca: 0,
                riscoCaixa: 'INDETERMINADO',
                diasCobertura: 0
            };
        }
        
        var projecao = dados.projecao;
        var ultimo = projecao[projecao.length - 1];
        var primeiro = projecao[0];
        
        var saldoAtual = dados.saldoInicial || 0;
        var saldoProjetado = ultimo.saldoAcumulado || 0;
        var margemSeguranca = primeiro.receita > 0 ? 
            ((primeiro.resultado || 0) / primeiro.receita * 100) : 0;
        
        var despesaBase = primeiro.despesa || 0;
        var despesaDiaria = despesaBase > 0 ? despesaBase / 30 : 1;
        var diasCobertura = saldoAtual > 0 ? Math.round(saldoAtual / despesaDiaria) : 0;
        
        var riscoCaixa = 'BAIXO';
        if (saldoProjetado < 0) {
            riscoCaixa = 'CRITICO';
        } else if (saldoProjetado < 10000 || margemSeguranca < 5) {
            riscoCaixa = 'ALTO';
        } else if (saldoProjetado < 20000 || margemSeguranca < 10) {
            riscoCaixa = 'MEDIO';
        }
        
        return {
            saldoAtual: saldoAtual,
            saldoProjetado: saldoProjetado,
            margemSeguranca: margemSeguranca,
            riscoCaixa: riscoCaixa,
            diasCobertura: diasCobertura
        };
    },

    /**
     * Formata um número para exibição como moeda
     * @param {number} valor - Valor a ser formatado
     * @returns {string} - Valor formatado
     */
    formatarMoeda: function(valor) {
        if (typeof valor !== 'number' || isNaN(valor)) valor = 0;
        return valor.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        });
    },

    /**
     * Formata um número para exibição como percentual
     * @param {number} valor - Valor a ser formatado
     * @param {number} decimais - Número de casas decimais
     * @returns {string} - Valor formatado
     */
    formatarPercentual: function(valor, decimais) {
        decimais = decimais || 1;
        if (typeof valor !== 'number' || isNaN(valor)) valor = 0;
        return valor.toFixed(decimais) + '%';
    },

    /**
     * Agrupa receitas por tipo
     * @param {Array} receitas - Array de receitas
     * @returns {Object} - Receitas agrupadas por tipo
     */
    agruparReceitasPorTipo: function(receitas) {
        if (!receitas || !Array.isArray(receitas)) {
            return { contratos: 0, avulsas: 0, outros: 0 };
        }
        
        var contratos = 0;
        var avulsas = 0;
        var outros = 0;
        
        receitas.forEach(function(r) {
            var valor = parseFloat(r.valor) || 0;
            if (r.status !== 'Recebido') return;
            
            if (r.tipo === 'Contrato Mensal') {
                contratos += valor;
            } else if (r.tipo === 'Contrato Avulso' || r.tipo === 'Plantão Extra' || r.tipo === 'Diária Avulsa') {
                avulsas += valor;
            } else {
                outros += valor;
            }
        });
        
        return { contratos: contratos, avulsas: avulsas, outros: outros };
    },

    /**
     * Obtém o resumo mensal de um conjunto de dados
     * @param {Array} receitas - Array de receitas
     * @param {Array} despesas - Array de despesas
     * @param {string} mesReferencia - Mês no formato 'YYYY-MM'
     * @returns {Object} - Resumo mensal
     */
    getResumoMensal: function(receitas, despesas, mesReferencia) {
        var totais = this.calcularTotais(receitas, despesas, mesReferencia);
        var categorias = this.agruparDespesasPorCategoria(totais.despesasFiltradas);
        var receitasPorTipo = this.agruparReceitasPorTipo(totais.receitasFiltradas);
        
        return {
            mes: mesReferencia,
            totalReceitas: totais.totalReceitas,
            totalReceitasRecebidas: totais.totalReceitasRecebidas,
            totalDespesas: totais.totalDespesas,
            totalDespesasPagas: totais.totalDespesasPagas,
            resultadoLiquido: totais.resultadoLiquido,
            margem: totais.margem,
            countReceitas: totais.countReceitas,
            countDespesas: totais.countDespesas,
            receitasPorTipo: receitasPorTipo,
            categoriasDespesas: categorias,
            status: totais.resultadoLiquido >= 0 ? 'POSITIVO' : 'NEGATIVO'
        };
    }
};

// Expor globalmente
window.UtilsFinance = UtilsFinance;
