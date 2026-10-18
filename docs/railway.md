# Implantação no Railway

Uma instalação atende um cliente e um administrador. Mantenha **uma réplica** e o modo **Serverless desativado**, pois os bots usam conexões contínuas.

## Volume

Adicione um volume ao serviço com mount path `/data` e configure `NERD_DATA_DIR=/data`. O Railway informa `RAILWAY_VOLUME_MOUNT_PATH` automaticamente. A aplicação se recusa a iniciar no Railway sem volume ou com o diretório de dados fora dele.

```text
/data/
  nerd-support.sqlite
  server.key
  active_tickets.json
  user_languages.json
```

Os arquivos auxiliares `nerd-support.sqlite-wal` e `nerd-support.sqlite-shm` também podem existir enquanto o banco estiver aberto.

Os JSONs legados no diretório de execução são copiados para o diretório de dados na inicialização, sem apagar os originais nem substituir destinos existentes. Essa migração não recupera arquivos perdidos de containers antigos sem volume.

Para transportar dados existentes, pare a aplicação e transfira o banco, a chave e os JSONs por um canal privado. Não os envie pelo GitHub. Se um banco existente estiver sem `server.key`, a aplicação interrompe a inicialização em vez de criar outra chave.

## Variáveis

| Variável        | Valor                                          |
| --------------- | ---------------------------------------------- |
| `NODE_ENV`      | `production`                                   |
| `NERD_DATA_DIR` | `/data`                                        |
| `DASHBOARD_URL` | URL HTTPS exata do dashboard, sem caminho      |
| `SETUP_CODE`    | Valor aleatório privado de 32 a 256 caracteres |

Gere o domínio em **Settings → Networking → Public Networking → Generate Domain** e use, por exemplo, `https://seu-servico.up.railway.app` em `DASHBOARD_URL`. Substitua pelo domínio real. Na ausência dessa configuração, a aplicação usa `https://${RAILWAY_PUBLIC_DOMAIN}` quando o Railway fornece a variável. Uma origem sem HTTPS impede a inicialização em produção.

Para gerar o código de instalação no seu computador:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado somente para `SETUP_CODE` nas variáveis do Railway. Não publique o valor em commits, prints ou mensagens. Esse código é diferente da senha do administrador e dos tokens dos bots.

O Railway fornece `PORT`; a aplicação usa essa porta e escuta em `0.0.0.0` automaticamente no Railway/produção. Para outros ambientes, `HOST` permite alterar a interface de rede e `TRUST_PROXY=1` ativa a configuração de um proxy confiável. No Railway, o proxy é configurado automaticamente. A origem de autenticação é fixa na URL configurada e os cookies usam `Secure` em HTTPS.

## Build e deploy

1. Use o repositório GitHub e a branch `main`.
2. Use Node.js 24.15 ou superior; o Railpack reconhece `package.json`.
3. Configure `npm start` como comando de inicialização.
4. Configure o healthcheck em `/health`.
5. Mantenha uma réplica e o modo Serverless desativado.
6. Aplique as mudanças e implante o commit mais recente.

Não use `npm run dev` em produção. As migrações de autenticação são executadas durante a inicialização, quando o volume já está montado.

## Primeiro acesso

Abra o domínio HTTPS e informe nome, e-mail, senha e código de instalação. Sem `SETUP_CODE`, o cadastro fica bloqueado. Código errado não cria conta; cinco tentativas inválidas bloqueiam novas tentativas durante a janela de um minuto.

Depois que o primeiro administrador é criado, o cadastro permanece fechado. A atualização preserva contas existentes. É possível remover `SETUP_CODE` após criar a conta; o login continua disponível.

Se uma versão antiga ficou pública e existe uma conta que você não reconhece, não cadastre tokens nessa instalação. Verifique a origem da conta antes de recuperar ou substituir os dados.

## Teste real

1. Pare o bot local para evitar duas instâncias usando o mesmo token.
2. Cadastre tokens e IDs no dashboard, salve, valide e conecte.
3. Abra um ticket pelo Telegram e responda pelo Discord.
4. Teste imagens e fechamento.
5. Reinicie o serviço e confira que conta, configurações, tickets ativos e idiomas continuam disponíveis.

Os bots ainda precisam ser conectados pelo painel após reiniciar o processo. Faça backups privados do volume, incluindo a chave junto com o banco.

## Diagnóstico

| Mensagem                          | Ação                                                   |
| --------------------------------- | ------------------------------------------------------ |
| Adicione um volume persistente    | Anexe o volume ao serviço e aplique as alterações      |
| Diretório fora do volume          | Use o mount path ou um subdiretório em `NERD_DATA_DIR` |
| Configure DASHBOARD_URL com HTTPS | Configure o domínio público correto e faça novo deploy |
| Cadastro bloqueado                | Configure `SETUP_CODE` com pelo menos 32 caracteres    |
| Banco sem server.key              | Restaure a chave original do backup                    |

Referências: [rede pública](https://docs.railway.com/networking/public-networking), [volumes](https://docs.railway.com/volumes/reference) e [healthchecks](https://docs.railway.com/deployments/healthchecks).
