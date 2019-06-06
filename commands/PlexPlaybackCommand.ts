import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexPlaybackCommand implements ISlashCommand {
  public command = 'plex-playback';
  public i18nParamsExample = 'slashcommand_playback_params';
  public i18nDescription = 'slashcommand_playback_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [actionArg] = context.getArguments();

    if (!actionArg) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Action not provided!');
      return;
    }

    const action = actionArg.toLowerCase();

    let urlSub = '';
    let commandId = '';
    if (action === 'play') {
      urlSub = 'playMedia';
      commandId = '1';
    } else if (action === 'pause') {
      urlSub = 'pause';
      commandId = '10';
    } else if (action === 'stop') {
      urlSub = 'stop';
      commandId = '10';
    } else if (action === 'rewind') {
      urlSub = 'seekTo';
      commandId = '2';
      // TODO: Provide offset?
    } else if (action === 'skip-back') {
      urlSub = 'skipPrevious';
      commandId = '5';
    } else if (action === 'fast-forward') {
      urlSub = 'seekTo';
      commandId = '6';
      // TODO: Provide offset?
    } else if (action === 'skip-forward') {
      urlSub = 'skipNext';
      commandId = '8';
    } else {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Invalid action!');
      return;
    }

    const serverAccessUrl = ''; // TODO: get this
    const url = `${serverAccessUrl}/player/playback/${urlSub}`;

    const targetIdentifier = ''; // TODO: get this
  }
}
