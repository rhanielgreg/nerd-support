import axios from "axios";

// Somente mensagens próprias chegam ao painel; erros HTTP podem conter tokens.
export class IntegrationValidationError extends Error {}

async function request(stage, url, options = {}) {
  try {
    return (await axios.get(url, { ...options, timeout: 12000 })).data;
  } catch (error) {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    let reason;
    if (status === 401)
      reason =
        "Token inválido ou revogado. Substitua o token desta integração e salve.";
    else if (stage === "Servidor Discord" && (code === 10004 || status === 404))
      reason =
        "Servidor não encontrado (Discord 10004). Confira o ID do servidor e se o bot foi adicionado a ele. Use o ID do servidor, não o ID da aplicação, do bot ou de um canal.";
    else if (status === 403)
      reason =
        "O bot não tem acesso. Confira sua presença no servidor e as permissões do recurso.";
    else if (status === 404)
      reason =
        "Recurso não encontrado. Confira o ID informado e o acesso do bot.";
    else if (status === 429)
      reason =
        "Limite de requisições atingido. Aguarde um pouco e tente novamente.";
    else if (["ECONNABORTED", "ETIMEDOUT"].includes(error.code))
      reason =
        "A plataforma demorou para responder. Verifique a conexão e tente novamente.";
    else if (!error.response)
      reason =
        "Falha de rede ao acessar a plataforma. Verifique internet, DNS e firewall.";
    else
      reason = `A plataforma recusou a validação (HTTP ${Number(status) || "indisponível"}). Tente novamente.`;
    throw new IntegrationValidationError(`${stage}: ${reason}`);
  }
}

export async function validateIntegrations(config) {
  if (!config.telegramToken || !config.discordToken || !config.guildId)
    throw new IntegrationValidationError(
      "Preencha os tokens do Telegram e Discord e o ID do servidor.",
    );
  const telegram = await request(
    "Telegram",
    `https://api.telegram.org/bot${config.telegramToken}/getMe`,
  );
  if (!telegram.ok || !telegram.result?.is_bot)
    throw new IntegrationValidationError(
      "Telegram: a credencial não corresponde a um bot válido.",
    );
  const headers = { Authorization: `Bot ${config.discordToken}` };
  const discord = await request(
    "Token Discord",
    "https://discord.com/api/v10/users/@me",
    { headers },
  );
  if (!discord.bot)
    throw new IntegrationValidationError(
      "Discord: use o token do bot, não uma credencial de usuário.",
    );
  await request(
    "Servidor Discord",
    `https://discord.com/api/v10/guilds/${config.guildId}`,
    { headers },
  );
  if (config.modRoleId) {
    const roles = await request(
      "Cargo de moderador",
      `https://discord.com/api/v10/guilds/${config.guildId}/roles`,
      { headers },
    );
    if (
      !Array.isArray(roles) ||
      !roles.some((role) => role.id === config.modRoleId)
    )
      throw new IntegrationValidationError(
        "Cargo de moderador: o cargo informado não existe neste servidor.",
      );
  }
  const labels = {
    channelId: "Canal de fallback",
    categoryId: "Categoria de tickets",
    archiveCategoryId: "Categoria de arquivados",
  };
  for (const [field, label] of Object.entries(labels)) {
    if (!config[field]) continue;
    const channel = await request(
      label,
      `https://discord.com/api/v10/channels/${config[field]}`,
      { headers },
    );
    if (channel.guild_id !== config.guildId)
      throw new IntegrationValidationError(
        `${label}: o recurso pertence a outro servidor.`,
      );
    if (field !== "channelId" && channel.type !== 4)
      throw new IntegrationValidationError(
        `${label}: o ID informado é de um canal, não de uma categoria.`,
      );
    if (field === "channelId" && channel.type !== 0)
      throw new IntegrationValidationError(
        `${label}: selecione um canal de texto do servidor.`,
      );
  }
  return {
    telegramName: telegram.result.username,
    discordName: discord.username,
  };
}
