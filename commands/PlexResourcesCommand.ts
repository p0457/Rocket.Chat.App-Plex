import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexResourcesCommand implements ISlashCommand {
  public command = 'plex-resources';
  public i18nParamsExample = 'slashcommand_resources_params';
  public i18nDescription = 'slashcommand_resources_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const token = await persistence.getUserToken(context.getSender());
    if (!token) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No token detected! Please login first using `/plex-login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    const url = 'https://plex.tv/api/resources';

    const headers = defaultHeaders;
    headers['X-Plex-Token'] = token;

    const response = await http.get(url, {
      headers,
      params: {
        includeHttps: '1',
        includeRelay: '1',
      },
    });

    try {
      if (!response || !response.content || response.statusCode !== 200) {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendNotification('Failed to parse response!', read, modify, context.getSender(), context.getRoom());
        return;
      }

      const xmlResponse = response.content;

      const resources = request.parseResources(xmlResponse);

      await msgHelper.sendResources(resources, read, modify, context.getSender(), context.getRoom());
    } catch (e) {
      console.log('Failed to parse response!', e);
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Failed to parse response!', read, modify, context.getSender(), context.getRoom());
      return;
    }
  }
}
