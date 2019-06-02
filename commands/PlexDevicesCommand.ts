import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import defaultHeaders from '../lib/helpers/defaultHeaders';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { PlexApp } from '../PlexApp';

export class PlexDevicesCommand implements ISlashCommand {
  public command = 'plex-devices';
  public i18nParamsExample = 'slashcommand_devices_params';
  public i18nDescription = 'slashcommand_devices_description';
  public providesPreview = false;

  public constructor(private readonly app: PlexApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const token = await persistence.getUserToken(context.getSender());
    if (!token) {
      // tslint:disable-next-line:max-line-length
      await msgHelper.sendNotification('No token detected! Please login first using `/plex-login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }
    const url = 'https://plex.tv/devices.json';
    const headers = defaultHeaders;
    headers['X-Plex-Token'] = token;
    const response = await http.get(url, {headers});
    if (response && response.statusCode === 200 && response.content) {
      try {
        let devicesJson = JSON.parse(response.content);
        if (!devicesJson || !Array.isArray(devicesJson)) {
          devicesJson = new Array();
        }
        devicesJson.forEach((device) => {
          let lastSeen = device.lastSeenAt;
          if (lastSeen) {
            if (lastSeen.indexOf('Last seen:') !== -1) {
              lastSeen.replace('Last seen:', '');
            }
            lastSeen = lastSeen.trim();
            const lastSeenDate = new Date(Date.parse(lastSeen));
            let lastSeenDateOutput = lastSeenDate.toUTCString();
            if (lastSeenDateOutput.indexOf(' 00:00:00 GMT') !== -1) {
              lastSeenDateOutput = lastSeenDateOutput.replace(' 00:00:00 GMT', '');
            }
            device.lastSeenDate = lastSeenDate;
            device.lastSeenDateDisplay = lastSeenDateOutput;
          }
        });
        // Sort the requests by last seen date desc (newest first)
        devicesJson = devicesJson.sort((a, b) => {
          if (a.lastSeenDate && b.lastSeenDate) {
            if (a.lastSeenDate < b.lastSeenDate) {
              return -1;
            }
            if (a.lastSeenDate > b.lastSeenDate) {
              return 1;
            }
          }
          return 0;
        });
        devicesJson = devicesJson.reverse();
        await msgHelper.sendDevices(devicesJson, read, modify, context.getSender(), context.getRoom());
      } catch (e) {
        console.log('Failed to return Session results!', e);
        await msgHelper.sendNotification('Failed to return Session results!', read, modify, context.getSender(), context.getRoom());
      }
    } else if (response.statusCode === 400) {
      await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom(), persis);
    }
  }
}
