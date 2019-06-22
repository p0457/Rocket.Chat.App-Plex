import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';
import { getAndSendServer } from '../lib/helpers/request';

export class PlexServerCommand implements ISlashCommand {
  public command = 'plex-server';
  public i18nParamsExample = 'slashcommand_server_params';
  public i18nDescription = 'slashcommand_server_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await getAndSendServer(context.getArguments(), read, modify, http, persis, context.getSender(), context.getRoom(), this.command);
    return;
  }
}
