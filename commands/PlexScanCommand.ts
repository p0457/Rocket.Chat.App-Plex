import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexScanCommand implements ISlashCommand {
  public command = 'plex-scan';
  public i18nParamsExample = 'slashcommand_scan_params';
  public i18nDescription = 'slashcommand_scan_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [serverArg, libraryKey] = context.getArguments();
    if (!serverArg) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No server provided!');
      return;
    }
    if (!libraryKey) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No library key provided!');
      return;
    }

    const url = `/library/sections/${libraryKey.toLowerCase().trim()}/refresh`;

    const responseContent = await request.getDataFromServer(serverArg, url, context, read, modify, http, persis);
    if (responseContent.statusCode === 200) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: true,
        color: '#e4a00e',
        title: {
          value: `Started or queued scan for library key ${libraryKey}!`,
        },
      }, read, modify, context.getSender(), context.getRoom());
    } else {
      await msgHelper.sendNotification('Failed to return Scan response!', read, modify, context.getSender(), context.getRoom());
    }
  }
}
