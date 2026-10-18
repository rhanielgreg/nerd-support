import { handleNewTicket } from "./newticket.js";
import { handleMyTickets } from "./mytickets.js";
import { handleHelp } from "./help.js";
import { handleLanguage } from "./language.js";

const actions = {
  newticket: handleNewTicket,
  mytickets: handleMyTickets,
  help: handleHelp,
  language: handleLanguage,
};

export async function handleMenu(ctx) {
  const action = actions[ctx.match[1]];
  if (!action) return;
  await ctx.answerCbQuery();
  return action(ctx);
}
