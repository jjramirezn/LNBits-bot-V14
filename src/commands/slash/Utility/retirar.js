const {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} = require("discord.js");
const ExtendedClient = require("../../../class/ExtendedClient");

const UserManager = require(`../../../class/UserManager.js`);
const UserWallet = require(`../../../class/User.js`);
const { validateAmountAndBalance } = require("../../../utils/helperFunctions");

module.exports = {
  structure: new SlashCommandBuilder()
    .setName("retirar")
    .setDescription("Retira satoshis a una cuenta externa a discord")
    .addStringOption((opt) =>
      opt
        .setName("address")
        .setDescription("dirección de lightning network")
        .setRequired(true)
    )
    .addNumberOption((opt) =>
      opt
        .setName("monto")
        .setDescription("El monto en satoshis que deseas enviar")
        .setRequired(true)
    ),
  /**
   * @param {ExtendedClient} client
   * @param {ChatInputCommandInteraction} Interaction
   * @param {[]} args
   */
  run: async (client, Interaction, args) => {
    const um = new UserManager();
    await Interaction.deferReply({ ephemeral: true });

    try {
      const userWallet = await um.getOrCreateWallet(
        Interaction.user.username,
        Interaction.user.id
      );

      if (userWallet.adminkey) {
        const uw = new UserWallet(userWallet.adminkey);
        const address = Interaction.options.get(`address`).value;
        const amount = Number(Interaction.options.get(`monto`).value);
        const senderWalletDetails = await uw.getWalletDetails();

        const isValidAmount = validateAmountAndBalance(
          amount,
          senderWalletDetails.balance
        );

        try {
          if (isValidAmount.status) {
            const invoice = await uw.createOutgoingInvoice(address, amount);

            if (invoice && invoice.invoice) {
              const payment = await uw.payInvoice(invoice.invoice);

              if (payment) {
                Interaction.editReply({
                  content: `Enviaste ${amount} satoshis a ${address} desde tu billetera`,
                  ephemeral: true,
                });
              }
            }
          } else {
            Interaction.editReply({
              content: isValidAmount.content,
              ephemeral: true,
            });
          }
        } catch (err) {
          Interaction.editReply({
            content: `Ocurrió un error`,
            ephemeral: true,
          });
          console.log(err);
        }
      } else {
        Interaction.editReply({
          content: `No tienes una billetera`,
          ephemeral: true,
        });
      }
    } catch (err) {
      console.log(err);
      Interaction.editReply({
        content: `Ocurrió un error`,
        ephemeral: true,
      });
    }
  },
};
