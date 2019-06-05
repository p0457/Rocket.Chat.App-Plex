import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAction, IMessageAttachment, MessageActionButtonsAlignment, MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { AppPersistence } from '../persistence';
import { formatBytes } from './bytesConverter';
import { secondsToString } from './timeConverter';
import usage from './usage';

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

export async function sendUsage(read: IRead, modify: IModify, user: IUser, room: IRoom, scope: string, additionalText?): Promise<void> {
  let text = '';

  let usageObj = usage[scope];
  if (!usageObj) {
    for (const p in usage) {
      if (usage.hasOwnProperty(p)) {
        if (usage[p].command === scope) {
          usageObj = usage[p];
        }
      }
    }
  }
  if (usageObj && usageObj.command && usageObj.usage && usageObj.description) {
    text = '*Usage: *' + usageObj.usage + '\n>' + usageObj.description;
  }

  if (additionalText) {
    text = additionalText + '\n' + text;
  }

  // tslint:disable-next-line:max-line-length
  await this.sendNotification(text, read, modify, user, room);
  return;
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

export async function sendNotificationMultipleServerDetails(servers, userThumbUrl: string | undefined, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < servers.length; x++) {
    const server = servers[x];

    const fields = new Array();

    // Wanted to do actions for request, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    let text = '*v' + server.version + '*\n*Owner: *';
    text += (server.owned === true) ? 'You' : server.sourceTitle;
    // tslint:disable-next-line:max-line-length
    const userThumbUrlActual = (server.owned === true) ? userThumbUrl : 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antu_im-invisible-user.svg/512px-Antu_im-invisible-user.svg.png';
    const serverAddress = server.scheme + '://' + server.address + ':' + server.port;
    const serverLink = 'https://app.plex.tv/desktop#!/server/' + server.machineId;

    actions.push({
      type: MessageActionType.BUTTON,
      url: serverLink,
      text: 'View Server',
      msg_in_chat_window: false,
      msg_processing_type: MessageProcessingType.SendMessage,
    });

    if (server.owned === true) {
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://app.plex.tv/desktop#!/settings/server/' + server.machineId + '/status/server-dashboard',
        text: 'View Dashboard',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://app.plex.tv/desktop#!/settings/server/' + server.machineId + '/status/alerts',
        text: 'View Alerts',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://app.plex.tv/desktop#!/settings/server/' + server.machineId + '/status/sync',
        text: 'View Sync Status',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
      actions.push({
        type: MessageActionType.BUTTON,
        url: 'https://app.plex.tv/desktop#!/settings/server/' + server.machineId + '/status/conversion',
        text: 'View Conversion Status',
        msg_in_chat_window: false,
        msg_processing_type: MessageProcessingType.SendMessage,
      });
    }

    actions.push({
      type: MessageActionType.BUTTON,
      text: 'Search Media',
      msg: '/plex-search ' + server.name + ' ',
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });

    actions.push({
      type: MessageActionType.BUTTON,
      text: 'Get On-Deck',
      msg: '/plex-ondeck ' + server.name + ' ',
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });

    actions.push({
      type: MessageActionType.BUTTON,
      text: 'Get Sessions',
      msg: '/plex-sessions ' + server.name + ' ',
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });

    actions.push({
      type: MessageActionType.BUTTON,
      text: 'Get Libraries',
      msg: '/plex-libraries ' + server.name + ' ',
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });

    actions.push({
      type: MessageActionType.BUTTON,
      text: 'Get Playlists',
      msg: '/plex-playlists ' + server.name + ' ',
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });

    if (server.owned) {
      actions.push({
        type: MessageActionType.BUTTON,
        text: 'Scan All Libraries',
        msg: '/plex-scan ' + server.name + ' all ',
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });
    }

    attachments.push({
      collapsed: false,
      color: '#e4a00e',
      thumbnailUrl: userThumbUrlActual,
      title: {
        value: server.name,
        link: serverAddress,
      },
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
      fields,
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendMediaMetadata(server, metadatas, query, isSessionsCall: boolean, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
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

    let thumbnailUrl = '';

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

    // Wanted to do actions for request, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    actions.push({
      type: MessageActionType.BUTTON,
      url: metadataLink,
      text: 'View on Plex',
      msg_in_chat_window: false,
      msg_processing_type: MessageProcessingType.SendMessage,
    });

    const fields = new Array();

    if (metadata.Genre && Array.isArray(metadata.Genre) && metadata.Genre.length > 0) {
      let genreText = '';
      metadata.Genre.forEach((genre) => {
        if (genre.tag) {
          genreText += genre.tag + ', ';
        }
      });
      genreText = genreText.substring(0, genreText.length - 2); // Remove last ', '
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

    if (metadata.Session && metadata.Session.location && metadata.Session.bandwidth && !isNaN(metadata.Session.bandwidth)) {
      const session = metadata.Session;
      let sessionText = '';
      sessionText += session.location.toUpperCase() + ' @';
      const bandwidth = formatBytes(Number(session.bandwidth));
      sessionText += bandwidth + '\n';
      sessionText = sessionText.substring(0, sessionText.length - 1); // Remove last '\n'
      fields.push({
        short: true,
        title: 'Session',
        value: sessionText,
      });
    }

    if (metadata.TranscodeSession) {
      const transcode = metadata.TranscodeSession;
      let transcodeText = '';
      if (transcode.videoDecision === 'transcode' && transcode.sourceVideoCodec && transcode.videoCodec) {
        transcodeText += '*' + transcode.sourceVideoCodec.toUpperCase() + '* => *'
          + transcode.videoCodec.toUpperCase() + '*\n';
      }
      if (transcode.audioDecision === 'transcode' && transcode.sourceAudioCodec && transcode.audioCodec) {
        transcodeText += '*' + transcode.sourceAudioCodec.toUpperCase() + '* => *'
          + transcode.audioCodec.toUpperCase() + '*\n';
      }
      if (transcode.progress && !isNaN(transcode.progress) && transcode.speed && !isNaN(transcode.speed)) {
        const progress = Number(transcode.progress).toFixed(1);
        const speed = Number(transcode.progress).toFixed(1);
        transcodeText += progress + '% complete (speed is ' + speed + ')';
        if (transcode.throttled === true) {
          transcodeText += ' (Throttled)';
        }
        transcodeText += '\n';
      }
      if (transcodeText.endsWith('\n')) {
        transcodeText = transcodeText.substring(0, transcodeText.length - 1); // Remove last '\n'
      }
      fields.push({
        short: false,
        title: 'Transcode',
        value: transcodeText,
      });
    }

    if (metadata.Player) {
      const player = metadata.Player;
      let playerText = '';
      if (player.platform && player.platformVersion) {
        playerText += '*Platform: *' + player.platform + ' v' + player.platformVersion + '\n';
      }
      if (player.device && player.machineIdentifier) {
        playerText += '*Machine: *' + player.device + ' (' + player.machineIdentifier + ')\n';
      }
      if (player.product && player.version) {
        playerText += '*Product: *' + player.product + ' v' + player.version;
        if (player.local === true) {
          playerText += ' (Local)';
        }
        if (player.secure === true) {
          playerText += ' (Secure)';
        }
        playerText += '\n';
      }
      playerText = playerText.substring(0, playerText.length - 1); // Remove last '\n'
      fields.push({
        short: false,
        title: 'Player',
        value: playerText,
      });
    }

    let text = '';
    if (server.name) {
      text += '*Server: *' + server.name + '\n';
    }
    if (metadata.User) {
      text += '*User: *' + metadata.User.title + '\n';
      thumbnailUrl = metadata.User.thumb;
    }
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
    if (metadata.summary) {
      text += '\n*Summary: *' + metadata.summary;
    }

    attachments.push({
      collapsed: metadatas.length === 1 ? false : true,
      color: '#e4a00e',
      title: {
        value: title,
        link: metadataLink,
      },
      thumbnailUrl,
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
      fields,
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendDevices(devices, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + devices.length + ')',
    },
  });

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < devices.length; x++) {
    const device = devices[x];

    const fields = new Array();

    // Wanted to do actions for request, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    // let text = '';

    fields.push({
      short: true,
      title: 'Product',
      value: device.product,
    });
    fields.push({
      short: true,
      title: 'Version',
      value: device.version,
    });
    fields.push({
      short: true,
      title: 'Last Seen',
      value: device.lastSeenDateDisplay,
    });

    attachments.push({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: device.name + ' (' + device.id + ')',
        link: 'https://app.plex.tv/desktop#!/settings/devices/all',
      },
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
      fields,
      // text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendLibraries(libraries, server, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + libraries.length + ')',
    },
  });

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < libraries.length; x++) {
    const library = libraries[x];

    const libraryLink = 'https://app.plex.tv/desktop#!/server/' + server.machineId + '?key=%2Flibrary%2Fsections%2F' + library.key;

    const fields = new Array();

    fields.push({
      short: true,
      title: 'Type',
      value: library.type.charAt(0).toUpperCase() + library.type.substring(1, library.type.length),
    });
    fields.push({
      short: true,
      title: 'Sync Allowed',
      value: library.allowSync,
    });
    fields.push({
      short: true,
      title: 'Currently Refreshing?',
      value: library.refreshing,
    });

    // Wanted to do actions for request, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    actions.push({
      type: MessageActionType.BUTTON,
      url: libraryLink,
      text: 'View Library',
      msg_in_chat_window: false,
      msg_processing_type: MessageProcessingType.SendMessage,
    });

    if (server.owned) {
      actions.push({
        type: MessageActionType.BUTTON,
        text: 'Scan Library',
        msg: '/plex-scan ' + server.name + ' ' + library.key + ' ',
        msg_in_chat_window: true,
        msg_processing_type: MessageProcessingType.RespondWithMessage,
      });
    }

    // let text = '';

    attachments.push({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: library.title,
        link: libraryLink,
      },
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
      fields,
      // text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendPlaylists(server, playlists, query, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + playlists.length + ')',
    },
    text: '*Query: *`' + query + '`',
  });

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < playlists.length; x++) {
    const playlist = playlists[x];

    // tslint:disable-next-line:max-line-length
    const metadataLink = 'https://app.plex.tv/desktop#!/server/' + server.machineId + '/playlist?key=/playlists/' + playlist.ratingKey + '&context=content.playlists';

    // Wanted to do actions for request, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    actions.push({
      type: MessageActionType.BUTTON,
      url: metadataLink,
      text: 'View on Plex',
      msg_in_chat_window: false,
      msg_processing_type: MessageProcessingType.SendMessage,
    });

    const fields = new Array();

    fields.push({
      short: true,
      title: 'Type',
      value: playlist.playlistType.charAt(0).toUpperCase() + playlist.playlistType.substring(1, playlist.playlistType.length),
    });
    fields.push({
      short: true,
      title: 'Duration',
      value: secondsToString(playlist.duration),
    });

    // TODO: Add action to play

    // let text = '';

    attachments.push({
      collapsed: playlists.length < 5 ? false : true,
      color: '#e4a00e',
      title: {
        value: playlist.title,
        link: metadataLink,
      },
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
      fields,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendResources(resources, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < resources.length; x++) {
    const resource = resources[x];

    const fields = new Array();

    if (resource.product && resource.productVersion) {
      fields.push({
        short: true,
        title: 'Product',
        value: `${resource.product}\nv${resource.productVersion}`,
      });
    }
    if (resource.platform && resource.platformVersion) {
      fields.push({
        short: true,
        title: 'Platform',
        value: `${resource.platform}\nv${resource.platformVersion}`,
      });
    }
    if (resource.device) {
      fields.push({
        short: true,
        title: 'Device',
        value: `${resource.device}`,
      });
    }
    if (resource.owned !== undefined) {
      fields.push({
        short: true,
        title: 'Owned?',
        value: `${resource.owned}`,
      });
    }
    if (resource.httpsRequired !== undefined) {
      fields.push({
        short: true,
        title: 'HTTPS required?',
        value: `${resource.httpsRequired}`,
      });
    }
    if (resource.relay !== undefined) {
      fields.push({
        short: true,
        title: 'Is Relay?',
        value: `${resource.relay}`,
      });
    }
    if (resource.dnsRebindingProtectionRegex !== undefined) {
      fields.push({
        short: true,
        title: 'DNS Rebinding Protection?',
        value: `${resource.dnsRebindingProtectionRegex}`,
      });
    }
    if (resource.presence !== undefined) {
      fields.push({
        short: true,
        title: 'Presence?',
        value: `${resource.presence}`,
      });
    }

    const numberOfConnections = resource.connections.length;

    const text = `*Connections: *${numberOfConnections}`;

    // TODO: actions for playback and stuff?

    attachments.push({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: resource.name,
      },
      fields,
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}
