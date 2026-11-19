// =============================================
// ASSISTIDOS - managerJARDINSCare
// CRUD de assistidos
// Versão 3.1 - Padronização de modais (botões 100% da largura)
// =============================================

// =============================================
// CARREGAR LISTA DE ASSISTIDOS
// =============================================
managerApp.carregarListaAssistidos = function() {
    var self = this;
    var select = document.getElementById('selectAssistido');
    API.getSheets()
        .then(function(data) {
            if (data.result === 'success') {
                var abas = data.sheets.filter(function(s) {
                    return !['Página Inicial', 'Dashboard', 'Configurações'].includes(s);
                });
                self.assistidosList = abas.sort();
                var options = '<option value="">Selecione um assistido...</option>';
                for (var i = 0; i < self.assistidosList.length; i++) {
                    options += '<option value="' + self.assistidosList[i] + '">' + self.assistidosList[i] + '</option>';
                }
                select.innerHTML = options;
                
                self._habilitarBotaoWhatsApp();
            }
        })
        .catch(function(error) { 
            Utils.showToast('Erro ao carregar assistidos: ' + error.message, 'error'); 
        });
};

// =============================================
// HABILITAR/DESABILITAR BOTÃO WHATSAPP
// =============================================
managerApp._habilitarBotaoWhatsApp = function() {
    var select = document.getElementById('selectAssistido');
    var btnWhatsApp = document.getElementById('btnWhatsAppAssistido');
    
    if (!btnWhatsApp) return;
    
    if (select && select.value && select.value !== '') {
        btnWhatsApp.disabled = false;
        btnWhatsApp.title = 'Enviar informações do Personal Care';
    } else {
        btnWhatsApp.disabled = true;
        btnWhatsApp.title = 'Selecione um assistido primeiro';
    }
};

// =============================================
// CARREGAR PERSONAL CARES ATIVOS PARA DROPDOWN
// =============================================
managerApp.carregarPersonalCaresAtivosSelect = function() {
    var select = document.getElementById('selectPcNaoEnviar');
    if (!select) return;
    
    API.getCuidadoresComStatus()
        .then(function(data) {
            if (data.result === 'success' && data.cuidadores) {
                var ativos = data.cuidadores
                    .filter(function(pc) { return pc.status === 'Ativo'; })
                    .map(function(pc) { return pc.nome; })
                    .sort();
                
                var options = '<option value="">Selecione um Personal Care...</option>';
                for (var i = 0; i < ativos.length; i++) {
                    options += '<option value="' + ativos[i] + '">' + ativos[i] + '</option>';
                }
                select.innerHTML = options;
                console.log('✅ Personal Cares ativos carregados:', ativos.length);
            }
        })
        .catch(function(error) {
            console.error('❌ Erro ao carregar Personal Cares:', error);
        });
};

// =============================================
// EXTRAIR CEP DO TEXTO dados_anagraficos
// Procura o padrão NNNNN-NNN (aceita hífen, travessão, ponto, espaço)
// Retorna apenas os 8 dígitos, ou null se não achar
// =============================================
managerApp.extrairCepDoEndereco = function(texto) {
    if (!texto || texto.trim() === '') return null;

    var normalizado = texto.replace(/[\u2013\u2014\u2012]/g, '-');

    var match = normalizado.match(/(\d{5})[\s\-\.]?(\d{3})/);
    if (!match) return null;

    return match[1] + match[2];
};

// =============================================
// SINCRONIZAR CEP DO CAMPO dados_anagraficos
// =============================================
managerApp.sincronizarCepDoEndereco = function() {
    var campoEnd = document.getElementById('campoDadosAnag');
    if (!campoEnd) return null;

    var cep = this.extrairCepDoEndereco(campoEnd.value || '');
    return cep;
};

// =============================================
// CARREGAR DADOS DO ASSISTIDO (CORRIGIDO - COM FALLBACK)
// =============================================
managerApp.carregarDadosAssistido = function() {
    var self = this;
    var nome = document.getElementById('selectAssistido').value;
    
    self._habilitarBotaoWhatsApp();
    
    if (!nome) { 
        this.limparFormAssistido(); 
        this.currentAssistido = null;
        document.getElementById('btnExcluirContainer').style.display = 'none';
        return; 
    }
    
    Utils.showLoading('Carregando dados de ' + nome + '...');
    
    var timeoutId = setTimeout(function() {
        Utils.hideLoading();
        Utils.showToast('⏱️ A requisição está demorando muito. Tentando novamente...', 'warning');
    }, 30000);
    
    API.getDadosAssistido(nome)
        .then(function(data) {
            clearTimeout(timeoutId);
            
            if (data.result === 'success') {
                self.currentAssistido = nome;
                document.getElementById('btnExcluirContainer').style.display = 'block';
                
                // DADOS GERAIS - LINHA 1
                document.getElementById('campoNome').value = data.nome || '';
                document.getElementById('campoDataNasc').value = Utils.formatDate(data.dataNasc);
                document.getElementById('campoSexo').value = data.sexo || '';
                document.getElementById('campoFaixaEtaria').value = data.faixaEtaria || '';
                document.getElementById('campoPeso').value = data.peso || '';
                document.getElementById('campoAltura').value = data.altura || '';
                
                // DADOS GERAIS - LINHA 2
                document.getElementById('campoDadosAnag').value = data.dadosAnagraficos || '';
                document.getElementById('campoResponsaveis').value = data.responsaveis || '';
                document.getElementById('campoMedicos').value = data.medicoResponsavel || '';
                
                // DADOS GERAIS - LINHA 3
                document.getElementById('campoGps').value = data.gpsLocalizador || '';
                document.getElementById('campoRegiao').value = data.regiao || '';
                document.getElementById('campoStatus').value = data.status || '';
                
                // DATA CADASTRO
                var dataCriacaoField = document.getElementById('campoDataCriacao');
                if (data.dataCriacao) {
                    dataCriacaoField.value = Utils.formatDate(data.dataCriacao);
                    dataCriacaoField.readOnly = false;
                } else {
                    var hoje = new Date();
                    var dia = String(hoje.getDate()).padStart(2, '0');
                    var mes = String(hoje.getMonth() + 1).padStart(2, '0');
                    var ano = hoje.getFullYear();
                    dataCriacaoField.value = dia + '/' + mes + '/' + ano;
                    dataCriacaoField.readOnly = false;
                }
                
                // CONTRATO
                document.getElementById('campoInicioContrato').value = Utils.formatDate(data.inicioContrato);
                document.getElementById('campoVctoContrato').value = Utils.formatDate(data.vctoContrato);
                document.getElementById('campoTipoContrato').value = data.tipoContrato || '';
                document.getElementById('campoPeriodo').value = data.periodoContratado || '';
                document.getElementById('campoPlantao').value = data.plantoes || '';
                document.getElementById('campoDiariasMes').value = data.totalHrsMes || '';
                document.getElementById('campoHoraEntrada').value = data.horaEntrada || '';
                document.getElementById('campoHoraSaida').value = data.horaSaida || '';
                document.getElementById('campoVlrPlantao').value = data.vlrPlantao ? Utils.formatCurrency(data.vlrPlantao) : '';
                document.getElementById('campoVlrContrato').value = data.vlrContrato ? Utils.formatCurrency(data.vlrContrato) : '';
                document.getElementById('campoDispMED').value = data.dispMed || '';
                document.getElementById('campoVisitaENF').value = Utils.formatDate(data.visitaEnf);
                document.getElementById('campoVisitaDIR').value = Utils.formatDate(data.visitaDir);
                
                // 🔥 REGISTRAR PRONTUÁRIO (substitui dataConsultas)
                var registrarProntuarioField = document.getElementById('campoRegistrarProntuario');
                if (registrarProntuarioField) {
                    var valor = data.registrarProntuario || 'Obrigatório';
                    // Se o valor não estiver nas opções (dado antigo/corrompido), força 'Obrigatório'
                    if (valor !== 'Obrigatório' && valor !== 'Não Obrigatório') {
                        valor = 'Obrigatório';
                    }
                    registrarProntuarioField.value = valor;
                }
                
                document.getElementById('campoDiaVencimento').value = data.diaVencimento || '';
                document.getElementById('campoPatrono').value = data.patrono || '';
                
                // PADRÕES E SAÚDE
                document.getElementById('campoContatoMedico').value = data.contatoMedico || '';
                document.getElementById('campoContatoFamilia').value = data.contatoFamilia || '';
                document.getElementById('campoLinkGrupoWhatsApp').value = data.linkGrupoWhatsapp || '';
                document.getElementById('campoPressaoPadrao').value = data.pressaoArterial || '';
                document.getElementById('campoGlicemiaPadrao').value = data.glicemia || '';
                
                document.getElementById('campoPatologiasNecessidades').value = data.patologias || '';
                document.getElementById('campoPcDesaprovados').value = data.pcNaoEnviar || '';
                document.getElementById('campoAlimentacaoPadrao').value = data.alimentacao || '';
                document.getElementById('campoAtividadesAssistidoPadrao').value = data.atividadesAssistido || '';
                document.getElementById('campoObservacoesInternas').value = data.observacoesInternas || '';
                document.getElementById('campoScoreSatisfacao').value = data.scoreSatisfacao || '';
                
                // MOTIVO DESLIGAMENTO
                var motivoSelect = document.getElementById('campoMotivoDesligamento');
                var motivoValue = data.motivoDesligamento || '';
                var outroContainer = document.getElementById('campoOutroMotivoContainer');
                var outroInput = document.getElementById('campoOutroMotivo');
                
                var motivosPadrao = [
                    'Familiar optou por cuidar em casa',
                    'Insatisfação com o serviço',
                    'Insatisfação com cuidador(a)',
                    'Transferência para outra cidade',
                    'Óbito',
                    'Concorrência ofereceu preço menor',
                    'Alta médica / Não necessita mais',
                    'Problemas financeiros',
                    'Outros'
                ];
                
                if (motivosPadrao.indexOf(motivoValue) !== -1) {
                    motivoSelect.value = motivoValue;
                    outroContainer.style.display = 'none';
                    outroInput.value = '';
                } else if (motivoValue) {
                    motivoSelect.value = 'Outros';
                    outroContainer.style.display = 'block';
                    outroInput.value = motivoValue;
                } else {
                    motivoSelect.value = '';
                    outroContainer.style.display = 'none';
                    outroInput.value = '';
                }
                
                // SCORE SATISFAÇÃO
                var score = parseInt(data.scoreSatisfacao);
                if (!isNaN(score) && score < 70 && score > 0) {
                    var scoreField = document.getElementById('campoScoreSatisfacao');
                    if (scoreField) {
                        scoreField.classList.add('field-alert');
                    }
                    Utils.showToast('⚠️ Score de satisfação baixo (' + score + '/100)', 'warning');
                } else {
                    var scoreField = document.getElementById('campoScoreSatisfacao');
                    if (scoreField) {
                        scoreField.classList.remove('field-alert');
                    }
                }
                
                // DIAS DA SEMANA
                var diasStr = data.diaSemana || '';
                var diasArray = diasStr.split(';').map(function(d) { return d.trim(); });
                var diasItems = document.querySelectorAll('.dia-semana-item');
                for (var i = 0; i < diasItems.length; i++) {
                    var dia = diasItems[i].getAttribute('data-dia');
                    if (diasArray.includes(dia)) {
                        diasItems[i].classList.add('selecionado');
                    } else {
                        diasItems[i].classList.remove('selecionado');
                    }
                }
                
                Utils.hideLoading();
            } else {
                clearTimeout(timeoutId);
                throw new Error(data.error || 'Erro ao carregar dados');
            }
        })
        .catch(function(error) {
            clearTimeout(timeoutId);
            console.error('❌ Erro ao carregar dados de', nome, ':', error);
            
            Utils.hideLoading();
            
            if (error.message && (error.message.includes('timeout') || error.message.includes('Failed to fetch') || error.message.includes('AbortError'))) {
                Utils.showToast('⏱️ Tempo excedido ao carregar ' + nome + '. Tente novamente.', 'error');
                
                if (confirm('O servidor demorou para responder. Deseja tentar carregar ' + nome + ' novamente?')) {
                    self.carregarDadosAssistido();
                }
            } else {
                Utils.showToast('❌ Erro ao carregar dados: ' + error.message, 'error');
            }
        });
};

// =============================================
// ABRIR MODAL PERSONAL CARE
// =============================================
managerApp.abrirModalPersonalCare = function() {
    var self = this;
    var assistido = this.currentAssistido;
    
    if (!assistido) {
        Utils.showToast('Selecione um assistido primeiro', 'warning');
        return;
    }
    
    Utils.showLoading('Carregando dados...');
    
    API.getDadosAssistido(assistido)
        .then(function(dadosAssistido) {
            if (dadosAssistido.result !== 'success') {
                throw new Error('Não foi possível buscar dados do assistido');
            }
            
            return self.obterPersonalCaresAtivos()
                .then(function(personalCaresAtivos) {
                    Utils.hideLoading();
                    
                    if (personalCaresAtivos.length === 0) {
                        Utils.showToast('⚠️ Nenhum Personal Care ativo disponível', 'warning');
                        return;
                    }
                    
                    self.exibirModalSelecaoPersonal(assistido, dadosAssistido, personalCaresAtivos);
                });
        })
        .catch(function(error) {
            Utils.hideLoading();
            Utils.showToast('❌ Erro: ' + error.message, 'error');
        });
};

// =============================================
// OBTER PERSONAL CARES ATIVOS
// =============================================
managerApp.obterPersonalCaresAtivos = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        if (self._personalCaresCache && self._personalCaresCache.length > 0) {
            console.log('📋 Usando cache de Personal Cares Ativos:', self._personalCaresCache.length);
            resolve(self._personalCaresCache);
            return;
        }
        
        console.log('🔄 Buscando Personal Cares Ativos da API...');
        
        var timeoutId = setTimeout(function() {
            console.warn('⚠️ Timeout ao buscar Personal Cares. Usando fallback...');
            var fallbackList = self._obterPersonalCaresDoDashboard();
            if (fallbackList.length > 0) {
                self._personalCaresCache = fallbackList;
                resolve(fallbackList);
            } else {
                reject(new Error('Timeout ao carregar Personal Cares'));
            }
        }, 10000);
        
        API.getCuidadoresComStatus()
            .then(function(data) {
                clearTimeout(timeoutId);
                
                if (data.result === 'success' && data.cuidadores) {
                    var ativos = data.cuidadores
                        .filter(function(pc) { 
                            return pc.status === 'Ativo'; 
                        })
                        .map(function(pc) { 
                            return pc.nome; 
                        })
                        .sort();
                    
                    self._personalCaresCache = ativos;
                    console.log('✅ Personal Cares Ativos carregados:', ativos.length);
                    resolve(ativos);
                } else {
                    console.warn('⚠️ API retornou erro, usando fallback...');
                    var fallbackList = self._obterPersonalCaresDoDashboard();
                    if (fallbackList.length > 0) {
                        self._personalCaresCache = fallbackList;
                        resolve(fallbackList);
                    } else {
                        reject(new Error('Não foi possível carregar Personal Cares'));
                    }
                }
            })
            .catch(function(error) {
                clearTimeout(timeoutId);
                console.error('❌ Erro ao buscar Personal Cares:', error);
                
                var fallbackList = self._obterPersonalCaresDoDashboard();
                if (fallbackList.length > 0) {
                    self._personalCaresCache = fallbackList;
                    resolve(fallbackList);
                } else {
                    reject(error);
                }
            });
    });
};

// =============================================
// FUNÇÃO DE FALLBACK - USA DADOS DO DASHBOARD
// =============================================
managerApp._obterPersonalCaresDoDashboard = function() {
    var dashboard = this.dashboardCache || {};
    var lista = [];
    
    if (dashboard.cuidadores && Array.isArray(dashboard.cuidadores)) {
        var ativos = dashboard.cuidadores
            .filter(function(pc) { 
                return pc.status === 'Ativo'; 
            })
            .map(function(pc) { 
                return pc.nome; 
            })
            .sort();
        
        if (ativos.length > 0) {
            console.log('✅ Personal Cares carregados do dashboardCache (cuidadores):', ativos.length);
            return ativos;
        }
    }
    
    if (dashboard.assistidos && Array.isArray(dashboard.assistidos)) {
        var cuidadoresUnicos = {};
        dashboard.assistidos.forEach(function(a) {
            if (a.cuidadora && a.cuidadora.trim() !== '') {
                cuidadoresUnicos[a.cuidadora] = true;
            }
        });
        lista = Object.keys(cuidadoresUnicos).sort();
        if (lista.length > 0) {
            console.log('✅ Personal Cares extraídos dos assistidos:', lista.length);
            return lista;
        }
    }
    
    if (this.assistidosList && this.assistidosList.length > 0) {
        console.log('⚠️ Usando assistidosList como fallback:', this.assistidosList.length);
        return this.assistidosList;
    }
    
    console.warn('⚠️ Nenhum Personal Care encontrado em nenhuma fonte');
    return [];
};

// =============================================
// NOVO ASSISTIDO
// =============================================
managerApp.novoAssistido = function() {
    this.limparFormAssistido();
    this.currentAssistido = null;
    document.getElementById('btnExcluirContainer').style.display = 'none';
    document.getElementById('selectAssistido').value = '';
    this.mudarAba('dados');
    
    var btnWhatsApp = document.getElementById('btnWhatsAppAssistido');
    if (btnWhatsApp) btnWhatsApp.disabled = true;
    
    var hoje = new Date();
    var dia = String(hoje.getDate()).padStart(2, '0');
    var mes = String(hoje.getMonth() + 1).padStart(2, '0');
    var ano = hoje.getFullYear();
    var dataCriacaoField = document.getElementById('campoDataCriacao');
    dataCriacaoField.value = dia + '/' + mes + '/' + ano;
    dataCriacaoField.readOnly = false;
};

// =============================================
// CANCELAR FORMULÁRIO
// =============================================
managerApp.cancelarFormulario = function() {
    this.limparFormAssistido();
    this.currentAssistido = null;
    document.getElementById('btnExcluirContainer').style.display = 'none';
    document.getElementById('selectAssistido').value = '';
    this.mudarAba('dados');
    
    var btnWhatsApp = document.getElementById('btnWhatsAppAssistido');
    if (btnWhatsApp) btnWhatsApp.disabled = true;
    
    Utils.showToast('Formulário limpo');
};

// =============================================
// LIMPAR FORMULÁRIO
// =============================================
managerApp.limparFormAssistido = function() {
    var campos = [
        'campoNome', 'campoDataNasc', 'campoSexo', 'campoFaixaEtaria', 'campoPeso', 'campoAltura',
        'campoDadosAnag', 'campoResponsaveis', 'campoMedicos',
        'campoGps', 'campoRegiao', 'campoStatus', 'campoDataCriacao',
        'campoInicioContrato', 'campoVctoContrato', 'campoTipoContrato', 'campoPeriodo',
        'campoPlantao', 'campoDiariasMes', 'campoHoraEntrada', 'campoHoraSaida',
        'campoVlrPlantao', 'campoVlrContrato', 'campoDispMED', 'campoVisitaENF',
        'campoVisitaDIR', 'campoRegistrarProntuario', 'campoDiaVencimento', 'campoScoreSatisfacao',
        'campoContatoMedico', 'campoContatoFamilia', 'campoLinkGrupoWhatsApp',
        'campoPressaoPadrao', 'campoGlicemiaPadrao',
        'campoPatologiasNecessidades', 'campoPcDesaprovados',
        'campoAlimentacaoPadrao', 'campoAtividadesAssistidoPadrao',
        'campoObservacoesInternas', 'campoMotivoDesligamento', 'campoPatrono'
    ];
    for (var i = 0; i < campos.length; i++) {
        var el = document.getElementById(campos[i]);
        if (el) {
            if (el.tagName === 'SELECT') {
                el.value = '';
            } else {
                el.value = '';
            }
        }
    }
    
    // 🔥 Default 'Obrigatório' no select REGISTRAR PRONTUÁRIO após limpar
    var registrarProntuario = document.getElementById('campoRegistrarProntuario');
    if (registrarProntuario) {
        registrarProntuario.value = 'Obrigatório';
    }
    
    document.getElementById('selectPatologia').value = '';
    document.getElementById('selectPcNaoEnviar').value = '';
    
    document.getElementById('campoOutroMotivoContainer').style.display = 'none';
    document.getElementById('campoOutroMotivo').value = '';
    
    var scoreField = document.getElementById('campoScoreSatisfacao');
    if (scoreField) {
        scoreField.classList.remove('field-alert');
    }
    
    var diasItems = document.querySelectorAll('.dia-semana-item');
    for (var j = 0; j < diasItems.length; j++) {
        diasItems[j].classList.remove('selecionado');
    }
    this.removerDestaquesCampos();
};

// =============================================
// MUDAR ABA
// =============================================
managerApp.mudarAba = function(aba) {
    var tabs = document.querySelectorAll('.tab-inline');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
        if (tabs[i].getAttribute('data-tab') === aba) {
            tabs[i].classList.add('active');
        }
    }
    document.getElementById('tabDados').style.display = aba === 'dados' ? 'block' : 'none';
    document.getElementById('tabContrato').style.display = aba === 'contrato' ? 'block' : 'none';
    document.getElementById('tabPadroes').style.display = aba === 'padroes' ? 'block' : 'none';
};

// =============================================
// VALIDAÇÃO
// =============================================
managerApp.removerDestaquesCampos = function() {
    for (var i = 0; i < this.camposObrigatorios.length; i++) {
        var el = document.getElementById(this.camposObrigatorios[i].id);
        if (el) {
            el.classList.remove('field-error');
        }
    }
};

managerApp.validarCamposObrigatorios = function() {
    this.removerDestaquesCampos();
    var faltantes = [];
    for (var i = 0; i < this.camposObrigatorios.length; i++) {
        var campo = this.camposObrigatorios[i];
        var el = document.getElementById(campo.id);
        var valor = el ? el.value : '';
        if (campo.id === 'campoDiaVencimento') {
            var tipoContrato = document.getElementById('campoTipoContrato').value;
            if (tipoContrato !== 'MENSAL') {
                continue;
            }
        }
        if (!valor || valor.trim() === '') {
            faltantes.push(campo);
            if (el) el.classList.add('field-error');
        }
    }
    return faltantes;
};

managerApp.exibirErroValidacao = function(faltantes) {
    if (faltantes.length === 0) return true;
    this.mudarAba(faltantes[0].aba);
    var listaHtml = '';
    for (var i = 0; i < faltantes.length; i++) {
        listaHtml += '<div style="padding:6px 0;"><span style="color:var(--danger);">●</span> <strong>' + faltantes[i].nome + '</strong></div>';
    }
    var modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').innerHTML = '⚠️ Campos Obrigatórios';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;"><div style="font-size:48px;">⚠️</div><p style="margin:16px 0;">Os seguintes campos são obrigatórios:</p><div style="background:var(--gray-50); padding:12px; border-radius:8px; text-align:left;">' + listaHtml + '</div></div>';
    
    // 🔥 PADRONIZADO: botão único ocupa 100% da largura
    document.getElementById('modalFooter').innerHTML = 
        '<div style="display: flex; gap: 12px; width: 100%;">' +
        '  <button class="btn btn-primary" id="modalValidacaoOkBtn" style="width: 100%;">OK</button>' +
        '</div>';
    
    modal.style.display = 'flex';
    document.getElementById('modalValidacaoOkBtn').onclick = function() {
        modal.style.display = 'none';
    };
    return false;
};

managerApp.validarDiaVencimento = function() {
    var dia = parseInt(document.getElementById('campoDiaVencimento').value);
    if (dia && (dia < 1 || dia > 31)) {
        Utils.showToast('⚠️ Dia de vencimento deve ser entre 1 e 31', 'warning');
        document.getElementById('campoDiaVencimento').classList.add('field-error');
        return false;
    }
    document.getElementById('campoDiaVencimento').classList.remove('field-error');
    return true;
};

managerApp.validarScoreSatisfacao = function() {
    var score = parseInt(document.getElementById('campoScoreSatisfacao').value);
    if (score && (score < 0 || score > 100)) {
        Utils.showToast('⚠️ Score de satisfação deve ser entre 0 e 100', 'warning');
        document.getElementById('campoScoreSatisfacao').classList.add('field-error');
        return false;
    }
    document.getElementById('campoScoreSatisfacao').classList.remove('field-error');
    return true;
};

// =============================================
// SALVAR ASSISTIDO
// =============================================
managerApp.salvarAssistido = function() {
    var self = this;
    
    if (!this.validarDiaVencimento()) return;
    if (!this.validarScoreSatisfacao()) return;
    
    var faltantes = this.validarCamposObrigatorios();
    if (!this.exibirErroValidacao(faltantes)) return;
    
    var nome = document.getElementById('campoNome').value.trim();
    var isNovoAssistido = !this.currentAssistido;
    
    var motivoSelect = document.getElementById('campoMotivoDesligamento');
    var motivoValue = motivoSelect.value;
    if (motivoValue === 'Outros') {
        var outroMotivo = document.getElementById('campoOutroMotivo').value.trim();
        if (outroMotivo) {
            motivoValue = outroMotivo;
        } else {
            Utils.showToast('Por favor, especifique o motivo ao selecionar "Outros"', 'warning');
            return;
        }
    }
    
    // 🔥 Extrai o CEP do endereço (dados_anagraficos)
    var cepExtraido = this.sincronizarCepDoEndereco();
    
    Utils.showLoading('Salvando...');
    
    var data = {
        assistido: this.currentAssistido || nome,
        nome: nome,
        cep: cepExtraido,
        // DADOS GERAIS
        dataNasc: document.getElementById('campoDataNasc').value || '',
        sexo: document.getElementById('campoSexo').value || '',
        faixaEtaria: document.getElementById('campoFaixaEtaria').value || '',
        peso: document.getElementById('campoPeso').value || '',
        altura: document.getElementById('campoAltura').value || '',
        dadosAnag: document.getElementById('campoDadosAnag').value || '',
        responsaveis: document.getElementById('campoResponsaveis').value || '',
        medicos: document.getElementById('campoMedicos').value || '',
        gps: document.getElementById('campoGps').value || '',
        regiao: document.getElementById('campoRegiao').value || '',
        status: document.getElementById('campoStatus').value || '',
        dataCriacao: document.getElementById('campoDataCriacao').value || '',
        
        // CONTRATO
        inicioContrato: document.getElementById('campoInicioContrato').value || '',
        vctoContrato: document.getElementById('campoVctoContrato').value || '',
        periodoContratado: document.getElementById('campoPeriodo').value || '',
        tipoContrato: document.getElementById('campoTipoContrato').value || '',
        plantao: document.getElementById('campoPlantao').value || '',
        totalHrsMes: document.getElementById('campoDiariasMes').value || '',
        vlrPlantao: Utils.parseCurrencyToNumber(document.getElementById('campoVlrPlantao').value),
        vlrContrato: Utils.parseCurrencyToNumber(document.getElementById('campoVlrContrato').value),
        horaENT: document.getElementById('campoHoraEntrada').value || '',
        horaSAI: document.getElementById('campoHoraSaida').value || '',
        diaVencimento: document.getElementById('campoDiaVencimento').value || '',
        scoreSatisfacao: document.getElementById('campoScoreSatisfacao').value || '',
        diaSemana: this.getDiasSemanaString(),
        dispMED: document.getElementById('campoDispMED').value || '',
        visitaENF: document.getElementById('campoVisitaENF').value || '',
        visitaDIR: document.getElementById('campoVisitaDIR').value || '',
        
        // 🔥 REGISTRAR PRONTUÁRIO (substitui dataConsultas)
        registrarProntuario: document.getElementById('campoRegistrarProntuario').value || 'Obrigatório',
        
        patrono: document.getElementById('campoPatrono').value || '',
        
        // PADRÕES E SAÚDE
        contatoMedico: document.getElementById('campoContatoMedico').value || '',
        contatoFamilia: document.getElementById('campoContatoFamilia').value || '',
        linkGrupoWhatsApp: document.getElementById('campoLinkGrupoWhatsApp').value || '',
        pressaoPadrao: document.getElementById('campoPressaoPadrao').value || '',
        glicemiaPadrao: document.getElementById('campoGlicemiaPadrao').value || '',
        patologias: document.getElementById('campoPatologiasNecessidades').value || ' ',
        pcNaoEnviar: document.getElementById('campoPcDesaprovados').value || '',
        alimentacaoPadrao: document.getElementById('campoAlimentacaoPadrao').value || '',
        patologiasNecessidades: document.getElementById('campoPatologiasNecessidades').value || '',
        atividadesAssistidoPadrao: document.getElementById('campoAtividadesAssistidoPadrao').value || '',
        observacoesInternas: document.getElementById('campoObservacoesInternas').value || '',
        motivoDesligamento: motivoValue || ''
    };
    
    if (this.currentAssistido && this.currentAssistido !== nome) {
        data.originalAssistido = this.currentAssistido;
        data.novoAssistido = nome;
    }
    
    API.updateDadosAnagraficos(data)
        .then(function(response) {
            if (response.result === 'success') {
                Utils.showToast('Assistido salvo com sucesso!');
                managerApp.invalidarCache('assistidos');
                managerApp.invalidarCache('dashboard');
                
                if (isNovoAssistido) {
                    self.verificarAssistidoExistente(nome);
                }
                self.carregarListaAssistidos();
                self.carregarAssistidosParaFiltro();
                self.limparFormAssistido();
                self.currentAssistido = null;
                document.getElementById('btnExcluirContainer').style.display = 'none';
                document.getElementById('selectAssistido').value = '';
                self.mudarAba('dados');
            }
            Utils.hideLoading();
        })
        .catch(function(error) {
            Utils.showToast('Erro ao salvar: ' + error.message, 'error');
            Utils.hideLoading();
        });
};

// =============================================
// VERIFICAR ASSISTIDO EXISTENTE
// =============================================
managerApp.verificarAssistidoExistente = function(nomeAssistido) {
    API.createSheet(nomeAssistido)
        .then(function(data) {
            if (data.result === 'success') {
                console.log('✅ Verificação do assistido realizada para:', nomeAssistido);
            } else {
                console.warn('⚠️ Erro ao verificar assistido:', data.error);
            }
        })
        .catch(function(error) {
            console.warn('⚠️ Erro ao verificar assistido:', error.message);
        });
};

// =============================================
// DIAS DA SEMANA
// =============================================
managerApp.getDiasSemanaString = function() {
    var dias = [];
    var items = document.querySelectorAll('.dia-semana-item.selecionado');
    for (var i = 0; i < items.length; i++) {
        dias.push(items[i].getAttribute('data-dia'));
    }
    return dias.join(';');
};

managerApp.initDiasSemana = function() {
    var items = document.querySelectorAll('.dia-semana-item');
    for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function() {
            this.classList.toggle('selecionado');
        });
    }
};

// =============================================
// PATOLOGIA SELECT
// =============================================
managerApp.initPatologiaSelect = function() {
    var selectPatologia = document.getElementById('selectPatologia');
    var textareaPatologias = document.getElementById('campoPatologiasNecessidades');
    
    if (!selectPatologia || !textareaPatologias) return;
    
    selectPatologia.addEventListener('change', function() {
        var valorSelecionado = this.value;
        if (valorSelecionado && valorSelecionado !== '') {
            var conteudoAtual = textareaPatologias.value;
            var itens = conteudoAtual ? conteudoAtual.split(';').map(function(i) { return i.trim(); }) : [];
            if (!itens.includes(valorSelecionado)) {
                var novoConteudo = conteudoAtual ? conteudoAtual + '; ' + valorSelecionado : valorSelecionado;
                textareaPatologias.value = novoConteudo;
                Utils.showToast('Patologia "' + valorSelecionado + '" adicionada');
            } else {
                Utils.showToast('Patologia já adicionada', 'warning');
            }
            this.value = '';
        }
    });
};

// =============================================
// PERSONAL CARES (NÃO ENVIAR)
// =============================================
managerApp.initPcNaoEnviarSelect = function() {
    var selectPc = document.getElementById('selectPcNaoEnviar');
    var textareaPc = document.getElementById('campoPcDesaprovados');
    
    if (!selectPc || !textareaPc) return;
    
    this.carregarPersonalCaresAtivosSelect();
    
    selectPc.addEventListener('change', function() {
        var valorSelecionado = this.value;
        if (valorSelecionado && valorSelecionado !== '') {
            var conteudoAtual = textareaPc.value;
            var itens = conteudoAtual ? conteudoAtual.split(';').map(function(i) { return i.trim(); }) : [];
            if (!itens.includes(valorSelecionado)) {
                var novoConteudo = conteudoAtual ? conteudoAtual + '; ' + valorSelecionado : valorSelecionado;
                textareaPc.value = novoConteudo;
                Utils.showToast('Personal Care "' + valorSelecionado + '" adicionado');
            } else {
                Utils.showToast('Personal Care já adicionado', 'warning');
            }
            this.value = '';
        }
    });
};

// =============================================
// MOTIVO DESLIGAMENTO
// =============================================
managerApp.initMotivoDesligamento = function() {
    var motivoSelect = document.getElementById('campoMotivoDesligamento');
    var outroContainer = document.getElementById('campoOutroMotivoContainer');
    
    if (motivoSelect) {
        motivoSelect.addEventListener('change', function() {
            if (this.value === 'Outros') {
                outroContainer.style.display = 'block';
            } else {
                outroContainer.style.display = 'none';
                document.getElementById('campoOutroMotivo').value = '';
            }
        });
    }
};

// =============================================
// EXCLUIR ASSISTIDO
// =============================================
managerApp.confirmarExclusao = function(mensagem, titulo, callback) {
    var modal = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').innerHTML = titulo || '⚠️ Confirmar Exclusão';
    document.getElementById('modalBody').innerHTML =
        '<div class="modal-confirm-icon">🗑️</div>' +
        '<div class="modal-confirm-title">' + (titulo || 'Confirmar Exclusão') + '</div>' +
        '<div class="modal-confirm-message">' + mensagem + '</div>' +
        '<div class="modal-confirm-warning">⚠️ Esta ação não pode ser desfeita</div>';
    
    // 🔥 PADRONIZADO: botões com flex: 1 (ocupam 50% cada)
    document.getElementById('modalFooter').innerHTML =
        '<div style="display: flex; gap: 12px; width: 100%;">' +
        '  <button class="btn btn-secondary" id="modalConfirmCancelBtn" style="flex: 1;">Cancelar</button>' +
        '  <button class="btn btn-danger" id="modalConfirmOkBtn" style="flex: 1;">Confirmar Exclusão</button>' +
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

managerApp.excluirAssistido = function() {
    var self = this;
    if (!this.currentAssistido) return;
    var nomeAssistido = this.currentAssistido;
    this.confirmarExclusao(
        'Deseja realmente excluir permanentemente o assistido <strong>"' + nomeAssistido + '"</strong>?<br><br>Todas as escalas e históricos deste assistido também serão excluídos.',
        '🗑️ Excluir Assistido',
        function(confirmado) {
            if (!confirmado) return;
            Utils.showLoading('Excluindo assistido e escalas...');
            API.deleteAssistido(nomeAssistido)
                .then(function(data) {
                    Utils.hideLoading();
                    if (data.result === 'success') {
                        Utils.showToast('✅ Assistido excluído com sucesso!');
                        managerApp.invalidarCache('assistidos');
                        managerApp.invalidarCache('dashboard');
                        self.carregarListaAssistidos();
                        self.limparFormAssistido();
                        self.currentAssistido = null;
                        document.getElementById('btnExcluirContainer').style.display = 'none';
                        document.getElementById('selectAssistido').value = '';
                        self.carregarAssistidosParaFiltro();
                    } else {
                        Utils.showToast('❌ Erro ao excluir: ' + (data.error || 'Erro desconhecido'), 'error');
                    }
                })
                .catch(function(error) {
                    Utils.hideLoading();
                    Utils.showToast('❌ Erro ao excluir: ' + error.message, 'error');
                });
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

// =============================================
// INICIALIZAR
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof managerApp.initAssistidos === 'function') {
        managerApp.initAssistidos();
    }
});

var _initAssistidosOriginal = managerApp.initAssistidos || function() {};
managerApp.initAssistidos = function() {
    _initAssistidosOriginal();
    this.initPatologiaSelect();
    this.initPcNaoEnviarSelect();
    this.carregarPersonalCaresAtivosSelect();
};

// =============================================
// IMPORTAÇÃO DE QUESTIONÁRIO WHATSAPP
// =============================================

managerApp.abrirModalImportarQuestionario = function() {
    var modal = document.getElementById('modalOverlay');
    
    document.getElementById('modalTitle').innerHTML = '📋 Importar Questionário WhatsApp';
    
    var html = '';
    html += '<div style="margin-bottom: 8px;">';
    html += '  <p style="font-size: 12px; color: var(--gray-500);">Cole o texto do WhatsApp e clique em "Analisar"</p>';
    html += '</div>';
    html += '<div class="form-group">';
    html += '  <label>📄 Texto do Questionário</label>';
    html += '  <textarea class="form-textarea" id="importWhatsAppTexto" rows="12" style="min-height: 200px; font-family: monospace; font-size: 13px;" placeholder="Cole aqui o conteúdo do WhatsApp..."></textarea>';
    html += '</div>';
    html += '<div id="importWhatsAppPreview" style="display: none; margin-top: 16px; border-top: 2px dashed var(--gray-200); padding-top: 16px;">';
    html += '  <div style="font-weight: 600; font-size: 14px; margin-bottom: 12px;">📊 Dados Extraídos</div>';
    html += '  <div id="importWhatsAppCampos" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;"></div>';
    html += '</div>';
    
    document.getElementById('modalBody').innerHTML = html;
    // ✅ Já está no padrão — mantido
    document.getElementById('modalFooter').innerHTML = 
        '<div style="display: flex; gap: 8px; width: 100%;">' +
        '<button class="btn btn-secondary" onclick="managerApp.fecharModal()" style="flex: 1; text-align: center; justify-content: center;">Cancelar</button>' +
        '<button class="btn btn-secondary" id="importWhatsAppAnalisarBtn" style="flex: 1; text-align: center; justify-content: center;">🔍 Analisar</button>' +
        '<button class="btn btn-success" id="importWhatsAppCadastrarBtn" disabled style="flex: 1; text-align: center; justify-content: center;">✅ Cadastrar Assistido</button>' +
        '</div>';
    
    modal.style.display = 'flex';
    
    document.getElementById('importWhatsAppAnalisarBtn').onclick = function() {
        var texto = document.getElementById('importWhatsAppTexto').value;
        if (!texto || texto.trim() === '') {
            Utils.showToast('Cole o texto do questionário primeiro', 'warning');
            return;
        }
        managerApp._analisarQuestionarioWhatsApp(texto);
    };
    
    document.getElementById('importWhatsAppCadastrarBtn').onclick = function() {
        managerApp._cadastrarAssistidoPorImportacao();
    };
};

managerApp._analisarQuestionarioWhatsApp = function(texto) {
    console.log('📋 Analisando questionário WhatsApp...');
    
    var dados = {
        responsavelNome: '',
        responsavelTelefone: '',
        responsavelDataNasc: '',
        responsavelCPF: '',
        responsavelRG: '',
        responsavelEmail: '',
        responsavelEndereco: '',
        assistidoNome: '',
        assistidoDataNasc: '',
        assistidoAltura: '',
        assistidoPeso: '',
        assistidoEndereco: '',
        assistidoPatologias: '',
        dataInicio: '',
        dataFim: '',
        plantao: '',
        horaEntrada: '',
        horaSaida: '',
        sexo: '',
        faixaEtaria: '',
        diaVencimento: '',
        valorPlantao: 0,
        patologiaDropdown: ''
    };
    
    var linhas = texto.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l !== ''; });
    
    var inicioAssistido = -1;
    for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i];
        if (linha.match(/^ASSISTIDO/i) || 
            linha.match(/^ASSISTIDA/i) || 
            linha.match(/^CRIANÇA/i) || 
            linha.match(/^BEBÊ/i) || 
            linha.match(/^DADOS\s*DO\s*ASSISTIDO/i) ||
            linha.match(/^DADOS\s*DA\s*ASSISTIDA/i)) {
            inicioAssistido = i;
            break;
        }
    }
    
    function extrairValor(linha, padrao) {
        var match = linha.match(padrao);
        return match ? match[1].trim() : '';
    }
    
    function contemChave(linha, chave) {
        return linha.match(new RegExp('^' + chave + '\\s*[:.]', 'i')) !== null;
    }
    
    function normalizarData(dataStr) {
        if (!dataStr) return '';
        dataStr = dataStr.trim();
        var parts = dataStr.split('/');
        if (parts.length === 3) {
            var dia = parts[0].padStart(2, '0');
            var mes = parts[1].padStart(2, '0');
            var ano = parts[2];
            if (ano.length === 2) ano = '20' + ano;
            if (ano.length === 4) return dia + '/' + mes + '/' + ano;
        }
        var partsHifen = dataStr.split('-');
        if (partsHifen.length === 3) {
            var dia = partsHifen[0].padStart(2, '0');
            var mes = partsHifen[1].padStart(2, '0');
            var ano = partsHifen[2];
            if (ano.length === 2) ano = '20' + ano;
            if (ano.length === 4) return dia + '/' + mes + '/' + ano;
        }
        if (dataStr.match(/^\d{8}$/)) {
            var dia = dataStr.slice(0, 2);
            var mes = dataStr.slice(2, 4);
            var ano = dataStr.slice(4, 8);
            return dia + '/' + mes + '/' + ano;
        }
        if (dataStr.match(/^\d{6}$/)) {
            var dia = dataStr.slice(0, 2);
            var mes = dataStr.slice(2, 4);
            var ano = '20' + dataStr.slice(4, 6);
            return dia + '/' + mes + '/' + ano;
        }
        return dataStr;
    }
    
    function normalizarHorario(horarioStr) {
        if (!horarioStr) return '';
        var valor = horarioStr.trim().toLowerCase();
        valor = valor.replace(/\s*(h|hrs|hr)\s*/i, '');
        var parts = valor.split(':');
        var hora = '';
        var minuto = '00';
        if (parts.length === 2) {
            hora = parts[0].trim();
            minuto = parts[1].trim();
        } else {
            var numMatch = valor.match(/(\d+)/);
            if (numMatch) {
                hora = numMatch[1];
            }
        }
        var horaNum = parseInt(hora);
        if (!isNaN(horaNum) && horaNum >= 0 && horaNum <= 23) {
            hora = String(horaNum).padStart(2, '0');
        } else {
            return horarioStr;
        }
        var minutoNum = parseInt(minuto);
        if (!isNaN(minutoNum) && minutoNum >= 0 && minutoNum <= 59) {
            minuto = String(minutoNum).padStart(2, '0');
        } else {
            minuto = '00';
        }
        return hora + ':' + minuto;
    }
    
    for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i];
        var isAssistido = (inicioAssistido !== -1 && i > inicioAssistido);
        
        if (linha.match(/^RESPONS[AÁ]VEL/i) || linha.match(/^DADOS\s*DO\s*RESPONS[AÁ]VEL/i)) {
            isAssistido = false;
            continue;
        }
        if (linha.match(/^ASSISTIDO/i) || 
            linha.match(/^ASSISTIDA/i) || 
            linha.match(/^CRIANÇA/i) || 
            linha.match(/^BEBÊ/i) || 
            linha.match(/^DADOS\s*DO\s*ASSISTIDO/i) ||
            linha.match(/^DADOS\s*DA\s*ASSISTIDA/i)) {
            isAssistido = true;
            continue;
        }
        
        if (!isAssistido) {
            if (linha.match(/^Nome\s*(?:Completo\s*|do\s*respons[aá]vel\s*)?[:.]/i)) {
                var valor = extrairValor(linha, /^Nome\s*(?:Completo\s*|do\s*respons[aá]vel\s*)?[:.]\s*(.+)/i);
                if (valor && !dados.responsavelNome) {
                    var partes = valor.trim().split(' ');
                    if (partes.length >= 2) {
                        dados.responsavelNome = partes[0] + ' ' + partes[1];
                    } else if (partes.length === 1) {
                        dados.responsavelNome = partes[0];
                    } else {
                        dados.responsavelNome = valor;
                    }
                }
            }
            else if (linha.match(/^Endere[çc]o\s*(?:Completo\s*)?[:.]/i)) {
                var valor = extrairValor(linha, /^Endere[çc]o\s*(?:Completo\s*)?[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco = valor;
            }
            else if (linha.match(/^Rua\s*[:.]/i)) {
                var valor = extrairValor(linha, /^Rua\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco += (dados.responsavelEndereco ? ', ' : '') + valor;
            }
            else if (linha.match(/^N[úu]mero\s*[:.]/i)) {
                var valor = extrairValor(linha, /^N[úu]mero\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco += (dados.responsavelEndereco ? ', ' : '') + 'nº ' + valor;
            }
            else if (linha.match(/^Complemento\s*[:.]/i)) {
                var valor = extrairValor(linha, /^Complemento\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco += (dados.responsavelEndereco ? ', ' : '') + valor;
            }
            else if (linha.match(/^Bairro\s*[:.]/i)) {
                var valor = extrairValor(linha, /^Bairro\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco += (dados.responsavelEndereco ? ', ' : '') + valor;
            }
            else if (linha.match(/^Cidade\s*[:.]/i)) {
                var valor = extrairValor(linha, /^Cidade\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco += (dados.responsavelEndereco ? ', ' : '') + valor;
            }
            else if (linha.match(/^(?:Estado|UF)\s*[:.]/i)) {
                var valor = extrairValor(linha, /^(?:Estado|UF)\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco += (dados.responsavelEndereco ? '-' : '') + valor;
            }
            else if (linha.match(/^Pa[íi]s\s*[:.]/i)) {
                var valor = extrairValor(linha, /^Pa[íi]s\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco += (dados.responsavelEndereco ? ', ' : '') + valor;
            }
            else if (linha.match(/^CEP\s*[:.]/i)) {
                var valor = extrairValor(linha, /^CEP\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEndereco += (dados.responsavelEndereco ? ' - CEP: ' : 'CEP: ') + valor;
            }
            else if (linha.match(/^CPF\s*[:.]/i)) {
                var valor = extrairValor(linha, /^CPF\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelCPF = valor;
            }
            else if (linha.match(/^RG\s*[:.]/i)) {
                var valor = extrairValor(linha, /^RG\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelRG = valor;
            }
            else if (linha.match(/^(?:Data\s*Nascimento|Data\s*de\s*Nascimento|Nascimento)\s*[:.]/i)) {
                var valor = extrairValor(linha, /^(?:Data\s*Nascimento|Data\s*de\s*Nascimento|Nascimento)\s*[:.]\s*(.+)/i);
                if (valor) {
                    var dataNormalizada = normalizarData(valor);
                    if (dataNormalizada) dados.responsavelDataNasc = dataNormalizada;
                }
            }
            else if (linha.match(/^(?:e-?Mail|Email)\s*[:.]/i)) {
                var valor = extrairValor(linha, /^(?:e-?Mail|Email)\s*[:.]\s*(.+)/i);
                if (valor) dados.responsavelEmail = valor;
            }
            else if (linha.match(/^(?:Celular|Telefone|WhatsApp)\s*[:.]/i)) {
                var valor = extrairValor(linha, /^(?:Celular|Telefone|WhatsApp)\s*[:.]\s*(.+)/i);
                if (valor && !dados.responsavelTelefone) dados.responsavelTelefone = valor;
            }
        }
        
        if (isAssistido) {
            if (linha.match(/^Nome\s*(?:Completo\s*|do\s*assistido\s*|da\s*assistida\s*)?[:.]/i)) {
                var valor = extrairValor(linha, /^Nome\s*(?:Completo\s*|do\s*assistido\s*|da\s*assistida\s*)?[:.]\s*(.+)/i);
                if (valor && !dados.assistidoNome) dados.assistidoNome = valor;
            }
            else if (linha.match(/^(?:Data\s*Nascimento|Data\s*de\s*Nascimento|Nascimento)\s*[:.]/i)) {
                var valor = extrairValor(linha, /^(?:Data\s*Nascimento|Data\s*de\s*Nascimento|Nascimento)\s*[:.]\s*(.+)/i);
                if (valor) {
                    var dataNormalizada = normalizarData(valor);
                    if (dataNormalizada) dados.assistidoDataNasc = dataNormalizada;
                }
            }
            else if (linha.match(/^Altura\s*[:.]/i)) {
                var valor = extrairValor(linha, /^Altura\s*[:.]\s*(.+)/i);
                if (valor) {
                    var alturaStr = valor.replace(',', '.').trim();
                    var alturaNum = parseFloat(alturaStr);
                    if (!isNaN(alturaNum)) {
                        if (alturaNum < 3) {
                            dados.assistidoAltura = String(Math.round(alturaNum * 100));
                        } else {
                            dados.assistidoAltura = String(Math.round(alturaNum));
                        }
                    } else {
                        dados.assistidoAltura = valor;
                    }
                }
            }
            else if (linha.match(/^Peso\s*[:.]/i)) {
                var valor = extrairValor(linha, /^Peso\s*[:.]\s*(.+)/i);
                if (valor) {
                    var pesoMatch = valor.match(/(\d+[,.]?\d*)/);
                    if (pesoMatch) {
                        dados.assistidoPeso = pesoMatch[1].replace(',', '.');
                    } else {
                        dados.assistidoPeso = valor.replace('kg', '').replace('Kg', '').trim();
                    }
                }
            }
            else if (linha.match(/^Local\s*(?:completo\s*da\s*assist[eê]ncia\s*)?[:.]/i) || 
                     linha.match(/^Local\s*(?:completo\s*da\s*assistida\s*)?[:.]/i)) {
                var valor = extrairValor(linha, /^Local\s*(?:completo\s*da\s*assist[eê]ncia\s*)?[:.]\s*(.+)/i);
                if (!valor) {
                    valor = extrairValor(linha, /^Local\s*(?:completo\s*da\s*assistida\s*)?[:.]\s*(.+)/i);
                }
                if (valor) dados.assistidoEndereco = valor;
            }
            else if (linha.match(/^Alergias\s*e\s*Necessidades\s*Especiais\s*[:.]/i)) {
                var valor = extrairValor(linha, /^Alergias\s*e\s*Necessidades\s*Especiais\s*[:.]\s*(.+)/i);
                if (valor) dados.assistidoPatologias = valor;
            }
            else if (linha.match(/^Patologias\s*(?:e\s*Necessidades\s*Especiais\s*)?[:.]/i)) {
                var valor = extrairValor(linha, /^Patologias\s*(?:e\s*Necessidades\s*Especiais\s*)?[:.]\s*(.+)/i);
                if (valor) dados.assistidoPatologias = valor;
            }
        }
        
        if (linha.match(/^(?:DATA|Data)\s*Inicial\s*(?:da\s*Contrata[cç][aã]o\s*)?[:.]/i)) {
            var valor = extrairValor(linha, /^(?:DATA|Data)\s*Inicial\s*(?:da\s*Contrata[cç][aã]o\s*)?[:.]\s*(.+)/i);
            if (valor) {
                var dataNormalizada = normalizarData(valor);
                if (dataNormalizada) dados.dataInicio = dataNormalizada;
            }
        }
        else if (linha.match(/^(?:DATA|Data)\s*Final\s*(?:da\s*Contrata[cç][aã]o\s*)?[:.]/i)) {
            var valor = extrairValor(linha, /^(?:DATA|Data)\s*Final\s*(?:da\s*Contrata[cç][aã]o\s*)?[:.]\s*(.+)/i);
            if (valor && valor.trim() !== '') {
                var dataNormalizada = normalizarData(valor);
                if (dataNormalizada) dados.dataFim = dataNormalizada;
            }
        }
        else if (linha.match(/^Plant[aã]o\s*(?:\(.*\)\s*)?[:.]/i)) {
            var valor = extrairValor(linha, /^Plant[aã]o\s*(?:\(.*\)\s*)?[:.]\s*(.+)/i);
            if (valor) {
                var numMatch = valor.match(/(\d+)/);
                if (numMatch) {
                    var horas = parseInt(numMatch[1]);
                    if (horas === 6) dados.plantao = '6 Horas';
                    else if (horas === 8) dados.plantao = '8 Horas';
                    else if (horas === 12) dados.plantao = '12 Horas';
                    else if (horas === 24) dados.plantao = '24 Horas';
                    else dados.plantao = horas + ' Horas';
                }
            }
        }
        else if (linha.match(/^Hor[aá]rio\s*de\s*(?:Entrada|entrada)\s*[:.]/i)) {
            var valor = extrairValor(linha, /^Hor[aá]rio\s*de\s*(?:Entrada|entrada)\s*[:.]\s*(.+)/i);
            if (valor) {
                dados.horaEntrada = normalizarHorario(valor);
            }
        }
        else if (linha.match(/^Hor[aá]rio\s*de\s*(?:Sa[íi]da|saida)\s*[:.]/i)) {
            var valor = extrairValor(linha, /^Hor[aá]rio\s*de\s*(?:Sa[íi]da|saida)\s*[:.]\s*(.+)/i);
            if (valor) {
                dados.horaSaida = normalizarHorario(valor);
            }
        }
    }
    
    if (!dados.assistidoNome) {
        for (var i = 0; i < linhas.length; i++) {
            var linha = linhas[i];
            if (linha.match(/^Nome\s*(?:Completo\s*)?[:.]/i) && i > 0) {
                var valor = extrairValor(linha, /^Nome\s*(?:Completo\s*)?[:.]\s*(.+)/i);
                if (valor && dados.responsavelNome && valor !== dados.responsavelNome) {
                    dados.assistidoNome = valor;
                    break;
                }
            }
        }
    }
    
    var nomeCompleto = dados.assistidoNome || '';
    var partesNome = nomeCompleto.split(' ');
    var nomeResumido = '';
    if (partesNome.length >= 2) {
        nomeResumido = partesNome[0] + ' ' + partesNome[1];
    } else if (partesNome.length === 1) {
        nomeResumido = partesNome[0];
    } else {
        nomeResumido = nomeCompleto;
    }
    dados.assistidoNomeResumido = nomeResumido;
    
    var primeiroNome = dados.assistidoNome.split(' ')[0] || '';
    var nomeLower = primeiroNome.toLowerCase();
    var sexo = '';
    
    var nomesMasculinos = ['luiz', 'mario', 'joão', 'josé', 'antonio', 'carlos', 'francisco', 'paulo', 'pedro', 'marcos', 'andré', 'rafael', 'daniel', 'gustavo', 'roberto', 'fernando', 'ricardo', 'jorge', 'eduardo', 'sergio', 'claudio', 'mauro', 'cristiano', 'rogerio', 'renato', 'leonardo', 'felipe', 'rodrigo', 'lucas', 'gabriel', 'matheus', 'guilherme', 'victor', 'vinicius', 'henrique', 'bruno', 'thiago', 'alexandre', 'marcelo', 'junior', 'william', 'alex', 'igor', 'diego', 'sandro', 'nelson', 'elias', 'milton', 'sebastiao', 'valter', 'osmar', 'mauricio', 'geraldo', 'wilson', 'jose', 'cleber', 'sidney', 'marcilio', 'mardonio', 'marcionilio', 'manoel', 'eliel', 'selene', 'jose', 'leo'];
    
    var nomesFemininos = ['maria', 'ana', 'josefa', 'francisca', 'antonia', 'aparecida', 'maria', 'carolina', 'cuiabano', 'teixeira', 'tereza', 'claudia', 'patricia', 'cristina', 'sandra', 'marcia', 'fatima', 'rosangela', 'eliane', 'lucia', 'ilza', 'elza', 'marisa', 'sonia', 'carla', 'andreia', 'daniele', 'renata', 'vanessa', 'camila', 'juliana', 'lais', 'debora', 'monica', 'beatriz', 'simone', 'cintia', 'amanda', 'lara', 'isabela', 'flavia', 'bianca', 'gabriela', 'rafaela', 'carol', 'karol', 'mari', 'maju', 'lohana', 'alice', 'laura', 'manuela', 'heloisa', 'marina', 'clara', 'cecilia', 'maiara', 'jhenifer', 'stefany', 'sheila', 'michelle', 'jessica', 'thais', 'kelmey', 'poliana', 'korina', 'sophia'];
    
    if (nomesMasculinos.indexOf(nomeLower) !== -1) {
        sexo = 'Masculino';
    } else if (nomesFemininos.indexOf(nomeLower) !== -1) {
        sexo = 'Feminino';
    } else {
        if (nomeLower.endsWith('a')) sexo = 'Feminino';
        else if (nomeLower.endsWith('o')) sexo = 'Masculino';
    }
    dados.sexo = sexo;
    
    var faixaEtaria = '';
    if (dados.assistidoDataNasc) {
        var idade = Utils.calcularIdade(dados.assistidoDataNasc);
        if (idade !== null) {
            if (idade < 1) faixaEtaria = 'RN';
            else if (idade < 3) faixaEtaria = 'Bebê';
            else if (idade < 12) faixaEtaria = 'Criança';
            else if (idade < 18) faixaEtaria = 'Adolescente';
            else if (idade < 30) faixaEtaria = 'Jovem';
            else if (idade < 60) faixaEtaria = 'Adulto';
            else faixaEtaria = 'Idoso';
        }
    }
    dados.faixaEtaria = faixaEtaria;
    
    if (dados.dataInicio) {
        var diaMatch = dados.dataInicio.match(/(\d{2})\//);
        if (diaMatch) {
            var dia = parseInt(diaMatch[1]);
            var diaVencimento = dia - 1;
            if (diaVencimento < 1) diaVencimento = 1;
            dados.diaVencimento = String(diaVencimento);
        }
    }
    
    if (dados.plantao && CONFIG.VALOR_PLANTAO && CONFIG.VALOR_PLANTAO[dados.plantao] !== undefined) {
        dados.valorPlantao = CONFIG.VALOR_PLANTAO[dados.plantao];
    }
    
    var patologiaDropdown = '';
    if (dados.assistidoPatologias) {
        var textoPatologia = dados.assistidoPatologias.toLowerCase();
        var keywords = CONFIG.PATOLOGIAS_KEYWORDS || {};
        for (var key in keywords) {
            if (textoPatologia.indexOf(key) !== -1) {
                patologiaDropdown = keywords[key];
                break;
            }
        }
    }
    dados.patologiaDropdown = patologiaDropdown;
    
    managerApp._dadosImportacaoWhatsApp = dados;
    
    managerApp._exibirPreviewImportacao(dados);
    
    var btnCadastrar = document.getElementById('importWhatsAppCadastrarBtn');
    if (btnCadastrar) {
        btnCadastrar.disabled = false;
    }
    
    Utils.showToast('✅ Dados analisados com sucesso!', 'success');
};

managerApp._exibirPreviewImportacao = function(dados) {
    var previewContainer = document.getElementById('importWhatsAppPreview');
    var camposContainer = document.getElementById('importWhatsAppCampos');
    
    if (!previewContainer || !camposContainer) return;
    
    var campos = [
        { label: '👤 Assistido', valor: dados.assistidoNomeResumido || dados.assistidoNome || '—' },
        { label: '📅 Data Nasc.', valor: dados.assistidoDataNasc || '—' },
        { label: '⚤ Sexo', valor: dados.sexo || '—' },
        { label: '📊 Faixa Etária', valor: dados.faixaEtaria || '—' },
        { label: '📏 Altura', valor: dados.assistidoAltura || '—' },
        { label: '⚖️ Peso', valor: dados.assistidoPeso || '—' },
        { label: '📋 Patologias', valor: dados.assistidoPatologias || '—' },
        { label: '📅 Início Contrato', valor: dados.dataInicio || '—' },
        { label: '📅 Fim Contrato', valor: dados.dataFim || '—' },
        { label: '🕐 Plantão', valor: dados.plantao || '—' },
        { label: '💰 Valor Plantão', valor: dados.valorPlantao ? 'R$ ' + dados.valorPlantao.toFixed(2) : '—' },
        { label: '🕐 Hora Entrada', valor: dados.horaEntrada || '—' },
        { label: '🕐 Hora Saída', valor: dados.horaSaida || '—' },
        { label: '📅 Dia Vencimento', valor: dados.diaVencimento || '—' },
        { label: '👤 Responsável', valor: dados.responsavelNome || '—' },
        { label: '📱 Telefone', valor: dados.responsavelTelefone || '—' },
        { label: '📅 Nasc. Responsável', valor: dados.responsavelDataNasc || '—' },
        { label: '📍 Endereço', valor: dados.responsavelEndereco || '—' }
    ];
    
    var html = '';
    for (var i = 0; i < campos.length; i++) {
        var cor = campos[i].valor !== '—' ? 'var(--gray-800)' : 'var(--gray-400)';
        var isEndereco = (campos[i].label === '📍 Endereço');
        var paddingBottom = isEndereco ? '8px' : '4px';
        html += '<div style="display: flex; justify-content: space-between; padding: 4px 8px; padding-bottom: ' + paddingBottom + '; border-bottom: 1px solid var(--gray-100);">';
        html += '  <span style="font-weight: 500; font-size: 12px; color: var(--gray-600);">' + campos[i].label + '</span>';
        html += '  <span style="font-weight: 600; font-size: 13px; color: ' + cor + ';">' + campos[i].valor + '</span>';
        html += '</div>';
    }
    
    camposContainer.innerHTML = html;
    previewContainer.style.display = 'block';
};

managerApp._cadastrarAssistidoPorImportacao = function() {
    var dados = this._dadosImportacaoWhatsApp;
    if (!dados) {
        Utils.showToast('❌ Nenhum dado para cadastrar. Analise o questionário primeiro.', 'error');
        return;
    }
    
    var nomeCompleto = dados.assistidoNome || '';
    var partesNome = nomeCompleto.split(' ');
    var nomeResumido = '';
    if (partesNome.length >= 2) {
        nomeResumido = partesNome[0] + ' ' + partesNome[1];
    } else if (partesNome.length === 1) {
        nomeResumido = partesNome[0];
    } else {
        nomeResumido = nomeCompleto;
    }
    
    if (!nomeResumido) {
        Utils.showToast('⚠️ Nome do assistido é obrigatório', 'warning');
        return;
    }
    if (!dados.assistidoDataNasc) {
        Utils.showToast('⚠️ Data de nascimento do assistido é obrigatória', 'warning');
        return;
    }
    if (!dados.dataInicio) {
        Utils.showToast('⚠️ Data de início do contrato é obrigatória', 'warning');
        return;
    }
    if (!dados.plantao) {
        Utils.showToast('⚠️ Plantão é obrigatório', 'warning');
        return;
    }
    if (!dados.horaEntrada) {
        Utils.showToast('⚠️ Hora de entrada é obrigatória', 'warning');
        return;
    }
    if (!dados.horaSaida) {
        Utils.showToast('⚠️ Hora de saída é obrigatória', 'warning');
        return;
    }
    
    var responsaveisLinhas = [];
    if (dados.responsavelNome) responsaveisLinhas.push(dados.responsavelNome);
    if (dados.responsavelTelefone) responsaveisLinhas.push(dados.responsavelTelefone);
    if (dados.responsavelDataNasc) responsaveisLinhas.push(dados.responsavelDataNasc);
    if (dados.responsavelCPF) responsaveisLinhas.push('CPF: ' + dados.responsavelCPF);
    if (dados.responsavelRG) responsaveisLinhas.push('RG: ' + dados.responsavelRG);
    if (dados.responsavelEmail) responsaveisLinhas.push('Email: ' + dados.responsavelEmail);
    var responsaveisTexto = responsaveisLinhas.join('\n');
    
    var dataFim = dados.dataFim;
    if (!dataFim && dados.dataInicio) {
        var dataInicioParts = dados.dataInicio.split('/');
        if (dataInicioParts.length === 3) {
            var dia = parseInt(dataInicioParts[0]);
            var mes = parseInt(dataInicioParts[1]);
            var ano = parseInt(dataInicioParts[2]);
            if (ano < 100) ano += 2000;
            var data = new Date(ano, mes - 1, dia);
            data.setFullYear(data.getFullYear() + 1);
            data.setDate(data.getDate() - 1);
            var diaFim = String(data.getDate()).padStart(2, '0');
            var mesFim = String(data.getMonth() + 1).padStart(2, '0');
            var anoFim = data.getFullYear();
            dataFim = diaFim + '/' + mesFim + '/' + anoFim;
        }
    }
    
    function padronizarData(dataStr) {
        if (!dataStr) return '';
        var parts = dataStr.split('/');
        if (parts.length === 3) {
            var dia = parts[0].padStart(2, '0');
            var mes = parts[1].padStart(2, '0');
            var ano = parts[2];
            if (ano.length === 2) ano = '20' + ano;
            return dia + '/' + mes + '/' + ano;
        }
        return dataStr;
    }
    
    var dataInicioFormatada = padronizarData(dados.dataInicio);
    var dataFimFormatada = dataFim ? padronizarData(dataFim) : '';
    
    document.getElementById('campoNome').value = nomeResumido;
    document.getElementById('campoDataNasc').value = padronizarData(dados.assistidoDataNasc) || '';
    document.getElementById('campoSexo').value = dados.sexo || '';
    document.getElementById('campoFaixaEtaria').value = dados.faixaEtaria || '';
    document.getElementById('campoPeso').value = dados.assistidoPeso || '';
    document.getElementById('campoAltura').value = dados.assistidoAltura || '';
    document.getElementById('campoDadosAnag').value = dados.responsavelEndereco || dados.assistidoEndereco || '';
    document.getElementById('campoResponsaveis').value = responsaveisTexto || '';
    document.getElementById('campoStatus').value = 'Ativo';
    document.getElementById('campoDataCriacao').value = Utils.formatDate(new Date());
    
    document.getElementById('campoInicioContrato').value = dataInicioFormatada || '';
    document.getElementById('campoVctoContrato').value = dataFimFormatada || '';
    document.getElementById('campoTipoContrato').value = 'MENSAL';
    document.getElementById('campoPlantao').value = dados.plantao || '';
    document.getElementById('campoHoraEntrada').value = dados.horaEntrada || '';
    document.getElementById('campoHoraSaida').value = dados.horaSaida || '';
    document.getElementById('campoVlrPlantao').value = dados.valorPlantao ? Utils.formatCurrency(dados.valorPlantao) : '';
    document.getElementById('campoDiaVencimento').value = dados.diaVencimento || '';
    document.getElementById('campoDispMED').value = 'NÃO Entregue';
    
    // 🔥 Default 'Obrigatório' no campo REGISTRAR PRONTUÁRIO após importação
    var registrarProntuario = document.getElementById('campoRegistrarProntuario');
    if (registrarProntuario) {
        registrarProntuario.value = 'Obrigatório';
    }
    
    var patologiasTexto = dados.assistidoPatologias || '';
    if (dados.patologiaDropdown && dados.patologiaDropdown !== '') {
        if (patologiasTexto) {
            patologiasTexto = patologiasTexto + '; ' + dados.patologiaDropdown;
        } else {
            patologiasTexto = dados.patologiaDropdown;
        }
    }
    document.getElementById('campoPatologiasNecessidades').value = patologiasTexto;
    
    this.mudarAba('dados');
    this.fecharModal();
    
    this._dadosImportacaoWhatsApp = null;
    
    Utils.showToast('✅ Dados importados! Revise e clique em "Salvar" para finalizar.', 'success');
};
