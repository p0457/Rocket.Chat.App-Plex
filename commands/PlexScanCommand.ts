import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, ISlashCommandPreview, ISlashCommandPreviewItem, SlashCommandContext, SlashCommandPreviewItemType } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexScanCommand implements ISlashCommand {
  public command = 'plex-scan';
  public i18nParamsExample = 'slashcommand_scan_params';
  public i18nDescription = 'slashcommand_scan_description';
  public providesPreview = true;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await request.getAndSendScan(context.getArguments(), context, read, modify, http, persis, this.command);
    return;
  }

  public async previewer(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<ISlashCommandPreview> {
    const items = Array<ISlashCommandPreviewItem>();

    const args = context.getArguments();

    if (args && args.length > 1) {
      const query = args[0];
      const libraryArg = args.join(' ').replace(`${query} `, '');

      const librariesResult = await request.getLibraries([query], context, read, modify, http, persis, this.command);
      if (librariesResult.hasError()) {
        if (librariesResult.error === 'noserver') {
          return {
            i18nTitle: 'No servers stored!',
            items,
          };
        }
        return {
          i18nTitle: librariesResult.error,
          items,
        };
      }

      librariesResult.item.libraries.forEach((library) => {
        if (!libraryArg || String(library.title).toLowerCase().indexOf(libraryArg.toLowerCase().trim()) !== -1) {
          items.push({
            id: `${librariesResult.item.serverChosen.name}|${library.key}`,
            type: SlashCommandPreviewItemType.TEXT,
            value: `${librariesResult.item.serverChosen.name} - ${library.title}`,
          });
        }
      });
    }

    if (items.length === 0) {
      return {
        i18nTitle: 'No Results!',
        items,
      };
    }

    return {
      i18nTitle: 'Scan Libraries',
      items,
    };
  }

  // tslint:disable-next-line:max-line-length
  public async executePreviewItem(item: ISlashCommandPreviewItem, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await request.getAndSendScan(item.id.split('|'), context, read, modify, http, persis, this.command);
    return;
  }
}
