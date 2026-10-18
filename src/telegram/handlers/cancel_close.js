async function handleCancelClose(ctx) {
  console.log("Cancel close action received");
  const ticketId = ctx.match[1];
  console.log(
    `[DEBUG-TELEGRAM] ID do ticket extraído do botão cancel_close_: ${ticketId}`,
  );

  try {
    await ctx.answerCbQuery("Ticket closure cancelled");
    await ctx.deleteMessage();
  } catch (error) {
    console.error("Error cancelling ticket closure:", error);
    await ctx.answerCbQuery("Error cancelling");
  }
}

export { handleCancelClose };
