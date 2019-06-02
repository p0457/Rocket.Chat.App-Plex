import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexServersCommand implements ISlashCommand {
  public command = 'plex-servers';
  public i18nParamsExample = 'slashcommand_servers_params';
  public i18nDescription = 'slashcommand_servers_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());
    const servers = await persistence.getUserServers(context.getSender());
    if (!servers) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex-login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    try {
      const serversList = JSON.parse(servers);
      if (serversList && Array.isArray(serversList)) {
        const userThumbUrl = await persistence.getUserThumb(context.getSender());
        await msgHelper.sendNotificationMultipleServerDetails(serversList, userThumbUrl, read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to parse servers!', e);
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'No Servers stored!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Try logging in again: `/plex-login [USERNAME] [PASSWORD]`',
      }, read, modify, context.getSender(), context.getRoom());
    }
  }
}
