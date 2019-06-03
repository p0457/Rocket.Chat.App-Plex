import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { getMediaTypes } from '../lib/helpers/mediaTypes';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { PlexApp } from '../PlexApp';

export class PlexPlaylistsCommand implements ISlashCommand {
  public command = 'plex-playlists';
  public i18nParamsExample = 'slashcommand_playlists_params';
  public i18nDescription = 'slashcommand_playlists_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [serverArg] = context.getArguments();
    if (!serverArg) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No server provided!');
      return;
    }

    const params = {};

    const responseContent = await request.getDataFromServer(serverArg, '/playlists', context, read, modify, http, persis, params);

    try {
      const queryDisplay = serverArg + ' playlists';
      const searchResultsJson = JSON.parse(responseContent.content);
      if (searchResultsJson && searchResultsJson.MediaContainer && searchResultsJson.MediaContainer.size) {
        const actualResults = searchResultsJson.MediaContainer.Metadata;
        if (actualResults && actualResults.length > 0) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendPlaylists(responseContent.serverChosen, actualResults, queryDisplay, read, modify, context.getSender(), context.getRoom());
        } else {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendPlaylists(responseContent.serverChosen, [], queryDisplay, read, modify, context.getSender(), context.getRoom());
        }
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendPlaylists(responseContent.serverChosen, [], queryDisplay, read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to return playlists!', e);
      await msgHelper.sendNotification('Failed to return playlists!', read, modify, context.getSender(), context.getRoom());
    }
  }
}
