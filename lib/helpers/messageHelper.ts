import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { AppPersistence } from '../persistence';
import defaultHeaders from './defaultHeaders';

export async function sendNotification(text: string, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('plex_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('plex_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      text,
      groupable: false,
      alias: username,
      avatarUrl: icon,
  }).getMessage());
}

export async function sendNotificationSingleAttachment(attachment: IMessageAttachment, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('plex_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('plex_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      groupable: false,
      alias: username,
      avatarUrl: icon,
      attachments: [attachment],
  }).getMessage());
}

export async function sendNotificationMultipleAttachments(attachments: Array<IMessageAttachment>, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('plex_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('plex_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      groupable: false,
      alias: username,
      avatarUrl: icon,
      attachments,
  }).getMessage());
}

export async function sendNotificationSingleServerDetails(server, userThumbUrl: string | undefined, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  let text = '*v' + server.version + '*\n*Owner: *';
  text += (server.owned && server.owned === true) ? 'You' : server.sourceTitle;
  // tslint:disable-next-line:max-line-length
  const userThumbUrlActual = (server.owned && server.owned === true) ? userThumbUrl : 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antu_im-invisible-user.svg/512px-Antu_im-invisible-user.svg.png';
  const serverAddress = server.scheme + '://' + server.address + ':' + server.port;
  await sendNotificationSingleAttachment({
    collapsed: false,
    color: '#e4a00e',
    thumbnailUrl: userThumbUrlActual,
    title: {
      value: server.name,
      link: serverAddress,
    },
    text,
  }, read, modify, user, room);
}

export async function sendNotificationMultipleServerDetails(servers, userThumbUrl: string | undefined, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < servers.length; x++) {
    const server = servers[x];
    let text = '*v' + server.version + '*\n*Owner: *';
    text += (server.owned && server.owned === true) ? 'You' : server.sourceTitle;
    // tslint:disable-next-line:max-line-length
    const userThumbUrlActual = (server.owned && server.owned === true) ? userThumbUrl : 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antu_im-invisible-user.svg/512px-Antu_im-invisible-user.svg.png';
    const serverAddress = server.scheme + '://' + server.address + ':' + server.port;

    attachments.push({
      collapsed: false,
      color: '#e4a00e',
      thumbnailUrl: userThumbUrlActual,
      title: {
        value: server.name,
        link: serverAddress,
      },
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendMediaMetadata(server, metadatas, query, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + metadatas.length + ')',
    },
    text: '*Query: *`' + query + '`',
  });

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < metadatas.length; x++) {
    const metadata = metadatas[x];

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
      title: {
        value: title,
        link: metadataLink,
      },
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendTokenExpired(read: IRead, modify: IModify, user: IUser, room: IRoom, persis: IPersistence): Promise<void> {
  const persistence = new AppPersistence(persis, read.getPersistenceReader());
  const userThumbUrl = await persistence.getUserThumb(user);
  await sendNotificationSingleAttachment({
    collapsed: false,
    color: '#e10000',
    thumbnailUrl: userThumbUrl,
    title: {
      value: 'Token Expired!',
      link: 'https://app.plex.tv/desktop#!/account',
    },
    text: 'Please login again using `/plex login [USERNAME] [PASSWORD]`',
  }, read, modify, user, room);
}
