import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachmentField } from '@rocket.chat/apps-engine/definition/messages';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { getMediaTypes } from '../lib/helpers/mediaTypes';
import * as msgHelper from '../lib/helpers/messageHelper';
import usage from '../lib/helpers/usage';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexCommand implements ISlashCommand {
  public command = 'plex';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const mediaTypes = getMediaTypes();
    let mediaTypesText = '';
    mediaTypes.forEach((mediaType) => {
      mediaTypesText += '*' + mediaType.id + '* ' + mediaType.typeString + '\n';
    });
    mediaTypesText = mediaTypesText.substring(0, mediaTypesText.length - 1); // Remove last '\n'

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const fields = new Array<IMessageAttachmentField>();

    const userId = await persistence.getUserId(context.getSender());
    if (userId) {
      fields.push({
        short: true,
        title: 'Plex User Id',
        value: userId,
      });
    }

    const userUuid = await persistence.getUserUuid(context.getSender());
    if (userUuid) {
      fields.push({
        short: true,
        title: 'Plex User Uuid',
        value: userUuid,
      });
    }

    let text = '';

    for (const p in usage) {
      if (usage.hasOwnProperty(p)) {
        if (usage[p].command && usage[p].usage && usage[p].description) {
          text += usage[p].usage + '\n>' + usage[p].description + '\n';
        }
      }
    }

    text += '\n*Media Types*\n' + mediaTypesText;

    text += '\n\nThis application is not created by, affiliated with, or supported by Plex.';

    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: 'Commands',
      },
      fields,
      text,
    }, read, modify, context.getSender(), context.getRoom());
    return;
  }
}
