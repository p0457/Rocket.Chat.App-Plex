import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { getMediaTypes } from '../lib/helpers/mediaTypes';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { PlexApp } from '../PlexApp';

export class PlexSearchCommand implements ISlashCommand {
  public command = 'plex-search';
  public i18nParamsExample = 'slashcommand_search_params';
  public i18nDescription = 'slashcommand_search_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const args = context.getArguments();
    if (args.length < 3) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Too few arguments!');
      return;
    }
    const serverArg = args[0];
    const typeArg = args[1].toLowerCase().trim();
    // tslint:disable-next-line:max-line-length
    if (!typeArg) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Type not provided!');
      return;
    }
    const type = getMediaTypes().find((mediaType) => {
      return mediaType.typeString === typeArg;
    });
    let searchIndex = 2;
    if (!type) {
      // Bad type accepted, search defaults
      searchIndex = 1;
    }

    let searchArg = '';
    // tslint:disable-next-line:prefer-for-of
    for (let x = searchIndex; x < args.length; x++) {
      searchArg += args[x] + ' ';
    }
    searchArg = searchArg.trim();

    if (!serverArg || searchArg === '') {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No server or invalid query!');
      return;
    }

    const defaultTypes = '1,2,8,9,11,14'; // movie,show,artist,album,photoAlbum,clip
    const params = {
      query: searchArg,
      type: (type && type.id) ? type.id.toString() : defaultTypes,
    };

    const responseContent = await request.getDataFromServer(serverArg, '/search', context, read, modify, http, persis, params);

    try {
      const queryDisplay = serverArg + ' ' + (type ? typeArg + ' ' : 'all ') + searchArg;
      const searchResultsJson = JSON.parse(responseContent.content);
      if (searchResultsJson && searchResultsJson.MediaContainer && searchResultsJson.MediaContainer.size) {
        const actualResults = searchResultsJson.MediaContainer.Metadata;
        if (actualResults && actualResults.length > 0) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, actualResults, queryDisplay, false, read, modify, context.getSender(), context.getRoom());
        } else {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], queryDisplay, false, read, modify, context.getSender(), context.getRoom());
        }
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], queryDisplay, false, read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to return search results!', e);
      await msgHelper.sendNotification('Failed to return search results!', read, modify, context.getSender(), context.getRoom());
    }
  }
}
