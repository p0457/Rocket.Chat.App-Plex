import { IHttp, IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import defaultHeaders from './defaultHeaders';
import { sendAttachmentsNotification } from './sendAttachmentsNotification';

export async function sendMediaMetadata(server, metadatas, token: string, read: IRead, modify: IModify, user: IUser, room: IRoom, http: IHttp): Promise<void> {
  const headers = defaultHeaders;
  headers['X-Plex-Token'] = token;

  const attachments = new Array<IMessageAttachment>();

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < metadatas.length; x++) {
    const metadata = metadatas[x];
    const mediaThumb = await http.get('http://72.180.83.54:32400/photo/:/transcode?url=/library/metadata/395037/thumb/1558629245&width=50&height=50', {
      headers,
    });
    console.log('****1', mediaThumb);

    let title = '';
    if (metadata.grandparentTitle) {
      title += metadata.grandparentTitle + ' ';
    }
    if (metadata.parentIndex) {
      title += 'S' + metadata.parentIndex + ' ';
    }
    if (metadata.index)  {
      title += 'E' + metadata.index + ' ';
    }
    if (metadata.title) {
      title += metadata.title + ' ';
    }
    if (metadata.year) {
      title += '(' + metadata.year + ') ';
    }

    const metadataLink = 'https://app.plex.tv/desktop#!/server/' + server.machineId + '/details?key=' + metadata.key;

    let text = '*Library: *' + metadata.librarySectionTitle + '\n';
    if (metadata.contentRating) {
      text += '*Rated *' + metadata.contentRating + '\n';
    }
    if (metadata.originallyAvailableAt) {
      text += '*Originally Added On *' + metadata.originallyAvailableAt + '\n';
    }
    text += '*Summary: *' + metadata.summary;

    attachments.push({
      collapsed: false,
      color: '#e4a00e',
      thumbnailUrl: '',
      title: {
        value: title,
        link: metadataLink,
      },
      text,
    });
  }

  await sendAttachmentsNotification(attachments, read, modify, user, room);
}
