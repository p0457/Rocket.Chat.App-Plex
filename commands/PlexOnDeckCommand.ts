import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { PlexApp } from '../PlexApp';

export class PlexOnDeckCommand implements ISlashCommand {
  public command = 'plex-ondeck';
  public i18nParamsExample = 'slashcommand_ondeck_params';
  public i18nDescription = 'slashcommand_ondeck_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [serverArg] = context.getArguments();
    if (!serverArg) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'No server provided!');
      return;
    }

    const responseContent = await request.getDataFromServer(serverArg, '/library/onDeck', context, read, modify, http, persis);

    try {
      const searchResultsJson = JSON.parse(responseContent.content);
      if (searchResultsJson && searchResultsJson.MediaContainer && searchResultsJson.MediaContainer.size) {
        const actualResults = searchResultsJson.MediaContainer.Metadata;
        if (actualResults && actualResults.length > 0) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, actualResults, serverArg + ' ondeck', false, read, modify, context.getSender(), context.getRoom());
        } else {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], serverArg + ' ondeck', false, read, modify, context.getSender(), context.getRoom());
        }
      } else {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendMediaMetadata(responseContent.serverChosen, [], serverArg + ' ondeck', false, read, modify, context.getSender(), context.getRoom());
      }
    } catch (e) {
      console.log('Failed to return On-Deck results!', e);
      await msgHelper.sendNotification('Failed to return On-Deck results!', read, modify, context.getSender(), context.getRoom());
    }
  }
}
