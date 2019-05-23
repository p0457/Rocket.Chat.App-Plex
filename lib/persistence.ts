import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export class AppPersistence {
  constructor(private readonly persistence: IPersistence, private readonly persistenceRead: IPersistenceRead) {}

  public async setUserToken(token: string, user: IUser): Promise<void> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-token');

    await this.persistence.updateByAssociations([userAssociation, typeAssociation], { token }, true);
  }

  public async getUserToken(user: IUser): Promise<string | undefined> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-token');

    const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

    return result ? (result as any).token : undefined;
  }

  public async setUserThumb(thumb: string, user: IUser): Promise<void> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-user-thumb');

    await this.persistence.updateByAssociations([userAssociation, typeAssociation], { thumb }, true);
  }

  public async getUserThumb(user: IUser): Promise<string | undefined> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-user-thumb');

    const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

    return result ? (result as any).thumb : undefined;
  }

  public async setUserId(id: string, user: IUser): Promise<void> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-user-id');

    await this.persistence.updateByAssociations([userAssociation, typeAssociation], { id }, true);
  }

  public async getUserId(user: IUser): Promise<string | undefined> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-user-id');

    const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

    return result ? (result as any).id : undefined;
  }

  public async setUserUuid(uuid: string, user: IUser): Promise<void> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-user-uuid');

    await this.persistence.updateByAssociations([userAssociation, typeAssociation], { uuid }, true);
  }

  public async getUserUuid(user: IUser): Promise<string | undefined> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-user-uuid');

    const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

    return result ? (result as any).uuid : undefined;
  }

  public async setServers(servers: string, user: IUser): Promise<void> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-user-servers');

    await this.persistence.updateByAssociations([userAssociation, typeAssociation], { servers }, true);
  }

  public async getUserServers(user: IUser): Promise<string | undefined> {
    const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
    const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'plex-user-servers');

    const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

    return result ? (result as any).servers : undefined;
  }
}
