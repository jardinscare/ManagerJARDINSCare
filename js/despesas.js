// =============================================
// DESPESAS - managerJARDINSCare
// Gestão de despesas via Supabase
// Versão 3.0 - Bloqueio de Plantão Extra já pago
// =============================================

// =============================================
// CARREGAR METADADOS FINANCEIROS
// =============================================
managerApp.carregarMetadadosFinanceiros = function() {
    var self = this;
    API.getMetadados()
        .then(function(data) {
            if (data.result === 'success') {
                self.categoriasDespesas = data.categoriasDespesas || [];
                self.tiposReceitaAvulsa = data.tiposReceitaAvulsa || [];
                self.formasPagamento = data.formasPagamento || [];
            }
        })
        .catch(function(error) {
            console.error('Erro ao carregar metadados financeiros:', error);
        });
};

// =============================================
// INICIALIZAR DESPESAS (COM AUTO-REFRESH)
// =============================================
managerApp.initDespesas = function() {
    var self = this;
    
    var btnNovaDespesa = document.getElementById('btnNovaDespesa');
    if (btnNovaDespesa) {
        btnNovaDespesa.addEventListener('click', function() { 
            managerApp.abrirModalDespesa(); 
        });
    }
    
    var btnFiltrarDespesa = document.getElementById('btnFiltrarDespesa');
    if (btnFiltrarDespesa) {
        btnFiltrarDespesa.addEventListener('click', function() { 
            managerApp.renderDespesas(); 
        });
    }
    
    var filtroMesDespesa = document.getElementById('filtroMesDespesa');
    if (filtroMesDespesa) {
        filtroMesDespesa.value = new Date().toISOString().slice(0, 7);
    }
    
    this.carregarCategoriasDespesas();
    this.carregarFiltrosDespesas();
    this.renderDespesas();
    
    this._adicionarIndicadorAtualizacao();
    this._iniciarAutoRefreshDespesas();
    
    if (!this._personalCaresCache || this._personalCaresCache.length === 0) {
        console.log('🔄 Iniciando carga paralela de Personal Cares...');
        this.carregarPersonalCaresAtivos().then(function(personalCares) {
            console.log('✅ Personal Cares carregados em paralelo:', personalCares.length);
        }).catch(function(error) {
            console.warn('⚠️ Erro na carga paralela de Personal Cares:', error);
        });
    }
};

// =============================================
// ADICIONAR INDICADOR DE ÚLTIMA ATUALIZAÇÃO
// =============================================
managerApp._adicionarIndicadorAtualizacao = function() {
    var container = document.querySelector('#page-despesas .card .card-body');
    if (!container) return;
    
    if (document.getElementById('despesasRefreshIndicator')) return;
    
    var indicator = document.createElement('div');
    indicator.id = 'despesasRefreshIndicator';
    indicator.style.cssText = [
        'display: flex',
        'justify-content: space-between',
        'align-items: center',
        'padding: 6px 12px',
        'margin-bottom: 12px',
        'background: var(--gray-50)',
        'border-radius: 8px',
        'font-size: 12px',
        'color: var(--gray-500)'
    ].join(';');
    
    indicator.innerHTML = [
        '<span>🔄 Última atualização: <strong id="despesasUltimaAtualizacao">' + new Date().toLocaleTimeString() + '</strong></span>',
        '<div style="display: flex; gap: 8px; align-items: center;">',
        '  <span id="despesasRefreshStatus" style="font-size: 11px; color: var(--gray-400);">Próximo refresh em 5min</span>',
        '  <button class="btn btn-sm btn-secondary" id="despesasRefreshBtn" style="height: 26px; font-size: 10px; padding: 2px 10px;">🔄 Atualizar</button>',
        '</div>'
    ].join('');
    
    var filtersRow = container.querySelector('.despesas-filters-row');
    if (filtersRow) {
        filtersRow.parentNode.insertBefore(indicator, filtersRow.nextSibling);
    } else {
        container.prepend(indicator);
    }
    
    var self = this;
    document.getElementById('despesasRefreshBtn').addEventListener('click', function() {
        self._refreshDespesasManual();
    });
};

// =============================================
// INICIAR AUTO-REFRESH (5 MINUTOS)
// =============================================
managerApp._iniciarAutoRefreshDespesas = function() {
    var self = this;
    
    if (this._refreshIntervalDespesas) {
        clearInterval(this._refreshIntervalDespesas);
    }
    
    var intervaloMs = 5 * 60 * 1000;
    var contador = 0;
    
    this._refreshIntervalDespesas = setInterval(function() {
        contador++;
        console.log('🔄 Auto-refresh despesas #' + contador);
        
        var statusEl = document.getElementById('despesasRefreshStatus');
        if (statusEl) {
            statusEl.textContent = '🔄 Atualizando...';
            statusEl.style.color = '#f59e0b';
        }
        
        self.renderDespesas();
        
        var timeEl = document.getElementById('despesasUltimaAtualizacao');
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString();
        }
        
        setTimeout(function() {
            var statusEl = document.getElementById('despesasRefreshStatus');
            if (statusEl) {
                statusEl.textContent = 'Próximo refresh em 5min';
                statusEl.style.color = 'var(--gray-400)';
            }
        }, 2000);
        
    }, intervaloMs);
    
    console.log('✅ Auto-refresh de despesas iniciado (5 minutos)');
};

// =============================================
// REFRESH MANUAL DE DESPESAS
// =============================================
managerApp._refreshDespesasManual = function() {
    var self = this;
    
    console.log('🔄 Refresh manual de despesas');
    
    var btn = document.getElementById('despesasRefreshBtn');
    var statusEl = document.getElementById('despesasRefreshStatus');
    
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Carregando...';
    }
    
    if (statusEl) {
        statusEl.textContent = '🔄 Atualizando...';
        statusEl.style.color = '#f59e0b';
    }
    
    managerApp.invalidarCache('despesas');
    
    this.renderDespesas();
    
    setTimeout(function() {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄 Atualizar';
        }
        
        var timeEl = document.getElementById('despesasUltimaAtualizacao');
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString();
        }
        
        if (statusEl) {
            statusEl.textContent = '✅ Atualizado!';
            statusEl.style.color = '#10b981';
            setTimeout(function() {
                statusEl.textContent = 'Próximo refresh em 5min';
                statusEl.style.color = 'var(--gray-400)';
            }, 3000);
        }
    }, 1500);
    
    Utils.showToast('🔄 Despesas atualizadas!', 'success');
};

// =============================================
// PARAR AUTO-REFRESH
// =============================================
managerApp._pararAutoRefreshDespesas = function() {
    if (this._refreshIntervalDespesas) {
        clearInterval(this._refreshIntervalDespesas);
        this._refreshIntervalDespesas = null;
        console.log('⏹️ Auto-refresh de despesas interrompido');
    }
};

// =============================================
// CARREGAR FILTROS DE DESPESAS
// =============================================
managerApp.carregarFiltrosDespesas = function() {
    var self = this;
    
    API.listarDespesas()
        .then(function(data) {
            var despesas = data.despesas || [];
            
            var formasPagamento = {};
            despesas.forEach(function(d) {
                if (d.formaPagamento && d.formaPagamento.trim() !== '') {
                    formasPagamento[d.formaPagamento] = true;
                }
            });
            
            var statusList = {};
            despesas.forEach(function(d) {
                if (d.status && d.status.trim() !== '') {
                    statusList[d.status] = true;
                }
            });
            
            var formasPadrao = CONFIG.FORMAS_PAGAMENTO || ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência', 'Pendente'];
            var statusPadrao = ['Pago', 'Pendente', 'Cancelado'];
            
            var formasFinais = Object.keys(formasPagamento);
            if (formasFinais.length === 0) {
                formasFinais = formasPadrao;
            }
            
            var statusFinais = Object.keys(statusList);
            if (statusFinais.length === 0) {
                statusFinais = statusPadrao;
            }
            
            formasFinais.sort();
            statusFinais.sort();
            
            var selectForma = document.getElementById('filtroFormaPagamentoDespesa');
            if (selectForma) {
                var htmlForma = '<option value="">Todas</option>';
                formasFinais.forEach(function(f) {
                    htmlForma += '<option value="' + f + '">' + f + '</option>';
                });
                selectForma.innerHTML = htmlForma;
            } else {
                self._criarFiltroFormaPagamento(formasFinais);
            }
            
            var selectStatus = document.getElementById('filtroStatusDespesa');
            if (selectStatus) {
                // 🆕 Default "Pendente" selecionado
                var htmlStatus = '<option value="">Todos</option>';
                statusFinais.forEach(function(s) {
                    var selected = (s === 'Pendente') ? ' selected' : '';
                    htmlStatus += '<option value="' + s + '"' + selected + '>' + s + '</option>';
                });
                selectStatus.innerHTML = htmlStatus;
            } else {
                self._criarFiltroStatus(statusFinais);
            }
            
            self._formasPagamentoCache = formasFinais;
            self._statusDespesasCache = statusFinais;
        })
        .catch(function(error) {
            console.error('❌ Erro ao carregar filtros de despesas:', error);
            self._carregarFiltrosDespesasFallback();
        });
};

managerApp._criarFiltroFormaPagamento = function(formas) {
    var container = document.querySelector('.despesas-filters-row');
    if (!container) return;
    
    var filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    filterGroup.innerHTML = '<label>FORMA PAGTO.</label>' +
        '<select class="form-select" id="filtroFormaPagamentoDespesa" style="height: 42px;">' +
        '<option value="">Todas</option>' +
        formas.map(function(f) { return '<option value="' + f + '">' + f + '</option>'; }).join('') +
        '</select>';
    
    var btnGroup = container.querySelector('.btn-group');
    if (btnGroup) {
        container.insertBefore(filterGroup, btnGroup);
    } else {
        container.appendChild(filterGroup);
    }
};

managerApp._criarFiltroStatus = function(statusList) {
    var container = document.querySelector('.despesas-filters-row');
    if (!container) return;
    
    var filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    filterGroup.innerHTML = '<label>STATUS</label>' +
        '<select class="form-select" id="filtroStatusDespesa" style="height: 42px;">' +
        '<option value="">Todos</option>' +
        statusList.map(function(s) {
            // 🆕 Default "Pendente" selecionado
            var selected = (s === 'Pendente') ? ' selected' : '';
            return '<option value="' + s + '"' + selected + '>' + s + '</option>';
        }).join('') +
        '</select>';
    
    var btnGroup = container.querySelector('.btn-group');
    if (btnGroup) {
        container.insertBefore(filterGroup, btnGroup);
    } else {
        container.appendChild(filterGroup);
    }
};

managerApp._carregarFiltrosDespesasFallback = function() {
    var formasPadrao = CONFIG.FORMAS_PAGAMENTO || ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência'];
    var statusPadrao = ['Pago', 'Pendente', 'Cancelado'];
    
    var selectForma = document.getElementById('filtroFormaPagamentoDespesa');
    if (selectForma) {
        var htmlForma = '<option value="">Todas</option>';
        formasPadrao.forEach(function(f) {
            htmlForma += '<option value="' + f + '">' + f + '</option>';
        });
        selectForma.innerHTML = htmlForma;
    } else {
        this._criarFiltroFormaPagamento(formasPadrao);
    }
    
    var selectStatus = document.getElementById('filtroStatusDespesa');
    if (selectStatus) {
        // 🆕 Default "Pendente" selecionado
        var htmlStatus = '<option value="">Todos</option>';
        statusPadrao.forEach(function(s) {
            var selected = (s === 'Pendente') ? ' selected' : '';
            htmlStatus += '<option value="' + s + '"' + selected + '>' + s + '</option>';
        });
        selectStatus.innerHTML = htmlStatus;
    } else {
        this._criarFiltroStatus(statusPadrao);
    }
};

// =============================================
// CARREGAR CATEGORIAS DE DESPESAS
// =============================================
managerApp.carregarCategoriasDespesas = function() {
    var self = this;
    
    var categoriasPadrao = CONFIG.CATEGORIAS_DESPESAS || [
        'Administrativo', 'Alimentação', 'Aluguel', 'Cartão Crédito', 'Contador',
        'Custo Enfermagem', 'Custo Personal Care', 'Equipamentos', 'Impostos',
        'Marketing', 'Outros', 'Plantões Extras', 'Plantões N/Realizados',
        'Pró Labore', 'Telefone/Internet', 'Transporte', 'Treinamentos'
    ];
    
    this.categoriasDespesas = categoriasPadrao;
    this._atualizarSelectsCategorias(categoriasPadrao);
    
    API.getMetadados()
        .then(function(data) {
            if (data.result === 'success' && data.categoriasDespesas && data.categoriasDespesas.length > 0) {
                var categoriasSet = new Set(categoriasPadrao);
                data.categoriasDespesas.forEach(function(cat) {
                    if (cat && cat.trim() !== '') {
                        categoriasSet.add(cat);
                    }
                });
                var categorias = Array.from(categoriasSet).sort();
                
                self.categoriasDespesas = categorias;
                self._atualizarSelectsCategorias(categorias);
            }
        })
        .catch(function(error) {
            console.error('❌ Erro ao enriquecer categorias:', error);
        });
};

managerApp._atualizarSelectsCategorias = function(categorias) {
    if (!categorias || categorias.length === 0) return;
    
    var selectFiltro = document.getElementById('filtroCategoriaDespesa');
    if (selectFiltro) {
        var options = '<option value="">Todas</option>';
        for (var i = 0; i < categorias.length; i++) {
            options += '<option value="' + categorias[i] + '">' + categorias[i] + '</option>';
        }
        selectFiltro.innerHTML = options;
    }
    
    var modalSelect = document.getElementById('modalDespCat');
    if (modalSelect) {
        var modalOptions = '<option value="">Selecione uma categoria</option>';
        for (var i = 0; i < categorias.length; i++) {
            modalOptions += '<option value="' + categorias[i] + '">' + categorias[i] + '</option>';
        }
        modalSelect.innerHTML = modalOptions;
    }
};

// =============================================
// CARREGAR ASSISTIDOS ATIVOS PARA SELECT
// =============================================
managerApp.carregarAssistidosAtivosParaSelect = function(assistidoIncluir) {
    var select = document.getElementById('modalDespAssistido');
    if (!select) return;
    
    var assistidosAtivos = [];
    
    var dashboard = this.dashboardCache || {};
    if (dashboard.assistidos && Array.isArray(dashboard.assistidos)) {
        assistidosAtivos = dashboard.assistidos.filter(function(a) {
            return a.status === 'Ativo';
        }).map(function(a) {
            return a.nome;
        });
    }
    
    if (assistidosAtivos.length === 0) {
        API.getAssistidosComStatus()
            .then(function(data) {
                if (data.result === 'success' && data.assistidos) {
                    var ativos = data.assistidos.filter(function(a) {
                        return a.status === 'Ativo';
                    }).map(function(a) {
                        return a.nome;
                    });
                    assistidosAtivos = ativos;
                    popularSelect(assistidosAtivos, assistidoIncluir);
                } else {
                    popularSelect([], assistidoIncluir);
                }
            })
            .catch(function(error) {
                console.error('❌ Erro ao carregar assistidos:', error);
                popularSelect([], assistidoIncluir);
            });
        return;
    }
    
    popularSelect(assistidosAtivos, assistidoIncluir);
    
    function popularSelect(lista, incluir) {
        var listaOrdenada = lista.slice().sort(function(a, b) {
            return a.localeCompare(b, 'pt-BR');
        });
        
        var options = '<option value="">Selecione um assistido...</option>';
        
        if (incluir && listaOrdenada.indexOf(incluir) === -1) {
            var labelEspecial = '🔸 ' + incluir + ' (Inativo)';
            options += '<option value="' + incluir + '">' + labelEspecial + '</option>';
        }
        
        if (listaOrdenada && listaOrdenada.length > 0) {
            for (var i = 0; i < listaOrdenada.length; i++) {
                options += '<option value="' + listaOrdenada[i] + '">' + listaOrdenada[i] + '</option>';
            }
        } else if (!incluir) {
            options += '<option value="" disabled>⚠️ Nenhum assistido ativo disponível</option>';
        }
        
        select.innerHTML = options;
    }
};

managerApp.carregarPersonalCaresAtivos = function() {
    var self = this;
    
    if (this._personalCaresCache && this._personalCaresCache.length > 0) {
        return Promise.resolve(this._personalCaresCache);
    }
    
    return API.getCuidadoresComStatus()
        .then(function(data) {
            if (data.result === 'success' && data.cuidadores) {
                var ativos = data.cuidadores.filter(function(pc) {
                    return pc.status === 'Ativo';
                }).map(function(pc) {
                    return pc.nome;
                }).sort();
                
                self._personalCaresCache = ativos;
                return ativos;
            } else {
                return self._carregarPersonalCaresFallback();
            }
        })
        .catch(function(error) {
            console.error('❌ Erro ao carregar Personal Cares:', error);
            return self._carregarPersonalCaresFallback();
        });
};

managerApp._carregarPersonalCaresFallback = function() {
    var self = this;
    
    if (this.dashboardCache && this.dashboardCache.personalCares) {
        var ativos = this.dashboardCache.personalCares.filter(function(pc) {
            return pc.status === 'Ativo';
        }).map(function(pc) {
            return pc.nome;
        }).sort();
        
        if (ativos.length > 0) {
            self._personalCaresCache = ativos;
            return ativos;
        }
    }
    
    self._personalCaresCache = [];
    return [];
};

managerApp._popularSelectPersonalCare = function(selectElement, lista, pcIncluir) {
    if (!selectElement) return;
    
    var listaOrdenada = lista.slice().sort(function(a, b) {
        return a.localeCompare(b, 'pt-BR');
    });
    
    var options = '<option value="">Selecione um Personal Care...</option>';
    
    if (pcIncluir && listaOrdenada.indexOf(pcIncluir) === -1) {
        var labelEspecial = '🔸 ' + pcIncluir + ' (Inativo)';
        options += '<option value="' + pcIncluir + '">' + labelEspecial + '</option>';
    }
    
    if (listaOrdenada && listaOrdenada.length > 0) {
        for (var i = 0; i < listaOrdenada.length; i++) {
            options += '<option value="' + listaOrdenada[i] + '">' + listaOrdenada[i] + '</option>';
        }
    } else if (!pcIncluir) {
        options += '<option value="" disabled>⚠️ Nenhum Personal Care ativo disponível</option>';
    }
    
    selectElement.innerHTML = options;
};
// =============================================
// RENDERIZAR DESPESAS
// =============================================
managerApp.renderDespesas = function() {
    var self = this;
    var mes = document.getElementById('filtroMesDespesa') ? document.getElementById('filtroMesDespesa').value : '';
    var categoria = document.getElementById('filtroCategoriaDespesa') ? document.getElementById('filtroCategoriaDespesa').value : '';
    var formaPagamento = document.getElementById('filtroFormaPagamentoDespesa') ? document.getElementById('filtroFormaPagamentoDespesa').value : '';
    var statusFiltro = document.getElementById('filtroStatusDespesa') ? document.getElementById('filtroStatusDespesa').value : '';
    
    API.listarDespesas()
        .then(function(data) {
            if (data.despesas) {
                var despesas = data.despesas;
                var total = 0;
                var despesasFiltradas = [];
                
                for (var i = 0; i < despesas.length; i++) {
                    var d = despesas[i];
                    var incluir = true;
                    
                    if (mes && d.data) {
                        var dataParts = d.data.split('-');
                        var anoMes = dataParts[0] + '-' + dataParts[1];
                        if (anoMes !== mes) incluir = false;
                    }
                    
                    if (categoria && d.categoria !== categoria) incluir = false;
                    if (formaPagamento && d.formaPagamento !== formaPagamento) incluir = false;
                    if (statusFiltro && d.status !== statusFiltro) incluir = false;
                    
                    if (incluir) {
                        despesasFiltradas.push(d);
                        total += parseFloat(d.valor) || 0;
                    }
                }
                
                var despesasOrdenadas = self.ordenarArrayPorColuna(despesasFiltradas, self.ordenacaoDespesas.coluna, self.ordenacaoDespesas.direcao, 'despesas');
                self.atualizarIndicadoresOrdenacaoDespesas(self.ordenacaoDespesas.coluna);
                
                var totalEl = document.getElementById('totalDespesasPeriodo');
                if (totalEl) totalEl.innerHTML = Utils.formatCurrency(total);
                
                var tbody = document.querySelector('#tabelaDespesas tbody');
                if (!despesasOrdenadas.length) {
                    if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="empty-state">Nenhuma despesa encontrada</td></tr>';
                    var timeEl = document.getElementById('despesasUltimaAtualizacao');
                    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
                    return;
                }
                
                var html = '';
                for (var i = 0; i < despesasOrdenadas.length; i++) {
                    var d = despesasOrdenadas[i];
                    var statusClass = d.status === 'Pago' ? 'badge-success' : (d.status === 'Cancelado' ? 'badge-danger' : 'badge-warning');
                    
                    var plantaoInfo = '';
                    if (d.categoria === 'Plantões Extras' && d.assistido) {
                        plantaoInfo = '<br><span style="font-size: 11px; color: var(--gray-500);">' +
                            '👤 ' + (d.assistido || '') +
                            (d.dataPlantao ? ' | 📅 ' + Utils.formatDateBR(d.dataPlantao) : '') +
                            (d.turno ? ' | 🔄 ' + d.turno : '') +
                            '</span>';
                    }
                    
                    html += '<tr>';
                    html += '<td>' + Utils.formatDateBR(d.data) + '</td>';
                    html += '<td>' + (d.descricao || '') + plantaoInfo + '</td>';
                    html += '<td>' + (d.fornecedor || '') + '</td>';
                    html += '<td>' + (d.categoria || '') + '</td>';
                    html += '<td>' + (d.formaPagamento || '') + '</td>';
                    html += '<td class="text-right">' + Utils.formatCurrency(d.valor) + '</td>';
                    html += '<td><span class="badge ' + statusClass + '">' + (d.status || 'Pendente') + '</span></td>';
                    html += '<td><button class="btn btn-sm btn-secondary" onclick="managerApp.editarDespesa(\'' + d.id + '\')">✏️</button> <button class="btn btn-sm btn-danger" onclick="managerApp.excluirDespesa(\'' + d.id + '\')">🗑️</button></td>';
                    html += '</tr>';
                }
                if (tbody) tbody.innerHTML = html;
                
                var timeEl = document.getElementById('despesasUltimaAtualizacao');
                if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
            } else {
                var tbody = document.querySelector('#tabelaDespesas tbody');
                if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="empty-state">Nenhuma despesa encontrada</td></tr>';
                var totalEl = document.getElementById('totalDespesasPeriodo');
                if (totalEl) totalEl.innerHTML = Utils.formatCurrency(0);
                
                var timeEl = document.getElementById('despesasUltimaAtualizacao');
                if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
            }
        })
        .catch(function(error) {
            console.error('Erro ao carregar despesas:', error);
            Utils.showToast('Erro ao carregar despesas', 'error');
        });
};

// =============================================
// VERIFICAR SE JÁ EXISTE ;PG NA ESCALA
// =============================================
managerApp._verificarPGExistente = function(assistido, dataPlantao, turno) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        if (!assistido || !dataPlantao || !turno) {
            resolve({ existe: false, valor: '', erro: 'Dados insuficientes' });
            return;
        }
        
        var partesData = dataPlantao.split('-');
        if (partesData.length !== 3) {
            resolve({ existe: false, valor: '', erro: 'Formato de data inválido' });
            return;
        }
        
        var mes = parseInt(partesData[1]);
        var dia = parseInt(partesData[2]);
        var turnoLower = String(turno).toLowerCase();
        
        API.getEscalaMes(assistido, mes)
            .then(function(data) {
                if (data.result === 'success' && data.escala) {
                    var valorAtual = data.escala[dia] ? (data.escala[dia][turnoLower] || '') : '';
                    var valorNormalizado = String(valorAtual).replace(/\s+/g, '').toUpperCase();
                    var existe = valorNormalizado.indexOf(';PG') !== -1;
                    
                    resolve({ existe: existe, valor: valorAtual, dia: dia, mes: mes, turno: turnoLower });
                } else {
                    resolve({ existe: false, valor: '', erro: data.error || 'Escala não encontrada' });
                }
            })
            .catch(function(error) {
                reject(error);
            });
    });
};

// =============================================
// MODAL DE ALERTA — PLANTÃO JÁ PAGO
// =============================================
managerApp._abrirModalPlantaoJaPago = function(dados) {
    return new Promise(function(resolve) {
        var modalExistente = document.getElementById('modalPlantaoJaPago');
        if (modalExistente) modalExistente.remove();
        
        var html = [
            '<div class="modal-overlay" id="modalPlantaoJaPago" style="display: flex; z-index: 1100;">',
            '  <div class="modal" style="max-width: 520px;">',
            '    <div class="modal-header" style="background: var(--gray-50); border-bottom: 2px solid var(--gray-100);">',
            '      <span class="modal-title" style="color: var(--gray-800); display: flex; align-items: center; gap: 8px;">',
            '        <span style="font-size: 20px;">⚠️</span>',
            '        <span>Plantão Já Pago</span>',
            '      </span>',
            '      <button class="modal-close" id="fecharModalPlantaoJaPago" style="background: var(--gray-100); color: var(--gray-500); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px;">×</button>',
            '    </div>',
            '    <div class="modal-body" style="padding: 24px 24px 16px 24px; text-align: center;">',
            '      <div style="font-size: 56px; margin-bottom: 12px;">⚠️</div>',
            '      <div style="font-size: 18px; font-weight: 700; color: var(--gray-800); margin-bottom: 10px;">Este plantão já foi pago!</div>',
            '      <div style="font-size: 13px; color: var(--gray-600); line-height: 1.6; margin-bottom: 16px;">',
            '      </div>',
            '      <div style="background: var(--gray-50); border-radius: 8px; padding: 14px 16px; text-align: left; border-left: 4px solid var(--warning); margin-bottom: 16px;">',
            '        <div style="display: flex; gap: 10px; font-size: 13px; padding: 4px 0;"><span style="color: var(--gray-500); min-width: 100px;">👤 Assistido:</span><strong style="color: var(--gray-800);">' + (dados.assistido || '-') + '</strong></div>',
            '        <div style="display: flex; gap: 10px; font-size: 13px; padding: 4px 0;"><span style="color: var(--gray-500); min-width: 100px;">📅 Data:</span><strong style="color: var(--gray-800);">' + (dados.dataFormatada || '-') + '</strong></div>',
            '        <div style="display: flex; gap: 10px; font-size: 13px; padding: 4px 0;"><span style="color: var(--gray-500); min-width: 100px;">🔄 Turno:</span><strong style="color: var(--gray-800);">' + (dados.turno || '-') + '</strong></div>',
            '        <div style="display: flex; gap: 10px; font-size: 13px; padding: 4px 0;"><span style="color: var(--gray-500); min-width: 100px;">💰 Status:</span><strong style="color: var(--success);">✅ Já marcado como Pago</strong></div>',
            '      </div>',
            '      <div style="font-size: 12px; color: var(--danger); background: #fef2f2; padding: 10px 14px; border-radius: 8px; font-weight: 600; line-height: 1.5;">',
            '        Prosseguir pode causar um <strong>PAGAMENTO DUPLICADO</strong>.<br>',
            '        Recomendamos verificar em <strong>Despesas</strong> antes de continuar.',
            '      </div>',
            '    </div>',
            '    <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid var(--gray-100); background: var(--gray-50); display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">',
            '      <button class="btn btn-secondary" id="btnPlantaoCancelar" style="flex: 1; min-width: 120px;">Cancelar</button>',
            '      <button class="btn btn-primary" id="btnPlantaoVerificar" style="flex: 1; min-width: 140px;">🔍 Verificar</button>',
            '      <button class="btn btn-danger" id="btnPlantaoForcar" style="flex: 1; min-width: 120px;">⚠️ Forçar</button>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');
        
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv.firstChild);
        
        var modal = document.getElementById('modalPlantaoJaPago');
        
        function fechar(resultado) {
            if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
            resolve(resultado);
        }
        
        document.getElementById('fecharModalPlantaoJaPago').addEventListener('click', function() { fechar('cancelar'); });
        document.getElementById('btnPlantaoCancelar').addEventListener('click', function() { fechar('cancelar'); });
        document.getElementById('btnPlantaoForcar').addEventListener('click', function() { fechar('forcar'); });
        document.getElementById('btnPlantaoVerificar').addEventListener('click', function() { fechar('verificar'); });
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) fechar('cancelar');
        });
        
        // Foco no botão Cancelar (padrão de segurança)
        setTimeout(function() {
            var btnCancelar = document.getElementById('btnPlantaoCancelar');
            if (btnCancelar) btnCancelar.focus();
        }, 100);
    });
};

// =============================================
// CARD DE CONFIRMAÇÃO DE PLANTÃO
// =============================================
managerApp._exibirCardConfirmacaoPlantao = function(dados, resultado) {
    var cardExistente = document.getElementById('plantaoCardTop');
    if (cardExistente) cardExistente.remove();
    
    var tipo = resultado.tipo || 'sucesso';
    var cor = tipo === 'sucesso' ? 'var(--success)' : (tipo === 'forcado' ? 'var(--warning)' : 'var(--danger)');
    var bgColor = tipo === 'sucesso' ? 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)' : (tipo === 'forcado' ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)');
    var icone = tipo === 'sucesso' ? '✅' : (tipo === 'forcado' ? '⚠️' : '🚨');
    var titulo = tipo === 'sucesso' ? 'Plantão Pago e Escala Atualizada!' : (tipo === 'forcado' ? 'Pagamento Forçado (registrado em log)' : 'ESCALA NÃO FOI ATUALIZADA');
    
    var autoFechar = tipo === 'sucesso' ? 10 : (tipo === 'forcado' ? 15 : 0);
    
    var card = document.createElement('div');
    card.id = 'plantaoCardTop';
    card.className = 'plantao-card-top plantao-card-' + tipo;
    card.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1500; max-width: 600px; width: calc(100% - 40px); background: ' + bgColor + '; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); border-left: 5px solid ' + cor + '; padding: 16px 20px; animation: slideDown 0.4s ease-out;';
    
    var html = [
        '<div style="display: flex; align-items: flex-start; gap: 14px;">',
        '  <div style="font-size: 32px; flex-shrink: 0; line-height: 1;">' + icone + '</div>',
        '  <div style="flex: 1; min-width: 0;">',
        '    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">',
        '      <div style="font-size: 15px; font-weight: 700; color: ' + cor + ';">' + titulo + '</div>',
        '      <button id="plantaoCardClose" style="background: transparent; border: none; cursor: pointer; font-size: 18px; color: var(--gray-500); padding: 0; line-height: 1;">×</button>',
        '    </div>',
        '    <div style="font-size: 13px; color: var(--gray-700); margin-top: 6px; line-height: 1.5;">',
        '      <div>👤 <strong>' + (dados.assistido || '-') + '</strong> &nbsp;•&nbsp; 📅 ' + (dados.dataFormatada || '-') + ' &nbsp;•&nbsp; 🔄 ' + (dados.turno || '-') + '</div>'
    ];
    
    if (tipo === 'sucesso') {
        html.push('      <div style="margin-top: 4px;">📋 Escala verificada: <strong style="color: var(--success);">✅ Registro validado.</strong></div>');
    } else if (tipo === 'forcado') {
        html.push('      <div style="margin-top: 4px;">⚠️ Você optou por forçar mesmo estando PAGO.</div>');
        html.push('      <div style="margin-top: 2px; font-size: 12px; color: var(--gray-500);">📝 Registrado em log local.</div>');
    } else {
        html.push('      <div style="margin-top: 4px; color: var(--danger);">❌ Erro: ' + (resultado.erro || 'desconhecido') + '</div>');
        html.push('      <div style="margin-top: 4px; font-size: 12px; font-weight: 600;">⚠️ AÇÃO NECESSÁRIA: Verifique no módulo Escalas antes de tentar novamente.</div>');
    }
    
    html.push('    </div>');
    
    if (autoFechar > 0) {
        html.push('    <div style="margin-top: 8px; font-size: 11px; color: var(--gray-400);" id="plantaoCardTimer">Auto-fecha em ' + autoFechar + 's</div>');
    }
    
    html.push('  </div>');
    html.push('</div>');
    
    card.innerHTML = html.join('');
    document.body.appendChild(card);
    
    function fecharCard() {
        card.style.opacity = '0';
        card.style.transition = 'opacity 0.3s ease';
        setTimeout(function() {
            if (card.parentNode) card.parentNode.removeChild(card);
        }, 300);
    }
    
    document.getElementById('plantaoCardClose').addEventListener('click', fecharCard);
    
    if (autoFechar > 0) {
        var tempoRestante = autoFechar;
        var timerEl = document.getElementById('plantaoCardTimer');
        var interval = setInterval(function() {
            tempoRestante--;
            if (timerEl) timerEl.textContent = 'Auto-fecha em ' + tempoRestante + 's';
            if (tempoRestante <= 0) {
                clearInterval(interval);
                fecharCard();
            }
        }, 1000);
    }
};

// =============================================
// LOG DE AUDITORIA (LOCALSTORAGE)
// =============================================
managerApp._registrarLogForcado = function(dados) {
    try {
        var key = 'manager_log_forcados_plantao';
        var logs = JSON.parse(localStorage.getItem(key) || '[]');
        
        logs.push({
            assistido: dados.assistido,
            dataPlantao: dados.dataPlantao,
            dataFormatada: dados.dataFormatada,
            turno: dados.turno,
            valor: dados.valor,
            usuario: 'sistema',
            timestamp: new Date().toISOString()
        });
        
        // Manter apenas os últimos 200 logs
        if (logs.length > 200) logs = logs.slice(-200);
        
        localStorage.setItem(key, JSON.stringify(logs));
        console.log('📝 Log de pagamento forçado registrado. Total:', logs.length);
    } catch (e) {
        console.warn('⚠️ Erro ao registrar log:', e);
    }
};

managerApp.verLogForcados = function() {
    var key = 'manager_log_forcados_plantao';
    var logs = JSON.parse(localStorage.getItem(key) || '[]');
    
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('   📝 LOG DE PAGAMENTOS FORÇADOS — ' + logs.length + ' registro(s)');
    console.log('═══════════════════════════════════════════════════');
    
    if (logs.length === 0) {
        console.log('   Nenhum pagamento forçado registrado.');
    } else {
        logs.forEach(function(log, i) {
            console.log('');
            console.log('   #' + (i + 1) + ' — ' + new Date(log.timestamp).toLocaleString('pt-BR'));
            console.log('      👤 ' + log.assistido);
            console.log('      📅 ' + log.dataFormatada + ' | 🔄 ' + log.turno);
            console.log('      💰 ' + Utils.formatCurrency(log.valor));
        });
    }
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    
    return logs;
};

managerApp.limparLogForcados = function() {
    localStorage.removeItem('manager_log_forcados_plantao');
    console.log('🗑️ Log de pagamentos forçados limpo.');
};

// =============================================
// LIMPAR ;PG DUPLICADOS (função de console)
// =============================================
managerApp.limparPGDuplicados = function() {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('   🔍 LIMPEZA DE ;PG DUPLICADOS');
    console.log('═══════════════════════════════════════════════════');
    
    return API.getAssistidosCompleto()
        .then(function(assistidosData) {
            if (assistidosData.result !== 'success' || !assistidosData.assistidos) {
                throw new Error('Erro ao buscar assistidos');
            }
            
            var assistidos = assistidosData.assistidos;
            var corrigidos = 0;
            var verificados = 0;
            var promises = [];
            
            assistidos.forEach(function(assistido) {
                // Verificar meses atuais (últimos 3 + próximos 3)
                var hoje = new Date();
                for (var offset = -3; offset <= 3; offset++) {
                    var data = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
                    var mes = data.getMonth() + 1;
                    
                    (function(assistido, mes) {
                        var promise = API.getEscalaMes(assistido.nome, mes)
                            .then(function(escalaData) {
                                if (escalaData.result !== 'success' || !escalaData.escala) return;
                                
                                var escala = escalaData.escala;
                                var precisaCorrigir = {};
                                
                                for (var dia in escala) {
                                    if (!escala.hasOwnProperty(dia)) continue;
                                    
                                    ['diurno', 'noturno'].forEach(function(turno) {
                                        var valor = escala[dia][turno] || '';
                                        if (!valor) return;
                                        
                                        // Verificar se tem ;PG duplicado
                                        var matches = valor.match(/;PG/g);
                                        if (matches && matches.length > 1) {
                                            var nomeLimpo = valor.split(';')[0].trim();
                                            if (!precisaCorrigir[dia]) precisaCorrigir[dia] = {};
                                            precisaCorrigir[dia][turno] = nomeLimpo + ';PG';
                                            verificados++;
                                        }
                                    });
                                }
                                
                                // Aplicar correções
                                var corrigirPromises = [];
                                for (var dia in precisaCorrigir) {
                                    for (var turno in precisaCorrigir[dia]) {
                                        var valorCorrigido = precisaCorrigir[dia][turno];
                                        corrigidos++;
                                        
                                        console.log('   🔧 Corrigindo ' + assistido.nome + ' — ' + mes + '/' + dia + ' (' + turno + ')');
                                        
                                        corrigirPromises.push(
                                            API.updateEscala({
                                                assistido: assistido.nome,
                                                mes: mes,
                                                dia: parseInt(dia),
                                                turno: turno,
                                                cuidador: valorCorrigido
                                            })
                                        );
                                    }
                                }
                                
                                return Promise.all(corrigirPromises);
                            })
                            .catch(function(err) {
                                console.warn('   ⚠️ Erro ao verificar ' + assistido.nome + ' em ' + mes + ': ' + err.message);
                            });
                        
                        promises.push(promise);
                    })(assistido, mes);
                }
            });
            
            return Promise.all(promises).then(function() {
                console.log('');
                console.log('   ✅ Limpeza concluída!');
                console.log('   📊 Verificados: ' + verificados);
                console.log('   🔧 Corrigidos: ' + corrigidos);
                console.log('═══════════════════════════════════════════════════');
                console.log('');
                
                if (corrigidos > 0) {
                    Utils.showToast('✅ ' + corrigidos + ' registro(s) com ;PG duplicado corrigido(s)', 'success');
                } else {
                    Utils.showToast('✅ Nenhum ;PG duplicado encontrado', 'info');
                }
                
                return { verificados: verificados, corrigidos: corrigidos };
            });
        })
        .catch(function(error) {
            console.error('❌ Erro na limpeza:', error);
            Utils.showToast('Erro na limpeza: ' + error.message, 'error');
        });
};

// =============================================
// ABRIR MODAL DESPESA (COM BLOQUEIO ;PG)
// =============================================
managerApp.abrirModalDespesa = function(despesa, id) {
    var self = this;
    var isEdicao = despesa && despesa.id;
    var modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').innerHTML = isEdicao ? '✏️ Editar Despesa' : '➕ Nova Despesa';
    
    var dataValue = '';
    if (isEdicao && despesa.data) {
        if (despesa.data.includes('T')) {
            dataValue = despesa.data.split('T')[0];
        } else if (despesa.data.includes('-')) {
            dataValue = despesa.data;
        } else {
            dataValue = new Date().toISOString().slice(0, 10);
        }
    } else {
        dataValue = new Date().toISOString().slice(0, 10);
    }
    
    var descValue = isEdicao ? (despesa.descricao || '') : '';
    var categoriaValue = isEdicao ? (despesa.categoria || '') : '';
    var valorValue = isEdicao ? (despesa.valor || '') : '';
    var formaPagamentoValue = isEdicao ? (despesa.formaPagamento || 'Pix') : 'Pix';
    var fornecedorValue = isEdicao ? (despesa.fornecedor || '') : '';
    var notaFiscalValue = isEdicao ? (despesa.notaFiscal || '') : '';
    var observacoesValue = isEdicao ? (despesa.observacoes || '') : '';
    var statusValue = isEdicao ? (despesa.status || 'Pendente') : 'Pendente';
    
    var assistidoValue = isEdicao ? (despesa.assistido || '') : '';
    var dataPlantaoValue = isEdicao ? (despesa.dataPlantao || '') : '';
    var turnoValue = isEdicao ? (despesa.turno || '').toUpperCase() : '';
    
    var categoriasModal = (this.categoriasDespesas && this.categoriasDespesas.length > 0) 
        ? this.categoriasDespesas 
        : (CONFIG.CATEGORIAS_DESPESAS || []);
    
    var categoriasOptions = '<option value="">Selecione uma categoria</option>';
    for (var i = 0; i < categoriasModal.length; i++) {
        var selected = (categoriaValue === categoriasModal[i]) ? 'selected' : '';
        categoriasOptions += '<option value="' + categoriasModal[i] + '" ' + selected + '>' + categoriasModal[i] + '</option>';
    }
    
    var formasPagamento = CONFIG.FORMAS_PAGAMENTO || ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência', 'Pendente'];
    var formasPagamentoOptions = '';
    for (var j = 0; j < formasPagamento.length; j++) {
        var selectedForma = (formaPagamentoValue === formasPagamento[j]) ? 'selected' : '';
        formasPagamentoOptions += '<option value="' + formasPagamento[j] + '" ' + selectedForma + '>' + formasPagamento[j] + '</option>';
    }
    
    var statusOptions = '<option value="Pendente" ' + (statusValue === 'Pendente' ? 'selected' : '') + '>Pendente</option>';
    statusOptions += '<option value="Pago" ' + (statusValue === 'Pago' ? 'selected' : '') + '>Pago</option>';
    statusOptions += '<option value="Cancelado" ' + (statusValue === 'Cancelado' ? 'selected' : '') + '>Cancelado</option>';
    
    var turnoOptions = '<option value="">Selecione</option>';
    var turnosOrdenados = ['DIURNO', 'NOTURNO'];
    for (var t = 0; t < turnosOrdenados.length; t++) {
        var selectedTurno = (turnoValue.toUpperCase() === turnosOrdenados[t].toUpperCase()) ? 'selected' : '';
        turnoOptions += '<option value="' + turnosOrdenados[t] + '" ' + selectedTurno + '>' + turnosOrdenados[t] + '</option>';
    }
    
    var html = '';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Data</label><input type="date" class="form-input" id="modalDespData" value="' + dataValue + '"></div>';
    html += '<div class="form-group"><label>Valor (R$)</label><input class="form-input input-currency" id="modalDespValor" value="' + (valorValue ? Utils.formatCurrency(valorValue) : '') + '"></div>';
    html += '</div>';
    
    html += '<div class="form-group"><label>Descrição</label><input class="form-input" id="modalDespDesc" value="' + descValue.replace(/"/g, '&quot;') + '"></div>';
    
    html += '<div class="form-row">';
    html += '  <div class="form-group" style="flex:1;">';
    html += '    <label>PERSONAL CARE</label>';
    html += '    <select class="form-select" id="modalDespPersonalCare">';
    html += '      <option value="">Selecione um Personal Care...</option>';
    html += '    </select>';
    html += '  </div>';
    html += '  <div class="form-group" style="flex:1;">';
    html += '    <label>FORNECEDOR</label>';
    html += '    <input class="form-input" id="modalDespFornecedor" value="' + (fornecedorValue || '').replace(/"/g, '&quot;') + '" placeholder="Digite ou selecione um Personal Care">';
    html += '  </div>';
    html += '</div>';
    
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Categoria</label><select class="form-select" id="modalDespCat">' + categoriasOptions + '</select></div>';
    html += '<div class="form-group"><label>Forma Pagamento</label><select class="form-select" id="modalDespFormaPagamento">' + formasPagamentoOptions + '</select></div>';
    html += '</div>';
    
    html += '<div id="modalDespPlantaoExtraContainer" style="display: none; border-top: 2px dashed var(--primary-100); padding-top: 8px; margin-top: 0;">';
    html += '<div style="font-size: 12px; font-weight: 700; color: var(--primary-600); margin-bottom: 4px;">📋 Dados do Plantão Extra</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group" style="flex: 2;"><label>ASSISTIDO</label><select class="form-select" id="modalDespAssistido"><option value="">Carregando...</option></select></div>';
    html += '<div class="form-group" style="flex: 1;"><label>DATA PLANTÃO</label><input type="date" class="form-input" id="modalDespDataPlantao" value="' + dataPlantaoValue + '"></div>';
    html += '<div class="form-group" style="flex: 1;"><label>TURNO</label><select class="form-select" id="modalDespTurno">' + turnoOptions + '</select></div>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Nota Fiscal</label><input class="form-input" id="modalDespNotaFiscal" value="' + (notaFiscalValue || '').replace(/"/g, '&quot;') + '"></div>';
    html += '<div class="form-group"><label>Status</label><select class="form-select" id="modalDespStatus">' + statusOptions + '</select></div>';
    html += '</div>';
    
    html += '<div class="form-group"><label>Observações</label><textarea class="form-textarea" id="modalDespObservacoes" rows="2" style="min-height: 70px; height: 70px;">' + (observacoesValue || '').replace(/"/g, '&quot;') + '</textarea></div>';
    
    document.getElementById('modalBody').innerHTML = html;
    
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="managerApp.fecharModal()" style="flex: 1; text-align: center; justify-content: center;">Cancelar</button><button class="btn btn-success" id="modalSalvarDesp" style="flex: 1; text-align: center; justify-content: center;">Salvar</button>';
    modal.style.display = 'flex';
    
    var currencyInput = document.getElementById('modalDespValor');
    if (currencyInput) Utils.applyCurrencyMask(currencyInput);
    
    if (isEdicao && assistidoValue) {
        self.carregarAssistidosAtivosParaSelect(assistidoValue);
    } else {
        self.carregarAssistidosAtivosParaSelect();
    }
    
    var selectPC = document.getElementById('modalDespPersonalCare');
    if (selectPC) {
        if (self._personalCaresCache && self._personalCaresCache.length > 0) {
            self._popularSelectPersonalCare(selectPC, self._personalCaresCache, fornecedorValue);
            selectPC.addEventListener('change', function() {
                if (this.value) {
                    var fornecedorInput = document.getElementById('modalDespFornecedor');
                    if (fornecedorInput) {
                        fornecedorInput.value = this.value;
                        fornecedorInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    this.value = '';
                }
            });
        } else {
            selectPC.innerHTML = '<option value="" disabled>⏳ Carregando Personal Cares...</option>';
            self.carregarPersonalCaresAtivos().then(function(personalCares) {
                self._popularSelectPersonalCare(selectPC, personalCares, fornecedorValue);
                selectPC.addEventListener('change', function() {
                    if (this.value) {
                        var fornecedorInput = document.getElementById('modalDespFornecedor');
                        if (fornecedorInput) {
                            fornecedorInput.value = this.value;
                            fornecedorInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        this.value = '';
                    }
                });
            }).catch(function(error) {
                console.error('❌ Erro ao popular dropdown de Personal Cares:', error);
                selectPC.innerHTML = '<option value="">Selecione um Personal Care...</option><option value="" disabled>❌ Erro ao carregar</option>';
            });
        }
    }
    
    var categoriaSelect = document.getElementById('modalDespCat');
    var plantaoContainer = document.getElementById('modalDespPlantaoExtraContainer');
    
    function togglePlantaoExtraFields() {
        if (categoriaSelect.value === 'Plantões Extras') {
            plantaoContainer.style.display = 'block';
            document.getElementById('modalDespAssistido').disabled = false;
            document.getElementById('modalDespDataPlantao').disabled = false;
            document.getElementById('modalDespTurno').disabled = false;
        } else {
            plantaoContainer.style.display = 'none';
            document.getElementById('modalDespAssistido').disabled = true;
            document.getElementById('modalDespDataPlantao').disabled = true;
            document.getElementById('modalDespTurno').disabled = true;
        }
    }
    
    categoriaSelect.addEventListener('change', togglePlantaoExtraFields);
    togglePlantaoExtraFields();
    
    if (isEdicao && assistidoValue) {
        var tentarSetarAssistido = function(tentativas) {
            var select = document.getElementById('modalDespAssistido');
            if (!select) return;
            
            var opcaoExiste = false;
            for (var i = 0; i < select.options.length; i++) {
                if (select.options[i].value === assistidoValue) {
                    opcaoExiste = true;
                    break;
                }
            }
            
            if (opcaoExiste) {
                select.value = assistidoValue;
            } else if (tentativas > 0) {
                setTimeout(function() { tentarSetarAssistido(tentativas - 1); }, 300);
            }
        };
        
        setTimeout(function() { tentarSetarAssistido(5); }, 300);
    }
    
    if (isEdicao && fornecedorValue) {
        var tentarSetarPC = function(tentativas) {
            var select = document.getElementById('modalDespPersonalCare');
            if (!select) return;
            
            var opcaoExiste = false;
            for (var i = 0; i < select.options.length; i++) {
                if (select.options[i].value === fornecedorValue) {
                    opcaoExiste = true;
                    break;
                }
            }
            
            if (opcaoExiste) {
                select.value = fornecedorValue;
            } else if (tentativas > 0) {
                setTimeout(function() { tentarSetarPC(tentativas - 1); }, 300);
            }
        };
        
        setTimeout(function() { tentarSetarPC(5); }, 300);
    }
    
    // ============================================================
    // BOTÃO SALVAR — COM NOVO FLUXO DE BLOQUEIO ;PG
    // ============================================================
    document.getElementById('modalSalvarDesp').onclick = function() {
        var val = Utils.parseCurrencyToNumber(document.getElementById('modalDespValor').value);
        var categoria = document.getElementById('modalDespCat').value;
        var status = document.getElementById('modalDespStatus').value;
        
        var params = {
            data: document.getElementById('modalDespData').value,
            descricao: document.getElementById('modalDespDesc').value,
            categoria: categoria,
            valor: val,
            formaPagamento: document.getElementById('modalDespFormaPagamento').value,
            fornecedor: document.getElementById('modalDespFornecedor').value,
            notaFiscal: document.getElementById('modalDespNotaFiscal').value,
            observacoes: document.getElementById('modalDespObservacoes').value,
            status: status
        };
        
        if (categoria === 'Plantões Extras') {
            params.assistido = document.getElementById('modalDespAssistido').value;
            params.dataPlantao = document.getElementById('modalDespDataPlantao').value;
            params.turno = document.getElementById('modalDespTurno').value.toUpperCase();
            
            if (!params.assistido) {
                Utils.showToast('Selecione um assistido para o Plantão Extra', 'warning');
                document.getElementById('modalDespAssistido').focus();
                return;
            }
            if (!params.dataPlantao) {
                Utils.showToast('Informe a data do plantão', 'warning');
                document.getElementById('modalDespDataPlantao').focus();
                return;
            }
            if (!params.turno) {
                Utils.showToast('Selecione o turno do plantão', 'warning');
                document.getElementById('modalDespTurno').focus();
                return;
            }
        }
        
        if (!params.categoria) {
            Utils.showToast('Selecione uma categoria', 'warning');
            return;
        }
        
        // ============================================================
        // FLUXO ESPECIAL — PLANTÃO EXTRA PAGO
        // ============================================================
        var isPlantaoExtraPago = (categoria === 'Plantões Extras' && status === 'Pago');
        
        if (isPlantaoExtraPago) {
            Utils.showLoading('Verificando escala...');
            
            self._verificarPGExistente(params.assistido, params.dataPlantao, params.turno)
                .then(function(verificacao) {
                    Utils.hideLoading();
                    
                    if (verificacao.erro && !verificacao.existe) {
                        console.warn('⚠️ Não foi possível verificar a escala:', verificacao.erro);
                        // Prossegue — não bloqueia por falha de verificação
                        return { acao: 'prosseguir' };
                    }
                    
                    if (verificacao.existe) {
                        // 🔥 Bloqueio ativo — abre modal
                        var dataFormatada = Utils.formatDateBR(params.dataPlantao);
                        
                        return self._abrirModalPlantaoJaPago({
                            assistido: params.assistido,
                            dataPlantao: params.dataPlantao,
                            dataFormatada: dataFormatada,
                            turno: params.turno,
                            valor: val
                        }).then(function(acao) {
                            if (acao === 'forcar') {
                                self._registrarLogForcado({
                                    assistido: params.assistido,
                                    dataPlantao: params.dataPlantao,
                                    dataFormatada: dataFormatada,
                                    turno: params.turno,
                                    valor: val
                                });
                                return { acao: 'forcar', dataFormatada: dataFormatada };
                            } else if (acao === 'verificar') {
                                self.fecharModal();
                                self.navigate('despesas');
                                setTimeout(function() {
                                    var filtroMes = document.getElementById('filtroMesDespesa');
                                    if (filtroMes && params.dataPlantao) {
                                        filtroMes.value = params.dataPlantao.slice(0, 7);
                                    }
                                    var filtroCat = document.getElementById('filtroCategoriaDespesa');
                                    if (filtroCat) filtroCat.value = 'Plantões Extras';
                                    self.renderDespesas();
                                }, 500);
                                return { acao: 'verificar' };
                            } else {
                                return { acao: 'cancelar' };
                            }
                        });
                    }
                    
                    return { acao: 'prosseguir' };
                })
                .then(function(resultado) {
                    if (resultado.acao === 'cancelar' || resultado.acao === 'verificar') {
                        return; // Não salva
                    }
                    
                    var forcar = (resultado.acao === 'forcar');
                    var dataFormatada = resultado.dataFormatada;
                    
                    // Prossegue com o salvamento
                    Utils.showLoading(forcar ? 'Salvando (forçado)...' : (isEdicao ? 'Atualizando...' : 'Salvando...'));
                    
                    var savePromise = isEdicao ? 
                        API.atualizarDespesa({ ...params, id: despesa.id }) :
                        API.criarDespesa(params);
                    
                    return savePromise.then(function(response) {
                        if (response.result !== 'success') {
                            throw new Error(response.error || 'Erro ao salvar despesa');
                        }
                        
                        // Despesa salva com sucesso — agora atualiza a escala
                        return self.atualizarEscalaPlantaoExtra(params)
                            .then(function(resultadoEscala) {
                                Utils.hideLoading();
                                
                                self.renderDespesas();
                                self.fecharModal();
                                managerApp._atualizarTudoAposOperacaoFinanceira();
                                
                                var dadosCard = {
                                    assistido: params.assistido,
                                    dataFormatada: dataFormatada,
                                    turno: params.turno
                                };
                                
                                if (forcar) {
                                    self._exibirCardConfirmacaoPlantao(dadosCard, { tipo: 'forcado' });
                                } else {
                                    self._exibirCardConfirmacaoPlantao(dadosCard, { tipo: 'sucesso' });
                                }
                            })
                            .catch(function(errorEscala) {
                                Utils.hideLoading();
                                
                                // Despesa salva mas escala falhou → não fecha modal
                                self.renderDespesas();
                                
                                self._exibirCardConfirmacaoPlantao({
                                    assistido: params.assistido,
                                    dataFormatada: dataFormatada,
                                    turno: params.turno
                                }, {
                                    tipo: 'falha',
                                    erro: errorEscala.message
                                });
                                
                                Utils.showToast('❌ Escala NÃO atualizada. Modal mantido aberto.', 'error');
                            });
                    });
                })
                .catch(function(error) {
                    Utils.hideLoading();
                    console.error('❌ Erro no fluxo de Plantão Extra Pago:', error);
                    Utils.showToast('Erro: ' + error.message, 'error');
                });
            
            return;
        }
        
        // ============================================================
        // FLUXO NORMAL (NÃO É PLANTÃO EXTRA PAGO)
        // ============================================================
        Utils.showLoading(isEdicao ? 'Atualizando...' : 'Salvando...');
        
        var savePromiseNormal = isEdicao ? 
            API.atualizarDespesa({ ...params, id: despesa.id }) :
            API.criarDespesa(params);
        
        savePromiseNormal
            .then(function(response) {
                Utils.hideLoading();
                if (response.result === 'success') {
                    Utils.showToast(isEdicao ? 'Despesa atualizada com sucesso!' : 'Despesa criada com sucesso!');
                    self.renderDespesas();
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
    };
};

// =============================================
// ATUALIZAR ESCALA - PLANTÃO EXTRA PAGO (V3)
// =============================================
managerApp.atualizarEscalaPlantaoExtra = function(params) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        if (!params.assistido || !params.dataPlantao || !params.turno) {
            reject(new Error('Dados insuficientes para atualizar escala'));
            return;
        }
        
        var partesData = params.dataPlantao.split('-');
        if (partesData.length !== 3) {
            reject(new Error('Formato de data inválido: ' + params.dataPlantao));
            return;
        }
        
        var ano = parseInt(partesData[0]);
        var mes = parseInt(partesData[1]);
        var dia = parseInt(partesData[2]);
        var turno = String(params.turno).toLowerCase();
        
        if (isNaN(dia) || isNaN(mes) || isNaN(ano) || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
            reject(new Error('Data do plantão inválida'));
            return;
        }
        
        API.getEscalaMes(params.assistido, mes)
            .then(function(data) {
                if (data.result !== 'success') {
                    reject(new Error('Não foi possível carregar a escala'));
                    return;
                }
                
                var escala = data.escala || {};
                var valorAtual = escala[dia] ? (escala[dia][turno] || '') : '';
                
                // Normalizar: remover espaços, maiúsculo
                var valorNormalizado = String(valorAtual).replace(/\s+/g, '').toUpperCase();
                
                // 🔥 Se já contém ;PG → não duplica (mas não deveria acontecer aqui, porque o fluxo bloqueia antes)
                if (valorNormalizado.indexOf(';PG') !== -1) {
                    console.log('ℹ️ Escala já contém ;PG. Nada a fazer.');
                    resolve({ success: true, verified: true, jaExistia: true, valorFinal: valorAtual });
                    return;
                }
                
                // Limpar qualquer resquício de ;PG duplicado ou espaços estranhos
                var nomePC = String(valorAtual).split(';')[0].trim();
                var novoValor = nomePC + ';PG';
                
                var payload = {
                    assistido: params.assistido,
                    mes: mes,
                    dia: parseInt(dia),
                    turno: turno,
                    cuidador: novoValor
                };
                
                API.updateEscala(payload)
                    .then(function(result) {
                        if (result.result !== 'success') {
                            reject(new Error(result.error || 'Erro ao atualizar escala'));
                            return;
                        }
                        
                        // 🔥 READ-BACK — verificação pós-escrita
                        return API.getEscalaMes(params.assistido, mes)
                            .then(function(verificacao) {
                                if (verificacao.result !== 'success') {
                                    reject(new Error('Não foi possível verificar a escala após salvar'));
                                    return;
                                }
                                
                                var valorVerificado = verificacao.escala[dia] ? (verificacao.escala[dia][turno] || '') : '';
                                var normalizado = String(valorVerificado).replace(/\s+/g, '').toUpperCase();
                                
                                if (normalizado.indexOf(';PG') === -1) {
                                    reject(new Error('Escala não contém ;PG após verificação'));
                                    return;
                                }
                                
                                console.log('✅ Escala atualizada e verificada: ' + valorVerificado);
                                resolve({ success: true, verified: true, valorFinal: valorVerificado });
                            });
                    })
                    .catch(function(error) {
                        reject(error);
                    });
            })
            .catch(function(error) {
                reject(error);
            });
    });
};

// =============================================
// EDITAR DESPESA
// =============================================
managerApp.editarDespesa = function(id) {
    var self = this;
    API.listarDespesas()
        .then(function(data) {
            if (data.despesas) {
                var despesa = data.despesas.find(function(d) { 
                    return String(d.id) === String(id); 
                });
                if (despesa) {
                    self.abrirModalDespesa(despesa, id);
                } else {
                    Utils.showToast('Despesa não encontrada', 'error');
                }
            }
        })
        .catch(function(error) { 
            Utils.showToast('Erro ao carregar: ' + error.message, 'error'); 
        });
};

// =============================================
// EXCLUIR DESPESA
// =============================================
managerApp.excluirDespesa = function(id) {
    var self = this;
    this.confirmarExclusao(
        'Deseja realmente excluir esta despesa?',
        '🗑️ Excluir Despesa',
        function(confirmado) {
            if (confirmado) {
                Utils.showLoading('Excluindo...');
                API.excluirDespesa(id)
                    .then(function(data) {
                        Utils.hideLoading();
                        if (data.result === 'success') {
                            Utils.showToast('Despesa excluída com sucesso!');
                            self.renderDespesas();
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
