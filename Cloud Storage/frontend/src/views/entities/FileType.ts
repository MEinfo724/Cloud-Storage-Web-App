import { Entity, Of } from 'entity-of';

@Entity()
export class FileType {
  @Of((t) => t(String))
  id = '';

  @Of((t) => t(String))
  name = '';

  @Of((t) => t(Boolean))
  isFile = false;

  @Of((t) => t(String))
  fileType = '';

  static of = Entity.of<FileType>();
}
