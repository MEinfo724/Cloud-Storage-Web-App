import { Entity, Of } from 'entity-of';

@Entity()
export class UserLink {
  @Of((t) => t(String))
  id = '';

  @Of((t) => t(String))
  userID = '';

  @Of((t) => t(String))
  filename = '';

  @Of((t) => t(String))
  downloadLink = '';

  @Of((t) => t(String))
  validUntil = '';

  static of = Entity.of<UserLink>();
}
