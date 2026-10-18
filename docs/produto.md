# Nerd Support — Visão do produto

## Proposta

Nerd Support conecta o atendimento realizado por moderadores no Discord às solicitações de usuários no Telegram. A evolução do produto prevê comercialização com configuração e identidade próprias para cada cliente.

## Disponível atualmente

- Abertura de tickets pelo Telegram e criação de canais no Discord.
- Encaminhamento de mensagens e imagens nas duas direções.
- Fechamento e arquivamento dos canais de atendimento.
- Atendimento em português, inglês e espanhol.
- Dashboard local com primeiro acesso, login, logout e sessão.
- Configuração de identidade e integrações pelo painel, com tokens criptografados.
- Validação das credenciais, conexão e parada dos bots e teste de envio.
- Lista de tickets abertos e histórico de alterações.
- Uma configuração de integração por processo, estado em memória e persistência local em JSON.

A versão atual atende um cliente e um administrador por instalação local. Ainda não há recuperação de senha por e-mail, equipes ou isolamento entre vários clientes.

## Evolução prevista do dashboard

| Área       | Funcionalidades previstas                                     |
| ---------- | ------------------------------------------------------------- |
| Acesso     | Login, logout, recuperação de acesso e sessões                |
| Cliente    | Nome da organização, integrantes e permissões                 |
| Identidade | Nome exibido no atendimento e personalização das mensagens    |
| Telegram   | Cadastro ou substituição do token e verificação da conexão    |
| Discord    | Token, servidor, canais, categorias e cargo de moderadores    |
| Operação   | Estado das integrações, aplicação de alterações e diagnóstico |
| Auditoria  | Histórico de alterações e identificação de quem as realizou   |

O nome exibido no atendimento é uma configuração do Nerd Support. Alterar o nome ou username da conta do bot no Telegram ou Discord depende das regras e capacidades de cada plataforma e deve ser tratado separadamente.

## Configurações e segredos

O dashboard deverá editar registros de configuração vinculados ao cliente por uma API autenticada. Os valores hoje existentes no `.env` serão separados em:

- **Infraestrutura:** porta, conexão com banco, configuração da autenticação e chave de criptografia permanecem no ambiente do servidor.
- **Configuração do cliente:** identidade, IDs de canais, categorias e cargos ficam no banco, associados à organização.
- **Credenciais de integração:** tokens ficam criptografados no servidor, com chave mantida fora do banco. O painel exibe apenas o estado configurado e permite substituir a credencial, sem retornar seu conteúdo.

O navegador não recebe tokens das integrações. Toda leitura ou alteração de configuração deve conferir a identidade do usuário e sua permissão para a organização. Alterações devem ser auditadas sem registrar segredos.

Salvar uma configuração e aplicá-la às conexões são operações distintas. A aplicação deverá validar os novos dados, controlar a reconexão do bot e informar o resultado. O runtime atual aplica os dados salvos ao conectar os bots pelo painel. Alterações são bloqueadas enquanto as integrações estão ligadas; pare, salve e reconecte para aplicar.

## Organização por cliente

Antes de atender vários clientes na mesma instalação, substituir o estado global e os JSONs por dados associados a uma organização. Tickets, mensagens, sessões, preferências de idioma e integrações precisam desse vínculo.

A estrutura de dados prevista inclui organizações, usuários, vínculos de usuários com organizações, configurações de integração, tickets, mensagens e eventos de auditoria. IDs de Telegram ou Discord devem ser interpretados no contexto da organização, evitando misturar atendimentos de clientes diferentes.

Cada integração deverá possuir seu próprio contexto de execução, substituindo o singleton atual de `clients.js` e `state.js`. As permissões precisam ser verificadas no servidor em todas as operações, incluindo acesso direto a tickets e configurações por ID.

## Etapas de implementação

1. **Identidade:** adotar Nerd Support e permitir configurar o nome exibido nas mensagens. Implementado nesta etapa.
2. **Persistência:** introduzir banco, organizações e migração dos dados existentes.
3. **Acesso:** implementar autenticação, sessões e autorização por organização.
4. **Configurações:** criar API e armazenamento protegido das credenciais por cliente.
5. **Dashboard:** implementar telas de identidade, integrações e estado das conexões.
6. **Runtime:** aplicar alterações com reconexão controlada e execução isolada por cliente.
7. **Preparação comercial:** validar isolamento, recuperação, backups e operação com múltiplos clientes.

A versão local usa SQLite e Better Auth. A hospedagem e a arquitetura para múltiplos clientes ainda serão definidas.

## Critérios de aceite do dashboard

- Usuários sem sessão não acessam as configurações.
- Um usuário só acessa organizações nas quais possui vínculo e permissão.
- Tokens não aparecem em respostas da API, logs ou histórico de alterações.
- Dados inválidos não substituem uma configuração operacional sem informar o erro.
- O painel distingue configuração salva, conexão em andamento e integração conectada.
- Tickets e mensagens de um cliente não podem ser acessados por outro.
- Dados persistidos continuam disponíveis após reiniciar a aplicação.
