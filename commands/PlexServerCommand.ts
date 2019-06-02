import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexServerCommand implements ISlashCommand {
  public command = 'plex-server';
  public i18nParamsExample = 'slashcommand_server_params';
  public i18nDescription = 'slashcommand_server_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [serverArg] = context.getArguments();
    if (!serverArg) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No server name provided!');
      return;
    }
    const persistence = new AppPersistence(persis, read.getPersistenceReader());
    const servers = await persistence.getUserServers(context.getSender());
    if (!servers) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    try {
      let serverChosen;
      let serverFound = false;
      const serversList = JSON.parse(servers);
      if (serversList && Array.isArray(serversList)) {
        serversList.forEach((server) => {
          if (!serverFound && server.name.toLowerCase().indexOf(serverArg.toLowerCase()) !== -1) {
            serverChosen = server;
            serverFound = true;
          }
        });

        if (serverFound && serverFound === true) {
          const userThumbUrl = await persistence.getUserThumb(context.getSender());
          await msgHelper.sendNotificationMultipleServerDetails([serverChosen], userThumbUrl, read, modify, context.getSender(), context.getRoom());
        } else {
          await msgHelper.sendNotificationSingleAttachment({
            collapsed: false,
            color: '#e10000',
            title: {
              value: 'No Servers found!',
              link: 'https://app.plex.tv/desktop#!/account',
            },
            text: 'Could not find a server using the query `' + serverArg + '`!',
          }, read, modify, context.getSender(), context.getRoom());
        }
      }
    } catch (e) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to search for Server!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Error encountered when searching for server!',
      }, read, modify, context.getSender(), context.getRoom());
    }
  }
}
