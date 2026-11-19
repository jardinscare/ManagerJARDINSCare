// =============================================
// CONFIGURAÇÕES GLOBAIS - managerJARDINSCare
// =============================================

// 🔥 SUPABASE CONFIG (CORRIGIDO)
const SUPABASE_URL = 'https://lqwljnzpenxdmdtujuak.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'sb_publishable_RdYlBmDQX51VEdP0CbW85A_702v12xw';

// 🔥 URLs das APIs (apenas Supabase)
const API_PERSONAL = SUPABASE_URL;
const API_ESCALAS = SUPABASE_URL;
const API_ASSISTIDOS = SUPABASE_URL;
const API_FINANCEIRA = SUPABASE_URL;

// 🔥 LISTA MESTRA DE CATEGORIAS DE DESPESAS (FONTE ÚNICA DE VERDADE)
const CATEGORIAS_DESPESAS_PADRAO = [
    'Administrativo',
    'Alimentação',
    'Aluguel',
    'Cartão Crédito',
    'Contador',
    'Custo Enfermagem',
    'Custo Personal Care',
    'Equipamentos',
    'Impostos',
    'Marketing',
    'Outros',
    'Plantões Extras',
    'Plantões N/Realizados',
    'Pró Labore',
    'Telefone/Internet',
    'Transporte',
    'Treinamentos'
];

// 🔥 LISTA MESTRA DE TIPOS DE RECEITA AVULSA
const TIPOS_RECEITA_AVULSA_PADRAO = [
    'Contrato Mensal',
    'Contrato Avulso',
    'Plantão Extra',
    'Diária Avulsa',
    'Consulta',
    'Outro'
];

// 🔥 LISTA MESTRA DE FORMAS DE PAGAMENTO
const FORMAS_PAGAMENTO_PADRAO = [
    'Pix',
    'Dinheiro',
    'Cartão',
    'Boleto',
    'Transferência',
    'Pendente'
];

// =============================================
// 🔥 LISTAS MESTRAS PARA LEADS
// =============================================
const ORIGENS_LEAD_PADRAO = [
    'Indicação',
    'Google',
    'Instagram',
    'PIÙ VITA',
    'Site',
    'WhatsApp',
    'Evento',
    'Outros'
];

const STATUS_LEAD_PADRAO = [
    '📞 Novo Lead',
    '🔄 Em Negociação',
    '📄 Proposta Enviada',
    '✅ Fechado (Contrato)',
    '❌ Perdido',
    '🚫 Não qualificado',
    '🔄 Aguardando Retorno'
];

const REGIOES_LEAD_PADRAO = [
    'Zona Sul',
    'Zona Norte',
    'Zona Leste',
    'Zona Oeste',
    'Centro',
    'Várzea Grande',
    'Chapada Guimarães',
    'Interior',
    'Outras'
];

const TIPOS_SERVICO_LEAD_PADRAO = [
    'Cuidados 6Hrs',
    'Cuidados 8Hrs',
    'Cuidados 12Hrs',
    'Cuidados 24Hrs',
    'Enfermeiras',
    'Fisioterapia',
    'Outros'
];

const PERIODOS_CONTRATACAO_LEAD_PADRAO = [
    'Mensal',
    'Avulso',
    'Indeterminado'
];

const TURNOS_LEAD_PADRAO = [
    'Diurno',
    'Noturno',
    'Final Semana',
    'A definir'
];

const RESPONSAVEIS_LEAD_PADRAO = [
    'Francisco Diniz',
    'Cibelle Leal',
    'Enfermeiras',
    'Comercial'
];

// 🔥 CONFIG - OBJETO COMPLETO
const CONFIG = {
    // Supabase (ESSENCIAL)
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    API_PERSONAL: API_PERSONAL,
    API_ESCALAS: API_ESCALAS,
    API_ASSISTIDOS: API_ASSISTIDOS,
    API_FINANCEIRA: API_FINANCEIRA,
    API_SUPABASE_KEY: SUPABASE_ANON_KEY,

    // Listas mestras (FONTE ÚNICA DE VERDADE)
    CATEGORIAS_DESPESAS: CATEGORIAS_DESPESAS_PADRAO,
    TIPOS_RECEITA_AVULSA: TIPOS_RECEITA_AVULSA_PADRAO,
    FORMAS_PAGAMENTO: FORMAS_PAGAMENTO_PADRAO,

    // 🔥 Listas mestras para Leads
    ORIGENS_LEAD: ORIGENS_LEAD_PADRAO,
    STATUS_LEAD: STATUS_LEAD_PADRAO,
    REGIOES_LEAD: REGIOES_LEAD_PADRAO,
    TIPOS_SERVICO_LEAD: TIPOS_SERVICO_LEAD_PADRAO,
    PERIODOS_CONTRATACAO_LEAD: PERIODOS_CONTRATACAO_LEAD_PADRAO,
    TURNOS_LEAD: TURNOS_LEAD_PADRAO,
    RESPONSAVEIS_LEAD: RESPONSAVEIS_LEAD_PADRAO,

    // Mapeamento de PLANTÃO para VALOR
    VALOR_PLANTAO: {
        '6 Horas': 110,
        '8 Horas': 125,
        '12 Horas': 150,
        '24 Horas': 150
    },

    // Mapeamento de palavras-chave para PATOLOGIAS (dropdown)
    PATOLOGIAS_KEYWORDS: {
        'acamado': 'Acamado',
        'colostomia': 'Bolsa Colostomia',
        'bomba infusão': 'Bomba Infusão',
        'bomba de infusão': 'Bomba Infusão',
        'cadeirante': 'Cadeirante',
        'demência': 'Demência',
        'depressão': 'Depressão',
        'esquizofrenia': 'Esquizofrenia',
        'ferida': 'Feridas',
        'feridas': 'Feridas',
        'gtt': 'GTT',
        'parkinson': 'Parkinson',
        'síndrome down': 'Síndrome Down',
        'sindrome down': 'Síndrome Down',
        'traqueostomia': 'Traqueostomia'
    },

    // Mapeamento de palavras-chave para SEXO
    SEXO_KEYWORDS: {
        'masculino': 'Masculino',
        'feminino': 'Feminino'
    },

    // Mapeamento de PLANTÃO para DIÁRIAS MÊS (cálculo automático)
    DIARIAS_MES_CALCULO: {
        '6 Horas': 180,
        '8 Horas': 240,
        '12 Horas': 360,
        '24 Horas': 720
    },

    // Tempos de cache
    CACHE_DURATION_SHORT: 1 * 60 * 1000,
    CACHE_DURATION_MEDIUM: 5 * 60 * 1000,
    CACHE_DURATION_LONG: 15 * 60 * 1000,

    // Tolerância para sinais vitais
    VITAL_TOLERANCE: 0.10,

    // Habilitar Realtime (desabilitado — usamos refresh manual + BroadcastChannel entre abas)
    ENABLE_REALTIME: false,
    REALTIME_TABLES: ['personal_cares', 'assistidos', 'escalas'],

    // Tags disponíveis para rotinas
    TAGS_ROTINAS: [
        { id: 'Alimentacao', label: 'Alimentação', icon: 'fa-utensils' },
        { id: 'HigienePessoal', label: 'Higiene Pessoal', icon: 'fa-shower' },
        { id: 'HigieneOral', label: 'Higiene Oral', icon: 'fa-tooth' },
        { id: 'AtividadeAssistido', label: 'Atividade Assistido', icon: 'fa-user-injured' },
        { id: 'AtividadeCuidador', label: 'Atividade Cuidador', icon: 'fa-hand-holding-heart' },
        { id: 'Medicacao', label: 'Medicação', icon: 'fa-pills' },
        { id: 'Observacao', label: 'Observação', icon: 'fa-comment' },
        { id: 'Posicao', label: 'Posição', icon: 'fa-bed' },
        { id: 'Curativo', label: 'Curativo', icon: 'fa-bandage' },
        { id: 'SinaisVitais', label: 'Sinais Vitais', icon: 'fa-heartbeat' }
    ],

    // Cores para as tags
    TAG_COLORS: {
        'Alimentacao': '#FF8C00',
        'HigienePessoal': '#34c759',
        'HigieneOral': '#007aff',
        'AtividadeAssistido': '#8e44ad',
        'AtividadeCuidador': '#e67e22',
        'Medicacao': '#e74c3c',
        'Observacao': '#6c757d',
        'Posicao': '#1abc9c',
        'Curativo': '#3498db',
        'SinaisVitais': '#e74c3c'
    },

    VERSION: '1.0.0',
    USE_SUPABASE: true,
    CACHE_VERSION: '1.0.1'
};

console.log('✅ CONFIGURAÇÕES CARREGADAS:');
console.log('  🔗 SUPABASE_URL:', CONFIG.SUPABASE_URL);
console.log('  🚀 USE_SUPABASE:', CONFIG.USE_SUPABASE);
console.log('  📦 VERSION:', CONFIG.VERSION);
console.log('  🔄 ENABLE_REALTIME:', CONFIG.ENABLE_REALTIME);
console.log('  📂 CATEGORIAS_DESPESAS:', CONFIG.CATEGORIAS_DESPESAS.length, 'itens');
console.log('  📂 TIPOS_RECEITA_AVULSA:', CONFIG.TIPOS_RECEITA_AVULSA.length, 'itens');
console.log('  📂 FORMAS_PAGAMENTO:', CONFIG.FORMAS_PAGAMENTO.length, 'itens');
console.log('  📂 ORIGENS_LEAD:', CONFIG.ORIGENS_LEAD.length, 'itens');
console.log('  📂 STATUS_LEAD:', CONFIG.STATUS_LEAD.length, 'itens');
console.log('  📂 REGIOES_LEAD:', CONFIG.REGIOES_LEAD.length, 'itens');
console.log('  📂 TIPOS_SERVICO_LEAD:', CONFIG.TIPOS_SERVICO_LEAD.length, 'itens');
console.log('  📂 PERIODOS_CONTRATACAO_LEAD:', CONFIG.PERIODOS_CONTRATACAO_LEAD.length, 'itens');
console.log('  📂 TURNOS_LEAD:', CONFIG.TURNOS_LEAD.length, 'itens');
console.log('  📂 RESPONSAVEIS_LEAD:', CONFIG.RESPONSAVEIS_LEAD.length, 'itens');
console.log('  ⏱️ CACHE_MEDIUM:', CONFIG.CACHE_DURATION_MEDIUM / 1000, 's');
console.log('  ⏱️ CACHE_LONG:', CONFIG.CACHE_DURATION_LONG / 1000, 's');
console.log('  🩺 VITAL_TOLERANCE:', CONFIG.VITAL_TOLERANCE * 100, '%');
