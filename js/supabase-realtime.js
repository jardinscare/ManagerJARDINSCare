// ============================================
// SUPABASE REALTIME - SISTEMA DE NOTIFICAÇÕES
// ============================================

const RealtimeManager = {
    _subscriptions: {},
    _listeners: {},
    _isConnected: false,
    _supabase: null,
    _broadcastChannel: null,

    init: function() {
        // 🔇 Se Realtime está desabilitado, sair silenciosamente
        if (typeof CONFIG !== 'undefined' && CONFIG.ENABLE_REALTIME === false) {
            console.info('ℹ️ Realtime desabilitado nas configurações (refresh manual ativo).');
            return;
        }
        
        console.log('🔌 Inicializando Realtime Manager...');
        
        // Criar cliente Supabase para Realtime
        if (typeof supabase === 'undefined') {
            // Criar cliente manualmente se não existir
            this._supabase = {
                channel: (name) => ({
                    on: (event, config, callback) => {
                        console.log('📡 Realtime simulado para:', name);
                        return {
                            subscribe: (cb) => {
                                console.log('📡 Subscrevendo:', name);
                                if (cb) cb('SUBSCRIBED');
                                return this;
                            },
                            unsubscribe: () => {}
                        };
                    }
                })
            };
            console.warn('⚠️ Supabase não encontrado, usando Realtime simulado');
        } else {
            this._supabase = supabase;
        }

        this._connect();
        this._listenBroadcast();
    },

    _connect: function() {
        const tables = CONFIG.REALTIME_TABLES || ['personal_cares', 'assistidos', 'escalas'];
        
        for (const table of tables) {
            this._subscribe(table);
        }
        
        this._isConnected = true;
        console.log('✅ Realtime conectado para:', tables.join(', '));
    },

    _subscribe: function(table) {
        try {
            const channel = this._supabase
                .channel(`table_${table}_changes`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: table
                    },
                    (payload) => {
                        console.log(`🔄 Mudança detectada em ${table}:`, payload);
                        this._handleChange(table, payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`✅ Inscrito em ${table}`);
                    }
                });

            this._subscriptions[table] = channel;
        } catch (error) {
            console.warn(`⚠️ Erro ao inscrever em ${table}:`, error.message);
        }
    },

    _handleChange: function(table, payload) {
        // 1. INVALIDAR CACHE DA TABELA AFETADA
        if (typeof Utils !== 'undefined') {
            Utils.invalidateTableCache(table);
            console.log(`🧹 Cache invalidado via Realtime para: ${table}`);
        }
        
        // 2. 🔥 NOVO: Disparar atualização financeira se for receita ou despesa
        if ((table === 'receitas' || table === 'despesas') && typeof managerApp !== 'undefined') {
            if (typeof managerApp._atualizarTudoAposOperacaoFinanceira === 'function') {
                managerApp._atualizarTudoAposOperacaoFinanceira();
                console.log(`🔄 Atualização financeira disparada via Realtime: ${table}`);
            }
        }
        
        // 3. Notificar listeners
        this._notifyListeners(table, payload);
        
        // 4. Notificar outras abas via BroadcastChannel
        this._broadcastInvalidation(table);
        
        // 5. Mostrar toast para o usuário (apenas para atualizações)
        if (payload.eventType !== 'INSERT' && payload.eventType !== 'DELETE') {
            if (!this._isOwnChange(payload)) {
                Utils.showToast(`🔄 Dados de ${this._getTableLabel(table)} atualizados`, 'info');
            }
        }
    },

    _isOwnChange: function(payload) {
        // Verificar se a mudança foi feita pelo usuário atual
        // Por enquanto, sempre retorna false para mostrar o toast
        return false;
    },

    _getTableLabel: function(table) {
        const labels = {
            'personal_cares': 'Personal Cares',
            'assistidos': 'Assistidos',
            'escalas': 'Escalas',
            'prontuarios': 'Prontuários'
        };
        return labels[table] || table;
    },

    // ===== BROADCAST CHANNEL =====
    _listenBroadcast: function() {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                // Fechar canal existente
                if (this._broadcastChannel) {
                    try {
                        this._broadcastChannel.close();
                    } catch (e) {}
                }
                
                this._broadcastChannel = new BroadcastChannel('jardinscare_cache');
                
                this._broadcastChannel.onmessage = (event) => {
                    if (event.data && event.data.type === 'cache_invalidate') {
                        const table = event.data.table;
                        console.log(`📡 Broadcast recebido: invalidar ${table}`);
                        if (typeof Utils !== 'undefined') {
                            Utils.invalidateTableCache(table);
                        }
                    }
                };
                
                console.log('📡 BroadcastChannel ouvindo mensagens');
            }
        } catch (e) {
            console.warn('⚠️ BroadcastChannel não suportado:', e.message);
        }
    },

    _broadcastInvalidation: function(table) {
        try {
            if (typeof BroadcastChannel !== 'undefined' && this._broadcastChannel) {
                this._broadcastChannel.postMessage({
                    type: 'cache_invalidate',
                    table: table,
                    timestamp: Date.now()
                });
                console.log(`📡 Broadcast enviado: invalidar ${table}`);
            }
        } catch (e) {
            // BroadcastChannel pode não ser suportado
        }
    },

    _notifyListeners: function(table, payload) {
        if (this._listeners[table]) {
            this._listeners[table].forEach(callback => {
                try {
                    callback(payload);
                } catch (e) {
                    console.error('Erro no listener:', e);
                }
            });
        }
    },

    on: function(table, callback) {
        if (!this._listeners[table]) {
            this._listeners[table] = [];
        }
        this._listeners[table].push(callback);
        console.log(`👂 Listener adicionado para ${table}`);
    },

    off: function(table, callback) {
        if (this._listeners[table]) {
            if (callback) {
                this._listeners[table] = this._listeners[table].filter(cb => cb !== callback);
            } else {
                delete this._listeners[table];
            }
        }
    },

    disconnect: function() {
        for (const table in this._subscriptions) {
            try {
                this._subscriptions[table].unsubscribe();
            } catch (e) {
                console.warn('Erro ao desconectar:', e);
            }
        }
        this._subscriptions = {};
        this._isConnected = false;
        
        if (this._broadcastChannel) {
            try {
                this._broadcastChannel.close();
            } catch (e) {}
            this._broadcastChannel = null;
        }
        
        console.log('🔌 Realtime desconectado');
    },

    getStatus: function() {
        return {
            isConnected: this._isConnected,
            subscriptions: Object.keys(this._subscriptions),
            listeners: Object.keys(this._listeners)
        };
    }
};

// Inicializar automaticamente se o CONFIG estiver disponível
if (typeof CONFIG !== 'undefined' && CONFIG.ENABLE_REALTIME) {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            if (typeof RealtimeManager !== 'undefined') {
                RealtimeManager.init();
            }
        }, 2000);
    });
}

window.RealtimeManager = RealtimeManager;
console.log('✅ Realtime Manager carregado!');
