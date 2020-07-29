import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';
import { getServers } from '../lib/helpers/request';

export class PlexServersCommand implements ISlashCommand {
  public command = 'plex-servers';
  public i18nParamsExample = 'slashcommand_servers_params';
  public i18nDescription = 'slashcommand_servers_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());
    const serversResult = await getServers(read, modify, persis, context.getSender(), context.getRoom());

    if (serversResult.hasError()) {
      if (serversResult.error === 'noservers') {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex-login`', read, modify, context.getSender(), context.getRoom());
        return;
      }
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'No Servers stored!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Try logging in again: `/plex-login`',
      }, read, modify, context.getSender(), context.getRoom());
    }

    const userThumbUrl = await persistence.getUserThumb(context.getSender());
    await msgHelper.sendNotificationMultipleServerDetails(serversResult.item, userThumbUrl, read, modify, context.getSender(), context.getRoom());
    return;
  }
}
