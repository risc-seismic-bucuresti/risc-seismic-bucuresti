//npm
import { BelongsTo, Column, DataType, ForeignKey, Table } from "sequelize-typescript";

// models
import { ImmutableModel } from "./base";
import { Building } from "./building.model";

@Table({
  tableName: 'building-ratings',
})
export class BuildingRating extends ImmutableModel<BuildingRating> {
  @ForeignKey(() => Building)
  @Column({ type: DataType.UUID, field: 'building_id', allowNull: false })
  public buildingId: string;

  @BelongsTo(() => Building, { onDelete: 'cascade' })
  public building: Building;

  @Column({ type: DataType.STRING, field: 'seismic_rating', allowNull: false })
  public seismicRating: string;
}
