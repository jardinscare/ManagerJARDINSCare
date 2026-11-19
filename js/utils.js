// =============================================
// UTILITÁRIOS - managerJARDINSCare
// =============================================

const Utils = {
    /**
     * Exibe um toast (notificação) na tela
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     */
    showToast: function(message, type) {
        type = type || 'success';
        var container = document.getElementById('toastContainer');
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        var icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚠️');
        toast.innerHTML = '<span>' + icon + '</span> ' + message;
        container.appendChild(toast);
        setTimeout(function() { toast.classList.add('show'); }, 10);
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 4000);
    },

    /**
     * Exibe o overlay de loading
     * @param {string} msg - Mensagem a ser exibida
     */
    showLoading: function(msg) {
        msg = msg || 'Processando...';
        var overlay = document.getElementById('loadingOverlay');
        var textEl = document.getElementById('loadingText');
        if (textEl) textEl.textContent = msg;
        if (overlay) overlay.style.display = 'flex';
    },

    /**
     * Oculta o overlay de loading
     */
    hideLoading: function() {
        var overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    },

    /**
     * Invalida cache de uma tabela específica
     * @param {string} table - Nome da tabela
     */
    invalidateTableCache: function(table) {
        if (typeof managerApp !== 'undefined' && managerApp._cacheVersions) {
            var tipo = this._mapTableToCacheType(table);
            if (tipo) {
                managerApp.invalidarCache(tipo);
                console.log('🧹 Cache invalidado para:', table, '->', tipo);
            }
        }
    },

    /**
     * Mapeia tabela para tipo de cache
     * @param {string} table - Nome da tabela
     * @returns {string} - Tipo de cache correspondente
     */
    _mapTableToCacheType: function(table) {
        var map = {
            'assistidos': 'assistidos',
            'personal_cares': 'assistidos',
            'escalas': 'assistidos',
            'prontuarios': 'assistidos',
            'leads': 'leads',
            'receitas': 'receitas',
            'despesas': 'despesas',
            'dashboard': 'dashboard'
        };
        return map[table] || null;
    },

    /**
     * Escapa caracteres HTML para prevenir XSS
     * @param {string} texto - Texto a ser escapado
     * @returns {string} - Texto escapado
     */
    escapeHtml: function(texto) {
        if (!texto) return '';
        var div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    },

    /**
     * Formata uma data para o formato brasileiro (dd/mm/aaaa)
     * @param {string|Date} dateStr - Data a ser formatada
     * @returns {string} - Data formatada
     */
    formatDate: function(dateStr) {
        if (!dateStr) return '';
        
        if (typeof dateStr === 'string' && dateStr.includes('T')) {
            var parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) {
                return parts[2] + '/' + parts[1] + '/' + parts[0];
            }
        }
        
        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            var parts = dateStr.split('-');
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
        
        if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateStr;
        }
        
        if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
            var dia = String(dateStr.getDate()).padStart(2, '0');
            var mes = String(dateStr.getMonth() + 1).padStart(2, '0');
            var ano = dateStr.getFullYear();
            return dia + '/' + mes + '/' + ano;
        }
        
        if (typeof dateStr === 'number') {
            var data = new Date(dateStr);
            if (!isNaN(data.getTime())) {
                var dia = String(data.getDate()).padStart(2, '0');
                var mes = String(data.getMonth() + 1).padStart(2, '0');
                var ano = data.getFullYear();
                return dia + '/' + mes + '/' + ano;
            }
        }
        
        return dateStr;
    },

    /**
     * Formata uma data para o formato ISO (aaaa-mm-dd)
     * @param {string} dateStr - Data a ser formatada
     * @returns {string} - Data em formato ISO
     */
    formatDateToISO: function(dateStr) {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            var parts = dateStr.split('/');
            return parts[2] + '-' + parts[1] + '-' + parts[0];
        }
        return dateStr;
    },

    /**
     * Formata uma data para o formato brasileiro (dd/mm/aaaa)
     * @param {string} dateStr - Data a ser formatada
     * @returns {string} - Data formatada
     */
    formatDateBR: function(dateStr) {
        if (!dateStr) return '';
        if (dateStr.includes('T')) {
            var parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) {
                return parts[2] + '/' + parts[1] + '/' + parts[0];
            }
        }
        if (dateStr.includes('-')) {
            var parts = dateStr.split('-');
            if (parts.length === 3) {
                return parts[2] + '/' + parts[1] + '/' + parts[0];
            }
        }
        return dateStr;
    },

    /**
     * Calcula a idade a partir da data de nascimento
     * @param {string} dataNascStr - Data de nascimento
     * @returns {number|null} - Idade calculada ou null
     */
    calcularIdade: function(dataNascStr) {
        if (!dataNascStr) return null;
        
        var dia, mes, ano;
        
        if (dataNascStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            var partes = dataNascStr.split('-');
            ano = parseInt(partes[0]);
            mes = parseInt(partes[1]);
            dia = parseInt(partes[2]);
        }
        else if (dataNascStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            var partes = dataNascStr.split('/');
            dia = parseInt(partes[0]);
            mes = parseInt(partes[1]);
            ano = parseInt(partes[2]);
        }
        else {
            return null;
        }
        
        if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
        
        var hoje = new Date();
        var idade = hoje.getFullYear() - ano;
        var mesAtual = hoje.getMonth() + 1;
        var diaAtual = hoje.getDate();
        
        if (mesAtual < mes || (mesAtual === mes && diaAtual < dia)) {
            idade--;
        }
        return idade;
    },

    /**
     * Extrai o dia de uma data
     * @param {string} dataStr - Data
     * @returns {number|null} - Dia extraído ou null
     */
    extrairDiaData: function(dataStr) {
        if (!dataStr) return null;
        
        var dia = null;
        
        if (dataStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            var partes = dataStr.split('-');
            dia = parseInt(partes[2]);
        }
        else if (dataStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            var partes = dataStr.split('/');
            dia = parseInt(partes[0]);
        }
        
        return dia && !isNaN(dia) ? dia : null;
    },

    /**
     * Formata um valor para moeda brasileira (R$)
     * @param {number|string} value - Valor a ser formatado
     * @returns {string} - Valor formatado
     */
    formatCurrency: function(value) {
        var num = typeof value === 'number' ? value : this.parseCurrencyToNumber(value);
        if (isNaN(num)) num = 0;
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    /**
     * Converte string monetária para número
     * @param {string|number} value - Valor em formato monetário
     * @returns {number} - Número convertido
     */
    parseCurrencyToNumber: function(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        var cleaned = String(value).replace(/[^\d,.-]/g, '');
        cleaned = cleaned.replace(',', '.');
        cleaned = cleaned.replace(/\.(?=.*\.)/g, '');
        var num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    },

    /**
     * Aplica máscara de moeda a um input
     * @param {HTMLElement} input - Elemento input
     */
    applyCurrencyMask: function(input) {
        input.addEventListener('input', function(e) {
            var v = e.target.value.replace(/\D/g, '');
            if (!v) { e.target.value = ''; return; }
            var intVal = parseInt(v, 10);
            e.target.value = (intVal / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        });
    },

    /**
     * Aplica máscara de data (dd/mm/aaaa) a um input
     * @param {HTMLElement} input - Elemento input
     */
    applyDateMask: function(input) {
        input.addEventListener('input', function(e) {
            var v = e.target.value.replace(/\D/g, '').slice(0, 8);
            if (v.length > 4) {
                v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
            } else if (v.length > 2) {
                v = v.slice(0, 2) + '/' + v.slice(2);
            }
            e.target.value = v;
        });
    },

    /**
     * Aplica máscara de telefone (formato (XX) XXXXX-XXXX) a um input
     * @param {HTMLElement} input - Elemento input
     */
    applyPhoneMask: function(input) {
        if (!input) return;
        input.addEventListener('input', function(e) {
            var v = e.target.value.replace(/\D/g, '');
            if (!v) { e.target.value = ''; return; }
            
            if (v.length > 11) v = v.slice(0, 11);
            
            var formatted = '';
            if (v.length > 0) {
                formatted += '(' + v.slice(0, 2);
                if (v.length > 2) {
                    formatted += ') ';
                    if (v.length <= 7) {
                        formatted += v.slice(2);
                    } else {
                        formatted += v.slice(2, 7) + '-' + v.slice(7);
                    }
                }
            }
            e.target.value = formatted;
        });
    },

    /**
     * Gera opções de horário para selects (00:00 a 23:30)
     * @returns {string} - HTML com as opções
     */
    generateTimeOptions: function() {
        var options = ['<option value="">Selecione</option>'];
        for (var h = 0; h < 24; h++) {
            var hour = h.toString().padStart(2, '0');
            options.push('<option value="' + hour + ':00">' + hour + ':00</option>');
            options.push('<option value="' + hour + ':30">' + hour + ':30</option>');
        }
        return options.join('');
    },

    /**
     * Aplica cor a um elemento baseado no valor (positivo/negativo)
     * @param {HTMLElement} element - Elemento a ser estilizado
     * @param {number} value - Valor para avaliação
     */
    applyColorToValue: function(element, value) {
        var numValue = typeof value === 'number' ? value : this.parseCurrencyToNumber(value);
        element.classList.remove('positive', 'negative');
        if (numValue >= 0) {
            element.classList.add('positive');
        } else {
            element.classList.add('negative');
        }
    },

    /**
     * Formata data de lead para exibição
     * @param {string} valor - Data do lead
     * @returns {string} - Data formatada
     */
    formatarDataLeadParaBR: function(valor) {
        if (!valor) return '';
        
        if (typeof valor === 'string' && valor.includes('T')) {
            var partesISO = valor.split('T')[0].split('-');
            if (partesISO.length === 3) {
                return partesISO[2] + '/' + partesISO[1] + '/' + partesISO[0];
            }
        }
        
        if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}$/)) {
            var partes = valor.split('-');
            return partes[2] + '/' + partes[1] + '/' + partes[0];
        }
        
        if (typeof valor === 'string' && valor.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return valor;
        }
        
        if (valor instanceof Date && !isNaN(valor.getTime())) {
            var dia = String(valor.getDate()).padStart(2, '0');
            var mes = String(valor.getMonth() + 1).padStart(2, '0');
            var ano = valor.getFullYear();
            return dia + '/' + mes + '/' + ano;
        }
        
        return valor;
    },

    /**
     * Formata competência (aaaa-mm) para exibição (mm/aaaa)
     * @param {string} competencia - Competência no formato aaaa-mm
     * @returns {string} - Competência formatada
     */
    formatCompetencia: function(competencia) {
        if (!competencia) return '';
        if (/^\d{4}-\d{2}$/.test(competencia)) {
            var parts = competencia.split('-');
            return parts[1] + '/' + parts[0];
        }
        return competencia;
    },

    /**
     * Extrai dados do campo de responsáveis
     * @param {string} responsaveis - Texto com dados dos responsáveis
     * @returns {object} - Objeto com nome, telefone, dataNasc, parentesco
     */
    extrairDadosFamiliar: function(responsaveis) {
        var resultado = { nome: 'Familiar', telefone: '', dataNasc: '', parentesco: '' };
        if (!responsaveis) return resultado;
        
        var linhas = responsaveis.split('\n').filter(function(linha) { return linha.trim() !== ''; });
        
        if (linhas.length >= 1) resultado.nome = linhas[0].trim();
        if (linhas.length >= 2) {
            var telefone = linhas[1].trim();
            resultado.telefone = telefone.replace(/\D/g, '');
        }
        if (linhas.length >= 3) {
            var dataNasc = linhas[2].trim();
            if (dataNasc.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                resultado.dataNasc = dataNasc;
            } else if (dataNasc.match(/^\d{4}-\d{2}-\d{2}$/)) {
                resultado.dataNasc = dataNasc;
            } else {
                var partes = dataNasc.split(/[\/\-\.]/);
                if (partes.length === 3) {
                    var dia = parseInt(partes[0]);
                    var mes = parseInt(partes[1]);
                    var ano = parseInt(partes[2]);
                    if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
                        if (ano < 100) ano = 2000 + ano;
                        if (partes[0].length === 4) {
                            resultado.dataNasc = partes[2] + '/' + partes[1] + '/' + partes[0];
                        } else {
                            resultado.dataNasc = String(dia).padStart(2, '0') + '/' + 
                                                String(mes).padStart(2, '0') + '/' + 
                                                String(ano);
                        }
                    }
                }
            }
        }
        if (linhas.length >= 4) resultado.parentesco = linhas[3].trim();
        return resultado;
    },

    /**
     * Sleep/Delay para uso em async/await
     * @param {number} ms - Milissegundos para aguardar
     * @returns {Promise} - Promise que resolve após o tempo
     */
    sleep: function(ms) {
        return new Promise(function(resolve) {
            setTimeout(resolve, ms);
        });
    },

    /**
     * Gerencia cache de dados
     * @param {string} key - Chave do cache
     * @param {any} data - Dados a serem armazenados (opcional)
     * @param {number} duration - Duração em milissegundos
     * @returns {any|null} - Dados do cache ou null
     */
    getCache: function(key, duration) {
        try {
            var cached = localStorage.getItem('cache_' + key);
            if (!cached) return null;
            var parsed = JSON.parse(cached);
            var now = Date.now();
            if (now - parsed.timestamp > duration) {
                localStorage.removeItem('cache_' + key);
                return null;
            }
            return parsed.data;
        } catch (e) {
            return null;
        }
    },

    /**
     * Armazena dados em cache
     * @param {string} key - Chave do cache
     * @param {any} data - Dados a serem armazenados
     */
    setCache: function(key, data) {
        try {
            var item = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem('cache_' + key, JSON.stringify(item));
        } catch (e) {
            console.warn('Erro ao salvar cache:', e);
        }
    },

    /**
     * Remove um item do cache
     * @param {string} key - Chave do cache
     */
    clearCache: function(key) {
        try {
            localStorage.removeItem('cache_' + key);
        } catch (e) {
            console.warn('Erro ao limpar cache:', e);
        }
    },

    /**
     * Limpa todo o cache
     */
    clearAllCache: function() {
        try {
            var keys = Object.keys(localStorage);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].startsWith('cache_')) {
                    localStorage.removeItem(keys[i]);
                }
            }
            console.log('✅ Cache limpo');
        } catch (e) {
            console.warn('Erro ao limpar cache:', e);
        }
    }
};
