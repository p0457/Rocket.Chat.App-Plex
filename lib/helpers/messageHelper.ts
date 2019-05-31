import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAction, IMessageAttachment, MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { AppPersistence } from '../persistence';

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

    const fields = new Array();

    // Wanted to do actions for request, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    let title = '';
    if (metadata.grandparentTitle) {
      title += metadata.grandparentTitle + ' ';
    }
    if (metadata.type && metadata.type === 'episode') {
      if (metadata.parentIndex !== undefined && metadata.index) {
        let seasonNumber = metadata.parentIndex.toString();
        if (seasonNumber.length === 1) {
          seasonNumber = '0' + seasonNumber;
        }
        title += ' - S' + seasonNumber + '';
        let episodeNumber = metadata.index.toString();
        if (episodeNumber.length === 1) {
          episodeNumber = '0' + episodeNumber;
        }
        title += 'E' + episodeNumber + ' - ';
      }
    }
    if (metadata.title) {
      title += metadata.title + ' ';
    }
    if (metadata.year) {
      title += '(' + metadata.year + ') ';
    }

    const metadataLink = 'https://app.plex.tv/desktop#!/server/' + server.machineId + '/details?key=' + metadata.key;

    actions.push({
      type: MessageActionType.BUTTON,
      url: metadataLink,
      text: 'View on Plex',
      msg_in_chat_window: false,
      msg_processing_type: MessageProcessingType.SendMessage,
    });

    if (metadata.Genre && Array.isArray(metadata.Genre) && metadata.Genre.length > 0) {
      let genreText = '';
      metadata.Genre.forEach((genre) => {
        if (genre.tag) {
          genreText += genre.tag + '\n';
        }
      });
      genreText = genreText.substring(0, genreText.length - 1); // Remove last '\n'
      fields.push({
        short: true,
        title: 'Genre(s)',
        value: genreText,
      });
    }

    if (metadata.Studio && Array.isArray(metadata.Studio) && metadata.Studio.length > 0) {
      let studioText = '';
      metadata.Studio.forEach((studio) => {
        if (studio.tag) {
          studioText += studio.tag + '\n';
        }
      });
      studioText = studioText.substring(0, studioText.length - 1); // Remove last '\n'
      fields.push({
        short: true,
        title: 'Studio(s)',
        value: studioText,
      });
    }

    if (metadata.Director && Array.isArray(metadata.Director) && metadata.Director.length > 0) {
      let directorsText = '';
      metadata.Director.forEach((director) => {
        if (director.tag) {
          directorsText += director.tag + '\n';
        }
      });
      directorsText = directorsText.substring(0, directorsText.length - 1); // Remove last '\n'
      fields.push({
        short: true,
        title: 'Director(s)',
        value: directorsText,
      });
    }

    if (metadata.Writer && Array.isArray(metadata.Writer) && metadata.Writer.length > 0) {
      let writersText = '';
      metadata.Writer.forEach((writer) => {
        if (writer.tag) {
          writersText += writer.tag + '\n';
        }
      });
      writersText = writersText.substring(0, writersText.length - 1); // Remove last '\n'
      fields.push({
        short: true,
        title: 'Writer(s)',
        value: writersText,
      });
    }

    let text = '';
    text += '*Type: *' + metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1) + '\n';
    text += '*Library: *' + metadata.librarySectionTitle + '\n';
    if (metadata.contentRating) {
      text += '*Rated *' + metadata.contentRating + '\n';
    }
    if (metadata.rating && !isNaN(metadata.rating) && metadata.audienceRating && !isNaN(metadata.audienceRating)) {
      text += '*Ratings: *' + (Number(metadata.rating) * 10).toFixed(0) + '% *Audience: *' + (Number(metadata.audienceRating) * 10).toFixed(0) + '%\n';
    }
    if (metadata.originallyAvailableAt) {
      text += '*Originally Added On *' + metadata.originallyAvailableAt + '\n';
    }
    if (metadata.tagline) {
      text += '*Tagline: *' + metadata.tagline + '\n';
    }
    text += '\n*Summary: *' + metadata.summary;

    attachments.push({
      collapsed: metadatas.length === 1 ? false : true,
      color: '#e4a00e',
      title: {
        value: title,
        link: metadataLink,
      },
      actions,
      fields,
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
