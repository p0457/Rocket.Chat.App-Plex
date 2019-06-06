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
    const resources = await request.getResources(false, context, read, modify, http, persis);
    if (resources && Array.isArray(resources)) {
      await msgHelper.sendResources(resources, read, modify, context.getSender(), context.getRoom());
      return;
    }
  }
}
