function handleTelegramError(err, ctx) {
  console.error("Unhandled error while processing", ctx.update);
  console.error("Erro ao processar atualização do Telegram:", err);
}

export { handleTelegramError };
