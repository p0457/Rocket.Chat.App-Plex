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
    const [actionArg, serverName, resourceId, mediaId] = context.getArguments();

    if (!actionArg) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Action not provided!');
      return;
    }

    const action = actionArg.toLowerCase();

    if (!serverName) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Server Name not provided!');
      return;
    }

    if (!resourceId) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Resource Identifier not provided!');
      return;
    }

    let urlSub = '';
    let commandId = '';
    if (action === 'play') {
      urlSub = 'playMedia';
      commandId = '1';
      if (!mediaId) {
        await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Media Id not provided!');
        return;
      }
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

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const token = await persistence.getUserToken(context.getSender());
    if (!token) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No token detected! Please login first using `/plex-login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const servers = await persistence.getUserServers(context.getSender());
    if (!servers) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    let serverChosen;
    let serverFound = false;
    const serversList = JSON.parse(servers);
    if (!serversList || !Array.isArray(serversList)) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'No Servers found!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Could not find a server using the query `' + serverName + '`!',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }

    serversList.forEach((server) => {
      if (!serverFound && server.name.toLowerCase().indexOf(serverName.toLowerCase()) !== -1) {
        serverChosen = server;
        serverFound = true;
      }
    });

    if (serverFound === undefined || serverFound === false) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'No Servers found!',
          link: 'https://app.plex.tv/desktop#!/account',
        },
        text: 'Could not find a server using the query `' + serverName + '`!',
      }, read, modify, context.getSender(), context.getRoom());
      return;
    }

    // Find resource
    const resourcesUrl = 'https://plex.tv/api/resources';

    const headers = defaultHeaders;
    headers['X-Plex-Token'] = token;

    const response = await http.get(resourcesUrl, {
      headers,
      params: {
        includeHttps: '1',
        includeRelay: '1',
      },
    });

    try {
      if (!response || !response.content || response.statusCode !== 200) {
        // tslint:disable-next-line:max-line-length
        await msgHelper.sendNotification('Failed to parse response!', read, modify, context.getSender(), context.getRoom());
        return;
      }
      const xmlResponse = response.content;
      const resources = request.parseResources(xmlResponse);
      if (Array.isArray(resources)) {
        const resourceChosen = resources.find((resource) => {
          return resource.clientIdentifier === resourceId;
        });
        if (!resourceChosen) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendNotification('Failed to find resource by id `' + resourceId + '`!', read, modify, context.getSender(), context.getRoom());
          return;
        }
        if (resourceChosen.owned === false) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendNotification('Not allowed to play content on other\'s resources!', read, modify, context.getSender(), context.getRoom());
          return;
        }
        if (!resourceChosen.presence) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendNotification('Resource is not currently listening!', read, modify, context.getSender(), context.getRoom());
          return;
        }

        let appropriateConnections = resourceChosen.connections.filter((connection) => {
          return connection.local === false;
        });
        if (appropriateConnections.length > 1) {
          appropriateConnections = appropriateConnections.filter((connection) => {
            return connection.relay === true;
          });
        }
        const appropriateConnection = appropriateConnections[0];
        if (!appropriateConnection) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendNotification('Could not find an appropriate connection to this resource! It may not support playback controls.', read, modify, context.getSender(), context.getRoom());
          return;
        }

        const connectionUrl = appropriateConnection.uri;
        const resourceAccessToken = resourceChosen.accessToken; // TODO: is this needed?
        const resourceClientIdentifier = resourceChosen.clientIdentifier;

        const playbackUrl = `${connectionUrl}/player/playback/${urlSub}`;
        // tslint:disable-next-line:no-string-literal
        headers['commandID'] = commandId;
        headers['X-Plex-Target-Client-Identifier'] = resourceClientIdentifier;
        // tslint:disable-next-line:no-string-literal
        headers['machineIdentifier'] = serverChosen.machineId;

        const playbackParams = {
          offset: '0',
          key: (action === 'play' ? `/library/metadata/${mediaId}` : ''),
        };

        const playbackResponse = await http.get(playbackUrl, {
          headers, params: playbackParams,
        });

        console.log('****1', playbackResponse);
        console.log('****1.1', headers);

        if (!playbackResponse || playbackResponse.statusCode !== 200) {
          // tslint:disable-next-line:max-line-length
          await msgHelper.sendNotification('Failed to execute playback action!', read, modify, context.getSender(), context.getRoom());
          return;
        }

        await msgHelper.sendNotification('Successfully executed playback action `' + action + '`!', read, modify, context.getSender(), context.getRoom());

        const sessionContent = await request.getDataFromServer(serverName, '/status/sessions', context, read, modify, http, persis);

        try {
          const sessionResults = JSON.parse(sessionContent.content);
          if (sessionResults && sessionResults.MediaContainer && sessionResults.MediaContainer.size) {
            let actualResults = sessionResults.MediaContainer.Metadata;
            actualResults = actualResults.find((session) => {
              return session.Player.machineIdentifier === resourceClientIdentifier;
            });
            console.log('****2', actualResults);
            if (actualResults && actualResults.length > 0) {
              // tslint:disable-next-line:max-line-length
              await msgHelper.sendMediaMetadata(sessionContent.serverChosen, actualResults, serverName + ' sessions', true, read, modify, context.getSender(), context.getRoom());
            } else {
              await msgHelper.sendNotification('Failed to return Session results!', read, modify, context.getSender(), context.getRoom());
            }
          } else {
            await msgHelper.sendNotification('Failed to return Session results!', read, modify, context.getSender(), context.getRoom());
          }
        } catch (e) {
          console.log('Failed to return Session results!', e);
          await msgHelper.sendNotification('Failed to return Session results!', read, modify, context.getSender(), context.getRoom());
        }

      }
    } catch (e) {
      console.log('Failed to parse response!', e);
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('Failed to parse response!', read, modify, context.getSender(), context.getRoom());
      return;
    }
  }
}
