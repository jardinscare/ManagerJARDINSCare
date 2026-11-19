// ============================================================
// SUPABASE API - BRIDGE
// Operações JARDINSCare
// Versão 2.0 - Parâmetros Consolidados (Fase 1)
// ============================================================

console.log('🔗 Supabase API Bridge carregada!');

// ============================================================
// MAPEAMENTO DEFINITIVO - TABELA assistidos
// ============================================================

// 🔥 MAPEAMENTO FRONTEND (camelCase) → SUPABASE (snake_case)
const MAPEAMENTO_ASSISTIDOS = {
    // Dados Gerais
    'nome': 'nome',
    'dataNasc': 'data_nasc',
    'peso': 'peso',
    'altura': 'altura',
    'dataCriacao': 'data_criacao',
    'dadosAnag': 'dados_anagraficos',
    'responsaveis': 'responsaveis',
    'medicos': 'medico_responsavel',
    'gps': 'gps_localizador',
    'regiao': 'regiao',
    'status': 'status',
    'motivoDesligamento': 'motivo_desligamento',
    'sexo': 'sexo',
    'faixaEtaria': 'faixa_etaria',
    'pcNaoEnviar': 'pc_nao_enviar',
    'linkGrupoWhatsApp': 'link_grupo_whatsapp',
	'cep': 'cep',
    
    // Contrato
    'inicioContrato': 'inicio_contrato',
    'vctoContrato': 'vcto_contrato',
    'periodoContratado': 'periodo_contratado',
    'tipoContrato': 'tipo_contrato',
    'plantao': 'plantoes',
    'totalHrsMes': 'total_hrs_mes',
    'vlrPlantao': 'vlr_plantao',
    'vlrContrato': 'vlr_contrato',
    'vlrPlantaoNumeric': 'vlr_plantao_numeric',
    'horaENT': 'hora_entrada',
    'horaSAI': 'hora_saida',
    'diaVencimento': 'dia_vencimento',
    'scoreSatisfacao': 'score_satisfacao',
    'diaSemana': 'dia_semana',
    'dispMED': 'disp_med',
    'visitaENF': 'visita_enf',
    'visitaDIR': 'visita_dir',
    'registrarProntuario': 'registrar_prontuario',
    'patrono': 'patrono',
    
    // Padrões e Saúde
    'pressaoPadrao': 'pressao_arterial',
    'glicemiaPadrao': 'glicemia',
    'patologias': 'patologias',
    'atividadesAssistidoPadrao': 'atividades_assistido',
    'atividadesCuidadorPadrao': 'atividades_cuidador',
    'observacoesInternas': 'observacoes_internas',
    'alimentacaoPadrao': 'alimentacao',
    'medicamentosPadrao': 'medicamentos',
    'contatoMedico': 'contato_medico',
    'contatoFamilia': 'contato_familia',
    'diagnosticoPDF': 'diagnostico_pdf'
};

// 🔥 LISTA DE TODOS OS CAMPOS QUE EXISTEM NO SUPABASE (exceto 'id')
const CAMPOS_SUPABASE_ASSISTIDOS = [
    'nome', 'data_nasc', 'peso', 'altura', 'data_criacao',
    'dados_anagraficos', 'responsaveis', 'medico_responsavel',
    'gps_localizador', 'regiao', 'status', 'motivo_desligamento',
    'inicio_contrato', 'vcto_contrato', 'periodo_contratado',
    'tipo_contrato', 'plantoes', 'total_hrs_mes', 'vlr_plantao',
    'vlr_contrato', 'vlr_plantao_numeric', 'hora_entrada', 'hora_saida',
    'dia_vencimento', 'score_satisfacao', 'dia_semana', 'disp_med',
    'visita_enf', 'visita_dir', 'registrar_prontuario', 'pressao_arterial',
    'glicemia', 'patologias', 'atividades_assistido', 'atividades_cuidador',
    'observacoes_internas', 'alimentacao', 'medicamentos',
    'link_grupo_whatsapp', 'sexo', 'pc_nao_enviar', 'faixa_etaria',
    'diagnostico_pdf', 'contato_medico', 'contato_familia', 'patrono', 'cep'
];

// 🔥 LISTA DE CAMPOS DO TIPO DATE
const CAMPOS_DATE = [
    'data_nasc', 'data_criacao', 'inicio_contrato', 'vcto_contrato',
    'visita_enf', 'visita_dir', 'data_consultas'
];

// 🔥 FUNÇÃO PARA FORMATAR DATA PARA ISO (YYYY-MM-DD)
function formatarDataParaISO(dataStr) {
    if (!dataStr) return null;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
        return dataStr;
    }
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
        const partes = dataStr.split('/');
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    
    if (dataStr instanceof Date && !isNaN(dataStr.getTime())) {
        const ano = dataStr.getFullYear();
        const mes = String(dataStr.getMonth() + 1).padStart(2, '0');
        const dia = String(dataStr.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }
    
    console.warn('⚠️ Formato de data não reconhecido:', dataStr);
    return null;
}

// 🔥 FUNÇÃO PARA CONVERTER APENAS CAMPOS VÁLIDOS
function mapearCamposAssistido(dados) {
    const resultado = {};
    for (const [chave, valor] of Object.entries(dados)) {
        if (chave === 'id') continue;
        if (valor === undefined) continue;
        
        if (MAPEAMENTO_ASSISTIDOS[chave]) {
            const nomeBanco = MAPEAMENTO_ASSISTIDOS[chave];
            if (CAMPOS_SUPABASE_ASSISTIDOS.includes(nomeBanco)) {
                if (CAMPOS_DATE.includes(nomeBanco)) {
                    if (valor === null || valor === '' || valor === 'null') {
                        resultado[nomeBanco] = null;
                    } else {
                        const dataISO = formatarDataParaISO(valor);
                        resultado[nomeBanco] = dataISO;
                    }
                } else {
                    resultado[nomeBanco] = valor;
                }
            }
        } else if (CAMPOS_SUPABASE_ASSISTIDOS.includes(chave)) {
            if (CAMPOS_DATE.includes(chave)) {
                if (valor === null || valor === '' || valor === 'null') {
                    resultado[chave] = null;
                } else {
                    const dataISO = formatarDataParaISO(valor);
                    resultado[chave] = dataISO;
                }
            } else {
                resultado[chave] = valor;
            }
        }
    }
    return resultado;
}

// ============================================================
// FUNÇÃO BASE PARA REQUISIÇÕES
// ============================================================
async function supabaseRequest(endpoint, options = {}) {
    const url = `${CONFIG.SUPABASE_URL}/${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');
        
        if (response.status === 204 || (contentLength && parseInt(contentLength) === 0)) {
            return {};
        }
        if (contentType && !contentType.includes('application/json')) {
            return {};
        }
        const text = await response.text();
        if (!text || text.trim() === '') {
            return {};
        }
        try {
            return JSON.parse(text);
        } catch (parseError) {
            return { _raw: text };
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Supabase error:', error);
        
        if (error.name === 'AbortError' || error.message.includes('timed out') || error.message.includes('Failed to fetch')) {
            console.warn('⏱️ Timeout na requisição, tentando novamente com retry...');
            return supabaseRequestWithRetry(endpoint, options);
        }
        
        throw error;
    }
}

async function supabaseRequestWithRetry(endpoint, options, attempt = 1) {
    const maxAttempts = 3;
    const delay = 2000 * attempt;
    
    try {
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`🔄 Tentativa ${attempt + 1}/${maxAttempts} para:`, endpoint);
        return await supabaseRequest(endpoint, options);
    } catch (error) {
        if (attempt < maxAttempts) {
            return supabaseRequestWithRetry(endpoint, options, attempt + 1);
        }
        throw error;
    }
}

// ============================================================
// MAPEAMENTO CAMELCASE -> SNAKE_CASE
// ============================================================
function camelToSnake(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(camelToSnake);
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        result[snakeKey] = value;
    }
    return result;
}

function snakeToCamel(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(snakeToCamel);
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = value;
    }
    return result;
}

function convertKeysToCamel(data) {
    if (Array.isArray(data)) {
        return data.map(item => snakeToCamel(item));
    }
    return snakeToCamel(data);
}

// ============================================================
// FUNÇÕES - PERSONAL CARES (Cuidadores)
// ============================================================
async function supabaseGetCuidadoresComStatus() {
    try {
        const result = await supabaseRequest('personal_cares?select=nome,status');
        return { result: 'success', cuidadores: result };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetDadosPersonal(nome) {
    try {
        const result = await supabaseRequest(`personal_cares?nome=eq.${encodeURIComponent(nome)}&select=*`);
        const dados = result.length > 0 ? result[0] : null;
        return { result: 'success', dados: dados };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseUpdatePersonalCare(payload) {
    try {
        const personal = payload.personal;
        delete payload.personal;
        delete payload.action;
        const exists = await supabaseRequest(`personal_cares?nome=eq.${encodeURIComponent(personal)}&select=id`);
        let result;
        if (exists && exists.length > 0) {
            result = await supabaseRequest(`personal_cares?nome=eq.${encodeURIComponent(personal)}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
        } else {
            const novoPayload = { ...payload, nome: personal };
            result = await supabaseRequest('personal_cares', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(novoPayload)
            });
        }
        return { result: 'success', message: 'Personal Care salvo', data: result };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseDeletePersonal(nome) {
    try {
        await supabaseRequest(`personal_cares?nome=eq.${encodeURIComponent(nome)}`, { method: 'DELETE' });
        return { result: 'success', message: 'Personal Care excluído' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetResumoGeral() {
    try {
        const result = await supabaseRequest('personal_cares?select=status,regiao');
        const ativos = result.filter(pc => pc.status === 'Ativo').length;
        const inativos = result.filter(pc => pc.status === 'Inativo').length;
        return {
            result: 'success',
            resumo: {
                total: result.length,
                ativos: ativos,
                inativos: inativos
            }
        };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetDisponibilidadeMensal(mes, ano) {
    try {
        const result = await supabaseRequest(`personal_cares?select=nome,status`);
        const disponibilidade = {};
        result.forEach(pc => {
            disponibilidade[pc.nome] = {
                disponivel: pc.status === 'Ativo',
                status: pc.status
            };
        });
        return { result: 'success', disponibilidade: disponibilidade };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// FUNÇÕES - ASSISTIDOS
// ============================================================
async function supabaseListarAssistidosNomes() {
    try {
        const result = await supabaseRequest('assistidos?select=nome');
        const sheets = result.map(a => a.nome).filter(n => 
            !['Página Inicial', 'Dashboard', 'Configurações'].includes(n)
        );
        return { result: 'success', sheets: sheets };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetAssistidosCompleto() {
    try {
        const result = await supabaseRequest('assistidos?select=*');
        const assistidos = convertKeysToCamel(result);
        return { result: 'success', assistidos: assistidos, count: assistidos.length };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetAssistidosComStatus() {
    try {
        const result = await supabaseRequest('assistidos?select=nome,status,regiao,tipo_contrato,score_satisfacao,dia_vencimento,vlr_contrato');
        const assistidos = result.map(a => ({
            nome: a.nome,
            status: a.status,
            regiao: a.regiao,
            tipoContrato: a.tipo_contrato,
            scoreSatisfacao: a.score_satisfacao,
            diaVencimento: a.dia_vencimento,
            vlrContrato: a.vlr_contrato
        }));
        return { result: 'success', assistidos: assistidos, count: assistidos.length };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetDadosAssistido(assistido) {
    try {
        const result = await supabaseRequest(
            `assistidos?nome=eq.${encodeURIComponent(assistido)}&select=*`
        );
        
        const dados = result.length > 0 ? result[0] : null;
        if (!dados) {
            return { result: 'error', error: 'Assistido não encontrado' };
        }
        
        const dadosConvertidos = snakeToCamel(dados);
        return { result: 'success', ...dadosConvertidos };
    } catch (error) {
        console.error('❌ Erro em supabaseGetDadosAssistido:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetDadosAssistidoCompleto(assistido) {
    return supabaseGetDadosAssistido(assistido);
}

async function supabaseGetTodosCamposLinha2(assistido) {
    return supabaseGetDadosAssistido(assistido);
}

async function supabaseGetDashboardData() {
    try {
        const assistidosResult = await supabaseRequest('assistidos?select=*');
        const assistidos = convertKeysToCamel(assistidosResult);
        
        const leadsResult = await supabaseRequest('leads?select=*');
        const leads = convertKeysToCamel(leadsResult);
        
        const pcResult = await supabaseRequest('personal_cares?select=*');
        const personalCares = convertKeysToCamel(pcResult);
        
        const ativos = assistidos.filter(a => a.status === 'Ativo');
        const cuidadoresAtivos = personalCares.filter(pc => pc.status === 'Ativo');
        
        return {
            result: 'success',
            resumo: {
                ativos: ativos.length,
                cuidadoresAtivos: cuidadoresAtivos.length
            },
            assistidos: assistidos,
            leads: leads,
            personalCares: personalCares
        };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseUpdateDadosAnagraficos(data) {
    try {
        const assistido = data.assistido || data.originalAssistido;
        if (!assistido) {
            return { result: 'error', error: 'Assistido não informado' };
        }
        
        delete data.action;
        delete data.originalAssistido;
        delete data.novoAssistido;
        
        const payload = mapearCamposAssistido(data);
        
        if (Object.keys(payload).length === 0) {
            return { result: 'error', error: 'Nenhum campo válido para atualizar' };
        }
        
        const exists = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}&select=id`);
        
        if (!exists || exists.length === 0) {
            const novoPayload = { ...payload, nome: assistido };
            const result = await supabaseRequest('assistidos', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(novoPayload)
            });
            return { result: 'success', message: 'Assistido criado', data: result };
        }
        
        const result = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        
        return { result: 'success', message: 'Dados atualizados', data: result };
    } catch (error) {
        console.error('❌ Erro em supabaseUpdateDadosAnagraficos:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseDeleteAssistido(assistido) {
    try {
        const result = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}&select=id`);
        if (!result || result.length === 0) {
            return { result: 'error', error: 'Assistido não encontrado' };
        }
        const id = result[0].id;
        
        await supabaseRequest(`escalas?assistido_id=eq.${id}`, { method: 'DELETE' });
        await supabaseRequest(`prontuarios?assistido_id=eq.${id}`, { method: 'DELETE' });
        await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}`, { method: 'DELETE' });
        
        return { result: 'success', message: 'Assistido excluído com sucesso' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseVerificarAssistidoExistente(assistido) {
    try {
        const result = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}&select=id`);
        return { result: 'success', exists: result && result.length > 0 };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetMultiplosHorarios(assistidos) {
    try {
        const result = [];
        for (const nome of assistidos) {
            const dados = await supabaseGetDadosAssistido(nome);
            if (dados.result === 'success') {
                result.push({
                    nome: nome,
                    horaEntrada: dados.horaENT || '',
                    horaSaida: dados.horaSAI || ''
                });
            }
        }
        return { result: 'success', horarios: result };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetMultiplosEscalas(assistidos, meses) {
    try {
        const resultado = {};
        for (const nome of assistidos) {
            resultado[nome] = {};
            for (const mes of meses) {
                const escala = await supabaseGetEscalaMes(nome, mes);
                if (escala.result === 'success') {
                    resultado[nome][mes] = escala.escala;
                }
            }
        }
        return { result: 'success', escalas: resultado };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseValidarAcessoFamiliar(codigoAcesso) {
    try {
        const result = await supabaseRequest(`assistidos?codigo_acesso=eq.${encodeURIComponent(codigoAcesso)}&select=nome`);
        if (result && result.length > 0) {
            return { result: 'success', assistido: result[0].nome, valido: true };
        }
        return { result: 'success', valido: false };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}
// ============================================================
// FUNÇÕES - PRONTUÁRIOS
// ============================================================
async function supabaseCriarProntuario(data) {
    try {
        const assistidoResult = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(data.assistido)}&select=id`);
        if (assistidoResult.length === 0) throw new Error('Assistido não encontrado');
        const assistidoId = assistidoResult[0].id;
        const payload = {
            assistido_id: assistidoId,
            data_registro: data.Data_Registro || new Date().toISOString().split('T')[0],
            cuidadora: data.Cuidadora || '',
            data_plantao: data.DataPlantao || '',
            periodo: data.Periodo || '',
            plantao_anterior: data.PlantaoAnterior || '',
            estado_pele: data.EstadoPele || '',
            medicamentos: data.Medicamentos || '',
            sono: data.Sono || '',
            atividades_assistido: data.AtividadesAssistido || '',
            higiene_corporal: data.HigieneCorporal || '',
            higiene_oral: data.HigieneOral || '',
            consciencia: data.Consciencia || '',
            alimentacao: data.Alimentacao || '',
            evacuacoes: data.Evacuacoes || '',
            diurese: data.Diurese || '',
            atividades_cuidador: data.AtividadesCuidador || '',
            responsaveis: data.Responsaveis || '',
            intercorrencias: data.Intercorrencias || '',
            entrega_plantao: data.EntregaPlantao || '',
            pressao_arterial: data.PressaoArterial || '',
            spo2: data.SpO2 || '',
            frequencia_cardiaca: data.FrequenciaCardiaca || '',
            frequencia_respiratoria: data.FrequenciaRespiratoria || '',
            temperatura: data.Temperatura || '',
            glicemia: data.Glicemia || '',
            peso: data.Peso || '',
            altura: data.Altura || '',
            data_entrada: data.Data_Entrada || '',
            hora_entrada_as: data.Hora_Entrada || data.Hora_Entrada_AS || '',
            data_saida: data.Data_Saida || '',
            hora_saida_au: data.Hora_Saida || data.Hora_Saida_AU || ''
        };
        const result = await supabaseRequest('prontuarios', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        return { result: 'success', message: 'Prontuário criado', linha: result.length > 0 ? result[0].id : null };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseListarProntuarios(assistido, limite) {
    limite = limite || 3;
    try {
        const assistidoResult = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}&select=id`);
        if (assistidoResult.length === 0) return { result: 'success', prontuarios: [], count: 0 };
        const assistidoId = assistidoResult[0].id;
        const result = await supabaseRequest(
            `prontuarios?assistido_id=eq.${assistidoId}&order=created_at.desc&limit=${limite}`
        );
        return { result: 'success', prontuarios: result, count: result.length };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// FUNÇÕES - ESCALAS (Plantões)
// ============================================================
async function supabaseGetEscalaMes(assistido, mes) {
    try {
        const assistidoResult = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}&select=id`);
        if (assistidoResult.length === 0) return { result: 'success', escala: {} };
        const assistidoId = assistidoResult[0].id;
        const ano = new Date().getFullYear();
        const result = await supabaseRequest(
            `escalas?assistido_id=eq.${assistidoId}&mes=eq.${mes}&ano=eq.${ano}&select=*`
        );
        const escala = {};
        result.forEach(item => {
            escala[item.dia] = {
                diurno: item.diurno || '',
                noturno: item.noturno || ''
            };
        });
        return { result: 'success', escala: escala };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetEscalaMesFamiliar(assistido, mes) {
    return supabaseGetEscalaMes(assistido, mes);
}

async function supabaseUpdateEscala(data) {
    try {
        const assistidoResult = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(data.assistido)}&select=id`);
        if (!assistidoResult || assistidoResult.length === 0) {
            return { result: 'error', error: 'Assistido não encontrado' };
        }
        const assistidoId = assistidoResult[0].id;
        const ano = new Date().getFullYear();
        const existing = await supabaseRequest(
            `escalas?assistido_id=eq.${assistidoId}&mes=eq.${data.mes}&ano=eq.${ano}&dia=eq.${data.dia}&select=id`
        );
        const insertData = {
            assistido_id: assistidoId,
            mes: data.mes,
            ano: ano,
            dia: data.dia,
            updated_at: new Date().toISOString()
        };
        if (data.turno === 'diurno') {
            insertData.diurno = data.cuidador;
            insertData.diurno_pago = data.cuidador ? data.cuidador.includes(';PG') : false;
        } else {
            insertData.noturno = data.cuidador;
            insertData.noturno_pago = data.cuidador ? data.cuidador.includes(';PG') : false;
        }
        let result;
        if (existing && existing.length > 0) {
            result = await supabaseRequest(`escalas?id=eq.${existing[0].id}`, {
                method: 'PATCH',
                body: JSON.stringify(insertData)
            });
        } else {
            result = await supabaseRequest('escalas', {
                method: 'POST',
                body: JSON.stringify(insertData)
            });
        }
        if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
            return { result: 'success', message: 'Escala atualizada' };
        }
        return { result: 'success', message: 'Escala atualizada', data: result };
    } catch (error) {
        console.error('❌ Erro em supabaseUpdateEscala:', error);
        if (error.message && error.message.includes('Unexpected end of JSON input')) {
            return { result: 'success', message: 'Escala atualizada (resposta vazia)' };
        }
        return { result: 'error', error: error.message };
    }
}

async function supabaseSalvarEscalaCompleta(data) {
    try {
        const assistido = data.assistido;
        const mes = data.mes;
        const ano = new Date().getFullYear();
        const escala = data.escala;
        const assistidoResult = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}&select=id`);
        if (!assistidoResult || assistidoResult.length === 0) {
            return { result: 'error', error: 'Assistido não encontrado' };
        }
        const assistidoId = assistidoResult[0].id;
        let count = 0;
        for (const dia in escala) {
            const turnos = escala[dia];
            const diurno = turnos.diurno || '';
            const noturno = turnos.noturno || '';
            if (diurno || noturno) {
                const existing = await supabaseRequest(
                    `escalas?assistido_id=eq.${assistidoId}&mes=eq.${mes}&ano=eq.${ano}&dia=eq.${parseInt(dia)}&select=id`
                );
                const insertData = {
                    assistido_id: assistidoId,
                    mes: mes,
                    ano: ano,
                    dia: parseInt(dia),
                    diurno: diurno,
                    noturno: noturno,
                    diurno_pago: diurno ? diurno.includes(';PG') : false,
                    noturno_pago: noturno ? noturno.includes(';PG') : false,
                    updated_at: new Date().toISOString()
                };
                if (existing && existing.length > 0) {
                    await supabaseRequest(`escalas?id=eq.${existing[0].id}`, {
                        method: 'PATCH',
                        body: JSON.stringify(insertData)
                    });
                } else {
                    await supabaseRequest('escalas', {
                        method: 'POST',
                        body: JSON.stringify(insertData)
                    });
                }
                count++;
            }
        }
        return { result: 'success', message: `Escala salva (${count} registros)`, count: count };
    } catch (error) {
        console.error('❌ Erro em supabaseSalvarEscalaCompleta:', error);
        if (error.message && error.message.includes('Unexpected end of JSON input')) {
            return { result: 'success', message: 'Escala salva (resposta vazia)' };
        }
        return { result: 'error', error: error.message };
    }
}

async function supabaseAplicarCuidadoresPadrao(data) {
    try {
        const assistido = data.assistido;
        const mes = data.mes;
        const cuidadores = data.cuidadores || {};
        
        const escalaAtual = await supabaseGetEscalaMes(assistido, mes);
        if (escalaAtual.result === 'error') {
            return { result: 'error', error: escalaAtual.error };
        }
        
        const escala = escalaAtual.escala || {};
        let count = 0;
        
        for (const dia in escala) {
            if (!escala[dia].diurno && cuidadores.diurno) {
                escala[dia].diurno = cuidadores.diurno;
                count++;
            }
            if (!escala[dia].noturno && cuidadores.noturno) {
                escala[dia].noturno = cuidadores.noturno;
                count++;
            }
        }
        
        await supabaseSalvarEscalaCompleta({
            assistido: assistido,
            mes: mes,
            escala: escala
        });
        
        return { result: 'success', message: `Cuidadores aplicados em ${count} dias` };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseLimparEscala(data) {
    try {
        const assistido = data.assistido;
        const mes = data.mes;
        
        const assistidoResult = await supabaseRequest(`assistidos?nome=eq.${encodeURIComponent(assistido)}&select=id`);
        if (!assistidoResult || assistidoResult.length === 0) {
            return { result: 'error', error: 'Assistido não encontrado' };
        }
        const assistidoId = assistidoResult[0].id;
        const ano = new Date().getFullYear();
        
        await supabaseRequest(
            `escalas?assistido_id=eq.${assistidoId}&mes=eq.${mes}&ano=eq.${ano}`,
            { method: 'DELETE' }
        );
        
        return { result: 'success', message: 'Escala limpa com sucesso' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// FUNÇÕES - GRUPOS WHATSAPP
// ============================================================
async function supabaseGetGruposWhatsApp() {
    try {
        const result = await supabaseRequest('grupos_whatsapp?select=*');
        const grupos = result.map(g => ({
            id: g.id,
            nome: g.nome,
            tipo: g.tipo || ''
        }));
        return { result: 'success', grupos: grupos };
    } catch (error) {
        return { result: 'success', grupos: [] };
    }
}

async function supabaseGetGruposWhatsAppCompleto() {
    return supabaseGetGruposWhatsApp();
}

// ============================================================
// FUNÇÕES - DESPESAS
// ============================================================
async function supabaseListarDespesas() {
    try {
        const result = await supabaseRequest('despesas?select=*&order=data.desc');
        const despesas = convertKeysToCamel(result);
        return { result: 'success', despesas: despesas };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseCriarDespesa(data) {
    try {
        let dataValor = data.data || '';
        if (!dataValor || dataValor.trim() === '') {
            dataValor = new Date().toISOString().split('T')[0];
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataValor)) {
            const partes = dataValor.split('/');
            dataValor = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
        const dataPlantao = data.dataPlantao && data.dataPlantao.trim() !== '' ? data.dataPlantao : null;
        let dataPlantaoFormatada = null;
        if (dataPlantao) {
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataPlantao)) {
                const partes = dataPlantao.split('/');
                dataPlantaoFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
            } else {
                dataPlantaoFormatada = dataPlantao;
            }
        }
        const payload = {
            data: dataValor,
            descricao: data.descricao || '',
            categoria: data.categoria || 'Outros',
            valor: parseFloat(data.valor) || 0,
            forma_pagamento: data.formaPagamento || 'Pix',
            fornecedor: data.fornecedor || '',
            nota_fiscal: data.notaFiscal || '',
            observacoes: data.observacoes || '',
            status: data.status || 'Pendente',
            assistido: data.assistido || '',
            data_plantao: dataPlantaoFormatada,
            turno: data.turno || ''
        };
        const result = await supabaseRequest('despesas', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        return { result: 'success', message: 'Despesa criada', data: result };
    } catch (error) {
        console.error('❌ Erro em supabaseCriarDespesa:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseAtualizarDespesa(data) {
    try {
        const id = data.id;
        delete data.id;
        
        let dataValor = data.data || '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataValor)) {
            const partes = dataValor.split('/');
            dataValor = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
        
        let dataPlantaoFormatada = null;
        if (data.dataPlantao && data.dataPlantao.trim() !== '') {
            let dataPlantao = data.dataPlantao;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataPlantao)) {
                const partes = dataPlantao.split('/');
                dataPlantaoFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
            } else {
                dataPlantaoFormatada = dataPlantao;
            }
        }
        
        const payload = {
            data: dataValor,
            descricao: data.descricao || '',
            categoria: data.categoria || 'Outros',
            valor: parseFloat(data.valor) || 0,
            forma_pagamento: data.formaPagamento || 'Pix',
            fornecedor: data.fornecedor || '',
            nota_fiscal: data.notaFiscal || '',
            observacoes: data.observacoes || '',
            status: data.status || 'Pendente',
            assistido: data.assistido || '',
            data_plantao: dataPlantaoFormatada,
            turno: data.turno || ''
        };
        
        await supabaseRequest(`despesas?id=eq.${id}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        return { result: 'success', message: 'Despesa atualizada' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseExcluirDespesa(id) {
    try {
        await supabaseRequest(`despesas?id=eq.${id}`, { method: 'DELETE' });
        return { result: 'success', message: 'Despesa excluída' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetDespesasByPlantao(assistido, dataPlantao, turno) {
    try {
        const filter = `assistido=eq.${encodeURIComponent(assistido)}&data_plantao=eq.${dataPlantao}&turno=eq.${turno}`;
        const result = await supabaseRequest(`despesas?${filter}&select=id`);
        return { result: 'success', exists: result.length > 0, count: result.length };
    } catch (error) {
        console.error('❌ Erro ao verificar despesa:', error);
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// FUNÇÕES - METADADOS
// ============================================================
async function supabaseGetMetadados() {
    try {
        var categoriasBase = CONFIG.CATEGORIAS_DESPESAS || CATEGORIAS_DESPESAS_PADRAO;
        var tiposBase = CONFIG.TIPOS_RECEITA_AVULSA || TIPOS_RECEITA_AVULSA_PADRAO;
        var formasBase = CONFIG.FORMAS_PAGAMENTO || FORMAS_PAGAMENTO_PADRAO;
        
        try {
            const despesasResult = await supabaseRequest('despesas?select=categoria');
            const categoriasSet = new Set(categoriasBase);
            despesasResult.forEach(d => {
                if (d.categoria && d.categoria.trim() !== '') {
                    categoriasSet.add(d.categoria);
                }
            });
            var categorias = Array.from(categoriasSet).sort();
            
            const receitasResult = await supabaseRequest('receitas?select=tipo_avulso');
            const tiposSet = new Set(tiposBase);
            receitasResult.forEach(r => {
                if (r.tipo_avulso && r.tipo_avulso.trim() !== '') {
                    tiposSet.add(r.tipo_avulso);
                }
            });
            var tipos = Array.from(tiposSet).sort();
            
            return {
                result: 'success',
                categoriasDespesas: categorias,
                tiposReceitaAvulsa: tipos,
                formasPagamento: formasBase
            };
        } catch (error) {
            console.warn('⚠️ Erro ao enriquecer metadados, usando listas mestras:', error);
            return {
                result: 'success',
                categoriasDespesas: categoriasBase,
                tiposReceitaAvulsa: tiposBase,
                formasPagamento: formasBase
            };
        }
    } catch (error) {
        console.error('❌ Erro em supabaseGetMetadados:', error);
        return {
            result: 'success',
            categoriasDespesas: CONFIG.CATEGORIAS_DESPESAS || CATEGORIAS_DESPESAS_PADRAO,
            tiposReceitaAvulsa: CONFIG.TIPOS_RECEITA_AVULSA || TIPOS_RECEITA_AVULSA_PADRAO,
            formasPagamento: CONFIG.FORMAS_PAGAMENTO || FORMAS_PAGAMENTO_PADRAO
        };
    }
}

// ============================================================
// FUNÇÕES - RECEITAS
// ============================================================
async function supabaseListarReceitas() {
    try {
        const result = await supabaseRequest('receitas?select=*&order=data.desc');
        const receitas = convertKeysToCamel(result);
        
        const receitasCorrigidas = receitas.map(function(r) {
            return {
                ...r,
                tipo: r.tipoAvulso || r.tipo || 'Outro'
            };
        });
        
        return { result: 'success', receitas: receitasCorrigidas };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseCriarReceitaAvulsa(data) {
    try {
        let dataValor = data.data || '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataValor)) {
            const partes = dataValor.split('/');
            dataValor = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
        
        const tipoAvulso = data.tipoAvulso || data.tipo || 'Outro';
        
        const payload = {
            data: dataValor,
            descricao: data.descricao || '',
            assistido: data.assistido || '',
            valor: parseFloat(data.valor) || 0,
            tipo_avulso: tipoAvulso,
            status: data.status || 'Pendente'
        };
        
        await supabaseRequest('receitas', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        return { result: 'success', message: 'Receita criada' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseAtualizarReceitaAvulsa(data) {
    try {
        const id = data.id;
        delete data.id;
        
        let dataValor = data.data || '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataValor)) {
            const partes = dataValor.split('/');
            dataValor = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
        
        const tipoAvulso = data.tipoAvulso || data.tipo || 'Outro';
        
        const payload = {
            data: dataValor,
            descricao: data.descricao || '',
            assistido: data.assistido || '',
            valor: parseFloat(data.valor) || 0,
            tipo_avulso: tipoAvulso,
            status: data.status || 'Pendente'
        };
        
        await supabaseRequest(`receitas?id=eq.${id}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        return { result: 'success', message: 'Receita atualizada' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseExcluirReceitaAvulsa(id) {
    try {
        await supabaseRequest(`receitas?id=eq.${id}`, { method: 'DELETE' });
        return { result: 'success', message: 'Receita excluída' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGerarReceitas(mes, ano) {
    try {
        console.log('📊 Iniciando geração de receitas para:', mes + '/' + ano);
        
        const assistidosResult = await supabaseRequest(
            `assistidos?status=eq.Ativo&tipo_contrato=eq.MENSAL&select=nome,dia_vencimento,vlr_contrato`
        );
        
        console.log('📊 Assistidos encontrados:', assistidosResult ? assistidosResult.length : 0);
        
        if (!assistidosResult || assistidosResult.length === 0) {
            console.warn('⚠️ Nenhum assistido ativo com contrato mensal encontrado');
            return { 
                success: true, 
                criados: 0, 
                ignorados: 0,
                message: 'Nenhum assistido ativo com contrato mensal encontrado',
                detalhes: []
            };
        }
        
        const mesStr = String(mes).padStart(2, '0');
        const anoStr = String(ano);
        let criados = 0;
        let ignorados = 0;
        let erros = 0;
        const detalhes = [];
        
        for (const assistido of assistidosResult) {
            const nome = assistido.nome || 'N/A';
            const diaVencimento = assistido.dia_vencimento || '';
            const vlrContrato = parseFloat(assistido.vlr_contrato) || 0;
            
            if (vlrContrato <= 0) {
                console.warn(`⚠️ Assistido "${nome}" ignorado: vlr_contrato = ${vlrContrato}`);
                ignorados++;
                detalhes.push({ nome, status: 'ignorado', motivo: 'vlr_contrato = 0' });
                continue;
            }
            
            let dia = parseInt(diaVencimento) || 1;
            if (dia < 1 || dia > 31) {
                console.warn(`⚠️ Assistido "${nome}" dia_vencimento inválido (${diaVencimento}), usando dia 1`);
                dia = 1;
            }
            const diaStr = String(dia).padStart(2, '0');
            const dataCompetencia = `${anoStr}-${mesStr}-${diaStr}`;
            const descricao = `Contrato Mensal - ${mesStr}/${anoStr}`;
            
            try {
                const existing = await supabaseRequest(
                    `receitas?assistido=eq.${encodeURIComponent(nome)}&data=eq.${dataCompetencia}&tipo_avulso=eq.Contrato Mensal&select=id`
                );
                
                if (existing && existing.length > 0) {
                    console.log(`ℹ️ Assistido "${nome}" já possui receita para ${mesStr}/${anoStr}`);
                    ignorados++;
                    detalhes.push({ nome, status: 'ignorado', motivo: 'já existe' });
                    continue;
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao verificar existência para "${nome}":`, error);
            }
            
            try {
                await supabaseRequest('receitas', {
                    method: 'POST',
                    body: JSON.stringify({
                        data: dataCompetencia,
                        descricao: descricao,
                        assistido: nome,
                        valor: vlrContrato,
                        tipo_avulso: 'Contrato Mensal',
                        status: 'Pendente'
                    })
                });
                
                console.log(`✅ Receita criada para "${nome}": R$ ${vlrContrato.toFixed(2)} - ${dataCompetencia}`);
                criados++;
                detalhes.push({ 
                    nome, 
                    status: 'criado', 
                    valor: vlrContrato, 
                    data: dataCompetencia 
                });
            } catch (error) {
                console.error(`❌ Erro ao criar receita para "${nome}":`, error);
                erros++;
                detalhes.push({ nome, status: 'erro', motivo: error.message });
            }
        }
        
        console.log('📊 RESUMO DA GERAÇÃO:');
        console.log(`  ✅ Criados: ${criados}`);
        console.log(`  ⏭️ Ignorados: ${ignorados}`);
        console.log(`  ❌ Erros: ${erros}`);
        
        let mensagem = '';
        if (criados === 0) {
            if (ignorados > 0 && erros === 0) {
                const temSemValor = detalhes.some(d => d.motivo === 'vlr_contrato = 0');
                const temExistentes = detalhes.some(d => d.motivo === 'já existe');
                
                if (temSemValor) mensagem = 'Assistidos sem valor de contrato definido. ';
                if (temExistentes) mensagem += 'Receitas já existentes para este mês. ';
                if (!temSemValor && !temExistentes) mensagem = 'Verifique os logs para mais detalhes.';
            } else if (erros > 0) {
                mensagem = `${erros} erro(s) ao criar receitas. Verifique os logs.`;
            } else {
                mensagem = 'Nenhum assistido ativo com contrato mensal encontrado.';
            }
        } else {
            mensagem = `${criados} receitas geradas, ${ignorados} ignoradas, ${erros} erros`;
        }
        
        return { 
            success: true, 
            criados: criados, 
            ignorados: ignorados,
            erros: erros,
            message: mensagem,
            detalhes: detalhes
        };
    } catch (error) {
        console.error('❌ Erro em supabaseGerarReceitas:', error);
        return { success: false, erro: error.message };
    }
}
// ============================================================
// FUNÇÕES - LEADS
// ============================================================
async function supabaseListarLeads() {
    try {
        const result = await supabaseRequest('leads?select=*&order=data_cadastro.desc');
        const leads = result.map(item => {
            const converted = snakeToCamel(item);
            if (!converted.dataCadastro && item.data_cadastro) {
                converted.dataCadastro = item.data_cadastro;
            }
            return converted;
        });
        return { result: 'success', leads: leads };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetMetadadosLeads() {
    try {
        const origensResult = await supabaseRequest('leads?select=origem');
        const origensSet = new Set();
        origensResult.forEach(l => {
            if (l.origem) origensSet.add(l.origem);
        });
        const origens = Array.from(origensSet).sort();
        
        const statusResult = await supabaseRequest('leads?select=status');
        const statusSet = new Set();
        statusResult.forEach(l => {
            if (l.status) statusSet.add(l.status);
        });
        const statusLead = Array.from(statusSet).sort();
        
        const respResult = await supabaseRequest('leads?select=responsavel');
        const respSet = new Set();
        respResult.forEach(l => {
            if (l.responsavel) respSet.add(l.responsavel);
        });
        const responsaveis = Array.from(respSet).sort();
        
        return {
            result: 'success',
            origens: origens.length > 0 ? origens : ['Indicação', 'Google', 'Instagram', 'PIÙ VITA', 'Site', 'WhatsApp', 'Evento', 'Outros'],
            regioes: ['Zona Sul', 'Zona Norte', 'Zona Leste', 'Zona Oeste', 'Centro', 'Várzea Grande', 'Chapada Guimarães', 'Interior', 'Outras'],
            tiposServico: ['Cuidados 6Hrs', 'Cuidados 8Hrs', 'Cuidados 12Hrs', 'Cuidados 24Hrs', 'Enfermeiras', 'Fisioterapia', 'Outros'],
            periodosContratacao: ['Mensal', 'Avulso', 'Indeterminado'],
            turnos: ['Diurno', 'Noturno', 'Final Semana', 'A definir'],
            statusLead: statusLead.length > 0 ? statusLead : ['📞 Novo Lead', '🔄 Em Negociação', '📄 Proposta Enviada', '✅ Fechado (Contrato)', '❌ Perdido', '🚫 Não qualificado', '🔄 Aguardando Retorno'],
            responsaveis: responsaveis.length > 0 ? responsaveis : ['Francisco Diniz', 'Cibelle Leal', 'Enfermeiras', 'Comercial']
        };
    } catch (error) {
        return {
            result: 'success',
            origens: ['Indicação', 'Google', 'Instagram', 'PIÙ VITA', 'Site', 'WhatsApp', 'Evento', 'Outros'],
            regioes: ['Zona Sul', 'Zona Norte', 'Zona Leste', 'Zona Oeste', 'Centro', 'Várzea Grande', 'Chapada Guimarães', 'Interior', 'Outras'],
            tiposServico: ['Cuidados 6Hrs', 'Cuidados 8Hrs', 'Cuidados 12Hrs', 'Cuidados 24Hrs', 'Enfermeiras', 'Fisioterapia', 'Outros'],
            periodosContratacao: ['Mensal', 'Avulso', 'Indeterminado'],
            turnos: ['Diurno', 'Noturno', 'Final Semana', 'A definir'],
            statusLead: ['📞 Novo Lead', '🔄 Em Negociação', '📄 Proposta Enviada', '✅ Fechado (Contrato)', '❌ Perdido', '🚫 Não qualificado', '🔄 Aguardando Retorno'],
            responsaveis: ['Francisco Diniz', 'Cibelle Leal', 'Enfermeiras', 'Comercial']
        };
    }
}

async function supabaseCriarLead(data) {
    try {
        var hoje = new Date();
        var ano = hoje.getFullYear();
        var mes = String(hoje.getMonth() + 1).padStart(2, '0');
        var dia = String(hoje.getDate()).padStart(2, '0');
        var dataAtual = ano + '-' + mes + '-' + dia;
        
        var payload = {
            nome_completo: data.nome || '',
            telefone: data.contato || '',
            email: data.email || '',
            origem: data.origem || 'Indicação',
            regiao_atendimento: data.regiaoAtendimento || '',
            tipo_servico: data.tipoServico || '',
            data_necessidade: data.dataNecessidade || '',
            periodo_contratacao: data.periodoContratacao || '',
            turno_preferencia: data.turnoPreferencia || '',
            status: data.status || '📞 Novo Lead',
            proxima_acao: data.proximaAcao || '',
            data_proxima_acao: data.dataProximaAcao || '',
            responsavel: data.responsavel || 'Francisco Diniz',
            valor_estimado: parseFloat(data.valorEstimado) || 0,
            observacoes: data.observacoes || '',
            data_cadastro: dataAtual
        };
        
        await supabaseRequest('leads', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        return { result: 'success', message: 'Lead criado com sucesso' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseAtualizarLead(id, data) {
    try {
        const payload = {
            nome_completo: data.nome || '',
            telefone: data.contato || '',
            email: data.email || '',
            origem: data.origem || '',
            regiao_atendimento: data.regiaoAtendimento || '',
            tipo_servico: data.tipoServico || '',
            data_necessidade: data.dataNecessidade || '',
            periodo_contratacao: data.periodoContratacao || '',
            turno_preferencia: data.turnoPreferencia || '',
            status: data.status || '',
            proxima_acao: data.proximaAcao || '',
            data_proxima_acao: data.dataProximaAcao || '',
            responsavel: data.responsavel || '',
            valor_estimado: parseFloat(data.valorEstimado) || 0,
            observacoes: data.observacoes || ''
        };
        
        await supabaseRequest(`leads?id=eq.${id}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
        });
        return { result: 'success', message: 'Lead atualizado com sucesso' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseExcluirLead(id) {
    try {
        await supabaseRequest(`leads?id=eq.${id}`, { method: 'DELETE' });
        return { result: 'success', message: 'Lead excluído com sucesso' };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// FUNÇÕES - FLUXO DE CAIXA E SIMULAÇÕES
// ============================================================
async function supabaseGetFluxoCaixaCompleto(meses, saldoInicial) {
    try {
        meses = meses || 6;
        saldoInicial = saldoInicial || 0;
        
        const receitasResult = await supabaseRequest('receitas?select=*');
        const despesasResult = await supabaseRequest('despesas?select=*');
        
        const receitas = convertKeysToCamel(receitasResult);
        const despesas = convertKeysToCamel(despesasResult);
        
        const hoje = new Date();
        const projecao = [];
        let saldoAtual = saldoInicial;
        
        for (let i = 0; i < meses; i++) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
            const mes = data.getMonth() + 1;
            const ano = data.getFullYear();
            const mesStr = String(mes).padStart(2, '0');
            const mesRef = `${ano}-${mesStr}`;
            
            let receitaMes = 0;
            let despesaMes = 0;
            
            for (const r of receitas) {
                if (r.data && r.data.startsWith(mesRef) && r.status === 'Recebido') {
                    receitaMes += parseFloat(r.valor) || 0;
                }
            }
            
            for (const d of despesas) {
                if (d.data && d.data.startsWith(mesRef) && d.status === 'Pago') {
                    despesaMes += parseFloat(d.valor) || 0;
                }
            }
            
            const perdaContratos = 0;
            const resultado = receitaMes - despesaMes - perdaContratos;
            saldoAtual += resultado;
            
            projecao.push({
                mes: mes,
                ano: ano,
                receita: receitaMes,
                despesa: despesaMes,
                perdaContratos: perdaContratos,
                resultado: resultado,
                saldoAcumulado: saldoAtual
            });
        }
        
        const ultimo = projecao[projecao.length - 1];
        const primeiro = projecao[0];
        const saldoProjetado = ultimo.saldoAcumulado || 0;
        const margemSeguranca = primeiro.receita > 0 ? ((primeiro.resultado || 0) / primeiro.receita * 100) : 0;
        
        let riscoCaixa = 'BAIXO';
        if (saldoProjetado < 0) {
            riscoCaixa = 'CRITICO';
        } else if (saldoProjetado < 10000 || margemSeguranca < 5) {
            riscoCaixa = 'ALTO';
        } else if (saldoProjetado < 20000 || margemSeguranca < 10) {
            riscoCaixa = 'MEDIO';
        }
        
        return {
            result: 'success',
            saldoInicial: saldoInicial,
            projecao: projecao,
            indicadores: {
                saldoProjetado: saldoProjetado,
                margemSeguranca: margemSeguranca,
                riscoCaixa: riscoCaixa,
                diasCobertura: saldoAtual > 0 ? Math.round(saldoAtual / (primeiro.despesa / 30 || 1)) : 0
            }
        };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetFluxoCaixaResumido() {
    return supabaseGetFluxoCaixaCompleto(3, 0);
}

async function supabaseSimularPerdaContrato(assistidos) {
    try {
        const resultado = [];
        for (const nome of assistidos) {
            const dados = await supabaseGetDadosAssistido(nome);
            if (dados.result === 'success') {
                const vlrContrato = parseFloat(dados.vlrContrato) || 0;
                const totalHrsMes = parseFloat(dados.totalHrsMes) || 0;
                const vlrPlantao = parseFloat(dados.vlrPlantao) || 0;
                const custoProfissional = totalHrsMes * vlrPlantao;
                
                resultado.push({
                    assistido: nome,
                    valor: vlrContrato,
                    custoProfissional: custoProfissional,
                    status: dados.status || 'Ativo'
                });
            }
        }
        return { result: 'success', assistidos: resultado };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

async function supabaseSimularCenario(params) {
    try {
        const leadsMensal = params.leadsMensal || 30;
        const taxaConversao = params.taxaConversao || 5;
        const ticketMedio = params.ticketMedio || 5000;
        const churnMensal = params.churnMensal || 0.33;
        const despesasOperacionais = params.despesasOperacionais || 20000;
        const percentualPersonal = params.percentualPersonal || 0.8;
        const meses = params.meses || 6;
        const saldoInicial = params.saldoInicial || 0;
        
        const projecao = [];
        let saldoAtual = saldoInicial;
        const hoje = new Date();
        
        for (let i = 0; i < meses; i++) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
            const mes = data.getMonth() + 1;
            const ano = data.getFullYear();
            
            const receita = (leadsMensal * taxaConversao / 100) * ticketMedio;
            const custoPersonal = receita * percentualPersonal;
            const despesa = custoPersonal + despesasOperacionais;
            const perdaContratos = churnMensal * ticketMedio;
            const resultado = receita - despesa - perdaContratos;
            saldoAtual += resultado;
            
            projecao.push({ mes, ano, receita, despesa, perdaContratos, resultado, saldoAcumulado: saldoAtual });
        }
        
        const ultimo = projecao[projecao.length - 1];
        const primeiro = projecao[0];
        const saldoFinal = ultimo.saldoAcumulado || 0;
        const margemSeguranca = primeiro.receita > 0 ? ((primeiro.resultado || 0) / primeiro.receita * 100) : 0;
        
        let riscoCaixa = 'BAIXO';
        if (saldoFinal < 0) {
            riscoCaixa = 'CRITICO';
        } else if (saldoFinal < 10000 || margemSeguranca < 5) {
            riscoCaixa = 'ALTO';
        } else if (saldoFinal < 20000 || margemSeguranca < 10) {
            riscoCaixa = 'MEDIO';
        }
        
        return {
            result: 'success',
            parametros: params,
            projecao: projecao,
            indicadores: {
                saldoFinal: saldoFinal,
                margemSeguranca: margemSeguranca,
                riscoCaixa: riscoCaixa,
                diasCobertura: saldoAtual > 0 ? Math.round(saldoAtual / (primeiro.despesa / 30 || 1)) : 0,
                contratosFinais: Math.round((leadsMensal * taxaConversao / 100) - churnMensal)
            },
            resumo: {
                descricao: `Cenário com ${leadsMensal} leads/mês, ${taxaConversao}% conversão, ticket ${ticketMedio}`
            }
        };
    } catch (error) {
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// 🆕 FUNÇÕES - SALDO DO FLUXO DE CAIXA (CAIXA + APLICAÇÕES)
// ============================================================
async function supabaseGetSaldoAtual() {
    try {
        const result = await supabaseRequest('saldo_fluxo_caixa?select=*&order=updated_at.desc&limit=1');
        
        if (!result || result.length === 0) {
            return {
                result: 'success',
                saldoCaixa: 0,
                saldoAplicacoes: 0,
                saldoConsolidado: 0,
                updatedAt: null
            };
        }
        
        const registro = result[0];
        const saldoCaixa = parseFloat(registro.saldo_caixa) || 0;
        const saldoAplicacoes = parseFloat(registro.saldo_aplicacoes) || 0;
        
        return {
            result: 'success',
            saldoCaixa: saldoCaixa,
            saldoAplicacoes: saldoAplicacoes,
            saldoConsolidado: saldoCaixa + saldoAplicacoes,
            updatedAt: registro.updated_at || null
        };
    } catch (error) {
        console.error('❌ Erro em supabaseGetSaldoAtual:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseSalvarSaldoAtual(saldoCaixa, saldoAplicacoes) {
    try {
        const caixa = parseFloat(saldoCaixa) || 0;
        const aplicacoes = parseFloat(saldoAplicacoes) || 0;
        
        const existing = await supabaseRequest('saldo_fluxo_caixa?select=id&limit=1');
        
        const payload = {
            saldo_caixa: caixa,
            saldo_aplicacoes: aplicacoes,
            updated_at: new Date().toISOString()
        };
        
        if (existing && existing.length > 0) {
            await supabaseRequest(`saldo_fluxo_caixa?id=eq.${existing[0].id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
        } else {
            await supabaseRequest('saldo_fluxo_caixa', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
        }
        
        return {
            result: 'success',
            message: 'Saldo salvo com sucesso',
            saldoCaixa: caixa,
            saldoAplicacoes: aplicacoes,
            saldoConsolidado: caixa + aplicacoes
        };
    } catch (error) {
        console.error('❌ Erro em supabaseSalvarSaldoAtual:', error);
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// 🆕 FUNÇÕES - METAS DO SISTEMA
// ============================================================
async function supabaseGetMetas() {
    try {
        const result = await supabaseRequest('saldo_fluxo_caixa?select=*&order=updated_at.desc&limit=1');
        
        if (!result || result.length === 0) {
            return {
                result: 'success',
                metas: {
                    faturamento: 50000,
                    margem: 25,
                    leads: 30,
                    conversao: 5,
                    diasAlerta: 15,
                    churnMensal: 0.33,
                    ticketMedioNovoLead: 5000,
                    despesasOperacionais: 20000
                },
                updatedAt: null
            };
        }
        
        const registro = result[0];
        
        return {
            result: 'success',
            metas: {
                faturamento: parseFloat(registro.meta_faturamento) || 50000,
                margem: parseFloat(registro.meta_margem) || 25,
                leads: parseInt(registro.meta_leads) || 30,
                conversao: parseFloat(registro.meta_conversao) || 5,
                diasAlerta: parseInt(registro.meta_dias_alerta) || 15,
                churnMensal: parseFloat(registro.meta_churn_mensal) || 0.33,
                ticketMedioNovoLead: parseFloat(registro.meta_ticket_medio) || 5000,
                despesasOperacionais: parseFloat(registro.param_despesas_operacionais) || 
                                     parseFloat(registro.meta_despesas_operacionais) || 20000
            },
            updatedAt: registro.updated_at || null
        };
    } catch (error) {
        console.error('❌ Erro em supabaseGetMetas:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseSalvarMetas(metas) {
    try {
        const existing = await supabaseRequest('saldo_fluxo_caixa?select=id&limit=1');
        
        const payload = {
            meta_faturamento: parseFloat(metas.faturamento) || 50000,
            meta_margem: parseFloat(metas.margem) || 25,
            meta_leads: parseInt(metas.leads) || 30,
            meta_conversao: parseFloat(metas.conversao) || 5,
            meta_dias_alerta: parseInt(metas.diasAlerta) || 15,
            meta_churn_mensal: parseFloat(metas.churnMensal) || 0.33,
            meta_ticket_medio: parseFloat(metas.ticketMedioNovoLead) || 5000,
            updated_at: new Date().toISOString()
        };
        
        if (existing && existing.length > 0) {
            await supabaseRequest(`saldo_fluxo_caixa?id=eq.${existing[0].id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
        } else {
            await supabaseRequest('saldo_fluxo_caixa', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
        }
        
        return {
            result: 'success',
            message: 'Metas salvas com sucesso',
            metas: metas
        };
    } catch (error) {
        console.error('❌ Erro em supabaseSalvarMetas:', error);
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// 🆕 FUNÇÕES - PARÂMETROS CONSOLIDADOS (Fase 1)
// ============================================================

async function supabaseGetParametrosConsolidados() {
    try {
        const result = await supabaseRequest(
            'saldo_fluxo_caixa?select=*&order=updated_at.desc&limit=1'
        );
        
        if (!result || result.length === 0) {
            return {
                result: 'success',
                parametros: {
                    despesasOperacionais: 20000,
                    aliquotaImposto: 6,
                    cacMedio: 500,
                    mesesAmortizacaoCac: 12,
                    leadsMensal: 30,
                    taxaConversao: 5,
                    meses: 6
                }
            };
        }
        
        const r = result[0];
        return {
            result: 'success',
            parametros: {
                despesasOperacionais: parseFloat(r.param_despesas_operacionais) || 
                                     parseFloat(r.meta_despesas_operacionais) || 20000,
                aliquotaImposto: parseFloat(r.param_aliquota_imposto) || 6,
                cacMedio: parseFloat(r.param_cac_medio) || 500,
                mesesAmortizacaoCac: parseInt(r.param_meses_amortizacao_cac) || 12,
                leadsMensal: parseInt(r.sim_leads_mensal) || 30,
                taxaConversao: parseFloat(r.sim_taxa_conversao) || 5,
                meses: parseInt(r.sim_meses) || 6
            },
            updatedAt: r.updated_at || null
        };
    } catch (error) {
        console.error('❌ Erro em supabaseGetParametrosConsolidados:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetParametrosOperacionais() {
    const data = await supabaseGetParametrosConsolidados();
    if (data.result !== 'success') return data;
    
    return {
        result: 'success',
        parametros: {
            despesasOperacionais: data.parametros.despesasOperacionais,
            aliquotaImposto: data.parametros.aliquotaImposto,
            cacMedio: data.parametros.cacMedio,
            mesesAmortizacaoCac: data.parametros.mesesAmortizacaoCac
        }
    };
}

async function supabaseGetParametrosSimulacao() {
    const data = await supabaseGetParametrosConsolidados();
    if (data.result !== 'success') return data;
    
    return {
        result: 'success',
        parametros: {
            leadsMensal: data.parametros.leadsMensal,
            taxaConversao: data.parametros.taxaConversao,
            meses: data.parametros.meses
        }
    };
}

async function supabaseSalvarParametrosOperacionais(params) {
    try {
        const existing = await supabaseRequest(
            'saldo_fluxo_caixa?select=id&limit=1'
        );
        
        const payload = {
            param_despesas_operacionais: parseFloat(params.despesasOperacionais) || 20000,
            param_aliquota_imposto: parseFloat(params.aliquotaImposto) || 6,
            param_cac_medio: parseFloat(params.cacMedio) || 500,
            param_meses_amortizacao_cac: parseInt(params.mesesAmortizacaoCac) || 12,
            updated_at: new Date().toISOString()
        };
        
        if (existing && existing.length > 0) {
            await supabaseRequest(
                `saldo_fluxo_caixa?id=eq.${existing[0].id}`,
                {
                    method: 'PATCH',
                    headers: { 'Prefer': 'return=representation' },
                    body: JSON.stringify(payload)
                }
            );
        } else {
            await supabaseRequest('saldo_fluxo_caixa', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
        }
        
        return {
            result: 'success',
            message: 'Parâmetros operacionais salvos',
            parametros: params
        };
    } catch (error) {
        console.error('❌ Erro em supabaseSalvarParametrosOperacionais:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseSalvarParametrosSimulacao(params) {
    try {
        const existing = await supabaseRequest(
            'saldo_fluxo_caixa?select=id&limit=1'
        );
        
        const payload = {
            sim_leads_mensal: parseInt(params.leadsMensal) || 30,
            sim_taxa_conversao: parseFloat(params.taxaConversao) || 5,
            sim_meses: parseInt(params.meses) || 6,
            updated_at: new Date().toISOString()
        };
        
        if (existing && existing.length > 0) {
            await supabaseRequest(
                `saldo_fluxo_caixa?id=eq.${existing[0].id}`,
                {
                    method: 'PATCH',
                    headers: { 'Prefer': 'return=representation' },
                    body: JSON.stringify(payload)
                }
            );
        } else {
            await supabaseRequest('saldo_fluxo_caixa', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
            });
        }
        
        return {
            result: 'success',
            message: 'Parâmetros de simulação salvos',
            parametros: params
        };
    } catch (error) {
        console.error('❌ Erro em supabaseSalvarParametrosSimulacao:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetCustoPCRealPorAssistido() {
    try {
        const hoje = new Date();
        const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
        const dataInicio = mesAtual + '-01';
        const dataFim = mesAtual + '-31';
        
        const result = await supabaseRequest(
            `despesas?categoria=eq.Custo Personal Care&data=gte.${dataInicio}&data=lte.${dataFim}&select=assistido,valor,status`
        );
        
        const custoPorAssistido = {};
        if (result && result.length > 0) {
            for (const d of result) {
                if (d.assistido && d.status === 'Pago') {
                    if (!custoPorAssistido[d.assistido]) {
                        custoPorAssistido[d.assistido] = 0;
                    }
                    custoPorAssistido[d.assistido] += parseFloat(d.valor) || 0;
                }
            }
        }
        
        return {
            result: 'success',
            custoPorAssistido: custoPorAssistido,
            mesReferencia: mesAtual
        };
    } catch (error) {
        console.error('❌ Erro em supabaseGetCustoPCRealPorAssistido:', error);
        return { result: 'error', error: error.message, custoPorAssistido: {} };
    }
}

// ============================================================
// CENÁRIOS SALVOS (JSONB)
// ============================================================
async function supabaseSalvarCenario(nome, dadosCenario) {
    try {
        const existing = await supabaseRequest(
            'saldo_fluxo_caixa?select=sim_cenarios,id&limit=1'
        );
        
        let cenarios = {};
        let registroId = null;
        
        if (existing && existing.length > 0) {
            registroId = existing[0].id;
            if (existing[0].sim_cenarios) {
                try {
                    cenarios = typeof existing[0].sim_cenarios === 'string' 
                        ? JSON.parse(existing[0].sim_cenarios) 
                        : existing[0].sim_cenarios;
                } catch (e) {
                    cenarios = {};
                }
            }
        }
        
        cenarios[nome] = dadosCenario;
        
        if (registroId) {
            await supabaseRequest(
                `saldo_fluxo_caixa?id=eq.${registroId}`,
                {
                    method: 'PATCH',
                    headers: { 'Prefer': 'return=representation' },
                    body: JSON.stringify({
                        sim_cenarios: JSON.stringify(cenarios),
                        updated_at: new Date().toISOString()
                    })
                }
            );
        } else {
            await supabaseRequest('saldo_fluxo_caixa', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify({
                    sim_cenarios: JSON.stringify(cenarios)
                })
            });
        }
        
        return {
            result: 'success',
            message: 'Cenário salvo com sucesso',
            cenarios: cenarios
        };
    } catch (error) {
        console.error('❌ Erro em supabaseSalvarCenario:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseGetCenariosSalvos() {
    try {
        const result = await supabaseRequest(
            'saldo_fluxo_caixa?select=sim_cenarios&limit=1'
        );
        
        if (!result || result.length === 0 || !result[0].sim_cenarios) {
            return { result: 'success', cenarios: {} };
        }
        
        let cenarios = {};
        try {
            cenarios = typeof result[0].sim_cenarios === 'string'
                ? JSON.parse(result[0].sim_cenarios)
                : result[0].sim_cenarios;
        } catch (e) {
            cenarios = {};
        }
        
        return { result: 'success', cenarios: cenarios };
    } catch (error) {
        console.error('❌ Erro em supabaseGetCenariosSalvos:', error);
        return { result: 'error', error: error.message };
    }
}

async function supabaseExcluirCenario(nome) {
    try {
        const result = await supabaseRequest(
            'saldo_fluxo_caixa?select=sim_cenarios,id&limit=1'
        );
        
        if (!result || result.length === 0 || !result[0].sim_cenarios) {
            return { result: 'error', error: 'Nenhum cenário encontrado' };
        }
        
        let cenarios = {};
        try {
            cenarios = typeof result[0].sim_cenarios === 'string'
                ? JSON.parse(result[0].sim_cenarios)
                : result[0].sim_cenarios;
        } catch (e) {
            cenarios = {};
        }
        
        if (!cenarios[nome]) {
            return { result: 'error', error: 'Cenário não encontrado' };
        }
        
        delete cenarios[nome];
        
        await supabaseRequest(
            `saldo_fluxo_caixa?id=eq.${result[0].id}`,
            {
                method: 'PATCH',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify({
                    sim_cenarios: JSON.stringify(cenarios),
                    updated_at: new Date().toISOString()
                })
            }
        );
        
        return {
            result: 'success',
            message: 'Cenário excluído',
            cenarios: cenarios
        };
    } catch (error) {
        console.error('❌ Erro em supabaseExcluirCenario:', error);
        return { result: 'error', error: error.message };
    }
}

// ============================================================
// FUNÇÕES LEGADAS (compatibilidade)
// ============================================================
async function supabaseGetParametrosPrevisibilidade() {
    return supabaseGetParametrosSimulacao();
}

async function supabaseSalvarParametrosPrevisibilidade(params) {
    return supabaseSalvarParametrosSimulacao(params);
}

// ============================================================
// 🔥 DEFINIÇÃO DO OBJETO API GLOBAL
// ============================================================
window.API = {
    // Personal Cares
    getCuidadoresComStatus: supabaseGetCuidadoresComStatus,
    getDadosPersonal: supabaseGetDadosPersonal,
    updatePersonalCare: supabaseUpdatePersonalCare,
    deletePersonal: supabaseDeletePersonal,
    getResumoGeral: supabaseGetResumoGeral,
    getDisponibilidadeMensal: supabaseGetDisponibilidadeMensal,
    
    // Assistidos
    getSheets: supabaseListarAssistidosNomes,
    getAssistidosCompleto: supabaseGetAssistidosCompleto,
    getAssistidosComStatus: supabaseGetAssistidosComStatus,
    getDadosAssistido: supabaseGetDadosAssistido,
    getDadosAssistidoCompleto: supabaseGetDadosAssistidoCompleto,
    getTodosCamposLinha2: supabaseGetTodosCamposLinha2,
    getDashboardData: supabaseGetDashboardData,
    updateDadosAnagraficos: supabaseUpdateDadosAnagraficos,
    deleteAssistido: supabaseDeleteAssistido,
    getMultiplosHorarios: supabaseGetMultiplosHorarios,
    getMultiplosEscalas: supabaseGetMultiplosEscalas,
    validarAcessoFamiliar: supabaseValidarAcessoFamiliar,
    
    // Prontuários
    criarProntuario: supabaseCriarProntuario,
    listarProntuarios: supabaseListarProntuarios,
    
    // Escalas
    getEscalaMes: supabaseGetEscalaMes,
    getEscalaMesFamiliar: supabaseGetEscalaMesFamiliar,
    updateEscala: supabaseUpdateEscala,
    salvarEscalaCompleta: supabaseSalvarEscalaCompleta,
    createSheet: supabaseVerificarAssistidoExistente,
    checkSheet: supabaseVerificarAssistidoExistente,
    aplicarCuidadoresPadrao: supabaseAplicarCuidadoresPadrao,
    limparEscala: supabaseLimparEscala,
    
    // Grupos WhatsApp
    getGruposWhatsApp: supabaseGetGruposWhatsApp,
    getGruposWhatsAppCompleto: supabaseGetGruposWhatsAppCompleto,
    
    // Despesas
    listarDespesas: supabaseListarDespesas,
    criarDespesa: supabaseCriarDespesa,
    atualizarDespesa: supabaseAtualizarDespesa,
    excluirDespesa: supabaseExcluirDespesa,
    getDespesasByPlantao: supabaseGetDespesasByPlantao,
    getMetadados: supabaseGetMetadados,
    
    // Receitas
    listarReceitas: supabaseListarReceitas,
    criarReceitaAvulsa: supabaseCriarReceitaAvulsa,
    atualizarReceitaAvulsa: supabaseAtualizarReceitaAvulsa,
    excluirReceitaAvulsa: supabaseExcluirReceitaAvulsa,
    gerarReceitas: supabaseGerarReceitas,
    
    // Leads
    listarLeads: supabaseListarLeads,
    getMetadadosLeads: supabaseGetMetadadosLeads,
    criarLead: supabaseCriarLead,
    atualizarLead: supabaseAtualizarLead,
    excluirLead: supabaseExcluirLead,
    
    // Fluxo de Caixa
    getFluxoCaixaCompleto: supabaseGetFluxoCaixaCompleto,
    getFluxoCaixaResumido: supabaseGetFluxoCaixaResumido,
    simularPerdaContrato: supabaseSimularPerdaContrato,
    simularCenario: supabaseSimularCenario,
    
    // Saldo do Fluxo de Caixa
    getSaldoAtual: supabaseGetSaldoAtual,
    salvarSaldoAtual: supabaseSalvarSaldoAtual,
    
    // Metas
    getMetas: supabaseGetMetas,
    salvarMetas: supabaseSalvarMetas,
    
    // 🆕 Parâmetros Consolidados (Fase 1)
    getParametrosConsolidados: supabaseGetParametrosConsolidados,
    getParametrosOperacionais: supabaseGetParametrosOperacionais,
    getParametrosSimulacao: supabaseGetParametrosSimulacao,
    salvarParametrosOperacionais: supabaseSalvarParametrosOperacionais,
    salvarParametrosSimulacao: supabaseSalvarParametrosSimulacao,
    
    // 🆕 Custo Real de Personal Care
    getCustoPCRealPorAssistido: supabaseGetCustoPCRealPorAssistido,
    
    // 🆕 Cenários Salvos
    salvarCenario: supabaseSalvarCenario,
    getCenariosSalvos: supabaseGetCenariosSalvos,
    excluirCenario: supabaseExcluirCenario,
    
    // Parâmetros (legado - redireciona para os novos)
    getParametrosPrevisibilidade: supabaseGetParametrosPrevisibilidade,
    salvarParametrosPrevisibilidade: supabaseSalvarParametrosPrevisibilidade
};

console.log('✅ API global configurada com sucesso!');
console.log(`   - ${Object.keys(window.API).length} funções disponíveis`);
console.log('   - 🔥 Tratamento de campos DATE corrigido');
console.log(`   - ${Object.keys(MAPEAMENTO_ASSISTIDOS).length} campos mapeados`);
console.log('   - 🆕 Parâmetros Consolidados (operacionais + simulação)');
console.log('   - 🆕 Fallback automático para colunas legadas');
