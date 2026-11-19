// =============================================
// MODAIS - managerJARDINSCare
// Todos os modais do sistema
// Versão 3.0 - Com Parâmetros Consolidados
// =============================================

// =============================================
// GARANTIR QUE AS FUNÇÕES ESTEJAM DEFINIDAS
// =============================================
if (typeof managerApp === 'undefined') {
    console.error('❌ managerApp não definido!');
}

// =============================================
// MODAL PADRÃO
// =============================================
managerApp.fecharModal = function() {
    document.getElementById('modalOverlay').style.display = 'none';
};

// =============================================
// CARREGAR METAS (SUPABASE + FALLBACK LOCAL)
// =============================================
managerApp.carregarMetas = function() {
    var self = this;
    
    // 🔥 CARREGAR DO LOCALSTORAGE PRIMEIRO (cache instantâneo)
    var metasLocais = localStorage.getItem('manager_metas');
    if (metasLocais) {
        try {
            var metas = JSON.parse(metasLocais);
            this.metas = { ...this.metas, ...metas };
            
            // 🔥 Remover despesasOperacionais das metas (agora é parâmetro operacional)
            delete this.metas.despesasOperacionais;
            
            console.log('✅ Metas carregadas do localStorage (cache):', this.metas);
        } catch(e) {
            console.error('Erro ao carregar metas do localStorage:', e);
        }
    }
    
    // 🔥 BUSCAR DO SUPABASE (fonte de verdade)
    if (typeof API !== 'undefined' && API.getMetas) {
        API.getMetas()
            .then(function(data) {
                if (data && data.result === 'success' && data.metas) {
                    // Mesclar com as metas atuais
                    self.metas = { ...self.metas, ...data.metas };
                    
                    // 🔥 Remover despesasOperacionais das metas (agora é parâmetro operacional)
                    delete self.metas.despesasOperacionais;
                    
                    // Salvar no localStorage (cache)
                    localStorage.setItem('manager_metas', JSON.stringify(self.metas));
                    
                    console.log('✅ Metas sincronizadas do Supabase:', self.metas);
                    
                    // 🔥 RE-RENDERIZAR CARDS DE METAS SE O DASHBOARD ESTIVER ATIVO
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
    
    // 🔥 CARREGAR CENÁRIOS SALVOS (Supabase + fallback)
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
};

// =============================================
// SALVAR METAS (SUPABASE + CACHE LOCAL)
// =============================================
managerApp.salvarMetas = function() {
    var self = this;
    
    // 🔥 1. SALVAR NO LOCALSTORAGE (cache imediato)
    localStorage.setItem('manager_metas', JSON.stringify(this.metas));
    console.log('✅ Metas salvas no localStorage (cache):', this.metas);
    
    // 🔥 2. SALVAR NO SUPABASE (fonte de verdade)
    if (typeof API !== 'undefined' && API.salvarMetas) {
        Utils.showLoading('Salvando metas...');
        
        API.salvarMetas(this.metas)
            .then(function(data) {
                Utils.hideLoading();
                
                if (data && data.result === 'success') {
                    Utils.showToast('✅ Metas salvas e sincronizadas!');
                    console.log('✅ Metas salvas no Supabase:', data);
                    
                    var mesReferencia = self.getMesReferencia();
                    console.log('📅 Recarregando metas para o mês:', mesReferencia);
                    
                    self.carregarMetasPorMes(mesReferencia);
                    
                    var fluxoPage = document.getElementById('page-fluxo-caixa');
                    if (fluxoPage && fluxoPage.classList.contains('active')) {
                        self.carregarFluxoCaixa();
                    }
                    
                    var dashPage = document.getElementById('page-dashboard');
                    if (dashPage && dashPage.classList.contains('active')) {
                        if (typeof self.carregarMetasPorMes === 'function') {
                            self.carregarMetasPorMes(mesReferencia);
                        }
                    }
                    
                    self.fecharModalMetas();
                } else {
                    console.warn('⚠️ Supabase não confirmou o salvamento. Mantendo apenas local.');
                    Utils.showToast('⚠️ Salvo localmente. Sincronização pendente.', 'warning');
                    
                    var mesReferencia = self.getMesReferencia();
                    self.carregarMetasPorMes(mesReferencia);
                    self.fecharModalMetas();
                }
            })
            .catch(function(error) {
                Utils.hideLoading();
                console.warn('⚠️ Erro ao salvar no Supabase. Mantendo apenas local:', error);
                Utils.showToast('⚠️ Salvo localmente. Sincronização pendente.', 'warning');
                
                var mesReferencia = self.getMesReferencia();
                self.carregarMetasPorMes(mesReferencia);
                self.fecharModalMetas();
            });
    } else {
        // Fallback: sem API disponível
        Utils.showToast('Metas salvas localmente!');
        console.warn('⚠️ API.salvarMetas não disponível. Salvamento apenas local.');
        
        var mesReferencia = this.getMesReferencia();
        this.carregarMetasPorMes(mesReferencia);
        
        var fluxoPage = document.getElementById('page-fluxo-caixa');
        if (fluxoPage && fluxoPage.classList.contains('active')) {
            this.carregarFluxoCaixa();
        }
        
        this.fecharModalMetas();
    }
};
// =============================================
// MODAL DE CONFIGURAÇÃO DE METAS
// =============================================
managerApp.abrirModalConfigurarMetas = function() {
    var modal = document.getElementById('modalConfigurarMetas');
    document.getElementById('modalMetaFaturamento').value = Utils.formatCurrency(this.metas.faturamento);
    document.getElementById('modalMetaMargem').value = this.metas.margem;
    document.getElementById('modalMetaLeads').value = this.metas.leads;
    document.getElementById('modalMetaConversao').value = this.metas.conversao;
    document.getElementById('modalMetaDiasAlerta').value = this.metas.diasAlerta || 15;
    
    document.getElementById('modalMetaChurn').value = this.metas.churnMensal || 0.33;
    document.getElementById('modalMetaTicketMedio').value = Utils.formatCurrency(this.metas.ticketMedioNovoLead || 5000);
    
    // 🔥 O campo de Despesas Operacionais foi REMOVIDO deste modal
    // Agora fica no modal de Parâmetros Operacionais (Inteligência de Negócio)
    
    modal.style.display = 'flex';
    
    var currencyInputs = [
        document.getElementById('modalMetaFaturamento'),
        document.getElementById('modalMetaTicketMedio')
    ];
    for (var i = 0; i < currencyInputs.length; i++) {
        if (currencyInputs[i]) Utils.applyCurrencyMask(currencyInputs[i]);
    }
    
    var self = this;
    document.getElementById('btnSalvarMetas').onclick = function() {
        var faturamentoVal = Utils.parseCurrencyToNumber(document.getElementById('modalMetaFaturamento').value);
        var margemVal = parseFloat(document.getElementById('modalMetaMargem').value);
        var leadsVal = parseInt(document.getElementById('modalMetaLeads').value);
        var conversaoVal = parseFloat(document.getElementById('modalMetaConversao').value);
        var diasAlertaVal = parseInt(document.getElementById('modalMetaDiasAlerta').value) || 15;
        var churnVal = parseFloat(document.getElementById('modalMetaChurn').value) || 0;
        var ticketVal = Utils.parseCurrencyToNumber(document.getElementById('modalMetaTicketMedio').value);
        
        if (isNaN(faturamentoVal)) faturamentoVal = 50000;
        if (isNaN(margemVal)) margemVal = 25;
        if (isNaN(leadsVal)) leadsVal = 30;
        if (isNaN(conversaoVal)) conversaoVal = 5;
        if (diasAlertaVal < 1) diasAlertaVal = 1;
        if (diasAlertaVal > 60) diasAlertaVal = 60;
        if (isNaN(churnVal)) churnVal = 0.33;
        if (churnVal < 0) churnVal = 0;
        if (isNaN(ticketVal)) ticketVal = 5000;
        
        self.metas = {
            faturamento: faturamentoVal,
            margem: margemVal,
            leads: leadsVal,
            conversao: conversaoVal,
            diasAlerta: diasAlertaVal,
            churnMensal: churnVal,
            ticketMedioNovoLead: ticketVal
            // 🔥 despesasOperacionais REMOVIDO (agora é parâmetro operacional)
        };
        self.salvarMetas();
        self.fecharModalMetas();
    };
};

managerApp.fecharModalMetas = function() {
    document.getElementById('modalConfigurarMetas').style.display = 'none';
};

// =============================================
// ATUALIZAR CARDS DE METAS
// =============================================
managerApp.atualizarCardsMetas = function() {
    var self = this;
    var hoje = new Date();
    var mesAtual = hoje.getMonth() + 1;
    var anoAtual = hoje.getFullYear();
    var mesStr = String(mesAtual).padStart(2, '0');
    
    API.listarReceitas()
        .then(function(data) {
            var faturamentoRealizado = 0;
            if (data.receitas) {
                for (var i = 0; i < data.receitas.length; i++) {
                    var r = data.receitas[i];
                    if (r.data && r.status === 'Recebido') {
                        var dataParts = r.data.split('T')[0].split('-');
                        if (dataParts[0] == anoAtual && dataParts[1] == mesStr) {
                            faturamentoRealizado += parseFloat(r.valor) || 0;
                        }
                    }
                }
            }
            var percFaturamento = (faturamentoRealizado / self.metas.faturamento) * 100;
            if (percFaturamento > 100) percFaturamento = 100;
            document.getElementById('metaFaturamentoValor').innerHTML = Utils.formatCurrency(self.metas.faturamento);
            document.getElementById('metaFaturamentoProgress').style.width = percFaturamento + '%';
            var statusFaturamento = document.getElementById('metaFaturamentoStatus');
            statusFaturamento.innerHTML = 'Realizado: ' + Utils.formatCurrency(faturamentoRealizado) + ' (' + percFaturamento.toFixed(0) + '%)';
            if (percFaturamento >= 100) {
                statusFaturamento.className = 'meta-achieved positive';
            } else if (percFaturamento >= 70) {
                statusFaturamento.className = 'meta-achieved warning';
            } else {
                statusFaturamento.className = 'meta-achieved danger';
            }
        })
        .catch(function(error) {
            console.error('Erro ao carregar faturamento para metas:', error);
        });
    
    API.listarReceitas()
        .then(function(dataReceitas) {
            var receitasMes = 0;
            if (dataReceitas.receitas) {
                for (var i = 0; i < dataReceitas.receitas.length; i++) {
                    var r = dataReceitas.receitas[i];
                    if (r.data && r.status === 'Recebido') {
                        var dataParts = r.data.split('T')[0].split('-');
                        if (dataParts[0] == anoAtual && dataParts[1] == mesStr) {
                            receitasMes += parseFloat(r.valor) || 0;
                        }
                    }
                }
            }
            return API.listarDespesas()
                .then(function(dataDespesas) {
                    var despesasMes = 0;
                    if (dataDespesas.despesas) {
                        for (var i = 0; i < dataDespesas.despesas.length; i++) {
                            var d = dataDespesas.despesas[i];
                            if (d.data && d.status === 'Pago') {
                                var dataParts = d.data.split('-');
                                if (dataParts[0] == anoAtual && dataParts[1] == mesStr) {
                                    despesasMes += parseFloat(d.valor) || 0;
                                }
                            }
                        }
                    }
                    var margemRealizada = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes * 100) : 0;
                    var percMargem = (margemRealizada / self.metas.margem) * 100;
                    if (percMargem > 100) percMargem = 100;
                    document.getElementById('metaMargemValor').innerHTML = self.metas.margem + '%';
                    document.getElementById('metaMargemProgress').style.width = percMargem + '%';
                    var statusMargem = document.getElementById('metaMargemStatus');
                    statusMargem.innerHTML = 'Realizado: ' + margemRealizada.toFixed(1) + '% (' + percMargem.toFixed(0) + '% da meta)';
                    if (margemRealizada >= self.metas.margem) {
                        statusMargem.className = 'meta-achieved positive';
                    } else if (margemRealizada >= self.metas.margem * 0.7) {
                        statusMargem.className = 'meta-achieved warning';
                    } else {
                        statusMargem.className = 'meta-achieved danger';
                    }
                });
        })
        .catch(function(error) {
            console.error('Erro ao carregar margem para metas:', error);
        });
    
    API.listarLeads()
        .then(function(data) {
            var leadsMes = 0;
            if (data.leads) {
                for (var i = 0; i < data.leads.length; i++) {
                    var l = data.leads[i];
                    var dataCadastro = l.dataCadastro || l.timestamp;
                    if (dataCadastro) {
                        var dataLead = new Date(dataCadastro);
                        if (!isNaN(dataLead.getTime()) && 
                            dataLead.getFullYear() == anoAtual && 
                            (dataLead.getMonth() + 1) == mesAtual) {
                            leadsMes++;
                        }
                    }
                }
            }
            var percLeads = (leadsMes / self.metas.leads) * 100;
            if (percLeads > 100) percLeads = 100;
            document.getElementById('metaLeadsValor').innerHTML = self.metas.leads;
            document.getElementById('metaLeadsProgress').style.width = percLeads + '%';
            var statusLeads = document.getElementById('metaLeadsStatus');
            statusLeads.innerHTML = 'Realizado: ' + leadsMes + ' (' + percLeads.toFixed(0) + '% da meta)';
            if (leadsMes >= self.metas.leads) {
                statusLeads.className = 'meta-achieved positive';
            } else if (leadsMes >= self.metas.leads * 0.7) {
                statusLeads.className = 'meta-achieved warning';
            } else {
                statusLeads.className = 'meta-achieved danger';
            }
        })
        .catch(function(error) {
            console.error('Erro ao carregar leads para metas:', error);
        });
    
    API.listarLeads()
        .then(function(data) {
            var totalConvertidos = 0;
            if (data.leads) {
                for (var i = 0; i < data.leads.length; i++) {
                    if (data.leads[i].status === '✅ Fechado (Contrato)') {
                        totalConvertidos++;
                    }
                }
            }
            
            var conversoesNecessarias = (self.metas.leads * self.metas.conversao) / 100;
            var progresso = conversoesNecessarias > 0 ? (totalConvertidos / conversoesNecessarias) * 100 : 0;
            if (progresso > 100) progresso = 100;
            
            document.getElementById('metaConversaoValor').innerHTML = self.metas.conversao + '%';
            document.getElementById('metaConversaoProgress').style.width = progresso + '%';
            
            var statusConversao = document.getElementById('metaConversaoStatus');
            statusConversao.innerHTML = 'Realizado: ' + totalConvertidos + ' conversões (' + 
                progresso.toFixed(0) + '% da meta de ' + conversoesNecessarias.toFixed(1) + ')';
            
            if (totalConvertidos >= conversoesNecessarias) {
                statusConversao.className = 'meta-achieved positive';
            } else if (totalConvertidos >= conversoesNecessarias * 0.7) {
                statusConversao.className = 'meta-achieved warning';
            } else {
                statusConversao.className = 'meta-achieved danger';
            }
        })
        .catch(function(error) {
            console.error('Erro ao carregar conversão para metas:', error);
        });
};

// =============================================
// GRUPOS WHATSAPP
// =============================================
managerApp.carregarGruposWhatsApp = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        API.getGruposWhatsApp()
            .then(function(data) {
                if (data.result === 'success' && data.grupos) {
                    self.gruposWhatsApp = data.grupos;
                    console.log('✅ Grupos WhatsApp carregados:', self.gruposWhatsApp.length);
                    resolve(self.gruposWhatsApp);
                } else {
                    self.gruposWhatsApp = [];
                    resolve([]);
                }
            })
            .catch(function(error) {
                console.error('Erro ao carregar grupos WhatsApp:', error);
                self.gruposWhatsApp = [];
                resolve([]);
            });
    });
};

managerApp.popularSelectGruposWhatsApp = function() {
    var select = document.getElementById('selectGrupoWhatsApp');
    if (!select) return;
    
    var options = '<option value="">Selecione um grupo...</option>';
    for (var i = 0; i < this.gruposWhatsApp.length; i++) {
        var grupo = this.gruposWhatsApp[i];
        var nomeExibicao = grupo.nome;
        if (grupo.tipo && grupo.tipo !== '') {
            nomeExibicao = grupo.nome + ' (' + grupo.tipo + ')';
        }
        options += '<option value="' + (grupo.id || '') + '" data-nome="' + grupo.nome + '">' + nomeExibicao + '</option>';
    }
    select.innerHTML = options;
};

managerApp.carregarContatoFixo = function() {
    var contatoFixo = localStorage.getItem('manager_contato_fixo_whatsapp');
    if (contatoFixo) {
        var input = document.getElementById('contatoFixoNumero');
        if (input) input.value = contatoFixo;
    }
    return contatoFixo || '';
};

managerApp.salvarContatoFixo = function() {
    var input = document.getElementById('contatoFixoNumero');
    if (!input) return;
    
    var numero = input.value.trim();
    if (!numero) {
        Utils.showToast('Digite um número de telefone', 'warning');
        return;
    }
    
    localStorage.setItem('manager_contato_fixo_whatsapp', numero);
    Utils.showToast('Contato fixo salvo com sucesso!');
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
// =============================================
// MODAL DE SELEÇÃO DE PERSONAL CARE
// =============================================
managerApp.exibirModalSelecaoPersonal = function(assistido, dadosAssistido, personalCaresAtivos) {
    var modal = document.getElementById('modalOverlay');
    
    document.getElementById('modalTitle').innerHTML = '👤 Selecionar Personal Care para ' + assistido;
    
    var responsaveis = dadosAssistido.responsaveis || 'Não informado';
    var dadosFamiliar = Utils.extrairDadosFamiliar(responsaveis);
    var nomeFamiliar = dadosFamiliar.nome || 'Familiar';
    var telefoneFamiliar = dadosFamiliar.telefone || '';
    
    var html = '';
    
    html += '<div style="margin-bottom: 16px; padding: 12px; background: var(--gray-50); border-radius: 8px;">';
    html += '  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">';
    html += '    <div>';
    html += '      <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Assistido</div>';
    html += '      <div style="font-size: 14px; font-weight: 700; color: var(--gray-800);">' + assistido + '</div>';
    html += '    </div>';
    html += '    <div>';
    html += '      <div style="font-size: 10px; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Familiar Responsável</div>';
    html += '      <div style="font-size: 14px; font-weight: 700; color: var(--gray-800);">' + nomeFamiliar + '</div>';
    html += '      <div style="font-size: 12px; color: var(--gray-500);">📱 ' + (telefoneFamiliar || 'Sem telefone cadastrado') + '</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="form-group" style="margin-bottom: 16px;">';
    html += '  <label style="font-weight: 600; font-size: 13px;">Selecione o Personal Care</label>';
    html += '  <select class="form-select" id="selectPersonalCareModal" style="height: 44px; font-size: 14px;">';
    html += '    <option value="">-- Selecione um Personal Care --</option>';
    
    for (var i = 0; i < personalCaresAtivos.length; i++) {
        html += '    <option value="' + personalCaresAtivos[i] + '">' + personalCaresAtivos[i] + '</option>';
    }
    
    html += '  </select>';
    html += '</div>';
    
    html += '<div id="cartaoPersonalContainer" style="display: none; margin-top: 16px;"></div>';
    
    html += '<div style="display: flex; gap: 12px; margin-top: 16px; width: 100%;">';
    html += '  <button class="btn btn-whatsapp" id="btnEnviarMensagemPersonal" style="flex: 1; text-align: center; justify-content: center;" disabled>📱 Enviar Mensagem</button>';
    html += '  <button class="btn btn-primary" id="btnGerarCartaoPersonal" style="flex: 1; text-align: center; justify-content: center;" disabled>🖼️ Gerar Cartão</button>';
    html += '  <button class="btn btn-secondary" onclick="managerApp.fecharModal()" style="flex: 1; text-align: center; justify-content: center;">Fechar</button>';
    html += '</div>';
    
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML = '';
    
    modal.style.display = 'flex';
    
    this._configurarEventosSelecaoPersonal(assistido, dadosAssistido, telefoneFamiliar);
};

// =============================================
// CONFIGURAR EVENTOS DO MODAL PERSONAL CARE
// =============================================
managerApp._configurarEventosSelecaoPersonal = function(assistido, dadosAssistido, telefoneFamiliar) {
    var self = this;
    var select = document.getElementById('selectPersonalCareModal');
    var container = document.getElementById('cartaoPersonalContainer');
    var btnMensagem = document.getElementById('btnEnviarMensagemPersonal');
    var btnCartao = document.getElementById('btnGerarCartaoPersonal');
    var dadosPersonalAtual = null;
    
    if (!select) return;
    
    select.addEventListener('change', function() {
        var nomePersonal = this.value;
        
        if (!nomePersonal) {
            container.style.display = 'none';
            btnMensagem.disabled = true;
            btnCartao.disabled = true;
            dadosPersonalAtual = null;
            return;
        }
        
        Utils.showLoading('Carregando dados do Personal Care...');
        
        API.getDadosPersonal(nomePersonal)
            .then(function(data) {
                Utils.hideLoading();
                
                if (data.result === 'success' && data.dados) {
                    var observacoes = data.dados.observacoes || '';
                    var cac = '';
                    if (observacoes) {
                        var linhas = String(observacoes).split('\n');
                        if (linhas.length > 0) {
                            cac = linhas[0].trim();
                        }
                    }
                    
                    dadosPersonalAtual = {
                        nome: data.dados.nome || '',
                        sobrenome: data.dados.sobrenome || '',
                        celular: data.dados.celular || '',
                        cpf: data.dados.cpf || '',
                        conselho: data.dados.conselho || '',
                        atividade: data.dados.atividade || 'Cuidador(a)',
                        status: data.dados.status || '',
                        regiao: data.dados.regiao || '',
                        cac: cac
                    };
                    
                    self._renderizarCartaoPersonal(assistido, dadosPersonalAtual, container);
                    
                    btnMensagem.disabled = false;
                    btnCartao.disabled = false;
                    
                    container.style.display = 'block';
                } else {
                    Utils.showToast('❌ Erro ao carregar dados do Personal Care', 'error');
                }
            })
            .catch(function(error) {
                Utils.hideLoading();
                Utils.showToast('❌ Erro: ' + error.message, 'error');
            });
    });
    
    btnMensagem.addEventListener('click', function() {
        if (!dadosPersonalAtual) {
            Utils.showToast('⚠️ Selecione um Personal Care primeiro', 'warning');
            return;
        }
        
        if (!telefoneFamiliar) {
            Utils.showToast('⚠️ Nenhum telefone cadastrado para este assistido', 'warning');
            return;
        }
        
        self._enviarMensagemPersonal(assistido, dadosPersonalAtual, telefoneFamiliar);
    });
    
    btnCartao.addEventListener('click', function() {
        if (!dadosPersonalAtual) {
            Utils.showToast('⚠️ Selecione um Personal Care primeiro', 'warning');
            return;
        }
        
        self.gerarImagemCartaoPersonal(assistido, dadosPersonalAtual);
    });
};

// =============================================
// FUNÇÕES DE MÁSCARA SEGURAS
// =============================================
function _mascararCPF(cpf) {
    if (!cpf) return '***.***.***-**';
    var cpfStr = String(cpf).replace(/\D/g, '');
    if (cpfStr.length >= 11) {
        var primeiros = cpfStr.slice(0, 4);
        return primeiros.slice(0, 3) + '.' + primeiros.slice(3) + '**.***-**';
    }
    return '***.***.***-**';
}

function _mascararCelular(celular) {
    if (!celular) return 'Não informado';
    var celStr = String(celular).replace(/\D/g, '');
    if (celStr.length === 11) {
        return '(' + celStr.slice(0, 2) + ') ' + celStr.slice(2, 7) + '-' + celStr.slice(7);
    } else if (celStr.length === 10) {
        return '(' + celStr.slice(0, 2) + ') ' + celStr.slice(2, 6) + '-' + celStr.slice(6);
    } else if (celStr.length > 0) {
        return String(celular);
    }
    return 'Não informado';
}

// =============================================
// RENDERIZAR CARTÃO DO PERSONAL CARE
// =============================================
managerApp._renderizarCartaoPersonal = function(assistido, dadosPersonal, container) {
    if (!container) return;
    
    var nomeCompleto = (dadosPersonal.nome || '') + (dadosPersonal.sobrenome ? ' ' + dadosPersonal.sobrenome : '');
    var cpfMask = _mascararCPF(dadosPersonal.cpf);
    var celularMask = _mascararCelular(dadosPersonal.celular);
    var cac = dadosPersonal.cac || '';
    
    var html = '';
    
    html += '<div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">';
    html += '  <div style="text-align: center; background: white; border-radius: 12px; padding: 20px;">';
    html += '    <div style="margin-bottom: 12px;">';
    html += '      <img src="https://i.ibb.co/HLR2m0Bz/JARDINSCare-Logo-Fundo-Transparente.png" alt="JARDINSCare" style="height: 40px; width: auto;">';
    html += '    </div>';
    html += '    <div style="font-size: 11px; color: #f59e0b; font-weight: 600; letter-spacing: 1.5px; margin-bottom: 6px;">👤 PROFISSIONAL RESPONSÁVEL</div>';
    html += '    <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #f59e0b, #f97316); margin: 0 auto 12px auto; border-radius: 2px;"></div>';
    html += '    <div style="text-align: left; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 12px;">';
    html += '      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">';
    html += '        <span style="color: #6b7280; font-size: 12px;">Nome</span>';
    html += '        <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + (nomeCompleto || 'Não informado') + '</span>';
    html += '      </div>';
    
    if (dadosPersonal.celular) {
        html += '      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">';
        html += '        <span style="color: #6b7280; font-size: 12px;">Celular</span>';
        html += '        <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + celularMask + '</span>';
        html += '      </div>';
    }
    
    if (dadosPersonal.atividade) {
        html += '      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">';
        html += '        <span style="color: #6b7280; font-size: 12px;">Função</span>';
        html += '        <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + dadosPersonal.atividade + '</span>';
        html += '      </div>';
    }
    
    if (dadosPersonal.cpf) {
        html += '      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">';
        html += '        <span style="color: #6b7280; font-size: 12px;">CPF</span>';
        html += '        <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + cpfMask + '</span>';
        html += '      </div>';
    }
    
    if (dadosPersonal.conselho) {
        html += '      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">';
        html += '        <span style="color: #6b7280; font-size: 12px;">Registro</span>';
        html += '        <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + dadosPersonal.conselho + '</span>';
        html += '      </div>';
    }
    
    if (cac) {
        html += '      <div style="display: flex; justify-content: space-between; padding: 4px 0;">';
        html += '        <span style="color: #6b7280; font-size: 12px;">CAC</span>';
        html += '        <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + cac + '</span>';
        html += '      </div>';
    }
    
    html += '    </div>';
    html += '    <div style="font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 8px; border-radius: 6px; margin-bottom: 12px;">';
    html += '      Assistido: <strong style="color: #1f2937;">' + assistido + '</strong>';
    html += '    </div>';
    html += '    <div style="font-size: 12px; color: #6b7280; line-height: 1.5; text-align: center; padding: 8px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 6px;">';
    html += '      🌟 Este profissional está escalado para cuidar do seu familiar com dedicação e excelência.';
    html += '    </div>';
    html += '    <div style="margin-top: 12px; text-align: center; font-size: 11px; border-top: 1px solid #f3f4f6; padding-top: 10px;">';
    html += '      <span style="color: #ffffff; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 4px 14px; border-radius: 12px; display: inline-block; font-weight: 600;">';
    html += '        🌿 JARDINSCare - Cuidando de quem você ama';
    html += '      </span>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    
    container.innerHTML = html;
};

// =============================================
// ENVIAR MENSAGEM DE TEXTO DO PERSONAL CARE
// =============================================
managerApp._enviarMensagemPersonal = function(assistido, dadosPersonal, telefoneFamiliar) {
    var nomeCompleto = (dadosPersonal.nome || '') + (dadosPersonal.sobrenome ? ' ' + dadosPersonal.sobrenome : '');
    var cpfMask = _mascararCPF(dadosPersonal.cpf);
    var celularMask = _mascararCelular(dadosPersonal.celular);
    var cac = dadosPersonal.cac || '';
    
    var mensagem = '👤 *Informações do Personal Care*\n\n';
    mensagem += 'Prezado(a) Familiar,\n\n';
    mensagem += 'Segue abaixo as informações do profissional que estará cuidando do(a) *' + assistido + '*:\n\n';
    mensagem += '📋 *Dados do Profissional*\n';
    mensagem += '┌─────────────────────────\n';
    
    if (nomeCompleto) mensagem += '│ Nome: ' + nomeCompleto + '\n';
    if (dadosPersonal.celular) mensagem += '│ Celular: ' + celularMask + '\n';
    if (dadosPersonal.atividade) mensagem += '│ Função: ' + dadosPersonal.atividade + '\n';
    if (dadosPersonal.cpf) mensagem += '│ CPF: ' + cpfMask + '\n';
    if (dadosPersonal.conselho) mensagem += '│ Registro: ' + dadosPersonal.conselho + '\n';
    if (cac) mensagem += '│ CAC: ' + cac + '\n';
    
    mensagem += '└─────────────────────────\n\n';
    mensagem += '🌟 Este profissional está escalado para cuidar do seu familiar com dedicação e excelência.\n\n';
    mensagem += 'Qualquer dúvida, estamos à disposição.\n\n';
    mensagem += '🌿 *JARDINSCare* - Cuidando de quem você ama';
    
    var mensagemCodificada = encodeURIComponent(mensagem);
    
    var numeroLimpo = telefoneFamiliar.replace(/\D/g, '');
    if (numeroLimpo.length >= 10) {
        var numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;
        var link = 'https://wa.me/' + numeroCompleto + '?text=' + mensagemCodificada;
        window.open(link, '_blank');
        Utils.showToast('📱 Abrindo WhatsApp para o familiar');
        managerApp.fecharModal();
    } else {
        Utils.showToast('⚠️ Número inválido', 'warning');
    }
};

// =============================================
// GERAR IMAGEM DO CARTÃO DO PERSONAL CARE
// =============================================
managerApp.gerarImagemCartaoPersonal = function(assistido, dadosPersonal) {
    var self = this;
    
    if (typeof html2canvas === 'undefined') {
        Utils.showToast('⚠️ Aguarde, carregando gerador de imagens...', 'warning');
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = function() {
            self.gerarImagemCartaoPersonal(assistido, dadosPersonal);
        };
        document.head.appendChild(script);
        return;
    }
    
    var container = document.createElement('div');
    container.id = 'cartaoPersonalPreview';
    container.style.cssText = [
        'position: fixed',
        'left: -9999px',
        'top: 0',
        'z-index: -1',
        'width: 360px',
        'background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        'border-radius: 16px',
        'padding: 24px',
        'box-shadow: 0 20px 60px rgba(0,0,0,0.3)',
        'font-family: "Inter", sans-serif'
    ].join(';');
    
    var nomeCompleto = (dadosPersonal.nome || '') + (dadosPersonal.sobrenome ? ' ' + dadosPersonal.sobrenome : '');
    var cpfMask = _mascararCPF(dadosPersonal.cpf);
    var celularMask = _mascararCelular(dadosPersonal.celular);
    var cac = dadosPersonal.cac || '';
    
    container.innerHTML = [
        '<div style="text-align: center; background: white; border-radius: 12px; padding: 24px 20px;">',
        '  <div style="margin-bottom: 12px;">',
        '    <img src="https://i.ibb.co/HLR2m0Bz/JARDINSCare-Logo-Fundo-Transparente.png" alt="JARDINSCare" style="height: 40px; width: auto;">',
        '  </div>',
        '  <div style="font-size: 11px; color: #f59e0b; font-weight: 600; letter-spacing: 1.5px; margin-bottom: 6px;">👤 PROFISSIONAL RESPONSÁVEL</div>',
        '  <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #f59e0b, #f97316); margin: 0 auto 12px auto; border-radius: 2px;"></div>',
        '  <div style="text-align: left; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 12px;">',
        '    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">',
        '      <span style="color: #6b7280; font-size: 12px;">Nome</span>',
        '      <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + (nomeCompleto || 'Não informado') + '</span>',
        '    </div>'
    ].join('');
    
    if (dadosPersonal.celular) {
        container.innerHTML += [
            '    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">',
            '      <span style="color: #6b7280; font-size: 12px;">Celular</span>',
            '      <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + celularMask + '</span>',
            '    </div>'
        ].join('');
    }
    
    if (dadosPersonal.atividade) {
        container.innerHTML += [
            '    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">',
            '      <span style="color: #6b7280; font-size: 12px;">Função</span>',
            '      <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + dadosPersonal.atividade + '</span>',
            '    </div>'
        ].join('');
    }
    
    if (dadosPersonal.cpf) {
        container.innerHTML += [
            '    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">',
            '      <span style="color: #6b7280; font-size: 12px;">CPF</span>',
            '      <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + cpfMask + '</span>',
            '    </div>'
        ].join('');
    }
    
    if (dadosPersonal.conselho) {
        container.innerHTML += [
            '    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">',
            '      <span style="color: #6b7280; font-size: 12px;">Registro</span>',
            '      <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + dadosPersonal.conselho + '</span>',
            '    </div>'
        ].join('');
    }
    
    if (cac) {
        container.innerHTML += [
            '    <div style="display: flex; justify-content: space-between; padding: 4px 0;">',
            '      <span style="color: #6b7280; font-size: 12px;">CAC</span>',
            '      <span style="font-weight: 600; font-size: 13px; color: #1f2937;">' + cac + '</span>',
            '    </div>'
        ].join('');
    }
    
    container.innerHTML += [
        '  </div>',
        '  <div style="font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 8px; border-radius: 6px; margin-bottom: 12px;">',
        '    Assistido: <strong style="color: #1f2937;">' + assistido + '</strong>',
        '  </div>',
        '  <div style="font-size: 12px; color: #6b7280; line-height: 1.5; text-align: center; padding: 8px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 6px;">',
        '    🌟 Este profissional está escalado para cuidar do seu familiar com dedicação e excelência.',
        '  </div>',
        '  <div style="margin-top: 12px; text-align: center; font-size: 11px; border-top: 1px solid #f3f4f6; padding-top: 10px;">',
        '    <span style="color: #ffffff; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 4px 14px; border-radius: 12px; display: inline-block; font-weight: 600;">',
        '      🌿 JARDINSCare - Cuidando de quem você ama',
        '    </span>',
        '  </div>',
        '</div>'
    ].join('');
    
    document.body.appendChild(container);
    
    Utils.showLoading('Gerando cartão...');
    
    setTimeout(function() {
        html2canvas(container, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: 360,
            height: container.scrollHeight || 480
        }).then(function(canvas) {
            Utils.hideLoading();
            document.body.removeChild(container);
            
            var imageData = canvas.toDataURL('image/png');
            self.abrirModalVisualizarImagemPersonal(imageData, assistido, dadosPersonal);
        }).catch(function(error) {
            Utils.hideLoading();
            document.body.removeChild(container);
            console.error('❌ Erro ao gerar imagem:', error);
            Utils.showToast('❌ Erro ao gerar imagem. Tente novamente.', 'error');
        });
    }, 500);
};

// =============================================
// ABRIR MODAL DE VISUALIZAÇÃO DA IMAGEM DO PERSONAL CARE
// =============================================
managerApp.abrirModalVisualizarImagemPersonal = function(imageData, assistido, dadosPersonal) {
    var modal = document.getElementById('modalVisualizarImagemPersonal');
    
    if (!modal) {
        console.error('❌ Modal modalVisualizarImagemPersonal não encontrado no HTML');
        Utils.showToast('❌ Erro: Modal não encontrado', 'error');
        return;
    }
    
    document.getElementById('imagemPersonalPreview').src = imageData;
    modal.style.display = 'flex';
    
    var self = this;
    
    var btnEnviar = document.getElementById('btnEnviarImagemPersonal');
    if (btnEnviar) {
        var novoBtnEnviar = btnEnviar.cloneNode(true);
        btnEnviar.parentNode.replaceChild(novoBtnEnviar, btnEnviar);
        novoBtnEnviar.addEventListener('click', function() {
            self._enviarImagemPersonal(imageData, assistido, dadosPersonal);
        });
    }
    
    var btnCopiar = document.getElementById('btnCopiarImagemPersonal');
    if (btnCopiar) {
        var novoBtnCopiar = btnCopiar.cloneNode(true);
        btnCopiar.parentNode.replaceChild(novoBtnCopiar, btnCopiar);
        novoBtnCopiar.addEventListener('click', function() {
            self._copiarImagemPersonal(imageData);
        });
    }
    
    var btnBaixar = document.getElementById('btnBaixarImagemPersonal');
    if (btnBaixar) {
        var novoBtnBaixar = btnBaixar.cloneNode(true);
        btnBaixar.parentNode.replaceChild(novoBtnBaixar, btnBaixar);
        novoBtnBaixar.addEventListener('click', function() {
            var link = document.createElement('a');
            link.download = 'personal_care_' + (dadosPersonal.nome || 'profissional') + '.png';
            link.href = imageData;
            link.click();
            Utils.showToast('💾 Imagem baixada com sucesso!');
        });
    }
    
    document.getElementById('fecharModalImagemPersonal').addEventListener('click', function() {
        modal.style.display = 'none';
    });
};

// =============================================
// COPIAR IMAGEM DO PERSONAL CARE
// =============================================
managerApp._copiarImagemPersonal = function(imageData) {
    var statusEl = document.getElementById('statusCopiarImagemPersonal');
    
    if (navigator.clipboard && navigator.clipboard.write) {
        fetch(imageData)
            .then(function(res) { return res.blob(); })
            .then(function(blob) {
                var clipboardItem = new ClipboardItem({
                    'image/png': blob
                });
                
                navigator.clipboard.write([clipboardItem]).then(function() {
                    if (statusEl) {
                        statusEl.innerHTML = '✅ Imagem copiada! Basta dar Ctrl+V no WhatsApp';
                        statusEl.style.color = '#10b981';
                    }
                    Utils.showToast('✅ Imagem copiada! Basta dar Ctrl+V no WhatsApp', 'success');
                }).catch(function(err) {
                    console.warn('Erro ao copiar:', err);
                    if (statusEl) {
                        statusEl.innerHTML = '⚠️ Não foi possível copiar automaticamente. Use o botão direito.';
                        statusEl.style.color = '#f59e0b';
                    }
                    Utils.showToast('⚠️ Clique com botão direito e "Copiar imagem"', 'warning');
                });
            })
            .catch(function(err) {
                console.warn('Erro ao converter imagem:', err);
                if (statusEl) {
                    statusEl.innerHTML = '⚠️ Clique com botão direito e selecione "Copiar imagem"';
                    statusEl.style.color = '#f59e0b';
                }
            });
    } else {
        if (statusEl) {
            statusEl.innerHTML = '🖱️ Clique com o botão direito na imagem e selecione "Copiar imagem"';
            statusEl.style.color = '#f59e0b';
        }
        Utils.showToast('🖱️ Clique com botão direito na imagem e "Copiar imagem"', 'warning');
    }
};

// =============================================
// ENVIAR IMAGEM DO PERSONAL CARE
// =============================================
managerApp._enviarImagemPersonal = function(imageData, assistido, dadosPersonal) {
    var self = this;
    
    API.getDadosAssistido(assistido)
        .then(function(dadosAssistido) {
            if (dadosAssistido.result !== 'success') {
                throw new Error('Não foi possível buscar dados do familiar');
            }
            
            var responsaveis = dadosAssistido.responsaveis || '';
            var dadosFamiliar = Utils.extrairDadosFamiliar(responsaveis);
            var telefoneFamiliar = dadosFamiliar.telefone || '';
            var nomeFamiliar = dadosFamiliar.nome || 'Familiar';
            
            if (!telefoneFamiliar) {
                Utils.showToast('⚠️ Nenhum telefone cadastrado para este assistido', 'warning');
                return;
            }
            
            var nomeCompleto = (dadosPersonal.nome || '') + (dadosPersonal.sobrenome ? ' ' + dadosPersonal.sobrenome : '');
            var cpfMask = _mascararCPF(dadosPersonal.cpf);
            var celularMask = _mascararCelular(dadosPersonal.celular);
            var cac = dadosPersonal.cac || '';
            
            var mensagem = '👤 *Informações do Personal Care*\n\n' +
                'Prezado(a) ' + nomeFamiliar + ',\n\n' +
                'Segue abaixo as informações do profissional que estará cuidando do(a) *' + assistido + '*:\n\n' +
                '📋 *Dados do Profissional*\n' +
                '┌─────────────────────────\n';
            
            if (nomeCompleto) mensagem += '│ Nome: ' + nomeCompleto + '\n';
            if (dadosPersonal.celular) mensagem += '│ Celular: ' + celularMask + '\n';
            if (dadosPersonal.atividade) mensagem += '│ Função: ' + dadosPersonal.atividade + '\n';
            if (dadosPersonal.cpf) mensagem += '│ CPF: ' + cpfMask + '\n';
            if (dadosPersonal.conselho) mensagem += '│ Registro: ' + dadosPersonal.conselho + '\n';
            if (cac) mensagem += '│ CAC: ' + cac + '\n';
            
            mensagem += '└─────────────────────────\n\n' +
                '🌟 Este profissional está escalado para cuidar do seu familiar com dedicação e excelência.\n\n' +
                'Qualquer dúvida, estamos à disposição.\n\n' +
                '🌿 *JARDINSCare* - Cuidando de quem você ama';
            
            var mensagemCodificada = encodeURIComponent(mensagem);
            
            var numeroLimpo = telefoneFamiliar.replace(/\D/g, '');
            if (numeroLimpo.length >= 10) {
                var numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;
                var link = 'https://wa.me/' + numeroCompleto + '?text=' + mensagemCodificada;
                window.open(link, '_blank');
                Utils.showToast('📱 Abrindo WhatsApp para ' + nomeFamiliar);
                document.getElementById('modalVisualizarImagemPersonal').style.display = 'none';
                managerApp.fecharModal();
            } else {
                Utils.showToast('⚠️ Número inválido', 'warning');
            }
        })
        .catch(function(error) {
            Utils.showToast('❌ Erro: ' + error.message, 'error');
        });
};
