import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexLibrariesCommand implements ISlashCommand {
  public command = 'plex-libraries';
  public i18nParamsExample = 'slashcommand_libraries_params';
  public i18nDescription = 'slashcommand_libraries_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [serverArg] = context.getArguments();
    if (!serverArg) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No server provided!');
      return;
    }

    const responseContent = await request.getDataFromServer(serverArg, '/library/sections', context, read, modify, http, persis);

    try {
      const searchResultsJson = JSON.parse(responseContent.content);
      if (searchResultsJson && searchResultsJson.MediaContainer && searchResultsJson.MediaContainer.size) {
        const actualResults = searchResultsJson.MediaContainer.Directory;
        if (actualResults) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendLibraries(actualResults, responseContent.serverChosen, read, modify, context.getSender(), context.getRoom());
        } else {
          await msgHelper.sendNotification('Failed to return Library results!', read, modify, context.getSender(), context.getRoom());
        }
      } else {
        await msgHelper.sendNotification('Failed to return Library results!', read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to return Library results!', e);
      await msgHelper.sendNotification('Failed to return Library results!', read, modify, context.getSender(), context.getRoom());
    }
  }
}
