// =============================================
// ANIVERSARIANTES - managerJARDINSCare
// Envio de mensagens e cartões
// Versão 2.2 - Cartão de familiar com parentesco + concordância de gênero
// =============================================

// =============================================
// ENVIAR MENSAGEM DE ANIVERSÁRIO
// =============================================
managerApp.enviarMensagemAniversario = function(nome, telefone, tipo, nomeAssistido, status) {
    console.log('📱 Enviando mensagem de aniversário para:', nome, 'Telefone:', telefone, 'Status:', status);
    var mensagem = '';
    var numero = telefone || '';
    
    var agora = new Date();
    var hora = agora.getHours();
    var saudacao = '';
    
    if (hora >= 5 && hora < 12) {
        saudacao = 'Bom dia';
    } else if (hora >= 12 && hora < 18) {
        saudacao = 'Boa tarde';
    } else {
        saudacao = 'Boa noite';
    }
    
    // DETERMINAR SE O ASSISTIDO ESTÁ ATIVO
    var isAtivo = (status === 'Ativo');
    var nomeAssistidoDisplay = nomeAssistido || nome;

    if (tipo === 'assistido') {
        if (isAtivo) {
            // --- TEXTO PARA ASSISTIDOS ATIVOS (MANTIDO) ---
            mensagem = saudacao + ' *' + nome + '*!\n\n';
            mensagem += 'Hoje é o aniversário do/a *' + nomeAssistidoDisplay + '* e gostaríamos de pedir que você transmita todo o nosso carinho e afeto, e é claro, um *FELIZ ANIVERSÁRIO* a ele/a.\n\n';
            mensagem += 'Em nome de toda a equipe *JARDINSCare*, queremos celebrar este dia tão *ESPECIAL*, desejando um dia repleto de *ALEGRIA*, *SAÚDE* e *PAZ*.\n';
            mensagem += 'É uma honra poder fazer parte da jornada dele/a.\n\n';
            mensagem += 'Que este novo ciclo seja maravilhoso!\n\n';
            mensagem += 'Com muito carinho,\n';
            mensagem += 'Equipe *JARDINSCare*.';
        } else {
            // --- NOVO TEXTO PARA ASSISTIDOS INATIVOS/SUSPENSOS ---
            mensagem = saudacao + ' *' + nome + '*!\n\n';
            mensagem += 'Hoje é o aniversário do/a *' + nomeAssistidoDisplay + '* e gostaríamos de pedir que você transmita todo o nosso carinho e afeto, e é claro, um *FELIZ ANIVERSÁRIO* a ele/a.\n\n';
            mensagem += 'Em nome de toda a equipe *JARDINSCare*, queremos celebrar este dia tão *ESPECIAL*, desejando um dia repleto de *ALEGRIA*, *SAÚDE* e *PAZ*.\n';
            mensagem += 'Mesmo não estando mais sob nossos cuidados ativos, ele/a sempre terá um lugar especial em nossa memória e gratidão.\n';
            mensagem += 'Agradecemos pela confiança que depositaram em nós durante o tempo em que estivemos juntos.\n\n';
            mensagem += 'Que este novo ciclo seja maravilhoso!\n\n';
            mensagem += 'Com muito carinho e saudades,\n';
            mensagem += 'Equipe *JARDINSCare*.';
        }
    } else {
        // --- MENSAGEM PARA FAMILIARES (MANTIDA IGUAL) ---
        mensagem = saudacao + ' *' + nome + '*!\n\n';
        mensagem += '*FELIZ ANIVERSÁRIO!*\n\n';
        mensagem += 'Em nome de toda a equipe *JARDINSCare*, queremos desejar um dia repleto de *ALEGRIA*, *SAÚDE* e *PAZ*.\n';
        mensagem += 'Agradecemos pela confiança e parceria de sempre.\n\n';
        mensagem += 'Que este novo ciclo seja maravilhoso!\n\n';
        mensagem += 'Com muito carinho,\n';
        mensagem += 'Equipe *JARDINSCare*.';
    }
    
    var mensagemCodificada = encodeURIComponent(mensagem);
    
    if (numero && numero.length >= 10) {
        var numeroLimpo = numero.replace(/\D/g, '');
        if (numeroLimpo.length >= 10) {
            var numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;
            var link = 'https://wa.me/' + numeroCompleto + '?text=' + mensagemCodificada;
            window.open(link, '_blank');
            Utils.showToast('📱 Abrindo WhatsApp para ' + nome);
            return;
        }
    }
    
    var link = 'https://wa.me/?text=' + mensagemCodificada;
    window.open(link, '_blank');
    Utils.showToast('📋 Mensagem pronta! Cole no WhatsApp do ' + nome);
};

// =============================================
// ENVIAR CARTÃO DE ANIVERSÁRIO
// =============================================
managerApp.enviarCartaoAniversario = function(nome, telefone, tipo, nomeAssistido, idade, responsaveis, sexoAssistido) {
    console.log('🎨 Gerando cartão de aniversário para:', nome);
    var self = this;
    var numero = telefone || '';
    var imagemGerada = null;
    
    // Verificar se html2canvas está carregado
    if (typeof html2canvas === 'undefined') {
        Utils.showToast('⚠️ Aguarde, carregando gerador de imagens...', 'warning');
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = function() {
            self.enviarCartaoAniversario(nome, telefone, tipo, nomeAssistido, idade, responsaveis, sexoAssistido);
        };
        document.head.appendChild(script);
        return;
    }
    
    var cartaoContainer = document.getElementById('cartaoAniversarioContainer');
    if (!cartaoContainer) {
        Utils.showToast('❌ Erro: Cartão não encontrado', 'error');
        return;
    }
    
    // Preencher o cartão
    document.getElementById('cartaoNome').textContent = nome;
    document.getElementById('cartaoIdade').textContent = '🎂 ' + idade + ' anos 🎂';
    
    var mensagem = '';
    if (tipo === 'assistido') {
        mensagem = 'Hoje é um dia muito especial!<br>Que a alegria, saúde e paz estejam<br>presentes em cada momento do seu dia.<br><br>É uma honra poder cuidar de você<br>e fazer parte da sua jornada.<br><br>🌸 Que este novo ciclo seja 🌸<br><span style="color: #f59e0b; font-weight: 700;">MARAVILHOSO!</span>';
    } else {
        // 🔥 Extrai o parentesco da linha 4 do campo 'responsaveis'
        var dadosFamiliar = Utils.extrairDadosFamiliar(responsaveis || '');
        var parentesco = dadosFamiliar.parentesco || 'familiar';

        // 🔥 Concordância de gênero com o sexo do assistido
        var isFeminino = String(sexoAssistido || '').trim().toLowerCase() === 'feminino';
        var doDa            = isFeminino ? 'da'     : 'do';
        var nossoNossa      = isFeminino ? 'nossa'  : 'nosso';
        var queridoQuerida  = isFeminino ? 'querida' : 'querido';

        mensagem = 'Hoje celebramos a sua vida,<br>' +
            parentesco + ' ' + doDa + ' ' + nossoNossa + ' ' + queridoQuerida + '<br>' +
            '<strong>' + (nomeAssistido || 'assistido') + '</strong>.<br><br>' +
            'Agradecemos pela confiança e parceria.<br>' +
            'Que seu dia seja iluminado<br>com muita alegria e amor!<br><br>' +
            '🌸 Que este novo ciclo seja 🌸<br>' +
            '<span style="color: #f59e0b; font-weight: 700;">ABENÇOADO!</span>';
    }
    document.getElementById('cartaoMensagem').innerHTML = mensagem;
    
    Utils.showLoading('Gerando cartão de aniversário...');
    
    setTimeout(function() {
        var alturaReal = cartaoContainer.scrollHeight || 480;
        var largura = 360;
        
        html2canvas(cartaoContainer, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: largura,
            height: alturaReal,
            onclone: function(clonedDoc, clonedElement) {
                clonedElement.style.width = largura + 'px';
                clonedElement.style.height = alturaReal + 'px';
            }
        }).then(function(canvas) {
            Utils.hideLoading();
            
            var canvasLargura = canvas.width;
            var canvasAltura = canvas.height;
            var maxLargura = 800;
            
            if (canvasLargura > maxLargura) {
                var proporcao = maxLargura / canvasLargura;
                var novaAltura = Math.round(canvasAltura * proporcao);
                
                var canvasRedimensionado = document.createElement('canvas');
                canvasRedimensionado.width = maxLargura;
                canvasRedimensionado.height = novaAltura;
                var ctx = canvasRedimensionado.getContext('2d');
                ctx.drawImage(canvas, 0, 0, maxLargura, novaAltura);
                canvas = canvasRedimensionado;
            }
            
            var imageData = canvas.toDataURL('image/png');
            imagemGerada = imageData;
            
            var imgPreview = document.getElementById('cartaoImagemPreview');
            if (imgPreview) {
                imgPreview.src = imageData;
            }
            
            var modal = document.getElementById('modalVisualizarCartao');
            if (modal) {
                modal.style.display = 'flex';
            }
            
            // Configurar botões do cartão
            var btnCopiar = document.getElementById('btnCopiarImagemCartao');
            if (btnCopiar) {
                btnCopiar.onclick = function() {
                    self.copiarImagemCartao(imageData);
                };
            }
            
            var btnBaixar = document.getElementById('btnBaixarImagemCartao');
            if (btnBaixar) {
                btnBaixar.onclick = function() {
                    var link = document.createElement('a');
                    link.download = 'cartao_aniversario_' + nome.replace(/\s/g, '_') + '.png';
                    link.href = imageData;
                    link.click();
                    Utils.showToast('💾 Imagem baixada com sucesso!');
                };
            }
            
            var btnWhatsApp = document.getElementById('btnAbrirWhatsAppCartao');
            if (btnWhatsApp) {
                btnWhatsApp.onclick = function() {
                    var mensagemWhats = '🎉 Feliz Aniversário! 🎉\n\n' +
                        'Que seu dia seja iluminado com muita alegria, saúde e paz.\n\n' +
                        'Com todo carinho,\n' +
                        'Equipe JARDINSCare 🌿';
                    var mensagemCodificada = encodeURIComponent(mensagemWhats);
                    
                    if (numero && numero.length >= 10) {
                        var numeroLimpo = numero.replace(/\D/g, '');
                        if (numeroLimpo.length >= 10) {
                            var numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;
                            var link = 'https://wa.me/' + numeroCompleto + '?text=' + mensagemCodificada;
                            window.open(link, '_blank');
                            return;
                        }
                    }
                    var link = 'https://wa.me/?text=' + mensagemCodificada;
                    window.open(link, '_blank');
                };
            }
            
            document.getElementById('fecharModalCartaoBtn').onclick = function() {
                document.getElementById('modalVisualizarCartao').style.display = 'none';
            };
            
            Utils.showToast('🎨 Cartão gerado! Copie a imagem e cole no WhatsApp', 'success');
            
        }).catch(function(error) {
            Utils.hideLoading();
            console.error('❌ Erro ao gerar cartão:', error);
            Utils.showToast('❌ Erro ao gerar cartão. Tente novamente.', 'error');
        });
    }, 300);
};

// =============================================
// COPIAR IMAGEM DO CARTÃO
// =============================================
managerApp.copiarImagemCartao = function(imageData) {
    console.log('📋 Copiando imagem para área de transferência...');
    var statusEl = document.getElementById('cartaoCopiarStatus');
    
    if (navigator.clipboard && navigator.clipboard.write) {
        fetch(imageData)
            .then(function(res) { return res.blob(); })
            .then(function(blob) {
                var clipboardItem = new ClipboardItem({
                    'image/png': blob
                });
                
                navigator.clipboard.write([clipboardItem]).then(function() {
                    if (statusEl) {
                        statusEl.innerHTML = '';
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
// ABRIR WHATSAPP DO ASSISTIDO
// =============================================
managerApp.abrirWhatsAppAssistido = function() {
    console.log('📱 Abrindo WhatsApp do assistido...');
    
    if (!this.currentAssistido) {
        Utils.showToast('⚠️ Selecione um assistido primeiro', 'warning');
        return;
    }
    
    var self = this;
    
    API.getDadosAssistido(this.currentAssistido)
        .then(function(data) {
            if (data.result === 'success') {
                var responsaveis = data.responsaveis || '';
                
                var dadosFamiliar = Utils.extrairDadosFamiliar(responsaveis);
                var nomeFamiliar = dadosFamiliar.nome || 'Familiar';
                var telefoneFamiliar = dadosFamiliar.telefone || '';
                
                console.log('📋 Dados extraídos:', { nomeFamiliar, telefoneFamiliar });
                
                if (!telefoneFamiliar) {
                    Utils.showToast('⚠️ Nenhum telefone cadastrado para este assistido', 'warning');
                    return;
                }
                
                var agora = new Date();
                var hora = agora.getHours();
                var saudacao = '';
                
                if (hora >= 5 && hora < 12) {
                    saudacao = 'Bom dia';
                } else if (hora >= 12 && hora < 18) {
                    saudacao = 'Boa tarde';
                } else {
                    saudacao = 'Boa noite';
                }
                
                var mensagem = '*Maria Eduarda*\n\n';
                mensagem += saudacao + ' Sr/a. ' + nomeFamiliar + '!\n\n';
                
                var mensagemCodificada = encodeURIComponent(mensagem);
                
                var numeroLimpo = telefoneFamiliar.replace(/\D/g, '');
                if (numeroLimpo.length >= 10) {
                    var numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;
                    var link = 'https://wa.me/' + numeroCompleto + '?text=' + mensagemCodificada;
                    window.open(link, '_blank');
                    Utils.showToast('📱 Abrindo WhatsApp para ' + nomeFamiliar);
                } else {
                    Utils.showToast('⚠️ Número de telefone inválido', 'warning');
                }
            } else {
                Utils.showToast('❌ Erro ao carregar dados do assistido', 'error');
            }
        })
        .catch(function(error) {
            console.error('❌ Erro ao abrir WhatsApp:', error);
            Utils.showToast('❌ Erro ao carregar dados', 'error');
        });
};

// =============================================
// IR PARA ASSISTIDO
// =============================================
managerApp.irParaAssistido = function(nome) {
    var modalAlertas = document.getElementById('modalAlertasContratos');
    if (modalAlertas) {
        modalAlertas.style.display = 'none';
    }
    
    this.navigate('assistidos');
    
    var self = this;
    setTimeout(function() {
        var select = document.getElementById('selectAssistido');
        if (select) {
            select.value = nome;
            self.carregarDadosAssistido();
        }
    }, 300);
};

// =============================================
// MOSTRAR POPUP DE ANIVERSARIANTES
// =============================================
managerApp.mostrarPopupAniversariantes = function(aniversariantes) {
    if (!aniversariantes || aniversariantes.length === 0) {
        console.log('🎂 Nenhum aniversariante hoje');
        return;
    }
    
    var modal = document.getElementById('modalAniversariantes');
    var conteudo = document.getElementById('conteudoAniversariantes');
    
    if (!modal || !conteudo) {
        console.error('❌ Modal de aniversariantes não encontrado');
        return;
    }
    
    var html = '';
    
    for (var i = 0; i < aniversariantes.length; i++) {
        var a = aniversariantes[i];
        var tipoLabel = a.tipo === 'assistido' ? '👤 Assistido' : '👨‍👩‍👦 Familiar';
        var nomeAssistido = a.nomeAssistido ? ' (' + a.nomeAssistido + ')' : '';
        var telefone = a.telefone || '';
        var status = a.status || 'Ativo';
        
        // 🔥 Prepara parâmetros escapados para o onclick do cartão
        var responsaveisEscapado = (a.responsaveis || '').replace(/'/g, "\\'").replace(/\n/g, '\\n');
        var nomeAssistidoEscapado = (a.nomeAssistido || '').replace(/'/g, "\\'");
        var sexoAssistidoEscapado = (a.sexoAssistido || '').replace(/'/g, "\\'");
        
        html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--gray-100);">';
        html += '  <div>';
        html += '    <div style="font-weight: 600; font-size: 15px;">🎂 ' + a.nome + ' - ' + a.idade + ' anos</div>';
        html += '    <div style="font-size: 12px; color: var(--gray-500);">' + tipoLabel + nomeAssistido + '</div>';
        if (telefone) {
            html += '    <div style="font-size: 11px; color: var(--gray-400);">📱 ' + telefone + '</div>';
        }
        html += '  </div>';
        html += '  <div style="display: flex; gap: 8px; flex-wrap: wrap;">';
        html += '    <button class="btn btn-sm btn-whatsapp" onclick="managerApp.enviarMensagemAniversario(\'' + a.nome.replace(/'/g, "\\'") + '\', \'' + telefone + '\', \'' + a.tipo + '\', \'' + nomeAssistidoEscapado + '\', \'' + status + '\')">📱 Mensagem</button>';
        html += '    <button class="btn btn-sm btn-primary" onclick="managerApp.enviarCartaoAniversario(\'' + a.nome.replace(/'/g, "\\'") + '\', \'' + telefone + '\', \'' + a.tipo + '\', \'' + nomeAssistidoEscapado + '\', ' + a.idade + ', \'' + responsaveisEscapado + '\', \'' + sexoAssistidoEscapado + '\')">🎨 Cartão</button>';
        html += '  </div>';
        html += '</div>';
    }
    
    conteudo.innerHTML = html;
    modal.style.display = 'flex';
    console.log('🎂 Popup de aniversariantes exibido com', aniversariantes.length, 'aniversariantes');
};
