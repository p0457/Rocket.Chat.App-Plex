import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { AppPersistence } from '../persistence';
import defaultHeaders from './defaultHeaders';
import * as msgHelper from './messageHelper';

// tslint:disable-next-line:max-line-length
export async function getDataFromServer(serverName: string, serverEndpoint: string, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence, params?): Promise<any|undefined> {
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
    await msgHelper.sendNotification('No servers stored! Try logging in again: `/plex-login [USERNAME] [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
    return;
  }
  try {
    let serverChosen;
    let serverFound = false;
    const serversList = JSON.parse(servers);
    if (serversList && Array.isArray(serversList)) {
      serversList.forEach((server) => {
        if (!serverFound && server.name.toLowerCase().indexOf(serverName.toLowerCase()) !== -1) {
          serverChosen = server;
          serverFound = true;
        }
      });

      if (serverFound && serverFound === true) {
        const url = serverChosen.scheme + '://' + serverChosen.address + ':' + serverChosen.port + serverEndpoint;
        const headers = defaultHeaders;
        headers['X-Plex-Token'] = token;
        const response = await http.get(url, {headers, params});
        if (response && response.statusCode === 200) {
          return {
            serverChosen,
            statusCode: response.statusCode,
            content: response.content,
          };
        } else if (response.statusCode === 400) {
          await msgHelper.sendTokenExpired(read, modify, context.getSender(), context.getRoom(), persis);
          return;
        }
      } else {
        await msgHelper.sendNotification('Server Name not found for query `' + serverName + '`!', read, modify, context.getSender(), context.getRoom());
        return;
      }
    } else {
      await msgHelper.sendNotification('Server Name not found for query `' + serverName + '`!', read, modify, context.getSender(), context.getRoom());
      return;
    }
  } catch (e) {
    // tslint:disable-next-line:max-line-length
    await msgHelper.sendNotification('Error getting Sessions for server!', read, modify, context.getSender(), context.getRoom());
    return;
  }
}
