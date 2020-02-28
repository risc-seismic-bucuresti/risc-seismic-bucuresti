// npm
import { Column, CreatedAt, DataType, Default, Model, UpdatedAt } from 'sequelize-typescript';

// tslint:disable max-classes-per-file

export abstract class IdModel<T> extends Model<IdModel<T>> {
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID, primaryKey: true })
  public id: string;
}

export abstract class ImmutableModel<T> extends IdModel<T> {
  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  public createdAt: Date;

  @Column({ type: DataType.UUID, field: 'created_by_id' })
  public createdById: string;
}

export abstract class EditableModel<T> extends ImmutableModel<T> {
  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  public updatedAt: Date;

  @Column({ type: DataType.UUID, field: 'updated_by_id' })
  public updatedById: string;
}
