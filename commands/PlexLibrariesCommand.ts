import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, ISlashCommandPreview, ISlashCommandPreviewItem, SlashCommandContext, SlashCommandPreviewItemType } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexLibrariesCommand implements ISlashCommand {
  public command = 'plex-libraries';
  public i18nParamsExample = 'slashcommand_libraries_params';
  public i18nDescription = 'slashcommand_libraries_description';
  public providesPreview = true;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await request.getAndSendLibraries(context.getArguments(), context, read, modify, http, persis, this.command);
    return;
  }

  public async previewer(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<ISlashCommandPreview> {
    const items = Array<ISlashCommandPreviewItem>();

    const query = context.getArguments().join(' ');

    const serversResult = await request.getServers(read, modify, persis, context.getSender(), context.getRoom());
    if (serversResult.hasError()) {
      if (serversResult.error === 'noservers') {
        return {
          i18nTitle: 'No servers stored!',
          items,
        };
      }
      return {
        i18nTitle: serversResult.error,
        items,
      };
    }

    const servers = serversResult.item;
    servers.forEach((server) => {
      if (!query || String(server.name).toLowerCase().indexOf(query) !== -1) {
        items.push({
          id: server.name,
          type: SlashCommandPreviewItemType.TEXT,
          value: server.name,
        });
      }
    });

    if (items.length === 0) {
      return {
        i18nTitle: 'No Results!',
        items,
      };
    }

    return {
      i18nTitle: 'Get Libraries for Server',
      items,
    };
  }

  // tslint:disable-next-line:max-line-length
  public async executePreviewItem(item: ISlashCommandPreviewItem, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await request.getAndSendLibraries([item.id], context, read, modify, http, persis, this.command);
    return;
  }
}
